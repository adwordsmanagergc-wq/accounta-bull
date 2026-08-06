# Accounta-Bull (web)

Set daily fitness & work goals, get a **charge call** 30 minutes before each one,
check them off to earn **horns**, and keep your **streak** alive. Built with
**Vite + React + TypeScript**, auth by **Supabase**, hosted free on **GitHub
Pages**.

- **Navy** `#1E3A6E` · **Orange** `#F5821F` · **Gold** `#C9A96A`
- Display font **Archivo Black**, body font **Space Grotesk**
- Mobile-first — it's meant to live on a phone

> **Herds** are in: invite a friend by code, then set **shared challenges**
> with a reward/forfeit and a friendly-competition scoreboard (Herd tab). The
> global **rewards catalog** is still out; `age_band` and `focus_areas` stay in
> the schema for later.

---

## 1. Run it locally

```bash
npm install
cp .env.example .env      # then paste your Supabase URL + anon key into .env
npm run dev               # open the URL it prints (http://localhost:5173/)
```

The app still loads without Supabase keys — but sign-up/login only work once
`.env` is filled in.

### Your logo

The landing page uses two assets in `public/`, both generated from your logo:

- **`accountabullcrest.webp`** — the bull crest with the background removed. It's
  the brand mark used across the app (landing, auth, profile) and floats on the
  navy background with a soft glow.
- **`accountabullwordmark.webp`** — the "Accounta-Bull" wordmark on a white card,
  shown under the crest on the landing page so its navy text stays crisp.

To swap in a new logo later, replace those two files (same names). If
`accountabullcrest.webp` is missing, a placeholder (`public/logo.svg`) shows.

---

## 2. Supabase setup

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL editor → New query** → paste and run, in order:
   - `supabase/migrations/0001_schema.sql` (tables, RLS, auto-profile trigger)
   - `supabase/migrations/0002_seed_boosts.sql` (30 boost messages)
   - `supabase/migrations/0003_herd.sql` (herds: invite a friend + shared
     challenges with rewards/forfeits and a scoreboard)
   - `supabase/migrations/0004_push.sql` (Web Push subscriptions + timezone,
     for background charge-call notifications)
   - `supabase/migrations/0005_photos_herd.sql` (profile pictures + progress
     photos via Storage buckets; herd name/photo/rules; challenge rules)
   - `supabase/migrations/0006_measurements.sql` (weight log)
   - `supabase/migrations/0007_rewards_cheers_sharing.sql` (rewards catalog +
     redeem RPC, herd cheers, progress-photo sharing)
   - `supabase/migrations/0008_targets_feedback.sql` (progress targets with %
     tracking + herd feedback on shared progress)
