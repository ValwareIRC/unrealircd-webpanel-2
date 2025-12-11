import { useState, useEffect, useMemo, useCallback } from 'react'
import { Lock, MessageSquare, Shield, Eye, Settings } from 'lucide-react'

// Channel mode info with groups
interface ChannelModeInfo {
  name: string
  description: string
  group: 'join' | 'message' | 'flood' | 'visibility' | 'other'
  hasParam?: boolean // Mode requires a parameter (like +k key, +l limit)
  paramType?: 'text' | 'number' // Type of parameter
  paramPlaceholder?: string
  settable?: boolean // Can be set (false for server-only like +r registered)
}

const CHANNEL_MODE_GROUPS = {
  join: { name: 'Join Restrictions', description: 'Control who can join the channel', icon: Lock },
  message: { name: 'Message Restrictions', description: 'Control what messages are allowed', icon: MessageSquare },
  flood: { name: 'Anti-Flood & Protection', description: 'Flood protection settings', icon: Shield },
  visibility: { name: 'Visibility', description: 'Channel visibility settings', icon: Eye },
  other: { name: 'Other', description: 'Other channel modes', icon: Settings },
}

const CHANNEL_MODES: Record<string, ChannelModeInfo> = {
  // Join Restrictions (kliRzOL)
  k: { name: 'Key', description: 'Requires a password to join', group: 'join', hasParam: true, paramType: 'text', paramPlaceholder: 'Channel key', settable: true },
  l: { name: 'Limit', description: 'Maximum number of users', group: 'join', hasParam: true, paramType: 'number', paramPlaceholder: 'User limit', settable: true },
  i: { name: 'Invite Only', description: 'Users must be invited to join', group: 'join', settable: true },
  R: { name: 'Registered Only', description: 'Only registered users can join', group: 'join', settable: true },
  z: { name: 'Secure Only', description: 'Only TLS users can join', group: 'join', settable: true },
  O: { name: 'Opers Only', description: 'Only IRC operators can join', group: 'join', settable: true },
  L: { name: 'Link', description: 'Link to another channel when full', group: 'join', hasParam: true, paramType: 'text', paramPlaceholder: '#channel', settable: true },
  
  // Message Restrictions (cSmMnGT)
  c: { name: 'No Colors', description: 'Block messages containing color codes', group: 'message', settable: true },
  S: { name: 'Strip Colors', description: 'Strip color codes from messages', group: 'message', settable: true },
  m: { name: 'Moderated', description: 'Only voiced users and ops can speak', group: 'message', settable: true },
  M: { name: 'Moderated (Unreg)', description: 'Unregistered users cannot speak', group: 'message', settable: true },
  n: { name: 'No External', description: 'Only channel members can send messages', group: 'message', settable: true },
  G: { name: 'Censored', description: 'Bad words are filtered', group: 'message', settable: true },
  T: { name: 'No Notices', description: 'Channel notices are blocked', group: 'message', settable: true },
  C: { name: 'No CTCPs', description: 'CTCP messages are blocked', group: 'message', settable: true },
  
  // Anti-flood and other restrictions (FftCNKVQ)
  f: { name: 'Flood Protection', description: 'Enable flood protection', group: 'flood', hasParam: true, paramType: 'text', paramPlaceholder: '[90j,10m,10c,40t]:5', settable: true },
  F: { name: 'Flood Profile', description: 'Use a flood protection profile', group: 'flood', hasParam: true, paramType: 'text', paramPlaceholder: 'profile', settable: true },
  N: { name: 'No Nick Changes', description: 'Users cannot change nick in channel', group: 'flood', settable: true },
  K: { name: 'No Knock', description: 'Users cannot /KNOCK on this channel', group: 'flood', settable: true },
  V: { name: 'No Invites', description: 'Users cannot /INVITE others', group: 'flood', settable: true },
  Q: { name: 'No Kicks', description: 'Kicks are disabled', group: 'flood', settable: true },
  
  // Visibility (sp)
  s: { name: 'Secret', description: 'Hidden from /LIST and /WHOIS', group: 'visibility', settable: true },
  p: { name: 'Private', description: 'Hidden from /WHOIS, shows * in /LIST', group: 'visibility', settable: true },
  
  // Other (rPHzZDdt)
  t: { name: 'Topic Lock', description: 'Only ops can change the topic', group: 'other', settable: true },
  r: { name: 'Registered', description: 'Channel is registered with services', group: 'other', settable: false },
  P: { name: 'Permanent', description: 'Channel persists when empty', group: 'other', settable: true },
  H: { name: 'History', description: 'Channel history is recorded', group: 'other', hasParam: true, paramType: 'text', paramPlaceholder: '50:1440', settable: true },
  Z: { name: 'All Secure', description: 'All users are using TLS (informational)', group: 'other', settable: false },
  D: { name: 'Delayed Join', description: 'Join messages delayed until user speaks', group: 'other', settable: true },
  d: { name: 'Has Delayed', description: 'Has users with delayed join', group: 'other', settable: false },
}

interface ModeState {
  active: boolean
  param?: string
}

interface ChannelModeEditorProps {
  currentModes: string // e.g., "+nts" or "+ntsk secret +l 50"
  onChange: (modes: string, params: string) => void
  readOnly?: boolean
  showOnlySet?: boolean
}

