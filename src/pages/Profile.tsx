import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Logo from '../components/Logo'
import { notificationPermission, notificationsSupported } from '../lib/notify'
import { enablePush, pushConfigured, pushSupported } from '../lib/push'

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const { showToast } = useToast()
  const [perm, setPerm] = useState(notificationPermission())
  const [busy, setBusy] = useState(false)

  async function enableNotifications() {
    if (!user) return
    setBusy(true)
    // Subscribes to Web Push (works even when the app is closed) if configured;
    // otherwise falls back to in-app notifications while the tab is open.
    const result = await enablePush(user.id)
    setPerm(notificationPermission())
    setBusy(false)
    if (result === 'ok') showToast('Charge-call push on 🔔 — even when the app is closed', '⚡')
    else if (result === 'denied')
      showToast('Notifications blocked — enable them in your browser settings.', '🔕')
    else if (result === 'unsupported')
      showToast('This browser can’t do push. On iPhone, add the app to your Home Screen first.', 'ℹ️')
    else if (result === 'unconfigured')
      showToast('Push key not set yet — notifications work while the app is open.', 'ℹ️')
    else showToast('Could not enable push — try again.', '⚠️')
  }

  const pushReady = pushConfigured && pushSupported()

  return (
    <div className="page-pad">
      <div className="page-head">
        <h1>Profile</h1>
      </div>

      <div className="card center" style={{ marginBottom: 16 }}>
        <div className="brand-mark">
          <Logo size={72} />
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>
          {profile?.name || 'Herd member'}
        </div>
        <div className="muted" style={{ fontSize: 14 }}>
          {user?.email}
        </div>
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
                    ? 'On — pushed 30 min before each goal, even when the app is closed.'
                    : 'On — you’ll get a nudge 30 min before each goal while the app is open.'
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
        </div>
      )}

      <button className="btn btn-danger" onClick={signOut}>
        Log out
      </button>
    </div>
  )
}
