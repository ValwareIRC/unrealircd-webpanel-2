package routes

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/handlers"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/middleware"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
)

// SetupRoutes configures all API routes
func SetupRoutes(r *gin.Engine) {
	// CORS configuration
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Public webhook receiver endpoint (no auth required - token is in URL)
	r.POST("/webhook/:token", handlers.ReceiveWebhook)

	// API routes
	api := r.Group("/api")
	{
		// Public routes (no auth required)
		auth := api.Group("/auth")
		{
			auth.POST("/login", handlers.Login)
			auth.POST("/2fa/verify", handlers.Verify2FALogin)
		}

		// Public plugin asset routes (no auth required so scripts/styles can load)
		api.GET("/plugins/frontend-assets", handlers.GetPluginFrontendAssets)
		api.GET("/plugins/:id/assets/:filename", handlers.ServePluginAsset)

		// Protected routes (auth required)
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			// Auth routes
			protected.POST("/auth/logout", handlers.Logout)
			protected.GET("/auth/session", handlers.GetSession)
			protected.GET("/auth/me", handlers.GetCurrentUser)
			protected.GET("/auth/permissions", handlers.GetCurrentUserPermissions)
			protected.POST("/auth/change-password", handlers.ChangePassword)
			protected.PUT("/auth/profile", handlers.UpdateProfile)

			// 2FA routes (authenticated users only)
			twofa := protected.Group("/auth/2fa")
			{
				twofa.GET("/status", handlers.Get2FAStatus)
				twofa.POST("/setup", handlers.Setup2FA)
				twofa.POST("/confirm", handlers.Verify2FASetup)
				twofa.POST("/disable", handlers.Disable2FA)
				twofa.POST("/backup-codes", handlers.RegenerateBackupCodes)
			}

			// Stats and search
			protected.GET("/stats", handlers.GetStats)
			protected.GET("/stats/stream", handlers.StreamStats)
			protected.GET("/stats/history", handlers.GetStatsHistory)
			protected.GET("/stats/history-data", handlers.GetStatsHistoryData)
			protected.GET("/search", handlers.GlobalSearch)

			// Logs
			protected.GET("/logs", middleware.PermissionMiddleware(models.PermissionViewLogs), handlers.GetLogs)
			protected.GET("/logs/stream", middleware.PermissionMiddleware(models.PermissionViewLogs), handlers.StreamLogs)

			// IRC Users
			users := protected.Group("/users")
			users.Use(middleware.PermissionMiddleware(models.PermissionViewUsers))
			{
				users.GET("", handlers.GetUsers)
				users.GET("/:nick", handlers.GetUser)
				users.POST("/:nick/kill", middleware.PermissionMiddleware(models.PermissionBanUsers), handlers.KillUser)
				users.POST("/:nick/nick", middleware.PermissionMiddleware(models.PermissionEditUser), handlers.SetUserNick)
				users.POST("/:nick/mode", middleware.PermissionMiddleware(models.PermissionEditUser), handlers.SetUserMode)
				users.POST("/:nick/vhost", middleware.PermissionMiddleware(models.PermissionEditUser), handlers.SetUserVhost)
				users.POST("/:nick/ban", middleware.PermissionMiddleware(models.PermissionBanUsers), handlers.BanUser)
			}

			// IRC Channels
			channels := protected.Group("/channels")
			channels.Use(middleware.PermissionMiddleware(models.PermissionViewChannels))
			{
				channels.GET("", handlers.GetChannels)
				channels.GET("/:name", handlers.GetChannel)
				channels.PUT("/:name/topic", middleware.PermissionMiddleware(models.PermissionEditChannel), handlers.SetChannelTopic)
				channels.POST("/:name/mode", middleware.PermissionMiddleware(models.PermissionEditChannel), handlers.SetChannelMode)
				channels.POST("/:name/kick", middleware.PermissionMiddleware(models.PermissionEditChannelUser), handlers.KickUser)
			}

			// IRC Servers
			servers := protected.Group("/servers")
			servers.Use(middleware.PermissionMiddleware(models.PermissionViewServers))
			{
				servers.GET("", handlers.GetServers)
				servers.GET("/:name", handlers.GetServer)
				servers.POST("/:name/rehash", middleware.PermissionMiddleware(models.PermissionRehash), handlers.RehashServer)
				servers.GET("/:name/modules", handlers.GetServerModules)
			}

			// Server Bans
			bans := protected.Group("/bans")
			bans.Use(middleware.PermissionMiddleware(models.PermissionViewBans))
			{
				// Server bans (G-Lines, K-Lines, Z-Lines)
				bans.GET("/server", handlers.GetServerBans)
				bans.POST("/server", middleware.PermissionMiddleware(models.PermissionServerBanAdd), handlers.AddServerBan)
				bans.DELETE("/server", middleware.PermissionMiddleware(models.PermissionServerBanDel), handlers.DeleteServerBan)

				// Name bans (Q-Lines)
				bans.GET("/name", handlers.GetNameBans)
				bans.POST("/name", middleware.PermissionMiddleware(models.PermissionNameBanAdd), handlers.AddNameBan)
				bans.DELETE("/name/:name", middleware.PermissionMiddleware(models.PermissionNameBanDel), handlers.DeleteNameBan)

				// Ban exceptions (E-Lines)
				bans.GET("/exceptions", handlers.GetBanExceptions)
				bans.POST("/exceptions", middleware.PermissionMiddleware(models.PermissionBanExceptionAdd), handlers.AddBanException)
				bans.DELETE("/exceptions/:name", middleware.PermissionMiddleware(models.PermissionBanExceptionDel), handlers.DeleteBanException)

				// Spamfilters
				bans.GET("/spamfilter", handlers.GetSpamfilters)
				bans.POST("/spamfilter", middleware.PermissionMiddleware(models.PermissionSpamfilterAdd), handlers.AddSpamfilter)
				bans.DELETE("/spamfilter", middleware.PermissionMiddleware(models.PermissionSpamfilterDel), handlers.DeleteSpamfilter)
			}

			// Watch List
			watchlist := protected.Group("/watchlist")
			watchlist.Use(middleware.PermissionMiddleware(models.PermissionViewUsers))
			{
				watchlist.GET("", handlers.GetWatchedUsers)
				watchlist.GET("/:id", handlers.GetWatchedUser)
				watchlist.POST("", middleware.PermissionMiddleware(models.PermissionBanUsers), handlers.AddWatchedUser)
				watchlist.PUT("/:id", middleware.PermissionMiddleware(models.PermissionBanUsers), handlers.UpdateWatchedUser)
				watchlist.DELETE("/:id", middleware.PermissionMiddleware(models.PermissionBanUsers), handlers.DeleteWatchedUser)
			}

			// Saved Searches
			savedSearches := protected.Group("/saved-searches")
			{
				savedSearches.GET("", handlers.GetSavedSearches)
				savedSearches.GET("/:id", handlers.GetSavedSearch)
				savedSearches.POST("", handlers.CreateSavedSearch)
				savedSearches.PUT("/:id", handlers.UpdateSavedSearch)
				savedSearches.DELETE("/:id", handlers.DeleteSavedSearch)
				savedSearches.POST("/:id/use", handlers.UseSavedSearch)
			}

			// Scheduled Commands
			scheduledCmds := protected.Group("/scheduled-commands")
			scheduledCmds.Use(middleware.PermissionMiddleware(models.PermissionBanUsers))
			{
				scheduledCmds.GET("", handlers.GetScheduledCommands)
				scheduledCmds.GET("/:id", handlers.GetScheduledCommand)
				scheduledCmds.POST("", handlers.CreateScheduledCommand)
				scheduledCmds.PUT("/:id", handlers.UpdateScheduledCommand)
				scheduledCmds.DELETE("/:id", handlers.DeleteScheduledCommand)
				scheduledCmds.POST("/:id/toggle", handlers.ToggleScheduledCommand)
				scheduledCmds.POST("/:id/run", handlers.RunScheduledCommandNow)
			}

			// Panel User Management
			panelUsers := protected.Group("/panel-users")
			panelUsers.Use(middleware.PermissionMiddleware(models.PermissionManageUsers))
			{
				panelUsers.GET("", handlers.GetPanelUsers)
				panelUsers.GET("/:id", handlers.GetPanelUser)
				panelUsers.POST("", handlers.CreatePanelUser)
				panelUsers.PUT("/:id", handlers.UpdatePanelUser)
				panelUsers.DELETE("/:id", handlers.DeletePanelUser)
			}

			// Roles
			roles := protected.Group("/roles")
			roles.Use(middleware.PermissionMiddleware(models.PermissionManageUsers))
			{
				roles.GET("", handlers.GetRoles)
				roles.GET("/:id", handlers.GetRole)
				roles.POST("", handlers.CreateRole)
				roles.PUT("/:id", handlers.UpdateRole)
				roles.DELETE("/:id", handlers.DeleteRole)
			}

			// Permissions
			protected.GET("/permissions", handlers.GetPermissions)
			protected.GET("/permissions/categories", handlers.GetPermissionsByCategory)

			// RPC Server Management
			rpcServers := protected.Group("/rpc-servers")
			rpcServers.Use(middleware.PermissionMiddleware(models.PermissionManageRPCServers))
			{
				rpcServers.GET("", handlers.GetRPCServers)
				rpcServers.POST("", handlers.AddRPCServer)
				rpcServers.POST("/test", handlers.TestRPCServer)
				rpcServers.POST("/:name/activate", handlers.SetActiveRPCServer)
				rpcServers.PUT("/:name", handlers.UpdateRPCServer)
				rpcServers.DELETE("/:name", handlers.DeleteRPCServer)
			}

			// System Settings
			systemSettings := protected.Group("/system-settings")
			systemSettings.Use(middleware.PermissionMiddleware(models.PermissionManageUsers))
			{
				systemSettings.GET("", handlers.GetSystemSettings)
				systemSettings.PUT("", handlers.UpdateSystemSettings)
			}

			// Webhook Management
			webhooks := protected.Group("/webhooks")
			webhooks.Use(middleware.PermissionMiddleware(models.PermissionManageWebhooks))
			{
				webhooks.GET("", handlers.GetWebhookTokens)
				webhooks.GET("/:id", handlers.GetWebhookToken)
				webhooks.POST("", handlers.CreateWebhookToken)
				webhooks.PUT("/:id", handlers.UpdateWebhookToken)
				webhooks.DELETE("/:id", handlers.DeleteWebhookToken)
				webhooks.POST("/:id/regenerate", handlers.RegenerateWebhookToken)
				webhooks.GET("/:id/config", handlers.GetWebhookConfig)
				webhooks.GET("/logs", handlers.GetWebhookLogs)
			}

			// SMTP Settings (admin only)
			smtp := protected.Group("/smtp")
			smtp.Use(middleware.PermissionMiddleware(models.PermissionManageSMTP))
			{
				smtp.GET("", handlers.GetSmtpSettings)
				smtp.PUT("", handlers.UpdateSmtpSettings)
				smtp.POST("/test", handlers.TestSmtpSettings)
			}

			// SMTP Status (any authenticated user can check if SMTP is configured)
			protected.GET("/smtp/status", handlers.GetSmtpStatus)

			// Notification Preferences (per-user, any authenticated user)
			notifications := protected.Group("/notifications")
			{
				notifications.GET("/preferences", handlers.GetNotificationPreferences)
				notifications.PUT("/preferences", handlers.UpdateNotificationPreferences)
				notifications.GET("/event-types", handlers.GetNotificationEventTypes)
			}

			// Dashboard Layout (per-user, any authenticated user)
			dashboard := protected.Group("/dashboard")
			{
				dashboard.GET("/layout", handlers.GetDashboardLayout)
				dashboard.PUT("/layout", handlers.UpdateDashboardLayout)
				dashboard.POST("/layout/reset", handlers.ResetDashboardLayout)
				dashboard.GET("/widgets", handlers.GetAvailableWidgets)
			}

			// Alert Rules
			alertRules := protected.Group("/alert-rules")
			alertRules.Use(middleware.PermissionMiddleware(models.PermissionManageWebhooks))
			{
				alertRules.GET("", handlers.GetAlertRules)
				alertRules.GET("/stats", handlers.GetAlertRuleStats)
				alertRules.GET("/:id", handlers.GetAlertRule)
				alertRules.POST("", handlers.CreateAlertRule)
				alertRules.PUT("/:id", handlers.UpdateAlertRule)
				alertRules.DELETE("/:id", handlers.DeleteAlertRule)
				alertRules.POST("/:id/toggle", handlers.ToggleAlertRule)
				alertRules.POST("/test", handlers.TestAlertRule)
			}

			// Channel Templates
			channelTemplates := protected.Group("/channel-templates")
			channelTemplates.Use(middleware.PermissionMiddleware(models.PermissionViewChannels))
			{
				channelTemplates.GET("", handlers.GetChannelTemplates)
				channelTemplates.GET("/:id", handlers.GetChannelTemplate)
				channelTemplates.POST("", middleware.PermissionMiddleware(models.PermissionEditChannel), handlers.CreateChannelTemplate)
				channelTemplates.PUT("/:id", middleware.PermissionMiddleware(models.PermissionEditChannel), handlers.UpdateChannelTemplate)
				channelTemplates.DELETE("/:id", middleware.PermissionMiddleware(models.PermissionEditChannel), handlers.DeleteChannelTemplate)
				channelTemplates.POST("/:id/apply", middleware.PermissionMiddleware(models.PermissionEditChannel), handlers.ApplyChannelTemplate)
				channelTemplates.POST("/from-channel", middleware.PermissionMiddleware(models.PermissionEditChannel), handlers.CreateTemplateFromChannel)
			}

			// User Journey Timeline
			journey := protected.Group("/journey")
			journey.Use(middleware.PermissionMiddleware(models.PermissionViewUsers))
			{
				journey.GET("", handlers.GetUserJourney)
				journey.GET("/user/:nick", handlers.GetUserJourneyByNick)
				journey.GET("/stats", handlers.GetUserJourneyStats)
				journey.GET("/event-types", handlers.GetJourneyEventTypes)
				journey.POST("/search", handlers.SearchJourneyEvents)
				journey.DELETE("/cleanup", middleware.PermissionMiddleware(models.PermissionManageUsers), handlers.CleanupOldJourneyEvents)
			}

			// Compliance Reports
			compliance := protected.Group("/compliance")
			compliance.Use(middleware.PermissionMiddleware(models.PermissionManageUsers))
			{
				compliance.GET("", handlers.GetComplianceReports)
				compliance.GET("/types", handlers.GetReportTypes)
				compliance.GET("/:id", handlers.GetComplianceReport)
				compliance.POST("", handlers.CreateComplianceReport)
				compliance.GET("/:id/download", handlers.DownloadComplianceReport)
				compliance.DELETE("/:id", handlers.DeleteComplianceReport)
			}

			// Network Topology
			topology := protected.Group("/topology")
			topology.Use(middleware.PermissionMiddleware(models.PermissionViewServers))
			{
				topology.GET("", handlers.GetNetworkTopology)
				topology.GET("/server/:name", handlers.GetServerDetails)
			}

			// TLS/SSL Statistics
			tls := protected.Group("/tls")
			tls.Use(middleware.PermissionMiddleware(models.PermissionViewUsers))
			{
				tls.GET("/stats", handlers.GetTLSStats)
				tls.GET("/users", handlers.GetTLSUsers)
				tls.GET("/fingerprints", handlers.GetCertFPGroups)
				tls.GET("/ciphers", handlers.GetCipherStats)
			}

			// Feedback Portal
			feedback := protected.Group("/feedback")
			{
				feedback.GET("", handlers.GetFeedbackItems)
				feedback.GET("/stats", handlers.GetFeedbackStats)
				feedback.GET("/:id", handlers.GetFeedbackItem)
				feedback.POST("", handlers.CreateFeedback)
				feedback.PUT("/:id/status", middleware.PermissionMiddleware(models.PermissionManageUsers), handlers.UpdateFeedbackStatus)
				feedback.POST("/:id/comments", handlers.AddFeedbackComment)
				feedback.POST("/:id/vote", handlers.VoteFeedback)
				feedback.DELETE("/:id", handlers.DeleteFeedback)
			}

			// Custom Report Builder
			reports := protected.Group("/reports")
			reports.Use(middleware.PermissionMiddleware(models.PermissionViewUsers))
			{
				reports.GET("/metrics", handlers.GetAvailableMetrics)
				reports.GET("/presets", handlers.GetSavedReports)
				reports.GET("/preview", handlers.GetReportPreview)
				reports.POST("/generate", handlers.GenerateReport)
			}

			// Email Digest Settings
			digest := protected.Group("/digest")
			{
				digest.GET("/settings", handlers.GetDigestSettings)
				digest.PUT("/settings", handlers.UpdateDigestSettings)
				digest.GET("/preview", handlers.GetDigestPreview)
				digest.POST("/test", handlers.SendTestDigest)
				digest.GET("/history", handlers.GetDigestHistory)
			}

			// Plugin Marketplace
			plugins := protected.Group("/plugins")
			{
				plugins.GET("/marketplace", handlers.GetMarketplacePlugins)
				plugins.GET("/installed", handlers.GetInstalledPlugins)
				plugins.GET("/loaded", handlers.GetLoadedPlugins)
				plugins.GET("/nav-items", handlers.GetPluginNavItems)
				plugins.GET("/dashboard-cards", handlers.GetPluginDashboardCards)
				plugins.GET("/hooks", handlers.GetAvailableHooks)
				plugins.POST("/refresh", middleware.PermissionMiddleware(models.PermissionManageUsers), handlers.RefreshPluginCache)
				plugins.GET("/:id", handlers.GetPluginDetails)
				plugins.POST("/:id/install", middleware.PermissionMiddleware(models.PermissionManageUsers), handlers.InstallPlugin)
				plugins.DELETE("/:id", middleware.PermissionMiddleware(models.PermissionManageUsers), handlers.UninstallPlugin)
				plugins.PUT("/:id/toggle", middleware.PermissionMiddleware(models.PermissionManageUsers), handlers.TogglePlugin)
				plugins.PUT("/:id/enable", middleware.PermissionMiddleware(models.PermissionManageUsers), handlers.EnablePlugin)
				plugins.PUT("/:id/disable", middleware.PermissionMiddleware(models.PermissionManageUsers), handlers.DisablePlugin)
				plugins.POST("/:id/update", middleware.PermissionMiddleware(models.PermissionManageUsers), handlers.UpdatePlugin)
			}
		}
	}
}
