import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { fetchTeam, updateTeamBranding, uploadTeamLogo } from '../../lib/coach'
import { TEAM_GRADIENTS } from '../../lib/types'

export default function TeamBranding() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [accent, setAccent] = useState<string | null>(null)
  const [logo, setLogo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchTeam(id).then((t) => {
      if (t) {
        setName(t.name)
        setAccent(t.accent)
        setLogo(t.logo_url)
      }
    })
  }, [id])

  async function save() {
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      await updateTeamBranding(id, { name: name.trim(), accent })
      showToast('Team branding saved', '✅')
      navigate(`/coach/team/${id}`)
    } catch (e) {
      console.error(e)
      showToast('Could not save.', '⚠️')
    } finally {
      setBusy(false)
    }
  }

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return
    setBusy(true)
    try {
      const url = await uploadTeamLogo(user.id, id, file)
      await updateTeamBranding(id, { logo_url: url })
      setLogo(url)
      showToast('Logo updated 🖼️', '✅')
    } catch (e) {
      console.error(e)
      showToast('Could not upload the logo.', '⚠️')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-pad">
      <button className="back-link link-btn" onClick={() => navigate(`/coach/team/${id}`)}>← Team</button>
      <div className="page-head"><h1>Team branding</h1></div>

      <div className="card center" style={{ marginBottom: 16 }}>
        <div className="team-banner preview" style={accent ? { backgroundImage: accent } : undefined}>
          <button className="avatar-edit" onClick={() => fileRef.current?.click()} disabled={busy} title="Upload logo">
            <div className="team-badge lg on-banner">
              {logo ? <img src={logo} alt="" /> : (name || '?').slice(0, 1).toUpperCase()}
            </div>
            <span className="avatar-cam">{busy ? '…' : '📷'}</span>
          </button>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Your logo also floats faintly behind the team page.</div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onLogo} />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="field">
          <label>Team name</label>
          <input className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Theme</label>
          <div className="gradient-grid">
            {TEAM_GRADIENTS.map((g) => (
              <button
                key={g.name}
                className={`gradient-swatch${accent === g.css ? ' on' : ''}`}
                style={{ backgroundImage: g.css }}
                onClick={() => setAccent(g.css)}
                title={g.name}
              >
                <span>{g.name}</span>
              </button>
            ))}
            <button
              className={`gradient-swatch none${accent === null ? ' on' : ''}`}
              onClick={() => setAccent(null)}
            >
              <span>None</span>
            </button>
          </div>
        </div>
      </div>

      <button className="btn btn-primary" disabled={busy} onClick={save}>Save</button>
    </div>
  )
}
