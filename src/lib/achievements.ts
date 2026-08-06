import { supabase } from './supabase'

export interface Badge {
  key: string
  emoji: string
  title: string
  desc: string
  earned: boolean
}

export interface AchievementStats {
  horns: number
  streak: number
  completions: number
  photos: number
  herds: number
  wins: number
}

async function count(table: string, userId: string): Promise<number> {
  const { count: c } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  return c ?? 0
}

export async function loadAchievementStats(
  userId: string,
  horns: number,
  streak: number
): Promise<AchievementStats> {
  const [completions, photos] = await Promise.all([
    count('completions', userId),
    count('progress_photos', userId).catch(() => 0),
  ])
  // Herd membership (either side of a connection).
  const { count: herds } = await supabase
    .from('herd_connections')
    .select('id', { count: 'exact', head: true })
  return { horns, streak, completions, photos, herds: herds ?? 0, wins: 0 }
}

export function computeBadges(s: AchievementStats): Badge[] {
  const list: (Omit<Badge, 'earned'> & { test: (x: AchievementStats) => boolean })[] = [
    { key: 'first', emoji: '🎯', title: 'First Charge', desc: 'Complete your first goal', test: (x) => x.completions >= 1 },
    { key: 'streak3', emoji: '🔥', title: 'On a Roll', desc: '3-day streak', test: (x) => x.streak >= 3 },
    { key: 'streak7', emoji: '⚡', title: 'Week Warrior', desc: '7-day streak', test: (x) => x.streak >= 7 },
    { key: 'streak30', emoji: '🏔️', title: 'Unstoppable', desc: '30-day streak', test: (x) => x.streak >= 30 },
    { key: 'horns100', emoji: '🐂', title: 'Horn Collector', desc: 'Earn 100 horns', test: (x) => x.horns >= 100 },
    { key: 'horns500', emoji: '👑', title: 'Horn Royalty', desc: 'Earn 500 horns', test: (x) => x.horns >= 500 },
    { key: 'ten', emoji: '💪', title: 'Ten Down', desc: 'Complete 10 goals', test: (x) => x.completions >= 10 },
    { key: 'fifty', emoji: '🏆', title: 'Half Century', desc: 'Complete 50 goals', test: (x) => x.completions >= 50 },
    { key: 'photo', emoji: '📸', title: 'Progress Pic', desc: 'Add a progress photo', test: (x) => x.photos >= 1 },
    { key: 'herd', emoji: '🤝', title: 'Team Player', desc: 'Join a herd', test: (x) => x.herds >= 1 },
  ]
  return list.map((b) => ({ key: b.key, emoji: b.emoji, title: b.title, desc: b.desc, earned: b.test(s) }))
}
