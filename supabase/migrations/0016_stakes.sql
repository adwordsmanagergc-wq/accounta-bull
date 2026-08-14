-- Accounta-Bull — Stakes. Put horns on the line for a goal, with an optional
-- forfeit that pings your herd if you miss. Opt-in per goal, additive only.

-- Stake fields on a goal (all default to "no stake", so existing goals are unaffected).
alter table public.goals add column if not exists stake_horns integer not null default 0;
alter table public.goals add column if not exists forfeit     text;
alter table public.goals add column if not exists notify_herd boolean not null default false;

-- One row per goal per local day it was missed, so we never double-penalize.
create table if not exists public.stake_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  goal_id    uuid not null references public.goals (id) on delete cascade,
  on_date    date not null,
  horns_lost integer not null default 0,
  forfeit    text,
  created_at timestamptz not null default now(),
  unique (goal_id, on_date)
);
create index if not exists stake_events_user_idx on public.stake_events (user_id, on_date desc);

alter table public.stake_events enable row level security;
-- Owner can read their own miss history. Writes come from the edge function
-- (service role), which bypasses RLS.
drop policy if exists "own stake events" on public.stake_events;
create policy "own stake events" on public.stake_events
  for select using (auth.uid() = user_id);
