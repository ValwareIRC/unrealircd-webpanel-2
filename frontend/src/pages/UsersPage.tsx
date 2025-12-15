import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIRCUsers, useKillUser, useBanUser, useSetUserVhost } from '@/hooks'
import { DataTable, Button, Modal, Input, Select, Alert, Badge, SavedSearches } from '@/components/common'
import { Eye, Ban, Skull, ShieldCheck, Globe, CheckSquare, Square, Users } from 'lucide-react'
import type { IRCUser } from '@/types'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

export function UsersPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
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
      header: t('users.nickname'),
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
              {t('users.ircOp')}
            </Badge>
          )}
          {user.tls && (
            <Badge variant="success" size="sm">{t('users.tls')}</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'hostname',
      header: t('users.host'),
      sortable: true,
      render: (user: IRCUser) => (
        <span className="text-[var(--text-secondary)]">
          {user.vhost || user.hostname}
        </span>
      ),
    },
    {
      key: 'ip',
      header: t('users.ip'),
      sortable: true,
      render: (user: IRCUser) => (
        <span className="text-[var(--text-muted)] font-mono text-sm">{user.ip || t('users.hidden')}</span>
      ),
    },
    {
      key: 'channels',
      header: t('users.channels'),
      render: (user: IRCUser) => (
        <span className="text-[var(--text-muted)]">
          {user.channels?.length || 0}
        </span>
      ),
    },
    {
      key: 'idle',
      header: t('users.idle'),
      sortable: true,
      render: (user: IRCUser) => (
        <span className="text-[var(--text-muted)]">{formatIdle(t, user.idle)}</span>
      ),
    },
    {
      key: 'server',
      header: t('users.server'),
      render: (user: IRCUser) => (
        <span className="text-[var(--text-muted)]">{user.server_name || user.server || t('users.unknown')}</span>
      ),
    },
  ]

  const handleKill = async () => {
    if (!selectedUser) return
    try {
      await killUser.mutateAsync({ nick: selectedUser.name, reason: killReason })
      toast.success(t('users.killSuccess', { name: selectedUser.name }))
      setShowKillModal(false)
      setSelectedUser(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('users.killFailed')
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
      toast.success(t('users.banSuccess', { name: selectedUser.name }))
      setShowBanModal(false)
      setSelectedUser(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('users.banFailed')
      toast.error(message)
    }
  }

  const handleSetVhost = async () => {
    if (!selectedUser) return
    try {
      await setUserVhost.mutateAsync({ nick: selectedUser.name, vhost })
      toast.success(t('users.vhostSuccess', { name: selectedUser.name }))
      setShowVhostModal(false)
      setSelectedUser(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('users.vhostFailed')
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
      toast.success(t('users.bulkBanSuccess', { count: successCount }))
    } else {
      toast.error(t('users.bulkBanPartial', { success: successCount, failed: failCount }))
    }
  }

  if (error) {
    return (
      <Alert type="error">
        {t('users.loadError', { error: error instanceof Error ? error.message : 'Unknown error' })}
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('users.title')}</h1>
        <p className="text-[var(--text-muted)] mt-1">{t('users.subtitle')}</p>
      </div>

      {/* Bulk Action Bar */}
      {selectedUsers.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-[var(--accent)]" />
            <span className="text-[var(--text-primary)] font-medium">
              {t('users.selectedUsers', { count: selectedUsers.size })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={clearSelection}
            >
              {t('users.clearSelection')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Skull size={16} />}
              onClick={() => setShowBulkKillModal(true)}
            >
              {t('users.killAll')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Ban size={16} />}
              onClick={() => setShowBulkBanModal(true)}
            >
              {t('users.banAll')}
            </Button>
          </div>
        </div>
      )}

      <DataTable
        data={users || []}
        columns={columns}
        keyField="id"
        isLoading={isLoading}
        searchPlaceholder={t('users.searchPlaceholder')}
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
              title={t('users.viewDetails')}
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
        title={t('users.userDetails', { name: selectedUser?.name })}
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--text-muted)]">{t('users.nickname')}</p>
                <p className="text-[var(--text-primary)]">{selectedUser.name}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">{t('users.username')}</p>
                <p className="text-[var(--text-primary)]">{selectedUser.username || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">{t('users.realName')}</p>
                <p className="text-[var(--text-primary)]">{selectedUser.realname || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">{t('users.hostname')}</p>
                <p className="text-[var(--text-primary)] font-mono text-sm">{selectedUser.hostname}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">{t('users.ipAddress')}</p>
                <p className="text-[var(--text-primary)] font-mono text-sm">{selectedUser.ip || t('users.hidden')}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">{t('users.virtualHost')}</p>
                <p className="text-[var(--text-primary)] font-mono text-sm">{selectedUser.vhost || t('users.none')}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">{t('users.server')}</p>
                <p className="text-[var(--text-primary)]">{selectedUser.server_name || selectedUser.server || t('users.unknown')}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">{t('users.connectedSince')}</p>
                <p className="text-[var(--text-primary)]">
                  {selectedUser.connected_since
                    ? new Date(selectedUser.connected_since * 1000).toLocaleString()
                    : t('users.unknown')}
                </p>
              </div>
            </div>

            {selectedUser.channels && selectedUser.channels.length > 0 && (
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-2">{t('users.channels')}</p>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.channels.map((ch: string) => (
                    <Badge key={ch} variant="info">{ch}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm text-[var(--text-muted)] mb-2">{t('users.userModes')}</p>
              <p className="text-[var(--text-primary)] font-mono">+{selectedUser.modes || 'none'}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Kill Modal */}
      <Modal
        isOpen={showKillModal}
        onClose={() => setShowKillModal(false)}
        title={t('users.killUserTitle', { name: selectedUser?.name })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowKillModal(false)}>
              {t('users.cancel')}
            </Button>
            <Button variant="danger" onClick={handleKill} isLoading={killUser.isPending}>
              {t('users.killUserButton')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert type="warning">
            {t('users.killUserWarning', { name: selectedUser?.name })}
          </Alert>
          <Input
            label={t('users.reason')}
            value={killReason}
            onChange={(e) => setKillReason(e.target.value)}
            placeholder={t('users.enterKillReason')}
          />
        </div>
      </Modal>

      {/* Ban Modal */}
      <Modal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        title={t('users.banUserTitle', { name: selectedUser?.name })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBanModal(false)}>
              {t('users.cancel')}
            </Button>
            <Button variant="danger" onClick={handleBan} isLoading={banUser.isPending}>
              {t('users.banUserButton')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label={t('users.banType')}
            value={banData.type}
            onChange={(e) => setBanData({ ...banData, type: e.target.value })}
          >
            <option value="gline">{t('users.gline')}</option>
            <option value="kline">{t('users.kline')}</option>
            <option value="gzline">{t('users.gzline')}</option>
            <option value="zline">{t('users.zline')}</option>
            <option value="shun">{t('users.shun')}</option>
          </Select>
          <Input
            label={t('users.reason')}
            value={banData.reason}
            onChange={(e) => setBanData({ ...banData, reason: e.target.value })}
            placeholder={t('users.enterBanReason')}
          />
          <Select
            label={t('users.duration')}
            value={banData.duration}
            onChange={(e) => setBanData({ ...banData, duration: e.target.value })}
          >
            <option value="1h">{t('users.oneHour')}</option>
            <option value="6h">{t('users.sixHours')}</option>
            <option value="1d">{t('users.oneDay')}</option>
            <option value="7d">{t('users.sevenDays')}</option>
            <option value="30d">{t('users.thirtyDays')}</option>
            <option value="0">{t('users.permanent')}</option>
          </Select>
        </div>
      </Modal>

      {/* Vhost Modal */}
      <Modal
        isOpen={showVhostModal}
        onClose={() => setShowVhostModal(false)}
        title={t('users.setVhostTitle', { name: selectedUser?.name })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowVhostModal(false)}>
              {t('users.cancel')}
            </Button>
            <Button onClick={handleSetVhost} isLoading={setUserVhost.isPending}>
              {t('users.setVhost')}
            </Button>
          </>
        }
      >
        <Input
          label={t('users.virtualHost')}
          value={vhost}
          onChange={(e) => setVhost(e.target.value)}
          placeholder={t('users.vhostPlaceholder')}
          helperText={t('users.vhostHelperText')}
        />
      </Modal>

      {/* Bulk Kill Modal */}
      <Modal
        isOpen={showBulkKillModal}
        onClose={() => !bulkActionProgress && setShowBulkKillModal(false)}
        title={t('users.killUsersTitle', { count: selectedUsers.size })}
        footer={
          <>
            <Button 
              variant="secondary" 
              onClick={() => setShowBulkKillModal(false)}
              disabled={!!bulkActionProgress}
            >
              {t('users.cancel')}
            </Button>
            <Button 
              variant="danger" 
              onClick={handleBulkKill} 
              isLoading={!!bulkActionProgress}
            >
              {bulkActionProgress 
                ? t('users.killingProgress', { current: bulkActionProgress.current, total: bulkActionProgress.total })
                : t('users.killUsersButton', { count: selectedUsers.size })
              }
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert type="warning">
            {t('users.bulkKillWarning', { count: selectedUsers.size })}
          </Alert>
          <div className="max-h-32 overflow-y-auto bg-[var(--bg-tertiary)] rounded p-2">
            <div className="flex flex-wrap gap-1">
              {selectedUserObjects.map(user => (
                <Badge key={user.id} variant="default" size="sm">{user.name}</Badge>
              ))}
            </div>
          </div>
          <Input
            label={t('users.reason')}
            value={killReason}
            onChange={(e) => setKillReason(e.target.value)}
            placeholder={t('users.enterKillReason')}
          />
        </div>
      </Modal>

      {/* Bulk Ban Modal */}
      <Modal
        isOpen={showBulkBanModal}
        onClose={() => !bulkActionProgress && setShowBulkBanModal(false)}
        title={t('users.banUsersTitle', { count: selectedUsers.size })}
        footer={
          <>
            <Button 
              variant="secondary" 
              onClick={() => setShowBulkBanModal(false)}
              disabled={!!bulkActionProgress}
            >
              {t('users.cancel')}
            </Button>
            <Button 
              variant="danger" 
              onClick={handleBulkBan} 
              isLoading={!!bulkActionProgress}
            >
              {bulkActionProgress 
                ? t('users.banningProgress', { current: bulkActionProgress.current, total: bulkActionProgress.total })
                : t('users.banUsersButton', { count: selectedUsers.size })
              }
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert type="error">
            {t('users.bulkBanWarning', { count: selectedUsers.size })}
          </Alert>
          <div className="max-h-32 overflow-y-auto bg-[var(--bg-tertiary)] rounded p-2">
            <div className="flex flex-wrap gap-1">
              {selectedUserObjects.map(user => (
                <Badge key={user.id} variant="default" size="sm">{user.name}</Badge>
              ))}
            </div>
          </div>
          <Select
            label={t('users.banType')}
            value={banData.type}
            onChange={(e) => setBanData({ ...banData, type: e.target.value })}
          >
            <option value="gline">{t('users.gline')}</option>
            <option value="kline">{t('users.kline')}</option>
            <option value="gzline">{t('users.gzline')}</option>
            <option value="zline">{t('users.zline')}</option>
            <option value="shun">{t('users.shun')}</option>
          </Select>
          <Input
            label={t('users.reason')}
            value={banData.reason}
            onChange={(e) => setBanData({ ...banData, reason: e.target.value })}
            placeholder={t('users.enterBanReason')}
          />
          <Select
            label={t('users.duration')}
            value={banData.duration}
            onChange={(e) => setBanData({ ...banData, duration: e.target.value })}
          >
            <option value="1h">{t('users.oneHour')}</option>
            <option value="6h">{t('users.sixHours')}</option>
            <option value="1d">{t('users.oneDay')}</option>
            <option value="7d">{t('users.sevenDays')}</option>
            <option value="30d">{t('users.thirtyDays')}</option>
            <option value="0">{t('users.permanent')}</option>
          </Select>
        </div>
      </Modal>
    </div>
  )
}

function formatIdle(t: any, seconds?: number): string {
  if (!seconds) return t('users.active')
  
  if (seconds < 60) return t('users.seconds', { count: seconds })
  if (seconds < 3600) return t('users.minutes', { count: Math.floor(seconds / 60) })
  if (seconds < 86400) return t('users.hours', { count: Math.floor(seconds / 3600) })
  return t('users.days', { count: Math.floor(seconds / 86400) })
}
