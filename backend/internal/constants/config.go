package constants

import "time"

// Configuration file paths
const (
	DefaultConfigFile = "config.json"
)

// RPC related constants
const (
	RPCIssuer = "webpanel"
)

// JWT related constants
const (
	JWTIssuer = "unrealircd-webpanel"
)

// Default values
const (
	DefaultBanDuration   = "0" // Permanent ban
	DefaultBanReason     = "No reason specified"
	DefaultKickReason    = "Kicked by admin"
	WebhookTokenLength   = 16 // bytes (32 hex chars)
	ReconnectThreshold   = 30 * time.Second
	DefaultSessionExpiry = time.Hour
)

// Session status values
type SessionStatus string

const (
	SessionStatusNone   SessionStatus = "none"
	SessionStatusActive SessionStatus = "active"
)

// Detail level for API queries
type DetailLevel string

const (
	DetailMinimal DetailLevel = "minimal" // Level 0 - basic info only
	DetailBasic   DetailLevel = "basic"   // Level 1 - standard info
	DetailMedium  DetailLevel = "medium"  // Level 2 - extended info
	DetailMembers DetailLevel = "members" // Level 2 - include channel members
	DetailFull    DetailLevel = "full"    // Level 4 - all available info
)

// DetailLevelToInt maps detail level strings to RPC integer values
var DetailLevelToInt = map[DetailLevel]int{
	DetailMinimal: 0,
	DetailBasic:   1,
	DetailMedium:  2,
	DetailMembers: 2,
	DetailFull:    4,
}

// GetDetailLevel returns the integer value for a detail level string
func GetDetailLevel(level string) int {
	if val, ok := DetailLevelToInt[DetailLevel(level)]; ok {
		return val
	}
	return 2 // Default to medium
}

// Setting keys for system settings
type SettingKey string

const (
	SettingHIBPEnabled SettingKey = "hibp_enabled"
	SettingDebugMode   SettingKey = "debug_mode"
)

// User metadata keys
type UserMetaKey string

const (
	UserMetaLastLogin UserMetaKey = "last_login"
)
