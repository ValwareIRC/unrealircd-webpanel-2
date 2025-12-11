/**
 * Ban Constants and Enums
 * Centralized definitions for server bans, spamfilters, and related constants
 */

import type { BadgeVariant } from './ui'

// ============================================================================
// Server Ban Types
// ============================================================================

export enum ServerBanType {
  GLINE = 'gline',
  KLINE = 'kline',
  GZLINE = 'gzline',
  ZLINE = 'zline',
  SHUN = 'shun',
  QLINE = 'qline',
  EXCEPT = 'except',
  ALLOW = 'allow',
}

export interface ServerBanTypeInfo {
  label: string
  shortLabel: string
  description: string
  variant: BadgeVariant
  isGlobal: boolean
}

export const SERVER_BAN_TYPES: Record<ServerBanType, ServerBanTypeInfo> = {
  [ServerBanType.GLINE]: {
    label: 'G-Line (Global)',
    shortLabel: 'G-Line',
    description: 'Global network-wide ban',
    variant: 'error',
    isGlobal: true,
  },
  [ServerBanType.KLINE]: {
    label: 'K-Line (Local)',
    shortLabel: 'K-Line',
    description: 'Local server ban',
    variant: 'warning',
    isGlobal: false,
  },
  [ServerBanType.GZLINE]: {
    label: 'GZ-Line (Global IP)',
    shortLabel: 'GZ-Line',
    description: 'Global IP-based ban',
    variant: 'error',
    isGlobal: true,
  },
  [ServerBanType.ZLINE]: {
    label: 'Z-Line (Local IP)',
    shortLabel: 'Z-Line',
    description: 'Local IP-based ban',
    variant: 'warning',
    isGlobal: false,
  },
  [ServerBanType.SHUN]: {
    label: 'Shun',
    shortLabel: 'Shun',
    description: 'Silence user (cannot send messages)',
    variant: 'info',
    isGlobal: true,
  },
  [ServerBanType.QLINE]: {
    label: 'Q-Line',
    shortLabel: 'Q-Line',
    description: 'Reserved/forbidden nickname',
    variant: 'secondary',
    isGlobal: true,
  },
  [ServerBanType.EXCEPT]: {
    label: 'Exception',
    shortLabel: 'Exception',
    description: 'Ban exception',
    variant: 'success',
    isGlobal: true,
  },
  [ServerBanType.ALLOW]: {
    label: 'Allow',
    shortLabel: 'Allow',
    description: 'Connection allow rule',
    variant: 'success',
    isGlobal: true,
  },
}

// ============================================================================
// Ban Duration Options
// ============================================================================

export interface BanDurationOption {
  value: string
  label: string
  seconds: number
}

export const BAN_DURATION_OPTIONS: BanDurationOption[] = [
  { value: '1h', label: '1 Hour', seconds: 3600 },
  { value: '6h', label: '6 Hours', seconds: 21600 },
  { value: '1d', label: '1 Day', seconds: 86400 },
  { value: '7d', label: '7 Days', seconds: 604800 },
  { value: '30d', label: '30 Days', seconds: 2592000 },
  { value: '0', label: 'Permanent', seconds: 0 },
]

export function parseBanDuration(duration: string): number {
  const option = BAN_DURATION_OPTIONS.find((opt) => opt.value === duration)
  return option?.seconds ?? 0
}

// ============================================================================
// Spamfilter Match Types
// ============================================================================

export enum SpamfilterMatchType {
  SIMPLE = 'simple',
  REGEX = 'regex',
  POSIX = 'posix',
}

export interface SpamfilterMatchTypeInfo {
  label: string
  description: string
}

export const SPAMFILTER_MATCH_TYPES: Record<SpamfilterMatchType, SpamfilterMatchTypeInfo> = {
  [SpamfilterMatchType.SIMPLE]: {
    label: 'Simple (wildcards)',
    description: 'Simple wildcard matching using * and ?',
  },
  [SpamfilterMatchType.REGEX]: {
    label: 'Regular Expression',
    description: 'Full regex pattern matching',
  },
  [SpamfilterMatchType.POSIX]: {
    label: 'POSIX Regex',
    description: 'POSIX-style regular expressions',
  },
}

// ============================================================================
// Spamfilter Actions
// ============================================================================

export enum SpamfilterAction {
  WARN = 'warn',
  BLOCK = 'block',
  KILL = 'kill',
  GLINE = 'gline',
  GZLINE = 'gzline',
  SHUN = 'shun',
  VIRUSCHAN = 'viruschan',
  DCCBLOCK = 'dccblock',
  TEMPSHUN = 'tempshun',
}

