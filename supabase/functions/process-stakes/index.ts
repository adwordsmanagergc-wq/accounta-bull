// Accounta-Bull — Stakes processor. Runs on a cron (hourly is plenty). For each
// user, looks at YESTERDAY in their local timezone: any goal that was scheduled,
// had horns staked, and was not completed loses those horns, and (if opted in)
// pings the herd with the forfeit. Deduped one-per-goal-per-day via stake_events.
// Reuses the VAPID setup from send-push.

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@accounta-bull.com'
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

type Profile = { id: string; name: string | null; timezone: string | null; horns: number }
type Goal = {
  id: string; user_id: string; title: string; time_of_day: string; repeat_days: number[]
  active: boolean; stake_horns: number; forfeit: string | null; notify_herd: boolean
}
type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }

const WEEKDAY: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/** Format an instant in a timezone as { dateKey, weekday }. */
function localParts(instant: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instant)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return { dateKey: `${get('year')}-${get('month')}-${get('day')}`, weekday: WEEKDAY[get('weekday')] ?? 0 }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const [{ data: profiles }, { data: goals }] = await Promise.all([
    admin.from('profiles').select('id, name, timezone, horns'),
    admin.from('goals').select('id, user_id, title, time_of_day, repeat_days, active, stake_horns, forfeit, notify_herd')
      .eq('active', true).gt('stake_horns', 0),
  ])

  const profById = new Map<string, Profile>()
  for (const p of (profiles as Profile[]) ?? []) profById.set(p.id, p)

  const goalsByUser = new Map<string, Goal[]>()
  for (const g of (goals as Goal[]) ?? []) {
    const arr = goalsByUser.get(g.user_id) ?? []
    arr.push(g)
    goalsByUser.set(g.user_id, arr)
  }

  const now = new Date()
  const yesterdayInstant = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  let missed = 0
  let hornsDocked = 0
  let notified = 0

  for (const [userId, userGoals] of goalsByUser) {
    const prof = profById.get(userId)
    const tz = prof?.timezone || 'UTC'
    const { dateKey: yDate, weekday: yWeekday } = localParts(yesterdayInstant, tz)

    // Which staked goals were scheduled yesterday?
    const scheduled = userGoals.filter(
      (g) => g.repeat_days.length === 0 || g.repeat_days.includes(yWeekday)
    )
    if (scheduled.length === 0) continue

    // Completions for these goals over the last ~48h, bucketed by local date.
    const since = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
    const { data: comps } = await admin
      .from('completions')
      .select('goal_id, completed_at')
      .eq('user_id', userId)
      .gte('completed_at', since)
    const doneYesterday = new Set<string>()
    for (const c of (comps as { goal_id: string; completed_at: string }[]) ?? []) {
      if (localParts(new Date(c.completed_at), tz).dateKey === yDate) doneYesterday.add(c.goal_id)
    }

    let herdSubs: Sub[] | null = null // lazy-load once per user if needed

    for (const g of scheduled) {
      if (doneYesterday.has(g.id)) continue // completed, no penalty

      // Record the miss; unique(goal_id,on_date) dedupes repeat runs.
      const { error: dupe } = await admin
        .from('stake_events')
        .insert({ user_id: userId, goal_id: g.id, on_date: yDate, horns_lost: g.stake_horns, forfeit: g.forfeit })
      if (dupe) continue // already processed

      missed++
      // Deduct the staked horns.
      const current = profById.get(userId)?.horns ?? 0
      const next = Math.max(0, current - g.stake_horns)
      await admin.from('profiles').update({ horns: next }).eq('id', userId)
      if (profById.get(userId)) profById.get(userId)!.horns = next
      hornsDocked += current - next

      if (!g.notify_herd) continue

      // Push the forfeit to the user's herd-mates.
      if (herdSubs === null) {
        const { data: conns } = await admin
          .from('herd_connections')
          .select('user_low, user_high')
          .or(`user_low.eq.${userId},user_high.eq.${userId}`)
        const mateIds = ((conns as { user_low: string; user_high: string }[]) ?? [])
          .map((c) => (c.user_low === userId ? c.user_high : c.user_low))
        if (mateIds.length === 0) {
          herdSubs = []
        } else {
          const { data: s } = await admin.from('push_subscriptions').select('*').in('user_id', mateIds)
          herdSubs = (s as Sub[]) ?? []
        }
      }
      const who = prof?.name?.trim() || 'Someone in your herd'
      const payload = JSON.stringify({
        title: '🐂 Herd miss',
        body: `${who} missed "${g.title}".${g.forfeit ? ` Forfeit: ${g.forfeit}` : ''}`,
        url: '/#/herd',
        icon: '/icon-192.png',
        tag: `stake-${g.id}-${yDate}`,
      })
      for (const sub of herdSubs) {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
          notified++
        } catch (err) {
          const st = (err as { statusCode?: number }).statusCode
          if (st === 404 || st === 410) await admin.from('push_subscriptions').delete().eq('id', sub.id)
          else console.error('stake push error', st, err)
        }
      }
    }
  }

  return json({ missed, hornsDocked, notified })
})
