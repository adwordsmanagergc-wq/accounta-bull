import type { Measurement } from '../lib/measurements'

/** Minimal inline SVG line chart of weight over time (brand-styled). */
export default function WeightChart({ data }: { data: Measurement[] }) {
  const points = data.filter((d) => d.weight != null) as (Measurement & { weight: number })[]
  if (points.length < 2) return null

  const W = 320
  const H = 120
  const pad = 8
  const weights = points.map((p) => p.weight)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const span = max - min || 1

  const x = (i: number) => pad + (i * (W - pad * 2)) / (points.length - 1)
  const y = (w: number) => pad + (1 - (w - min) / span) * (H - pad * 2)

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.weight).toFixed(1)}`).join(' ')
  const area = `${line} L ${x(points.length - 1).toFixed(1)} ${H - pad} L ${x(0).toFixed(1)} ${H - pad} Z`

  const first = points[0]
  const last = points[points.length - 1]
  const delta = last.weight - first.weight

  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="row between" style={{ marginBottom: 8 }}>
        <div className="muted" style={{ fontSize: 13 }}>
          {first.weight} → {last.weight}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: delta <= 0 ? 'var(--success)' : 'var(--orange)' }}>
          {delta > 0 ? '+' : ''}
          {delta.toFixed(1)}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Weight over time">
        <defs>
          <linearGradient id="wc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f5821f" stopOpacity="0.35" />
            <stop offset="1" stopColor="#f5821f" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#wc)" />
        <path d={line} fill="none" stroke="#f5821f" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(points.length - 1)} cy={y(last.weight)} r="4" fill="#f5821f" />
      </svg>
    </div>
  )
}
