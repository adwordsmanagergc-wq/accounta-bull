-- Accounta-Bull, personalized boost pool
-- ---------------------------------------------------------------------------
-- A pre-generated pool of AI-personalized boost lines, one set per user.
-- The `generate-boosts` Edge Function tops this up on a schedule using each
-- user's name, bio, streak, and active goals. The app and the push sender
-- prefer an unused personal line, then fall back to the shared boost_messages
-- library, so nothing breaks if the pool is empty or AI is turned off.
-- ---------------------------------------------------------------------------

create table if not exists public.boost_pool (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  category   text not null default 'general'
               check (category in ('fitness', 'work', 'mind', 'other', 'general')),
  text       text not null,
  used_at    timestamptz,               -- null = still available
  created_at timestamptz not null default now()
);

-- Fast lookup of a user's unused lines.
create index if not exists boost_pool_user_unused_idx
  on public.boost_pool (user_id, category)
  where used_at is null;

alter table public.boost_pool enable row level security;

-- Self-only: a user can read and mark their own lines used. Inserts come from
-- the Edge Function (service role), which bypasses RLS.
drop policy if exists "boost pool is self-only" on public.boost_pool;
create policy "boost pool is self-only" on public.boost_pool
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
