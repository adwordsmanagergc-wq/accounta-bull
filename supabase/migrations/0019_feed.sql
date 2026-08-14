-- Accounta-Bull — social feed. Post a finished task (with a photo/video) to your
-- herd or a team; others can cheer and comment. Additive only.
-- Media is stored in the public `avatars` bucket (unguessable URL) so herd/team
-- mates can view it without signed URLs.

create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  scope      text not null check (scope in ('herd', 'team')),
  team_id    uuid references public.teams (id) on delete cascade,
  body       text,
  media_url  text,
  media_type text check (media_type in ('image', 'video')),
  goal_title text,
  created_at timestamptz not null default now()
);
create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_team_idx on public.posts (team_id);

create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

create table if not exists public.post_cheers (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ===========================================================================
-- Visibility helpers (security definer)
-- ===========================================================================
create or replace function public.herd_connected(other uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.herd_connections c
    where (c.user_low = auth.uid() and c.user_high = other)
       or (c.user_low = other and c.user_high = auth.uid()));
$$;

create or replace function public.can_see_post(p uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.posts po where po.id = p and (
      po.user_id = auth.uid()
      or (po.scope = 'team' and po.team_id is not null and public.is_team_member(po.team_id))
      or (po.scope = 'herd' and public.herd_connected(po.user_id))
    )
  );
$$;

-- ===========================================================================
-- RLS
-- ===========================================================================
alter table public.posts         enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_cheers   enable row level security;

drop policy if exists "read visible posts" on public.posts;
create policy "read visible posts" on public.posts
  for select using (
    user_id = auth.uid()
    or (scope = 'team' and team_id is not null and public.is_team_member(team_id))
    or (scope = 'herd' and public.herd_connected(user_id))
  );
drop policy if exists "create own posts" on public.posts;
create policy "create own posts" on public.posts
  for insert with check (
    user_id = auth.uid() and (
      (scope = 'herd' and team_id is null)
      or (scope = 'team' and public.is_team_member(team_id))
    )
  );
drop policy if exists "delete own posts" on public.posts;
create policy "delete own posts" on public.posts
  for delete using (user_id = auth.uid());

drop policy if exists "read comments" on public.post_comments;
create policy "read comments" on public.post_comments
  for select using (public.can_see_post(post_id));
drop policy if exists "add comments" on public.post_comments;
create policy "add comments" on public.post_comments
  for insert with check (user_id = auth.uid() and public.can_see_post(post_id));
drop policy if exists "delete own comments" on public.post_comments;
create policy "delete own comments" on public.post_comments
  for delete using (user_id = auth.uid());

drop policy if exists "read cheers" on public.post_cheers;
create policy "read cheers" on public.post_cheers
  for select using (public.can_see_post(post_id));
drop policy if exists "cheer" on public.post_cheers;
create policy "cheer" on public.post_cheers
  for insert with check (user_id = auth.uid() and public.can_see_post(post_id));
drop policy if exists "uncheer" on public.post_cheers;
create policy "uncheer" on public.post_cheers
  for delete using (user_id = auth.uid());
