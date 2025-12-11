import { useNetworkStats } from '@/hooks'
import { ThemeSwitcher, LanguageSwitcher, HeaderSeasonalAnimations } from '@/components/common'
import { Bell, Search, Wifi, WifiOff, RefreshCw, Command } from 'lucide-react'
import { useLayoutContext } from './Layout'

interface HeaderProps {
  sidebarCollapsed: boolean
}

export function Header({ sidebarCollapsed }: HeaderProps) {
  const { data: stats, isLoading, refetch, isRefetching } = useNetworkStats()
  const { openCommandPalette } = useLayoutContext()

  const isConnected = stats && !isLoading

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] transition-all duration-300 overflow-hidden ${
        sidebarCollapsed ? 'left-16' : 'left-64'
      }`}
    >
      <HeaderSeasonalAnimations />
      <div className="flex items-center justify-between h-full px-6 relative z-10">
        {/* Search / Command Palette Trigger */}
        <div className="flex-1 max-w-lg">
          <button
            onClick={openCommandPalette}
            className="w-full flex items-center gap-3 px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-muted)] hover:border-[var(--border-secondary)] hover:text-[var(--text-secondary)] transition-all text-left"
          >
            <Search size={18} />
            <span className="flex-1">Search or jump to...</span>
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-0.5 text-xs bg-[var(--bg-secondary)] rounded border border-[var(--border-primary)]">
              <Command size={12} />
              <span>K</span>
            </kbd>
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Connection status */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
              title="Refresh stats"
            >
              <RefreshCw size={18} className={isRefetching ? 'animate-spin' : ''} />
            </button>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                isConnected
                  ? 'bg-[var(--success)]/20 text-[var(--success)]'
                  : 'bg-[var(--error)]/20 text-[var(--error)]'
              }`}
            >
              {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>

          {/* Network stats quick view */}
          {stats && (
            <div className="hidden md:flex items-center gap-4 text-sm">
              <div className="text-[var(--text-muted)]">
                <span className="text-[var(--text-primary)] font-medium">{stats.users}</span> users
              </div>
              <div className="text-[var(--text-muted)]">
                <span className="text-[var(--text-primary)] font-medium">{stats.channels}</span> channels
              </div>
              <div className="text-[var(--text-muted)]">
                <span className="text-[var(--text-primary)] font-medium">{stats.servers}</span> servers
              </div>
            </div>
          )}

          {/* Theme Switcher */}
          <ThemeSwitcher />

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--accent)] rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  )
}
