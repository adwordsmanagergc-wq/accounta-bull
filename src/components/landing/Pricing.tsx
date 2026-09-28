import { Check } from 'lucide-react'
import { Badge, ButtonLink, Section } from '../ui'
import { useReveal } from '../../hooks/useReveal'

const INCLUDED = [
  'Unlimited daily goals',
  'Charge Calls in the tone you choose',
  'Herds and shared challenges',
  'Horns, rewards and streaks',
  'Progress targets and photos',
  'Coached Herds for coaches and PTs',
]

export default function Pricing() {
  const ref = useReveal<HTMLDivElement>()
  return (
    <Section
      id="pricing"
      className="section-divider"
      eyebrow="Pricing"
      title="Free during early access"
      lead="Every feature is free while Accounta-Bull is in early access. No card, no trial clock."
      align="center"
    >
      <div ref={ref} className="price-card reveal">
        <div className="price-top">
          <h3>Early access</h3>
          <Badge tone="accent">Everything included</Badge>
        </div>
        <div className="price-amount">
          <strong>Free</strong>
          <span>while in early access</span>
        </div>
        <p className="price-note">Join now and help shape what we build next.</p>
        <ul className="price-list">
          {INCLUDED.map((x) => (
            <li key={x}>
              <Check size={16} aria-hidden="true" />
              {x}
            </li>
          ))}
        </ul>
        <ButtonLink to="/signup" size="lg" block>
          Get started free
        </ButtonLink>
      </div>
    </Section>
  )
}
