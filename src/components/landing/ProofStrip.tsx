import { Lock, Smartphone, Sparkles } from 'lucide-react'
import { useReveal } from '../../hooks/useReveal'

export default function ProofStrip() {
  const ref = useReveal<HTMLDivElement>()
  return (
    <section className="proof" aria-label="About Accounta-Bull">
      <div ref={ref} className="container proof-inner reveal">
        <p className="proof-lead">
          <small>Early access</small>
          Built by people who train and work hard.
        </p>
        <ul className="proof-list">
          <li>
            <Sparkles size={18} aria-hidden="true" />
            <span>Free while we build it with our first members. Your feedback shapes what ships next.</span>
          </li>
          <li>
            <Smartphone size={18} aria-hidden="true" />
            <span>No app store needed. Add it to your home screen and turn on notifications.</span>
          </li>
          <li>
            <Lock size={18} aria-hidden="true" />
            <span>Progress photos stay private to you unless you choose to share them.</span>
          </li>
        </ul>
      </div>
    </section>
  )
}
