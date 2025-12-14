import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  User,
  Shield,
  ShieldCheck,
  Globe,
  Lock,
  Eye,
  Hash,
  Ban,
  Skull,
  Copy,
  Star,
} from 'lucide-react'
import { Button, Badge, Modal, Input, Select, Alert, PageLoading, UserModeEditor } from '@/components/common'
import { usersService } from '@/services/irc'
import toast from 'react-hot-toast'

// User mode descriptions
const USER_MODES: Record<string, { name: string; description: string; icon?: typeof Shield }> = {
  o: { name: 'IRC Operator', description: 'User is an IRC Operator', icon: Shield },
  S: { name: 'Service Bot', description: 'User is a Services Bot', icon: Star },
  d: { name: 'Deaf', description: 'User is ignoring channel messages' },
  i: { name: 'Invisible', description: 'Not shown in /WHO searches', icon: Eye },
  p: { name: 'Private Channels', description: 'Channels hidden in /WHOIS outputs' },
  r: { name: 'Registered Nick', description: 'User is using a registered nick' },
  s: { name: 'Server Notices', description: 'User is receiving server notices' },
  t: { name: 'Virtual Host', description: 'Using a custom hostmask' },
  w: { name: 'Wallops', description: 'Listening to /WALLOPS notices from IRC Operators' },
  x: { name: 'Hostmask', description: 'Using a hostmask (hiding IP from non-IRCops)' },
  z: { name: 'Secure', description: 'Connected via TLS/SSL', icon: Lock },
  B: { name: 'Bot', description: 'User is marked as a Bot' },
  D: { name: 'PrivDeaf', description: 'User is rejecting incoming private messages' },
  G: { name: 'Filter', description: 'User is filtering bad words' },
  H: { name: 'Hide IRCop', description: 'User is hiding their IRCop status' },
  I: { name: 'Hide Idle', description: 'User is hiding their idle time' },
  R: { name: 'RegOnly Messages', description: 'Only accepting PMs from registered users' },
  T: { name: 'Deny CTCPs', description: 'Denying CTCP requests' },
  W: { name: 'View /WHOIS', description: 'Receives notifications when someone does /WHOIS on them' },
  Z: { name: 'Deny Insecure', description: 'Only accepting messages from secure connections' },
}

// Channel level badges
const CHANNEL_LEVELS: Record<string, { name: string; color: string }> = {
  q: { name: 'Owner', color: 'bg-purple-500/20 text-purple-400' },
  a: { name: 'Admin', color: 'bg-red-500/20 text-red-400' },
  o: { name: 'Op', color: 'bg-yellow-500/20 text-yellow-400' },
  h: { name: 'Half-Op', color: 'bg-blue-500/20 text-blue-400' },
  v: { name: 'Voice', color: 'bg-green-500/20 text-green-400' },
  Y: { name: 'OJOIN', color: 'bg-gray-500/20 text-gray-400' },
}

