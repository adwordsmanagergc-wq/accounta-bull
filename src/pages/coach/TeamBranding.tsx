import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { fetchTeam, updateTeamBranding, uploadTeamLogo } from '../../lib/coach'

const ACCENTS = ['#f5821f', '#c9a96a', '#3b82f6', '#22c55e', '#ef4444', '#a855f7']

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
        <button className="avatar-edit" onClick={() => fileRef.current?.click()} disabled={busy} title="Upload logo">
          <div className="team-badge lg" style={accent ? { background: accent } : undefined}>
            {logo ? <img src={logo} alt="" /> : (name || '?').slice(0, 1).toUpperCase()}
          </div>
          <span className="avatar-cam">{busy ? '…' : '📷'}</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onLogo} />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="field">
          <label>Team name</label>
          <input className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Accent colour</label>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            {ACCENTS.map((c) => (
              <button
                key={c}
                className={`swatch${accent === c ? ' on' : ''}`}
                style={{ background: c }}
                onClick={() => setAccent(c)}
                aria-label={c}
              />
            ))}
            <button className={`swatch none${accent === null ? ' on' : ''}`} onClick={() => setAccent(null)} aria-label="default">
              ×
            </button>
          </div>
        </div>
      </div>

      <button className="btn btn-primary" disabled={busy} onClick={save}>Save</button>
    </div>
  )
}
