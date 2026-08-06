-- Accounta-Bull — body measurements log (weight over time).
-- Run AFTER 0001–0005.

create table if not exists public.measurements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  taken_on   date not null default (now() at time zone 'utc')::date,
  weight     numeric,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists measurements_user_idx on public.measurements (user_id, taken_on);

alter table public.measurements enable row level security;
drop policy if exists "own measurements" on public.measurements;
create policy "own measurements" on public.measurements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
