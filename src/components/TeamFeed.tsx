import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Avatar from './Avatar'
import { prepareUpload } from '../lib/media'
import { uploadFeedMedia } from '../lib/storage'
import { tapHaptic } from '../lib/haptics'
import {
  addComment,
  createPost,
  deletePost,
  fetchAuthors,
  fetchCheers,
  fetchComments,
  fetchTeamFeed,
  toggleCheer,
  type Author,
  type Post,
  type PostComment,
} from '../lib/feed'

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function TeamFeed({ teamId }: { teamId: string }) {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [open, setOpen] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<Record<string, PostComment[]>>({})
  const [cheers, setCheers] = useState<Record<string, { count: number; mine: boolean }>>({})
  const [authors, setAuthors] = useState<Record<string, Author>>({})
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)

  // composer
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [draft, setDraft] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    if (!user) return
    try {
      const p = await fetchTeamFeed(teamId)
      setPosts(p)
      const ids = p.map((x) => x.id)
      const [cs, ch] = await Promise.all([fetchComments(ids), fetchCheers(ids, user.id)])
      const grouped: Record<string, PostComment[]> = {}
      for (const c of cs) (grouped[c.post_id] ??= []).push(c)
      setComments(grouped)
      setCheers(ch)
      setAuthors(await fetchAuthors([...p.map((x) => x.user_id), ...cs.map((c) => c.user_id)]))
    } catch (e) {
      console.error(e)
    } finally {
      setLoaded(true)
    }
  }, [user, teamId])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  async function pickMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0] ?? null
    e.target.value = ''
    if (!raw) return
    try {
      const prepared = await prepareUpload(raw)
      setFile(prepared)
      setPreview(URL.createObjectURL(raw))
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not use that file.', '⚠️')
    }
  }

  async function post() {
    if (!user || busy || (!body.trim() && !file)) return
    setBusy(true)
    try {
      let mediaUrl: string | null = null
      let mediaType: 'image' | 'video' | null = null
      if (file) {
        mediaUrl = await uploadFeedMedia(user.id, file)
        mediaType = file.type.startsWith('video') ? 'video' : 'image'
      }
      await createPost({
        userId: user.id,
        scope: 'team',
        teamId,
        body: body.trim() || null,
        mediaUrl,
        mediaType,
        goalTitle: null,
      })
      setBody('')
      setFile(null)
      setPreview(null)
      showToast('Shared with the team 🎉', '✅')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not post.', '⚠️')
    } finally {
      setBusy(false)
    }
  }

  async function cheer(p: Post) {
    if (!user) return
    tapHaptic()
    const cur = cheers[p.id] ?? { count: 0, mine: false }
    setCheers((c) => ({ ...c, [p.id]: { count: cur.count + (cur.mine ? -1 : 1), mine: !cur.mine } }))
    try {
      await toggleCheer(p.id, user.id, !cur.mine)
    } catch {
      setCheers((c) => ({ ...c, [p.id]: cur }))
    }
  }

  async function comment(p: Post) {
    if (!user) return
    const text = (draft[p.id] ?? '').trim()
    if (!text) return
    setDraft((d) => ({ ...d, [p.id]: '' }))
    try {
      await addComment(p.id, user.id, text)
      await load()
    } catch {
      showToast('Could not comment.', '⚠️')
    }
  }

  const nameOf = (uid: string) => authors[uid]?.name || authors[uid]?.username || 'Member'

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <button className="row between accordion-head" onClick={() => setOpen((o) => !o)}>
        <span style={{ fontWeight: 700 }}>Team feed 🎉</span>
        <span className="muted">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div style={{ marginTop: 12 }}>
          <div className="stack" style={{ marginBottom: 14 }}>
            <textarea
              className="input"
              rows={2}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Show off a win with the team…"
            />
            {preview && (
              <div className="feed-media">
                {file?.type.startsWith('video') ? <video src={preview} controls playsInline /> : <img src={preview} alt="" />}
              </div>
            )}
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>📷 Photo/video</button>
              <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} disabled={busy || (!body.trim() && !file)} onClick={post}>
                {busy ? 'Posting…' : 'Post'}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={pickMedia} />
          </div>

          {loaded && posts.length === 0 && (
            <div className="muted center" style={{ fontSize: 14, padding: '10px 0' }}>No posts yet. Be the first to share a win! 🐂</div>
          )}

          {posts.map((p) => {
            const ch = cheers[p.id] ?? { count: 0, mine: false }
            const cs = comments[p.id] ?? []
            return (
              <div className="post" style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }} key={p.id}>
                <div className="post-head">
                  <Avatar url={authors[p.user_id]?.avatar_url} name={nameOf(p.user_id)} size={38} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{nameOf(p.user_id)}</div>
                    <div className="faint" style={{ fontSize: 12 }}>{timeLabel(p.created_at)}</div>
                  </div>
                  {p.user_id === user?.id && (
                    <button className="link-btn tiny-danger" title="Delete" onClick={async () => {
                      if (!confirm('Delete this post?')) return
                      await deletePost(p.id).then(load).catch(() => showToast('Could not delete.', '⚠️'))
                    }}>✕</button>
                  )}
                </div>

                {p.goal_title && <div className="post-goal">✓ Finished: {p.goal_title}</div>}
                {p.body && <div className="post-body">{p.body}</div>}
                {p.media_url && (
                  <div className="feed-media">
                    {p.media_type === 'video' ? <video src={p.media_url} controls playsInline /> : <img src={p.media_url} alt="" />}
                  </div>
                )}

                <div className="row" style={{ gap: 14, marginTop: 10 }}>
                  <button className={`cheer-btn${ch.mine ? ' on' : ''}`} onClick={() => cheer(p)}>
                    👏 {ch.count > 0 ? ch.count : ''}
                  </button>
                  <span className="muted" style={{ fontSize: 13 }}>{cs.length > 0 ? `${cs.length} comment${cs.length === 1 ? '' : 's'}` : ''}</span>
                </div>

                {cs.map((c) => (
                  <div className="post-comment" key={c.id}>
                    <span className="comment-name">{nameOf(c.user_id)}</span> {c.body}
                  </div>
                ))}

                <div className="join-row" style={{ marginTop: 8 }}>
                  <input
                    className="input"
                    value={draft[p.id] ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                    placeholder="Add a comment…"
                  />
                  <button className="btn btn-ghost btn-join" onClick={() => comment(p)}>Send</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
