-- Accounta-Bull — core schema + Row Level Security
-- Paste this whole file into the Supabase SQL editor and run it.
-- (Supabase dashboard -> SQL Editor -> New query -> paste -> Run)

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text,
  age_band    text,               -- kept for a later "herd" feature
  focus_areas text[] default '{}', -- kept for a later "herd" feature
  horns       integer not null default 0,
  streak      integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------
create table if not exists public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  category    text not null default 'other'
                check (category in ('fitness', 'work', 'mind', 'other')),
  time_of_day text not null default '08:00',   -- "HH:MM", local to the user
  repeat_days integer[] not null default '{}', -- 0=Sun .. 6=Sat; empty = daily
  horn_value  integer not null default 10,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists goals_user_idx on public.goals (user_id);

-- ---------------------------------------------------------------------------
-- completions
-- ---------------------------------------------------------------------------
create table if not exists public.completions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  goal_id      uuid not null references public.goals (id) on delete cascade,
  completed_at timestamptz not null default now(),
  committed    boolean not null default false
);
create index if not exists completions_user_idx on public.completions (user_id);
create index if not exists completions_goal_idx on public.completions (goal_id);

-- ---------------------------------------------------------------------------
-- boost_messages (shared library, readable by everyone signed in)
-- ---------------------------------------------------------------------------
create table if not exists public.boost_messages (
  id       bigint generated always as identity primary key,
  category text not null default 'general'
             check (category in ('fitness', 'work', 'mind', 'other', 'general')),
  text     text not null
);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.profiles       enable row level security;
alter table public.goals          enable row level security;
alter table public.completions    enable row level security;
alter table public.boost_messages enable row level security;

-- profiles: a user can only see and edit their own row
drop policy if exists "profiles are self-only" on public.profiles;
create policy "profiles are self-only" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- goals: self-only
drop policy if exists "goals are self-only" on public.goals;
create policy "goals are self-only" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- completions: self-only
drop policy if exists "completions are self-only" on public.completions;
create policy "completions are self-only" on public.completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- boost_messages: any signed-in user may read; nobody writes from the client
drop policy if exists "boost messages readable" on public.boost_messages;
create policy "boost messages readable" on public.boost_messages
  for select using (auth.role() = 'authenticated');
