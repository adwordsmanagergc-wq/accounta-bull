import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Avatar from '../../components/Avatar'
import GroupTasks from '../../components/GroupTasks'
import {
  addCoachByUsername,
  assignTask,
  createInviteCode,
  fetchTeam,
  fetchTeamMembers,
  removeMember,
  sendTeamPush,
} from '../../lib/coach'
import { CATEGORIES, DAY_LABELS, type Category, type Team, type TeamMemberWithProfile } from '../../lib/types'

export default function TeamDashboard() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMemberWithProfile[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [t, m] = await Promise.all([fetchTeam(id), fetchTeamMembers(id)])
      setTeam(t)
      setMembers(m)
    } catch (e) {
      console.error(e)
      setError('Couldn’t load this team.')
    } finally {
      setLoaded(true)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const isOwner = !!team && !!user && team.owner_id === user.id
  const clients = members.filter((m) => m.role === 'client')
  const coaches = members.filter((m) => m.role === 'owner' || m.role === 'coach')

  if (loaded && !team) {
    return (
      <div className="page-pad">
        <button className="back-link link-btn" onClick={() => navigate('/coach')}>← Teams</button>
        <div className="empty"><p>{error ?? 'Team not found.'}</p></div>
      </div>
    )
  }

  // The team's gradient theme fills the whole page (a dark scrim keeps text and
  // cards readable over it).
  const pageStyle: CSSProperties = team?.accent
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(10,22,40,0.32) 0%, rgba(10,22,40,0.66) 100%), ${team.accent}`,
        backgroundAttachment: 'fixed',
        minHeight: '100dvh',
      }
    : {}

  return (
    <div className="page-pad" style={pageStyle}>
      <button className="back-link link-btn" onClick={() => navigate('/coach')}>← Teams</button>

      <div
        className={`brand-cover${team?.logo_url ? '' : ' empty'}`}
        style={team?.logo_url ? { backgroundImage: `url(${team.logo_url})` } : team?.accent ? { backgroundImage: team.accent } : undefined}
      >
        {!team?.logo_url && <span className="brand-cover-initial">{(team?.name ?? '?').slice(0, 1).toUpperCase()}</span>}
        <div className="brand-cover-overlay">
          <h1 className="banner-title">{team?.name}</h1>
          <div className="banner-sub">
            {clients.length} client{clients.length === 1 ? '' : 's'} · {coaches.length} coach{coaches.length === 1 ? '' : 'es'}
          </div>
        </div>
        {isOwner && (
          <button className="btn btn-ghost btn-sm brand-btn" onClick={() => navigate(`/coach/team/${id}/branding`)}>
            ⚙️
          </button>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      <InvitePanel teamId={id} isOwner={isOwner} busy={busy} setBusy={setBusy} onChange={load} />

      <AssignPanel teamId={id} clients={clients} busy={busy} setBusy={setBusy} />

      <PushPanel teamId={id} clients={clients} busy={busy} setBusy={setBusy} />

      {user && <GroupTasks teamId={id} canManage={isOwner || coaches.some((c) => c.user_id === user.id)} userId={user.id} />}

      <div className="section-label">Clients</div>
      {loaded && clients.length === 0 && <div className="muted" style={{ marginBottom: 12 }}>No clients yet. Share an invite code above.</div>}
      {clients.map((m) => (
        <div className="card team-row" key={m.id}>
          <button className="team-row-main" onClick={() => navigate(`/coach/team/${id}/client/${m.user_id}`)}>
            <Avatar url={m.profile?.avatar_url} name={m.profile?.name} size={40} />
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div className="goal-title">{m.profile?.name || m.profile?.username || 'Client'}</div>
              <div className="goal-meta">🔥 {m.profile?.streak ?? 0} · 🏆 {m.profile?.horns ?? 0}</div>
            </div>
            <span className="muted">›</span>
          </button>
          <button
            className="link-btn tiny-danger"
            title="Remove"
            disabled={busy}
            onClick={async () => {
              if (!confirm('Remove this client from the team?')) return
              setBusy(true)
              try { await removeMember(id, m.user_id); await load() }
              catch { showToast('Could not remove.', '⚠️') }
              finally { setBusy(false) }
            }}
          >
            ✕
          </button>
        </div>
      ))}

      <div className="section-label" style={{ marginTop: 18 }}>Coaches</div>
      {coaches.map((m) => (
        <div className="card team-row" key={m.id}>
          <Avatar url={m.profile?.avatar_url} name={m.profile?.name} size={36} />
          <div style={{ flex: 1 }}>
            <div className="goal-title">{m.profile?.name || m.profile?.username || 'Coach'}</div>
            <div className="goal-meta">
              {m.role === 'owner' ? 'Head coach' : 'Co-coach'}
              {m.status === 'pending' ? ' · invite pending' : ''}
            </div>
          </div>
        </div>
      ))}

      {isOwner && <AddCoachPanel teamId={id} busy={busy} setBusy={setBusy} onChange={load} />}
    </div>
  )
}

function InvitePanel({
  teamId, isOwner, busy, setBusy, onChange,
}: { teamId: string; isOwner: boolean; busy: boolean; setBusy: (b: boolean) => void; onChange: () => void }) {
  const { showToast } = useToast()
  const [code, setCode] = useState<string | null>(null)

  async function make() {
    setBusy(true)
    try {
      const c = await createInviteCode(teamId, 'client')
      setCode(c)
      onChange()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not create an invite.'
      showToast(msg, '⚠️')
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  const link = code ? `${window.location.origin}${import.meta.env.BASE_URL}#/join/${code}` : ''

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Invite clients</div>
      {!code ? (
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={make}>
          Create an invite link
        </button>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          <div className="invite-code">{code}</div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              navigator.clipboard?.writeText(link)
              showToast('Invite link copied', '🔗')
            }}
          >
            Copy invite link
          </button>
          <button className="link-btn" style={{ fontSize: 13 }} disabled={busy} onClick={make}>
            New code
          </button>
        </div>
      )}
      {isOwner && <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Add co-coaches by username below.</div>}
    </div>
  )
}

