import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useNetworkStats, useIRCChannels, useIRCServers } from '@/hooks'
import { useTranslation } from 'react-i18next'
import {
  Users, Hash, Server, Shield, Clock, Wifi, TrendingUp, TrendingDown,
  Ban, FileText, Settings, ExternalLink, Activity
} from 'lucide-react'
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts'
import api from '@/services/api'

// Type definitions
interface StatsSnapshot {
  timestamp: string
  users: { total: number; local: number; global_max: number; operators: number; invisible: number }
  channels: { total: number }
  servers: { total: number }
}

interface StatsHistoryResponse {
  count: number
  snapshots: StatsSnapshot[]
}

interface WidgetProps {
  config?: string
  onNavigate?: (path: string) => void
}

// Helper functions
const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatUptime(bootTime?: string | number): string {
  if (!bootTime) return 'Unknown'
  let bootTimestamp: number
  if (typeof bootTime === 'string') {
    bootTimestamp = new Date(bootTime).getTime() / 1000
  } else {
    bootTimestamp = bootTime
  }
  if (isNaN(bootTimestamp)) return 'Unknown'
  const now = Math.floor(Date.now() / 1000)
  const uptime = now - bootTimestamp
  if (uptime < 0) return 'Unknown'
  const days = Math.floor(uptime / 86400)
  const hours = Math.floor((uptime % 86400) / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

// Stats Card Widget
export function StatsWidget({ config, onNavigate }: WidgetProps) {
  const { t } = useTranslation()
  const { data: stats } = useNetworkStats()
  const { data: historyData } = useQuery({
    queryKey: ['stats-history-dashboard'],
    queryFn: async (): Promise<StatsHistoryResponse> => {
      const response = await api.get<StatsHistoryResponse>('/stats/history-data')
      return response.data
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })

  const parsedConfig = useMemo(() => {
    try { return JSON.parse(config || '{}') } catch { return {} }
  }, [config])

  const statType = parsedConfig.stat || 'users'

  const trend = useMemo(() => {
    if (!historyData?.snapshots || historyData.snapshots.length < 2) return null
    const latest = historyData.snapshots[0]
    const hourAgo = historyData.snapshots[1]
    
    const getValue = (snapshot: StatsSnapshot) => {
      switch (statType) {
        case 'users': return snapshot.users.total
        case 'channels': return snapshot.channels.total
        case 'servers': return snapshot.servers.total
        case 'operators': return snapshot.users.operators
        default: return 0
      }
    }
    
    const current = getValue(latest)
    const previous = getValue(hourAgo)
    if (previous === 0) return null
    const change = ((current - previous) / previous) * 100
    return { value: Math.abs(Math.round(change)), isPositive: change >= 0 }
  }, [historyData, statType])

  const statConfig = {
    users: { 
      title: t('widgets.totalUsers'), 
      value: stats?.users || 0, 
      subtitle: t('widgets.connectedToNetwork'), 
      icon: Users, 
      color: 'accent',
      path: '/users'
    },
    channels: { 
      title: t('widgets.activeChannels'), 
      value: stats?.channels || 0, 
      subtitle: t('widgets.withUsers'), 
      icon: Hash, 
      color: 'green',
      path: '/channels'
    },
    servers: { 
      title: t('widgets.linkedServers'), 
      value: stats?.servers || 0, 
      subtitle: t('widgets.inNetwork'), 
      icon: Server, 
      color: 'blue',
      path: '/servers'
    },
    operators: { 
      title: t('widgets.onlineOperators'), 
      value: stats?.operators || 0, 
      subtitle: t('widgets.online'), 
      icon: Shield, 
      color: 'yellow',
      path: '/users?filter=operators'
    },
  }

  const stat = statConfig[statType as keyof typeof statConfig] || statConfig.users
  const Icon = stat.icon

  const colorClasses = {
    accent: 'bg-[var(--accent)]/20 text-[var(--accent)]',
    green: 'bg-[var(--success)]/20 text-[var(--success)]',
    blue: 'bg-[var(--info)]/20 text-[var(--info)]',
    yellow: 'bg-[var(--warning)]/20 text-[var(--warning)]',
  }

  return (
    <div 
      className="h-full p-4 flex flex-col justify-between cursor-pointer hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      onClick={() => onNavigate?.(stat.path)}
    >
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
          <Icon size={18} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${trend.isPositive ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
            {trend.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend.value}%
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-[var(--text-primary)]">{stat.value.toLocaleString()}</div>
        <div className="text-xs text-[var(--text-muted)]">{stat.title}</div>
      </div>
    </div>
  )
}

// Activity Chart Widget
export function ActivityChartWidget({ onNavigate }: WidgetProps) {
  const { t } = useTranslation()
  const { data: stats } = useNetworkStats()
  const { data: historyData } = useQuery({
    queryKey: ['stats-history-dashboard'],
    queryFn: async (): Promise<StatsHistoryResponse> => {
      const response = await api.get<StatsHistoryResponse>('/stats/history-data')
      return response.data
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })

  const chartData = useMemo(() => {
    if (historyData?.snapshots && historyData.snapshots.length > 0) {
      const snapshots = [...historyData.snapshots].reverse().slice(-24)
      return snapshots.map(snapshot => ({
        time: formatTime(snapshot.timestamp),
        users: snapshot.users.total,
        channels: snapshot.channels.total,
      }))
    }
    return [{ time: 'Now', users: stats?.users || 0, channels: stats?.channels || 0 }]
  }, [historyData, stats])

  return (
    <div 
      className="h-full p-4 flex flex-col cursor-pointer"
      onClick={() => onNavigate?.('/statistics')}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t('widgets.userActivity')}</h3>
          <p className="text-xs text-[var(--text-muted)]">{t('widgets.hourOverview')}</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]"></span>
            <span className="text-[var(--text-muted)]">{t('widgets.users')}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--success)]"></span>
            <span className="text-[var(--text-muted)]">{t('widgets.channels')}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="channelGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
            <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={10} />
            <YAxis stroke="var(--text-muted)" fontSize={10} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '12px',
              }}
            />
            <Area type="monotone" dataKey="users" stroke="var(--accent)" fill="url(#userGradient)" strokeWidth={2} />
            <Area type="monotone" dataKey="channels" stroke="var(--success)" fill="url(#channelGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Top Channels Widget
export function TopChannelsWidget({ onNavigate }: WidgetProps) {
  const { t } = useTranslation()
  const { data: channels } = useIRCChannels()

  const topChannels = channels
    ?.slice()
    .sort((a, b) => b.num_users - a.num_users)
    .slice(0, 5)

  return (
    <div className="h-full p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t('widgets.topChannels')}</h3>
          <p className="text-xs text-[var(--text-muted)]">{t('widgets.byUserCount')}</p>
        </div>
      </div>
      <div className="flex-1 overflow-auto space-y-2">
        {topChannels?.map((channel, index) => (
          <div
            key={channel.name}
            className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-tertiary)]/50 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            onClick={() => onNavigate?.(`/channels/${encodeURIComponent(channel.name)}`)}
          >
            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-xs font-medium">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--text-primary)] font-medium truncate">{channel.name}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{channel.topic || t('widgets.noTopic')}</p>
            </div>
            <div className="flex items-center gap-1 text-[var(--text-muted)]">
              <Users size={12} />
              <span className="text-xs text-[var(--text-primary)] font-medium">{channel.num_users}</span>
            </div>
          </div>
        ))}
        {(!topChannels || topChannels.length === 0) && (
          <p className="text-[var(--text-muted)] text-center py-4 text-sm">{t('widgets.noChannels')}</p>
        )}
      </div>
    </div>
  )
}

