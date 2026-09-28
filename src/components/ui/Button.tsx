import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { buttonClass, type ButtonStyle } from './buttonClass'

interface Common extends ButtonStyle {
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
  children?: ReactNode
  className?: string
}

function Inner({ loading, icon, iconRight, children }: Common) {
  return (
    <>
      {loading ? <span className="btn-spinner" aria-hidden="true" /> : icon}
      {children}
      {iconRight}
    </>
  )
}

export function Button({
  variant,
  size,
  block,
  loading,
  icon,
  iconRight,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, block, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <Inner loading={loading} icon={icon} iconRight={iconRight}>
        {children}
      </Inner>
    </button>
  )
}

/** A router link styled as a button. */
export function ButtonLink({
  variant,
  size,
  block,
  icon,
  iconRight,
  className,
  children,
  ...rest
}: Common & LinkProps) {
  return (
    <Link className={buttonClass({ variant, size, block, className })} {...rest}>
      <Inner icon={icon} iconRight={iconRight}>
        {children}
      </Inner>
    </Link>
  )
}
