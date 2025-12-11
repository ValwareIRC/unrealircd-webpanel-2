import { useState, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks'
import { useShouldShowMoon } from '@/components/common'
import { useTheme } from '@/contexts/ThemeContext'
import { useTranslation } from 'react-i18next'
import marketplaceService, { PluginNavItem } from '@/services/marketplaceService'
import {
  LayoutDashboard,
  Users,
  Hash,
  Server,
  ServerOff,
  Shield,
  ShieldX,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  Filter,
  BarChart3,
  Moon,
  ScrollText,
  Globe,
  Eye,
  Clock,
  Bell,
  FileBox,
  Activity,
  History,
  ClipboardList,
  Network,
  Lock,
  MessageSquare,
  PieChart,
  Mail,
  Puzzle,
  Ban,
  Gauge,
  Cog,
  LucideIcon,
} from 'lucide-react'
import { UnrealIcon } from '@/components/icons'

// Map string icon names to Lucide icons
const iconMap: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  'users': Users,
  'hash': Hash,
  'server': Server,
  'server-off': ServerOff,
  'shield': Shield,
  'shield-x': ShieldX,
  'settings': Settings,
  'file-text': FileText,
  'filter': Filter,
  'bar-chart': BarChart3,
  'scroll-text': ScrollText,
  'globe': Globe,
  'eye': Eye,
  'clock': Clock,
  'bell': Bell,
  'file-box': FileBox,
  'activity': Activity,
  'history': History,
  'clipboard-list': ClipboardList,
  'network': Network,
  'lock': Lock,
  'message-square': MessageSquare,
  'pie-chart': PieChart,
  'mail': Mail,
  'puzzle': Puzzle,
  'ban': Ban,
  'gauge': Gauge,
  'cog': Cog,
}

function getIconComponent(iconName: string): LucideIcon {
  return iconMap[iconName.toLowerCase()] || Puzzle
}

// Glowing backlight component for the logo
function GlowingBacklight() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Outer glow layer - slower pulse */}
      <div 
        className="absolute w-12 h-12 rounded-full opacity-40 animate-pulse-slow"
        style={{
          background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
          filter: 'blur(8px)',
        }}
      />
      {/* Middle glow layer - medium pulse */}
      <div 
        className="absolute w-10 h-10 rounded-full opacity-50 animate-pulse-medium"
        style={{
          background: 'radial-gradient(circle, var(--accent) 0%, transparent 60%)',
          filter: 'blur(6px)',
        }}
      />
      {/* Inner glow layer - faster pulse, rotating */}
      <div 
        className="absolute w-8 h-8 rounded-full opacity-60 animate-glow-rotate"
        style={{
          background: 'conic-gradient(from 0deg, var(--accent), transparent, var(--accent))',
          filter: 'blur(4px)',
        }}
      />
    </div>
  )
}

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  permission?: string
}

interface NavCategory {
  name: string
  icon: React.ElementType
  items: NavItem[]
  defaultOpen?: boolean
}

