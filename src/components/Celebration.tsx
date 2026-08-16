import { useEffect, useMemo, useState } from 'react'

// A short, celebratory particle burst shown when a task is completed.
// Pure CSS/JS, no dependencies. Renders a spray of emoji + sparks from the
// centre, then calls onDone so the parent can unmount it.

const PIECES = ['🐂', '🏆', '⚡', '💪', '🔥', '⭐', '✨']

interface Particle {
  id: number
  emoji: string
  dx: number
  dy: number
  rot: number
  delay: number
  size: number
}

export default function Celebration({ onDone }: { onDone?: () => void }) {
  const [gone, setGone] = useState(false)

  const particles = useMemo<Particle[]>(() => {
    const count = 22
    return Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4
      const dist = 90 + Math.random() * 150
      return {
        id: i,
        emoji: PIECES[i % PIECES.length],
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 40, // bias upward
        rot: (Math.random() - 0.5) * 220,
        delay: Math.random() * 0.08,
        size: 18 + Math.random() * 16,
      }
    })
  }, [])

  useEffect(() => {
    const t1 = window.setTimeout(() => setGone(true), 1100)
    const t2 = window.setTimeout(() => onDone?.(), 1350)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [onDone])

  return (
    <div className={`celebrate${gone ? ' celebrate-out' : ''}`} aria-hidden="true">
      <div className="celebrate-ring" />
      <div className="celebrate-burst">
        {particles.map((p) => (
          <span
            key={p.id}
            className="celebrate-piece"
            style={
              {
                '--dx': `${p.dx}px`,
                '--dy': `${p.dy}px`,
                '--rot': `${p.rot}deg`,
                '--delay': `${p.delay}s`,
                fontSize: `${p.size}px`,
              } as React.CSSProperties
            }
          >
            {p.emoji}
          </span>
        ))}
      </div>
    </div>
  )
}
