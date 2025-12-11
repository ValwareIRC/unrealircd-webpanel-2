import api from './api'
import type { User, Role, Permission, RPCServer } from '@/types'

// Panel Users
export const panelUsersService = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/panel-users')
    return response.data
  },

  get: async (id: number): Promise<User> => {
    const response = await api.get<User>(`/panel-users/${id}`)
    return response.data
  },

  create: async (data: {
    username: string
    password: string
    email?: string
    first_name?: string
    last_name?: string
    role_id: number
  }): Promise<User> => {
    const response = await api.post<User>('/panel-users', data)
    return response.data
  },

  update: async (id: number, data: Partial<User & { password?: string }>): Promise<{ message: string; password_warning?: string }> => {
    const response = await api.put<{ message: string; password_warning?: string }>(`/panel-users/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/panel-users/${id}`)
  },
}

// Roles
export const rolesService = {
  getAll: async (): Promise<Role[]> => {
    const response = await api.get<Role[]>('/roles')
    return response.data
  },

  get: async (id: number): Promise<Role> => {
    const response = await api.get<Role>(`/roles/${id}`)
    return response.data
  },

  create: async (data: {
    name: string
    description?: string
    permissions?: string[]
    is_super_admin?: boolean
  }): Promise<Role> => {
    const response = await api.post<Role>('/roles', data)
    return response.data
  },

  update: async (id: number, data: {
    name?: string
    description?: string
    permissions?: string[]
    is_super_admin?: boolean
  }): Promise<Role> => {
    const response = await api.put<Role>(`/roles/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/roles/${id}`)
  },
}

// Permissions
export const permissionsService = {
  getAll: async (): Promise<Permission[]> => {
    const response = await api.get<Permission[]>('/permissions')
    return response.data
  },

  getByCategory: async (): Promise<Record<string, Permission[]>> => {
    const response = await api.get('/permissions/categories')
    return response.data
  },
}

// RPC Servers
export const rpcServersService = {
  getAll: async (): Promise<RPCServer[]> => {
    const response = await api.get<RPCServer[]>('/rpc-servers')
    return response.data
  },

  add: async (data: {
    name: string
    host: string
    port: number
    rpc_user: string
    rpc_password: string
    tls_verify_cert?: boolean
    is_default?: boolean
  }): Promise<void> => {
    await api.post('/rpc-servers', data)
  },

  update: async (name: string, data: {
    name?: string
    host?: string
    port?: number
    rpc_user?: string
    rpc_password?: string
    tls_verify_cert?: boolean
    is_default?: boolean
  }): Promise<void> => {
    await api.put(`/rpc-servers/${encodeURIComponent(name)}`, data)
  },

  delete: async (name: string): Promise<void> => {
    await api.delete(`/rpc-servers/${encodeURIComponent(name)}`)
  },

  test: async (data: {
    host: string
    port: number
    rpc_user: string
    rpc_password: string
    tls_verify_cert?: boolean
  }): Promise<void> => {
    await api.post('/rpc-servers/test', data)
  },

  setActive: async (name: string): Promise<void> => {
    await api.post(`/rpc-servers/${encodeURIComponent(name)}/activate`)
  },
}
