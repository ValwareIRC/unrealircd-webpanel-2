/**
 * IRC Constants and Enums
 * Centralized definitions for IRC modes, levels, and related constants
 */

// ============================================================================
// Channel Member Levels
// ============================================================================

export enum ChannelMemberLevel {
  OWNER = 'q',
  ADMIN = 'a',
  OP = 'o',
  HALFOP = 'h',
  VOICE = 'v',
  OJOIN = 'Y',
}

export interface ChannelLevelInfo {
  name: string
  symbol: string
  color: string
  order: number
}

export const CHANNEL_LEVELS: Record<ChannelMemberLevel, ChannelLevelInfo> = {
  [ChannelMemberLevel.OWNER]: {
    name: 'Owner',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    symbol: '~',
    order: 0,
  },
  [ChannelMemberLevel.ADMIN]: {
    name: 'Admin',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    symbol: '&',
    order: 1,
  },
  [ChannelMemberLevel.OP]: {
    name: 'Op',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    symbol: '@',
    order: 2,
  },
  [ChannelMemberLevel.HALFOP]: {
    name: 'Half-Op',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    symbol: '%',
    order: 3,
  },
  [ChannelMemberLevel.VOICE]: {
    name: 'Voice',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    symbol: '+',
    order: 4,
  },
  [ChannelMemberLevel.OJOIN]: {
    name: 'OJOIN',
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    symbol: '!',
    order: 5,
  },
}

// ============================================================================
// User Modes
// ============================================================================

export enum UserMode {
  OPER = 'o',
  SERVICE = 'S',
  DEAF = 'd',
  INVISIBLE = 'i',
  PRIVATE_CHANNELS = 'p',
  REGISTERED = 'r',
  SERVER_NOTICES = 's',
  VHOST = 't',
  WALLOPS = 'w',
  CLOAK = 'x',
  SECURE = 'z',
  BOT = 'B',
  PRIVDEAF = 'D',
  FILTER = 'G',
  HIDE_OPER = 'H',
  HIDE_IDLE = 'I',
  REGONLY_MSG = 'R',
  NO_CTCP = 'T',
  VIEW_WHOIS = 'W',
  DENY_INSECURE = 'Z',
}

export enum UserModeGroup {
  VISIBILITY = 'visibility',
  COMMUNICATION = 'communication',
  SECURITY = 'security',
  OPERATOR = 'operator',
  OTHER = 'other',
}

export interface UserModeInfo {
  name: string
  description: string
  group: UserModeGroup
}

export const USER_MODES: Record<UserMode, UserModeInfo> = {
  [UserMode.OPER]: {
    name: 'IRC Operator',
    description: 'User is an IRC Operator',
    group: UserModeGroup.OPERATOR,
  },
  [UserMode.SERVICE]: {
    name: 'Service Bot',
    description: 'User is a Services Bot',
    group: UserModeGroup.OPERATOR,
  },
  [UserMode.DEAF]: {
    name: 'Deaf',
    description: 'User is ignoring channel messages',
    group: UserModeGroup.COMMUNICATION,
  },
  [UserMode.INVISIBLE]: {
    name: 'Invisible',
    description: 'Not shown in /WHO searches',
    group: UserModeGroup.VISIBILITY,
  },
  [UserMode.PRIVATE_CHANNELS]: {
    name: 'Private Channels',
    description: 'Channels hidden in /WHOIS',
    group: UserModeGroup.VISIBILITY,
  },
  [UserMode.REGISTERED]: {
    name: 'Registered Nick',
    description: 'User is using a registered nick',
    group: UserModeGroup.SECURITY,
  },
  [UserMode.SERVER_NOTICES]: {
    name: 'Server Notices',
    description: 'Receiving server notices',
    group: UserModeGroup.OPERATOR,
  },
  [UserMode.VHOST]: {
    name: 'Virtual Host',
    description: 'Using a custom hostmask',
    group: UserModeGroup.VISIBILITY,
  },
  [UserMode.WALLOPS]: {
    name: 'Wallops',
    description: 'Listening to /WALLOPS',
    group: UserModeGroup.OPERATOR,
  },
  [UserMode.CLOAK]: {
    name: 'Hostmask',
    description: 'Using a cloaked hostname',
    group: UserModeGroup.VISIBILITY,
  },
  [UserMode.SECURE]: {
    name: 'Secure',
    description: 'Connected via TLS/SSL',
    group: UserModeGroup.SECURITY,
  },
  [UserMode.BOT]: {
    name: 'Bot',
    description: 'User is marked as a Bot',
    group: UserModeGroup.OTHER,
  },
  [UserMode.PRIVDEAF]: {
    name: 'PrivDeaf',
    description: 'Rejecting private messages',
    group: UserModeGroup.COMMUNICATION,
  },
  [UserMode.FILTER]: {
    name: 'Filter',
    description: 'Filtering bad words',
    group: UserModeGroup.COMMUNICATION,
  },
  [UserMode.HIDE_OPER]: {
    name: 'Hide IRCop',
    description: 'Hiding IRCop status',
    group: UserModeGroup.VISIBILITY,
  },
  [UserMode.HIDE_IDLE]: {
    name: 'Hide Idle',
    description: 'Hiding idle time',
    group: UserModeGroup.VISIBILITY,
  },
  [UserMode.REGONLY_MSG]: {
    name: 'RegOnly Messages',
    description: 'Only accepting PMs from registered users',
    group: UserModeGroup.COMMUNICATION,
  },
  [UserMode.NO_CTCP]: {
    name: 'Deny CTCPs',
    description: 'Blocking CTCP requests',
    group: UserModeGroup.COMMUNICATION,
  },
  [UserMode.VIEW_WHOIS]: {
    name: 'View /WHOIS',
    description: 'Receives WHOIS notifications',
    group: UserModeGroup.VISIBILITY,
  },
  [UserMode.DENY_INSECURE]: {
    name: 'Deny Insecure',
    description: 'Only accepting secure connections',
    group: UserModeGroup.SECURITY,
  },
}

