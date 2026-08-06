import { supabase } from './supabase'

export interface Measurement {
  id: string
  user_id: string
  taken_on: string
  weight: number | null
  note: string | null
  created_at: string
}

export async function fetchMeasurements(userId: string): Promise<Measurement[]> {
  const { data, error } = await supabase
    .from('measurements')
    .select('*')
    .eq('user_id', userId)
    .order('taken_on', { ascending: true })
  if (error) throw error
  return (data as Measurement[]) ?? []
}

export async function addMeasurement(
  userId: string,
  input: { taken_on: string; weight: number; note: string }
): Promise<void> {
  const { error } = await supabase.from('measurements').insert({
    user_id: userId,
    taken_on: input.taken_on,
    weight: input.weight,
    note: input.note || null,
  })
  if (error) throw error
}

export async function deleteMeasurement(id: string): Promise<void> {
  const { error } = await supabase.from('measurements').delete().eq('id', id)
  if (error) throw error
}
