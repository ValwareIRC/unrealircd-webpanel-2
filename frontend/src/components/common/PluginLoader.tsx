import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

interface PluginFrontendAsset {
  plugin_id: string
  type: 'script' | 'style'
  url: string
}

interface FrontendAssetsResponse {
  scripts: PluginFrontendAsset[]
  styles: PluginFrontendAsset[]
}

// Extend Window interface for plugin cleanup functions
declare global {
  interface Window {
    UWPPlugins?: {
      register: (id: string, plugin: { cleanup?: () => void }) => void
      _plugins: Map<string, { cleanup?: () => void }>
    }
  }
}

// Initialize the UWP plugin registry IMMEDIATELY (not in useEffect)
// This ensures it exists before any plugin scripts try to register
if (!window.UWPPlugins) {
  window.UWPPlugins = {
    _plugins: new Map(),
    register: (id: string, plugin: { cleanup?: () => void }) => {
      window.UWPPlugins!._plugins.set(id, plugin)
      console.log(`[PluginLoader] Plugin "${id}" registered with cleanup support`)
    }
  }
}

// Call cleanup for a plugin
function cleanupPlugin(pluginId: string) {
  console.log(`[PluginLoader] cleanupPlugin called for: ${pluginId}`)
  console.log(`[PluginLoader] UWPPlugins registry has:`, [...(window.UWPPlugins?._plugins.keys() || [])])
  // Try the UWPPlugins registry first
  if (window.UWPPlugins?._plugins.has(pluginId)) {
    const plugin = window.UWPPlugins._plugins.get(pluginId)
    if (plugin?.cleanup) {
      try {
        plugin.cleanup()
        console.log(`[PluginLoader] Called cleanup for plugin "${pluginId}"`)
      } catch (e) {
        console.error(`[PluginLoader] Error cleaning up plugin "${pluginId}":`, e)
      }
    }
    window.UWPPlugins._plugins.delete(pluginId)
    return
  }
  
  // Try common window object patterns
  // Convert plugin-id to PascalCase for window object lookup
  const pascalCase = pluginId
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any
  
  // Try various naming patterns plugins might use
  const patterns = [
    pascalCase,                    // EmojiTrail
    `__${pascalCase}`,             // __ExamplePlugin
    pascalCase.replace('Plugin', ''), // Example (without Plugin suffix)
  ]
  
  for (const pattern of patterns) {
    const obj = win[pattern]
    console.log(`[PluginLoader] Checking window.${pattern}:`, obj ? 'found' : 'not found')
    if (obj) {
      // Try cleanup() first, then destroy()
      const cleanupFn = obj.cleanup || obj.destroy
      console.log(`[PluginLoader] cleanup/destroy function:`, cleanupFn ? 'found' : 'not found')
      if (typeof cleanupFn === 'function') {
        try {
          cleanupFn.call(obj)
          console.log(`[PluginLoader] Called cleanup via window.${pattern}`)
          // Clean up the global reference
          delete win[pattern]
          return
        } catch (e) {
          console.error(`[PluginLoader] Error calling cleanup on window.${pattern}:`, e)
        }
      }
    }
  }
  
  console.log(`[PluginLoader] No cleanup function found for plugin "${pluginId}"`)
}

/**
 * PluginLoader component
 * 
 * Dynamically loads frontend scripts and styles from installed plugins.
 * This allows plugins to inject their own JavaScript and CSS into the page
 * without requiring any hardcoded references in the main application.
 * 
 * Scripts are loaded with defer and executed in order.
 * Styles are loaded as link elements.
 * 
 * Both are cleaned up when the component unmounts or when plugins change.
 * Plugin scripts can register cleanup functions via window.UWPPlugins.register()
 * or by exposing a cleanup() method on their window object.
 */
