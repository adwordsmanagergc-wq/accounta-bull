import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { notificationPermission } from '../lib/notify'
import { enablePush, pushConfigured, pushSupported } from '../lib/push'
import { tapHaptic } from '../lib/haptics'

type Device = 'ios' | 'android'

function detectDevice(): Device {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  return 'android'
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari exposes this non-standard flag when launched from the Home Screen.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

const IOS_STEPS = [
  { icon: '🧭', title: 'Open in Safari', body: 'Home Screen install only works from Safari on iPhone/iPad — not Chrome. If you’re in another browser, open accounta-bull.com in Safari first.' },
  { icon: '⬆️', title: 'Tap the Share button', body: 'It’s the square with an arrow pointing up, at the bottom of the Safari screen (or top on iPad).' },
  { icon: '➕', title: 'Tap “Add to Home Screen”', body: 'Scroll down the share menu to find it. Then tap “Add” in the top-right corner.' },
  { icon: '🐂', title: 'Open Accounta-Bull from your Home Screen', body: 'Use the new bull icon — not Safari. This full-screen app is the version that can send you notifications.' },
]

const ANDROID_STEPS = [
  { icon: '🧭', title: 'Open in Chrome', body: 'Open accounta-bull.com in Chrome (or Edge). You may see an “Install app” banner pop up — if so, just tap it.' },
  { icon: '⋮', title: 'Tap the menu (⋮)', body: 'The three dots in the top-right corner of Chrome.' },
  { icon: '➕', title: 'Tap “Install app” / “Add to Home screen”', body: 'Then confirm with “Install”. The app icon appears on your Home Screen.' },
  { icon: '🐂', title: 'Open Accounta-Bull from your Home Screen', body: 'Launch it from the new bull icon so it runs as a full app and can send notifications.' },
]

export default function InstallGuide() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [device, setDevice] = useState<Device>(detectDevice())
  const [busy, setBusy] = useState(false)

  const installed = isStandalone()
  const steps = device === 'ios' ? IOS_STEPS : ANDROID_STEPS
  const perm = notificationPermission()
  const canPushHere = pushConfigured && pushSupported()

  async function enableNow() {
    if (!user) return
    tapHaptic()
    setBusy(true)
    const result = await enablePush(user.id)
    setBusy(false)
    if (result === 'ok') showToast('Notifications on 🔔 — even when the app is closed', '⚡')
    else if (result === 'denied') showToast('Blocked. Turn notifications on in your phone’s settings for this app.', '🔕')
    else if (result === 'unsupported') showToast('Open the installed app from your Home Screen first, then try again.', 'ℹ️')
    else if (result === 'unconfigured') showToast('Push isn’t configured yet — you’ll still get nudges while the app is open.', 'ℹ️')
    else showToast('Could not enable, try again.', '⚠️')
  }

  return (
    <div className="page-pad">
      <button className="back-link link-btn" onClick={() => navigate(-1)}>← Back</button>
      <div className="page-head"><h1>Get the app</h1></div>

      <p className="muted" style={{ marginTop: -6, marginBottom: 16, lineHeight: 1.5 }}>
        Add Accounta-Bull to your Home Screen so it opens like a real app — full screen, faster,
        and able to send you charge-call notifications even when it’s closed.
      </p>

      {installed && (
        <div className="form-note" style={{ marginBottom: 16 }}>
          ✅ You’re already running the installed app. Skip to step 2 to turn on notifications.
        </div>
      )}

      {/* Device switch */}
      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        <button
          className={`chip-btn${device === 'ios' ? ' on' : ''}`}
          onClick={() => setDevice('ios')}
          style={{ flex: 1 }}
        >
          🍎 iPhone / iPad
        </button>
        <button
          className={`chip-btn${device === 'android' ? ' on' : ''}`}
          onClick={() => setDevice('android')}
          style={{ flex: 1 }}
        >
          🤖 Android
        </button>
      </div>

      <div className="steps-heading">1 · Add to your Home Screen</div>
      <div className="steps">
        {steps.map((s, i) => (
          <div className="step" key={i}>
            <div className="step-num">{i + 1}</div>
            <div>
              <div className="step-title">{s.icon} {s.title}</div>
              <div className="step-body">{s.body}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="steps-heading" style={{ marginTop: 26 }}>2 · Turn on notifications</div>
      <div className="steps">
        <div className="step">
          <div className="step-num">1</div>
          <div>
            <div className="step-title">🐂 Open the installed app</div>
            <div className="step-body">
              Launch Accounta-Bull from the Home Screen icon (not your browser). Notifications only
              work from the installed app{device === 'ios' ? ' on iPhone' : ''}.
            </div>
          </div>
        </div>
        <div className="step">
          <div className="step-num">2</div>
          <div>
            <div className="step-title">🔔 Tap “Enable”</div>
            <div className="step-body">
              On this page or your Profile, tap Enable and choose <strong>Allow</strong> when your
              phone asks. That’s it — you’ll get a charge call 30 minutes before each goal.
            </div>
          </div>
        </div>
        <div className="step">
          <div className="step-num">3</div>
          <div>
            <div className="step-title">🛠️ If you don’t see a prompt</div>
            <div className="step-body">
              You may have blocked it before. Open your phone’s Settings → Notifications →
              Accounta-Bull and switch them on, then come back and tap Enable again.
            </div>
          </div>
        </div>
      </div>

      {/* Live enable button */}
      <div className="card" style={{ marginTop: 16 }}>
        {perm === 'granted' ? (
          <div className="muted" style={{ fontSize: 14 }}>✅ Notifications are allowed on this device.</div>
        ) : (
          <>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Ready to try it here?</div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
              {canPushHere
                ? 'Tap below and allow when prompted.'
                : 'This works best from the installed app on your Home Screen.'}
            </div>
            <button className="btn btn-primary" disabled={busy || !user} onClick={enableNow}>
              {busy ? '…' : '🔔 Enable notifications'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
