import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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

  const { t } = useTranslation()

  const columns = [
    {
      key: 'type',
      header: t('nameBans.table.type'),
      sortable: true,
      render: (ban: NameBan) => (
        <Badge variant={(ban.type || ban.type_string) === 'qline' ? 'error' : 'warning'}>
          {(ban.type || ban.type_string || 'qline').toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'name',
      header: t('nameBans.table.name'),
      sortable: true,
      render: (ban: NameBan) => (
        <span className="text-[var(--text-primary)] font-mono">{ban.name}</span>
      ),
    },
    {
      key: 'reason',
      header: t('nameBans.table.reason'),
      render: (ban: NameBan) => (
        <span className="text-[var(--text-muted)] truncate max-w-md block">{ban.reason}</span>
      ),
    },
    {
      key: 'set_by',
      header: t('nameBans.table.setBy'),
      render: (ban: NameBan) => (
        <span className="text-[var(--text-muted)]">{ban.set_by}</span>
      ),
    },
    {
      key: 'set_at',
      header: t('nameBans.table.setAt'),
      sortable: true,
      render: (ban: NameBan) => (
        <span className="text-[var(--text-muted)]">
          {ban.set_at ? new Date(ban.set_at * 1000).toLocaleDateString() : 'Unknown'}
        </span>
      ),
    },
    {
      key: 'expire_at',
      header: t('nameBans.table.expires'),
      sortable: true,
      render: (ban: NameBan) => (
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
      toast.success(t('nameBans.messages.added'))
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
      toast.success(t('nameBans.messages.removed'))
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
        {t('nameBans.messages.loadFailed', { error: error instanceof Error ? error.message : 'Unknown error' })}
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('nameBans.title')}</h1>
          <p className="text-[var(--text-muted)] mt-1">{t('nameBans.description')}</p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setShowAddModal(true)}>
          {t('nameBans.addButton')}
        </Button>
      </div>

      <DataTable
        data={bans || []}
        columns={columns}
        keyField="name"
        isLoading={isLoading}
        searchPlaceholder={t('nameBans.searchPlaceholder')}
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
        title={t('nameBans.addModal.title')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddBan} isLoading={addBan.isPending}>
              {t('nameBans.addModal.addButton')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label={t('nameBans.addModal.labels.banType')}
            value={newBan.type}
            onChange={(e) => setNewBan({ ...newBan, type: e.target.value })}
          >
            <option value="qline">{t('nameBans.addModal.options.qline')}</option>
          </Select>
          <Input
            label={t('nameBans.addModal.labels.name')}
            value={newBan.name}
            onChange={(e) => setNewBan({ ...newBan, name: e.target.value })}
            placeholder={t('nameBans.addModal.placeholders.nameExample')}
            helperText={t('nameBans.addModal.help.useWildcard')}
          />
          <Input
            label={t('nameBans.addModal.labels.reason')}
            value={newBan.reason}
            onChange={(e) => setNewBan({ ...newBan, reason: e.target.value })}
            placeholder={t('nameBans.addModal.placeholders.reason')}
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
        title={t('nameBans.deleteModal.title')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={handleDeleteBan} isLoading={deleteBan.isPending}>
              {t('nameBans.deleteModal.removeButton')}
            </Button>
          </>
        }
      >
        <Alert type="warning">
          {t('nameBans.deleteModal.confirm', { name: <span className="font-mono">{selectedBan?.name}</span> })}
        </Alert>
      </Modal>
    </div>
  )
}
