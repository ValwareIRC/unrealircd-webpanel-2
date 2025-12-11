import api from './api'

export interface ComplianceReport {
  id: number
  created_at: string
  completed_at?: string
  type: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  query: string // JSON object
  result_path: string
  error: string
  requested_by: number
  requested_by_username: string
}

export interface ReportType {
  type: string
  name: string
  description: string
  fields: string[]
}

export interface CreateReportRequest {
  type: string
  query?: Record<string, unknown>
}

// Get all compliance reports
export async function getComplianceReports(params?: { status?: string; type?: string; limit?: number }): Promise<ComplianceReport[]> {
  const response = await api.get('/compliance', { params })
  return response.data
}

// Get single compliance report
export async function getComplianceReport(id: number): Promise<ComplianceReport> {
  const response = await api.get(`/compliance/${id}`)
  return response.data
}

// Create compliance report
export async function createComplianceReport(data: CreateReportRequest): Promise<ComplianceReport> {
  const response = await api.post('/compliance', data)
  return response.data
}

// Download compliance report
export async function downloadComplianceReport(id: number): Promise<Blob> {
  const response = await api.get(`/compliance/${id}/download`, { responseType: 'blob' })
  return response.data
}

// Delete compliance report
export async function deleteComplianceReport(id: number): Promise<void> {
  await api.delete(`/compliance/${id}`)
}

// Get report types
export async function getReportTypes(): Promise<ReportType[]> {
  const response = await api.get('/compliance/types')
  return response.data
}

// Helper to parse query from JSON string
export function parseQuery(report: ComplianceReport): Record<string, unknown> {
  try {
    return JSON.parse(report.query) || {}
  } catch {
    return {}
  }
}

// Status colors for UI
export const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  processing: 'bg-blue-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
}

// Status labels
export const statusLabels: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
}

// Report type icons
export const reportTypeIcons: Record<string, string> = {
  user_data: 'User',
  activity_log: 'Activity',
  full_export: 'Database',
  gdpr_request: 'Shield',
  audit_log: 'FileText',
}
