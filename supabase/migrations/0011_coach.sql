-- Accounta-Bull — Coach / Team (business) section.
-- Run AFTER 0001-0010. STAGE A: additive schema only. No destructive changes.
--
-- A "Team" is a coach's business group (owner = head coach / manager) who
-- invites clients and co-coaches. This is separate from the 1:1 friend "Herd".
--
-- Existing-table touches in this migration are ADDITIVE, nullable columns only:
--   * goals:    team_id, assigned_by      (null for all normal solo goals)
--   * profiles: username                  (null for all existing users)
-- Nothing existing is rewritten; solo users are completely unaffected.
-- RLS is enabled on the new tables with NO policies yet (deny-all) — the access
-- rules land in Stage B.
--
-- NOTE: the new tables are created FIRST, because goals.team_id references
-- public.teams. (Statements run top-to-bottom in one transaction.)
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- New tables (created before the goals FK that references teams)
-- ===========================================================================

-- The coach's business group.
create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,  -- head coach / manager
  name       text not null,
  logo_url   text,
  accent     text,                    -- optional theme accent (hex)
  created_at timestamptz not null default now()
);
create index if not exists teams_owner_idx on public.teams (owner_id);

-- Membership + role within a Team. This is where "who is a coach/client" lives.
-- status: co-coaches invited by username start 'pending' until they accept;
-- clients who join via link are 'active' immediately.
create table if not exists public.team_members (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text not null default 'client' check (role in ('owner','coach','client')),
  status       text not null default 'active' check (status in ('pending','active')),
  share_photos boolean not null default false,   -- client opt-in (#6), per-Team
  created_at   timestamptz not null default now(),
  unique (team_id, user_id)
);
create index if not exists team_members_team_idx on public.team_members (team_id);
create index if not exists team_members_user_idx on public.team_members (user_id);

-- Reusable invite links/codes (role decides client vs co-coach link).
create table if not exists public.team_invites (
  code       text primary key,
  team_id    uuid not null references public.teams (id) on delete cascade,
  role       text not null default 'client' check (role in ('coach','client')),
  created_by uuid not null references auth.users (id) on delete cascade,
  max_uses   integer,                 -- null = unlimited
  uses       integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists team_invites_team_idx on public.team_invites (team_id);

-- Log of custom coach -> client push messages (#5).
create table if not exists public.team_notifications (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams (id) on delete cascade,
  sent_by     uuid not null references auth.users (id) on delete cascade,
  target_user uuid references auth.users (id) on delete cascade,  -- null = whole team
  title       text not null,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists team_notifications_team_idx on public.team_notifications (team_id);

-- Co-coach -> head coach private suggestions/reports (#7 addition).
-- Visible only to a Team's coaches/owner; clients never see these.
create table if not exists public.team_coach_notes (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams (id) on delete cascade,
  author_id   uuid not null references auth.users (id) on delete cascade,
  about_user  uuid references auth.users (id) on delete set null, -- which client, optional
  kind        text not null default 'note' check (kind in ('suggestion','report','note')),
  body        text not null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists team_coach_notes_team_idx on public.team_coach_notes (team_id);

-- ===========================================================================
-- Additive columns on existing tables (now that teams exists)
-- ===========================================================================

-- Assigned tasks reuse the goals table: the client stays the row owner
-- (user_id), so Today / completions / streaks / horns keep working unchanged.
alter table public.goals add column if not exists team_id     uuid references public.teams (id) on delete set null;
alter table public.goals add column if not exists assigned_by uuid references auth.users (id) on delete set null;
create index if not exists goals_team_idx on public.goals (team_id);

-- Username, needed to invite a co-coach by handle. Case-insensitive unique,
-- enforced only for rows that set one (many nulls allowed).
alter table public.profiles add column if not exists username text;
create unique index if not exists profiles_username_key
  on public.profiles (lower(username)) where username is not null;

-- ===========================================================================
-- Enable RLS now (deny-all until Stage B adds policies). Nothing is exposed.
-- ===========================================================================
alter table public.teams              enable row level security;
alter table public.team_members       enable row level security;
alter table public.team_invites       enable row level security;
alter table public.team_notifications enable row level security;
alter table public.team_coach_notes   enable row level security;
