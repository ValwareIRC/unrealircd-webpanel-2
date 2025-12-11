import { useMemo } from 'react'
import { Shield, Eye, Lock, Bot, BellOff, MessageSquareOff, Filter } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Complete user mode definitions with groups
interface UserModeInfo {
  name: string
  description: string
  icon?: LucideIcon
  group: 'visibility' | 'communication' | 'security' | 'oper' | 'other'
  settable?: boolean // Can be set by the user/admin (false for server-only modes)
}

const USER_MODE_GROUPS = {
  visibility: { name: 'Visibility', description: 'Control how others see you' },
  communication: { name: 'Communication', description: 'Message and notification settings' },
  security: { name: 'Security', description: 'Connection and authentication' },
  oper: { name: 'Operator', description: 'IRC Operator modes' },
  other: { name: 'Other', description: 'Miscellaneous modes' },
}

const USER_MODES: Record<string, UserModeInfo> = {
  // Visibility
  i: { name: 'Invisible', description: 'Not shown in /WHO searches', icon: Eye, group: 'visibility', settable: true },
  p: { name: 'Hide Channels', description: 'Channels hidden in /WHOIS', group: 'visibility', settable: true },
  x: { name: 'Cloaked Host', description: 'Using a cloaked hostname', group: 'visibility', settable: true },
  t: { name: 'VHost', description: 'Using a custom virtual host', group: 'visibility', settable: false },
  H: { name: 'Hide Oper', description: 'Hiding IRC Operator status', group: 'visibility', settable: true },
  I: { name: 'Hide Idle', description: 'Hiding idle time from /WHOIS', group: 'visibility', settable: true },
  
  // Communication
  d: { name: 'Deaf', description: 'Not receiving channel messages', icon: BellOff, group: 'communication', settable: true },
  D: { name: 'PrivDeaf', description: 'Rejecting private messages', icon: MessageSquareOff, group: 'communication', settable: true },
  R: { name: 'RegOnly PM', description: 'Only accepting PMs from registered users', group: 'communication', settable: true },
  T: { name: 'No CTCPs', description: 'Blocking CTCP requests', group: 'communication', settable: true },
  G: { name: 'Censored', description: 'Filtering bad words in messages', icon: Filter, group: 'communication', settable: true },
  Z: { name: 'Secure Only', description: 'Only accepting messages from TLS users', group: 'communication', settable: true },
  w: { name: 'Wallops', description: 'Receiving /WALLOPS notices', group: 'communication', settable: true },
  s: { name: 'Server Notices', description: 'Receiving server notices', group: 'communication', settable: true },
  W: { name: 'WHOIS Notify', description: 'Notified when someone /WHOIS you', group: 'communication', settable: true },
  
  // Security
  z: { name: 'Secure (TLS)', description: 'Connected via TLS/SSL', icon: Lock, group: 'security', settable: false },
  r: { name: 'Registered', description: 'Identified to services', group: 'security', settable: false },
  
  // Operator
  o: { name: 'Global Oper', description: 'User is an IRC Operator', icon: Shield, group: 'oper', settable: false },
  O: { name: 'Local Oper', description: 'User is a local IRC Operator', icon: Shield, group: 'oper', settable: false },
  S: { name: 'Service', description: 'User is a Network Service', group: 'oper', settable: false },
  
  // Other
  B: { name: 'Bot', description: 'Marked as a bot', icon: Bot, group: 'other', settable: true },
  q: { name: 'Unkickable', description: 'Cannot be kicked from channels', group: 'other', settable: false },
}

interface UserModeEditorProps {
  currentModes: string
  onChange: (modes: string) => void
  readOnly?: boolean
  showOnlySet?: boolean
}

export function UserModeEditor({ currentModes, onChange, readOnly = false, showOnlySet = false }: UserModeEditorProps) {
  // Parse current modes into a set
  const activeModes = useMemo(() => {
    const modes = new Set<string>()
    if (currentModes) {
      // Remove leading + if present
      const modeStr = currentModes.startsWith('+') ? currentModes.slice(1) : currentModes
      for (const char of modeStr) {
        modes.add(char)
      }
    }
    return modes
  }, [currentModes])

  // Group modes
  const groupedModes = useMemo(() => {
    const groups: Record<string, Array<{ mode: string; info: UserModeInfo; active: boolean }>> = {}
    
    for (const [mode, info] of Object.entries(USER_MODES)) {
      const active = activeModes.has(mode)
      
      // Skip if showOnlySet and mode is not active
      if (showOnlySet && !active) continue
      
      if (!groups[info.group]) {
        groups[info.group] = []
      }
      groups[info.group].push({ mode, info, active })
    }
    
    return groups
  }, [activeModes, showOnlySet])

  const handleModeToggle = (mode: string, currentlyActive: boolean) => {
    if (readOnly) return
    
    const modeInfo = USER_MODES[mode]
    if (!modeInfo?.settable) return
    
    // Calculate new modes string
    const newModes = new Set(activeModes)
    if (currentlyActive) {
      newModes.delete(mode)
    } else {
      newModes.add(mode)
    }
    
    // Convert to mode string with + prefix
    const modeStr = Array.from(newModes).sort().join('')
    onChange(modeStr ? `+${modeStr}` : '')
  }

  const groupOrder = ['visibility', 'communication', 'security', 'oper', 'other']

  return (
    <div className="space-y-6">
      {groupOrder.map(groupKey => {
        const modes = groupedModes[groupKey]
        if (!modes || modes.length === 0) return null
        
        const groupInfo = USER_MODE_GROUPS[groupKey as keyof typeof USER_MODE_GROUPS]
        
        return (
          <div key={groupKey} className="space-y-3">
            <div className="border-b border-[var(--border-primary)] pb-2">
              <h4 className="text-sm font-medium text-[var(--text-primary)]">{groupInfo.name}</h4>
              <p className="text-xs text-[var(--text-muted)]">{groupInfo.description}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {modes.map(({ mode, info, active }) => {
                const Icon = info.icon
                const canToggle = info.settable && !readOnly
                
                return (
                  <label
                    key={mode}
                    className={`
                      flex items-start gap-3 p-3 rounded-lg border transition-colors
                      ${active 
                        ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30' 
                        : 'bg-[var(--bg-secondary)] border-[var(--border-primary)]'
                      }
                      ${canToggle ? 'cursor-pointer hover:border-[var(--accent)]/50' : 'cursor-default opacity-75'}
                    `}
                  >
                    <div className="pt-0.5">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => handleModeToggle(mode, active)}
                        disabled={!canToggle}
                        className="w-4 h-4 rounded border-[var(--border-primary)] bg-[var(--bg-tertiary)] 
                                   text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-0
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {Icon && <Icon className="w-4 h-4 text-[var(--text-muted)]" />}
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {info.name}
                        </span>
                        <code className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                          +{mode}
                        </code>
                        {!info.settable && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                            read-only
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {info.description}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
      
      {Object.keys(groupedModes).length === 0 && (
        <p className="text-sm text-[var(--text-muted)] text-center py-4">
          No modes to display
        </p>
      )}
    </div>
  )
}

export default UserModeEditor
