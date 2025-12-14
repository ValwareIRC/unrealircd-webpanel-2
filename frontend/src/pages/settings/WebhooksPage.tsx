import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Badge, Modal, DataTable } from '@/components/common'
import { useTranslation } from 'react-i18next'
import { 
  Webhook, 
  Plus, 
  Copy, 
  Trash2, 
  RefreshCw, 
  Check, 
  ExternalLink, 
  Clock, 
  Activity,
  Eye,
  EyeOff,
  Settings,
  ArrowLeft
} from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '@/services/api'
import type { WebhookToken, WebhookConfigResponse, WebhookLog } from '@/types'

export function WebhooksPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedToken, setSelectedToken] = useState<WebhookToken | null>(null)
  const [configData, setConfigData] = useState<WebhookConfigResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const [showTokens, setShowTokens] = useState<Record<number, boolean>>({})
  
  // Form state
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')

  // Fetch webhook tokens
  const { data: tokens, isLoading, error } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async (): Promise<WebhookToken[]> => {
      const response = await api.get<WebhookToken[]>('/webhooks')
      return response.data
    },
  })

  // Fetch webhook logs
  const { data: logs } = useQuery({
    queryKey: ['webhook-logs', selectedToken?.id],
    queryFn: async (): Promise<WebhookLog[]> => {
      const response = await api.get<WebhookLog[]>(`/webhooks/logs?token_id=${selectedToken?.id || ''}&limit=50`)
      return response.data
    },
    enabled: showLogsModal,
  })

  // Create token mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const response = await api.post<WebhookToken>('/webhooks', data)
      return response.data
    },
    onSuccess: (token) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      setShowCreateModal(false)
      setNewName('')
      setNewDescription('')
      toast.success('Webhook token created')
      // Show the config modal immediately
      handleShowConfig(token)
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Failed to create webhook token'
      toast.error(message)
    },
  })

  // Delete token mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/webhooks/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      setShowDeleteModal(false)
      setSelectedToken(null)
      toast.success('Webhook token deleted')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Failed to delete webhook token'
      toast.error(message)
    },
  })

  // Regenerate token mutation
  const regenerateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post<WebhookToken>(`/webhooks/${id}/regenerate`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      toast.success('Token regenerated - update your UnrealIRCd config!')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Failed to regenerate token'
      toast.error(message)
    },
  })

  // Toggle enabled mutation
  const toggleEnabledMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      await api.put(`/webhooks/${id}`, { enabled })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Failed to update webhook'
      toast.error(message)
    },
  })

  const handleShowConfig = async (token: WebhookToken) => {
    try {
      const response = await api.get<WebhookConfigResponse>(`/webhooks/${token.id}/config`)
      setConfigData(response.data)
      setSelectedToken(token)
      setShowConfigModal(true)
    } catch {
      toast.error('Failed to load configuration')
    }
  }

  const handleCopyConfig = async () => {
    if (!configData) return
    try {
      await navigator.clipboard.writeText(configData.config)
      setCopied(true)
      toast.success('Configuration copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleCopyUrl = async () => {
    if (!configData) return
    try {
      await navigator.clipboard.writeText(configData.webhook_url)
      toast.success('URL copied to clipboard')
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  const toggleShowToken = (id: number) => {
    setShowTokens(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleString()
  }

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (token: WebhookToken) => (
        <div>
          <span className="font-medium text-[var(--text-primary)]">{token.name}</span>
          {token.description && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{token.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'token',
      header: 'Token',
      render: (token: WebhookToken) => (
        <div className="flex items-center gap-2">
          <code className="text-xs bg-[var(--bg-tertiary)] px-2 py-1 rounded font-mono">
            {showTokens[token.id] ? token.token : '••••••••••••••••'}
          </code>
          <button
            onClick={() => toggleShowToken(token.id)}
            className="p-1 hover:bg-[var(--bg-tertiary)] rounded"
            title={showTokens[token.id] ? 'Hide token' : 'Show token'}
          >
            {showTokens[token.id] ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (token: WebhookToken) => (
        <Badge variant={token.enabled ? 'success' : 'error'}>
          {token.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      ),
    },
    {
      key: 'usage',
      header: 'Usage',
      render: (token: WebhookToken) => (
        <div className="text-sm">
          <div className="flex items-center gap-1 text-[var(--text-secondary)]">
            <Activity size={12} />
            {token.use_count} calls
          </div>
          {token.last_used_at && (
            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Clock size={10} />
              {formatDate(token.last_used_at)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (token: WebhookToken) => (
        <div className="text-sm text-[var(--text-muted)]">
          <div>{formatDate(token.created_at)}</div>
          <div className="text-xs">by {token.created_by_username}</div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (token: WebhookToken) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleShowConfig(token)}
            title={t('webhooks.tooltips.viewConfig')}
          >
            <Settings size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedToken(token)
              setShowLogsModal(true)
            }}
            title={t('webhooks.tooltips.viewLogs')}
          >
            <Activity size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleEnabledMutation.mutate({ id: token.id, enabled: !token.enabled })}
            title={token.enabled ? t('webhooks.tooltips.disable') : t('webhooks.tooltips.enable')}
          >
            {token.enabled ? <EyeOff size={14} /> : <Eye size={14} />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => regenerateMutation.mutate(token.id)}
            title={t('webhooks.tooltips.regenerate')}
          >
            <RefreshCw size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedToken(token)
              setShowDeleteModal(true)
            }}
            title={t('common.delete')}
            className="text-[var(--error)] hover:text-[var(--error)]"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ]

  if (error) {
    return (
      <div className="space-y-6">
        <Alert type="error">
          {t('webhooks.messages.loadFailed', { error: error instanceof Error ? error.message : 'Unknown error' })}
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/settings"
            className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-[var(--text-muted)]" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('webhooks.title')}</h1>
            <p className="text-[var(--text-muted)] mt-1">{t('webhooks.subtitle')}</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={16} className="mr-2" />
          {t('webhooks.createButton')}
        </Button>
      </div>

      {/* Info Box */}
      <Alert type="info">
        <div className="space-y-2">
          <p>{t('webhooks.info.paragraph1')}</p>
          <p className="text-sm">
            <a 
              href="https://www.unrealircd.org/docs/Log_block" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline inline-flex items-center gap-1"
            >
              {t('webhooks.info.learnMore')} <ExternalLink size={12} />
            </a>
          </p>
        </div>
      </Alert>

      {/* Tokens Table */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl overflow-hidden">
        <DataTable
          data={tokens || []}
          columns={columns}
          keyField="id"
          isLoading={isLoading}
          emptyMessage="No webhook tokens configured"
          searchable={false}
        />
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Webhook Token"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Name <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Production Server Logs"
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Description
            </label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional description for this webhook"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate({ name: newName, description: newDescription })}
              disabled={!newName.trim() || createMutation.isPending}
              isLoading={createMutation.isPending}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Config Modal */}
      <Modal
        isOpen={showConfigModal}
        onClose={() => {
          setShowConfigModal(false)
          setConfigData(null)
        }}
        title={`Configuration for "${selectedToken?.name}"`}
        size="lg"
      >
        {configData && (
          <div className="space-y-4">
            {/* Webhook URL */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Webhook URL
              </label>
              <div className="flex gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm font-mono text-[var(--text-secondary)] overflow-x-auto">
                  {configData.webhook_url}
                </code>
                <Button variant="secondary" onClick={handleCopyUrl}>
                  <Copy size={14} />
                </Button>
              </div>
            </div>

            {/* UnrealIRCd Config */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                UnrealIRCd Configuration Block
              </label>
              <p className="text-xs text-[var(--text-muted)] mb-2">
                Add this to your <code className="bg-[var(--bg-tertiary)] px-1 rounded">unrealircd.conf</code> and rehash the server.
              </p>
              <div className="relative">
                <pre className="px-4 py-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm font-mono text-[var(--text-secondary)] overflow-x-auto whitespace-pre">
                  {configData.config}
                </pre>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleCopyConfig}
                >
                  {copied ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
                  <span className="ml-1">{copied ? 'Copied!' : 'Copy'}</span>
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <Alert type="info">
              <div className="space-y-1 text-sm">
                <p><strong>After adding the config:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Uncomment the log sources you want to receive</li>
                  <li>Save the configuration file</li>
                  <li>Rehash UnrealIRCd (<code className="bg-[var(--bg-tertiary)] px-1 rounded">/rehash</code>)</li>
                </ol>
              </div>
            </Alert>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setShowConfigModal(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Logs Modal */}
      <Modal
        isOpen={showLogsModal}
        onClose={() => {
          setShowLogsModal(false)
          setSelectedToken(null)
        }}
        title={`Recent Logs for "${selectedToken?.name}"`}
        size="xl"
      >
        <div className="space-y-4">
          {logs && logs.length > 0 ? (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          log.level === 'error' || log.level === 'fatal' 
                            ? 'error' 
                            : log.level === 'warn' 
                              ? 'warning' 
                              : 'default'
                        }
                      >
                        {log.level || 'info'}
                      </Badge>
                      {log.subsystem && (
                        <span className="text-xs text-[var(--text-muted)]">{log.subsystem}</span>
                      )}
                      {log.event_id && (
                        <code className="text-xs bg-[var(--bg-secondary)] px-1 rounded">{log.event_id}</code>
                      )}
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-primary)]">{log.message}</p>
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    from {log.source_ip}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <Webhook size={32} className="mx-auto mb-2 opacity-50" />
              <p>No log entries received yet</p>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowLogsModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedToken(null)
        }}
        title="Delete Webhook Token"
      >
        <div className="space-y-4">
          <Alert type="warning">
            Are you sure you want to delete the webhook token "{selectedToken?.name}"? 
            UnrealIRCd will no longer be able to send log events to this URL.
          </Alert>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => selectedToken && deleteMutation.mutate(selectedToken.id)}
              isLoading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
