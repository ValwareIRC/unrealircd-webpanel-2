import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Responsive, WidthProvider, Layout } from 'react-grid-layout'
import { Pencil, Plus, X, Save, RotateCcw, GripVertical, Puzzle } from 'lucide-react'
import { DashboardWidget } from '@/components/dashboard/DashboardWidgets'
import { PageLoading } from '@/components/common'
import api from '@/services/api'
import marketplaceService, { PluginDashboardCard } from '@/services/marketplaceService'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGridLayout = WidthProvider(Responsive)

interface DashboardLayoutItem extends Layout {
  type?: string
  config?: string
}

interface LayoutResponse {
  layout: string
  is_default: boolean
}

interface AvailableWidget {
  type: string
  name: string
  description: string
  icon: string
  defaultSize: { w: number; h: number }
  minSize: { w: number; h: number }
  configOptions?: { name: string; type: string; options?: string }[]
}

// Widget configuration modal
function WidgetConfigModal({
  widget,
  currentConfig,
  onSave,
  onClose,
}: {
  widget: AvailableWidget
  currentConfig: string
  onSave: (config: string) => void
  onClose: () => void
}) {
  const [config, setConfig] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(currentConfig || '{}')
    } catch {
      return {}
    }
  })

  const handleSave = () => {
    onSave(JSON.stringify(config))
    onClose()
  }

  if (!widget.configOptions || widget.configOptions.length === 0) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Configure {widget.name}</h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-hover)] rounded">
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>
        <div className="space-y-4">
          {widget.configOptions.map((option) => (
            <div key={option.name}>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1 capitalize">
                {option.name}
              </label>
              {option.type === 'select' ? (
                <select
                  className="input w-full"
                  value={config[option.name] || ''}
                  onChange={(e) => setConfig({ ...config, [option.name]: e.target.value })}
                >
                  <option value="">Select...</option>
                  {option.options?.split(',').map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="input w-full"
                  value={config[option.name] || ''}
                  onChange={(e) => setConfig({ ...config, [option.name]: e.target.value })}
                  placeholder={`Enter ${option.name}...`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// Widget picker modal
function WidgetPicker({
  onSelect,
  onClose,
}: {
  onSelect: (widget: AvailableWidget) => void
  onClose: () => void
}) {
  const { data: widgets, isLoading } = useQuery<AvailableWidget[]>({
    queryKey: ['available-widgets'],
    queryFn: async () => {
      const response = await api.get('/dashboard/widgets')
      return response.data
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add Widget</h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-hover)] rounded">
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>
        {isLoading ? (
          <div className="py-8 text-center text-[var(--text-muted)]">Loading widgets...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {widgets?.map((widget) => (
              <button
                key={widget.type}
                onClick={() => onSelect(widget)}
                className="p-4 text-left rounded-lg border border-[var(--border-primary)] hover:bg-[var(--bg-hover)] hover:border-[var(--accent)] transition-colors"
              >
                <h3 className="text-sm font-medium text-[var(--text-primary)]">{widget.name}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">{widget.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [showWidgetPicker, setShowWidgetPicker] = useState(false)
  const [configWidget, setConfigWidget] = useState<{
    id: string
    widget: AvailableWidget
    config: string
  } | null>(null)
  const [localLayout, setLocalLayout] = useState<DashboardLayoutItem[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch layout
  const { data: layoutData, isLoading } = useQuery<LayoutResponse>({
    queryKey: ['dashboard-layout'],
    queryFn: async () => {
      const response = await api.get('/dashboard/layout')
      return response.data
    },
  })

  // Fetch plugin dashboard cards
  const { data: pluginCards = [] } = useQuery<PluginDashboardCard[]>({
    queryKey: ['pluginDashboardCards'],
    queryFn: () => marketplaceService.getPluginDashboardCards(),
    staleTime: 60000, // 1 minute
    retry: 1,
  })

  // Parse layout from API
  const savedLayout = useMemo(() => {
    if (!layoutData?.layout) return []
    try {
      return JSON.parse(layoutData.layout) as DashboardLayoutItem[]
    } catch {
      return []
    }
  }, [layoutData])

  // Initialize local layout when saved layout changes
  useEffect(() => {
    if (savedLayout.length > 0 && localLayout.length === 0) {
      setLocalLayout(savedLayout)
    }
  }, [savedLayout, localLayout.length])

  // Save layout mutation
  const saveMutation = useMutation({
    mutationFn: async (layout: DashboardLayoutItem[]) => {
      await api.put('/dashboard/layout', { layout: JSON.stringify(layout) })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-layout'] })
      setHasChanges(false)
    },
  })

  // Reset layout mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/dashboard/layout/reset')
      return response.data
    },
    onSuccess: (data) => {
      const newLayout = JSON.parse(data.layout) as DashboardLayoutItem[]
      setLocalLayout(newLayout)
      queryClient.invalidateQueries({ queryKey: ['dashboard-layout'] })
      setHasChanges(false)
    },
  })

  // Handle layout change from react-grid-layout
  const handleLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      if (!isEditing) return

      // Merge with existing widget configs (type and config)
      const updatedLayout = newLayout.map((item) => {
        const existing = localLayout.find((l) => l.i === item.i)
        return {
          ...item,
          type: existing?.type || 'stats',
          config: existing?.config || '{}',
        }
      })

      setLocalLayout(updatedLayout)
      setHasChanges(true)
    },
    [isEditing, localLayout]
  )

  // Add widget
  const handleAddWidget = useCallback(
    (widget: AvailableWidget) => {
      const newId = `widget-${Date.now()}`
      const newWidget: DashboardLayoutItem = {
        i: newId,
        x: 0,
        y: Infinity, // Put at bottom
        w: widget.defaultSize.w,
        h: widget.defaultSize.h,
        minW: widget.minSize.w,
        minH: widget.minSize.h,
        type: widget.type,
        config: '{}',
      }

      // If widget has config options, open config modal
      if (widget.configOptions && widget.configOptions.length > 0) {
        setLocalLayout([...localLayout, newWidget])
        setShowWidgetPicker(false)
        setConfigWidget({ id: newId, widget, config: '{}' })
      } else {
        setLocalLayout([...localLayout, newWidget])
        setShowWidgetPicker(false)
      }
      setHasChanges(true)
    },
    [localLayout]
  )

  // Update widget config
  const handleConfigSave = useCallback(
    (config: string) => {
      if (!configWidget) return
      setLocalLayout(
        localLayout.map((item) =>
          item.i === configWidget.id ? { ...item, config } : item
        )
      )
      setConfigWidget(null)
      setHasChanges(true)
    },
    [configWidget, localLayout]
  )

  // Remove widget
  const handleRemoveWidget = useCallback(
    (id: string) => {
      setLocalLayout(localLayout.filter((item) => item.i !== id))
      setHasChanges(true)
    },
    [localLayout]
  )

  // Save changes
  const handleSave = useCallback(() => {
    saveMutation.mutate(localLayout)
    setIsEditing(false)
  }, [localLayout, saveMutation])

  // Cancel editing
  const handleCancel = useCallback(() => {
    setLocalLayout(savedLayout)
    setIsEditing(false)
    setHasChanges(false)
  }, [savedLayout])

  // Reset to default
  const handleReset = useCallback(() => {
    if (confirm('Reset dashboard to default layout? This cannot be undone.')) {
      resetMutation.mutate()
    }
  }, [resetMutation])

  if (isLoading) {
    return <PageLoading />
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)]">Overview of your IRC network</p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setShowWidgetPicker(true)}
                className="btn btn-secondary flex items-center gap-2"
              >
                <Plus size={16} />
                Add Widget
              </button>
              <button
                onClick={handleReset}
                className="btn btn-secondary flex items-center gap-2"
                title="Reset to default"
              >
                <RotateCcw size={16} />
              </button>
              <button onClick={handleCancel} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || saveMutation.isPending}
                className="btn btn-primary flex items-center gap-2"
              >
                <Save size={16} />
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Pencil size={16} />
              Customize
            </button>
          )}
        </div>
      </div>

      {/* Editing hint */}
      {isEditing && (
        <div className="p-3 bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg text-sm text-[var(--text-secondary)]">
          <strong>Edit Mode:</strong> Drag widgets to reposition, drag edges to resize. Click the X
          to remove a widget.
        </div>
      )}

      {/* Grid layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: localLayout, md: localLayout, sm: localLayout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={60}
        isDraggable={isEditing}
        isResizable={isEditing}
        onLayoutChange={(layout) => handleLayoutChange(layout)}
        draggableHandle=".drag-handle"
        margin={[12, 12]}
      >
        {localLayout.map((item) => (
          <div key={item.i} className="relative group">
            {isEditing && (
              <>
                {/* Drag handle */}
                <div className="drag-handle absolute top-1 left-1 z-10 p-1 bg-[var(--bg-tertiary)] rounded cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical size={14} className="text-[var(--text-muted)]" />
                </div>
                {/* Remove button */}
                <button
                  onClick={() => handleRemoveWidget(item.i)}
                  className="absolute top-1 right-1 z-10 p-1 bg-[var(--error)] rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--error)]/80"
                >
                  <X size={14} className="text-white" />
                </button>
              </>
            )}
            <DashboardWidget
              type={item.type || 'stats'}
              config={item.config}
              isEditing={isEditing}
            />
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Widget picker modal */}
      {showWidgetPicker && (
        <WidgetPicker
          onSelect={handleAddWidget}
          onClose={() => setShowWidgetPicker(false)}
        />
      )}

      {/* Widget config modal */}
      {configWidget && (
        <WidgetConfigModal
          widget={configWidget.widget}
          currentConfig={configWidget.config}
          onSave={handleConfigSave}
          onClose={() => setConfigWidget(null)}
        />
      )}

      {/* Plugin-contributed dashboard cards */}
      {pluginCards.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Puzzle size={18} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Plugin Cards</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pluginCards
              .sort((a, b) => a.order - b.order)
              .map((card, index) => (
                <PluginCard key={`plugin-card-${index}`} card={card} />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Plugin card component
function PluginCard({ card }: { card: PluginDashboardCard }) {
  const sizeClasses = {
    sm: 'col-span-1',
    md: 'col-span-1 md:col-span-2',
    lg: 'col-span-1 md:col-span-2 lg:col-span-3',
    xl: 'col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4',
  }

  return (
    <div
      className={`card p-4 ${sizeClasses[card.size as keyof typeof sizeClasses] || 'col-span-1'}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Puzzle size={16} className="text-[var(--accent)]" />
        <h3 className="font-medium text-[var(--text-primary)]">{card.title}</h3>
      </div>
      <div className="text-[var(--text-secondary)]">
        {typeof card.content === 'string' ? (
          <p>{card.content}</p>
        ) : typeof card.content === 'object' ? (
          <pre className="text-xs overflow-auto max-h-32 bg-[var(--bg-tertiary)] p-2 rounded">
            {JSON.stringify(card.content, null, 2)}
          </pre>
        ) : (
          <p className="text-[var(--text-muted)]">No content</p>
        )}
      </div>
      {card.plugin && (
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Provided by: {card.plugin}
        </p>
      )}
    </div>
  )
}
