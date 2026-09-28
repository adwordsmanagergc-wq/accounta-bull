import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react'
import AuthLayout, { FormAlert } from '../components/AuthLayout'
import { Button, Input } from '../components/ui'
import { appUrl, supabase, supabaseConfigured } from '../lib/supabase'

type Mode = 'password' | 'magic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)

  function guard(): boolean {
    if (!supabaseConfigured) {
      setError('Sign in isn’t available right now. Supabase keys are missing from this build.')
      return false
    }
    return true
  }

  function checkEmail(): boolean {
    if (!email.trim()) {
      setEmailError('Enter your email address.')
      return false
    }
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError('That doesn’t look like an email address.')
      return false
    }
    setEmailError(null)
    return true
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNote(null)
    if (!checkEmail() || !guard()) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
    // On success, AuthContext picks up the session and redirects to /today.
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNote(null)
    if (!checkEmail() || !guard()) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: appUrl },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setNote(`We sent a sign-in link to ${email}. Open it on this device to log in.`)
  }

  function switchMode(m: Mode) {
    setMode(m)
    setError(null)
    setNote(null)
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to see today’s goals."
      footer={
        <p className="auth-alt">
          New to Accounta-Bull? <Link to="/signup">Create an account</Link>
        </p>
      }
    >
      <div className="segmented" role="group" aria-label="Sign in method">
        <button
          type="button"
          aria-pressed={mode === 'password'}
          onClick={() => switchMode('password')}
        >
          Password
        </button>
        <button type="button" aria-pressed={mode === 'magic'} onClick={() => switchMode('magic')}>
          Email link
        </button>
      </div>

      {error && (
        <FormAlert kind="error">
          <AlertCircle size={16} aria-hidden="true" />
          {error}
        </FormAlert>
      )}
      {note && (
        <FormAlert kind="note">
          <CheckCircle2 size={16} aria-hidden="true" />
          {note}
        </FormAlert>
      )}

      <form onSubmit={mode === 'password' ? handleLogin : handleMagicLink} noValidate>
        <Input
          id="email"
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (emailError) setEmailError(null)
          }}
          onBlur={() => email && checkEmail()}
          placeholder="you@example.com"
          autoComplete="email"
          inputMode="email"
          error={emailError}
        />
        {mode === 'password' ? (
          <>
            <Input
              id="password"
              label="Password"
              revealable
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
            />
            <Button type="submit" block size="lg" loading={loading} disabled={!password}>
              {loading ? 'Logging in' : 'Log in'}
            </Button>
          </>
        ) : (
          <>
            <p className="field-hint" style={{ marginTop: -4, marginBottom: 16 }}>
              We’ll email you a one-time link. No password needed.
            </p>
            <Button
              type="submit"
              block
              size="lg"
              loading={loading}
              icon={<Mail size={18} aria-hidden="true" />}
            >
              {loading ? 'Sending link' : 'Email me a link'}
            </Button>
          </>
        )}
      </form>
    </AuthLayout>
  )
}
