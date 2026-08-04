import type { Goal } from './types'

/** Local date key, e.g. "2026-08-04". */
export function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Is this goal scheduled for the given day-of-week (0=Sun..6=Sat)? */
export function isScheduledOn(goal: Goal, weekday: number): boolean {
  // Empty repeat_days is treated as "every day".
  return goal.repeat_days.length === 0 || goal.repeat_days.includes(weekday)
}

export function isScheduledToday(goal: Goal, now = new Date()): boolean {
  return goal.active && isScheduledOn(goal, now.getDay())
}

/** Minutes from `now` until the goal's time today. Negative if already passed. */
export function minutesUntil(goal: Goal, now = new Date()): number {
  const [h, m] = goal.time_of_day.split(':').map(Number)
  const target = new Date(now)
  target.setHours(h, m, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / 60000)
}

/** The charge-call window: the goal starts within the next 30 minutes. */
export function inBoostWindow(goal: Goal, now = new Date()): boolean {
  const mins = minutesUntil(goal, now)
  return mins >= 0 && mins <= 30
}

/** 0..1 fill for the charge meter (0 = 30+ min away, 1 = go time). */
export function chargeLevel(goal: Goal, now = new Date()): number {
  const mins = minutesUntil(goal, now)
  if (mins <= 0) return 1
  if (mins >= 30) return 0
  return (30 - mins) / 30
}

/** Human label for how far off a goal is. */
export function whenLabel(goal: Goal, now = new Date()): string {
  const mins = minutesUntil(goal, now)
  if (mins < -1) return `${goal.time_of_day} · earlier today`
  if (mins <= 0) return `${goal.time_of_day} · now`
  if (mins < 60) return `${goal.time_of_day} · in ${mins} min`
  const h = Math.floor(mins / 60)
  return `${goal.time_of_day} · in ${h}h ${mins % 60}m`
}

/**
 * Consecutive-day streak ending today (or yesterday, so it survives until
 * midnight). `days` is a set of local date keys that have >=1 completion.
 */
export function computeStreak(days: Set<string>, now = new Date()): number {
  let streak = 0
  const cursor = new Date(now)
  // Allow the streak to still count if nothing done *yet* today.
  if (!days.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (days.has(todayKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/** localStorage key for a per-day charge commitment. */
export function commitKey(goalId: string, day = todayKey()): string {
  return `ab:commit:${goalId}:${day}`
}

export function hasCommitted(goalId: string): boolean {
  return localStorage.getItem(commitKey(goalId)) === '1'
}

export function setCommitted(goalId: string, value: boolean) {
  if (value) localStorage.setItem(commitKey(goalId), '1')
  else localStorage.removeItem(commitKey(goalId))
}
