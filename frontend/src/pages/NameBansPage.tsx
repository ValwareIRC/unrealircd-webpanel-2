import { useState } from 'react'
import { useNameBans, useAddNameBan, useDeleteNameBan } from '@/hooks'
import { DataTable, Button, Modal, Input, Select, Alert, Badge } from '@/components/common'
import { Plus, Trash2, Clock } from 'lucide-react'
import type { NameBan } from '@/types'
import toast from 'react-hot-toast'

export function NameBansPage() {
  const { data: bans, isLoading, error } = useNameBans()
  const addBan = useAddNameBan()
  const deleteBan = useDeleteNameBan()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedBan, setSelectedBan] = useState<NameBan | null>(null)

  const [newBan, setNewBan] = useState({
    type: 'qline',
    name: '',
    reason: '',
    duration: '1d',
  })

  const columns = [
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (ban: NameBan) => (
        <Badge variant={(ban.type || ban.type_string) === 'qline' ? 'error' : 'warning'}>
          {(ban.type || ban.type_string || 'qline').toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'name',
      header: 'Name/Pattern',
      sortable: true,
      render: (ban: NameBan) => (
        <span className="text-[var(--text-primary)] font-mono">{ban.name}</span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (ban: NameBan) => (
        <span className="text-[var(--text-muted)] truncate max-w-md block">{ban.reason}</span>
      ),
    },
    {
      key: 'set_by',
      header: 'Set By',
      render: (ban: NameBan) => (
        <span className="text-[var(--text-muted)]">{ban.set_by}</span>
      ),
    },
    {
      key: 'set_at',
      header: 'Set At',
      sortable: true,
      render: (ban: NameBan) => (
        <span className="text-[var(--text-muted)]">
          {ban.set_at ? new Date(ban.set_at * 1000).toLocaleDateString() : 'Unknown'}
        </span>
      ),
    },
    {
      key: 'expire_at',
      header: 'Expires',
      sortable: true,
      render: (ban: NameBan) => (
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Clock size={14} />
          {!ban.expire_at || ban.expire_at === 0 ? (
            <Badge variant="error" size="sm">Permanent</Badge>
          ) : (
            new Date(ban.expire_at * 1000).toLocaleDateString()
          )}
        </div>
      ),
    },
  ]

  const handleAddBan = async () => {
    try {
      await addBan.mutateAsync(newBan)
      toast.success('Name ban added successfully')
      setShowAddModal(false)
      setNewBan({ type: 'qline', name: '', reason: '', duration: '1d' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add ban'
      toast.error(message)
    }
  }

  const handleDeleteBan = async () => {
    if (!selectedBan) return
    try {
      await deleteBan.mutateAsync({ name: selectedBan.name, type: selectedBan.type || selectedBan.type_string || 'qline' })
      toast.success('Name ban removed')
      setShowDeleteModal(false)
      setSelectedBan(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove ban'
      toast.error(message)
    }
  }

  if (error) {
    return (
      <Alert type="error">
        Failed to load name bans: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Name Bans</h1>
          <p className="text-[var(--text-muted)] mt-1">Manage Q-Lines (reserved nicknames and channels)</p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setShowAddModal(true)}>
          Add Name Ban
        </Button>
      </div>

      <DataTable
        data={bans || []}
        columns={columns}
        keyField="name"
        isLoading={isLoading}
        searchPlaceholder="Search name bans..."
        actions={(ban) => (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300"
            onClick={() => {
              setSelectedBan(ban)
              setShowDeleteModal(true)
            }}
          >
            <Trash2 size={16} />
          </Button>
        )}
      />

      {/* Add Name Ban Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Name Ban"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBan} isLoading={addBan.isPending}>
              Add Ban
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Ban Type"
            value={newBan.type}
            onChange={(e) => setNewBan({ ...newBan, type: e.target.value })}
          >
            <option value="qline">Q-Line (Nickname)</option>
          </Select>
          <Input
            label="Name/Pattern"
            value={newBan.name}
            onChange={(e) => setNewBan({ ...newBan, name: e.target.value })}
            placeholder="e.g., Admin* or #official*"
            helperText="Use * as wildcard"
          />
          <Input
            label="Reason"
            value={newBan.reason}
            onChange={(e) => setNewBan({ ...newBan, reason: e.target.value })}
            placeholder="Enter ban reason"
          />
          <Select
            label="Duration"
            value={newBan.duration}
            onChange={(e) => setNewBan({ ...newBan, duration: e.target.value })}
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

      {/* Delete Ban Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Remove Name Ban"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteBan} isLoading={deleteBan.isPending}>
              Remove Ban
            </Button>
          </>
        }
      >
        <Alert type="warning">
          Are you sure you want to remove this name ban for{' '}
          <span className="font-mono">{selectedBan?.name}</span>?
        </Alert>
      </Modal>
    </div>
  )
}
