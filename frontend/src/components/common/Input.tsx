import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-[var(--text-secondary)]">{label}</label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-2 bg-[var(--bg-tertiary)] border rounded-lg text-[var(--text-primary)]
            placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 transition-all
            ${
              error
                ? 'border-[var(--error)] focus:ring-[var(--error)]/50 focus:border-[var(--error)]'
                : 'border-[var(--border-primary)] focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]'
            }
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-sm text-[var(--error)]">{error}</p>}
        {helperText && !error && (
          <p className="text-sm text-[var(--text-muted)]">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
