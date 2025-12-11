package models

import (
	"time"

	"gorm.io/gorm"
)

// User represents a panel user
type User struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Username  string `gorm:"uniqueIndex;size:64" json:"username"`
	Email     string `gorm:"size:255" json:"email"`
	Password  string `gorm:"size:255" json:"-"`
	FirstName string `gorm:"size:64" json:"first_name"`
	LastName  string `gorm:"size:64" json:"last_name"`
	Bio       string `gorm:"type:text" json:"bio"`
	RoleID    uint   `json:"role_id"`

	// 2FA fields
	TwoFactorEnabled bool   `gorm:"default:false" json:"two_factor_enabled"`
	TwoFactorSecret  string `gorm:"size:64" json:"-"`
	TwoFactorBackup  string `gorm:"type:text" json:"-"` // JSON array of backup codes

	Role     *Role      `gorm:"foreignKey:RoleID" json:"role,omitempty"`
	Metadata []UserMeta `gorm:"foreignKey:UserID" json:"metadata,omitempty"`
}

// UserMeta represents user metadata key-value pairs
type UserMeta struct {
	ID     uint   `gorm:"primarykey" json:"id"`
	UserID uint   `gorm:"index" json:"user_id"`
	Key    string `gorm:"size:64;index" json:"key"`
	Value  string `gorm:"type:text" json:"value"`
}

// Role represents a user role with permissions
type Role struct {
	ID           uint   `gorm:"primarykey" json:"id"`
	Name         string `gorm:"uniqueIndex;size:64" json:"name"`
	Description  string `gorm:"size:255" json:"description"`
	IsSuperAdmin bool   `gorm:"default:false" json:"is_super_admin"`

	Permissions []RolePermission `gorm:"foreignKey:RoleID" json:"permissions,omitempty"`
}

// RolePermission represents a permission assigned to a role
type RolePermission struct {
	ID         uint   `gorm:"primarykey" json:"id"`
	RoleID     uint   `gorm:"index" json:"role_id"`
	Permission string `gorm:"size:64" json:"permission"`
}

// Setting represents a panel setting
type Setting struct {
	ID    uint   `gorm:"primarykey" json:"id"`
	Key   string `gorm:"uniqueIndex;size:128" json:"key"`
	Value string `gorm:"type:text" json:"value"`
}

// Note represents a user/ip/account note
type Note struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	CreatedBy string    `gorm:"size:64" json:"created_by"`
	Nick      string    `gorm:"size:64;index" json:"nick,omitempty"`
	IP        string    `gorm:"size:64;index" json:"ip,omitempty"`
	Account   string    `gorm:"size:64;index" json:"account,omitempty"`
	Note      string    `gorm:"type:text" json:"note"`
}

// Fail2Ban represents a failed login attempt
type Fail2Ban struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	IP        string    `gorm:"size:64;index" json:"ip"`
	Username  string    `gorm:"size:64" json:"username"`
	Timestamp time.Time `json:"timestamp"`
}

// Session represents an active user session
type Session struct {
	ID        string    `gorm:"primarykey;size:64" json:"id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
	IPAddress string    `gorm:"size:64" json:"ip_address"`
	UserAgent string    `gorm:"size:512" json:"user_agent"`
}

// AuditLog represents an audit log entry
type AuditLog struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UserID    uint      `gorm:"index" json:"user_id"`
	Username  string    `gorm:"size:64" json:"username"`
	Action    string    `gorm:"size:128" json:"action"`
	Details   string    `gorm:"type:text" json:"details"`
	IPAddress string    `gorm:"size:64" json:"ip_address"`
}

// WebhookToken represents a webhook receiver token for UnrealIRCd log blocks
type WebhookToken struct {
	ID                uint           `gorm:"primarykey" json:"id"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
	Name              string         `gorm:"size:128" json:"name"`               // Human-readable name for this webhook
	Token             string         `gorm:"uniqueIndex;size:64" json:"token"`   // Unique token for URL
	Description       string         `gorm:"type:text" json:"description"`       // Optional description
	CreatedBy         uint           `json:"created_by"`                         // User ID who created this token
	CreatedByUsername string         `gorm:"size:64" json:"created_by_username"` // Username for display
	LastUsedAt        *time.Time     `json:"last_used_at,omitempty"`             // When this webhook was last called
	UseCount          uint           `gorm:"default:0" json:"use_count"`         // Number of times this webhook was called
	Enabled           bool           `gorm:"default:true" json:"enabled"`        // Whether this webhook is active
}

