package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/middleware"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/auth"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/config"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/rpc"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/services/audit"
)

// PanelUserResponse represents a panel user in API responses
type PanelUserResponse struct {
	ID        uint   `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Role      string `json:"role"`
	RoleID    uint   `json:"role_id"`
	Bio       string `json:"bio,omitempty"`
	CreatedAt string `json:"created_at"`
}

// GetPanelUsers returns all panel users
func GetPanelUsers(c *gin.Context) {
	db := database.Get()

	var users []models.User
	if err := db.Preload("Role").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get users"})
		return
	}

	response := make([]PanelUserResponse, len(users))
	for i, user := range users {
		roleName := ""
		if user.Role != nil {
			roleName = user.Role.Name
		}
		response[i] = PanelUserResponse{
			ID:        user.ID,
			Username:  user.Username,
			Email:     user.Email,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			Role:      roleName,
			RoleID:    user.RoleID,
			Bio:       user.Bio,
			CreatedAt: user.CreatedAt.Format("2006-01-02 15:04:05"),
		}
	}

	c.JSON(http.StatusOK, response)
}

// GetPanelUser returns a specific panel user
func GetPanelUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	db := database.Get()

	var user models.User
	if err := db.Preload("Role").First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	roleName := ""
	if user.Role != nil {
		roleName = user.Role.Name
	}

	c.JSON(http.StatusOK, PanelUserResponse{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Role:      roleName,
		RoleID:    user.RoleID,
		Bio:       user.Bio,
		CreatedAt: user.CreatedAt.Format("2006-01-02 15:04:05"),
	})
}

// CreatePanelUserRequest represents a create user request
type CreatePanelUserRequest struct {
	Username  string `json:"username" binding:"required"`
	Password  string `json:"password" binding:"required,min=8"`
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	RoleID    uint   `json:"role_id" binding:"required"`
}

// CreatePanelUser creates a new panel user
func CreatePanelUser(c *gin.Context) {
	var req CreatePanelUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := auth.CreateUser(req.Username, req.Email, req.Password, req.FirstName, req.LastName, req.RoleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user: " + err.Error()})
		return
	}

	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		logAction(c, currentUser, "create_panel_user", map[string]string{
			"username": req.Username,
		})
		// Log to IRC server
		audit.LogUserCreate(currentUser.Username, req.Username)
	}

	roleName := ""
	if user.Role != nil {
		roleName = user.Role.Name
	}

	c.JSON(http.StatusCreated, PanelUserResponse{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Role:      roleName,
		RoleID:    user.RoleID,
		CreatedAt: user.CreatedAt.Format("2006-01-02 15:04:05"),
	})
}

// UpdatePanelUserRequest represents an update user request
type UpdatePanelUserRequest struct {
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	RoleID    uint   `json:"role_id"`
	Password  string `json:"password"`
	Bio       string `json:"bio"`
}

// UpdatePanelUser updates a panel user
func UpdatePanelUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req UpdatePanelUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	db := database.Get()
	cfg := config.Get()

	var user models.User
	if err := db.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	updates := map[string]interface{}{}
	passwordChanged := false
	var newPassword string
	if req.Email != "" {
		updates["email"] = req.Email
	}
	if req.FirstName != "" {
		updates["first_name"] = req.FirstName
	}
	if req.LastName != "" {
		updates["last_name"] = req.LastName
	}
	if req.RoleID > 0 {
		updates["role_id"] = req.RoleID
	}
	if req.Bio != "" {
		updates["bio"] = req.Bio
	}
	if req.Password != "" {
		hashedPassword, err := auth.HashPassword(req.Password, cfg.Auth.PasswordPepper)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}
		updates["password"] = hashedPassword
		passwordChanged = true
		newPassword = req.Password
	}

	if len(updates) > 0 {
		if err := db.Model(&user).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
			return
		}
	}

	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		logAction(c, currentUser, "update_panel_user", map[string]string{
			"user_id":  idStr,
			"username": user.Username,
		})
	}

	// Check new password against HIBP if password was changed and HIBP is enabled
	response := gin.H{"message": "User updated successfully"}
	if passwordChanged && IsHIBPEnabled() {
		breached, count, err := auth.CheckPasswordBreach(newPassword)
		if err == nil && breached {
			response["password_warning"] = formatBreachWarning(count)
		}
	}

	c.JSON(http.StatusOK, response)
}

// DeletePanelUser deletes a panel user
func DeletePanelUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Don't allow deleting yourself
	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil && currentUser.ID == uint(id) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete your own account"})
		return
	}

	db := database.Get()

	var user models.User
	if err := db.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Delete user metadata first
	db.Where("user_id = ?", id).Delete(&models.UserMeta{})

	// Delete the user
	if err := db.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	if currentUser != nil {
		logAction(c, currentUser, "delete_panel_user", map[string]string{
			"user_id":  idStr,
			"username": user.Username,
		})
		// Log to IRC server
		audit.LogUserDelete(currentUser.Username, user.Username)
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

// GetRoles returns all roles
func GetRoles(c *gin.Context) {
	db := database.Get()

	var roles []models.Role
	if err := db.Preload("Permissions").Find(&roles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get roles"})
		return
	}

	c.JSON(http.StatusOK, roles)
}

// GetRole returns a specific role
func GetRole(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	db := database.Get()

	var role models.Role
	if err := db.Preload("Permissions").First(&role, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
		return
	}

	c.JSON(http.StatusOK, role)
}

// CreateRoleRequest represents a create role request
type CreateRoleRequest struct {
	Name         string   `json:"name" binding:"required"`
	Description  string   `json:"description"`
	Permissions  []string `json:"permissions"`
	IsSuperAdmin bool     `json:"is_super_admin"`
}

// CreateRole creates a new role
func CreateRole(c *gin.Context) {
	var req CreateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	db := database.Get()

	role := models.Role{
		Name:         req.Name,
		Description:  req.Description,
		IsSuperAdmin: req.IsSuperAdmin,
	}

	if err := db.Create(&role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create role"})
		return
	}

	// Add permissions
	for _, perm := range req.Permissions {
		db.Create(&models.RolePermission{
			RoleID:     role.ID,
			Permission: perm,
		})
	}

	// Reload with permissions
	db.Preload("Permissions").First(&role, role.ID)

	// Log to IRC server
	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		audit.LogRoleCreate(currentUser.Username, role.Name)
	}

	c.JSON(http.StatusCreated, role)
}

// UpdateRoleRequest represents an update role request
type UpdateRoleRequest struct {
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Permissions  []string `json:"permissions"`
	IsSuperAdmin bool     `json:"is_super_admin"`
}

// UpdateRole updates a role
func UpdateRole(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	var req UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	db := database.Get()

	var role models.Role
	if err := db.First(&role, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
		return
	}

	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	updates["is_super_admin"] = req.IsSuperAdmin

	if len(updates) > 0 {
		if err := db.Model(&role).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update role"})
			return
		}
	}

	// Update permissions if provided
	if req.Permissions != nil {
		// Delete existing permissions
		db.Where("role_id = ?", role.ID).Delete(&models.RolePermission{})

		// Add new permissions
		for _, perm := range req.Permissions {
			db.Create(&models.RolePermission{
				RoleID:     role.ID,
				Permission: perm,
			})
		}
	}

	// Reload with permissions
	db.Preload("Permissions").First(&role, role.ID)

	// Log to IRC server
	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		audit.LogRoleUpdate(currentUser.Username, role.Name)
	}

	c.JSON(http.StatusOK, role)
}

// DeleteRole deletes a role
func DeleteRole(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	db := database.Get()

	var role models.Role
	if err := db.First(&role, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
		return
	}

	// Check if any users are using this role
	var count int64
	db.Model(&models.User{}).Where("role_id = ?", id).Count(&count)
	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete role that is in use"})
		return
	}

	// Delete permissions first
	db.Where("role_id = ?", id).Delete(&models.RolePermission{})

	// Delete the role
	if err := db.Delete(&role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete role"})
		return
	}

	// Log to IRC server
	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		audit.LogRoleDelete(currentUser.Username, role.Name)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role deleted successfully"})
}

// GetPermissions returns all available permissions
func GetPermissions(c *gin.Context) {
	c.JSON(http.StatusOK, models.AllPermissions)
}

// GetPermissionsByCategory returns permissions grouped by category
func GetPermissionsByCategory(c *gin.Context) {
	c.JSON(http.StatusOK, models.GetPermissionsByCategory())
}

// GetRPCServers returns all configured RPC servers
func GetRPCServers(c *gin.Context) {
	cfg := config.Get()
	manager := rpc.GetManager()

	// Get active server name
	activeClient, _ := manager.GetActive()
	activeName := ""
	if activeClient != nil {
		activeName = activeClient.ServerName()
	}

	// Return servers without passwords
	servers := make([]map[string]interface{}, len(cfg.RPC))
	for i, server := range cfg.RPC {
		_, connected := manager.GetClient(server.Name)
		servers[i] = map[string]interface{}{
			"name":            server.Name,
			"host":            server.Host,
			"port":            server.Port,
			"rpc_user":        server.User,
			"tls_verify_cert": server.TLSVerifyCert,
			"is_default":      server.IsDefault,
			"connected":       connected,
			"is_active":       server.Name == activeName,
		}
	}

	c.JSON(http.StatusOK, servers)
}

// AddRPCServerRequest represents an add RPC server request
type AddRPCServerRequest struct {
	Name          string `json:"name" binding:"required"`
	Host          string `json:"host" binding:"required"`
	Port          int    `json:"port" binding:"required"`
	User          string `json:"rpc_user" binding:"required"`
	Password      string `json:"rpc_password" binding:"required"`
	TLSVerifyCert bool   `json:"tls_verify_cert"`
	IsDefault     bool   `json:"is_default"`
}

// AddRPCServer adds an RPC server configuration
func AddRPCServer(c *gin.Context) {
	var req AddRPCServerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	cfg := config.Get()

	// Check if name already exists
	for _, server := range cfg.RPC {
		if server.Name == req.Name {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Server with this name already exists"})
			return
		}
	}

	// If this is the default, unset other defaults
	if req.IsDefault {
		for i := range cfg.RPC {
			cfg.RPC[i].IsDefault = false
		}
	}

	server := config.RPCServer{
		Name:          req.Name,
		Host:          req.Host,
		Port:          req.Port,
		User:          req.User,
		Password:      req.Password, // Should be encrypted before saving
		TLSVerifyCert: req.TLSVerifyCert,
		IsDefault:     req.IsDefault,
	}

	cfg.RPC = append(cfg.RPC, server)

	// Save configuration
	if err := config.Save("config.json"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save configuration"})
		return
	}

	// Try to connect to the server
	manager := rpc.GetManager()
	_, err := manager.Connect(&server, "webpanel")
	if err != nil {
		// Log but don't fail - the server is saved, just not connected
		c.JSON(http.StatusCreated, gin.H{
			"message":   "RPC server added but connection failed: " + err.Error(),
			"connected": false,
		})
		return
	}

	// Log to IRC server
	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		audit.LogRPCServerAdd(currentUser.Username, req.Name)
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":   "RPC server added and connected successfully",
		"connected": true,
	})
}

// TestRPCServerRequest represents a test RPC connection request
type TestRPCServerRequest struct {
	Host          string `json:"host" binding:"required"`
	Port          int    `json:"port" binding:"required"`
	User          string `json:"rpc_user" binding:"required"`
	Password      string `json:"rpc_password" binding:"required"`
	TLSVerifyCert bool   `json:"tls_verify_cert"`
}

// TestRPCServer tests an RPC connection
func TestRPCServer(c *gin.Context) {
	var req TestRPCServerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	server := &config.RPCServer{
		Host:          req.Host,
		Port:          req.Port,
		User:          req.User,
		Password:      req.Password,
		TLSVerifyCert: req.TLSVerifyCert,
	}

	err := rpc.TestConnection(server)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Connection failed: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Connection successful"})
}

// SetActiveRPCServer sets the active RPC server
func SetActiveRPCServer(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Server name is required"})
		return
	}

	// Find the server in config
	cfg := config.Get()
	var serverConfig *config.RPCServer
	for i := range cfg.RPC {
		if cfg.RPC[i].Name == name {
			serverConfig = &cfg.RPC[i]
			break
		}
	}

	if serverConfig == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found in configuration"})
		return
	}

	manager := rpc.GetManager()

	// Check if already connected
	_, connected := manager.GetClient(name)
	if !connected {
		// Try to connect
		_, err := manager.Connect(serverConfig, "webpanel")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to connect: " + err.Error()})
			return
		}
	}

	// Now set as active
	if err := manager.SetActive(name); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Active server changed"})
}

// UpdateRPCServerRequest represents an update RPC server request
type UpdateRPCServerRequest struct {
	Host          string `json:"host"`
	Port          int    `json:"port"`
	User          string `json:"rpc_user"`
	Password      string `json:"rpc_password"`
	TLSVerifyCert *bool  `json:"tls_verify_cert"`
	IsDefault     *bool  `json:"is_default"`
}

// UpdateRPCServer updates an RPC server configuration
func UpdateRPCServer(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Server name is required"})
		return
	}

	var req UpdateRPCServerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	cfg := config.Get()

	// Find the server
	serverIndex := -1
	for i := range cfg.RPC {
		if cfg.RPC[i].Name == name {
			serverIndex = i
			break
		}
	}

	if serverIndex == -1 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	// Update fields
	if req.Host != "" {
		cfg.RPC[serverIndex].Host = req.Host
	}
	if req.Port > 0 {
		cfg.RPC[serverIndex].Port = req.Port
	}
	if req.User != "" {
		cfg.RPC[serverIndex].User = req.User
	}
	if req.Password != "" {
		cfg.RPC[serverIndex].Password = req.Password
	}
	if req.TLSVerifyCert != nil {
		cfg.RPC[serverIndex].TLSVerifyCert = *req.TLSVerifyCert
	}
	if req.IsDefault != nil {
		// If setting as default, unset other defaults
		if *req.IsDefault {
			for i := range cfg.RPC {
				cfg.RPC[i].IsDefault = false
			}
		}
		cfg.RPC[serverIndex].IsDefault = *req.IsDefault
	}

	// Save configuration
	if err := config.Save("config.json"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save configuration"})
		return
	}

	// Reconnect to the server
	manager := rpc.GetManager()
	manager.Disconnect(name)
	_, err := manager.Connect(&cfg.RPC[serverIndex], "webpanel")
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"message":   "Server updated but reconnection failed: " + err.Error(),
			"connected": false,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Server updated successfully",
		"connected": true,
	})
}

// DeleteRPCServer deletes an RPC server configuration
func DeleteRPCServer(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Server name is required"})
		return
	}

	cfg := config.Get()

	// Find the server
	serverIndex := -1
	for i := range cfg.RPC {
		if cfg.RPC[i].Name == name {
			serverIndex = i
			break
		}
	}

	if serverIndex == -1 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	// Don't allow deleting the last server
	if len(cfg.RPC) == 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete the last server"})
		return
	}

	// Disconnect from the server first
	manager := rpc.GetManager()
	manager.Disconnect(name)

	// Remove from config
	cfg.RPC = append(cfg.RPC[:serverIndex], cfg.RPC[serverIndex+1:]...)

	// Ensure at least one server is default
	hasDefault := false
	for _, server := range cfg.RPC {
		if server.IsDefault {
			hasDefault = true
			break
		}
	}
	if !hasDefault && len(cfg.RPC) > 0 {
		cfg.RPC[0].IsDefault = true
	}

	// Save configuration
	if err := config.Save("config.json"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save configuration"})
		return
	}

	// Log to IRC server
	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		audit.LogRPCServerDelete(currentUser.Username, name)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Server deleted successfully"})
}

// Helper for logging actions
func logAction(c *gin.Context, user *models.User, action string, details map[string]string) {
	db := database.Get()

	detailsJSON, _ := json.Marshal(details)

	db.Create(&models.AuditLog{
		UserID:    user.ID,
		Username:  user.Username,
		Action:    action,
		Details:   string(detailsJSON),
		IPAddress: middleware.GetClientIP(c),
	})
}

// SystemSettingsResponse represents the system settings
type SystemSettingsResponse struct {
	HIBPEnabled bool `json:"hibp_enabled"`
	DebugMode   bool `json:"debug_mode"`
}

// GetSystemSettings returns the system settings
func GetSystemSettings(c *gin.Context) {
	db := database.Get()

	settings := SystemSettingsResponse{
		HIBPEnabled: true, // Default to enabled
		DebugMode:   false,
	}

	// Get HIBP setting
	var hibpSetting models.Setting
	if err := db.Where("key = ?", "hibp_enabled").First(&hibpSetting).Error; err == nil {
		settings.HIBPEnabled = hibpSetting.Value == "true"
	}

	// Get debug mode setting
	var debugSetting models.Setting
	if err := db.Where("key = ?", "debug_mode").First(&debugSetting).Error; err == nil {
		settings.DebugMode = debugSetting.Value == "true"
	}

	c.JSON(http.StatusOK, settings)
}

// UpdateSystemSettingsRequest represents an update settings request
type UpdateSystemSettingsRequest struct {
	HIBPEnabled *bool `json:"hibp_enabled"`
	DebugMode   *bool `json:"debug_mode"`
}

// UpdateSystemSettings updates the system settings
func UpdateSystemSettings(c *gin.Context) {
	var req UpdateSystemSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	db := database.Get()

	// Update HIBP setting if provided
	if req.HIBPEnabled != nil {
		value := "false"
		if *req.HIBPEnabled {
			value = "true"
		}
		db.Where("key = ?", "hibp_enabled").FirstOrCreate(&models.Setting{Key: "hibp_enabled"})
		db.Model(&models.Setting{}).Where("key = ?", "hibp_enabled").Update("value", value)
	}

	// Update debug mode setting if provided
	if req.DebugMode != nil {
		value := "false"
		if *req.DebugMode {
			value = "true"
		}
		db.Where("key = ?", "debug_mode").FirstOrCreate(&models.Setting{Key: "debug_mode"})
		db.Model(&models.Setting{}).Where("key = ?", "debug_mode").Update("value", value)
	}

	// Log the change
	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		logAction(c, currentUser, "update_system_settings", map[string]string{})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Settings updated successfully"})
}

// IsHIBPEnabled checks if HIBP password checking is enabled
func IsHIBPEnabled() bool {
	db := database.Get()
	var setting models.Setting
	if err := db.Where("key = ?", "hibp_enabled").First(&setting).Error; err != nil {
		return true // Default to enabled
	}
	return setting.Value == "true"
}
