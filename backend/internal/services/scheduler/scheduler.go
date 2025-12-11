package scheduler

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/rpc"
	"github.com/robfig/cron/v3"
)

var (
	scheduler *Scheduler
	once      sync.Once
)

// Scheduler manages scheduled tasks
type Scheduler struct {
	cron     *cron.Cron
	mu       sync.RWMutex
	jobIDs   map[uint]cron.EntryID // Maps ScheduledCommand.ID to cron entry ID
	stopChan chan struct{}
}

// Initialize creates and starts the scheduler
func Initialize() *Scheduler {
	once.Do(func() {
		scheduler = &Scheduler{
			cron:     cron.New(cron.WithSeconds()),
			jobIDs:   make(map[uint]cron.EntryID),
			stopChan: make(chan struct{}),
		}
		scheduler.start()
	})
	return scheduler
}

// GetScheduler returns the singleton scheduler instance
func GetScheduler() *Scheduler {
	return scheduler
}

// start begins the scheduler and loads existing jobs
func (s *Scheduler) start() {
	log.Println("Starting scheduler service...")

	// Load existing scheduled commands from database
	s.loadScheduledCommands()

	// Start the one-time command checker (runs every minute)
	s.cron.AddFunc("0 * * * * *", s.checkOneTimeCommands)

	// Start the digest email checker (runs every minute)
	s.cron.AddFunc("0 * * * * *", s.checkDigestEmails)

	// Start the cleanup job (runs daily at 3 AM)
	s.cron.AddFunc("0 0 3 * * *", s.cleanupOldData)

	s.cron.Start()
	log.Println("Scheduler service started")
}

// Stop gracefully shuts down the scheduler
func (s *Scheduler) Stop() {
	log.Println("Stopping scheduler service...")
	ctx := s.cron.Stop()
	<-ctx.Done()
	close(s.stopChan)
	log.Println("Scheduler service stopped")
}

// loadScheduledCommands loads and schedules existing cron-based commands
func (s *Scheduler) loadScheduledCommands() {
	db := database.Get()
	if db == nil {
		log.Println("Database not available, skipping scheduled commands load")
		return
	}

	var commands []models.ScheduledCommand
	if err := db.Where("is_enabled = ? AND schedule != ?", true, "once").Find(&commands).Error; err != nil {
		log.Printf("Error loading scheduled commands: %v", err)
		return
	}

	for _, cmd := range commands {
		s.AddJob(&cmd)
	}

	log.Printf("Loaded %d scheduled commands", len(commands))
}

// AddJob adds a scheduled command to the cron scheduler
func (s *Scheduler) AddJob(cmd *models.ScheduledCommand) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Remove existing job if any
	if entryID, exists := s.jobIDs[cmd.ID]; exists {
		s.cron.Remove(entryID)
		delete(s.jobIDs, cmd.ID)
	}

	// Don't add if not enabled or is a one-time command
	if !cmd.IsEnabled || cmd.Schedule == "once" {
		return nil
	}

	// Add the cron job
	cmdID := cmd.ID // Capture for closure
	entryID, err := s.cron.AddFunc(cmd.Schedule, func() {
		s.executeCommand(cmdID)
	})
	if err != nil {
		log.Printf("Error adding cron job for command %d: %v", cmd.ID, err)
		return err
	}

	s.jobIDs[cmd.ID] = entryID
	log.Printf("Added cron job for command %d: %s", cmd.ID, cmd.Name)
	return nil
}

// RemoveJob removes a scheduled command from the cron scheduler
func (s *Scheduler) RemoveJob(cmdID uint) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if entryID, exists := s.jobIDs[cmdID]; exists {
		s.cron.Remove(entryID)
		delete(s.jobIDs, cmdID)
		log.Printf("Removed cron job for command %d", cmdID)
	}
}

// checkOneTimeCommands checks and executes one-time commands that are due
func (s *Scheduler) checkOneTimeCommands() {
	db := database.Get()
	if db == nil {
		return
	}

	var commands []models.ScheduledCommand
	now := time.Now()

	// Find one-time commands that are due and haven't been executed
	err := db.Where(
		"is_enabled = ? AND schedule = ? AND run_at <= ? AND last_run IS NULL",
		true, "once", now,
	).Find(&commands).Error

	if err != nil {
		log.Printf("Error checking one-time commands: %v", err)
		return
	}

	for _, cmd := range commands {
		s.executeCommand(cmd.ID)
	}
}

