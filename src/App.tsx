import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useReminders } from './hooks/useReminders'
import TabBar from './components/TabBar'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import { Privacy, Terms } from './pages/Legal'

// Signed-in screens load on demand so the public site stays light.
const Today = lazy(() => import('./pages/Today'))
const GoalEdit = lazy(() => import('./pages/GoalEdit'))
const Boost = lazy(() => import('./pages/Boost'))
const Profile = lazy(() => import('./pages/Profile'))
const Herd = lazy(() => import('./pages/Herd'))
const Progress = lazy(() => import('./pages/Progress'))
const Rewards = lazy(() => import('./pages/Rewards'))
const Journal = lazy(() => import('./pages/Journal'))
const Feed = lazy(() => import('./pages/Feed'))
const ChatRoom = lazy(() => import('./pages/ChatRoom'))
const InstallGuide = lazy(() => import('./pages/InstallGuide'))
const JoinTeam = lazy(() => import('./pages/JoinTeam'))
const CoachHome = lazy(() => import('./pages/coach/CoachHome'))
const TeamDashboard = lazy(() => import('./pages/coach/TeamDashboard'))
const ClientDetail = lazy(() => import('./pages/coach/ClientDetail'))
const TeamBranding = lazy(() => import('./pages/coach/TeamBranding'))

function Loading() {
  return (
    <div className="full-center">
      <div className="spinner" />
    </div>
  )
}

/** Wraps the signed-in area: gates on auth, runs reminders, shows the tab bar. */
function AppLayout() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  useReminders(user?.id)

  // If they followed an invite link before signing in, finish the join now.
  useEffect(() => {
    if (!user) return
    let code: string | null = null
    try {
      code = sessionStorage.getItem('pending_team_code')
      if (code) sessionStorage.removeItem('pending_team_code')
    } catch {
      /* ignore */
    }
    if (code) navigate(`/join/${code}`, { replace: true })
  }, [user, navigate])

  if (loading) return <Loading />
  if (!user) return <Navigate to="/" replace />

  return (
    <div className="app-shell">
      {/* Blank while a screen's code loads: pages already fill in without a spinner. */}
      <Suspense fallback={<div className="page-pad" />}>
      <Routes>
        <Route path="/today" element={<Today />} />
        <Route path="/goal" element={<GoalEdit />} />
        <Route path="/goal/:id" element={<GoalEditWithKey />} />
        <Route path="/boost/:id" element={<Boost />} />
        <Route path="/herd" element={<Herd />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/chat/:id" element={<ChatRoom />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/install" element={<InstallGuide />} />
        <Route path="/coach" element={<CoachHome />} />
        <Route path="/coach/team/:id" element={<TeamDashboard />} />
        <Route path="/coach/team/:id/branding" element={<TeamBranding />} />
        <Route path="/coach/team/:id/client/:userId" element={<ClientDetail />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>
      </Suspense>
      <TabBar />
    </div>
  )
}

// Force GoalEdit to remount when the :id changes (new vs edit).
function GoalEditWithKey() {
  const { id } = useParams()
  return <GoalEdit key={id} />
}

/** Public routes redirect into the app once you're signed in. */
function PublicOnly({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (user) return <Navigate to="/today" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicOnly>
            <Landing />
          </PublicOnly>
        }
      />
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnly>
            <Signup />
          </PublicOnly>
        }
      />
      <Route
        path="/join/:code"
        element={
          <Suspense fallback={<Loading />}>
            <JoinTeam />
          </Suspense>
        }
      />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/*" element={<AppLayout />} />
    </Routes>
  )
}
