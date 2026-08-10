import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { fetchEntry, fetchHistory, saveEvening, saveMorning, saveTimes, todayDate } from '../lib/journal'
import type { JournalEntry } from '../lib/types'

function prettyDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function Journal() {
  const { user, profile, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const date = todayDate()

  const [wake, setWake] = useState(profile?.wake_time ?? '')
  const [bed, setBed] = useState(profile?.bed_time ?? '')
  const [plan, setPlan] = useState('')
  const [reflection, setReflection] = useState('')
  const [achieved, setAchieved] = useState<boolean | null>(null)
  const [history, setHistory] = useState<JournalEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [entry, hist] = await Promise.all([fetchEntry(user.id, date), fetchHistory(user.id)])
      if (entry) {
        setPlan(entry.morning_plan ?? '')
        setReflection(entry.evening_reflection ?? '')
        setAchieved(entry.achieved)
      }
      setHistory(hist.filter((h) => h.entry_date !== date))
    } catch (e) {
      console.error(e)
    } finally {
      setLoaded(true)
    }
  }, [user, date])

  useEffect(() => {
    load()
  }, [load])

  async function onSaveTimes() {
    if (!user || busy) return
    setBusy(true)
    try {
      await saveTimes(user.id, wake || null, bed || null)
      await refreshProfile()
      showToast('Times saved, we’ll nudge you 🔔', '✅')
    } catch {
      showToast('Could not save times.', '⚠️')
    } finally {
      setBusy(false)
    }
  }

  async function onSavePlan() {
    if (!user || !plan.trim() || busy) return
    setBusy(true)
    try {
      await saveMorning(user.id, date, plan.trim())
      showToast('Plan saved, go get it 💪', '✅')
    } catch {
      showToast('Could not save.', '⚠️')
    } finally {
      setBusy(false)
    }
  }

  async function onSaveReflection() {
    if (!user || busy) return
    setBusy(true)
    try {
      await saveEvening(user.id, date, reflection.trim(), achieved)
      showToast('Reflection saved 🌙', '✅')
      await load()
    } catch {
      showToast('Could not save.', '⚠️')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-pad">
      <button className="back-link link-btn" onClick={() => navigate('/profile')}>← Back</button>
      <div className="page-head">
        <div>
          <h1>Journal</h1>
          <div className="muted" style={{ fontSize: 14 }}>Plan your morning, reflect at night.</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Your daily times</div>
        <div className="row" style={{ gap: 10 }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Wake up</label>
            <input className="input" type="time" value={wake} onChange={(e) => setWake(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Bed time</label>
            <input className="input" type="time" value={bed} onChange={(e) => setBed(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} disabled={busy} onClick={onSaveTimes}>
          Save times
        </button>
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          We’ll nudge you at wake to plan the day, and at bed to reflect. (Needs notifications on.)
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row between" style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 700 }}>Today</div>
          <div className="muted" style={{ fontSize: 13 }}>{prettyDate(date)}</div>
        </div>

        <div className="field">
          <label>🌅 What will you achieve today?</label>
          <textarea
            className="input"
            rows={3}
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="Today I will…"
          />
        </div>
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={onSavePlan}>Save plan</button>

        <div className="field" style={{ marginTop: 18 }}>
          <label>🌙 Did you achieve it? How did it help, or why not?</label>
          <div className="row" style={{ gap: 8, marginBottom: 10 }}>
            <button className={`chip-btn${achieved === true ? ' on' : ''}`} onClick={() => setAchieved(true)}>
              ✅ Yes
            </button>
            <button className={`chip-btn${achieved === false ? ' on' : ''}`} onClick={() => setAchieved(false)}>
              ❌ Not today
            </button>
          </div>
          <textarea
            className="input"
            rows={3}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="How it went, what it did for you, or what got in the way…"
          />
        </div>
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={onSaveReflection}>Save reflection</button>
      </div>

      <div className="section-label">Past entries</div>
      {loaded && history.length === 0 && <div className="muted" style={{ fontSize: 13 }}>Your journal history will build up here.</div>}
      {history.map((h) => (
        <div className="card" key={h.id} style={{ marginBottom: 10 }}>
          <div className="row between">
            <div className="goal-title" style={{ fontSize: 15 }}>{prettyDate(h.entry_date)}</div>
            {h.achieved != null && <span className="pill">{h.achieved ? '✅ Achieved' : '❌ Missed'}</span>}
          </div>
          {h.morning_plan && <div style={{ marginTop: 6 }}><span className="muted">Plan: </span>{h.morning_plan}</div>}
          {h.evening_reflection && <div style={{ marginTop: 4 }}><span className="muted">Reflection: </span>{h.evening_reflection}</div>}
        </div>
      ))}
    </div>
  )
}
