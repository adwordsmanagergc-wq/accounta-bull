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

export type BoostTone = 'soft' | 'medium' | 'savage'

export const TONES: { value: BoostTone; label: string; emoji: string; hint: string }[] = [
  { value: 'soft', label: 'Soft and nice', emoji: '🌤️', hint: 'Gentle, kind encouragement.' },
  { value: 'medium', label: 'Medium pushy', emoji: '💪', hint: 'A firm, confident nudge.' },
  { value: 'savage', label: 'Rude and pushy', emoji: '🤬', hint: 'In your face, with swearing.' },
]

export interface Profile {
  id: string
  name: string | null
  age_band: string | null
  focus_areas: string[] | null
  horns: number
  streak: number
  timezone: string | null
  avatar_url: string | null
  bio: string | null
  boost_tone: BoostTone | null
  created_at: string
}

export type PhotoPhase = 'before' | 'during' | 'after'

export const PHASES: { value: PhotoPhase; label: string; emoji: string }[] = [
  { value: 'before', label: 'Before', emoji: '📍' },
  { value: 'during', label: 'During', emoji: '💪' },
  { value: 'after', label: 'After', emoji: '🏆' },
]

export interface ProgressPhoto {
  id: string
  user_id: string
  phase: PhotoPhase
  storage_path: string
  taken_on: string
  note: string | null
  shared_with_herd: boolean
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
  name: string | null
  photo_url: string | null
  rules: string | null
  created_at: string
}

export interface HerdPartner {
  connectionId: string
  userId: string
  name: string | null
  avatarUrl: string | null
  horns: number
  streak: number
  herdName: string | null
  herdPhoto: string | null
  herdRules: string | null
}

export interface SharedChallenge {
  id: string
  connection_id: string
  created_by: string
  title: string
  reward: string | null
  forfeit: string | null
  rules: string | null
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
