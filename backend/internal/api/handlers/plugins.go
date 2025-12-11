package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/middleware"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/hooks"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/plugins"
)

// PluginNavItem represents a navigation item from a plugin
type PluginNavItem struct {
	Label    string          `json:"label"`
	Icon     string          `json:"icon"`
	Path     string          `json:"path"`
	Order    int             `json:"order"`
	Plugin   string          `json:"plugin"`
	Children []PluginNavItem `json:"children,omitempty"`
}

// PluginDashboardCard represents a dashboard card from a plugin
type PluginDashboardCard struct {
	Title   string      `json:"title"`
	Icon    string      `json:"icon"`
	Content interface{} `json:"content"`
	Order   int         `json:"order"`
	Size    string      `json:"size"`
	Plugin  string      `json:"plugin"`
}

// PluginManifestNavItem represents a nav item in plugin.json
type PluginManifestNavItem struct {
	ID       string `json:"id"`
	Label    string `json:"label"`
	Icon     string `json:"icon"`
	Path     string `json:"path"`
	Category string `json:"category"`
	Order    int    `json:"order"`
}

// PluginManifestDashboardCard represents a dashboard card in plugin.json
type PluginManifestDashboardCard struct {
	ID      string `json:"id"`
	Title   string `json:"title"`
	Icon    string `json:"icon"`
	Type    string `json:"type"`
	Content string `json:"content"`
	Order   int    `json:"order"`
}

// PluginManifest represents the plugin.json file
type PluginManifestFull struct {
	ID             string                        `json:"id"`
	Name           string                        `json:"name"`
	NavItems       []PluginManifestNavItem       `json:"nav_items"`
	DashboardCards []PluginManifestDashboardCard `json:"dashboard_cards"`
}

// GetPluginNavItems returns navigation items contributed by plugins
func GetPluginNavItems(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Get enabled plugins from database
	db := database.Get()
	if db == nil {
		log.Println("[GetPluginNavItems] Database not available")
		c.JSON(http.StatusOK, []PluginNavItem{})
		return
	}

	var installedPlugins []models.InstalledPlugin
	if err := db.Where("enabled = ?", true).Find(&installedPlugins).Error; err != nil {
		log.Printf("[GetPluginNavItems] Database error: %v", err)
		c.JSON(http.StatusOK, []PluginNavItem{})
		return
	}

	log.Printf("[GetPluginNavItems] Found %d enabled plugins", len(installedPlugins))

	response := make([]PluginNavItem, 0)
	pluginsDir := getPluginsDir()
	log.Printf("[GetPluginNavItems] Looking in plugins dir: %s", pluginsDir)

	for _, plugin := range installedPlugins {
		// Read plugin.json
		manifestPath := filepath.Join(pluginsDir, plugin.ID, "plugin.json")
		log.Printf("[GetPluginNavItems] Reading manifest: %s", manifestPath)
		data, err := os.ReadFile(manifestPath)
		if err != nil {
			log.Printf("[GetPluginNavItems] Error reading manifest for %s: %v", plugin.ID, err)
			continue
		}

		var manifest PluginManifestFull
		if err := json.Unmarshal(data, &manifest); err != nil {
			log.Printf("[GetPluginNavItems] Error parsing manifest for %s: %v", plugin.ID, err)
			continue
		}

		log.Printf("[GetPluginNavItems] Plugin %s has %d nav items", plugin.ID, len(manifest.NavItems))

		// Add nav items from this plugin
		for _, item := range manifest.NavItems {
			response = append(response, PluginNavItem{
				Label:  item.Label,
				Icon:   item.Icon,
				Path:   item.Path,
				Order:  item.Order,
				Plugin: plugin.ID,
			})
		}
	}

	log.Printf("[GetPluginNavItems] Returning %d total nav items", len(response))
	c.JSON(http.StatusOK, response)
}

// GetPluginDashboardCards returns dashboard cards contributed by plugins
func GetPluginDashboardCards(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Get enabled plugins from database
	db := database.Get()
	if db == nil {
		log.Println("[GetPluginDashboardCards] Database not available")
		c.JSON(http.StatusOK, []PluginDashboardCard{})
		return
	}

	var installedPlugins []models.InstalledPlugin
	if err := db.Where("enabled = ?", true).Find(&installedPlugins).Error; err != nil {
		log.Printf("[GetPluginDashboardCards] Database error: %v", err)
		c.JSON(http.StatusOK, []PluginDashboardCard{})
		return
	}

	log.Printf("[GetPluginDashboardCards] Found %d enabled plugins", len(installedPlugins))

	response := make([]PluginDashboardCard, 0)
	pluginsDir := getPluginsDir()

	for _, plugin := range installedPlugins {
		// Read plugin.json
		manifestPath := filepath.Join(pluginsDir, plugin.ID, "plugin.json")
		data, err := os.ReadFile(manifestPath)
		if err != nil {
			log.Printf("[GetPluginDashboardCards] Error reading manifest for %s: %v", plugin.ID, err)
			continue
		}

		var manifest PluginManifestFull
		if err := json.Unmarshal(data, &manifest); err != nil {
			log.Printf("[GetPluginDashboardCards] Error parsing manifest for %s: %v", plugin.ID, err)
			continue
		}

		log.Printf("[GetPluginDashboardCards] Plugin %s has %d dashboard cards", plugin.ID, len(manifest.DashboardCards))

		// Add dashboard cards from this plugin
		for _, card := range manifest.DashboardCards {
			response = append(response, PluginDashboardCard{
				Title:   card.Title,
				Icon:    card.Icon,
				Content: card.Content,
				Order:   card.Order,
				Size:    "md", // default size
				Plugin:  plugin.ID,
			})
		}
	}

	log.Printf("[GetPluginDashboardCards] Returning %d total dashboard cards", len(response))
	c.JSON(http.StatusOK, response)
}

