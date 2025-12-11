import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks'
import { Layout } from '@/components/layout'
import { PageLoading } from '@/components/common'
import {
  LoginPage,
  DashboardPage,
  UsersPage,
  ChannelsPage,
  ServersPage,
  ServerBansPage,
  NameBansPage,
  BanExceptionsPage,
  SpamfiltersPage,
  LogsPage,
  LiveMapPage,
  TwoFactorPage,
  WatchListPage,
  PanelUsersPage,
  RolesPage,
  RPCServersPage,
  SettingsPage,
  WebhooksPage,
  SmtpSettingsPage,
  NotificationPreferencesPage,
} from '@/pages'
import StatsHistoryPage from '@/pages/debug/StatsHistoryPage'
import AnimationsDebugPage from '@/pages/debug/AnimationsDebugPage'
import StatisticsPage from '@/pages/StatisticsPage'
import UserDetailPage from '@/pages/UserDetailPage'
import ChannelDetailPage from '@/pages/ChannelDetailPage'
import { ScheduledCommandsPage } from '@/pages/ScheduledCommandsPage'
import { AlertRulesPage } from '@/pages/AlertRulesPage'
import { ChannelTemplatesPage } from '@/pages/ChannelTemplatesPage'
import { UserJourneyPage } from '@/pages/UserJourneyPage'
import { ComplianceReportsPage } from '@/pages/ComplianceReportsPage'
import TopologyPage from '@/pages/TopologyPage'
import TLSStatsPage from '@/pages/TLSStatsPage'
import FeedbackPage from '@/pages/FeedbackPage'
import ReportBuilderPage from '@/pages/ReportBuilderPage'
import DigestPage from '@/pages/DigestPage'
import MarketplacePage from '@/pages/MarketplacePage'
import PluginPage from '@/pages/PluginPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <PageLoading />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="statistics" element={<StatisticsPage />} />
        <Route path="live-map" element={<LiveMapPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:nick" element={<UserDetailPage />} />
        <Route path="channels" element={<ChannelsPage />} />
        <Route path="channels/:name" element={<ChannelDetailPage />} />
        <Route path="servers" element={<ServersPage />} />
        <Route path="topology" element={<TopologyPage />} />
        <Route path="tls" element={<TLSStatsPage />} />
        <Route path="feedback" element={<FeedbackPage />} />
        <Route path="reports" element={<ReportBuilderPage />} />
        <Route path="digest" element={<DigestPage />} />
        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="bans/server" element={<ServerBansPage />} />
        <Route path="bans/name" element={<NameBansPage />} />
        <Route path="bans/exceptions" element={<BanExceptionsPage />} />
        <Route path="spamfilters" element={<SpamfiltersPage />} />
        <Route path="watchlist" element={<WatchListPage />} />
        <Route path="scheduled-commands" element={<ScheduledCommandsPage />} />
        <Route path="alert-rules" element={<AlertRulesPage />} />
        <Route path="channel-templates" element={<ChannelTemplatesPage />} />
        <Route path="journey" element={<UserJourneyPage />} />
        <Route path="compliance" element={<ComplianceReportsPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/users" element={<PanelUsersPage />} />
        <Route path="settings/roles" element={<RolesPage />} />
        <Route path="settings/rpc" element={<RPCServersPage />} />
        <Route path="settings/webhooks" element={<WebhooksPage />} />
        <Route path="settings/smtp" element={<SmtpSettingsPage />} />
        <Route path="settings/notifications" element={<NotificationPreferencesPage />} />
        <Route path="settings/two-factor" element={<TwoFactorPage />} />
        <Route path="debug/stats-history" element={<StatsHistoryPage />} />
        <Route path="debug/animations" element={<AnimationsDebugPage />} />
        
        {/* Plugin routes - catch all plugin paths */}
        <Route path="plugins/*" element={<PluginPage />} />
      </Route>

      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
