import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getScheduledCommands,
  createScheduledCommand,
  updateScheduledCommand,
  deleteScheduledCommand,
  toggleScheduledCommand,
  runScheduledCommandNow,
  ScheduledCommand,
  ScheduledCommandRequest
} from '@/services/scheduledCommandService'
import { DataTable, Button, Modal, Input, Select, Alert, Badge } from '@/components/common'
import { Clock, Plus, Edit2, Trash2, Play, Pause, PlayCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const COMMAND_TYPES = [
  { value: 'kill', label: 'Kill User' },
  { value: 'gline', label: 'G-Line (Server Ban)' },
  { value: 'rehash', label: 'Rehash Server' },
  { value: 'message', label: 'Send Message' },
]

const SCHEDULE_TYPES = [
  { value: 'once', label: 'One Time' },
  { value: 'hourly', label: 'Every Hour' },
  { value: 'daily', label: 'Every Day' },
  { value: 'weekly', label: 'Every Week' },
  { value: 'monthly', label: 'Every Month' },
]

export function ScheduledCommandsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: commands, isLoading, error } = useQuery({
    queryKey: ['scheduledCommands'],
    queryFn: getScheduledCommands,
    refetchInterval: 30000,
  })

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedCommand, setSelectedCommand] = useState<ScheduledCommand | null>(null)
  const [formData, setFormData] = useState<ScheduledCommandRequest>({
    name: '',
    description: '',
    command: 'kill',
    target: '',
    params: {},
    schedule: 'once',
    run_at: '',
    is_enabled: true,
  })

  const createMutation = useMutation({
    mutationFn: createScheduledCommand,
      onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledCommands'] })
      toast.success(t('scheduledCommands.messages.created'))
      setShowAddModal(false)
      resetForm()
    },
    onError: (err: Error) => {
      toast.error(err.message || t('scheduledCommands.messages.createFailed'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ScheduledCommandRequest }) =>
      updateScheduledCommand(id, data),
      onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledCommands'] })
      toast.success(t('scheduledCommands.messages.updated'))
      setShowEditModal(false)
      resetForm()
    },
    onError: (err: Error) => {
      toast.error(err.message || t('scheduledCommands.messages.updateFailed'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteScheduledCommand,
      onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledCommands'] })
      toast.success(t('scheduledCommands.messages.deleted'))
      setShowDeleteModal(false)
      setSelectedCommand(null)
    },
    onError: (err: Error) => {
      toast.error(err.message || t('scheduledCommands.messages.deleteFailed'))
    },
  })

  const toggleMutation = useMutation({
    mutationFn: toggleScheduledCommand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledCommands'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || t('scheduledCommands.messages.toggleFailed'))
    },
  })

  const runNowMutation = useMutation({
    mutationFn: runScheduledCommandNow,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scheduledCommands'] })
      toast.success(data.result || t('scheduledCommands.messages.commandExecuted'))
    },
    onError: (err: Error) => {
      toast.error(err.message || t('scheduledCommands.messages.runFailed'))
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      command: 'kill',
      target: '',
      params: {},
      schedule: 'once',
      run_at: '',
      is_enabled: true,
    })
    setSelectedCommand(null)
  }

  const openEditModal = (cmd: ScheduledCommand) => {
    setSelectedCommand(cmd)
    let params = {}
    try {
      params = cmd.params ? JSON.parse(cmd.params) : {}
    } catch {
      params = {}
    }
    setFormData({
      name: cmd.name,
      description: cmd.description || '',
      command: cmd.command,
      target: cmd.target || '',
      params,
      schedule: cmd.schedule,
      run_at: cmd.run_at || '',
      is_enabled: cmd.is_enabled,
    })
    setShowEditModal(true)
  }

  const handleSubmit = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = { ...formData }
    if (data.schedule === 'once' && data.run_at) {
      // Convert to ISO string
      data.run_at = new Date(data.run_at).toISOString()
    } else {
      // Don't send empty run_at for cron schedules
      delete data.run_at
    }
    if (selectedCommand) {
      updateMutation.mutate({ id: selectedCommand.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const columns = [
    {
      key: 'status',
      header: t('scheduledCommands.table.status'),
      render: (cmd: ScheduledCommand) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleMutation.mutate(cmd.id)}
            className={`p-1 rounded ${cmd.is_enabled ? 'text-green-400' : 'text-gray-500'}`}
            title={cmd.is_enabled ? t('scheduledCommands.tooltips.clickToDisable') : t('scheduledCommands.tooltips.clickToEnable')}
          >
            {cmd.is_enabled ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <Badge variant={cmd.is_enabled ? 'success' : 'default'}>
            {cmd.is_enabled ? t('scheduledCommands.labels.active') : t('scheduledCommands.labels.paused')}
          </Badge>
        </div>
      ),
    },
    {
      key: 'name',
      header: t('scheduledCommands.table.name'),
      sortable: true,
      render: (cmd: ScheduledCommand) => (
        <div>
          <div className="font-medium text-[var(--text-primary)]">{cmd.name}</div>
          {cmd.description && (
            <div className="text-sm text-[var(--text-muted)]">{cmd.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'command',
      header: t('scheduledCommands.table.command'),
      render: (cmd: ScheduledCommand) => (
        <div>
          <Badge variant="info">{t(`scheduledCommands.commandTypes.${cmd.command}`)}</Badge>
          {cmd.target && (
            <span className="ml-2 text-[var(--text-secondary)] font-mono text-sm">
              {cmd.target}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'schedule',
      header: t('scheduledCommands.table.schedule'),
      render: (cmd: ScheduledCommand) => (
        <div>
          <div className="text-[var(--text-primary)]">
            {t(`scheduledCommands.scheduleTypes.${cmd.schedule}`) || cmd.schedule}
          </div>
          {cmd.next_run && (
            <div className="text-xs text-[var(--text-muted)]">
              {t('scheduledCommands.next')}: {new Date(cmd.next_run).toLocaleString()}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'last_run',
      header: t('scheduledCommands.table.lastRun'),
      render: (cmd: ScheduledCommand) => (
        <div>
          {cmd.last_run ? (
            <>
              <div className="text-[var(--text-secondary)] text-sm">
                {new Date(cmd.last_run).toLocaleString()}
              </div>
              {cmd.last_result && (
                <div className={`text-xs ${cmd.last_result.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                  {cmd.last_result}
                </div>
              )}
            </>
          ) : (
            <span className="text-[var(--text-muted)] text-sm">{t('scheduledCommands.never')}</span>
          )}
        </div>
      ),
    },
    {
      key: 'run_count',
      header: 'Runs',
      render: (cmd: ScheduledCommand) => (
        <span className="text-[var(--text-muted)]">{cmd.run_count}</span>
      ),
    },
  ]

  if (error) {
    return (
        <Alert type="error">
        {t('scheduledCommands.messages.loadFailed', { error: error instanceof Error ? error.message : 'Unknown error' })}
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Clock size={28} />
            {t('scheduledCommands.title')}
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            {t('scheduledCommands.subtitle')}
          </p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setShowAddModal(true)}>
          {t('scheduledCommands.createButton')}
        </Button>
      </div>

      <DataTable
        data={commands || []}
        columns={columns}
        keyField="id"
        isLoading={isLoading}
        searchPlaceholder={t('scheduledCommands.searchPlaceholder')}
        emptyMessage={t('scheduledCommands.emptyMessage')}
        actions={(cmd) => (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => runNowMutation.mutate(cmd.id)}
              title={t('scheduledCommands.tooltips.runNow')}
              disabled={runNowMutation.isPending}
            >
              <PlayCircle size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditModal(cmd)}
              title={t('common.edit')}
            >
              <Edit2 size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300"
              onClick={() => {
                setSelectedCommand(cmd)
                setShowDeleteModal(true)
              }}
              title={t('common.delete')}
            >
              <Trash2 size={16} />
            </Button>
          </>
        )}
      />

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false)
          setShowEditModal(false)
          resetForm()
        }}
        title={selectedCommand ? t('scheduledCommands.editModal.title') : t('scheduledCommands.createModal.title')}
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddModal(false)
                setShowEditModal(false)
                resetForm()
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={createMutation.isPending || updateMutation.isPending}
              disabled={!formData.name || !formData.command}
            >
              {selectedCommand ? t('scheduledCommands.editModal.saveButton') : t('scheduledCommands.createModal.createButton')}
            </Button>
          </>
        }
      >
        <ScheduledCommandForm formData={formData} setFormData={setFormData} />
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedCommand(null)
        }}
        title={t('scheduledCommands.deleteModal.title')}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false)
                setSelectedCommand(null)
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => selectedCommand && deleteMutation.mutate(selectedCommand.id)}
              isLoading={deleteMutation.isPending}
            >
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <Alert type="warning">
          {t('scheduledCommands.deleteModal.confirm')}
        </Alert>
      </Modal>
    </div>
  )
}

function ScheduledCommandForm({
  formData,
  setFormData,
}: {
  formData: ScheduledCommandRequest
  setFormData: (data: ScheduledCommandRequest) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <Input
        label={t('scheduledCommands.form.nameLabel')}
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder={t('scheduledCommands.form.namePlaceholder')}
      />

      <Input
        label={t('scheduledCommands.form.descriptionLabel')}
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder={t('scheduledCommands.form.descriptionPlaceholder')}
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label={t('scheduledCommands.form.commandTypeLabel')}
          value={formData.command}
          onChange={(e) => setFormData({ ...formData, command: e.target.value })}
        >
          {COMMAND_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(`scheduledCommands.commandTypes.${opt.value}`)}
            </option>
          ))}
        </Select>

        <Input
          label={t('scheduledCommands.form.targetLabel')}
          value={formData.target}
          onChange={(e) => setFormData({ ...formData, target: e.target.value })}
          placeholder={
            formData.command === 'kill' ? t('scheduledCommands.placeholders.target.kill') :
            formData.command === 'gline' ? t('scheduledCommands.placeholders.target.gline') :
            formData.command === 'rehash' ? t('scheduledCommands.placeholders.target.rehash') :
            formData.command === 'message' ? t('scheduledCommands.placeholders.target.message') : t('scheduledCommands.placeholders.target.default')
          }
        />
      </div>

      {/* Command-specific parameters */}
      {(formData.command === 'kill' || formData.command === 'gline') && (
        <Input
          label={t('scheduledCommands.form.reasonLabel')}
          value={(formData.params as Record<string, string>)?.reason || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              params: { ...formData.params, reason: e.target.value },
            })
          }
          placeholder={t('scheduledCommands.placeholders.reason')}
        />
      )}

      {formData.command === 'gline' && (
        <Input
          label={t('scheduledCommands.form.durationLabel')}
          value={(formData.params as Record<string, string>)?.duration || '1d'}
          onChange={(e) =>
            setFormData({
              ...formData,
              params: { ...formData.params, duration: e.target.value },
            })
          }
          placeholder={t('scheduledCommands.placeholders.duration')}
        />
      )}

      {formData.command === 'message' && (
        <Input
          label={t('scheduledCommands.form.messageLabel')}
          value={(formData.params as Record<string, string>)?.message || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              params: { ...formData.params, message: e.target.value },
            })
          }
          placeholder={t('scheduledCommands.placeholders.message')}
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <Select
          label={t('scheduledCommands.form.scheduleLabel')}
          value={formData.schedule}
          onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
        >
          {SCHEDULE_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(`scheduledCommands.scheduleTypes.${opt.value}`)}
            </option>
          ))}
        </Select>

        {formData.schedule === 'once' && (
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Run At
            </label>
            <input
              type="datetime-local"
              value={formData.run_at ? new Date(formData.run_at).toISOString().slice(0, 16) : ''}
              onChange={(e) => setFormData({ ...formData, run_at: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
            />
          </div>
        )}
      </div>

        <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={formData.is_enabled}
          onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
          className="w-4 h-4 rounded border-[var(--border-color)] bg-[var(--bg-tertiary)] checked:bg-[var(--accent-color)]"
        />
        <span className="text-[var(--text-secondary)]">{t('scheduledCommands.form.enableLabel')}</span>
      </label>
    </div>
  )
}
