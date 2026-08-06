import { supabase } from './supabase'

export interface PhotoFeedback {
  id: string
  photo_id: string
  from_user: string
  emoji: string | null
  message: string | null
  created_at: string
}

export async function fetchFeedback(photoIds: string[]): Promise<PhotoFeedback[]> {
  if (photoIds.length === 0) return []
  const { data, error } = await supabase
    .from('photo_feedback')
    .select('*')
    .in('photo_id', photoIds)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as PhotoFeedback[]) ?? []
}

export async function addFeedback(
  userId: string,
  photoId: string,
  emoji: string,
  message: string
): Promise<void> {
  const { error } = await supabase.from('photo_feedback').insert({
    from_user: userId,
    photo_id: photoId,
    emoji: emoji || null,
    message: message || null,
  })
  if (error) throw error
}
