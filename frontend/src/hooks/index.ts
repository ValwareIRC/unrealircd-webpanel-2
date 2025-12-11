export { useAuth, AuthProvider } from '@/contexts/AuthContext'
export { useSSE } from './useSSE'

// IRC hooks
export {
  useIRCUsers,
  useIRCUser,
  useKillUser,
  useBanUser,
  useSetUserMode,
  useSetUserVhost,
  useIRCChannels,
  useIRCChannel,
  useSetChannelTopic,
  useSetChannelMode,
  useKickUser,
  useIRCServers,
  useIRCServer,
  useRehashServer,
  useServerBans,
  useAddServerBan,
  useDeleteServerBan,
  useNameBans,
  useAddNameBan,
  useDeleteNameBan,
  useBanExceptions,
  useAddBanException,
  useDeleteBanException,
  useSpamfilters,
  useAddSpamfilter,
  useDeleteSpamfilter,
  useNetworkStats,
  useLogs,
} from './useIRC'

// Settings hooks
export {
  usePanelUsers,
  usePanelUser,
  useCreatePanelUser,
  useUpdatePanelUser,
  useDeletePanelUser,
  useRoles,
  useRole,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  usePermissions,
  useRPCServers,
  useAddRPCServer,
  useUpdateRPCServer,
  useDeleteRPCServer,
  useTestRPCServer,
  useSetActiveRPCServer,
} from './useSettings'

export { useKeyboardShortcuts, useCommandPalette } from './useKeyboardShortcuts'