// Organized navigation with categories
const getNavCategories = (t: (key: string) => string): NavCategory[] => [
  {
    name: t('navigation.overview'),
    icon: Gauge,
    defaultOpen: true,
    items: [
      { name: t('navigation.dashboard'), href: '/', icon: LayoutDashboard },
      { name: t('navigation.statistics'), href: '/statistics', icon: BarChart3 },
      { name: t('navigation.liveMap'), href: '/live-map', icon: Globe },
    ],
  },
  {
    name: t('navigation.irc'),
    icon: Hash,
    defaultOpen: true,
    items: [
      { name: t('navigation.users'), href: '/users', icon: Users, permission: 'view_users' },
      { name: t('navigation.userJourney'), href: '/journey', icon: History, permission: 'view_users' },
      { name: t('navigation.channels'), href: '/channels', icon: Hash, permission: 'view_channels' },
      { name: t('navigation.templates'), href: '/channel-templates', icon: FileBox, permission: 'view_channels' },
      { name: t('navigation.watchList'), href: '/watchlist', icon: Eye, permission: 'view_users' },
    ],
  },
  {
    name: t('navigation.servers'),
    icon: Server,
    items: [
      { name: t('navigation.serverList'), href: '/servers', icon: Server, permission: 'view_servers' },
      { name: t('navigation.topology'), href: '/topology', icon: Network, permission: 'view_servers' },
      { name: t('navigation.tlsStatistics'), href: '/tls', icon: Lock, permission: 'view_users' },
    ],
  },
  {
    name: t('navigation.bansFilters'),
    icon: Ban,
    items: [
      { name: t('navigation.serverBans'), href: '/bans/server', icon: ServerOff, permission: 'view_bans' },
      { name: t('navigation.nameBans'), href: '/bans/name', icon: ShieldX, permission: 'view_bans' },
      { name: t('navigation.exceptions'), href: '/bans/exceptions', icon: FileText, permission: 'view_bans' },
      { name: t('navigation.spamfilters'), href: '/spamfilters', icon: Filter, permission: 'view_spamfilters' },
    ],
  },
  {
    name: t('navigation.tools'),
    icon: Cog,
    items: [
      { name: t('navigation.scheduled'), href: '/scheduled-commands', icon: Clock, permission: 'ban_users' },
      { name: t('navigation.alertRules'), href: '/alert-rules', icon: Bell, permission: 'manage_webhooks' },
      { name: t('navigation.reports'), href: '/reports', icon: PieChart, permission: 'view_users' },
      { name: t('navigation.digest'), href: '/digest', icon: Mail },
      { name: t('navigation.logs'), href: '/logs', icon: ScrollText, permission: 'view_logs' },
    ],
  },
  {
    name: t('navigation.community'),
    icon: MessageSquare,
    items: [
      { name: t('navigation.feedback'), href: '/feedback', icon: MessageSquare },
    ],
  },
]

const getAdminNavigation = (t: (key: string) => string): NavCategory => ({
  name: t('navigation.admin'),
  icon: Shield,
  items: [
    { name: t('navigation.panelUsers'), href: '/settings/users', icon: Users, permission: 'manage_users' },
    { name: t('navigation.roles'), href: '/settings/roles', icon: Shield, permission: 'manage_users' },
    { name: t('navigation.compliance'), href: '/compliance', icon: ClipboardList, permission: 'manage_users' },
    { name: t('navigation.rpcServers'), href: '/settings/rpc', icon: Server, permission: 'manage_settings' },
    { name: t('navigation.plugins'), href: '/marketplace', icon: Puzzle, permission: 'manage_settings' },
    { name: t('navigation.settings'), href: '/settings', icon: Settings, permission: 'manage_settings' },
  ],
})

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

