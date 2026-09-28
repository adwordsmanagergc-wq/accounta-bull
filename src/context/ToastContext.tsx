import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Copy, Info, Trophy, Zap } from 'lucide-react'

interface Toast {
  id: number
  text: string
  icon?: ReactNode
}

// Callers pass short emoji codes; render the common ones as line icons so
// toasts match the rest of the UI. Anything else is shown as given.
const ICONS: Record<string, ReactNode> = {
  '🐂': <CheckCircle2 size={18} />,
  '✅': <CheckCircle2 size={18} />,
  '⚠️': <AlertTriangle size={18} />,
  '🏆': <Trophy size={18} />,
  '📋': <Copy size={18} />,
  'ℹ️': <Info size={18} />,
  '⚡': <Zap size={18} />,
}

function renderIcon(icon: ReactNode) {
  return typeof icon === 'string' && ICONS[icon] ? ICONS[icon] : icon
}

interface ToastCtx {
  showToast: (text: string, icon?: ReactNode) => void
}

const Ctx = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const showToast = useCallback((text: string, icon: ReactNode = '🐂') => {
    const id = nextId.current++
    setToasts((t) => [...t, { id, text, icon }])
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 2600)
  }, [])

  return (
    <Ctx.Provider value={{ showToast }}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            <span className="toast-icon" aria-hidden="true">{renderIcon(t.icon)}</span>
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
