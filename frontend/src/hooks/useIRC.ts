import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { usersService, channelsService, serversService, bansService, statsService, logsService } from '@/services/irc'
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

// Users - auto-refresh every 5 seconds for live updates
export function useIRCUsers(options?: Partial<UseQueryOptions<IRCUser[]>>) {
  return useQuery({
    queryKey: ['irc', 'users'],
    queryFn: usersService.getAll,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    staleTime: 4000, // Consider data stale after 4 seconds
    ...options,
  })
}

export function useIRCUser(nick: string, options?: Partial<UseQueryOptions<IRCUser>>) {
  return useQuery({
    queryKey: ['irc', 'users', nick],
    queryFn: () => usersService.get(nick),
    enabled: !!nick,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    staleTime: 4000,
    ...options,
  })
}

export function useKillUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ nick, reason }: { nick: string; reason: string }) =>
      usersService.kill(nick, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['irc', 'users'] })
    },
  })
}

export function useBanUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: usersService.ban,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['irc', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['irc', 'bans'] })
    },
  })
}

export function useSetUserMode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ nick, modes, params }: { nick: string; modes: string; params?: string }) =>
      usersService.setMode(nick, modes, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['irc', 'users'] })
    },
  })
}

export function useSetUserVhost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ nick, vhost }: { nick: string; vhost: string }) =>
      usersService.setVhost(nick, vhost),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['irc', 'users'] })
    },
  })
}

// Channels - auto-refresh every 5 seconds
export function useIRCChannels(options?: Partial<UseQueryOptions<IRCChannel[]>>) {
  return useQuery({
    queryKey: ['irc', 'channels'],
    queryFn: channelsService.getAll,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    staleTime: 4000,
    ...options,
  })
}

export function useIRCChannel(name: string, options?: Partial<UseQueryOptions<IRCChannel>>) {
  return useQuery({
    queryKey: ['irc', 'channels', name],
    queryFn: () => channelsService.get(name),
    enabled: !!name,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    staleTime: 4000,
    ...options,
  })
}

export function useSetChannelTopic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ channel, topic, setBy }: { channel: string; topic: string; setBy?: string }) =>
      channelsService.setTopic(channel, topic, setBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['irc', 'channels'] })
    },
  })
}

export function useSetChannelMode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ channel, modes, params }: { channel: string; modes: string; params?: string }) =>
      channelsService.setMode(channel, modes, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['irc', 'channels'] })
    },
  })
}

export function useKickUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ channel, nick, reason }: { channel: string; nick: string; reason?: string }) =>
      channelsService.kick(channel, nick, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['irc', 'channels'] })
    },
  })
}

// Servers - auto-refresh every 10 seconds (less frequent as servers change rarely)
export function useIRCServers(options?: Partial<UseQueryOptions<IRCServer[]>>) {
  return useQuery({
    queryKey: ['irc', 'servers'],
    queryFn: serversService.getAll,
    refetchInterval: 10000,
    staleTime: 8000,
    ...options,
  })
}

export function useIRCServer(name: string, options?: Partial<UseQueryOptions<IRCServer>>) {
  return useQuery({
    queryKey: ['irc', 'servers', name],
    queryFn: () => serversService.get(name),
    enabled: !!name,
    refetchInterval: 10000,
    staleTime: 8000,
    ...options,
  })
}

export function useRehashServer() {
  return useMutation({
    mutationFn: serversService.rehash,
  })
}

// Server Bans
export function useServerBans(options?: Partial<UseQueryOptions<ServerBan[]>>) {
  return useQuery({
    queryKey: ['irc', 'bans', 'server'],
    queryFn: bansService.getServerBans,
    ...options,
  })
}

export function useAddServerBan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: bansService.addServerBan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['irc', 'bans', 'server'] })
    },
  })
}

export function useDeleteServerBan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, type }: { name: string; type: string }) =>
      bansService.deleteServerBan(name, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['irc', 'bans', 'server'] })
    },
  })
}

// Name Bans
export function useNameBans(options?: Partial<UseQueryOptions<NameBan[]>>) {
  return useQuery({
    queryKey: ['irc', 'bans', 'name'],
    queryFn: bansService.getNameBans,
    ...options,
  })
}

export function useAddNameBan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: bansService.addNameBan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['irc', 'bans', 'name'] })
    },
  })
}

export function useDeleteNameBan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, type }: { name: string; type: string }) =>
      bansService.deleteNameBan(name, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['irc', 'bans', 'name'] })
    },
  })
}

// Ban Exceptions
export function useBanExceptions(options?: Partial<UseQueryOptions<BanException[]>>) {
  return useQuery({
    queryKey: ['irc', 'bans', 'exceptions'],
    queryFn: bansService.getBanExceptions,
    ...options,
  })
}

export function useAddBanException() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: bansService.addBanException,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['irc', 'bans', 'exceptions'] })
    },
  })
}

export function useDeleteBanException() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: bansService.deleteBanException,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['irc', 'bans', 'exceptions'] })
    },
  })
}

// Spamfilters
export function useSpamfilters(options?: Partial<UseQueryOptions<Spamfilter[]>>) {
  return useQuery({
    queryKey: ['irc', 'spamfilters'],
    queryFn: bansService.getSpamfilters,
    ...options,
  })
}

export function useAddSpamfilter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: bansService.addSpamfilter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['irc', 'spamfilters'] })
    },
  })
}


export function useDeleteSpamfilter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: bansService.deleteSpamfilter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['irc', 'spamfilters'] })
    },
  })
}

// Stats
export function useNetworkStats(options?: Partial<UseQueryOptions<NetworkStats>>) {
  return useQuery({
    queryKey: ['irc', 'stats'],
    queryFn: statsService.get,
    refetchInterval: 30000, // Refetch every 30 seconds
    ...options,
  })
}

// Logs
export function useLogs(sources?: string[], options?: Partial<UseQueryOptions<LogEntry[]>>) {
  return useQuery({
    queryKey: ['irc', 'logs', sources],
    queryFn: () => logsService.getAll(sources),
    refetchInterval: false, // Don't auto-refetch, we use SSE for live updates
    staleTime: Infinity, // Keep data fresh until manually invalidated
    ...options,
  })
}
