package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/middleware"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
)

// Default dashboard layout for new users
const defaultDashboardLayout = `[
	{"i":"stats-users","x":0,"y":0,"w":3,"h":2,"minW":2,"minH":2,"type":"stats","config":"{\"stat\":\"users\"}"},
	{"i":"stats-channels","x":3,"y":0,"w":3,"h":2,"minW":2,"minH":2,"type":"stats","config":"{\"stat\":\"channels\"}"},
	{"i":"stats-servers","x":6,"y":0,"w":3,"h":2,"minW":2,"minH":2,"type":"stats","config":"{\"stat\":\"servers\"}"},
	{"i":"stats-operators","x":9,"y":0,"w":3,"h":2,"minW":2,"minH":2,"type":"stats","config":"{\"stat\":\"operators\"}"},
	{"i":"chart-activity","x":0,"y":2,"w":6,"h":5,"minW":4,"minH":4,"type":"activity-chart","config":"{}"},
	{"i":"top-channels","x":6,"y":2,"w":6,"h":5,"minW":3,"minH":3,"type":"top-channels","config":"{}"},
	{"i":"server-status","x":0,"y":7,"w":8,"h":4,"minW":4,"minH":3,"type":"server-status","config":"{}"},
	{"i":"quick-links","x":8,"y":7,"w":4,"h":4,"minW":2,"minH":2,"type":"quick-links","config":"{}"}
]`

// GetDashboardLayout returns the user's dashboard layout
func GetDashboardLayout(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	db := database.Get()

	var layout models.DashboardLayout
	if err := db.Where("user_id = ?", user.ID).First(&layout).Error; err != nil {
		// Return default layout if user doesn't have one (or it's soft-deleted)
		c.JSON(http.StatusOK, gin.H{
			"layout":     defaultDashboardLayout,
			"is_default": true,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"layout":     layout.Layout,
		"is_default": false,
	})
}

// UpdateDashboardLayoutRequest represents an update request
type UpdateDashboardLayoutRequest struct {
	Layout string `json:"layout" binding:"required"`
}

// UpdateDashboardLayout updates the user's dashboard layout
func UpdateDashboardLayout(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req UpdateDashboardLayoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	db := database.Get()

	// Upsert the layout (use Unscoped to include soft-deleted records)
	var layout models.DashboardLayout
	result := db.Unscoped().Where("user_id = ?", user.ID).First(&layout)

	if result.Error != nil {
		// Create new
		layout = models.DashboardLayout{
			UserID: user.ID,
			Layout: req.Layout,
		}
		if err := db.Create(&layout).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save layout: " + err.Error()})
			return
		}
	} else {
		// Update existing (restore if soft-deleted and update)
		layout.DeletedAt.Valid = false // Clear soft delete
		layout.Layout = req.Layout
		if err := db.Unscoped().Save(&layout).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save layout: " + err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Layout saved successfully"})
}

// ResetDashboardLayout resets the user's dashboard to default
func ResetDashboardLayout(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	db := database.Get()

	// Delete user's custom layout
	db.Where("user_id = ?", user.ID).Delete(&models.DashboardLayout{})

	c.JSON(http.StatusOK, gin.H{
		"message":    "Layout reset to default",
		"layout":     defaultDashboardLayout,
		"is_default": true,
	})
}

// GetAvailableWidgets returns all available widget types
func GetAvailableWidgets(c *gin.Context) {
	widgets := []map[string]interface{}{
		{
			"type":        "stats",
			"name":        "Statistics Card",
			"description": "Shows a single statistic with trend",
			"icon":        "BarChart2",
			"defaultSize": map[string]int{"w": 3, "h": 2},
			"minSize":     map[string]int{"w": 2, "h": 2},
			"configOptions": []map[string]string{
				{"name": "stat", "type": "select", "options": "users,channels,servers,operators"},
			},
		},
		{
			"type":        "activity-chart",
			"name":        "Activity Chart",
			"description": "24-hour user and channel activity graph",
			"icon":        "TrendingUp",
			"defaultSize": map[string]int{"w": 6, "h": 5},
			"minSize":     map[string]int{"w": 4, "h": 4},
		},
		{
			"type":        "top-channels",
			"name":        "Top Channels",
			"description": "Most popular channels by user count",
			"icon":        "Hash",
			"defaultSize": map[string]int{"w": 6, "h": 5},
			"minSize":     map[string]int{"w": 3, "h": 3},
		},
		{
			"type":        "server-status",
			"name":        "Server Status",
			"description": "Network server status and uptime",
			"icon":        "Server",
			"defaultSize": map[string]int{"w": 8, "h": 4},
			"minSize":     map[string]int{"w": 4, "h": 3},
		},
		{
			"type":        "quick-links",
			"name":        "Quick Links",
			"description": "Shortcuts to different sections",
			"icon":        "Link",
			"defaultSize": map[string]int{"w": 4, "h": 4},
			"minSize":     map[string]int{"w": 2, "h": 2},
		},
		{
			"type":        "recent-bans",
			"name":        "Recent Bans",
			"description": "Recently added server bans",
			"icon":        "Ban",
			"defaultSize": map[string]int{"w": 6, "h": 4},
			"minSize":     map[string]int{"w": 3, "h": 3},
		},
		{
			"type":        "network-info",
			"name":        "Network Info",
			"description": "Network name, version, and connection info",
			"icon":        "Globe",
			"defaultSize": map[string]int{"w": 4, "h": 3},
			"minSize":     map[string]int{"w": 3, "h": 2},
		},
		{
			"type":        "shortcut",
			"name":        "Page Shortcut",
			"description": "Quick link to a specific page",
			"icon":        "ExternalLink",
			"defaultSize": map[string]int{"w": 2, "h": 2},
			"minSize":     map[string]int{"w": 2, "h": 2},
			"configOptions": []map[string]string{
				{"name": "page", "type": "select", "options": "users,channels,servers,bans,spamfilter,logs,settings"},
				{"name": "label", "type": "text"},
			},
		},
	}

	c.JSON(http.StatusOK, widgets)
}
