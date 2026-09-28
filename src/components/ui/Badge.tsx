import type { HTMLAttributes, ReactNode } from 'react'

type Tone = 'neutral' | 'accent' | 'success'

export function Badge({
  tone = 'neutral',
  icon,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone; icon?: ReactNode }) {
  const toneClass = tone === 'accent' ? 'tag-accent' : tone === 'success' ? 'tag-success' : ''
  return (
    <span className={['tag', toneClass, className ?? ''].filter(Boolean).join(' ')} {...rest}>
      {icon}
      {children}
    </span>
  )
}
