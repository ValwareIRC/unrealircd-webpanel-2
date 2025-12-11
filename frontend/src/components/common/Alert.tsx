import { type ReactNode } from 'react'
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react'

interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  children: ReactNode
  onClose?: () => void
}

const typeStyles = {
  info: {
    bg: 'bg-blue-500/10 border-blue-500/30',
    icon: Info,
    iconColor: 'text-blue-400',
    titleColor: 'text-blue-300',
  },
  success: {
    bg: 'bg-[var(--success)]/10 border-[var(--success)]/30',
    icon: CheckCircle,
    iconColor: 'text-[var(--success)]',
    titleColor: 'text-[var(--success)]',
  },
  warning: {
    bg: 'bg-[var(--warning)]/10 border-[var(--warning)]/30',
    icon: AlertTriangle,
    iconColor: 'text-[var(--warning)]',
    titleColor: 'text-[var(--warning)]',
  },
  error: {
    bg: 'bg-[var(--error)]/10 border-[var(--error)]/30',
    icon: AlertCircle,
    iconColor: 'text-[var(--error)]',
    titleColor: 'text-[var(--error)]',
  },
}

export function Alert({ type = 'info', title, children, onClose }: AlertProps) {
  const styles = typeStyles[type]
  const Icon = styles.icon

  return (
    <div className={`flex gap-3 p-4 rounded-lg border ${styles.bg}`}>
      <Icon className={`flex-shrink-0 ${styles.iconColor}`} size={20} />
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={`font-medium ${styles.titleColor}`}>{title}</h4>
        )}
        <div className="text-sm text-[var(--text-secondary)]">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
