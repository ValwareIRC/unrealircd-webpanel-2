import api from './api'

export interface TwoFactorSetupResponse {
  secret: string
  qr_code: string
  otpauth_url: string
  backup_codes: string[]
}

export interface TwoFactorStatusResponse {
  enabled: boolean
  backup_codes_remaining: number
}

export interface BackupCodesResponse {
  backup_codes: string[]
}

// Get current 2FA status
export async function get2FAStatus(): Promise<TwoFactorStatusResponse> {
  const response = await api.get('/auth/2fa/status')
  return response.data
}

// Start 2FA setup - returns QR code and backup codes
export async function setup2FA(): Promise<TwoFactorSetupResponse> {
  const response = await api.post('/auth/2fa/setup')
  return response.data
}

// Verify 2FA setup with a code from authenticator app
export async function verify2FASetup(code: string): Promise<void> {
  await api.post('/auth/2fa/confirm', { code })
}

// Disable 2FA (requires password and current 2FA code)
export async function disable2FA(password: string, code: string): Promise<void> {
  await api.post('/auth/2fa/disable', { password, code })
}

// Regenerate backup codes (requires current 2FA code)
export async function regenerateBackupCodes(code: string): Promise<BackupCodesResponse> {
  const response = await api.post('/auth/2fa/backup-codes', { code })
  return response.data
}

// Verify 2FA during login
export async function verify2FALogin(username: string, password: string, code: string): Promise<{
  token: string
  expires_at: string
  user: any
  password_warning?: string
}> {
  const response = await api.post('/auth/2fa/verify', { username, password, code })
  return response.data
}
