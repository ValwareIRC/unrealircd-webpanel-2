package handlers

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/middleware"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
)

// CreateAlertRuleRequest represents a request to create an alert rule
type CreateAlertRuleRequest struct {
	Name        string                  `json:"name" binding:"required"`
	Description string                  `json:"description"`
	EventType   string                  `json:"event_type" binding:"required"`
	Conditions  []models.AlertCondition `json:"conditions"`
	Actions     []models.AlertAction    `json:"actions" binding:"required"`
	Priority    int                     `json:"priority"`
	Cooldown    int                     `json:"cooldown"`
}

// UpdateAlertRuleRequest represents a request to update an alert rule
type UpdateAlertRuleRequest struct {
	Name        string                  `json:"name"`
	Description string                  `json:"description"`
	EventType   string                  `json:"event_type"`
	Conditions  []models.AlertCondition `json:"conditions"`
	Actions     []models.AlertAction    `json:"actions"`
	IsEnabled   *bool                   `json:"is_enabled"`
	Priority    *int                    `json:"priority"`
	Cooldown    *int                    `json:"cooldown"`
}

// GetAlertRules returns all alert rules
func GetAlertRules(c *gin.Context) {
	db := database.Get()
	var rules []models.AlertRule

	query := db.Where("deleted_at IS NULL").Order("priority DESC, created_at DESC")

	// Filter by enabled status
	if enabled := c.Query("enabled"); enabled != "" {
		query = query.Where("is_enabled = ?", enabled == "true")
	}

	// Filter by event type
	if eventType := c.Query("event_type"); eventType != "" {
		query = query.Where("event_type = ?", eventType)
	}

	if err := query.Find(&rules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch alert rules"})
		return
	}

	c.JSON(http.StatusOK, rules)
}

// GetAlertRule returns a single alert rule
func GetAlertRule(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	db := database.Get()
	var rule models.AlertRule

	if err := db.Where("id = ? AND deleted_at IS NULL", id).First(&rule).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Alert rule not found"})
		return
	}

	c.JSON(http.StatusOK, rule)
}

// CreateAlertRule creates a new alert rule
func CreateAlertRule(c *gin.Context) {
	var req CreateAlertRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get current user
	user := middleware.GetCurrentUser(c)

	// Serialize conditions and actions
	conditionsJSON, _ := json.Marshal(req.Conditions)
	actionsJSON, _ := json.Marshal(req.Actions)

	rule := models.AlertRule{
		Name:          req.Name,
		Description:   req.Description,
		EventType:     req.EventType,
		Conditions:    string(conditionsJSON),
		Actions:       string(actionsJSON),
		IsEnabled:     true,
		Priority:      req.Priority,
		Cooldown:      req.Cooldown,
		CreatedBy:     user.ID,
		CreatedByUser: user.Username,
	}

	db := database.Get()
	if err := db.Create(&rule).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create alert rule"})
		return
	}

	c.JSON(http.StatusCreated, rule)
}

// UpdateAlertRule updates an existing alert rule
func UpdateAlertRule(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var req UpdateAlertRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.Get()
	var rule models.AlertRule

	if err := db.Where("id = ? AND deleted_at IS NULL", id).First(&rule).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Alert rule not found"})
		return
	}

	// Update fields
	if req.Name != "" {
		rule.Name = req.Name
	}
	if req.Description != "" {
		rule.Description = req.Description
	}
	if req.EventType != "" {
		rule.EventType = req.EventType
	}
	if req.Conditions != nil {
		conditionsJSON, _ := json.Marshal(req.Conditions)
		rule.Conditions = string(conditionsJSON)
	}
	if req.Actions != nil {
		actionsJSON, _ := json.Marshal(req.Actions)
		rule.Actions = string(actionsJSON)
	}
	if req.IsEnabled != nil {
		rule.IsEnabled = *req.IsEnabled
	}
	if req.Priority != nil {
		rule.Priority = *req.Priority
	}
	if req.Cooldown != nil {
		rule.Cooldown = *req.Cooldown
	}

	if err := db.Save(&rule).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update alert rule"})
		return
	}

	c.JSON(http.StatusOK, rule)
}

// DeleteAlertRule deletes an alert rule
func DeleteAlertRule(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	db := database.Get()
	result := db.Where("id = ?", id).Delete(&models.AlertRule{})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete alert rule"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Alert rule not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Alert rule deleted"})
}

// ToggleAlertRule toggles the enabled state of an alert rule
func ToggleAlertRule(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	db := database.Get()
	var rule models.AlertRule

	if err := db.Where("id = ? AND deleted_at IS NULL", id).First(&rule).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Alert rule not found"})
		return
	}

	rule.IsEnabled = !rule.IsEnabled

	if err := db.Save(&rule).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle alert rule"})
		return
	}

	c.JSON(http.StatusOK, rule)
}

