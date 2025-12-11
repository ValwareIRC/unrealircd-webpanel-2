import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  getSavedSearches, 
  createSavedSearch, 
  deleteSavedSearch,
  useSavedSearch,
  SavedSearch,
  SavedSearchRequest 
} from '@/services/savedSearchService'
import { Button, Modal, Input, Badge } from '@/components/common'
import { Bookmark, BookmarkPlus, Trash2, Star, Globe } from 'lucide-react'
import toast from 'react-hot-toast'

interface SavedSearchesProps {
  page: string // Which page this is for (users, channels, bans, etc.)
  currentQuery: string
  currentFilters?: Record<string, unknown>
  onApplySearch: (query: string, filters?: Record<string, unknown>) => void
}

export function SavedSearches({ page, currentQuery, currentFilters, onApplySearch }: SavedSearchesProps) {
  const queryClient = useQueryClient()
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showListModal, setShowListModal] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [isGlobal, setIsGlobal] = useState(false)

  const { data: savedSearches = [] } = useQuery({
    queryKey: ['savedSearches', page],
    queryFn: () => getSavedSearches(page),
  })

  const createMutation = useMutation({
    mutationFn: createSavedSearch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSearches', page] })
      toast.success('Search saved')
      setShowSaveModal(false)
      setSearchName('')
      setIsGlobal(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save search')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSavedSearch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSearches', page] })
      toast.success('Search deleted')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete search')
    },
  })

  const useMutation_ = useMutation({
    mutationFn: useSavedSearch,
    onSuccess: (search) => {
      queryClient.invalidateQueries({ queryKey: ['savedSearches', page] })
      const filters = search.filters ? JSON.parse(search.filters) : undefined
      onApplySearch(search.query, filters)
      setShowListModal(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to apply search')
    },
  })

  const handleSave = () => {
    if (!searchName.trim()) {
      toast.error('Please enter a name for the search')
      return
    }
    
    const data: SavedSearchRequest = {
      name: searchName.trim(),
      page,
      query: currentQuery,
      filters: currentFilters ? JSON.stringify(currentFilters) : undefined,
      is_global: isGlobal,
    }
    
    createMutation.mutate(data)
  }

  const handleApply = (search: SavedSearch) => {
    useMutation_.mutate(search.id)
  }

  const canSave = currentQuery.trim().length > 0

  return (
    <div className="flex items-center gap-2">
      {/* Save current search button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowSaveModal(true)}
        disabled={!canSave}
        title={canSave ? 'Save current search' : 'Enter a search query first'}
      >
        <BookmarkPlus size={18} />
      </Button>

      {/* View saved searches button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowListModal(true)}
        className="relative"
        title="View saved searches"
      >
        <Bookmark size={18} />
        {savedSearches.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-[var(--accent-color)] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {savedSearches.length}
          </span>
        )}
      </Button>

      {/* Save Search Modal */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => {
          setShowSaveModal(false)
          setSearchName('')
          setIsGlobal(false)
        }}
        title="Save Search"
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              setShowSaveModal(false)
              setSearchName('')
              setIsGlobal(false)
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              isLoading={createMutation.isPending}
              disabled={!searchName.trim()}
            >
              Save Search
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg">
            <div className="text-sm text-[var(--text-muted)]">Current Search:</div>
            <div className="font-mono text-[var(--text-primary)]">{currentQuery || '(empty)'}</div>
          </div>
          
          <Input
            label="Search Name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="e.g., TOR exit nodes, Suspicious IPs"
            autoFocus
          />
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isGlobal}
              onChange={(e) => setIsGlobal(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border-color)] bg-[var(--bg-tertiary)] checked:bg-[var(--accent-color)]"
            />
            <span className="text-[var(--text-secondary)]">
              <Globe size={14} className="inline mr-1" />
              Share with all users
            </span>
          </label>
        </div>
      </Modal>

      {/* Saved Searches List Modal */}
      <Modal
        isOpen={showListModal}
        onClose={() => setShowListModal(false)}
        title="Saved Searches"
        size="lg"
      >
        {savedSearches.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)]">
            <Bookmark size={48} className="mx-auto mb-4 opacity-50" />
            <p>No saved searches yet.</p>
            <p className="text-sm">Save your current search to quickly access it later.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {savedSearches.map((search) => (
              <div
                key={search.id}
                className="bg-[var(--bg-tertiary)] p-3 rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => handleApply(search)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text-primary)]">{search.name}</span>
                      {search.is_global && (
                        <Badge variant="info" size="sm">
                          <Globe size={12} className="mr-1" />
                          Shared
                        </Badge>
                      )}
                      {search.use_count > 5 && (
                        <Badge variant="warning" size="sm">
                          <Star size={12} className="mr-1" />
                          Popular
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm font-mono text-[var(--text-muted)] mt-1">
                      {search.query || '(no query)'}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      Used {search.use_count} time{search.use_count !== 1 ? 's' : ''}
                      {search.last_used && ` • Last used ${new Date(search.last_used).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleApply(search)}
                    >
                      Apply
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => deleteMutation.mutate(search.id)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
