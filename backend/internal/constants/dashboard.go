package constants

// DashboardWidgetType represents the type of dashboard widget
type DashboardWidgetType string

const (
	WidgetStats         DashboardWidgetType = "stats"
	WidgetActivityChart DashboardWidgetType = "activity-chart"
	WidgetTopChannels   DashboardWidgetType = "top-channels"
	WidgetServerStatus  DashboardWidgetType = "server-status"
	WidgetQuickLinks    DashboardWidgetType = "quick-links"
	WidgetRecentBans    DashboardWidgetType = "recent-bans"
	WidgetNetworkInfo   DashboardWidgetType = "network-info"
	WidgetShortcut      DashboardWidgetType = "shortcut"
)

// ValidWidgetTypes contains all valid widget types
var ValidWidgetTypes = []DashboardWidgetType{
	WidgetStats,
	WidgetActivityChart,
	WidgetTopChannels,
	WidgetServerStatus,
	WidgetQuickLinks,
	WidgetRecentBans,
	WidgetNetworkInfo,
	WidgetShortcut,
}

// IsValidWidgetType checks if a widget type is valid
func IsValidWidgetType(t string) bool {
	for _, valid := range ValidWidgetTypes {
		if string(valid) == t {
			return true
		}
	}
	return false
}
