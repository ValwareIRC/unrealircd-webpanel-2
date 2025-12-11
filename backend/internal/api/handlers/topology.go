package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/rpc"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/utils"
)

// TopologyNode represents a server node in the topology
type TopologyNode struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"` // "hub", "leaf", "services"
	Users    int    `json:"users"`
	Channels int    `json:"channels"`
	Uplink   string `json:"uplink,omitempty"`
	ULined   bool   `json:"ulined"`
	Info     string `json:"info,omitempty"`
	Online   bool   `json:"online"`
}

// TopologyLink represents a connection between two servers
type TopologyLink struct {
	Source string `json:"source"`
	Target string `json:"target"`
	Type   string `json:"type"` // "hub", "leaf", "services"
}

// TopologyResponse represents the entire network topology
type TopologyResponse struct {
	Nodes []TopologyNode `json:"nodes"`
	Links []TopologyLink `json:"links"`
	Stats TopologyStats  `json:"stats"`
}

// TopologyStats represents network-wide statistics
type TopologyStats struct {
	TotalServers  int `json:"total_servers"`
	TotalUsers    int `json:"total_users"`
	TotalChannels int `json:"total_channels"`
	TotalOpers    int `json:"total_opers"`
}

// GetNetworkTopology returns the network topology for visualization
func GetNetworkTopology(c *gin.Context) {
	manager := rpc.GetManager()

	// Get all servers
	serverResult, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Server().GetAll()
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get servers: " + err.Error()})
		return
	}

	// Get network stats
	statsResult, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Stats().Get(1)
	})

	var stats TopologyStats
	if err == nil && statsResult != nil {
		statsMap := utils.InterfaceToMap(statsResult)
		if statsMap != nil {
			if srv := utils.InterfaceToMap(statsMap["server"]); srv != nil {
				stats.TotalServers = utils.SafeMapGetInt(srv, "total")
			}
			if usr := utils.InterfaceToMap(statsMap["user"]); usr != nil {
				stats.TotalUsers = utils.SafeMapGetInt(usr, "total")
				stats.TotalOpers = utils.SafeMapGetInt(usr, "opers")
			}
			if ch := utils.InterfaceToMap(statsMap["channel"]); ch != nil {
				stats.TotalChannels = utils.SafeMapGetInt(ch, "total")
			}
		}
	}

	// Build topology - Initialize as empty slices (not nil) so JSON returns [] not null
	nodes := []TopologyNode{}
	links := []TopologyLink{}
	serverNames := make(map[string]bool)

	servers := utils.InterfaceToSlice(serverResult)
	for _, srv := range servers {
		srvMap := utils.InterfaceToMap(srv)
		if srvMap == nil {
			continue
		}

		// Debug: log raw server data to see what fields are available
		log.Printf("[Topology] Server data: %+v", srvMap)

		name := utils.SafeMapGetString(srvMap, "name")
		uplink := utils.SafeMapGetString(srvMap, "uplink")

		// Also try "server" nested object for uplink
		if uplink == "" {
			if serverInfo := utils.InterfaceToMap(srvMap["server"]); serverInfo != nil {
				uplink = utils.SafeMapGetString(serverInfo, "uplink")
			}
		}

		log.Printf("[Topology] Server %s has uplink: '%s'", name, uplink)
		ulined := false
		if u, ok := srvMap["ulined"].(bool); ok {
			ulined = u
		}

		serverNames[name] = true

		// Determine node type
		nodeType := "leaf"
		if ulined {
			nodeType = "services"
		} else if uplink == "" {
			nodeType = "hub"
		}

		// Count users per server
		users := utils.SafeMapGetInt(srvMap, "num_users")

		node := TopologyNode{
			ID:     name,
			Name:   name,
			Type:   nodeType,
			Users:  users,
			Uplink: uplink,
			ULined: ulined,
			Info:   utils.SafeMapGetString(srvMap, "server_info"),
			Online: true,
		}
		nodes = append(nodes, node)

		// Create link to uplink if exists
		if uplink != "" {
			link := TopologyLink{
				Source: uplink,
				Target: name,
				Type:   nodeType,
			}
			links = append(links, link)
			log.Printf("[Topology] Created link: %s -> %s", uplink, name)
		}
	}

	log.Printf("[Topology] Total nodes: %d, Total links: %d", len(nodes), len(links))

	response := TopologyResponse{
		Nodes: nodes,
		Links: links,
		Stats: stats,
	}

	c.JSON(http.StatusOK, response)
}

// GetServerDetails returns detailed info about a specific server
func GetServerDetails(c *gin.Context) {
	serverName := c.Param("name")
	if serverName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Server name is required"})
		return
	}

	manager := rpc.GetManager()

	// Get server info
	result, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		srvName := serverName
		return client.Server().Get(&srvName)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get server: " + err.Error()})
		return
	}

	if result == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	srvMap := utils.InterfaceToMap(result)
	if srvMap == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid server data"})
		return
	}

	// Get modules for this server
	modulesResult, _ := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Query("server.module_list", map[string]interface{}{
			"server": serverName,
		}, false)
	})

	modules := []string{}
	if modulesResult != nil {
		if moduleList := utils.InterfaceToSlice(modulesResult); moduleList != nil {
			for _, m := range moduleList {
				if mMap := utils.InterfaceToMap(m); mMap != nil {
					if name := utils.SafeMapGetString(mMap, "name"); name != "" {
						modules = append(modules, name)
					}
				}
			}
		}
	}

	ulined := false
	if u, ok := srvMap["ulined"].(bool); ok {
		ulined = u
	}

	details := map[string]interface{}{
		"name":         utils.SafeMapGetString(srvMap, "name"),
		"uplink":       utils.SafeMapGetString(srvMap, "uplink"),
		"num_users":    utils.SafeMapGetInt(srvMap, "num_users"),
		"server_info":  utils.SafeMapGetString(srvMap, "server_info"),
		"boot":         srvMap["boot"],
		"synced_since": srvMap["synced_since"],
		"ulined":       ulined,
		"modules":      modules,
		"features":     srvMap["features"],
	}

	c.JSON(http.StatusOK, details)
}
