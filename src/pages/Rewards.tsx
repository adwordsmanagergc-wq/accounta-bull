import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Gift, Lock, Trophy } from 'lucide-react'
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
      setError('We couldn’t load rewards. Make sure the rewards setup has been run in Supabase.')
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
      showToast(`Redeemed: ${reward.title}.`, '✅')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not redeem.'
      showToast(msg.includes('enough') ? 'Not enough Horns yet.' : 'Couldn’t redeem that. Try again.', '⚠️')
      console.error(e)
    } finally {
      setBusy(null)
    }
  }

  const next = rewards.filter((r) => r.cost > horns).sort((a, b) => a.cost - b.cost)[0]

  return (
    <div className="page-pad">
      <button className="back-link link-btn" onClick={() => navigate('/profile')}>
        <ArrowLeft size={16} aria-hidden="true" /> Back
      </button>
      <div className="page-head">
        <div>
          <h1>Rewards</h1>
          <div className="today-date">Spend your Horns on something good.</div>
        </div>
      </div>

      <div className="card stat" style={{ marginBottom: 24 }}>
        <div className="row between">
          <div>
            <div className="stat-label" style={{ marginTop: 0 }}>Your balance</div>
            <div className="stat-num">{horns}</div>
          </div>
          <span className="icon-tile" aria-hidden="true">
            <Trophy size={20} />
          </span>
        </div>
        {next && (
          <>
            <div className="target-bar" style={{ marginTop: 12 }} aria-hidden="true">
              <div className="target-fill" style={{ width: `${Math.min(100, Math.round((horns / next.cost) * 100))}%` }} />
            </div>
            <div className="faint" style={{ fontSize: 13, marginTop: 8 }}>
              {next.cost - horns} more Horns for {next.title}
            </div>
          </>
        )}
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}

      {loaded && rewards.length > 0 && <div className="section-label">Available rewards</div>}

      {loaded &&
        rewards.map((r) => {
          const affordable = horns >= r.cost
          const owned = redeemedIds.has(r.id)
          return (
            <div className="card reward-card" key={r.id}>
              <div className="reward-emoji" aria-hidden="true" style={{ color: affordable ? 'var(--accent-text)' : 'var(--text-faint)' }}>
                {affordable ? <Gift size={20} /> : <Lock size={18} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="goal-title">{r.title}</div>
                {r.description && <div className="goal-meta">{r.description}</div>}
              </div>
              <div className="reward-right">
                <div className="reward-cost">
                  <Trophy size={13} aria-hidden="true" style={{ color: 'var(--accent)' }} /> {r.cost}
                </div>
                <button
                  className="btn btn-sm btn-ghost"
                  disabled={!affordable || busy === r.id}
                  aria-busy={busy === r.id || undefined}
                  aria-label={`${owned ? 'Redeem again' : affordable ? 'Redeem' : 'Locked'}: ${r.title}, ${r.cost} Horns`}
                  onClick={() => redeem(r)}
                >
                  {busy === r.id ? (
                    <span className="btn-spinner" aria-hidden="true" />
                  ) : owned ? (
                    'Again'
                  ) : affordable ? (
                    'Redeem'
                  ) : (
                    'Locked'
                  )}
                </button>
              </div>
            </div>
          )
        })}

      {loaded && rewards.length === 0 && !error && (
        <div className="empty">
          <span className="icon-tile lg" aria-hidden="true" style={{ marginBottom: 16 }}>
            <Gift size={24} />
          </span>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--text)' }}>No rewards yet</p>
          <p style={{ margin: '4px 0 0' }}>New rewards will show up here as they’re added.</p>
        </div>
      )}
    </div>
  )
}
