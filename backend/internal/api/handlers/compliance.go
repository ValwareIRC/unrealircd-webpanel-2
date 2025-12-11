package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	pathpkg "path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/middleware"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
)

// CreateComplianceReportRequest represents a request to create a compliance report
type CreateComplianceReportRequest struct {
	Type  string                 `json:"type" binding:"required"` // user_data, activity_log, full_export
	Query map[string]interface{} `json:"query"`                   // Search criteria
}

// GetComplianceReports returns all compliance reports
func GetComplianceReports(c *gin.Context) {
	db := database.Get()
	var reports []models.ComplianceReport

	query := db.Order("created_at DESC")

	// Filter by status
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	// Filter by type
	if reportType := c.Query("type"); reportType != "" {
		query = query.Where("type = ?", reportType)
	}

	// Limit results
	limit := 50
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	if err := query.Limit(limit).Find(&reports).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch compliance reports"})
		return
	}

	c.JSON(http.StatusOK, reports)
}

// GetComplianceReport returns a single compliance report
func GetComplianceReport(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	db := database.Get()
	var report models.ComplianceReport

	if err := db.Where("id = ?", id).First(&report).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Compliance report not found"})
		return
	}

	c.JSON(http.StatusOK, report)
}

// CreateComplianceReport creates a new compliance report request
func CreateComplianceReport(c *gin.Context) {
	var req CreateComplianceReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate report type
	validTypes := map[string]bool{
		"user_data":    true,
		"activity_log": true,
		"full_export":  true,
		"gdpr_request": true,
		"audit_log":    true,
	}
	if !validTypes[req.Type] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid report type"})
		return
	}

	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}
	queryJSON, _ := json.Marshal(req.Query)

	report := models.ComplianceReport{
		Type:                req.Type,
		Status:              "pending",
		Query:               string(queryJSON),
		RequestedBy:         user.ID,
		RequestedByUsername: user.Username,
	}

	db := database.Get()
	if err := db.Create(&report).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create compliance report"})
		return
	}

	// Start processing in background
	go processComplianceReport(report.ID)

	c.JSON(http.StatusCreated, report)
}

// processComplianceReport processes a compliance report in the background
func processComplianceReport(reportID uint) {
	db := database.Get()
	var report models.ComplianceReport

	if err := db.Where("id = ?", reportID).First(&report).Error; err != nil {
		return
	}

	// Update status to processing
	report.Status = "processing"
	db.Save(&report)

	// Parse query
	var query map[string]interface{}
	json.Unmarshal([]byte(report.Query), &query)

	// Generate report based on type
	var reportData interface{}
	var err error

	switch report.Type {
	case "user_data":
		reportData, err = generateUserDataReport(query)
	case "activity_log":
		reportData, err = generateActivityLogReport(query)
	case "full_export":
		reportData, err = generateFullExportReport(query)
	case "gdpr_request":
		reportData, err = generateGDPRReport(query)
	case "audit_log":
		reportData, err = generateAuditLogReport(query)
	default:
		err = fmt.Errorf("unknown report type: %s", report.Type)
	}

	if err != nil {
		report.Status = "failed"
		report.Error = err.Error()
		db.Save(&report)
		return
	}

	// Save report to file
	reportJSON, _ := json.MarshalIndent(reportData, "", "  ")
	filename := fmt.Sprintf("compliance_report_%d_%s.json", report.ID, time.Now().Format("20060102_150405"))
	reportPath := pathpkg.Join("data", "reports", filename)

	// Ensure directory exists
	os.MkdirAll(pathpkg.Join("data", "reports"), 0755)

	if err := os.WriteFile(reportPath, reportJSON, 0644); err != nil {
		report.Status = "failed"
		report.Error = "Failed to save report: " + err.Error()
		db.Save(&report)
		return
	}

	// Update report with completion info
	now := time.Now()
	report.Status = "completed"
	report.CompletedAt = &now
	report.ResultPath = reportPath
	db.Save(&report)
}

