import { supabase } from './supabase'
import type {
  CoachNote,
  CoachNoteKind,
  Completion,
  Goal,
  Membership,
  ProgressPhoto,
  Team,
  TeamMemberWithProfile,
} from './types'

// ----- Teams & membership ---------------------------------------------------

export async function createTeam(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_team', { p_name: name })
  if (error) throw error
  return data as string
}

/** Every Team the current user belongs to (owner / coach / client), with role. */
export async function fetchMyMemberships(userId: string): Promise<Membership[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*, team:teams(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return ((data as Array<Record<string, unknown>>) ?? [])
    .filter((r) => r.team)
    .map((r) => ({ member: r as never, team: (r as { team: never }).team }))
}

export async function fetchTeam(teamId: string): Promise<Team | null> {
  const { data, error } = await supabase.from('teams').select('*').eq('id', teamId).maybeSingle()
  if (error) throw error
  return (data as Team) ?? null
}

export async function fetchTeamMembers(teamId: string): Promise<TeamMemberWithProfile[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*, profile:profiles(id,name,username,avatar_url,horns,streak)')
    .eq('team_id', teamId)
    .order('role', { ascending: true })
  if (error) throw error
  return (data as TeamMemberWithProfile[]) ?? []
}

export async function updateTeamBranding(
  teamId: string,
  patch: { name?: string; accent?: string | null; logo_url?: string | null }
): Promise<void> {
  const { error } = await supabase.from('teams').update(patch).eq('id', teamId)
  if (error) throw error
}

// ----- Invites --------------------------------------------------------------

export async function createInviteCode(
  teamId: string,
  role: 'client' | 'coach' = 'client'
): Promise<string> {
  const { data, error } = await supabase.rpc('create_team_invite', { p_team: teamId, p_role: role })
  if (error) throw error
  return data as string
}

export async function joinTeamByCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_team_by_code', { p_code: code.trim() })
  if (error) throw error
  return data as string
}

export async function addCoachByUsername(teamId: string, username: string): Promise<void> {
  const { error } = await supabase.rpc('add_coach_by_username', {
    p_team: teamId,
    p_username: username.trim(),
  })
  if (error) throw error
}

export async function acceptMembership(teamId: string): Promise<void> {
  const { error } = await supabase.rpc('accept_team_membership', { p_team: teamId })
  if (error) throw error
}

export async function leaveTeam(teamId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('team_members').delete().eq('team_id', teamId).eq('user_id', userId)
  if (error) throw error
}

export async function removeMember(teamId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_team_member', { p_team: teamId, p_user: userId })
  if (error) throw error
}

export async function setPhotoSharing(teamId: string, share: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_team_photo_sharing', { p_team: teamId, p_share: share })
  if (error) throw error
}

// ----- Assigning tasks ------------------------------------------------------

export interface AssignInput {
  title: string
  category: string
  time_of_day: string
  repeat_days: number[]
  horn_value: number
}

/** Assign to one client, or the whole team when clientId is null. */
export async function assignTask(
  teamId: string,
  clientId: string | null,
  input: AssignInput
): Promise<number> {
  const { data, error } = await supabase.rpc('assign_team_task', {
    p_team: teamId,
    p_client: clientId,
    p_title: input.title,
    p_category: input.category,
    p_time: input.time_of_day,
    p_repeat: input.repeat_days,
    p_horns: input.horn_value,
  })
  if (error) throw error
  return (data as number) ?? 0
}

// ----- One client's progress (coach view) -----------------------------------

export async function fetchClientGoals(teamId: string, clientId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('team_id', teamId)
    .eq('user_id', clientId)
    .order('time_of_day', { ascending: true })
  if (error) throw error
  return (data as Goal[]) ?? []
}

export async function fetchClientCompletions(clientId: string, sinceDays = 30): Promise<Completion[]> {
  const since = new Date()
  since.setDate(since.getDate() - sinceDays)
  const { data, error } = await supabase
    .from('completions')
    .select('*')
    .eq('user_id', clientId)
    .gte('completed_at', since.toISOString())
    .order('completed_at', { ascending: false })
  if (error) throw error
  return (data as Completion[]) ?? []
}

export async function fetchClientSharedPhotos(clientId: string): Promise<ProgressPhoto[]> {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('user_id', clientId)
    .order('taken_on', { ascending: false })
  if (error) throw error
  return (data as ProgressPhoto[]) ?? []
}

// ----- Custom push ----------------------------------------------------------

export interface TeamPushResult {
  ok: boolean
  message: string
  sent?: number
}

export async function sendTeamPush(
  teamId: string,
  targetUser: string | null,
  title: string,
  body: string
): Promise<TeamPushResult> {
  const { data, error } = await supabase.functions.invoke('send-team-push', {
    body: { team_id: teamId, target_user: targetUser, title, body },
  })
  if (error) {
    const ctx = (error as { context?: Response }).context
    let detail = ''
    if (ctx?.status) {
      try {
        detail = (await ctx.clone().text()).slice(0, 160)
      } catch {
        /* ignore */
      }
      return { ok: false, message: `Push failed (${ctx.status}). ${detail}`.trim() }
    }
    return { ok: false, message: 'Could not reach the push function. Is send-team-push deployed?' }
  }
  const sent = Number((data as { sent?: number })?.sent ?? 0)
  return { ok: true, sent, message: sent > 0 ? `Sent to ${sent} device(s) 📣` : 'Nobody is subscribed to push yet.' }
}

// ----- Co-coach notes / reports to the head coach ---------------------------

export async function fetchCoachNotes(teamId: string): Promise<CoachNote[]> {
  const { data, error } = await supabase
    .from('team_coach_notes')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as CoachNote[]) ?? []
}

export async function addCoachNote(input: {
  teamId: string
  authorId: string
  aboutUser: string | null
  kind: CoachNoteKind
  body: string
}): Promise<void> {
  const { error } = await supabase.from('team_coach_notes').insert({
    team_id: input.teamId,
    author_id: input.authorId,
    about_user: input.aboutUser,
    kind: input.kind,
    body: input.body,
  })
  if (error) throw error
}

export async function resolveCoachNote(id: string): Promise<void> {
  const { error } = await supabase
    .from('team_coach_notes')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/** Upload a Team logo (public). Stored under the owner's folder in `avatars`. */
export async function uploadTeamLogo(userId: string, teamId: string, file: File): Promise<string> {
  const e = file.name.split('.').pop()
  const ext = e && e.length <= 5 ? e.toLowerCase() : 'jpg'
  const path = `${userId}/team-${teamId}-${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
}
