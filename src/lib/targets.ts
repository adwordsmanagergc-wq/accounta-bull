import { supabase } from './supabase'

export interface ProgressTarget {
  id: string
  user_id: string
  title: string
  unit: string | null
  start_value: number
  current_value: number
  target_value: number
  target_date: string | null
  shared_with_herd: boolean
  created_at: string
}

/** 0–100% of the way from start to target (direction-aware). */
export function targetPercent(t: ProgressTarget): number {
  const denom = t.target_value - t.start_value
  if (denom === 0) return t.current_value === t.target_value ? 100 : 0
  const p = ((t.current_value - t.start_value) / denom) * 100
  return Math.max(0, Math.min(100, Math.round(p)))
}

export function daysLeft(t: ProgressTarget): number | null {
  if (!t.target_date) return null
  const end = new Date(t.target_date + 'T00:00:00')
  const now = new Date()
  return Math.ceil((end.getTime() - now.getTime()) / 86400000)
}

export async function fetchTargets(userId: string): Promise<ProgressTarget[]> {
  const { data, error } = await supabase
    .from('progress_targets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as ProgressTarget[]) ?? []
}

export async function addTarget(
  userId: string,
  t: {
    title: string
    unit: string
    start_value: number
    current_value: number
    target_value: number
    target_date: string | null
    shared_with_herd: boolean
  }
): Promise<void> {
  const { error } = await supabase.from('progress_targets').insert({ user_id: userId, ...t })
  if (error) throw error
}

export async function updateTargetCurrent(id: string, current_value: number): Promise<void> {
  const { error } = await supabase
    .from('progress_targets')
    .update({ current_value })
    .eq('id', id)
  if (error) throw error
}

export async function setTargetShared(id: string, shared: boolean): Promise<void> {
  const { error } = await supabase
    .from('progress_targets')
    .update({ shared_with_herd: shared })
    .eq('id', id)
  if (error) throw error
}

export async function deleteTarget(id: string): Promise<void> {
  const { error } = await supabase.from('progress_targets').delete().eq('id', id)
  if (error) throw error
}

/** Targets your herd-mates have shared with you. */
export async function fetchHerdSharedTargets(userId: string): Promise<ProgressTarget[]> {
  const { data, error } = await supabase
    .from('progress_targets')
    .select('*')
    .eq('shared_with_herd', true)
    .neq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as ProgressTarget[]) ?? []
}
