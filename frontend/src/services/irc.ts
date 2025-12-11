import api from './api'
import type {
  IRCUser,
  IRCChannel,
  IRCServer,
  ServerBan,
  NameBan,
  BanException,
  Spamfilter,
  NetworkStats,
  LogEntry,
} from '@/types'

// Debug logging helper
const isDebugMode = () => {
  const debug = localStorage.getItem('debug_mode') === 'true'
  return debug
}

const debugLog = (message: string, ...args: unknown[]) => {
  if (isDebugMode()) {
    console.log(`[IRC Service] ${message}`, ...args)
  }
}

// Users
export const usersService = {
  getAll: async (): Promise<IRCUser[]> => {
    const response = await api.get<IRCUser[]>('/users')
    debugLog('Users API response:', response.data)
    return response.data
  },

  get: async (nick: string): Promise<IRCUser> => {
    const response = await api.get<IRCUser>(`/users/${encodeURIComponent(nick)}`)
    return response.data
  },

  kill: async (nick: string, reason: string): Promise<void> => {
    await api.post(`/users/${encodeURIComponent(nick)}/kill`, { reason })
  },

  setNick: async (nick: string, newNick: string): Promise<void> => {
    await api.post(`/users/${encodeURIComponent(nick)}/nick`, { new_nick: newNick })
  },

  setMode: async (nick: string, modes: string, params?: string): Promise<void> => {
    await api.post(`/users/${encodeURIComponent(nick)}/mode`, { modes, params })
  },

  setVhost: async (nick: string, vhost: string): Promise<void> => {
    await api.post(`/users/${encodeURIComponent(nick)}/vhost`, { vhost })
  },

  ban: async (data: { nick: string; type: string; reason: string; duration: string }): Promise<void> => {
    await api.post(`/users/${encodeURIComponent(data.nick)}/ban`, data)
  },
}

// Channels
export const channelsService = {
  getAll: async (): Promise<IRCChannel[]> => {
    const response = await api.get<IRCChannel[]>('/channels')
    debugLog('Channels API response:', response.data)
    return response.data
  },

  get: async (name: string): Promise<IRCChannel> => {
    const response = await api.get<IRCChannel>(`/channels/${encodeURIComponent(name)}`)
    return response.data
  },

  setTopic: async (name: string, topic: string, _setBy?: string): Promise<void> => {
    await api.put(`/channels/${encodeURIComponent(name)}/topic`, { topic })
  },

  setMode: async (name: string, modes: string, params?: string): Promise<void> => {
    await api.post(`/channels/${encodeURIComponent(name)}/mode`, { modes, params })
  },

  kick: async (name: string, nick: string, reason?: string): Promise<void> => {
    await api.post(`/channels/${encodeURIComponent(name)}/kick`, { nick, reason })
  },
}

// Servers
export const serversService = {
  getAll: async (): Promise<IRCServer[]> => {
    const response = await api.get<IRCServer[]>('/servers')
    debugLog('Servers API response:', response.data)
    return response.data
  },

  get: async (name: string): Promise<IRCServer> => {
    const response = await api.get<IRCServer>(`/servers/${encodeURIComponent(name)}`)
    return response.data
  },

  rehash: async (name: string): Promise<void> => {
    await api.post(`/servers/${encodeURIComponent(name)}/rehash`)
  },

  getModules: async (name: string): Promise<unknown[]> => {
    const response = await api.get(`/servers/${encodeURIComponent(name)}/modules`)
    return response.data
  },
}

