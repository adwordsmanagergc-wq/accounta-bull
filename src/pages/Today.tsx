import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Brain,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleCheckBig,
  Dumbbell,
  Flame,
  Pencil,
  Plus,
  Star,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import CompletionCapture from '../components/CompletionCapture'
import Celebration from '../components/Celebration'
import CountUp from '../components/CountUp'
import { successHaptic, errorHaptic } from '../lib/haptics'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { completeGoal, fetchGoals, fetchTodayCompletions } from '../lib/api'
import { chargeLevel, hasCommitted, inBoostWindow, isScheduledToday, whenLabel } from '../lib/game'
import { CATEGORIES, type Category, type Completion, type Goal } from '../lib/types'

const CAT_ICON: Record<Category, LucideIcon> = {
  fitness: Dumbbell,
  work: Briefcase,
  mind: Brain,
  other: Star,
}

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Target,
    title: 'Set a goal',
    body: 'A workout, a deep work block, a walk. Pick the time and the days it repeats.',
  },
  {
    icon: Zap,
    title: 'Get your Charge Call',
    body: 'About 30 minutes before, you get a notification with a short message so you actually start.',
  },
  {
    icon: CircleCheckBig,
    title: 'Check it off',
    body: 'Every goal you finish earns Horns and builds your streak. Skip one you committed to and it costs you.',
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
  const [capture, setCapture] = useState<Goal | null>(null)
  const [celebrate, setCelebrate] = useState(false)
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
      successHaptic()
      setCelebrate(true)
      showToast(`+${goal.horn_value} Horns. Total ${newTotal}.`, '🏆')
      // Let the burst breathe for a moment before the capture modal opens.
      window.setTimeout(() => setCapture(goal), 850)
    } catch (e) {
      errorHaptic()
      showToast('Couldn’t save that. Try again.', '⚠️')
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
        <div className="row" style={{ gap: 8 }}>
          {(profile?.streak ?? 0) > 0 && (
            <div className="pill" aria-label={`${profile?.streak} day streak`}>
              <Flame size={14} aria-hidden="true" style={{ color: 'var(--accent)' }} />
              {profile?.streak}
            </div>
          )}
          <div className="pill" aria-label={`${profile?.horns ?? 0} Horns`}>
            <Trophy size={14} aria-hidden="true" style={{ color: 'var(--accent)' }} />
            <CountUp value={profile?.horns ?? 0} />
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16 }} role="alert">
          <div className="row" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
            <AlertTriangle size={18} aria-hidden="true" style={{ color: 'var(--danger)', flex: '0 0 auto' }} />
            <p style={{ margin: 0 }}>{error}</p>
          </div>
          <button className="btn btn-ghost" onClick={load}>
            Try again
          </button>
        </div>
      )}

      {/* No spinner: the page just fills in once data is ready. */}
      {loaded && !error && todays.length === 0 && (
        /* Daily welcome when nothing is scheduled for today */
        <div className="welcome">
          <span className="icon-tile lg" aria-hidden="true">
            <Target size={26} />
          </span>
          <h2 className="welcome-title">
            {firstName ? `Ready when you are, ${firstName}.` : 'Ready when you are.'}
          </h2>
          <p className="welcome-sub">
            Nothing is scheduled for today yet. Add a goal and we’ll send a Charge Call before it
            starts.
          </p>

          <Link to="/goal" className="btn btn-primary btn-lg">
            <Plus size={18} aria-hidden="true" /> Add today’s first goal
          </Link>

          {isNewMember && (
            <>
              <div className="steps-heading">How it works</div>
              <ol className="steps" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {STEPS.map((s, i) => (
                  <li className="step" key={s.title}>
                    <div className="step-num">{i + 1}</div>
                    <div>
                      <div className="step-title">{s.title}</div>
                      <div className="step-body">{s.body}</div>
                    </div>
                    <s.icon size={18} aria-hidden="true" style={{ marginLeft: 'auto', color: 'var(--text-faint)', flex: '0 0 auto' }} />
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}

      {loaded && !error && todays.length > 0 && (
        <>
          {upcoming && (
            <button
              type="button"
              className="charge-banner"
              onClick={() => navigate(`/boost/${upcoming.id}`)}
            >
              <span className="icon-tile" aria-hidden="true">
                <Zap size={20} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="cb-kicker">Charge Call</span>
                <span className="cb-title" style={{ display: 'block' }}>{upcoming.title}</span>
                <span className="muted" style={{ fontSize: 14 }}>
                  {whenLabel(upcoming)}. Tap for your boost.
                </span>
              </span>
              <ChevronRight size={20} aria-hidden="true" style={{ color: 'var(--text-faint)' }} />
            </button>
          )}

          <div className="today-summary">
            <span>
              {doneToday === todays.length
                ? `All ${todays.length} done today. Strong work.`
                : `${doneToday} of ${todays.length} done today`}
            </span>
            <div className="target-bar" style={{ width: 96 }} aria-hidden="true">
              <div className="target-fill" style={{ width: `${Math.round((doneToday / todays.length) * 100)}%` }} />
            </div>
          </div>

          <div className="stack">
            {todays.map((g) => {
              const done = !!completions[g.id]
              const cat = catOf(g)
              const CatIcon = CAT_ICON[g.category] ?? Star
              return (
                <div className={`card goal-card ${done ? 'goal-done' : ''}`} data-cat={g.category} key={g.id}>
                  <div className="goal-top">
                    <div style={{ minWidth: 0 }}>
                      <div className="goal-title">{g.title}</div>
                      <div className="goal-meta">
                        <span>{whenLabel(g)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{g.horn_value} Horns</span>
                        {g.stake_horns > 0 ? (
                          <span className="stake-tag">
                            <Zap size={11} aria-hidden="true" /> {g.stake_horns} at stake
                          </span>
                        ) : g.forfeit ? (
                          <span className="stake-tag">
                            <Zap size={11} aria-hidden="true" /> Forfeit
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span className="cat-chip">
                      <CatIcon size={12} aria-hidden="true" /> {cat?.label}
                    </span>
                  </div>

                  {!done && (
                    <div className="meter" title="Charge meter" aria-hidden="true">
                      <div
                        className="meter-fill"
                        style={{ width: `${Math.round(chargeLevel(g) * 100)}%` }}
                      />
                    </div>
                  )}

                  <div className="goal-actions">
                    {done ? (
                      <span className="done-check">
                        <CheckCircle2 size={16} aria-hidden="true" /> Done. Horns earned.
                      </span>
                    ) : (
                      <>
                        <button
                          className="btn btn-primary"
                          disabled={busy === g.id}
                          aria-busy={busy === g.id || undefined}
                          onClick={() => onComplete(g)}
                        >
                          {busy === g.id ? (
                            <span className="btn-spinner" aria-hidden="true" />
                          ) : (
                            <Check size={18} aria-hidden="true" />
                          )}
                          Check off
                        </button>
                        <button
                          className="btn btn-ghost btn-icon"
                          title="Get a boost"
                          aria-label={`Get a boost for ${g.title}`}
                          onClick={() => navigate(`/boost/${g.id}`)}
                        >
                          <Zap size={18} aria-hidden="true" />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon"
                          title="Edit goal"
                          aria-label={`Edit ${g.title}`}
                          onClick={() => navigate(`/goal/${g.id}`)}
                        >
                          <Pencil size={18} aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}

            <Link to="/goal" className="btn btn-ghost btn-lg" style={{ marginTop: 16 }}>
              <Plus size={18} aria-hidden="true" /> Add another goal
            </Link>
          </div>
        </>
      )}

      {celebrate && <Celebration onDone={() => setCelebrate(false)} />}

      {capture && user && (
        <CompletionCapture goal={capture} userId={user.id} onClose={() => setCapture(null)} />
      )}
    </div>
  )
}