// ============================================================================
// Channel Modes
// ============================================================================

export enum ChannelMode {
  NO_EXTERNAL = 'n',
  TOPIC_LOCK = 't',
  SECRET = 's',
  PRIVATE = 'p',
  MODERATED = 'm',
  INVITE_ONLY = 'i',
  KEY = 'k',
  LIMIT = 'l',
  REGISTERED = 'r',
  NO_COLORS = 'c',
  NO_CTCP = 'C',
  NO_NICK_CHANGE = 'N',
  OPER_ONLY = 'O',
  NO_KICKS = 'Q',
  REGISTERED_ONLY = 'R',
  STRIP_COLORS = 'S',
  NO_NOTICES = 'T',
  SECURE_ONLY = 'z',
  ALL_SECURE = 'Z',
  FLOOD = 'f',
  FLOOD_PROFILE = 'F',
  NO_KNOCK = 'K',
  NO_INVITES = 'V',
  LINK = 'L',
  MODERATED_UNREG = 'M',
  CENSORED = 'G',
  PERMANENT = 'P',
  HISTORY = 'H',
  DELAYED_JOIN = 'D',
  HAS_DELAYED = 'd',
}

export enum ChannelModeGroup {
  JOIN = 'join',
  MESSAGE = 'message',
  FLOOD = 'flood',
  VISIBILITY = 'visibility',
  OTHER = 'other',
}

export interface ChannelModeInfo {
  name: string
  description: string
  hasParam?: boolean
  group: ChannelModeGroup
}

