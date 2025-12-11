import { useState } from 'react'
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
      toast.success('User added to watch list')
      setShowAddModal(false)
      resetForm()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to add user')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: WatchedUserRequest }) => updateWatchedUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      toast.success('Watch list entry updated')
      setShowEditModal(false)
      resetForm()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update entry')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWatchedUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      toast.success('Removed from watch list')
      setShowDeleteModal(false)
      setSelectedUser(null)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to remove entry')
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
      header: 'Match Criteria',
      render: (user: WatchedUser) => (
        <div className="space-y-1">
          {user.nick && (
            <div className="flex items-center gap-2">
              <Badge variant="info" size="sm">Nick</Badge>
              <span className="font-mono text-sm">{user.nick}</span>
            </div>
          )}
          {user.ip && (
            <div className="flex items-center gap-2">
              <Badge variant="warning" size="sm">IP</Badge>
              <span className="font-mono text-sm">{user.ip}</span>
            </div>
          )}
          {user.host && (
            <div className="flex items-center gap-2">
              <Badge variant="default" size="sm">Host</Badge>
              <span className="font-mono text-sm">{user.host}</span>
            </div>
          )}
          {user.account && (
            <div className="flex items-center gap-2">
              <Badge variant="success" size="sm">Account</Badge>
              <span className="font-mono text-sm">{user.account}</span>
            </div>
          )}
          {user.realname && (
            <div className="flex items-center gap-2">
              <Badge variant="default" size="sm">Realname</Badge>
              <span className="text-sm">{user.realname}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (user: WatchedUser) => (
        <span className="text-[var(--text-secondary)]">{user.reason}</span>
      ),
    },
    {
      key: 'added_by',
      header: 'Added By',
      render: (user: WatchedUser) => (
        <span className="text-[var(--text-muted)]">{user.added_by_username}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Added',
      sortable: true,
      render: (user: WatchedUser) => (
        <span className="text-[var(--text-muted)] text-sm">
          {new Date(user.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'match_count',
      header: 'Current Matches',
      render: (user: WatchedUser) => {
        const matchCount = user.current_matches?.length || 0
        return (
          <div className="flex items-center gap-2">
            <Badge variant={matchCount > 0 ? 'error' : 'default'}>
              {matchCount} online
            </Badge>
            {matchCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedUser(user)
                  setShowMatchesModal(true)
                }}
                title="View matched users"
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
        Failed to load watch list: {error instanceof Error ? error.message : 'Unknown error'}
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
            Watch List
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Monitor users matching specific criteria
          </p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setShowAddModal(true)}>
          Add to Watch List
        </Button>
      </div>

      {/* Summary Cards */}
      {watchedUsers && watchedUsers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4">
            <div className="text-sm text-[var(--text-muted)]">Watch List Entries</div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{watchedUsers.length}</div>
          </div>
          <div className={`border rounded-lg p-4 ${totalMatches > 0 ? 'bg-red-500/10 border-red-500/50' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'}`}>
            <div className="text-sm text-[var(--text-muted)]">Users Currently Matched</div>
            <div className={`text-2xl font-bold ${totalMatches > 0 ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>
              {totalMatches}
            </div>
          </div>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4">
            <div className="text-sm text-[var(--text-muted)]">Entries with Active Matches</div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{entriesWithMatches}</div>
          </div>
        </div>
      )}

      {/* Alert if there are current matches */}
      {totalMatches > 0 && (
        <Alert type="warning">
          <strong>{totalMatches} user{totalMatches !== 1 ? 's' : ''}</strong> currently online match{totalMatches === 1 ? 'es' : ''} your watch list criteria. 
          Click the expand arrow or <Users size={14} className="inline mx-1" /> icon to view details.
        </Alert>
      )}

      <DataTable
        data={watchedUsers || []}
        columns={columns}
        keyField="id"
        isLoading={isLoading}
        searchPlaceholder="Search by nick, IP, reason..."
        emptyMessage="No users in watch list"
        actions={(user) => (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditModal(user)}
              title="Edit"
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
              title="Remove"
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
        title="Add to Watch List"
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              setShowAddModal(false)
              resetForm()
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => addMutation.mutate(formData)}
              isLoading={addMutation.isPending}
              disabled={!formData.reason || (!formData.nick && !formData.ip && !formData.host && !formData.account && !formData.realname)}
            >
              Add to Watch List
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
        title="Edit Watch List Entry"
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              setShowEditModal(false)
              resetForm()
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedUser && updateMutation.mutate({ id: selectedUser.id, data: formData })}
              isLoading={updateMutation.isPending}
              disabled={!formData.reason || (!formData.nick && !formData.ip && !formData.host && !formData.account && !formData.realname)}
            >
              Save Changes
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
        title="Remove from Watch List"
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              setShowDeleteModal(false)
              setSelectedUser(null)
            }}>
              Cancel
            </Button>
            <Button 
              variant="danger"
              onClick={() => selectedUser && deleteMutation.mutate(selectedUser.id)}
              isLoading={deleteMutation.isPending}
            >
              Remove
            </Button>
          </>
        }
      >
        <Alert type="warning">
          Are you sure you want to remove this entry from the watch list?
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