// WebhookLog represents a received webhook event
type WebhookLog struct {
	ID         uint      `gorm:"primarykey" json:"id"`
	CreatedAt  time.Time `json:"created_at"`
	TokenID    uint      `gorm:"index" json:"token_id"`
	TokenName  string    `gorm:"size:128" json:"token_name"`
	EventType  string    `gorm:"size:64" json:"event_type"`    // e.g., "error", "fatal", "link"
	Subsystem  string    `gorm:"size:64" json:"subsystem"`     // UnrealIRCd subsystem
	EventID    string    `gorm:"size:128" json:"event_id"`     // UnrealIRCd event ID
	Level      string    `gorm:"size:32" json:"level"`         // Log level
	Message    string    `gorm:"type:text" json:"message"`     // Log message
	RawPayload string    `gorm:"type:text" json:"raw_payload"` // Raw JSON payload
	SourceIP   string    `gorm:"size:64" json:"source_ip"`     // IP that sent the webhook
}

// SmtpSettings represents SMTP configuration for sending emails
type SmtpSettings struct {
	ID          uint      `gorm:"primarykey" json:"id"`
	UpdatedAt   time.Time `json:"updated_at"`
	Host        string    `gorm:"size:255" json:"host"`         // SMTP server hostname
	Port        int       `json:"port"`                         // SMTP port (25, 465, 587)
	Username    string    `gorm:"size:255" json:"username"`     // SMTP username
	Password    string    `gorm:"size:255" json:"-"`            // SMTP password (not exposed in JSON)
	FromAddress string    `gorm:"size:255" json:"from_address"` // From email address
	FromName    string    `gorm:"size:128" json:"from_name"`    // From display name
	UseTLS      bool      `json:"use_tls"`                      // Use TLS/SSL
	UseStartTLS bool      `json:"use_starttls"`                 // Use STARTTLS
	Enabled     bool      `gorm:"default:false" json:"enabled"` // Whether email sending is enabled
}

// NotificationEventType represents a type of event that can trigger notifications
type NotificationEventType string

const (
	// Security events
	NotifyOperSuccess     NotificationEventType = "OPER_SUCCESS"
	NotifyOperFailed      NotificationEventType = "OPER_FAILED"
	NotifySpamfilterMatch NotificationEventType = "SPAMFILTER_MATCH"
	NotifyOperOverride    NotificationEventType = "OPEROVERRIDE"

	// Network events
	NotifyServerLinked     NotificationEventType = "SERVER_LINKED"
	NotifyLinkDisconnected NotificationEventType = "LINK_DISCONNECTED"
	NotifyLinkDenied       NotificationEventType = "LINK_DENIED"
	NotifyNickCollision    NotificationEventType = "NICK_COLLISION"

	// User events (high volume - disabled by default)
	NotifyClientConnect    NotificationEventType = "LOCAL_CLIENT_CONNECT"
	NotifyClientDisconnect NotificationEventType = "LOCAL_CLIENT_DISCONNECT"
	NotifyKillCommand      NotificationEventType = "KILL_COMMAND"

	// Ban events
	NotifyTklAdd    NotificationEventType = "TKL_ADD"
	NotifyTklDel    NotificationEventType = "TKL_DEL"
	NotifyTklExpire NotificationEventType = "TKL_EXPIRE"

	// Flood/Attack events
	NotifyFloodBlocked NotificationEventType = "FLOOD_BLOCKED"
	NotifyConnThrottle NotificationEventType = "CONNTHROTTLE_ACTIVATED"

	// System events
	NotifyConfigError  NotificationEventType = "CONFIG_ERROR"
	NotifyConfigLoaded NotificationEventType = "CONFIG_LOADED"
	NotifyCertExpiring NotificationEventType = "TLS_CERT_EXPIRING"
	NotifyRestarting   NotificationEventType = "UNREALIRCD_RESTARTING"
)

