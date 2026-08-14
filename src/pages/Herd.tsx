import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { appUrl } from '../lib/supabase'
import Avatar from '../components/Avatar'
import { getOrCreateDm } from '../lib/chat'
import {
  acceptInvite,
  checkinToday,
  createChallenge,
  createInvite,
  deleteChallenge,
  fetchChallenges,
  fetchCheckins,
  fetchPartners,
  updateHerd,
  fetchCheers,
  addCheer,
  type Cheer,
} from '../lib/herd'
import { uploadHerdPhoto, signedProgressUrl } from '../lib/storage'
import { compressImage } from '../lib/media'
import { fetchHerdSharedPhotos } from '../lib/progress'
import { fetchHerdSharedTargets, targetPercent, daysLeft, type ProgressTarget } from '../lib/targets'
import { addFeedback, fetchFeedback, type PhotoFeedback } from '../lib/feedback'
import type { ChallengeCheckin, HerdPartner, ProgressPhoto, SharedChallenge } from '../lib/types'

export default function Herd() {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const [params, setParams] = useSearchParams()

  const [partners, setPartners] = useState<HerdPartner[]>([])
  const [challenges, setChallenges] = useState<SharedChallenge[]>([])
  const [checkins, setCheckins] = useState<ChallengeCheckin[]>([])
  const [cheers, setCheers] = useState<Cheer[]>([])
  const [sharedPhotos, setSharedPhotos] = useState<ProgressPhoto[]>([])
  const [sharedTargets, setSharedTargets] = useState<ProgressTarget[]>([])
  const [feedback, setFeedback] = useState<PhotoFeedback[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [joinCode, setJoinCode] = useState(params.get('invite') ?? '')
  const [busy, setBusy] = useState(false)

  const myName = profile?.name?.trim().split(' ')[0] || 'You'

  const load = useCallback(async () => {
    if (!user) return
    setError(null)
    try {
      const ps = await fetchPartners(user.id)
      setPartners(ps)
      if (ps.length) {
        const allChallenges = (
          await Promise.all(ps.map((p) => fetchChallenges(p.connectionId)))
        ).flat()
        setChallenges(allChallenges)
        const ids = allChallenges.map((c) => c.id)
        setCheckins(await fetchCheckins(ids))
        setCheers(await fetchCheers(ids).catch(() => []))
        // Partner-shared progress photos (RLS returns shared ones; drop my own).
        const shared = await fetchHerdSharedPhotos().catch(() => [])
        const partnerPhotos = shared.filter((p) => p.user_id !== user.id)
        setSharedPhotos(partnerPhotos)
        setSharedTargets(await fetchHerdSharedTargets(user.id).catch(() => []))
        setFeedback(await fetchFeedback(partnerPhotos.map((p) => p.id)).catch(() => []))
      } else {
        setChallenges([])
        setCheckins([])
        setCheers([])
        setSharedPhotos([])
        setSharedTargets([])
        setFeedback([])
      }
    } catch (e) {
      console.error(e)
      setError(
        'We couldn’t load your herd. If this is new, make sure the herd database ' +
          'setup (migration 0003_herd.sql) has been run in Supabase.'
      )
    } finally {
      setLoaded(true)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  async function onCreateInvite() {
    if (!user || busy) return
    setBusy(true)
    try {
      setInviteCode(await createInvite(user.id))
    } catch (e) {
      showToast('Could not create invite, try again.', '⚠️')
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  async function onJoin() {
    if (!user || busy || !joinCode.trim()) return
    setBusy(true)
    try {
      await acceptInvite(joinCode)
      showToast('You’re in the herd! 🐂', '🤝')
      setJoinCode('')
      params.delete('invite')
      setParams(params, { replace: true })
      await load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not join with that code.'
      showToast(msg, '⚠️')
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  async function shareInvite(code: string) {
    const link = `${appUrl}#/herd?invite=${code}`
    const text = `Join my herd on Accounta-Bull! Use code ${code} or this link: ${link}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Join my herd', text })
      } else {
        await navigator.clipboard.writeText(text)
        showToast('Invite copied to clipboard 📋', '📋')
      }
    } catch {
      /* user dismissed share sheet */
    }
  }

  if (!loaded) return <div className="page-pad" />

  return (
    <div className="page-pad">
      <div className="page-head">
        <h1>Your Herd</h1>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 12px' }}>⚠️ {error}</p>
          <button className="btn btn-ghost" onClick={load}>
            Try again
          </button>
        </div>
      )}

      {!error && partners.length === 0 && (
        <div className="herd-intro">
          <div className="welcome-emoji">🤝</div>
          <h2 className="welcome-title">Chase goals together</h2>
          <p className="welcome-sub">
            Invite a friend to your herd, set shared challenges, and put a reward or forfeit on the
            line. Friendly competition keeps you both honest.
          </p>
        </div>
      )}

      {/* Invite / join always available so you can grow your herd */}
      {!error && (
        <div className="card stack" style={{ marginBottom: 16 }}>
          <div>
            <div className="section-label">Invite a friend</div>
            {inviteCode ? (
              <>
                <div className="invite-code">{inviteCode}</div>
                <button className="btn btn-primary" onClick={() => shareInvite(inviteCode)}>
                  📤 Share invite
                </button>
                <p className="faint" style={{ fontSize: 12, marginTop: 8 }}>
                  They enter this code below (or open your link) while signed in.
                </p>
              </>
            ) : (
              <button className="btn btn-primary" disabled={busy} onClick={onCreateInvite}>
                ➕ Create invite code
              </button>
            )}
          </div>

          <div className="divider">or</div>

          <div>
            <div className="section-label">Have a code?</div>
            <div className="join-row">
              <input
                className="input"
                placeholder="Enter invite code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                autoCapitalize="characters"
              />
              <button className="btn btn-primary btn-join" disabled={busy || !joinCode.trim()} onClick={onJoin}>
                Join
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Each partner + their shared challenges */}
      {partners.map((partner) => (
        <PartnerBlock
          key={partner.connectionId}
          partner={partner}
          me={{ id: user!.id, name: myName, horns: profile?.horns ?? 0, streak: profile?.streak ?? 0 }}
          challenges={challenges.filter((c) => c.connection_id === partner.connectionId)}
          checkins={checkins}
          cheers={cheers}
          onCheer={cheer}
          onChanged={load}
        />
      ))}

      {sharedTargets.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div className="steps-heading" style={{ margin: '0 0 10px' }}>
            🎯 Herd targets
          </div>
          <div className="stack">
            {sharedTargets.map((t) => {
              const pct = targetPercent(t)
              const dl = daysLeft(t)
              return (
                <div className="card target-card" key={t.id}>
                  <div className="goal-title">{t.title}</div>
                  <div className="target-bar" style={{ marginTop: 8 }}>
                    <div className="target-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="row between" style={{ marginTop: 6 }}>
                    <span className="faint" style={{ fontSize: 12 }}>
                      {t.current_value} / {t.target_value} {t.unit}
                      {dl != null && dl >= 0 ? ` · ${dl}d left` : ''}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {sharedPhotos.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="steps-heading" style={{ margin: '0 0 10px' }}>
            📸 Shared by your herd
          </div>
          <div className="stack">
            {sharedPhotos.map((p) => (
              <SharedPhoto
                key={p.id}
                photo={p}
                feedback={feedback.filter((f) => f.photo_id === p.id)}
                onFeedback={(emoji, message) => sendFeedback(p.id, emoji, message)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )

  async function sendFeedback(photoId: string, emoji: string, message: string) {
    if (!user) return
    setFeedback((f) => [
      { id: `local-${Date.now()}`, photo_id: photoId, from_user: user.id, emoji, message, created_at: '' },
      ...f,
    ])
    try {
      await addFeedback(user.id, photoId, emoji, message)
    } catch (e) {
      console.error(e)
      showToast('Could not send feedback.', '⚠️')
    }
  }

  async function cheer(challengeId: string, emoji: string) {
    if (!user) return
    setCheers((c) => [
      { id: `local-${Date.now()}`, challenge_id: challengeId, user_id: user.id, emoji, created_at: '' },
      ...c,
    ])
    try {
      await addCheer(user.id, challengeId, emoji)
    } catch (e) {
      console.error(e)
    }
  }
}

function SharedPhoto({
  photo,
  feedback,
  onFeedback,
}: {
  photo: ProgressPhoto
  feedback: PhotoFeedback[]
  onFeedback: (emoji: string, message: string) => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  useEffect(() => {
    let ok = true
    signedProgressUrl(photo.storage_path).then((u) => ok && setUrl(u))
    return () => {
      ok = false
    }
  }, [photo.storage_path])

  return (
    <div className="card shared-photo">
      <div className="shared-photo-media">
        {url ? <img src={url} alt="shared progress" /> : <div className="photo-skeleton" />}
        <div className="photo-meta">
          <span>{photo.taken_on}</span>
        </div>
      </div>

      {feedback.length > 0 && (
        <div className="feedback-list">
          {feedback.map((f) => (
            <div className="feedback-item" key={f.id}>
              <span>{f.emoji}</span>
              {f.message && <span className="feedback-msg">{f.message}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="feedback-quick">
        {['🔥', '💪', '👏', '😍', '🐂'].map((e) => (
          <button key={e} className="cheer-btn" onClick={() => onFeedback(e, '')} title="Send love">
            {e}
          </button>
        ))}
      </div>
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <input
          className="input"
          placeholder="Say something encouraging…"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          style={{ flex: 1 }}
        />
        <button
          className="btn btn-primary btn-sm"
          disabled={!msg.trim()}
          onClick={() => {
            onFeedback('💬', msg.trim())
            setMsg('')
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function PartnerBlock({
  partner,
  me,
  challenges,
  checkins,
  cheers,
  onCheer,
  onChanged,
}: {
  partner: HerdPartner
  me: { id: string; name: string; horns: number; streak: number }
  challenges: SharedChallenge[]
  checkins: ChallengeCheckin[]
  cheers: Cheer[]
  onCheer: (challengeId: string, emoji: string) => void
  onChanged: () => void | Promise<void>
}) {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [reward, setReward] = useState('')
  const [forfeit, setForfeit] = useState('')
  const [rules, setRules] = useState('')
  const [days, setDays] = useState(7)
  const [busy, setBusy] = useState(false)

  // Herd (group) editing
  const [editHerd, setEditHerd] = useState(false)
  const [herdName, setHerdName] = useState(partner.herdName ?? '')
  const [herdRules, setHerdRules] = useState(partner.herdRules ?? '')
  const [savingHerd, setSavingHerd] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)

  const partnerName = partner.name?.trim().split(' ')[0] || 'Partner'

  async function submit() {
    if (busy || !title.trim()) return
    setBusy(true)
    try {
      await createChallenge(me.id, partner.connectionId, {
        title: title.trim(),
        reward,
        forfeit,
        rules,
        days,
      })
      setTitle('')
      setReward('')
      setForfeit('')
      setRules('')
      setDays(7)
      setShowForm(false)
      showToast('Challenge set! May the best charge win 🐂', '🏁')
      await onChanged()
    } catch (e) {
      showToast('Could not create the challenge.', '⚠️')
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  async function saveHerd() {
    setSavingHerd(true)
    try {
      await updateHerd(partner.connectionId, {
        name: herdName.trim() || null,
        rules: herdRules.trim() || null,
      })
      setEditHerd(false)
      showToast('Herd updated 🐂', '✅')
      await onChanged()
    } catch (e) {
      showToast('Could not save the herd.', '⚠️')
      console.error(e)
    } finally {
      setSavingHerd(false)
    }
  }

  async function onPickHerdPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setSavingHerd(true)
    try {
      const url = await uploadHerdPhoto(me.id, partner.connectionId, await compressImage(file))
      await updateHerd(partner.connectionId, { photo_url: url })
      showToast('Herd photo updated 📸', '✅')
      await onChanged()
    } catch (err) {
      showToast('Could not upload the herd photo.', '⚠️')
      console.error(err)
    } finally {
      setSavingHerd(false)
    }
  }

  return (
    <div style={{ marginBottom: 18 }}>
      {/* Herd group banner */}
      <div className="herd-banner">
        <button
          className="herd-photo"
          onClick={() => photoRef.current?.click()}
          disabled={savingHerd}
          title="Change herd photo"
        >
          {partner.herdPhoto ? <img src={partner.herdPhoto} alt="herd" /> : <span>🐂</span>}
          <span className="avatar-cam">📷</span>
        </button>
        <input ref={photoRef} type="file" accept="image/*" hidden onChange={onPickHerdPhoto} />
        <div style={{ flex: 1 }}>
          <div className="partner-name">{partner.herdName || `You & ${partnerName}`}</div>
          <div className="faint" style={{ fontSize: 13 }}>
            Herd of 2
          </div>
        </div>
        <button className="link-btn" style={{ fontSize: 13 }} onClick={() => setEditHerd((v) => !v)}>
          {editHerd ? 'Close' : 'Edit'}
        </button>
      </div>

      {editHerd && (
        <div className="card stack" style={{ marginBottom: 12 }}>
          <div className="field">
            <label>Herd name</label>
            <input
              className="input"
              value={herdName}
              onChange={(e) => setHerdName(e.target.value)}
              placeholder="e.g. The Dawn Chargers"
            />
          </div>
          <div className="field">
            <label>Herd rules</label>
            <textarea
              className="input"
              rows={3}
              value={herdRules}
              onChange={(e) => setHerdRules(e.target.value)}
              placeholder="e.g. Check in by 9pm. No excuses. Winner picks next challenge."
            />
          </div>
          <button className="btn btn-primary" disabled={savingHerd} onClick={saveHerd}>
            {savingHerd ? 'Saving…' : 'Save herd'}
          </button>
        </div>
      )}

      {partner.herdRules && !editHerd && (
        <div className="herd-rules">
          <strong>📜 Rules:</strong> {partner.herdRules}
        </div>
      )}

      <div className="partner-head">
        <Avatar url={partner.avatarUrl} name={partner.name} size={44} />
        <div style={{ flex: 1 }}>
          <div className="partner-name" style={{ fontSize: 16 }}>
            {partnerName}
          </div>
          <div className="faint" style={{ fontSize: 13 }}>
            🏆 {partner.horns} horns · {partner.streak}🔥 streak
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={async () => {
            try { navigate(`/chat/${await getOrCreateDm(partner.userId)}`) }
            catch { showToast('Could not open chat.', '⚠️') }
          }}
        >
          💬 Message
        </button>
      </div>

      <div className="stack">
        {challenges.length === 0 && (
          <p className="faint" style={{ fontSize: 14, margin: '2px 2px 4px' }}>
            No shared challenges yet, set one below.
          </p>
        )}
        {challenges.map((ch) => (
          <ChallengeCard
            key={ch.id}
            challenge={ch}
            checkins={checkins.filter((c) => c.challenge_id === ch.id)}
            cheers={cheers.filter((c) => c.challenge_id === ch.id)}
            onCheer={(emoji) => onCheer(ch.id, emoji)}
            me={me}
            partner={partner}
            onChanged={onChanged}
          />
        ))}

        {showForm ? (
          <div className="card stack">
            <div className="field">
              <label>Challenge</label>
              <input
                className="input"
                placeholder="e.g. Run every morning this week"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="field">
              <label>🏆 Reward for the winner</label>
              <input
                className="input"
                placeholder="e.g. Loser buys dinner"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
              />
            </div>
            <div className="field">
              <label>😅 Forfeit for the loser</label>
              <input
                className="input"
                placeholder="e.g. Post an embarrassing selfie"
                value={forfeit}
                onChange={(e) => setForfeit(e.target.value)}
              />
            </div>
            <div className="field">
              <label>📜 Rules (optional)</label>
              <textarea
                className="input"
                rows={2}
                placeholder="e.g. Counts only if done before 8am. Photo proof required."
                value={rules}
                onChange={(e) => setRules(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Runs for</label>
              <select className="select" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                <option value={3}>3 days</option>
                <option value={7}>1 week</option>
                <option value={14}>2 weeks</option>
                <option value={30}>1 month</option>
              </select>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-primary" disabled={busy} onClick={submit}>
                {busy ? 'Setting…' : 'Set challenge'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="btn btn-ghost" onClick={() => setShowForm(true)}>
            🏁 New shared challenge
          </button>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function ChallengeCard({
  challenge,
  checkins,
  cheers,
  onCheer,
  me,
  partner,
  onChanged,
}: {
  challenge: SharedChallenge
  checkins: ChallengeCheckin[]
  cheers: Cheer[]
  onCheer: (emoji: string) => void
  me: { id: string; name: string }
  partner: HerdPartner
  onChanged: () => void | Promise<void>
}) {
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)

  const myScore = checkins.filter((c) => c.user_id === me.id).length
  const partnerScore = checkins.filter((c) => c.user_id === partner.userId).length
  const todayStr = new Date().toISOString().slice(0, 10)
  const checkedInToday = checkins.some((c) => c.user_id === me.id && c.checked_on === todayStr)
  const ended = todayStr > challenge.ends_on
  const leader = myScore === partnerScore ? 'tie' : myScore > partnerScore ? 'me' : 'partner'
  const partnerName = partner.name?.trim().split(' ')[0] || 'Partner'

  async function check() {
    if (busy || checkedInToday) return
    setBusy(true)
    try {
      await checkinToday(me.id, challenge.id)
      showToast('Checked in! Keep charging 🐂', '✅')
      await onChanged()
    } catch (e) {
      showToast('Could not check in, try again.', '⚠️')
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm('Delete this challenge for both of you?')) return
    try {
      await deleteChallenge(challenge.id)
      await onChanged()
    } catch (e) {
      showToast('Could not delete the challenge.', '⚠️')
      console.error(e)
    }
  }

  return (
    <div className="card challenge-card">
      <div className="goal-top">
        <div className="goal-title">{challenge.title}</div>
        <button className="link-btn" style={{ fontSize: 13 }} onClick={remove}>
          Delete
        </button>
      </div>

      <div className="scoreboard">
        <div className={`score ${leader === 'me' ? 'lead' : ''}`}>
          <div className="score-num">{myScore}</div>
          <div className="score-name">{me.name}</div>
        </div>
        <div className="score-vs">vs</div>
        <div className={`score ${leader === 'partner' ? 'lead' : ''}`}>
          <div className="score-num">{partnerScore}</div>
          <div className="score-name">{partnerName}</div>
        </div>
      </div>

      {(challenge.reward || challenge.forfeit) && (
        <div className="stakes">
          {challenge.reward && (
            <div>
              🏆 <strong>Reward:</strong> {challenge.reward}
            </div>
          )}
          {challenge.forfeit && (
            <div>
              😅 <strong>Forfeit:</strong> {challenge.forfeit}
            </div>
          )}
          {challenge.rules && (
            <div>
              📜 <strong>Rules:</strong> {challenge.rules}
            </div>
          )}
        </div>
      )}

      <div className="faint" style={{ fontSize: 12, marginTop: 8 }}>
        {ended
          ? leader === 'tie'
            ? 'Finished, it’s a tie! 🤝'
            : `Finished, ${leader === 'me' ? me.name : partnerName} won! 🎉`
          : `Ends ${challenge.ends_on}`}
      </div>

      {!ended && (
        <button
          className="btn btn-primary"
          style={{ marginTop: 12 }}
          disabled={busy || checkedInToday}
          onClick={check}
        >
          {checkedInToday ? '✓ Checked in today' : '✓ I did it today'}
        </button>
      )}

      {/* Cheers */}
      <div className="cheer-row">
        {cheers.length > 0 && (
          <span className="cheer-tally">{cheers.map((c) => c.emoji).slice(0, 12).join(' ')}</span>
        )}
        <span className="cheer-spacer" />
        {['🔥', '💪', '👏', '🐂'].map((e) => (
          <button key={e} className="cheer-btn" onClick={() => onCheer(e)} title="Cheer">
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}
