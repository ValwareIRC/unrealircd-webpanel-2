package handlers

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/middleware"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/rpc"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/utils"
)

// ReportConfig represents a custom report configuration
type ReportConfig struct {
	Name      string        `json:"name"`
	Metrics   []string      `json:"metrics"`    // What to include: users, channels, servers, bans, etc.
	TimeRange string        `json:"time_range"` // "1h", "24h", "7d", "30d", "custom"
	StartDate string        `json:"start_date,omitempty"`
	EndDate   string        `json:"end_date,omitempty"`
	Filters   ReportFilters `json:"filters,omitempty"`
	Format    string        `json:"format"`             // "json", "csv", "html"
	GroupBy   string        `json:"group_by,omitempty"` // "hour", "day", "server"
}

// ReportFilters represents filter options for reports
type ReportFilters struct {
	ServerFilter  string `json:"server_filter,omitempty"`
	UserFilter    string `json:"user_filter,omitempty"`
	ChannelFilter string `json:"channel_filter,omitempty"`
	MinUsers      int    `json:"min_users,omitempty"`
}

// ReportResult represents the generated report data
type ReportResult struct {
	GeneratedAt time.Time              `json:"generated_at"`
	Config      ReportConfig           `json:"config"`
	Data        map[string]interface{} `json:"data"`
	Summary     map[string]interface{} `json:"summary"`
}

// AvailableMetrics returns the list of metrics that can be included in reports
func GetAvailableMetrics(c *gin.Context) {
	metrics := []map[string]interface{}{
		{
			"id":          "users",
			"name":        "User Statistics",
			"description": "Total users, opers, connections by server",
			"fields":      []string{"total", "opers", "by_server", "tls_usage"},
		},
		{
			"id":          "channels",
			"name":        "Channel Statistics",
			"description": "Channel counts, top channels by users",
			"fields":      []string{"total", "top_by_users", "modes_distribution"},
		},
		{
			"id":          "servers",
			"name":        "Server Statistics",
			"description": "Server list, uptime, user distribution",
			"fields":      []string{"total", "by_name", "user_distribution"},
		},
		{
			"id":          "bans",
			"name":        "Ban Statistics",
			"description": "Server bans, name bans, spamfilters",
			"fields":      []string{"server_bans", "name_bans", "ban_exceptions", "spamfilters"},
		},
		{
			"id":          "activity",
			"name":        "Activity Metrics",
			"description": "User journey events, actions over time",
			"fields":      []string{"connections", "disconnections", "nick_changes"},
		},
	}

	c.JSON(http.StatusOK, metrics)
}

// GenerateReport creates a custom report based on the provided configuration
func GenerateReport(c *gin.Context) {
	var config ReportConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(config.Metrics) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one metric is required"})
		return
	}

	// Parse time range
	startTime, endTime := parseTimeRange(config.TimeRange, config.StartDate, config.EndDate)

	result := ReportResult{
		GeneratedAt: time.Now(),
		Config:      config,
		Data:        make(map[string]interface{}),
		Summary:     make(map[string]interface{}),
	}

	manager := rpc.GetManager()
	db := database.Get()

	// Collect requested metrics
	for _, metric := range config.Metrics {
		switch metric {
		case "users":
			userData := collectUserMetrics(manager, config.Filters)
			result.Data["users"] = userData
			if total, ok := userData["total"].(int); ok {
				result.Summary["total_users"] = total
			}

		case "channels":
			channelData := collectChannelMetrics(manager, config.Filters)
			result.Data["channels"] = channelData
			if total, ok := channelData["total"].(int); ok {
				result.Summary["total_channels"] = total
			}

		case "servers":
			serverData := collectServerMetrics(manager, config.Filters)
			result.Data["servers"] = serverData
			if total, ok := serverData["total"].(int); ok {
				result.Summary["total_servers"] = total
			}

		case "bans":
			banData := collectBanMetrics(manager)
			result.Data["bans"] = banData

		case "activity":
			activityData := collectActivityMetrics(db, startTime, endTime, config.GroupBy)
			result.Data["activity"] = activityData
		}
	}

	result.Summary["time_range"] = map[string]interface{}{
		"start": startTime,
		"end":   endTime,
	}

	// Log the report generation
	user := middleware.GetCurrentUser(c)
	if user != nil {
		logAction(c, user, "generate_report", map[string]string{
			"metrics": strings.Join(config.Metrics, ","),
			"format":  config.Format,
		})
	}

	// Return in requested format
	switch config.Format {
	case "csv":
		c.Header("Content-Type", "text/csv")
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=report_%s.csv", time.Now().Format("20060102_150405")))
		writeCSV(c.Writer, result)
	case "html":
		c.Header("Content-Type", "text/html")
		writeHTML(c.Writer, result)
	default:
		c.JSON(http.StatusOK, result)
	}
}

