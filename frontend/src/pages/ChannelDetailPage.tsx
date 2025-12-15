import { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Users,
  Settings,
  MessageSquare,
  Ban,
  UserMinus,
  Trash2,
  Plus,
  RefreshCw,
  VolumeX,
} from 'lucide-react'
import { Button, Badge, Modal, Input, Alert, PageLoading, ChannelModeEditor } from '@/components/common'
import { channelsService } from '@/services/irc'
import type { ChannelMember, ChannelListEntry } from '@/types'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

// Hook to track new items for animation
function useAnimatedMembers(members: ChannelMember[] | undefined) {
  const previousIdsRef = useRef<Set<string>>(new Set())
  const hasInitialLoadRef = useRef(false)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Don't process empty/undefined data
    if (!members || members.length === 0) return

    const currentIds = new Set(members.map(m => m.id))

    // Skip animation on initial load (first time we have actual data)
    if (!hasInitialLoadRef.current) {
      hasInitialLoadRef.current = true
      previousIdsRef.current = currentIds
      return
    }

    const previousIds = previousIdsRef.current

    // Find new members
    const addedIds = new Set<string>()
    currentIds.forEach(id => {
      if (!previousIds.has(id)) {
        addedIds.add(id)
      }
    })

    if (addedIds.size > 0) {
      setNewIds(addedIds)
      setTimeout(() => setNewIds(new Set()), 500)
    }

    previousIdsRef.current = currentIds
  }, [members])

  return newIds
}

