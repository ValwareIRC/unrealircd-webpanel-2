package plugins

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"plugin"
	"sync"

	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/hooks"
)

// PluginInfo contains metadata about a plugin
type PluginInfo struct {
	Name        string   `json:"name"`
	Version     string   `json:"version"`
	Author      string   `json:"author"`
	Email       string   `json:"email"`
	Description string   `json:"description"`
	Homepage    string   `json:"homepage,omitempty"`
	License     string   `json:"license,omitempty"`
	Requires    []string `json:"requires,omitempty"`
}

// Plugin interface that all plugins must implement
type Plugin interface {
	// Info returns the plugin metadata
	Info() PluginInfo
	// Init initializes the plugin
	Init() error
	// Shutdown cleanly shuts down the plugin
	Shutdown() error
}

// PluginEntry represents a loaded plugin
type PluginEntry struct {
	Info     PluginInfo
	Instance Plugin
	Handle   string
	Enabled  bool
	Path     string
}

// Manager manages all plugins
type Manager struct {
	plugins   map[string]*PluginEntry
	pluginDir string
	mu        sync.RWMutex
}

var (
	manager     *Manager
	managerOnce sync.Once
)

// GetManager returns the singleton plugin manager
func GetManager() *Manager {
	managerOnce.Do(func() {
		manager = &Manager{
			plugins:   make(map[string]*PluginEntry),
			pluginDir: "plugins",
		}
	})
	return manager
}

// SetPluginDir sets the plugin directory
func (m *Manager) SetPluginDir(dir string) {
	m.pluginDir = dir
}

// GetPluginDir returns the plugin directory
func (m *Manager) GetPluginDir() string {
	return m.pluginDir
}

// LoadPlugin loads a plugin by handle name
func (m *Manager) LoadPlugin(handle string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Check if already loaded
	if _, exists := m.plugins[handle]; exists {
		return fmt.Errorf("plugin %s is already loaded", handle)
	}

	pluginPath := filepath.Join(m.pluginDir, handle)

	// Check for plugin.json metadata
	metaPath := filepath.Join(pluginPath, "plugin.json")
	var info PluginInfo

	if data, err := os.ReadFile(metaPath); err == nil {
		if err := json.Unmarshal(data, &info); err != nil {
			return fmt.Errorf("failed to parse plugin.json for %s: %w", handle, err)
		}
	}

	// Try to load Go plugin (.so file)
	soPath := filepath.Join(pluginPath, handle+".so")
	if _, err := os.Stat(soPath); err == nil {
		return m.loadGoPlugin(handle, soPath, info)
	}

	// For now, we'll support "built-in" plugins that are compiled into the binary
	// These are registered via RegisterBuiltinPlugin

	return fmt.Errorf("plugin %s not found or not loadable", handle)
}

// loadGoPlugin loads a Go plugin from a .so file
func (m *Manager) loadGoPlugin(handle, soPath string, info PluginInfo) error {
	p, err := plugin.Open(soPath)
	if err != nil {
		return fmt.Errorf("failed to open plugin %s: %w", handle, err)
	}

	// Look for the NewPlugin function
	sym, err := p.Lookup("NewPlugin")
	if err != nil {
		return fmt.Errorf("plugin %s does not export NewPlugin: %w", handle, err)
	}

	newPlugin, ok := sym.(func() Plugin)
	if !ok {
		return fmt.Errorf("plugin %s NewPlugin has wrong signature", handle)
	}

	instance := newPlugin()
	if err := instance.Init(); err != nil {
		return fmt.Errorf("failed to initialize plugin %s: %w", handle, err)
	}

	// Use plugin's info if metadata wasn't loaded from JSON
	if info.Name == "" {
		info = instance.Info()
	}

	m.plugins[handle] = &PluginEntry{
		Info:     info,
		Instance: instance,
		Handle:   handle,
		Enabled:  true,
		Path:     soPath,
	}

	return nil
}

// RegisterBuiltinPlugin registers a built-in plugin (compiled into the binary)
func (m *Manager) RegisterBuiltinPlugin(handle string, p Plugin) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.plugins[handle]; exists {
		return fmt.Errorf("plugin %s is already registered", handle)
	}

	if err := p.Init(); err != nil {
		return fmt.Errorf("failed to initialize plugin %s: %w", handle, err)
	}

	m.plugins[handle] = &PluginEntry{
		Info:     p.Info(),
		Instance: p,
		Handle:   handle,
		Enabled:  true,
		Path:     "builtin",
	}

	return nil
}

// UnloadPlugin unloads a plugin by handle
func (m *Manager) UnloadPlugin(handle string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	entry, exists := m.plugins[handle]
	if !exists {
		return fmt.Errorf("plugin %s is not loaded", handle)
	}

	if err := entry.Instance.Shutdown(); err != nil {
		return fmt.Errorf("failed to shutdown plugin %s: %w", handle, err)
	}

	delete(m.plugins, handle)
	return nil
}

// GetPlugin returns a plugin by handle
func (m *Manager) GetPlugin(handle string) (*PluginEntry, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	entry, exists := m.plugins[handle]
	return entry, exists
}

// ListPlugins returns all loaded plugins
func (m *Manager) ListPlugins() []*PluginEntry {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var list []*PluginEntry
	for _, entry := range m.plugins {
		list = append(list, entry)
	}
	return list
}

// PluginExists checks if a plugin is loaded
func (m *Manager) PluginExists(handle string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()

	_, exists := m.plugins[handle]
	return exists
}

// DiscoverPlugins finds all available plugins in the plugin directory
func (m *Manager) DiscoverPlugins() ([]PluginInfo, error) {
	var discovered []PluginInfo

	entries, err := os.ReadDir(m.pluginDir)
	if err != nil {
		if os.IsNotExist(err) {
			return discovered, nil
		}
		return nil, err
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		handle := entry.Name()
		metaPath := filepath.Join(m.pluginDir, handle, "plugin.json")

		data, err := os.ReadFile(metaPath)
		if err != nil {
			continue
		}

		var info PluginInfo
		if err := json.Unmarshal(data, &info); err != nil {
			continue
		}

		discovered = append(discovered, info)
	}

	return discovered, nil
}

// NavItem represents a navigation menu item added by a plugin
type NavItem struct {
	Label    string    `json:"label"`
	Icon     string    `json:"icon"`
	Path     string    `json:"path"`
	Order    int       `json:"order"`
	Children []NavItem `json:"children,omitempty"`
}

// GetNavItems returns all navigation items from plugins
func (m *Manager) GetNavItems() []NavItem {
	result := hooks.RunAll(hooks.HookNavbar, nil)

	var items []NavItem
	for _, r := range result {
		if navItems, ok := r.([]NavItem); ok {
			items = append(items, navItems...)
		} else if navItem, ok := r.(NavItem); ok {
			items = append(items, navItem)
		}
	}

	return items
}

// DashboardCard represents a dashboard card added by a plugin
type DashboardCard struct {
	Title   string      `json:"title"`
	Icon    string      `json:"icon"`
	Content interface{} `json:"content"`
	Order   int         `json:"order"`
	Size    string      `json:"size"` // "sm", "md", "lg", "xl"
}

// GetDashboardCards returns all dashboard cards from plugins
func (m *Manager) GetDashboardCards() []DashboardCard {
	result := hooks.RunAll(hooks.HookOverviewCard, nil)

	var cards []DashboardCard
	for _, r := range result {
		if dashCards, ok := r.([]DashboardCard); ok {
			cards = append(cards, dashCards...)
		} else if card, ok := r.(DashboardCard); ok {
			cards = append(cards, card)
		}
	}

	return cards
}
