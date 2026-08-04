import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { completeGoal, fetchGoals, fetchTodayCompletions } from '../lib/api'
import { chargeLevel, hasCommitted, inBoostWindow, isScheduledToday, whenLabel } from '../lib/game'
import { CATEGORIES, type Completion, type Goal } from '../lib/types'

export default function Today() {
  const { user, profile, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [goals, setGoals] = useState<Goal[]>([])
  const [completions, setCompletions] = useState<Record<string, Completion>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  // Re-render each minute so meters/labels stay live.
  const [, setTick] = useState(0)

  async function load() {
    if (!user) return
    const [g, c] = await Promise.all([fetchGoals(user.id), fetchTodayCompletions(user.id)])
    setGoals(g)
    setCompletions(c)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const t = window.setInterval(() => setTick((n) => n + 1), 60_000)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const todays = useMemo(
    () => goals.filter((g) => isScheduledToday(g)).sort((a, b) => a.time_of_day.localeCompare(b.time_of_day)),
    [goals]
  )

  const upcoming = useMemo(
    () => todays.find((g) => !completions[g.id] && inBoostWindow(g)),
    [todays, completions]
  )

  async function onComplete(goal: Goal) {
    if (!user || busy) return
    setBusy(goal.id)
    try {
      const committed = hasCommitted(goal.id)
      const newTotal = await completeGoal(user.id, goal, committed)
      await refreshProfile()
      setCompletions((c) => ({
        ...c,
        [goal.id]: {
          id: 'local',
          user_id: user.id,
          goal_id: goal.id,
          committed,
          completed_at: new Date().toISOString(),
        },
      }))
      showToast(`+${goal.horn_value} horns! Total ${newTotal} 🏆`, '🐂')
    } catch (e) {
      showToast('Could not save — try again.', '⚠️')
      console.error(e)
    } finally {
      setBusy(null)
    }
  }

  const catOf = (g: Goal) => CATEGORIES.find((c) => c.value === g.category)

  if (loading) return <div className="spinner" style={{ margin: '60px auto' }} />

  return (
    <div className="page-pad">
      <div className="page-head">
        <div>
          <h1>Today</h1>
          <div className="muted" style={{ fontSize: 14 }}>
            {profile?.name ? `Let’s charge, ${profile.name}.` : 'Let’s charge.'}
          </div>
        </div>
        <div className="pill">🏆 {profile?.horns ?? 0}</div>
      </div>

      {upcoming && (
        <div className="charge-banner" onClick={() => navigate(`/boost/${upcoming.id}`)} role="button">
          <div className="cb-kicker">⚡ CHARGE CALL</div>
          <div className="cb-title">{upcoming.title}</div>
          <div style={{ fontSize: 14 }}>{whenLabel(upcoming)} — tap to get your boost</div>
        </div>
      )}

      {todays.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">🎯</div>
          <p>No goals scheduled for today.</p>
          <Link to="/goal" className="btn btn-primary" style={{ maxWidth: 260, margin: '10px auto 0' }}>
            Add your first goal
          </Link>
        </div>
      ) : (
        <div className="stack">
          {todays.map((g) => {
            const done = !!completions[g.id]
            const cat = catOf(g)
            return (
              <div className="card goal-card" key={g.id}>
                <div className="goal-top">
                  <div>
                    <div className="goal-title">{g.title}</div>
                    <div className="goal-meta">{whenLabel(g)} · {g.horn_value} horns</div>
                  </div>
                  <span className="cat-chip">
                    {cat?.emoji} {cat?.label}
                  </span>
                </div>

                {!done && (
                  <div className="meter" title="Charge meter">
                    <div className="meter-fill" style={{ width: `${Math.round(chargeLevel(g) * 100)}%` }} />
                  </div>
                )}

                <div className="goal-actions">
                  {done ? (
                    <span className="done-check">✓ Done — horns earned</span>
                  ) : (
                    <>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={busy === g.id}
                        onClick={() => onComplete(g)}
                      >
                        {busy === g.id ? '…' : '✓ Check off'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/boost/${g.id}`)}>
                        ⚡ Boost
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/goal/${g.id}`)}>
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
