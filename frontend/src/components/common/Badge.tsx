interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary'
  size?: 'sm' | 'md'
  className?: string
}

const variantClasses = {
  default: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
  success: 'bg-[var(--success)]/20 text-[var(--success)]',
  warning: 'bg-[var(--warning)]/20 text-[var(--warning)]',
  error: 'bg-[var(--error)]/20 text-[var(--error)]',
  info: 'bg-[var(--info)]/20 text-[var(--info)]',
  secondary: 'bg-[var(--bg-secondary)] text-[var(--text-muted)]',
}

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm',
}

export function Badge({ children, variant = 'default', size = 'md', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  )
}
