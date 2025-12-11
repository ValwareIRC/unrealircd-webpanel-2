package rpc

import (
	"fmt"
	"log"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	unrealircd "github.com/ObsidianIRC/unrealircd-rpc-golang"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/config"
)

// Client wraps the UnrealIRCd RPC connection
type Client struct {
	conn        *unrealircd.Connection
	serverName  string
	issuer      string
	mu          sync.RWMutex
	lastError   time.Time
	errorCount  int32
	lastSuccess time.Time
}

// Manager manages RPC connections to UnrealIRCd servers
type Manager struct {
	clients map[string]*Client
	active  string
	mu      sync.RWMutex
}

var (
	manager     *Manager
	managerOnce sync.Once
)

// GetManager returns the singleton RPC manager
func GetManager() *Manager {
	managerOnce.Do(func() {
		manager = &Manager{
			clients: make(map[string]*Client),
		}
	})
	return manager
}

// Connect connects to an RPC server
func (m *Manager) Connect(server *config.RPCServer, issuer string) (*Client, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Check if already connected
	if client, exists := m.clients[server.Name]; exists {
		return client, nil
	}

	uri := fmt.Sprintf("wss://%s:%d", server.Host, server.Port)
	apiLogin := fmt.Sprintf("%s:%s", server.User, server.Password)

	options := &unrealircd.Options{
		TLSVerify: server.TLSVerifyCert,
		Issuer:    issuer,
	}

	conn, err := unrealircd.NewConnection(uri, apiLogin, options)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to %s: %w", server.Name, err)
	}

	client := &Client{
		conn:       conn,
		serverName: server.Name,
		issuer:     issuer,
	}

	m.clients[server.Name] = client

	// Set as active if it's the default or there's no active connection
	if server.IsDefault || m.active == "" {
		m.active = server.Name
	}

	return client, nil
}

// Disconnect disconnects from an RPC server
func (m *Manager) Disconnect(serverName string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	client, exists := m.clients[serverName]
	if !exists {
		return fmt.Errorf("not connected to %s", serverName)
	}

	// The library doesn't expose a close method, so we just remove from map
	_ = client
	delete(m.clients, serverName)

	if m.active == serverName {
		m.active = ""
		// Set another client as active if available
		for name := range m.clients {
			m.active = name
			break
		}
	}

	return nil
}

// GetActive returns the active RPC client, reconnecting if necessary
func (m *Manager) GetActive() (*Client, error) {
	m.mu.RLock()
	activeName := m.active
	m.mu.RUnlock()

	if activeName == "" {
		return nil, fmt.Errorf("no active RPC connection")
	}

	m.mu.RLock()
	client, exists := m.clients[activeName]
	m.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("active client not found")
	}

	return client, nil
}

// reconnect attempts to reconnect to a server
func (m *Manager) reconnect(serverName string) error {
	cfg := config.Get()

	// Find the server config
	var serverConfig *config.RPCServer
	for i := range cfg.RPC {
		if cfg.RPC[i].Name == serverName {
			serverConfig = &cfg.RPC[i]
			break
		}
	}

	if serverConfig == nil {
		return fmt.Errorf("server %s not found in config", serverName)
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	// Get the old client's issuer
	oldClient, exists := m.clients[serverName]
	issuer := "webpanel"
	if exists && oldClient != nil {
		issuer = oldClient.issuer
	}

	// Remove old client
	delete(m.clients, serverName)

	// Create new connection
	uri := fmt.Sprintf("wss://%s:%d", serverConfig.Host, serverConfig.Port)
	apiLogin := fmt.Sprintf("%s:%s", serverConfig.User, serverConfig.Password)

	options := &unrealircd.Options{
		TLSVerify: serverConfig.TLSVerifyCert,
		Issuer:    issuer,
	}

	conn, err := unrealircd.NewConnection(uri, apiLogin, options)
	if err != nil {
		return fmt.Errorf("failed to reconnect to %s: %w", serverName, err)
	}

	client := &Client{
		conn:       conn,
		serverName: serverName,
		issuer:     issuer,
	}

	m.clients[serverName] = client
	log.Printf("Successfully reconnected to %s", serverName)

	return nil
}

// GetActiveWithReconnect returns the active client, attempting to reconnect if needed
// This should be called when a connection error is detected
func (m *Manager) GetActiveWithReconnect() (*Client, error) {
	m.mu.RLock()
	activeName := m.active
	m.mu.RUnlock()

	if activeName == "" {
		return nil, fmt.Errorf("no active RPC connection")
	}

	// Try to reconnect
	if err := m.reconnect(activeName); err != nil {
		return nil, fmt.Errorf("reconnect failed: %w", err)
	}

	m.mu.RLock()
	client := m.clients[activeName]
	m.mu.RUnlock()

	return client, nil
}

// SetActive sets the active RPC server
func (m *Manager) SetActive(serverName string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.clients[serverName]; !exists {
		return fmt.Errorf("not connected to %s", serverName)
	}

	m.active = serverName
	return nil
}

// GetClient returns a specific RPC client
func (m *Manager) GetClient(serverName string) (*Client, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	client, exists := m.clients[serverName]
	return client, exists
}

// ListConnections returns all connected server names
func (m *Manager) ListConnections() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var names []string
	for name := range m.clients {
		names = append(names, name)
	}
	return names
}

