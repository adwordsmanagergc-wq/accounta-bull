import { ArrowRight, Check } from 'lucide-react'
import { Badge, ButtonLink } from '../ui'
import PhoneMockup from './PhoneMockup'
import { useSectionLink } from './scroll'

export default function Hero() {
  const sectionLink = useSectionLink()
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero-grid">
        <div className="hero-copy">
          <Badge tone="accent">Early access · Free to use</Badge>
          <h1 id="hero-title">
            Show up for your goals. <span className="accent">Every day.</span>
          </h1>
          <p className="hero-sub">
            Set your daily fitness and work goals, get a Charge Call before each one, and let a
            small crew of friends, your Herd, keep you honest.
          </p>
          <div className="hero-ctas">
            <ButtonLink to="/signup" size="lg" iconRight={<ArrowRight size={18} aria-hidden="true" />}>
              Get started free
            </ButtonLink>
            <a
              href="#how-it-works"
              className="btn btn-secondary btn-lg btn-auto"
              onClick={sectionLink('how-it-works')}
            >
              See how it works
            </a>
          </div>
          <ul className="hero-notes">
            <li>
              <Check size={16} aria-hidden="true" /> No card needed
            </li>
            <li>
              <Check size={16} aria-hidden="true" /> Works on iPhone and Android
            </li>
          </ul>
        </div>
        <div className="hero-visual">
          <div className="hero-glow" aria-hidden="true" />
          <PhoneMockup />
        </div>
      </div>
    </section>
  )
}
