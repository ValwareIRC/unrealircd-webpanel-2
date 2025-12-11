import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  EnvelopeIcon,
  CalendarDaysIcon,
  ClockIcon,
  ChartBarIcon,
  BellAlertIcon,
  UsersIcon,
  HashtagIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import digestService, { DigestSettings } from '../services/digestService';
import { Button, Badge, LoadingSpinner } from '@/components/common';

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const DigestPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'settings' | 'preview' | 'history'>('settings');
  const [previewPeriod, setPreviewPeriod] = useState('weekly');
  const [testEmail, setTestEmail] = useState('');

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['digestSettings'],
    queryFn: () => digestService.getSettings(),
  });

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['digestPreview', previewPeriod],
    queryFn: () => digestService.getPreview(previewPeriod),
    enabled: activeTab === 'preview',
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['digestHistory'],
    queryFn: () => digestService.getHistory(),
    enabled: activeTab === 'history',
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<DigestSettings>) => digestService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digestSettings'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: (email: string) => digestService.sendTestDigest(email),
  });

  const handleToggle = (field: keyof DigestSettings) => {
    if (settings) {
      updateMutation.mutate({ ...settings, [field]: !settings[field] });
    }
  };

  const handleChange = (field: keyof DigestSettings, value: string | number | boolean) => {
    if (settings) {
      updateMutation.mutate({ ...settings, [field]: value });
    }
  };

  const handleSendTest = () => {
    if (testEmail) {
      testMutation.mutate(testEmail);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Digest</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Configure automated email reports about your IRC network
          </p>
        </div>
        <div className="flex items-center gap-2">
          <EnvelopeIcon className="w-8 h-8 text-indigo-500" />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'settings', label: 'Settings', icon: ClockIcon },
            { id: 'preview', label: 'Preview', icon: DocumentTextIcon },
            { id: 'history', label: 'History', icon: CalendarDaysIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && settings && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Digest Configuration
            </h2>

            {/* Enable Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Enable Email Digest</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive periodic email summaries
                </p>
              </div>
              <button
                onClick={() => handleToggle('enabled')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={settings.email_address}
                onChange={(e) => handleChange('email_address', e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Frequency
              </label>
              <select
                value={settings.frequency}
                onChange={(e) => handleChange('frequency', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {/* Day of Week (for weekly) */}
            {settings.frequency === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Day of Week
                </label>
                <select
                  value={settings.day_of_week}
                  onChange={(e) => handleChange('day_of_week', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                >
                  {DAYS_OF_WEEK.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Time of Day */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time of Day
              </label>
              <input
                type="time"
                value={settings.time_of_day}
                onChange={(e) => handleChange('time_of_day', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Content Options */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Content to Include
            </h2>

            {[
              { key: 'include_stats', label: 'Network Statistics', icon: ChartBarIcon, desc: 'User counts, channels, messages' },
              { key: 'include_alerts', label: 'Security Alerts', icon: BellAlertIcon, desc: 'Important security events' },
              { key: 'include_users', label: 'User Activity', icon: UsersIcon, desc: 'New users, opers, bans' },
              { key: 'include_channels', label: 'Top Channels', icon: HashtagIcon, desc: 'Most active channels' },
              { key: 'include_logs', label: 'Log Summary', icon: DocumentTextIcon, desc: 'Recent log highlights' },
            ].map((option) => (
              <div
                key={option.key}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <option.icon className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{option.label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{option.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(option.key as keyof DigestSettings)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings[option.key as keyof DigestSettings] ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings[option.key as keyof DigestSettings] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}

            {/* Test Email */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Send Test Digest</h3>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@email.com"
                  className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                />
                <Button
                  variant="primary"
                  onClick={handleSendTest}
                  disabled={!testEmail || testMutation.isPending}
                >
                  <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                  {testMutation.isPending ? 'Sending...' : 'Send'}
                </Button>
              </div>
              {testMutation.isSuccess && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                  ✓ {testMutation.data?.message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Tab */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          {/* Period Selector */}
          <div className="flex gap-2">
            {['daily', 'weekly', 'monthly'].map((period) => (
              <Button
                key={period}
                variant={previewPeriod === period ? 'primary' : 'secondary'}
                onClick={() => setPreviewPeriod(period)}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Button>
            ))}
          </div>

          {previewLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : preview ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              {/* Email Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
                <h2 className="text-xl font-bold">Your IRC Network {preview.period} Digest</h2>
                <p className="text-indigo-100 mt-1">
                  {formatDate(preview.start_date)} - {formatDate(preview.end_date)}
                </p>
              </div>

              {/* Stats Overview */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Network Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Users</span>
                      {preview.stats.user_change > 0 ? (
                        <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                      ) : (
                        <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {preview.stats.total_users.toLocaleString()}
                    </p>
                    <p className={`text-sm ${preview.stats.user_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {preview.stats.user_change >= 0 ? '+' : ''}{preview.stats.user_change} ({preview.stats.user_change_percent.toFixed(1)}%)
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-500 dark:text-gray-400">Channels</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {preview.stats.total_channels.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">+{preview.stats.channel_change} new</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-500 dark:text-gray-400">Peak Users</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {preview.stats.peak_users.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">{preview.stats.peak_time}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-500 dark:text-gray-400">Uptime</p>
                    <p className="text-2xl font-bold text-green-600">{preview.stats.uptime}</p>
                    <p className="text-sm text-gray-500">This period</p>
                  </div>
                </div>
              </div>

              {/* Highlights */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Highlights</h3>
                <ul className="space-y-2">
                  {preview.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Alerts */}
              {preview.alerts.length > 0 && (
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Security Alerts</h3>
                  <div className="space-y-3">
                    {preview.alerts.map((alert, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-3 p-3 rounded-lg ${
                          alert.severity === 'high' ? 'bg-red-50 dark:bg-red-900/20' :
                          alert.severity === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                          'bg-blue-50 dark:bg-blue-900/20'
                        }`}
                      >
                        {alert.severity === 'high' ? (
                          <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                        ) : alert.severity === 'medium' ? (
                          <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
                        ) : (
                          <InformationCircleIcon className="w-5 h-5 text-blue-500" />
                        )}
                        <div>
                          <p className="text-gray-900 dark:text-white">{alert.message}</p>
                          <p className="text-sm text-gray-500">{formatDate(alert.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Channels */}
              {preview.top_channels.length > 0 && (
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Top Channels</h3>
                  <div className="space-y-2">
                    {preview.top_channels.map((channel, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{channel.name}</p>
                            <p className="text-sm text-gray-500 truncate max-w-xs">{channel.topic || 'No topic'}</p>
                          </div>
                        </div>
                        <Badge variant="info">{channel.users} users</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* User Activity */}
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">User Activity</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {preview.user_activity.new_users}
                    </p>
                    <p className="text-sm text-gray-500">New Users</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {preview.user_activity.active_opers}
                    </p>
                    <p className="text-sm text-gray-500">Active Opers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {preview.user_activity.bans_issued}
                    </p>
                    <p className="text-sm text-gray-500">Bans Issued</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {preview.user_activity.kicks_issued}
                    </p>
                    <p className="text-sm text-gray-500">Kicks Issued</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Digest History</h2>
            <p className="text-gray-500 dark:text-gray-400">Previously sent email digests</p>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner size="md" />
            </div>
          ) : history && history.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {history.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      item.status === 'delivered' ? 'bg-green-100 dark:bg-green-900/30' :
                      item.status === 'failed' ? 'bg-red-100 dark:bg-red-900/30' :
                      'bg-yellow-100 dark:bg-yellow-900/30'
                    }`}>
                      {item.status === 'delivered' ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      ) : item.status === 'failed' ? (
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                      ) : (
                        <ClockIcon className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.period.charAt(0).toUpperCase() + item.period.slice(1)} Digest
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(item.start_date)} - {formatDate(item.end_date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      item.status === 'delivered' ? 'success' :
                      item.status === 'failed' ? 'error' : 'warning'
                    }>
                      {item.status}
                    </Badge>
                    <p className="text-sm text-gray-500 mt-1">
                      Sent: {formatDate(item.sent_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <EnvelopeIcon className="w-12 h-12 mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">No digest history yet</p>
              <p className="text-sm text-gray-400">Digests will appear here after they're sent</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DigestPage;
