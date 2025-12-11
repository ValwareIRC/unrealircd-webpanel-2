/**
 * UI Constants and Types
 * Centralized definitions for UI variants, colors, and related constants
 */

// ============================================================================
// Badge Variants
// ============================================================================

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary'

export type BadgeSize = 'sm' | 'md' | 'lg'

export const BADGE_VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  secondary: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

// ============================================================================
// Alert Types
// ============================================================================

export type AlertType = 'info' | 'success' | 'warning' | 'error'

export const ALERT_VARIANT_CLASSES: Record<AlertType, string> = {
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  success: 'bg-green-500/10 border-green-500/30 text-green-400',
  warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  error: 'bg-red-500/10 border-red-500/30 text-red-400',
}

// ============================================================================
// Color Keys (for stats, charts, widgets)
// ============================================================================

export type ColorKey = 'accent' | 'success' | 'info' | 'warning' | 'error' | 'muted'

export const COLOR_VALUES: Record<ColorKey, string> = {
  accent: 'var(--accent)',
  success: '#22c55e',
  info: '#3b82f6',
  warning: '#eab308',
  error: '#ef4444',
  muted: 'var(--text-muted)',
}

// ============================================================================
// Button Variants
// ============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning'

export type ButtonSize = 'sm' | 'md' | 'lg'

// ============================================================================
// Theme
// ============================================================================

export type Theme = 'dark' | 'light' | 'system'

// ============================================================================
// Pagination
// ============================================================================

export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]
