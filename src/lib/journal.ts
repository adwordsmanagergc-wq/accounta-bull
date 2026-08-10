import { supabase } from './supabase'
import { todayKey } from './game'
import type { JournalEntry } from './types'

/** Local date key "YYYY-MM-DD" for today. */
export function todayDate(): string {
  return todayKey(new Date())
}

export async function fetchEntry(userId: string, date: string): Promise<JournalEntry | null> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('entry_date', date)
    .maybeSingle()
  if (error) throw error
  return (data as JournalEntry) ?? null
}

export async function fetchHistory(userId: string, limit = 30): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('entry_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data as JournalEntry[]) ?? []
}

// upsert merges on (user_id, entry_date): saving the morning plan does not wipe
// an evening reflection and vice versa, since only the given columns are sent.
export async function saveMorning(userId: string, date: string, plan: string): Promise<void> {
  const { error } = await supabase
    .from('journal_entries')
    .upsert(
      { user_id: userId, entry_date: date, morning_plan: plan, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,entry_date' }
    )
  if (error) throw error
}

export async function saveEvening(
  userId: string,
  date: string,
  reflection: string,
  achieved: boolean | null
): Promise<void> {
  const { error } = await supabase
    .from('journal_entries')
    .upsert(
      { user_id: userId, entry_date: date, evening_reflection: reflection, achieved, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,entry_date' }
    )
  if (error) throw error
}

export async function saveTimes(userId: string, wake: string | null, bed: string | null): Promise<void> {
  const { error } = await supabase.from('profiles').update({ wake_time: wake, bed_time: bed }).eq('id', userId)
  if (error) throw error
}
