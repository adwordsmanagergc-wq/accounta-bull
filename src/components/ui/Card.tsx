import type { HTMLAttributes } from 'react'

export function Card({
  interactive = false,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={['card', interactive ? 'card-interactive' : '', className ?? ''].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}