// NewDedicatedClient creates a new dedicated client for streaming purposes
// This creates a separate WebSocket connection that won't interfere with
// the main connection used for regular API calls
func (m *Manager) NewDedicatedClient() (*Client, error) {
	m.mu.RLock()
	activeName := m.active
	m.mu.RUnlock()

	if activeName == "" {
		return nil, fmt.Errorf("no active RPC connection")
	}

	cfg := config.Get()

	// Find the server config
	var serverConfig *config.RPCServer
	for i := range cfg.RPC {
		if cfg.RPC[i].Name == activeName {
			serverConfig = &cfg.RPC[i]
			break
		}
	}

	if serverConfig == nil {
		return nil, fmt.Errorf("server %s not found in config", activeName)
	}

	// Create new connection
	// Don't set issuer for streaming connections - the async set_issuer response
	// can interfere with EventLoop reading log events
	uri := fmt.Sprintf("wss://%s:%d", serverConfig.Host, serverConfig.Port)
	apiLogin := fmt.Sprintf("%s:%s", serverConfig.User, serverConfig.Password)

	options := &unrealircd.Options{
		TLSVerify: serverConfig.TLSVerifyCert,
		// Note: Intentionally NOT setting Issuer to avoid async response interference
	}

	conn, err := unrealircd.NewConnection(uri, apiLogin, options)
	if err != nil {
		return nil, fmt.Errorf("failed to create dedicated connection to %s: %w", activeName, err)
	}

	client := &Client{
		conn:       conn,
		serverName: activeName,
		issuer:     "webpanel-streaming",
	}

	log.Printf("Created dedicated streaming connection to %s", activeName)

	return client, nil
}

// TestConnection tests a connection to an RPC server without storing it
func TestConnection(server *config.RPCServer) error {
	uri := fmt.Sprintf("wss://%s:%d", server.Host, server.Port)
	apiLogin := fmt.Sprintf("%s:%s", server.User, server.Password)

	options := &unrealircd.Options{
		TLSVerify: server.TLSVerifyCert,
	}

	conn, err := unrealircd.NewConnection(uri, apiLogin, options)
	if err != nil {
		return err
	}

	// Try to get RPC info to verify connection
	_, err = conn.Rpc().Info()
	return err
}

// Client methods - wrappers around unrealircd-rpc-golang

// Connection returns the underlying connection
func (c *Client) Connection() *unrealircd.Connection {
	return c.conn
}

// User returns the user handler
func (c *Client) User() *unrealircd.User {
	return c.conn.User()
}

// Channel returns the channel handler
func (c *Client) Channel() *unrealircd.Channel {
	return c.conn.Channel()
}

// Server returns the server handler
func (c *Client) Server() *unrealircd.Server {
	return c.conn.Server()
}

// ServerBan returns the server ban handler
func (c *Client) ServerBan() *unrealircd.ServerBan {
	return c.conn.ServerBan()
}

// Spamfilter returns the spamfilter handler
func (c *Client) Spamfilter() *unrealircd.Spamfilter {
	return c.conn.Spamfilter()
}

// NameBan returns the name ban handler
func (c *Client) NameBan() *unrealircd.NameBan {
	return c.conn.NameBan()
}

// ServerBanException returns the server ban exception handler
func (c *Client) ServerBanException() *unrealircd.ServerBanException {
	return c.conn.ServerBanException()
}

// Log returns the log handler
func (c *Client) Log() *unrealircd.Log {
	return c.conn.Log()
}

