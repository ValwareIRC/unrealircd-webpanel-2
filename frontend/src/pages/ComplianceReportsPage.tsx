import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, Download, Trash2, RefreshCw, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import {
  getComplianceReports,
  createComplianceReport,
  downloadComplianceReport,
  deleteComplianceReport,
  getReportTypes,
  parseQuery,
  statusLabels,
  type ComplianceReport,
  type ReportType,
} from '@/services/complianceService'
import { Button, Input, Modal, Badge } from '@/components/common'

export function ComplianceReportsPage() {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedType, setSelectedType] = useState<ReportType | null>(null)

  // Form state
  const [formData, setFormData] = useState<Record<string, string>>({})

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['complianceReports'],
    queryFn: () => getComplianceReports(),
    refetchInterval: 5000, // Refresh every 5 seconds to check for completed reports
  })

  const { data: reportTypes = [] } = useQuery({
    queryKey: ['reportTypes'],
    queryFn: () => getReportTypes(),
  })

  const createMutation = useMutation({
    mutationFn: createComplianceReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complianceReports'] })
      setShowCreateModal(false)
      setSelectedType(null)
      setFormData({})
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteComplianceReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complianceReports'] })
    },
  })

  const handleDownload = async (report: ComplianceReport) => {
    try {
      const blob = await downloadComplianceReport(report.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `compliance_report_${report.id}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const handleSubmit = () => {
    if (!selectedType) return

    const query: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(formData)) {
      if (value) {
        query[key] = value
      }
    }

    createMutation.mutate({
      type: selectedType.type,
      query,
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />
      case 'failed':
        return <XCircle size={16} className="text-red-500" />
      case 'processing':
        return <Loader2 size={16} className="text-blue-500 animate-spin" />
      case 'pending':
        return <Clock size={16} className="text-yellow-500" />
      default:
        return null
    }
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
          <FileText className="text-[var(--accent)]" size={24} />
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Compliance Reports</h1>
            <p className="text-sm text-[var(--text-secondary)]">Generate GDPR-compliant data exports and compliance reports</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={16} className="mr-2" />
          New Report
        </Button>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map((type: ReportType) => (
          <div
            key={type.type}
            className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] cursor-pointer hover:border-[var(--accent)] transition-colors"
            onClick={() => {
              setSelectedType(type)
              setFormData({})
              setShowCreateModal(true)
            }}
          >
            <h3 className="font-medium text-[var(--text-primary)]">{type.name}</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{type.description}</p>
          </div>
        ))}
      </div>

      {/* Reports List */}
      <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
        <div className="p-4 border-b border-[var(--border-primary)]">
          <h3 className="font-medium text-[var(--text-primary)]">Recent Reports</h3>
        </div>
        <div className="divide-y divide-[var(--border-primary)]">
          {reports.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-secondary)]">
              No reports generated yet. Create one above.
            </div>
          ) : (
            reports.map((report: ComplianceReport) => (
              <div key={report.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(report.status)}
                    <span className="font-medium text-[var(--text-primary)]">
                      {reportTypes.find((t: ReportType) => t.type === report.type)?.name || report.type}
                    </span>
                    <Badge
                      variant={
                        report.status === 'completed'
                          ? 'success'
                          : report.status === 'failed'
                          ? 'error'
                          : 'default'
                      }
                    >
                      {statusLabels[report.status] || report.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-[var(--text-secondary)] mt-1">
                    Requested by {report.requested_by_username} on{' '}
                    {new Date(report.created_at).toLocaleString()}
                  </div>
                  {Object.keys(parseQuery(report)).length > 0 && (
                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                      Query: {JSON.stringify(parseQuery(report))}
                    </div>
                  )}
                  {report.error && (
                    <div className="text-sm text-red-500 mt-1">{report.error}</div>
                  )}
                  {report.completed_at && (
                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                      Completed: {new Date(report.completed_at).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {report.status === 'completed' && (
                    <Button variant="secondary" size="sm" onClick={() => handleDownload(report)}>
                      <Download size={16} className="mr-1" />
                      Download
                    </Button>
                  )}
                  {report.status === 'processing' && (
                    <RefreshCw size={16} className="text-[var(--text-secondary)] animate-spin" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this report?')) {
                        deleteMutation.mutate(report.id)
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

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setSelectedType(null)
          setFormData({})
        }}
        title={selectedType ? `Create ${selectedType.name}` : 'Create Report'}
      >
        <div className="space-y-4">
          {!selectedType ? (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Select Report Type
              </label>
              <div className="space-y-2">
                {reportTypes.map((type) => (
                  <div
                    key={type.type}
                    className="p-3 rounded border border-[var(--border-primary)] cursor-pointer hover:border-[var(--accent)] transition-colors"
                    onClick={() => setSelectedType(type)}
                  >
                    <div className="font-medium text-[var(--text-primary)]">{type.name}</div>
                    <div className="text-sm text-[var(--text-secondary)]">{type.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-[var(--text-secondary)]">{selectedType.description}</p>

              {selectedType.fields.length > 0 ? (
                <div className="space-y-3">
                  {selectedType.fields.map((field) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1 capitalize">
                        {field.replace('_', ' ')}
                      </label>
                      <Input
                        value={formData[field] || ''}
                        onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                        placeholder={`Enter ${field.replace('_', ' ')}`}
                        type={field.includes('time') ? 'datetime-local' : 'text'}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-primary)]">
                  This report will export all data without filters.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateModal(false)
                    setSelectedType(null)
                    setFormData({})
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Generate Report'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