// generateUserDataReport generates a report of user-specific data
func generateUserDataReport(query map[string]interface{}) (map[string]interface{}, error) {
	db := database.Get()
	result := make(map[string]interface{})

	nick := ""
	ip := ""
	account := ""

	if n, ok := query["nick"].(string); ok {
		nick = n
	}
	if i, ok := query["ip"].(string); ok {
		ip = i
	}
	if a, ok := query["account"].(string); ok {
		account = a
	}

	result["query"] = query
	result["generated_at"] = time.Now()

	// Get journey events
	var events []models.UserJourneyEvent
	eventQuery := db.Model(&models.UserJourneyEvent{})
	if nick != "" {
		eventQuery = eventQuery.Or("nick = ?", nick)
	}
	if ip != "" {
		eventQuery = eventQuery.Or("ip = ?", ip)
	}
	if account != "" {
		eventQuery = eventQuery.Or("account = ?", account)
	}
	eventQuery.Order("created_at DESC").Limit(1000).Find(&events)
	result["journey_events"] = events

	// Get notes
	var notes []models.Note
	noteQuery := db.Model(&models.Note{})
	if nick != "" {
		noteQuery = noteQuery.Or("nick = ?", nick)
	}
	if ip != "" {
		noteQuery = noteQuery.Or("ip = ?", ip)
	}
	if account != "" {
		noteQuery = noteQuery.Or("account = ?", account)
	}
	noteQuery.Find(&notes)
	result["notes"] = notes

	// Get watch list entries
	var watchedUsers []models.WatchedUser
	watchQuery := db.Model(&models.WatchedUser{}).Where("deleted_at IS NULL")
	if nick != "" {
		watchQuery = watchQuery.Or("nick = ?", nick)
	}
	if ip != "" {
		watchQuery = watchQuery.Or("ip = ?", ip)
	}
	if account != "" {
		watchQuery = watchQuery.Or("account = ?", account)
	}
	watchQuery.Find(&watchedUsers)
	result["watch_list_entries"] = watchedUsers

	return result, nil
}

// generateActivityLogReport generates an activity log report
func generateActivityLogReport(query map[string]interface{}) (map[string]interface{}, error) {
	db := database.Get()
	result := make(map[string]interface{})

	result["query"] = query
	result["generated_at"] = time.Now()

	// Parse time range
	startTime := time.Now().Add(-30 * 24 * time.Hour) // Default 30 days
	endTime := time.Now()

	if st, ok := query["start_time"].(string); ok {
		if t, err := time.Parse(time.RFC3339, st); err == nil {
			startTime = t
		}
	}
	if et, ok := query["end_time"].(string); ok {
		if t, err := time.Parse(time.RFC3339, et); err == nil {
			endTime = t
		}
	}

	result["time_range"] = map[string]interface{}{
		"start": startTime,
		"end":   endTime,
	}

	// Get audit logs
	var auditLogs []models.AuditLog
	db.Where("created_at BETWEEN ? AND ?", startTime, endTime).
		Order("created_at DESC").
		Limit(5000).
		Find(&auditLogs)
	result["audit_logs"] = auditLogs

	// Get journey events
	var journeyEvents []models.UserJourneyEvent
	db.Where("created_at BETWEEN ? AND ?", startTime, endTime).
		Order("created_at DESC").
		Limit(5000).
		Find(&journeyEvents)
	result["journey_events"] = journeyEvents

	// Get webhook logs
	var webhookLogs []models.WebhookLog
	db.Where("created_at BETWEEN ? AND ?", startTime, endTime).
		Order("created_at DESC").
		Limit(5000).
		Find(&webhookLogs)
	result["webhook_logs"] = webhookLogs

	return result, nil
}

// generateFullExportReport generates a complete data export
func generateFullExportReport(query map[string]interface{}) (map[string]interface{}, error) {
	db := database.Get()
	result := make(map[string]interface{})

	result["query"] = query
	result["generated_at"] = time.Now()
	result["export_type"] = "full"

	// Export all relevant tables
	var users []models.User
	db.Preload("Role").Find(&users)
	// Remove sensitive data
	for i := range users {
		users[i].Password = ""
		users[i].TwoFactorSecret = ""
		users[i].TwoFactorBackup = ""
	}
	result["panel_users"] = users

	var roles []models.Role
	db.Preload("Permissions").Find(&roles)
	result["roles"] = roles

	var settings []models.Setting
	db.Find(&settings)
	result["settings"] = settings

	var notes []models.Note
	db.Find(&notes)
	result["notes"] = notes

	var watchedUsers []models.WatchedUser
	db.Where("deleted_at IS NULL").Find(&watchedUsers)
	result["watched_users"] = watchedUsers

	var savedSearches []models.SavedSearch
	db.Where("deleted_at IS NULL").Find(&savedSearches)
	result["saved_searches"] = savedSearches

	var scheduledCommands []models.ScheduledCommand
	db.Where("deleted_at IS NULL").Find(&scheduledCommands)
	result["scheduled_commands"] = scheduledCommands

	var alertRules []models.AlertRule
	db.Where("deleted_at IS NULL").Find(&alertRules)
	result["alert_rules"] = alertRules

	var channelTemplates []models.ChannelTemplate
	db.Where("deleted_at IS NULL").Find(&channelTemplates)
	result["channel_templates"] = channelTemplates

	return result, nil
}

