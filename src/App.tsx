import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useReminders } from './hooks/useReminders'
import TabBar from './components/TabBar'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Today from './pages/Today'
import GoalEdit from './pages/GoalEdit'
import Boost from './pages/Boost'
import Profile from './pages/Profile'
import Herd from './pages/Herd'
import Progress from './pages/Progress'
import Rewards from './pages/Rewards'
import Journal from './pages/Journal'
import Feed from './pages/Feed'
import ChatRoom from './pages/ChatRoom'
import InstallGuide from './pages/InstallGuide'
import JoinTeam from './pages/JoinTeam'
import CoachHome from './pages/coach/CoachHome'
import TeamDashboard from './pages/coach/TeamDashboard'
import ClientDetail from './pages/coach/ClientDetail'
import TeamBranding from './pages/coach/TeamBranding'

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
      <Route path="/join/:code" element={<JoinTeam />} />
      <Route path="/*" element={<AppLayout />} />
    </Routes>
  )
}
