// Accounta-Bull — AI-personalized boost generator (runs on a cron, e.g. daily)
// -----------------------------------------------------------------------------
// For each active user, tops up a small pool of personalized "charge call"
// lines using Claude Haiku (the cheapest Claude model). Lines are written from
// the user's name, bio, current streak, and active goals, then stored in
// public.boost_pool. The app and the push sender pull an unused line first and
// fall back to the shared boost_messages library, so this is purely additive.
//
// Cost note: Haiku 4.5 is ~$1 / 1M input tokens and ~$5 / 1M output tokens. Each
// user refill is a few hundred tokens, so 100 users cost well under a cent a day.
//
// Setup + scheduling: see ./README.md
// -----------------------------------------------------------------------------

import { createClient } from 'jsr:@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const MODEL = Deno.env.get('BOOST_MODEL') ?? 'claude-haiku-4-5'

// Keep at least this many unused lines per user; refill up to TARGET when low.
const MIN_UNUSED = 4
const TARGET = 8
// Cap users processed per run so one invocation can't time out with a big herd.
const MAX_USERS_PER_RUN = Number(Deno.env.get('BOOST_MAX_USERS') ?? '40')

const VALID_CATEGORIES = new Set(['fitness', 'work', 'mind', 'other', 'general'])

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

type Profile = { id: string; name: string | null; bio: string | null; streak: number }
type Goal = { user_id: string; title: string; category: string }
type Line = { category: string; text: string }

const SYSTEM = [
  'You write short motivational "charge call" lines for Accounta-Bull, a daily',
  'accountability app with a friendly bull mascot. Each line is shown right before',
  'a user starts one of their goals, to give them a psychological push to begin.',
  '',
  'Voice: warm, direct, a little cheeky, never cheesy or corporate. Second person',
  '("you"). One or two short sentences, ideally under 120 characters. You may use',
  "the person's first name occasionally, but not in every line. Bull and \"charge\"",
  'imagery is welcome but do not overuse it.',
  '',
  'Hard rules:',
  '- Never use em dashes. Use commas, periods, or short sentences instead.',
  '- No hashtags, no emoji, no quotation marks around the line.',
  '- Do not invent facts about the person beyond what you are told.',
  '- Keep it encouraging and safe; no health, medical, or weight-shaming claims.',
].join('\n')

/** Ask Claude for a batch of personalized lines. Returns [] on any failure. */
async function generateForUser(
  profile: Profile,
  goals: Goal[],
  count: number
): Promise<Line[]> {
  const name = (profile.name ?? '').trim()
  const cats = Array.from(new Set(goals.map((g) => g.category)))
  const allowed = cats.length ? [...cats, 'general'] : ['general']
  const goalList = goals.length
    ? goals.map((g) => `- "${g.title}" (${g.category})`).join('\n')
    : '- (no specific goals yet)'

  const userPrompt = [
    `Person's first name: ${name || '(unknown, do not guess)'}`,
    `About them: ${(profile.bio ?? '').trim() || '(none provided)'}`,
    `Current streak: ${profile.streak ?? 0} day(s)`,
    `Their active goals:`,
    goalList,
    '',
    `Write ${count} distinct charge-call lines tailored to this person.`,
    `Tag each line with the single most relevant category from: ${allowed.join(', ')}.`,
    'Use "general" for lines that fit any goal.',
    '',
    'Respond with ONLY a JSON array, no prose, in this exact shape:',
    '[{"category":"fitness","text":"..."}]',
  ].join('\n')

  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })
  } catch (err) {
    console.error('anthropic fetch failed', err)
    return []
  }

  if (!res.ok) {
    console.error('anthropic error', res.status, await res.text().catch(() => ''))
    return []
  }

  const data = await res.json().catch(() => null)
  const raw = data?.content?.[0]?.text
  if (typeof raw !== 'string') return []

  // Strip any accidental code fences, then pull out the JSON array.
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start === -1 || end === -1) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const out: Line[] = []
  for (const item of parsed) {
    const text = String((item as Line)?.text ?? '').replace(/—/g, ', ').trim()
    let category = String((item as Line)?.category ?? 'general').toLowerCase().trim()
    if (!VALID_CATEGORIES.has(category)) category = 'general'
    if (text.length >= 3 && text.length <= 240) out.push({ category, text })
  }
  return out
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  if (!ANTHROPIC_API_KEY) {
    return json({ error: 'ANTHROPIC_API_KEY is not set on this function.' }, 500)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Pull profiles, their active goals, and how many unused lines each already has.
  const [{ data: profiles }, { data: goals }, { data: pool }] = await Promise.all([
    supabase.from('profiles').select('id, name, bio, streak'),
    supabase.from('goals').select('user_id, title, category').eq('active', true),
    supabase.from('boost_pool').select('user_id').is('used_at', null),
  ])

  const goalsByUser = new Map<string, Goal[]>()
  for (const g of (goals as Goal[]) ?? []) {
    const arr = goalsByUser.get(g.user_id) ?? []
    arr.push(g)
    goalsByUser.set(g.user_id, arr)
  }

  const unusedCount = new Map<string, number>()
  for (const row of (pool as { user_id: string }[]) ?? []) {
    unusedCount.set(row.user_id, (unusedCount.get(row.user_id) ?? 0) + 1)
  }

  // Only bother with users who have at least one active goal and are running low.
  const needsRefill = ((profiles as Profile[]) ?? [])
    .filter((p) => (goalsByUser.get(p.id)?.length ?? 0) > 0)
    .filter((p) => (unusedCount.get(p.id) ?? 0) < MIN_UNUSED)
    .slice(0, MAX_USERS_PER_RUN)

  let usersFilled = 0
  let linesAdded = 0
  for (const profile of needsRefill) {
    const want = TARGET - (unusedCount.get(profile.id) ?? 0)
    const lines = await generateForUser(profile, goalsByUser.get(profile.id) ?? [], want)
    if (!lines.length) continue
    const rows = lines.map((l) => ({ user_id: profile.id, category: l.category, text: l.text }))
    const { error } = await supabase.from('boost_pool').insert(rows)
    if (error) {
      console.error('insert failed for', profile.id, error.message)
      continue
    }
    usersFilled++
    linesAdded += rows.length
  }

  return json({
    candidates: needsRefill.length,
    usersFilled,
    linesAdded,
    model: MODEL,
  })
})
