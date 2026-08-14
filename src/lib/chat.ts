import { supabase } from './supabase'

export interface Conversation {
  id: string
  kind: 'team' | 'herd' | 'dm'
  team_id: string | null
  title: string | null
  created_by: string
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  user_id: string
  body: string
  created_at: string
}

export async function fetchConversation(id: string): Promise<Conversation | null> {
  const { data, error } = await supabase.from('conversations').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as Conversation) ?? null
}

/** Team channels the current user is a member of. */
export async function fetchTeamChats(teamId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as Conversation[]) ?? []
}

export async function fetchMessages(convId: string, limit = 200): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return (data as Message[]) ?? []
}

export async function sendMessage(convId: string, userId: string, body: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: convId, user_id: userId, body: body.trim() })
  if (error) throw error
}

export async function fetchMemberIds(convId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', convId)
  if (error) throw error
  return ((data as { user_id: string }[]) ?? []).map((r) => r.user_id)
}

export async function createTeamChat(
  teamId: string,
  title: string,
  memberIds: string[],
  all: boolean
): Promise<string> {
  const { data, error } = await supabase.rpc('create_team_chat', {
    p_team: teamId,
    p_title: title,
    p_members: memberIds,
    p_all: all,
  })
  if (error) throw error
  return data as string
}

export async function getOrCreateDm(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_dm', { p_other: otherUserId })
  if (error) throw error
  return data as string
}

export async function markConversationRead(convId: string): Promise<void> {
  try {
    await supabase.rpc('mark_conversation_read', { p_conv: convId })
  } catch {
    /* non-fatal */
  }
}

/** Conversation ids with unread messages from others. */
export async function fetchUnreadConversationIds(): Promise<string[]> {
  const { data, error } = await supabase.rpc('unread_conversations')
  if (error) return []
  return ((data as { conversation_id: string }[]) ?? []).map((r) => r.conversation_id)
}
