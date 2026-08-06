interface Props {
  url?: string | null
  name?: string | null
  size?: number
}

/** Round avatar: shows the photo, or the initial on a branded circle. */
export default function Avatar({ url, name, size = 64 }: Props) {
  const initial = (name?.trim()?.[0] ?? '🐂').toUpperCase()
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {url ? <img src={url} alt={name ?? 'avatar'} /> : <span>{initial}</span>}
    </div>
  )
}
