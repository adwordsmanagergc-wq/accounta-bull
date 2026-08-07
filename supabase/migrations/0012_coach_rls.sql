-- Accounta-Bull — Coach / Team STAGE B: roles, permissions, RLS, and the safe
-- write RPCs. Run AFTER 0011_coach.sql. Additive only.
--
-- Access model:
--   * Clients see only their own data (unchanged self-only policies).
--   * A Team's coaches/owner can read that Team's clients' profile, streaks,
--     completions, assigned goals, and opted-in progress photos.
--   * Cross-user writes (assigning tasks, adding co-coaches) go through
--     security-definer RPCs that check the caller's role first.
-- All new SELECT policies are ADDITIVE (Postgres ORs permissive policies), so
-- nothing existing is loosened or removed.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- Helper predicates (security definer avoids RLS recursion; auth.uid() still
-- resolves to the CURRENT user inside them).
-- ===========================================================================
create or replace function public.is_team_member(team uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.teams t where t.id = team and t.owner_id = auth.uid())
      or exists (select 1 from public.team_members m
                 where m.team_id = team and m.user_id = auth.uid() and m.status = 'active');
$$;

create or replace function public.is_team_coach(team uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.teams t where t.id = team and t.owner_id = auth.uid())
      or exists (select 1 from public.team_members m
                 where m.team_id = team and m.user_id = auth.uid()
                   and m.status = 'active' and m.role in ('owner', 'coach'));
$$;

-- Does the current user coach a Team that this other user is an active member of?
create or replace function public.coach_sees_user(client uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.team_members m
    where m.user_id = client and m.status = 'active' and public.is_team_coach(m.team_id)
  );
$$;

-- Same, but only when that client opted in to sharing photos with the Team.
create or replace function public.coach_can_see_photos(client uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.team_members m
    where m.user_id = client and m.status = 'active' and m.share_photos = true
      and public.is_team_coach(m.team_id)
  );
$$;

-- Do the current user and `other` share any Team (either direction)?
create or replace function public.shares_team(other uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.team_members a
    join public.team_members b on a.team_id = b.team_id
    where a.user_id = auth.uid() and a.status = 'active'
      and b.user_id = other and b.status = 'active'
  );
$$;

-- ===========================================================================
-- Write RPCs (all check the caller's role before mutating).
-- ===========================================================================

-- Create a Team; the caller becomes owner + an active member row.
create or replace function public.create_team(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); tid uuid;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Team needs a name'; end if;
  insert into public.teams (owner_id, name) values (me, trim(p_name)) returning id into tid;
  insert into public.team_members (team_id, user_id, role, status)
    values (tid, me, 'owner', 'active')
    on conflict (team_id, user_id) do nothing;
  return tid;
end; $$;
grant execute on function public.create_team(text) to authenticated;

-- Coach creates a reusable invite code (client or co-coach link).
create or replace function public.create_team_invite(
  p_team uuid, p_role text default 'client', p_max_uses integer default null, p_expires timestamptz default null
) returns text language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c text;
begin
  if not public.is_team_coach(p_team) then raise exception 'Only a coach can create invites'; end if;
  if p_role not in ('client', 'coach') then raise exception 'Invalid role'; end if;
  -- gen_random_uuid() is built in (no pgcrypto needed); take 12 hex chars.
  c := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  insert into public.team_invites (code, team_id, role, created_by, max_uses, expires_at)
    values (c, p_team, p_role, me, p_max_uses, p_expires);
  return c;
end; $$;
grant execute on function public.create_team_invite(uuid, text, integer, timestamptz) to authenticated;

-- Join a Team from an invite code.
create or replace function public.join_team_by_code(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); inv public.team_invites%rowtype;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  select * into inv from public.team_invites where code = p_code;
  if inv.code is null then raise exception 'Invite code not found'; end if;
  if inv.expires_at is not null and inv.expires_at < now() then raise exception 'This invite has expired'; end if;
  if inv.max_uses is not null and inv.uses >= inv.max_uses then raise exception 'This invite has been used up'; end if;
  insert into public.team_members (team_id, user_id, role, status)
    values (inv.team_id, me, inv.role, 'active')
    on conflict (team_id, user_id) do update set status = 'active';
  update public.team_invites set uses = uses + 1 where code = p_code;
  return inv.team_id;
end; $$;
grant execute on function public.join_team_by_code(text) to authenticated;

-- Owner adds a co-coach by username (pending until they accept).
create or replace function public.add_coach_by_username(p_team uuid, p_username text)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); target uuid;
begin
  if not exists (select 1 from public.teams where id = p_team and owner_id = me) then
    raise exception 'Only the team owner can add co-coaches';
  end if;
  select id into target from public.profiles where lower(username) = lower(trim(p_username));
  if target is null then raise exception 'No user found with that username'; end if;
  if target = me then raise exception 'You already own this team'; end if;
  insert into public.team_members (team_id, user_id, role, status)
    values (p_team, target, 'coach', 'pending')
    on conflict (team_id, user_id) do update set role = 'coach';
  return target;
