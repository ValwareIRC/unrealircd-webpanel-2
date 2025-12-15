import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Search, 
  Home, 
  Users, 
  MessageSquare, 
  Server, 
  Shield, 
  Settings, 
  Globe,
  BarChart3,
  FileText,
  Ban,
  ShieldX,
  Filter,
  Bell,
  Mail,
  Webhook,
  UserCog,
  LogOut,
  Moon,
  Sun,
  Smartphone,
  Command,
  ArrowRight
} from 'lucide-react'
import { useAuth } from '@/hooks'
import { useTheme } from '@/contexts/ThemeContext'
import { useTranslation } from 'react-i18next'

interface CommandItem {
  id: string
  title: string
  description?: string
  icon: React.ReactNode
  action: () => void
  category: 'navigation' | 'action' | 'settings'
  keywords?: string[]
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { setTheme, availableThemes } = useTheme()

  const { t } = useTranslation()

  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      // Navigation
      {
        id: 'nav-dashboard',
        title: t('commands.nav.dashboard.title'),
        description: t('commands.nav.dashboard.description'),
        icon: <Home size={18} />,
        action: () => navigate('/'),
        category: 'navigation',
        keywords: ['home', 'overview', 'main']
      },
      {
        id: 'nav-users',
        title: t('commands.nav.users.title'),
        description: t('commands.nav.users.description'),
        icon: <Users size={18} />,
        action: () => navigate('/users'),
        category: 'navigation',
        keywords: ['clients', 'connected', 'online']
      },
      {
        id: 'nav-channels',
        title: 'Go to Channels',
        description: 'View active channels',
        icon: <MessageSquare size={18} />,
        action: () => navigate('/channels'),
        category: 'navigation',
        keywords: ['rooms', 'chat']
      },
      {
        id: 'nav-servers',
        title: 'Go to Servers',
        description: 'View linked servers',
        icon: <Server size={18} />,
        action: () => navigate('/servers'),
        category: 'navigation',
        keywords: ['network', 'links']
      },
      {
        id: 'nav-live-map',
        title: 'Go to Live Map',
        description: 'View geographic distribution',
        icon: <Globe size={18} />,
        action: () => navigate('/live-map'),
        category: 'navigation',
        keywords: ['globe', 'geo', 'world', 'map', 'location']
      },
      {
        id: 'nav-statistics',
        title: t('commands.nav.statistics.title'),
        description: t('commands.nav.statistics.description'),
        icon: <BarChart3 size={18} />,
        action: () => navigate('/statistics'),
        category: 'navigation',
        keywords: ['charts', 'graphs', 'analytics']
      },
      {
        id: 'nav-logs',
        title: 'Go to Logs',
        description: 'View system logs',
        icon: <FileText size={18} />,
        action: () => navigate('/logs'),
        category: 'navigation',
        keywords: ['audit', 'history', 'events']
      },
      {
        id: 'nav-server-bans',
        title: t('commands.nav.serverBans.title'),
        description: t('commands.nav.serverBans.description'),
        icon: <Ban size={18} />,
        action: () => navigate('/bans/server'),
        category: 'navigation',
        keywords: ['kline', 'gline', 'zline', 'ban']
      },
      {
        id: 'nav-name-bans',
        title: t('commands.nav.nameBans.title'),
        description: t('commands.nav.nameBans.description'),
        icon: <ShieldX size={18} />,
        action: () => navigate('/bans/name'),
        category: 'navigation',
        keywords: ['qline', 'nick', 'reserved']
      },
      {
        id: 'nav-ban-exceptions',
        title: 'Go to Ban Exceptions',
        description: 'Manage E-Lines',
        icon: <Shield size={18} />,
        action: () => navigate('/bans/exceptions'),
        category: 'navigation',
        keywords: ['eline', 'exempt', 'whitelist']
      },
      {
        id: 'nav-spamfilters',
        title: t('commands.nav.spamfilters.title'),
        description: t('commands.nav.spamfilters.description'),
        icon: <Filter size={18} />,
        action: () => navigate('/spamfilters'),
        category: 'navigation',
        keywords: ['spam', 'filter', 'regex']
      },
      {
        id: 'nav-watchlist',
        title: 'Go to Watch List',
        description: 'Monitor flagged users',
        icon: <Users size={18} />,
        action: () => navigate('/watchlist'),
        category: 'navigation',
        keywords: ['watch', 'monitor', 'flag', 'track']
      },
      // Settings Navigation
      {
        id: 'nav-settings',
        title: 'Go to Settings',
        description: 'Panel settings',
        icon: <Settings size={18} />,
        action: () => navigate('/settings'),
        category: 'navigation',
        keywords: ['config', 'preferences']
      },
      {
        id: 'nav-2fa',
        title: 'Go to Two-Factor Auth',
        description: 'Manage 2FA settings',
        icon: <Smartphone size={18} />,
        action: () => navigate('/settings/two-factor'),
        category: 'navigation',
        keywords: ['2fa', 'totp', 'authenticator', 'security']
      },
      {
        id: 'nav-panel-users',
        title: 'Go to Panel Users',
        description: 'Manage panel user accounts',
        icon: <UserCog size={18} />,
        action: () => navigate('/settings/users'),
        category: 'navigation',
        keywords: ['admin', 'accounts']
      },
      {
        id: 'nav-webhooks',
        title: 'Go to Webhooks',
        description: 'Manage webhook endpoints',
        icon: <Webhook size={18} />,
        action: () => navigate('/settings/webhooks'),
        category: 'navigation',
        keywords: ['hooks', 'integration']
      },
      {
        id: 'nav-smtp',
        title: 'Go to SMTP Settings',
        description: 'Configure email server',
        icon: <Mail size={18} />,
        action: () => navigate('/settings/smtp'),
        category: 'navigation',
        keywords: ['email', 'mail']
      },
      {
        id: 'nav-notifications',
        title: 'Go to Notifications',
        description: 'Configure notification preferences',
        icon: <Bell size={18} />,
        action: () => navigate('/settings/notifications'),
        category: 'navigation',
        keywords: ['alerts', 'email']
      },
    ]

    // Theme commands
    availableThemes.forEach((themeItem) => {
      items.push({
        id: `theme-${themeItem.id}`,
        title: t('commands.theme.switch', { name: themeItem.name }),
        description: t('commands.theme.apply', { name: themeItem.name }),
        icon: themeItem.colors.bgPrimary.includes('0a0') || themeItem.colors.bgPrimary.includes('000') ? <Moon size={18} /> : <Sun size={18} />,
        action: () => setTheme(themeItem.id),
        category: 'settings',
        keywords: ['theme', 'color', 'dark', 'light', themeItem.name.toLowerCase()]
      })
    })

    // Actions
    items.push({
      id: 'action-logout',
      title: t('commands.action.signOut.title'),
      description: t('commands.action.signOut.description'),
      icon: <LogOut size={18} />,
      action: () => logout(),
      category: 'action',
      keywords: ['logout', 'exit', 'signout']
    })

    return items
  }, [navigate, logout, setTheme, availableThemes])

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands

    const lowerQuery = query.toLowerCase()
    return commands.filter(cmd => {
      const matchTitle = cmd.title.toLowerCase().includes(lowerQuery)
      const matchDesc = cmd.description?.toLowerCase().includes(lowerQuery)
      const matchKeywords = cmd.keywords?.some(k => k.includes(lowerQuery))
      return matchTitle || matchDesc || matchKeywords
    })
  }, [commands, query])

  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      navigation: [],
      settings: [],
      action: []
    }
    filteredCommands.forEach(cmd => {
      groups[cmd.category].push(cmd)
    })
    return groups
  }, [filteredCommands])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredCommands])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const selected = list.querySelector('[data-selected="true"]')
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  const executeCommand = useCallback((cmd: CommandItem) => {
    onClose()
    cmd.action()
  }, [onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }, [filteredCommands, selectedIndex, executeCommand, onClose])

  if (!isOpen) return null

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    settings: 'Settings',
    action: 'Actions'
  }

  let currentIndex = 0

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Palette */}
      <div 
        className="relative w-full max-w-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-primary)]">
          <Search className="text-[var(--text-muted)]" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none text-lg"
          />
          <kbd className="px-2 py-1 text-xs bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded border border-[var(--border-primary)]">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-[var(--text-muted)]">
              No commands found
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, items]) => {
              if (items.length === 0) return null
              
              return (
                <div key={category} className="mb-2">
                  <div className="px-3 py-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    {categoryLabels[category]}
                  </div>
                  {items.map(cmd => {
                    const index = currentIndex++
                    const isSelected = index === selectedIndex
                    
                    return (
                      <button
                        key={cmd.id}
                        data-selected={isSelected}
                        onClick={() => executeCommand(cmd)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isSelected 
                            ? 'bg-[var(--accent)] text-white' 
                            : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                        }`}
                      >
                        <span className={isSelected ? 'text-white' : 'text-[var(--text-muted)]'}>
                          {cmd.icon}
                        </span>
                        <div className="flex-1 text-left">
                          <div className="font-medium">{cmd.title}</div>
                          {cmd.description && (
                            <div className={`text-sm ${isSelected ? 'text-white/70' : 'text-[var(--text-muted)]'}`}>
                              {cmd.description}
                            </div>
                          )}
                        </div>
                        {isSelected && <ArrowRight size={16} />}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border-primary)] text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded">↵</kbd>
              to select
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Command size={12} />
            <span>K to open</span>
          </div>
        </div>
      </div>
    </div>
  )
}
