import { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { appUrl, supabase, supabaseConfigured } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  function guard(): boolean {
    if (!supabaseConfigured) {
      setError('Supabase isn’t configured yet. Add your keys to the .env file and restart.')
      return false
    }
    return true
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNote(null)
    if (!guard()) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
    // On success, AuthContext picks up the session and redirects to /today.
  }

  async function handleMagicLink() {
    setError(null)
    setNote(null)
    if (!guard()) return
    if (!email) {
      setError('Enter your email first.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: appUrl },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setNote('Magic link sent — check your email to log in.')
  }

  return (
    <div className="app-shell">
      <Link to="/" className="back-link">
        ← Back
      </Link>
      <div className="brand-mark">
        <Logo size={96} />
      </div>
      <div className="auth-head">
        <h1>Welcome back</h1>
        <p className="muted">Time to charge.</p>
      </div>

      {error && <div className="form-error">{error}</div>}
      {note && <div className="form-note">{note}</div>}

      <form onSubmit={handleLogin} className="card">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
          />
        </div>
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? 'Logging in…' : 'LOG IN'}
        </button>
      </form>

      <div className="divider">or</div>
      <button className="btn btn-ghost" onClick={handleMagicLink} disabled={loading}>
        Email me a magic link
      </button>

      <p className="center muted" style={{ marginTop: 18 }}>
        New here? <Link to="/signup">Join the herd</Link>
      </p>
    </div>
  )
}
