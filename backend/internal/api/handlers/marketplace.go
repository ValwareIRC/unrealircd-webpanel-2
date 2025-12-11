package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/middleware"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/plugins"
)

const (
	// Official plugin repository
	PluginRepoURL      = "https://raw.githubusercontent.com/ValwareIRC/uwp-plugins/main/plugins.json"
	PluginRepoCacheTTL = 5 * time.Minute
)

// PluginManifest represents a plugin.json from the repository
type PluginManifest struct {
	ID              string                 `json:"id"`
	Name            string                 `json:"name"`
	Version         string                 `json:"version"`
	Author          string                 `json:"author"`
	Description     string                 `json:"description"`
	MinVersion      string                 `json:"min_panel_version,omitempty"`
	Category        string                 `json:"category"`
	License         string                 `json:"license,omitempty"`
	Repository      string                 `json:"repository,omitempty"`
	Homepage        string                 `json:"homepage,omitempty"`
	Tags            []string               `json:"tags,omitempty"`
	Requires        []string               `json:"requires,omitempty"`
	Provides        []string               `json:"provides,omitempty"`
	Hooks           []string               `json:"hooks,omitempty"`
	Settings        []PluginSetting        `json:"settings,omitempty"`
	FrontendScripts []string               `json:"frontend_scripts,omitempty"` // JS files to load
	FrontendStyles  []string               `json:"frontend_styles,omitempty"`  // CSS files to load
	ConfigSchema    map[string]interface{} `json:"config_schema,omitempty"`
	HasReadme       bool                   `json:"has_readme,omitempty"`
	HasIcon         bool                   `json:"has_icon,omitempty"`
	LastUpdated     string                 `json:"last_updated,omitempty"`
	Downloads       int                    `json:"downloads,omitempty"`
	Rating          float64                `json:"rating,omitempty"`
	RatingCount     int                    `json:"rating_count,omitempty"`
}

// PluginSetting represents a configurable setting
type PluginSetting struct {
	Key         string      `json:"key"`
	Type        string      `json:"type"`
	Default     interface{} `json:"default"`
	Label       string      `json:"label"`
	Description string      `json:"description,omitempty"`
	Min         *int        `json:"min,omitempty"`
	Max         *int        `json:"max,omitempty"`
	Options     []string    `json:"options,omitempty"`
}

// PluginCategory represents a category in the plugin index
type PluginCategory struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
}

// PluginIndex represents the plugins.json index file
type PluginIndex struct {
	Version     interface{}      `json:"version"`
	Generated   string           `json:"generated_at"`
	LastUpdated string           `json:"last_updated"`
	PluginCount int              `json:"plugin_count"`
	Categories  []PluginCategory `json:"categories"`
	Plugins     []PluginManifest `json:"plugins"`
}

// MarketplacePluginResponse represents a marketplace plugin for the frontend
type MarketplacePluginResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Author      string    `json:"author"`
	Version     string    `json:"version"`
	Description string    `json:"description"`
	Category    string    `json:"category"`
	Downloads   int       `json:"downloads"`
	Rating      float64   `json:"rating"`
	RatingCount int       `json:"rating_count"`
	Tags        []string  `json:"tags"`
	Repository  string    `json:"repository,omitempty"`
	License     string    `json:"license"`
	Installed   bool      `json:"installed"`
	UpdateAvail bool      `json:"update_available"`
	LastUpdated time.Time `json:"last_updated"`
	Provides    []string  `json:"provides,omitempty"`
	Requires    []string  `json:"requires,omitempty"`
}

// InstalledPluginResponse represents a currently installed plugin for the frontend
type InstalledPluginResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Version     string    `json:"version"`
	Enabled     bool      `json:"enabled"`
	Author      string    `json:"author"`
	Description string    `json:"description"`
	InstalledAt time.Time `json:"installed_at"`
	UpdateAvail bool      `json:"update_available"`
	NewVersion  string    `json:"new_version,omitempty"`
}

// Plugin cache
var (
	pluginCache     *PluginIndex
	pluginCacheTime time.Time
	pluginCacheMu   sync.RWMutex
)

