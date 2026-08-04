// Accounta-Bull — Boost email sender (OPTIONAL, add this later)
// -----------------------------------------------------------------------------
// A Supabase Edge Function you run on a cron schedule. It finds goals starting
// ~30 minutes from now and emails each user a boost via Resend's free tier.
//
// This file is intentionally standalone so you can SKIP it at first and add it
// whenever you're ready — nothing in the web app depends on it.
//
// Deploy + schedule instructions are in ./README.md.
// -----------------------------------------------------------------------------

import { createClient } from 'jsr:@supabase/supabase-js@2'

// The email step is fully optional. If RESEND_API_KEY isn't set, the function
// still runs and just logs who it *would* have emailed — so you can wire up the
// schedule first and turn on real email later.
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL = Deno.env.get('BOOST_FROM_EMAIL') ?? 'Accounta-Bull <onboarding@resend.dev>'

// Cron cadence this function is scheduled at (minutes). Used to build a
// no-overlap window so each goal is emailed once. Default: every 5 minutes.
const CRON_INTERVAL_MIN = Number(Deno.env.get('CRON_INTERVAL_MIN') ?? '5')
const LEAD_MIN = 30 // email this many minutes before a goal

type Goal = {
  id: string
  user_id: string
  title: string
  category: string
  time_of_day: string
  repeat_days: number[]
  active: boolean
}

function minutesUntil(timeOfDay: string, now: Date): number {
  const [h, m] = timeOfDay.split(':').map(Number)
  const target = new Date(now)
  target.setUTCHours(h, m, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / 60000)
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log(`[dry-run] would email ${to}: ${subject}`)
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  if (!res.ok) console.error('Resend error', res.status, await res.text())
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    // Service role key bypasses RLS — safe here because this runs server-side.
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const now = new Date()
  const weekday = now.getUTCDay()

  // NOTE ON TIMEZONES: goal times are stored as plain "HH:MM" without a zone.
  // This function treats them as UTC. The in-browser reminders already use each
  // user's real local time; refine this later by storing a per-user timezone.
  const { data: goals, error } = await supabase
    .from('goals')
    .select('*')
    .eq('active', true)
  if (error) {
    console.error(error)
    return new Response('error', { status: 500 })
  }

  const due = (goals as Goal[]).filter((g) => {
    const scheduledToday = g.repeat_days.length === 0 || g.repeat_days.includes(weekday)
    if (!scheduledToday) return false
    const mins = minutesUntil(g.time_of_day, now)
    // Fire once when the goal enters the [LEAD, LEAD+interval) window.
    return mins >= LEAD_MIN && mins < LEAD_MIN + CRON_INTERVAL_MIN
  })

  // Pull the boost message library once.
  const { data: messages } = await supabase.from('boost_messages').select('*')
  const msgs = messages ?? []

  let sent = 0
  for (const g of due) {
    const { data: userData } = await supabase.auth.admin.getUserById(g.user_id)
    const email = userData?.user?.email
    if (!email) continue

    const pool = msgs.filter((m) => m.category === g.category || m.category === 'general')
    const chosen = (pool.length ? pool : msgs)[Math.floor(Math.random() * (pool.length || msgs.length || 1))]
    const boost = chosen?.text ?? 'Show up. That’s the whole game.'

    const html = `
      <div style="font-family:Arial,sans-serif;background:#0a1628;color:#f4f7fb;padding:28px;border-radius:16px;max-width:480px">
        <div style="color:#f5821f;font-weight:bold;letter-spacing:2px;font-size:13px">⚡ CHARGE CALL</div>
        <h1 style="color:#fff;font-size:22px;margin:8px 0">${g.title}</h1>
        <p style="color:#a9b8d0;margin:0 0 18px">Starts in about ${LEAD_MIN} minutes.</p>
        <div style="background:#142a4d;border:1px solid rgba(201,169,106,.35);border-radius:14px;padding:20px;font-size:18px;line-height:1.4">
          “${boost}”
        </div>
        <p style="color:#7d8db0;font-size:12px;margin-top:20px">You’re getting this because you set a goal in Accounta-Bull.</p>
      </div>`

    await sendEmail(email, `⚡ Charge Call: ${g.title}`, html)
    sent++
  }

  return new Response(JSON.stringify({ checked: goals.length, due: due.length, sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