export default function UserDetailPage() {
  const { nick } = useParams<{ nick: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const [showKillModal, setShowKillModal] = useState(false)
  const [showBanModal, setShowBanModal] = useState(false)
  const [showVhostModal, setShowVhostModal] = useState(false)
  const [showModeModal, setShowModeModal] = useState(false)

  const [killReason, setKillReason] = useState('Killed by admin')
  const [banData, setBanData] = useState({ type: 'gline', reason: '', duration: '1d' })
  const [vhost, setVhost] = useState('')
  const [modeData, setModeData] = useState({ modes: '', params: '' })

  // Fetch user details
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', nick],
    queryFn: () => usersService.get(nick!),
    enabled: !!nick,
  })

  // Mutations
  const killMutation = useMutation({
    mutationFn: (data: { nick: string; reason: string }) => usersService.kill(data.nick, data.reason),
    onSuccess: () => {
      toast.success(`Killed ${nick}`)
      setShowKillModal(false)
      navigate('/users')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const banMutation = useMutation({
    mutationFn: (data: { nick: string; type: string; reason: string; duration: string }) =>
      usersService.ban(data),
    onSuccess: () => {
      toast.success(`Banned ${nick}`)
      setShowBanModal(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const vhostMutation = useMutation({
    mutationFn: (data: { nick: string; vhost: string }) => usersService.setVhost(data.nick, data.vhost),
    onSuccess: () => {
      toast.success('Vhost updated')
      setShowVhostModal(false)
      queryClient.invalidateQueries({ queryKey: ['user', nick] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const modeMutation = useMutation({
    mutationFn: (data: { nick: string; modes: string; params?: string }) =>
      usersService.setMode(data.nick, data.modes, data.params),
    onSuccess: () => {
      toast.success('Mode changed')
      setShowModeModal(false)
      queryClient.invalidateQueries({ queryKey: ['user', nick] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Parse user modes
  const userModes = useMemo(() => {
    if (!user?.modes) return []
    return user.modes.split('').map(mode => ({
      mode,
      ...USER_MODES[mode],
    })).filter(m => m.name)
  }, [user?.modes])

  // Parse user channels with levels
  const userChannels = useMemo(() => {
    if (!user?.channels) return []
    // Channels come as strings like "@#channel" or "+#channel"
    return user.channels.map((ch: string) => {
      let level = ''
      let name = ch
      // Parse prefix
      if (ch.startsWith('~')) { level = 'q'; name = ch.slice(1) }
      else if (ch.startsWith('&')) { level = 'a'; name = ch.slice(1) }
      else if (ch.startsWith('@')) { level = 'o'; name = ch.slice(1) }
      else if (ch.startsWith('%')) { level = 'h'; name = ch.slice(1) }
      else if (ch.startsWith('+')) { level = 'v'; name = ch.slice(1) }
      return { name, level }
    })
  }, [user?.channels])

  if (isLoading) return <PageLoading />

  if (error || !user) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/users')} leftIcon={<ArrowLeft size={16} />}>
          Back to Users
        </Button>
        <Alert type="error">
          {error ? `Failed to load user: ${error instanceof Error ? error.message : 'Unknown error'}` : 'User not found'}
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/users')} leftIcon={<ArrowLeft size={16} />}>
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{user.name}</h1>
              {user.oper_login && (
                <Badge variant="warning">
                  <ShieldCheck size={12} className="mr-1" />
                  IRCOp
                </Badge>
              )}
              {user.tls && (
                <Badge variant="success">
                  <Lock size={12} className="mr-1" />
                  TLS
                </Badge>
              )}
              {user.account && (
                <Badge variant="info">Logged in</Badge>
              )}
            </div>
            <p className="text-[var(--text-muted)] mt-1">User Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setVhost(user.vhost || '')
              setShowVhostModal(true)
            }}
            leftIcon={<Globe size={16} />}
          >
            Set Vhost
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setModeData({ modes: '', params: '' })
              setShowModeModal(true)
            }}
            leftIcon={<User size={16} />}
          >
            Set Mode
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowKillModal(true)}
            leftIcon={<Skull size={16} />}
          >
            Kill
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowBanModal(true)}
            leftIcon={<Ban size={16} />}
          >
            Ban
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information Card */}
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <User size={20} className="text-[var(--accent)]" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Basic Information</h3>
            {user.reputation !== undefined && (
              <Badge variant="default" className="ml-auto">
                Reputation: {user.reputation}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow label="Nickname" value={user.name} copyable />
            <InfoRow label="User ID (UID)" value={user.id} copyable mono />
            <InfoRow label="Username (Ident)" value={user.username} copyable mono />
            <InfoRow label="Real Name (GECOS)" value={user.realname} />
            <InfoRow label="Real Host" value={user.hostname} copyable mono />
            <InfoRow
              label="IP Address"
              value={user.ip || 'Hidden'}
              copyable={!!user.ip}
              mono
              suffix={
                user.geoip?.country_code && (
                  <img
                    src={`https://flagcdn.com/24x18/${user.geoip.country_code.toLowerCase()}.png`}
                    alt={user.geoip.country_name || user.geoip.country_code}
                    className="ml-2 inline"
                    title={user.geoip.country_name}
                  />
                )
              }
            />
            <InfoRow label="Virtual Host" value={user.vhost || 'None'} mono />
            <InfoRow
              label="Connected to"
              value={user.server_name || user.server}
              link={`/servers`}
            />
            <InfoRow
              label="Logged in as"
              value={user.account || 'Not logged in'}
              link={user.account ? `/users?account=${user.account}` : undefined}
            />
            <InfoRow
              label="Connected Since"
              value={user.connected_since ? new Date(user.connected_since * 1000).toLocaleString() : 'Unknown'}
            />
            <InfoRow
              label="Idle Time"
              value={formatIdleTime(user.idle)}
            />
          </div>

          {/* Security Groups */}
          {user.security_groups && user.security_groups.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[var(--border-primary)]">
              <p className="text-sm text-[var(--text-muted)] mb-2">Security Groups</p>
              <div className="flex flex-wrap gap-2">
                {user.security_groups.map((sg: string) => (
                  <Badge key={sg} variant="secondary">{sg}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* TLS Information */}
          {user.tls && (
            <div className="mt-6 pt-6 border-t border-[var(--border-primary)]">
              <p className="text-sm text-[var(--text-muted)] mb-2">TLS Information</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow
                  label="Cipher"
                  value={(user.tls as Record<string, string>).cipher || 'Unknown'}
                  mono
                />
                <InfoRow
                  label="Certificate Fingerprint"
                  value={(user.tls as Record<string, string>).certfp || 'None'}
                  mono
                  copyable={!!(user.tls as Record<string, string>).certfp}
                />
              </div>
            </div>
          )}

          {/* Oper Information */}
          {user.oper_login && (
            <div className="mt-6 pt-6 border-t border-[var(--border-primary)]">
              <p className="text-sm text-[var(--text-muted)] mb-2">IRC Operator Information</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="Oper Login" value={user.oper_login} />
                <InfoRow label="Oper Class" value={user.oper_class || 'None'} />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* User Modes Card */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Shield size={20} className="text-[var(--accent)]" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">User Modes</h3>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-4 font-mono">+{user.modes || 'none'}</p>
            {userModes.length > 0 ? (
              <div className="space-y-3">
                {userModes.map(({ mode, name, description, icon: Icon }) => (
                  <div key={mode} className="flex items-start gap-3">
                    <div className="p-1.5 rounded bg-[var(--bg-tertiary)]">
                      {Icon ? <Icon size={14} className="text-[var(--accent)]" /> : (
                        <span className="text-xs font-mono text-[var(--accent)]">+{mode}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No special modes set</p>
            )}
          </div>

          {/* Channels Card */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Hash size={20} className="text-[var(--accent)]" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Channels</h3>
              <Badge variant="default" className="ml-auto">{userChannels.length}</Badge>
            </div>
            {userChannels.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {userChannels.map(({ name, level }) => (
                  <Link
                    key={name}
                    to={`/channels/${encodeURIComponent(name)}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors group"
                  >
                    <span className="text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                      {name}
                    </span>
                    {level && CHANNEL_LEVELS[level] && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CHANNEL_LEVELS[level].color}`}>
                        {CHANNEL_LEVELS[level].name}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">Not in any channels</p>
            )}
          </div>
        </div>
      </div>

      {/* Kill Modal */}
      <Modal
        isOpen={showKillModal}
        onClose={() => setShowKillModal(false)}
        title={`Kill User: ${user.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowKillModal(false)}>{t('common.cancel')}</Button>
            <Button
              variant="danger"
              onClick={() => killMutation.mutate({ nick: user.name, reason: killReason })}
              isLoading={killMutation.isPending}
            >
              {t('userDetail.killButton')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert type="warning">
            This will forcefully disconnect {user.name} from the network.
          </Alert>
          <Input
            label="Reason"
            value={killReason}
            onChange={(e) => setKillReason(e.target.value)}
            placeholder="Enter kill reason"
          />
        </div>
      </Modal>

      {/* Ban Modal */}
      <Modal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        title={`Ban User: ${user.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBanModal(false)}>{t('common.cancel')}</Button>
            <Button
              variant="danger"
              onClick={() => banMutation.mutate({ nick: user.name, ...banData })}
              isLoading={banMutation.isPending}
            >
              {t('userDetail.banButton')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Ban Type"
            value={banData.type}
            onChange={(e) => setBanData({ ...banData, type: e.target.value })}
          >
            <option value="gline">G-Line (Global)</option>
            <option value="kline">K-Line (Local)</option>
            <option value="gzline">GZ-Line (Global IP)</option>
            <option value="zline">Z-Line (Local IP)</option>
            <option value="shun">Shun</option>
          </Select>
          <Input
            label="Reason"
            value={banData.reason}
            onChange={(e) => setBanData({ ...banData, reason: e.target.value })}
            placeholder="Enter ban reason"
          />
          <Select
            label="Duration"
            value={banData.duration}
            onChange={(e) => setBanData({ ...banData, duration: e.target.value })}
          >
            <option value="1h">1 Hour</option>
            <option value="6h">6 Hours</option>
            <option value="1d">1 Day</option>
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
            <option value="0">Permanent</option>
          </Select>
        </div>
      </Modal>

      {/* Vhost Modal */}
      <Modal
        isOpen={showVhostModal}
        onClose={() => setShowVhostModal(false)}
        title={`Set Vhost: ${user.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowVhostModal(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => vhostMutation.mutate({ nick: user.name, vhost })}
              isLoading={vhostMutation.isPending}
            >
              {t('userDetail.setVhostButton')}
            </Button>
          </>
        }
      >
        <Input
          label="Virtual Host"
          value={vhost}
          onChange={(e) => setVhost(e.target.value)}
          placeholder="e.g., user.mynetwork.org"
          helperText="Leave empty to remove the current vhost"
        />
      </Modal>

      {/* Mode Modal */}
      <Modal
        isOpen={showModeModal}
        onClose={() => setShowModeModal(false)}
        title={`Set User Modes: ${user.name}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModeModal(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => modeMutation.mutate({ nick: user.name, modes: modeData.modes, params: modeData.params || undefined })}
              isLoading={modeMutation.isPending}
              disabled={!modeData.modes}
            >
              {t('userDetail.applyModeChanges')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 mb-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">Current modes</p>
            <p className="font-mono text-sm text-[var(--text-primary)]">+{user.modes || 'none'}</p>
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            <UserModeEditor
              currentModes={user.modes || ''}
              onChange={(modes) => setModeData({ modes, params: '' })}
            />
          </div>
          
          <div className="border-t border-[var(--border-primary)] pt-4 mt-4">
            <p className="text-xs text-[var(--text-muted)] mb-2">Or enter modes manually:</p>
            <div className="flex gap-2">
              <Input
                value={modeData.modes}
                onChange={(e) => setModeData({ ...modeData, modes: e.target.value })}
                placeholder="e.g., +i-x"
                className="flex-1"
              />
              <Input
                value={modeData.params}
                onChange={(e) => setModeData({ ...modeData, params: e.target.value })}
                placeholder="Parameters"
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// Info Row Component
function InfoRow({
  label,
  value,
  mono = false,
  copyable = false,
  link,
  suffix,
}: {
  label: string
  value: string
  mono?: boolean
  copyable?: boolean
  link?: string
  suffix?: React.ReactNode
}) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  return (
    <div>
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        {link ? (
          <Link to={link} className="text-[var(--accent)] hover:underline">
            <span className={mono ? 'font-mono text-sm' : ''}>{value}</span>
          </Link>
        ) : (
          <span className={`text-[var(--text-primary)] ${mono ? 'font-mono text-sm' : ''}`}>
            {value}
          </span>
        )}
        {suffix}
        {copyable && value && (
          <button
            onClick={() => copyToClipboard(value)}
            className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Copy to clipboard"
          >
            <Copy size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

function formatIdleTime(seconds?: number): string {
  if (!seconds) return 'Active'
  
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 && parts.length === 0) parts.push(`${secs}s`)
  
  return parts.join(' ') || 'Active'
}
