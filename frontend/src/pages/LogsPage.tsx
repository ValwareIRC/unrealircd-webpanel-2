import { useState, useEffect, useRef, useCallback } from 'react'
import { useLogs } from '@/hooks'
import { Alert, Badge, Button, Modal, LoadingSpinner } from '@/components/common'
import { FileText, Play, Pause, Trash2, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { LogEntry } from '@/types'

// Default log sources to filter (matching the PHP webpanel)
const DEFAULT_SOURCES = [
  'all',
  '!debug',
  '!join.LOCAL_CLIENT_JOIN',
  '!join.REMOTE_CLIENT_JOIN',
  '!part.LOCAL_CLIENT_PART',
  '!part.REMOTE_CLIENT_PART',
  '!kick.LOCAL_CLIENT_KICK',
  '!kick.REMOTE_CLIENT_KICK',
]

function getLevelColor(level: string): string {
  switch (level?.toLowerCase()) {
    case 'info':
      return 'text-green-400'
    case 'warn':
    case 'warning':
      return 'text-yellow-400'
    case 'error':
    case 'fatal':
      return 'text-red-400'
    case 'debug':
      return 'text-blue-400'
    default:
      return 'text-[var(--text-secondary)]'
  }
}

function getLevelBadgeVariant(level: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (level?.toLowerCase()) {
    case 'info':
      return 'success'
    case 'warn':
    case 'warning':
      return 'warning'
    case 'error':
    case 'fatal':
      return 'error'
    case 'debug':
      return 'info'
    default:
      return 'default'
  }
}

function formatTimestamp(timestamp: string): string {
  if (!timestamp) return ''
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour12: false })
  } catch {
    return timestamp
  }
}

function formatFullTimestamp(timestamp: string): string {
  if (!timestamp) return ''
  try {
    const date = new Date(timestamp)
    return date.toLocaleString()
  } catch {
    return timestamp
  }
}

