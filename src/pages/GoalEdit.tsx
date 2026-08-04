import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { deleteGoal, fetchGoals, saveGoal } from '../lib/api'
import { CATEGORIES, DAY_LABELS, type Category, type Goal } from '../lib/types'

export default function GoalEdit() {
  const { id } = useParams()
  const editing = !!id
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('fitness')
  const [time, setTime] = useState('08:00')
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [horns, setHorns] = useState(10)
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editing || !user) return
    fetchGoals(user.id).then((goals) => {
      const g = goals.find((x) => x.id === id)
      if (g) {
        setTitle(g.title)
        setCategory(g.category)
        setTime(g.time_of_day.slice(0, 5))
        setDays(g.repeat_days)
        setHorns(g.horn_value)
      }
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id])

  function toggleDay(d: number) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()))
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!user) return
    if (!title.trim()) {
      setError('Give your goal a title.')
      return
    }
    setSaving(true)
    try {
      await saveGoal(user.id, {
        id,
        title: title.trim(),
        category,
        time_of_day: time,
        repeat_days: days,
        horn_value: horns,
        active: true,
      } as Partial<Goal> & { id?: string })
      showToast(editing ? 'Goal updated' : 'Goal added 🎯', '✅')
      navigate('/today')
    } catch (err) {
      setError('Could not save the goal. Try again.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!id) return
    if (!confirm('Delete this goal?')) return
    try {
      await deleteGoal(id)
      showToast('Goal deleted', '🗑️')
      navigate('/today')
    } catch (err) {
      setError('Could not delete the goal.')
      console.error(err)
    }
  }

  if (loading) return <div className="spinner" style={{ margin: '60px auto' }} />

  return (
    <div className="page-pad">
      <button className="back-link link-btn" onClick={() => navigate('/today')}>
        ← Back
      </button>
      <div className="page-head">
        <h1>{editing ? 'Edit goal' : 'New goal'}</h1>
      </div>

      {error && <div className="form-error">{error}</div>}

      <form onSubmit={onSave} className="card">
        <div className="field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Morning run"
          />
        </div>

        <div className="field">
          <label>Category</label>
          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.value}
                className={`cat-btn ${category === c.value ? 'on' : ''}`}
                onClick={() => setCategory(c.value)}
              >
                <span className="cat-emoji">{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="time">Time of day</label>
          <input
            id="time"
            className="input"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Repeat days</label>
          <div className="day-grid">
            {DAY_LABELS.map((label, d) => (
              <button
                type="button"
                key={d}
                className={`day-btn ${days.includes(d) ? 'on' : ''}`}
                onClick={() => toggleDay(d)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="faint" style={{ fontSize: 12, marginTop: 6 }}>
            None selected = every day.
          </div>
        </div>

        <div className="field">
          <label htmlFor="horns">Horns for completing</label>
          <select
            id="horns"
            className="select"
            value={horns}
            onChange={(e) => setHorns(Number(e.target.value))}
          >
            <option value={5}>5 — easy</option>
            <option value={10}>10 — standard</option>
            <option value={20}>20 — tough</option>
            <option value={30}>30 — big win</option>
          </select>
        </div>

        <button className="btn btn-primary" disabled={saving} type="submit">
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Add goal'}
        </button>
      </form>

      {editing && (
        <button className="btn btn-danger" style={{ marginTop: 12 }} onClick={onDelete}>
          Delete goal
        </button>
      )}
    </div>
  )
}
