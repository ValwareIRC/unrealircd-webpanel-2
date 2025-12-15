import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { 
  getWatchedUsers, 
  addWatchedUser, 
  updateWatchedUser, 
  deleteWatchedUser,
  WatchedUser,
  WatchedUserRequest,
  MatchedIRCUser
} from '@/services/watchlistService'
import { DataTable, Button, Modal, Input, Alert, Badge } from '@/components/common'
import { Eye, Plus, Edit2, Trash2, Users, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

export function WatchListPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: watchedUsers, isLoading, error } = useQuery({
    queryKey: ['watchlist'],
    queryFn: getWatchedUsers,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showMatchesModal, setShowMatchesModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<WatchedUser | null>(null)
  const [formData, setFormData] = useState<WatchedUserRequest>({
    nick: '',
    ip: '',
    host: '',
    account: '',
    realname: '',
    reason: '',
  })

  const addMutation = useMutation({
    mutationFn: addWatchedUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      toast.success(t('watchList.messages.added'))
      setShowAddModal(false)
      resetForm()
    },
    onError: (err: Error) => {
      toast.error(err.message || t('watchList.messages.addFailed'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: WatchedUserRequest }) => updateWatchedUser(id, data),
      onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      toast.success(t('watchList.messages.updated'))
      setShowEditModal(false)
      resetForm()
    },
    onError: (err: Error) => {
      toast.error(err.message || t('watchList.messages.updateFailed'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWatchedUser,
      onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      toast.success(t('watchList.messages.removed'))
      setShowDeleteModal(false)
      setSelectedUser(null)
    },
    onError: (err: Error) => {
      toast.error(err.message || t('watchList.messages.removeFailed'))
    },
  })

  const resetForm = () => {
    setFormData({
      nick: '',
      ip: '',
      host: '',
      account: '',
      realname: '',
      reason: '',
    })
    setSelectedUser(null)
  }

  const openEditModal = (user: WatchedUser) => {
    setSelectedUser(user)
    setFormData({
      nick: user.nick || '',
      ip: user.ip || '',
      host: user.host || '',
      account: user.account || '',
      realname: user.realname || '',
      reason: user.reason,
    })
    setShowEditModal(true)
  }

  const columns = [
    {
      key: 'criteria',
      header: t('watchList.table.criteria'),
      render: (user: WatchedUser) => (
        <div className="space-y-1">
          {user.nick && (
            <div className="flex items-center gap-2">
              <Badge variant="info" size="sm">{t('watchList.labels.nick')}</Badge>
              <span className="font-mono text-sm">{user.nick}</span>
            </div>
          )}
          {user.ip && (
            <div className="flex items-center gap-2">
              <Badge variant="warning" size="sm">{t('watchList.labels.ip')}</Badge>
              <span className="font-mono text-sm">{user.ip}</span>
            </div>
          )}
          {user.host && (
            <div className="flex items-center gap-2">
              <Badge variant="default" size="sm">{t('watchList.labels.host')}</Badge>
              <span className="font-mono text-sm">{user.host}</span>
            </div>
          )}
          {user.account && (
            <div className="flex items-center gap-2">
              <Badge variant="success" size="sm">{t('watchList.labels.account')}</Badge>
              <span className="font-mono text-sm">{user.account}</span>
            </div>
          )}
          {user.realname && (
            <div className="flex items-center gap-2">
              <Badge variant="default" size="sm">{t('watchList.labels.realname')}</Badge>
              <span className="text-sm">{user.realname}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'reason',
      header: t('watchList.table.reason'),
      render: (user: WatchedUser) => (
        <span className="text-[var(--text-secondary)]">{user.reason}</span>
      ),
    },
    {
      key: 'added_by',
      header: t('watchList.table.addedBy'),
      render: (user: WatchedUser) => (
        <span className="text-[var(--text-muted)]">{user.added_by_username}</span>
      ),
    },
    {
      key: 'created_at',
      header: t('watchList.table.addedAt'),
      sortable: true,
      render: (user: WatchedUser) => (
        <span className="text-[var(--text-muted)] text-sm">
          {new Date(user.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'match_count',
      header: t('watchList.table.currentMatches'),
      render: (user: WatchedUser) => {
        const matchCount = user.current_matches?.length || 0
        return (
          <div className="flex items-center gap-2">
            <Badge variant={matchCount > 0 ? 'error' : 'default'}>
              {matchCount} {t('watchList.labels.online')}
            </Badge>
            {matchCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedUser(user)
                  setShowMatchesModal(true)
                }}
                title={t('watchList.tooltips.viewMatched')}
              >
                <Users size={16} />
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  if (error) {
    return (
      <Alert type="error">
        {t('watchList.messages.loadFailed', { error: error instanceof Error ? error.message : 'Unknown error' })}
      </Alert>
    )
  }

  // Calculate total matches across all entries
  const totalMatches = watchedUsers?.reduce((sum, user) => sum + (user.current_matches?.length || 0), 0) || 0
  const entriesWithMatches = watchedUsers?.filter(user => (user.current_matches?.length || 0) > 0).length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Eye size={28} />
            {t('watchList.title')}
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            {t('watchList.subtitle')}
          </p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setShowAddModal(true)}>
          {t('watchList.addButton')}
        </Button>
      </div>

      {/* Summary Cards */}
      {watchedUsers && watchedUsers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4">
            <div className="text-sm text-[var(--text-muted)]">{t('watchList.summary.entriesLabel')}</div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{watchedUsers.length}</div>
          </div>
          <div className={`border rounded-lg p-4 ${totalMatches > 0 ? 'bg-red-500/10 border-red-500/50' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'}`}>
            <div className="text-sm text-[var(--text-muted)]">{t('watchList.summary.usersCurrentlyMatched')}</div>
            <div className={`text-2xl font-bold ${totalMatches > 0 ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>
              {totalMatches}
            </div>
          </div>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4">
            <div className="text-sm text-[var(--text-muted)]">{t('watchList.summary.entriesWithActiveMatches')}</div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{entriesWithMatches}</div>
          </div>
        </div>
      )}

      {/* Alert if there are current matches */}
      {totalMatches > 0 && (
        <Alert type="warning">
          {t('watchList.alert', { count: totalMatches })}
        </Alert>
      )}

      <DataTable
        data={watchedUsers || []}
        columns={columns}
        keyField="id"
        isLoading={isLoading}
        searchPlaceholder={t('watchList.searchPlaceholder')}
        emptyMessage={t('watchList.emptyMessage')}
        actions={(user) => (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditModal(user)}
              title={t('common.edit')}
            >
              <Edit2 size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300"
              onClick={() => {
                setSelectedUser(user)
                setShowDeleteModal(true)
              }}
              title={t('common.remove')}
            >
              <Trash2 size={16} />
            </Button>
          </>
        )}
      />

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          resetForm()
        }}
        title={t('watchList.addModal.title')}
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              setShowAddModal(false)
              resetForm()
            }}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={() => addMutation.mutate(formData)}
              isLoading={addMutation.isPending}
              disabled={!formData.reason || (!formData.nick && !formData.ip && !formData.host && !formData.account && !formData.realname)}
            >
              {t('watchList.addModal.addButton')}
            </Button>
          </>
        }
      >
        <WatchListForm formData={formData} setFormData={setFormData} />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          resetForm()
        }}
        title={t('watchList.editModal.title')}
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              setShowEditModal(false)
              resetForm()
            }}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={() => selectedUser && updateMutation.mutate({ id: selectedUser.id, data: formData })}
              isLoading={updateMutation.isPending}
              disabled={!formData.reason || (!formData.nick && !formData.ip && !formData.host && !formData.account && !formData.realname)}
            >
              {t('watchList.editModal.saveButton')}
            </Button>
          </>
        }
      >
        <WatchListForm formData={formData} setFormData={setFormData} />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedUser(null)
        }}
        title={t('watchList.deleteModal.title')}
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              setShowDeleteModal(false)
              setSelectedUser(null)
            }}>
              {t('common.cancel')}
            </Button>
            <Button 
              variant="danger"
              onClick={() => selectedUser && deleteMutation.mutate(selectedUser.id)}
              isLoading={deleteMutation.isPending}
            >
              {t('watchList.deleteModal.removeButton')}
            </Button>
          </>
        }
      >
        <Alert type="warning">
          {t('watchList.deleteModal.confirm')}
        </Alert>
      </Modal>

      {/* View Matches Modal */}
      <Modal
        isOpen={showMatchesModal}
        onClose={() => {
          setShowMatchesModal(false)
          setSelectedUser(null)
        }}
        title={`Matched Users - ${selectedUser?.current_matches?.length || 0} found`}
        size="lg"
      >
        {selectedUser?.current_matches && selectedUser.current_matches.length > 0 ? (
          <div className="space-y-4">
            <Alert type="info">
              These users are currently online and match the watch criteria. Click a user to view their details.
            </Alert>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {selectedUser.current_matches.map((match, idx) => (
                <MatchedUserCard 
                  key={idx} 
                  match={match} 
                  onClick={() => {
                    setShowMatchesModal(false)
                    navigate(`/users/${encodeURIComponent(match.nick)}`)
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <Alert type="info">No users currently match this watch criteria.</Alert>
        )}
      </Modal>
    </div>
  )
}

// Component to display a matched user
function MatchedUserCard({ match, onClick }: { match: MatchedIRCUser; onClick: () => void }) {
  return (
    <div 
      className="bg-[var(--bg-tertiary)] p-4 rounded-lg border border-[var(--border-color)] cursor-pointer hover:bg-[var(--bg-hover)] hover:border-[var(--accent-color)] transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <div className="font-semibold text-lg text-[var(--text-primary)] flex items-center gap-2">
              {match.nick}
              <ExternalLink size={14} className="text-[var(--text-muted)]" />
            </div>
            <div className="text-sm text-[var(--text-muted)] font-mono">
              {match.username}@{match.hostname}
            </div>
          </div>
        </div>
        {match.account && (
          <Badge variant="success">Logged in: {match.account}</Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
        {match.ip && (
          <div>
            <span className="text-[var(--text-muted)]">IP:</span>{' '}
            <span className="font-mono text-[var(--text-primary)]">{match.ip}</span>
          </div>
        )}
        {match.realname && (
          <div>
            <span className="text-[var(--text-muted)]">Realname:</span>{' '}
            <span className="text-[var(--text-primary)]">{match.realname}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Form component for add/edit
function WatchListForm({ 
  formData, 
  setFormData 
}: { 
  formData: WatchedUserRequest
  setFormData: (data: WatchedUserRequest) => void 
}) {
  return (
    <div className="space-y-4">
      <Alert type="info">
        At least one match criteria is required. You can use wildcards (*) in patterns.
      </Alert>
      
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nickname Pattern"
          value={formData.nick}
          onChange={(e) => setFormData({ ...formData, nick: e.target.value })}
          placeholder="e.g., baduser* or *spam*"
        />
        <Input
          label="IP Address/CIDR"
          value={formData.ip}
          onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
          placeholder="e.g., 192.168.1.* or 10.0.0.0/24"
        />
        <Input
          label="Hostname Pattern"
          value={formData.host}
          onChange={(e) => setFormData({ ...formData, host: e.target.value })}
          placeholder="e.g., *.badhost.com"
        />
        <Input
          label="Account Name"
          value={formData.account}
          onChange={(e) => setFormData({ ...formData, account: e.target.value })}
          placeholder="e.g., suspicious_account"
        />
      </div>
      
      <Input
        label="Realname Pattern"
        value={formData.realname}
        onChange={(e) => setFormData({ ...formData, realname: e.target.value })}
        placeholder="e.g., *spam bot*"
      />
      
      <Input
        label="Reason *"
        value={formData.reason}
        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
        placeholder="Why is this user being watched?"
        required
      />
    </div>
  )
}