// Server Status Widget
export function ServerStatusWidget({ onNavigate }: WidgetProps) {
  const { t } = useTranslation()
  const { data: servers } = useIRCServers()
  const recentServers = servers?.slice(0, 5)

  return (
    <div 
      className="h-full p-4 flex flex-col cursor-pointer"
      onClick={() => onNavigate?.('/servers')}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t('widgets.serverStatus')}</h3>
          <p className="text-xs text-[var(--text-muted)]">{t('widgets.networkServers')}</p>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-primary)]">
              <th className="pb-2 font-medium">{t('widgets.server')}</th>
              <th className="pb-2 font-medium">{t('widgets.users')}</th>
              <th className="pb-2 font-medium">{t('widgets.uptime')}</th>
              <th className="pb-2 font-medium">{t('widgets.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-primary)]">
            {recentServers?.map((server) => (
              <tr key={server.name} className="hover:bg-[var(--bg-hover)] transition-colors">
                <td className="py-2">
                  <div className="flex items-center gap-1">
                    <Server size={12} className="text-[var(--text-muted)]" />
                    <span className="text-[var(--text-primary)] font-medium truncate max-w-[120px]">{server.name}</span>
                  </div>
                </td>
                <td className="py-2 text-[var(--text-secondary)]">{server.num_users || 0}</td>
                <td className="py-2 text-[var(--text-secondary)]">
                  <div className="flex items-center gap-1">
                    <Clock size={10} className="text-[var(--text-muted)]" />
                    {formatUptime(server.server?.boot_time)}
                  </div>
                </td>
                <td className="py-2">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-[var(--success)]/20 text-[var(--success)]">
                    <Wifi size={10} />
                    {t('widgets.ok')}
                  </span>
                </td>
              </tr>
            ))}
            {(!recentServers || recentServers.length === 0) && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-[var(--text-muted)]">{t('widgets.noServers')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Quick Links Widget
export function QuickLinksWidget({ onNavigate }: WidgetProps) {
  const { t } = useTranslation()
  const links = [
    { name: t('navigation.users'), path: '/users', icon: Users, color: 'accent' },
    { name: t('navigation.channels'), path: '/channels', icon: Hash, color: 'success' },
    { name: t('navigation.servers'), path: '/servers', icon: Server, color: 'info' },
    { name: t('navigation.serverBans'), path: '/bans/server', icon: Ban, color: 'error' },
    { name: 'Spamfilter', path: '/bans/spamfilter', icon: Shield, color: 'warning' },
    { name: 'Logs', path: '/logs', icon: FileText, color: 'info' },
    { name: t('navigation.statistics'), path: '/statistics', icon: Activity, color: 'accent' },
    { name: 'Settings', path: '/settings', icon: Settings, color: 'muted' },
  ]

  return (
    <div className="h-full p-4 flex flex-col">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t('widgets.quickLinks')}</h3>
        <p className="text-xs text-[var(--text-muted)]">{t('widgets.navigateToSections')}</p>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-2 content-start">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <button
              key={link.path}
              className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-tertiary)]/50 hover:bg-[var(--bg-hover)] transition-colors text-left"
              onClick={() => onNavigate?.(link.path)}
            >
              <Icon size={14} className={`text-[var(--${link.color})]`} />
              <span className="text-xs text-[var(--text-primary)]">{link.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Network Info Widget
export function NetworkInfoWidget({ onNavigate }: WidgetProps) {
  const { t } = useTranslation()
  const { data: stats } = useNetworkStats()

  return (
    <div 
      className="h-full p-4 flex flex-col cursor-pointer"
      onClick={() => onNavigate?.('/servers')}
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t('widgets.networkInfo')}</h3>
        <p className="text-xs text-[var(--text-muted)]">{t('widgets.connectionDetails')}</p>
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">{t('widgets.users')}</span>
          <span className="text-xs text-[var(--text-primary)] font-medium">{stats?.users || 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">{t('widgets.channels')}</span>
          <span className="text-xs text-[var(--text-primary)] font-medium">{stats?.channels || 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">{t('widgets.servers')}</span>
          <span className="text-xs text-[var(--text-primary)] font-medium">{stats?.servers || 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">{t('widgets.operators')}</span>
          <span className="text-xs text-[var(--text-primary)] font-medium">{stats?.operators || 0}</span>
        </div>
      </div>
    </div>
  )
}

// Recent Bans Widget
export function RecentBansWidget({ onNavigate }: WidgetProps) {
  const { t } = useTranslation()
  const { data: bans } = useQuery({
    queryKey: ['server-bans'],
    queryFn: async () => {
      const response = await api.get('/bans/server')
      return response.data
    },
    staleTime: 30000,
  })

  const recentBans = (bans as { name: string; type: string; set_by: string; set_at: string }[] || [])
    .slice(0, 5)

  return (
    <div 
      className="h-full p-4 flex flex-col cursor-pointer"
      onClick={() => onNavigate?.('/bans/server')}
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t('widgets.recentBans')}</h3>
        <p className="text-xs text-[var(--text-muted)]">{t('widgets.serverBans')}</p>
      </div>
      <div className="flex-1 overflow-auto space-y-2">
        {recentBans?.map((ban, i) => (
          <div key={i} className="p-2 rounded-lg bg-[var(--bg-tertiary)]/50">
            <p className="text-xs text-[var(--text-primary)] font-medium truncate">{ban.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{ban.type} by {ban.set_by}</p>
          </div>
        ))}
        {(!recentBans || recentBans.length === 0) && (
          <p className="text-[var(--text-muted)] text-center py-4 text-xs">{t('widgets.noRecentBans')}</p>
        )}
      </div>
    </div>
  )
}

// Page Shortcut Widget
export function ShortcutWidget({ config, onNavigate }: WidgetProps) {
  const parsedConfig = useMemo(() => {
    try { return JSON.parse(config || '{}') } catch { return {} }
  }, [config])

  const pageConfig: Record<string, { name: string; icon: React.ElementType; color: string; path: string }> = {
    users: { name: 'Users', icon: Users, color: 'accent', path: '/users' },
    channels: { name: 'Channels', icon: Hash, color: 'success', path: '/channels' },
    servers: { name: 'Servers', icon: Server, color: 'info', path: '/servers' },
    bans: { name: 'Bans', icon: Ban, color: 'error', path: '/bans/server' },
    spamfilter: { name: 'Spamfilter', icon: Shield, color: 'warning', path: '/bans/spamfilter' },
    logs: { name: 'Logs', icon: FileText, color: 'info', path: '/logs' },
    settings: { name: 'Settings', icon: Settings, color: 'muted', path: '/settings' },
  }

  const page = pageConfig[parsedConfig.page || 'users'] || pageConfig.users
  const Icon = page.icon
  const label = parsedConfig.label || page.name

  return (
    <div 
      className="h-full p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      onClick={() => onNavigate?.(page.path)}
    >
      <div className={`p-3 rounded-lg bg-[var(--${page.color})]/20 mb-2`}>
        <Icon size={24} className={`text-[var(--${page.color})]`} />
      </div>
      <span className="text-sm text-[var(--text-primary)] font-medium">{label}</span>
      <ExternalLink size={12} className="text-[var(--text-muted)] mt-1" />
    </div>
  )
}

// Widget Registry
export const widgetRegistry: Record<string, React.ComponentType<WidgetProps>> = {
  'stats': StatsWidget,
  'activity-chart': ActivityChartWidget,
  'top-channels': TopChannelsWidget,
  'server-status': ServerStatusWidget,
  'quick-links': QuickLinksWidget,
  'network-info': NetworkInfoWidget,
  'recent-bans': RecentBansWidget,
  'shortcut': ShortcutWidget,
}

// Widget wrapper with common styling
export function DashboardWidget({ 
  type, 
  config,
  isEditing = false,
}: { 
  type: string
  config?: string
  isEditing?: boolean
}) {
  const navigate = useNavigate()
  const Widget = widgetRegistry[type]

  const handleNavigate = (path: string) => {
    if (!isEditing) {
      navigate(path)
    }
  }

  if (!Widget) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
        Unknown widget: {type}
      </div>
    )
  }

  return (
    <div className={`h-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg overflow-hidden ${isEditing ? 'pointer-events-none opacity-90' : ''}`}>
      <Widget config={config} onNavigate={handleNavigate} />
    </div>
  )
}