// GetLoadedPlugins returns a list of currently loaded/active plugins
func GetLoadedPlugins(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	manager := plugins.GetManager()
	loaded := manager.ListPlugins()

	type PluginResponse struct {
		Handle      string `json:"handle"`
		Name        string `json:"name"`
		Version     string `json:"version"`
		Author      string `json:"author"`
		Description string `json:"description"`
		Enabled     bool   `json:"enabled"`
		Path        string `json:"path"`
	}

	response := make([]PluginResponse, 0)
	for _, p := range loaded {
		response = append(response, PluginResponse{
			Handle:      p.Handle,
			Name:        p.Info.Name,
			Version:     p.Info.Version,
			Author:      p.Info.Author,
			Description: p.Info.Description,
			Enabled:     p.Enabled,
			Path:        p.Path,
		})
	}

	c.JSON(http.StatusOK, response)
}

// EnablePlugin enables an installed plugin
func EnablePlugin(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	pluginID := c.Param("id")

	db := database.Get()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not available"})
		return
	}

	// Update database
	result := db.Model(&database.InstalledPlugin{}).Where("id = ?", pluginID).Update("enabled", true)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enable plugin"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
		return
	}

	// Try to load the plugin at runtime
	manager := plugins.GetManager()
	if err := manager.LoadPlugin(pluginID); err != nil {
		// Not a fatal error - plugin might not have runtime component
		c.JSON(http.StatusOK, gin.H{
			"message": "Plugin enabled (no runtime component)",
			"warning": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Plugin enabled and loaded"})
}

// DisablePlugin disables an installed plugin
func DisablePlugin(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	pluginID := c.Param("id")

	db := database.Get()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not available"})
		return
	}

	// Update database
	result := db.Model(&database.InstalledPlugin{}).Where("id = ?", pluginID).Update("enabled", false)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to disable plugin"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
		return
	}

	// Try to unload the plugin at runtime
	manager := plugins.GetManager()
	if err := manager.UnloadPlugin(pluginID); err != nil {
		// Not a fatal error - plugin might not have been loaded
	}

	c.JSON(http.StatusOK, gin.H{"message": "Plugin disabled"})
}

// GetAvailableHooks returns a list of all available hook types
func GetAvailableHooks(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Define the available hooks for documentation
	availableHooks := []gin.H{
		{"type": hooks.HookNavbar, "name": "HookNavbar", "category": "UI", "description": "Add navigation items to the sidebar"},
		{"type": hooks.HookPreHeader, "name": "HookPreHeader", "category": "UI", "description": "Insert content before the page header"},
		{"type": hooks.HookHeader, "name": "HookHeader", "category": "UI", "description": "Modify the page header"},
		{"type": hooks.HookPreOverviewCard, "name": "HookPreOverviewCard", "category": "UI", "description": "Insert content before overview cards"},
		{"type": hooks.HookOverviewCard, "name": "HookOverviewCard", "category": "UI", "description": "Add dashboard cards to the overview"},
		{"type": hooks.HookPreFooter, "name": "HookPreFooter", "category": "UI", "description": "Insert content before the footer"},
		{"type": hooks.HookFooter, "name": "HookFooter", "category": "UI", "description": "Modify the footer"},
		{"type": hooks.HookRightClickMenu, "name": "HookRightClickMenu", "category": "UI", "description": "Add items to context menus"},
		{"type": hooks.HookUserLookup, "name": "HookUserLookup", "category": "Users", "description": "Called when looking up a user"},
		{"type": hooks.HookUserCreate, "name": "HookUserCreate", "category": "Users", "description": "Called when a user is created"},
		{"type": hooks.HookUserList, "name": "HookUserList", "category": "Users", "description": "Called when listing users"},
		{"type": hooks.HookUserDelete, "name": "HookUserDelete", "category": "Users", "description": "Called when a user is deleted"},
		{"type": hooks.HookUserEdit, "name": "HookUserEdit", "category": "Users", "description": "Called when a user is edited"},
		{"type": hooks.HookUserLogin, "name": "HookUserLogin", "category": "Users", "description": "Called when a user logs in"},
		{"type": hooks.HookUserLoginFail, "name": "HookUserLoginFail", "category": "Users", "description": "Called when a login attempt fails"},
		{"type": hooks.HookNotification, "name": "HookNotification", "category": "System", "description": "Called when a notification is sent"},
		{"type": hooks.HookGeneralSettings, "name": "HookGeneralSettings", "category": "Settings", "description": "Add settings fields"},
		{"type": hooks.HookGeneralSettingsPost, "name": "HookGeneralSettingsPost", "category": "Settings", "description": "Handle settings form submission"},
		{"type": hooks.HookAPIRequest, "name": "HookAPIRequest", "category": "API", "description": "Called before API requests"},
		{"type": hooks.HookAPIResponse, "name": "HookAPIResponse", "category": "API", "description": "Called after API responses"},
		{"type": hooks.HookWebhookReceived, "name": "HookWebhookReceived", "category": "Webhooks", "description": "Called when a webhook is received from UnrealIRCd"},
	}

	c.JSON(http.StatusOK, availableHooks)
}

