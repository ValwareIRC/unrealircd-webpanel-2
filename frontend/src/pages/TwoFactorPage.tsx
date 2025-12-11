import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks'
import { 
  get2FAStatus, 
  setup2FA, 
  verify2FASetup, 
  disable2FA, 
  regenerateBackupCodes,
  TwoFactorSetupResponse, 
  TwoFactorStatusResponse 
} from '@/services/twoFactorService'
import { Button, Input, Alert } from '@/components/common'
import { Shield, ShieldOff, ShieldCheck, Copy, RefreshCw, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export function TwoFactorPage() {
  const { } = useAuth()
  const [status, setStatus] = useState<TwoFactorStatusResponse | null>(null)
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [disablePassword, setDisablePassword] = useState('')
  const [regenCode, setRegenCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'status' | 'setup' | 'verify' | 'disable' | 'backup-codes' | 'regen-confirm'>('status')

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    try {
      setIsLoading(true)
      const data = await get2FAStatus()
      setStatus(data)
      setStep('status')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load 2FA status'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const startSetup = async () => {
    try {
      setIsSubmitting(true)
      setError(null)
      const data = await setup2FA()
      setSetupData(data)
      setStep('setup')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start 2FA setup'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      setError(null)
      await verify2FASetup(verifyCode)
      // Backup codes are shown from the setup response
      setBackupCodes(setupData?.backup_codes || [])
      setStatus({ enabled: true, backup_codes_remaining: setupData?.backup_codes?.length || 0 })
      setStep('backup-codes')
      toast.success('Two-factor authentication enabled!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid verification code'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      setError(null)
      await disable2FA(disablePassword, disableCode)
      setStatus({ enabled: false, backup_codes_remaining: 0 })
      setDisableCode('')
      setDisablePassword('')
      setStep('status')
      toast.success('Two-factor authentication disabled')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid verification code'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegenerateBackupCodes = async () => {
    try {
      setIsSubmitting(true)
      setError(null)
      const response = await regenerateBackupCodes(regenCode)
      setBackupCodes(response.backup_codes)
      setRegenCode('')
      setStep('backup-codes')
      toast.success('Backup codes regenerated')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to regenerate backup codes'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Shield size={28} />
          Two-Factor Authentication
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Add an extra layer of security to your account
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <Alert type="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </div>
      )}

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-6">
        {/* Status View */}
        {step === 'status' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {status?.enabled ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <ShieldCheck className="text-green-500" size={24} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-[var(--text-primary)]">2FA is enabled</h2>
                      <p className="text-sm text-[var(--text-muted)]">Your account is protected</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <ShieldOff className="text-yellow-500" size={24} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-[var(--text-primary)]">2FA is disabled</h2>
                      <p className="text-sm text-[var(--text-muted)]">Enable for extra security</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {status?.enabled ? (
              <div className="space-y-3">
                <Button
                  onClick={() => setStep('regen-confirm')}
                  variant="secondary"
                  className="w-full"
                  leftIcon={<RefreshCw size={18} />}
                >
                  Regenerate Backup Codes
                </Button>
                <Button
                  onClick={() => setStep('disable')}
                  variant="danger"
                  className="w-full"
                  leftIcon={<ShieldOff size={18} />}
                >
                  Disable Two-Factor Authentication
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-[var(--text-secondary)] text-sm mb-4">
                  Two-factor authentication adds an extra layer of security by requiring a verification 
                  code from your authenticator app in addition to your password.
                </p>
                <Button
                  onClick={startSetup}
                  className="w-full"
                  leftIcon={<Shield size={18} />}
                  isLoading={isSubmitting}
                >
                  Enable Two-Factor Authentication
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Setup View - QR Code */}
        {step === 'setup' && setupData && (
          <div>
            <h2 className="font-semibold text-[var(--text-primary)] mb-4">
              Scan QR Code
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>

            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-lg">
                <img 
                  src={setupData.qr_code} 
                  alt="2FA QR Code" 
                  className="w-48 h-48"
                />
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-[var(--text-muted)] mb-2">
                Or enter this code manually:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-[var(--bg-tertiary)] px-3 py-2 rounded font-mono text-sm break-all">
                  {setupData.secret}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(setupData.secret)}
                >
                  <Copy size={16} />
                </Button>
              </div>
            </div>

            <form onSubmit={handleVerifySetup} className="space-y-4">
              <Input
                label="Verification Code"
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                required
                autoFocus
                className="text-center text-xl tracking-widest font-mono"
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setStep('status')
                    setSetupData(null)
                    setVerifyCode('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  isLoading={isSubmitting}
                >
                  Verify & Enable
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Disable View */}
        {step === 'disable' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-yellow-500" size={24} />
              <h2 className="font-semibold text-[var(--text-primary)]">
                Disable Two-Factor Authentication
              </h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Enter your verification code to confirm disabling 2FA. This will make your account less secure.
            </p>

            <form onSubmit={handleDisable2FA} className="space-y-4">
              <Input
                label="Password"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <Input
                label="Verification Code"
                type="text"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="Enter code"
                required
                className="text-center text-xl tracking-widest font-mono"
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setStep('status')
                    setDisableCode('')
                    setDisablePassword('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  className="flex-1"
                  isLoading={isSubmitting}
                >
                  Disable 2FA
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Backup Codes View */}
        {step === 'backup-codes' && backupCodes && (
          <div>
            <h2 className="font-semibold text-[var(--text-primary)] mb-2">
              Backup Codes
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Save these codes in a safe place. You can use them to sign in if you lose access to your authenticator app.
              Each code can only be used once.
            </p>

            <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <code 
                    key={index} 
                    className="bg-[var(--bg-primary)] px-3 py-2 rounded text-center font-mono"
                  >
                    {code}
                  </code>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                leftIcon={<Copy size={18} />}
                onClick={() => copyToClipboard(backupCodes.join('\n'))}
              >
                Copy All
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setStep('status')
                  setBackupCodes(null)
                }}
              >
                Done
              </Button>
            </div>
          </div>
        )}

        {/* Regenerate Backup Codes Confirmation */}
        {step === 'regen-confirm' && (
          <div>
            <h2 className="font-semibold text-[var(--text-primary)] mb-4">
              Regenerate Backup Codes
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Enter a verification code to generate new backup codes. Your old backup codes will be invalidated.
            </p>

            <div className="space-y-4">
              <Input
                label="Verification Code"
                type="text"
                value={regenCode}
                onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="text-center text-xl tracking-widest font-mono"
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setStep('status')
                    setRegenCode('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRegenerateBackupCodes}
                  className="flex-1"
                  isLoading={isSubmitting}
                  disabled={regenCode.length < 6}
                >
                  Regenerate
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
