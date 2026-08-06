import { supabase } from './supabase'

export interface Reward {
  id: string
  title: string
  description: string | null
  emoji: string | null
  cost: number
  active: boolean
  sort: number
}

export interface Redemption {
  id: string
  reward_id: string
  cost: number
  status: string
  created_at: string
}

export async function fetchRewards(): Promise<Reward[]> {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('active', true)
    .order('sort', { ascending: true })
  if (error) throw error
  return (data as Reward[]) ?? []
}

export async function fetchRedemptions(userId: string): Promise<Redemption[]> {
  const { data, error } = await supabase
    .from('redemptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Redemption[]) ?? []
}

/** Spend horns on a reward. Returns the new horn balance. */
export async function redeemReward(rewardId: string): Promise<number> {
  const { data, error } = await supabase.rpc('redeem_reward', { p_reward: rewardId })
  if (error) throw error
  return data as number
}
