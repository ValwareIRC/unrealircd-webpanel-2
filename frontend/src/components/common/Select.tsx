import { type SelectHTMLAttributes, forwardRef, type ReactNode } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  children: ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, children, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-[var(--text-secondary)]">{label}</label>
        )}
        <select
          ref={ref}
          className={`
            w-full px-4 py-2 bg-[var(--bg-tertiary)] border rounded-lg text-[var(--text-primary)]
            focus:outline-none focus:ring-2 transition-all appearance-none
            bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]
            bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem_1rem]
            ${
              error
                ? 'border-[var(--error)] focus:ring-[var(--error)]/50 focus:border-[var(--error)]'
                : 'border-[var(--border-primary)] focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]'
            }
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-sm text-[var(--error)]">{error}</p>}
        {helperText && !error && (
          <p className="text-sm text-[var(--text-muted)]">{helperText}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
