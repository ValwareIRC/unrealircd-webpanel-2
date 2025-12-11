import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIRCChannels, useSetChannelTopic, useSetChannelMode, useKickUser } from '@/hooks'
import { DataTable, Button, Modal, Input, Alert, Badge, SavedSearches } from '@/components/common'
import { Eye, Users, MessageSquare, Settings, UserMinus } from 'lucide-react'
import type { IRCChannel } from '@/types'
import toast from 'react-hot-toast'

export function ChannelsPage() {
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
      header: 'Channel',
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
      header: 'Users',
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
      header: 'Topic',
      render: (channel: IRCChannel) => (
        <span className="text-[var(--text-muted)] truncate max-w-md block">
          {channel.topic || <span className="italic">No topic set</span>}
        </span>
      ),
    },
    {
      key: 'modes',
      header: 'Modes',
      render: (channel: IRCChannel) => (
        <span className="text-[var(--text-muted)] font-mono text-sm">
          +{channel.modes || 'nt'}
        </span>
      ),
    },
    {
      key: 'creation_time',
      header: 'Created',
      sortable: true,
      render: (channel: IRCChannel) => (
        <span className="text-[var(--text-muted)]">
          {channel.creation_time
            ? new Date(channel.creation_time * 1000).toLocaleDateString()
            : 'Unknown'}
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
      toast.success('Topic updated')
      setShowTopicModal(false)
      setSelectedChannel(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to set topic'
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
      toast.success('Mode changed')
      setShowModeModal(false)
      setSelectedChannel(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to set mode'
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
      toast.success(`Kicked ${kickData.nick} from ${selectedChannel.name}`)
      setShowKickModal(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to kick user'
      toast.error(message)
    }
  }

  if (error) {
    return (
      <Alert type="error">
        Failed to load channels: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Channels</h1>
        <p className="text-[var(--text-muted)] mt-1">Manage channels on the network</p>
      </div>

      <DataTable
        data={channels || []}
        columns={columns}
        keyField="name"
        isLoading={isLoading}
        searchPlaceholder="Search channels by name, topic..."
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
              title="View Details"
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
        title={`Channel: ${selectedChannel?.name}`}
        size="lg"
      >
        {selectedChannel && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Channel Name</p>
                <p className="text-[var(--text-primary)]">{selectedChannel.name}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Users</p>
                <p className="text-[var(--text-primary)]">{selectedChannel.num_users}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Modes</p>
                <p className="text-[var(--text-primary)] font-mono">+{selectedChannel.modes || 'nt'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Created</p>
                <p className="text-[var(--text-primary)]">
                  {selectedChannel.creation_time
                    ? new Date(selectedChannel.creation_time * 1000).toLocaleString()
                    : 'Unknown'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-[var(--text-muted)] mb-1">Topic</p>
              <p className="text-[var(--text-primary)] bg-[var(--bg-tertiary)] p-3 rounded-lg">
                {selectedChannel.topic || <span className="text-[var(--text-muted)] italic">No topic set</span>}
              </p>
              {selectedChannel.topic_set_by && (
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Set by {selectedChannel.topic_set_by}
                  {selectedChannel.topic_set_at && (
                    <> at {new Date(selectedChannel.topic_set_at * 1000).toLocaleString()}</>
                  )}
                </p>
              )}
            </div>

            {selectedChannel.members && selectedChannel.members.length > 0 && (
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-2">Members</p>
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
                <p className="text-sm text-[var(--text-muted)] mb-2">Bans</p>
                <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg space-y-1 max-h-32 overflow-y-auto">
                  {selectedChannel.bans.map((ban, idx) => (
                    <p key={idx} className="text-[var(--text-secondary)] font-mono text-sm">
                      {ban.name} <span className="text-[var(--text-muted)]">by {ban.set_by}</span>
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
        title={`Set Topic: ${selectedChannel?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowTopicModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetTopic} isLoading={setTopic.isPending}>
              Set Topic
            </Button>
          </>
        }
      >
        <Input
          label="Topic"
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          placeholder="Enter new channel topic"
        />
      </Modal>

      {/* Mode Modal */}
      <Modal
        isOpen={showModeModal}
        onClose={() => setShowModeModal(false)}
        title={`Set Mode: ${selectedChannel?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModeModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetMode} isLoading={setMode.isPending}>
              Set Mode
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Modes"
            value={modeData.modes}
            onChange={(e) => setModeData({ ...modeData, modes: e.target.value })}
            placeholder="e.g., +nt or -o"
          />
          <Input
            label="Parameters (optional)"
            value={modeData.params}
            onChange={(e) => setModeData({ ...modeData, params: e.target.value })}
            placeholder="e.g., nickname"
            helperText="Parameters for modes that require them"
          />
          <div className="text-sm text-[var(--text-muted)]">
            <p className="font-medium mb-2">Current modes:</p>
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
        title={`Kick User from ${selectedChannel?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowKickModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleKickUser} isLoading={kickUser.isPending}>
              Kick User
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nickname"
            value={kickData.nick}
            onChange={(e) => setKickData({ ...kickData, nick: e.target.value })}
            placeholder="Enter nickname to kick"
          />
          <Input
            label="Reason (optional)"
            value={kickData.reason}
            onChange={(e) => setKickData({ ...kickData, reason: e.target.value })}
            placeholder="Enter kick reason"
          />
        </div>
      </Modal>
    </div>
  )
}
