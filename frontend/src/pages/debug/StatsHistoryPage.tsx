import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Code, AlertCircle, CheckCircle } from 'lucide-react'
import { Button, Alert } from '@/components/common'
import api from '@/services/api'

interface StatsHistoryResponse {
  no_params: {
    result: unknown
    error: string
  }
  with_detail_level: {
    result: unknown
    error: string
  }
  with_since: {
    result: unknown
    error: string
  }
}

export default function StatsHistoryPage() {
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['stats-history-debug'],
    queryFn: async (): Promise<StatsHistoryResponse> => {
      const response = await api.get<StatsHistoryResponse>('/stats/history')
      setLastFetched(new Date())
      return response.data
    },
    enabled: false, // Don't auto-fetch, wait for user to click
  })

  const handleFetch = () => {
    refetch()
  }

  const renderResult = (label: string, result: { result: unknown; error: string } | undefined) => {
    if (!result) return null

    const hasError = !!result.error
    const hasData = result.result !== null && result.result !== undefined

    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{label}</h3>
          {hasError ? (
            <span className="flex items-center gap-1 text-red-400 text-sm">
              <AlertCircle size={14} />
              Error
            </span>
          ) : hasData ? (
            <span className="flex items-center gap-1 text-green-400 text-sm">
              <CheckCircle size={14} />
              Success
            </span>
          ) : (
            <span className="text-[var(--text-muted)] text-sm">No data</span>
          )}
        </div>

        {result.error && (
          <Alert type="error">
            <strong>Error:</strong> {result.error}
          </Alert>
        )}

        <div>
          <p className="text-sm text-[var(--text-muted)] mb-2">Response:</p>
          <pre className="bg-[var(--bg-tertiary)] p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono text-[var(--text-secondary)]">
            {JSON.stringify(result.result, null, 2) || 'null'}
          </pre>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Stats History Debug</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Test the <code className="bg-[var(--bg-tertiary)] px-1 rounded">stats.history</code> RPC method
          </p>
        </div>
        <Button
          leftIcon={<RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} />}
          onClick={handleFetch}
          isLoading={isLoading}
        >
          {data ? 'Refetch' : 'Fetch Stats History'}
        </Button>
      </div>

      <Alert type="info">
        <div className="flex items-start gap-2">
          <Code size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">RPC Method Testing</p>
            <p className="text-sm mt-1">
              This page tests the <code>stats.history</code> JSON-RPC method with different parameter combinations
              to see what data UnrealIRCd returns. Check the backend console logs for additional debug output.
            </p>
          </div>
        </div>
      </Alert>

      {lastFetched && (
        <p className="text-sm text-[var(--text-muted)]">
          Last fetched: {lastFetched.toLocaleTimeString()}
        </p>
      )}

      {error && (
        <Alert type="error">
          Failed to fetch: {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      )}

      {!data && !isLoading && !error && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-8 text-center">
          <Code size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
          <p className="text-[var(--text-muted)]">
            Click the button above to fetch stats.history data from UnrealIRCd
          </p>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {renderResult('No Parameters', data.no_params)}
          {renderResult('With object_detail_level=1', data.with_detail_level)}
          {renderResult('With since=86400 (last 24h)', data.with_since)}
        </div>
      )}

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Test Parameters Sent</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg">
            <p className="text-[var(--text-muted)] mb-1">Test 1: No params</p>
            <code className="text-[var(--text-secondary)]">stats.history(null)</code>
          </div>
          <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg">
            <p className="text-[var(--text-muted)] mb-1">Test 2: Detail level</p>
            <code className="text-[var(--text-secondary)]">{'stats.history({object_detail_level: 1})'}</code>
          </div>
          <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg">
            <p className="text-[var(--text-muted)] mb-1">Test 3: Time range</p>
            <code className="text-[var(--text-secondary)]">{'stats.history({..., since: 86400})'}</code>
          </div>
        </div>
      </div>
    </div>
  )
}
