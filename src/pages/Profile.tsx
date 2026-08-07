import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Avatar from '../components/Avatar'
import Achievements from '../components/Achievements'
import { notificationPermission, notificationsSupported } from '../lib/notify'
import { enablePush, pushConfigured, pushSupported, sendTestPush } from '../lib/push'
import { uploadAvatar } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { TONES, type BoostTone } from '../lib/types'

export default function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const [perm, setPerm] = useState(notificationPermission())
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [editingBio, setEditingBio] = useState(false)
  const [bio, setBio] = useState(profile?.bio ?? '')
  const tone: BoostTone = profile?.boost_tone ?? 'medium'

  async function saveTone(next: BoostTone) {
    if (!user || next === tone) return
    setBusy(true)
    try {
      // Read the row back so we can tell a real save from a silent no-op (e.g.
      // PostgREST dropping the column when its schema cache is momentarily stale
      // right after the column was added). A plain update returns success either
      // way, so we verify the value actually changed.
      const { data, error } = await supabase
        .from('profiles')
        .update({ boost_tone: next })
        .eq('id', user.id)
        .select('boost_tone')
        .single()
      if (error) throw error
      if (!data || data.boost_tone !== next) throw new Error('tone-not-persisted')
      await refreshProfile()
      showToast('Message tone updated', '✅')
    } catch (err) {
      console.error(err)
      showToast('Could not save tone yet, give it a moment and try again.', '⚠️')
    } finally {
      setBusy(false)
    }
  }

  async function saveBio() {
    if (!user) return
    setBusy(true)
    try {
      const { error } = await supabase.from('profiles').update({ bio: bio.trim() || null }).eq('id', user.id)
      if (error) throw error
      await refreshProfile()
      setEditingBio(false)
      showToast('Bio saved', '✅')
    } catch (err) {
      console.error(err)
      showToast('Could not save bio.', '⚠️')
    } finally {
      setBusy(false)
    }
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return
    setUploading(true)
    try {
      const url = await uploadAvatar(user.id, file)
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
      if (error) throw error
      await refreshProfile()
      showToast('Profile picture updated 📸', '✅')
    } catch (err) {
      console.error(err)
      showToast('Could not upload, make sure the storage setup has been run.', '⚠️')
    } finally {
      setUploading(false)
    }
  }

  // Is this device actually subscribed to push right now? Permission being
  // "granted" is not enough, the subscription can be missing (never created, or
  // cleared), which would leave Test with nothing to send to.
  async function checkSubscription() {
    if (!pushSupported()) {
      setSubscribed(false)
      return
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = reg ? await reg.pushManager.getSubscription() : null
      setSubscribed(!!sub)
    } catch {
      setSubscribed(false)
    }
  }

  useEffect(() => {
    checkSubscription()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function enableNotifications() {
    if (!user) return
    setBusy(true)
    // Subscribes to Web Push (works even when the app is closed) if configured;
    // otherwise falls back to in-app notifications while the tab is open.
    const result = await enablePush(user.id)
    setPerm(notificationPermission())
    await checkSubscription()
    setBusy(false)
    if (result === 'ok') showToast('Charge-call push on 🔔, even when the app is closed', '⚡')
    else if (result === 'denied')
      showToast('Notifications blocked, enable them in your browser settings.', '🔕')
    else if (result === 'unsupported')
      showToast('This browser can’t do push. On iPhone, add the app to your Home Screen first.', 'ℹ️')
    else if (result === 'unconfigured')
      showToast('Push key not set yet, notifications work while the app is open.', 'ℹ️')
    else showToast('Could not enable push, try again.', '⚠️')
  }

  async function testNotification() {
    setBusy(true)
    const r = await sendTestPush()
    setBusy(false)
    showToast(r.message, r.ok ? '✅' : '⚠️')
  }

  const pushReady = pushConfigured && pushSupported()

  return (
    <div className="page-pad">
      <div className="page-head">
        <h1>Profile</h1>
      </div>

      <div className="card center" style={{ marginBottom: 16 }}>
        <button
          className="avatar-edit"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Change profile picture"
        >
          <Avatar url={profile?.avatar_url} name={profile?.name} size={96} />
          <span className="avatar-cam">{uploading ? '…' : '📷'}</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onPickAvatar}
        />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginTop: 10 }}>
          {profile?.name || 'Herd member'}
        </div>
        <div className="muted" style={{ fontSize: 14 }}>
          {user?.email}
        </div>

        {editingBio ? (
          <div className="stack" style={{ marginTop: 12, textAlign: 'left' }}>
            <textarea
              className="input"
              rows={2}
              value={bio}
              maxLength={160}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Your why, what are you charging toward?"
            />
            <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={saveBio}>
                Save
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingBio(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            className="link-btn"
            style={{ margin: '10px auto 0', fontSize: 14 }}
            onClick={() => {
              setBio(profile?.bio ?? '')
              setEditingBio(true)
            }}
          >
            {profile?.bio ? profile.bio : '＋ Add a short bio'}
          </button>
        )}
      </div>

      {user && <Achievements userId={user.id} horns={profile?.horns ?? 0} streak={profile?.streak ?? 0} />}

      <div className="row" style={{ gap: 10, marginBottom: 10 }}>
        <Link to="/progress" className="btn btn-ghost" style={{ flex: 1 }}>
          📸 Progress
        </Link>
        <Link to="/rewards" className="btn btn-ghost" style={{ flex: 1 }}>
          🎁 Rewards
        </Link>
      </div>
      <Link to="/coach" className="btn btn-ghost" style={{ marginBottom: 16 }}>
        🧑‍🏫 Coach / Teams
      </Link>

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="card stat">
          <div className="stat-num">{profile?.streak ?? 0}🔥</div>
          <div className="stat-label">Day streak</div>
        </div>
        <div className="card stat">
          <div className="stat-num">{profile?.horns ?? 0}</div>
          <div className="stat-label">Total horns 🏆</div>
        </div>
      </div>

      {notificationsSupported() && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="row between">
            <div>
              <div style={{ fontWeight: 700 }}>Charge-call notifications</div>
              <div className="muted" style={{ fontSize: 13 }}>
                {perm === 'denied'
                  ? 'Blocked in your browser settings.'
                  : subscribed
                    ? pushReady
                      ? 'On, pushed 30 min before each goal, even when the app is closed.'
                      : 'On, you’ll get a nudge 30 min before each goal while the app is open.'
                    : 'Get a nudge 30 min before each goal.'}
              </div>
            </div>
            {perm !== 'denied' && !subscribed && (
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={enableNotifications}>
                {busy ? '…' : 'Enable'}
              </button>
            )}
          </div>
          {subscribed && pushReady && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 12 }}
              disabled={busy}
              onClick={testNotification}
            >
              {busy ? '…' : '🔔 Send a test notification'}
            </button>
          )}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700 }}>Message tone</div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          How your charge calls and boosts sound to you.
        </div>
        <div className="stack" style={{ gap: 8 }}>
          {TONES.map((t) => {
            const active = tone === t.value
            return (
              <button
                key={t.value}
                className={`tone-option${active ? ' tone-active' : ''}`}
                disabled={busy}
                onClick={() => saveTone(t.value)}
              >
                <span className="tone-emoji">{t.emoji}</span>
                <span className="tone-text">
                  <span className="tone-label">{t.label}</span>
                  <span className="tone-hint muted">{t.hint}</span>
                </span>
                <span className="tone-check">{active ? '✓' : ''}</span>
              </button>
            )
          })}
        </div>
        {tone === 'savage' && (
          <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Heads up: this one gets crude and swears. You asked for it. 🐂
          </div>
        )}
      </div>

      <button className="btn btn-danger" onClick={signOut}>
        Log out
      </button>
    </div>
  )
}
