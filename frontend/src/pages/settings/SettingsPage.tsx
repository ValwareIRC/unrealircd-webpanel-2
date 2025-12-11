import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Badge } from '@/components/common'
import { Server, Shield, Users, Palette, ShieldCheck, Bug, Check, ExternalLink, Sparkles, Cpu, Clock, Sun, Webhook, Mail, Bell, Snowflake, Smartphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTheme, type Theme } from '@/contexts/ThemeContext'
import toast from 'react-hot-toast'
import api from '@/services/api'

interface SystemSettings {
  hibp_enabled: boolean
  debug_mode: boolean
}

const categoryIcons = {
  modern: Sparkles,
  futuristic: Cpu,
  retro: Clock,
  classic: Sun,
  festive: Snowflake,
}

function ThemePreview({ theme, isActive, onClick }: { theme: Theme; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative p-3 rounded-lg border-2 transition-all text-left ${
        isActive
          ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/20'
          : 'border-[var(--border-primary)] hover:border-[var(--border-secondary)]'
      }`}
      style={{
        background: theme.colors.bgSecondary,
      }}
    >
      {/* Preview colors */}
      <div className="flex gap-1 mb-2">
        {[theme.colors.accent, theme.colors.bgTertiary, theme.colors.textPrimary, theme.colors.success].map((color, i) => (
          <div key={i} className="w-4 h-4 rounded" style={{ background: color }} />
        ))}
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: theme.colors.textPrimary }}>
          {theme.name}
        </span>
        {isActive && <Check size={12} className="text-[var(--accent)]" />}
      </div>
    </button>
  )
}

export function SettingsPage() {
  const { theme, setTheme, availableThemes } = useTheme()
  const queryClient = useQueryClient()
  
  // Fetch system settings from API
  const { data: systemSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async (): Promise<SystemSettings> => {
      const response = await api.get<SystemSettings>('/system-settings')
      return response.data
    },
  })
  
  // Local state for form
  const [hibpEnabled, setHibpEnabled] = useState(true)
  const [debugMode, setDebugMode] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  
  // Sync local state with fetched settings
  useEffect(() => {
    if (systemSettings) {
      setHibpEnabled(systemSettings.hibp_enabled)
      setDebugMode(systemSettings.debug_mode)
    }
  }, [systemSettings])
  
  // Track changes
  useEffect(() => {
    if (systemSettings) {
      setHasChanges(
        hibpEnabled !== systemSettings.hibp_enabled || 
        debugMode !== systemSettings.debug_mode
      )
    }
  }, [hibpEnabled, debugMode, systemSettings])
  
  // Mutation to save settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<SystemSettings>) => {
      await api.put('/system-settings', settings)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] })
      setHasChanges(false)
      toast.success('Settings saved successfully')
    },
    onError: () => {
      toast.error('Failed to save settings')
    },
  })
  
  const handleSaveSettings = () => {
    saveSettingsMutation.mutate({
      hibp_enabled: hibpEnabled,
      debug_mode: debugMode,
    })
  }
  
  const handleThemeChange = (themeId: string) => {
    setTheme(themeId)
    toast.success(`Theme changed to ${availableThemes.find(t => t.id === themeId)?.name}`)
  }

  const settingsLinks = [
    {
      title: 'Panel Users',
      description: 'Manage users who can access this panel',
      icon: Users,
      href: '/settings/users',
    },
    {
      title: 'Roles & Permissions',
      description: 'Configure user roles and their permissions',
      icon: Shield,
      href: '/settings/roles',
    },
    {
      title: 'RPC Servers',
      description: 'Configure UnrealIRCd JSON-RPC connections',
      icon: Server,
      href: '/settings/rpc',
    },
    {
      title: 'Webhooks',
      description: 'Receive log events from UnrealIRCd',
      icon: Webhook,
      href: '/settings/webhooks',
    },
    {
      title: 'SMTP Settings',
      description: 'Configure email server for notifications',
      icon: Mail,
      href: '/settings/smtp',
    },
    {
      title: 'Email Notifications',
      description: 'Configure your email notification preferences',
      icon: Bell,
      href: '/settings/notifications',
    },
    {
      title: 'Two-Factor Auth',
      description: 'Manage your account security with 2FA',
      icon: Smartphone,
      href: '/settings/two-factor',
    },
  ]
  
  // Group themes by category
  const groupedThemes = {
    modern: availableThemes.filter(t => t.category === 'modern'),
    futuristic: availableThemes.filter(t => t.category === 'futuristic'),
    retro: availableThemes.filter(t => t.category === 'retro'),
    classic: availableThemes.filter(t => t.category === 'classic'),
    festive: availableThemes.filter(t => t.category === 'festive'),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="text-[var(--text-muted)] mt-1">Configure the web panel</p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsLinks.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-6 hover:border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)]/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] group-hover:bg-[var(--accent)]/20 transition-colors">
                <item.icon size={24} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
              </div>
              <div>
                <h3 className="text-[var(--text-primary)] font-medium group-hover:text-[var(--accent)] transition-colors">
                  {item.title}
                </h3>
                <p className="text-[var(--text-muted)] text-sm">{item.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* General Settings */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">General Settings</h2>
          {hasChanges && (
            <Badge variant="warning">Unsaved changes</Badge>
          )}
        </div>
        
        {/* Password Data Leak Checks */}
        <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
              <ShieldCheck size={20} className="text-[var(--accent)]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-[var(--text-primary)] font-medium">Password Data Leak Checks</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hibpEnabled}
                    onChange={(e) => setHibpEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--bg-secondary)] peer-focus:ring-2 peer-focus:ring-[var(--accent)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                </label>
              </div>
              <p className="text-[var(--text-muted)] text-sm mt-1">
                Checks user passwords on login against known data leaks via{' '}
                <a 
                  href="https://haveibeenpwned.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                >
                  Have I Been Pwned <ExternalLink size={12} />
                </a>
              </p>
              <p className="text-[var(--text-muted)] text-xs mt-2 italic">
                This check runs when someone logs in or updates their password.
              </p>
            </div>
          </div>
        </div>
        
        {/* Debug Mode */}
        <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
              <Bug size={20} className="text-yellow-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-[var(--text-primary)] font-medium">Debug Mode</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={debugMode}
                    onChange={(e) => setDebugMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--bg-secondary)] peer-focus:ring-2 peer-focus:ring-[var(--accent)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                </label>
              </div>
              <p className="text-[var(--text-muted)] text-sm mt-1">
                Enable Debug Mode (Developers Only)
              </p>
              <div className="mt-2">
                <Alert type="warning">
                  Enabling this may make the webpanel more difficult to use and expose sensitive information.
                </Alert>
              </div>
            </div>
          </div>
        </div>
        
        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button 
            onClick={handleSaveSettings} 
            disabled={!hasChanges || saveSettingsMutation.isPending}
            isLoading={saveSettingsMutation.isPending}
          >
            Save Settings
          </Button>
        </div>
      </div>

      {/* Theme Settings */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Palette size={24} className="text-[var(--accent)]" />
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Theme</h2>
            <p className="text-[var(--text-muted)] text-sm">
              Current theme: <span className="text-[var(--text-primary)] font-medium">{theme.name}</span>
            </p>
          </div>
        </div>
        
        {/* Theme Grid by Category */}
        <div className="space-y-4">
          {(Object.keys(groupedThemes) as Array<keyof typeof groupedThemes>).map((category) => {
            const Icon = categoryIcons[category]
            return (
              <div key={category}>
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Icon size={12} />
                  {category}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {groupedThemes[category].map((t) => (
                    <ThemePreview
                      key={t.id}
                      theme={t}
                      isActive={theme.id === t.id}
                      onClick={() => handleThemeChange(t.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Theme Effects */}
        {theme.effects && Object.values(theme.effects).some(Boolean) && (
          <div className="pt-4 border-t border-[var(--border-primary)]">
            <p className="text-sm text-[var(--text-muted)] mb-2">Active Effects:</p>
            <div className="flex flex-wrap gap-2">
              {theme.effects.glassmorphism && <Badge variant="default">Glassmorphism</Badge>}
              {theme.effects.glow && <Badge variant="default">Glow</Badge>}
              {theme.effects.neon && <Badge variant="default">Neon</Badge>}
              {theme.effects.scanlines && <Badge variant="default">Scanlines</Badge>}
              {theme.effects.crt && <Badge variant="default">CRT</Badge>}
              {theme.effects.noise && <Badge variant="default">Noise</Badge>}
            </div>
          </div>
        )}
      </div>

      {/* About */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">About</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <span className="text-[var(--text-muted)]">Panel Version</span>
            <span className="text-[var(--text-primary)] font-mono">2.0.0</span>
          </div>
          <div className="flex justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <span className="text-[var(--text-muted)]">Frontend</span>
            <span className="text-[var(--text-primary)] font-mono">React + TailwindCSS</span>
          </div>
          <div className="flex justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <span className="text-[var(--text-muted)]">Backend</span>
            <span className="text-[var(--text-primary)] font-mono">Go + Gin</span>
          </div>
          <div className="flex justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <span className="text-[var(--text-muted)]">Documentation</span>
            <a 
              href="https://www.unrealircd.org/docs/UnrealIRCd_webpanel" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline inline-flex items-center gap-1"
            >
              View Docs <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
