import api from './api'

export interface AlertRule {
  id: number
  created_at: string
  updated_at: string
  name: string
  description: string
  event_type: string
  conditions: string // JSON string
  actions: string // JSON string
  is_enabled: boolean
  priority: number
  cooldown: number
  last_triggered?: string
  trigger_count: number
  created_by: number
  created_by_username: string
}

export interface AlertCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'regex' | 'starts_with' | 'ends_with'
  value: string
}

export interface AlertAction {
  type: 'webhook' | 'discord' | 'slack' | 'log'
  config: Record<string, unknown>
  enabled: boolean
}

export interface CreateAlertRuleRequest {
  name: string
  description?: string
  event_type: string
  conditions: AlertCondition[]
  actions: AlertAction[]
  priority?: number
  cooldown?: number
}

export interface UpdateAlertRuleRequest {
  name?: string
  description?: string
  event_type?: string
  conditions?: AlertCondition[]
  actions?: AlertAction[]
  is_enabled?: boolean
  priority?: number
  cooldown?: number
}

export interface AlertRuleStats {
  total_rules: number
  enabled_rules: number
  total_triggers: number
  recent_triggers: number
}

// Get all alert rules
export async function getAlertRules(params?: { enabled?: boolean; event_type?: string }): Promise<AlertRule[]> {
  const response = await api.get('/alert-rules', { params })
  return response.data
}

// Get single alert rule
export async function getAlertRule(id: number): Promise<AlertRule> {
  const response = await api.get(`/alert-rules/${id}`)
  return response.data
}

// Create alert rule
export async function createAlertRule(data: CreateAlertRuleRequest): Promise<AlertRule> {
  const response = await api.post('/alert-rules', data)
  return response.data
}

// Update alert rule
export async function updateAlertRule(id: number, data: UpdateAlertRuleRequest): Promise<AlertRule> {
  const response = await api.put(`/alert-rules/${id}`, data)
  return response.data
}

// Delete alert rule
export async function deleteAlertRule(id: number): Promise<void> {
  await api.delete(`/alert-rules/${id}`)
}

// Toggle alert rule
export async function toggleAlertRule(id: number): Promise<AlertRule> {
  const response = await api.post(`/alert-rules/${id}/toggle`)
  return response.data
}

// Test alert rule
export async function testAlertRule(conditions: AlertCondition[], testData: Record<string, unknown>): Promise<{
  all_matched: boolean
  results: Array<{
    field: string
    operator: string
    expected: string
    actual: string
    matched: boolean
  }>
}> {
  const response = await api.post('/alert-rules/test', { conditions, test_data: testData })
  return response.data
}

// Get alert rule stats
export async function getAlertRuleStats(): Promise<AlertRuleStats> {
  const response = await api.get('/alert-rules/stats')
  return response.data
}

// Helper to parse conditions from JSON string
export function parseConditions(rule: AlertRule): AlertCondition[] {
  try {
    return JSON.parse(rule.conditions) || []
  } catch {
    return []
  }
}

// Helper to parse actions from JSON string
export function parseActions(rule: AlertRule): AlertAction[] {
  try {
    return JSON.parse(rule.actions) || []
  } catch {
    return []
  }
}

// Event types that can trigger alerts
export const alertEventTypes = [
  { value: '*', label: 'All Events' },
  { value: 'error', label: 'Errors' },
  { value: 'warn', label: 'Warnings' },
  { value: 'oper', label: 'Oper Events' },
  { value: 'link', label: 'Server Links' },
  { value: 'connect', label: 'Connections' },
  { value: 'kill', label: 'Kills' },
  { value: 'tkl', label: 'TKL/Bans' },
  { value: 'flood', label: 'Flood Protection' },
]

// Condition operators
export const conditionOperators = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does Not Contain' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'regex', label: 'Matches Regex' },
]

// Condition fields
export const conditionFields = [
  { value: 'subsystem', label: 'Subsystem' },
  { value: 'event_id', label: 'Event ID' },
  { value: 'level', label: 'Level' },
  { value: 'message', label: 'Message' },
]
