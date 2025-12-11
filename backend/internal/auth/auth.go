package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/config"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/hooks"
	"golang.org/x/crypto/argon2"
)

var (
	ErrInvalidCredentials = errors.New("invalid username or password")
	ErrUserNotFound       = errors.New("user not found")
	ErrSessionExpired     = errors.New("session expired")
	ErrInvalidToken       = errors.New("invalid token")
)

// Argon2 parameters
const (
	argon2Time    = 1
	argon2Memory  = 64 * 1024
	argon2Threads = 4
	argon2KeyLen  = 32
	saltLen       = 16
)

// Claims represents JWT claims
type Claims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	RoleID   uint   `json:"role_id"`
	jwt.RegisteredClaims
}

// HashPassword hashes a password using Argon2id with a pepper
func HashPassword(password string, pepper string) (string, error) {
	salt := make([]byte, saltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	// Add pepper to password
	pepperedPassword := password + pepper

	hash := argon2.IDKey([]byte(pepperedPassword), salt, argon2Time, argon2Memory, argon2Threads, argon2KeyLen)

	// Encode salt and hash
	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)

	return fmt.Sprintf("$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s", argon2Memory, argon2Time, argon2Threads, b64Salt, b64Hash), nil
}

// VerifyPassword verifies a password against a hash
func VerifyPassword(password, hash, pepper string) bool {
	// Parse the hash - format: $argon2id$v=19$m=65536,t=1,p=4$salt$hash
	parts := strings.Split(hash, "$")
	if len(parts) != 6 {
		return false
	}

	// parts[0] = "" (before first $)
	// parts[1] = "argon2id"
	// parts[2] = "v=19"
	// parts[3] = "m=65536,t=1,p=4"
	// parts[4] = salt
	// parts[5] = key

	if parts[1] != "argon2id" {
		return false
	}

	var memory, time uint32
	var threads uint8
	_, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &time, &threads)
	if err != nil {
		return false
	}

	saltBytes, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false
	}

	keyBytes, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false
	}

	// Add pepper to password
	pepperedPassword := password + pepper

	// Compute the hash
	computedHash := argon2.IDKey([]byte(pepperedPassword), saltBytes, time, memory, threads, uint32(len(keyBytes)))

	return subtle.ConstantTimeCompare(keyBytes, computedHash) == 1
}

// GenerateToken generates a JWT token for a user
func GenerateToken(user *models.User, secret string, expiry time.Duration) (string, error) {
	claims := &Claims{
		UserID:   user.ID,
		Username: user.Username,
		RoleID:   user.RoleID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "unrealircd-webpanel",
			Subject:   fmt.Sprintf("%d", user.ID),
			ID:        uuid.New().String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ValidateToken validates a JWT token and returns the claims
func ValidateToken(tokenString, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, ErrInvalidToken
}

// Login authenticates a user and returns a token
func Login(username, password, ipAddress, userAgent string) (string, *models.User, error) {
	cfg := config.Get()
	db := database.Get()

	var user models.User
	if err := db.Preload("Role").Preload("Role.Permissions").Where("username = ?", username).First(&user).Error; err != nil {
		// Fire login fail hook
		hooks.Run(hooks.HookUserLoginFail, map[string]interface{}{
			"username":   username,
			"ip_address": ipAddress,
			"reason":     "user not found",
		})
		return "", nil, ErrInvalidCredentials
	}

	if !VerifyPassword(password, user.Password, cfg.Auth.PasswordPepper) {
		// Fire login fail hook
		hooks.Run(hooks.HookUserLoginFail, map[string]interface{}{
			"username":   username,
			"ip_address": ipAddress,
			"reason":     "invalid password",
		})
		return "", nil, ErrInvalidCredentials
	}

	// Generate token
	expiry := time.Duration(cfg.Auth.SessionTimeout) * time.Second
	if expiry == 0 {
		expiry = time.Hour
	}

	token, err := GenerateToken(&user, cfg.Auth.JWTSecret, expiry)
	if err != nil {
		return "", nil, err
	}

	// Create session record
	session := models.Session{
		ID:        uuid.New().String(),
		UserID:    user.ID,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(expiry),
		IPAddress: ipAddress,
		UserAgent: userAgent,
	}
	db.Create(&session)

	// Update last login
	db.Model(&models.UserMeta{}).Where("user_id = ? AND key = ?", user.ID, "last_login").
		Assign(models.UserMeta{UserID: user.ID, Key: "last_login", Value: time.Now().Format(time.RFC3339)}).
		FirstOrCreate(&models.UserMeta{})

	// Fire login success hook
	hooks.Run(hooks.HookUserLogin, map[string]interface{}{
		"user":       &user,
		"ip_address": ipAddress,
	})

	// Create audit log entry
	db.Create(&models.AuditLog{
		UserID:    user.ID,
		Username:  user.Username,
		Action:    "login",
		Details:   "User logged in",
		IPAddress: ipAddress,
	})

	return token, &user, nil
}

// GetUserFromToken gets a user from a token
func GetUserFromToken(tokenString string) (*models.User, error) {
	cfg := config.Get()

	claims, err := ValidateToken(tokenString, cfg.Auth.JWTSecret)
	if err != nil {
		return nil, err
	}

	db := database.Get()
	var user models.User
	if err := db.Preload("Role").Preload("Role.Permissions").First(&user, claims.UserID).Error; err != nil {
		return nil, ErrUserNotFound
	}

	return &user, nil
}

// UserCan checks if a user has a specific permission
func UserCan(user *models.User, permission string) bool {
	if user == nil || user.Role == nil {
		return false
	}

	// Super-admin has all permissions
	if user.Role.IsSuperAdmin {
		return true
	}

	// Check role permissions
	for _, p := range user.Role.Permissions {
		if p.Permission == permission {
			return true
		}
	}

	return false
}

// CreateUser creates a new panel user
func CreateUser(username, email, password, firstName, lastName string, roleID uint) (*models.User, error) {
	cfg := config.Get()
	db := database.Get()

	hashedPassword, err := HashPassword(password, cfg.Auth.PasswordPepper)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Username:  username,
		Email:     email,
		Password:  hashedPassword,
		FirstName: firstName,
		LastName:  lastName,
		RoleID:    roleID,
	}

	// Fire pre-create hook
	hooks.Run(hooks.HookUserCreate, user)

	if err := db.Create(user).Error; err != nil {
		return nil, err
	}

	// Load the role
	db.Preload("Role").Preload("Role.Permissions").First(user, user.ID)

	return user, nil
}

// GenerateRandomString generates a random string of the specified length
func GenerateRandomString(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes)[:length], nil
}

