package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/middleware"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/rpc"
)

// CreateChannelTemplateRequest represents a request to create a channel template
type CreateChannelTemplateRequest struct {
	Name        string                 `json:"name" binding:"required"`
	Description string                 `json:"description"`
	Modes       string                 `json:"modes"`
	Topic       string                 `json:"topic"`
	BanList     []string               `json:"ban_list"`
	ExceptList  []string               `json:"except_list"`
	InviteList  []string               `json:"invite_list"`
	Settings    map[string]interface{} `json:"settings"`
	IsGlobal    bool                   `json:"is_global"`
}

// UpdateChannelTemplateRequest represents a request to update a channel template
type UpdateChannelTemplateRequest struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Modes       string                 `json:"modes"`
	Topic       string                 `json:"topic"`
	BanList     []string               `json:"ban_list"`
	ExceptList  []string               `json:"except_list"`
	InviteList  []string               `json:"invite_list"`
	Settings    map[string]interface{} `json:"settings"`
	IsGlobal    *bool                  `json:"is_global"`
}

// GetChannelTemplates returns all channel templates
func GetChannelTemplates(c *gin.Context) {
	db := database.Get()
	user := middleware.GetCurrentUser(c)

	var templates []models.ChannelTemplate
	query := db.Where("deleted_at IS NULL")

	// Show global templates or user's own templates
	if user != nil {
		query = query.Where("is_global = ? OR created_by = ?", true, user.ID)
	} else {
		query = query.Where("is_global = ?", true)
	}

	if err := query.Order("name ASC").Find(&templates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch channel templates"})
		return
	}

	c.JSON(http.StatusOK, templates)
}

// GetChannelTemplate returns a single channel template
func GetChannelTemplate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	db := database.Get()
	user := middleware.GetCurrentUser(c)

	var template models.ChannelTemplate
	query := db.Where("id = ? AND deleted_at IS NULL", id)
	if user != nil {
		query = query.Where("is_global = ? OR created_by = ?", true, user.ID)
	} else {
		query = query.Where("is_global = ?", true)
	}

	if err := query.First(&template).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel template not found"})
		return
	}

	c.JSON(http.StatusOK, template)
}

// CreateChannelTemplate creates a new channel template
func CreateChannelTemplate(c *gin.Context) {
	var req CreateChannelTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Serialize lists
	banListJSON, _ := json.Marshal(req.BanList)
	exceptListJSON, _ := json.Marshal(req.ExceptList)
	inviteListJSON, _ := json.Marshal(req.InviteList)
	settingsJSON, _ := json.Marshal(req.Settings)

	template := models.ChannelTemplate{
		Name:              req.Name,
		Description:       req.Description,
		Modes:             req.Modes,
		Topic:             req.Topic,
		BanList:           string(banListJSON),
		ExceptList:        string(exceptListJSON),
		InviteList:        string(inviteListJSON),
		Settings:          string(settingsJSON),
		IsGlobal:          req.IsGlobal,
		CreatedBy:         user.ID,
		CreatedByUsername: user.Username,
	}

	db := database.Get()
	if err := db.Create(&template).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create channel template"})
		return
	}

	c.JSON(http.StatusCreated, template)
}

// UpdateChannelTemplate updates an existing channel template
func UpdateChannelTemplate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var req UpdateChannelTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.Get()
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var template models.ChannelTemplate
	if err := db.Where("id = ? AND deleted_at IS NULL AND created_by = ?", id, user.ID).First(&template).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel template not found or access denied"})
		return
	}

	// Update fields
	if req.Name != "" {
		template.Name = req.Name
	}
	if req.Description != "" {
		template.Description = req.Description
	}
	if req.Modes != "" {
		template.Modes = req.Modes
	}
	if req.Topic != "" {
		template.Topic = req.Topic
	}
	if req.BanList != nil {
		banListJSON, _ := json.Marshal(req.BanList)
		template.BanList = string(banListJSON)
	}
	if req.ExceptList != nil {
		exceptListJSON, _ := json.Marshal(req.ExceptList)
		template.ExceptList = string(exceptListJSON)
	}
	if req.InviteList != nil {
		inviteListJSON, _ := json.Marshal(req.InviteList)
		template.InviteList = string(inviteListJSON)
	}
	if req.Settings != nil {
		settingsJSON, _ := json.Marshal(req.Settings)
		template.Settings = string(settingsJSON)
	}
	if req.IsGlobal != nil {
		template.IsGlobal = *req.IsGlobal
	}

	if err := db.Save(&template).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update channel template"})
		return
	}

	c.JSON(http.StatusOK, template)
}

// DeleteChannelTemplate deletes a channel template
func DeleteChannelTemplate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	db := database.Get()
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	result := db.Where("id = ? AND created_by = ?", id, user.ID).Delete(&models.ChannelTemplate{})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete channel template"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel template not found or access denied"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Channel template deleted"})
}

// ApplyChannelTemplate applies a template to a channel
func ApplyChannelTemplate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var req struct {
		Channel string `json:"channel" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.Get()
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var template models.ChannelTemplate
	if err := db.Where("id = ? AND deleted_at IS NULL AND (is_global = ? OR created_by = ?)", id, true, user.ID).First(&template).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel template not found"})
		return
	}

	manager := rpc.GetManager()
	errors := []string{}
	success := []string{}

	// Apply topic if set
	if template.Topic != "" {
		setBy := user.Username
		_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
			return client.Channel().SetTopic(req.Channel, template.Topic, &setBy, nil)
		})
		if err != nil {
			errors = append(errors, "Failed to set topic: "+err.Error())
		} else {
			success = append(success, "Topic set")
		}
	}

	// Apply modes if set
	if template.Modes != "" {
		_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
			return client.Channel().SetMode(req.Channel, template.Modes, "")
		})
		if err != nil {
			errors = append(errors, "Failed to set modes: "+err.Error())
		} else {
			success = append(success, "Modes set")
		}
	}

	// Update template use count
	template.UseCount++
	db.Save(&template)

	c.JSON(http.StatusOK, gin.H{
		"message":  "Template applied",
		"success":  success,
		"errors":   errors,
		"template": template,
	})
}

// CreateTemplateFromChannel creates a template from an existing channel
func CreateTemplateFromChannel(c *gin.Context) {
	var req struct {
		Channel string `json:"channel" binding:"required"`
		Name    string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	manager := rpc.GetManager()
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Get channel info from RPC
	var channelInfo map[string]interface{}
	_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		result, err := client.Query("channel.get", map[string]interface{}{
			"channel": req.Channel,
		}, false)
		if err != nil {
			return nil, err
		}
		if m, ok := result.(map[string]interface{}); ok {
			channelInfo = m
		}
		return result, nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get channel info: " + err.Error()})
		return
	}

	// Extract data
	modes := ""
	topic := ""
	if m, ok := channelInfo["modes"].(string); ok {
		modes = m
	}
	if t, ok := channelInfo["topic"].(string); ok {
		topic = t
	}

	template := models.ChannelTemplate{
		Name:              req.Name,
		Description:       "Created from channel " + req.Channel,
		Modes:             modes,
		Topic:             topic,
		BanList:           "[]",
		ExceptList:        "[]",
		InviteList:        "[]",
		Settings:          "{}",
		IsGlobal:          false,
		CreatedBy:         user.ID,
		CreatedByUsername: user.Username,
	}

	db := database.Get()
	if err := db.Create(&template).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create channel template"})
		return
	}

	c.JSON(http.StatusCreated, template)
}
