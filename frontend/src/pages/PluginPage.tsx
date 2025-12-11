import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Puzzle, ArrowLeft, Settings, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import marketplaceService, { PluginNavItem } from '@/services/marketplaceService'

interface InstalledPlugin {
  id: string
  name: string
  version: string
  author: string
  description: string
  homepage?: string
  enabled: boolean
}

export default function PluginPage() {
  const { '*': pluginPath } = useParams()

  // Fetch plugin nav items to find the current plugin
  const { data: navItems = [] } = useQuery<PluginNavItem[]>({
    queryKey: ['pluginNavItems'],
    queryFn: () => marketplaceService.getPluginNavItems(),
    staleTime: 60000,
  })

  // Fetch installed plugins to get plugin details
  const { data: installedPlugins = [] } = useQuery<InstalledPlugin[]>({
    queryKey: ['installedPlugins'],
    queryFn: () => marketplaceService.getInstalledPlugins(),
    staleTime: 60000,
  })

  // Find the nav item that matches the current path
  const currentPath = `/plugins/${pluginPath}`
  const currentNavItem = navItems.find(item => item.path === currentPath)
  
  // Find the plugin that owns this nav item
  const pluginId = currentNavItem?.plugin
  const plugin = installedPlugins.find(p => p.id === pluginId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--accent)]/10">
              <Puzzle size={24} className="text-[var(--accent)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                {currentNavItem?.label || 'Plugin Page'}
              </h1>
              {plugin && (
                <p className="text-sm text-[var(--text-muted)]">
                  Provided by {plugin.name} v{plugin.version}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {plugin && (
          <div className="flex items-center gap-2">
            {plugin.homepage && (
              <a
                href={plugin.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost flex items-center gap-2"
              >
                <ExternalLink size={16} />
                Homepage
              </a>
            )}
            <Link
              to="/marketplace"
              className="btn btn-ghost flex items-center gap-2"
            >
              <Settings size={16} />
              Manage Plugins
            </Link>
          </div>
        )}
      </div>

      {/* Content Card */}
      <div className="card p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-[var(--accent)]/10 mb-4">
            <Puzzle size={48} className="text-[var(--accent)]" />
          </div>
          
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            {currentNavItem?.label || 'Plugin Page'}
          </h2>
          
          {plugin ? (
            <>
              <p className="text-[var(--text-secondary)] max-w-md mb-4">
                {plugin.description}
              </p>
              
              <div className="bg-[var(--bg-secondary)] rounded-lg p-4 text-left w-full max-w-md">
                <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">Plugin Information</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-[var(--text-muted)]">Name:</dt>
                    <dd className="text-[var(--text-primary)]">{plugin.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--text-muted)]">Version:</dt>
                    <dd className="text-[var(--text-primary)]">{plugin.version}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--text-muted)]">Author:</dt>
                    <dd className="text-[var(--text-primary)]">{plugin.author}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--text-muted)]">Status:</dt>
                    <dd>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        plugin.enabled 
                          ? 'bg-green-500/10 text-green-500' 
                          : 'bg-red-500/10 text-red-500'
                      }`}>
                        {plugin.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--text-muted)]">Route:</dt>
                    <dd className="text-[var(--text-primary)] font-mono text-xs">{currentPath}</dd>
                  </div>
                </dl>
              </div>
              
              <p className="text-[var(--text-muted)] text-sm mt-6">
                This page is a placeholder for the plugin's custom UI.<br/>
                Plugin developers can extend this with custom components.
              </p>
            </>
          ) : (
            <>
              <p className="text-[var(--text-secondary)] max-w-md mb-4">
                This plugin page is provided by an installed plugin.
              </p>
              <p className="text-[var(--text-muted)] text-sm">
                Current path: <code className="bg-[var(--bg-tertiary)] px-2 py-1 rounded">{currentPath}</code>
              </p>
            </>
          )}
        </div>
      </div>

      {/* Plugin-specific content area - plugins can inject content here via their JS */}
      <div id="plugin-content" className="plugin-content-area" data-plugin={pluginId} data-path={pluginPath}>
        {/* Plugin JavaScript can populate this area */}
      </div>
    </div>
  )
}