// GenerateSecrets generates new secrets for the configuration
func GenerateSecrets() (jwtSecret, pepper, encryptionKey string, err error) {
	jwtSecret, err = GenerateRandomString(32)
	if err != nil {
		return
	}

	pepper, err = GenerateRandomString(32)
	if err != nil {
		return
	}

	encryptionKey, err = GenerateRandomString(32)
	if err != nil {
		return
	}

	return
}

// RecordFailedAttempt records a failed login attempt for fail2ban
func RecordFailedAttempt(username, ipAddress string) {
	db := database.Get()
	db.Create(&models.Fail2Ban{
		IP:        ipAddress,
		Username:  username,
		Timestamp: time.Now(),
	})

	// Fire login fail hook
	hooks.Run(hooks.HookUserLoginFail, map[string]interface{}{
		"username":   username,
		"ip_address": ipAddress,
		"reason":     "invalid password",
	})
}

// GenerateTokenForUser generates a JWT token for a user with session recording
func GenerateTokenForUser(user *models.User, ipAddress, userAgent string) (string, error) {
	cfg := config.Get()
	db := database.Get()

	expiry := time.Duration(cfg.Auth.SessionTimeout) * time.Second
	if expiry == 0 {
		expiry = time.Hour
	}

	token, err := GenerateToken(user, cfg.Auth.JWTSecret, expiry)
	if err != nil {
		return "", err
	}

	// Create session record
	session := models.Session{
		ID:        uuid.New().String(),
		UserID:    user.ID,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(expiry),
		IPAddress: ipAddress,
		UserAgent: userAgent,
	}
	db.Create(&session)

	// Update last login
	db.Model(&models.UserMeta{}).Where("user_id = ? AND key = ?", user.ID, "last_login").
		Assign(models.UserMeta{UserID: user.ID, Key: "last_login", Value: time.Now().Format(time.RFC3339)}).
		FirstOrCreate(&models.UserMeta{})

	// Fire login success hook
	hooks.Run(hooks.HookUserLogin, map[string]interface{}{
		"user":       user,
		"ip_address": ipAddress,
	})

	// Create audit log entry
	db.Create(&models.AuditLog{
		UserID:    user.ID,
		Username:  user.Username,
		Action:    "login",
		Details:   "User logged in",
		IPAddress: ipAddress,
	})

	return token, nil
}