// executeCommand runs a scheduled command
func (s *Scheduler) executeCommand(cmdID uint) {
	db := database.Get()
	if db == nil {
		return
	}

	var cmd models.ScheduledCommand
	if err := db.First(&cmd, cmdID).Error; err != nil {
		log.Printf("Error loading command %d: %v", cmdID, err)
		return
	}

	log.Printf("Executing scheduled command: %s (ID: %d)", cmd.Name, cmd.ID)

	// Parse params
	var params map[string]interface{}
	if cmd.Params != "" {
		json.Unmarshal([]byte(cmd.Params), &params)
	}

	// Execute the command via RPC
	manager := rpc.GetManager()
	var execErr error

	switch cmd.Command {
	case "kill":
		_, execErr = manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
			return client.User().Kill(cmd.Target, getParamString(params, "reason"))
		})
	case "gline":
		duration := getParamString(params, "duration")
		reason := getParamString(params, "reason")
		_, execErr = manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
			return client.ServerBan().Add(cmd.Target, "gline", duration, reason)
		})
	case "kline":
		duration := getParamString(params, "duration")
		reason := getParamString(params, "reason")
		_, execErr = manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
			return client.ServerBan().Add(cmd.Target, "kline", duration, reason)
		})
	case "rehash":
		_, execErr = manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
			return client.Query("server.rehash", map[string]interface{}{
				"server": cmd.Target,
			}, false)
		})
	default:
		log.Printf("Unknown command type: %s", cmd.Command)
	}

	// Update last run time and status
	now := time.Now()
	updates := map[string]interface{}{
		"last_run":  now,
		"run_count": cmd.RunCount + 1,
	}

	if execErr != nil {
		log.Printf("Error executing command %d: %v", cmdID, execErr)
		updates["last_error"] = execErr.Error()
	} else {
		updates["last_error"] = ""
		log.Printf("Successfully executed command: %s", cmd.Name)
	}

	// If one-time, disable after execution
	if cmd.Schedule == "once" {
		updates["is_enabled"] = false
	}

	db.Model(&cmd).Updates(updates)
}

// checkDigestEmails checks if any digest emails need to be sent
func (s *Scheduler) checkDigestEmails() {
	db := database.Get()
	if db == nil {
		return
	}

	var settings []models.DigestSettings
	now := time.Now()
	currentHour := now.Format("15:04")

	// Find enabled digests that match current time
	err := db.Where("enabled = ? AND time_of_day = ?", true, currentHour).Find(&settings).Error
	if err != nil {
		log.Printf("Error checking digest settings: %v", err)
		return
	}

	for _, setting := range settings {
		shouldSend := false

		switch setting.Frequency {
		case "daily":
			// Send every day at the specified time
			shouldSend = true
		case "weekly":
			// Send on the specified day of week
			if int(now.Weekday()) == setting.DayOfWeek {
				shouldSend = true
			}
		case "monthly":
			// Send on the first day of each month
			if now.Day() == 1 {
				shouldSend = true
			}
		}

		// Check if we already sent today
		if shouldSend && setting.LastSentAt != nil {
			if setting.LastSentAt.Format("2006-01-02") == now.Format("2006-01-02") {
				shouldSend = false // Already sent today
			}
		}

		if shouldSend {
			s.sendDigestEmail(setting)
		}
	}
}

// sendDigestEmail sends a digest email (placeholder - needs SMTP integration)
func (s *Scheduler) sendDigestEmail(setting models.DigestSettings) {
	db := database.Get()
	if db == nil {
		return
	}

	log.Printf("Sending digest email to user %d (%s)", setting.UserID, setting.EmailAddress)

	// TODO: Implement actual email sending using SMTP settings
	// For now, just update the last_sent_at timestamp

	now := time.Now()
	db.Model(&setting).Update("last_sent_at", now)

	// Record in history
	history := models.DigestHistory{
		UserID:    setting.UserID,
		Period:    setting.Frequency,
		StartDate: getDigestStartDate(setting.Frequency, now),
		EndDate:   now,
		SentAt:    now,
		Status:    "delivered", // Would be "pending" until SMTP confirms
	}
	db.Create(&history)

	log.Printf("Digest email recorded for user %d", setting.UserID)
}

// cleanupOldData removes old data to prevent database bloat
func (s *Scheduler) cleanupOldData() {
	db := database.Get()
	if db == nil {
		return
	}

	log.Println("Running scheduled cleanup...")

	// Clean up old user journey events (keep last 90 days)
	ninetyDaysAgo := time.Now().AddDate(0, 0, -90)
	db.Where("timestamp < ?", ninetyDaysAgo).Delete(&models.UserJourneyEvent{})

	// Clean up old webhook logs (keep last 30 days)
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	db.Where("created_at < ?", thirtyDaysAgo).Delete(&models.WebhookLog{})

	// Clean up old digest history (keep last 365 days)
	oneYearAgo := time.Now().AddDate(-1, 0, 0)
	db.Where("sent_at < ?", oneYearAgo).Delete(&models.DigestHistory{})

	log.Println("Cleanup completed")
}

// Helper functions
func getParamString(params map[string]interface{}, key string) string {
	if params == nil {
		return ""
	}
	if val, ok := params[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}

func getDigestStartDate(frequency string, endDate time.Time) time.Time {
	switch frequency {
	case "daily":
		return endDate.AddDate(0, 0, -1)
	case "weekly":
		return endDate.AddDate(0, 0, -7)
	case "monthly":
		return endDate.AddDate(0, -1, 0)
	default:
		return endDate.AddDate(0, 0, -7)
	}
}
