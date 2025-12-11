package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/middleware"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/hooks"
)

// CreateWebhookRequest represents a request to create a webhook token
type CreateWebhookRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

// UpdateWebhookRequest represents a request to update a webhook token
type UpdateWebhookRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Enabled     *bool  `json:"enabled"`
}

// WebhookConfigResponse represents the response with the generated UnrealIRCd config
type WebhookConfigResponse struct {
	Token      models.WebhookToken `json:"token"`
	WebhookURL string              `json:"webhook_url"`
	Config     string              `json:"config"`
}

// UnrealIRCdLogEvent represents a log event from UnrealIRCd webhook
type UnrealIRCdLogEvent struct {
	Timestamp  string                 `json:"timestamp"`
	Level      string                 `json:"level"`
	Subsystem  string                 `json:"subsystem"`
	EventID    string                 `json:"event_id"`
	LogSource  string                 `json:"log_source"`
	Msg        string                 `json:"msg"`
	Source     map[string]interface{} `json:"source,omitempty"`
	Additional map[string]interface{} `json:"-"` // For any extra fields
}

// WebhookEventData is passed to hooks when a webhook is received
type WebhookEventData struct {
	Token      *models.WebhookToken
	Log        *models.WebhookLog
	Event      *UnrealIRCdLogEvent
	RawPayload []byte
}

// generateToken generates a cryptographically secure random token
func generateToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// GetWebhookTokens returns all webhook tokens
func GetWebhookTokens(c *gin.Context) {
	db := database.Get()
	var tokens []models.WebhookToken

	if err := db.Where("deleted_at IS NULL").Order("created_at DESC").Find(&tokens).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch webhook tokens"})
		return
	}

	c.JSON(http.StatusOK, tokens)
}

// GetWebhookToken returns a specific webhook token
func GetWebhookToken(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid token ID"})
		return
	}

	db := database.Get()
	var token models.WebhookToken

	if err := db.First(&token, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Webhook token not found"})
		return
	}

	c.JSON(http.StatusOK, token)
}

// CreateWebhookToken creates a new webhook token
func CreateWebhookToken(c *gin.Context) {
	var req CreateWebhookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	// Generate a secure token (16 bytes = 32 hex chars)
	tokenStr, err := generateToken(16)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Get current user
	currentUser := middleware.GetCurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	token := models.WebhookToken{
		Name:              req.Name,
		Token:             tokenStr,
		Description:       req.Description,
		CreatedBy:         currentUser.ID,
		CreatedByUsername: currentUser.Username,
		Enabled:           true,
	}

	db := database.Get()
	if err := db.Create(&token).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create webhook token"})
		return
	}

	// Log the action
	logAction(c, currentUser, "create_webhook_token", map[string]string{
		"token_id":   strconv.FormatUint(uint64(token.ID), 10),
		"token_name": token.Name,
	})

	c.JSON(http.StatusCreated, token)
}

// UpdateWebhookToken updates an existing webhook token
func UpdateWebhookToken(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid token ID"})
		return
	}

	var req UpdateWebhookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	db := database.Get()
	var token models.WebhookToken

	if err := db.First(&token, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Webhook token not found"})
		return
	}

	// Update fields
	if req.Name != "" {
		token.Name = req.Name
	}
	if req.Description != "" {
		token.Description = req.Description
	}
	if req.Enabled != nil {
		token.Enabled = *req.Enabled
	}

	if err := db.Save(&token).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update webhook token"})
		return
	}

	// Log the action
	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		logAction(c, currentUser, "update_webhook_token", map[string]string{
			"token_id":   strconv.FormatUint(uint64(token.ID), 10),
			"token_name": token.Name,
		})
	}

	c.JSON(http.StatusOK, token)
}

// DeleteWebhookToken deletes a webhook token
func DeleteWebhookToken(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid token ID"})
		return
	}

	db := database.Get()
	var token models.WebhookToken

	if err := db.First(&token, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Webhook token not found"})
		return
	}

	// Soft delete
	if err := db.Delete(&token).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete webhook token"})
		return
	}

	// Log the action
	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		logAction(c, currentUser, "delete_webhook_token", map[string]string{
			"token_id":   strconv.FormatUint(uint64(token.ID), 10),
			"token_name": token.Name,
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Webhook token deleted"})
}

// RegenerateWebhookToken regenerates the token string for a webhook
func RegenerateWebhookToken(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid token ID"})
		return
	}

	db := database.Get()
	var token models.WebhookToken

	if err := db.First(&token, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Webhook token not found"})
		return
	}

	// Generate a new token
	tokenStr, err := generateToken(16)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	token.Token = tokenStr

	if err := db.Save(&token).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update webhook token"})
		return
	}

	// Log the action
	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		logAction(c, currentUser, "regenerate_webhook_token", map[string]string{
			"token_id":   strconv.FormatUint(uint64(token.ID), 10),
			"token_name": token.Name,
		})
	}

	c.JSON(http.StatusOK, token)
}

