-- Accounta-Bull — messaging: team channels, herd chat, and 1:1 DMs.
-- Run AFTER the coach (0011/0012) and herd (0003) migrations. Additive only.

create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('team', 'herd', 'dm')),
  team_id     uuid references public.teams (id) on delete cascade,
  title       text,
  created_by  uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists conversations_team_idx on public.conversations (team_id);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conversation_members_user_idx on public.conversation_members (user_id);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists messages_conv_idx on public.messages (conversation_id, created_at);

-- Membership predicate (security definer avoids RLS recursion).
create or replace function public.is_conversation_member(conv uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.conversation_members m
                 where m.conversation_id = conv and m.user_id = auth.uid());
$$;

-- ===========================================================================
-- RLS
-- ===========================================================================
alter table public.conversations        enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages             enable row level security;

drop policy if exists "read own conversations" on public.conversations;
create policy "read own conversations" on public.conversations
  for select using (public.is_conversation_member(id));

drop policy if exists "read conversation roster" on public.conversation_members;
create policy "read conversation roster" on public.conversation_members
  for select using (public.is_conversation_member(conversation_id));

drop policy if exists "read messages" on public.messages;
create policy "read messages" on public.messages
  for select using (public.is_conversation_member(conversation_id));
drop policy if exists "post messages" on public.messages;
create policy "post messages" on public.messages
  for insert with check (user_id = auth.uid() and public.is_conversation_member(conversation_id));

-- ===========================================================================
-- RPCs (create conversations + add members with the right checks)
-- ===========================================================================

-- Coach creates a team channel with a title and either all active members or a chosen subset.
create or replace function public.create_team_chat(
  p_team uuid, p_title text, p_members uuid[] default '{}', p_all boolean default false
) returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); conv uuid;
begin
  if not public.is_team_coach(p_team) then raise exception 'Only a coach can create team chats'; end if;
  insert into public.conversations (kind, team_id, title, created_by)
    values ('team', p_team, nullif(trim(coalesce(p_title, '')), ''), me) returning id into conv;
  insert into public.conversation_members (conversation_id, user_id)
    values (conv, me) on conflict do nothing;
  if p_all then
    insert into public.conversation_members (conversation_id, user_id)
      select conv, m.user_id from public.team_members m
      where m.team_id = p_team and m.status = 'active'
      on conflict do nothing;
  else
    insert into public.conversation_members (conversation_id, user_id)
      select conv, u from unnest(p_members) as u
      where exists (select 1 from public.team_members m
                    where m.team_id = p_team and m.user_id = u and m.status = 'active')
      on conflict do nothing;
  end if;
  return conv;
end; $$;
grant execute on function public.create_team_chat(uuid, text, uuid[], boolean) to authenticated;

-- Get (or create) a 1:1 DM with another user you share a team or herd with.
create or replace function public.get_or_create_dm(p_other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); conv uuid;
begin
  if p_other = me then raise exception 'Cannot message yourself'; end if;
  if not (
    public.shares_team(p_other)
    or exists (select 1 from public.herd_connections c
               where (c.user_low = me and c.user_high = p_other) or (c.user_low = p_other and c.user_high = me))
  ) then
    raise exception 'You can only message your herd or team';
  end if;

  select cm.conversation_id into conv
  from public.conversation_members cm
  join public.conversations cv on cv.id = cm.conversation_id and cv.kind = 'dm'
  where cm.user_id in (me, p_other)
  group by cm.conversation_id
  having count(*) = 2 and bool_and(cm.user_id in (me, p_other))
  limit 1;

  if conv is null then
    insert into public.conversations (kind, created_by) values ('dm', me) returning id into conv;
    insert into public.conversation_members (conversation_id, user_id) values (conv, me), (conv, p_other);
  end if;
  return conv;
end; $$;
grant execute on function public.get_or_create_dm(uuid) to authenticated;