// GetReportPreview generates a quick preview of report data
func GetReportPreview(c *gin.Context) {
	metric := c.Query("metric")
	if metric == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "metric parameter required"})
		return
	}

	manager := rpc.GetManager()

	var preview interface{}

	switch metric {
	case "users":
		preview = collectUserMetrics(manager, ReportFilters{})
	case "channels":
		preview = collectChannelMetrics(manager, ReportFilters{})
	case "servers":
		preview = collectServerMetrics(manager, ReportFilters{})
	case "bans":
		preview = collectBanMetrics(manager)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unknown metric"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"metric":  metric,
		"preview": preview,
	})
}

func parseTimeRange(timeRange, startDate, endDate string) (time.Time, time.Time) {
	now := time.Now()
	var start, end time.Time

	switch timeRange {
	case "1h":
		start = now.Add(-1 * time.Hour)
		end = now
	case "24h":
		start = now.Add(-24 * time.Hour)
		end = now
	case "7d":
		start = now.AddDate(0, 0, -7)
		end = now
	case "30d":
		start = now.AddDate(0, 0, -30)
		end = now
	case "custom":
		if s, err := time.Parse("2006-01-02", startDate); err == nil {
			start = s
		} else {
			start = now.AddDate(0, 0, -7)
		}
		if e, err := time.Parse("2006-01-02", endDate); err == nil {
			end = e.Add(24 * time.Hour) // Include end of day
		} else {
			end = now
		}
	default:
		start = now.Add(-24 * time.Hour)
		end = now
	}

	return start, end
}

func collectUserMetrics(manager *rpc.Manager, filters ReportFilters) map[string]interface{} {
	result := make(map[string]interface{})

	data, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.User().GetAll(4)
	})
	if err != nil {
		return result
	}

	users := utils.InterfaceToSlice(data)
	result["total"] = len(users)

	// Count by server
	byServer := make(map[string]int)
	operCount := 0
	tlsCount := 0

	for _, u := range users {
		uMap := utils.InterfaceToMap(u)
		if uMap == nil {
			continue
		}

		// Apply filters
		if filters.UserFilter != "" {
			nick := utils.SafeMapGetString(uMap, "name")
			if !strings.Contains(strings.ToLower(nick), strings.ToLower(filters.UserFilter)) {
				continue
			}
		}

		// Server
		if srvData := utils.InterfaceToMap(uMap["server"]); srvData != nil {
			serverName := utils.SafeMapGetString(srvData, "name")
			if filters.ServerFilter == "" || serverName == filters.ServerFilter {
				byServer[serverName]++
			}
		}

		// Oper
		if operLogin := utils.SafeMapGetString(uMap, "oper_login"); operLogin != "" {
			operCount++
		}

		// TLS
		if tlsData := utils.InterfaceToMap(uMap["tls"]); tlsData != nil {
			tlsCount++
		}
	}

	result["opers"] = operCount
	result["tls_users"] = tlsCount
	result["by_server"] = byServer

	if len(users) > 0 {
		result["tls_percentage"] = float64(tlsCount) / float64(len(users)) * 100
	}

	return result
}

func collectChannelMetrics(manager *rpc.Manager, filters ReportFilters) map[string]interface{} {
	result := make(map[string]interface{})

	data, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Channel().GetAll(4)
	})
	if err != nil {
		return result
	}

	channels := utils.InterfaceToSlice(data)
	result["total"] = len(channels)

	// Top channels by user count
	type channelInfo struct {
		Name  string
		Users int
	}
	var topChannels []channelInfo

	for _, ch := range channels {
		chMap := utils.InterfaceToMap(ch)
		if chMap == nil {
			continue
		}

		name := utils.SafeMapGetString(chMap, "name")
		if filters.ChannelFilter != "" && !strings.Contains(strings.ToLower(name), strings.ToLower(filters.ChannelFilter)) {
			continue
		}

		userCount := utils.SafeMapGetInt(chMap, "num_users")
		if filters.MinUsers > 0 && userCount < filters.MinUsers {
			continue
		}

		topChannels = append(topChannels, channelInfo{Name: name, Users: userCount})
	}

	// Sort by users and take top 10
	for i := 0; i < len(topChannels)-1; i++ {
		for j := i + 1; j < len(topChannels); j++ {
			if topChannels[j].Users > topChannels[i].Users {
				topChannels[i], topChannels[j] = topChannels[j], topChannels[i]
			}
		}
	}
	if len(topChannels) > 10 {
		topChannels = topChannels[:10]
	}

	result["top_by_users"] = topChannels

	return result
}

func collectServerMetrics(manager *rpc.Manager, filters ReportFilters) map[string]interface{} {
	result := make(map[string]interface{})

	data, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Server().GetAll()
	})
	if err != nil {
		return result
	}

	servers := utils.InterfaceToSlice(data)
	result["total"] = len(servers)

	var serverList []map[string]interface{}
	for _, srv := range servers {
		srvMap := utils.InterfaceToMap(srv)
		if srvMap == nil {
			continue
		}

		name := utils.SafeMapGetString(srvMap, "name")
		if filters.ServerFilter != "" && name != filters.ServerFilter {
			continue
		}

		serverList = append(serverList, map[string]interface{}{
			"name":      name,
			"num_users": utils.SafeMapGetInt(srvMap, "num_users"),
			"uplink":    utils.SafeMapGetString(srvMap, "uplink"),
		})
	}

	result["servers"] = serverList

	return result
}

