import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

const features = [
  {
    icon: '🚩',
    title: 'Charge Calls',
    body: 'A boost 30 minutes before every goal — a push, not a nag.',
  },
  {
    icon: '🐂',
    title: 'Your Herd',
    body: 'Matched with people your age chasing the same goals.',
  },
  {
    icon: '🏆',
    title: 'Earn Horns',
    body: 'Points for showing up. Redeem for free membership and more.',
  },
]

export default function Landing() {
  return (
    <div className="app-shell landing">
      <div className="landing-logo">
        <Logo size={240} glow />
      </div>

      <p className="landing-tagline">
        Set your daily fitness and work goals. We’ll push you before each one, your herd will keep
        you honest, and every win earns you horns.
      </p>

      <div className="stack" style={{ marginTop: 22 }}>
        {features.map((f) => (
          <div className="feature-card" key={f.title}>
            <span className="feature-icon">{f.icon}</span>
            <div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-body">{f.body}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 26 }}>
        <Link to="/signup" className="btn btn-primary">
          JOIN THE HERD
        </Link>
        <p className="center muted" style={{ marginTop: 16 }}>
          Already in the herd? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}
