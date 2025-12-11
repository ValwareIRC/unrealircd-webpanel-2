import { type LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: 'accent' | 'green' | 'yellow' | 'red' | 'blue'
}

const colorClasses = {
  accent: 'bg-[var(--accent)]/20 text-[var(--accent)]',
  green: 'bg-[var(--success)]/20 text-[var(--success)]',
  yellow: 'bg-[var(--warning)]/20 text-[var(--warning)]',
  red: 'bg-[var(--error)]/20 text-[var(--error)]',
  blue: 'bg-[var(--info)]/20 text-[var(--info)]',
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'accent',
}: StatsCardProps) {
  return (
    <div className="card hover:border-[var(--border-secondary)] transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[var(--text-muted)] text-sm font-medium">{title}</p>
          <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>}
          {trend && (
            <div
              className={`mt-2 inline-flex items-center text-sm ${
                trend.isPositive ? 'text-[var(--success)]' : 'text-[var(--error)]'
              }`}
            >
              <span>{trend.isPositive ? '+' : '-'}{trend.value}%</span>
              <span className="ml-1 text-[var(--text-muted)]">vs last hour</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon size={24} />
          </div>
        )}
      </div>
    </div>
  )
}
