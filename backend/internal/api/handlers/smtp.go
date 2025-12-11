package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/middleware"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/services/audit"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/services/email"
)

// SmtpSettingsRequest represents a request to update SMTP settings
type SmtpSettingsRequest struct {
	Host        string `json:"host"`
	Port        int    `json:"port"`
	Username    string `json:"username"`
	Password    string `json:"password"` // Empty string means don't update
	FromAddress string `json:"from_address"`
	FromName    string `json:"from_name"`
	UseTLS      bool   `json:"use_tls"`
	UseStartTLS bool   `json:"use_starttls"`
	Enabled     bool   `json:"enabled"`
}

// TestEmailRequest represents a request to send a test email
type TestEmailRequest struct {
	To string `json:"to" binding:"required,email"`
}

// GetSmtpSettings returns the current SMTP settings
func GetSmtpSettings(c *gin.Context) {
	settings := email.GetService().GetSettings()
	if settings == nil {
		c.JSON(http.StatusOK, gin.H{
			"configured": false,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"configured": true,
		"settings":   settings,
	})
}

// UpdateSmtpSettings updates the SMTP settings
func UpdateSmtpSettings(c *gin.Context) {
	var req SmtpSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.Get()

	// Get existing settings or create new
	var settings models.SmtpSettings
	db.First(&settings)

	// Update fields
	settings.Host = req.Host
	settings.Port = req.Port
	settings.Username = req.Username
	settings.FromAddress = req.FromAddress
	settings.FromName = req.FromName
	settings.UseTLS = req.UseTLS
	settings.UseStartTLS = req.UseStartTLS
	settings.Enabled = req.Enabled

	// Only update password if provided
	if req.Password != "" {
		settings.Password = req.Password
	}

	var err error
	if settings.ID == 0 {
		err = db.Create(&settings).Error
	} else {
		err = db.Save(&settings).Error
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save SMTP settings"})
		return
	}

	// Refresh the email service settings
	email.GetService().RefreshSettings()

	// Log the action
	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		logAction(c, currentUser, "update_smtp_settings", nil)
		// Log to IRC server
		audit.LogSMTPUpdate(currentUser.Username, req.Host)
	}

	// Return settings without password
	settings.Password = ""
	c.JSON(http.StatusOK, settings)
}

// TestSmtpSettings tests the SMTP settings by sending a test email
func TestSmtpSettings(c *gin.Context) {
	var req TestEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get current settings from database
	db := database.Get()
	var settings models.SmtpSettings
	if err := db.First(&settings).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "SMTP settings not configured"})
		return
	}

	// Send test email
	if err := email.GetService().SendTestEmail(&settings, req.To); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Test email sent successfully"})
}

// UserNotificationPreferenceRequest represents a request to update notification preferences
type UserNotificationPreferenceRequest struct {
	Email   string   `json:"email"`
	Enabled bool     `json:"enabled"`
	Events  []string `json:"events"`
}

// GetNotificationPreferences returns the current user's notification preferences
func GetNotificationPreferences(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	db := database.Get()
	var pref models.UserNotificationPreference

	if err := db.Where("user_id = ?", currentUser.ID).First(&pref).Error; err != nil {
		// No preferences set yet - return defaults
		c.JSON(http.StatusOK, gin.H{
			"configured": false,
			"email":      currentUser.Email,
			"enabled":    false,
			"events":     []string{},
		})
		return
	}

	// Parse the events JSON
	var events []string
	if pref.Events != "" {
		json.Unmarshal([]byte(pref.Events), &events)
	}

	// Determine which email to show
	emailToShow := pref.Email
	if emailToShow == "" {
		emailToShow = currentUser.Email
	}

	c.JSON(http.StatusOK, gin.H{
		"configured": true,
		"email":      emailToShow,
		"enabled":    pref.Enabled,
		"events":     events,
	})
}

// UpdateNotificationPreferences updates the current user's notification preferences
func UpdateNotificationPreferences(c *gin.Context) {
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	var req UserNotificationPreferenceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.Get()

	// Get existing preferences or create new
	var pref models.UserNotificationPreference
	db.Where("user_id = ?", currentUser.ID).First(&pref)

	pref.UserID = currentUser.ID
	pref.Email = req.Email
	pref.Enabled = req.Enabled

	// Serialize events to JSON
	eventsJSON, _ := json.Marshal(req.Events)
	pref.Events = string(eventsJSON)

	var err error
	if pref.ID == 0 {
		err = db.Create(&pref).Error
	} else {
		err = db.Save(&pref).Error
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save notification preferences"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Notification preferences saved",
		"email":   pref.Email,
		"enabled": pref.Enabled,
		"events":  req.Events,
	})
}

// GetNotificationEventTypes returns all available notification event types
func GetNotificationEventTypes(c *gin.Context) {
	var result []struct {
		Type        string `json:"type"`
		Name        string `json:"name"`
		Description string `json:"description"`
		Category    string `json:"category"`
		HighVolume  bool   `json:"high_volume"`
	}

	for _, et := range models.NotificationEventTypes {
		result = append(result, struct {
			Type        string `json:"type"`
			Name        string `json:"name"`
			Description string `json:"description"`
			Category    string `json:"category"`
			HighVolume  bool   `json:"high_volume"`
		}{
			Type:        string(et.Type),
			Name:        et.Name,
			Description: et.Description,
			Category:    et.Category,
			HighVolume:  et.HighVolume,
		})
	}

	c.JSON(http.StatusOK, result)
}

// GetSmtpStatus returns whether SMTP is configured (for non-admins to check)
func GetSmtpStatus(c *gin.Context) {
	configured := email.GetService().IsConfigured()
	c.JSON(http.StatusOK, gin.H{
		"configured": configured,
	})
}
