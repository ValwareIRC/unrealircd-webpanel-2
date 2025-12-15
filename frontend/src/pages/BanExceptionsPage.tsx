import { useState } from 'react'
import { useBanExceptions, useAddBanException, useDeleteBanException } from '@/hooks'
import { DataTable, Button, Modal, Input, Select, Alert, Badge } from '@/components/common'
import { Plus, Trash2, Shield } from 'lucide-react'
import type { BanException } from '@/types'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

export function BanExceptionsPage() {
  const { t } = useTranslation()
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
      header: t('banExceptions.mask'),
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
      header: t('banExceptions.exceptionTypes'),
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
            <span className="text-[var(--text-muted)]">{t('banExceptions.all')}</span>
          )}
        </div>
      ),
    },
    {
      key: 'reason',
      header: t('banExceptions.reason'),
      render: (exc: BanException) => (
        <span className="text-[var(--text-muted)] truncate max-w-md block">{exc.reason || t('banExceptions.noReason')}</span>
      ),
    },
    {
      key: 'set_by',
      header: t('banExceptions.setBy'),
      render: (exc: BanException) => (
        <span className="text-[var(--text-muted)]">{exc.set_by}</span>
      ),
    },
    {
      key: 'set_at',
      header: t('banExceptions.setAt'),
      sortable: true,
      render: (exc: BanException) => (
        <span className="text-[var(--text-muted)]">
          {exc.set_at ? new Date(exc.set_at * 1000).toLocaleDateString() : t('banExceptions.unknown')}
        </span>
      ),
    },
  ]

  const handleAddException = async () => {
    try {
      await addException.mutateAsync(newException)
      toast.success(t('banExceptions.addSuccess'))
      setShowAddModal(false)
      setNewException({ name: '', types: 'gline', reason: '' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('banExceptions.addFailed')
      toast.error(message)
    }
  }

  const handleDeleteException = async () => {
    if (!selectedException) return
    try {
      await deleteException.mutateAsync(selectedException.name)
      toast.success(t('banExceptions.removeSuccess'))
      setShowDeleteModal(false)
      setSelectedException(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('banExceptions.removeFailed')
      toast.error(message)
    }
  }

  if (error) {
    return (
      <Alert type="error">
        {t('banExceptions.loadError', { error: error instanceof Error ? error.message : 'Unknown error' })}
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('banExceptions.title')}</h1>
          <p className="text-[var(--text-muted)] mt-1">{t('banExceptions.subtitle')}</p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setShowAddModal(true)}>
          {t('banExceptions.addException')}
        </Button>
      </div>

      <DataTable
        data={exceptions || []}
        columns={columns}
        keyField="name"
        isLoading={isLoading}
        searchPlaceholder={t('banExceptions.searchPlaceholder')}
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
        title={t('banExceptions.addModalTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddException} isLoading={addException.isPending}>
              {t('banExceptions.addException')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('banExceptions.mask')}
            value={newException.name}
            onChange={(e) => setNewException({ ...newException, name: e.target.value })}
            placeholder={t('banExceptions.maskPlaceholder')}
            helperText={t('banExceptions.maskHelperText')}
          />
          <Select
            label={t('banExceptions.exceptionFor')}
            value={newException.types}
            onChange={(e) => setNewException({ ...newException, types: e.target.value })}
          >
            <option value="gline">{t('banExceptions.gline')}</option>
            <option value="kline">{t('banExceptions.kline')}</option>
            <option value="gzline">{t('banExceptions.gzline')}</option>
            <option value="zline">{t('banExceptions.zline')}</option>
            <option value="shun">{t('banExceptions.shun')}</option>
            <option value="all">{t('banExceptions.allTypes')}</option>
          </Select>
          <Input
            label={t('banExceptions.reasonOptional')}
            value={newException.reason}
            onChange={(e) => setNewException({ ...newException, reason: e.target.value })}
            placeholder={t('banExceptions.reasonPlaceholder')}
          />
        </div>
      </Modal>

      {/* Delete Exception Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('banExceptions.removeModalTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={handleDeleteException} isLoading={deleteException.isPending}>
              {t('banExceptions.removeException')}
            </Button>
          </>
        }
      >
        <Alert type="warning">
          {t('banExceptions.confirmRemove', { mask: selectedException?.name })}
        </Alert>
      </Modal>
    </div>
  )
}