// TestAlertRule tests an alert rule against sample data
func TestAlertRule(c *gin.Context) {
	var req struct {
		Conditions []models.AlertCondition `json:"conditions"`
		TestData   map[string]interface{}  `json:"test_data"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Test each condition
	results := make([]map[string]interface{}, len(req.Conditions))
	allMatch := true

	for i, condition := range req.Conditions {
		value, ok := req.TestData[condition.Field]
		valueStr := ""
		if ok {
			valueStr = toString(value)
		}

		matched := evaluateCondition(condition, valueStr)
		results[i] = map[string]interface{}{
			"field":    condition.Field,
			"operator": condition.Operator,
			"expected": condition.Value,
			"actual":   valueStr,
			"matched":  matched,
		}
		if !matched {
			allMatch = false
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"all_matched": allMatch,
		"results":     results,
	})
}

// GetAlertRuleStats returns statistics about alert rules
func GetAlertRuleStats(c *gin.Context) {
	db := database.Get()

	var stats struct {
		TotalRules     int64 `json:"total_rules"`
		EnabledRules   int64 `json:"enabled_rules"`
		TotalTriggers  int64 `json:"total_triggers"`
		RecentTriggers int64 `json:"recent_triggers"`
	}

	db.Model(&models.AlertRule{}).Where("deleted_at IS NULL").Count(&stats.TotalRules)
	db.Model(&models.AlertRule{}).Where("deleted_at IS NULL AND is_enabled = ?", true).Count(&stats.EnabledRules)

	// Sum trigger counts
	var triggerSum struct {
		Total int64
	}
	db.Model(&models.AlertRule{}).Where("deleted_at IS NULL").Select("COALESCE(SUM(trigger_count), 0) as total").Scan(&triggerSum)
	stats.TotalTriggers = triggerSum.Total

	// Count rules triggered in last 24 hours
	yesterday := time.Now().Add(-24 * time.Hour)
	db.Model(&models.AlertRule{}).Where("deleted_at IS NULL AND last_triggered > ?", yesterday).Count(&stats.RecentTriggers)

	c.JSON(http.StatusOK, stats)
}

// ProcessAlertRules evaluates all enabled alert rules against an event
// This is called from the webhook handler when events are received
func ProcessAlertRules(event *UnrealIRCdLogEvent, rawPayload []byte) {
	db := database.Get()
	var rules []models.AlertRule

	// Get all enabled rules for this event type (or wildcard rules)
	if err := db.Where("deleted_at IS NULL AND is_enabled = ? AND (event_type = ? OR event_type = '*')", true, event.Subsystem).
		Order("priority DESC").Find(&rules).Error; err != nil {
		return
	}

	// Build event data map
	eventData := map[string]string{
		"subsystem": event.Subsystem,
		"event_id":  event.EventID,
		"level":     event.Level,
		"message":   event.Msg,
		"timestamp": event.Timestamp,
	}

	// Process each rule
	for _, rule := range rules {
		// Check cooldown
		if rule.Cooldown > 0 && rule.LastTriggered != nil {
			cooldownEnd := rule.LastTriggered.Add(time.Duration(rule.Cooldown) * time.Second)
			if time.Now().Before(cooldownEnd) {
				continue // Skip, still in cooldown
			}
		}

		// Parse conditions
		var conditions []models.AlertCondition
		if err := json.Unmarshal([]byte(rule.Conditions), &conditions); err != nil {
			continue
		}

		// Evaluate conditions
		if !evaluateAllConditions(conditions, eventData) {
			continue // Conditions not met
		}

		// Parse and execute actions
		var actions []models.AlertAction
		if err := json.Unmarshal([]byte(rule.Actions), &actions); err != nil {
			continue
		}

		// Execute enabled actions
		for _, action := range actions {
			if action.Enabled {
				executeAlertAction(action, event, &rule)
			}
		}

		// Update rule stats
		now := time.Now()
		rule.LastTriggered = &now
		rule.TriggerCount++
		db.Save(&rule)
	}
}

// evaluateAllConditions checks if all conditions match
func evaluateAllConditions(conditions []models.AlertCondition, data map[string]string) bool {
	if len(conditions) == 0 {
		return true // No conditions = always match
	}

	for _, condition := range conditions {
		value := data[condition.Field]
		if !evaluateCondition(condition, value) {
			return false
		}
	}
	return true
}

// evaluateCondition evaluates a single condition
func evaluateCondition(condition models.AlertCondition, value string) bool {
	switch condition.Operator {
	case "equals":
		return strings.EqualFold(value, condition.Value)
	case "not_equals":
		return !strings.EqualFold(value, condition.Value)
	case "contains":
		return strings.Contains(strings.ToLower(value), strings.ToLower(condition.Value))
	case "not_contains":
		return !strings.Contains(strings.ToLower(value), strings.ToLower(condition.Value))
	case "regex":
		re, err := regexp.Compile(condition.Value)
		if err != nil {
			return false
		}
		return re.MatchString(value)
	case "starts_with":
		return strings.HasPrefix(strings.ToLower(value), strings.ToLower(condition.Value))
	case "ends_with":
		return strings.HasSuffix(strings.ToLower(value), strings.ToLower(condition.Value))
	default:
		return false
	}
}

// executeAlertAction executes a single alert action
func executeAlertAction(action models.AlertAction, event *UnrealIRCdLogEvent, rule *models.AlertRule) {
	switch action.Type {
	case "webhook":
		executeWebhookAction(action.Config, event, rule)
	case "discord":
		executeDiscordAction(action.Config, event, rule)
	case "slack":
		executeSlackAction(action.Config, event, rule)
	case "log":
		executeLogAction(action.Config, event, rule)
	}
}

// executeWebhookAction sends a webhook to a custom URL
func executeWebhookAction(config map[string]interface{}, event *UnrealIRCdLogEvent, rule *models.AlertRule) {
	url, ok := config["url"].(string)
	if !ok || url == "" {
		return
	}

	payload := map[string]interface{}{
		"rule":      rule.Name,
		"event":     event,
		"timestamp": time.Now().Format(time.RFC3339),
	}

	payloadJSON, _ := json.Marshal(payload)
	http.Post(url, "application/json", strings.NewReader(string(payloadJSON)))
}

// executeDiscordAction sends a message to Discord
func executeDiscordAction(config map[string]interface{}, event *UnrealIRCdLogEvent, rule *models.AlertRule) {
	webhookURL, ok := config["webhook_url"].(string)
	if !ok || webhookURL == "" {
		return
	}

	// Build Discord embed
	color := 0x3498db // Blue default
	switch event.Level {
	case "error", "fatal":
		color = 0xe74c3c // Red
	case "warn":
		color = 0xf39c12 // Orange
	}

	payload := map[string]interface{}{
		"embeds": []map[string]interface{}{
			{
				"title":       "🚨 " + rule.Name,
				"description": event.Msg,
				"color":       color,
				"fields": []map[string]interface{}{
					{"name": "Subsystem", "value": event.Subsystem, "inline": true},
					{"name": "Level", "value": event.Level, "inline": true},
					{"name": "Event ID", "value": event.EventID, "inline": true},
				},
				"timestamp": time.Now().Format(time.RFC3339),
			},
		},
	}

	payloadJSON, _ := json.Marshal(payload)
	http.Post(webhookURL, "application/json", strings.NewReader(string(payloadJSON)))
}

// executeSlackAction sends a message to Slack
func executeSlackAction(config map[string]interface{}, event *UnrealIRCdLogEvent, rule *models.AlertRule) {
	webhookURL, ok := config["webhook_url"].(string)
	if !ok || webhookURL == "" {
		return
	}

	// Build Slack message
	emoji := ":information_source:"
	switch event.Level {
	case "error", "fatal":
		emoji = ":x:"
	case "warn":
		emoji = ":warning:"
	}

	payload := map[string]interface{}{
		"text": emoji + " *" + rule.Name + "*",
		"attachments": []map[string]interface{}{
			{
				"text": event.Msg,
				"fields": []map[string]interface{}{
					{"title": "Subsystem", "value": event.Subsystem, "short": true},
					{"title": "Level", "value": event.Level, "short": true},
				},
			},
		},
	}

	payloadJSON, _ := json.Marshal(payload)
	http.Post(webhookURL, "application/json", strings.NewReader(string(payloadJSON)))
}

// executeLogAction logs the alert to the database
func executeLogAction(config map[string]interface{}, event *UnrealIRCdLogEvent, rule *models.AlertRule) {
	db := database.Get()

	// Create audit log entry
	auditLog := models.AuditLog{
		Action:  "alert_triggered",
		Details: "Alert rule '" + rule.Name + "' triggered: " + event.Msg,
	}

	db.Create(&auditLog)
}

// Helper function to convert interface{} to string
func toString(v interface{}) string {
	if v == nil {
		return ""
	}
	switch val := v.(type) {
	case string:
		return val
	case float64:
		return strconv.FormatFloat(val, 'f', -1, 64)
	case int:
		return strconv.Itoa(val)
	case bool:
		return strconv.FormatBool(val)
	default:
		b, _ := json.Marshal(v)
		return string(b)
	}
}
