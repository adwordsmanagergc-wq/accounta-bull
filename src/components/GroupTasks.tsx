import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../context/ToastContext'
import {
  addTeamTask,
  checkOffTask,
  deleteTeamTask,
  fetchProfileNames,
  fetchTeamTaskCheckins,
  fetchTeamTasks,
  uncheckTask,
} from '../lib/coach'
import type { TeamTask, TeamTaskCheckin } from '../lib/types'

function whenLabel(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/** Shared team task board: a coach posts a task, members check it off with a note. */
export default function GroupTasks({
  teamId,
  canManage,
  userId,
}: {
  teamId: string
  canManage: boolean
  userId: string
}) {
  const { showToast } = useToast()
  const [tasks, setTasks] = useState<TeamTask[]>([])
  const [checkins, setCheckins] = useState<Record<string, TeamTaskCheckin[]>>({})
  const [names, setNames] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      const ts = await fetchTeamTasks(teamId)
      setTasks(ts)
      const ci = await fetchTeamTaskCheckins(ts.map((t) => t.id))
      const grouped: Record<string, TeamTaskCheckin[]> = {}
      for (const c of ci) (grouped[c.task_id] ??= []).push(c)
      setCheckins(grouped)
      setNames(await fetchProfileNames(ci.map((c) => c.user_id)))
    } catch (e) {
      console.error(e)
    } finally {
      setLoaded(true)
    }
  }, [teamId])

  useEffect(() => {
    load()
  }, [load])

  async function add() {
    if (!title.trim() || busy) return
    setBusy(true)
    try {
      await addTeamTask(teamId, userId, title.trim(), desc.trim() || null)
      setTitle('')
      setDesc('')
      setAdding(false)
      await load()
    } catch {
      showToast('Could not add the task.', '⚠️')
    } finally {
      setBusy(false)
    }
  }

  async function markDone(taskId: string) {
    setBusy(true)
    try {
      await checkOffTask(taskId, userId, (noteDraft[taskId] ?? '').trim() || null)
      await load()
    } catch {
      showToast('Could not check off.', '⚠️')
    } finally {
      setBusy(false)
    }
  }

  async function undo(taskId: string) {
    setBusy(true)
    try {
      await uncheckTask(taskId, userId)
      await load()
    } catch {
      showToast('Could not undo.', '⚠️')
    } finally {
      setBusy(false)
    }
  }

  async function remove(taskId: string) {
    if (!confirm('Delete this group task for everyone?')) return
    setBusy(true)
    try {
      await deleteTeamTask(taskId)
      await load()
    } catch {
      showToast('Could not delete.', '⚠️')
    } finally {
      setBusy(false)
    }
  }

  const mine = (taskId: string) => checkins[taskId]?.find((c) => c.user_id === userId)

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="row between" style={{ marginBottom: 8 }}>
        <span style={{ fontWeight: 700 }}>Group tasks</span>
        {canManage && (
          <button className="link-btn" onClick={() => setAdding((a) => !a)}>
            {adding ? '−' : '+ Add'}
          </button>
        )}
      </div>

      {canManage && adding && (
        <div className="stack" style={{ marginBottom: 12 }}>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Group task, e.g. Team 5k this week" />
          <textarea className="input" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Details (optional)" />
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={add}>Post group task</button>
        </div>
      )}

      {loaded && tasks.length === 0 && <div className="muted" style={{ fontSize: 13 }}>No group tasks yet.</div>}

      {tasks.map((t) => {
        const done = mine(t.id)
        const all = checkins[t.id] ?? []
        return (
          <div key={t.id} className="group-task">
            <div className="row between">
              <div style={{ flex: 1 }}>
                <div className="goal-title">{t.title}</div>
                {t.description && <div className="goal-meta">{t.description}</div>}
              </div>
              {canManage && (
                <button className="link-btn tiny-danger" title="Delete" disabled={busy} onClick={() => remove(t.id)}>✕</button>
              )}
            </div>

            {done ? (
              <div className="done-row">
                <span>✓ You did this · {whenLabel(done.completed_at)}</span>
                {done.note && <span className="muted">, {done.note}</span>}
                <button className="link-btn" style={{ fontSize: 12, marginLeft: 8 }} disabled={busy} onClick={() => undo(t.id)}>undo</button>
              </div>
            ) : (
              <div className="stack" style={{ marginTop: 8 }}>
                <input
                  className="input"
                  value={noteDraft[t.id] ?? ''}
                  onChange={(e) => setNoteDraft((d) => ({ ...d, [t.id]: e.target.value }))}
                  placeholder="How did it go? (optional)"
                />
                <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => markDone(t.id)}>Mark done</button>
              </div>
            )}

            {all.length > 0 && (
              <div className="checkin-list">
                <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>{all.length} done</div>
                {all.map((c) => (
                  <div key={c.id} className="checkin-row">
                    <span className="checkin-name">{names[c.user_id] ?? 'Member'}</span>
                    <span className="muted"> · {whenLabel(c.completed_at)}</span>
                    {c.note && <div className="checkin-note">“{c.note}”</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
