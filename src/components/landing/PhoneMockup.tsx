import { BatteryFull, Check, Flame, Home, Plus, Signal, Trophy, User, Users, Wifi, Zap } from 'lucide-react'
import Logo from '../Logo'

const WEEK = [
  { d: 'M', s: 'on' },
  { d: 'T', s: 'on' },
  { d: 'W', s: 'on' },
  { d: 'T', s: 'on' },
  { d: 'F', s: 'on' },
  { d: 'S', s: 'today' },
  { d: 'S', s: '' },
]

const GOALS = [
  { title: 'Morning run, 5k', meta: '06:30 · Fitness', horns: 10, state: 'done' },
  { title: 'Deep work block', meta: '09:00 · Work', horns: 10, state: 'done' },
  { title: 'Upper body session', meta: '18:00 · in 30 min', horns: 15, state: 'next' },
]

/** The Today screen, drawn in HTML and CSS. Purely illustrative. */
export default function PhoneMockup() {
  return (
    <div
      className="phone-wrap"
      role="img"
      aria-label="Preview of the Accounta-Bull Today screen: three goals with two checked off, a 12 day streak, a balance of 340 Horns, and a Charge Call notification for the next goal."
    >
      <div className="phone" aria-hidden="true">
        <div className="phone-screen">
          <div className="phone-island" />
          <div className="phone-status">
            <span>9:41</span>
            <span className="phone-status-icons">
              <Signal size={12} />
              <Wifi size={12} />
              <BatteryFull size={14} />
            </span>
          </div>
          <div className="phone-body">
            <div className="ph-head">
              <div>
                <div className="ph-title">Today</div>
                <div className="ph-date">Saturday, 17 October</div>
              </div>
              <span className="ph-pill">
                <Trophy size={11} /> 340
              </span>
            </div>

            <div className="ph-streak">
              <div className="ph-streak-top">
                <div className="ph-streak-num">
                  <strong>12</strong>
                  <span>day streak</span>
                </div>
                <Flame size={18} className="ph-flame" />
              </div>
              <div className="ph-week">
                {WEEK.map((w, i) => (
                  <div key={i} className={`ph-day ${w.s}`}>
                    <i />
                    {w.d}
                  </div>
                ))}
              </div>
            </div>

            <div className="ph-section">
              <span>Goals</span>
              <span>2 of 3 done</span>
            </div>

            {GOALS.map((g) => (
              <div key={g.title} className={`ph-goal ${g.state}`}>
                <span className="ph-check">{g.state === 'done' && <Check size={13} strokeWidth={3} />}</span>
                <div className="ph-goal-main">
                  <div className="ph-goal-title">{g.title}</div>
                  <div className="ph-goal-meta">{g.meta}</div>
                  {g.state === 'next' && (
                    <div className="ph-meter">
                      <i />
                    </div>
                  )}
                </div>
                <span className="ph-goal-horns">+{g.horns}</span>
              </div>
            ))}

            <div className="ph-add">
              <Plus size={12} /> Add another goal
            </div>

            <div className="ph-tabbar">
              <span className="ph-tab on">
                <Home size={16} />
                Today
              </span>
              <span className="ph-tab">
                <Plus size={16} />
                Add goal
              </span>
              <span className="ph-tab">
                <Users size={16} />
                Herd
              </span>
              <span className="ph-tab">
                <User size={16} />
                Profile
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="float-card float-notif" aria-hidden="true">
        <Logo size={32} alt="" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="float-notif-top">
            <strong>
              <Zap size={12} /> Charge Call
            </strong>
            <span>now</span>
          </div>
          <p>Upper body starts in 30 minutes. You said you would be there. Go.</p>
        </div>
      </div>

      <div className="float-card float-horns" aria-hidden="true">
        <Trophy size={16} /> +15 Horns
      </div>
    </div>
  )
}
