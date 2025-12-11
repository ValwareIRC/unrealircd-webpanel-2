import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  History,
  Search,
  User,
  LogIn,
  LogOut,
  Edit,
  UserPlus,
  UserMinus,
  UserX,
  Shield,
  ShieldOff,
  Settings,
  MessageSquare,
  Ban,
  Check,
  Skull,
  Filter,
} from 'lucide-react'
import {
  getUserJourney,
  getJourneyStats,
  getJourneyEventTypes,
  parseEventDetails,
  eventTypeColors,
  type UserJourneyEvent,
  type EventTypeInfo,
} from '@/services/journeyService'
import { Button, Input, Modal, Select, Badge } from '@/components/common'

// Icon mapping
const eventIcons: Record<string, React.ElementType> = {
  connect: LogIn,
  disconnect: LogOut,
  nick_change: Edit,
  account_login: User,
  join: UserPlus,
  part: UserMinus,
  kick: UserX,
  ban: Ban,
  unban: Check,
  kill: Skull,
  oper: Shield,
  deoper: ShieldOff,
  mode_change: Settings,
  message: MessageSquare,
}

export function UserJourneyPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [showSearchModal, setShowSearchModal] = useState(false)

  // Query params
  const nick = searchParams.get('nick') || ''
  const ip = searchParams.get('ip') || ''
  const account = searchParams.get('account') || ''
  const hours = parseInt(searchParams.get('hours') || '168')

  // Search form state
  const [searchNick, setSearchNick] = useState(nick)
  const [searchIP, setSearchIP] = useState(ip)
  const [searchAccount, setSearchAccount] = useState(account)
  const [searchHours, setSearchHours] = useState(hours)
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([])

  const hasSearchParams = nick || ip || account

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['userJourney', nick, ip, account, hours],
    queryFn: () => getUserJourney({ nick, ip, account, hours }),
    enabled: Boolean(hasSearchParams),
  })

  const { data: stats } = useQuery({
    queryKey: ['journeyStats'],
    queryFn: () => getJourneyStats(),
  })

  const { data: eventTypes = [] } = useQuery({
    queryKey: ['journeyEventTypes'],
    queryFn: () => getJourneyEventTypes(),
  })

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (searchNick) params.set('nick', searchNick)
    if (searchIP) params.set('ip', searchIP)
    if (searchAccount) params.set('account', searchAccount)
    if (searchHours !== 168) params.set('hours', searchHours.toString())
    setSearchParams(params)
    setShowSearchModal(false)
  }

  const getEventIcon = (eventType: string) => {
    const Icon = eventIcons[eventType] || MessageSquare
    return Icon
  }

  const getEventColor = (eventType: string) => {
    return eventTypeColors[eventType] || 'bg-gray-500'
  }

  // Group events by date
  const groupedEvents = events.reduce((acc: Record<string, UserJourneyEvent[]>, event: UserJourneyEvent) => {
    const date = new Date(event.created_at).toLocaleDateString()
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(event)
    return acc
  }, {} as Record<string, UserJourneyEvent[]>)

  // Filter events by selected types
  const filteredGroupedEvents = Object.entries(groupedEvents).reduce((acc: Record<string, UserJourneyEvent[]>, [date, dateEvents]) => {
    const filtered = selectedEventTypes.length > 0
      ? dateEvents.filter((e: UserJourneyEvent) => selectedEventTypes.includes(e.event_type))
      : dateEvents
    if (filtered.length > 0) {
      acc[date] = filtered
    }
    return acc
  }, {} as Record<string, UserJourneyEvent[]>)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="text-[var(--accent)]" size={24} />
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">User Journey</h1>
            <p className="text-sm text-[var(--text-secondary)]">Track and analyze user activity history with a detailed timeline</p>
          </div>
        </div>
        <Button onClick={() => setShowSearchModal(true)}>
          <Search size={16} className="mr-2" />
          Search User
        </Button>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.activity.hour}</div>
            <div className="text-sm text-[var(--text-secondary)]">Events (Last Hour)</div>
          </div>
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.activity.day}</div>
            <div className="text-sm text-[var(--text-secondary)]">Events (24h)</div>
          </div>
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.activity.week}</div>
            <div className="text-sm text-[var(--text-secondary)]">Events (7d)</div>
          </div>
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            <div className="text-2xl font-bold text-[var(--accent)]">{stats.unique_users}</div>
            <div className="text-sm text-[var(--text-secondary)]">Unique Users (24h)</div>
          </div>
        </div>
      )}

      {/* Search Results or Empty State */}
      {!hasSearchParams ? (
        <div className="p-8 text-center bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
          <History size={48} className="mx-auto text-[var(--text-secondary)] mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Search for a User</h3>
          <p className="text-[var(--text-secondary)] mb-4">
            Enter a nickname, IP address, or account name to view their activity timeline.
          </p>
          <Button onClick={() => setShowSearchModal(true)}>
            <Search size={16} className="mr-2" />
            Start Search
          </Button>
        </div>
      ) : (
        <>
          {/* Current Search Info */}
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-[var(--text-secondary)]">Showing events for:</span>
                {nick && <Badge variant="default">Nick: {nick}</Badge>}
                {ip && <Badge variant="default">IP: {ip}</Badge>}
                {account && <Badge variant="default">Account: {account}</Badge>}
                <Badge variant="secondary">Last {hours} hours</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--text-secondary)]">{events.length} events</span>
                <Button variant="ghost" size="sm" onClick={() => setShowSearchModal(true)}>
                  <Edit size={14} className="mr-1" />
                  Modify
                </Button>
              </div>
            </div>
          </div>

          {/* Event Type Filter */}
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={16} className="text-[var(--text-secondary)]" />
              <span className="text-sm text-[var(--text-secondary)]">Filter:</span>
              <Button
                variant={selectedEventTypes.length === 0 ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedEventTypes([])}
              >
                All
              </Button>
              {eventTypes.map((type: EventTypeInfo) => {
                const Icon = getEventIcon(type.type)
                const isSelected = selectedEventTypes.includes(type.type)
                return (
                  <span key={type.type} title={type.description}>
                    <Button
                      variant={isSelected ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedEventTypes(selectedEventTypes.filter((t: string) => t !== type.type))
                        } else {
                          setSelectedEventTypes([...selectedEventTypes, type.type])
                        }
                      }}
                    >
                      <Icon size={14} className="mr-1" />
                      {type.type}
                    </Button>
                  </span>
                )
              })}
            </div>
          </div>

          {/* Timeline */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
            </div>
          ) : Object.keys(filteredGroupedEvents).length === 0 ? (
            <div className="p-8 text-center text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
              No events found for this user.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(filteredGroupedEvents).map(([date, dateEvents]) => (
                <div key={date}>
                  <div className="sticky top-0 z-10 bg-[var(--bg-primary)] py-2">
                    <h3 className="text-sm font-medium text-[var(--text-secondary)]">{date}</h3>
                  </div>
                  <div className="relative ml-4 border-l-2 border-[var(--border-primary)] pl-6 space-y-4">
                    {dateEvents.map((event: UserJourneyEvent) => {
                      const Icon = getEventIcon(event.event_type)
                      const details = parseEventDetails(event)
                      return (
                        <div key={event.id} className="relative">
                          {/* Timeline dot */}
                          <div
                            className={`absolute -left-[31px] w-4 h-4 rounded-full ${getEventColor(event.event_type)} flex items-center justify-center`}
                          >
                            <Icon size={10} className="text-white" />
                          </div>

                          <div className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-[var(--text-primary)] capitalize">
                                    {event.event_type.replace('_', ' ')}
                                  </span>
                                  <span className="text-xs text-[var(--text-secondary)]">
                                    {new Date(event.created_at).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-sm text-[var(--text-secondary)]">
                                  {event.nick && (
                                    <span
                                      className="cursor-pointer hover:text-[var(--accent)]"
                                      onClick={() => navigate(`/users/${encodeURIComponent(event.nick)}`)}
                                    >
                                      Nick: {event.nick}
                                    </span>
                                  )}
                                  {event.ip && <span>IP: {event.ip}</span>}
                                  {event.account && <span>Account: {event.account}</span>}
                                  {event.server && <span>Server: {event.server}</span>}
                                </div>
                                {Object.keys(details).length > 0 && (
                                  <div className="mt-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded p-2">
                                    {Object.entries(details).map(([key, value]) => (
                                      <div key={key}>
                                        <span className="font-medium">{key}:</span> {String(value)}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Search Modal */}
      <Modal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} title="Search User Journey">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Enter at least one identifier to search for user activity:
          </p>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nickname</label>
            <Input
              value={searchNick}
              onChange={(e) => setSearchNick(e.target.value)}
              placeholder="Enter nickname"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">IP Address</label>
            <Input
              value={searchIP}
              onChange={(e) => setSearchIP(e.target.value)}
              placeholder="Enter IP address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Account Name</label>
            <Input
              value={searchAccount}
              onChange={(e) => setSearchAccount(e.target.value)}
              placeholder="Enter account name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Time Range</label>
            <Select value={searchHours.toString()} onChange={(e) => setSearchHours(parseInt(e.target.value))}>
              <option value="24">Last 24 hours</option>
              <option value="72">Last 3 days</option>
              <option value="168">Last week</option>
              <option value="336">Last 2 weeks</option>
              <option value="720">Last 30 days</option>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowSearchModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSearch}
              disabled={!searchNick && !searchIP && !searchAccount}
            >
              <Search size={16} className="mr-2" />
              Search
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
