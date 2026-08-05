-- Accounta-Bull — Herds: invite a friend, run shared challenges with a
-- reward/forfeit, and track a friendly-competition scoreboard.
-- Run this AFTER 0001_schema.sql and 0002_seed_boosts.sql.

-- ---------------------------------------------------------------------------
-- A connection (friendship) between two users. user_low < user_high keeps
-- each pair unique regardless of who invited whom.
-- ---------------------------------------------------------------------------
create table if not exists public.herd_connections (
  id         uuid primary key default gen_random_uuid(),
  user_low   uuid not null references auth.users (id) on delete cascade,
  user_high  uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_low, user_high),
  check (user_low < user_high)
);

-- ---------------------------------------------------------------------------
-- Invite codes. A user creates one and shares the code/link; a friend accepts
-- it (via the accept_herd_invite function below).
-- ---------------------------------------------------------------------------
create table if not exists public.herd_invites (
  code        text primary key,
  inviter_id  uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- A shared challenge inside a connection: a task both people do, with a
-- reward for the winner and a forfeit for the loser.
-- ---------------------------------------------------------------------------
create table if not exists public.shared_challenges (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.herd_connections (id) on delete cascade,
  created_by    uuid not null references auth.users (id) on delete cascade,
  title         text not null,
  reward        text,
  forfeit       text,
  starts_on     date not null default (now() at time zone 'utc')::date,
  ends_on       date not null default ((now() at time zone 'utc')::date + 7),
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists shared_challenges_conn_idx on public.shared_challenges (connection_id);

-- ---------------------------------------------------------------------------
-- One row per person per day they complete a shared challenge.
-- ---------------------------------------------------------------------------
create table if not exists public.challenge_checkins (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.shared_challenges (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  checked_on   date not null default (now() at time zone 'utc')::date,
  created_at   timestamptz not null default now(),
  unique (challenge_id, user_id, checked_on)
);
create index if not exists challenge_checkins_ch_idx on public.challenge_checkins (challenge_id);

-- ===========================================================================
-- Helper functions (security definer avoids RLS recursion in policies)
-- ===========================================================================
create or replace function public.in_connection(conn uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.herd_connections c
    where c.id = conn and auth.uid() in (c.user_low, c.user_high)
  );
$$;

create or replace function public.in_challenge(ch uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.shared_challenges s
    join public.herd_connections c on c.id = s.connection_id
    where s.id = ch and auth.uid() in (c.user_low, c.user_high)
  );
$$;

-- Accept an invite by code: links the two users and marks the invite used.
create or replace function public.accept_herd_invite(invite_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  inv public.herd_invites%rowtype;
  me  uuid := auth.uid();
  lo  uuid;
  hi  uuid;
  conn uuid;
begin
  select * into inv from public.herd_invites where code = invite_code;
  if inv.code is null then raise exception 'Invite code not found'; end if;
  if inv.inviter_id = me then raise exception 'You cannot accept your own invite'; end if;
  if inv.accepted_by is not null then raise exception 'This invite has already been used'; end if;

  if inv.inviter_id < me then lo := inv.inviter_id; hi := me;
  else lo := me; hi := inv.inviter_id; end if;

  select id into conn from public.herd_connections where user_low = lo and user_high = hi;
  if conn is null then
    insert into public.herd_connections (user_low, user_high) values (lo, hi) returning id into conn;
  end if;

  update public.herd_invites set accepted_by = me, accepted_at = now() where code = invite_code;
  return conn;
end;
$$;

grant execute on function public.accept_herd_invite(text) to authenticated;

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.herd_connections   enable row level security;
alter table public.herd_invites        enable row level security;
alter table public.shared_challenges   enable row level security;
alter table public.challenge_checkins  enable row level security;

-- Let herd-mates read each other's profile (name/horns/streak) for the scoreboard.
drop policy if exists "herdmates can read profiles" on public.profiles;
create policy "herdmates can read profiles" on public.profiles
  for select using (
    auth.uid() = id
    or exists (
      select 1 from public.herd_connections c
      where (c.user_low = auth.uid() and c.user_high = profiles.id)
         or (c.user_high = auth.uid() and c.user_low = profiles.id)
    )
  );

-- connections: members can see and leave them (created via the accept function)
drop policy if exists "connections visible to members" on public.herd_connections;
create policy "connections visible to members" on public.herd_connections
  for select using (auth.uid() in (user_low, user_high));
drop policy if exists "members can leave connection" on public.herd_connections;
create policy "members can leave connection" on public.herd_connections
  for delete using (auth.uid() in (user_low, user_high));

-- invites: you manage your own; accepting happens via the function above
drop policy if exists "own invites" on public.herd_invites;
create policy "own invites" on public.herd_invites
  for all using (auth.uid() = inviter_id) with check (auth.uid() = inviter_id);

-- challenges: any member of the connection can read/write
drop policy if exists "challenges for connection members" on public.shared_challenges;
create policy "challenges for connection members" on public.shared_challenges
  for all using (public.in_connection(connection_id))
  with check (public.in_connection(connection_id) and auth.uid() = created_by);

-- check-ins: members see all check-ins on shared challenges; you write your own
drop policy if exists "checkins readable by members" on public.challenge_checkins;
create policy "checkins readable by members" on public.challenge_checkins
  for select using (public.in_challenge(challenge_id));
drop policy if exists "insert own checkins" on public.challenge_checkins;
create policy "insert own checkins" on public.challenge_checkins
  for insert with check (auth.uid() = user_id and public.in_challenge(challenge_id));
drop policy if exists "delete own checkins" on public.challenge_checkins;
create policy "delete own checkins" on public.challenge_checkins
  for delete using (auth.uid() = user_id);
