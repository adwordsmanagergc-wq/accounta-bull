-- Accounta-Bull, boost tone preference
-- ---------------------------------------------------------------------------
-- Let each user pick how their charge-call messages sound:
--   soft   = soft and nice, gentle encouragement
--   medium = medium pushy, a firm confident nudge (default)
--   savage = rude and pushy, with swearing (opt-in only)
-- The AI generator writes lines in the chosen tone, and each pooled line
-- records the tone it was written for so a tone switch takes effect cleanly.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists boost_tone text not null default 'medium'
    check (boost_tone in ('soft', 'medium', 'savage'));

alter table public.boost_pool
  add column if not exists tone text not null default 'medium'
    check (tone in ('soft', 'medium', 'savage'));

-- Look up a user's unused lines for their current tone quickly.
create index if not exists boost_pool_user_tone_unused_idx
  on public.boost_pool (user_id, tone, category)
  where used_at is null;
