import { useId, useState } from 'react'
import { Plus } from 'lucide-react'
import { Section } from '../ui'

const FAQS = [
  {
    q: 'What is a Charge Call?',
    a: 'A Charge Call is a notification that arrives about 30 minutes before a goal, with a short message to get you moving. In your profile you pick the tone: soft and kind, firm, or blunt with the gloves off. Open it and commit to the goal, and skipping it afterwards costs you a few Horns.',
  },
  {
    q: 'What is a Herd?',
    a: 'Your Herd is your accountability group. Invite a friend with a code or a link, then set shared challenges with a reward for the winner and a forfeit for the loser. You can see each other’s streaks and Horns, check in daily, send cheers and message each other.',
  },
  {
    q: 'What are Horns and what can I do with them?',
    a: 'Horns are points. You earn them every time you finish a goal, and you choose how many each goal is worth. Spend them on rewards in the app, such as a rest day pass, or put Horns at stake on a goal to make skipping it cost you.',
  },
  {
    q: 'What happens if I miss a goal?',
    a: 'Only what you signed up for. If you staked Horns on a goal, missing it costs you those Horns, and if you set a forfeit your Herd can hear about it. Skipping a goal you committed to from its Charge Call costs 5 Horns. Otherwise you simply pick it up again tomorrow.',
  },
  {
    q: 'Do I need to download an app?',
    a: 'No. Accounta-Bull runs in your phone’s browser. Add it to your home screen and it opens full screen like any other app, with notifications for your Charge Calls. It works on iPhone and Android, and on desktop too.',
  },
  {
    q: 'How much does it cost?',
    a: 'Nothing while we are in early access. Every feature, including Coached Herds for coaches and PTs, is free to use and no card is needed to sign up.',
  },
]

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className="faq-item">
      <h3>
        <button
          type="button"
          className="faq-q"
          aria-expanded={open}
          aria-controls={`${id}-a`}
          id={`${id}-q`}
          onClick={() => setOpen((o) => !o)}
        >
          {q}
          <Plus size={20} aria-hidden="true" />
        </button>
      </h3>
      <div
        className={`faq-a${open ? ' open' : ''}`}
        id={`${id}-a`}
        role="region"
        aria-labelledby={`${id}-q`}
      >
        <div>
          <p>{a}</p>
        </div>
      </div>
    </div>
  )
}

export default function Faq() {
  return (
    <Section
      id="faq"
      className="section-divider"
      eyebrow="FAQ"
      title="Questions, answered"
      align="center"
    >
      <div className="faq">
        {FAQS.map((f) => (
          <Item key={f.q} {...f} />
        ))}
      </div>
    </Section>
  )
}
