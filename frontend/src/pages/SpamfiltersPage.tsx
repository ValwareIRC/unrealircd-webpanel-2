import { useState } from 'react'
import { useSpamfilters, useAddSpamfilter, useDeleteSpamfilter } from '@/hooks'
import { DataTable, Button, Modal, Input, Select, Alert, Badge } from '@/components/common'
import { Plus, Trash2, Shield } from 'lucide-react'
import type { Spamfilter } from '@/types'
import toast from 'react-hot-toast'

export function SpamfiltersPage() {
  const { data: filters, isLoading, error } = useSpamfilters()
  const addFilter = useAddSpamfilter()
  const deleteFilter = useDeleteSpamfilter()

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

  const columns = [
    {
      key: 'name',
      header: 'Pattern',
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
      header: 'Type',
      render: (filter: Spamfilter) => (
        <Badge variant="info" size="sm">{filter.match_type}</Badge>
      ),
    },
    {
      key: 'targets',
      header: 'Targets',
      render: (filter: Spamfilter) => (
        <div className="flex flex-wrap gap-1">
          {parseTargets(getFilterTargets(filter)).map((target) => (
            <Badge key={target} variant="default" size="sm">{target}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (filter: Spamfilter) => (
        <Badge variant={getActionVariant(getFilterAction(filter))}>{getFilterAction(filter)}</Badge>
      ),
    },
    {
      key: 'hits',
      header: 'Hits',
      sortable: true,
      render: (filter: Spamfilter) => (
        <span className="text-[var(--text-muted)]">{filter.hits || 0}</span>
      ),
    },
    {
      key: 'set_by',
      header: 'Set By',
      render: (filter: Spamfilter) => (
        <span className="text-[var(--text-muted)]">{filter.set_by}</span>
      ),
    },
  ]

  const handleAddFilter = async () => {
    try {
      await addFilter.mutateAsync(newFilter)
      toast.success('Spamfilter added successfully')
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
      toast.success('Spamfilter removed')
      setShowDeleteModal(false)
      setSelectedFilter(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove spamfilter'
      toast.error(message)
    }
  }

  if (error) {
    return (
      <Alert type="error">
        Failed to load spamfilters: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Spamfilters</h1>
          <p className="text-[var(--text-muted)] mt-1">Manage content filters and spam protection</p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setShowAddModal(true)}>
          Add Spamfilter
        </Button>
      </div>

      <DataTable
        data={filters || []}
        columns={columns}
        keyField="name"
        isLoading={isLoading}
        searchPlaceholder="Search spamfilters..."
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
        title="Spamfilter Details"
        size="lg"
      >
        {selectedFilter && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Match Type</p>
                <p className="text-[var(--text-primary)]">{selectedFilter.match_type}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Action</p>
                <Badge variant={getActionVariant(getFilterAction(selectedFilter))}>
                  {getFilterAction(selectedFilter)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Hits</p>
                <p className="text-[var(--text-primary)]">{selectedFilter.hits || 0}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Set By</p>
                <p className="text-[var(--text-primary)]">{selectedFilter.set_by}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-[var(--text-muted)] mb-1">Pattern</p>
              <p className="text-[var(--text-primary)] bg-[var(--bg-tertiary)] p-3 rounded-lg font-mono text-sm break-all">
                {selectedFilter.name}
              </p>
            </div>

            <div>
              <p className="text-sm text-[var(--text-muted)] mb-2">Targets</p>
              <div className="flex flex-wrap gap-2">
                {parseTargets(getFilterTargets(selectedFilter)).map((target) => (
                  <Badge key={target} variant="default">{target}</Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-[var(--text-muted)] mb-1">Reason</p>
              <p className="text-[var(--text-primary)]">{selectedFilter.reason || 'No reason specified'}</p>
            </div>

            {(selectedFilter.action_duration || selectedFilter.ban_duration) && (
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Action Duration</p>
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
        title="Add Spamfilter"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddFilter} isLoading={addFilter.isPending}>
              Add Spamfilter
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Match Type"
            value={newFilter.match_type}
            onChange={(e) => setNewFilter({ ...newFilter, match_type: e.target.value })}
          >
            <option value="simple">Simple (wildcards)</option>
            <option value="regex">Regular Expression</option>
            <option value="posix">POSIX Regex</option>
          </Select>
          <Input
            label="Pattern"
            value={newFilter.match}
            onChange={(e) => setNewFilter({ ...newFilter, match: e.target.value })}
            placeholder="*spam*website*"
            helperText="Pattern to match against messages"
          />
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Targets</label>
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
            label="Action"
            value={newFilter.action}
            onChange={(e) => setNewFilter({ ...newFilter, action: e.target.value })}
          >
            <option value="warn">Warn</option>
            <option value="block">Block</option>
            <option value="kill">Kill</option>
            <option value="gline">G-Line</option>
            <option value="gzline">GZ-Line</option>
            <option value="shun">Shun</option>
            <option value="viruschan">Virus Channel</option>
          </Select>
          {['gline', 'gzline', 'shun'].includes(newFilter.action) && (
            <Input
              label="Action Duration"
              value={newFilter.action_duration}
              onChange={(e) => setNewFilter({ ...newFilter, action_duration: e.target.value })}
              placeholder="1d"
              helperText="Duration for ban action (e.g., 1h, 1d, 7d)"
            />
          )}
          <Input
            label="Reason"
            value={newFilter.reason}
            onChange={(e) => setNewFilter({ ...newFilter, reason: e.target.value })}
            placeholder="Spam is not allowed"
          />
        </div>
      </Modal>

      {/* Delete Spamfilter Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Remove Spamfilter"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteFilter} isLoading={deleteFilter.isPending}>
              Remove Spamfilter
            </Button>
          </>
        }
      >
        <Alert type="warning">
          Are you sure you want to remove this spamfilter?
          <div className="mt-2 p-2 bg-[var(--bg-tertiary)] rounded font-mono text-sm break-all">
            {selectedFilter?.name}
          </div>
        </Alert>
      </Modal>
    </div>
  )
}

function parseTargets(targets: string): string[] {
  const targetMap: Record<string, string> = {
    c: 'Channel',
    p: 'Private',
    n: 'Nick',
    q: 'Quit',
    P: 'Part',
    u: 'User',
    a: 'Away',
    t: 'Topic',
    d: 'DCC',
  }
  return targets.split('').map((t) => targetMap[t] || t)
}

function getTargetLabel(target: string): string {
  const labels: Record<string, string> = {
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
  return labels[target] || target
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
