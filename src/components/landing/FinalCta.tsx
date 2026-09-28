import { ArrowRight } from 'lucide-react'
import { ButtonLink } from '../ui'
import { useReveal } from '../../hooks/useReveal'

export default function FinalCta() {
  const ref = useReveal<HTMLDivElement>()
  return (
    <section className="section" aria-labelledby="cta-title">
      <div className="container">
        <div ref={ref} className="cta-band reveal">
          <h2 id="cta-title">Your next streak starts today.</h2>
          <p>Set your first goal in under a minute. Your first Charge Call is on us.</p>
          <div className="hero-ctas">
            <ButtonLink to="/signup" size="lg" iconRight={<ArrowRight size={18} aria-hidden="true" />}>
              Get started free
            </ButtonLink>
            <ButtonLink to="/login" size="lg" variant="secondary">
              Log in
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  )
}
