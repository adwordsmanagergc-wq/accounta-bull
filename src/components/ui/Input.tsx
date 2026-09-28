import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: ReactNode
  error?: string | null
  /** Adds a show/hide toggle for password fields. */
  revealable?: boolean
  after?: ReactNode
}

export function Input({ label, hint, error, revealable, after, id, type = 'text', className, ...rest }: Props) {
  const autoId = useId()
  const inputId = id ?? autoId
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`
  const [shown, setShown] = useState(false)
  const effectiveType = revealable ? (shown ? 'text' : 'password') : type
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined

  const input = (
    <input
      id={inputId}
      type={effectiveType}
      className={['input', className ?? ''].filter(Boolean).join(' ')}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      {...rest}
    />
  )

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      {revealable ? (
        <div className="input-wrap">
          {input}
          <button
            type="button"
            className="input-toggle"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? 'Hide password' : 'Show password'}
            aria-pressed={shown}
            aria-controls={inputId}
          >
            {shown ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
      ) : (
        input
      )}
      {after}
      {error && (
        <div className="field-error" id={errorId}>
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </div>
      )}
      {hint && !error && (
        <div className="field-hint" id={hintId}>
          {hint}
        </div>
      )}
    </div>
  )
}
