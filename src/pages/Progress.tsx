import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  addProgressPhoto,
  deleteProgressPhoto,
  fetchProgressPhotos,
  setPhotoShared,
} from '../lib/progress'
import { signedProgressUrl, uploadProgressPhoto } from '../lib/storage'
import { compressImage } from '../lib/media'
import {
  addMeasurement,
  fetchMeasurements,
  type Measurement,
} from '../lib/measurements'
import WeightChart from '../components/WeightChart'
import Targets from '../components/Targets'
import { fetchFeedback, type PhotoFeedback } from '../lib/feedback'
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
  const [compare, setCompare] = useState(false)

  const [feedback, setFeedback] = useState<PhotoFeedback[]>([])

  // Measurements
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [weight, setWeight] = useState('')
  const [mDate, setMDate] = useState(todayKey())
  const [savingM, setSavingM] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setError(null)
    try {
      const ph = await fetchProgressPhotos(user.id)
      setPhotos(ph)
      try {
        setMeasurements(await fetchMeasurements(user.id))
      } catch {
        /* measurements table may not be migrated yet */
      }
      try {
        setFeedback(await fetchFeedback(ph.map((p) => p.id)))
      } catch {
        /* feedback table may not be migrated yet */
      }
    } catch (e) {
      console.error(e)
      setError('Couldn’t load photos. Make sure the photo storage setup has been run in Supabase.')
    } finally {
      setLoaded(true)
    }
  }, [user])

  async function saveWeight() {
    const w = parseFloat(weight)
    if (!user || savingM || isNaN(w)) return
    setSavingM(true)
    try {
      await addMeasurement(user.id, { taken_on: mDate, weight: w, note: '' })
      setWeight('')
      setMeasurements(await fetchMeasurements(user.id))
      showToast('Logged 📈', '✅')
    } catch (e) {
      console.error(e)
      showToast('Could not save, is the measurements setup run?', '⚠️')
    } finally {
      setSavingM(false)
    }
  }

  async function toggleShare(photo: ProgressPhoto) {
    const next = !photo.shared_with_herd
    setPhotos((list) => list.map((p) => (p.id === photo.id ? { ...p, shared_with_herd: next } : p)))
    try {
      await setPhotoShared(photo.id, next)
      showToast(next ? 'Shared with your herd 🤝' : 'Made private again 🔒', next ? '🤝' : '🔒')
    } catch (e) {
      console.error(e)
      setPhotos((list) => list.map((p) => (p.id === photo.id ? { ...p, shared_with_herd: !next } : p)))
      showToast('Could not update sharing.', '⚠️')
    }
  }

  const before = photos.filter((p) => p.phase === 'before')
  const after = photos.filter((p) => p.phase === 'after')
  const canCompare = before.length > 0 && after.length > 0

  useEffect(() => {
    load()
  }, [load])

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return
    setUploading(true)
    try {
      const path = await uploadProgressPhoto(user.id, await compressImage(file))
      await addProgressPhoto(user.id, { phase, storage_path: path, taken_on: takenOn, note })
      setNote('')
      showToast('Photo added 📸', '✅')
      await load()
    } catch (err) {
      console.error(err)
      showToast('Upload failed, check the storage setup and try again.', '⚠️')
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
            Before, during & after, see how far you’ve charged.
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

      {/* Targets, set a goal value + date and track % */}
      {user && <Targets userId={user.id} />}

      {/* Measurements + chart */}
      <div className="card stack" style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 700 }}>Weight log</div>
        <div className="row" style={{ gap: 8 }}>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            placeholder="Weight"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            style={{ flex: 1 }}
          />
          <input
            className="input"
            type="date"
            value={mDate}
            onChange={(e) => setMDate(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary btn-sm" disabled={savingM} onClick={saveWeight}>
            {savingM ? '…' : 'Log'}
          </button>
        </div>
        {measurements.length >= 2 ? (
          <WeightChart data={measurements} />
        ) : (
          <div className="faint" style={{ fontSize: 13 }}>
            Log at least two weigh-ins to see your trend.
          </div>
        )}
      </div>

      {loaded && photos.length === 0 && !error && (
        <div className="empty">
          <div className="empty-emoji">📸</div>
          <p>No photos yet, add your first “before” shot above.</p>
        </div>
      )}

      {canCompare && (
        <div style={{ marginBottom: 18 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setCompare((v) => !v)}>
            {compare ? 'Hide comparison' : '↔️ Compare before & after'}
          </button>
          {compare && (
            <div className="compare-grid" style={{ marginTop: 10 }}>
              <ComparePane photo={before[before.length - 1]} label="Before" />
              <ComparePane photo={after[0]} label="After" />
            </div>
          )}
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
                <PhotoTile
                  key={photo.id}
                  photo={photo}
                  feedback={feedback.filter((f) => f.photo_id === photo.id)}
                  onDelete={() => onDelete(photo)}
                  onToggleShare={() => toggleShare(photo)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function usePhotoUrl(path: string) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let ok = true
    signedProgressUrl(path).then((u) => ok && setUrl(u))
    return () => {
      ok = false
    }
  }, [path])
  return url
}

function PhotoTile({
  photo,
  feedback,
  onDelete,
  onToggleShare,
}: {
  photo: ProgressPhoto
  feedback: PhotoFeedback[]
  onDelete: () => void
  onToggleShare: () => void
}) {
  const url = usePhotoUrl(photo.storage_path)
  return (
    <div className="photo-tile">
      {url ? (
        photo.media_type === 'video' ? (
          <video src={url} controls playsInline />
        ) : (
          <img src={url} alt={photo.note ?? 'progress'} />
        )
      ) : (
        <div className="photo-skeleton" />
      )}
      <button className="photo-del" onClick={onDelete} title="Delete">
        ✕
      </button>
      <button
        className={`photo-share ${photo.shared_with_herd ? 'on' : ''}`}
        onClick={onToggleShare}
        title={photo.shared_with_herd ? 'Shared with herd, tap to make private' : 'Share with herd'}
      >
        {photo.shared_with_herd ? '🤝' : '🔒'}
      </button>
      {feedback.length > 0 && (
        <div className="photo-feedback" title={feedback.map((f) => f.message).filter(Boolean).join(' · ')}>
          {feedback.map((f) => f.emoji).slice(0, 6).join('')} {feedback.length}
        </div>
      )}
      <div className="photo-meta">
        <span>{photo.taken_on}</span>
        {photo.note && <span className="photo-note">{photo.note}</span>}
      </div>
    </div>
  )
}

function ComparePane({ photo, label }: { photo: ProgressPhoto; label: string }) {
  const url = usePhotoUrl(photo.storage_path)
  return (
    <div className="compare-pane">
      <div className="compare-label">{label}</div>
      {url ? <img src={url} alt={label} /> : <div className="photo-skeleton" />}
      <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>
        {photo.taken_on}
      </div>
    </div>
  )
}
