-- Accounta-Bull — profile pictures, progress photos, and richer herds.
-- Run AFTER 0001–0004. Creates Storage buckets + policies and new columns.

-- ---------------------------------------------------------------------------
-- profiles: avatar + short bio
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;

-- ---------------------------------------------------------------------------
-- progress_photos: before / during / after shots with a date + note
-- ---------------------------------------------------------------------------
create table if not exists public.progress_photos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  phase        text not null default 'during' check (phase in ('before', 'during', 'after')),
  storage_path text not null,
  taken_on     date not null default (now() at time zone 'utc')::date,
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists progress_photos_user_idx on public.progress_photos (user_id);

alter table public.progress_photos enable row level security;
drop policy if exists "own progress photos" on public.progress_photos;
create policy "own progress photos" on public.progress_photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Richer herds: a name, group photo, and shared rules; challenge rules
-- ---------------------------------------------------------------------------
alter table public.herd_connections add column if not exists name text;
alter table public.herd_connections add column if not exists photo_url text;
alter table public.herd_connections add column if not exists rules text;
alter table public.shared_challenges add column if not exists rules text;

drop policy if exists "members can update connection" on public.herd_connections;
create policy "members can update connection" on public.herd_connections
  for update using (auth.uid() in (user_low, user_high))
  with check (auth.uid() in (user_low, user_high));

-- ===========================================================================
-- Storage buckets
--   avatars  : public read (profile + herd photos are shown to your herd)
--   progress : private (personal before/after photos; shown via signed URLs)
-- Files live under a "<user-id>/..." folder so users only touch their own.
-- ===========================================================================
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('progress', 'progress', false) on conflict (id) do nothing;

-- avatars: anyone can read; you write/replace/delete only in your own folder
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');
drop policy if exists "avatars write own" on storage.objects;
create policy "avatars write own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- progress: private — only the owner can read/write/delete their own folder
drop policy if exists "progress read own" on storage.objects;
create policy "progress read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'progress' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "progress write own" on storage.objects;
create policy "progress write own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'progress' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "progress delete own" on storage.objects;
create policy "progress delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'progress' and (storage.foldername(name))[1] = auth.uid()::text);
