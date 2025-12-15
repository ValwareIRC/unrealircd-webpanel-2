import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Plus, Trash2, Edit, ToggleLeft, ToggleRight, Webhook, MessageSquare, Send, FileText, Play } from 'lucide-react'
import {
  getAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  toggleAlertRule,
  getAlertRuleStats,
  testAlertRule,
  parseConditions,
  parseActions,
  alertEventTypes,
  conditionOperators,
  conditionFields,
  type AlertRule,
  type AlertCondition,
  type AlertAction,
  type CreateAlertRuleRequest,
} from '@/services/alertRuleService'
import { Button, Input, Modal, Select, Badge } from '@/components/common'

export function AlertRulesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [eventType, setEventType] = useState('*')
  const [conditions, setConditions] = useState<AlertCondition[]>([])
  const [actions, setActions] = useState<AlertAction[]>([])
  const [priority, setPriority] = useState(0)
  const [cooldown, setCooldown] = useState(0)

  // Test state
  const [testConditions, setTestConditions] = useState<AlertCondition[]>([])
  const [testData, setTestData] = useState<Record<string, string>>({})
  const [testResults, setTestResults] = useState<{
    all_matched: boolean
    results: Array<{ field: string; operator: string; expected: string; actual: string; matched: boolean }>
  } | null>(null)

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['alertRules'],
    queryFn: () => getAlertRules(),
  })

  const { data: stats } = useQuery({
    queryKey: ['alertRuleStats'],
    queryFn: () => getAlertRuleStats(),
  })

  const createMutation = useMutation({
    mutationFn: createAlertRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertRules'] })
      queryClient.invalidateQueries({ queryKey: ['alertRuleStats'] })
      resetForm()
      setShowCreateModal(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateAlertRule>[1] }) =>
      updateAlertRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertRules'] })
      resetForm()
      setEditingRule(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAlertRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertRules'] })
      queryClient.invalidateQueries({ queryKey: ['alertRuleStats'] })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: toggleAlertRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertRules'] })
    },
  })

  const testMutation = useMutation({
    mutationFn: ({ conditions, testData }: { conditions: AlertCondition[]; testData: Record<string, unknown> }) =>
      testAlertRule(conditions, testData),
    onSuccess: (data) => {
      setTestResults(data)
    },
  })

  const resetForm = () => {
    setName('')
    setDescription('')
    setEventType('*')
    setConditions([])
    setActions([])
    setPriority(0)
    setCooldown(0)
  }

  const openEditModal = (rule: AlertRule) => {
    setEditingRule(rule)
    setName(rule.name)
    setDescription(rule.description)
    setEventType(rule.event_type)
    setConditions(parseConditions(rule))
    setActions(parseActions(rule))
    setPriority(rule.priority)
    setCooldown(rule.cooldown)
  }

  const handleSubmit = () => {
    const data: CreateAlertRuleRequest = {
      name,
      description,
      event_type: eventType,
      conditions,
      actions,
      priority,
      cooldown,
    }

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const addCondition = () => {
    setConditions([...conditions, { field: 'message', operator: 'contains', value: '' }])
  }

  const updateCondition = (index: number, updates: Partial<AlertCondition>) => {
    const newConditions = [...conditions]
    newConditions[index] = { ...newConditions[index], ...updates }
    setConditions(newConditions)
  }

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  const addAction = (type: AlertAction['type']) => {
    const newAction: AlertAction = {
      type,
      config: type === 'webhook' ? { url: '' } : type === 'discord' || type === 'slack' ? { webhook_url: '' } : {},
      enabled: true,
    }
    setActions([...actions, newAction])
  }

  const updateAction = (index: number, updates: Partial<AlertAction>) => {
    const newActions = [...actions]
    newActions[index] = { ...newActions[index], ...updates }
    setActions(newActions)
  }

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index))
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'webhook':
        return <Webhook size={16} />
      case 'discord':
        return <MessageSquare size={16} />
      case 'slack':
        return <Send size={16} />
      case 'log':
        return <FileText size={16} />
      default:
        return null
    }
  }

  const openTestModal = (rule?: AlertRule) => {
    if (rule) {
      setTestConditions(parseConditions(rule))
    } else {
      setTestConditions(conditions)
    }
    setTestData({ subsystem: '', event_id: '', level: '', message: '' })
    setTestResults(null)
    setShowTestModal(true)
  }

  const runTest = () => {
    testMutation.mutate({ conditions: testConditions, testData })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="text-[var(--accent)]" size={24} />
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('alertRules.alertRulesPage')}</h1>
            <p className="text-sm text-[var(--text-secondary)]">{t('alertRules.description')}</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={16} className="mr-2" />
          {t('alertRules.createRule')}
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.total_rules}</div>
            <div className="text-sm text-[var(--text-secondary)]">Total Rules</div>
          </div>
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            <div className="text-2xl font-bold text-green-500">{stats.enabled_rules}</div>
            <div className="text-sm text-[var(--text-secondary)]">Enabled</div>
          </div>
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.total_triggers}</div>
            <div className="text-sm text-[var(--text-secondary)]">Total Triggers</div>
          </div>
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            <div className="text-2xl font-bold text-[var(--accent)]">{stats.recent_triggers}</div>
            <div className="text-sm text-[var(--text-secondary)]">Last 24h</div>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
        <div className="divide-y divide-[var(--border-primary)]">
          {rules.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-secondary)]">
              {t('alertRules.noRulesConfigured')}
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)]">{rule.name}</span>
                    <Badge variant={rule.is_enabled ? 'success' : 'secondary'}>
                      {rule.is_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <Badge variant="default">{rule.event_type}</Badge>
                  </div>
                  {rule.description && (
                    <p className="text-sm text-[var(--text-secondary)] mt-1">{rule.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-secondary)]">
                    <span>{parseConditions(rule).length} conditions</span>
                    <span>{parseActions(rule).length} actions</span>
                    <span>Triggered {rule.trigger_count} times</span>
                    {rule.last_triggered && (
                      <span>Last: {new Date(rule.last_triggered).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openTestModal(rule)} title="Test Rule">
                    <Play size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleMutation.mutate(rule.id)}
                    title={rule.is_enabled ? 'Disable' : 'Enable'}
                  >
                    {rule.is_enabled ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(rule)}>
                    <Edit size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(t('alertRules.deleteConfirm'))) {
                        deleteMutation.mutate(rule.id)
                      }
                    }}
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || editingRule !== null}
        onClose={() => {
          setShowCreateModal(false)
          setEditingRule(null)
          resetForm()
        }}
        title={editingRule ? t('alertRules.createModal.editTitle') : t('alertRules.createModal.title')}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alert rule name" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Event Type</label>
            <Select value={eventType} onChange={(e) => setEventType(e.target.value)}>
              {alertEventTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Priority</label>
              <Input
                type="number"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Cooldown (seconds)</label>
              <Input
                type="number"
                value={cooldown}
                onChange={(e) => setCooldown(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Conditions</label>
              <Button variant="ghost" size="sm" onClick={addCondition}>
                <Plus size={14} className="mr-1" /> {t('alertRules.actions.addCondition')}
              </Button>
            </div>
            <div className="space-y-2">
              {conditions.map((condition, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={condition.field}
                    onChange={(e) => updateCondition(index, { field: e.target.value })}
                    className="flex-1"
                  >
                    {conditionFields.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={condition.operator}
                    onChange={(e) => updateCondition(index, { operator: e.target.value as AlertCondition['operator'] })}
                    className="flex-1"
                  >
                    {conditionOperators.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                  <Input
                    value={condition.value}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    placeholder="Value"
                    className="flex-1"
                  />
                  <Button variant="ghost" size="sm" onClick={() => removeCondition(index)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Actions</label>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => addAction('webhook')} title={t('alertRules.actions.addWebhook')}>
                  <Webhook size={14} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => addAction('discord')} title={t('alertRules.actions.addDiscord')}>
                  <MessageSquare size={14} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => addAction('slack')} title={t('alertRules.actions.addSlack')}>
                  <Send size={14} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => addAction('log')} title={t('alertRules.actions.addLog')}>
                  <FileText size={14} />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {actions.map((action, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-[var(--bg-tertiary)] rounded">
                  {getActionIcon(action.type)}
                  <span className="text-sm capitalize">{action.type}</span>
                  {(action.type === 'webhook' || action.type === 'discord' || action.type === 'slack') && (
                    <Input
                      value={(action.config.url || action.config.webhook_url || '') as string}
                      onChange={(e) =>
                        updateAction(index, {
                          config: action.type === 'webhook' ? { url: e.target.value } : { webhook_url: e.target.value },
                        })
                      }
                      placeholder={action.type === 'webhook' ? 'Webhook URL' : `${action.type} Webhook URL`}
                      className="flex-1"
                    />
                  )}
                  <Button variant="ghost" size="sm" onClick={() => removeAction(index)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </div>

            <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={() => openTestModal()}>
              <Play size={16} className="mr-2" />
              {t('alertRules.actions.test')}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingRule(null)
                  resetForm()
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSubmit} disabled={!name || actions.length === 0}>
                {editingRule ? t('common.update') : t('common.create')}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Test Modal */}
      <Modal isOpen={showTestModal} onClose={() => setShowTestModal(false)} title={t('alertRules.testModal.title')} size="md">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">{t('alertRules.testModal.description')}</p>

          {conditionFields.map((field) => (
            <div key={field.value}>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{field.label}</label>
              <Input
                value={testData[field.value] || ''}
                onChange={(e) => setTestData({ ...testData, [field.value]: e.target.value })}
                placeholder={`Test ${field.label.toLowerCase()}`}
              />
            </div>
          ))}

          {testResults && (
            <div className="mt-4 p-4 rounded bg-[var(--bg-tertiary)]">
              <div className={`font-medium mb-2 ${testResults.all_matched ? 'text-green-500' : 'text-red-500'}`}>
                {testResults.all_matched ? t('alertRules.testModal.allMatched') : t('alertRules.testModal.someFailed')}
              </div>
              <div className="space-y-1 text-sm">
                {testResults.results.map((result, index) => (
                  <div key={index} className={result.matched ? 'text-green-500' : 'text-red-500'}>
                    {result.matched ? '✓' : '✗'} {result.field} {result.operator} "{result.expected}" (actual: "{result.actual}")
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowTestModal(false)}>
              Close
            </Button>
            <Button onClick={runTest}>
              <Play size={16} className="mr-2" />
              Run Test
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