// fetchPluginIndex fetches the plugin index from GitHub
func fetchPluginIndex() (*PluginIndex, error) {
	pluginCacheMu.RLock()
	if pluginCache != nil && time.Since(pluginCacheTime) < PluginRepoCacheTTL {
		cache := pluginCache
		pluginCacheMu.RUnlock()
		return cache, nil
	}
	pluginCacheMu.RUnlock()

	// Fetch from GitHub
	resp, err := http.Get(PluginRepoURL)
	if err != nil {
		// Return fallback if can't reach GitHub
		log.Printf("Plugin marketplace: failed to reach GitHub: %v", err)
		return getFallbackPlugins(), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Plugin marketplace: GitHub returned status %d", resp.StatusCode)
		return getFallbackPlugins(), nil
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Plugin marketplace: failed to read response body: %v", err)
		return getFallbackPlugins(), nil
	}

	var index PluginIndex
	if err := json.Unmarshal(body, &index); err != nil {
		log.Printf("Plugin marketplace: failed to parse JSON: %v (body: %s)", err, string(body[:min(len(body), 200)]))
		return getFallbackPlugins(), nil
	}

	// Update cache
	pluginCacheMu.Lock()
	pluginCache = &index
	pluginCacheTime = time.Now()
	pluginCacheMu.Unlock()

	return &index, nil
}

// getFallbackPlugins returns sample plugins when GitHub is unreachable
func getFallbackPlugins() *PluginIndex {
	return &PluginIndex{
		Version:   "1.0.0",
		Generated: time.Now().Format(time.RFC3339),
		Plugins: []PluginManifest{
			{
				ID:              "example-plugin",
				Name:            "Example Plugin",
				Version:         "1.0.0",
				Author:          "Valware",
				Description:     "A comprehensive example plugin demonstrating all features of the UWP plugin system including hooks, navigation items, dashboard cards, and frontend JavaScript.",
				Category:        "examples",
				License:         "MIT",
				Repository:      "https://github.com/ValwareIRC/uwp-plugins",
				Hooks:           []string{"OnStartup", "OnShutdown", "OnUserListRequest", "OnChannelListRequest"},
				FrontendScripts: []string{"example-plugin.js"},
			},
			{
				ID:              "emoji-trail",
				Name:            "Emoji Trail",
				Version:         "1.0.0",
				Author:          "Valware",
				Description:     "Creates fun emoji firework explosions when you press the 'E' key. Features multiple emoji themes including party, nature, hearts, stars, and food!",
				Category:        "fun",
				License:         "MIT",
				Repository:      "https://github.com/ValwareIRC/uwp-plugins",
				FrontendScripts: []string{"emoji-trail.js"},
			},
		},
	}
}

// getInstalledPluginIDs returns a map of installed plugin IDs to their records
func getInstalledPluginIDs() map[string]models.InstalledPlugin {
	db := database.Get()
	if db == nil {
		return make(map[string]models.InstalledPlugin)
	}

	var records []models.InstalledPlugin
	db.Find(&records)

	result := make(map[string]models.InstalledPlugin)
	for _, r := range records {
		result[r.ID] = r
	}
	return result
}

