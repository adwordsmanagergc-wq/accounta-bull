import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { fetchGoals } from '../lib/api'
import {
  loadBoostMessages,
  loadPersonalBoosts,
  markPersonalUsed,
  pickBoost,
  type PersonalBoost,
} from '../lib/boost'
import { setCommitted, whenLabel } from '../lib/game'
import type { BoostMessage, Goal } from '../lib/types'

export default function Boost() {
  const { id } = useParams()
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [goal, setGoal] = useState<Goal | null>(null)
  const [messages, setMessages] = useState<BoostMessage[]>([])
  const [personal, setPersonal] = useState<PersonalBoost[]>([])
  const [text, setText] = useState<string>('')
  const [avoidId, setAvoidId] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !id) return
    const uid = user.id
    fetchGoals(uid)
      .then(async (goals) => {
        const g = goals.find((x) => x.id === id) ?? null
        setGoal(g)
        if (!g) {
          setLoading(false)
          return
        }
        // Prefer a personalized line if one is ready; fall back to the library.
        const [msgs, mine] = await Promise.all([
          loadBoostMessages(),
          loadPersonalBoosts(uid, g.category),
        ])
        setMessages(msgs)
        if (mine.length) {
          const [head, ...rest] = mine
          setPersonal(rest)
          setText(head.text)
          markPersonalUsed(head.id)
        } else {
          const m = pickBoost(msgs, g.category)
          setText(m?.text ?? 'Show up. That’s the whole game.')
          setAvoidId(m?.id)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id])

  function another() {
    if (!goal) return
    // Use up any remaining personalized lines first, then cycle the library.
    if (personal.length) {
      const [head, ...rest] = personal
      setPersonal(rest)
      setText(head.text)
      markPersonalUsed(head.id)
      return
    }
    const m = pickBoost(messages, goal.category, avoidId)
    setText(m?.text ?? 'Show up. That’s the whole game.')
    setAvoidId(m?.id)
  }

  function commit() {
    if (!goal) return
    setCommitted(goal.id, true)
    showToast('You’re charging! Full horns when you finish 🐂', '⚡')
    navigate('/today')
  }

  if (loading) return <div className="full-center"><div className="spinner" /></div>

  if (!goal) {
    return (
      <div className="boost-screen">
        <p className="muted">That goal couldn’t be found.</p>
        <button className="btn btn-primary" onClick={() => navigate('/today')}>
          Back to today
        </button>
      </div>
    )
  }

  return (
    <div className="boost-screen">
      <div>
        <div className="boost-kicker">⚡ CHARGE CALL</div>
        <h1 className="boost-goal">{goal.title}</h1>
        <div className="muted" style={{ marginTop: 6 }}>
          {whenLabel(goal)}
        </div>
      </div>

      <div className="boost-quote">“{text || 'Show up. That’s the whole game.'}”</div>

      <div className="stack">
        <button className="btn btn-primary" onClick={commit}>
          I’M CHARGING
        </button>
        <button className="btn btn-ghost" onClick={another}>
          Another boost
        </button>
        <button className="link-btn" style={{ margin: '4px auto 0' }} onClick={() => navigate('/today')}>
          Not now
        </button>
      </div>
    </div>
  )
}