export function LogsPage() {
  const { data: initialLogs, isLoading, error, refetch } = useLogs(DEFAULT_SOURCES)
  const { t } = useTranslation()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [showJsonModal, setShowJsonModal] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [streamStarted, setStreamStarted] = useState(false)
  const [filterLevel, setFilterLevel] = useState<string>('')
  const [filterSubsystem, setFilterSubsystem] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const logsContainerRef = useRef<HTMLDivElement>(null)
  const maxLogs = 1000

  // Initialize with historical logs (reversed so newest at top)
  useEffect(() => {
    if (initialLogs && initialLogs.length > 0) {
      // Reverse so newest logs appear first
      setLogs([...initialLogs].reverse().slice(0, maxLogs))
    }
  }, [initialLogs])

  // Auto-scroll to top (newest logs are at top)
  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = 0
    }
  }, [logs, autoScroll])

  // Start SSE streaming
  const startStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const token = localStorage.getItem('token')
    if (!token) {
      console.error('No auth token available')
      return
    }

    // Build the stream URL with auth token as query param
    // EventSource doesn't support custom headers, so we pass token via query string
    const baseUrl = '/api'
    const streamUrl = `${baseUrl}/logs/stream?token=${encodeURIComponent(token)}`

    const es = new EventSource(streamUrl)

    es.addEventListener('connected', (event) => {
      console.log('SSE connected event received:', (event as MessageEvent).data)
    })

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data && (data.msg || data.message)) {
          const newLog: LogEntry = {
            timestamp: data.timestamp || data.time || new Date().toISOString(),
            level: data.level || 'info',
            subsystem: data.subsystem || '',
            event_id: data.event_id || data.event || '',
            msg: data.msg || data.message || '',
            log_source: data.log_source || '',
            raw: data,
          }
          // Prepend new logs so newest appear at top
          setLogs((prev) => {
            const updated = [newLog, ...prev]
            return updated.slice(0, maxLogs)
          })
        }
      } catch (err) {
        console.error('Failed to parse log event:', err)
      }
    }

    es.addEventListener('log', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data)
        if (data) {
          const newLog: LogEntry = {
            timestamp: data.timestamp || data.time || new Date().toISOString(),
            level: data.level || 'info',
            subsystem: data.subsystem || '',
            event_id: data.event_id || data.event || '',
            msg: data.msg || data.message || '',
            log_source: data.log_source || '',
            raw: data,
          }
          // Prepend new logs so newest appear at top
          setLogs((prev) => {
            const updated = [newLog, ...prev]
            return updated.slice(0, maxLogs)
          })
        }
      } catch (err) {
        console.error('Failed to parse log event:', err)
      }
    })

    es.onerror = (e) => {
      console.error('SSE connection error', e, 'readyState:', es.readyState)
      setIsStreaming(false)
    }

    eventSourceRef.current = es
    setIsStreaming(true)
  }, [])

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsStreaming(false)
  }, [])

  // Auto-start streaming when component mounts
  useEffect(() => {
    if (!streamStarted && !isLoading) {
      setStreamStarted(true)
      startStreaming()
    }
  }, [streamStarted, isLoading, startStreaming])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (filterLevel && log.level?.toLowerCase() !== filterLevel.toLowerCase()) {
      return false
    }
    if (filterSubsystem && !log.subsystem?.toLowerCase().includes(filterSubsystem.toLowerCase())) {
      return false
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        log.msg?.toLowerCase().includes(query) ||
        log.subsystem?.toLowerCase().includes(query) ||
        log.event_id?.toLowerCase().includes(query)
      )
    }
    return true
  })

  // Get unique subsystems for filter dropdown
  const subsystems = [...new Set(logs.map((l) => l.subsystem).filter(Boolean))].sort()
  const levels = [...new Set(logs.map((l) => l.level).filter(Boolean))].sort()

  const handleLogClick = (log: LogEntry) => {
    setSelectedLog(log)
    setShowJsonModal(true)
  }

  const clearLogs = () => {
    setLogs([])
  }

  if (error) {
    return (
      <Alert type="error">
        Failed to load logs: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('logs.title')}</h1>
          <p className="text-[var(--text-muted)] mt-1">
            {t('logs.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </Button>
          <Button
            variant={isStreaming ? 'secondary' : 'primary'}
            size="sm"
            onClick={isStreaming ? stopStreaming : startStreaming}
            leftIcon={isStreaming ? <Pause size={16} /> : <Play size={16} />}
          >
            {isStreaming ? t('logs.stopLive') : t('logs.startLive')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearLogs}
            className="text-red-400 hover:text-red-300"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
        <div className="flex items-center gap-2">
          <label className="text-sm text-[var(--text-muted)]">{t('logs.level')}</label>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded px-2 py-1 text-sm text-[var(--text-primary)]"
          >
            <option value="">{t('logs.all')}</option>
            {levels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[var(--text-muted)]">{t('logs.subsystem')}</label>
          <select
            value={filterSubsystem}
            onChange={(e) => setFilterSubsystem(e.target.value)}
            className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded px-2 py-1 text-sm text-[var(--text-primary)]"
          >
            <option value="">{t('logs.all')}</option>
            {subsystems.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <input
            type="text"
            placeholder={t('logs.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded px-3 py-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[var(--text-muted)]">{t('logs.autoScroll')}</label>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 rounded text-sm ${
              autoScroll
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
            }`}
          >
            {autoScroll ? t('logs.on') : t('logs.off')}
          </button>
        </div>
        <div className="text-sm text-[var(--text-muted)]">
          {filteredLogs.length} / {logs.length} {t('logs.entries')}
          {isStreaming && (
            <Badge variant="success" size="sm" className="ml-2">
              LIVE
            </Badge>
          )}
        </div>
      </div>

      {/* Log table */}
      <div
        ref={logsContainerRef}
        className="flex-1 overflow-auto bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]"
      >
        {isLoading && logs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
            <FileText size={48} className="mb-2 opacity-50" />
            <p>{t('logs.noEntries')}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)]">
              <tr>
                <th className="text-left px-3 py-2 text-[var(--text-muted)] font-medium w-24">{t('logs.tableHeaders.time')}</th>
                <th className="text-left px-3 py-2 text-[var(--text-muted)] font-medium w-20">{t('logs.tableHeaders.level')}</th>
                <th className="text-left px-3 py-2 text-[var(--text-muted)] font-medium w-32">{t('logs.tableHeaders.subsystem')}</th>
                <th className="text-left px-3 py-2 text-[var(--text-muted)] font-medium w-40">{t('logs.tableHeaders.event')}</th>
                <th className="text-left px-3 py-2 text-[var(--text-muted)] font-medium">{t('logs.tableHeaders.message')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, index) => (
                <tr
                  key={`${log.timestamp}-${index}`}
                  onClick={() => handleLogClick(log)}
                  className="border-b border-[var(--border-primary)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2 text-[var(--text-muted)] font-mono text-xs">
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={getLevelBadgeVariant(log.level)} size="sm">
                      {log.level || 'info'}
                    </Badge>
                  </td>
                  <td className={`px-3 py-2 ${getLevelColor(log.level)}`}>
                    {log.subsystem}
                  </td>
                  <td className={`px-3 py-2 ${getLevelColor(log.level)}`}>
                    {log.event_id}
                  </td>
                  <td className={`px-3 py-2 ${getLevelColor(log.level)} truncate max-w-md`} title={log.msg}>
                    {log.msg}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Log Detail Modal */}
      <Modal
        isOpen={showJsonModal}
        onClose={() => setShowJsonModal(false)}
        title={t('logs.modal.title')}
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-4">
            {/* Summary table */}
            <div className="bg-[var(--bg-tertiary)] rounded-lg p-4">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-[var(--border-primary)]">
                    <td className="py-2 text-[var(--text-muted)] w-32">{t('logs.tableHeaders.time')}</td>
                    <td className="py-2 font-mono text-[var(--text-primary)]">
                      {formatFullTimestamp(selectedLog.timestamp)}
                    </td>
                  </tr>
                  <tr className="border-b border-[var(--border-primary)]">
                    <td className="py-2 text-[var(--text-muted)]">{t('logs.tableHeaders.level')}</td>
                    <td className="py-2">
                      <Badge variant={getLevelBadgeVariant(selectedLog.level)}>
                        {selectedLog.level}
                      </Badge>
                    </td>
                  </tr>
                  <tr className="border-b border-[var(--border-primary)]">
                    <td className="py-2 text-[var(--text-muted)]">{t('logs.tableHeaders.subsystem')}</td>
                    <td className="py-2 font-mono text-[var(--text-primary)]">
                      {selectedLog.subsystem || '-'}
                    </td>
                  </tr>
                  <tr className="border-b border-[var(--border-primary)]">
                    <td className="py-2 text-[var(--text-muted)]">{t('logs.tableHeaders.event')}</td>
                    <td className="py-2 font-mono text-[var(--text-primary)]">
                      {selectedLog.event_id || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[var(--text-muted)]">{t('logs.tableHeaders.message')}</td>
                    <td className="py-2 text-[var(--text-primary)] whitespace-pre-wrap break-words">
                      {selectedLog.msg}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Raw JSON */}
            <div>
              <h4 className="text-sm font-medium text-[var(--text-muted)] mb-2">{t('logs.modal.rawJson')}</h4>
              <pre className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-4 text-xs font-mono text-[var(--text-secondary)] overflow-auto max-h-64">
                {JSON.stringify(selectedLog.raw || selectedLog, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default LogsPage
