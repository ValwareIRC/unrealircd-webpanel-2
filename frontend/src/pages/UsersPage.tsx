import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIRCUsers, useKillUser, useBanUser, useSetUserVhost } from '@/hooks'
import { DataTable, Button, Modal, Input, Select, Alert, Badge, SavedSearches } from '@/components/common'
import { Eye, Ban, Skull, ShieldCheck, Globe, CheckSquare, Square, Users } from 'lucide-react'
import type { IRCUser } from '@/types'
import toast from 'react-hot-toast'

export function UsersPage() {
  const navigate = useNavigate()
  const { data: users, isLoading, error } = useIRCUsers()
  const killUser = useKillUser()
  const banUser = useBanUser()
  const setUserVhost = useSetUserVhost()

  const [selectedUser, setSelectedUser] = useState<IRCUser | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showKillModal, setShowKillModal] = useState(false)
  const [showBanModal, setShowBanModal] = useState(false)
  const [showVhostModal, setShowVhostModal] = useState(false)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  
  // Bulk selection state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [showBulkKillModal, setShowBulkKillModal] = useState(false)
  const [showBulkBanModal, setShowBulkBanModal] = useState(false)
  const [bulkActionProgress, setBulkActionProgress] = useState<{ current: number; total: number } | null>(null)

  const [killReason, setKillReason] = useState('Killed by admin')
  const [banData, setBanData] = useState({
    type: 'gline',
    reason: '',
    duration: '1d',
  })
  const [vhost, setVhost] = useState('')

  // Get selected user objects
  const selectedUserObjects = useMemo(() => {
    if (!users) return []
    return users.filter(u => selectedUsers.has(u.id))
  }, [users, selectedUsers])

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const toggleAllSelection = () => {
    if (!users) return
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)))
    }
  }

  const clearSelection = () => {
    setSelectedUsers(new Set())
  }

  const columns = [
    {
      key: 'select',
      header: (
        <button
          onClick={toggleAllSelection}
          className="p-1 hover:bg-[var(--bg-hover)] rounded"
        >
          {users && selectedUsers.size === users.length ? (
            <CheckSquare size={18} className="text-[var(--accent)]" />
          ) : (
            <Square size={18} className="text-[var(--text-muted)]" />
          )}
        </button>
      ),
      render: (user: IRCUser) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleUserSelection(user.id)
          }}
          className="p-1 hover:bg-[var(--bg-hover)] rounded"
        >
          {selectedUsers.has(user.id) ? (
            <CheckSquare size={18} className="text-[var(--accent)]" />
          ) : (
            <Square size={18} className="text-[var(--text-muted)]" />
          )}
        </button>
      ),
    },
    {
      key: 'name',
      header: 'Nickname',
      sortable: true,
      render: (user: IRCUser) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/users/${encodeURIComponent(user.name)}`)}
            className="text-[var(--text-primary)] font-medium hover:text-[var(--accent)] hover:underline"
          >
            {user.name}
          </button>
          {user.oper_login && (
            <Badge variant="warning" size="sm">
              <ShieldCheck size={12} className="mr-1" />
              IRCOp
            </Badge>
          )}
          {user.tls && (
            <Badge variant="success" size="sm">TLS</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'hostname',
      header: 'Host',
      sortable: true,
      render: (user: IRCUser) => (
        <span className="text-[var(--text-secondary)]">
          {user.vhost || user.hostname}
        </span>
      ),
    },
    {
      key: 'ip',
      header: 'IP',
      sortable: true,
      render: (user: IRCUser) => (
        <span className="text-[var(--text-muted)] font-mono text-sm">{user.ip || 'Hidden'}</span>
      ),
    },
    {
      key: 'channels',
      header: 'Channels',
      render: (user: IRCUser) => (
        <span className="text-[var(--text-muted)]">
          {user.channels?.length || 0}
        </span>
      ),
    },
    {
      key: 'idle',
      header: 'Idle',
      sortable: true,
      render: (user: IRCUser) => (
        <span className="text-[var(--text-muted)]">{formatIdle(user.idle)}</span>
      ),
    },
    {
      key: 'server',
      header: 'Server',
      render: (user: IRCUser) => (
        <span className="text-[var(--text-muted)]">{user.server_name || user.server || 'Unknown'}</span>
      ),
    },
  ]

  const handleKill = async () => {
    if (!selectedUser) return
    try {
      await killUser.mutateAsync({ nick: selectedUser.name, reason: killReason })
      toast.success(`Killed ${selectedUser.name}`)
      setShowKillModal(false)
      setSelectedUser(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to kill user'
      toast.error(message)
    }
  }

  const handleBan = async () => {
    if (!selectedUser) return
    try {
      await banUser.mutateAsync({
        nick: selectedUser.name,
        type: banData.type,
        reason: banData.reason,
        duration: banData.duration,
      })
      toast.success(`Banned ${selectedUser.name}`)
      setShowBanModal(false)
      setSelectedUser(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to ban user'
      toast.error(message)
    }
  }

  const handleSetVhost = async () => {
    if (!selectedUser) return
    try {
      await setUserVhost.mutateAsync({ nick: selectedUser.name, vhost })
      toast.success(`Set vhost for ${selectedUser.name}`)
      setShowVhostModal(false)
      setSelectedUser(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to set vhost'
      toast.error(message)
    }
  }

  // Bulk action handlers
  const handleBulkKill = async () => {
    const usersToKill = selectedUserObjects
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < usersToKill.length; i++) {
      const user = usersToKill[i]
      setBulkActionProgress({ current: i + 1, total: usersToKill.length })
      
      try {
        await killUser.mutateAsync({ nick: user.name, reason: killReason })
        successCount++
      } catch {
        failCount++
      }
    }

    setBulkActionProgress(null)
    setShowBulkKillModal(false)
    clearSelection()

    if (failCount === 0) {
      toast.success(`Successfully killed ${successCount} users`)
    } else {
      toast.error(`Killed ${successCount} users, ${failCount} failed`)
    }
  }

  const handleBulkBan = async () => {
    const usersToBan = selectedUserObjects
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < usersToBan.length; i++) {
      const user = usersToBan[i]
      setBulkActionProgress({ current: i + 1, total: usersToBan.length })
      
      try {
        await banUser.mutateAsync({
          nick: user.name,
          type: banData.type,
          reason: banData.reason,
          duration: banData.duration,
        })
        successCount++
      } catch {
        failCount++
      }
    }

    setBulkActionProgress(null)
    setShowBulkBanModal(false)
    clearSelection()

    if (failCount === 0) {
      toast.success(`Successfully banned ${successCount} users`)
    } else {
      toast.error(`Banned ${successCount} users, ${failCount} failed`)
    }
  }

  if (error) {
    return (
      <Alert type="error">
        Failed to load users: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Users</h1>
        <p className="text-[var(--text-muted)] mt-1">Manage connected users on the network</p>
      </div>

      {/* Bulk Action Bar */}
      {selectedUsers.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-[var(--accent)]" />
            <span className="text-[var(--text-primary)] font-medium">
              {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={clearSelection}
            >
              Clear Selection
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Skull size={16} />}
              onClick={() => setShowBulkKillModal(true)}
            >
              Kill All
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Ban size={16} />}
              onClick={() => setShowBulkBanModal(true)}
            >
              Ban All
            </Button>
          </div>
        </div>
      )}

      <DataTable
        data={users || []}
        columns={columns}
        keyField="id"
        isLoading={isLoading}
        searchPlaceholder="Search users by nick, host, IP..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchExtra={
          <SavedSearches
            page="users"
            currentQuery={searchQuery}
            onApplySearch={(query) => setSearchQuery(query)}
          />
        }
        actions={(user) => (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/users/${encodeURIComponent(user.name)}`)}
              title="View Details"
            >
              <Eye size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedUser(user)
                setVhost(user.vhost || '')
                setShowVhostModal(true)
              }}
            >
              <Globe size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedUser(user)
                setShowKillModal(true)
              }}
            >
              <Skull size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300"
              onClick={() => {
                setSelectedUser(user)
                setShowBanModal(true)
              }}
            >
              <Ban size={16} />
            </Button>
          </>
        )}
      />

      {/* User Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={`User: ${selectedUser?.name}`}
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Nickname</p>
                <p className="text-[var(--text-primary)]">{selectedUser.name}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Username</p>
                <p className="text-[var(--text-primary)]">{selectedUser.username || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Real Name</p>
                <p className="text-[var(--text-primary)]">{selectedUser.realname || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Hostname</p>
                <p className="text-[var(--text-primary)] font-mono text-sm">{selectedUser.hostname}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">IP Address</p>
                <p className="text-[var(--text-primary)] font-mono text-sm">{selectedUser.ip || 'Hidden'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Virtual Host</p>
                <p className="text-[var(--text-primary)] font-mono text-sm">{selectedUser.vhost || 'None'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Server</p>
                <p className="text-[var(--text-primary)]">{selectedUser.server_name || selectedUser.server || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Connected Since</p>
                <p className="text-[var(--text-primary)]">
                  {selectedUser.connected_since
                    ? new Date(selectedUser.connected_since * 1000).toLocaleString()
                    : 'Unknown'}
                </p>
              </div>
            </div>

            {selectedUser.channels && selectedUser.channels.length > 0 && (
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-2">Channels</p>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.channels.map((ch: string) => (
                    <Badge key={ch} variant="info">{ch}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm text-[var(--text-muted)] mb-2">User Modes</p>
              <p className="text-[var(--text-primary)] font-mono">+{selectedUser.modes || 'none'}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Kill Modal */}
      <Modal
        isOpen={showKillModal}
        onClose={() => setShowKillModal(false)}
        title={`Kill User: ${selectedUser?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowKillModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleKill} isLoading={killUser.isPending}>
              Kill User
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert type="warning">
            This will forcefully disconnect {selectedUser?.name} from the network.
          </Alert>
          <Input
            label="Reason"
            value={killReason}
            onChange={(e) => setKillReason(e.target.value)}
            placeholder="Enter kill reason"
          />
        </div>
      </Modal>

      {/* Ban Modal */}
      <Modal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        title={`Ban User: ${selectedUser?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBanModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleBan} isLoading={banUser.isPending}>
              Ban User
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Ban Type"
            value={banData.type}
            onChange={(e) => setBanData({ ...banData, type: e.target.value })}
          >
            <option value="gline">G-Line (Global)</option>
            <option value="kline">K-Line (Local)</option>
            <option value="gzline">GZ-Line (Global IP)</option>
            <option value="zline">Z-Line (Local IP)</option>
            <option value="shun">Shun</option>
          </Select>
          <Input
            label="Reason"
            value={banData.reason}
            onChange={(e) => setBanData({ ...banData, reason: e.target.value })}
            placeholder="Enter ban reason"
          />
          <Select
            label="Duration"
            value={banData.duration}
            onChange={(e) => setBanData({ ...banData, duration: e.target.value })}
          >
            <option value="1h">1 Hour</option>
            <option value="6h">6 Hours</option>
            <option value="1d">1 Day</option>
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
            <option value="0">Permanent</option>
          </Select>
        </div>
      </Modal>

      {/* Vhost Modal */}
      <Modal
        isOpen={showVhostModal}
        onClose={() => setShowVhostModal(false)}
        title={`Set Vhost: ${selectedUser?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowVhostModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetVhost} isLoading={setUserVhost.isPending}>
              Set Vhost
            </Button>
          </>
        }
      >
        <Input
          label="Virtual Host"
          value={vhost}
          onChange={(e) => setVhost(e.target.value)}
          placeholder="e.g., user.mynetwork.org"
          helperText="Leave empty to remove the current vhost"
        />
      </Modal>

      {/* Bulk Kill Modal */}
      <Modal
        isOpen={showBulkKillModal}
        onClose={() => !bulkActionProgress && setShowBulkKillModal(false)}
        title={`Kill ${selectedUsers.size} Users`}
        footer={
          <>
            <Button 
              variant="secondary" 
              onClick={() => setShowBulkKillModal(false)}
              disabled={!!bulkActionProgress}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleBulkKill} 
              isLoading={!!bulkActionProgress}
            >
              {bulkActionProgress 
                ? `Killing... (${bulkActionProgress.current}/${bulkActionProgress.total})`
                : `Kill ${selectedUsers.size} Users`
              }
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert type="warning">
            This will forcefully disconnect {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} from the network.
          </Alert>
          <div className="max-h-32 overflow-y-auto bg-[var(--bg-tertiary)] rounded p-2">
            <div className="flex flex-wrap gap-1">
              {selectedUserObjects.map(user => (
                <Badge key={user.id} variant="default" size="sm">{user.name}</Badge>
              ))}
            </div>
          </div>
          <Input
            label="Reason"
            value={killReason}
            onChange={(e) => setKillReason(e.target.value)}
            placeholder="Enter kill reason"
          />
        </div>
      </Modal>

      {/* Bulk Ban Modal */}
      <Modal
        isOpen={showBulkBanModal}
        onClose={() => !bulkActionProgress && setShowBulkBanModal(false)}
        title={`Ban ${selectedUsers.size} Users`}
        footer={
          <>
            <Button 
              variant="secondary" 
              onClick={() => setShowBulkBanModal(false)}
              disabled={!!bulkActionProgress}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleBulkBan} 
              isLoading={!!bulkActionProgress}
            >
              {bulkActionProgress 
                ? `Banning... (${bulkActionProgress.current}/${bulkActionProgress.total})`
                : `Ban ${selectedUsers.size} Users`
              }
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert type="error">
            This will ban {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} from the network.
          </Alert>
          <div className="max-h-32 overflow-y-auto bg-[var(--bg-tertiary)] rounded p-2">
            <div className="flex flex-wrap gap-1">
              {selectedUserObjects.map(user => (
                <Badge key={user.id} variant="default" size="sm">{user.name}</Badge>
              ))}
            </div>
          </div>
          <Select
            label="Ban Type"
            value={banData.type}
            onChange={(e) => setBanData({ ...banData, type: e.target.value })}
          >
            <option value="gline">G-Line (Global)</option>
            <option value="kline">K-Line (Local)</option>
            <option value="gzline">GZ-Line (Global IP)</option>
            <option value="zline">Z-Line (Local IP)</option>
            <option value="shun">Shun</option>
          </Select>
          <Input
            label="Reason"
            value={banData.reason}
            onChange={(e) => setBanData({ ...banData, reason: e.target.value })}
            placeholder="Enter ban reason"
          />
          <Select
            label="Duration"
            value={banData.duration}
            onChange={(e) => setBanData({ ...banData, duration: e.target.value })}
          >
            <option value="1h">1 Hour</option>
            <option value="6h">6 Hours</option>
            <option value="1d">1 Day</option>
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
            <option value="0">Permanent</option>
          </Select>
        </div>
      </Modal>
    </div>
  )
}

function formatIdle(seconds?: number): string {
  if (!seconds) return 'Active'
  
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}
