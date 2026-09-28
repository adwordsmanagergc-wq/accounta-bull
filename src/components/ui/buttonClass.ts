type Variant = 'primary' | 'secondary' | 'quiet' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonStyle {
  variant?: Variant
  size?: Size
  /** Stretch to the container width. Defaults to false (content width). */
  block?: boolean
}

const variantClass: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  quiet: 'btn-quiet',
  danger: 'btn-danger',
}

export function buttonClass({
  variant = 'primary',
  size = 'md',
  block = false,
  className,
}: ButtonStyle & { className?: string }) {
  return [
    'btn',
    variantClass[variant],
    size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '',
    block ? '' : 'btn-auto',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
}

