import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { joinTeamByCode } from '../lib/coach'

/** Landing page for an invite link: /join/:code, joins the team, then routes on. */
export default function JoinTeam() {
  const { code = '' } = useParams()
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'joining' | 'error'>('joining')
  const [message, setMessage] = useState('Joining the team…')
  const tried = useRef(false)

  useEffect(() => {
    if (loading || tried.current) return
    if (!user) {
      // Not signed in: remember the code and send them to sign up / log in.
      try {
        sessionStorage.setItem('pending_team_code', code)
      } catch {
        /* ignore */
      }
      navigate('/login', { replace: true })
      return
    }
    tried.current = true
    joinTeamByCode(code)
      .then(() => navigate('/coach', { replace: true }))
      .catch((e) => {
        setStatus('error')
        setMessage(e instanceof Error ? e.message : 'That invite could not be used.')
      })
  }, [user, loading, code, navigate])

  return (
    <div className="app-shell">
      <div className="auth-head" style={{ marginTop: 40 }}>
        <h1>{status === 'joining' ? 'One sec…' : 'Hmm'}</h1>
        <p className="muted">{message}</p>
      </div>
      {status === 'error' && (
        <button className="btn btn-primary" onClick={() => navigate('/today')}>Go to Today</button>
      )}
    </div>
  )
}
