package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
)

// GetUserJourney returns timeline events for a specific user
func GetUserJourney(c *gin.Context) {
	db := database.Get()

	nick := c.Query("nick")
	ip := c.Query("ip")
	account := c.Query("account")

	if nick == "" && ip == "" && account == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one of nick, ip, or account must be provided"})
		return
	}

	// Parse time range
	hours := 168 // Default to 1 week
	if h := c.Query("hours"); h != "" {
		if parsed, err := strconv.Atoi(h); err == nil {
			hours = parsed
		}
	}
	since := time.Now().Add(-time.Duration(hours) * time.Hour)

	// Build query
	query := db.Where("created_at > ?", since)

	// Match any of the provided identifiers
	conditions := []string{}
	args := []interface{}{}

	if nick != "" {
		conditions = append(conditions, "nick = ?")
		args = append(args, nick)
	}
	if ip != "" {
		conditions = append(conditions, "ip = ?")
		args = append(args, ip)
	}
	if account != "" {
		conditions = append(conditions, "account = ?")
		args = append(args, account)
	}

	if len(conditions) > 0 {
		queryStr := ""
		for i, cond := range conditions {
			if i > 0 {
				queryStr += " OR "
			}
			queryStr += cond
		}
		query = query.Where(queryStr, args...)
	}

	// Limit results
	limit := 500
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 2000 {
			limit = parsed
		}
	}

	var events []models.UserJourneyEvent
	if err := query.Order("created_at DESC").Limit(limit).Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user journey"})
		return
	}

	c.JSON(http.StatusOK, events)
}

// GetUserJourneyByNick is a convenience endpoint to get journey by nick
func GetUserJourneyByNick(c *gin.Context) {
	nick := c.Param("nick")
	if nick == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nick is required"})
		return
	}

	// Add nick to query params and delegate
	c.Request.URL.RawQuery += "&nick=" + nick
	GetUserJourney(c)
}

// GetUserJourneyStats returns statistics about user journey events
func GetUserJourneyStats(c *gin.Context) {
	db := database.Get()

	// Get event type distribution
	var eventTypes []struct {
		EventType string `gorm:"column:event_type"`
		Count     int64  `gorm:"column:count"`
	}

	db.Model(&models.UserJourneyEvent{}).
		Select("event_type, COUNT(*) as count").
		Group("event_type").
		Order("count DESC").
		Scan(&eventTypes)

	// Get recent activity counts
	periods := map[string]time.Duration{
		"hour": time.Hour,
		"day":  24 * time.Hour,
		"week": 7 * 24 * time.Hour,
	}

	activity := make(map[string]int64)
	for name, duration := range periods {
		since := time.Now().Add(-duration)
		var count int64
		db.Model(&models.UserJourneyEvent{}).Where("created_at > ?", since).Count(&count)
		activity[name] = count
	}

	// Get unique users in last 24h
	var uniqueNicks int64
	db.Model(&models.UserJourneyEvent{}).
		Where("created_at > ? AND nick != ''", time.Now().Add(-24*time.Hour)).
		Select("COUNT(DISTINCT nick)").
		Scan(&uniqueNicks)

	c.JSON(http.StatusOK, gin.H{
		"event_types":  eventTypes,
		"activity":     activity,
		"unique_users": uniqueNicks,
	})
}

// RecordJourneyEvent records a new journey event (called internally or from webhooks)
func RecordJourneyEvent(eventType, nick, ip, account, server string, details map[string]interface{}) error {
	db := database.Get()

	detailsJSON, _ := json.Marshal(details)

	event := models.UserJourneyEvent{
		Nick:      nick,
		IP:        ip,
		Account:   account,
		EventType: eventType,
		Details:   string(detailsJSON),
		Server:    server,
	}

	return db.Create(&event).Error
}

// SearchJourneyEvents searches journey events by criteria
func SearchJourneyEvents(c *gin.Context) {
	db := database.Get()

	var req struct {
		Nick       string   `json:"nick"`
		IP         string   `json:"ip"`
		Account    string   `json:"account"`
		EventTypes []string `json:"event_types"`
		StartTime  string   `json:"start_time"`
		EndTime    string   `json:"end_time"`
		Server     string   `json:"server"`
		Limit      int      `json:"limit"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	query := db.Model(&models.UserJourneyEvent{})

	if req.Nick != "" {
		query = query.Where("nick LIKE ?", "%"+req.Nick+"%")
	}
	if req.IP != "" {
		query = query.Where("ip LIKE ?", "%"+req.IP+"%")
	}
	if req.Account != "" {
		query = query.Where("account LIKE ?", "%"+req.Account+"%")
	}
	if len(req.EventTypes) > 0 {
		query = query.Where("event_type IN ?", req.EventTypes)
	}
	if req.StartTime != "" {
		if t, err := time.Parse(time.RFC3339, req.StartTime); err == nil {
			query = query.Where("created_at >= ?", t)
		}
	}
	if req.EndTime != "" {
		if t, err := time.Parse(time.RFC3339, req.EndTime); err == nil {
			query = query.Where("created_at <= ?", t)
		}
	}
	if req.Server != "" {
		query = query.Where("server = ?", req.Server)
	}

	limit := 500
	if req.Limit > 0 && req.Limit <= 2000 {
		limit = req.Limit
	}

	var events []models.UserJourneyEvent
	if err := query.Order("created_at DESC").Limit(limit).Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search journey events"})
		return
	}

	c.JSON(http.StatusOK, events)
}

// GetJourneyEventTypes returns all known event types
func GetJourneyEventTypes(c *gin.Context) {
	eventTypes := []map[string]string{
		{"type": "connect", "description": "User connected to server", "category": "connection"},
		{"type": "disconnect", "description": "User disconnected from server", "category": "connection"},
		{"type": "nick_change", "description": "User changed nickname", "category": "identity"},
		{"type": "account_login", "description": "User logged into account", "category": "identity"},
		{"type": "join", "description": "User joined a channel", "category": "channel"},
		{"type": "part", "description": "User left a channel", "category": "channel"},
		{"type": "kick", "description": "User was kicked from channel", "category": "channel"},
		{"type": "ban", "description": "User was banned", "category": "moderation"},
		{"type": "unban", "description": "User was unbanned", "category": "moderation"},
		{"type": "kill", "description": "User was killed by operator", "category": "moderation"},
		{"type": "oper", "description": "User gained operator status", "category": "privilege"},
		{"type": "deoper", "description": "User lost operator status", "category": "privilege"},
		{"type": "mode_change", "description": "User mode was changed", "category": "privilege"},
		{"type": "message", "description": "Notable message (e.g., spamfilter)", "category": "activity"},
	}

	c.JSON(http.StatusOK, eventTypes)
}

// CleanupOldJourneyEvents removes events older than specified duration
func CleanupOldJourneyEvents(c *gin.Context) {
	days := 30
	if d := c.Query("days"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil && parsed > 0 {
			days = parsed
		}
	}

	cutoff := time.Now().Add(-time.Duration(days) * 24 * time.Hour)
	db := database.Get()

	result := db.Where("created_at < ?", cutoff).Delete(&models.UserJourneyEvent{})

	c.JSON(http.StatusOK, gin.H{
		"deleted": result.RowsAffected,
		"cutoff":  cutoff,
	})
}
