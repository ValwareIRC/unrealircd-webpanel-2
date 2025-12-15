import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSpamfilters, useAddSpamfilter, useDeleteSpamfilter } from '@/hooks'
import { DataTable, Button, Modal, Input, Select, Alert, Badge } from '@/components/common'
import { Plus, Trash2, Shield } from 'lucide-react'
import type { Spamfilter } from '@/types'
import toast from 'react-hot-toast'

export function SpamfiltersPage() {
  const { data: filters, isLoading, error } = useSpamfilters()
  const addFilter = useAddSpamfilter()
  const deleteFilter = useDeleteSpamfilter()
  const { t } = useTranslation()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<Spamfilter | null>(null)

  const [newFilter, setNewFilter] = useState({
    match_type: 'simple',
    match: '',
    targets: 'cpn',
    action: 'block',
    action_duration: '',
    reason: '',
  })

  const getFilterTargets = (filter: Spamfilter): string => {
    return filter.targets || filter.spamfilter_targets || ''
  }

  const getFilterAction = (filter: Spamfilter): string => {
    return filter.action || filter.ban_action || 'unknown'
  }

  const getTargetLabel = (target: string): string => {
    const fallbackLabels: Record<string, string> = {
      c: 'Channel Messages',
      p: 'Private Messages',
      n: 'Nickname Changes',
      q: 'Quit Messages',
      P: 'Part Messages',
      u: 'User Info',
      a: 'Away Messages',
      t: 'Topic Changes',
      d: 'DCC',
    }
    return t(`spamfilters.targets.${target}`, { defaultValue: fallbackLabels[target] || target })
  }

  const columns = [
    {
      key: 'name',
      header: t('spamfilters.table.pattern'),
      sortable: true,
      render: (filter: Spamfilter) => (
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-[var(--text-muted)]" />
          <span className="text-[var(--text-primary)] font-mono text-sm truncate max-w-xs">
            {filter.name}
          </span>
        </div>
      ),
    },
    {
      key: 'match_type',
      header: t('spamfilters.table.type'),
      render: (filter: Spamfilter) => (
        <Badge variant="info" size="sm">{filter.match_type}</Badge>
      ),
    },
    {
      key: 'targets',
      header: t('spamfilters.table.targets'),
      render: (filter: Spamfilter) => (
        <div className="flex flex-wrap gap-1">
          {parseTargets(getFilterTargets(filter)).map((target) => (
            <Badge key={target} variant="default" size="sm">{getTargetLabel(target)}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'action',
      header: t('spamfilters.table.action'),
      render: (filter: Spamfilter) => (
        <Badge variant={getActionVariant(getFilterAction(filter))}>{getFilterAction(filter)}</Badge>
      ),
    },
    {
      key: 'hits',
      header: t('spamfilters.table.hits'),
      sortable: true,
      render: (filter: Spamfilter) => (
        <span className="text-[var(--text-muted)]">{filter.hits || 0}</span>
      ),
    },
    {
      key: 'set_by',
      header: t('spamfilters.table.setBy'),
      render: (filter: Spamfilter) => (
        <span className="text-[var(--text-muted)]">{filter.set_by}</span>
      ),
    },
  ]

  const handleAddFilter = async () => {
    try {
      await addFilter.mutateAsync(newFilter)
      toast.success(t('spamfilters.messages.added'))
      setShowAddModal(false)
      setNewFilter({
        match_type: 'simple',
        match: '',
        targets: 'cpn',
        action: 'block',
        action_duration: '',
        reason: '',
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add spamfilter'
      toast.error(message)
    }
  }

  const handleDeleteFilter = async () => {
    if (!selectedFilter) return
    try {
      await deleteFilter.mutateAsync({
        match: selectedFilter.name,
        match_type: selectedFilter.match_type,
        targets: getFilterTargets(selectedFilter),
        action: getFilterAction(selectedFilter),
      })
      toast.success(t('spamfilters.messages.removed'))
      setShowDeleteModal(false)
      setSelectedFilter(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('spamfilters.messages.removeFailed')
      toast.error(message)
    }
  }

  if (error) {
    return (
      <Alert type="error">
        {t('spamfilters.messages.loadFailed', { error: error instanceof Error ? error.message : 'Unknown error' })}
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('spamfilters.title')}</h1>
          <p className="text-[var(--text-muted)] mt-1">{t('spamfilters.subtitle')}</p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setShowAddModal(true)}>
          {t('spamfilters.addButton')}
        </Button>
      </div>

      <DataTable
        data={filters || []}
        columns={columns}
        keyField="name"
        isLoading={isLoading}
        searchPlaceholder={t('spamfilters.searchPlaceholder')}
        onRowClick={(filter) => {
          setSelectedFilter(filter)
          setShowDetailsModal(true)
        }}
        actions={(filter) => (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedFilter(filter)
              setShowDeleteModal(true)
            }}
          >
            <Trash2 size={16} />
          </Button>
        )}
      />

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={t('spamfilters.detailsTitle')}
        size="lg"
      >
        {selectedFilter && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--text-muted)]">{t('spamfilters.details.matchType')}</p>
                <p className="text-[var(--text-primary)]">{selectedFilter.match_type}</p>
              </div>
              <div>
                  <p className="text-sm text-[var(--text-muted)]">{t('spamfilters.details.action')}</p>
                <Badge variant={getActionVariant(getFilterAction(selectedFilter))}>
                  {getFilterAction(selectedFilter)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">{t('spamfilters.details.hits')}</p>
                <p className="text-[var(--text-primary)]">{selectedFilter.hits || 0}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">{t('spamfilters.details.setBy')}</p>
                <p className="text-[var(--text-primary)]">{selectedFilter.set_by}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-[var(--text-muted)] mb-1">{t('spamfilters.details.pattern')}</p>
              <p className="text-[var(--text-primary)] bg-[var(--bg-tertiary)] p-3 rounded-lg font-mono text-sm break-all">
                {selectedFilter.name}
              </p>
            </div>

            <div>
              <p className="text-sm text-[var(--text-muted)] mb-2">{t('spamfilters.details.targets')}</p>
              <div className="flex flex-wrap gap-2">
                {parseTargets(getFilterTargets(selectedFilter)).map((target) => (
                  <Badge key={target} variant="default">{target}</Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-[var(--text-muted)] mb-1">{t('spamfilters.details.reason')}</p>
              <p className="text-[var(--text-primary)]">{selectedFilter.reason || t('spamfilters.details.noReason')}</p>
            </div>

            {(selectedFilter.action_duration || selectedFilter.ban_duration) && (
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">{t('spamfilters.details.actionDuration')}</p>
                <p className="text-[var(--text-primary)]">{selectedFilter.action_duration || selectedFilter.ban_duration}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add Spamfilter Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('spamfilters.addModal.title')}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddFilter} isLoading={addFilter.isPending}>
              {t('spamfilters.addModal.addButton')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label={t('spamfilters.addModal.labels.matchType')}
            value={newFilter.match_type}
            onChange={(e) => setNewFilter({ ...newFilter, match_type: e.target.value })}
          >
            <option value="simple">{t('spamfilters.addModal.options.simple')}</option>
            <option value="regex">{t('spamfilters.addModal.options.regex')}</option>
            <option value="posix">{t('spamfilters.addModal.options.posix')}</option>
          </Select>
          <Input
            label={t('spamfilters.addModal.labels.match')}
            value={newFilter.match}
            onChange={(e) => setNewFilter({ ...newFilter, match: e.target.value })}
            placeholder="*spam*website*"
            helperText={t('spamfilters.addModal.helper.pattern')}
          />
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{t('spamfilters.addModal.labels.targets')}</label>
            <div className="flex flex-wrap gap-2">
              {['c', 'p', 'n', 'q', 'P', 'u', 'a', 't', 'd'].map((target) => (
                <label
                  key={target}
                  className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={newFilter.targets.includes(target)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewFilter({ ...newFilter, targets: newFilter.targets + target })
                      } else {
                        setNewFilter({ ...newFilter, targets: newFilter.targets.replace(target, '') })
                      }
                    }}
                    className="rounded border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <span className="text-[var(--text-secondary)]">{getTargetLabel(target)}</span>
                </label>
              ))}
            </div>
          </div>
          <Select
            label={t('spamfilters.addModal.labels.action')}
            value={newFilter.action}
            onChange={(e) => setNewFilter({ ...newFilter, action: e.target.value })}
          >
            <option value="warn">{t('spamfilters.addModal.actionOptions.warn')}</option>
            <option value="block">{t('spamfilters.addModal.actionOptions.block')}</option>
            <option value="kill">{t('spamfilters.addModal.actionOptions.kill')}</option>
            <option value="gline">{t('spamfilters.addModal.actionOptions.gline')}</option>
            <option value="gzline">{t('spamfilters.addModal.actionOptions.gzline')}</option>
            <option value="shun">{t('spamfilters.addModal.actionOptions.shun')}</option>
            <option value="viruschan">{t('spamfilters.addModal.actionOptions.viruschan')}</option>
          </Select>
          {['gline', 'gzline', 'shun'].includes(newFilter.action) && (
            <Input
              label={t('spamfilters.addModal.labels.duration')}
              value={newFilter.action_duration}
              onChange={(e) => setNewFilter({ ...newFilter, action_duration: e.target.value })}
              placeholder="1d"
              helperText={t('spamfilters.addModal.helper.duration')}
            />
          )}
          <Input
            label={t('spamfilters.addModal.labels.reason')}
            value={newFilter.reason}
            onChange={(e) => setNewFilter({ ...newFilter, reason: e.target.value })}
            placeholder={t('spamfilters.addModal.placeholders.reason')}
          />
        </div>
      </Modal>

      {/* Delete Spamfilter Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('spamfilters.deleteModal.title')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={handleDeleteFilter} isLoading={deleteFilter.isPending}>
              {t('spamfilters.deleteModal.removeButton')}
            </Button>
          </>
        }
      >
        <Alert type="warning">
          {t('spamfilters.deleteModal.confirm')}
          <div className="mt-2 p-2 bg-[var(--bg-tertiary)] rounded font-mono text-sm break-all">
            {selectedFilter?.name}
          </div>
        </Alert>
      </Modal>
    </div>
  )
}
function parseTargets(targets: string): string[] {
  if (!targets) return []
  return targets.split('')
}

function getActionVariant(action: string): 'error' | 'warning' | 'info' | 'default' {
  switch (action.toLowerCase()) {
    case 'kill':
    case 'gline':
    case 'gzline':
      return 'error'
    case 'shun':
    case 'block':
      return 'warning'
    case 'warn':
      return 'info'
    default:
      return 'default'
  }
}