end; $$;
grant execute on function public.add_coach_by_username(uuid, text) to authenticated;

-- Accept a pending membership (e.g. a co-coach invite).
create or replace function public.accept_team_membership(p_team uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.team_members set status = 'active'
   where team_id = p_team and user_id = auth.uid() and status = 'pending';
end; $$;
grant execute on function public.accept_team_membership(uuid) to authenticated;

-- Client opts in/out of sharing progress photos with the Team's coaches.
create or replace function public.set_team_photo_sharing(p_team uuid, p_share boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.team_members set share_photos = p_share
   where team_id = p_team and user_id = auth.uid();
end; $$;
grant execute on function public.set_team_photo_sharing(uuid, boolean) to authenticated;

-- Coach assigns a task to one client (p_client) or the whole Team (p_client null).
-- Reuses the goals table: the client is the owner, so it shows on their Today
-- and earns horns normally. Returns how many goals were created.
create or replace function public.assign_team_task(
  p_team uuid, p_client uuid, p_title text, p_category text default 'other',
  p_time text default '08:00', p_repeat integer[] default '{}', p_horns integer default 10
) returns integer language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); n integer := 0; r record;
begin
  if not public.is_team_coach(p_team) then raise exception 'Only a coach can assign tasks'; end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'Task needs a title'; end if;
  if p_category not in ('fitness','work','mind','other') then p_category := 'other'; end if;
  if p_client is not null then
    if not exists (select 1 from public.team_members m
                   where m.team_id = p_team and m.user_id = p_client
                     and m.role = 'client' and m.status = 'active') then
      raise exception 'That client is not on this team';
    end if;
    insert into public.goals (user_id, title, category, time_of_day, repeat_days, horn_value, team_id, assigned_by)
      values (p_client, trim(p_title), p_category, p_time, p_repeat, greatest(0, p_horns), p_team, me);
    n := 1;
  else
    for r in select user_id from public.team_members
             where team_id = p_team and role = 'client' and status = 'active' loop
      insert into public.goals (user_id, title, category, time_of_day, repeat_days, horn_value, team_id, assigned_by)
        values (r.user_id, trim(p_title), p_category, p_time, p_repeat, greatest(0, p_horns), p_team, me);
      n := n + 1;
    end loop;
  end if;
  return n;
end; $$;
grant execute on function public.assign_team_task(uuid, uuid, text, text, text, integer[], integer) to authenticated;

-- Coach/owner removes a member (never the owner).
create or replace function public.remove_team_member(p_team uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_team_coach(p_team) then raise exception 'Only a coach can remove members'; end if;
  if exists (select 1 from public.teams where id = p_team and owner_id = p_user) then
    raise exception 'The team owner cannot be removed';
  end if;
  delete from public.team_members where team_id = p_team and user_id = p_user;
end; $$;
grant execute on function public.remove_team_member(uuid, uuid) to authenticated;

-- ===========================================================================
-- RLS policies
-- ===========================================================================

-- teams: members read; owner edits/deletes; creation is via create_team RPC.
drop policy if exists "team readable by members" on public.teams;
create policy "team readable by members" on public.teams
  for select using (public.is_team_member(id));
drop policy if exists "owner updates team" on public.teams;
create policy "owner updates team" on public.teams
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner deletes team" on public.teams;
create policy "owner deletes team" on public.teams
  for delete using (owner_id = auth.uid());

-- team_members: you read your own rows; coaches read the whole roster.
-- Writes go through RPCs; you may delete your own row (leave).
drop policy if exists "read own membership or as coach" on public.team_members;
create policy "read own membership or as coach" on public.team_members
  for select using (user_id = auth.uid() or public.is_team_coach(team_id));
drop policy if exists "leave a team" on public.team_members;
create policy "leave a team" on public.team_members
  for delete using (user_id = auth.uid());

-- team_invites: coaches manage; joining reads via join_team_by_code RPC.
drop policy if exists "coaches manage invites" on public.team_invites;
create policy "coaches manage invites" on public.team_invites
  for all using (public.is_team_coach(team_id)) with check (public.is_team_coach(team_id));

-- team_notifications: coaches read the log (inserts come from the edge function).
drop policy if exists "coaches read team notifications" on public.team_notifications;
create policy "coaches read team notifications" on public.team_notifications
  for select using (public.is_team_coach(team_id));

-- team_coach_notes: coaches of the Team read; authors write; owner can resolve.
drop policy if exists "coaches read notes" on public.team_coach_notes;
create policy "coaches read notes" on public.team_coach_notes
  for select using (public.is_team_coach(team_id));
drop policy if exists "coaches write notes" on public.team_coach_notes;
create policy "coaches write notes" on public.team_coach_notes
  for insert with check (author_id = auth.uid() and public.is_team_coach(team_id));
drop policy if exists "author or owner updates notes" on public.team_coach_notes;
create policy "author or owner updates notes" on public.team_coach_notes
  for update using (
    author_id = auth.uid()
    or exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Additive coach-read policies on EXISTING tables (nothing is loosened).
-- ---------------------------------------------------------------------------

-- profiles: teammates can read each other's basic profile (name/avatar/stats).
drop policy if exists "teammates can read profiles" on public.profiles;
create policy "teammates can read profiles" on public.profiles
  for select using (public.shares_team(id));

-- goals: coaches can read AND manage the tasks they assigned (team_id set).
drop policy if exists "coaches read team goals" on public.goals;
create policy "coaches read team goals" on public.goals
  for select using (team_id is not null and public.is_team_coach(team_id));
drop policy if exists "coaches update team goals" on public.goals;
create policy "coaches update team goals" on public.goals
  for update using (team_id is not null and public.is_team_coach(team_id))
  with check (team_id is not null and public.is_team_coach(team_id));
drop policy if exists "coaches delete team goals" on public.goals;
create policy "coaches delete team goals" on public.goals
  for delete using (team_id is not null and public.is_team_coach(team_id));

-- completions: coaches can read their clients' completions (for streaks/progress).
drop policy if exists "coaches read client completions" on public.completions;
create policy "coaches read client completions" on public.completions
  for select using (public.coach_sees_user(user_id));

-- progress_photos: coaches can read a client's photos only if that client
-- opted in to sharing with the Team.
drop policy if exists "coaches read opted-in photos" on public.progress_photos;
create policy "coaches read opted-in photos" on public.progress_photos
  for select using (public.coach_can_see_photos(user_id));

-- storage: coaches can read the underlying private files for opted-in photos.
drop policy if exists "coaches read opted-in progress files" on storage.objects;
create policy "coaches read opted-in progress files" on storage.objects
  for select to authenticated using (
    bucket_id = 'progress'
    and public.coach_can_see_photos(((storage.foldername(name))[1])::uuid)
  );
