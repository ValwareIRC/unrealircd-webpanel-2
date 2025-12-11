import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User } from '@/types'
import { authService } from '@/services/auth'

interface LoginResult {
  success: boolean
  requires2FA?: boolean
  passwordWarning?: string
  // Store credentials temporarily for 2FA verification
  pendingCredentials?: { username: string; password: string }
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<LoginResult>
  verify2FA: (username: string, password: string, code: string) => Promise<string | undefined>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setUser(null)
        return
      }

      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } catch {
      setUser(null)
      localStorage.removeItem('token')
    }
  }, [])

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)
      await refreshUser()
      setIsLoading(false)
    }
    initAuth()
  }, [refreshUser])

  const login = async (username: string, password: string): Promise<LoginResult> => {
    const response = await authService.login(username, password)
    
    // Check if 2FA is required
    if (response.requires_2fa) {
      return {
        success: false,
        requires2FA: true,
        pendingCredentials: { username, password }
      }
    }
    
    // Token and user should always be present when not requiring 2FA
    if (!response.token || !response.user) {
      throw new Error('Invalid login response')
    }
    
    localStorage.setItem('token', response.token)
    if (response.refresh_token) {
      localStorage.setItem('refresh_token', response.refresh_token)
    }
    setUser(response.user)
    return {
      success: true,
      passwordWarning: response.password_warning
    }
  }

  const verify2FA = async (username: string, password: string, code: string): Promise<string | undefined> => {
    const response = await authService.verify2FA(username, password, code)
    
    if (!response.token || !response.user) {
      throw new Error('Invalid verification response')
    }
    
    localStorage.setItem('token', response.token)
    if (response.refresh_token) {
      localStorage.setItem('refresh_token', response.refresh_token)
    }
    setUser(response.user)
    return response.password_warning
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      setUser(null)
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.role) return false
    if (user.role.is_super_admin) return true
    return user.role.permissions?.some(p => p.name === permission) ?? false
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        verify2FA,
        logout,
        refreshUser,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