3. **Project Settings → API** → copy the **Project URL** and **anon public key**
   into `.env`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ....
   ```
4. **Authentication → URL Configuration** → set the **Site URL** to your
   deployed app, and add these to **Redirect URLs** (the `/**` wildcard covers
   the hash routes and the magic-link `?code=` callback) so magic links /
   confirmations come back to the app:
   - `http://localhost:5173/**` (local dev)
   - `https://accounta-bull.com/**` and `https://www.accounta-bull.com/**` (production)
5. (Optional, for testing without email confirmation) **Authentication →
   Providers → Email** → you can turn *Confirm email* off while developing.

Row Level Security is enabled by the migration — every user can only read/write
their own `profiles`, `goals`, and `completions` rows; `boost_messages` is
read-only to signed-in users.

### Branding the auth emails (change "Supabase Auth" → "Accounta-Bull")

Signup/login emails have two brandable parts:

1. **Wording** (free, instant): **Authentication → Emails → Templates** → edit the
   *Confirm signup*, *Magic Link*, and *Reset password* subjects and bodies to
   your Accounta-Bull copy.
2. **Sender name/address** (the "Supabase Auth <noreply@mail.app.supabase.io>"
   line): the built-in mailer can't change this — you must enable **Custom SMTP**.
   Reuse Resend (same provider as the boost emails):
   - **Authentication → Emails → SMTP Settings → Enable Custom SMTP**
   - Sender name `Accounta-Bull`, sender email on your verified domain
   - Host `smtp.resend.com`, Port `465`, Username `resend`, Password = your
     Resend API key
   Until custom SMTP is set, the sender stays "Supabase Auth" no matter what the
   templates say.

### Background push notifications (Web Push)

The app is an installable PWA (service worker `public/sw.js`) and can send a real
"Charge Call" push ~30 min before each goal — **even when the app is closed** —
on desktop/Android, and on iPhone once added to the Home Screen (iOS 16.4+).

Setup (full details in `supabase/functions/send-push/README.md`):
1. `npx web-push generate-vapid-keys`
2. Put the **public** key in `VITE_VAPID_PUBLIC_KEY` (`.env` and Vercel env vars).
3. Run migration `0004_push.sql`.
4. Set the **private** key as a Supabase function secret and deploy + schedule
   the `send-push` Edge Function (cron every 5 min).

Users turn it on via **Profile → Enable**. Without the VAPID key set, the app
still shows in-app notifications while the tab is open.

### Boost emails (optional, later)

The cron email step lives in `supabase/functions/send-boost-emails/` with its own
README. Skip it for now — the in-browser reminders work without it.

---

## 3a. Deploy to Vercel (serves from the root domain)

Vercel auto-detects Vite — **no base-path config needed** (the default is `/`).

1. Push this repo to GitHub (see the commands below).
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
   Framework preset **Vite**, build `npm run build`, output `dist` (auto-filled).
3. **Environment Variables** → add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`, then Deploy.
4. **Custom domain:** the app is served at **https://accounta-bull.com**
   (Vercel → **Domains**). The code reads its own URL at runtime, so no code
   change is needed for the domain — but you MUST update Supabase auth URLs:
   in **Supabase → Authentication → URL Configuration** set the **Site URL** to
   `https://accounta-bull.com` and add these **Redirect URLs**:
   - `https://accounta-bull.com/**`
   - `https://www.accounta-bull.com/**`
   - `http://localhost:5173/**` (local dev)

> **White screen on Vercel?** That means the build used a GitHub Pages sub-path.
> Make sure `VITE_BASE` is **not** set in your Vercel project env vars — Vercel
> must build with the default base `/`.

## 3b. Deploy to GitHub Pages (serves from /<repo>/)

The repo ships a workflow (`.github/workflows/deploy.yml`) that builds and
publishes to GitHub Pages on every push to `main`.

**Assumes the repo is named `accountabull-web`.** If you pick a different name,
change `REPO_BASE` in `vite.config.ts` to `'/<your-repo-name>/'`.

### First-time commands (beginner-friendly)

You already have a git repo here with commits. Create the GitHub repo and push:

```bash
# 1. Install the GitHub CLI once (https://cli.github.com), then log in:
gh auth login

# 2. Create the repo on GitHub AND push this folder to it in one step.
#    (public is required for free GitHub Pages)
gh repo create accountabull-web --public --source=. --remote=origin --push
```

Prefer the website instead of the CLI? Do this:

```bash
# 1. On github.com click "+" -> New repository -> name it "accountabull-web"
#    -> Public -> DON'T add a README/gitignore -> Create.
# 2. Back here, connect and push (replace YOUR-USERNAME):
git remote add origin https://github.com/YOUR-USERNAME/accountabull-web.git
git branch -M main
git push -u origin main
```

### Turn on Pages (one time)

1. GitHub → your repo → **Settings → Pages**.
2. **Build and deployment → Source → GitHub Actions**.
3. Push to `main` (or **Actions** tab → run *Deploy to GitHub Pages*).
4. When it's green, your site is at
   `https://YOUR-USERNAME.github.io/accountabull-web/`.

### Add Supabase keys for the deployed build

So the live site can talk to Supabase, add repo secrets:

- GitHub → repo → **Settings → Secrets and variables → Actions → New repository
  secret**, add:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

(The anon key is safe to expose in a browser app — RLS is what protects data.)

---

## Project structure

```
src/
  pages/        Landing, Login, Signup, Today, GoalEdit, Boost, Profile
  components/   Logo, TabBar
  context/      AuthContext, ToastContext
  hooks/        useReminders (every-minute charge-call check)
  lib/          supabase, api, game logic, boost messages, notifications, types
supabase/
  migrations/   0001_schema.sql, 0002_seed_boosts.sql
  functions/    send-boost-emails (optional cron email via Resend)
.github/workflows/deploy.yml
```

## Game logic

- **Complete a goal** → earn its full `horn_value`.
- **Skip after committing** (you pressed *I'm charging* on the boost screen but
  then skip) → **−5 horns**.
- **Streak** = consecutive days with at least one completion.