func collectBanMetrics(manager *rpc.Manager) map[string]interface{} {
	result := make(map[string]interface{})

	// Server bans
	if data, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.ServerBan().GetAll()
	}); err == nil {
		bans := utils.InterfaceToSlice(data)
		result["server_bans"] = len(bans)

		// Count by type
		byType := make(map[string]int)
		for _, b := range bans {
			bMap := utils.InterfaceToMap(b)
			if bMap != nil {
				banType := utils.SafeMapGetString(bMap, "type")
				byType[banType]++
			}
		}
		result["server_bans_by_type"] = byType
	}

	// Name bans
	if data, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.NameBan().GetAll()
	}); err == nil {
		bans := utils.InterfaceToSlice(data)
		result["name_bans"] = len(bans)
	}

	// Spamfilters
	if data, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Spamfilter().GetAll()
	}); err == nil {
		filters := utils.InterfaceToSlice(data)
		result["spamfilters"] = len(filters)
	}

	return result
}

func collectActivityMetrics(db interface{}, start, end time.Time, groupBy string) map[string]interface{} {
	result := make(map[string]interface{})

	// Use type assertion for the database
	gormDB := database.Get()

	// Get activity counts from journey events
	var events []struct {
		EventType string
		Count     int64
	}

	gormDB.Table("user_journey_events").
		Select("event_type, count(*) as count").
		Where("created_at BETWEEN ? AND ?", start, end).
		Group("event_type").
		Scan(&events)

	eventCounts := make(map[string]int64)
	for _, e := range events {
		eventCounts[e.EventType] = e.Count
	}
	result["event_counts"] = eventCounts

	return result
}

func writeCSV(w http.ResponseWriter, result ReportResult) {
	writer := csv.NewWriter(w)
	defer writer.Flush()

	// Write header
	writer.Write([]string{"Report Generated", result.GeneratedAt.Format(time.RFC3339)})
	writer.Write([]string{})

	// Write summary
	writer.Write([]string{"Summary"})
	for key, value := range result.Summary {
		writer.Write([]string{key, fmt.Sprintf("%v", value)})
	}
	writer.Write([]string{})

	// Write data sections
	for section, data := range result.Data {
		writer.Write([]string{section})
		dataBytes, _ := json.Marshal(data)
		writer.Write([]string{"data", string(dataBytes)})
		writer.Write([]string{})
	}
}

func writeHTML(w http.ResponseWriter, result ReportResult) {
	html := `<!DOCTYPE html>
<html>
<head>
    <title>IRC Network Report</title>
    <style>
        body { font-family: sans-serif; padding: 20px; background: #1a1a2e; color: #fff; }
        h1 { color: #4cc9f0; }
        h2 { color: #7b2cbf; margin-top: 30px; }
        .summary { background: #2a2a4e; padding: 15px; border-radius: 8px; }
        .metric { margin: 10px 0; }
        .value { font-size: 24px; font-weight: bold; color: #4cc9f0; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #333; }
        th { background: #2a2a4e; }
    </style>
</head>
<body>
    <h1>IRC Network Report</h1>
    <p>Generated: ` + result.GeneratedAt.Format("2006-01-02 15:04:05") + `</p>
    
    <h2>Summary</h2>
    <div class="summary">`

	for key, value := range result.Summary {
		html += fmt.Sprintf(`<div class="metric"><span>%s:</span> <span class="value">%v</span></div>`, key, value)
	}

	html += `</div>`

	// Add data sections
	for section, data := range result.Data {
		html += fmt.Sprintf(`<h2>%s</h2>`, strings.Title(section))
		dataBytes, _ := json.MarshalIndent(data, "", "  ")
		html += fmt.Sprintf(`<pre>%s</pre>`, string(dataBytes))
	}

	html += `</body></html>`
	w.Write([]byte(html))
}

// GetSavedReports returns saved report configurations
func GetSavedReports(c *gin.Context) {
	// For now, return some preset reports
	presets := []map[string]interface{}{
		{
			"id":          "daily_summary",
			"name":        "Daily Network Summary",
			"description": "Overview of users, channels, and servers for the last 24 hours",
			"config": ReportConfig{
				Name:      "Daily Summary",
				Metrics:   []string{"users", "channels", "servers"},
				TimeRange: "24h",
				Format:    "json",
			},
		},
		{
			"id":          "weekly_activity",
			"name":        "Weekly Activity Report",
			"description": "User activity and resource metrics for the past week",
			"config": ReportConfig{
				Name:      "Weekly Activity",
				Metrics:   []string{"activity"},
				TimeRange: "7d",
				Format:    "json",
				GroupBy:   "day",
			},
		},
		{
			"id":          "security_audit",
			"name":        "Security Audit",
			"description": "Ban statistics and TLS usage report",
			"config": ReportConfig{
				Name:      "Security Audit",
				Metrics:   []string{"users", "bans"},
				TimeRange: "30d",
				Format:    "json",
			},
		},
	}

	c.JSON(http.StatusOK, presets)
}
