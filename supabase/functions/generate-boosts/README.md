# generate-boosts

Tops up a per-user pool of **AI-personalized** charge-call lines using Claude
Haiku (the cheapest Claude model). Lines are written from each user's name, bio,
current streak, active goals, and their chosen **tone** (`soft`, `medium`, or
`savage`), then stored in `public.boost_pool`. When a user changes tone, the pool
refills in the new voice automatically.

The app (`src/pages/Boost.tsx`) and the push sender (`send-push`) both pull an
**unused personal line first** and fall back to the shared `boost_messages`
library. So this feature is purely additive: if the pool is empty, AI is turned
off, or the key is missing, everything still works with the static messages.

## Why it's cheap

Haiku 4.5 is about **$1 / 1M input tokens** and **$5 / 1M output tokens**. Each
user refill is a few hundred tokens. Refilling 100 users costs well under a cent,
and this only runs when a user drops below `MIN_UNUSED` unused lines, so most
runs generate nothing.

## Prerequisites

1. Run migrations `0009_boost_pool.sql` and `0010_boost_tone.sql` in the SQL editor.
2. Have an Anthropic API key. **If a key was ever pasted into a chat, revoke it
   in the Anthropic console and create a new one first.** The key lives ONLY as
   a function secret, never in the repo, the frontend, or Vercel.

## Deploy

```bash
# 1) Set the secret (server-side only, never committed)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# 2) Deploy the function
supabase functions deploy generate-boosts
```

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ANON_KEY` are provided
to Edge Functions automatically.

## Schedule it (once a day is plenty)

In the Supabase dashboard: **Database -> Cron** (pg_cron), or run this SQL:

```sql
select cron.schedule(
  'generate-boosts-daily',
  '0 6 * * *',  -- 06:00 UTC daily
  $$
  select net.http_post(
    url     := 'https://YOUR-PROJECT-REF.functions.supabase.co/generate-boosts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  );
  $$
);
```

Replace `YOUR-PROJECT-REF`. You can also just hit the function URL manually to
seed the pool the first time.

## Tunables (optional function secrets / env)

| Name              | Default            | Meaning                                     |
| ----------------- | ------------------ | ------------------------------------------- |
| `BOOST_MODEL`     | `claude-haiku-4-5` | Which Claude model to generate with         |
| `BOOST_MAX_USERS` | `40`               | Max users refilled per invocation           |

Thresholds `MIN_UNUSED` (4) and `TARGET` (8) live at the top of `index.ts`.
