-- Accounta-Bull — daily journal + morning/evening nudges.
-- The user sets a wake time and a bed time. At wake we prompt them to write what
-- they plan to achieve today; at bedtime we ask whether they achieved it and how
-- it helped (or why not). Entries are kept as a personal journal.
-- Run AFTER earlier migrations. Additive only.

alter table public.profiles add column if not exists wake_time text; -- "HH:MM" local
alter table public.profiles add column if not exists bed_time  text; -- "HH:MM" local

create table if not exists public.journal_entries (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  entry_date         date not null default (now() at time zone 'utc')::date,
  morning_plan       text,
  evening_reflection text,
  achieved           boolean,             -- did they achieve today's plan
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, entry_date)
);
create index if not exists journal_entries_user_idx on public.journal_entries (user_id, entry_date desc);

alter table public.journal_entries enable row level security;
drop policy if exists "own journal" on public.journal_entries;
create policy "own journal" on public.journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Dedupe: at most one morning and one evening nudge per user per local day.
-- Written only by the edge function (service role); no client policies (deny all).
create table if not exists public.journal_push_sends (
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('morning', 'evening')),
  sent_on    date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, sent_on)
);
alter table public.journal_push_sends enable row level security;
