import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, Button } from '@/components/common'
import { 
  Bell, 
  ArrowLeft,
  AlertTriangle,
  Mail,
  Info
} from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '@/services/api'
import type { NotificationEventType, NotificationPreferences, SmtpStatusResponse } from '@/types'

export function NotificationPreferencesPage() {
  const queryClient = useQueryClient()
  
  // Form state
  const [email, setEmail] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // Check if SMTP is configured
  const { data: smtpStatus } = useQuery({
    queryKey: ['smtp-status'],
    queryFn: async (): Promise<SmtpStatusResponse> => {
      const res = await api.get<SmtpStatusResponse>('/smtp/status')
      return res.data
    },
  })

  // Fetch event types
  const { data: eventTypes } = useQuery({
    queryKey: ['notification-event-types'],
    queryFn: async (): Promise<NotificationEventType[]> => {
      const res = await api.get<NotificationEventType[]>('/notifications/event-types')
      return res.data
    },
  })

  // Fetch user preferences
  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async (): Promise<NotificationPreferences> => {
      const res = await api.get<NotificationPreferences>('/notifications/preferences')
      return res.data
    },
  })

  // Populate form when data is loaded
  useEffect(() => {
    if (preferences) {
      setEmail(preferences.email || '')
      setEnabled(preferences.enabled || false)
      setSelectedEvents(preferences.events || [])
      setHasChanges(false)
    }
  }, [preferences])

  // Save preferences mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { email: string; enabled: boolean; events: string[] }) => {
      const res = await api.put('/notifications/preferences', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
      setHasChanges(false)
      toast.success('Notification preferences saved')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Failed to save preferences'
      toast.error(message)
    },
  })

  const handleSave = () => {
    saveMutation.mutate({
      email,
      enabled,
      events: selectedEvents,
    })
  }

  const handleEventToggle = (eventType: string) => {
    setSelectedEvents(prev => {
      if (prev.includes(eventType)) {
        return prev.filter(e => e !== eventType)
      }
      return [...prev, eventType]
    })
    setHasChanges(true)
  }

  const handleSelectAll = (category: string) => {
    if (!eventTypes || !Array.isArray(eventTypes)) return
    
    const categoryEvents = eventTypes
      .filter(et => et.category === category)
      .map(et => et.type)
    
    const allSelected = categoryEvents.every(e => selectedEvents.includes(e))
    
    if (allSelected) {
      setSelectedEvents(prev => prev.filter(e => !categoryEvents.includes(e)))
    } else {
      setSelectedEvents(prev => [...new Set([...prev, ...categoryEvents])])
    }
    setHasChanges(true)
  }

  const markChanged = () => {
    setHasChanges(true)
  }

  // Group events by category - ensure eventTypes is an array
  const eventTypesArray = Array.isArray(eventTypes) ? eventTypes : []
  const eventsByCategory = eventTypesArray.reduce((acc, et) => {
    if (!acc[et.category]) {
      acc[et.category] = []
    }
    acc[et.category].push(et)
    return acc
  }, {} as Record<string, NotificationEventType[]>)

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert type="error">
          Failed to load notification preferences: {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          to="/settings" 
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Bell className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Email Notifications</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Get notified about important IRC events via email
            </p>
          </div>
        </div>
      </div>

      {/* SMTP Not Configured Warning */}
      {!smtpStatus?.configured && (
        <Alert type="warning">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Email notifications are not available</p>
              <p className="text-sm">
                An administrator needs to configure SMTP settings before email notifications can be sent.
              </p>
            </div>
          </div>
        </Alert>
      )}

      {/* Settings Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold">Notification Settings</h2>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Enable/Disable Master Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium">Enable Email Notifications</p>
                <p className="text-sm text-gray-500">
                  Receive emails when selected events occur on your IRC network
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => { setEnabled(e.target.checked); markChanged() }}
                disabled={!smtpStatus?.configured}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            </label>
          </div>

          {/* Email Override */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); markChanged() }}
              placeholder="Leave blank to use your account email"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              disabled={!smtpStatus?.configured}
            />
            <p className="text-xs text-gray-500 mt-1">
              Optionally specify a different email address for notifications
            </p>
          </div>

          {/* Event Selection */}
          <div className="space-y-4">
            <h3 className="font-medium">Event Types</h3>
            <p className="text-sm text-gray-500">
              Select which events should trigger email notifications
            </p>

            {Object.entries(eventsByCategory).map(([category, events]) => {
              const categoryEvents = events.map(e => e.type)
              const allSelected = categoryEvents.every(e => selectedEvents.includes(e))
              
              return (
                <div 
                  key={category} 
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  {/* Category Header */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
                    <span className="font-medium">{category}</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAll(category)}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      disabled={!smtpStatus?.configured}
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  
                  {/* Events */}
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {events.map(event => (
                      <label 
                        key={event.type}
                        className={`flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-900/30 cursor-pointer ${
                          !smtpStatus?.configured ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(event.type)}
                          onChange={() => handleEventToggle(event.type)}
                          disabled={!smtpStatus?.configured}
                          className="mt-1 w-4 h-4 text-blue-600 rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{event.name}</span>
                            {event.high_volume && (
                              <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
                                High Volume
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{event.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* High Volume Warning */}
          {selectedEvents.some(e => eventTypesArray.find(et => et.type === e)?.high_volume) && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-700 dark:text-yellow-300">
                    High Volume Events Selected
                  </p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    You have selected events that can generate a large number of emails on busy networks.
                    Consider carefully before enabling these notifications.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending || !smtpStatus?.configured}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-700 dark:text-blue-300">
              How Email Notifications Work
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              Email notifications are triggered by UnrealIRCd log events received via webhooks.
              An administrator must configure both SMTP settings and webhook tokens for this feature to work.
              Events are processed in real-time and emails are sent immediately when selected events occur.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
