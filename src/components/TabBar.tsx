import { NavLink } from 'react-router-dom'
import { Home, Plus, User, Users } from 'lucide-react'

const tabs = [
  { to: '/today', label: 'Today', Icon: Home },
  { to: '/goal', label: 'Add goal', Icon: Plus },
  { to: '/herd', label: 'Herd', Icon: Users },
  { to: '/profile', label: 'Profile', Icon: User },
]

export default function TabBar() {
  return (
    <nav className="tabbar" aria-label="App">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')} end>
          <span className="tab-ico" aria-hidden="true">
            <Icon size={22} strokeWidth={1.75} />
          </span>
          <span className="tab-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
