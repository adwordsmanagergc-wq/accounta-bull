import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { completeGoal, fetchGoals, fetchTodayCompletions } from '../lib/api'
import { chargeLevel, hasCommitted, inBoostWindow, isScheduledToday, whenLabel } from '../lib/game'
import { CATEGORIES, type Completion, type Goal } from '../lib/types'

const STEPS = [
  {
    emoji: '🎯',
    title: 'Set a goal',
    body: 'Pick something you want to do, a workout, deep work, a walk, and choose the time and days it repeats.',
  },
  {
    emoji: '⚡',
    title: 'Get your Charge Call',
    body: '30 minutes before, we’ll boost you with a notification and a hype message so you actually start.',
  },
  {
    emoji: '🏆',
    title: 'Check it off',
    body: 'Every win earns you horns and builds your daily streak. Miss one after committing and it costs you.',
  },
]

export default function Today() {
  const { user, profile, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [goals, setGoals] = useState<Goal[]>([])
  const [completions, setCompletions] = useState<Record<string, Completion>>({})
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  // Re-render each minute so meters/labels stay live.
  const [, setTick] = useState(0)

  const load = useCallback(async () => {
    if (!user) return
    setError(null)
    try {
      // Goals are the critical fetch. Completions are non-critical, if that
      // query fails we still show the day (as if nothing is done yet).
      const g = await fetchGoals(user.id)
      setGoals(g)
      try {
        setCompletions(await fetchTodayCompletions(user.id))
      } catch (e) {
        console.warn('completions load failed', e)
        setCompletions({})
      }
    } catch (e) {
      console.error(e)
      setError(
        'We couldn’t load your goals. If this is your first time, make sure the ' +
          'database setup (the SQL migrations) has been run in Supabase. Otherwise, ' +
          'check your connection and try again.'
      )
    } finally {
      setLoaded(true)
    }
  }, [user])

  useEffect(() => {
    load()
    const t = window.setInterval(() => setTick((n) => n + 1), 60_000)
    return () => window.clearInterval(t)
  }, [load])

  const todays = useMemo(
    () =>
      goals
        .filter((g) => isScheduledToday(g))
        .sort((a, b) => a.time_of_day.localeCompare(b.time_of_day)),
    [goals]
  )

  const upcoming = useMemo(
    () => todays.find((g) => !completions[g.id] && inBoostWindow(g)),
    [todays, completions]
  )

  const doneToday = todays.filter((g) => completions[g.id]).length

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
      showToast('Could not save, try again.', '⚠️')
      console.error(e)
    } finally {
      setBusy(null)
    }
  }

  const catOf = (g: Goal) => CATEGORIES.find((c) => c.value === g.category)
  const firstName = profile?.name?.trim().split(' ')[0]
  const isNewMember = goals.length === 0
  const todayDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="page-pad">
      <div className="page-head">
        <div>
          <h1>Today</h1>
          <div className="today-date">{todayDate}</div>
        </div>
        <div className="pill">🏆 {profile?.horns ?? 0}</div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 12px' }}>⚠️ {error}</p>
          <button className="btn btn-ghost" onClick={load}>
            Try again
          </button>
        </div>
      )}

      {/* No spinner: the page just fills in once data is ready. */}
      {loaded && !error && todays.length === 0 && (
        /* Warm daily welcome when nothing is scheduled for today */
        <div className="welcome">
          <div className="welcome-crest"><Logo size={120} glow /></div>
          <h2 className="welcome-title">
            {firstName ? `Ready to charge, ${firstName}?` : 'Ready to charge?'}
          </h2>
          <p className="welcome-sub">
            Nothing on your list for today yet, <strong>shall we add some tasks?</strong> Every
            strong day starts with one goal. 💪
          </p>

          <Link to="/goal" className="btn btn-primary btn-lg">
            ➕ Add today’s first task
          </Link>

          {isNewMember && (
            <>
              <div className="steps-heading">New here? Here’s how it works</div>
              <div className="steps">
                {STEPS.map((s, i) => (
                  <div className="step" key={s.title}>
                    <div className="step-num">{i + 1}</div>
                    <div>
                      <div className="step-title">
                        {s.emoji} {s.title}
                      </div>
                      <div className="step-body">{s.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {loaded && !error && todays.length > 0 && (
        <>
          {upcoming && (
            <div
              className="charge-banner"
              onClick={() => navigate(`/boost/${upcoming.id}`)}
              role="button"
            >
              <div className="cb-kicker">⚡ CHARGE CALL</div>
              <div className="cb-title">{upcoming.title}</div>
              <div style={{ fontSize: 14 }}>{whenLabel(upcoming)}, tap to get your boost</div>
            </div>
          )}

          <div className="today-summary">
            {doneToday === todays.length
              ? `🔥 All ${todays.length} done today, you’re on fire!`
              : `${doneToday} of ${todays.length} done today`}
          </div>

          <div className="stack">
            {todays.map((g) => {
              const done = !!completions[g.id]
              const cat = catOf(g)
              return (
                <div className={`card goal-card ${done ? 'goal-done' : ''}`} key={g.id}>
                  <div className="goal-top">
                    <div>
                      <div className="goal-title">{g.title}</div>
                      <div className="goal-meta">
                        {whenLabel(g)} · {g.horn_value} horns
                      </div>
                    </div>
                    <span className="cat-chip">
                      {cat?.emoji} {cat?.label}
                    </span>
                  </div>

                  {!done && (
                    <div className="meter" title="Charge meter">
                      <div
                        className="meter-fill"
                        style={{ width: `${Math.round(chargeLevel(g) * 100)}%` }}
                      />
                    </div>
                  )}

                  <div className="goal-actions">
                    {done ? (
                      <span className="done-check">✓ Done, horns earned</span>
                    ) : (
                      <>
                        <button
                          className="btn btn-primary"
                          disabled={busy === g.id}
                          onClick={() => onComplete(g)}
                        >
                          {busy === g.id ? '…' : '✓ Check off'}
                        </button>
                        <button
                          className="btn btn-ghost btn-icon"
                          title="Get a boost"
                          onClick={() => navigate(`/boost/${g.id}`)}
                        >
                          ⚡
                        </button>
                        <button
                          className="btn btn-ghost btn-icon"
                          title="Edit goal"
                          onClick={() => navigate(`/goal/${g.id}`)}
                        >
                          ✏️
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}

            <Link to="/goal" className="btn btn-ghost btn-lg" style={{ marginTop: 4 }}>
              ➕ Add another goal
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
