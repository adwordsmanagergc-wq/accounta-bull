import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../context/ToastContext'
import {
  addTarget,
  daysLeft,
  deleteTarget,
  fetchTargets,
  setTargetShared,
  targetPercent,
  updateTargetCurrent,
  type ProgressTarget,
} from '../lib/targets'

export default function Targets({ userId }: { userId: string }) {
  const { showToast } = useToast()
  const [targets, setTargets] = useState<ProgressTarget[]>([])
  const [ready, setReady] = useState(false)
  const [show, setShow] = useState(false)

  const [title, setTitle] = useState('')
  const [unit, setUnit] = useState('kg')
  const [start, setStart] = useState('')
  const [target, setTarget] = useState('')
  const [date, setDate] = useState('')
  const [share, setShare] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setTargets(await fetchTargets(userId))
    } catch {
      /* table may not be migrated yet */
    } finally {
      setReady(true)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  async function create() {
    const s = parseFloat(start)
    const t = parseFloat(target)
    if (busy || !title.trim() || isNaN(s) || isNaN(t)) return
    setBusy(true)
    try {
      await addTarget(userId, {
        title: title.trim(),
        unit,
        start_value: s,
        current_value: s,
        target_value: t,
        target_date: date || null,
        shared_with_herd: share,
      })
      setTitle('')
      setStart('')
      setTarget('')
      setDate('')
      setShow(false)
      showToast('Target set 🎯', '✅')
      await load()
    } catch (e) {
      showToast('Could not save, is the targets setup run?', '⚠️')
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  async function updateCurrent(tg: ProgressTarget, value: string) {
    const v = parseFloat(value)
    if (isNaN(v)) return
    setTargets((list) => list.map((x) => (x.id === tg.id ? { ...x, current_value: v } : x)))
    try {
      await updateTargetCurrent(tg.id, v)
    } catch (e) {
      console.error(e)
    }
  }

  async function toggleShare(tg: ProgressTarget) {
    const next = !tg.shared_with_herd
    setTargets((list) => list.map((x) => (x.id === tg.id ? { ...x, shared_with_herd: next } : x)))
    try {
      await setTargetShared(tg.id, next)
    } catch (e) {
      console.error(e)
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this target?')) return
    await deleteTarget(id).catch(() => {})
    setTargets((list) => list.filter((x) => x.id !== id))
  }

  if (!ready) return null

  return (
    <div style={{ marginBottom: 18 }}>
      <div className="row between" style={{ marginBottom: 10 }}>
        <div className="steps-heading" style={{ margin: 0 }}>
          🎯 Targets
        </div>
        <button className="link-btn" style={{ fontSize: 14 }} onClick={() => setShow((v) => !v)}>
          {show ? 'Close' : '＋ New'}
        </button>
      </div>

      {show && (
        <div className="card stack" style={{ marginBottom: 12 }}>
          <div className="field">
            <label>Goal</label>
            <input
              className="input"
              placeholder="e.g. Cut to 78kg"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="row" style={{ gap: 8 }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label>Start</label>
              <input className="input" type="number" inputMode="decimal" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label>Target</label>
              <input className="input" type="number" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
            <div className="field" style={{ width: 78, marginBottom: 0 }}>
              <label>Unit</label>
              <input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Target date (optional)</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <label className="row" style={{ gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
            Let my herd see this & cheer me on
          </label>
          <button className="btn btn-primary" disabled={busy} onClick={create}>
            {busy ? 'Saving…' : 'Set target'}
          </button>
        </div>
      )}

      <div className="stack">
        {targets.map((t) => {
          const pct = targetPercent(t)
          const dl = daysLeft(t)
          return (
            <div className="card target-card" key={t.id}>
              <div className="goal-top">
                <div className="goal-title">{t.title}</div>
                <button className="link-btn" style={{ fontSize: 13 }} onClick={() => remove(t.id)}>
                  Delete
                </button>
              </div>
              <div className="target-bar">
                <div className="target-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="row between" style={{ marginTop: 6 }}>
                <span className="faint" style={{ fontSize: 12 }}>
                  {t.start_value} → {t.target_value} {t.unit}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>{pct}%</span>
              </div>
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <input
                  className="input"
                  type="number"
                  inputMode="decimal"
                  defaultValue={t.current_value}
                  onBlur={(e) => updateCurrent(t, e.target.value)}
                  style={{ flex: 1 }}
                  aria-label="Current value"
                />
                <span className="faint" style={{ fontSize: 12, alignSelf: 'center' }}>
                  now {t.unit}
                </span>
                <button
                  className={`btn btn-ghost btn-sm ${t.shared_with_herd ? 'shared-on' : ''}`}
                  onClick={() => toggleShare(t)}
                  title="Share with herd"
                >
                  {t.shared_with_herd ? '🤝 Herd' : '🔒 Private'}
                </button>
              </div>
              {dl != null && (
                <div className="faint" style={{ fontSize: 12, marginTop: 8 }}>
                  {dl > 0 ? `${dl} days left` : dl === 0 ? 'Target day is today!' : `${-dl} days past target`}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