export function PluginLoader() {
  const loadedScripts = useRef<Set<string>>(new Set())
  const loadedStyles = useRef<Set<string>>(new Set())
  const scriptElements = useRef<HTMLScriptElement[]>([])
  const styleElements = useRef<HTMLLinkElement[]>([])
  const loadedPluginIds = useRef<Set<string>>(new Set())

  // Fetch frontend assets from enabled plugins
  // This endpoint is public (no auth) so it works before login too
  const { data: assets } = useQuery<FrontendAssetsResponse>({
    queryKey: ['pluginFrontendAssets'],
    queryFn: async () => {
      const response = await api.get('/plugins/frontend-assets')
      return response.data
    },
    staleTime: 60000, // 1 minute
    retry: 1,
    // Don't fail the whole app if this fails
    throwOnError: false,
  })

  // Load/unload scripts when assets change
  useEffect(() => {
    if (!assets) return

    const currentScriptUrls = new Set(assets.scripts.map(s => s.url))
    const currentStyleUrls = new Set(assets.styles.map(s => s.url))
    const currentPluginIds = new Set(assets.scripts.map(s => s.plugin_id))

    console.log('[PluginLoader] Assets changed. Current plugins:', [...currentPluginIds])
    console.log('[PluginLoader] Previously loaded plugins:', [...loadedPluginIds.current])

    // Find plugins that have been removed
    const removedPluginIds = [...loadedPluginIds.current].filter(id => !currentPluginIds.has(id))
    
    console.log('[PluginLoader] Plugins to remove:', removedPluginIds)
    
    // Call cleanup for removed plugins
    for (const pluginId of removedPluginIds) {
      console.log(`[PluginLoader] Cleaning up plugin: ${pluginId}`)
      cleanupPlugin(pluginId)
      loadedPluginIds.current.delete(pluginId)
    }

    // Remove scripts that are no longer needed
    scriptElements.current = scriptElements.current.filter(el => {
      const src = el.getAttribute('src') || ''
      if (!currentScriptUrls.has(src)) {
        el.remove()
        loadedScripts.current.delete(src)
        console.log(`[PluginLoader] Unloaded script: ${src}`)
        return false
      }
      return true
    })

    // Remove styles that are no longer needed
    styleElements.current = styleElements.current.filter(el => {
      const href = el.getAttribute('href') || ''
      if (!currentStyleUrls.has(href)) {
        el.remove()
        loadedStyles.current.delete(href)
        console.log(`[PluginLoader] Unloaded style: ${href}`)
        return false
      }
      return true
    })

    // Load new scripts
    for (const script of assets.scripts) {
      if (!loadedScripts.current.has(script.url)) {
        const el = document.createElement('script')
        el.src = script.url
        el.defer = true
        el.dataset.pluginId = script.plugin_id
        el.onload = () => {
          console.log(`[PluginLoader] Loaded script from plugin "${script.plugin_id}": ${script.url}`)
        }
        el.onerror = () => {
          console.error(`[PluginLoader] Failed to load script from plugin "${script.plugin_id}": ${script.url}`)
        }
        document.body.appendChild(el)
        scriptElements.current.push(el)
        loadedScripts.current.add(script.url)
        loadedPluginIds.current.add(script.plugin_id)
      }
    }

    // Load new styles
    for (const style of assets.styles) {
      if (!loadedStyles.current.has(style.url)) {
        const el = document.createElement('link')
        el.rel = 'stylesheet'
        el.href = style.url
        el.dataset.pluginId = style.plugin_id
        el.onload = () => {
          console.log(`[PluginLoader] Loaded style from plugin "${style.plugin_id}": ${style.url}`)
        }
        el.onerror = () => {
          console.error(`[PluginLoader] Failed to load style from plugin "${style.plugin_id}": ${style.url}`)
        }
        document.head.appendChild(el)
        styleElements.current.push(el)
        loadedStyles.current.add(style.url)
      }
    }
  }, [assets])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Call cleanup for all loaded plugins
      loadedPluginIds.current.forEach(pluginId => {
        cleanupPlugin(pluginId)
      })
      loadedPluginIds.current.clear()
      
      // Remove all plugin scripts
      scriptElements.current.forEach(el => el.remove())
      scriptElements.current = []
      loadedScripts.current.clear()

      // Remove all plugin styles
      styleElements.current.forEach(el => el.remove())
      styleElements.current = []
      loadedStyles.current.clear()
    }
  }, [])

  // This component doesn't render anything visible
  return null
}
