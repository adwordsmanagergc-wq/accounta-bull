import { supabase } from './supabase'
import { removeProgressFile } from './storage'
import type { PhotoPhase, ProgressPhoto } from './types'

export async function fetchProgressPhotos(userId: string): Promise<ProgressPhoto[]> {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('user_id', userId)
    .order('taken_on', { ascending: false })
  if (error) throw error
  return (data as ProgressPhoto[]) ?? []
}

export async function addProgressPhoto(
  userId: string,
  input: { phase: PhotoPhase; storage_path: string; taken_on: string; note: string; media_type?: 'image' | 'video' }
): Promise<void> {
  const { error } = await supabase.from('progress_photos').insert({
    user_id: userId,
    phase: input.phase,
    storage_path: input.storage_path,
    taken_on: input.taken_on,
    note: input.note || null,
    media_type: input.media_type ?? 'image',
  })
  if (error) throw error
}

export async function deleteProgressPhoto(photo: ProgressPhoto): Promise<void> {
  const { error } = await supabase.from('progress_photos').delete().eq('id', photo.id)
  if (error) throw error
  await removeProgressFile(photo.storage_path).catch(() => {})
}

export async function setPhotoShared(photoId: string, shared: boolean): Promise<void> {
  const { error } = await supabase
    .from('progress_photos')
    .update({ shared_with_herd: shared })
    .eq('id', photoId)
  if (error) throw error
}

/** Progress photos your herd-mates have shared with you. */
export async function fetchHerdSharedPhotos(): Promise<ProgressPhoto[]> {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('shared_with_herd', true)
    .order('taken_on', { ascending: false })
  if (error) throw error
  // RLS returns your own + herd-mates' shared; drop your own for the herd view.
  return (data as ProgressPhoto[]) ?? []
}
