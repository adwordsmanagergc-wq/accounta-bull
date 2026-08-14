import { supabase } from './supabase'

export interface Post {
  id: string
  user_id: string
  scope: 'herd' | 'team'
  team_id: string | null
  body: string | null
  media_url: string | null
  media_type: 'image' | 'video' | null
  goal_title: string | null
  created_at: string
}

export interface PostComment {
  id: string
  post_id: string
  user_id: string
  body: string
  created_at: string
}

export interface Author {
  id: string
  name: string | null
  username: string | null
  avatar_url: string | null
}

export async function fetchAuthors(ids: string[]): Promise<Record<string, Author>> {
  const uniq = Array.from(new Set(ids))
  if (uniq.length === 0) return {}
  const { data } = await supabase.from('profiles').select('id,name,username,avatar_url').in('id', uniq)
  const map: Record<string, Author> = {}
  for (const a of (data as Author[]) ?? []) map[a.id] = a
  return map
}

export async function fetchFeed(limit = 50): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data as Post[]) ?? []
}

/** Posts shared with one specific team (RLS still enforces membership). */
export async function fetchTeamFeed(teamId: string, limit = 50): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('scope', 'team')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data as Post[]) ?? []
}

export async function createPost(input: {
  userId: string
  scope: 'herd' | 'team'
  teamId: string | null
  body: string | null
  mediaUrl: string | null
  mediaType: 'image' | 'video' | null
  goalTitle: string | null
}): Promise<void> {
  const { error } = await supabase.from('posts').insert({
    user_id: input.userId,
    scope: input.scope,
    team_id: input.scope === 'team' ? input.teamId : null,
    body: input.body,
    media_url: input.mediaUrl,
    media_type: input.mediaType,
    goal_title: input.goalTitle,
  })
  if (error) throw error
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', postId)
  if (error) throw error
}

export async function fetchComments(postIds: string[]): Promise<PostComment[]> {
  if (postIds.length === 0) return []
  const { data, error } = await supabase
    .from('post_comments')
    .select('*')
    .in('post_id', postIds)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as PostComment[]) ?? []
}

export async function addComment(postId: string, userId: string, body: string): Promise<void> {
  const { error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, user_id: userId, body: body.trim() })
  if (error) throw error
}

/** cheer counts and whether the current user cheered, per post. */
export async function fetchCheers(
  postIds: string[],
  userId: string
): Promise<Record<string, { count: number; mine: boolean }>> {
  const out: Record<string, { count: number; mine: boolean }> = {}
  if (postIds.length === 0) return out
  const { data } = await supabase.from('post_cheers').select('post_id, user_id').in('post_id', postIds)
  for (const r of (data as { post_id: string; user_id: string }[]) ?? []) {
    const e = (out[r.post_id] ??= { count: 0, mine: false })
    e.count++
    if (r.user_id === userId) e.mine = true
  }
  return out
}

export async function toggleCheer(postId: string, userId: string, on: boolean): Promise<void> {
  if (on) {
    const { error } = await supabase.from('post_cheers').insert({ post_id: postId, user_id: userId })
    if (error && !String(error.message).includes('duplicate')) throw error
  } else {
    const { error } = await supabase.from('post_cheers').delete().eq('post_id', postId).eq('user_id', userId)
    if (error) throw error
  }
}
