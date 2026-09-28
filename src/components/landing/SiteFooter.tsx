import { Link } from 'react-router-dom'
import Brand from '../Brand'
import { NAV_LINKS, useSectionLink } from './scroll'

export const CONTACT_EMAIL = 'hello@accounta-bull.com'

export default function SiteFooter() {
  const year = new Date().getFullYear()
  const sectionLink = useSectionLink()
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-about">
            <Brand size={36} />
            <p>Daily accountability for your fitness and work goals. Set it, get called up, show up.</p>
          </div>
          <div className="footer-col">
            <h3>Product</h3>
            <ul>
              {NAV_LINKS.map((l) => (
                <li key={l.id}>
                  <a href={`#${l.id}`} onClick={sectionLink(l.id)}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="footer-col">
            <h3>Account</h3>
            <ul>
              <li>
                <Link to="/signup">Get started</Link>
              </li>
              <li>
                <Link to="/login">Log in</Link>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Company</h3>
            <ul>
              <li>
                <Link to="/privacy">Privacy</Link>
              </li>
              <li>
                <Link to="/terms">Terms</Link>
              </li>
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`}>Contact</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {year} Accounta-Bull. All rights reserved.</span>
          <span>Made for people who show up.</span>
        </div>
      </div>
    </footer>
  )
}
