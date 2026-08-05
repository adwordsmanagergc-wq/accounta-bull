import { supabase } from './supabase'
import { todayKey } from './game'
import type {
  ChallengeCheckin,
  HerdConnection,
  HerdPartner,
  Profile,
  SharedChallenge,
} from './types'

function randomCode(len = 7): string {
  // Unambiguous characters (no 0/O/1/I) for easy sharing.
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let out = ''
  const rnd = crypto.getRandomValues(new Uint32Array(len))
  for (let i = 0; i < len; i++) out += alphabet[rnd[i] % alphabet.length]
  return out
}

/** The connections (herd partnerships) the current user belongs to. */
export async function fetchConnections(): Promise<HerdConnection[]> {
  const { data, error } = await supabase.from('herd_connections').select('*')
  if (error) throw error
  return (data as HerdConnection[]) ?? []
}

/** Resolve the partner profile on each connection for the current user. */
export async function fetchPartners(userId: string): Promise<HerdPartner[]> {
  const connections = await fetchConnections()
  if (connections.length === 0) return []
  const partnerIds = connections.map((c) => (c.user_low === userId ? c.user_high : c.user_low))
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, name, horns, streak')
    .in('id', partnerIds)
  if (error) throw error
  const byId = new Map((profiles as Partial<Profile>[]).map((p) => [p.id as string, p]))
  return connections.map((c) => {
    const pid = c.user_low === userId ? c.user_high : c.user_low
    const p = byId.get(pid)
    return {
      connectionId: c.id,
      userId: pid,
      name: p?.name ?? null,
      horns: p?.horns ?? 0,
      streak: p?.streak ?? 0,
    }
  })
}

/** Create a shareable invite code for the current user. */
export async function createInvite(userId: string): Promise<string> {
  // Retry a couple of times in the unlikely event of a code collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = randomCode()
    const { error } = await supabase.from('herd_invites').insert({ code, inviter_id: userId })
    if (!error) return code
    if (error.code !== '23505') throw error // 23505 = unique violation
  }
  throw new Error('Could not create an invite code, please try again.')
}

/** Accept an invite by code (creates the connection). Returns connection id. */
export async function acceptInvite(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_herd_invite', {
    invite_code: code.trim().toUpperCase(),
  })
  if (error) throw error
  return data as string
}

export async function leaveConnection(connectionId: string): Promise<void> {
  const { error } = await supabase.from('herd_connections').delete().eq('id', connectionId)
  if (error) throw error
}

export async function fetchChallenges(connectionId: string): Promise<SharedChallenge[]> {
  const { data, error } = await supabase
    .from('shared_challenges')
    .select('*')
    .eq('connection_id', connectionId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as SharedChallenge[]) ?? []
}

export async function createChallenge(
  userId: string,
  connectionId: string,
  input: { title: string; reward: string; forfeit: string; days: number }
): Promise<void> {
  const start = new Date()
  const end = new Date()
  end.setDate(end.getDate() + input.days)
  const { error } = await supabase.from('shared_challenges').insert({
    connection_id: connectionId,
    created_by: userId,
    title: input.title,
    reward: input.reward || null,
    forfeit: input.forfeit || null,
    starts_on: todayKey(start),
    ends_on: todayKey(end),
  })
  if (error) throw error
}

export async function deleteChallenge(challengeId: string): Promise<void> {
  const { error } = await supabase.from('shared_challenges').delete().eq('id', challengeId)
  if (error) throw error
}

export async function fetchCheckins(challengeIds: string[]): Promise<ChallengeCheckin[]> {
  if (challengeIds.length === 0) return []
  const { data, error } = await supabase
    .from('challenge_checkins')
    .select('*')
    .in('challenge_id', challengeIds)
  if (error) throw error
  return (data as ChallengeCheckin[]) ?? []
}

/** Check in for today on a shared challenge (idempotent per day). */
export async function checkinToday(userId: string, challengeId: string): Promise<void> {
  const { error } = await supabase
    .from('challenge_checkins')
    .insert({ user_id: userId, challenge_id: challengeId, checked_on: todayKey() })
  // 23505 = already checked in today; treat as success.
  if (error && error.code !== '23505') throw error
}
