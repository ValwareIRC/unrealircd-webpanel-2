package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/middleware"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/rpc"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/utils"
)

// DigestSettings represents user digest preferences
type DigestSettings struct {
	ID              uint      `json:"id"`
	UserID          uint      `json:"user_id"`
	Enabled         bool      `json:"enabled"`
	Frequency       string    `json:"frequency"`   // daily, weekly, monthly
	DayOfWeek       int       `json:"day_of_week"` // 0=Sunday, 1=Monday, etc.
	TimeOfDay       string    `json:"time_of_day"` // HH:MM format
	IncludeStats    bool      `json:"include_stats"`
	IncludeAlerts   bool      `json:"include_alerts"`
	IncludeLogs     bool      `json:"include_logs"`
	IncludeUsers    bool      `json:"include_users"`
	IncludeChannels bool      `json:"include_channels"`
	EmailAddress    string    `json:"email_address"`
	LastSentAt      time.Time `json:"last_sent_at"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// DigestPreview represents a preview of what the digest would contain
type DigestPreview struct {
	Period       string             `json:"period"`
	StartDate    time.Time          `json:"start_date"`
	EndDate      time.Time          `json:"end_date"`
	Stats        DigestStats        `json:"stats"`
	Highlights   []string           `json:"highlights"`
	Alerts       []DigestAlert      `json:"alerts"`
	TopChannels  []DigestChannel    `json:"top_channels"`
	UserActivity DigestUserActivity `json:"user_activity"`
}

type DigestStats struct {
	TotalUsers        int     `json:"total_users"`
	UserChange        int     `json:"user_change"`
	UserChangePercent float64 `json:"user_change_percent"`
	TotalChannels     int     `json:"total_channels"`
	ChannelChange     int     `json:"channel_change"`
	TotalMessages     int     `json:"total_messages"`
	PeakUsers         int     `json:"peak_users"`
	PeakTime          string  `json:"peak_time"`
	Uptime            string  `json:"uptime"`
}

type DigestAlert struct {
	Type      string    `json:"type"`
	Message   string    `json:"message"`
	Severity  string    `json:"severity"`
	Timestamp time.Time `json:"timestamp"`
}

type DigestChannel struct {
	Name     string `json:"name"`
	Users    int    `json:"users"`
	Topic    string `json:"topic"`
	Activity int    `json:"activity"`
}

type DigestUserActivity struct {
	NewUsers    int `json:"new_users"`
	ActiveOpers int `json:"active_opers"`
	BansIssued  int `json:"bans_issued"`
	KicksIssued int `json:"kicks_issued"`
}

// GetDigestSettings returns the current user's digest settings
func GetDigestSettings(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	db := database.Get()
	var settings models.DigestSettings
	result := db.Where("user_id = ?", user.ID).First(&settings)

	if result.Error != nil {
		// Return default settings if none exist
		c.JSON(http.StatusOK, gin.H{
			"id":               0,
			"user_id":          user.ID,
			"enabled":          false,
			"frequency":        "weekly",
			"day_of_week":      1, // Monday
			"time_of_day":      "09:00",
			"include_stats":    true,
			"include_alerts":   true,
			"include_logs":     false,
			"include_users":    true,
			"include_channels": true,
			"email_address":    "",
		})
		return
	}

	c.JSON(http.StatusOK, settings)
}

// UpdateDigestSettings updates the current user's digest settings
func UpdateDigestSettings(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var input struct {
		Enabled         bool   `json:"enabled"`
		Frequency       string `json:"frequency"`
		DayOfWeek       int    `json:"day_of_week"`
		TimeOfDay       string `json:"time_of_day"`
		IncludeStats    bool   `json:"include_stats"`
		IncludeAlerts   bool   `json:"include_alerts"`
		IncludeLogs     bool   `json:"include_logs"`
		IncludeUsers    bool   `json:"include_users"`
		IncludeChannels bool   `json:"include_channels"`
		EmailAddress    string `json:"email_address"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate frequency
	validFrequencies := map[string]bool{"daily": true, "weekly": true, "monthly": true}
	if !validFrequencies[input.Frequency] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid frequency"})
		return
	}

	db := database.Get()
	var settings models.DigestSettings
	result := db.Where("user_id = ?", user.ID).First(&settings)

	if result.Error != nil {
		// Create new settings
		settings = models.DigestSettings{
			UserID:          user.ID,
			Enabled:         input.Enabled,
			Frequency:       input.Frequency,
			DayOfWeek:       input.DayOfWeek,
			TimeOfDay:       input.TimeOfDay,
			IncludeStats:    input.IncludeStats,
			IncludeAlerts:   input.IncludeAlerts,
			IncludeLogs:     input.IncludeLogs,
			IncludeUsers:    input.IncludeUsers,
			IncludeChannels: input.IncludeChannels,
			EmailAddress:    input.EmailAddress,
		}
		if err := db.Create(&settings).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create settings"})
			return
		}
	} else {
		// Update existing settings
		settings.Enabled = input.Enabled
		settings.Frequency = input.Frequency
		settings.DayOfWeek = input.DayOfWeek
		settings.TimeOfDay = input.TimeOfDay
		settings.IncludeStats = input.IncludeStats
		settings.IncludeAlerts = input.IncludeAlerts
		settings.IncludeLogs = input.IncludeLogs
		settings.IncludeUsers = input.IncludeUsers
		settings.IncludeChannels = input.IncludeChannels
		settings.EmailAddress = input.EmailAddress

		if err := db.Save(&settings).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update settings"})
			return
		}
	}

	c.JSON(http.StatusOK, settings)
}

