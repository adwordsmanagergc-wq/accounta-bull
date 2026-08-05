// Shared domain types, mirroring the Supabase schema.

export type Category = 'fitness' | 'work' | 'mind' | 'other'

export const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'fitness', label: 'Fitness', emoji: '💪' },
  { value: 'work', label: 'Work', emoji: '💼' },
  { value: 'mind', label: 'Mind', emoji: '🧠' },
  { value: 'other', label: 'Other', emoji: '⭐' },
]

// 0 = Sunday ... 6 = Saturday (matches JS Date.getDay()).
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export interface Profile {
  id: string
  name: string | null
  age_band: string | null
  focus_areas: string[] | null
  horns: number
  streak: number
  timezone: string | null
  created_at: string
}

export interface Goal {
  id: string
  user_id: string
  title: string
  category: Category
  time_of_day: string // "HH:MM" (24h, local)
  repeat_days: number[] // subset of 0..6
  horn_value: number
  active: boolean
  created_at: string
}

export interface Completion {
  id: string
  user_id: string
  goal_id: string
  completed_at: string
  committed: boolean
}

export interface BoostMessage {
  id: number
  category: Category | 'general'
  text: string
}

export interface HerdConnection {
  id: string
  user_low: string
  user_high: string
  created_at: string
}

export interface HerdPartner {
  connectionId: string
  userId: string
  name: string | null
  horns: number
  streak: number
}

export interface SharedChallenge {
  id: string
  connection_id: string
  created_by: string
  title: string
  reward: string | null
  forfeit: string | null
  starts_on: string
  ends_on: string
  active: boolean
  created_at: string
}

export interface ChallengeCheckin {
  id: string
  challenge_id: string
  user_id: string
  checked_on: string
  created_at: string
}
