package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/middleware"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/rpc"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/utils"
)

// IRCUser represents an IRC user from the RPC response
type IRCUser struct {
	ID             string                 `json:"id"`
	Name           string                 `json:"name"`
	Hostname       string                 `json:"hostname"`
	IP             string                 `json:"ip"`
	RealName       string                 `json:"realname"`
	VHost          string                 `json:"vhost,omitempty"`
	Username       string                 `json:"username"`
	ConnectedSince int64                  `json:"connected_since"`
	Idle           int64                  `json:"idle"`
	Channels       []string               `json:"channels,omitempty"`
	Server         string                 `json:"server"`
	ServerName     string                 `json:"server_name,omitempty"`
	Modes          string                 `json:"modes,omitempty"`
	OperLogin      string                 `json:"oper_login,omitempty"`
	OperClass      string                 `json:"oper_class,omitempty"`
	Account        string                 `json:"account,omitempty"`
	TLS            map[string]interface{} `json:"tls,omitempty"`
	GeoIP          map[string]interface{} `json:"geoip,omitempty"`
	ClientInfo     map[string]interface{} `json:"client_info,omitempty"`
	SecurityGroups []string               `json:"security_groups,omitempty"`
	Reputation     int                    `json:"reputation,omitempty"`
}

// GetUsers returns all IRC users
func GetUsers(c *gin.Context) {
	manager := rpc.GetManager()

	// Object detail level: 0=minimal, 1=basic, 2=more details, 4=full
	detailLevel := 4
	if dl := c.Query("detail"); dl != "" {
		switch dl {
		case "minimal":
			detailLevel = 0
		case "basic":
			detailLevel = 1
		case "medium":
			detailLevel = 2
		}
	}

	result, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.User().GetAll(detailLevel)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get users: " + err.Error()})
		return
	}

	users := parseUserList(result)
	c.JSON(http.StatusOK, users)
}

// GetUser returns a specific IRC user
func GetUser(c *gin.Context) {
	nick := c.Param("nick")
	log.Printf("[GetUser] Fetching user: %s", nick)
	if nick == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nick is required"})
		return
	}

	manager := rpc.GetManager()

	result, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.User().Get(nick, 4) // Full detail (0, 1, 2 or 4 allowed)
	})
	if err != nil {
		log.Printf("[GetUser] Error fetching user %s: %v", nick, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user: " + err.Error()})
		return
	}

	log.Printf("[GetUser] Result for %s: %+v", nick, result)

	if result == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	user := parseUser(result)
	log.Printf("[GetUser] Parsed user: %+v", user)
	c.JSON(http.StatusOK, user)
}

// KillUserRequest represents a kill request
type KillUserRequest struct {
	Reason string `json:"reason" binding:"required"`
}

// KillUser kills an IRC user
func KillUser(c *gin.Context) {
	nick := c.Param("nick")
	if nick == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nick is required"})
		return
	}

	var req KillUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	manager := rpc.GetManager()

	_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.User().Kill(nick, req.Reason)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to kill user: " + err.Error()})
		return
	}

	// Log the action
	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		logAction(c, currentUser, "kill_user", map[string]string{
			"nick":   nick,
			"reason": req.Reason,
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "User killed successfully"})
}

// SetUserNickRequest represents a nick change request
type SetUserNickRequest struct {
	NewNick string `json:"new_nick" binding:"required"`
}

// SetUserNick changes a user's nick
func SetUserNick(c *gin.Context) {
	nick := c.Param("nick")
	if nick == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nick is required"})
		return
	}

	var req SetUserNickRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	manager := rpc.GetManager()

	_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.User().SetNick(nick, req.NewNick)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to change nick: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Nick changed successfully"})
}

// SetUserModeRequest represents a mode change request
type SetUserModeRequest struct {
	Modes  string `json:"modes" binding:"required"`
	Hidden bool   `json:"hidden"`
}

// SetUserMode changes a user's modes
func SetUserMode(c *gin.Context) {
	nick := c.Param("nick")
	if nick == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nick is required"})
		return
	}

	var req SetUserModeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	manager := rpc.GetManager()

	_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.User().SetMode(nick, req.Modes, req.Hidden)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set mode: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Mode changed successfully"})
}

// SetUserVhostRequest represents a vhost change request
type SetUserVhostRequest struct {
	VHost string `json:"vhost" binding:"required"`
}

// SetUserVhost changes a user's virtual host
func SetUserVhost(c *gin.Context) {
	nick := c.Param("nick")
	if nick == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nick is required"})
		return
	}

	var req SetUserVhostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	manager := rpc.GetManager()

	_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.User().SetVhost(nick, req.VHost)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set vhost: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "VHost changed successfully"})
}

// BanUserRequest represents a ban user request
type BanUserRequest struct {
	Type     string `json:"type" binding:"required"`
	Duration string `json:"duration"`
	Reason   string `json:"reason" binding:"required"`
}

