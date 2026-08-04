import { supabase } from './supabase'
import type { BoostMessage, Category } from './types'

// Small in-memory cache so cycling "Another boost" is instant.
let cache: BoostMessage[] | null = null

export async function loadBoostMessages(): Promise<BoostMessage[]> {
  if (cache) return cache
  const { data, error } = await supabase.from('boost_messages').select('*')
  if (error) throw error
  cache = (data as BoostMessage[]) ?? []
  return cache
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
