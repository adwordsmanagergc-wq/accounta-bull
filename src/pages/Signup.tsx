import { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { appUrl, supabase, supabaseConfigured } from '../lib/supabase'
import { requestNotificationPermission } from '../lib/notify'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNote(null)
    if (!supabaseConfigured) {
      setError('Supabase isn’t configured yet. Add your keys to the .env file and restart.')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: appUrl, data: { name } },
    })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }
    // Now that they've opted in, ask about charge-call notifications.
    await requestNotificationPermission()

    if (!data.session) {
      // Email confirmation is on — they must click the link before logging in.
      setNote('Check your email to confirm your account, then log in.')
    }
    // If a session exists (confirmation off), AuthContext redirects to /today.
  }

  async function handleMagicLink() {
    setError(null)
    setNote(null)
    if (!email) {
      setError('Enter your email first.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: appUrl, data: { name } },
    })
    setLoading(false)
    if (error) setError(error.message)
    else {
      await requestNotificationPermission()
      setNote('Magic link sent — check your email to finish signing up.')
    }
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
        <h1>Join the herd</h1>
        <p className="muted">Start earning horns for showing up.</p>
      </div>

      {error && <div className="form-error">{error}</div>}
      {note && <div className="form-note">{note}</div>}

      <form onSubmit={handleSignup} className="card">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What should the herd call you?"
            autoComplete="name"
          />
        </div>
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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
          />
        </div>
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? 'Creating…' : 'JOIN THE HERD'}
        </button>
      </form>

      <div className="divider">or</div>
      <button className="btn btn-ghost" onClick={handleMagicLink} disabled={loading}>
        Email me a magic link
      </button>

      <p className="center muted" style={{ marginTop: 18 }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  )
}
