import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { fetchRedemptions, fetchRewards, redeemReward, type Reward } from '../lib/rewards'

export default function Rewards() {
  const { user, profile, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [rewards, setRewards] = useState<Reward[]>([])
  const [redeemedIds, setRedeemedIds] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const horns = profile?.horns ?? 0

  const load = useCallback(async () => {
    if (!user) return
    setError(null)
    try {
      const [r, red] = await Promise.all([fetchRewards(), fetchRedemptions(user.id)])
      setRewards(r)
      setRedeemedIds(new Set(red.map((x) => x.reward_id)))
    } catch (e) {
      console.error(e)
      setError('Couldn’t load rewards. Make sure the rewards setup has been run in Supabase.')
    } finally {
      setLoaded(true)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  async function redeem(reward: Reward) {
    if (busy || horns < reward.cost) return
    if (!confirm(`Redeem "${reward.title}" for ${reward.cost} horns?`)) return
    setBusy(reward.id)
    try {
      await redeemReward(reward.id)
      await refreshProfile()
      setRedeemedIds((s) => new Set(s).add(reward.id))
      showToast(`Redeemed ${reward.title}! ${reward.emoji ?? '🎁'}`, '✅')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not redeem.'
      showToast(msg.includes('enough') ? 'Not enough horns yet.' : 'Could not redeem, try again.', '⚠️')
      console.error(e)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="page-pad">
      <button className="back-link link-btn" onClick={() => navigate('/profile')}>
        ← Back
      </button>
      <div className="page-head">
        <div>
          <h1>Rewards</h1>
          <div className="muted" style={{ fontSize: 14 }}>
            Spend your horns on something good.
          </div>
        </div>
        <div className="pill">🏆 {horns}</div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loaded &&
        rewards.map((r) => {
          const affordable = horns >= r.cost
          const owned = redeemedIds.has(r.id)
          return (
            <div className="card reward-card" key={r.id}>
              <div className="reward-emoji">{r.emoji ?? '🎁'}</div>
              <div style={{ flex: 1 }}>
                <div className="goal-title">{r.title}</div>
                {r.description && <div className="goal-meta">{r.description}</div>}
              </div>
              <div className="reward-right">
                <div className="reward-cost">🏆 {r.cost}</div>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={!affordable || busy === r.id}
                  onClick={() => redeem(r)}
                >
                  {busy === r.id ? '…' : owned ? 'Again' : affordable ? 'Redeem' : 'Locked'}
                </button>
              </div>
            </div>
          )
        })}

      {loaded && rewards.length === 0 && !error && (
        <div className="empty">
          <div className="empty-emoji">🎁</div>
          <p>No rewards yet.</p>
        </div>
      )}
    </div>
  )
}
