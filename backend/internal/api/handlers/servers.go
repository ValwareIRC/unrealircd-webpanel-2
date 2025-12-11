package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/middleware"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/rpc"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/utils"
)

// IRCServer represents an IRC server from the RPC response
type IRCServer struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Uplink      string                 `json:"uplink,omitempty"`
	NumUsers    int                    `json:"num_users"`
	Boot        int64                  `json:"boot,omitempty"`
	SyncedSince int64                  `json:"synced_since,omitempty"`
	ServerInfo  string                 `json:"server_info,omitempty"`
	Features    map[string]interface{} `json:"features,omitempty"`
	Server      map[string]interface{} `json:"server,omitempty"`
}

// GetServers returns all IRC servers
func GetServers(c *gin.Context) {
	manager := rpc.GetManager()

	result, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Server().GetAll()
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get servers: " + err.Error()})
		return
	}

	servers := parseServerList(result)
	c.JSON(http.StatusOK, servers)
}

// GetServer returns a specific IRC server
func GetServer(c *gin.Context) {
	name := c.Param("name")
	manager := rpc.GetManager()

	var serverName *string
	if name != "" {
		serverName = &name
	}

	result, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Server().Get(serverName)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get server: " + err.Error()})
		return
	}

	if result == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	server := parseServer(result)
	c.JSON(http.StatusOK, server)
}

// RehashServer rehashes an IRC server
func RehashServer(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Server name is required"})
		return
	}

	manager := rpc.GetManager()

	// Use raw query for rehash
	_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Query("server.rehash", map[string]interface{}{
			"server": name,
		}, false)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to rehash server: " + err.Error()})
		return
	}

	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		logAction(c, currentUser, "rehash_server", map[string]string{
			"server": name,
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Server rehash initiated"})
}

// GetServerModules returns the modules loaded on a server
func GetServerModules(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Server name is required"})
		return
	}

	manager := rpc.GetManager()

	// Use raw query for module list
	result, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Query("server.module_list", map[string]interface{}{
			"server": name,
		}, false)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get modules: " + err.Error()})
		return
	}

	// Parse the module list
	m := utils.InterfaceToMap(result)
	if m == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid response from server"})
		return
	}

	modules := utils.SafeMapGetSlice(m, "list")
	c.JSON(http.StatusOK, modules)
}

// Helper functions

func parseServerList(result interface{}) []IRCServer {
	servers := make([]IRCServer, 0)

	list := utils.InterfaceToSlice(result)
	for _, item := range list {
		if server := parseServer(item); server != nil {
			servers = append(servers, *server)
		}
	}

	return servers
}

func parseServer(result interface{}) *IRCServer {
	m := utils.InterfaceToMap(result)
	if m == nil {
		return nil
	}

	server := &IRCServer{
		ID:          utils.SafeMapGetString(m, "id"),
		Name:        utils.SafeMapGetString(m, "name"),
		Uplink:      utils.SafeMapGetString(m, "uplink"),
		NumUsers:    utils.SafeMapGetInt(m, "num_users"),
		Boot:        int64(utils.SafeMapGetInt(m, "boot")),
		SyncedSince: int64(utils.SafeMapGetInt(m, "synced_since")),
		ServerInfo:  utils.SafeMapGetString(m, "server_info"),
	}

	// Parse nested objects
	if features := utils.SafeMapGetMap(m, "features"); features != nil {
		server.Features = features
	}
	if serverInfo := utils.SafeMapGetMap(m, "server"); serverInfo != nil {
		server.Server = serverInfo
	}

	return server
}
