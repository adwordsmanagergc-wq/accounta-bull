# Boost emails (optional — add this later)

This Edge Function emails users a boost ~30 minutes before each goal, using
[Resend](https://resend.com)'s free tier. **Nothing in the web app depends on
it** — the in-browser reminders work without it. Wire it up whenever you're
ready.

## What it does

Runs on a cron schedule (default: every 5 minutes). Each run finds goals whose
start time is 30 minutes away, picks a random boost message for that goal's
category, and emails the user.

> ⚠️ **Timezone note:** goal times are stored as plain `HH:MM` with no timezone,
> and this function treats them as **UTC**. The in-browser reminders already use
> each user's real local time. To make emails timezone-accurate later, add a
> `timezone` column to `profiles` and offset `time_of_day` per user.

## One-time setup

1. **Install the Supabase CLI** and log in:
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   ```

2. **Get a Resend API key** (free): sign up at resend.com → API Keys → create
   one. For real sending to arbitrary addresses you'll want to verify a domain;
   to just test, Resend lets you send from `onboarding@resend.dev` to your own
   verified address.

3. **Set the function secrets** (the service-role key is pre-set by Supabase):
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxx
   supabase secrets set BOOST_FROM_EMAIL="Accounta-Bull <onboarding@resend.dev>"
   # optional, must match your cron cadence below (minutes):
   supabase secrets set CRON_INTERVAL_MIN=5
   ```
   If you skip `RESEND_API_KEY`, the function runs in **dry-run** mode and just
   logs who it would email — handy for testing the schedule first.

4. **Deploy the function:**
   ```bash
   supabase functions deploy send-boost-emails
   ```

5. **Schedule it** with pg_cron + pg_net. In the Supabase SQL editor:
   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;

   -- Run every 5 minutes (must match CRON_INTERVAL_MIN).
   select cron.schedule(
     'boost-emails-every-5-min',
     '*/5 * * * *',
     $$
       select net.http_post(
         url     := 'https://YOUR-PROJECT-REF.functions.supabase.co/send-boost-emails',
         headers := jsonb_build_object(
           'Content-Type', 'application/json',
           'Authorization', 'Bearer ' || 'YOUR-SUPABASE-ANON-OR-SERVICE-KEY'
         )
       );
     $$
   );
   ```

## Test it

- Invoke once manually:
  ```bash
  supabase functions invoke send-boost-emails --no-verify-jwt
  ```
- Or hit the URL with curl. Check **Edge Function logs** in the dashboard for the
  `checked / due / sent` summary. Create a goal scheduled ~30 min out (in UTC) to
  see a real send.

## Turn it off

Unschedule the cron job:
```sql
select cron.unschedule('boost-emails-every-5-min');
```
