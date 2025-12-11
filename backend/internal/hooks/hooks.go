package hooks

import (
	"sync"
)

// HookType represents different hook points in the application
type HookType int

const (
	// Navigation and UI hooks
	HookNavbar HookType = iota + 100
	HookPreHeader
	HookHeader
	HookPreOverviewCard
	HookOverviewCard
	HookPreFooter
	HookFooter
	HookRightClickMenu

	// User management hooks
	HookUserLookup HookType = iota + 200
	HookUserMetaAdd
	HookUserMetaDel
	HookUserMetaGet
	HookUserCreate
	HookUserList
	HookUserDelete
	HookUserEdit
	HookUserLogin
	HookUserLoginFail
	HookUserPermissionList

	// Notification hooks
	HookNotification HookType = iota + 300

	// Settings hooks
	HookGeneralSettings HookType = iota + 400
	HookGeneralSettingsPost

	// System hooks
	HookAuthMod HookType = iota + 500
	HookUpgrade

	// API hooks
	HookAPIRequest HookType = iota + 600
	HookAPIResponse

	// Webhook hooks
	HookWebhookReceived HookType = iota + 700 // Called when a webhook is received from UnrealIRCd
)

// HookCallback is the function signature for hook callbacks
type HookCallback func(args interface{}) interface{}

// HookEntry represents a registered hook callback
type HookEntry struct {
	Name     string
	Callback HookCallback
	Priority int
}

// Manager manages all hooks in the application
type Manager struct {
	hooks map[HookType][]HookEntry
	mu    sync.RWMutex
}

var (
	manager *Manager
	once    sync.Once
)

// GetManager returns the singleton hook manager
func GetManager() *Manager {
	once.Do(func() {
		manager = &Manager{
			hooks: make(map[HookType][]HookEntry),
		}
	})
	return manager
}

// Register registers a callback for a specific hook type
func (m *Manager) Register(hookType HookType, name string, callback HookCallback, priority int) {
	m.mu.Lock()
	defer m.mu.Unlock()

	entry := HookEntry{
		Name:     name,
		Callback: callback,
		Priority: priority,
	}

	m.hooks[hookType] = append(m.hooks[hookType], entry)

	// Sort by priority (lower number = higher priority)
	entries := m.hooks[hookType]
	for i := len(entries) - 1; i > 0; i-- {
		if entries[i].Priority < entries[i-1].Priority {
			entries[i], entries[i-1] = entries[i-1], entries[i]
		}
	}
}

// Unregister removes a callback by name from a specific hook type
func (m *Manager) Unregister(hookType HookType, name string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	entries := m.hooks[hookType]
	for i, entry := range entries {
		if entry.Name == name {
			m.hooks[hookType] = append(entries[:i], entries[i+1:]...)
			break
		}
	}
}

// Run executes all callbacks for a specific hook type
func (m *Manager) Run(hookType HookType, args interface{}) interface{} {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := args
	for _, entry := range m.hooks[hookType] {
		result = entry.Callback(result)
	}
	return result
}

// RunAll executes all callbacks and collects results
func (m *Manager) RunAll(hookType HookType, args interface{}) []interface{} {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var results []interface{}
	for _, entry := range m.hooks[hookType] {
		result := entry.Callback(args)
		if result != nil {
			results = append(results, result)
		}
	}
	return results
}

// HasHooks returns true if there are any callbacks registered for the hook type
func (m *Manager) HasHooks(hookType HookType) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.hooks[hookType]) > 0
}

// GetRegistered returns all registered callbacks for a hook type
func (m *Manager) GetRegistered(hookType HookType) []string {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var names []string
	for _, entry := range m.hooks[hookType] {
		names = append(names, entry.Name)
	}
	return names
}

// Helper functions for common hook operations

// Register is a convenience function to register a hook
func Register(hookType HookType, name string, callback HookCallback) {
	GetManager().Register(hookType, name, callback, 100)
}

// RegisterWithPriority registers a hook with a specific priority
func RegisterWithPriority(hookType HookType, name string, callback HookCallback, priority int) {
	GetManager().Register(hookType, name, callback, priority)
}

// Run is a convenience function to run hooks
func Run(hookType HookType, args interface{}) interface{} {
	return GetManager().Run(hookType, args)
}

// RunAll is a convenience function to run all hooks and collect results
func RunAll(hookType HookType, args interface{}) []interface{} {
	return GetManager().RunAll(hookType, args)
}
