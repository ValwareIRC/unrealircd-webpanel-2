package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/rpc"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/sse"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/utils"
)

// NetworkStats represents network statistics
type NetworkStats struct {
	Users      int `json:"users"`
	Channels   int `json:"channels"`
	Operators  int `json:"operators"`
	Servers    int `json:"servers"`
	ServerBans int `json:"server_bans"`
}

// GetStats returns current network statistics
func GetStats(c *gin.Context) {
	manager := rpc.GetManager()

	result, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Stats().Get(1)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get stats: " + err.Error()})
		return
	}

	stats := parseStats(result)
	c.JSON(http.StatusOK, stats)
}

// GetStatsHistory returns historical network statistics using stats.history RPC method
func GetStatsHistory(c *gin.Context) {
	manager := rpc.GetManager()

	client, err := manager.GetActiveWithReconnect()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No RPC connection: " + err.Error()})
		return
	}

	// Try calling stats.history with various parameter combinations
	// First try with no params
	result, err := client.Query("stats.history", nil, false)
	log.Printf("[stats.history] Response with nil params: %+v, Error: %v", result, err)

	// Try with object_detail_level
	result2, err2 := client.Query("stats.history", map[string]interface{}{
		"object_detail_level": 1,
	}, false)
	log.Printf("[stats.history] Response with object_detail_level=1: %+v, Error: %v", result2, err2)

	// Try with a time range (last 24 hours)
	result3, err3 := client.Query("stats.history", map[string]interface{}{
		"object_detail_level": 1,
		"since":               3600 * 24, // last 24 hours in seconds
	}, false)
	log.Printf("[stats.history] Response with since=86400: %+v, Error: %v", result3, err3)

	// Return all results for inspection
	c.JSON(http.StatusOK, gin.H{
		"no_params": gin.H{
			"result": result,
			"error":  errToString(err),
		},
		"with_detail_level": gin.H{
			"result": result2,
			"error":  errToString(err2),
		},
		"with_since": gin.H{
			"result": result3,
			"error":  errToString(err3),
		},
	})
}

func errToString(err error) string {
	if err != nil {
		return err.Error()
	}
	return ""
}

// GetStatsHistoryData returns historical stats data for the Statistics page
func GetStatsHistoryData(c *gin.Context) {
	manager := rpc.GetManager()

	client, err := manager.GetActiveWithReconnect()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No RPC connection: " + err.Error()})
		return
	}

	// Call stats.history - it returns available historical snapshots
	result, err := client.Query("stats.history", nil, false)
	if err != nil {
		log.Printf("[GetStatsHistoryData] Error calling stats.history: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get stats history: " + err.Error()})
		return
	}

	log.Printf("[GetStatsHistoryData] Raw result: %+v", result)

	// The result should be the stats.history response directly
	// Return it as-is for the frontend to process
	c.JSON(http.StatusOK, result)
}

// StreamStats streams network statistics via SSE
func StreamStats(c *gin.Context) {
	manager := rpc.GetManager()
	// Verify we have an active connection before starting
	_, err := manager.GetActive()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "No RPC connection available"})
		return
	}

	sseClient := sse.NewClient(uuid.New().String())

	// Start sending stats
	go func() {
		ticker := make(chan bool)
		go func() {
			for {
				select {
				case <-sseClient.Done:
					return
				default:
					ticker <- true
					<-ticker // Wait for processing
				}
			}
		}()

		for {
			select {
			case <-sseClient.Done:
				return
			case <-ticker:
				// Try to get stats, reconnect if needed
				result, err := manager.WithRetry(func(c *rpc.Client) (interface{}, error) {
					return c.Stats().Get(1)
				})
				if err != nil {
					continue
				}

				stats := parseStats(result)
				sseClient.Channel <- sse.Event{
					Event: "stats",
					Data:  stats,
				}

				// Small delay between updates
				ticker <- true
			}
		}
	}()

	sse.ServeSSE(c, sseClient)
}

