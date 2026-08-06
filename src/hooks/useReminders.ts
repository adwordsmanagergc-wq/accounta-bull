import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchGoals, fetchTodayCompletions } from '../lib/api'
import { inBoostWindow, isScheduledToday, todayKey } from '../lib/game'
import { showChargeNotification } from '../lib/notify'

const CHECK_MS = 60_000

/**
 * While the app is open, poll once a minute for goals starting within the next
 * 30 minutes. When one first enters that window we fire a browser notification
 * and open the Boost screen, once per goal per day.
 */
export function useReminders(userId: string | undefined) {
  const navigate = useNavigate()
  const location = useLocation()
  const pathRef = useRef(location.pathname)
  pathRef.current = location.pathname

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    const alertedKey = `ab:alerted:${todayKey()}`
    const alerted = new Set<string>(JSON.parse(localStorage.getItem(alertedKey) || '[]'))

    async function tick() {
      try {
        const [goals, completions] = await Promise.all([
          fetchGoals(userId!),
          fetchTodayCompletions(userId!),
        ])
        if (cancelled) return

        for (const goal of goals) {
          if (!isScheduledToday(goal)) continue
          if (completions[goal.id]) continue // already done today
          if (!inBoostWindow(goal)) continue
          if (alerted.has(goal.id)) continue

          alerted.add(goal.id)
          localStorage.setItem(alertedKey, JSON.stringify([...alerted]))

          showChargeNotification(goal.title, goal.time_of_day)

          // Don't yank the user out of an in-progress edit.
          if (!pathRef.current.startsWith('/goal')) {
            navigate(`/boost/${goal.id}`)
          }
          break
        }
      } catch {
        /* transient network / not configured, try again next tick */
      }
    }

    tick()
    const interval = window.setInterval(tick, CHECK_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [userId, navigate])
}
