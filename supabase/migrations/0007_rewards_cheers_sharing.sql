-- Accounta-Bull — rewards catalog, herd cheers, and progress-photo sharing.
-- Run AFTER 0001–0006.

-- ===========================================================================
-- Rewards catalog + redemptions (spend horns)
-- ===========================================================================
create table if not exists public.rewards (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  emoji       text default '🎁',
  cost        integer not null default 100,
  active      boolean not null default true,
  sort        integer not null default 0
);

create table if not exists public.redemptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  reward_id  uuid not null references public.rewards (id) on delete cascade,
  cost       integer not null,
  status     text not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists redemptions_user_idx on public.redemptions (user_id);

alter table public.rewards     enable row level security;
alter table public.redemptions enable row level security;

drop policy if exists "rewards readable" on public.rewards;
create policy "rewards readable" on public.rewards
  for select using (auth.role() = 'authenticated');

drop policy if exists "own redemptions" on public.redemptions;
create policy "own redemptions" on public.redemptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Atomically spend horns on a reward.
create or replace function public.redeem_reward(p_reward uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  me   uuid := auth.uid();
  c    integer;
  have integer;
begin
  select cost into c from public.rewards where id = p_reward and active = true;
  if c is null then raise exception 'Reward not found'; end if;
  select horns into have from public.profiles where id = me;
  if coalesce(have, 0) < c then raise exception 'Not enough horns'; end if;
  update public.profiles set horns = horns - c where id = me;
  insert into public.redemptions (user_id, reward_id, cost) values (me, p_reward, c);
  return have - c;
end;
$$;
grant execute on function public.redeem_reward(uuid) to authenticated;

-- Seed a small catalog (safe to re-run).
insert into public.rewards (title, description, emoji, cost, sort)
select * from (values
  ('Rest day pass',      'Skip one goal guilt-free — no streak penalty.', '😌', 50,  1),
  ('Cheat meal',         'You earned it. Enjoy without the guilt.',       '🍔', 100, 2),
  ('1 month free',       'A free month of Accounta-Bull membership.',     '🎟️', 500, 3),
  ('Herd bragging rights','A badge on your profile for a week.',          '👑', 250, 4),
  ('Charity donation',   'We donate $5 to a fitness charity in your name.','❤️', 300, 5)
) as v(title, description, emoji, cost, sort)
where not exists (select 1 from public.rewards);

-- ===========================================================================
-- Herd cheers — quick emoji reactions on a shared challenge
-- ===========================================================================
create table if not exists public.challenge_cheers (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.shared_challenges (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  emoji        text not null,
  created_at   timestamptz not null default now()
);
create index if not exists challenge_cheers_ch_idx on public.challenge_cheers (challenge_id);

alter table public.challenge_cheers enable row level security;
drop policy if exists "cheers readable by members" on public.challenge_cheers;
create policy "cheers readable by members" on public.challenge_cheers
  for select using (public.in_challenge(challenge_id));
drop policy if exists "insert own cheers" on public.challenge_cheers;
create policy "insert own cheers" on public.challenge_cheers
  for insert with check (auth.uid() = user_id and public.in_challenge(challenge_id));

-- ===========================================================================
-- Progress-photo sharing with your herd
-- ===========================================================================
alter table public.progress_photos add column if not exists shared_with_herd boolean not null default false;

-- Herd-mates can read a photo row that its owner marked shared.
drop policy if exists "herd shared progress readable" on public.progress_photos;
create policy "herd shared progress readable" on public.progress_photos
  for select to authenticated using (
    shared_with_herd = true and exists (
      select 1 from public.herd_connections c
      where (c.user_low = auth.uid() and c.user_high = progress_photos.user_id)
         or (c.user_high = auth.uid() and c.user_low = progress_photos.user_id)
    )
  );

-- ...and read the underlying private file so they can sign a URL for it.
drop policy if exists "progress read shared herd" on storage.objects;
create policy "progress read shared herd" on storage.objects
  for select to authenticated using (
    bucket_id = 'progress' and exists (
      select 1
      from public.progress_photos pp
      join public.herd_connections c
        on ((c.user_low = auth.uid() and c.user_high::text = (storage.foldername(name))[1])
         or (c.user_high = auth.uid() and c.user_low::text = (storage.foldername(name))[1]))
      where pp.storage_path = name and pp.shared_with_herd = true
    )
  );
