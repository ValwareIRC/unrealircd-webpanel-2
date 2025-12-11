// User types
export interface User {
  id: number
  username: string
  email?: string
  first_name?: string
  last_name?: string
  role?: Role
  role_id: number
  bio?: string
  created_at?: string
  last_login?: string
}

export interface LoginResponse {
  token?: string
  refresh_token?: string
  expires_at?: string
  user?: User
  password_warning?: string
  requires_2fa?: boolean
}

// IRC User types
export interface IRCUser {
  id: string
  name: string
  hostname: string
  ip: string
  realname: string
  vhost?: string
  username: string
  connected_since: number
  idle: number
  channels?: string[]
  server: string
  server_name?: string
  modes?: string
  oper_login?: string
  oper_class?: string
  account?: string
  tls?: Record<string, unknown>
  geoip?: {
    country_code?: string
    country_name?: string
  }
  client_info?: Record<string, unknown>
  security_groups?: string[]
  reputation?: number
}

// IRC Channel types
export interface IRCChannel {
  name: string
  creation_time: number
  num_users: number
  topic?: string
  topic_set_by?: string
  topic_set_at?: number
  modes?: string
  mode_params?: Record<string, unknown>
  members?: ChannelMember[]
  bans?: ChannelListEntry[]
  invites?: ChannelListEntry[]
  excepts?: ChannelListEntry[]
}

export interface ChannelMember {
  id: string
  name: string
  level: string
  modes?: string
}

export interface ChannelListEntry {
  name: string
  mask?: string
  set_by: string
  set_at: number
}

// IRC Server types
export interface IRCServer {
  id: string
  name: string
  uplink?: string
  num_users: number
  boot?: number
  synced_since?: number
  server_info?: string
  features?: ServerFeatures
  server?: ServerInfo
}

export interface ServerFeatures {
  software?: string
  protocol?: string
  nicklen?: number
  chanmodes?: string
  usermodes?: string
}

export interface ServerInfo {
  info?: string
  ulined?: boolean
  boot_time?: string | number  // ISO 8601 string (e.g. "2022-05-23T11:02:06.000Z") or Unix timestamp
  features?: ServerFeatures
}

// Ban types
export interface ServerBan {
  name: string
  type: string
  type_string?: string
  set_by?: string
  set_at?: number
  expire_at?: number
  duration?: string
  reason?: string
  set_at_string?: string
  expire_at_string?: string
}

export interface NameBan {
  name: string
  type?: string
  type_string?: string
  set_by?: string
  set_at?: number
  expire_at?: number
  duration?: string
  reason?: string
}

export interface BanException {
  name: string
  exception_types?: string
  set_by?: string
  set_at?: number
  expire_at?: number
  duration?: string
  reason?: string
}

export interface Spamfilter {
  name: string
  match_type: string
  spamfilter_targets: string
  targets?: string
  ban_action: string
  action?: string
  ban_duration?: string
  action_duration?: string
  set_by?: string
  set_at?: number
  reason?: string
  hits?: number
  hits_except?: number
}

// Stats types
export interface NetworkStats {
  users: number
  channels: number
  operators: number
  servers: number
  server_bans: number
}

// Role types
export interface Role {
  id: number
  name: string
  description: string
  is_super_admin: boolean
  permissions?: RolePermission[]
}

export interface RolePermission {
  id: number
  role_id: number
  permission: string
  name: string
}

export interface Permission {
  key?: string
  name: string
  description?: string
  category?: string
  // Legacy capitalized fields
  Key?: string
  Name?: string
  Description?: string
  Category?: string
}

// RPC Server types
export interface RPCServer {
  name: string
  host: string
  port: number
  rpc_user: string
  tls_verify_cert: boolean
  is_default: boolean
  is_active?: boolean
  is_connected?: boolean
  connected?: boolean
}

// API Response types
export interface ApiError {
  error: string
}

export interface ApiSuccess {
  message: string
}

// Webhook types
export interface WebhookToken {
  id: number
  created_at: string
  updated_at: string
  name: string
  token: string
  description: string
  created_by: number
  created_by_username: string
  last_used_at?: string
  use_count: number
  enabled: boolean
}

export interface WebhookLog {
  id: number
  created_at: string
  token_id: number
  token_name: string
  event_type: string
  subsystem: string
  event_id: string
  level: string
  message: string
  raw_payload: string
  source_ip: string
}

export interface WebhookConfigResponse {
  token: WebhookToken
  webhook_url: string
  config: string
}

// SMTP Settings types
export interface SmtpSettings {
  id?: number
  updated_at?: string
  host: string
  port: number
  username: string
  password?: string
  from_address: string
  from_name: string
  use_tls: boolean
  use_starttls: boolean
  enabled: boolean
}

export interface SmtpSettingsResponse {
  configured: boolean
  settings?: SmtpSettings
}

export interface SmtpStatusResponse {
  configured: boolean
}

// Log types
export interface LogEntry {
  timestamp: string
  level: string
  subsystem: string
  event_id: string
  msg: string
  log_source?: string
  // Raw JSON for detailed view
  raw?: Record<string, unknown>
}

// Notification types
export interface NotificationEventType {
  type: string
  name: string
  description: string
  category: string
  high_volume: boolean
}

export interface NotificationPreferences {
  configured: boolean
  email: string
  enabled: boolean
  events: string[]
}
