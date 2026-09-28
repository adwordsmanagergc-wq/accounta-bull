import type { MouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * The app uses HashRouter, so a plain `#section` link would be read as a
 * route. Scroll to the section ourselves instead, and move focus there so
 * keyboard and screen reader users land in the right place.
 */
export function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return false
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  const heading = el.querySelector<HTMLElement>('h2')
  if (heading) {
    heading.setAttribute('tabindex', '-1')
    heading.focus({ preventScroll: true })
  }
  return true
}

/** Click handler factory for section links; works from any public page. */
export function useSectionLink() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  return (id: string, after?: () => void) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    after?.()
    if (pathname === '/') scrollToSection(id)
    else {
      navigate('/')
      window.setTimeout(() => scrollToSection(id), 60)
    }
  }
}

export const NAV_LINKS = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'features', label: 'Features' },
  { id: 'coaches', label: 'For coaches' },
  { id: 'faq', label: 'FAQ' },
]
