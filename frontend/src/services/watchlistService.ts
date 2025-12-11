import api from './api'

export interface MatchedIRCUser {
  nick: string
  username: string
  hostname: string
  ip: string
  realname: string
  account: string
}

export interface WatchedUser {
  id: number
  created_at: string
  updated_at: string
  nick?: string
  ip?: string
  host?: string
  account?: string
  realname?: string
  reason: string
  added_by: number
  added_by_username: string
  last_seen?: string
  match_count: number
  current_matches?: MatchedIRCUser[]
}

export interface WatchedUserRequest {
  nick?: string
  ip?: string
  host?: string
  account?: string
  realname?: string
  reason: string
}

export async function getWatchedUsers(): Promise<WatchedUser[]> {
  const response = await api.get('/watchlist')
  return response.data
}

export async function getWatchedUser(id: number): Promise<WatchedUser> {
  const response = await api.get(`/watchlist/${id}`)
  return response.data
}

export async function addWatchedUser(data: WatchedUserRequest): Promise<WatchedUser> {
  const response = await api.post('/watchlist', data)
  return response.data
}

export async function updateWatchedUser(id: number, data: WatchedUserRequest): Promise<WatchedUser> {
  const response = await api.put(`/watchlist/${id}`, data)
  return response.data
}

export async function deleteWatchedUser(id: number): Promise<void> {
  await api.delete(`/watchlist/${id}`)
}
