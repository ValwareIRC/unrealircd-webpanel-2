import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import type { LucideIcon } from 'lucide-react'
import {
  Users,
  Hash,
  Server,
  Shield,
  Activity,
  TrendingUp,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { PageLoading, Alert, Button } from '@/components/common'
import api from '@/services/api'

// Types for stats.history response
interface StatsSnapshot {
  timestamp: string
  users: {
    total: number
    local: number
    global_max: number
    local_max: number
    operators: number
    invisible: number
    unknown: number
  }
  channels: {
    total: number
  }
  servers: {
    total: number
    ulined: number
  }
  server_ban: {
    total: number
    gline: number
    gzline: number
    kline: number
    zline: number
    shun: number
    spamfilter: number
    qline: number
    except: number
  }
  connections: {
    total_accepted: number
    total_refused: number
    clients: number
    servers: number
    unknown: number
    auth_success: number
    auth_fail: number
    nick_collisions: number
    protocol_errors: number
  }
  traffic: {
    bytes_received: number
    bytes_sent: number
    messages_received: number
    messages_sent: number
  }
}

interface StatsHistoryResponse {
  count: number
  history_size: number
  max_available: number
  snapshot_interval_seconds: number
  snapshots: StatsSnapshot[]
}

const COLORS = [
  'var(--accent)',
  'var(--success)',
  'var(--warning)',
  'var(--error)',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
]

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatDate = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function StatisticsPage() {
  const { t } = useTranslation()
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['stats-history'],
    queryFn: async (): Promise<StatsHistoryResponse> => {
      // Request more history - up to what's available
      const response = await api.get<StatsHistoryResponse>('/stats/history-data', {
        params: { count: 168 } // Request up to a week of hourly data
      })
      return response.data
    },
    refetchInterval: 60000, // Refetch every minute
  })

  // Process data for charts
  const chartData = useMemo(() => {
    if (!data?.snapshots) return []
    // Reverse to show oldest first (left to right on timeline)
    return [...data.snapshots].reverse().map(snapshot => ({
      time: formatTime(snapshot.timestamp),
      fullTime: formatDate(snapshot.timestamp),
      timestamp: snapshot.timestamp,
      users: snapshot.users.total,
      localUsers: snapshot.users.local,
      operators: snapshot.users.operators,
      invisible: snapshot.users.invisible,
      channels: snapshot.channels.total,
      servers: snapshot.servers.total,
      ulinedServers: snapshot.servers.ulined,
      totalBans: snapshot.server_ban.total,
      glines: snapshot.server_ban.gline,
      klines: snapshot.server_ban.kline,
      zlines: snapshot.server_ban.zline,
      gzlines: snapshot.server_ban.gzline,
      shuns: snapshot.server_ban.shun,
      spamfilters: snapshot.server_ban.spamfilter,
      qlines: snapshot.server_ban.qline,
      exceptions: snapshot.server_ban.except,
      connectionsAccepted: snapshot.connections.total_accepted,
      connectionsRefused: snapshot.connections.total_refused,
      authSuccess: snapshot.connections.auth_success,
      authFail: snapshot.connections.auth_fail,
      bytesReceived: snapshot.traffic.bytes_received,
      bytesSent: snapshot.traffic.bytes_sent,
      messagesReceived: snapshot.traffic.messages_received,
      messagesSent: snapshot.traffic.messages_sent,
    }))
  }, [data])

  // Get latest snapshot for summary cards and pie charts
  const latestSnapshot = data?.snapshots?.[0]

  // Ban type distribution for pie chart
  const banDistribution = useMemo(() => {
    if (!latestSnapshot) return []
    const bans = latestSnapshot.server_ban
    return [
      { name: t('statistics.gLines'), value: bans.gline, color: COLORS[0] },
      { name: t('statistics.kLines'), value: bans.kline, color: COLORS[1] },
      { name: t('statistics.zLines'), value: bans.zline, color: COLORS[2] },
      { name: t('statistics.gzLines'), value: bans.gzline, color: COLORS[3] },
      { name: t('statistics.shuns'), value: bans.shun, color: COLORS[4] },
      { name: t('statistics.spamfilters'), value: bans.spamfilter, color: COLORS[5] },
      { name: t('statistics.qLines'), value: bans.qline, color: COLORS[6] },
    ].filter(item => item.value > 0)
  }, [latestSnapshot, t])

  // User type distribution for pie chart
  const userDistribution = useMemo(() => {
    if (!latestSnapshot) return []
    const users = latestSnapshot.users
    const regularUsers = users.total - users.operators - users.invisible
    return [
      { name: t('statistics.regularUsers'), value: Math.max(0, regularUsers), color: COLORS[0] },
      { name: t('statistics.operators'), value: users.operators, color: COLORS[1] },
      { name: t('statistics.invisible'), value: users.invisible, color: COLORS[2] },
    ].filter(item => item.value > 0)
  }, [latestSnapshot, t])

  // Connection stats for bar chart
  const connectionStats = useMemo(() => {
    if (!latestSnapshot) return []
    const conn = latestSnapshot.connections
    return [
      { name: 'Accepted', value: conn.total_accepted, fill: 'var(--success)' },
      { name: 'Refused', value: conn.total_refused, fill: 'var(--error)' },
      { name: 'Auth Success', value: conn.auth_success, fill: 'var(--accent)' },
      { name: 'Auth Fail', value: conn.auth_fail, fill: 'var(--warning)' },
    ]
  }, [latestSnapshot])

  if (isLoading) return <PageLoading />

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('statistics.title')}</h1>
          <p className="text-[var(--text-muted)] mt-1">{t('statistics.subtitle')}</p>
        </div>
        <Alert type="error">
          Failed to load statistics: {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      </div>
    )
  }

  const hasData = chartData.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('statistics.title')}</h1>
          <p className="text-[var(--text-muted)] mt-1">
            {t('statistics.subtitle')}
            {data && (
              <span className="ml-2 text-sm">
                ({data.count} snapshots, {Math.round(data.snapshot_interval_seconds / 60)} min intervals)
              </span>
            )}
          </p>
        </div>
        <Button
          variant="secondary"
          leftIcon={<RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />}
          onClick={() => refetch()}
          disabled={isFetching}
        >
          Refresh
        </Button>
      </div>

      {!hasData ? (
        <Alert type="info">
          No historical data available yet. Statistics will appear as the server collects snapshots.
        </Alert>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              title={t('statistics.currentUsers')}
              value={latestSnapshot?.users.total || 0}
              subtitle={`Peak: ${latestSnapshot?.users.global_max || 0}`}
              icon={Users}
              color="accent"
            />
            <SummaryCard
              title={t('statistics.channels')}
              value={latestSnapshot?.channels.total || 0}
              subtitle="Active channels"
              icon={Hash}
              color="green"
            />
            <SummaryCard
              title={t('statistics.servers')}
              value={latestSnapshot?.servers.total || 0}
              subtitle={`${latestSnapshot?.servers.ulined || 0} U-Lined`}
              icon={Server}
              color="blue"
            />
            <SummaryCard
              title={t('statistics.activeBans')}
              value={latestSnapshot?.server_ban.total || 0}
              subtitle="All ban types"
              icon={Shield}
              color="red"
            />
          </div>

          {/* User Activity Chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Activity size={20} className="text-[var(--accent)]" />
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t('statistics.userActivity')}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{t('statistics.userActivityDesc')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[var(--accent)]" />
                  <span className="text-[var(--text-muted)]">Users</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[var(--success)]" />
                  <span className="text-[var(--text-muted)]">Channels</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[var(--warning)]" />
                  <span className="text-[var(--text-muted)]">Operators</span>
                </div>
              </div>
            </div>
            <div className="h-80">
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
                  <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime || ''}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="var(--accent)"
                    fill="url(#userGradient)"
                    strokeWidth={2}
                    name="Users"
                  />
                  <Area
                    type="monotone"
                    dataKey="channels"
                    stroke="var(--success)"
                    fill="url(#channelGradient)"
                    strokeWidth={2}
                    name="Channels"
                  />
                  <Line
                    type="monotone"
                    dataKey="operators"
                    stroke="var(--warning)"
                    strokeWidth={2}
                    dot={false}
                    name="Operators"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Two column layout for pie charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ban Distribution Pie Chart */}
            <div className="card">
              <div className="flex items-center gap-3 mb-6">
                <Shield size={20} className="text-[var(--error)]" />
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t('statistics.banDistribution')}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{t('statistics.banDistributionDesc')}</p>
                </div>
              </div>
              <div className="h-64">
                {banDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={banDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {banDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-primary)',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                    {t('statistics.noActiveBans')}
                  </div>
                )}
              </div>
              {banDistribution.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-4 justify-center">
                  {banDistribution.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[var(--text-muted)]">{item.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Distribution Pie Chart */}
            <div className="card">
              <div className="flex items-center gap-3 mb-6">
                <Users size={20} className="text-[var(--accent)]" />
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t('statistics.userDistribution')}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{t('statistics.userDistributionDesc')}</p>
                </div>
              </div>
              <div className="h-64">
                {userDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {userDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-primary)',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                    {t('statistics.noUsersConnected')}
                  </div>
                )}
              </div>
              {userDistribution.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-4 justify-center">
                  {userDistribution.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[var(--text-muted)]">{item.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Connection Statistics Bar Chart */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp size={20} className="text-[var(--success)]" />
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t('statistics.connectionStatistics')}</h3>
                <p className="text-sm text-[var(--text-muted)]">{t('statistics.connectionStatisticsDesc')}</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={connectionStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={12} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {connectionStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Traffic Statistics */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <Activity size={20} className="text-[var(--info)]" />
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t('statistics.networkTraffic')}</h3>
                <p className="text-sm text-[var(--text-muted)]">{t('statistics.networkTrafficDesc')}</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickFormatter={(value) => formatBytes(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => formatBytes(value)}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime || ''}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="bytesReceived"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={false}
                    name={t('statistics.bytesReceived')}
                  />
                  <Line
                    type="monotone"
                    dataKey="bytesSent"
                    stroke="var(--success)"
                    strokeWidth={2}
                    dot={false}
                    name={t('statistics.bytesSent')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ban History Line Chart */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <Shield size={20} className="text-[var(--warning)]" />
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t('statistics.banHistory')}</h3>
                <p className="text-sm text-[var(--text-muted)]">{t('statistics.banHistoryDesc')}</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime || ''}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="glines" stroke={COLORS[0]} strokeWidth={2} dot={false} name={t('statistics.gLines')} />
                  <Line type="monotone" dataKey="klines" stroke={COLORS[1]} strokeWidth={2} dot={false} name={t('statistics.kLines')} />
                  <Line type="monotone" dataKey="shuns" stroke={COLORS[4]} strokeWidth={2} dot={false} name={t('statistics.shuns')} />
                  <Line type="monotone" dataKey="spamfilters" stroke={COLORS[5]} strokeWidth={2} dot={false} name={t('statistics.spamfilters')} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Server Statistics */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <Server size={20} className="text-[var(--info)]" />
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t('statistics.serverStatistics')}</h3>
                <p className="text-sm text-[var(--text-muted)]">{t('statistics.serverStatisticsDesc')}</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="serverGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--info)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--info)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime || ''}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="servers"
                    stroke="var(--info)"
                    fill="url(#serverGradient)"
                    strokeWidth={2}
                    name={t('statistics.totalServers')}
                  />
                  <Line
                    type="monotone"
                    dataKey="ulinedServers"
                    stroke="var(--warning)"
                    strokeWidth={2}
                    dot={false}
                    name={t('statistics.uLinedServers')}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Snapshot Info */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Clock size={14} />
              <span>
                {t('statistics.showingSnapshots', {
                  count: data?.count || 0,
                  max: data?.max_available || 0,
                  history: data?.history_size || 0
                })}
              </span>
              {latestSnapshot && (
                <span className="ml-auto">
                  {t('statistics.lastSnapshot', { timestamp: new Date(latestSnapshot.timestamp).toLocaleString() })}
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Summary Card Component
function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string
  value: number
  subtitle: string
  icon: LucideIcon
  color: 'accent' | 'green' | 'blue' | 'red'
}) {
  const colorClasses = {
    accent: 'bg-[var(--accent)]/20 text-[var(--accent)]',
    green: 'bg-green-500/20 text-green-400',
    blue: 'bg-blue-500/20 text-blue-400',
    red: 'bg-red-500/20 text-red-400',
  }

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{value.toLocaleString()}</p>
          <p className="text-sm text-[var(--text-muted)]">{title}</p>
          <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
        </div>
      </div>
    </div>
  )
}
