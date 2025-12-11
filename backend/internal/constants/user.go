package constants

// UserMode represents a user mode character
type UserMode string

const (
	UserModeOper            UserMode = "o" // IRC Operator
	UserModeService         UserMode = "S" // Service bot
	UserModeDeaf            UserMode = "d" // Deaf (ignoring channel messages)
	UserModeInvisible       UserMode = "i" // Invisible (hidden from /WHO)
	UserModePrivateChannels UserMode = "p" // Channels hidden in /WHOIS
	UserModeRegistered      UserMode = "r" // Registered nickname
	UserModeServerNotices   UserMode = "s" // Receiving server notices
	UserModeVHost           UserMode = "t" // Using virtual host
	UserModeWallops         UserMode = "w" // Listening to /WALLOPS
	UserModeCloak           UserMode = "x" // Cloaked hostname
	UserModeSecure          UserMode = "z" // Connected via TLS
	UserModeBot             UserMode = "B" // Marked as bot
	UserModePrivDeaf        UserMode = "D" // Rejecting private messages
	UserModeFilter          UserMode = "G" // Filtering bad words
	UserModeHideOper        UserMode = "H" // Hiding IRCop status
	UserModeHideIdle        UserMode = "I" // Hiding idle time
	UserModeRegOnlyMsg      UserMode = "R" // Only accepting PMs from registered users
	UserModeNoCTCP          UserMode = "T" // Blocking CTCP requests
	UserModeViewWhois       UserMode = "W" // Receives WHOIS notifications
	UserModeDenyInsecure    UserMode = "Z" // Only accepting secure connections
)
