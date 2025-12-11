import api from './api'
import type { LoginResponse, User } from '@/types'

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', { username, password })
    return response.data
  },

  verify2FA: async (username: string, password: string, code: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/2fa/verify', { username, password, code })
    return response.data
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me')
    return response.data
  },

  getSession: async (): Promise<{ session: string; user?: User }> => {
    const response = await api.get('/auth/session')
    return response.data
  },

  getPermissions: async (): Promise<{ is_super_admin: boolean; permissions: string[] }> => {
    const response = await api.get('/auth/permissions')
    return response.data
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string; password_warning?: string }> => {
    const response = await api.post<{ message: string; password_warning?: string }>('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
    return response.data
  },

  updateProfile: async (data: Partial<User>): Promise<void> => {
    await api.put('/auth/profile', data)
  },
}
