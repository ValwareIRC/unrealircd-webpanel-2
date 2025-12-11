import { useState } from 'react'
import { useRPCServers, useAddRPCServer, useUpdateRPCServer, useDeleteRPCServer, useTestRPCServer, useSetActiveRPCServer } from '@/hooks'
import { Button, Modal, Input, Alert, Badge } from '@/components/common'
import { Plus, Server, Check, Wifi, WifiOff, Play, TestTube, Edit, Trash2, Info, ExternalLink } from 'lucide-react'
import type { RPCServer } from '@/types'
import toast from 'react-hot-toast'

export function RPCServersPage() {
  const { data: servers, isLoading, error } = useRPCServers()
  const addServer = useAddRPCServer()
  const updateServer = useUpdateRPCServer()
  const deleteServer = useDeleteRPCServer()
  const testServer = useTestRPCServer()
  const setActive = useSetActiveRPCServer()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedServer, setSelectedServer] = useState<RPCServer | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    host: '127.0.0.1',
    port: 8600,
    rpc_user: '',
    rpc_password: '',
    tls_verify_cert: false,
    is_default: false,
  })

  const resetForm = () => {
    setFormData({
      name: '',
      host: '127.0.0.1',
      port: 8600,
      rpc_user: '',
      rpc_password: '',
      tls_verify_cert: false,
      is_default: false,
    })
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    try {
      await testServer.mutateAsync({
        host: formData.host,
        port: formData.port,
        rpc_user: formData.rpc_user,
        rpc_password: formData.rpc_password,
        tls_verify_cert: formData.tls_verify_cert,
      })
      toast.success('Connection successful!')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection failed'
      toast.error(message)
    } finally {
      setIsTesting(false)
    }
  }

  const handleAddServer = async () => {
    try {
      await addServer.mutateAsync(formData)
      toast.success('RPC server added successfully')
      setShowAddModal(false)
      resetForm()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add server'
      toast.error(message)
    }
  }

  const handleUpdateServer = async () => {
    if (!selectedServer) return
    try {
      await updateServer.mutateAsync({
        name: selectedServer.name,
        host: formData.host,
        port: formData.port,
        rpc_user: formData.rpc_user,
        rpc_password: formData.rpc_password || undefined,
        tls_verify_cert: formData.tls_verify_cert,
        is_default: formData.is_default,
      })
      toast.success('RPC server updated successfully')
      setShowEditModal(false)
      setSelectedServer(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update server'
      toast.error(message)
    }
  }

  const handleDeleteServer = async () => {
    if (!selectedServer) return
    try {
      await deleteServer.mutateAsync(selectedServer.name)
      toast.success('RPC server deleted')
      setShowDeleteModal(false)
      setSelectedServer(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete server'
      toast.error(message)
    }
  }

  const handleSetActive = async (name: string) => {
    try {
      await setActive.mutateAsync(name)
      toast.success(`Switched to ${name}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to switch server'
      toast.error(message)
    }
  }

  const openEditModal = (server: RPCServer) => {
    setSelectedServer(server)
    setFormData({
      name: server.name,
      host: server.host,
      port: server.port,
      rpc_user: server.rpc_user,
      rpc_password: '', // Don't pre-fill password for security
      tls_verify_cert: server.tls_verify_cert,
      is_default: server.is_default,
    })
    setShowEditModal(true)
  }

  if (error) {
    return (
      <Alert type="error">
        Failed to load RPC servers: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">RPC Servers</h1>
          <p className="text-[var(--text-muted)] mt-1">Configure UnrealIRCd JSON-RPC connections</p>
        </div>
        <Button
          leftIcon={<Plus size={18} />}
          onClick={() => {
            resetForm()
            setShowAddModal(true)
          }}
        >
          Add Server
        </Button>
      </div>

      {/* Info Card */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-[var(--info)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[var(--text-secondary)] text-sm">
              Configure which JSON-RPC server(s) the panel can connect to. You normally only need one server, 
              but multiple servers can be useful for failover.
            </p>
            <a 
              href="https://www.unrealircd.org/docs/UnrealIRCd_webpanel#Configuring_UnrealIRCd" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline text-sm inline-flex items-center gap-1 mt-1"
            >
              Read the UnrealIRCd setup instructions <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* Server Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-6 animate-pulse">
              <div className="h-6 bg-[var(--bg-tertiary)] rounded w-2/3 mb-4"></div>
              <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/3"></div>
            </div>
          ))
        ) : servers && servers.length > 0 ? (
          servers.map((server) => (
            <div
              key={server.name}
              className={`bg-[var(--bg-secondary)] border rounded-xl p-6 transition-all ${
                server.is_active
                  ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/20'
                  : 'border-[var(--border-primary)] hover:border-[var(--border-secondary)]'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      server.is_active ? 'bg-[var(--accent)]/20' : 'bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <Server
                      size={20}
                      className={server.is_active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}
                    />
                  </div>
                  <div>
                    <h3 className="text-[var(--text-primary)] font-medium">{server.name}</h3>
                    <p className="text-[var(--text-muted)] text-sm font-mono">
                      {server.host}:{server.port}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {server.is_active && (
                    <Badge variant="success" size="sm">
                      <Check size={12} className="mr-1" />
                      Active
                    </Badge>
                  )}
                  {server.is_default && !server.is_active && (
                    <Badge variant="default" size="sm">Default</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                    server.is_connected || server.connected
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {server.is_connected || server.connected ? <Wifi size={12} /> : <WifiOff size={12} />}
                  {server.is_connected || server.connected ? 'Connected' : 'Disconnected'}
                </div>
                {server.tls_verify_cert && (
                  <div className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">
                    TLS Verified
                  </div>
                )}
              </div>
              
              {/* RPC User info */}
              <div className="mb-4 text-sm">
                <span className="text-[var(--text-muted)]">RPC User: </span>
                <code className="text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-1 rounded">
                  {server.rpc_user}
                </code>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {!server.is_active && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    leftIcon={<Play size={14} />}
                    onClick={() => handleSetActive(server.name)}
                    isLoading={setActive.isPending}
                  >
                    Use
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditModal(server)}
                >
                  <Edit size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => {
                    setSelectedServer(server)
                    setShowDeleteModal(true)
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full">
            <Alert type="info">
              No RPC servers configured. Add one to connect to your UnrealIRCd server.
            </Alert>
          </div>
        )}
      </div>

      {/* Add Server Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add RPC Server"
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              leftIcon={<TestTube size={16} />}
              onClick={handleTestConnection}
              isLoading={isTesting}
            >
              Test Connection
            </Button>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddServer} isLoading={addServer.isPending}>
              Add Server
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Display Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Main Server"
            helperText="A short display name for the RPC server list"
            required
          />
          <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) =>
                  setFormData({ ...formData, is_default: e.target.checked })
                }
                className="rounded border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <div>
                <span className="text-[var(--text-primary)] font-medium">Default server</span>
                <p className="text-[var(--text-muted)] text-xs">Make this the primary server for connections</p>
              </div>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Hostname or IP"
              value={formData.host}
              onChange={(e) => setFormData({ ...formData, host: e.target.value })}
              placeholder="127.0.0.1"
              helperText="Use 127.0.0.1 for the same machine"
              required
            />
            <Input
              label="Port"
              type="number"
              value={formData.port}
              onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 8600 })}
              placeholder="8600"
              helperText="RPC port from unrealircd.conf"
              required
            />
          </div>
          <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.tls_verify_cert}
                onChange={(e) =>
                  setFormData({ ...formData, tls_verify_cert: e.target.checked })
                }
                className="rounded border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <div>
                <span className="text-[var(--text-primary)] font-medium">Verify SSL/TLS certificate</span>
                <p className="text-[var(--text-muted)] text-xs">Only use with hostnames, not for 127.0.0.1</p>
              </div>
            </label>
          </div>
          <Input
            label="Username"
            value={formData.rpc_user}
            onChange={(e) => setFormData({ ...formData, rpc_user: e.target.value })}
            placeholder="rpc_username"
            helperText="The name of your rpc-user block in unrealircd.conf"
            autoComplete="new-password"
            required
          />
          <Input
            label="Password"
            type="password"
            value={formData.rpc_password}
            onChange={(e) => setFormData({ ...formData, rpc_password: e.target.value })}
            placeholder="Enter RPC password"
            autoComplete="new-password"
            required
          />
        </div>
      </Modal>

      {/* Edit Server Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Server: ${selectedServer?.name}`}
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              leftIcon={<TestTube size={16} />}
              onClick={handleTestConnection}
              isLoading={isTesting}
            >
              Test Connection
            </Button>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateServer} isLoading={updateServer.isPending}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Display Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Main Server"
            helperText="A short display name for the RPC server list"
            required
          />
          <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) =>
                  setFormData({ ...formData, is_default: e.target.checked })
                }
                className="rounded border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <div>
                <span className="text-[var(--text-primary)] font-medium">Default server</span>
                <p className="text-[var(--text-muted)] text-xs">Make this the primary server for connections</p>
              </div>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Hostname or IP"
              value={formData.host}
              onChange={(e) => setFormData({ ...formData, host: e.target.value })}
              placeholder="127.0.0.1"
              helperText="Use 127.0.0.1 for the same machine"
              required
            />
            <Input
              label="Port"
              type="number"
              value={formData.port}
              onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 8600 })}
              placeholder="8600"
              helperText="RPC port from unrealircd.conf"
              required
            />
          </div>
          <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.tls_verify_cert}
                onChange={(e) =>
                  setFormData({ ...formData, tls_verify_cert: e.target.checked })
                }
                className="rounded border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <div>
                <span className="text-[var(--text-primary)] font-medium">Verify SSL/TLS certificate</span>
                <p className="text-[var(--text-muted)] text-xs">Only use with hostnames, not for 127.0.0.1</p>
              </div>
            </label>
          </div>
          <Input
            label="Username"
            value={formData.rpc_user}
            onChange={(e) => setFormData({ ...formData, rpc_user: e.target.value })}
            placeholder="rpc_username"
            helperText="The name of your rpc-user block in unrealircd.conf"
            autoComplete="new-password"
            required
          />
          <Input
            label="Password"
            type="password"
            value={formData.rpc_password}
            onChange={(e) => setFormData({ ...formData, rpc_password: e.target.value })}
            placeholder="Leave blank to keep current password"
            helperText="Only fill this if you want to change the password"
            autoComplete="new-password"
          />
        </div>
      </Modal>

      {/* Delete Server Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Server"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteServer} isLoading={deleteServer.isPending}>
              Delete Server
            </Button>
          </>
        }
      >
        <Alert type="error">
          Are you sure you want to delete the server <strong>{selectedServer?.name}</strong>?
          This action cannot be undone.
        </Alert>
      </Modal>
    </div>
  )
}
