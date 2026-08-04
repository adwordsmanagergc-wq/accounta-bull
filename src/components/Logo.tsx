import { useState } from 'react'

// The bull crest (transparent) is the brand mark. Drop your own file at
// public/accountabullcrest.webp to replace it; falls back to the placeholder.
const primary = `${import.meta.env.BASE_URL}accountabullcrest.webp`
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