// Stats returns the stats handler
func (c *Client) Stats() *unrealircd.Stats {
	return c.conn.Stats()
}

// Rpc returns the RPC meta handler
func (c *Client) Rpc() *unrealircd.Rpc {
	return c.conn.Rpc()
}

// Query sends a raw RPC query
func (c *Client) Query(method string, params interface{}, noWait bool) (interface{}, error) {
	return c.conn.Query(method, params, noWait)
}

// EventLoop waits for the next event (used for log streaming)
func (c *Client) EventLoop() (interface{}, error) {
	return c.conn.EventLoop()
}

// Close closes the underlying connection
func (c *Client) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.conn != nil {
		err := c.conn.Close()
		c.conn = nil
		return err
	}
	return nil
}

// ServerName returns the server name
func (c *Client) ServerName() string {
	return c.serverName
}

// isConnectionError checks if an error indicates a broken connection
func isConnectionError(err error) bool {
	if err == nil {
		return false
	}
	errStr := strings.ToLower(err.Error())
	// Check for common connection errors
	return strings.Contains(errStr, "websocket") ||
		strings.Contains(errStr, "connection") ||
		strings.Contains(errStr, "eof") ||
		strings.Contains(errStr, "broken pipe") ||
		strings.Contains(errStr, "reset by peer") ||
		strings.Contains(errStr, "use of closed") ||
		strings.Contains(errStr, "timed out") ||
		strings.Contains(errStr, "timeout") ||
		strings.Contains(errStr, "deadline") ||
		strings.Contains(errStr, "i/o timeout") ||
		strings.Contains(errStr, "network") ||
		strings.Contains(errStr, "refused") ||
		strings.Contains(errStr, "unreachable") ||
		strings.Contains(errStr, "no route") ||
		strings.Contains(errStr, "closed") ||
		strings.Contains(errStr, "write:") ||
		strings.Contains(errStr, "read:") ||
		strings.Contains(errStr, "dial") ||
		strings.Contains(errStr, "socket") ||
		strings.Contains(errStr, "rpc") ||
		strings.Contains(errStr, "json") // JSON errors often indicate malformed responses from broken connections
}

// recordError records an error for the client and returns true if reconnection is recommended
func (c *Client) recordError() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.lastError = time.Now()
	atomic.AddInt32(&c.errorCount, 1)
	// If we've had multiple errors in quick succession, recommend reconnection
	return atomic.LoadInt32(&c.errorCount) >= 2
}

// recordSuccess resets error tracking on successful operation
func (c *Client) recordSuccess() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.lastSuccess = time.Now()
	atomic.StoreInt32(&c.errorCount, 0)
}

// needsReconnect checks if the client should proactively reconnect
func (c *Client) needsReconnect() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	// Reconnect if we've had errors recently and no successful calls
	if atomic.LoadInt32(&c.errorCount) >= 2 {
		return true
	}
	// Reconnect if last error was recent and no success since
	if !c.lastError.IsZero() && c.lastSuccess.Before(c.lastError) {
		return time.Since(c.lastError) < 30*time.Second
	}
	return false
}

// WithRetry executes an RPC function with automatic reconnection on connection errors
func (m *Manager) WithRetry(fn func(*Client) (interface{}, error)) (interface{}, error) {
	client, err := m.GetActive()
	if err != nil {
		// No active connection, try to reconnect
		log.Printf("No active RPC connection, attempting to reconnect...")
		client, err = m.GetActiveWithReconnect()
		if err != nil {
			return nil, err
		}
	}

	// Check if the client needs a proactive reconnect based on recent errors
	if client.needsReconnect() {
		log.Printf("Proactively reconnecting due to recent errors...")
		newClient, reconnErr := m.GetActiveWithReconnect()
		if reconnErr == nil {
			client = newClient
		}
	}

	result, err := fn(client)
	if err != nil {
		shouldReconnect := client.recordError()

		if isConnectionError(err) || shouldReconnect {
			log.Printf("RPC connection error detected: %v, attempting reconnect...", err)
			// Try to reconnect and retry once
			newClient, reconnErr := m.GetActiveWithReconnect()
			if reconnErr != nil {
				return nil, fmt.Errorf("connection lost: %v (reconnect failed: %v)", err, reconnErr)
			}
			// Retry the operation
			result, err = fn(newClient)
			if err == nil {
				newClient.recordSuccess()
			}
			return result, err
		}
	} else {
		client.recordSuccess()
	}

	return result, err
}