export const CHANNEL_MODES: Record<ChannelMode, ChannelModeInfo> = {
  [ChannelMode.NO_EXTERNAL]: {
    name: 'No External Messages',
    description: 'Only channel members can send messages',
    group: ChannelModeGroup.MESSAGE,
  },
  [ChannelMode.TOPIC_LOCK]: {
    name: 'Topic Protection',
    description: 'Only ops can change the topic',
    group: ChannelModeGroup.OTHER,
  },
  [ChannelMode.SECRET]: {
    name: 'Secret',
    description: 'Channel is hidden from /LIST and /WHOIS',
    group: ChannelModeGroup.VISIBILITY,
  },
  [ChannelMode.PRIVATE]: {
    name: 'Private',
    description: 'Channel is private',
    group: ChannelModeGroup.VISIBILITY,
  },
  [ChannelMode.MODERATED]: {
    name: 'Moderated',
    description: 'Only voiced users and ops can speak',
    group: ChannelModeGroup.MESSAGE,
  },
  [ChannelMode.INVITE_ONLY]: {
    name: 'Invite Only',
    description: 'Users must be invited to join',
    group: ChannelModeGroup.JOIN,
  },
  [ChannelMode.KEY]: {
    name: 'Key',
    description: 'Channel requires a password to join',
    hasParam: true,
    group: ChannelModeGroup.JOIN,
  },
  [ChannelMode.LIMIT]: {
    name: 'Limit',
    description: 'Maximum number of users in the channel',
    hasParam: true,
    group: ChannelModeGroup.JOIN,
  },
  [ChannelMode.REGISTERED]: {
    name: 'Registered',
    description: 'Channel is registered with services',
    group: ChannelModeGroup.OTHER,
  },
  [ChannelMode.NO_COLORS]: {
    name: 'No Colors',
    description: 'Color codes are blocked',
    group: ChannelModeGroup.MESSAGE,
  },
  [ChannelMode.NO_CTCP]: {
    name: 'No CTCPs',
    description: 'CTCPs to channel are blocked',
    group: ChannelModeGroup.MESSAGE,
  },
  [ChannelMode.NO_NICK_CHANGE]: {
    name: 'No Nickname Changes',
    description: 'Users cannot change nick while in channel',
    group: ChannelModeGroup.OTHER,
  },
  [ChannelMode.OPER_ONLY]: {
    name: 'Opers Only',
    description: 'Only IRC operators can join',
    group: ChannelModeGroup.JOIN,
  },
  [ChannelMode.NO_KICKS]: {
    name: 'No Kicks',
    description: 'Users cannot be kicked from the channel',
    group: ChannelModeGroup.OTHER,
  },
  [ChannelMode.REGISTERED_ONLY]: {
    name: 'Registered Only',
    description: 'Only registered users can join',
    group: ChannelModeGroup.JOIN,
  },
  [ChannelMode.STRIP_COLORS]: {
    name: 'Strip Colors',
    description: 'Color codes are stripped from messages',
    group: ChannelModeGroup.MESSAGE,
  },
  [ChannelMode.NO_NOTICES]: {
    name: 'No Notices',
    description: 'Channel notices are blocked',
    group: ChannelModeGroup.MESSAGE,
  },
  [ChannelMode.SECURE_ONLY]: {
    name: 'Secure Only',
    description: 'Only users connected via TLS can join',
    group: ChannelModeGroup.JOIN,
  },
  [ChannelMode.ALL_SECURE]: {
    name: 'All Secure',
    description: 'All users in channel are using TLS',
    group: ChannelModeGroup.VISIBILITY,
  },
  [ChannelMode.FLOOD]: {
    name: 'Flood Protection',
    description: 'Flood protection settings',
    hasParam: true,
    group: ChannelModeGroup.FLOOD,
  },
  [ChannelMode.FLOOD_PROFILE]: {
    name: 'Flood Profile',
    description: 'Pre-configured flood protection profile',
    hasParam: true,
    group: ChannelModeGroup.FLOOD,
  },
  [ChannelMode.NO_KNOCK]: {
    name: 'No Knock',
    description: 'Users cannot /KNOCK on this channel',
    group: ChannelModeGroup.JOIN,
  },
  [ChannelMode.NO_INVITES]: {
    name: 'No Invites',
    description: 'Users cannot invite others to this channel',
    group: ChannelModeGroup.JOIN,
  },
  [ChannelMode.LINK]: {
    name: 'Link',
    description: 'Channel is linked to another channel',
    hasParam: true,
    group: ChannelModeGroup.OTHER,
  },
  [ChannelMode.MODERATED_UNREG]: {
    name: 'Moderated (Unreg)',
    description: 'Unregistered users cannot speak',
    group: ChannelModeGroup.MESSAGE,
  },
  [ChannelMode.CENSORED]: {
    name: 'Censored',
    description: 'Bad words are filtered',
    group: ChannelModeGroup.MESSAGE,
  },
  [ChannelMode.PERMANENT]: {
    name: 'Permanent',
    description: 'Channel persists when empty',
    group: ChannelModeGroup.OTHER,
  },
  [ChannelMode.HISTORY]: {
    name: 'History',
    description: 'Channel history is enabled',
    hasParam: true,
    group: ChannelModeGroup.OTHER,
  },
  [ChannelMode.DELAYED_JOIN]: {
    name: 'Delayed Join',
    description: 'Users are invisible until they speak',
    group: ChannelModeGroup.VISIBILITY,
  },
  [ChannelMode.HAS_DELAYED]: {
    name: 'Has Delayed',
    description: 'Channel has users with delayed join',
    group: ChannelModeGroup.VISIBILITY,
  },
}

// Helper functions
export function getUserModesByGroup(group: UserModeGroup): UserMode[] {
  return Object.entries(USER_MODES)
    .filter(([, info]) => info.group === group)
    .map(([mode]) => mode as UserMode)
}

export function getChannelModesByGroup(group: ChannelModeGroup): ChannelMode[] {
  return Object.entries(CHANNEL_MODES)
    .filter(([, info]) => info.group === group)
    .map(([mode]) => mode as ChannelMode)
}

export function getChannelLevelOrder(level: string): number {
  return CHANNEL_LEVELS[level as ChannelMemberLevel]?.order ?? 99
}
