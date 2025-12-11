import { type ReactNode, useState, useEffect, useRef } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  Search,
} from 'lucide-react'

interface Column<T> {
  key: string
  header: string | ReactNode
  render?: (item: T) => ReactNode
  sortable?: boolean
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyField: keyof T
  isLoading?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  pageSize?: number
  emptyMessage?: string
  onRowClick?: (item: T) => void
  actions?: (item: T) => ReactNode
  animateChanges?: boolean // Enable animated transitions for live updates
  searchValue?: string // Controlled search value
  onSearchChange?: (value: string) => void // Callback when search changes
  searchExtra?: ReactNode // Extra content to render next to search
}

// Track which items are new for animation
function useAnimatedItems<T>(data: T[], keyField: keyof T) {
  const previousKeysRef = useRef<Set<string>>(new Set())
  const hasInitialLoadRef = useRef(false)
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set())
  const [removingKeys, setRemovingKeys] = useState<Set<string>>(new Set())
  const removedItemsRef = useRef<Map<string, T>>(new Map())

  useEffect(() => {
    // Don't process empty data
    if (data.length === 0) return

    const currentKeys = new Set(data.map(item => String((item as Record<string, unknown>)[keyField as string])))

    // Skip animation on initial load (first time we have actual data)
    if (!hasInitialLoadRef.current) {
      hasInitialLoadRef.current = true
      previousKeysRef.current = currentKeys
      return
    }

    const previousKeys = previousKeysRef.current

    // Find new items
    const addedKeys = new Set<string>()
    currentKeys.forEach(key => {
      if (!previousKeys.has(key)) {
        addedKeys.add(key)
      }
    })

    // Find removed items
    const removed = new Set<string>()
    previousKeys.forEach(key => {
      if (!currentKeys.has(key)) {
        removed.add(key)
      }
    })

    // Store removed items for fade-out animation
    if (removed.size > 0) {
      // We don't need to store the items since they're already gone
      setRemovingKeys(removed)
      // Clear removing keys after animation
      setTimeout(() => {
        setRemovingKeys(new Set())
        removedItemsRef.current.clear()
      }, 300)
    }

    if (addedKeys.size > 0) {
      setNewKeys(addedKeys)
      // Clear new keys after animation completes
      setTimeout(() => {
        setNewKeys(new Set())
      }, 500)
    }

    previousKeysRef.current = currentKeys
  }, [data, keyField])

  return { newKeys, removingKeys }
}

export function DataTable<T>({
  data,
  columns,
  keyField,
  isLoading = false,
  searchable = true,
  searchPlaceholder = 'Search...',
  pageSize = 10,
  emptyMessage = 'No data available',
  onRowClick,
  actions,
  animateChanges = true,
  searchValue,
  onSearchChange,
  searchExtra,
}: DataTableProps<T>) {
  const [internalSearch, setInternalSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Use controlled or uncontrolled search
  const search = searchValue !== undefined ? searchValue : internalSearch
  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value)
    } else {
      setInternalSearch(value)
    }
    setPage(1)
  }

  // Track animated items
  const { newKeys } = useAnimatedItems(data, keyField)

  // Filter data
  const filteredData = search
    ? data.filter((item) =>
        Object.values(item as object).some(
          (value) =>
            value &&
            String(value).toLowerCase().includes(search.toLowerCase())
        )
      )
    : data

  // Sort data
  const sortedData = sortField
    ? [...filteredData].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortField]
        const bVal = (b as Record<string, unknown>)[sortField]
        if (aVal === bVal) return 0
        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1
        const result = aVal < bVal ? -1 : 1
        return sortDir === 'asc' ? result : -result
      })
    : filteredData

  // Paginate
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const paginatedData = sortedData.slice((page - 1) * pageSize, page * pageSize)

  // Reset to page 1 if current page becomes invalid
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const handleSort = (key: string) => {
    if (sortField === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(key)
      setSortDir('asc')
    }
  }

  if (isLoading) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-[var(--bg-tertiary)]"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 border-t border-[var(--border-primary)]">
              <div className="flex items-center gap-4 p-4">
                <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/4"></div>
                <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/3"></div>
                <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/5"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl overflow-hidden">
      {/* Search */}
      {searchable && (
        <div className="p-4 border-b border-[var(--border-primary)]">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)] transition-all"
              />
            </div>
            {searchExtra}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--bg-tertiary)]/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider ${
                    col.sortable ? 'cursor-pointer hover:text-[var(--text-primary)]' : ''
                  } ${col.className || ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-2">
                    {col.header}
                    {col.sortable && sortField === col.key && (
                      sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-primary)]">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-4 py-8 text-center text-[var(--text-muted)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => {
                const itemKey = String((item as Record<string, unknown>)[keyField as string])
                const isNew = animateChanges && newKeys.has(itemKey)
                return (
                  <tr
                    key={itemKey}
                    className={`hover:bg-[var(--bg-hover)] transition-all duration-300 ${
                      onRowClick ? 'cursor-pointer' : ''
                    } ${isNew ? 'animate-row-enter' : ''}`}
                    onClick={() => onRowClick?.(item)}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                        {col.render
                          ? col.render(item)
                          : String((item as Record<string, unknown>)[col.key] ?? '')}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-4 py-3 text-right">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {actions(item)}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-primary)]">
          <div className="text-sm text-[var(--text-muted)]">
            Showing {(page - 1) * pageSize + 1} to{' '}
            {Math.min(page * pageSize, sortedData.length)} of {sortedData.length} results
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsLeft size={18} />
            </button>
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="px-4 py-2 text-sm text-[var(--text-primary)]">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
