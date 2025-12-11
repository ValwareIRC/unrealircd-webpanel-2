import { useState } from 'react'
import { useBanExceptions, useAddBanException, useDeleteBanException } from '@/hooks'
import { DataTable, Button, Modal, Input, Select, Alert, Badge } from '@/components/common'
import { Plus, Trash2, Shield } from 'lucide-react'
import type { BanException } from '@/types'
import toast from 'react-hot-toast'

export function BanExceptionsPage() {
  const { data: exceptions, isLoading, error } = useBanExceptions()
  const addException = useAddBanException()
  const deleteException = useDeleteBanException()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedException, setSelectedException] = useState<BanException | null>(null)

  const [newException, setNewException] = useState({
    name: '',
    types: 'gline',
    reason: '',
  })

  const columns = [
    {
      key: 'name',
      header: 'Mask',
      sortable: true,
      render: (exc: BanException) => (
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-green-400" />
          <span className="text-[var(--text-primary)] font-mono">{exc.name}</span>
        </div>
      ),
    },
    {
      key: 'exception_types',
      header: 'Exception Types',
      render: (exc: BanException) => (
        <div className="flex flex-wrap gap-1">
          {exc.exception_types && typeof exc.exception_types === 'string' ? (
            <Badge variant="success" size="sm">
              {exc.exception_types}
            </Badge>
          ) : exc.exception_types && Array.isArray(exc.exception_types) ? (
            exc.exception_types.map((type: string) => (
              <Badge key={type} variant="success" size="sm">
                {type}
              </Badge>
            ))
          ) : (
            <span className="text-[var(--text-muted)]">All</span>
          )}
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (exc: BanException) => (
        <span className="text-[var(--text-muted)] truncate max-w-md block">{exc.reason || 'No reason'}</span>
      ),
    },
    {
      key: 'set_by',
      header: 'Set By',
      render: (exc: BanException) => (
        <span className="text-[var(--text-muted)]">{exc.set_by}</span>
      ),
    },
    {
      key: 'set_at',
      header: 'Set At',
      sortable: true,
      render: (exc: BanException) => (
        <span className="text-[var(--text-muted)]">
          {exc.set_at ? new Date(exc.set_at * 1000).toLocaleDateString() : 'Unknown'}
        </span>
      ),
    },
  ]

  const handleAddException = async () => {
    try {
      await addException.mutateAsync(newException)
      toast.success('Exception added successfully')
      setShowAddModal(false)
      setNewException({ name: '', types: 'gline', reason: '' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add exception'
      toast.error(message)
    }
  }

  const handleDeleteException = async () => {
    if (!selectedException) return
    try {
      await deleteException.mutateAsync(selectedException.name)
      toast.success('Exception removed')
      setShowDeleteModal(false)
      setSelectedException(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove exception'
      toast.error(message)
    }
  }

  if (error) {
    return (
      <Alert type="error">
        Failed to load exceptions: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Ban Exceptions</h1>
          <p className="text-[var(--text-muted)] mt-1">Manage E-Lines (ban exceptions)</p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setShowAddModal(true)}>
          Add Exception
        </Button>
      </div>

      <DataTable
        data={exceptions || []}
        columns={columns}
        keyField="name"
        isLoading={isLoading}
        searchPlaceholder="Search exceptions..."
        actions={(exc) => (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300"
            onClick={() => {
              setSelectedException(exc)
              setShowDeleteModal(true)
            }}
          >
            <Trash2 size={16} />
          </Button>
        )}
      />

      {/* Add Exception Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Ban Exception"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddException} isLoading={addException.isPending}>
              Add Exception
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Mask"
            value={newException.name}
            onChange={(e) => setNewException({ ...newException, name: e.target.value })}
            placeholder="*@*.trusted.example.com"
            helperText="User@host mask to exempt from bans"
          />
          <Select
            label="Exception For"
            value={newException.types}
            onChange={(e) => setNewException({ ...newException, types: e.target.value })}
          >
            <option value="gline">G-Line</option>
            <option value="kline">K-Line</option>
            <option value="gzline">GZ-Line</option>
            <option value="zline">Z-Line</option>
            <option value="shun">Shun</option>
            <option value="all">All Types</option>
          </Select>
          <Input
            label="Reason (optional)"
            value={newException.reason}
            onChange={(e) => setNewException({ ...newException, reason: e.target.value })}
            placeholder="Trusted network"
          />
        </div>
      </Modal>

      {/* Delete Exception Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Remove Exception"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteException} isLoading={deleteException.isPending}>
              Remove Exception
            </Button>
          </>
        }
      >
        <Alert type="warning">
          Are you sure you want to remove the exception for{' '}
          <span className="font-mono">{selectedException?.name}</span>?
          Users matching this mask will no longer be exempt from bans.
        </Alert>
      </Modal>
    </div>
  )
}