// NotificationEventTypes defines all available notification event types with metadata
var NotificationEventTypes = []struct {
	Type        NotificationEventType
	Name        string
	Description string
	Category    string
	HighVolume  bool // Warning: can generate many emails
}{
	// Security
	{NotifyOperSuccess, "Oper Success", "Someone successfully authenticated as an IRC Operator", "Security", false},
	{NotifyOperFailed, "Oper Failed", "Failed attempt to authenticate as an IRC Operator", "Security", false},
	{NotifySpamfilterMatch, "Spamfilter Match", "A spamfilter rule was triggered", "Security", false},
	{NotifyOperOverride, "Oper Override", "An IRC Operator used their override privileges", "Security", false},

	// Network
	{NotifyServerLinked, "Server Linked", "A server successfully linked to the network", "Network", false},
	{NotifyLinkDisconnected, "Server Disconnected", "A server disconnected from the network", "Network", false},
	{NotifyLinkDenied, "Link Denied", "A server link attempt was denied", "Network", false},
	{NotifyNickCollision, "Nick Collision", "A nickname collision occurred", "Network", false},

	// Users
	{NotifyClientConnect, "User Connected", "A user connected to the server (HIGH VOLUME)", "Users", true},
	{NotifyClientDisconnect, "User Disconnected", "A user disconnected from the server (HIGH VOLUME)", "Users", true},
	{NotifyKillCommand, "User Killed", "A user was killed by an operator", "Users", false},

	// Bans
	{NotifyTklAdd, "Ban Added", "A server ban (G-Line, K-Line, etc.) was added", "Bans", false},
	{NotifyTklDel, "Ban Removed", "A server ban was removed", "Bans", false},
	{NotifyTklExpire, "Ban Expired", "A server ban expired", "Bans", false},

	// Flood/Attacks
	{NotifyFloodBlocked, "Flood Blocked", "A flood attempt was blocked", "Flood Protection", false},
	{NotifyConnThrottle, "Connection Throttle", "Connection throttling was activated", "Flood Protection", false},

	// System
	{NotifyConfigError, "Config Error", "Configuration error occurred", "System", false},
	{NotifyConfigLoaded, "Config Loaded", "Configuration was successfully loaded/reloaded", "System", false},
	{NotifyCertExpiring, "Certificate Expiring", "TLS certificate is expiring soon", "System", false},
	{NotifyRestarting, "Server Restarting", "UnrealIRCd is restarting", "System", false},
}

// UserNotificationPreference represents a user's email notification settings
type UserNotificationPreference struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	UserID    uint           `gorm:"uniqueIndex" json:"user_id"`
	Email     string         `gorm:"size:255" json:"email"`       // Override email (if different from user email)
	Enabled   bool           `gorm:"default:true" json:"enabled"` // Master enable/disable for notifications
	Events    string         `gorm:"type:text" json:"events"`     // JSON array of enabled event types
}

// DashboardLayout represents a user's customized dashboard configuration
type DashboardLayout struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	UserID    uint           `gorm:"uniqueIndex" json:"user_id"`
	Layout    string         `gorm:"type:text" json:"layout"` // JSON array of widget positions and sizes
}

// DashboardWidget represents a single widget in the dashboard layout
type DashboardWidget struct {
	I      string `json:"i"`      // Widget ID (unique identifier)
	X      int    `json:"x"`      // X position in grid units
	Y      int    `json:"y"`      // Y position in grid units
	W      int    `json:"w"`      // Width in grid units
	H      int    `json:"h"`      // Height in grid units
	MinW   int    `json:"minW"`   // Minimum width
	MinH   int    `json:"minH"`   // Minimum height
	Type   string `json:"type"`   // Widget type (stats, chart, channels, servers, shortcuts, etc.)
	Config string `json:"config"` // JSON config specific to widget type
}

