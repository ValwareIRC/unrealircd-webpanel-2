import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks'
import { Button, Input, Alert } from '@/components/common'
import { useTranslation } from 'react-i18next'
import { LogIn, Shield, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'

export function LoginPage() {
  const { login, verify2FA, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requires2FA, setRequires2FA] = useState(false)

  const from = (location.state as { from?: Location })?.from?.pathname || '/'

  if (isAuthenticated && !isLoading) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await login(username, password)
      
      if (result.requires2FA) {
        setRequires2FA(true)
        setIsSubmitting(false)
        return
      }
      
      // Show password breach warning if present
      if (result.passwordWarning) {
        toast.error(result.passwordWarning, {
          duration: 10000,
          icon: '⚠️',
        })
      }
      
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('auth.failedLogin')
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const passwordWarning = await verify2FA(username, password, totpCode)
      
      if (passwordWarning) {
        toast.error(passwordWarning, {
          duration: 10000,
          icon: '⚠️',
        })
      }
      
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('auth.invalidCode')
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    setRequires2FA(false)
    setTotpCode('')
    setError(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/unreal.png" alt="UnrealIRCd" className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('auth.panelTitle')}</h1>
          <p className="text-[var(--text-muted)] mt-1">
            {requires2FA ? t('auth.twoFactorRequired') : t('auth.panelSubtitle')}
          </p>
        </div>

        {/* Form */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-6">
          {error && (
            <div className="mb-4">
              <Alert type="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            </div>
          )}

          {!requires2FA ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={t('auth.usernameLabel')}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('auth.usernamePlaceholder')}
                required
                autoFocus
                autoComplete="username"
              />

              <Input
                label={t('auth.passwordLabel')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                required
                autoComplete="current-password"
              />

              <Button
                type="submit"
                className="w-full"
                isLoading={isSubmitting}
                leftIcon={<LogIn size={18} />}
              >
                {t('auth.signInButton')}
              </Button>
            </form>
          ) : (
            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-16 h-16 mx-auto bg-[var(--accent-muted)] rounded-full flex items-center justify-center mb-3">
                  <Shield className="text-[var(--accent)]" size={32} />
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  {t('auth.twoFactorDescription')}
                </p>
              </div>

              <Input
                label={t('auth.verificationCodeLabel')}
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="000000"
                required
                autoFocus
                autoComplete="one-time-code"
                className="text-center text-2xl tracking-widest font-mono"
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={handleBack}
                >
                  {t('auth.backButton')}
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  isLoading={isSubmitting}
                  leftIcon={<KeyRound size={18} />}
                >
                  {t('auth.verifyButton')}
                </Button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-[var(--text-muted)] text-sm mt-6">
          UnrealIRCd Web Panel v2.0
        </p>
      </div>
    </div>
  )
}
