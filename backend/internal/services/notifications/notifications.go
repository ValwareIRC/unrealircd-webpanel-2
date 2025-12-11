package notifications

import (
	"encoding/json"
	"strings"
	"sync"

	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/handlers"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/hooks"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/services/email"
)

var (
	instance *Service
	once     sync.Once
)

// Service handles notification processing
type Service struct {
	emailService *email.Service
}

// GetService returns the singleton notification service
func GetService() *Service {
	once.Do(func() {
		instance = &Service{
			emailService: email.GetService(),
		}
	})
	return instance
}

// Initialize registers the notification hooks
func Initialize() {
	service := GetService()

	// Register the webhook received hook
	hooks.RegisterWithPriority(hooks.HookWebhookReceived, "email_notifications", func(args interface{}) interface{} {
		if data, ok := args.(*handlers.WebhookEventData); ok {
			service.processWebhookEvent(data)
		}
		return args
	}, 100)
}

// processWebhookEvent processes a webhook event and sends notifications
func (s *Service) processWebhookEvent(data *handlers.WebhookEventData) {
	if data == nil || data.Event == nil || data.Log == nil {
		return
	}

	// Check if email is configured
	if !s.emailService.IsConfigured() {
		return
	}

	eventID := data.Event.EventID
	if eventID == "" {
		return
	}

	// Normalize event ID for matching
	// UnrealIRCd can send events like "LOCAL_CLIENT_CONNECT" that match our NotifyClientConnect
	normalizedEventID := normalizeEventID(eventID)

	// Get all users who want notifications for this event type
	users := s.getUsersForEvent(normalizedEventID)

	// Send emails to each user
	for _, user := range users {
		emailAddr := user.Email
		if user.OverrideEmail != "" {
			emailAddr = user.OverrideEmail
		}

		if emailAddr == "" {
			continue
		}

		subject, body := email.FormatNotificationEmail(
			data.Event.Subsystem,
			eventID,
			data.Event.Msg,
			data.Event.Timestamp,
		)

		// Send email (async to not block webhook response)
		go func(to, subj, content string) {
			_ = s.emailService.SendEmail(to, subj, content)
		}(emailAddr, subject, body)
	}
}

// userNotification holds user info for notification
type userNotification struct {
	UserID        uint
	Email         string
	OverrideEmail string
}

// getUsersForEvent returns users who want notifications for the given event type
func (s *Service) getUsersForEvent(eventID string) []userNotification {
	db := database.Get()
	if db == nil {
		return nil
	}

	// Get all enabled notification preferences
	var prefs []models.UserNotificationPreference
	if err := db.Where("enabled = ?", true).Find(&prefs).Error; err != nil {
		return nil
	}

	var result []userNotification

	for _, pref := range prefs {
		// Parse the events JSON
		var enabledEvents []string
		if err := json.Unmarshal([]byte(pref.Events), &enabledEvents); err != nil {
			continue
		}

		// Check if this event is enabled for this user
		for _, ev := range enabledEvents {
			if ev == eventID {
				// Get the user's email
				var user models.User
				if err := db.First(&user, pref.UserID).Error; err != nil {
					continue
				}

				result = append(result, userNotification{
					UserID:        pref.UserID,
					Email:         user.Email,
					OverrideEmail: pref.Email,
				})
				break
			}
		}
	}

	return result
}

// normalizeEventID normalizes event IDs for matching
// UnrealIRCd sends event IDs like "LOCAL_CLIENT_CONNECT" which we need to match
func normalizeEventID(eventID string) string {
	// Most event IDs are already in the format we use
	// But some may have variations, so we normalize them

	// Handle OPEROVERRIDE variants
	if strings.HasPrefix(eventID, "OPEROVERRIDE_") {
		return "OPEROVERRIDE"
	}

	// Handle LINK variants
	if strings.HasPrefix(eventID, "LINK_DENIED_") {
		return "LINK_DENIED"
	}

	// Handle CONFIG variants
	if strings.HasPrefix(eventID, "CONFIG_ERROR") || eventID == "CONFIG_NOT_LOADED" {
		return "CONFIG_ERROR"
	}

	return eventID
}

// GetNotificationEventTypes returns all available notification event types
func GetNotificationEventTypes() []struct {
	Type        string `json:"type"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Category    string `json:"category"`
	HighVolume  bool   `json:"high_volume"`
} {
	var result []struct {
		Type        string `json:"type"`
		Name        string `json:"name"`
		Description string `json:"description"`
		Category    string `json:"category"`
		HighVolume  bool   `json:"high_volume"`
	}

	for _, et := range models.NotificationEventTypes {
		result = append(result, struct {
			Type        string `json:"type"`
			Name        string `json:"name"`
			Description string `json:"description"`
			Category    string `json:"category"`
			HighVolume  bool   `json:"high_volume"`
		}{
			Type:        string(et.Type),
			Name:        et.Name,
			Description: et.Description,
			Category:    et.Category,
			HighVolume:  et.HighVolume,
		})
	}

	return result
}