// WatchedUser represents a user being watched/monitored
type WatchedUser struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	// Match criteria - at least one should be set
	Nick     string `gorm:"size:64;index" json:"nick,omitempty"`    // Nickname pattern (supports wildcards)
	IP       string `gorm:"size:64;index" json:"ip,omitempty"`      // IP address or CIDR
	Host     string `gorm:"size:255;index" json:"host,omitempty"`   // Hostname pattern
	Account  string `gorm:"size:64;index" json:"account,omitempty"` // Account name
	Realname string `gorm:"size:255" json:"realname,omitempty"`     // Realname pattern
	// Metadata
	Reason          string     `gorm:"type:text" json:"reason"`          // Why this user is being watched
	AddedBy         uint       `json:"added_by"`                         // User ID who added this watch
	AddedByUsername string     `gorm:"size:64" json:"added_by_username"` // Username for display
	LastSeen        *time.Time `json:"last_seen,omitempty"`              // When user matching this pattern was last seen
	MatchCount      uint       `gorm:"default:0" json:"match_count"`     // Number of times matched
}

// SavedSearch represents a saved search query
type SavedSearch struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	UserID    uint           `gorm:"index" json:"user_id"`           // Owner of this saved search
	Name      string         `gorm:"size:128" json:"name"`           // Display name for the search
	Page      string         `gorm:"size:64" json:"page"`            // Which page this search applies to (users, channels, bans, etc.)
	Query     string         `gorm:"size:512" json:"query"`          // The search query string
	Filters   string         `gorm:"type:text" json:"filters"`       // JSON object of additional filters
	IsGlobal  bool           `gorm:"default:false" json:"is_global"` // If true, visible to all users
	UseCount  uint           `gorm:"default:0" json:"use_count"`     // How many times this search has been used
	LastUsed  *time.Time     `json:"last_used,omitempty"`            // When search was last used
}

// ScheduledCommand represents a scheduled IRC command
type ScheduledCommand struct {
	ID                uint           `gorm:"primarykey" json:"id"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
	Name              string         `gorm:"size:128" json:"name"`               // Display name for the scheduled command
	Description       string         `gorm:"size:512" json:"description"`        // Description of what the command does
	Command           string         `gorm:"size:64" json:"command"`             // IRC command type (kill, gline, message, etc.)
	Target            string         `gorm:"size:255" json:"target"`             // Target of the command (nick, channel, mask, etc.)
	Params            string         `gorm:"type:text" json:"params"`            // JSON object of command parameters
	Schedule          string         `gorm:"size:64" json:"schedule"`            // Cron expression or "once" for one-time
	RunAt             *time.Time     `json:"run_at,omitempty"`                   // For one-time commands, when to run
	IsEnabled         bool           `gorm:"default:true" json:"is_enabled"`     // Whether the schedule is active
	LastRun           *time.Time     `json:"last_run,omitempty"`                 // When the command last ran
	LastResult        string         `gorm:"size:255" json:"last_result"`        // Result of last execution
	NextRun           *time.Time     `json:"next_run,omitempty"`                 // When the command will next run
	RunCount          uint           `gorm:"default:0" json:"run_count"`         // Number of times executed
	CreatedBy         uint           `json:"created_by"`                         // User ID who created this
	CreatedByUsername string         `gorm:"size:64" json:"created_by_username"` // Username for display
}

// AlertRule represents a custom alert rule that triggers webhooks
type AlertRule struct {
	ID            uint           `gorm:"primarykey" json:"id"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
	Name          string         `gorm:"size:128" json:"name"`               // Display name
	Description   string         `gorm:"type:text" json:"description"`       // Description of the rule
	EventType     string         `gorm:"size:64;index" json:"event_type"`    // Event type to match (from webhook logs)
	Conditions    string         `gorm:"type:text" json:"conditions"`        // JSON array of conditions to match
	Actions       string         `gorm:"type:text" json:"actions"`           // JSON array of actions to take
	IsEnabled     bool           `gorm:"default:true" json:"is_enabled"`     // Whether the rule is active
	Priority      int            `gorm:"default:0" json:"priority"`          // Higher priority rules run first
	Cooldown      int            `gorm:"default:0" json:"cooldown"`          // Minimum seconds between triggers
	LastTriggered *time.Time     `json:"last_triggered,omitempty"`           // When this rule last triggered
	TriggerCount  uint           `gorm:"default:0" json:"trigger_count"`     // Number of times triggered
	CreatedBy     uint           `json:"created_by"`                         // User ID who created this
	CreatedByUser string         `gorm:"size:64" json:"created_by_username"` // Username for display
}

