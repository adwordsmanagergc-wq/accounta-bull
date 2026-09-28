import type { ReactNode } from 'react'
import { BarChart3, Flame, Gift, Lock, Trophy, Users, Zap, type LucideIcon } from 'lucide-react'
import { Section } from '../ui'
import Logo from '../Logo'
import { useReveal } from '../../hooks/useReveal'

function Feature({
  icon: Icon,
  title,
  body,
  visual,
  label,
  delay,
}: {
  icon: LucideIcon
  title: string
  body: string
  visual: ReactNode
  label: string
  delay: number
}) {
  const ref = useReveal<HTMLElement>()
  return (
    <article ref={ref} className={`feature reveal reveal-d${delay}`}>
      <div className="feature-copy">
        <span className="icon-tile">
          <Icon size={20} aria-hidden="true" />
        </span>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
      <div className="feature-visual mini" role="img" aria-label={label}>
        <div aria-hidden="true">{visual}</div>
      </div>
    </article>
  )
}

function ChargeVisual() {
  return (
    <div>
      <div className="mini-tones">
        <span>Soft</span>
        <span className="on">Firm</span>
        <span>Blunt</span>
      </div>
      <div className="mini-notif">
        <Logo size={28} alt="" />
        <div className="mini-notif-body">
          <div className="mini-notif-top">
            <strong>Charge Call · Gym session</strong>
            <span>now</span>
          </div>
          <p>30 minutes to go. Shoes on, bag packed. You already decided this.</p>
        </div>
      </div>
      <div className="mini-notif dim">
        <Logo size={28} alt="" />
        <div className="mini-notif-body">
          <div className="mini-notif-top">
            <strong>Charge Call · Deep work</strong>
            <span>8:30</span>
          </div>
          <p>Phone face down. One block, fully focused.</p>
        </div>
      </div>
    </div>
  )
}

function HerdVisual() {
  return (
    <div className="mini-panel">
      <div className="mini-row">
        <span className="mini-title">Run before 8am, 7 days</span>
        <span className="mini-muted">3 days left</span>
      </div>
      <div className="mini-score">
        <div className="mini-player">
          <span className="mini-avatar me">You</span>
          <div>
            <strong>5</strong>
            <span>check-ins</span>
          </div>
        </div>
        <span className="mini-vs">vs</span>
        <div className="mini-player right">
          <span className="mini-avatar">SM</span>
          <div>
            <strong>4</strong>
            <span>check-ins</span>
          </div>
        </div>
      </div>
      <div className="mini-row mini-muted">
        <span>
          <Trophy size={12} style={{ verticalAlign: -1 }} /> Loser buys the coffee
        </span>
        <span>Herd of 2</span>
      </div>
    </div>
  )
}

function HornsVisual() {
  return (
    <div>
      <div className="mini-balance">
        <strong>340</strong>
        <span className="mini-muted">Horns</span>
      </div>
      <div className="mini-muted">160 more for your next reward</div>
      <div className="mini-bar">
        <i style={{ width: '68%' }} />
      </div>
      <ul className="mini-rewards">
        <li>
          <Gift size={14} />
          <span>Rest day pass</span>
          <span className="mini-cost">50</span>
        </li>
        <li>
          <Gift size={14} />
          <span>Charity donation</span>
          <span className="mini-cost">300</span>
        </li>
        <li className="locked">
          <Lock size={14} />
          <span>1 month free</span>
          <span className="mini-cost">500</span>
        </li>
      </ul>
    </div>
  )
}

const HEAT = [
  0, 1, 2, 3, 2, 0, 1,
  2, 3, 3, 2, 1, 3, 2,
  3, 2, 3, 3, 2, 3, 1,
  3, 3, 2, 3, 3, 3, 3,
]
const WEEKS = [9, 12, 11, 14, 13, 16, 17, 19]

function StreakVisual() {
  const max = Math.max(...WEEKS)
  const w = 320
  const h = 120
  const bw = 24
  const gap = (w - bw * WEEKS.length) / (WEEKS.length - 1)
  return (
    <div className="mini-progress">
      <div>
        <div className="mini-balance">
          <strong>12</strong>
          <span className="mini-muted">
            <Flame size={12} style={{ verticalAlign: -1 }} /> day streak
          </span>
        </div>
        <div className="mini-heat">
          {HEAT.map((l, i) => (
            <i key={i} data-l={l} />
          ))}
        </div>
      </div>
      <svg className="mini-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        {WEEKS.map((v, i) => {
          const bh = ((h - 18) * v) / max
          return (
            <rect
              key={i}
              className={`bar${i === WEEKS.length - 1 ? ' on' : ''}`}
              x={i * (bw + gap)}
              y={h - 18 - bh}
              width={bw}
              height={bh}
              rx={4}
            />
          )
        })}
        <text className="axis" x={0} y={h - 2}>
          8 weeks ago
        </text>
        <text className="axis" x={w} y={h - 2} textAnchor="end">
          This week
        </text>
      </svg>
    </div>
  )
}

export default function Features() {
  return (
    <Section
      id="features"
      eyebrow="Features"
      title="Everything that keeps you showing up"
      lead="Four simple tools built around one idea: it is easier to follow through when someone is counting on you."
    >
      <div className="bento">
        <Feature
          delay={1}
          icon={Zap}
          title="Charge Calls"
          body="A Charge Call is a reminder that lands before each goal, with a message written to get you out the door. Keep it friendly, make it firm, or ask for blunt."
          label="Two Charge Call notifications, with the tone set to firm."
          visual={<ChargeVisual />}
        />
        <Feature
          delay={2}
          icon={Users}
          title="Herds"
          body="Your Herd is your accountability crew. Invite friends with a code, set shared challenges with a reward or a forfeit, and cheer each other on."
          label="A shared challenge scoreboard: you on 5 check-ins, your friend on 4."
          visual={<HerdVisual />}
        />
        <Feature
          delay={1}
          icon={Trophy}
          title="Horns and rewards"
          body="Horns are points you earn every time you finish a goal. Spend them on rewards, or put some on the line to raise the stakes."
          label="A balance of 340 Horns and a list of rewards you can redeem."
          visual={<HornsVisual />}
        />
        <Feature
          delay={2}
          icon={BarChart3}
          title="Streaks and progress"
          body="Your streak, weekly consistency, targets and progress photos in one place, so you can see the work adding up."
          label="A 12 day streak, a four week activity grid and a weekly completions chart trending up."
          visual={<StreakVisual />}
        />
      </div>
    </Section>
  )
}
