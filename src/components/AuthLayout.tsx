import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Trophy, Users, Zap } from 'lucide-react'
import Brand from './Brand'

const POINTS = [
  { icon: Zap, title: 'Charge Calls', body: 'A nudge about 30 minutes before every goal.' },
  { icon: Users, title: 'Your Herd', body: 'Friends who see your streak and hold you to it.' },
  { icon: Trophy, title: 'Horns', body: 'Points for every goal you finish, to spend on rewards.' },
]

/** Split auth layout: brand panel on desktop, single column on mobile. */
export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="auth">
      <aside className="auth-panel" aria-hidden="true">
        <Brand size={40} to={null} />
        <div>
          <h2>Show up for your goals. Every day.</h2>
          <ul className="auth-panel-list">
            {POINTS.map((p) => (
              <li key={p.title}>
                <span className="icon-tile">
                  <p.icon size={18} />
                </span>
                <span>
                  <strong>{p.title}</strong>
                  {p.body}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="auth-panel-foot">Free during early access.</p>
      </aside>

      <main className="auth-main">
        <div className="auth-top">
          <Link to="/" className="back-link">
            <ArrowLeft size={16} aria-hidden="true" /> Back
          </Link>
          <Brand size={36} />
        </div>
        <div className="auth-form-wrap">
          <div className="auth-head">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          {children}
          {footer}
        </div>
      </main>
    </div>
  )
}

export function FormAlert({ kind, children }: { kind: 'error' | 'note'; children: ReactNode }) {
  return (
    <div className={kind === 'error' ? 'form-error' : 'form-note'} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}
