import { Navigate, Route, Routes, useParams } from 'react-router-dom'
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
  useReminders(user?.id)

  if (loading) return <Loading />
  if (!user) return <Navigate to="/" replace />

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/today" element={<Today />} />
        <Route path="/goal" element={<GoalEdit />} />
        <Route path="/goal/:id" element={<GoalEditWithKey />} />
        <Route path="/boost/:id" element={<Boost />} />
        <Route path="/profile" element={<Profile />} />
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
      <Route path="/*" element={<AppLayout />} />
    </Routes>
  )
}
