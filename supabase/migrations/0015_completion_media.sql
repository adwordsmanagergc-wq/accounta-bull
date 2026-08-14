-- Accounta-Bull — capture a photo/video when you finish a task, saved to either
-- Progress (profile) or the daily Journal. Additive only.

-- Progress photos can now also be short videos.
alter table public.progress_photos
  add column if not exists media_type text not null default 'image'
    check (media_type in ('image', 'video'));

-- Media attached to a journal day (stored privately in the `progress` bucket
-- under the user's own folder, so existing storage RLS already protects it).
create table if not exists public.journal_media (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  entry_date   date not null default (now() at time zone 'utc')::date,
  storage_path text not null,
  media_type   text not null default 'image' check (media_type in ('image', 'video')),
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists journal_media_user_idx on public.journal_media (user_id, entry_date desc);

alter table public.journal_media enable row level security;
drop policy if exists "own journal media" on public.journal_media;
create policy "own journal media" on public.journal_media
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
