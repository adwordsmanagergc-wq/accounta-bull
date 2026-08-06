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

type Tone = 'soft' | 'medium' | 'savage'
type Profile = {
  id: string
  name: string | null
  bio: string | null
  streak: number
  boost_tone: Tone | null
}
type Goal = { user_id: string; title: string; category: string }
type Line = { category: string; text: string }

const TONE_GUIDE: Record<Tone, string> = {
  soft: [
    'Tone: SOFT AND NICE. Gentle, warm, reassuring encouragement. No pressure, no',
    'guilt. Think of a kind friend who believes in them. No swearing.',
  ].join('\n'),
  medium: [
    'Tone: MEDIUM PUSHY. Direct, confident, motivating. A firm nudge with a bit of',
    'cheek, like a good coach. Not soft, not crude. No swearing.',
  ].join('\n'),
  savage: [
    'Tone: RUDE AND PUSHY, WITH SWEARING. Go hard. Blunt, crude, trash-talking',
    'drill-sergeant energy. Swear freely and often (shit, damn, ass, hell, fuck,',
    'bullshit, etc.). Call them out BY NAME, mock the excuse, make it sting enough',
    'to get them off their ass. This user explicitly opted into the harsh setting',
    'and wants it to bite, so do not soften it or get polite.',
    'Absolute limits, never cross these: no slurs; no hate or attacks on protected',
    'characteristics (race, gender, religion, sexuality, disability, etc.); no',
    'body-shaming about weight or looks; no sexual content; nothing about self-harm;',
    'no threats of real harm. Aim the venom at their laziness and their excuses,',
    'never at who they are as a person.',
  ].join('\n'),
}

function systemFor(tone: Tone): string {
  return [
    'You write short motivational "charge call" lines for Accounta-Bull, a daily',
    'accountability app with a friendly bull mascot. Each line is shown right before',
    'a user starts one of their goals, to give them a psychological push to begin.',
    '',
    'Voice: second person ("you"). One or two short sentences, ideally under 120',
    'characters. Make it personal: tie EACH line to one of their actual goals (name',
    'the goal or the activity), so it never feels generic. Use their first name in',
    'SOME lines, not every one, and only when it reads naturally. If no name is',
    'given, do not invent one. Bull and "charge" imagery is welcome but do not overuse it.',
    '',
    TONE_GUIDE[tone],
    '',
    'Hard rules (all tones):',
    '- Never use em dashes. Use commas, periods, or short sentences instead.',
    '- No hashtags, no emoji, no quotation marks around the line.',
    '- Do not invent facts about the person beyond what you are told.',
    '- No medical or weight claims.',
  ].join('\n')
}

/** Ask Claude for a batch of personalized lines. Returns [] on any failure. */
async function generateForUser(
  profile: Profile,
  goals: Goal[],
  count: number,
  tone: Tone
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
    `Each line must clearly relate to one of their goals above (reference the goal or activity).`,
    name
      ? `Use their first name (${name}) in only some of the lines, where it feels natural, not every line.`
      : `No name was given, so do not use or invent one.`,
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
        system: systemFor(tone),
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

  // Pull profiles, their active goals, and their unused lines (with tone).
  const [{ data: profiles }, { data: goals }, { data: pool }] = await Promise.all([
    supabase.from('profiles').select('id, name, bio, streak, boost_tone'),
    supabase.from('goals').select('user_id, title, category').eq('active', true),
    supabase.from('boost_pool').select('user_id, tone').is('used_at', null),
  ])

  const goalsByUser = new Map<string, Goal[]>()
  for (const g of (goals as Goal[]) ?? []) {
    const arr = goalsByUser.get(g.user_id) ?? []
    arr.push(g)
    goalsByUser.set(g.user_id, arr)
  }

  // Count unused lines per user, but only those matching that user's CURRENT tone,
  // so a tone switch triggers a fresh refill in the new voice.
  const toneOf = (p: Profile): Tone => (p.boost_tone ?? 'medium') as Tone
  const wantedTone = new Map<string, Tone>()
  for (const p of (profiles as Profile[]) ?? []) wantedTone.set(p.id, toneOf(p))

  const unusedCount = new Map<string, number>()
  for (const row of (pool as { user_id: string; tone: string }[]) ?? []) {
    if (row.tone !== (wantedTone.get(row.user_id) ?? 'medium')) continue
    unusedCount.set(row.user_id, (unusedCount.get(row.user_id) ?? 0) + 1)
  }

  // Only bother with users who have at least one active goal and are running low
  // on lines in their current tone.
  const needsRefill = ((profiles as Profile[]) ?? [])
    .filter((p) => (goalsByUser.get(p.id)?.length ?? 0) > 0)
    .filter((p) => (unusedCount.get(p.id) ?? 0) < MIN_UNUSED)
    .slice(0, MAX_USERS_PER_RUN)

  let usersFilled = 0
  let linesAdded = 0
  for (const profile of needsRefill) {
    const tone = toneOf(profile)
    const want = TARGET - (unusedCount.get(profile.id) ?? 0)
    const lines = await generateForUser(profile, goalsByUser.get(profile.id) ?? [], want, tone)
    if (!lines.length) continue
    const rows = lines.map((l) => ({ user_id: profile.id, category: l.category, text: l.text, tone }))
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
