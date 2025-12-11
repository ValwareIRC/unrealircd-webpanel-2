import api from './api'

export interface UserJourneyEvent {
  id: number
  created_at: string
  nick: string
  ip: string
  account: string
  event_type: string
  details: string // JSON object
  server: string
}

export interface JourneyEventType {
  type: string
  description: string
  category: string
}

// Alias for convenience
export type EventTypeInfo = JourneyEventType

export interface JourneyStats {
  event_types: Array<{ event_type: string; count: number }>
  activity: { hour: number; day: number; week: number }
  unique_users: number
}

export interface SearchJourneyRequest {
  nick?: string
  ip?: string
  account?: string
  event_types?: string[]
  start_time?: string
  end_time?: string
  server?: string
  limit?: number
}

// Get user journey by query params
export async function getUserJourney(params: { nick?: string; ip?: string; account?: string; hours?: number; limit?: number }): Promise<UserJourneyEvent[]> {
  const response = await api.get('/journey', { params })
  return response.data
}

// Get user journey by nick
export async function getUserJourneyByNick(nick: string): Promise<UserJourneyEvent[]> {
  const response = await api.get(`/journey/user/${encodeURIComponent(nick)}`)
  return response.data
}

// Get journey stats
export async function getJourneyStats(): Promise<JourneyStats> {
  const response = await api.get('/journey/stats')
  return response.data
}

// Get event types
export async function getJourneyEventTypes(): Promise<JourneyEventType[]> {
  const response = await api.get('/journey/event-types')
  return response.data
}

// Search journey events
export async function searchJourneyEvents(request: SearchJourneyRequest): Promise<UserJourneyEvent[]> {
  const response = await api.post('/journey/search', request)
  return response.data
}

// Cleanup old events
export async function cleanupOldJourneyEvents(days?: number): Promise<{ deleted: number; cutoff: string }> {
  const response = await api.delete('/journey/cleanup', { params: { days } })
  return response.data
}

// Helper to parse event details
export function parseEventDetails(event: UserJourneyEvent): Record<string, unknown> {
  try {
    return JSON.parse(event.details) || {}
  } catch {
    return {}
  }
}

// Event type colors for UI
export const eventTypeColors: Record<string, string> = {
  connect: 'bg-green-500',
  disconnect: 'bg-red-500',
  nick_change: 'bg-blue-500',
  account_login: 'bg-purple-500',
  join: 'bg-teal-500',
  part: 'bg-orange-500',
  kick: 'bg-yellow-500',
  ban: 'bg-red-600',
  unban: 'bg-green-600',
  kill: 'bg-red-700',
  oper: 'bg-purple-600',
  deoper: 'bg-purple-400',
  mode_change: 'bg-indigo-500',
  message: 'bg-gray-500',
}

// Event type icons (lucide icon names)
export const eventTypeIcons: Record<string, string> = {
  connect: 'LogIn',
  disconnect: 'LogOut',
  nick_change: 'Edit',
  account_login: 'User',
  join: 'UserPlus',
  part: 'UserMinus',
  kick: 'UserX',
  ban: 'Ban',
  unban: 'Check',
  kill: 'Skull',
  oper: 'Shield',
  deoper: 'ShieldOff',
  mode_change: 'Settings',
  message: 'MessageSquare',
}
