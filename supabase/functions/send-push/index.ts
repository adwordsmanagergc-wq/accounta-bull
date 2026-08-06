// Accounta-Bull — Web Push sender (runs on a cron every few minutes)
// -----------------------------------------------------------------------------
// Finds goals starting ~30 minutes from now (in each user's LOCAL timezone) and
// sends a Web Push "Charge Call" to that user's subscribed devices, using a
// random boost message for the goal's category.
//
// Setup + scheduling: see ./README.md
// -----------------------------------------------------------------------------

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@accounta-bull.com'
const CRON_INTERVAL_MIN = Number(Deno.env.get('CRON_INTERVAL_MIN') ?? '5')
const LEAD_MIN = 30

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

type Goal = {
  id: string
  user_id: string
  title: string
  category: string
  time_of_day: string
  repeat_days: number[]
  active: boolean
}
type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

/** Current local time (minutes since midnight), weekday (0=Sun), and date key. */
function localNow(tz: string) {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  let hour = Number(get('hour'))
  if (hour === 24) hour = 0 // some runtimes emit "24" at midnight
  const minute = Number(get('minute'))
  return {
    minutes: hour * 60 + minute,
    weekday: WEEKDAY_INDEX[get('weekday')] ?? 0,
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Read an optional JSON body (the cron sends none).
  let reqBody: { test?: boolean } = {}
  try {
    reqBody = await req.json()
  } catch {
    /* no body */
  }

  // --- Test mode: push immediately to the signed-in caller's devices ---------
  if (reqBody.test) {
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    )
    const {
      data: { user },
    } = await authClient.auth.getUser()
    if (!user) return json({ error: 'not-authenticated' }, 401)

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id)

    const payload = JSON.stringify({
      title: '⚡ Test Charge Call',
      body: 'Push is working! You’ll get a real boost 30 min before each goal. 🐂',
      url: '/',
      icon: '/icon-192.png',
      tag: 'test-push',
    })

    let tSent = 0
    let tCleaned = 0
    for (const s of (subs as Sub[]) ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        )
        tSent++
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', s.id)
          tCleaned++
        } else {
          console.error('test push error', status, err)
        }
      }
    }
    return json({ test: true, subscriptions: (subs as Sub[])?.length ?? 0, sent: tSent, cleaned: tCleaned })
  }

  const [{ data: goals }, { data: profiles }, { data: messages }] = await Promise.all([
    supabase.from('goals').select('*').eq('active', true),
    supabase.from('profiles').select('id, timezone'),
    supabase.from('boost_messages').select('category, text'),
  ])

  const tzOf = new Map<string, string>()
  for (const p of profiles ?? []) tzOf.set(p.id as string, (p.timezone as string) || 'UTC')

  const msgs = messages ?? []
  const pickStatic = (category: string) => {
    const pool = msgs.filter((m) => m.category === category || m.category === 'general')
    const from = pool.length ? pool : msgs
    return from.length ? from[Math.floor(Math.random() * from.length)].text : 'Time to charge.'
  }

  // Prefer an AI-personalized line for this user, marking it used so it isn't
  // repeated. Falls back to the shared static library. The boost_pool table may
  // not exist yet (older setups), so any error here is non-fatal.
  const pickBoost = async (userId: string, category: string) => {
    try {
      const { data } = await supabase
        .from('boost_pool')
        .select('id, text')
        .eq('user_id', userId)
        .is('used_at', null)
        .or(`category.eq.${category},category.eq.general`)
        .order('created_at', { ascending: true })
        .limit(1)
      const line = (data as { id: string; text: string }[] | null)?.[0]
      if (line) {
        await supabase.from('boost_pool').update({ used_at: new Date().toISOString() }).eq('id', line.id)
        return line.text
      }
    } catch (err) {
      console.error('boost_pool lookup failed', err)
    }
    return pickStatic(category)
  }

  // Which goals are entering the 30-minute window right now (per user tz)?
  const due: { goal: Goal; dateKey: string }[] = []
  for (const goal of (goals as Goal[]) ?? []) {
    const tz = tzOf.get(goal.user_id) ?? 'UTC'
    const { minutes, weekday, dateKey } = localNow(tz)
    const scheduledToday = goal.repeat_days.length === 0 || goal.repeat_days.includes(weekday)
    if (!scheduledToday) continue
    const [h, m] = goal.time_of_day.split(':').map(Number)
    const mins = h * 60 + m - minutes
    if (mins >= LEAD_MIN && mins < LEAD_MIN + CRON_INTERVAL_MIN) due.push({ goal, dateKey })
  }

  let sent = 0
  let cleaned = 0
  for (const { goal, dateKey } of due) {
    // Dedupe: one push per user/goal/local-day.
    const { error: dupeErr } = await supabase
      .from('push_sends')
      .insert({ user_id: goal.user_id, goal_id: goal.id, sent_on: dateKey })
    if (dupeErr) continue // 23505 unique violation => already sent today

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', goal.user_id)

    const boost = await pickBoost(goal.user_id, goal.category)
    const payload = JSON.stringify({
      title: '⚡ Charge Call',
      body: `"${goal.title}" starts in ${LEAD_MIN} min. ${boost}`,
      url: '/',
      tag: `charge-${goal.id}-${dateKey}`,
      icon: '/icon-192.png',
    })

    for (const s of (subs as Sub[]) ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        )
        sent++
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          // Subscription expired/unsubscribed — remove it.
          await supabase.from('push_subscriptions').delete().eq('id', s.id)
          cleaned++
        } else {
          console.error('push error', status, err)
        }
      }
    }
  }

  return json({ due: due.length, sent, cleaned })
})
