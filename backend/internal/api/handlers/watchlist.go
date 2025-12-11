package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/middleware"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/rpc"
)

// WatchedUserRequest represents a request to add/update a watched user
type WatchedUserRequest struct {
	Nick     string `json:"nick"`
	IP       string `json:"ip"`
	Host     string `json:"host"`
	Account  string `json:"account"`
	Realname string `json:"realname"`
	Reason   string `json:"reason" binding:"required"`
}

// WatchedUserResponse extends WatchedUser with current matches
type WatchedUserResponse struct {
	models.WatchedUser
	CurrentMatches []MatchedIRCUser `json:"current_matches"`
}

// MatchedIRCUser represents an IRC user that matches a watch pattern
type MatchedIRCUser struct {
	Nick     string `json:"nick"`
	Username string `json:"username"`
	Hostname string `json:"hostname"`
	IP       string `json:"ip"`
	Realname string `json:"realname"`
	Account  string `json:"account"`
}

// matchPattern checks if a value matches a pattern (supports * wildcards)
func matchPattern(pattern, value string) bool {
	if pattern == "" {
		return false
	}
	pattern = strings.ToLower(pattern)
	value = strings.ToLower(value)

	// Simple wildcard matching
	if pattern == "*" {
		return true
	}
	if !strings.Contains(pattern, "*") {
		return pattern == value
	}

	// Handle wildcards
	parts := strings.Split(pattern, "*")
	if len(parts) == 2 {
		// prefix* or *suffix or *middle*
		if parts[0] == "" {
			// *suffix
			return strings.HasSuffix(value, parts[1])
		}
		if parts[1] == "" {
			// prefix*
			return strings.HasPrefix(value, parts[0])
		}
		// prefix*suffix
		return strings.HasPrefix(value, parts[0]) && strings.HasSuffix(value, parts[1])
	}

	// For more complex patterns, do a simple contains check on non-empty parts
	for _, part := range parts {
		if part != "" && !strings.Contains(value, part) {
			return false
		}
	}
	return true
}

// checkUserMatch checks if an IRC user matches a watch list entry
func checkUserMatch(watch *models.WatchedUser, user map[string]interface{}) bool {
	nick := getString(user, "name")
	hostname := getString(user, "hostname")
	ip := getString(user, "ip")
	realname := getString(user, "realname")
	account := getString(user, "account")

	// Check each pattern - any match counts
	if watch.Nick != "" && matchPattern(watch.Nick, nick) {
		return true
	}
	if watch.Host != "" && matchPattern(watch.Host, hostname) {
		return true
	}
	if watch.IP != "" && matchPattern(watch.IP, ip) {
		return true
	}
	if watch.Realname != "" && matchPattern(watch.Realname, realname) {
		return true
	}
	if watch.Account != "" && matchPattern(watch.Account, account) {
		return true
	}
	return false
}

func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

// GetWatchedUsers returns all watched users with current match counts
func GetWatchedUsers(c *gin.Context) {
	db := database.Get()
	var watchedUsers []models.WatchedUser

	if err := db.Order("created_at DESC").Find(&watchedUsers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch watched users"})
		return
	}

	// Get current IRC users to check matches
	manager := rpc.GetManager()
	var ircUsers []map[string]interface{}

	result, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.User().GetAll(4) // Get full details
	})
	if err == nil && result != nil {
		if users, ok := result.([]interface{}); ok {
			for _, u := range users {
				if userMap, ok := u.(map[string]interface{}); ok {
					ircUsers = append(ircUsers, userMap)
				}
			}
		}
	}

	// Build response with match counts
	response := make([]WatchedUserResponse, len(watchedUsers))
	now := time.Now()

	for i, watch := range watchedUsers {
		response[i].WatchedUser = watch
		response[i].CurrentMatches = []MatchedIRCUser{}

		matchCount := uint(0)
		for _, user := range ircUsers {
			if checkUserMatch(&watch, user) {
				matchCount++
				response[i].CurrentMatches = append(response[i].CurrentMatches, MatchedIRCUser{
					Nick:     getString(user, "name"),
					Username: getString(user, "username"),
					Hostname: getString(user, "hostname"),
					IP:       getString(user, "ip"),
					Realname: getString(user, "realname"),
					Account:  getString(user, "account"),
				})
			}
		}

		// Update match count and last seen in database if there are matches
		if matchCount > 0 {
			response[i].MatchCount = matchCount
			response[i].LastSeen = &now
			db.Model(&watchedUsers[i]).Updates(map[string]interface{}{
				"match_count": matchCount,
				"last_seen":   now,
			})
		} else {
			response[i].MatchCount = watch.MatchCount
			response[i].LastSeen = watch.LastSeen
		}
	}

	c.JSON(http.StatusOK, response)
}

// GetWatchedUser returns a single watched user by ID
func GetWatchedUser(c *gin.Context) {
	db := database.Get()
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var watchedUser models.WatchedUser
	if err := db.First(&watchedUser, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Watched user not found"})
		return
	}

	c.JSON(http.StatusOK, watchedUser)
}

// AddWatchedUser adds a new watched user
func AddWatchedUser(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	var req WatchedUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// At least one match criteria must be provided
	if req.Nick == "" && req.IP == "" && req.Host == "" && req.Account == "" && req.Realname == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one match criteria must be provided"})
		return
	}

	db := database.Get()
	watchedUser := models.WatchedUser{
		Nick:            req.Nick,
		IP:              req.IP,
		Host:            req.Host,
		Account:         req.Account,
		Realname:        req.Realname,
		Reason:          req.Reason,
		AddedBy:         user.ID,
		AddedByUsername: user.Username,
	}

	if err := db.Create(&watchedUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create watched user"})
		return
	}

	c.JSON(http.StatusCreated, watchedUser)
}

// UpdateWatchedUser updates an existing watched user
func UpdateWatchedUser(c *gin.Context) {
	db := database.Get()
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var watchedUser models.WatchedUser
	if err := db.First(&watchedUser, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Watched user not found"})
		return
	}

	var req WatchedUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// At least one match criteria must be provided
	if req.Nick == "" && req.IP == "" && req.Host == "" && req.Account == "" && req.Realname == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one match criteria must be provided"})
		return
	}

	watchedUser.Nick = req.Nick
	watchedUser.IP = req.IP
	watchedUser.Host = req.Host
	watchedUser.Account = req.Account
	watchedUser.Realname = req.Realname
	watchedUser.Reason = req.Reason

	if err := db.Save(&watchedUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update watched user"})
		return
	}

	c.JSON(http.StatusOK, watchedUser)
}

// DeleteWatchedUser deletes a watched user
func DeleteWatchedUser(c *gin.Context) {
	db := database.Get()
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var watchedUser models.WatchedUser
	if err := db.First(&watchedUser, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Watched user not found"})
		return
	}

	if err := db.Delete(&watchedUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete watched user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Watched user deleted"})
}
