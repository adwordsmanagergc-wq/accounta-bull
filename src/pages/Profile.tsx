import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Logo from '../components/Logo'
import {
  notificationPermission,
  notificationsSupported,
  requestNotificationPermission,
} from '../lib/notify'

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const { showToast } = useToast()
  const [perm, setPerm] = useState(notificationPermission())

  async function enableNotifications() {
    const result = await requestNotificationPermission()
    setPerm(result)
    if (result === 'granted') showToast('Charge-call notifications on 🔔', '⚡')
    else if (result === 'denied')
      showToast('Notifications blocked — enable them in your browser settings.', '🔕')
  }

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
                  ? 'On — you’ll get a nudge 30 min before each goal.'
                  : perm === 'denied'
                    ? 'Blocked in your browser settings.'
                    : 'Get a nudge 30 min before each goal.'}
              </div>
            </div>
            {perm !== 'granted' && (
              <button className="btn btn-ghost btn-sm" onClick={enableNotifications}>
                Enable
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