// generateGDPRReport generates a GDPR data subject access request report
func generateGDPRReport(query map[string]interface{}) (map[string]interface{}, error) {
	result := make(map[string]interface{})

	result["report_type"] = "GDPR Data Subject Access Request"
	result["generated_at"] = time.Now()
	result["query"] = query

	// Get user data report as base
	userData, err := generateUserDataReport(query)
	if err != nil {
		return nil, err
	}

	result["personal_data"] = userData

	// Add GDPR metadata
	result["data_categories"] = []string{
		"Identity data (nicknames, accounts)",
		"Technical data (IP addresses, connection info)",
		"Activity data (channel participation, messages)",
		"Administrative data (notes, moderation actions)",
	}

	result["retention_policy"] = map[string]interface{}{
		"journey_events": "30 days by default, configurable",
		"notes":          "Indefinite until manually deleted",
		"watch_list":     "Indefinite until manually deleted",
		"webhook_logs":   "30 days by default, configurable",
	}

	result["data_rights"] = map[string]string{
		"access":        "This report provides access to all stored personal data",
		"rectification": "Contact administrator to correct inaccurate data",
		"erasure":       "Contact administrator to request data deletion",
		"portability":   "This JSON report provides data in portable format",
	}

	return result, nil
}

// generateAuditLogReport generates an audit log export
func generateAuditLogReport(query map[string]interface{}) (map[string]interface{}, error) {
	db := database.Get()
	result := make(map[string]interface{})

	result["query"] = query
	result["generated_at"] = time.Now()

	// Build query
	dbQuery := db.Model(&models.AuditLog{})

	if userID, ok := query["user_id"].(float64); ok {
		dbQuery = dbQuery.Where("user_id = ?", uint(userID))
	}
	if username, ok := query["username"].(string); ok {
		dbQuery = dbQuery.Where("username = ?", username)
	}
	if action, ok := query["action"].(string); ok {
		dbQuery = dbQuery.Where("action LIKE ?", "%"+action+"%")
	}
	if startTime, ok := query["start_time"].(string); ok {
		if t, err := time.Parse(time.RFC3339, startTime); err == nil {
			dbQuery = dbQuery.Where("created_at >= ?", t)
		}
	}
	if endTime, ok := query["end_time"].(string); ok {
		if t, err := time.Parse(time.RFC3339, endTime); err == nil {
			dbQuery = dbQuery.Where("created_at <= ?", t)
		}
	}

	var logs []models.AuditLog
	dbQuery.Order("created_at DESC").Limit(10000).Find(&logs)

	result["audit_logs"] = logs
	result["total_count"] = len(logs)

	return result, nil
}

// DownloadComplianceReport downloads a completed report
func DownloadComplianceReport(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	db := database.Get()
	var report models.ComplianceReport

	if err := db.Where("id = ?", id).First(&report).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Compliance report not found"})
		return
	}

	if report.Status != "completed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Report is not completed yet"})
		return
	}

	if report.ResultPath == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Report file not found"})
		return
	}

	// Serve the file
	c.File(report.ResultPath)
}

// DeleteComplianceReport deletes a compliance report
func DeleteComplianceReport(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	db := database.Get()
	var report models.ComplianceReport

	if err := db.Where("id = ?", id).First(&report).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Compliance report not found"})
		return
	}

	// Delete the file if it exists
	if report.ResultPath != "" {
		os.Remove(report.ResultPath)
	}

	// Delete the record
	if err := db.Delete(&report).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete compliance report"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Compliance report deleted"})
}

// GetReportTypes returns available report types
func GetReportTypes(c *gin.Context) {
	types := []map[string]interface{}{
		{
			"type":        "user_data",
			"name":        "User Data Report",
			"description": "Export all data associated with a specific user (by nick, IP, or account)",
			"fields":      []string{"nick", "ip", "account"},
		},
		{
			"type":        "activity_log",
			"name":        "Activity Log Report",
			"description": "Export activity logs for a specified time period",
			"fields":      []string{"start_time", "end_time"},
		},
		{
			"type":        "full_export",
			"name":        "Full Data Export",
			"description": "Complete export of all panel configuration and data",
			"fields":      []string{},
		},
		{
			"type":        "gdpr_request",
			"name":        "GDPR Data Request",
			"description": "Generate a GDPR-compliant data subject access request report",
			"fields":      []string{"nick", "ip", "account"},
		},
		{
			"type":        "audit_log",
			"name":        "Audit Log Export",
			"description": "Export audit logs with optional filtering",
			"fields":      []string{"user_id", "username", "action", "start_time", "end_time"},
		},
	}

	c.JSON(http.StatusOK, types)
}
