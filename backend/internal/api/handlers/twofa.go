package handlers

import (
	"encoding/base64"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/skip2/go-qrcode"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/middleware"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/auth"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/config"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/services/audit"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/services/totp"
)

// TwoFactorSetupResponse represents the 2FA setup response
type TwoFactorSetupResponse struct {
	Secret      string   `json:"secret"`
	QRCode      string   `json:"qr_code"` // Base64-encoded PNG
	OTPAuthURL  string   `json:"otpauth_url"`
	BackupCodes []string `json:"backup_codes"`
}

// TwoFactorVerifyRequest represents a 2FA verification request
type TwoFactorVerifyRequest struct {
	Code string `json:"code" binding:"required"`
}

// TwoFactorLoginRequest represents a 2FA login verification request
type TwoFactorLoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	Code     string `json:"code" binding:"required"`
}

// Setup2FA initiates 2FA setup for the current user
func Setup2FA(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Generate a new TOTP secret
	key, err := totp.GenerateSecret(user.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate 2FA secret"})
		return
	}

	// Generate backup codes
	backupCodes, err := totp.GenerateBackupCodes()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate backup codes"})
		return
	}

	// Generate QR code
	qrPNG, err := qrcode.Encode(key.URL(), qrcode.Medium, 256)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate QR code"})
		return
	}
	qrBase64 := base64.StdEncoding.EncodeToString(qrPNG)

	// Store the secret temporarily in user metadata (not enabled yet)
	// The user must verify the code before we enable 2FA
	db := database.Get()

	// Store pending secret
	db.Where("user_id = ? AND key = ?", user.ID, "pending_2fa_secret").Delete(&models.UserMeta{})
	db.Create(&models.UserMeta{
		UserID: user.ID,
		Key:    "pending_2fa_secret",
		Value:  key.Secret(),
	})

	// Store pending backup codes
	backupJSON, _ := totp.SerializeBackupCodes(backupCodes)
	db.Where("user_id = ? AND key = ?", user.ID, "pending_2fa_backup").Delete(&models.UserMeta{})
	db.Create(&models.UserMeta{
		UserID: user.ID,
		Key:    "pending_2fa_backup",
		Value:  backupJSON,
	})

	c.JSON(http.StatusOK, TwoFactorSetupResponse{
		Secret:      key.Secret(),
		QRCode:      "data:image/png;base64," + qrBase64,
		OTPAuthURL:  key.URL(),
		BackupCodes: backupCodes,
	})
}

// Verify2FASetup verifies the 2FA setup and enables it
func Verify2FASetup(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	var req TwoFactorVerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	db := database.Get()

	// Get pending secret
	var pendingSecret models.UserMeta
	if err := db.Where("user_id = ? AND key = ?", user.ID, "pending_2fa_secret").First(&pendingSecret).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No pending 2FA setup found. Please start setup again."})
		return
	}

	// Verify the code
	if !totp.ValidateCodeWithWindow(pendingSecret.Value, req.Code) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid verification code"})
		return
	}

	// Get pending backup codes
	var pendingBackup models.UserMeta
	db.Where("user_id = ? AND key = ?", user.ID, "pending_2fa_backup").First(&pendingBackup)

	// Enable 2FA on the user account
	if err := db.Model(&models.User{}).Where("id = ?", user.ID).Updates(map[string]interface{}{
		"two_factor_enabled": true,
		"two_factor_secret":  pendingSecret.Value,
		"two_factor_backup":  pendingBackup.Value,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enable 2FA"})
		return
	}

	// Clean up pending data
	db.Where("user_id = ? AND key IN ?", user.ID, []string{"pending_2fa_secret", "pending_2fa_backup"}).Delete(&models.UserMeta{})

	// Audit log
	db.Create(&models.AuditLog{
		UserID:    user.ID,
		Username:  user.Username,
		Action:    "2fa_enabled",
		Details:   "Two-factor authentication enabled",
		IPAddress: middleware.GetClientIP(c),
	})

	audit.SendLog("2FA enabled for panel user "+user.Username, audit.LevelInfo, "WEBPANEL_2FA_ENABLED")

	c.JSON(http.StatusOK, gin.H{"message": "Two-factor authentication enabled successfully"})
}