// GetMarketplacePlugins returns available plugins from the marketplace
func GetMarketplacePlugins(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	category := c.Query("category")
	search := c.Query("search")

	// Fetch plugins from GitHub repo
	index, err := fetchPluginIndex()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch plugins"})
		return
	}

	// Get installed plugins
	installed := getInstalledPluginIDs()

	// Convert to marketplace format
	plugins := make([]MarketplacePluginResponse, 0)
	categories := make(map[string]bool)

	for _, manifest := range index.Plugins {
		installedRecord, isInstalled := installed[manifest.ID]
		updateAvail := false
		if isInstalled && manifest.Version != installedRecord.Version {
			updateAvail = true
		}

		// Parse last updated time
		lastUpdated := time.Now()
		if manifest.LastUpdated != "" {
			if t, err := time.Parse(time.RFC3339, manifest.LastUpdated); err == nil {
				lastUpdated = t
			}
		}

		// Use tags from manifest, fall back to provides
		tags := manifest.Tags
		if len(tags) == 0 {
			tags = manifest.Provides
		}

		plugin := MarketplacePluginResponse{
			ID:          manifest.ID,
			Name:        manifest.Name,
			Author:      manifest.Author,
			Version:     manifest.Version,
			Description: manifest.Description,
			Category:    manifest.Category,
			Downloads:   manifest.Downloads,
			Rating:      manifest.Rating,
			RatingCount: manifest.RatingCount,
			Tags:        tags,
			Repository:  manifest.Repository,
			License:     manifest.License,
			Installed:   isInstalled,
			UpdateAvail: updateAvail,
			LastUpdated: lastUpdated,
			Provides:    manifest.Provides,
			Requires:    manifest.Requires,
		}

		categories[manifest.Category] = true

		// Filter by category
		if category != "" && category != "all" && manifest.Category != category {
			continue
		}

		// Filter by search
		if search != "" {
			if !marketplaceContains(manifest.Name, search) && !marketplaceContains(manifest.Description, search) {
				continue
			}
		}

		plugins = append(plugins, plugin)
	}

	// Build category list
	categoryList := []string{"all"}
	for cat := range categories {
		categoryList = append(categoryList, cat)
	}

	c.JSON(http.StatusOK, gin.H{
		"plugins":    plugins,
		"total":      len(plugins),
		"categories": categoryList,
		"source":     "github",
		"repo":       "ValwareIRC/uwp-plugins",
		"cache_age":  time.Since(pluginCacheTime).Seconds(),
	})
}

// marketplaceContains checks if s contains substr (case insensitive)
func marketplaceContains(s, substr string) bool {
	return len(s) >= len(substr) &&
		(s == substr ||
			len(substr) == 0 ||
			marketplaceFindSubstring(marketplaceToLower(s), marketplaceToLower(substr)))
}

func marketplaceToLower(s string) string {
	result := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			c += 32
		}
		result[i] = c
	}
	return string(result)
}

func marketplaceFindSubstring(s, substr string) bool {
	if len(substr) > len(s) {
		return false
	}
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// GetInstalledPlugins returns currently installed plugins
func GetInstalledPlugins(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	db := database.Get()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database unavailable"})
		return
	}

	var records []models.InstalledPlugin
	db.Find(&records)

	// Fetch latest versions from repo
	index, _ := fetchPluginIndex()
	latestVersions := make(map[string]string)
	if index != nil {
		for _, p := range index.Plugins {
			latestVersions[p.ID] = p.Version
		}
	}

	plugins := make([]InstalledPluginResponse, 0)
	for _, r := range records {
		updateAvail := false
		newVersion := ""
		if latest, ok := latestVersions[r.ID]; ok && latest != r.Version {
			updateAvail = true
			newVersion = latest
		}

		plugins = append(plugins, InstalledPluginResponse{
			ID:          r.ID,
			Name:        r.Name,
			Version:     r.Version,
			Enabled:     r.Enabled,
			Author:      r.Author,
			Description: r.Description,
			InstalledAt: r.InstalledAt,
			UpdateAvail: updateAvail,
			NewVersion:  newVersion,
		})
	}

	c.JSON(http.StatusOK, plugins)
}