// GetWebhookConfig returns the UnrealIRCd configuration for a webhook token
func GetWebhookConfig(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid token ID"})
		return
	}

	db := database.Get()
	var token models.WebhookToken

	if err := db.First(&token, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Webhook token not found"})
		return
	}

	// Build the webhook URL
	// Get the base URL from the request
	scheme := "https"
	if c.Request.TLS == nil {
		// Check for X-Forwarded-Proto header
		if proto := c.GetHeader("X-Forwarded-Proto"); proto != "" {
			scheme = proto
		} else {
			scheme = "http"
		}
	}
	host := c.Request.Host
	webhookURL := scheme + "://" + host + "/webhook/" + token.Token

	// Generate the UnrealIRCd config block
	config := `log {
	source {
		/* Recommended: Only log important events */
		error;    /* Any event that is an error */
		warn;     /* Warning messages */
		fatal;    /* Fatal errors */
		/* Uncomment additional sources as needed */
		/* link;     /* Server linking events */
		/* oper;     /* Oper-related events */
		/* connect;  /* User connect/disconnect */
		/* kill;     /* Kill events */
		/* all;      /* Everything (not recommended - very verbose) */
		!debug;   /* Exclude debug (recommended) */
	}
	destination {
		webhook "` + webhookURL + `";
	}
}`

	c.JSON(http.StatusOK, WebhookConfigResponse{
		Token:      token,
		WebhookURL: webhookURL,
		Config:     config,
	})
}

// GetWebhookLogs returns recent webhook log entries
func GetWebhookLogs(c *gin.Context) {
	db := database.Get()

	// Parse query parameters
	limit := 100
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 1000 {
			limit = l
		}
	}

	tokenID := c.Query("token_id")

	query := db.Order("created_at DESC").Limit(limit)
	if tokenID != "" {
		query = query.Where("token_id = ?", tokenID)
	}

	var logs []models.WebhookLog
	if err := query.Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch webhook logs"})
		return
	}

	c.JSON(http.StatusOK, logs)
}

// ReceiveWebhook handles incoming webhooks from UnrealIRCd
// This endpoint is PUBLIC (no auth required) - authentication is via the token in the URL
func ReceiveWebhook(c *gin.Context) {
	tokenStr := c.Param("token")
	if tokenStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing token"})
		return
	}

	// Look up the token
	db := database.Get()
	var token models.WebhookToken

	if err := db.Where("token = ? AND deleted_at IS NULL", tokenStr).First(&token).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	// Check if token is enabled
	if !token.Enabled {
		c.JSON(http.StatusForbidden, gin.H{"error": "Webhook is disabled"})
		return
	}

	// Read the body
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	// Parse the log event
	var event UnrealIRCdLogEvent
	if err := json.Unmarshal(body, &event); err != nil {
		// Still log it even if we can't parse it
		event = UnrealIRCdLogEvent{
			Msg: string(body),
		}
	}

	// Get source IP
	sourceIP := c.ClientIP()

	// Create webhook log entry
	logEntry := models.WebhookLog{
		TokenID:    token.ID,
		TokenName:  token.Name,
		EventType:  event.Subsystem,
		Subsystem:  event.Subsystem,
		EventID:    event.EventID,
		Level:      event.Level,
		Message:    event.Msg,
		RawPayload: string(body),
		SourceIP:   sourceIP,
	}

	if err := db.Create(&logEntry).Error; err != nil {
		// Log error but don't fail the request
		// We don't want UnrealIRCd to think the webhook failed
	}

	// Update token usage stats
	now := time.Now()
	token.LastUsedAt = &now
	token.UseCount++
	db.Save(&token)

	// Call hooks for extensibility (email notifications, etc.)
	hookData := &WebhookEventData{
		Token:      &token,
		Log:        &logEntry,
		Event:      &event,
		RawPayload: body,
	}
	hooks.RunAll(hooks.HookWebhookReceived, hookData)

	// Process alert rules asynchronously
	go ProcessAlertRules(&event, body)

	// Return success
	c.JSON(http.StatusOK, gin.H{"status": "received"})
}
