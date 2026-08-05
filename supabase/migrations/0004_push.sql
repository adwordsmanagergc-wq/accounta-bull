-- Accounta-Bull — Web Push subscriptions + per-user timezone.
-- Run this AFTER 0001–0003. Powers real background push notifications
-- (the send-push Edge Function) 30 minutes before each goal.

-- Store the user's timezone so the server can fire pushes at the right LOCAL
-- time (goal times are plain "HH:MM"). The app sets this automatically.
alter table public.profiles add column if not exists timezone text;

-- One row per browser/device push subscription.
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Dedupe: at most one push per user per goal per local day.
create table if not exists public.push_sends (
  user_id    uuid not null references auth.users (id) on delete cascade,
  goal_id    uuid not null references public.goals (id) on delete cascade,
  sent_on    date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, goal_id, sent_on)
);

-- RLS
alter table public.push_subscriptions enable row level security;
alter table public.push_sends         enable row level security;

-- Users manage only their own subscriptions. The Edge Function uses the
-- service-role key, which bypasses RLS, to read everyone's for sending.
drop policy if exists "own push subscriptions" on public.push_subscriptions;
create policy "own push subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- push_sends is written only by the server (service role); no client policies,
-- so RLS denies all client access by default.