// GetPluginDetails returns details for a specific plugin
func GetPluginDetails(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	pluginID := c.Param("id")

	// Fetch from repo
	index, err := fetchPluginIndex()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch plugins"})
		return
	}

	var manifest *PluginManifest
	for _, p := range index.Plugins {
		if p.ID == pluginID {
			manifest = &p
			break
		}
	}

	if manifest == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
		return
	}

	// Check if installed
	installed := getInstalledPluginIDs()
	_, isInstalled := installed[pluginID]

	plugin := MarketplacePluginResponse{
		ID:          manifest.ID,
		Name:        manifest.Name,
		Author:      manifest.Author,
		Version:     manifest.Version,
		Description: manifest.Description,
		Category:    manifest.Category,
		Tags:        manifest.Provides,
		Repository:  manifest.Repository,
		License:     manifest.License,
		Installed:   isInstalled,
		Provides:    manifest.Provides,
		Requires:    manifest.Requires,
	}

	// Fetch README from GitHub
	readmeURL := "https://raw.githubusercontent.com/ValwareIRC/uwp-plugins/main/plugins/" + pluginID + "/README.md"
	readme := "# " + manifest.Name + "\n\n" + manifest.Description

	resp, err := http.Get(readmeURL)
	if err == nil && resp.StatusCode == http.StatusOK {
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		readme = string(body)
	}

	details := gin.H{
		"plugin":   plugin,
		"readme":   readme,
		"settings": manifest.Settings,
		"hooks":    manifest.Hooks,
		"requirements": gin.H{
			"min_version": manifest.MinVersion,
			"requires":    manifest.Requires,
		},
	}

	c.JSON(http.StatusOK, details)
}

// getPluginsDir returns the path to the plugins directory
func getPluginsDir() string {
	// Use the plugin manager's configured directory
	if manager := plugins.GetManager(); manager != nil {
		return manager.GetPluginDir()
	}
	// Fallback to default
	return "internal/plugins"
}

// InstallPlugin installs a plugin from the marketplace
func InstallPlugin(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	pluginID := c.Param("id")

	// Fetch plugin info from repo
	index, err := fetchPluginIndex()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch plugin info"})
		return
	}

	var manifest *PluginManifest
	for _, p := range index.Plugins {
		if p.ID == pluginID {
			manifest = &p
			break
		}
	}

	if manifest == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
		return
	}

	// Check if already installed
	installed := getInstalledPluginIDs()
	if _, exists := installed[pluginID]; exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plugin already installed"})
		return
	}

	// Create plugin directory
	pluginsDir := getPluginsDir()
	pluginDir := filepath.Join(pluginsDir, pluginID)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create plugin directory"})
		return
	}

	// Create assets subdirectory for frontend files
	assetsDir := filepath.Join(pluginDir, "assets")
	os.MkdirAll(assetsDir, 0755)

	// Download plugin files
	baseURL := "https://raw.githubusercontent.com/ValwareIRC/uwp-plugins/main/plugins/" + pluginID + "/"
	coreFiles := []string{"plugin.json", "main.go", "README.md", "LICENSE"}

	for _, file := range coreFiles {
		resp, err := http.Get(baseURL + file)
		if err != nil || resp.StatusCode != http.StatusOK {
			if resp != nil {
				resp.Body.Close()
			}
			continue // Optional files may not exist
		}
		content, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		os.WriteFile(filepath.Join(pluginDir, file), content, 0644)
	}

	// Fetch the actual plugin.json to get frontend assets list
	pluginJSONPath := filepath.Join(pluginDir, "plugin.json")
	var pluginConfig struct {
		FrontendScripts []string `json:"frontend_scripts"`
		FrontendStyles  []string `json:"frontend_styles"`
	}
	if data, err := os.ReadFile(pluginJSONPath); err == nil {
		json.Unmarshal(data, &pluginConfig)
	}

	// Download frontend scripts
	frontendScripts := make([]string, 0)
	for _, script := range pluginConfig.FrontendScripts {
		resp, err := http.Get(baseURL + "assets/" + script)
		if err != nil || resp.StatusCode != http.StatusOK {
			if resp != nil {
				resp.Body.Close()
			}
			continue
		}
		content, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		scriptPath := filepath.Join(assetsDir, script)
		if err := os.WriteFile(scriptPath, content, 0644); err == nil {
			frontendScripts = append(frontendScripts, script)
		}
	}

	// Download frontend styles
	frontendStyles := make([]string, 0)
	for _, style := range pluginConfig.FrontendStyles {
		resp, err := http.Get(baseURL + "assets/" + style)
		if err != nil || resp.StatusCode != http.StatusOK {
			if resp != nil {
				resp.Body.Close()
			}
			continue
		}
		content, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		stylePath := filepath.Join(assetsDir, style)
		if err := os.WriteFile(stylePath, content, 0644); err == nil {
			frontendStyles = append(frontendStyles, style)
		}
	}

	// Record installation in database
	db := database.Get()
	if db != nil {
		scriptsJSON, _ := json.Marshal(frontendScripts)
		stylesJSON, _ := json.Marshal(frontendStyles)

		record := models.InstalledPlugin{
			ID:              manifest.ID,
			Name:            manifest.Name,
			Version:         manifest.Version,
			Author:          manifest.Author,
			Description:     manifest.Description,
			Category:        manifest.Category,
			Enabled:         true,
			FrontendScripts: string(scriptsJSON),
			FrontendStyles:  string(stylesJSON),
		}
		db.Create(&record)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":          "Plugin " + manifest.Name + " installed successfully",
		"plugin":           manifest,
		"frontend_scripts": frontendScripts,
		"frontend_styles":  frontendStyles,
	})
}

