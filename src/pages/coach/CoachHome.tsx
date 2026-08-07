import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  acceptMembership,
  createTeam,
  fetchMyMemberships,
  joinTeamByCode,
  leaveTeam,
  setPhotoSharing,
} from '../../lib/coach'
import type { Membership } from '../../lib/types'

export default function CoachHome() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setError(null)
    try {
      setMemberships(await fetchMyMemberships(user.id))
    } catch (e) {
      console.error(e)
      setError('Couldn’t load your teams. Make sure the Team setup has been run in Supabase.')
    } finally {
      setLoaded(true)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  async function create() {
    if (!newName.trim() || busy) return
    setBusy(true)
    try {
      const id = await createTeam(newName.trim())
      setNewName('')
      showToast('Team created 🐂', '✅')
      navigate(`/coach/team/${id}`)
    } catch (e) {
      console.error(e)
      showToast('Could not create the team.', '⚠️')
    } finally {
      setBusy(false)
    }
  }

  async function join() {
    if (!joinCode.trim() || busy) return
    setBusy(true)
    try {
      await joinTeamByCode(joinCode)
      setJoinCode('')
      showToast('Joined the team 🎉', '✅')
      await load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not join.'
      showToast(msg, '⚠️')
    } finally {
      setBusy(false)
    }
  }

  async function accept(teamId: string) {
    setBusy(true)
    try {
      await acceptMembership(teamId)
      showToast('You’re now a co-coach 🙌', '✅')
      await load()
    } catch (e) {
      console.error(e)
      showToast('Could not accept.', '⚠️')
    } finally {
      setBusy(false)
    }
  }

  async function leave(teamId: string) {
    if (!user || !confirm('Leave this team?')) return
    setBusy(true)
    try {
      await leaveTeam(teamId, user.id)
      await load()
    } catch (e) {
      console.error(e)
      showToast('Could not leave.', '⚠️')
    } finally {
      setBusy(false)
    }
  }

  async function togglePhotos(teamId: string, share: boolean) {
    setBusy(true)
    try {
      await setPhotoSharing(teamId, share)
      showToast(share ? 'Sharing progress photos with your coach' : 'Photo sharing off', '📸')
      await load()
    } catch (e) {
      console.error(e)
      showToast('Could not update sharing.', '⚠️')
    } finally {
      setBusy(false)
    }
  }

  const coaching = memberships.filter(
    (m) => m.member.status === 'active' && (m.member.role === 'owner' || m.member.role === 'coach')
  )
  const pending = memberships.filter((m) => m.member.status === 'pending')
  const clientOf = memberships.filter((m) => m.member.status === 'active' && m.member.role === 'client')

  return (
    <div className="page-pad">
      <button className="back-link link-btn" onClick={() => navigate('/profile')}>
        ← Back
      </button>
      <div className="page-head">
        <div>
          <h1>Teams</h1>
          <div className="muted" style={{ fontSize: 14 }}>
            Coach a team, or join one as a client.
          </div>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Invitations</div>
          {pending.map((m) => (
            <div className="row between" key={m.team.id} style={{ marginBottom: 8 }}>
              <div>
                <div className="goal-title">{m.team.name}</div>
                <div className="goal-meta">Invited as co-coach</div>
              </div>
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => accept(m.team.id)}>
                Accept
              </button>
            </div>
          ))}
        </div>
      )}

      {loaded && (
        <>
          <div className="section-label">You coach</div>
          {coaching.length === 0 && <div className="muted" style={{ marginBottom: 12 }}>No teams yet.</div>}
          {coaching.map((m) => (
            <button
              key={m.team.id}
              className="card team-row"
              onClick={() => navigate(`/coach/team/${m.team.id}`)}
            >
              <div className="team-badge" style={m.team.accent ? { background: m.team.accent } : undefined}>
                {m.team.logo_url ? <img src={m.team.logo_url} alt="" /> : m.team.name.slice(0, 1).toUpperCase()}
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div className="goal-title">{m.team.name}</div>
                <div className="goal-meta">{m.member.role === 'owner' ? 'Head coach' : 'Co-coach'}</div>
              </div>
              <span className="muted">›</span>
            </button>
          ))}

          <div className="card" style={{ marginTop: 8, marginBottom: 20 }}>
            <div className="field">
              <label htmlFor="team-name">Create a team</label>
              <div className="join-row">
                <input
                  id="team-name"
                  className="input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Iron Herd Coaching"
                  maxLength={60}
                />
                <button className="btn btn-primary btn-join" disabled={busy} onClick={create}>
                  Create
                </button>
              </div>
            </div>
          </div>

          <div className="section-label">You’re a client of</div>
          {clientOf.length === 0 && <div className="muted" style={{ marginBottom: 12 }}>Not on any team yet.</div>}
          {clientOf.map((m) => (
            <div className="card" key={m.team.id} style={{ marginBottom: 10 }}>
              <div className="row between">
                <div>
                  <div className="goal-title">{m.team.name}</div>
                  <div className="goal-meta">Your coach’s team</div>
                </div>
                <button className="link-btn" style={{ fontSize: 13 }} disabled={busy} onClick={() => leave(m.team.id)}>
                  Leave
                </button>
              </div>
              <label className="row between share-toggle" style={{ marginTop: 10 }}>
                <span className="muted" style={{ fontSize: 13 }}>Share my progress photos with this coach</span>
                <input
                  type="checkbox"
                  checked={m.member.share_photos}
                  disabled={busy}
                  onChange={(e) => togglePhotos(m.team.id, e.target.checked)}
                />
              </label>
            </div>
          ))}

          <div className="card" style={{ marginTop: 8 }}>
            <div className="field">
              <label htmlFor="join-code">Join a team with a code</label>
              <div className="join-row">
                <input
                  id="join-code"
                  className="input"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Paste your invite code"
                />
                <button className="btn btn-ghost btn-join" disabled={busy} onClick={join}>
                  Join
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
