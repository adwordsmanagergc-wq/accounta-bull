import { useState } from 'react'

// Drop your transparent logo at public/accountabulllogo.webp and it's used
// automatically. Until then it falls back to the placeholder logo.svg.
const primary = `${import.meta.env.BASE_URL}accountabulllogo.webp`
const fallback = `${import.meta.env.BASE_URL}logo.svg`

export default function Logo({ size = 200, glow = false }: { size?: number; glow?: boolean }) {
  const [src, setSrc] = useState(primary)
  return (
    <img
      src={src}
      onError={() => src !== fallback && setSrc(fallback)}
      width={size}
      height={size}
      alt="Accounta-Bull"
      className={glow ? 'logo-glow' : undefined}
      style={{ width: size, height: 'auto', display: 'block' }}
    />
  )
}