// AlertAction represents an action to take when an alert rule triggers
type AlertAction struct {
	Type    string                 `json:"type"`    // "webhook", "email", "discord", "slack", "log"
	Config  map[string]interface{} `json:"config"`  // Type-specific configuration
	Enabled bool                   `json:"enabled"` // Whether this action is enabled
}

// AlertCondition represents a condition for matching events
type AlertCondition struct {
	Field    string `json:"field"`    // Field to check (e.g., "subsystem", "level", "message")
	Operator string `json:"operator"` // "equals", "contains", "regex", "not_equals", "not_contains"
	Value    string `json:"value"`    // Value to compare against
}

// ChannelTemplate represents a saved channel configuration template
type ChannelTemplate struct {
	ID                uint           `gorm:"primarykey" json:"id"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
	Name              string         `gorm:"size:128" json:"name"`               // Template name
	Description       string         `gorm:"type:text" json:"description"`       // Description
	Modes             string         `gorm:"size:255" json:"modes"`              // Channel modes to set
	Topic             string         `gorm:"type:text" json:"topic"`             // Default topic
	BanList           string         `gorm:"type:text" json:"ban_list"`          // JSON array of ban masks
	ExceptList        string         `gorm:"type:text" json:"except_list"`       // JSON array of ban exceptions
	InviteList        string         `gorm:"type:text" json:"invite_list"`       // JSON array of invite exceptions
	Settings          string         `gorm:"type:text" json:"settings"`          // JSON object of other settings
	IsGlobal          bool           `gorm:"default:false" json:"is_global"`     // Available to all users
	UseCount          uint           `gorm:"default:0" json:"use_count"`         // Times applied
	CreatedBy         uint           `json:"created_by"`                         // Creator
	CreatedByUsername string         `gorm:"size:64" json:"created_by_username"` // Creator username
}

// UserJourneyEvent represents a tracked event for user journey timeline
type UserJourneyEvent struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `gorm:"index" json:"created_at"`
	// User identification (at least one should be set)
	Nick    string `gorm:"size:64;index" json:"nick,omitempty"`
	IP      string `gorm:"size:64;index" json:"ip,omitempty"`
	Account string `gorm:"size:64;index" json:"account,omitempty"`
	// Event details
	EventType string `gorm:"size:64;index" json:"event_type"` // connect, disconnect, nick_change, join, part, kick, ban, etc.
	Details   string `gorm:"type:text" json:"details"`        // JSON object with event-specific details
	Server    string `gorm:"size:128" json:"server"`          // Server where event occurred
}

// ComplianceReport represents a GDPR/compliance data export
type ComplianceReport struct {
	ID                  uint       `gorm:"primarykey" json:"id"`
	CreatedAt           time.Time  `json:"created_at"`
	CompletedAt         *time.Time `json:"completed_at,omitempty"`
	Type                string     `gorm:"size:64" json:"type"`         // "user_data", "activity_log", "full_export"
	Status              string     `gorm:"size:32" json:"status"`       // "pending", "processing", "completed", "failed"
	Query               string     `gorm:"type:text" json:"query"`      // JSON object of search criteria
	ResultPath          string     `gorm:"size:512" json:"result_path"` // Path to generated report file
	Error               string     `gorm:"type:text" json:"error"`      // Error message if failed
	RequestedBy         uint       `json:"requested_by"`                // User who requested
	RequestedByUsername string     `gorm:"size:64" json:"requested_by_username"`
}

// Feedback represents user feedback/feature requests
type Feedback struct {
	ID          uint              `gorm:"primarykey" json:"id"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
	DeletedAt   gorm.DeletedAt    `gorm:"index" json:"-"`
	UserID      uint              `json:"user_id"`
	User        *User             `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Type        string            `gorm:"size:32;index" json:"type"` // bug, feature, improvement, other
	Title       string            `gorm:"size:256" json:"title"`
	Description string            `gorm:"type:text" json:"description"`
	Priority    string            `gorm:"size:32;index" json:"priority"`            // low, medium, high, critical
	Category    string            `gorm:"size:64" json:"category"`                  // ui, performance, security, functionality
	Status      string            `gorm:"size:32;index;default:open" json:"status"` // open, in_progress, resolved, closed, wont_fix
	Votes       int               `gorm:"default:0" json:"votes"`
	ResolvedAt  *time.Time        `json:"resolved_at,omitempty"`
	Comments    []FeedbackComment `gorm:"foreignKey:FeedbackID" json:"comments,omitempty"`
}

// FeedbackComment represents a comment on feedback
type FeedbackComment struct {
	ID         uint      `gorm:"primarykey" json:"id"`
	CreatedAt  time.Time `json:"created_at"`
	FeedbackID uint      `gorm:"index" json:"feedback_id"`
	UserID     uint      `json:"user_id"`
	User       *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Content    string    `gorm:"type:text" json:"content"`
}

// FeedbackVote tracks user votes on feedback
type FeedbackVote struct {
	ID         uint      `gorm:"primarykey" json:"id"`
	CreatedAt  time.Time `json:"created_at"`
	FeedbackID uint      `gorm:"index" json:"feedback_id"`
	UserID     uint      `gorm:"index" json:"user_id"`
}

// DigestSettings represents user preferences for email digests
type DigestSettings struct {
	ID              uint       `gorm:"primarykey" json:"id"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	UserID          uint       `gorm:"uniqueIndex" json:"user_id"`
	Enabled         bool       `gorm:"default:false" json:"enabled"`
	Frequency       string     `gorm:"size:32;default:weekly" json:"frequency"` // daily, weekly, monthly
	DayOfWeek       int        `gorm:"default:1" json:"day_of_week"`            // 0=Sunday, 1=Monday, etc.
	TimeOfDay       string     `gorm:"size:8;default:09:00" json:"time_of_day"` // HH:MM format
	IncludeStats    bool       `gorm:"default:true" json:"include_stats"`
	IncludeAlerts   bool       `gorm:"default:true" json:"include_alerts"`
	IncludeLogs     bool       `gorm:"default:false" json:"include_logs"`
	IncludeUsers    bool       `gorm:"default:true" json:"include_users"`
	IncludeChannels bool       `gorm:"default:true" json:"include_channels"`
	EmailAddress    string     `gorm:"size:255" json:"email_address"`
	LastSentAt      *time.Time `json:"last_sent_at,omitempty"`
}