export function ChannelModeEditor({ currentModes, onChange, readOnly = false, showOnlySet = false }: ChannelModeEditorProps) {
  // Parse current modes into state
  const [modeState, setModeState] = useState<Record<string, ModeState>>({})
  
  // Parse the mode string on mount/change
  useEffect(() => {
    const newState: Record<string, ModeState> = {}
    
    if (!currentModes) {
      setModeState(newState)
      return
    }
    
    // Parse mode string - formats: "+nts", "+ntsk secret", "+nt +l 50"
    const parts = currentModes.split(' ')
    let currentModeChars = ''
    const params: string[] = []
    
    for (const part of parts) {
      if (part.startsWith('+') || part.startsWith('-')) {
        // This is a mode string
        currentModeChars = part.slice(1)
        for (const char of currentModeChars) {
          const modeInfo = CHANNEL_MODES[char]
          if (modeInfo) {
            newState[char] = { active: true }
          }
        }
      } else if (part) {
        // This is a parameter - need to match with parametered modes
        params.push(part)
      }
    }
    
    // Match parameters to modes that need them
    let pIdx = 0
    for (const char of currentModeChars) {
      const modeInfo = CHANNEL_MODES[char]
      if (modeInfo?.hasParam && params[pIdx]) {
        newState[char] = { active: true, param: params[pIdx] }
        pIdx++
      }
    }
    
    setModeState(newState)
  }, [currentModes])

  // Group modes for display
  const groupedModes = useMemo(() => {
    const groups: Record<string, Array<{ mode: string; info: ChannelModeInfo; state: ModeState }>> = {}
    
    for (const [mode, info] of Object.entries(CHANNEL_MODES)) {
      const state = modeState[mode] || { active: false }
      
      // Skip if showOnlySet and mode is not active
      if (showOnlySet && !state.active) continue
      
      if (!groups[info.group]) {
        groups[info.group] = []
      }
      groups[info.group].push({ mode, info, state })
    }
    
    return groups
  }, [modeState, showOnlySet])

  // Handle mode toggle
  const handleModeToggle = useCallback((mode: string, currentState: ModeState) => {
    if (readOnly) return
    
    const info = CHANNEL_MODES[mode]
    if (!info?.settable) return
    
    const newState = { ...modeState }
    
    if (currentState.active) {
      // Deactivate
      delete newState[mode]
    } else {
      // Activate
      newState[mode] = { active: true, param: info.hasParam ? '' : undefined }
    }
    
    setModeState(newState)
    emitChange(newState)
  }, [modeState, readOnly])

  // Handle parameter change
  const handleParamChange = useCallback((mode: string, param: string) => {
    if (readOnly) return
    
    const newState = { ...modeState }
    newState[mode] = { ...newState[mode], param }
    
    setModeState(newState)
    emitChange(newState)
  }, [modeState, readOnly])

  // Convert state to mode string
  const emitChange = useCallback((state: Record<string, ModeState>) => {
    const activeModes: string[] = []
    const params: string[] = []
    
    // Sort modes alphabetically
    const sortedModes = Object.entries(state)
      .filter(([_, s]) => s.active)
      .sort(([a], [b]) => a.localeCompare(b))
    
    for (const [mode, s] of sortedModes) {
      activeModes.push(mode)
      if (CHANNEL_MODES[mode]?.hasParam && s.param) {
        params.push(s.param)
      }
    }
    
    const modeStr = activeModes.length > 0 ? `+${activeModes.join('')}` : ''
    const paramStr = params.join(' ')
    
    onChange(modeStr, paramStr)
  }, [onChange])

  const groupOrder = ['join', 'message', 'flood', 'visibility', 'other']

  return (
    <div className="space-y-6">
      {groupOrder.map(groupKey => {
        const modes = groupedModes[groupKey]
        if (!modes || modes.length === 0) return null
        
        const groupInfo = CHANNEL_MODE_GROUPS[groupKey as keyof typeof CHANNEL_MODE_GROUPS]
        const GroupIcon = groupInfo.icon
        
        return (
          <div key={groupKey} className="space-y-3">
            <div className="border-b border-[var(--border-primary)] pb-2">
              <div className="flex items-center gap-2">
                <GroupIcon className="w-4 h-4 text-[var(--text-muted)]" />
                <h4 className="text-sm font-medium text-[var(--text-primary)]">{groupInfo.name}</h4>
              </div>
              <p className="text-xs text-[var(--text-muted)] ml-6">{groupInfo.description}</p>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {modes.map(({ mode, info, state }) => {
                const canToggle = info.settable !== false && !readOnly
                
                return (
                  <div
                    key={mode}
                    className={`
                      flex items-start gap-3 p-3 rounded-lg border transition-colors
                      ${state.active 
                        ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30' 
                        : 'bg-[var(--bg-secondary)] border-[var(--border-primary)]'
                      }
                    `}
                  >
                    <div className="pt-0.5">
                      <input
                        type="checkbox"
                        checked={state.active}
                        onChange={() => handleModeToggle(mode, state)}
                        disabled={!canToggle}
                        className="w-4 h-4 rounded border-[var(--border-primary)] bg-[var(--bg-tertiary)] 
                                   text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-0
                                   disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {info.name}
                        </span>
                        <code className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                          +{mode}
                        </code>
                        {info.settable === false && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                            read-only
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {info.description}
                      </p>
                      
                      {/* Parameter input */}
                      {info.hasParam && state.active && (
                        <div className="mt-2">
                          <input
                            type={info.paramType === 'number' ? 'number' : 'text'}
                            value={state.param || ''}
                            onChange={(e) => handleParamChange(mode, e.target.value)}
                            placeholder={info.paramPlaceholder}
                            disabled={readOnly}
                            className="w-full max-w-xs px-3 py-1.5 text-sm rounded-md
                                     bg-[var(--bg-tertiary)] border border-[var(--border-primary)]
                                     text-[var(--text-primary)] placeholder-[var(--text-muted)]
                                     focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50
                                     disabled:opacity-50"
                          />
                        </div>
                      )}
                    </div>
                  </div>
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

export default ChannelModeEditor
