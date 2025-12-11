import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { panelUsersService, rolesService, permissionsService, rpcServersService } from '@/services/settings'
import type { User, Role, Permission, RPCServer } from '@/types'

// Panel Users
export function usePanelUsers(options?: Partial<UseQueryOptions<User[]>>) {
  return useQuery({
    queryKey: ['panel', 'users'],
    queryFn: panelUsersService.getAll,
    ...options,
  })
}

export function usePanelUser(id: number, options?: Partial<UseQueryOptions<User>>) {
  return useQuery({
    queryKey: ['panel', 'users', id],
    queryFn: () => panelUsersService.get(id),
    enabled: !!id,
    ...options,
  })
}

export function useCreatePanelUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: panelUsersService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel', 'users'] })
    },
  })
}

export function useUpdatePanelUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Parameters<typeof panelUsersService.update>[1]) =>
      panelUsersService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel', 'users'] })
    },
  })
}

export function useDeletePanelUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: panelUsersService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel', 'users'] })
    },
  })
}

// Roles
export function useRoles(options?: Partial<UseQueryOptions<Role[]>>) {
  return useQuery({
    queryKey: ['panel', 'roles'],
    queryFn: rolesService.getAll,
    ...options,
  })
}

export function useRole(id: number, options?: Partial<UseQueryOptions<Role>>) {
  return useQuery({
    queryKey: ['panel', 'roles', id],
    queryFn: () => rolesService.get(id),
    enabled: !!id,
    ...options,
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: rolesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel', 'roles'] })
    },
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { 
      id: number
      name?: string
      description?: string
      permissions?: string[]
      is_super_admin?: boolean
    }) => rolesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel', 'roles'] })
    },
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: rolesService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel', 'roles'] })
    },
  })
}

// Permissions
export function usePermissions(options?: Partial<UseQueryOptions<Permission[]>>) {
  return useQuery({
    queryKey: ['panel', 'permissions'],
    queryFn: permissionsService.getAll,
    ...options,
  })
}

// RPC Servers
export function useRPCServers(options?: Partial<UseQueryOptions<RPCServer[]>>) {
  return useQuery({
    queryKey: ['rpc', 'servers'],
    queryFn: rpcServersService.getAll,
    ...options,
  })
}

export function useAddRPCServer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: rpcServersService.add,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rpc', 'servers'] })
    },
  })
}

export function useUpdateRPCServer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, ...data }: { name: string } & Parameters<typeof rpcServersService.update>[1]) =>
      rpcServersService.update(name, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rpc', 'servers'] })
    },
  })
}

export function useDeleteRPCServer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: rpcServersService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rpc', 'servers'] })
    },
  })
}

export function useTestRPCServer() {
  return useMutation({
    mutationFn: rpcServersService.test,
  })
}

export function useSetActiveRPCServer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: rpcServersService.setActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rpc', 'servers'] })
    },
  })
}