// DigestHistory represents a record of sent digests
type DigestHistory struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UserID    uint      `gorm:"index" json:"user_id"`
	Period    string    `gorm:"size:32" json:"period"`
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
	SentAt    time.Time `json:"sent_at"`
	Status    string    `gorm:"size:32" json:"status"` // pending, delivered, failed
	Error     string    `gorm:"type:text" json:"error,omitempty"`
}

// InstalledPlugin represents a plugin installed from the marketplace
type InstalledPlugin struct {
	ID              string    `gorm:"primaryKey" json:"id"`
	Name            string    `gorm:"not null" json:"name"`
	Version         string    `gorm:"not null" json:"version"`
	Author          string    `gorm:"not null" json:"author"`
	Description     string    `gorm:"type:text" json:"description"`
	Category        string    `gorm:"not null" json:"category"`
	Enabled         bool      `gorm:"default:true" json:"enabled"`
	FrontendScripts string    `gorm:"type:text" json:"frontend_scripts,omitempty"` // JSON array of script filenames
	FrontendStyles  string    `gorm:"type:text" json:"frontend_styles,omitempty"`  // JSON array of style filenames
	Config          string    `gorm:"type:text" json:"config,omitempty"`           // JSON plugin configuration
	InstalledAt     time.Time `gorm:"autoCreateTime" json:"installed_at"`
	UpdatedAt       time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}
