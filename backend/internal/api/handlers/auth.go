package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/middleware"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/auth"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/config"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/services/audit"
)

// LoginRequest represents a login request
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse represents a login response
type LoginResponse struct {
	Token           string           `json:"token,omitempty"`
	ExpiresAt       time.Time        `json:"expires_at,omitempty"`
	User            FullUserResponse `json:"user,omitempty"`
	PasswordWarning string           `json:"password_warning,omitempty"`
	Requires2FA     bool             `json:"requires_2fa,omitempty"`
}

// UserResponse represents a user in API responses (simple version)
type UserResponse struct {
	ID        uint   `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Role      string `json:"role"`
	RoleID    uint   `json:"role_id"`
}

// RoleResponse represents a role in API responses
type RoleResponse struct {
	ID           uint                 `json:"id"`
	Name         string               `json:"name"`
	Description  string               `json:"description"`
	IsSuperAdmin bool                 `json:"is_super_admin"`
	Permissions  []PermissionResponse `json:"permissions"`
}

// PermissionResponse represents a permission in API responses
type PermissionResponse struct {
	Name string `json:"name"`
}

// FullUserResponse represents a user with full role details
type FullUserResponse struct {
	ID        uint          `json:"id"`
	Username  string        `json:"username"`
	Email     string        `json:"email"`
	FirstName string        `json:"first_name"`
	LastName  string        `json:"last_name"`
	RoleID    uint          `json:"role_id"`
	Role      *RoleResponse `json:"role"`
}

// buildRoleResponse creates a RoleResponse from a models.Role
func buildRoleResponse(role *models.Role) *RoleResponse {
	if role == nil {
		return nil
	}
	permissions := make([]PermissionResponse, len(role.Permissions))
	for i, p := range role.Permissions {
		permissions[i] = PermissionResponse{Name: p.Permission}
	}
	return &RoleResponse{
		ID:           role.ID,
		Name:         role.Name,
		Description:  role.Description,
		IsSuperAdmin: role.IsSuperAdmin,
		Permissions:  permissions,
	}
}

// buildFullUserResponse creates a FullUserResponse from a models.User
func buildFullUserResponse(user *models.User) FullUserResponse {
	return FullUserResponse{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		RoleID:    user.RoleID,
		Role:      buildRoleResponse(user.Role),
	}
}

// Login handles user login
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ip := middleware.GetClientIP(c)
	userAgent := c.GetHeader("User-Agent")

	cfg := config.Get()
	db := database.Get()

	// Find user and check password (without creating token yet)
	var user models.User
	if err := db.Preload("Role.Permissions").Where("username = ?", req.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	if !auth.VerifyPassword(req.Password, user.Password, cfg.Auth.PasswordPepper) {
		// Record failed attempt
		auth.RecordFailedAttempt(req.Username, ip)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	// Check if 2FA is enabled
	if user.TwoFactorEnabled {
		// Don't create token yet - require 2FA verification
		c.JSON(http.StatusOK, LoginResponse{
			Requires2FA: true,
		})
		return
	}

	// No 2FA - generate token directly
	token, err := auth.GenerateTokenForUser(&user, ip, userAgent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	// Log login to IRC server
	audit.LogLogin(user.Username, ip)

	expiry := time.Duration(cfg.Auth.SessionTimeout) * time.Second
	if expiry == 0 {
		expiry = time.Hour
	}

	response := LoginResponse{
		Token:     token,
		ExpiresAt: time.Now().Add(expiry),
		User:      buildFullUserResponse(&user),
	}

	// Check password against HIBP if enabled
	if IsHIBPEnabled() {
		breached, count, err := auth.CheckPasswordBreach(req.Password)
		if err == nil && breached {
			response.PasswordWarning = formatBreachWarning(count)
		}
	}

	c.JSON(http.StatusOK, response)
}

// formatBreachWarning formats a breach warning message
func formatBreachWarning(count int) string {
	if count == 1 {
		return "Your password has been found in a data breach. We recommend changing it."
	}
	return "Your password has been found in " + formatNumber(count) + " data breaches. We strongly recommend changing it immediately."
}

// formatNumber formats a number with commas
func formatNumber(n int) string {
	if n < 1000 {
		return strconv.Itoa(n)
	}
	s := strconv.Itoa(n)
	result := ""
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			result += ","
		}
		result += string(c)
	}
	return result
}

// Logout handles user logout
func Logout(c *gin.Context) {
	// In a JWT-based system, logout is typically handled client-side
	// by deleting the token. We can optionally invalidate sessions server-side.
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// GetSession returns the current session status
func GetSession(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusOK, gin.H{"session": "none"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"session": "active",
		"user":    buildFullUserResponse(user),
	})
}

// GetCurrentUser returns the current authenticated user
func GetCurrentUser(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	c.JSON(http.StatusOK, buildFullUserResponse(user))
}

// GetCurrentUserPermissions returns the current user's permissions
func GetCurrentUserPermissions(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Super admin has all permissions
	if user.Role != nil && user.Role.IsSuperAdmin {
		allPerms := make([]string, 0, len(models.AllPermissions))
		for _, p := range models.AllPermissions {
			allPerms = append(allPerms, p.Key)
		}
		c.JSON(http.StatusOK, gin.H{
			"is_super_admin": true,
			"permissions":    allPerms,
		})
		return
	}

	perms := make([]string, 0)
	if user.Role != nil {
		for _, p := range user.Role.Permissions {
			perms = append(perms, p.Permission)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"is_super_admin": false,
		"permissions":    perms,
	})
}

// ChangePasswordRequest represents a password change request
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}

// ChangePassword changes the current user's password
func ChangePassword(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	cfg := config.Get()
	db := database.Get()

	// Verify current password
	var dbUser models.User
	if err := db.First(&dbUser, user.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find user"})
		return
	}

	if !auth.VerifyPassword(req.CurrentPassword, dbUser.Password, cfg.Auth.PasswordPepper) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Current password is incorrect"})
		return
	}

	// Hash new password
	hashedPassword, err := auth.HashPassword(req.NewPassword, cfg.Auth.PasswordPepper)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Update password
	if err := db.Model(&dbUser).Update("password", hashedPassword).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	// Create audit log
	db.Create(&models.AuditLog{
		UserID:    user.ID,
		Username:  user.Username,
		Action:    "password_change",
		Details:   "User changed their password",
		IPAddress: middleware.GetClientIP(c),
	})

	// Check new password against HIBP if enabled
	response := gin.H{"message": "Password changed successfully"}
	if IsHIBPEnabled() {
		breached, count, err := auth.CheckPasswordBreach(req.NewPassword)
		if err == nil && breached {
			response["password_warning"] = formatBreachWarning(count)
		}
	}

	c.JSON(http.StatusOK, response)
}

// UpdateProfileRequest represents a profile update request
type UpdateProfileRequest struct {
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Bio       string `json:"bio"`
}

// UpdateProfile updates the current user's profile
func UpdateProfile(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	db := database.Get()

	updates := map[string]interface{}{}
	if req.Email != "" {
		updates["email"] = req.Email
	}
	if req.FirstName != "" {
		updates["first_name"] = req.FirstName
	}
	if req.LastName != "" {
		updates["last_name"] = req.LastName
	}
	if req.Bio != "" {
		updates["bio"] = req.Bio
	}

	if len(updates) > 0 {
		if err := db.Model(&models.User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully"})
}
