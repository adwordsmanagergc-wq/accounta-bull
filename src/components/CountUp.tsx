import { useEffect, useRef, useState } from 'react'

// Animates a number from its previous value up (or down) to the new one.
// Used for horn totals and streaks so earning feels rewarding.

export default function CountUp({
  value,
  duration = 700,
}: {
  value: number
  duration?: number
}) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const from = fromRef.current
    const to = value
    if (from === to) return

    // Respect reduced-motion: jump straight to the value.
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      fromRef.current = to
      setDisplay(to)
      return
    }

    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        fromRef.current = to
      }
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      fromRef.current = to
    }
  }, [value, duration])

  return <>{display.toLocaleString()}</>
}
