import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Avatar from '../components/Avatar'
import Achievements from '../components/Achievements'
import { notificationPermission, notificationsSupported } from '../lib/notify'
import { enablePush, pushConfigured, pushSupported, sendTestPush } from '../lib/push'
import { uploadAvatar } from '../lib/storage'
import { supabase } from '../lib/supabase'

export default function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const [perm, setPerm] = useState(notificationPermission())
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [editingBio, setEditingBio] = useState(false)
  const [bio, setBio] = useState(profile?.bio ?? '')

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

  async function enableNotifications() {
    if (!user) return
    setBusy(true)
    // Subscribes to Web Push (works even when the app is closed) if configured;
    // otherwise falls back to in-app notifications while the tab is open.
    const result = await enablePush(user.id)
    setPerm(notificationPermission())
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

      <div className="row" style={{ gap: 10, marginBottom: 16 }}>
        <Link to="/progress" className="btn btn-ghost" style={{ flex: 1 }}>
          📸 Progress
        </Link>
        <Link to="/rewards" className="btn btn-ghost" style={{ flex: 1 }}>
          🎁 Rewards
        </Link>
      </div>

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
                {perm === 'granted'
                  ? pushReady
                    ? 'On, pushed 30 min before each goal, even when the app is closed.'
                    : 'On, you’ll get a nudge 30 min before each goal while the app is open.'
                  : perm === 'denied'
                    ? 'Blocked in your browser settings.'
                    : 'Get a nudge 30 min before each goal.'}
              </div>
            </div>
            {perm !== 'granted' && (
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={enableNotifications}>
                {busy ? '…' : 'Enable'}
              </button>
            )}
          </div>
          {perm === 'granted' && pushReady && (
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

      <button className="btn btn-danger" onClick={signOut}>
        Log out
      </button>
    </div>
  )
}
