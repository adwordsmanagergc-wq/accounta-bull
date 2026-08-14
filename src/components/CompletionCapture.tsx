import { useEffect, useRef, useState } from 'react'
import { useToast } from '../context/ToastContext'
import { addProgressPhoto } from '../lib/progress'
import { addJournalMedia, todayDate } from '../lib/journal'
import { fetchMyMemberships } from '../lib/coach'
import { createPost } from '../lib/feed'
import { mediaKind, uploadFeedMedia, uploadProgressPhoto } from '../lib/storage'
import { MAX_VIDEO_SECONDS, prepareUpload } from '../lib/media'
import type { Goal } from '../lib/types'

/** After a task is completed, offer to attach a photo/video to Progress or Journal. */
export default function CompletionCapture({
  goal,
  userId,
  onClose,
}: {
  goal: Goal
  userId: string
  onClose: () => void
}) {
  const { showToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dest, setDest] = useState<'progress' | 'journal' | 'share'>('progress')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([])
  const [scope, setScope] = useState('herd')

  useEffect(() => {
    fetchMyMemberships(userId)
      .then((ms) => setTeams(ms.filter((m) => m.member.status === 'active').map((m) => ({ id: m.team.id, name: m.team.name }))))
      .catch(() => {})
  }, [userId])

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0] ?? null
    e.target.value = ''
    if (!raw) return
    setPreview(URL.createObjectURL(raw))
    setPreparing(true)
    try {
      // Compress images; enforce the video length + size limits.
      const prepared = await prepareUpload(raw)
      setFile(prepared)
    } catch (err) {
      setFile(null)
      setPreview(null)
      showToast(err instanceof Error ? err.message : 'Could not use that file.', '⚠️')
    } finally {
      setPreparing(false)
    }
  }

  async function save() {
    if (!file || busy) return
    setBusy(true)
    try {
      const kind = mediaKind(file)
      if (dest === 'share') {
        // Public feed post with the finished task name.
        const url = await uploadFeedMedia(userId, file)
        await createPost({
          userId,
          scope: scope === 'herd' ? 'herd' : 'team',
          teamId: scope === 'herd' ? null : scope,
          body: note.trim() || null,
          mediaUrl: url,
          mediaType: kind,
          goalTitle: goal.title,
        })
        showToast('Shared to the feed 📣', '✅')
      } else {
        const path = await uploadProgressPhoto(userId, file)
        if (dest === 'progress') {
          await addProgressPhoto(userId, {
            phase: 'during',
            storage_path: path,
            taken_on: todayDate(),
            note: note.trim(),
            media_type: kind,
          })
          showToast('Saved to your progress 📸', '✅')
        } else {
          await addJournalMedia(userId, todayDate(), path, kind, note.trim() || null)
          showToast('Saved to your journal 📔', '✅')
        }
      }
      onClose()
    } catch (e) {
      console.error(e)
      showToast('Could not save, make sure uploads are set up.', '⚠️')
    } finally {
      setBusy(false)
    }
  }

  const isVideo = file ? mediaKind(file) === 'video' : false

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Nice work! 🐂</div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Capture the moment from “{goal.title}”. Add a photo or video up to {MAX_VIDEO_SECONDS}s (optional).
        </div>

        {preparing ? (
          <div className="center" style={{ padding: '10px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 8px' }} />
            <div className="muted" style={{ fontSize: 13 }}>Optimizing…</div>
          </div>
        ) : !file ? (
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            📷 Choose photo or video
          </button>
        ) : (
          <div className="capture-preview">
            {isVideo ? (
              <video src={preview ?? undefined} controls playsInline />
            ) : (
              <img src={preview ?? undefined} alt="preview" />
            )}
            <button className="link-btn" style={{ fontSize: 13, marginTop: 6 }} onClick={() => fileRef.current?.click()}>
              Change
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={pick} />

        {file && (
          <>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Save to</label>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button className={`chip-btn${dest === 'progress' ? ' on' : ''}`} onClick={() => setDest('progress')}>
                  📸 Progress
                </button>
                <button className={`chip-btn${dest === 'journal' ? ' on' : ''}`} onClick={() => setDest('journal')}>
                  📔 Journal
                </button>
                <button className={`chip-btn${dest === 'share' ? ' on' : ''}`} onClick={() => setDest('share')}>
                  📣 Share
                </button>
              </div>
            </div>
            {dest === 'share' && (
              <div className="field">
                <label>Share with</label>
                <select className="input" value={scope} onChange={(e) => setScope(e.target.value)}>
                  <option value="herd">My herd</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
            <input
              className="input"
              style={{ marginTop: 10 }}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={dest === 'share' ? 'Say something (optional)' : 'Add a note (optional)'}
              maxLength={140}
            />
          </>
        )}

        <div className="row" style={{ gap: 10, marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose} disabled={busy}>
            Skip
          </button>
          <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={save} disabled={!file || busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
