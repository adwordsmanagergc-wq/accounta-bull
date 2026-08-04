import { useState } from 'react'

const webp = `${import.meta.env.BASE_URL}logo.webp`
const svg = `${import.meta.env.BASE_URL}logo.svg`

/**
 * Shows your brand logo. Drop a real `logo.webp` into /public and it will be
 * used automatically; until then it falls back to the placeholder logo.svg.
 */
export default function Logo({ size = 200 }: { size?: number }) {
  const [src, setSrc] = useState(webp)
  return (
    <img
      src={src}
      onError={() => src !== svg && setSrc(svg)}
      width={size}
      height={size}
      alt="Accounta-Bull"
      style={{ width: size, height: 'auto', borderRadius: 20, display: 'block' }}
    />
  )
}