function AssignPanel({
  teamId, clients, busy, setBusy,
}: { teamId: string; clients: TeamMemberWithProfile[]; busy: boolean; setBusy: (b: boolean) => void }) {
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('fitness')
  const [time, setTime] = useState('08:00')
  const [days, setDays] = useState<number[]>([])
  const [horns, setHorns] = useState(10)
  const [target, setTarget] = useState<string>('all')

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  async function submit() {
    if (!title.trim() || busy) return
    setBusy(true)
    try {
      const n = await assignTask(teamId, target === 'all' ? null : target, {
        title: title.trim(), category, time_of_day: time, repeat_days: days, horn_value: horns,
      })
      showToast(`Assigned to ${n} client${n === 1 ? '' : 's'} 💪`, '✅')
      setTitle('')
      setDays([])
      setOpen(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not assign.'
      showToast(msg, '⚠️')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <button className="row between accordion-head" onClick={() => setOpen((o) => !o)}>
        <span style={{ fontWeight: 700 }}>Assign a task</span>
        <span className="muted">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="stack" style={{ marginTop: 12 }}>
          <div className="field">
            <label>Task</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 30 min cardio" />
          </div>
          <div className="field">
            <label>Assign to</label>
            <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="all">Whole team</option>
              {clients.map((c) => (
                <option key={c.user_id} value={c.user_id}>{c.profile?.name || c.profile?.username || 'Client'}</option>
              ))}
            </select>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Time</label>
              <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Repeat (none = every day)</label>
            <div className="day-grid">
              {DAY_LABELS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  className={`day-btn ${days.includes(i) ? 'on' : ''}`}
                  onClick={() => toggleDay(i)}
                >
                  {d[0]}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Horns for finishing: {horns}</label>
            <input type="range" min={0} max={50} step={5} value={horns} onChange={(e) => setHorns(Number(e.target.value))} />
          </div>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>Assign</button>
        </div>
      )}
    </div>
  )
}

function PushPanel({
  teamId, clients, busy, setBusy,
}: { teamId: string; clients: TeamMemberWithProfile[]; busy: boolean; setBusy: (b: boolean) => void }) {
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [target, setTarget] = useState('all')

  async function send() {
    if (!title.trim() || !body.trim() || busy) return
    setBusy(true)
    const r = await sendTeamPush(teamId, target === 'all' ? null : target, title.trim(), body.trim())
    setBusy(false)
    showToast(r.message, r.ok ? '📣' : '⚠️')
    if (r.ok) { setTitle(''); setBody(''); setOpen(false) }
  }

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <button className="row between accordion-head" onClick={() => setOpen((o) => !o)}>
        <span style={{ fontWeight: 700 }}>Send a notification</span>
        <span className="muted">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="stack" style={{ marginTop: 12 }}>
          <div className="field">
            <label>Send to</label>
            <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="all">Whole team</option>
              {clients.map((c) => (
                <option key={c.user_id} value={c.user_id}>{c.profile?.name || c.profile?.username || 'Client'}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Title</label>
            <input className="input" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quick heads up" />
          </div>
          <div className="field">
            <label>Message</label>
            <textarea className="input" rows={2} maxLength={300} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Great work this week, keep it up." />
          </div>
          <button className="btn btn-primary" disabled={busy} onClick={send}>Send push</button>
        </div>
      )}
    </div>
  )
}

function AddCoachPanel({
  teamId, busy, setBusy, onChange,
}: { teamId: string; busy: boolean; setBusy: (b: boolean) => void; onChange: () => void }) {
  const { showToast } = useToast()
  const [username, setUsername] = useState('')

  async function add() {
    if (!username.trim() || busy) return
    setBusy(true)
    try {
      await addCoachByUsername(teamId, username.trim())
      showToast('Co-coach invited (pending their accept)', '✅')
      setUsername('')
      onChange()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not add co-coach.'
      showToast(msg, '⚠️')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div className="field">
        <label>Add a co-coach by username</label>
        <div className="join-row">
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="their @username" />
          <button className="btn btn-ghost btn-join" disabled={busy} onClick={add}>Invite</button>
        </div>
      </div>
    </div>
  )
}