// Channel level badges with sort order
const CHANNEL_LEVELS: Record<string, { name: string; color: string; symbol: string; order: number }> = {
  q: { name: 'Owner', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', symbol: '~', order: 0 },
  a: { name: 'Admin', color: 'bg-red-500/20 text-red-400 border-red-500/30', symbol: '&', order: 1 },
  o: { name: 'Op', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', symbol: '@', order: 2 },
  h: { name: 'Half-Op', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', symbol: '%', order: 3 },
  v: { name: 'Voice', color: 'bg-green-500/20 text-green-400 border-green-500/30', symbol: '+', order: 4 },
  Y: { name: 'OJOIN', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', symbol: '!', order: 5 },
}

type TabType = 'settings' | 'bans' | 'invites' | 'excepts'

export default function ChannelDetailPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const [activeTab, setActiveTab] = useState<TabType>('settings')
  const [showTopicModal, setShowTopicModal] = useState(false)
  const [showModeModal, setShowModeModal] = useState(false)
  const [showKickModal, setShowKickModal] = useState(false)
  const [showAddBanModal, setShowAddBanModal] = useState(false)
  const [showAddInviteModal, setShowAddInviteModal] = useState(false)
  const [showAddExceptModal, setShowAddExceptModal] = useState(false)

  const [newTopic, setNewTopic] = useState('')
  const [modeData, setModeData] = useState({ modes: '', params: '' })
  const [kickData, setKickData] = useState({ nick: '', reason: '' })
  const [newBan, setNewBan] = useState({ mask: '', expiry: '' })
  const [newInvite, setNewInvite] = useState({ mask: '', expiry: '' })
  const [newExcept, setNewExcept] = useState({ mask: '', expiry: '' })

  // Fetch channel details with auto-refresh
  const { data: channel, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['channel', name],
    queryFn: () => channelsService.get(name!),
    enabled: !!name,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    staleTime: 4000,
  })

  // Track new members for animation
  const newMemberIds = useAnimatedMembers(channel?.members)

  // Mutations
  const setTopicMutation = useMutation({
    mutationFn: (data: { channel: string; topic: string }) =>
      channelsService.setTopic(data.channel, data.topic),
    onSuccess: () => {
      toast.success(t('channelDetail.settings.topicSetSuccess'))
      setShowTopicModal(false)
      queryClient.invalidateQueries({ queryKey: ['channel', name] })
    },
    onError: (err: Error) => toast.error(t('channelDetail.settings.topicSetError', { error: err.message })),
  })

  const setModeMutation = useMutation({
    mutationFn: (data: { channel: string; modes: string; params?: string }) =>
      channelsService.setMode(data.channel, data.modes, data.params),
    onSuccess: () => {
      toast.success(t('channelDetail.modes.modeSetSuccess'))
      setShowModeModal(false)
      setShowAddBanModal(false)
      setShowAddInviteModal(false)
      setShowAddExceptModal(false)
      queryClient.invalidateQueries({ queryKey: ['channel', name] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const kickMutation = useMutation({
    mutationFn: (data: { channel: string; nick: string; reason?: string }) =>
      channelsService.kick(data.channel, data.nick, data.reason),
    onSuccess: () => {
      toast.success(t('channelDetail.users.kickSuccess', { user: kickData.nick }))
      setShowKickModal(false)
      setKickData({ nick: '', reason: '' })
      queryClient.invalidateQueries({ queryKey: ['channel', name] })
    },
    onError: (err: Error) => toast.error(t('channelDetail.users.kickError', { error: err.message })),
  })

  // Sort members by level
  const sortedMembers = useMemo(() => {
    if (!channel?.members) return []
    return [...channel.members].sort((a, b) => {
      const getOrder = (level?: string) => {
        if (!level) return 99
        for (const char of level) {
          if (CHANNEL_LEVELS[char]) return CHANNEL_LEVELS[char].order
        }
        return 99
      }
      return getOrder(a.level) - getOrder(b.level)
    })
  }, [channel?.members])

  // Parse channel modes
  const channelModes = useMemo(() => {
    if (!channel?.modes) return []
    const modes = channel.modes.split('')
    return modes.map(mode => ({
      mode,
      name: mode.toUpperCase(),
      description: t(`channelDetail.modes.modeDescription.${mode}`, { defaultValue: `Mode ${mode}` }),
    })).filter(m => m.description !== `Mode ${m.mode}`)
  }, [channel?.modes, t])

  const handleKickUser = (member: ChannelMember) => {
    setKickData({ nick: member.name, reason: '' })
    setShowKickModal(true)
  }

  const handleQuickBan = async (member: ChannelMember, mute: boolean) => {
    // Quick ban for 30 minutes
    const mutePrefix = mute ? '~quiet:' : ''
    const mask = `~time:30:${mutePrefix}*!*@${member.name}`
    try {
      await setModeMutation.mutateAsync({
        channel: channel!.name,
        modes: '+b',
        params: mask,
      })
      if (!mute) {
        await kickMutation.mutateAsync({
          channel: channel!.name,
          nick: member.name,
          reason: 'Banned by admin',
        })
      }
      toast.success(mute ? t('channelDetail.users.modeChangeSuccess') : t('channelDetail.users.banSuccess', { user: member.name }))
    } catch (err) {
      toast.error(t('channelDetail.users.modeChangeError', { error: err instanceof Error ? err.message : 'Unknown error' }))
    }
  }

  const handleRemoveBan = async (ban: ChannelListEntry) => {
    try {
      await setModeMutation.mutateAsync({
        channel: channel!.name,
        modes: '-b',
        params: ban.name,
      })
      toast.success(t('channelDetail.bans.banRemovedSuccess'))
    } catch (err) {
      toast.error(t('channelDetail.bans.banRemovedError', { error: err instanceof Error ? err.message : 'Unknown error' }))
    }
  }

  const handleRemoveInvite = async (invite: ChannelListEntry) => {
    try {
      await setModeMutation.mutateAsync({
        channel: channel!.name,
        modes: '-I',
        params: invite.name,
      })
      toast.success(t('channelDetail.invites.inviteRemovedSuccess'))
    } catch (err) {
      toast.error(t('channelDetail.invites.inviteRemovedError', { error: err instanceof Error ? err.message : 'Unknown error' }))
    }
  }

  const handleRemoveExcept = async (except: ChannelListEntry) => {
    try {
      await setModeMutation.mutateAsync({
        channel: channel!.name,
        modes: '-e',
        params: except.name,
      })
      toast.success(t('channelDetail.excepts.exceptRemovedSuccess'))
    } catch (err) {
      toast.error(t('channelDetail.excepts.exceptRemovedError', { error: err instanceof Error ? err.message : 'Unknown error' }))
    }
  }

  const handleAddBan = async () => {
    if (!newBan.mask) {
      toast.error(t('channelDetail.bans.maskRequired'))
      return
    }
    let mask = newBan.mask
    if (newBan.expiry) {
      const minutes = parseInt(newBan.expiry)
      if (!isNaN(minutes) && minutes > 0) {
        mask = `~time:${minutes}:${mask}`
      }
    }
    await setModeMutation.mutateAsync({
      channel: channel!.name,
      modes: '+b',
      params: mask,
    })
    setNewBan({ mask: '', expiry: '' })
  }

  const handleAddInvite = async () => {
    if (!newInvite.mask) {
      toast.error('Please enter a mask')
      return
    }
    let mask = newInvite.mask
    if (newInvite.expiry) {
      const minutes = parseInt(newInvite.expiry)
      if (!isNaN(minutes) && minutes > 0) {
        mask = `~time:${minutes}:${mask}`
      }
    }
    await setModeMutation.mutateAsync({
      channel: channel!.name,
      modes: '+I',
      params: mask,
    })
    setNewInvite({ mask: '', expiry: '' })
  }

  const handleAddExcept = async () => {
    if (!newExcept.mask) {
      toast.error('Please enter a mask')
      return
    }
    let mask = newExcept.mask
    if (newExcept.expiry) {
      const minutes = parseInt(newExcept.expiry)
      if (!isNaN(minutes) && minutes > 0) {
        mask = `~time:${minutes}:${mask}`
      }
    }
    await setModeMutation.mutateAsync({
      channel: channel!.name,
      modes: '+e',
      params: mask,
    })
    setNewExcept({ mask: '', expiry: '' })
  }

  if (isLoading) return <PageLoading />

  if (error || !channel) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/channels')} leftIcon={<ArrowLeft size={16} />}>
          {t('channelDetail.backToChannels')}
        </Button>
        <Alert type="error">
          {error ? t('channelDetail.error', { error: error instanceof Error ? error.message : 'Unknown error' }) : t('channelDetail.notFound')}
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/channels')} leftIcon={<ArrowLeft size={16} />}>
            {t('common.back')}
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{channel.name}</h1>
              <Badge variant="default">
                <Users size={12} className="mr-1" />
                {channel.num_users} {t('channelDetail.users')}
              </Badge>
            </div>
            <p className="text-[var(--text-muted)] mt-1">{t('channelDetail.title', { channel: channel.name })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => refetch()}
            leftIcon={<RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />}
            disabled={isFetching}
          >
            {t('channelDetail.refresh')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setNewTopic(channel.topic || '')
              setShowTopicModal(true)
            }}
            leftIcon={<MessageSquare size={16} />}
          >
            {t('channelDetail.settings.setTopic')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setModeData({ modes: '', params: '' })
              setShowModeModal(true)
            }}
            leftIcon={<Settings size={16} />}
          >
            {t('channelDetail.settings.setMode')}
          </Button>
        </div>
      </div>

      {/* Topic */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare size={20} className="text-[var(--accent)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t('channelDetail.settings.topic')}</h3>
        </div>
        <div className="bg-[var(--bg-tertiary)] p-4 rounded-lg">
          <p className="text-[var(--text-primary)]">
            {channel.topic || <span className="text-[var(--text-muted)] italic">{t('channelDetail.settings.noTopicSet')}</span>}
          </p>
          {channel.topic_set_by && (
            <p className="text-sm text-[var(--text-muted)] mt-2">
              {t('channelDetail.settings.setBy')} <span className="text-[var(--text-secondary)]">{channel.topic_set_by}</span>
              {channel.topic_set_at && (
                <> {t('common.at')} {new Date(channel.topic_set_at * 1000).toLocaleString()}</>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Users size={20} className="text-[var(--accent)]" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t('channelDetail.users.title')}</h3>
            <Badge variant="default" className="ml-auto">{sortedMembers.length}</Badge>
          </div>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {sortedMembers.map((member) => {
              const highestLevel = member.level?.[0]
              const levelInfo = highestLevel ? CHANNEL_LEVELS[highestLevel] : null
              const isNew = newMemberIds.has(member.id)
              return (
                <div
                  key={member.id}
                  className={`flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-hover)] group transition-all duration-300 ${
                    isNew ? 'animate-list-enter' : ''
                  }`}
                >
                  <Link
                    to={`/users/${encodeURIComponent(member.id)}`}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    {levelInfo && (
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${levelInfo.color} border`}>
                        {levelInfo.symbol}
                      </span>
                    )}
                    <span className="text-[var(--text-primary)] truncate group-hover:text-[var(--accent)]">
                      {member.name}
                    </span>
                  </Link>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleQuickBan(member, true)}
                      className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-yellow-400"
                      title={t('channelDetail.users.muteTooltip')}
                    >
                      <VolumeX size={14} />
                    </button>
                    <button
                      onClick={() => handleKickUser(member)}
                      className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-orange-400"
                      title={t('channelDetail.users.kickTooltip')}
                    >
                      <UserMinus size={14} />
                    </button>
                    <button
                      onClick={() => handleQuickBan(member, false)}
                      className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-red-400"
                      title={t('channelDetail.users.banTooltip')}
                    >
                      <Ban size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
            {sortedMembers.length === 0 && (
              <p className="text-[var(--text-muted)] text-center py-4">{t('channelDetail.users.noUsers')}</p>
            )}
          </div>
        </div>

        {/* Channel Settings with Tabs */}
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <Settings size={20} className="text-[var(--accent)]" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t('channelDetail.settings.title')}</h3>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[var(--border-primary)] mb-4">
            {(['settings', 'bans', 'invites', 'excepts'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab === 'settings' && t('channelDetail.tabs.settings')}
                {tab === 'bans' && `${t('channelDetail.tabs.bans')} (${channel.bans?.length || 0})`}
                {tab === 'invites' && `${t('channelDetail.tabs.invites')} (${channel.invites?.length || 0})`}
                {tab === 'excepts' && `${t('channelDetail.tabs.excepts')} (${channel.excepts?.length || 0})`}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-64">
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-[var(--text-muted)]">{t('channelDetail.settings.currentModes')}</span>
                  <code className="text-[var(--text-primary)] bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                    +{channel.modes || 'nt'}
                  </code>
                </div>
                {channelModes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {channelModes.map(({ mode, name, description }) => (
                      <div key={mode} className="flex items-start gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                        <code className="text-[var(--accent)] font-bold">+{mode}</code>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{name}</p>
                          <p className="text-xs text-[var(--text-muted)]">{description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--text-muted)]">{t('channelDetail.settings.defaultModesOnly')}</p>
                )}
                <div className="pt-4 border-t border-[var(--border-primary)]">
                  <p className="text-sm text-[var(--text-muted)] mb-2">{t('channelDetail.settings.channelInfo')}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[var(--text-muted)]">{t('channelDetail.settings.created')}</span>
                      <span className="text-[var(--text-primary)] ml-2">
                        {channel.creation_time
                          ? new Date(channel.creation_time * 1000).toLocaleString()
                          : t('channelDetail.settings.unknown')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'bans' && (
              <div>
                <div className="flex justify-end mb-4">
                  <Button
                    size="sm"
                    onClick={() => setShowAddBanModal(true)}
                    leftIcon={<Plus size={14} />}
                  >
                    {t('channelDetail.bans.addBan')}
                  </Button>
                </div>
                {channel.bans && channel.bans.length > 0 ? (
                  <div className="space-y-2">
                    {channel.bans.map((ban, idx) => (
                      <ListEntry
                        key={idx}
                        entry={ban}
                        onRemove={() => handleRemoveBan(ban)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--text-muted)] text-center py-8">{t('channelDetail.bans.noBansSet')}</p>
                )}
              </div>
            )}

            {activeTab === 'invites' && (
              <div>
                <div className="flex justify-end mb-4">
                  <Button
                    size="sm"
                    onClick={() => setShowAddInviteModal(true)}
                    leftIcon={<Plus size={14} />}
                  >
                    {t('channelDetail.invites.addInvite')}
                  </Button>
                </div>
                {channel.invites && channel.invites.length > 0 ? (
                  <div className="space-y-2">
                    {channel.invites.map((invite, idx) => (
                      <ListEntry
                        key={idx}
                        entry={invite}
                        onRemove={() => handleRemoveInvite(invite)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--text-muted)] text-center py-8">{t('channelDetail.invites.noInvitesSet')}</p>
                )}
              </div>
            )}

            {activeTab === 'excepts' && (
              <div>
                <div className="flex justify-end mb-4">
                  <Button
                    size="sm"
                    onClick={() => setShowAddExceptModal(true)}
                    leftIcon={<Plus size={14} />}
                  >
                    {t('channelDetail.excepts.addExcept')}
                  </Button>
                </div>
                {channel.excepts && channel.excepts.length > 0 ? (
                  <div className="space-y-2">
                    {channel.excepts.map((except, idx) => (
                      <ListEntry
                        key={idx}
                        entry={except}
                        onRemove={() => handleRemoveExcept(except)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--text-muted)] text-center py-8">{t('channelDetail.excepts.noExceptsSet')}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Topic Modal */}
      <Modal
        isOpen={showTopicModal}
        onClose={() => setShowTopicModal(false)}
        title={t('channelDetail.modals.setTopic.title', { channel: channel.name })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowTopicModal(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => setTopicMutation.mutate({ channel: channel.name, topic: newTopic })}
              isLoading={setTopicMutation.isPending}
            >
              {t('channelDetail.settings.setTopic')}
            </Button>
          </>
        }
      >
        <Input
          label={t('channelDetail.settings.topic')}
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          placeholder={t('channelDetail.settings.topicPlaceholder')}
        />
      </Modal>

      {/* Mode Modal */}
      <Modal
        isOpen={showModeModal}
        onClose={() => setShowModeModal(false)}
        title={t('channelDetail.modals.setMode.title', { channel: channel.name })}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModeModal(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => setModeMutation.mutate({
                channel: channel.name,
                modes: modeData.modes,
                params: modeData.params || undefined,
              })}
              isLoading={setModeMutation.isPending}
              disabled={!modeData.modes}
            >
              {t('channelDetail.modals.setMode.applyModeChanges')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 mb-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">{t('channelDetail.modals.setMode.currentModesLabel')}</p>
            <p className="font-mono text-sm text-[var(--text-primary)]">+{channel.modes || 'nt'}</p>
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            <ChannelModeEditor
              currentModes={channel.modes || ''}
              onChange={(modes, params) => setModeData({ modes, params })}
            />
          </div>
          
          <div className="border-t border-[var(--border-primary)] pt-4 mt-4">
            <p className="text-xs text-[var(--text-muted)] mb-2">{t('channelDetail.modals.setMode.enterModesManually')}</p>
            <div className="flex gap-2">
              <Input
                value={modeData.modes}
                onChange={(e) => setModeData({ ...modeData, modes: e.target.value })}
                placeholder="e.g., +nt-m"
                className="flex-1"
              />
              <Input
                value={modeData.params}
                onChange={(e) => setModeData({ ...modeData, params: e.target.value })}
                placeholder={t('channelDetail.modals.setMode.parameters')}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Kick Modal */}
      <Modal
        isOpen={showKickModal}
        onClose={() => setShowKickModal(false)}
        title={t('channelDetail.modals.kickUser.title', { user: kickData.nick, channel: channel.name })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowKickModal(false)}>{t('common.cancel')}</Button>
            <Button
              variant="danger"
              onClick={() => kickMutation.mutate({
                channel: channel.name,
                nick: kickData.nick,
                reason: kickData.reason || undefined,
              })}
              isLoading={kickMutation.isPending}
            >
              {t('channelDetail.modals.kickUser.kickUser')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('channelDetail.modals.kickUser.nickname')}
            value={kickData.nick}
            onChange={(e) => setKickData({ ...kickData, nick: e.target.value })}
            placeholder={t('channelDetail.modals.kickUser.enterNicknameToKick')}
          />
          <Input
            label={t('channelDetail.modals.kickUser.reasonOptional')}
            value={kickData.reason}
            onChange={(e) => setKickData({ ...kickData, reason: e.target.value })}
            placeholder={t('channelDetail.modals.kickUser.enterKickReason')}
          />
        </div>
      </Modal>

      {/* Add Ban Modal */}
      <Modal
        isOpen={showAddBanModal}
        onClose={() => setShowAddBanModal(false)}
        title={t('channelDetail.modals.addBan.title')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddBanModal(false)}>{t('common.cancel')}</Button>
            <Button
              variant="danger"
              onClick={handleAddBan}
              isLoading={setModeMutation.isPending}
            >
              {t('channelDetail.bans.addBan')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('channelDetail.bans.mask')}
            value={newBan.mask}
            onChange={(e) => setNewBan({ ...newBan, mask: e.target.value })}
            placeholder={t('channelDetail.bans.maskPlaceholder')}
            helperText={t('channelDetail.bans.useExtendedBans')}
          />
          <Input
            label={t('channelDetail.bans.durationMinutesOptional')}
            value={newBan.expiry}
            onChange={(e) => setNewBan({ ...newBan, expiry: e.target.value })}
            placeholder={t('channelDetail.bans.leaveEmptyForPermanent')}
            type="number"
          />
        </div>
      </Modal>

      {/* Add Invite Modal */}
      <Modal
        isOpen={showAddInviteModal}
        onClose={() => setShowAddInviteModal(false)}
        title={t('channelDetail.modals.addInvite.title')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddInviteModal(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={handleAddInvite}
              isLoading={setModeMutation.isPending}
            >
              {t('channelDetail.invites.addInvite')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('channelDetail.invites.mask')}
            value={newInvite.mask}
            onChange={(e) => setNewInvite({ ...newInvite, mask: e.target.value })}
            placeholder={t('channelDetail.invites.maskPlaceholder')}
          />
          <Input
            label={t('channelDetail.invites.durationMinutesOptional')}
            value={newInvite.expiry}
            onChange={(e) => setNewInvite({ ...newInvite, expiry: e.target.value })}
            placeholder={t('channelDetail.invites.leaveEmptyForPermanent')}
            type="number"
          />
        </div>
      </Modal>

      {/* Add Exception Modal */}
      <Modal
        isOpen={showAddExceptModal}
        onClose={() => setShowAddExceptModal(false)}
        title={t('channelDetail.modals.addExcept.title')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddExceptModal(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={handleAddExcept}
              isLoading={setModeMutation.isPending}
            >
              {t('channelDetail.excepts.addExcept')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('channelDetail.excepts.mask')}
            value={newExcept.mask}
            onChange={(e) => setNewExcept({ ...newExcept, mask: e.target.value })}
            placeholder={t('channelDetail.excepts.maskPlaceholder')}
          />
          <Input
            label={t('channelDetail.excepts.durationMinutesOptional')}
            value={newExcept.expiry}
            onChange={(e) => setNewExcept({ ...newExcept, expiry: e.target.value })}
            placeholder={t('channelDetail.excepts.leaveEmptyForPermanent')}
            type="number"
          />
        </div>
      </Modal>
    </div>
  )

  // List Entry Component for bans/invites/excepts
  function ListEntry({
    entry,
    onRemove,
  }: {
    entry: ChannelListEntry
    onRemove: () => void
  }) {
    return (
      <div className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg group">
        <div className="flex-1 min-w-0">
          <code className="text-[var(--text-primary)] text-sm break-all">{entry.name}</code>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {t('channelDetail.users.setBy', { user: entry.set_by })}
            {entry.set_at && <> {t('common.at')} {new Date(entry.set_at * 1000).toLocaleString()}</>}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="p-2 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
          title={t('channelDetail.users.removeTooltip')}
        >
          <Trash2 size={16} />
        </button>
      </div>
    )
  }
}