// GetLogs returns historical logs
func GetLogs(c *gin.Context) {
	manager := rpc.GetManager()

	// Get source filter from query
	var sources []string
	if s := c.QueryArray("source"); len(s) > 0 {
		sources = s
	}

	result, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Log().GetAll(sources)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get logs: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// StreamLogs streams logs via SSE
func StreamLogs(c *gin.Context) {
	manager := rpc.GetManager()

	// Create a dedicated connection for streaming
	// This avoids conflicts with the shared connection used by other API calls
	streamClient, err := manager.NewDedicatedClient()
	if err != nil {
		log.Printf("[StreamLogs] Failed to create dedicated client: %v", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Failed to create streaming connection: " + err.Error()})
		return
	}

	// Get source filter from query
	var sources []string
	if s := c.QueryArray("source"); len(s) > 0 {
		sources = s
	} else {
		sources = []string{"all"}
	}

	log.Printf("[StreamLogs] Subscribing to log sources: %v", sources)

	// Subscribe to logs
	_, err = streamClient.Log().Subscribe(sources)
	if err != nil {
		log.Printf("[StreamLogs] Failed to subscribe to logs: %v", err)
		streamClient.Close()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to subscribe to logs: " + err.Error()})
		return
	}

	log.Printf("[StreamLogs] Successfully subscribed to logs")

	sseClient := sse.NewClient(uuid.New().String())

	// Start heartbeat to keep connection alive
	go func() {
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-sseClient.Done:
				return
			case <-ticker.C:
				// Send a comment/ping to keep the connection alive
				sseClient.Channel <- sse.Event{
					Event: "ping",
					Data:  map[string]interface{}{"time": time.Now().Unix()},
				}
			}
		}
	}()

	// Start receiving logs
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[StreamLogs] PANIC recovered: %v", r)
			}
			log.Printf("[StreamLogs] Cleaning up stream client")
			streamClient.Log().Unsubscribe()
			streamClient.Close()
		}()

		for {
			select {
			case <-sseClient.Done:
				log.Printf("[StreamLogs] SSE client disconnected")
				return
			default:
				event, err := streamClient.EventLoop()

				if err != nil {
					log.Printf("[StreamLogs] EventLoop error: %v", err)
					// If it's a connection error, exit
					errStr := err.Error()
					if errStr == "websocket: close sent" || errStr == "EOF" {
						log.Printf("[StreamLogs] Connection closed, exiting")
						return
					}
					continue
				}

				if event != nil {
					// Validate that this is actually a log entry (map with log fields)
					// and not just a boolean response from subscribe/unsubscribe
					logEntry, ok := event.(map[string]interface{})
					if !ok {
						continue
					}

					// Check for required log fields
					if _, hasMsg := logEntry["msg"]; !hasMsg {
						if _, hasMessage := logEntry["message"]; !hasMessage {
							continue
						}
					}

					sseClient.Channel <- sse.Event{
						Event: "log",
						Data:  logEntry,
					}
				}
			}
		}
	}()

	sse.ServeSSE(c, sseClient)
}

// GlobalSearch searches across users, channels, and bans
func GlobalSearch(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search query is required"})
		return
	}

	manager := rpc.GetManager()

	results := make(map[string]interface{})

	// Search users
	usersResult, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.User().GetAll(1)
	})
	if err == nil {
		matchingUsers := searchInList(usersResult, query, []string{"name", "hostname", "ip", "realname", "account"})
		results["users"] = matchingUsers
	}

	// Search channels
	channelsResult, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Channel().GetAll(1)
	})
	if err == nil {
		matchingChannels := searchInList(channelsResult, query, []string{"name", "topic"})
		results["channels"] = matchingChannels
	}

	// Search server bans
	bansResult, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.ServerBan().GetAll()
	})
	if err == nil {
		matchingBans := searchInList(bansResult, query, []string{"name", "reason", "set_by"})
		results["bans"] = matchingBans
	}

	c.JSON(http.StatusOK, results)
}

// Helper functions

func parseStats(result interface{}) *NetworkStats {
	m := utils.InterfaceToMap(result)
	if m == nil {
		return &NetworkStats{}
	}

	stats := &NetworkStats{}

	// UnrealIRCd stats.get returns nested objects like:
	// {
	//   "server": {"total": 1},
	//   "user": {"total": 1, "oper": 1},
	//   "channel": {"total": 1},
	//   "server_ban": {"total": 1}
	// }

	// Parse server stats
	if serverData := utils.InterfaceToMap(m["server"]); serverData != nil {
		stats.Servers = utils.SafeMapGetInt(serverData, "total")
	}

	// Parse user stats
	if userData := utils.InterfaceToMap(m["user"]); userData != nil {
		stats.Users = utils.SafeMapGetInt(userData, "total")
		stats.Operators = utils.SafeMapGetInt(userData, "oper")
	}

	// Parse channel stats
	if channelData := utils.InterfaceToMap(m["channel"]); channelData != nil {
		stats.Channels = utils.SafeMapGetInt(channelData, "total")
	}

	// Parse server_ban stats
	if banData := utils.InterfaceToMap(m["server_ban"]); banData != nil {
		stats.ServerBans = utils.SafeMapGetInt(banData, "total")
	}

	return stats
}

func searchInList(list interface{}, query string, fields []string) []interface{} {
	results := make([]interface{}, 0)

	items := utils.InterfaceToSlice(list)
	for _, item := range items {
		m := utils.InterfaceToMap(item)
		if m == nil {
			continue
		}

		for _, field := range fields {
			value := utils.SafeMapGetString(m, field)
			if containsIgnoreCase(value, query) {
				results = append(results, item)
				break
			}
		}
	}

	return results
}

func containsIgnoreCase(s, substr string) bool {
	return len(s) > 0 && len(substr) > 0 &&
		(s == substr ||
			len(s) >= len(substr) &&
				(s[:len(substr)] == substr ||
					s[len(s)-len(substr):] == substr ||
					findSubstring(s, substr)))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
