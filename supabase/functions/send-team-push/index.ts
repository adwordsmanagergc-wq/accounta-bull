// Accounta-Bull — Team custom push. A coach sends a message to one client or the
// whole Team. Verifies the caller is a coach of that Team, sends Web Push to the
// target(s), and logs it to team_notifications.
// Reuses the same VAPID setup as send-push. See ../send-push/README.md.

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
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Who is calling?
  const authed = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const {
    data: { user },
  } = await authed.auth.getUser()
  if (!user) return json({ error: 'not-authenticated' }, 401)

  let body: { team_id?: string; target_user?: string | null; title?: string; body?: string } = {}
  try {
    body = await req.json()
  } catch {
    /* no body */
  }
  const teamId = body.team_id
  const title = (body.title ?? '').trim()
  const message = (body.body ?? '').trim()
  if (!teamId || !title || !message) return json({ error: 'missing team_id, title or body' }, 400)
  if (title.length > 80 || message.length > 300) return json({ error: 'title/body too long' }, 400)

  // Is the caller a coach/owner of this Team?
  const [{ data: team }, { data: myMember }] = await Promise.all([
    admin.from('teams').select('owner_id').eq('id', teamId).maybeSingle(),
    admin.from('team_members').select('role,status').eq('team_id', teamId).eq('user_id', user.id).maybeSingle(),
  ])
  const isCoach =
    team?.owner_id === user.id ||
    (myMember?.status === 'active' && (myMember?.role === 'coach' || myMember?.role === 'owner'))
  if (!isCoach) return json({ error: 'not-a-coach' }, 403)

  // Resolve targets: one client, or every active client on the team.
  let targetIds: string[] = []
  if (body.target_user) {
    const { data: m } = await admin
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .eq('user_id', body.target_user)
      .eq('status', 'active')
      .maybeSingle()
    if (!m) return json({ error: 'target not on team' }, 400)
    targetIds = [body.target_user]
  } else {
    const { data: members } = await admin
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .eq('role', 'client')
      .eq('status', 'active')
    targetIds = (members ?? []).map((m) => m.user_id as string)
  }

  if (targetIds.length === 0) return json({ sent: 0, note: 'no recipients' })

  const { data: subs } = await admin.from('push_subscriptions').select('*').in('user_id', targetIds)

  const payload = JSON.stringify({
    title,
    body: message,
    url: '/',
    icon: '/icon-192.png',
    tag: `team-${teamId}-${Date.now()}`,
  })

  let sent = 0
  let cleaned = 0
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
        console.error('team push error', status, err)
      }
    }
  }

  await admin.from('team_notifications').insert({
    team_id: teamId,
    sent_by: user.id,
    target_user: body.target_user ?? null,
    title,
    body: message,
  })

  return json({ sent, cleaned, recipients: targetIds.length })
})
