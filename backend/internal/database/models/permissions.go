package models

// Permission constants for the panel
const (
	PermissionManageUsers      = "manage_users"
	PermissionBanUsers         = "ban_users"
	PermissionEditUser         = "edit_user"
	PermissionEditChannel      = "edit_channel"
	PermissionEditChannelUser  = "edit_channel_user"
	PermissionServerBanAdd     = "tkl_add"
	PermissionServerBanDel     = "tkl_del"
	PermissionNameBanAdd       = "nb_add"
	PermissionNameBanDel       = "nb_del"
	PermissionBanExceptionAdd  = "be_add"
	PermissionBanExceptionDel  = "be_del"
	PermissionSpamfilterAdd    = "sf_add"
	PermissionSpamfilterDel    = "sf_del"
	PermissionRehash           = "rhs"
	PermissionManagePlugins    = "mng_plg"
	PermissionViewLogs         = "view_logs"
	PermissionViewServers      = "view_servers"
	PermissionViewUsers        = "view_users"
	PermissionViewChannels     = "view_channels"
	PermissionViewBans         = "view_bans"
	PermissionManageSettings   = "manage_settings"
	PermissionManageRPCServers = "manage_rpc"
	PermissionManageWebhooks   = "manage_webhooks"
	PermissionManageSMTP       = "manage_smtp"
)

// AllPermissions returns all available permissions
var AllPermissions = []struct {
	Key         string
	Name        string
	Description string
	Category    string
}{
	// User Management
	{PermissionManageUsers, "Manage Panel Users", "Create, edit, and delete panel users", "Panel"},
	{PermissionManageSettings, "Manage Settings", "Modify panel settings", "Panel"},
	{PermissionManagePlugins, "Manage Plugins", "Install, enable, and disable plugins", "Panel"},
	{PermissionManageRPCServers, "Manage RPC Servers", "Add and configure RPC servers", "Panel"},
	{PermissionManageWebhooks, "Manage Webhooks", "Create and manage webhook tokens for receiving UnrealIRCd log events", "Panel"},
	{PermissionManageSMTP, "Manage SMTP Settings", "Configure SMTP server for email notifications", "Panel"},

	// IRC User Management
	{PermissionViewUsers, "View Users", "View IRC users list", "Users"},
	{PermissionEditUser, "Edit Users", "Modify IRC user settings", "Users"},
	{PermissionBanUsers, "Ban Users", "Kill and ban IRC users", "Users"},

	// Channel Management
	{PermissionViewChannels, "View Channels", "View IRC channels list", "Channels"},
	{PermissionEditChannel, "Edit Channels", "Modify channel settings, modes, and topic", "Channels"},
	{PermissionEditChannelUser, "Edit Channel Users", "Kick, ban, and voice users in channels", "Channels"},

	// Server Management
	{PermissionViewServers, "View Servers", "View server list and details", "Servers"},
	{PermissionRehash, "Rehash Servers", "Rehash IRC servers", "Servers"},

	// Ban Management
	{PermissionViewBans, "View Bans", "View server bans and spamfilters", "Bans"},
	{PermissionServerBanAdd, "Add Server Bans", "Add G-Lines, K-Lines, Z-Lines", "Bans"},
	{PermissionServerBanDel, "Remove Server Bans", "Remove G-Lines, K-Lines, Z-Lines", "Bans"},
	{PermissionNameBanAdd, "Add Name Bans", "Add Q-Lines (nick/channel bans)", "Bans"},
	{PermissionNameBanDel, "Remove Name Bans", "Remove Q-Lines", "Bans"},
	{PermissionBanExceptionAdd, "Add Ban Exceptions", "Add E-Lines", "Bans"},
	{PermissionBanExceptionDel, "Remove Ban Exceptions", "Remove E-Lines", "Bans"},
	{PermissionSpamfilterAdd, "Add Spamfilters", "Add spamfilter rules", "Bans"},
	{PermissionSpamfilterDel, "Remove Spamfilters", "Remove spamfilter rules", "Bans"},

	// Logs
	{PermissionViewLogs, "View Logs", "View IRC server logs", "Logs"},
}

// GetPermissionsByCategory returns permissions grouped by category
func GetPermissionsByCategory() map[string][]struct {
	Key         string
	Name        string
	Description string
} {
	result := make(map[string][]struct {
		Key         string
		Name        string
		Description string
	})

	for _, p := range AllPermissions {
		result[p.Category] = append(result[p.Category], struct {
			Key         string
			Name        string
			Description string
		}{p.Key, p.Name, p.Description})
	}

	return result
}
