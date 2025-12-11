import api from './api'

export interface ScheduledCommand {
  id: number
  created_at: string
  updated_at: string
  name: string
  description: string
  command: string
  target: string
  params: string
  schedule: string
  run_at?: string
  is_enabled: boolean
  last_run?: string
  last_result: string
  next_run?: string
  run_count: number
  created_by: number
  created_by_username: string
}

export interface ScheduledCommandRequest {
  name: string
  description?: string
  command: string
  target?: string
  params?: Record<string, unknown>
  schedule: string
  run_at?: string
  is_enabled: boolean
}

export async function getScheduledCommands(): Promise<ScheduledCommand[]> {
  const response = await api.get('/scheduled-commands')
  return response.data
}

export async function getScheduledCommand(id: number): Promise<ScheduledCommand> {
  const response = await api.get(`/scheduled-commands/${id}`)
  return response.data
}

export async function createScheduledCommand(data: ScheduledCommandRequest): Promise<ScheduledCommand> {
  const response = await api.post('/scheduled-commands', data)
  return response.data
}

export async function updateScheduledCommand(id: number, data: ScheduledCommandRequest): Promise<ScheduledCommand> {
  const response = await api.put(`/scheduled-commands/${id}`, data)
  return response.data
}

export async function deleteScheduledCommand(id: number): Promise<void> {
  await api.delete(`/scheduled-commands/${id}`)
}

export async function toggleScheduledCommand(id: number): Promise<ScheduledCommand> {
  const response = await api.post(`/scheduled-commands/${id}/toggle`)
  return response.data
}

export async function runScheduledCommandNow(id: number): Promise<{ message: string; result: string; command: ScheduledCommand }> {
  const response = await api.post(`/scheduled-commands/${id}/run`)
  return response.data
}
