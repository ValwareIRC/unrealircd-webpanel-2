package database

import (
	"fmt"

	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/config"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var db *gorm.DB

// Initialize initializes the database connection
func Initialize(cfg *config.DatabaseConfig) error {
	var err error
	var dialector gorm.Dialector

	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	}

	switch cfg.Driver {
	case "sqlite":
		dialector = sqlite.Open(cfg.DSN)
	case "mysql":
		dialector = mysql.Open(cfg.DSN)
	default:
		return fmt.Errorf("unsupported database driver: %s", cfg.Driver)
	}

	db, err = gorm.Open(dialector, gormConfig)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	// Auto-migrate the schema
	if err := Migrate(); err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}

	// Create default roles if they don't exist
	if err := createDefaultRoles(); err != nil {
		return fmt.Errorf("failed to create default roles: %w", err)
	}

	return nil
}

// Get returns the database instance
func Get() *gorm.DB {
	return db
}

// Migrate runs database migrations
func Migrate() error {
	return db.AutoMigrate(
		&models.User{},
		&models.UserMeta{},
		&models.Role{},
		&models.RolePermission{},
		&models.Setting{},
		&models.Note{},
		&models.Fail2Ban{},
		&models.Session{},
		&models.AuditLog{},
		&models.WebhookToken{},
		&models.WebhookLog{},
		&models.SmtpSettings{},
		&models.UserNotificationPreference{},
		&models.DashboardLayout{},
		&models.WatchedUser{},
		&models.SavedSearch{},
		&models.ScheduledCommand{},
		&models.AlertRule{},
		&models.ChannelTemplate{},
		&models.UserJourneyEvent{},
		&models.ComplianceReport{},
		&models.Feedback{},
		&models.FeedbackComment{},
		&models.FeedbackVote{},
		&models.DigestSettings{},
		&models.DigestHistory{},
		&models.InstalledPlugin{},
	)
}

// createDefaultRoles creates the default Super-Admin and Read-Only roles
func createDefaultRoles() error {
	var count int64
	db.Model(&models.Role{}).Count(&count)
	if count > 0 {
		return nil
	}

	// Create Super-Admin role
	superAdmin := models.Role{
		Name:         "Super-Admin",
		Description:  "Full access to all features",
		IsSuperAdmin: true,
	}
	if err := db.Create(&superAdmin).Error; err != nil {
		return err
	}

	// Create Read-Only role
	readOnly := models.Role{
		Name:        "Read-Only",
		Description: "View-only access to the panel",
	}
	if err := db.Create(&readOnly).Error; err != nil {
		return err
	}

	// Add view permissions to Read-Only role
	viewPermissions := []string{
		models.PermissionViewUsers,
		models.PermissionViewChannels,
		models.PermissionViewServers,
		models.PermissionViewBans,
		models.PermissionViewLogs,
	}

	for _, perm := range viewPermissions {
		db.Create(&models.RolePermission{
			RoleID:     readOnly.ID,
			Permission: perm,
		})
	}

	return nil
}

// Close closes the database connection
func Close() error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// Type aliases for convenience
type InstalledPlugin = models.InstalledPlugin
