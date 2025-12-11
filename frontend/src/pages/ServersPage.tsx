import { useState } from 'react'
import { useIRCServers, useRehashServer } from '@/hooks'
import { DataTable, Button, Modal, Alert, Badge } from '@/components/common'
import { Eye, RefreshCw, Server, Clock, Users } from 'lucide-react'
import type { IRCServer } from '@/types'
import toast from 'react-hot-toast'

export function ServersPage() {
  const { data: servers, isLoading, error } = useIRCServers()
  const rehashServer = useRehashServer()

  const [selectedServer, setSelectedServer] = useState<IRCServer | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showRehashModal, setShowRehashModal] = useState(false)

  const columns = [
    {
      key: 'name',
      header: 'Server',
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
      header: 'Users',
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
      header: 'Description',
      render: (server: IRCServer) => (
        <span className="text-[var(--text-muted)] truncate max-w-xs block">
          {server.server?.info || 'No description'}
        </span>
      ),
    },
    {
      key: 'version',
      header: 'Version',
      render: (server: IRCServer) => (
        <span className="text-[var(--text-muted)] font-mono text-sm">
          {server.server?.features?.software || 'Unknown'}
        </span>
      ),
    },
    {
      key: 'uptime',
      header: 'Uptime',
      sortable: true,
      render: (server: IRCServer) => (
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <Clock size={14} className="text-[var(--text-muted)]" />
          {formatUptime(server.server?.boot_time)}
        </div>
      ),
    },
  ]

  const handleRehash = async () => {
    if (!selectedServer) return
    try {
      await rehashServer.mutateAsync(selectedServer.name)
      toast.success(`Rehash sent to ${selectedServer.name}`)
      setShowRehashModal(false)
      setSelectedServer(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to rehash server'
      toast.error(message)
    }
  }

  if (error) {
    return (
      <Alert type="error">
        Failed to load servers: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Servers</h1>
        <p className="text-[var(--text-muted)] mt-1">View linked servers in the network</p>
      </div>

      <DataTable
        data={servers || []}
        columns={columns}
        keyField="name"
        isLoading={isLoading}
        searchPlaceholder="Search servers..."
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
        title={`Server: ${selectedServer?.name}`}
        size="lg"
      >
        {selectedServer && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Server Name</p>
                <p className="text-[var(--text-primary)]">{selectedServer.name}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Users</p>
                <p className="text-[var(--text-primary)]">{selectedServer.num_users || 0}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Description</p>
                <p className="text-[var(--text-primary)]">{selectedServer.server?.info || 'None'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Uptime</p>
                <p className="text-[var(--text-primary)]">{formatUptime(selectedServer.server?.boot_time)}</p>
              </div>
            </div>

            {selectedServer.server?.features && (
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-2">Server Features</p>
                <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Software</span>
                    <span className="text-[var(--text-primary)] font-mono">
                      {selectedServer.server.features.software || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Protocol</span>
                    <span className="text-[var(--text-primary)] font-mono">
                      {selectedServer.server.features.protocol || 'Unknown'}
                    </span>
                  </div>
                  {selectedServer.server.features.nicklen && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Nick Length</span>
                      <span className="text-[var(--text-primary)]">
                        {selectedServer.server.features.nicklen}
                      </span>
                    </div>
                  )}
                  {selectedServer.server.features.chanmodes && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Channel Modes</span>
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
                This is a U-Line server (services server)
              </Alert>
            )}
          </div>
        )}
      </Modal>

      {/* Rehash Modal */}
      <Modal
        isOpen={showRehashModal}
        onClose={() => setShowRehashModal(false)}
        title={`Rehash: ${selectedServer?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRehashModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRehash} isLoading={rehashServer.isPending}>
              Rehash Server
            </Button>
          </>
        }
      >
        <Alert type="warning">
          This will cause {selectedServer?.name} to reload its configuration. 
          Are you sure you want to proceed?
        </Alert>
      </Modal>
    </div>
  )
}

function formatUptime(bootTime?: string | number): string {
  if (!bootTime) return 'Unknown'
  
  // boot_time can be an ISO 8601 string (e.g. "2022-05-23T11:02:06.000Z") or a Unix timestamp
  let bootTimestamp: number
  if (typeof bootTime === 'string') {
    bootTimestamp = new Date(bootTime).getTime() / 1000
  } else {
    bootTimestamp = bootTime
  }
  
  if (isNaN(bootTimestamp)) return 'Unknown'
  
  const now = Math.floor(Date.now() / 1000)
  const uptime = now - bootTimestamp
  
  if (uptime < 0) return 'Unknown'
  
  const days = Math.floor(uptime / 86400)
  const hours = Math.floor((uptime % 86400) / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