// PluginFrontendAsset represents a frontend asset from a plugin
type PluginFrontendAsset struct {
	PluginID string `json:"plugin_id"`
	Type     string `json:"type"` // "script" or "style"
	URL      string `json:"url"`
}

// GetPluginFrontendAssets returns all frontend assets from enabled plugins
// This endpoint is PUBLIC (no auth required) so scripts can load before login
func GetPluginFrontendAssets(c *gin.Context) {
	db := database.Get()
	if db == nil {
		c.JSON(http.StatusOK, gin.H{"scripts": []string{}, "styles": []string{}})
		return
	}

	var installedPlugins []models.InstalledPlugin
	if err := db.Where("enabled = ?", true).Find(&installedPlugins).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"scripts": []string{}, "styles": []string{}})
		return
	}

	scripts := make([]PluginFrontendAsset, 0)
	styles := make([]PluginFrontendAsset, 0)

	// Add cache-busting timestamp to URLs
	cacheBuster := fmt.Sprintf("?v=%d", time.Now().Unix())

	for _, plugin := range installedPlugins {
		// Parse frontend scripts
		if plugin.FrontendScripts != "" {
			var scriptFiles []string
			if err := json.Unmarshal([]byte(plugin.FrontendScripts), &scriptFiles); err == nil {
				for _, script := range scriptFiles {
					scripts = append(scripts, PluginFrontendAsset{
						PluginID: plugin.ID,
						Type:     "script",
						URL:      "/api/plugins/" + plugin.ID + "/assets/" + script + cacheBuster,
					})
				}
			}
		}

		// Parse frontend styles
		if plugin.FrontendStyles != "" {
			var styleFiles []string
			if err := json.Unmarshal([]byte(plugin.FrontendStyles), &styleFiles); err == nil {
				for _, style := range styleFiles {
					styles = append(styles, PluginFrontendAsset{
						PluginID: plugin.ID,
						Type:     "style",
						URL:      "/api/plugins/" + plugin.ID + "/assets/" + style + cacheBuster,
					})
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"scripts": scripts,
		"styles":  styles,
	})
}

// ServePluginAsset serves a frontend asset file from an installed plugin
// This endpoint is PUBLIC (no auth required) so scripts/styles can load
func ServePluginAsset(c *gin.Context) {
	pluginID := c.Param("id")
	filename := c.Param("filename")

	// Security: validate filename to prevent directory traversal
	if filepath.Base(filename) != filename {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid filename"})
		return
	}

	// Check if plugin is installed and enabled
	db := database.Get()
	if db == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
		return
	}

	var plugin models.InstalledPlugin
	if err := db.Where("id = ? AND enabled = ?", pluginID, true).First(&plugin).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found or disabled"})
		return
	}

	// Find the asset file
	pluginsDir := getPluginsDir()
	assetPath := filepath.Join(pluginsDir, pluginID, "assets", filename)

	// Check if file exists
	if _, err := os.Stat(assetPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}

	// Determine content type
	ext := filepath.Ext(filename)
	contentType := "application/octet-stream"
	switch ext {
	case ".js":
		contentType = "application/javascript"
	case ".css":
		contentType = "text/css"
	case ".json":
		contentType = "application/json"
	case ".svg":
		contentType = "image/svg+xml"
	case ".png":
		contentType = "image/png"
	case ".jpg", ".jpeg":
		contentType = "image/jpeg"
	}

	c.Header("Content-Type", contentType)
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate") // Don't cache plugin assets
	c.Header("Pragma", "no-cache")
	c.Header("Expires", "0")
	c.File(assetPath)
}

// Note: getPluginsDir is defined in marketplace.go
