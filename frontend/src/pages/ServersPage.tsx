import { useState } from 'react'
import { useIRCServers, useRehashServer } from '@/hooks'
import { DataTable, Button, Modal, Alert, Badge } from '@/components/common'
import { Eye, RefreshCw, Server, Clock, Users } from 'lucide-react'
import type { IRCServer } from '@/types'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

export function ServersPage() {
  const { t } = useTranslation()
  const { data: servers, isLoading, error } = useIRCServers()
  const rehashServer = useRehashServer()

  const [selectedServer, setSelectedServer] = useState<IRCServer | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showRehashModal, setShowRehashModal] = useState(false)

  const columns = [
    {
      key: 'name',
      header: t('servers.server'),
      sortable: true,
      render: (server: IRCServer) => (
        <div className="flex items-center gap-2">
          <Server size={16} className="text-[var(--text-muted)]" />
          <span className="text-[var(--text-primary)] font-medium">{server.name}</span>
          {server.server?.ulined && (
            <Badge variant="info" size="sm">U-Line</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'num_users',
      header: t('servers.users'),
      sortable: true,
      render: (server: IRCServer) => (
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <Users size={14} className="text-[var(--text-muted)]" />
          {server.num_users || 0}
        </div>
      ),
    },
    {
      key: 'info',
      header: t('servers.description'),
      render: (server: IRCServer) => (
        <span className="text-[var(--text-muted)] truncate max-w-xs block">
          {server.server?.info || t('servers.noDescription')}
        </span>
      ),
    },
    {
      key: 'version',
      header: t('servers.version'),
      render: (server: IRCServer) => (
        <span className="text-[var(--text-muted)] font-mono text-sm">
          {server.server?.features?.software || t('servers.unknown')}
        </span>
      ),
    },
    {
      key: 'uptime',
      header: t('servers.uptime'),
      sortable: true,
      render: (server: IRCServer) => (
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <Clock size={14} className="text-[var(--text-muted)]" />
          {formatUptime(t, server.server?.boot_time)}
        </div>
      ),
    },
  ]

  const handleRehash = async () => {
    if (!selectedServer) return
    try {
      await rehashServer.mutateAsync(selectedServer.name)
      toast.success(t('servers.rehashSuccess', { name: selectedServer.name }))
      setShowRehashModal(false)
      setSelectedServer(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('servers.rehashFailed')
      toast.error(message)
    }
  }

  if (error) {
    return (
      <Alert type="error">
        {t('servers.loadError', { error: error instanceof Error ? error.message : 'Unknown error' })}
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('servers.title')}</h1>
        <p className="text-[var(--text-muted)] mt-1">{t('servers.subtitle')}</p>
      </div>

      <DataTable
        data={servers || []}
        columns={columns}
        keyField="name"
        isLoading={isLoading}
        searchPlaceholder={t('servers.searchPlaceholder')}
        actions={(server) => (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedServer(server)
                setShowDetails(true)
              }}
            >
              <Eye size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedServer(server)
                setShowRehashModal(true)
              }}
            >
              <RefreshCw size={16} />
            </Button>
          </>
        )}
      />

      {/* Server Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={t('servers.serverDetails', { name: selectedServer?.name })}
        size="lg"
      >
        {selectedServer && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--text-muted)]">{t('servers.serverName')}</p>
                <p className="text-[var(--text-primary)]">{selectedServer.name}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">{t('servers.users')}</p>
                <p className="text-[var(--text-primary)]">{selectedServer.num_users || 0}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">{t('servers.description')}</p>
                <p className="text-[var(--text-primary)]">{selectedServer.server?.info || t('servers.unknown')}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">{t('servers.uptime')}</p>
                <p className="text-[var(--text-primary)]">{formatUptime(t, selectedServer.server?.boot_time)}</p>
              </div>
            </div>

            {selectedServer.server?.features && (
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-2">{t('servers.serverFeatures')}</p>
                <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">{t('servers.software')}</span>
                    <span className="text-[var(--text-primary)] font-mono">
                      {selectedServer.server.features.software || t('servers.unknown')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">{t('servers.protocol')}</span>
                    <span className="text-[var(--text-primary)] font-mono">
                      {selectedServer.server.features.protocol || t('servers.unknown')}
                    </span>
                  </div>
                  {selectedServer.server.features.nicklen && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">{t('servers.nickLength')}</span>
                      <span className="text-[var(--text-primary)]">
                        {selectedServer.server.features.nicklen}
                      </span>
                    </div>
                  )}
                  {selectedServer.server.features.chanmodes && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">{t('servers.channelModes')}</span>
                      <span className="text-[var(--text-primary)] font-mono text-sm">
                        {selectedServer.server.features.chanmodes}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedServer.server?.ulined && (
              <Alert type="info">
                {t('servers.uLineServer')}
              </Alert>
            )}
          </div>
        )}
      </Modal>

      {/* Rehash Modal */}
      <Modal
        isOpen={showRehashModal}
        onClose={() => setShowRehashModal(false)}
        title={t('servers.rehashTitle', { name: selectedServer?.name })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRehashModal(false)}>
              {t('servers.cancel')}
            </Button>
            <Button onClick={handleRehash} isLoading={rehashServer.isPending}>
              {t('servers.rehashServer')}
            </Button>
          </>
        }
      >
        <Alert type="warning">
          {t('servers.rehashWarning', { name: selectedServer?.name })}
        </Alert>
      </Modal>
    </div>
  )
}

function formatUptime(t: any, bootTime?: string | number): string {
  if (!bootTime) return t('servers.unknown')
  
  // boot_time can be an ISO 8601 string (e.g. "2022-05-23T11:02:06.000Z") or a Unix timestamp
  let bootTimestamp: number
  if (typeof bootTime === 'string') {
    bootTimestamp = new Date(bootTime).getTime() / 1000
  } else {
    bootTimestamp = bootTime
  }
  
  if (isNaN(bootTimestamp)) return t('servers.unknown')
  
  const now = Math.floor(Date.now() / 1000)
  const uptime = now - bootTimestamp
  
  if (uptime < 0) return t('servers.unknown')
  
  const days = Math.floor(uptime / 86400)
  const hours = Math.floor((uptime % 86400) / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)
  
  if (days > 0) return t('servers.uptimeFormat', { days, hours, minutes })
  if (hours > 0) return t('servers.uptimeHoursMinutes', { hours, minutes })
  return t('servers.uptimeMinutes', { minutes })
}
