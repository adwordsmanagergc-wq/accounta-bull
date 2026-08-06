import { supabase } from './supabase'

function ext(file: File): string {
  const e = file.name.split('.').pop()
  return e && e.length <= 5 ? e.toLowerCase() : 'jpg'
}

/** Upload a public profile picture; returns its public URL. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const path = `${userId}/avatar-${Date.now()}.${ext(file)}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
}

/** Upload a public herd group photo; returns its public URL. */
export async function uploadHerdPhoto(
  userId: string,
  connectionId: string,
  file: File
): Promise<string> {
  const path = `${userId}/herd-${connectionId}-${Date.now()}.${ext(file)}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
}

/** Upload a PRIVATE progress photo; returns its storage path (sign it to view). */
export async function uploadProgressPhoto(userId: string, file: File): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.${ext(file)}`
  const { error } = await supabase.storage
    .from('progress')
    .upload(path, file, { contentType: file.type })
  if (error) throw error
  return path
}

/** A short-lived signed URL for a private progress photo. */
export async function signedProgressUrl(storagePath: string): Promise<string | null> {
  const { data } = await supabase.storage.from('progress').createSignedUrl(storagePath, 3600)
  return data?.signedUrl ?? null
}

export async function removeProgressFile(storagePath: string): Promise<void> {
  await supabase.storage.from('progress').remove([storagePath])
}
