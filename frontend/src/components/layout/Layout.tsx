import { useState, createContext, useContext } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { SeasonalAnimations, CommandPalette, PluginLoader } from '@/components/common'
import { useCommandPalette } from '@/hooks'

interface LayoutContextType {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  openCommandPalette: () => void
}

const LayoutContext = createContext<LayoutContextType | null>(null)

export function useLayoutContext() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayoutContext must be used within Layout')
  }
  return context
}

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { isOpen: commandPaletteOpen, open: openCommandPalette, close: closeCommandPalette } = useCommandPalette()

  return (
    <LayoutContext.Provider value={{ sidebarCollapsed, setSidebarCollapsed, openCommandPalette }}>
      <div className="min-h-screen bg-[var(--bg-primary)] relative" style={{ zIndex: 1 }}>
        <SeasonalAnimations />
        <PluginLoader />
        <CommandPalette isOpen={commandPaletteOpen} onClose={closeCommandPalette} />
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <Header sidebarCollapsed={sidebarCollapsed} />
        <main
          className={`pt-16 min-h-screen transition-all duration-300 relative ${
            sidebarCollapsed ? 'pl-16' : 'pl-64'
          }`}
          style={{ zIndex: 1 }}
        >
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </LayoutContext.Provider>
  )
}
