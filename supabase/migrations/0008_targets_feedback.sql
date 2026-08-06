-- Accounta-Bull — progress targets (% to goal) + herd feedback on progress.
-- Run AFTER 0001–0007.

-- ===========================================================================
-- Targets: set a goal value + date; track % from start -> current -> target
-- ===========================================================================
create table if not exists public.progress_targets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  title           text not null,
  unit            text,
  start_value     numeric not null,
  current_value   numeric not null,
  target_value    numeric not null,
  target_date     date,
  shared_with_herd boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists progress_targets_user_idx on public.progress_targets (user_id);

alter table public.progress_targets enable row level security;

drop policy if exists "own targets" on public.progress_targets;
create policy "own targets" on public.progress_targets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Herd-mates can view a target its owner shared.
drop policy if exists "herd shared targets readable" on public.progress_targets;
create policy "herd shared targets readable" on public.progress_targets
  for select to authenticated using (
    shared_with_herd = true and exists (
      select 1 from public.herd_connections c
      where (c.user_low = auth.uid() and c.user_high = progress_targets.user_id)
         or (c.user_high = auth.uid() and c.user_low = progress_targets.user_id)
    )
  );

-- ===========================================================================
-- Feedback: herd-mates leave a positive emoji + message on a shared photo
-- ===========================================================================
create table if not exists public.photo_feedback (
  id         uuid primary key default gen_random_uuid(),
  photo_id   uuid not null references public.progress_photos (id) on delete cascade,
  from_user  uuid not null references auth.users (id) on delete cascade,
  emoji      text,
  message    text,
  created_at timestamptz not null default now()
);
create index if not exists photo_feedback_photo_idx on public.photo_feedback (photo_id);

alter table public.photo_feedback enable row level security;

-- Readable by the photo owner, and by herd-mates when the photo is shared.
drop policy if exists "feedback readable" on public.photo_feedback;
create policy "feedback readable" on public.photo_feedback
  for select to authenticated using (
    exists (
      select 1 from public.progress_photos pp
      where pp.id = photo_feedback.photo_id
        and (
          pp.user_id = auth.uid()
          or (pp.shared_with_herd = true and exists (
                select 1 from public.herd_connections c
                where (c.user_low = auth.uid() and c.user_high = pp.user_id)
                   or (c.user_high = auth.uid() and c.user_low = pp.user_id)))
        )
    )
  );

-- A herd-mate can leave feedback on a shared photo.
drop policy if exists "feedback insert herd" on public.photo_feedback;
create policy "feedback insert herd" on public.photo_feedback
  for insert to authenticated with check (
    from_user = auth.uid() and exists (
      select 1 from public.progress_photos pp
      join public.herd_connections c
        on ((c.user_low = auth.uid() and c.user_high = pp.user_id)
         or (c.user_high = auth.uid() and c.user_low = pp.user_id))
      where pp.id = photo_feedback.photo_id and pp.shared_with_herd = true
    )
  );
