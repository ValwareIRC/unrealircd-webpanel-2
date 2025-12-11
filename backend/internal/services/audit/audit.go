package audit

import (
	"fmt"
	"log"

	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/rpc"
)

// Event types for webpanel audit logging
const (
	// Event IDs
	EventIDLogin        = "WEBPANEL_LOGIN"
	EventIDLogout       = "WEBPANEL_LOGOUT"
	EventIDSMTPUpdate   = "WEBPANEL_SMTP_UPDATE"
	EventIDRPCServerAdd = "WEBPANEL_RPC_ADD"
	EventIDRPCServerDel = "WEBPANEL_RPC_DEL"
	EventIDUserCreate   = "WEBPANEL_USER_CREATE"
	EventIDUserDelete   = "WEBPANEL_USER_DELETE"
	EventIDUserUpdate   = "WEBPANEL_USER_UPDATE"
	EventIDRoleCreate   = "WEBPANEL_ROLE_CREATE"
	EventIDRoleUpdate   = "WEBPANEL_ROLE_UPDATE"
	EventIDRoleDelete   = "WEBPANEL_ROLE_DELETE"

	// Subsystem
	Subsystem = "webpanel"

	// Log levels
	LevelInfo  = "info"
	LevelWarn  = "warn"
	LevelError = "error"
)

// SendLog sends a log message to the IRC server via RPC
// It does this in a non-blocking goroutine so it doesn't affect request latency
func SendLog(msg, level, eventID string) {
	go func() {
		manager := rpc.GetManager()
		client, err := manager.GetActive()
		if err != nil {
			log.Printf("audit: no active RPC connection: %v", err)
			return
		}

		if _, err := client.Log().Send(msg, level, Subsystem, eventID); err != nil {
			log.Printf("audit: failed to send log: %v", err)
		}
	}()
}

// LogLogin logs a user login event
func LogLogin(username, ip string) {
	msg := fmt.Sprintf("User '%s' logged in from %s", username, ip)
	SendLog(msg, LevelInfo, EventIDLogin)
}

// LogLogout logs a user logout event
func LogLogout(username string) {
	msg := fmt.Sprintf("User '%s' logged out", username)
	SendLog(msg, LevelInfo, EventIDLogout)
}

// LogSMTPUpdate logs an SMTP settings update
func LogSMTPUpdate(byUser, smtpHost string) {
	msg := fmt.Sprintf("SMTP settings updated by '%s' (host: %s)", byUser, smtpHost)
	SendLog(msg, LevelInfo, EventIDSMTPUpdate)
}

// LogRPCServerAdd logs an RPC server addition
func LogRPCServerAdd(byUser, serverName string) {
	msg := fmt.Sprintf("RPC server '%s' added by '%s'", serverName, byUser)
	SendLog(msg, LevelInfo, EventIDRPCServerAdd)
}

// LogRPCServerDelete logs an RPC server deletion
func LogRPCServerDelete(byUser, serverName string) {
	msg := fmt.Sprintf("RPC server '%s' deleted by '%s'", serverName, byUser)
	SendLog(msg, LevelInfo, EventIDRPCServerDel)
}

// LogUserCreate logs a user account creation
func LogUserCreate(byUser, newUsername string) {
	msg := fmt.Sprintf("User account '%s' created by '%s'", newUsername, byUser)
	SendLog(msg, LevelInfo, EventIDUserCreate)
}

// LogUserDelete logs a user account deletion
func LogUserDelete(byUser, deletedUsername string) {
	msg := fmt.Sprintf("User account '%s' deleted by '%s'", deletedUsername, byUser)
	SendLog(msg, LevelInfo, EventIDUserDelete)
}

// LogUserUpdate logs a user account update
func LogUserUpdate(byUser, updatedUsername string) {
	msg := fmt.Sprintf("User account '%s' updated by '%s'", updatedUsername, byUser)
	SendLog(msg, LevelInfo, EventIDUserUpdate)
}

// LogRoleCreate logs a role creation
func LogRoleCreate(byUser, roleName string) {
	msg := fmt.Sprintf("Role '%s' created by '%s'", roleName, byUser)
	SendLog(msg, LevelInfo, EventIDRoleCreate)
}

// LogRoleUpdate logs a role update
func LogRoleUpdate(byUser, roleName string) {
	msg := fmt.Sprintf("Role '%s' updated by '%s'", roleName, byUser)
	SendLog(msg, LevelInfo, EventIDRoleUpdate)
}

// LogRoleDelete logs a role deletion
func LogRoleDelete(byUser, roleName string) {
	msg := fmt.Sprintf("Role '%s' deleted by '%s'", roleName, byUser)
	SendLog(msg, LevelInfo, EventIDRoleDelete)
}
