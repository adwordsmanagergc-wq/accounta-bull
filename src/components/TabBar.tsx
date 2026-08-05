import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/today', label: 'Today', ico: '🎯' },
  { to: '/goal', label: 'Add Goal', ico: '➕' },
  { to: '/herd', label: 'Herd', ico: '🤝' },
  { to: '/profile', label: 'Profile', ico: '🐂' },
]

export default function TabBar() {
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? 'active' : '')} end>
          <span className="tab-ico">{t.ico}</span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
