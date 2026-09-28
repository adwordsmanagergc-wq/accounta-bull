import type { ReactNode } from 'react'
import { useReveal } from '../../hooks/useReveal'

interface Props {
  id?: string
  eyebrow?: string
  title?: ReactNode
  lead?: ReactNode
  align?: 'left' | 'center'
  className?: string
  children?: ReactNode
}

/** A marketing page section: optional eyebrow, heading and lead, then content. */
export function Section({ id, eyebrow, title, lead, align = 'left', className, children }: Props) {
  const headRef = useReveal<HTMLDivElement>()
  const titleId = id ? `${id}-title` : undefined
  return (
    <section id={id} className={['section', className ?? ''].filter(Boolean).join(' ')} aria-labelledby={title ? titleId : undefined}>
      <div className="container">
        {(eyebrow || title || lead) && (
          <div ref={headRef} className={`section-head reveal ${align === 'center' ? 'is-center' : ''}`}>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2 id={titleId}>{title}</h2>}
            {lead && <p className="section-lead">{lead}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}
