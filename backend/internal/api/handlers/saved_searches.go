package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/middleware"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
)

// SavedSearchRequest represents a request to create/update a saved search
type SavedSearchRequest struct {
	Name     string `json:"name" binding:"required"`
	Page     string `json:"page" binding:"required"`
	Query    string `json:"query"`
	Filters  string `json:"filters"`
	IsGlobal bool   `json:"is_global"`
}

// GetSavedSearches returns all saved searches for the current user
func GetSavedSearches(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	db := database.Get()
	page := c.Query("page")

	var searches []models.SavedSearch
	query := db.Where("user_id = ? OR is_global = ?", user.ID, true)

	if page != "" {
		query = query.Where("page = ?", page)
	}

	if err := query.Order("use_count DESC, name ASC").Find(&searches).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch saved searches"})
		return
	}

	c.JSON(http.StatusOK, searches)
}

// GetSavedSearch returns a specific saved search
func GetSavedSearch(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	db := database.Get()

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var search models.SavedSearch
	if err := db.Where("id = ? AND (user_id = ? OR is_global = ?)", id, user.ID, true).First(&search).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Saved search not found"})
		return
	}

	c.JSON(http.StatusOK, search)
}

// CreateSavedSearch creates a new saved search
func CreateSavedSearch(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	var req SavedSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.Get()

	// Check for duplicate name for this user on this page
	var existing models.SavedSearch
	if err := db.Where("user_id = ? AND page = ? AND name = ?", user.ID, req.Page, req.Name).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "A saved search with this name already exists for this page"})
		return
	}

	search := models.SavedSearch{
		UserID:   user.ID,
		Name:     req.Name,
		Page:     req.Page,
		Query:    req.Query,
		Filters:  req.Filters,
		IsGlobal: req.IsGlobal,
	}

	if err := db.Create(&search).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create saved search"})
		return
	}

	c.JSON(http.StatusCreated, search)
}

// UpdateSavedSearch updates an existing saved search
func UpdateSavedSearch(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	db := database.Get()

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var search models.SavedSearch
	if err := db.Where("id = ? AND user_id = ?", id, user.ID).First(&search).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Saved search not found or not owned by you"})
		return
	}

	var req SavedSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	search.Name = req.Name
	search.Page = req.Page
	search.Query = req.Query
	search.Filters = req.Filters
	search.IsGlobal = req.IsGlobal

	if err := db.Save(&search).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update saved search"})
		return
	}

	c.JSON(http.StatusOK, search)
}

// DeleteSavedSearch deletes a saved search
func DeleteSavedSearch(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	db := database.Get()

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	result := db.Where("id = ? AND user_id = ?", id, user.ID).Delete(&models.SavedSearch{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete saved search"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Saved search not found or not owned by you"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Saved search deleted"})
}

// UseSavedSearch marks a saved search as used and returns it
func UseSavedSearch(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	db := database.Get()

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var search models.SavedSearch
	if err := db.Where("id = ? AND (user_id = ? OR is_global = ?)", id, user.ID, true).First(&search).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Saved search not found"})
		return
	}

	// Update usage stats
	now := time.Now()
	db.Model(&search).Updates(map[string]interface{}{
		"use_count": search.UseCount + 1,
		"last_used": now,
	})
	search.UseCount++
	search.LastUsed = &now

	c.JSON(http.StatusOK, search)
}
