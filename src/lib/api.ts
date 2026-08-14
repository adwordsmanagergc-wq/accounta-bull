import { supabase } from './supabase'
import type { Completion, Goal } from './types'
import { computeStreak, setCommitted, todayKey } from './game'

const SKIP_PENALTY = 5

export async function fetchGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('time_of_day', { ascending: true })
  if (error) throw error
  return (data as Goal[]) ?? []
}

/** Completions for today, keyed by goal_id. */
export async function fetchTodayCompletions(userId: string): Promise<Record<string, Completion>> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('completions')
    .select('*')
    .eq('user_id', userId)
    .gte('completed_at', start.toISOString())
  if (error) throw error
  const map: Record<string, Completion> = {}
  for (const c of (data as Completion[]) ?? []) map[c.goal_id] = c
  return map
}

/** All distinct local dates the user has completed something (for streak). */
async function fetchCompletionDays(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('completions')
    .select('completed_at')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(400)
  if (error) throw error
  const set = new Set<string>()
  for (const row of (data as { completed_at: string }[]) ?? []) {
    set.add(todayKey(new Date(row.completed_at)))
  }
  return set
}

async function updateProfileTotals(userId: string, hornDelta: number): Promise<number> {
  // Recompute streak from the completion history, then apply the horn delta.
  const days = await fetchCompletionDays(userId)
  const streak = computeStreak(days)

  const { data: current } = await supabase
    .from('profiles')
    .select('horns')
    .eq('id', userId)
    .maybeSingle()

  const horns = Math.max(0, ((current?.horns as number) ?? 0) + hornDelta)

  const { error } = await supabase
    .from('profiles')
    .update({ horns, streak })
    .eq('id', userId)
  if (error) throw error
  return horns
}

/**
 * Mark a goal complete. A committed completion (they pressed "I'M CHARGING")
 * still earns full horns, completing always earns `horn_value`.
 * Returns the user's new horn total.
 */
export async function completeGoal(
  userId: string,
  goal: Goal,
  committed: boolean
): Promise<number> {
  const { error } = await supabase.from('completions').insert({
    user_id: userId,
    goal_id: goal.id,
    committed,
    completed_at: new Date().toISOString(),
  })
  if (error) throw error
  setCommitted(goal.id, false)
  return updateProfileTotals(userId, goal.horn_value)
}

/**
 * Skip a goal you already committed to charging. Costs 5 horns and does not
 * count toward the streak. Returns the user's new horn total.
 */
export async function skipCommittedGoal(userId: string, goal: Goal): Promise<number> {
  setCommitted(goal.id, false)
  return updateProfileTotals(userId, -SKIP_PENALTY)
}

export async function saveGoal(
  userId: string,
  goal: Partial<Goal> & { id?: string }
): Promise<void> {
  const payload = {
    user_id: userId,
    title: goal.title,
    category: goal.category,
    time_of_day: goal.time_of_day,
    repeat_days: goal.repeat_days,
    horn_value: goal.horn_value ?? 10,
    active: goal.active ?? true,
    stake_horns: goal.stake_horns ?? 0,
    forfeit: goal.forfeit ?? null,
    notify_herd: goal.notify_herd ?? false,
  }
  if (goal.id) {
    const { error } = await supabase.from('goals').update(payload).eq('id', goal.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('goals').insert(payload)
    if (error) throw error
  }
}

export async function deleteGoal(goalId: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', goalId)
  if (error) throw error
}

export { SKIP_PENALTY }
