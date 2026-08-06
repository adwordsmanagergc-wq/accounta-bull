import { useEffect, useState } from 'react'
import { computeBadges, loadAchievementStats, type Badge } from '../lib/achievements'

export default function Achievements({
  userId,
  horns,
  streak,
}: {
  userId: string
  horns: number
  streak: number
}) {
  const [badges, setBadges] = useState<Badge[]>([])

  useEffect(() => {
    let ok = true
    loadAchievementStats(userId, horns, streak)
      .then((s) => ok && setBadges(computeBadges(s)))
      .catch(() => {})
    return () => {
      ok = false
    }
  }, [userId, horns, streak])

  if (badges.length === 0) return null
  const earned = badges.filter((b) => b.earned).length

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="row between" style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 700 }}>Achievements</div>
        <div className="faint" style={{ fontSize: 13 }}>
          {earned}/{badges.length}
        </div>
      </div>
      <div className="badge-grid">
        {badges.map((b) => (
          <div className={`badge ${b.earned ? 'on' : ''}`} key={b.key} title={b.desc}>
            <div className="badge-emoji">{b.emoji}</div>
            <div className="badge-title">{b.title}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
