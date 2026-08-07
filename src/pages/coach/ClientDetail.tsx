import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Avatar from '../../components/Avatar'
import {
  addCoachNote,
  fetchClientCompletions,
  fetchClientGoals,
  fetchClientSharedPhotos,
  fetchCoachNotes,
  fetchTeamMembers,
  resolveCoachNote,
} from '../../lib/coach'
import { signedProgressUrl } from '../../lib/storage'
import { todayKey } from '../../lib/game'
import type { CoachNote, Goal, ProgressPhoto, TeamMemberWithProfile } from '../../lib/types'

export default function ClientDetail() {
  const { id = '', userId = '' } = useParams()
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [member, setMember] = useState<TeamMemberWithProfile | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [activeDays, setActiveDays] = useState(0)
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [signed, setSigned] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<CoachNote[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [noteBody, setNoteBody] = useState('')
  const [noteKind, setNoteKind] = useState<'suggestion' | 'report'>('suggestion')

  const load = useCallback(async () => {
    try {
      const [members, g, comps, ph, ns] = await Promise.all([
        fetchTeamMembers(id),
        fetchClientGoals(id, userId),
        fetchClientCompletions(userId, 30),
        fetchClientSharedPhotos(userId),
        fetchCoachNotes(id),
      ])
      setMember(members.find((m) => m.user_id === userId) ?? null)
      setGoals(g)
      setActiveDays(new Set(comps.map((c) => todayKey(new Date(c.completed_at)))).size)
      setPhotos(ph)
      setNotes(ns.filter((n) => n.about_user === userId))
      const urls: Record<string, string> = {}
      await Promise.all(
        ph.map(async (p) => {
          const u = await signedProgressUrl(p.storage_path)
          if (u) urls[p.id] = u
        })
      )
      setSigned(urls)
    } catch (e) {
      console.error(e)
    } finally {
      setLoaded(true)
    }
  }, [id, userId])

  useEffect(() => {
    load()
  }, [load])

  async function submitNote() {
    if (!noteBody.trim() || !user || busy) return
    setBusy(true)
    try {
      await addCoachNote({ teamId: id, authorId: user.id, aboutUser: userId, kind: noteKind, body: noteBody.trim() })
      setNoteBody('')
      showToast('Sent to the head coach', '✅')
      await load()
    } catch (e) {
      console.error(e)
      showToast('Could not send.', '⚠️')
    } finally {
      setBusy(false)
    }
  }

  const p = member?.profile

  return (
    <div className="page-pad">
      <button className="back-link link-btn" onClick={() => navigate(`/coach/team/${id}`)}>← Team</button>

      <div className="team-header">
        <Avatar url={p?.avatar_url} name={p?.name} size={56} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22 }}>{p?.name || p?.username || 'Client'}</h1>
          <div className="muted" style={{ fontSize: 13 }}>🔥 {p?.streak ?? 0} day streak · 🏆 {p?.horns ?? 0} horns</div>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="card stat"><div className="stat-num">{activeDays}</div><div className="stat-label">Active days (30d)</div></div>
        <div className="card stat"><div className="stat-num">{goals.length}</div><div className="stat-label">Assigned tasks</div></div>
      </div>

      <div className="section-label">Assigned tasks</div>
      {loaded && goals.length === 0 && <div className="muted" style={{ marginBottom: 12 }}>None yet.</div>}
      {goals.map((g) => (
        <div className="card team-row" key={g.id}>
          <div style={{ flex: 1 }}>
            <div className="goal-title">{g.title}</div>
            <div className="goal-meta">{g.time_of_day} · 🏆 {g.horn_value} · {g.active ? 'active' : 'paused'}</div>
          </div>
        </div>
      ))}

      <div className="section-label" style={{ marginTop: 18 }}>Progress photos</div>
      {loaded && photos.length === 0 && (
        <div className="muted" style={{ marginBottom: 12 }}>None shared. Photos show only if the client opts in.</div>
      )}
      <div className="photo-grid">
        {photos.map((ph) => (
          <div className="photo-tile" key={ph.id}>
            {signed[ph.id] ? <img src={signed[ph.id]} alt={ph.phase} /> : <div className="photo-skeleton" />}
            <div className="photo-meta">{ph.phase} · {ph.taken_on}</div>
          </div>
        ))}
      </div>

      <div className="section-label" style={{ marginTop: 18 }}>Notes to the head coach</div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Private to coaches. The client never sees these.</div>
      {notes.map((n) => (
        <div className="card" key={n.id} style={{ marginBottom: 8 }}>
          <div className="row between">
            <span className="pill">{n.kind}</span>
            {!n.resolved_at && user?.id !== n.author_id && (
              <button className="link-btn" style={{ fontSize: 12 }} onClick={() => resolveCoachNote(n.id).then(load)}>
                Mark done
              </button>
            )}
          </div>
          <div style={{ marginTop: 6 }}>{n.body}</div>
          {n.resolved_at && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Resolved</div>}
        </div>
      ))}
      <div className="card">
        <div className="row" style={{ gap: 8, marginBottom: 8 }}>
          <button className={`chip-btn${noteKind === 'suggestion' ? ' on' : ''}`} onClick={() => setNoteKind('suggestion')}>Suggestion</button>
          <button className={`chip-btn${noteKind === 'report' ? ' on' : ''}`} onClick={() => setNoteKind('report')}>Report</button>
        </div>
        <textarea
          className="input"
          rows={2}
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          placeholder="Suggest an action or report privately to the head coach…"
        />
        <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} disabled={busy} onClick={submitNote}>
          Send
        </button>
      </div>
    </div>
  )
}
