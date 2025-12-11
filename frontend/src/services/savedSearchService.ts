import api from './api'

export interface SavedSearch {
  id: number
  created_at: string
  updated_at: string
  user_id: number
  name: string
  page: string
  query: string
  filters: string
  is_global: boolean
  use_count: number
  last_used?: string
}

export interface SavedSearchRequest {
  name: string
  page: string
  query?: string
  filters?: string
  is_global?: boolean
}

export async function getSavedSearches(page?: string): Promise<SavedSearch[]> {
  const params = page ? { page } : {}
  const response = await api.get('/saved-searches', { params })
  return response.data
}

export async function getSavedSearch(id: number): Promise<SavedSearch> {
  const response = await api.get(`/saved-searches/${id}`)
  return response.data
}

export async function createSavedSearch(data: SavedSearchRequest): Promise<SavedSearch> {
  const response = await api.post('/saved-searches', data)
  return response.data
}

export async function updateSavedSearch(id: number, data: SavedSearchRequest): Promise<SavedSearch> {
  const response = await api.put(`/saved-searches/${id}`, data)
  return response.data
}

export async function deleteSavedSearch(id: number): Promise<void> {
  await api.delete(`/saved-searches/${id}`)
}

export async function useSavedSearch(id: number): Promise<SavedSearch> {
  const response = await api.post(`/saved-searches/${id}/use`)
  return response.data
}
