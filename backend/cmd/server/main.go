package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/routes"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/auth"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/config"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/plugins"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/rpc"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/services/notifications"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/services/scheduler"
)

func main() {
	// Create data directory if it doesn't exist
	if err := os.MkdirAll("data", 0755); err != nil {
		log.Fatalf("Failed to create data directory: %v", err)
	}

	// Load configuration
	cfg, err := config.Load("config.json")
	if err != nil {
		log.Printf("Warning: Could not load config file: %v", err)
	}

	// Generate secrets if not set
	if cfg.Auth.JWTSecret == "" {
		jwtSecret, pepper, encKey, err := auth.GenerateSecrets()
		if err != nil {
			log.Fatalf("Failed to generate secrets: %v", err)
		}
		cfg.Auth.JWTSecret = jwtSecret
		cfg.Auth.PasswordPepper = pepper
		cfg.Auth.EncryptionKey = encKey

		if err := config.Save("config.json"); err != nil {
			log.Printf("Warning: Could not save config: %v", err)
		}
	}

	// Initialize database
	if err := database.Initialize(&cfg.Database); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Initialize plugin system
	initializePlugins()

	// Check if admin user needs to be created
	checkAndCreateAdminUser(cfg)

	// Connect to RPC servers
	connectToRPCServers(cfg)

	// Initialize notification service (registers webhook hooks)
	notifications.Initialize()

	// Initialize scheduler service (handles cron jobs, scheduled commands, digests)
	sched := scheduler.Initialize()
	defer sched.Stop()

	// Setup graceful shutdown
	setupGracefulShutdown(sched)

	// Setup Gin
	if os.Getenv("GIN_MODE") != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// Serve static files for frontend (in production)
	r.Static("/assets", "./frontend/assets")
	r.StaticFile("/", "./frontend/index.html")
	r.StaticFile("/favicon.ico", "./frontend/favicon.ico")
	r.StaticFile("/favicon.svg", "./frontend/favicon.svg")
	r.StaticFile("/unreal.png", "./frontend/unreal.png")
	r.NoRoute(func(c *gin.Context) {
		c.File("./frontend/index.html")
	})

	// Setup API routes
	routes.SetupRoutes(r)

	// Start server
	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	log.Printf("Starting server on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func checkAndCreateAdminUser(cfg *config.Config) {
	db := database.Get()

	// Check if any users exist
	var count int64
	if err := db.Table("users").Count(&count).Error; err != nil {
		log.Printf("Warning: Could not count users: %v", err)
		return
	}

	if count == 0 {
		// Create default admin user
		log.Println("No users found. Creating default admin user...")

		// Get Super-Admin role
		var roleID uint = 1 // Default to first role (Super-Admin)

		user, err := auth.CreateUser("admin", "admin@localhost", "admin123", "Admin", "User", roleID)
		if err != nil {
			log.Printf("Warning: Could not create default admin user: %v", err)
		} else {
			log.Printf("Created default admin user: %s (password: admin123)", user.Username)
			log.Println("Please change this password immediately!")
		}
	}
}

func connectToRPCServers(cfg *config.Config) {
	manager := rpc.GetManager()

	for _, server := range cfg.RPC {
		log.Printf("Connecting to RPC server: %s (%s:%d)", server.Name, server.Host, server.Port)

		_, err := manager.Connect(&server, "webpanel")
		if err != nil {
			log.Printf("Warning: Could not connect to %s: %v", server.Name, err)
			continue
		}

		log.Printf("Connected to RPC server: %s", server.Name)
	}
}

func setupGracefulShutdown(sched *scheduler.Scheduler) {
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		log.Println("Shutting down gracefully...")
		sched.Stop()
		shutdownPlugins()
		os.Exit(0)
	}()
}

func initializePlugins() {
	manager := plugins.GetManager()

	// Determine plugin directory
	pluginDir := "plugins"
	if _, err := os.Stat("/home/valerie/uwp-plugins/plugins"); err == nil {
		pluginDir = "/home/valerie/uwp-plugins/plugins"
	} else if _, err := os.Stat("internal/plugins"); err == nil {
		pluginDir = "internal/plugins"
	}
	manager.SetPluginDir(pluginDir)

	// Create plugins directory if it doesn't exist
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		log.Printf("Warning: Could not create plugins directory: %v", err)
	}

	// Load installed plugins from database
	db := database.Get()
	var installedPlugins []database.InstalledPlugin
	if err := db.Where("enabled = ?", true).Find(&installedPlugins).Error; err != nil {
		log.Printf("Warning: Could not load installed plugins from database: %v", err)
		return
	}

	for _, p := range installedPlugins {
		log.Printf("Loading plugin: %s", p.ID)
		if err := manager.LoadPlugin(p.ID); err != nil {
			// Not an error - most plugins are "virtual" without .so files
			log.Printf("Plugin %s registered (no runtime component): %v", p.ID, err)
		} else {
			log.Printf("Loaded plugin: %s v%s", p.Name, p.Version)
		}
	}

	log.Printf("Plugin system initialized. %d plugins loaded.", len(manager.ListPlugins()))
}

func shutdownPlugins() {
	manager := plugins.GetManager()
	for _, p := range manager.ListPlugins() {
		log.Printf("Shutting down plugin: %s", p.Handle)
		if err := manager.UnloadPlugin(p.Handle); err != nil {
			log.Printf("Warning: Error shutting down plugin %s: %v", p.Handle, err)
		}
	}
}
