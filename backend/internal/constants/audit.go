package constants

// AuditAction represents an action type for audit logging
type AuditAction string

const (
	// Auth actions
	ActionLogin AuditAction = "login"

	// Server ban actions
	ActionAddServerBan    AuditAction = "add_server_ban"
	ActionDeleteServerBan AuditAction = "delete_server_ban"

	// Name ban (Q-Line) actions
	ActionAddNameBan    AuditAction = "add_name_ban"
	ActionDeleteNameBan AuditAction = "delete_name_ban"

	// Ban exception actions
	ActionAddBanException    AuditAction = "add_ban_exception"
	ActionDeleteBanException AuditAction = "delete_ban_exception"

	// Spamfilter actions
	ActionAddSpamfilter    AuditAction = "add_spamfilter"
	ActionDeleteSpamfilter AuditAction = "delete_spamfilter"

	// IRC user actions
	ActionKillUser AuditAction = "kill_user"
	ActionBanUser  AuditAction = "ban_user"

	// Channel actions
	ActionSetTopic       AuditAction = "set_topic"
	ActionSetChannelMode AuditAction = "set_channel_mode"
	ActionKickUser       AuditAction = "kick_user"

	// Server actions
	ActionRehashServer AuditAction = "rehash_server"

	// Panel user management
	ActionCreatePanelUser AuditAction = "create_panel_user"
	ActionUpdatePanelUser AuditAction = "update_panel_user"
	ActionDeletePanelUser AuditAction = "delete_panel_user"

	// Role management
	ActionCreateRole AuditAction = "create_role"
	ActionUpdateRole AuditAction = "update_role"
	ActionDeleteRole AuditAction = "delete_role"

	// Webhook/token actions
	ActionCreateWebhookToken     AuditAction = "create_webhook_token"
	ActionUpdateWebhookToken     AuditAction = "update_webhook_token"
	ActionDeleteWebhookToken     AuditAction = "delete_webhook_token"
	ActionRegenerateWebhookToken AuditAction = "regenerate_webhook_token"

	// RPC Server management
	ActionAddRPCServer    AuditAction = "add_rpc_server"
	ActionUpdateRPCServer AuditAction = "update_rpc_server"
	ActionDeleteRPCServer AuditAction = "delete_rpc_server"

	// Settings actions
	ActionUpdateSMTPSettings   AuditAction = "update_smtp_settings"
	ActionUpdateSystemSettings AuditAction = "update_system_settings"

	// Dashboard actions
	ActionSaveDashboardLayout AuditAction = "save_dashboard_layout"
)
