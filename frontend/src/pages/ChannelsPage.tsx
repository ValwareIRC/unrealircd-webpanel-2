import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIRCChannels, useSetChannelTopic, useSetChannelMode, useKickUser } from '@/hooks'
import { DataTable, Button, Modal, Input, Alert, Badge, SavedSearches } from '@/components/common'
import { Eye, Users, MessageSquare, Settings, UserMinus } from 'lucide-react'
import type { IRCChannel } from '@/types'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

export function ChannelsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: channels, isLoading, error } = useIRCChannels()
  const setTopic = useSetChannelTopic()
  const setMode = useSetChannelMode()
  const kickUser = useKickUser()

  const [selectedChannel, setSelectedChannel] = useState<IRCChannel | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showTopicModal, setShowTopicModal] = useState(false)
  const [showModeModal, setShowModeModal] = useState(false)
  const [showKickModal, setShowKickModal] = useState(false)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  const [newTopic, setNewTopic] = useState('')
  const [modeData, setModeData] = useState({ modes: '', params: '' })
  const [kickData, setKickData] = useState({ nick: '', reason: '' })

  const columns = [
    {
      key: 'name',
      header: t('channels.channel'),
      sortable: true,
      render: (channel: IRCChannel) => (
        <button
          onClick={() => navigate(`/channels/${encodeURIComponent(channel.name)}`)}
          className="text-[var(--text-primary)] font-medium hover:text-[var(--accent)] transition-colors cursor-pointer"
        >
          {channel.name}
        </button>
      ),
    },
    {
      key: 'num_users',
      header: t('channels.users'),
      sortable: true,
      render: (channel: IRCChannel) => (
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <Users size={14} className="text-[var(--text-muted)]" />
          {channel.num_users}
        </div>
      ),
    },
    {
      key: 'topic',
      header: t('channels.topic'),
      render: (channel: IRCChannel) => (
        <span className="text-[var(--text-muted)] truncate max-w-md block">
          {channel.topic || <span className="italic">{t('channels.noTopicSet')}</span>}
        </span>
      ),
    },
    {
      key: 'modes',
      header: t('channels.modes'),
      render: (channel: IRCChannel) => (
        <span className="text-[var(--text-muted)] font-mono text-sm">
          +{channel.modes || 'nt'}
        </span>
      ),
    },
    {
      key: 'creation_time',
      header: t('channels.created'),
      sortable: true,
      render: (channel: IRCChannel) => (
        <span className="text-[var(--text-muted)]">
          {channel.creation_time
            ? new Date(channel.creation_time * 1000).toLocaleDateString()
            : t('channels.unknown')}
        </span>
      ),
    },
  ]

  const handleSetTopic = async () => {
    if (!selectedChannel) return
    try {
      await setTopic.mutateAsync({
        channel: selectedChannel.name,
        topic: newTopic,
      })
      toast.success(t('channels.topicUpdated'))
      setShowTopicModal(false)
      setSelectedChannel(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('channels.topicUpdateFailed')
      toast.error(message)
    }
  }

  const handleSetMode = async () => {
    if (!selectedChannel) return
    try {
      await setMode.mutateAsync({
        channel: selectedChannel.name,
        modes: modeData.modes,
        params: modeData.params || undefined,
      })
      toast.success(t('channels.modeChanged'))
      setShowModeModal(false)
      setSelectedChannel(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('channels.modeChangeFailed')
      toast.error(message)
    }
  }

  const handleKickUser = async () => {
    if (!selectedChannel) return
    try {
      await kickUser.mutateAsync({
        channel: selectedChannel.name,
        nick: kickData.nick,
        reason: kickData.reason || undefined,
      })
      toast.success(t('channels.userKicked', { nick: kickData.nick, channel: selectedChannel.name }))
      setShowKickModal(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('channels.kickFailed')
      toast.error(message)
    }
  }

  if (error) {
    return (
      <Alert type="error">
        {t('channels.loadError', { error: error instanceof Error ? error.message : 'Unknown error' })}
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('channels.title')}</h1>
        <p className="text-[var(--text-muted)] mt-1">{t('channels.subtitle')}</p>
      </div>

      <DataTable
        data={channels || []}
        columns={columns}
        keyField="name"
        isLoading={isLoading}
        searchPlaceholder={t('channels.searchPlaceholder')}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchExtra={
          <SavedSearches
            page="channels"
            currentQuery={searchQuery}
            onApplySearch={(query) => setSearchQuery(query)}
          />
        }
        actions={(channel) => (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/channels/${encodeURIComponent(channel.name)}`)}
              title={t('channels.viewDetails')}
            >
              <Eye size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedChannel(channel)
                setNewTopic(channel.topic || '')
                setShowTopicModal(true)
              }}
            >
              <MessageSquare size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedChannel(channel)
                setModeData({ modes: '', params: '' })
                setShowModeModal(true)
              }}
            >
              <Settings size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedChannel(channel)
                setKickData({ nick: '', reason: '' })
                setShowKickModal(true)
              }}
            >
              <UserMinus size={16} />
            </Button>
          </>
        )}
      />

      {/* Channel Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={t('channels.channelDetails', { name: selectedChannel?.name })}
        size="lg"
      >
        {selectedChannel && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--text-muted)]">{t('channels.channelName')}</p>
                <p className="text-[var(--text-primary)]">{selectedChannel.name}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">{t('channels.users')}</p>
                <p className="text-[var(--text-primary)]">{selectedChannel.num_users}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">{t('channels.modes')}</p>
                <p className="text-[var(--text-primary)] font-mono">+{selectedChannel.modes || 'nt'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">{t('channels.created')}</p>
                <p className="text-[var(--text-primary)]">
                  {selectedChannel.creation_time
                    ? new Date(selectedChannel.creation_time * 1000).toLocaleString()
                    : t('channels.unknown')}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-[var(--text-muted)] mb-1">{t('channels.topic')}</p>
              <p className="text-[var(--text-primary)] bg-[var(--bg-tertiary)] p-3 rounded-lg">
                {selectedChannel.topic || <span className="text-[var(--text-muted)] italic">{t('channels.noTopicSet')}</span>}
              </p>
              {selectedChannel.topic_set_by && (
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  {selectedChannel.topic_set_at 
                    ? t('channels.setByAt', { 
                        user: selectedChannel.topic_set_by, 
                        time: new Date(selectedChannel.topic_set_at * 1000).toLocaleString() 
                      })
                    : t('channels.setBy', { user: selectedChannel.topic_set_by })
                  }
                </p>
              )}
            </div>

            {selectedChannel.members && selectedChannel.members.length > 0 && (
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-2">{t('channels.members')}</p>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {selectedChannel.members.map((member) => (
                    <Badge
                      key={member.id}
                      variant={member.level?.includes('o') ? 'warning' : 'default'}
                    >
                      {member.level}
                      {member.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedChannel.bans && selectedChannel.bans.length > 0 && (
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-2">{t('channels.bans')}</p>
                <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg space-y-1 max-h-32 overflow-y-auto">
                  {selectedChannel.bans.map((ban, idx) => (
                    <p key={idx} className="text-[var(--text-secondary)] font-mono text-sm">
                      {t('channels.banEntry', { name: ban.name, setBy: ban.set_by })}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Topic Modal */}
      <Modal
        isOpen={showTopicModal}
        onClose={() => setShowTopicModal(false)}
        title={t('channels.setTopicTitle', { name: selectedChannel?.name })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowTopicModal(false)}>
              {t('channels.cancel')}
            </Button>
            <Button onClick={handleSetTopic} isLoading={setTopic.isPending}>
              {t('channels.setTopic')}
            </Button>
          </>
        }
      >
        <Input
          label={t('channels.topic')}
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          placeholder={t('channels.enterNewTopic')}
        />
      </Modal>

      {/* Mode Modal */}
      <Modal
        isOpen={showModeModal}
        onClose={() => setShowModeModal(false)}
        title={t('channels.setModeTitle', { name: selectedChannel?.name })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModeModal(false)}>
              {t('channels.cancel')}
            </Button>
            <Button onClick={handleSetMode} isLoading={setMode.isPending}>
              {t('channels.setMode')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('channels.modes')}
            value={modeData.modes}
            onChange={(e) => setModeData({ ...modeData, modes: e.target.value })}
            placeholder={t('channels.modePlaceholder')}
          />
          <Input
            label={t('channels.parametersOptional')}
            value={modeData.params}
            onChange={(e) => setModeData({ ...modeData, params: e.target.value })}
            placeholder={t('channels.parametersPlaceholder')}
            helperText={t('channels.parametersHelper')}
          />
          <div className="text-sm text-[var(--text-muted)]">
            <p className="font-medium mb-2">{t('channels.currentModes')}</p>
            <p className="font-mono bg-[var(--bg-tertiary)] p-2 rounded">
              +{selectedChannel?.modes || 'nt'}
            </p>
          </div>
        </div>
      </Modal>

      {/* Kick Modal */}
      <Modal
        isOpen={showKickModal}
        onClose={() => setShowKickModal(false)}
        title={t('channels.kickUserTitle', { name: selectedChannel?.name })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowKickModal(false)}>
              {t('channels.cancel')}
            </Button>
            <Button variant="danger" onClick={handleKickUser} isLoading={kickUser.isPending}>
              {t('channels.kickUser')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('channels.nickname')}
            value={kickData.nick}
            onChange={(e) => setKickData({ ...kickData, nick: e.target.value })}
            placeholder={t('channels.enterNickname')}
          />
          <Input
            label={t('channels.reasonOptional')}
            value={kickData.reason}
            onChange={(e) => setKickData({ ...kickData, reason: e.target.value })}
            placeholder={t('channels.enterKickReason')}
          />
        </div>
      </Modal>
    </div>
  )
}
