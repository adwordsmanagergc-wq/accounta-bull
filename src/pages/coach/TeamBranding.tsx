import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { fetchTeam, updateTeamBranding, uploadTeamLogo } from '../../lib/coach'
import { compressImage } from '../../lib/media'
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
      const url = await uploadTeamLogo(user.id, id, await compressImage(file))
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

  const pageStyle: CSSProperties = accent
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(10,22,40,0.32) 0%, rgba(10,22,40,0.66) 100%), ${accent}`,
        backgroundAttachment: 'fixed',
        minHeight: '100dvh',
      }
    : {}

  return (
    <div className="page-pad" style={pageStyle}>
      <button className="back-link link-btn" onClick={() => navigate(`/coach/team/${id}`)}>← Team</button>
      <div className="page-head"><h1>Team branding</h1></div>

      <div
        className={`brand-cover editable${logo ? '' : ' empty'}`}
        style={logo ? { backgroundImage: `url(${logo})` } : accent ? { backgroundImage: accent } : undefined}
        onClick={() => !busy && fileRef.current?.click()}
      >
        {!logo && <span className="brand-cover-initial">{(name || '?').slice(0, 1).toUpperCase()}</span>}
        <span className="avatar-cam">{busy ? '…' : '📷'}</span>
      </div>
      <div className="muted" style={{ fontSize: 12, margin: '8px 0 16px' }}>
        Tap the banner to upload your team logo. It fills the whole banner.
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onLogo} />

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
