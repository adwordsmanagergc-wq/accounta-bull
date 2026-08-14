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
  username: string | null
  wake_time: string | null
  bed_time: string | null
  created_at: string
}

export interface JournalEntry {
  id: string
  user_id: string
  entry_date: string
  morning_plan: string | null
  evening_reflection: string | null
  achieved: boolean | null
  created_at: string
  updated_at: string
}

// ----- Coach / Team (business) feature -----
export type TeamRole = 'owner' | 'coach' | 'client'

export interface Team {
  id: string
  owner_id: string
  name: string
  logo_url: string | null
  accent: string | null // a CSS gradient string (see TEAM_GRADIENTS)
  created_at: string
}

// Preset gradients for team branding. The chosen gradient's CSS is stored in
// teams.accent and used as a background wherever the team is shown.
export const TEAM_GRADIENTS: { name: string; css: string }[] = [
  { name: 'Charge', css: 'linear-gradient(135deg, #ff9a3d 0%, #f5821f 55%, #d94f7a 100%)' },
  { name: 'Gold', css: 'linear-gradient(135deg, #f6d488 0%, #c9a96a 100%)' },
  { name: 'Ocean', css: 'linear-gradient(135deg, #3b82f6 0%, #22d3ee 100%)' },
  { name: 'Forest', css: 'linear-gradient(135deg, #34d399 0%, #15803d 100%)' },
  { name: 'Berry', css: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' },
  { name: 'Ember', css: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)' },
  { name: 'Midnight', css: 'linear-gradient(135deg, #3457a6 0%, #101f3a 100%)' },
]

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: TeamRole
  status: 'pending' | 'active'
  share_photos: boolean
  created_at: string
}

export interface TeamMemberWithProfile extends TeamMember {
  profile: Pick<Profile, 'id' | 'name' | 'username' | 'avatar_url' | 'horns' | 'streak'> | null
}

export interface Membership {
  member: TeamMember
  team: Team
}

export interface TeamTask {
  id: string
  team_id: string
  created_by: string
  title: string
  description: string | null
  active: boolean
  created_at: string
}

export interface TeamTaskCheckin {
  id: string
  task_id: string
  user_id: string
  note: string | null
  completed_at: string
}

export type CoachNoteKind = 'suggestion' | 'report' | 'note'

export interface CoachNote {
  id: string
  team_id: string
  author_id: string
  about_user: string | null
  kind: CoachNoteKind
  body: string
  resolved_at: string | null
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
  media_type: 'image' | 'video'
  created_at: string
}

export interface JournalMedia {
  id: string
  user_id: string
  entry_date: string
  storage_path: string
  media_type: 'image' | 'video'
  note: string | null
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