export interface SpamfilterActionInfo {
  label: string
  description: string
  severity: 'low' | 'medium' | 'high'
}

export const SPAMFILTER_ACTIONS: Record<SpamfilterAction, SpamfilterActionInfo> = {
  [SpamfilterAction.WARN]: {
    label: 'Warn',
    description: 'Send a warning to the user',
    severity: 'low',
  },
  [SpamfilterAction.BLOCK]: {
    label: 'Block',
    description: 'Block the message',
    severity: 'low',
  },
  [SpamfilterAction.KILL]: {
    label: 'Kill',
    description: 'Disconnect the user',
    severity: 'medium',
  },
  [SpamfilterAction.TEMPSHUN]: {
    label: 'Temp Shun',
    description: 'Temporarily silence the user',
    severity: 'medium',
  },
  [SpamfilterAction.SHUN]: {
    label: 'Shun',
    description: 'Permanently silence the user',
    severity: 'high',
  },
  [SpamfilterAction.GLINE]: {
    label: 'G-Line',
    description: 'Ban the user from the network',
    severity: 'high',
  },
  [SpamfilterAction.GZLINE]: {
    label: 'GZ-Line',
    description: 'IP ban the user from the network',
    severity: 'high',
  },
  [SpamfilterAction.VIRUSCHAN]: {
    label: 'Virus Channel',
    description: 'Redirect to virus quarantine channel',
    severity: 'medium',
  },
  [SpamfilterAction.DCCBLOCK]: {
    label: 'DCC Block',
    description: 'Block DCC transfers',
    severity: 'low',
  },
}

// ============================================================================
// Spamfilter Targets
// ============================================================================

export enum SpamfilterTarget {
  CHANNEL = 'c',
  PRIVATE = 'p',
  NICK = 'n',
  QUIT = 'q',
  PART = 'P',
  USER = 'u',
  AWAY = 'a',
  TOPIC = 't',
  DCC = 'd',
  MESSAGE_TAG = 'T',
  RAW = 'r',
}

export interface SpamfilterTargetInfo {
  label: string
  shortLabel: string
  description: string
}

export const SPAMFILTER_TARGETS: Record<SpamfilterTarget, SpamfilterTargetInfo> = {
  [SpamfilterTarget.CHANNEL]: {
    label: 'Channel Messages',
    shortLabel: 'Channel',
    description: 'Messages sent to channels',
  },
  [SpamfilterTarget.PRIVATE]: {
    label: 'Private Messages',
    shortLabel: 'Private',
    description: 'Private messages between users',
  },
  [SpamfilterTarget.NICK]: {
    label: 'Nickname Changes',
    shortLabel: 'Nick',
    description: 'Nickname change attempts',
  },
  [SpamfilterTarget.QUIT]: {
    label: 'Quit Messages',
    shortLabel: 'Quit',
    description: 'Messages shown when users disconnect',
  },
  [SpamfilterTarget.PART]: {
    label: 'Part Messages',
    shortLabel: 'Part',
    description: 'Messages shown when users leave channels',
  },
  [SpamfilterTarget.USER]: {
    label: 'User Info',
    shortLabel: 'User',
    description: 'User registration info (realname, etc)',
  },
  [SpamfilterTarget.AWAY]: {
    label: 'Away Messages',
    shortLabel: 'Away',
    description: 'Away status messages',
  },
  [SpamfilterTarget.TOPIC]: {
    label: 'Topic Changes',
    shortLabel: 'Topic',
    description: 'Channel topic changes',
  },
  [SpamfilterTarget.DCC]: {
    label: 'DCC',
    shortLabel: 'DCC',
    description: 'DCC file transfer requests',
  },
  [SpamfilterTarget.MESSAGE_TAG]: {
    label: 'Message Tags',
    shortLabel: 'Tags',
    description: 'IRC message tags',
  },
  [SpamfilterTarget.RAW]: {
    label: 'Raw Commands',
    shortLabel: 'Raw',
    description: 'Raw IRC commands',
  },
}

// Helper to get select options for dropdowns
export function getBanTypeOptions() {
  return Object.entries(SERVER_BAN_TYPES).map(([value, info]) => ({
    value,
    label: info.label,
  }))
}

export function getSpamfilterActionOptions() {
  return Object.entries(SPAMFILTER_ACTIONS).map(([value, info]) => ({
    value,
    label: info.label,
  }))
}

export function getSpamfilterTargetOptions() {
  return Object.entries(SPAMFILTER_TARGETS).map(([value, info]) => ({
    value,
    label: info.label,
  }))
}
