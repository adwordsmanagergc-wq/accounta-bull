import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { addProgressPhoto, deleteProgressPhoto, fetchProgressPhotos } from '../lib/progress'
import { signedProgressUrl, uploadProgressPhoto } from '../lib/storage'
import { todayKey } from '../lib/game'
import { PHASES, type PhotoPhase, type ProgressPhoto } from '../lib/types'

export default function Progress() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [phase, setPhase] = useState<PhotoPhase>('during')
  const [takenOn, setTakenOn] = useState(todayKey())
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setError(null)
    try {
      setPhotos(await fetchProgressPhotos(user.id))
    } catch (e) {
      console.error(e)
      setError('Couldn’t load photos. Make sure the photo storage setup has been run in Supabase.')
    } finally {
      setLoaded(true)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return
    setUploading(true)
    try {
      const path = await uploadProgressPhoto(user.id, file)
      await addProgressPhoto(user.id, { phase, storage_path: path, taken_on: takenOn, note })
      setNote('')
      showToast('Photo added 📸', '✅')
      await load()
    } catch (err) {
      console.error(err)
      showToast('Upload failed — check the storage setup and try again.', '⚠️')
    } finally {
      setUploading(false)
    }
  }

  async function onDelete(p: ProgressPhoto) {
    if (!confirm('Delete this photo?')) return
    try {
      await deleteProgressPhoto(p)
      setPhotos((list) => list.filter((x) => x.id !== p.id))
    } catch (err) {
      console.error(err)
      showToast('Could not delete the photo.', '⚠️')
    }
  }

  return (
    <div className="page-pad">
      <button className="back-link link-btn" onClick={() => navigate('/profile')}>
        ← Back
      </button>
      <div className="page-head">
        <div>
          <h1>Progress</h1>
          <div className="muted" style={{ fontSize: 14 }}>
            Before, during & after — see how far you’ve charged.
          </div>
        </div>
      </div>

      {/* Uploader */}
      <div className="card stack" style={{ marginBottom: 18 }}>
        <div className="field">
          <label>Stage</label>
          <div className="cat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            {PHASES.map((p) => (
              <button
                type="button"
                key={p.value}
                className={`cat-btn ${phase === p.value ? 'on' : ''}`}
                onClick={() => setPhase(p.value)}
              >
                <span className="cat-emoji">{p.emoji}</span>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            className="input"
            type="date"
            value={takenOn}
            onChange={(e) => setTakenOn(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="note">Note (optional)</label>
          <input
            id="note"
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Week 1, 82kg"
          />
        </div>
        <button
          className="btn btn-primary"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? 'Uploading…' : '📸 Add photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
      </div>

      {error && <div className="form-error">{error}</div>}

      {loaded && photos.length === 0 && !error && (
        <div className="empty">
          <div className="empty-emoji">📸</div>
          <p>No photos yet — add your first “before” shot above.</p>
        </div>
      )}

      {PHASES.map((p) => {
        const group = photos.filter((x) => x.phase === p.value)
        if (group.length === 0) return null
        return (
          <div key={p.value} style={{ marginBottom: 18 }}>
            <div className="steps-heading" style={{ margin: '0 0 10px' }}>
              {p.emoji} {p.label}
            </div>
            <div className="photo-grid">
              {group.map((photo) => (
                <PhotoTile key={photo.id} photo={photo} onDelete={() => onDelete(photo)} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PhotoTile({ photo, onDelete }: { photo: ProgressPhoto; onDelete: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let ok = true
    signedProgressUrl(photo.storage_path).then((u) => ok && setUrl(u))
    return () => {
      ok = false
    }
  }, [photo.storage_path])

  return (
    <div className="photo-tile">
      {url ? <img src={url} alt={photo.note ?? 'progress'} /> : <div className="photo-skeleton" />}
      <button className="photo-del" onClick={onDelete} title="Delete">
        ✕
      </button>
      <div className="photo-meta">
        <span>{photo.taken_on}</span>
        {photo.note && <span className="photo-note">{photo.note}</span>}
      </div>
    </div>
  )
}
