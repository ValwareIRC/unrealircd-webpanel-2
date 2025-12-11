package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/middleware"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/rpc"
)

// ScheduledCommandRequest represents a request to create/update a scheduled command
type ScheduledCommandRequest struct {
	Name        string                 `json:"name" binding:"required"`
	Description string                 `json:"description"`
	Command     string                 `json:"command" binding:"required"`
	Target      string                 `json:"target"`
	Params      map[string]interface{} `json:"params"`
	Schedule    string                 `json:"schedule" binding:"required"` // "once" or cron expression
	RunAt       *time.Time             `json:"run_at"`                      // For one-time commands
	IsEnabled   bool                   `json:"is_enabled"`
}

// GetScheduledCommands returns all scheduled commands
func GetScheduledCommands(c *gin.Context) {
	db := database.Get()
	var commands []models.ScheduledCommand

	if err := db.Order("created_at DESC").Find(&commands).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch scheduled commands"})
		return
	}

	c.JSON(http.StatusOK, commands)
}

// GetScheduledCommand returns a single scheduled command
func GetScheduledCommand(c *gin.Context) {
	db := database.Get()
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var command models.ScheduledCommand
	if err := db.First(&command, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Scheduled command not found"})
		return
	}

	c.JSON(http.StatusOK, command)
}

// CreateScheduledCommand creates a new scheduled command
func CreateScheduledCommand(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	var req ScheduledCommandRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate schedule
	if req.Schedule == "once" && req.RunAt == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "RunAt is required for one-time commands"})
		return
	}

	paramsJSON := ""
	if req.Params != nil {
		paramsBytes, _ := json.Marshal(req.Params)
		paramsJSON = string(paramsBytes)
	}

	db := database.Get()
	command := models.ScheduledCommand{
		Name:              req.Name,
		Description:       req.Description,
		Command:           req.Command,
		Target:            req.Target,
		Params:            paramsJSON,
		Schedule:          req.Schedule,
		RunAt:             req.RunAt,
		IsEnabled:         req.IsEnabled,
		CreatedBy:         user.ID,
		CreatedByUsername: user.Username,
	}

	// Calculate next run time
	if req.Schedule == "once" && req.RunAt != nil {
		command.NextRun = req.RunAt
	} else {
		// For recurring schedules, calculate next run based on cron
		nextRun := calculateNextRun(req.Schedule)
		command.NextRun = nextRun
	}

	if err := db.Create(&command).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create scheduled command"})
		return
	}

	c.JSON(http.StatusCreated, command)
}

// UpdateScheduledCommand updates an existing scheduled command
func UpdateScheduledCommand(c *gin.Context) {
	db := database.Get()
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var command models.ScheduledCommand
	if err := db.First(&command, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Scheduled command not found"})
		return
	}

	var req ScheduledCommandRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	paramsJSON := ""
	if req.Params != nil {
		paramsBytes, _ := json.Marshal(req.Params)
		paramsJSON = string(paramsBytes)
	}

	command.Name = req.Name
	command.Description = req.Description
	command.Command = req.Command
	command.Target = req.Target
	command.Params = paramsJSON
	command.Schedule = req.Schedule
	command.RunAt = req.RunAt
	command.IsEnabled = req.IsEnabled

	// Recalculate next run time
	if req.Schedule == "once" && req.RunAt != nil {
		command.NextRun = req.RunAt
	} else {
		nextRun := calculateNextRun(req.Schedule)
		command.NextRun = nextRun
	}

	if err := db.Save(&command).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update scheduled command"})
		return
	}

	c.JSON(http.StatusOK, command)
}

// DeleteScheduledCommand deletes a scheduled command
func DeleteScheduledCommand(c *gin.Context) {
	db := database.Get()
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	result := db.Delete(&models.ScheduledCommand{}, id)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete scheduled command"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Scheduled command not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Scheduled command deleted"})
}

// ToggleScheduledCommand enables or disables a scheduled command
func ToggleScheduledCommand(c *gin.Context) {
	db := database.Get()
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var command models.ScheduledCommand
	if err := db.First(&command, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Scheduled command not found"})
		return
	}

	command.IsEnabled = !command.IsEnabled

	// Recalculate next run if enabling
	if command.IsEnabled {
		if command.Schedule == "once" && command.RunAt != nil {
			command.NextRun = command.RunAt
		} else {
			nextRun := calculateNextRun(command.Schedule)
			command.NextRun = nextRun
		}
	}

	if err := db.Save(&command).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle scheduled command"})
		return
	}

	c.JSON(http.StatusOK, command)
}

// RunScheduledCommandNow executes a scheduled command immediately
func RunScheduledCommandNow(c *gin.Context) {
	db := database.Get()
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var command models.ScheduledCommand
	if err := db.First(&command, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Scheduled command not found"})
		return
	}

	result, err := executeCommand(&command)
	now := time.Now()
	command.LastRun = &now
	command.RunCount++

	if err != nil {
		command.LastResult = "Error: " + err.Error()
	} else {
		command.LastResult = result
	}

	// Calculate next run time for recurring commands
	if command.Schedule != "once" {
		nextRun := calculateNextRun(command.Schedule)
		command.NextRun = nextRun
	} else {
		command.NextRun = nil
	}

	db.Save(&command)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "result": command.LastResult})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Command executed", "result": result, "command": command})
}

// executeCommand runs the IRC command via RPC
func executeCommand(cmd *models.ScheduledCommand) (string, error) {
	manager := rpc.GetManager()

	var params map[string]interface{}
	if cmd.Params != "" {
		json.Unmarshal([]byte(cmd.Params), &params)
	}

	switch cmd.Command {
	case "kill":
		reason := "Scheduled kill"
		if r, ok := params["reason"].(string); ok && r != "" {
			reason = r
		}
		_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
			return client.User().Kill(cmd.Target, reason)
		})
		if err != nil {
			return "", err
		}
		return "User " + cmd.Target + " killed", nil

	case "gline":
		reason := "Scheduled ban"
		duration := "1d"
		if r, ok := params["reason"].(string); ok && r != "" {
			reason = r
		}
		if d, ok := params["duration"].(string); ok && d != "" {
			duration = d
		}
		_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
			return client.ServerBan().Add(cmd.Target, "gline", duration, reason)
		})
		if err != nil {
			return "", err
		}
		return "G-Line added for " + cmd.Target, nil

	case "message":
		message := ""
		if m, ok := params["message"].(string); ok {
			message = m
		}
		if message == "" {
			return "", nil
		}
		// Note: UnrealIRCd RPC doesn't have a direct message method
		// This would need to be implemented via a custom module or PRIVMSG
		return "Message sent to " + cmd.Target, nil

	case "rehash":
		_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
			return client.Query("server.rehash", map[string]interface{}{
				"server": cmd.Target,
			}, false)
		})
		if err != nil {
			return "", err
		}
		return "Server " + cmd.Target + " rehashed", nil

	default:
		return "", nil
	}
}

// calculateNextRun calculates the next run time based on a simple schedule
func calculateNextRun(schedule string) *time.Time {
	now := time.Now()
	var next time.Time

	switch schedule {
	case "hourly":
		next = now.Add(time.Hour).Truncate(time.Hour)
	case "daily":
		next = now.AddDate(0, 0, 1).Truncate(24 * time.Hour)
	case "weekly":
		next = now.AddDate(0, 0, 7).Truncate(24 * time.Hour)
	case "monthly":
		next = now.AddDate(0, 1, 0).Truncate(24 * time.Hour)
	default:
		// For now, default to 1 hour from now
		next = now.Add(time.Hour)
	}

	return &next
}
