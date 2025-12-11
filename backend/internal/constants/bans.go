package constants

// BanType represents the type of server ban
type BanType string

const (
	BanTypeGLine  BanType = "gline"  // Global network ban
	BanTypeKLine  BanType = "kline"  // Server-local ban
	BanTypeZLine  BanType = "zline"  // IP ban (no hostname lookup)
	BanTypeGZLine BanType = "gzline" // Global Z-Line
	BanTypeShun   BanType = "shun"   // Shun (user can connect but messages are ignored)
	BanTypeQLine  BanType = "qline"  // Reserved/forbidden nickname
)

// ValidBanTypes contains all valid ban types for validation
var ValidBanTypes = []BanType{
	BanTypeGLine,
	BanTypeKLine,
	BanTypeZLine,
	BanTypeGZLine,
	BanTypeShun,
	BanTypeQLine,
}

// IsValidBanType checks if a ban type is valid
func IsValidBanType(t string) bool {
	for _, valid := range ValidBanTypes {
		if string(valid) == t {
			return true
		}
	}
	return false
}

// SpamfilterMatchType represents the pattern matching type for spamfilters
type SpamfilterMatchType string

const (
	MatchTypeSimple SpamfilterMatchType = "simple" // Simple wildcard matching (* and ?)
	MatchTypeRegex  SpamfilterMatchType = "regex"  // Regular expression
	MatchTypePosix  SpamfilterMatchType = "posix"  // POSIX regex
)

// SpamfilterAction represents the action to take when a spamfilter matches
type SpamfilterAction string

const (
	ActionWarn      SpamfilterAction = "warn"      // Send a warning to the user
	ActionBlock     SpamfilterAction = "block"     // Block the message
	ActionSoft      SpamfilterAction = "soft"      // Soft action
	ActionKill      SpamfilterAction = "kill"      // Disconnect the user
	ActionTempShun  SpamfilterAction = "tempshun"  // Temporarily silence the user
	ActionShun      SpamfilterAction = "shun"      // Permanently silence the user
	ActionKLine     SpamfilterAction = "kline"     // Local server ban
	ActionGLine     SpamfilterAction = "gline"     // Global network ban
	ActionZLine     SpamfilterAction = "zline"     // Local IP ban
	ActionGZLine    SpamfilterAction = "gzline"    // Global IP ban
	ActionDCCBlock  SpamfilterAction = "dccblock"  // Block DCC transfers
	ActionViruschan SpamfilterAction = "viruschan" // Redirect to virus quarantine channel
)

// SpamfilterTarget represents what the spamfilter applies to
type SpamfilterTarget string

const (
	TargetChannel       SpamfilterTarget = "c" // Channel messages
	TargetPrivate       SpamfilterTarget = "p" // Private messages
	TargetPrivateNotice SpamfilterTarget = "n" // Private notices
	TargetChannelNotice SpamfilterTarget = "N" // Channel notices
	TargetPart          SpamfilterTarget = "P" // Part messages
	TargetQuit          SpamfilterTarget = "q" // Quit messages
	TargetDCC           SpamfilterTarget = "d" // DCC
	TargetAway          SpamfilterTarget = "a" // Away messages
	TargetTopic         SpamfilterTarget = "t" // Topic changes
	TargetUser          SpamfilterTarget = "u" // User info (realname)
	TargetMessageTag    SpamfilterTarget = "T" // Message tags
	TargetRaw           SpamfilterTarget = "r" // Raw commands
)
