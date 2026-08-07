-- Accounta-Bull — Team group tasks. A coach posts one shared task for the whole
-- team; each member checks it off with an optional note, timestamped. Separate
-- from assigned goals (which live in the goals table, one per client).
-- Run AFTER 0011 + 0012. Additive only.

create table if not exists public.team_tasks (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams (id) on delete cascade,
  created_by  uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  description text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists team_tasks_team_idx on public.team_tasks (team_id);

-- One check-off per member per task (a note + when they finished).
create table if not exists public.team_task_checkins (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.team_tasks (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  note         text,
  completed_at timestamptz not null default now(),
  unique (task_id, user_id)
);
create index if not exists team_task_checkins_task_idx on public.team_task_checkins (task_id);

alter table public.team_tasks         enable row level security;
alter table public.team_task_checkins enable row level security;

-- team_tasks: any member reads; only coaches add / edit / remove.
drop policy if exists "members read group tasks" on public.team_tasks;
create policy "members read group tasks" on public.team_tasks
  for select using (public.is_team_member(team_id));
drop policy if exists "coaches add group tasks" on public.team_tasks;
create policy "coaches add group tasks" on public.team_tasks
  for insert with check (public.is_team_coach(team_id) and created_by = auth.uid());
drop policy if exists "coaches update group tasks" on public.team_tasks;
create policy "coaches update group tasks" on public.team_tasks
  for update using (public.is_team_coach(team_id)) with check (public.is_team_coach(team_id));
drop policy if exists "coaches delete group tasks" on public.team_tasks;
create policy "coaches delete group tasks" on public.team_tasks
  for delete using (public.is_team_coach(team_id));

-- check-ins: any member of the task's team reads all of them (shared board);
-- you write/edit/remove only your own.
drop policy if exists "members read checkins" on public.team_task_checkins;
create policy "members read checkins" on public.team_task_checkins
  for select using (
    public.is_team_member((select t.team_id from public.team_tasks t where t.id = task_id))
  );
drop policy if exists "insert own checkin" on public.team_task_checkins;
create policy "insert own checkin" on public.team_task_checkins
  for insert with check (
    user_id = auth.uid()
    and public.is_team_member((select t.team_id from public.team_tasks t where t.id = task_id))
  );
drop policy if exists "update own checkin" on public.team_task_checkins;
create policy "update own checkin" on public.team_task_checkins
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "delete own checkin" on public.team_task_checkins;
create policy "delete own checkin" on public.team_task_checkins
  for delete using (user_id = auth.uid());
