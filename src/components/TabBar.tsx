import { NavLink } from 'react-router-dom'

const crest = `${import.meta.env.BASE_URL}accountabullcrest.webp`

const tabs = [
  { to: '/today', label: 'Today', ico: '🎯' },
  { to: '/goal', label: 'Add Goal', ico: '➕' },
  { to: '/herd', label: 'Herd', ico: '🤝' },
  { to: '/profile', label: 'Profile', img: crest },
]

export default function TabBar() {
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? 'active' : '')} end>
          <span className="tab-ico">
            {t.img ? <img className="tab-ico-img" src={t.img} alt="" /> : t.ico}
          </span>
          <span className="tab-label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