// Server Bans
export const bansService = {
  // Server bans (G/K/Z-Lines)
  getServerBans: async (): Promise<ServerBan[]> => {
    const response = await api.get<ServerBan[]>('/bans/server')
    return response.data
  },

  addServerBan: async (data: { name: string; type: string; duration: string; reason: string }): Promise<void> => {
    await api.post('/bans/server', data)
  },

  deleteServerBan: async (name: string, type: string): Promise<void> => {
    await api.delete('/bans/server', { data: { name, type } })
  },

  // Name bans (Q-Lines)
  getNameBans: async (): Promise<NameBan[]> => {
    const response = await api.get<NameBan[]>('/bans/name')
    return response.data
  },

  addNameBan: async (data: { type: string; name: string; reason: string; duration: string }): Promise<void> => {
    await api.post('/bans/name', data)
  },

  deleteNameBan: async (name: string, type: string): Promise<void> => {
    await api.delete(`/bans/name/${encodeURIComponent(name)}`, { data: { type } })
  },

  // Ban exceptions (E-Lines)
  getBanExceptions: async (): Promise<BanException[]> => {
    const response = await api.get<BanException[]>('/bans/exceptions')
    return response.data
  },

  addBanException: async (data: { name: string; types: string; reason: string }): Promise<void> => {
    await api.post('/bans/exceptions', data)
  },

  deleteBanException: async (name: string): Promise<void> => {
    await api.delete(`/bans/exceptions/${encodeURIComponent(name)}`)
  },

  // Spamfilters
  getSpamfilters: async (): Promise<Spamfilter[]> => {
    const response = await api.get<Spamfilter[]>('/bans/spamfilter')
    return response.data
  },

  addSpamfilter: async (data: {
    match_type: string
    match: string
    targets: string
    action: string
    action_duration: string
    reason: string
  }): Promise<void> => {
    await api.post('/bans/spamfilter', {
      name: data.match,
      match_type: data.match_type,
      spamfilter_targets: data.targets,
      ban_action: data.action,
      ban_duration: data.action_duration,
      reason: data.reason,
    })
  },

  deleteSpamfilter: async (data: {
    match: string
    match_type: string
    targets: string
    action: string
  }): Promise<void> => {
    await api.delete('/bans/spamfilter', {
      data: {
        name: data.match,
        match_type: data.match_type,
        spamfilter_targets: data.targets,
        ban_action: data.action,
      },
    })
  },
}

// Stats
export const statsService = {
  get: async (): Promise<NetworkStats> => {
    const response = await api.get<NetworkStats>('/stats')
    debugLog('Stats API response:', response)
    debugLog('Stats response.data:', response.data)
    return response.data
  },
}

// Logs
export const logsService = {
  getAll: async (sources?: string[]): Promise<LogEntry[]> => {
    // Build query string manually to ensure proper array param format
    let url = '/logs'
    if (sources && sources.length > 0) {
      const params = new URLSearchParams()
      sources.forEach(s => params.append('source', s))
      url += '?' + params.toString()
    }
    const response = await api.get(url)
    // The response might be raw log objects - transform them
    return transformLogs(response.data || [])
  },

  // Get SSE stream URL for live logs
  getStreamUrl: (sources?: string[]): string => {
    const baseUrl = api.defaults.baseURL || ''
    const params = new URLSearchParams()
    if (sources && sources.length > 0) {
      sources.forEach(s => params.append('source', s))
    }
    const queryString = params.toString()
    return `${baseUrl}/logs/stream${queryString ? `?${queryString}` : ''}`
  },
}

// Helper to transform raw log entries
function transformLogs(logs: unknown[]): LogEntry[] {
  if (!Array.isArray(logs)) return []
  
  return logs.map((log) => {
    const entry = log as Record<string, unknown>
    return {
      timestamp: (entry.timestamp as string) || (entry.time as string) || '',
      level: (entry.level as string) || 'info',
      subsystem: (entry.subsystem as string) || '',
      event_id: (entry.event_id as string) || (entry.event as string) || '',
      msg: (entry.msg as string) || (entry.message as string) || '',
      log_source: (entry.log_source as string) || '',
      raw: entry,
    }
  })
}

// Search
export const searchService = {
  global: async (query: string): Promise<{
    users: IRCUser[]
    channels: IRCChannel[]
    bans: ServerBan[]
  }> => {
    const response = await api.get('/search', { params: { q: query } })
    return response.data
  },
}