// Disable2FA disables 2FA for the current user
func Disable2FA(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	var req struct {
		Password string `json:"password" binding:"required"`
		Code     string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password and 2FA code required"})
		return
	}

	cfg := config.Get()
	db := database.Get()

	// Get full user data
	var dbUser models.User
	if err := db.First(&dbUser, user.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find user"})
		return
	}

	// Verify password
	if !auth.VerifyPassword(req.Password, dbUser.Password, cfg.Auth.PasswordPepper) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid password"})
		return
	}

	// Verify 2FA code or backup code
	codeValid := totp.ValidateCodeWithWindow(dbUser.TwoFactorSecret, req.Code)
	if !codeValid {
		// Try backup code
		valid, _, _ := totp.ValidateBackupCode(dbUser.TwoFactorBackup, req.Code)
		codeValid = valid
	}

	if !codeValid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid 2FA code"})
		return
	}

	// Disable 2FA
	if err := db.Model(&dbUser).Updates(map[string]interface{}{
		"two_factor_enabled": false,
		"two_factor_secret":  "",
		"two_factor_backup":  "",
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to disable 2FA"})
		return
	}

	// Audit log
	db.Create(&models.AuditLog{
		UserID:    user.ID,
		Username:  user.Username,
		Action:    "2fa_disabled",
		Details:   "Two-factor authentication disabled",
		IPAddress: middleware.GetClientIP(c),
	})

	audit.SendLog("2FA disabled for panel user "+user.Username, audit.LevelInfo, "WEBPANEL_2FA_DISABLED")

	c.JSON(http.StatusOK, gin.H{"message": "Two-factor authentication disabled"})
}

// Get2FAStatus returns the current 2FA status
func Get2FAStatus(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	db := database.Get()
	var dbUser models.User
	if err := db.First(&dbUser, user.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find user"})
		return
	}

	// Count remaining backup codes
	backupCount := 0
	if dbUser.TwoFactorBackup != "" {
		codes, _ := totp.DeserializeBackupCodes(dbUser.TwoFactorBackup)
		backupCount = len(codes)
	}

	c.JSON(http.StatusOK, gin.H{
		"enabled":                dbUser.TwoFactorEnabled,
		"backup_codes_remaining": backupCount,
	})
}

// RegenerateBackupCodes generates new backup codes
func RegenerateBackupCodes(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	var req TwoFactorVerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "2FA code required"})
		return
	}

	db := database.Get()
	var dbUser models.User
	if err := db.First(&dbUser, user.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find user"})
		return
	}

	if !dbUser.TwoFactorEnabled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "2FA is not enabled"})
		return
	}

	// Verify current code
	if !totp.ValidateCodeWithWindow(dbUser.TwoFactorSecret, req.Code) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid 2FA code"})
		return
	}

	// Generate new backup codes
	backupCodes, err := totp.GenerateBackupCodes()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate backup codes"})
		return
	}

	backupJSON, _ := totp.SerializeBackupCodes(backupCodes)
	if err := db.Model(&dbUser).Update("two_factor_backup", backupJSON).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save backup codes"})
		return
	}

	// Audit log
	db.Create(&models.AuditLog{
		UserID:    user.ID,
		Username:  user.Username,
		Action:    "2fa_backup_regenerated",
		Details:   "Backup codes regenerated",
		IPAddress: middleware.GetClientIP(c),
	})

	c.JSON(http.StatusOK, gin.H{
		"backup_codes": backupCodes,
	})
}

// Verify2FALogin verifies 2FA during login and returns the token
func Verify2FALogin(c *gin.Context) {
	var req TwoFactorLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ip := middleware.GetClientIP(c)
	userAgent := c.GetHeader("User-Agent")

	cfg := config.Get()
	db := database.Get()

	// Find user
	var user models.User
	if err := db.Preload("Role.Permissions").Where("username = ?", req.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Verify password first
	if !auth.VerifyPassword(req.Password, user.Password, cfg.Auth.PasswordPepper) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Verify 2FA is enabled
	if !user.TwoFactorEnabled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "2FA is not enabled for this account"})
		return
	}

	// Verify 2FA code
	codeValid := totp.ValidateCodeWithWindow(user.TwoFactorSecret, req.Code)
	backupUsed := false

	if !codeValid {
		// Try backup code
		valid, newBackupJSON, err := totp.ValidateBackupCode(user.TwoFactorBackup, req.Code)
		if err != nil || !valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid 2FA code"})
			return
		}
		codeValid = true
		backupUsed = true
		// Update backup codes (one was used)
		db.Model(&user).Update("two_factor_backup", newBackupJSON)
	}

	// Generate token
	token, err := auth.GenerateTokenForUser(&user, ip, userAgent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	// Log login
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

	if backupUsed {
		// Warn user they used a backup code
		codes, _ := totp.DeserializeBackupCodes(user.TwoFactorBackup)
		response.PasswordWarning = "You used a backup code. " + string(rune(len(codes))) + " backup codes remaining."
	}

	c.JSON(http.StatusOK, response)
}
