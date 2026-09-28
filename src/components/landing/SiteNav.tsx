import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Brand from '../Brand'
import { ButtonLink } from '../ui'
import { NAV_LINKS, useSectionLink } from './scroll'

export default function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const sectionLink = useSectionLink()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const links = NAV_LINKS.map((l) => (
    <a key={l.id} href={`#${l.id}`} onClick={sectionLink(l.id, () => setOpen(false))}>
      {l.label}
    </a>
  ))

  return (
    <header className={`site-nav${scrolled ? ' is-scrolled' : ''}${open ? ' is-open' : ''}`}>
      <nav className="container site-nav-inner" aria-label="Main">
        <Brand size={40} />
        <ul className="site-nav-links">
          {links.map((l) => (
            <li key={l.key}>{l}</li>
          ))}
        </ul>
        <div className="site-nav-actions">
          <Link to="/login" className="btn btn-quiet btn-sm site-nav-login">
            Log in
          </Link>
          <ButtonLink to="/signup" size="sm">
            Get started
          </ButtonLink>
          <button
            type="button"
            className="site-nav-toggle"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </nav>
      {open && (
        <div id="site-menu" className="site-nav-menu">
          {links}
          <Link to="/login" className="btn btn-secondary" onClick={() => setOpen(false)}>
            Log in
          </Link>
        </div>
      )}
    </header>
  )
}
