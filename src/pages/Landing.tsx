import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

const features = [
  {
    icon: '',
    title: 'Positive Pushes',
    body: '',
    video: `${import.meta.env.BASE_URL}chargecalls-bg.mp4`,
    poster: `${import.meta.env.BASE_URL}chargecalls-bg.jpg`,
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
        <Logo size={196} glow />
      </div>
      <div className="wordmark-card">
        <img
          src={`${import.meta.env.BASE_URL}accountabullwordmark.webp`}
          alt="Accounta-Bull"
          className="wordmark-img"
        />
      </div>

      <p className="landing-tagline">
        Set your daily fitness and work goals. We’ll push you before each one, your herd will keep
        you honest, and every win earns you horns.
      </p>

      <div className="stack landing-features">
        {features.map((f) => (
          <div className={`feature-card${f.video ? ' has-video' : ''}`} key={f.title}>
            {f.video && (
              <>
                <video
                  className="feature-video"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster={f.poster}
                >
                  <source src={f.video} type="video/mp4" />
                </video>
                <span className="feature-video-scrim" />
              </>
            )}
            <span className="feature-icon">{f.icon}</span>
            <div>
              <div className="feature-title">{f.title}</div>
              {f.body && <div className="feature-body">{f.body}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="landing-cta">
        <Link to="/signup" className="btn btn-primary">
          JOIN THE HERD
        </Link>
        <p className="center muted" style={{ marginTop: 12 }}>
          Already in the herd? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}
