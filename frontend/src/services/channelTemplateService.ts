import api from './api'

export interface ChannelTemplate {
  id: number
  created_at: string
  updated_at: string
  name: string
  description: string
  modes: string
  topic: string
  ban_list: string // JSON array
  except_list: string // JSON array
  invite_list: string // JSON array
  settings: string // JSON object
  is_global: boolean
  use_count: number
  created_by: number
  created_by_username: string
}

export interface CreateChannelTemplateRequest {
  name: string
  description?: string
  modes?: string
  topic?: string
  ban_list?: string[]
  except_list?: string[]
  invite_list?: string[]
  settings?: Record<string, unknown>
  is_global?: boolean
}

export interface UpdateChannelTemplateRequest {
  name?: string
  description?: string
  modes?: string
  topic?: string
  ban_list?: string[]
  except_list?: string[]
  invite_list?: string[]
  settings?: Record<string, unknown>
  is_global?: boolean
}

export interface ApplyTemplateResult {
  message: string
  success: string[]
  errors: string[]
  template: ChannelTemplate
}

// Get all channel templates
export async function getChannelTemplates(): Promise<ChannelTemplate[]> {
  const response = await api.get('/channel-templates')
  return response.data
}

// Get single channel template
export async function getChannelTemplate(id: number): Promise<ChannelTemplate> {
  const response = await api.get(`/channel-templates/${id}`)
  return response.data
}

// Create channel template
export async function createChannelTemplate(data: CreateChannelTemplateRequest): Promise<ChannelTemplate> {
  const response = await api.post('/channel-templates', data)
  return response.data
}

// Update channel template
export async function updateChannelTemplate(id: number, data: UpdateChannelTemplateRequest): Promise<ChannelTemplate> {
  const response = await api.put(`/channel-templates/${id}`, data)
  return response.data
}

// Delete channel template
export async function deleteChannelTemplate(id: number): Promise<void> {
  await api.delete(`/channel-templates/${id}`)
}

// Apply template to channel
export async function applyChannelTemplate(id: number, channel: string): Promise<ApplyTemplateResult> {
  const response = await api.post(`/channel-templates/${id}/apply`, { channel })
  return response.data
}

// Create template from existing channel
export async function createTemplateFromChannel(channel: string, name: string): Promise<ChannelTemplate> {
  const response = await api.post('/channel-templates/from-channel', { channel, name })
  return response.data
}

// Helper to parse ban list from JSON string
export function parseBanList(template: ChannelTemplate): string[] {
  try {
    return JSON.parse(template.ban_list) || []
  } catch {
    return []
  }
}

// Helper to parse except list from JSON string
export function parseExceptList(template: ChannelTemplate): string[] {
  try {
    return JSON.parse(template.except_list) || []
  } catch {
    return []
  }
}

// Helper to parse invite list from JSON string
export function parseInviteList(template: ChannelTemplate): string[] {
  try {
    return JSON.parse(template.invite_list) || []
  } catch {
    return []
  }
}

// Helper to parse settings from JSON string
export function parseSettings(template: ChannelTemplate): Record<string, unknown> {
  try {
    return JSON.parse(template.settings) || {}
  } catch {
    return {}
  }
}
