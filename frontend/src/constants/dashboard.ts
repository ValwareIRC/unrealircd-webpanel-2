/**
 * Dashboard Constants and Enums
 * Centralized definitions for dashboard widgets and layouts
 */

// ============================================================================
// Widget Types
// ============================================================================

export enum DashboardWidgetType {
  STATS = 'stats',
  ACTIVITY_CHART = 'activity-chart',
  TOP_CHANNELS = 'top-channels',
  SERVER_STATUS = 'server-status',
  QUICK_LINKS = 'quick-links',
  NETWORK_INFO = 'network-info',
  RECENT_BANS = 'recent-bans',
  SHORTCUT = 'shortcut',
}

export interface WidgetTypeInfo {
  label: string
  description: string
  minWidth: number
  minHeight: number
  defaultWidth: number
  defaultHeight: number
}

export const WIDGET_TYPES: Record<DashboardWidgetType, WidgetTypeInfo> = {
  [DashboardWidgetType.STATS]: {
    label: 'Statistics',
    description: 'Show network statistics (users, channels, servers)',
    minWidth: 1,
    minHeight: 1,
    defaultWidth: 1,
    defaultHeight: 1,
  },
  [DashboardWidgetType.ACTIVITY_CHART]: {
    label: 'Activity Chart',
    description: 'Network activity over time',
    minWidth: 2,
    minHeight: 2,
    defaultWidth: 4,
    defaultHeight: 2,
  },
  [DashboardWidgetType.TOP_CHANNELS]: {
    label: 'Top Channels',
    description: 'Most active channels by user count',
    minWidth: 1,
    minHeight: 2,
    defaultWidth: 2,
    defaultHeight: 2,
  },
  [DashboardWidgetType.SERVER_STATUS]: {
    label: 'Server Status',
    description: 'Status of connected IRC servers',
    minWidth: 1,
    minHeight: 2,
    defaultWidth: 2,
    defaultHeight: 2,
  },
  [DashboardWidgetType.QUICK_LINKS]: {
    label: 'Quick Links',
    description: 'Navigation shortcuts',
    minWidth: 1,
    minHeight: 1,
    defaultWidth: 2,
    defaultHeight: 1,
  },
  [DashboardWidgetType.NETWORK_INFO]: {
    label: 'Network Info',
    description: 'IRC network information',
    minWidth: 1,
    minHeight: 1,
    defaultWidth: 2,
    defaultHeight: 1,
  },
  [DashboardWidgetType.RECENT_BANS]: {
    label: 'Recent Bans',
    description: 'Recently added bans',
    minWidth: 2,
    minHeight: 2,
    defaultWidth: 2,
    defaultHeight: 2,
  },
  [DashboardWidgetType.SHORTCUT]: {
    label: 'Shortcut',
    description: 'Quick action shortcut',
    minWidth: 1,
    minHeight: 1,
    defaultWidth: 1,
    defaultHeight: 1,
  },
}

// ============================================================================
// Shortcut Widget Types
// ============================================================================

export enum ShortcutType {
  USERS = 'users',
  CHANNELS = 'channels',
  SERVERS = 'servers',
  BANS = 'bans',
  SPAMFILTER = 'spamfilter',
  SETTINGS = 'settings',
  LOGS = 'logs',
}

export interface ShortcutInfo {
  label: string
  path: string
  icon: string
  color: string
}

export const SHORTCUTS: Record<ShortcutType, ShortcutInfo> = {
  [ShortcutType.USERS]: {
    label: 'Users',
    path: '/users',
    icon: 'Users',
    color: 'bg-blue-500/20 text-blue-400',
  },
  [ShortcutType.CHANNELS]: {
    label: 'Channels',
    path: '/channels',
    icon: 'Hash',
    color: 'bg-green-500/20 text-green-400',
  },
  [ShortcutType.SERVERS]: {
    label: 'Servers',
    path: '/servers',
    icon: 'Server',
    color: 'bg-purple-500/20 text-purple-400',
  },
  [ShortcutType.BANS]: {
    label: 'Bans',
    path: '/server-bans',
    icon: 'Ban',
    color: 'bg-red-500/20 text-red-400',
  },
  [ShortcutType.SPAMFILTER]: {
    label: 'Spamfilter',
    path: '/spamfilter',
    icon: 'Shield',
    color: 'bg-yellow-500/20 text-yellow-400',
  },
  [ShortcutType.SETTINGS]: {
    label: 'Settings',
    path: '/settings',
    icon: 'Settings',
    color: 'bg-gray-500/20 text-gray-400',
  },
  [ShortcutType.LOGS]: {
    label: 'Logs',
    path: '/logs',
    icon: 'FileText',
    color: 'bg-cyan-500/20 text-cyan-400',
  },
}