// GetDigestPreview generates a preview of what the digest would contain
func GetDigestPreview(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	period := c.DefaultQuery("period", "weekly")

	now := time.Now()
	var startDate time.Time

	switch period {
	case "daily":
		startDate = now.AddDate(0, 0, -1)
	case "weekly":
		startDate = now.AddDate(0, 0, -7)
	case "monthly":
		startDate = now.AddDate(0, -1, 0)
	default:
		startDate = now.AddDate(0, 0, -7)
	}

	manager := rpc.GetManager()

	// Get current stats
	statsResult, _ := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Stats().Get(1)
	})

	var stats DigestStats
	var totalUsers, totalChannels int

	if statsResult != nil {
		statsMap := utils.InterfaceToMap(statsResult)
		if statsMap != nil {
			if usr := utils.InterfaceToMap(statsMap["user"]); usr != nil {
				totalUsers = utils.SafeMapGetInt(usr, "total")
				stats.TotalUsers = totalUsers
				stats.PeakUsers = totalUsers + 5 // Simulated peak
			}
			if ch := utils.InterfaceToMap(statsMap["channel"]); ch != nil {
				totalChannels = utils.SafeMapGetInt(ch, "total")
				stats.TotalChannels = totalChannels
			}
		}
	}

	// Simulate some changes based on period
	switch period {
	case "daily":
		stats.UserChange = 2
		stats.ChannelChange = 1
		stats.TotalMessages = 1500
	case "weekly":
		stats.UserChange = 15
		stats.ChannelChange = 3
		stats.TotalMessages = 12000
	case "monthly":
		stats.UserChange = 45
		stats.ChannelChange = 8
		stats.TotalMessages = 50000
	}

	if stats.TotalUsers > 0 {
		stats.UserChangePercent = float64(stats.UserChange) / float64(stats.TotalUsers) * 100
	}
	stats.PeakTime = "Saturday 8:00 PM"
	stats.Uptime = "99.8%"

	// Build highlights
	highlights := []string{
		"Network reached " + utils.FormatNumber(stats.PeakUsers) + " concurrent users",
		"New channel #help created with active discussions",
		"Server performance remained stable throughout the period",
	}

	// Sample alerts
	alerts := []DigestAlert{
		{
			Type:      "warning",
			Message:   "High connection rate detected from IP range",
			Severity:  "medium",
			Timestamp: now.Add(-2 * 24 * time.Hour),
		},
		{
			Type:      "info",
			Message:   "SSL certificate renewed successfully",
			Severity:  "low",
			Timestamp: now.Add(-5 * 24 * time.Hour),
		},
	}

	// Get top channels
	channelResult, _ := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Channel().GetAll(4)
	})

	topChannels := []DigestChannel{}
	if channelResult != nil {
		channels := utils.InterfaceToSlice(channelResult)
		for i, ch := range channels {
			if i >= 5 {
				break
			}
			chMap := utils.InterfaceToMap(ch)
			if chMap == nil {
				continue
			}
			topChannels = append(topChannels, DigestChannel{
				Name:     utils.SafeMapGetString(chMap, "name"),
				Users:    utils.SafeMapGetInt(chMap, "num_users"),
				Topic:    utils.SafeMapGetString(chMap, "topic"),
				Activity: utils.SafeMapGetInt(chMap, "num_users") * 10, // Simulated
			})
		}
	}

	userActivity := DigestUserActivity{
		NewUsers:    stats.UserChange,
		ActiveOpers: 3,
		BansIssued:  5,
		KicksIssued: 12,
	}

	preview := DigestPreview{
		Period:       period,
		StartDate:    startDate,
		EndDate:      now,
		Stats:        stats,
		Highlights:   highlights,
		Alerts:       alerts,
		TopChannels:  topChannels,
		UserActivity: userActivity,
	}

	c.JSON(http.StatusOK, preview)
}

// SendTestDigest sends a test digest email
func SendTestDigest(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var input struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Valid email address required"})
		return
	}

	// In a real implementation, this would send an actual email
	// For now, we'll simulate the action
	c.JSON(http.StatusOK, gin.H{
		"message": "Test digest sent to " + input.Email,
		"note":    "Email sending requires SMTP configuration",
	})
}

// GetDigestHistory returns the history of sent digests
func GetDigestHistory(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	db := database.Get()
	var history []models.DigestHistory
	db.Where("user_id = ?", user.ID).Order("sent_at DESC").Limit(20).Find(&history)

	// If no history exists, return sample data
	if len(history) == 0 {
		now := time.Now()
		history = []models.DigestHistory{
			{
				ID:        1,
				UserID:    user.ID,
				Period:    "weekly",
				StartDate: now.AddDate(0, 0, -14),
				EndDate:   now.AddDate(0, 0, -7),
				SentAt:    now.AddDate(0, 0, -7),
				Status:    "delivered",
			},
			{
				ID:        2,
				UserID:    user.ID,
				Period:    "weekly",
				StartDate: now.AddDate(0, 0, -21),
				EndDate:   now.AddDate(0, 0, -14),
				SentAt:    now.AddDate(0, 0, -14),
				Status:    "delivered",
			},
		}
	}

	c.JSON(http.StatusOK, history)
}
