import { CircleCheckBig, Target, Zap } from 'lucide-react'
import { Section } from '../ui'
import { useReveal } from '../../hooks/useReveal'

const STEPS = [
  {
    icon: Target,
    title: 'Set your goals',
    body: 'Add the workouts, deep work and habits you want to hit. Pick a time and the days each one repeats.',
  },
  {
    icon: Zap,
    title: 'Get your Charge Call',
    body: 'About 30 minutes before each goal you get a Charge Call: a notification with a short message to get you moving. You choose the tone.',
  },
  {
    icon: CircleCheckBig,
    title: 'Check in with your herd',
    body: 'Tick it off, earn Horns and keep your streak alive. Your Herd sees your progress and holds you to it.',
  },
]

export default function HowItWorks() {
  const ref = useReveal<HTMLOListElement>()
  return (
    <Section
      id="how-it-works"
      eyebrow="How it works"
      title="Three steps. Every day."
      lead="Accounta-Bull turns your plans into a routine you can keep, with a nudge before every goal and people who notice when you skip."
    >
      <ol ref={ref} className="steps-grid reveal">
        {STEPS.map((s, i) => (
          <li key={s.title} className={`step-card reveal-d${i + 1}`}>
            <div className="step-card-top">
              <span className="icon-tile">
                <s.icon size={20} aria-hidden="true" />
              </span>
              <span className="step-card-num">0{i + 1}</span>
            </div>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}
