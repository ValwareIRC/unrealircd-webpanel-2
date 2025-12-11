package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/middleware"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/rpc"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/utils"
)

// IRCChannel represents an IRC channel from the RPC response
type IRCChannel struct {
	Name         string                 `json:"name"`
	CreationTime int64                  `json:"creation_time"`
	NumUsers     int                    `json:"num_users"`
	Topic        string                 `json:"topic,omitempty"`
	TopicSetBy   string                 `json:"topic_set_by,omitempty"`
	TopicSetAt   int64                  `json:"topic_set_at,omitempty"`
	Modes        string                 `json:"modes,omitempty"`
	ModeParams   map[string]interface{} `json:"mode_params,omitempty"`
	Members      []ChannelMember        `json:"members,omitempty"`
	Bans         []ChannelListEntry     `json:"bans,omitempty"`
	Invites      []ChannelListEntry     `json:"invites,omitempty"`
	Excepts      []ChannelListEntry     `json:"excepts,omitempty"`
}

// ChannelMember represents a user in a channel
type ChannelMember struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Level string `json:"level"`
	Modes string `json:"modes,omitempty"`
}

// ChannelListEntry represents a ban/invite/except entry
type ChannelListEntry struct {
	Mask  string `json:"mask"`
	SetBy string `json:"set_by"`
	SetAt int64  `json:"set_at"`
}

// GetChannels returns all IRC channels
func GetChannels(c *gin.Context) {
	manager := rpc.GetManager()

	// Object detail level: 1=basic, 2=with members, 3=full
	detailLevel := 1
	if dl := c.Query("detail"); dl != "" {
		switch dl {
		case "members":
			detailLevel = 2
		case "full":
			detailLevel = 3
		}
	}

	result, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Channel().GetAll(detailLevel)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get channels: " + err.Error()})
		return
	}

	channels := parseChannelList(result)
	c.JSON(http.StatusOK, channels)
}

// GetChannel returns a specific IRC channel
func GetChannel(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Channel name is required"})
		return
	}

	manager := rpc.GetManager()

	result, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Channel().Get(name, 4) // Full detail with lists
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get channel: " + err.Error()})
		return
	}

	if result == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found"})
		return
	}

	channel := parseChannel(result)
	c.JSON(http.StatusOK, channel)
}

// SetTopicRequest represents a topic change request
type SetTopicRequest struct {
	Topic string `json:"topic"`
}

// SetChannelTopic sets a channel's topic
func SetChannelTopic(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Channel name is required"})
		return
	}

	var req SetTopicRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	manager := rpc.GetManager()

	currentUser := middleware.GetCurrentUser(c)
	var setBy *string
	if currentUser != nil {
		setBy = &currentUser.Username
	}

	_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Channel().SetTopic(name, req.Topic, setBy, nil)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set topic: " + err.Error()})
		return
	}

	if currentUser != nil {
		logAction(c, currentUser, "set_topic", map[string]string{
			"channel": name,
			"topic":   req.Topic,
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Topic set successfully"})
}

// SetModeRequest represents a mode change request
type SetModeRequest struct {
	Modes      string `json:"modes" binding:"required"`
	Parameters string `json:"parameters"`
}

// SetChannelMode sets channel modes
func SetChannelMode(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Channel name is required"})
		return
	}

	var req SetModeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	manager := rpc.GetManager()

	_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Channel().SetMode(name, req.Modes, req.Parameters)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set mode: " + err.Error()})
		return
	}

	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		logAction(c, currentUser, "set_channel_mode", map[string]string{
			"channel": name,
			"modes":   req.Modes,
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Mode set successfully"})
}

// KickRequest represents a kick request
type KickRequest struct {
	Nick   string `json:"nick" binding:"required"`
	Reason string `json:"reason"`
}

// KickUser kicks a user from a channel
func KickUser(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Channel name is required"})
		return
	}

	var req KickRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	manager := rpc.GetManager()

	reason := req.Reason
	if reason == "" {
		reason = "Kicked by admin"
	}

	_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Channel().Kick(name, req.Nick, reason)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to kick user: " + err.Error()})
		return
	}

	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		logAction(c, currentUser, "kick_user", map[string]string{
			"channel": name,
			"nick":    req.Nick,
			"reason":  reason,
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "User kicked successfully"})
}

// Helper functions

func parseChannelList(result interface{}) []IRCChannel {
	channels := make([]IRCChannel, 0)

	list := utils.InterfaceToSlice(result)
	for _, item := range list {
		if channel := parseChannel(item); channel != nil {
			channels = append(channels, *channel)
		}
	}

	return channels
}

func parseChannel(result interface{}) *IRCChannel {
	m := utils.InterfaceToMap(result)
	if m == nil {
		return nil
	}

	channel := &IRCChannel{
		Name:         utils.SafeMapGetString(m, "name"),
		CreationTime: int64(utils.SafeMapGetInt(m, "creation_time")),
		NumUsers:     utils.SafeMapGetInt(m, "num_users"),
		Topic:        utils.SafeMapGetString(m, "topic"),
		TopicSetBy:   utils.SafeMapGetString(m, "topic_set_by"),
		TopicSetAt:   int64(utils.SafeMapGetInt(m, "topic_set_at")),
		Modes:        utils.SafeMapGetString(m, "modes"),
	}

	// Parse mode params
	if modeParams := utils.SafeMapGetMap(m, "mode_params"); modeParams != nil {
		channel.ModeParams = modeParams
	}

	// Parse members
	if members := utils.SafeMapGetSlice(m, "members"); members != nil {
		channel.Members = make([]ChannelMember, 0, len(members))
		for _, memberItem := range members {
			if memberMap := utils.InterfaceToMap(memberItem); memberMap != nil {
				member := ChannelMember{
					ID:    utils.SafeMapGetString(memberMap, "id"),
					Name:  utils.SafeMapGetString(memberMap, "name"),
					Level: utils.SafeMapGetString(memberMap, "level"),
					Modes: utils.SafeMapGetString(memberMap, "modes"),
				}
				channel.Members = append(channel.Members, member)
			}
		}
	}

	// Parse bans
	channel.Bans = parseChannelList2(utils.SafeMapGetSlice(m, "bans"))
	channel.Invites = parseChannelList2(utils.SafeMapGetSlice(m, "invites"))
	channel.Excepts = parseChannelList2(utils.SafeMapGetSlice(m, "excepts"))

	return channel
}

func parseChannelList2(items []interface{}) []ChannelListEntry {
	if items == nil {
		return nil
	}

	entries := make([]ChannelListEntry, 0, len(items))
	for _, item := range items {
		if m := utils.InterfaceToMap(item); m != nil {
			entry := ChannelListEntry{
				Mask:  utils.SafeMapGetString(m, "mask"),
				SetBy: utils.SafeMapGetString(m, "set_by"),
				SetAt: int64(utils.SafeMapGetInt(m, "set_at")),
			}
			entries = append(entries, entry)
		}
	}
	return entries
}
