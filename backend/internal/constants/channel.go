package constants

// ChannelLevel represents the access level of a user in a channel
type ChannelLevel string

const (
	LevelOwner  ChannelLevel = "q" // Channel owner (~)
	LevelAdmin  ChannelLevel = "a" // Channel admin (&)
	LevelOp     ChannelLevel = "o" // Channel operator (@)
	LevelHalfOp ChannelLevel = "h" // Half-operator (%)
	LevelVoice  ChannelLevel = "v" // Voice (+)
	LevelOjoin  ChannelLevel = "Y" // OJOIN (!)
)

// ChannelLevelSymbol represents the prefix symbol for a channel level
type ChannelLevelSymbol string

const (
	SymbolOwner  ChannelLevelSymbol = "~"
	SymbolAdmin  ChannelLevelSymbol = "&"
	SymbolOp     ChannelLevelSymbol = "@"
	SymbolHalfOp ChannelLevelSymbol = "%"
	SymbolVoice  ChannelLevelSymbol = "+"
	SymbolOjoin  ChannelLevelSymbol = "!"
)

// LevelToSymbol maps channel levels to their display symbols
var LevelToSymbol = map[ChannelLevel]ChannelLevelSymbol{
	LevelOwner:  SymbolOwner,
	LevelAdmin:  SymbolAdmin,
	LevelOp:     SymbolOp,
	LevelHalfOp: SymbolHalfOp,
	LevelVoice:  SymbolVoice,
	LevelOjoin:  SymbolOjoin,
}

// LevelOrder defines the sort order for channel levels (lower = higher rank)
var LevelOrder = map[ChannelLevel]int{
	LevelOwner:  0,
	LevelAdmin:  1,
	LevelOp:     2,
	LevelHalfOp: 3,
	LevelVoice:  4,
	LevelOjoin:  5,
}

// GetSymbol returns the display symbol for a channel level
func GetSymbol(level string) string {
	if symbol, ok := LevelToSymbol[ChannelLevel(level)]; ok {
		return string(symbol)
	}
	return ""
}

// ChannelMode represents a channel mode character
type ChannelMode string

const (
	ModeNoExternal     ChannelMode = "n" // No external messages
	ModeTopicLock      ChannelMode = "t" // Topic protection
	ModeSecret         ChannelMode = "s" // Secret channel
	ModePrivate        ChannelMode = "p" // Private channel
	ModeModerated      ChannelMode = "m" // Moderated channel
	ModeInviteOnly     ChannelMode = "i" // Invite only
	ModeKey            ChannelMode = "k" // Channel key/password
	ModeLimit          ChannelMode = "l" // User limit
	ModeRegistered     ChannelMode = "r" // Registered channel
	ModeNoColors       ChannelMode = "c" // No colors
	ModeNoCTCP         ChannelMode = "C" // No CTCPs
	ModeNoNickChange   ChannelMode = "N" // No nickname changes
	ModeOperOnly       ChannelMode = "O" // Opers only
	ModeNoKicks        ChannelMode = "Q" // No kicks
	ModeRegisteredOnly ChannelMode = "R" // Registered users only
	ModeStripColors    ChannelMode = "S" // Strip colors
	ModeNoNotices      ChannelMode = "T" // No notices
	ModeSecureOnly     ChannelMode = "z" // TLS users only
	ModeAllSecure      ChannelMode = "Z" // All users are secure
	ModeFlood          ChannelMode = "f" // Flood protection
	ModeFloodProfile   ChannelMode = "F" // Flood profile
	ModeNoKnock        ChannelMode = "K" // No /KNOCK
	ModeNoInvites      ChannelMode = "V" // No invites
	ModeLink           ChannelMode = "L" // Linked channel
	ModeModeratedUnreg ChannelMode = "M" // Moderated for unregistered
	ModeCensored       ChannelMode = "G" // Word filter
	ModePermanent      ChannelMode = "P" // Permanent channel
	ModeHistory        ChannelMode = "H" // Channel history
	ModeDelayedJoin    ChannelMode = "D" // Delayed join
	ModeHasDelayed     ChannelMode = "d" // Has delayed users
)
