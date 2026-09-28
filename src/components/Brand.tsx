import { Link } from 'react-router-dom'
import Logo from './Logo'

/** Logo mark plus text wordmark. Links home unless `to` is null. */
export default function Brand({ size = 32, to = '/' }: { size?: number; to?: string | null }) {
  const inner = (
    <>
      <Logo size={size} alt="" />
      <span className="brand-word">Accounta-Bull</span>
    </>
  )
  if (to === null) return <span className="brand">{inner}</span>
  return (
    <Link to={to} className="brand" aria-label="Accounta-Bull home">
      {inner}
    </Link>
  )
}
