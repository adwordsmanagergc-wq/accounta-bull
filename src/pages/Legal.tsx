import { useEffect } from 'react'
import SiteNav from '../components/landing/SiteNav'
import SiteFooter, { CONTACT_EMAIL } from '../components/landing/SiteFooter'
import '../styles/landing.css'

// Plain-language summaries. Review with counsel before relying on them.
const UPDATED = '28 September 2026'

function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  useEffect(() => {
    window.scrollTo(0, 0)
    const prev = document.title
    document.title = `${title} · Accounta-Bull`
    return () => {
      document.title = prev
    }
  }, [title])
  return (
    <div className="site">
      <SiteNav />
      <main id="main" className="container">
        <article className="legal">
          <h1>{title}</h1>
          <p className="legal-updated">Last updated {UPDATED}</p>
          {children}
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}

export function Privacy() {
  return (
    <LegalShell title="Privacy">
      <p>
        This page explains, in plain words, what Accounta-Bull stores about you and why. We only keep what
        the product needs to work.
      </p>
      <h2>What we store</h2>
      <ul>
        <li>Your account: email address, name and, if you add them, a username, photo and bio.</li>
        <li>Your goals, check-ins, streak, Horns, journal entries, targets and measurements.</li>
        <li>Herd and team activity: invites, shared challenges, check-ins, cheers, posts and messages.</li>
        <li>Progress photos, stored privately and only visible to others if you choose to share them.</li>
        <li>Your timezone and, if you allow notifications, a push subscription so we can send Charge Calls.</li>
      </ul>
      <h2>How we use it</h2>
      <p>
        To run the app: show your day, send your Charge Calls, keep score in your Herd and let coaches you
        join see the progress you share with them.
      </p>
      <h2>Where it lives</h2>
      <p>
        Data is stored with our database and authentication provider, Supabase. Access is restricted per
        user with row level security.
      </p>
      <h2>Your choices</h2>
      <p>
        You can edit your profile, turn off notifications and stop sharing photos at any time. To export or
        delete your account, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalShell>
  )
}

export function Terms() {
  return (
    <LegalShell title="Terms">
      <p>
        By using Accounta-Bull you agree to these terms. They are short on purpose.
      </p>
      <h2>Early access</h2>
      <p>
        Accounta-Bull is in early access and free to use. Features may change while we build it.
      </p>
      <h2>Your account</h2>
      <p>
        Keep your login details safe and use the app lawfully. Be decent to your Herd: no harassment, spam
        or content you do not have the right to share.
      </p>
      <h2>Not medical advice</h2>
      <p>
        Accounta-Bull helps you stick to goals you set. It is not medical, fitness or mental health advice.
        Check with a professional before starting a new training programme.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalShell>
  )
}
