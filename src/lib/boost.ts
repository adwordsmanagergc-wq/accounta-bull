import { supabase } from './supabase'
import type { BoostMessage, BoostTone, Category } from './types'

// Small in-memory cache so cycling "Another boost" is instant.
let cache: BoostMessage[] | null = null

export async function loadBoostMessages(): Promise<BoostMessage[]> {
  if (cache) return cache
  const { data, error } = await supabase.from('boost_messages').select('*')
  if (error) throw error
  cache = (data as BoostMessage[]) ?? []
  return cache
}

export interface PersonalBoost {
  id: string
  category: Category | 'general'
  text: string
}

/**
 * Unused AI-personalized lines for this user + category (plus general ones),
 * oldest first. Non-fatal: returns [] if the boost_pool table isn't set up yet.
 */
export async function loadPersonalBoosts(
  userId: string,
  category: Category,
  tone: BoostTone = 'medium'
): Promise<PersonalBoost[]> {
  const { data, error } = await supabase
    .from('boost_pool')
    .select('id, category, text')
    .eq('user_id', userId)
    .eq('tone', tone)
    .is('used_at', null)
    .or(`category.eq.${category},category.eq.general`)
    .order('created_at', { ascending: true })
    .limit(20)
  if (error) return []
  return (data as PersonalBoost[]) ?? []
}

/** Mark a personalized line as used so it isn't shown again. Best-effort. */
export async function markPersonalUsed(id: string): Promise<void> {
  try {
    await supabase.from('boost_pool').update({ used_at: new Date().toISOString() }).eq('id', id)
  } catch {
    /* non-fatal */
  }
}

/** A random message for the category, falling back to general messages. */
export function pickBoost(
  messages: BoostMessage[],
  category: Category,
  avoidId?: number
): BoostMessage | null {
  let pool = messages.filter((m) => m.category === category || m.category === 'general')
  if (pool.length === 0) pool = messages
  if (pool.length === 0) return null
  if (pool.length > 1 && avoidId != null) {
    const filtered = pool.filter((m) => m.id !== avoidId)
    if (filtered.length) pool = filtered
  }
  return pool[Math.floor(Math.random() * pool.length)]
}