// Accordion category component
function NavCategoryAccordion({ 
  category, 
  collapsed, 
  isOpen, 
  onToggle,
  hasPermission 
}: { 
  category: NavCategory
  collapsed: boolean
  isOpen: boolean
  onToggle: () => void
  hasPermission: (permission: string) => boolean
}) {
  const filteredItems = category.items.filter(
    (item) => !item.permission || hasPermission(item.permission)
  )

  if (filteredItems.length === 0) return null

  if (collapsed) {
    // In collapsed mode, show only icons without accordion
    return (
      <div className="space-y-1">
        {filteredItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center justify-center p-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
              }`
            }
            title={item.name}
          >
            <item.icon size={20} />
          </NavLink>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--text-primary)] transition-colors rounded-lg hover:bg-[var(--bg-hover)]"
      >
        <div className="flex items-center gap-2">
          <category.icon size={14} />
          <span>{category.name}</span>
        </div>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      
      {isOpen && (
        <div className="space-y-0.5 ml-2">
          {filteredItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                  isActive
                    ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                }`
              }
            >
              <item.icon size={16} />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout, hasPermission } = useAuth()
  const showMoon = useShouldShowMoon()
  const { theme } = useTheme()
  const { t } = useTranslation()

  const navCategories = useMemo(() => getNavCategories(t), [t])
  const adminNavigation = useMemo(() => getAdminNavigation(t), [t])

  // Fetch plugin nav items
  const { data: pluginNavItems = [] } = useQuery({
    queryKey: ['pluginNavItems'],
    queryFn: () => marketplaceService.getPluginNavItems(),
    staleTime: 60000, // 1 minute
    retry: 1,
  })

  // Convert plugin nav items to our NavItem format
  const pluginNavCategory: NavCategory | null = useMemo(() => {
    if (pluginNavItems.length === 0) return null

    const items: NavItem[] = pluginNavItems.map((item: PluginNavItem) => ({
      name: item.label,
      href: item.path,
      icon: getIconComponent(item.icon),
    }))

    return {
      name: 'Plugins',
      icon: Puzzle,
      items,
    }
  }, [pluginNavItems])

  // Initialize open state based on defaultOpen property
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    navCategories.forEach(cat => {
      initial[cat.name] = cat.defaultOpen ?? false
    })
    initial[adminNavigation.name] = false
    initial['Plugins'] = false
    return initial
  })

  const toggleCategory = (name: string) => {
    setOpenCategories(prev => ({ ...prev, [name]: !prev[name] }))
  }

  // Filter admin nav items
  const filteredAdminItems = adminNavigation.items.filter(
    (item) => !item.permission || hasPermission(item.permission)
  )

  // Get theme colors for the shield gradient
  const accentColor = theme.colors.accent
  // Create a lighter version by mixing with white (roughly 50% lighter)
  const accentLighter = theme.colors.textAccent || theme.colors.accentHover

  // Logo component - shows moon during moon-related holidays
  const LogoIcon = showMoon ? (
    <Moon size={32} className="text-yellow-400 flex-shrink-0" fill="currentColor" />
  ) : (
    <div className="relative flex-shrink-0">
      <GlowingBacklight />
      <UnrealIcon size={32} className="text-[var(--accent)] relative z-10" />
      {/* Shield badge in bottom right */}
      <div className="absolute -bottom-1 -right-1 z-20">
        {/* Border shield (slightly larger, behind) */}
        <Shield size={18} className="text-[var(--bg-secondary)] absolute -top-0.5 -left-0.5" fill="currentColor" strokeWidth={0} />
        {/* Main shield with gradient */}
        <svg width="14" height="14" viewBox="0 0 24 24" className="relative">
          <defs>
            <radialGradient id="shield-gradient" cx="25%" cy="25%" r="75%">
              <stop offset="0%" stopColor={accentLighter} />
              <stop offset="100%" stopColor={accentColor} />
            </radialGradient>
          </defs>
          <path 
            d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
            fill="url(#shield-gradient)"
          />
        </svg>
      </div>
    </div>
  )

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className={`flex items-center h-16 px-2 border-b border-[var(--border-primary)] ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-2 pl-2">
                {LogoIcon}
                <div className="flex flex-col">
                  <span className="text-lg font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] bg-clip-text text-transparent leading-tight">
                    UnrealIRCd
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] leading-tight">
                    Admin WebPanel
                  </span>
                </div>
              </div>
              <button
                onClick={onToggle}
                className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
            </>
          ) : (
            <button
              onClick={onToggle}
              className="p-1 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
            >
              {LogoIcon}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
          {navCategories.map((category) => (
            <NavCategoryAccordion
              key={category.name}
              category={category}
              collapsed={collapsed}
              isOpen={openCategories[category.name]}
              onToggle={() => toggleCategory(category.name)}
              hasPermission={hasPermission}
            />
          ))}

          {/* Plugin-contributed navigation items */}
          {pluginNavCategory && pluginNavCategory.items.length > 0 && (
            <div className="pt-2 mt-2 border-t border-[var(--border-primary)]">
              <NavCategoryAccordion
                category={pluginNavCategory}
                collapsed={collapsed}
                isOpen={openCategories['Plugins']}
                onToggle={() => toggleCategory('Plugins')}
                hasPermission={hasPermission}
              />
            </div>
          )}

          {filteredAdminItems.length > 0 && (
            <div className="pt-2 mt-2 border-t border-[var(--border-primary)]">
              <NavCategoryAccordion
                category={adminNavigation}
                collapsed={collapsed}
                isOpen={openCategories[adminNavigation.name]}
                onToggle={() => toggleCategory(adminNavigation.name)}
                hasPermission={hasPermission}
              />
            </div>
          )}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-[var(--border-primary)]">
          {user && (
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-semibold">
                {user.username.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user.username}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{user.role?.name || 'User'}</p>
                </div>
              )}
              <button
                onClick={logout}
                className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
