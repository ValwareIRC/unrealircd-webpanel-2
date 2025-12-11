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

// FeedbackRequest represents a feedback submission
type FeedbackRequest struct {
	Type        string `json:"type" binding:"required"` // "bug", "feature", "improvement", "other"
	Title       string `json:"title" binding:"required"`
	Description string `json:"description" binding:"required"`
	Priority    string `json:"priority"` // "low", "medium", "high", "critical"
	Category    string `json:"category"` // "ui", "performance", "security", "functionality"
}

// GetFeedbackItems returns all feedback items
func GetFeedbackItems(c *gin.Context) {
	db := database.Get()
	user := middleware.GetCurrentUser(c)

	var feedback []models.Feedback
	query := db.Order("created_at DESC")

	// Filter by type if specified
	if t := c.Query("type"); t != "" {
		query = query.Where("type = ?", t)
	}

	// Filter by status if specified
	if s := c.Query("status"); s != "" {
		query = query.Where("status = ?", s)
	}

	// Non-admin users only see their own feedback
	if user != nil && user.Role != nil && user.Role.Name != "Admin" {
		query = query.Where("user_id = ?", user.ID)
	}

	if err := query.Preload("User").Find(&feedback).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch feedback"})
		return
	}

	c.JSON(http.StatusOK, feedback)
}

// GetFeedbackItem returns a specific feedback item
func GetFeedbackItem(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feedback ID"})
		return
	}

	db := database.Get()
	var feedback models.Feedback
	if err := db.Preload("User").Preload("Comments.User").First(&feedback, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Feedback not found"})
		return
	}

	c.JSON(http.StatusOK, feedback)
}

// CreateFeedback creates a new feedback item
func CreateFeedback(c *gin.Context) {
	var req FeedbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	db := database.Get()

	feedback := models.Feedback{
		UserID:      user.ID,
		Type:        req.Type,
		Title:       req.Title,
		Description: req.Description,
		Priority:    req.Priority,
		Category:    req.Category,
		Status:      "open",
	}

	if feedback.Priority == "" {
		feedback.Priority = "medium"
	}

	if err := db.Create(&feedback).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create feedback"})
		return
	}

	// Load user for response
	db.Preload("User").First(&feedback, feedback.ID)

	c.JSON(http.StatusCreated, feedback)
}

// UpdateFeedbackStatus updates a feedback item's status (admin only)
func UpdateFeedbackStatus(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feedback ID"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate status
	validStatuses := map[string]bool{
		"open": true, "in_progress": true, "resolved": true, "closed": true, "wont_fix": true,
	}
	if !validStatuses[req.Status] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}

	db := database.Get()
	var feedback models.Feedback
	if err := db.First(&feedback, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Feedback not found"})
		return
	}

	feedback.Status = req.Status
	if req.Status == "resolved" || req.Status == "closed" {
		now := time.Now()
		feedback.ResolvedAt = &now
	}

	if err := db.Save(&feedback).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update feedback"})
		return
	}

	db.Preload("User").First(&feedback, feedback.ID)
	c.JSON(http.StatusOK, feedback)
}

// AddFeedbackComment adds a comment to a feedback item
func AddFeedbackComment(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feedback ID"})
		return
	}

	var req struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	db := database.Get()

	// Verify feedback exists
	var feedback models.Feedback
	if err := db.First(&feedback, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Feedback not found"})
		return
	}

	comment := models.FeedbackComment{
		FeedbackID: uint(id),
		UserID:     user.ID,
		Content:    req.Content,
	}

	if err := db.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add comment"})
		return
	}

	db.Preload("User").First(&comment, comment.ID)
	c.JSON(http.StatusCreated, comment)
}

// VoteFeedback upvotes or removes upvote from a feedback item
func VoteFeedback(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feedback ID"})
		return
	}

	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	db := database.Get()

	// Check if user already voted
	var existingVote models.FeedbackVote
	err = db.Where("feedback_id = ? AND user_id = ?", id, user.ID).First(&existingVote).Error

	if err == nil {
		// Remove vote
		db.Delete(&existingVote)

		// Update vote count
		db.Model(&models.Feedback{}).Where("id = ?", id).UpdateColumn("votes", db.Raw("votes - 1"))

		c.JSON(http.StatusOK, gin.H{"voted": false, "message": "Vote removed"})
		return
	}

	// Add new vote
	vote := models.FeedbackVote{
		FeedbackID: uint(id),
		UserID:     user.ID,
	}

	if err := db.Create(&vote).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to vote"})
		return
	}

	// Update vote count
	db.Model(&models.Feedback{}).Where("id = ?", id).UpdateColumn("votes", db.Raw("votes + 1"))

	c.JSON(http.StatusOK, gin.H{"voted": true, "message": "Vote added"})
}

// DeleteFeedback deletes a feedback item (admin or owner)
func DeleteFeedback(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feedback ID"})
		return
	}

	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	db := database.Get()
	var feedback models.Feedback
	if err := db.First(&feedback, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Feedback not found"})
		return
	}

	// Check ownership or admin
	isAdmin := user.Role != nil && user.Role.Name == "Admin"
	if feedback.UserID != user.ID && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
		return
	}

	// Delete related records
	db.Where("feedback_id = ?", id).Delete(&models.FeedbackComment{})
	db.Where("feedback_id = ?", id).Delete(&models.FeedbackVote{})
	db.Delete(&feedback)

	c.JSON(http.StatusOK, gin.H{"message": "Feedback deleted"})
}

// GetFeedbackStats returns feedback statistics
func GetFeedbackStats(c *gin.Context) {
	db := database.Get()

	var stats struct {
		TotalCount    int64            `json:"total_count"`
		OpenCount     int64            `json:"open_count"`
		ResolvedCount int64            `json:"resolved_count"`
		ByType        map[string]int64 `json:"by_type"`
		ByPriority    map[string]int64 `json:"by_priority"`
	}

	db.Model(&models.Feedback{}).Count(&stats.TotalCount)
	db.Model(&models.Feedback{}).Where("status = ?", "open").Count(&stats.OpenCount)
	db.Model(&models.Feedback{}).Where("status IN ?", []string{"resolved", "closed"}).Count(&stats.ResolvedCount)

	// Count by type
	stats.ByType = make(map[string]int64)
	var typeResults []struct {
		Type  string
		Count int64
	}
	db.Model(&models.Feedback{}).Select("type, count(*) as count").Group("type").Scan(&typeResults)
	for _, r := range typeResults {
		stats.ByType[r.Type] = r.Count
	}

	// Count by priority
	stats.ByPriority = make(map[string]int64)
	var priorityResults []struct {
		Priority string
		Count    int64
	}
	db.Model(&models.Feedback{}).Select("priority, count(*) as count").Group("priority").Scan(&priorityResults)
	for _, r := range priorityResults {
		stats.ByPriority[r.Priority] = r.Count
	}

	c.JSON(http.StatusOK, stats)
}
