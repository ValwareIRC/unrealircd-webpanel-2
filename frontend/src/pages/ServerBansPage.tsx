import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useServerBans, useAddServerBan, useDeleteServerBan } from '@/hooks'
import { DataTable, Button, Modal, Input, Select, Alert, Badge } from '@/components/common'
import { Plus, Trash2, Clock } from 'lucide-react'
import type { ServerBan } from '@/types'
import toast from 'react-hot-toast'

export function ServerBansPage() {
  const { data: bans, isLoading, error } = useServerBans()
  const addBan = useAddServerBan()
  const deleteBan = useDeleteServerBan()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedBan, setSelectedBan] = useState<ServerBan | null>(null)

  const [newBan, setNewBan] = useState({
    type: 'gline',
    name: '',
    reason: '',
    duration: '1d',
  })
  const { t } = useTranslation()

  const columns = [
    {
      key: 'type',
      header: t('serverBans.table.type'),
      sortable: true,
      render: (ban: ServerBan) => (
        <Badge variant={getBanTypeVariant(ban.type)}>{ban.type.toUpperCase()}</Badge>
      ),
    },
    {
      key: 'name',
      header: t('serverBans.table.mask'),
      sortable: true,
      render: (ban: ServerBan) => (
        <span className="text-[var(--text-primary)] font-mono">{ban.name}</span>
      ),
    },
    {
      key: 'reason',
      header: t('serverBans.table.reason'),
      render: (ban: ServerBan) => (
        <span className="text-[var(--text-muted)] truncate max-w-md block">{ban.reason}</span>
      ),
    },
    {
      key: 'set_by',
      header: t('serverBans.table.setBy'),
      render: (ban: ServerBan) => (
        <span className="text-[var(--text-muted)]">{ban.set_by}</span>
      ),
    },
    {
      key: 'set_at',
      header: t('serverBans.table.setAt'),
      sortable: true,
      render: (ban: ServerBan) => (
        <span className="text-[var(--text-muted)]">
          {ban.set_at ? new Date(ban.set_at * 1000).toLocaleDateString() : 'Unknown'}
        </span>
      ),
    },
    {
      key: 'expire_at',
      header: t('serverBans.table.expires'),
      sortable: true,
      render: (ban: ServerBan) => (
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Clock size={14} />
          {!ban.expire_at || ban.expire_at === 0 ? (
            <Badge variant="error" size="sm">{t('common.permanent')}</Badge>
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
      toast.success(t('serverBans.messages.added'))
      setShowAddModal(false)
      setNewBan({ type: 'gline', name: '', reason: '', duration: '1d' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add ban'
      toast.error(message)
    }
  }

  const handleDeleteBan = async () => {
    if (!selectedBan) return
    try {
      await deleteBan.mutateAsync({ name: selectedBan.name, type: selectedBan.type })
      toast.success(t('serverBans.messages.removed'))
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
        {t('serverBans.messages.loadFailed', { error: error instanceof Error ? error.message : 'Unknown error' })}
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('serverBans.title')}</h1>
          <p className="text-[var(--text-muted)] mt-1">{t('serverBans.description')}</p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setShowAddModal(true)}>
          {t('serverBans.addButton')}
        </Button>
      </div>

      <DataTable
        data={bans || []}
        columns={columns}
        keyField="name"
        isLoading={isLoading}
        searchPlaceholder={t('serverBans.searchPlaceholder')}
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

      {/* Add Ban Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('serverBans.addModal.title')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddBan} isLoading={addBan.isPending}>
              {t('serverBans.addModal.addButton')}
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
            <option value="gline">G-Line (Global)</option>
            <option value="kline">K-Line (Local)</option>
            <option value="gzline">GZ-Line (Global IP)</option>
            <option value="zline">Z-Line (Local IP)</option>
            <option value="shun">Shun</option>
          </Select>
          <Input
            label="Mask"
            value={newBan.name}
            onChange={(e) => setNewBan({ ...newBan, name: e.target.value })}
            placeholder="*@*.example.com or 192.168.1.*"
            helperText="User@host mask or IP mask"
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
        title={t('serverBans.deleteModal.title')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={handleDeleteBan} isLoading={deleteBan.isPending}>
              {t('serverBans.deleteModal.removeButton')}
            </Button>
          </>
        }
      >
        <Alert type="warning">
          {t('serverBans.deleteModal.confirm', { type: selectedBan?.type.toUpperCase(), name: <span className="font-mono">{selectedBan?.name}</span> })}
        </Alert>
      </Modal>
    </div>
  )
}

function getBanTypeVariant(type: string): 'error' | 'warning' | 'info' | 'default' {
  switch (type.toLowerCase()) {
    case 'gline':
    case 'gzline':
      return 'error'
    case 'kline':
    case 'zline':
      return 'warning'
    case 'shun':
      return 'info'
    default:
      return 'default'
  }
}
