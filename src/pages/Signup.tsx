import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react'
import AuthLayout, { FormAlert } from '../components/AuthLayout'
import { Button, Input } from '../components/ui'
import { appUrl, supabase, supabaseConfigured } from '../lib/supabase'
import { requestNotificationPermission } from '../lib/notify'

const MIN_PASSWORD = 8
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 0 to 4. Length does most of the work; variety adds a little. */
function passwordScore(pw: string): number {
  if (!pw) return 0
  if (pw.length < MIN_PASSWORD) return 1
  let s = 2
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d|[^A-Za-z]/.test(pw)) s++
  return Math.min(s, 4)
}

const SCORE_LABEL = ['', 'Too short', 'Good', 'Strong', 'Very strong']

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState<'password' | 'magic' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [touched, setTouched] = useState({ email: false, password: false })

  const emailError = !email.trim()
    ? 'Enter your email address.'
    : !EMAIL_RE.test(email.trim())
      ? 'That doesn’t look like an email address.'
      : null
  const passwordError =
    password.length < MIN_PASSWORD
      ? `Use at least ${MIN_PASSWORD} characters${password ? `, ${MIN_PASSWORD - password.length} more to go` : ''}.`
      : null
  const score = passwordScore(password)

  function guard(): boolean {
    if (!supabaseConfigured) {
      setError('Sign up isn’t available right now. Supabase keys are missing from this build.')
      return false
    }
    return true
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNote(null)
    setTouched({ email: true, password: true })
    if (emailError || passwordError) return
    if (!guard()) return
    setLoading('password')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: appUrl, data: { name } },
    })
    setLoading(null)

    if (error) {
      setError(error.message)
      return
    }
    // Now that they've opted in, ask about charge-call notifications.
    await requestNotificationPermission()

    if (!data.session) {
      // Email confirmation is on, they must click the link before logging in.
      setNote(`Check ${email} for a confirmation link, then log in.`)
    }
    // If a session exists (confirmation off), AuthContext redirects to /today.
  }

  async function handleMagicLink() {
    setError(null)
    setNote(null)
    setTouched((t) => ({ ...t, email: true }))
    if (emailError) return
    if (!guard()) return
    setLoading('magic')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: appUrl, data: { name } },
    })
    setLoading(null)
    if (error) setError(error.message)
    else {
      await requestNotificationPermission()
      setNote(`We sent a sign-up link to ${email}. Open it on this device to finish.`)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free during early access. Takes under a minute."
      footer={
        <>
          <p className="auth-alt">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
          <p className="auth-legal">
            By signing up you agree to our <Link to="/terms">Terms</Link> and{' '}
            <Link to="/privacy">Privacy</Link> notice.
          </p>
        </>
      }
    >
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

      <form onSubmit={handleSignup} noValidate>
        <Input
          id="name"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What should your Herd call you?"
          autoComplete="name"
        />
        <Input
          id="email"
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => email && setTouched((t) => ({ ...t, email: true }))}
          placeholder="you@example.com"
          autoComplete="email"
          inputMode="email"
          error={touched.email ? emailError : null}
        />
        <Input
          id="password"
          label="Password"
          revealable
          required
          minLength={MIN_PASSWORD}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => password && setTouched((t) => ({ ...t, password: true }))}
          placeholder={`At least ${MIN_PASSWORD} characters`}
          autoComplete="new-password"
          error={touched.password ? passwordError : null}
          hint={password ? `Strength: ${SCORE_LABEL[score]}` : `At least ${MIN_PASSWORD} characters.`}
          after={
            password ? (
              <div className="pw-meter" data-score={score} aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
            ) : null
          }
        />
        <Button type="submit" block size="lg" loading={loading === 'password'} disabled={!!loading}>
          {loading === 'password' ? 'Creating account' : 'Create account'}
        </Button>
      </form>

      <div className="divider">or</div>
      <Button
        variant="secondary"
        block
        onClick={handleMagicLink}
        loading={loading === 'magic'}
        disabled={!!loading}
        icon={<Mail size={18} aria-hidden="true" />}
      >
        {loading === 'magic' ? 'Sending link' : 'Sign up with an email link'}
      </Button>
    </AuthLayout>
  )
}
