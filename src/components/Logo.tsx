import { useState } from 'react'

// The bull crest (transparent) is the brand mark. Drop your own file at
// public/accountabullcrest.webp to replace it; falls back to the placeholder.
const primary = `${import.meta.env.BASE_URL}accountabullcrest.webp`
const fallback = `${import.meta.env.BASE_URL}logo.svg`

export default function Logo({
  size = 36,
  alt = 'Accounta-Bull',
  className,
}: {
  size?: number
  /** Pass an empty string when the mark sits next to visible brand text. */
  alt?: string
  className?: string
}) {
  const [src, setSrc] = useState(primary)
  return (
    <img
      src={src}
      onError={() => src !== fallback && setSrc(fallback)}
      width={size}
      height={size}
      alt={alt}
      className={className}
      decoding="async"
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
    />
  )
}
