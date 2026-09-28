import { Activity, ArrowRight, ClipboardList, Flame, Palette, Trophy, UserPlus } from 'lucide-react'
import { ButtonLink, Section } from '../ui'
import { useReveal } from '../../hooks/useReveal'

const POINTS = [
  { icon: UserPlus, title: 'Invite clients with a code', body: 'Clients join your team from their own phone in a few taps.' },
  { icon: ClipboardList, title: 'Assign daily tasks', body: 'Set the time, the days and how many Horns each task is worth.' },
  { icon: Activity, title: 'Track every client', body: 'Streaks, Horns, check-ins and shared progress photos at a glance.' },
  { icon: Palette, title: 'Make it yours', body: 'Add your logo and brand colours so the team feels like your gym.' },
]

const CLIENTS = [
  { i: 'JR', name: 'Jordan R.', streak: 21, horns: 610, done: true },
  { i: 'PK', name: 'Priya K.', streak: 14, horns: 420, done: true },
  { i: 'TM', name: 'Tom M.', streak: 6, horns: 180, done: false },
  { i: 'AL', name: 'Ana L.', streak: 3, horns: 95, done: false },
]

function Dashboard() {
  return (
    <div
      className="dash"
      role="img"
      aria-label="Example coach dashboard for a team called Morning Crew, listing each client's streak, Horns and whether they finished today's task."
    >
      <div aria-hidden="true">
        <div className="dash-top">
          <span className="dash-logo">M</span>
          <div>
            <strong>Morning Crew</strong>
            <span className="faint">Coached Herd · 4 clients</span>
          </div>
          <span className="btn btn-secondary btn-sm dash-hide-sm">Assign task</span>
        </div>
        <div className="dash-stats">
          <div className="dash-stat">
            <strong>2/4</strong>
            <span>Done today</span>
          </div>
          <div className="dash-stat">
            <strong>11</strong>
            <span>Avg streak</span>
          </div>
          <div className="dash-stat">
            <strong>1,305</strong>
            <span>Horns earned</span>
          </div>
        </div>
        <table className="dash-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Streak</th>
              <th className="dash-hide-sm">Horns</th>
              <th>Today</th>
            </tr>
          </thead>
          <tbody>
            {CLIENTS.map((c) => (
              <tr key={c.name}>
                <td>
                  <span className="dash-client">
                    <span className="mini-avatar">{c.i}</span>
                    {c.name}
                  </span>
                </td>
                <td>
                  <span className="dash-num">
                    <Flame size={12} /> {c.streak}
                  </span>
                </td>
                <td className="dash-hide-sm">
                  <span className="dash-num">
                    <Trophy size={12} /> {c.horns}
                  </span>
                </td>
                <td>
                  {c.done ? <span className="tag tag-success">Done</span> : <span className="tag">Pending</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Coaches() {
  const listRef = useReveal<HTMLDivElement>()
  const dashRef = useReveal<HTMLDivElement>()
  return (
    <Section
      id="coaches"
      className="section-divider"
      eyebrow="For coaches and PTs"
      title="Coached Herds for your clients"
      lead="Run your clients' daily accountability from one dashboard, under your own brand. They get Charge Calls and Horns. You see who showed up."
    >
      <div className="coach-grid">
        <div ref={listRef} className="reveal">
          <ul className="coach-list">
            {POINTS.map((p) => (
              <li key={p.title}>
                <span className="icon-tile">
                  <p.icon size={20} aria-hidden="true" />
                </span>
                <div>
                  <strong>{p.title}</strong>
                  <span>{p.body}</span>
                </div>
              </li>
            ))}
          </ul>
          <ButtonLink to="/signup" variant="secondary" iconRight={<ArrowRight size={16} aria-hidden="true" />}>
            Start a Coached Herd
          </ButtonLink>
        </div>
        <div ref={dashRef} className="reveal reveal-d2">
          <Dashboard />
        </div>
      </div>
    </Section>
  )
}
