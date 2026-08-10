// Accounta-Bull — journal nudges. Runs on a cron every few minutes. At each
// user's LOCAL wake time it prompts them to plan the day; at their bed time it
// asks whether they achieved it. Deduped one-per-day via journal_push_sends.
// Reuses the same VAPID setup as send-push.

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@accounta-bull.com'
const CRON_INTERVAL_MIN = Number(Deno.env.get('CRON_INTERVAL_MIN') ?? '5')
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

type Profile = { id: string; timezone: string | null; wake_time: string | null; bed_time: string | null }
type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }

/** Local minutes-since-midnight and date key for a timezone. */
function localNow(tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  let hour = Number(get('hour'))
  if (hour === 24) hour = 0
  return { minutes: hour * 60 + Number(get('minute')), dateKey: `${get('year')}-${get('month')}-${get('day')}` }
}

const MSG = {
  morning: {
    title: '🌅 Plan your day',
    body: 'What are you setting out to achieve today? Write it in your journal.',
  },
  evening: {
    title: '🌙 How did today go?',
    body: 'Did you achieve what you planned? Reflect on how it helped, or why not.',
  },
}

function timeToMin(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim())
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: profiles } = await admin.from('profiles').select('id, timezone, wake_time, bed_time')

  const due: { user_id: string; kind: 'morning' | 'evening'; dateKey: string }[] = []
  for (const p of (profiles as Profile[]) ?? []) {
    const tz = p.timezone || 'UTC'
    const { minutes, dateKey } = localNow(tz)
    const check = (t: string | null, kind: 'morning' | 'evening') => {
      if (!t) return
      const target = timeToMin(t)
      if (target == null) return
      if (minutes >= target && minutes < target + CRON_INTERVAL_MIN) due.push({ user_id: p.id, kind, dateKey })
    }
    check(p.wake_time, 'morning')
    check(p.bed_time, 'evening')
  }

  let sent = 0
  let cleaned = 0
  for (const d of due) {
    // Dedupe: one per user/kind/local-day.
    const { error: dupe } = await admin
      .from('journal_push_sends')
      .insert({ user_id: d.user_id, kind: d.kind, sent_on: d.dateKey })
    if (dupe) continue // already sent

    const { data: subs } = await admin.from('push_subscriptions').select('*').eq('user_id', d.user_id)
    const payload = JSON.stringify({
      title: MSG[d.kind].title,
      body: MSG[d.kind].body,
      url: '/#/journal',
      icon: '/icon-192.png',
      tag: `journal-${d.kind}-${d.dateKey}`,
    })
    for (const s of (subs as Sub[]) ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
        sent++
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('id', s.id)
          cleaned++
        } else {
          console.error('journal push error', status, err)
        }
      }
    }
  }

  return json({ due: due.length, sent, cleaned })
})