// UninstallPlugin removes an installed plugin
func UninstallPlugin(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	pluginID := c.Param("id")

	// Check if installed
	installed := getInstalledPluginIDs()
	if _, exists := installed[pluginID]; !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plugin not installed"})
		return
	}

	// Remove from database
	db := database.Get()
	if db != nil {
		db.Delete(&models.InstalledPlugin{}, "id = ?", pluginID)
	}

	// Remove plugin directory
	pluginsDir := getPluginsDir()
	pluginDir := filepath.Join(pluginsDir, pluginID)
	os.RemoveAll(pluginDir)

	c.JSON(http.StatusOK, gin.H{
		"message": "Plugin " + pluginID + " uninstalled successfully",
	})
}

// TogglePlugin enables or disables a plugin
func TogglePlugin(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	pluginID := c.Param("id")

	var input struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update in database
	db := database.Get()
	if db != nil {
		db.Model(&models.InstalledPlugin{}).Where("id = ?", pluginID).Update("enabled", input.Enabled)
	}

	status := "disabled"
	if input.Enabled {
		status = "enabled"
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Plugin " + pluginID + " " + status,
		"enabled": input.Enabled,
	})
}

// UpdatePlugin updates a plugin to the latest version
func UpdatePlugin(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	pluginID := c.Param("id")

	// Fetch latest version
	index, err := fetchPluginIndex()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch plugin info"})
		return
	}

	var manifest *PluginManifest
	for _, p := range index.Plugins {
		if p.ID == pluginID {
			manifest = &p
			break
		}
	}

	if manifest == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
		return
	}

	// Download updated files
	pluginsDir := getPluginsDir()
	pluginDir := filepath.Join(pluginsDir, pluginID)

	baseURL := "https://raw.githubusercontent.com/ValwareIRC/uwp-plugins/main/plugins/" + pluginID + "/"
	files := []string{"plugin.json", "main.go", "README.md", "LICENSE"}

	for _, file := range files {
		resp, err := http.Get(baseURL + file)
		if err != nil || resp.StatusCode != http.StatusOK {
			continue
		}
		defer resp.Body.Close()

		content, _ := io.ReadAll(resp.Body)
		os.WriteFile(filepath.Join(pluginDir, file), content, 0644)
	}

	// Update database record
	db := database.Get()
	if db != nil {
		db.Model(&models.InstalledPlugin{}).Where("id = ?", pluginID).Updates(map[string]interface{}{
			"version":     manifest.Version,
			"description": manifest.Description,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Plugin " + manifest.Name + " updated successfully",
		"new_version": manifest.Version,
	})
}

// RefreshPluginCache forces a refresh of the plugin cache
func RefreshPluginCache(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Clear cache
	pluginCacheMu.Lock()
	pluginCache = nil
	pluginCacheTime = time.Time{}
	pluginCacheMu.Unlock()

	// Fetch fresh
	index, err := fetchPluginIndex()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to refresh plugins"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Plugin cache refreshed",
		"plugin_count": len(index.Plugins),
	})
}