// BanUser bans an IRC user
func BanUser(c *gin.Context) {
	nick := c.Param("nick")
	if nick == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nick is required"})
		return
	}

	var req BanUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	manager := rpc.GetManager()

	// Get the user first to get their hostmask
	result, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.User().Get(nick, 4)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user: " + err.Error()})
		return
	}

	user := parseUser(result)
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Build the ban mask
	banMask := "*@" + user.Hostname

	// Add the server ban (name, banType, duration, reason)
	_, err = manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.ServerBan().Add(banMask, req.Type, req.Duration, req.Reason)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to ban user: " + err.Error()})
		return
	}

	// Log the action
	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		logAction(c, currentUser, "ban_user", map[string]string{
			"nick":     nick,
			"mask":     banMask,
			"type":     req.Type,
			"duration": req.Duration,
			"reason":   req.Reason,
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "User banned successfully"})
}

// Helper functions

func parseUserList(result interface{}) []IRCUser {
	users := make([]IRCUser, 0)

	list := utils.InterfaceToSlice(result)
	for _, item := range list {
		if user := parseUser(item); user != nil {
			users = append(users, *user)
		}
	}

	return users
}

func parseUser(result interface{}) *IRCUser {
	m := utils.InterfaceToMap(result)
	if m == nil {
		return nil
	}

	// Get the nested user map if present (detail level 4 has nested data)
	userMap := utils.SafeMapGetMap(m, "user")

	// Helper to get from nested user map or fallback to top level
	getString := func(key string) string {
		if userMap != nil {
			if val := utils.SafeMapGetString(userMap, key); val != "" {
				return val
			}
		}
		return utils.SafeMapGetString(m, key)
	}

	getInt := func(key string) int {
		if userMap != nil {
			if val := utils.SafeMapGetInt(userMap, key); val != 0 {
				return val
			}
		}
		return utils.SafeMapGetInt(m, key)
	}

	getSlice := func(key string) []interface{} {
		if userMap != nil {
			if val := utils.SafeMapGetSlice(userMap, key); val != nil {
				return val
			}
		}
		return utils.SafeMapGetSlice(m, key)
	}

	// Parse connected_since - could be ISO string or int
	var connectedSince int64
	if csStr := utils.SafeMapGetString(m, "connected_since"); csStr != "" {
		// Parse ISO 8601 timestamp
		if t, err := time.Parse(time.RFC3339, csStr); err == nil {
			connectedSince = t.Unix()
		} else if t, err := time.Parse("2006-01-02T15:04:05.000Z", csStr); err == nil {
			connectedSince = t.Unix()
		}
	} else {
		connectedSince = int64(utils.SafeMapGetInt(m, "connected_since"))
	}

	// Parse idle_since and calculate idle duration
	var idleDuration int64
	if isStr := utils.SafeMapGetString(m, "idle_since"); isStr != "" {
		if t, err := time.Parse(time.RFC3339, isStr); err == nil {
			idleDuration = time.Now().Unix() - t.Unix()
		} else if t, err := time.Parse("2006-01-02T15:04:05.000Z", isStr); err == nil {
			idleDuration = time.Now().Unix() - t.Unix()
		}
	} else if idleSince := int64(utils.SafeMapGetInt(m, "idle_since")); idleSince > 0 {
		idleDuration = time.Now().Unix() - idleSince
	}
	if idleDuration < 0 {
		idleDuration = 0
	}

	user := &IRCUser{
		ID:             utils.SafeMapGetString(m, "id"),
		Name:           utils.SafeMapGetString(m, "name"),
		Hostname:       utils.SafeMapGetString(m, "hostname"),
		IP:             utils.SafeMapGetString(m, "ip"),
		RealName:       getString("realname"),
		VHost:          getString("vhost"),
		Username:       getString("username"),
		ConnectedSince: connectedSince,
		Idle:           idleDuration,
		Server:         getString("server"),
		ServerName:     getString("servername"),
		Modes:          getString("modes"),
		OperLogin:      getString("oper_login"),
		OperClass:      getString("oper_class"),
		Account:        getString("account"),
		Reputation:     getInt("reputation"),
	}

	// Parse channels - handle both string array and object array
	if channels := getSlice("channels"); channels != nil {
		// Map level letters to symbols
		levelToSymbol := map[string]string{
			"q": "~", // owner
			"a": "&", // admin
			"o": "@", // op
			"h": "%", // halfop
			"v": "+", // voice
			"Y": "!", // ojoin
		}
		channelList := make([]string, 0, len(channels))
		for _, ch := range channels {
			switch v := ch.(type) {
			case string:
				channelList = append(channelList, v)
			case map[string]interface{}:
				// Channel object with name and possibly level
				name := utils.SafeMapGetString(v, "name")
				level := utils.SafeMapGetString(v, "level")
				if name != "" {
					if level != "" {
						// Convert level letter to symbol
						if symbol, ok := levelToSymbol[level]; ok {
							channelList = append(channelList, symbol+name)
						} else {
							channelList = append(channelList, name)
						}
					} else {
						channelList = append(channelList, name)
					}
				}
			}
		}
		user.Channels = channelList
	}

	// Parse security groups
	if groups := getSlice("security-groups"); groups != nil {
		user.SecurityGroups = utils.InterfaceSliceToStringSlice(groups)
	}

	// Parse nested objects
	if tls := utils.SafeMapGetMap(m, "tls"); tls != nil {
		user.TLS = tls
	}
	if geoip := utils.SafeMapGetMap(m, "geoip"); geoip != nil {
		user.GeoIP = geoip
	}
	if clientInfo := utils.SafeMapGetMap(m, "client_info"); clientInfo != nil {
		user.ClientInfo = clientInfo
	}

	return user
}
