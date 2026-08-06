# Web Push notifications

Sends a real "Charge Call" push ~30 minutes before each goal — **even when the
app is closed** — on desktop and Android, and on iPhone when the app has been
**added to the Home Screen** (iOS 16.4+).

## How it fits together

1. The browser subscribes to push (service worker `public/sw.js`) and stores the
   subscription in `push_subscriptions` (done by the app when the user taps
   **Enable** on the Profile page).
2. This Edge Function runs on a cron, finds goals 30 min away **in each user's
   timezone**, and sends the push via the VAPID keys.

## One-time setup

1. **Generate VAPID keys** (a public/private pair):
   ```bash
   npx web-push generate-vapid-keys
   ```

2. **Frontend** — set the PUBLIC key as `VITE_VAPID_PUBLIC_KEY`:
   - locally in `.env`
   - in **Vercel → Settings → Environment Variables** (then redeploy)

3. **Run the DB migration** `supabase/migrations/0004_push.sql` (adds
   `push_subscriptions`, `push_sends`, and `profiles.timezone`).

4. **Set the function secrets** (private key stays server-side only):
   ```bash
   supabase secrets set VAPID_PUBLIC_KEY=<public key>
   supabase secrets set VAPID_PRIVATE_KEY=<private key>
   supabase secrets set VAPID_SUBJECT="mailto:you@accounta-bull.com"
   # optional, must match the cron cadence below (minutes):
   supabase secrets set CRON_INTERVAL_MIN=5
   ```

5. **Deploy:**
   ```bash
   supabase functions deploy send-push
   ```

6. **Schedule it** (SQL editor):
   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;

   select cron.schedule(
     'send-push-every-5-min',
     '*/5 * * * *',
     $$
       select net.http_post(
         url     := 'https://YOUR-PROJECT-REF.functions.supabase.co/send-push',
         headers := jsonb_build_object(
           'Content-Type', 'application/json',
           'Authorization', 'Bearer ' || 'YOUR-SERVICE-ROLE-OR-ANON-KEY'
         )
       );
     $$
   );
   ```

## Test it (instant — no 30-min wait)

After deploying, open the app → **Profile → 🔔 Send a test notification**. This
calls the function in *test mode* (`{ "test": true }`), which pushes to your
signed-in device immediately and reports back:

- **"Test push sent 🎉"** → the whole chain works.
- **"This device isn't subscribed yet"** → tap **Enable** first (and confirm
  `VITE_VAPID_PUBLIC_KEY` is set in Vercel and the app was redeployed).
- **"Subscription found but the push failed"** → check the VAPID secrets on the
  server (`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`).
- **"Couldn't reach the push function"** → the function isn't deployed.

You can also invoke the cron path manually and watch the logs (`due / sent`):
```bash
supabase functions invoke send-push --no-verify-jwt
```
To test the real 30-min flow: create a goal ~32 minutes out (today) and wait.

## Turn it off

```sql
select cron.unschedule('send-push-every-5-min');
```

## Notes

- **iPhone:** the user must **Share → Add to Home Screen** and open the app from
  that icon before push will work (a browser-tab limitation, not this app).
- Timezone comes from `profiles.timezone`, which the app sets automatically on
  login. New/never-opened accounts default to UTC until they sign in once.
