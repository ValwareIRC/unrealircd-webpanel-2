import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Modal } from '@/components/common'
import { 
  Mail, 
  ArrowLeft,
  Check,
  AlertTriangle,
  Send,
  Server,
  Lock,
  User
} from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '@/services/api'
import type { SmtpSettings, SmtpSettingsResponse } from '@/types'

export function SmtpSettingsPage() {
  const queryClient = useQueryClient()
  const [showTestModal, setShowTestModal] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  
  // Form state
  const [host, setHost] = useState('')
  const [port, setPort] = useState(587)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fromAddress, setFromAddress] = useState('')
  const [fromName, setFromName] = useState('')
  const [useTls, setUseTls] = useState(false)
  const [useStarttls, setUseStarttls] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch SMTP settings
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['smtp-settings'],
    queryFn: async (): Promise<SmtpSettingsResponse> => {
      const res = await api.get<SmtpSettingsResponse>('/smtp')
      return res.data
    },
  })

  // Populate form when data is loaded
  useEffect(() => {
    if (response?.settings) {
      const s = response.settings
      setHost(s.host || '')
      setPort(s.port || 587)
      setUsername(s.username || '')
      setFromAddress(s.from_address || '')
      setFromName(s.from_name || '')
      setUseTls(s.use_tls || false)
      setUseStarttls(s.use_starttls || false)
      setEnabled(s.enabled || false)
      setHasChanges(false)
    }
  }, [response])

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (data: SmtpSettings) => {
      const res = await api.put<SmtpSettings>('/smtp', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smtp-settings'] })
      setHasChanges(false)
      setPassword('')
      toast.success('SMTP settings saved')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Failed to save SMTP settings'
      toast.error(message)
    },
  })

  // Test email mutation
  const testMutation = useMutation({
    mutationFn: async (to: string) => {
      const res = await api.post('/smtp/test', { to })
      return res.data
    },
    onSuccess: () => {
      setShowTestModal(false)
      setTestEmail('')
      toast.success('Test email sent successfully')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Failed to send test email'
      toast.error(message)
    },
  })

  const handleSave = () => {
    saveMutation.mutate({
      host,
      port,
      username,
      password,
      from_address: fromAddress,
      from_name: fromName,
      use_tls: useTls,
      use_starttls: useStarttls,
      enabled,
    })
  }

  const handleTestEmail = () => {
    if (testEmail) {
      testMutation.mutate(testEmail)
    }
  }

  const markChanged = () => {
    setHasChanges(true)
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert type="error">
          Failed to load SMTP settings: {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          to="/settings" 
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">SMTP Settings</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Configure email server for sending notifications
            </p>
          </div>
        </div>
      </div>

      {/* Current Status */}
      <div className={`p-4 rounded-lg border ${
        response?.configured && enabled
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      }`}>
        <div className="flex items-center gap-3">
          {response?.configured && enabled ? (
            <>
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-300">Email Notifications Enabled</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  SMTP is configured and active. Users can receive email notifications.
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-300">Email Notifications Disabled</p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Configure SMTP settings below to enable email notifications.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold">SMTP Server Configuration</h2>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Server Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                <Server className="w-4 h-4 inline mr-2" />
                SMTP Host
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => { setHost(e.target.value); markChanged() }}
                placeholder="smtp.example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Port
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => { setPort(parseInt(e.target.value) || 587); markChanged() }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Common ports: 25 (plain), 465 (TLS), 587 (STARTTLS)
              </p>
            </div>
          </div>

          {/* Authentication */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); markChanged() }}
                placeholder="your-email@example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); markChanged() }}
                placeholder={response?.configured ? '••••••••' : 'Enter password'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {response?.configured && (
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to keep existing password
                </p>
              )}
            </div>
          </div>

          {/* From Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                From Address
              </label>
              <input
                type="email"
                value={fromAddress}
                onChange={(e) => { setFromAddress(e.target.value); markChanged() }}
                placeholder="noreply@example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                From Name
              </label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => { setFromName(e.target.value); markChanged() }}
                placeholder="UnrealIRCd Webpanel"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Security Options */}
          <div className="space-y-4">
            <h3 className="font-medium">Security</h3>
            
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="security"
                  checked={!useTls && !useStarttls}
                  onChange={() => { setUseTls(false); setUseStarttls(false); markChanged() }}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <span className="font-medium">None (Plain SMTP)</span>
                  <p className="text-xs text-gray-500">Not recommended - connection is unencrypted</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="security"
                  checked={useStarttls && !useTls}
                  onChange={() => { setUseTls(false); setUseStarttls(true); markChanged() }}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <span className="font-medium">STARTTLS (Recommended)</span>
                  <p className="text-xs text-gray-500">Upgrades plain connection to TLS - typically port 587</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="security"
                  checked={useTls}
                  onChange={() => { setUseTls(true); setUseStarttls(false); markChanged() }}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <span className="font-medium">TLS/SSL</span>
                  <p className="text-xs text-gray-500">Direct TLS connection - typically port 465</p>
                </div>
              </label>
            </div>
          </div>

          {/* Enable/Disable */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => { setEnabled(e.target.checked); markChanged() }}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <span className="font-medium">Enable Email Notifications</span>
                <p className="text-sm text-gray-500">
                  When enabled, users can configure email notifications for IRC events
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <Button
            variant="secondary"
            onClick={() => setShowTestModal(true)}
            disabled={!host || !fromAddress}
          >
            <Send className="w-4 h-4 mr-2" />
            Send Test Email
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Test Email Modal */}
      <Modal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        title="Send Test Email"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-500 dark:text-gray-400">
            Send a test email to verify your SMTP configuration is working correctly.
          </p>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Recipient Email Address
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowTestModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTestEmail} 
              disabled={!testEmail || testMutation.isPending}
            >
              {testMutation.isPending ? 'Sending...' : 'Send Test'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
