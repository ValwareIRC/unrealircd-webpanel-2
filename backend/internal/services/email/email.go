package email

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"strings"
	"sync"

	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/database/models"
)

var (
	instance *Service
	once     sync.Once
)

// Service handles email sending
type Service struct {
	settings *models.SmtpSettings
	mu       sync.RWMutex
}

// GetService returns the singleton email service
func GetService() *Service {
	once.Do(func() {
		instance = &Service{}
		instance.loadSettings()
	})
	return instance
}

// loadSettings loads SMTP settings from the database
func (s *Service) loadSettings() {
	s.mu.Lock()
	defer s.mu.Unlock()

	db := database.Get()
	if db == nil {
		return
	}

	var settings models.SmtpSettings
	if err := db.First(&settings).Error; err != nil {
		// No settings configured yet
		s.settings = nil
		return
	}

	s.settings = &settings
}

// RefreshSettings reloads SMTP settings from the database
func (s *Service) RefreshSettings() {
	s.loadSettings()
}

// IsConfigured returns true if SMTP is configured and enabled
func (s *Service) IsConfigured() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.settings != nil && s.settings.Enabled && s.settings.Host != ""
}

// GetSettings returns the current SMTP settings (without password)
func (s *Service) GetSettings() *models.SmtpSettings {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.settings == nil {
		return nil
	}

	// Return a copy without the password
	return &models.SmtpSettings{
		ID:          s.settings.ID,
		UpdatedAt:   s.settings.UpdatedAt,
		Host:        s.settings.Host,
		Port:        s.settings.Port,
		Username:    s.settings.Username,
		FromAddress: s.settings.FromAddress,
		FromName:    s.settings.FromName,
		UseTLS:      s.settings.UseTLS,
		UseStartTLS: s.settings.UseStartTLS,
		Enabled:     s.settings.Enabled,
	}
}

// SendEmail sends an email using the configured SMTP settings
func (s *Service) SendEmail(to, subject, body string) error {
	s.mu.RLock()
	settings := s.settings
	s.mu.RUnlock()

	if settings == nil || !settings.Enabled {
		return fmt.Errorf("SMTP is not configured or disabled")
	}

	return s.sendWithSettings(settings, to, subject, body)
}

// SendTestEmail sends a test email to verify SMTP settings
func (s *Service) SendTestEmail(settings *models.SmtpSettings, to string) error {
	return s.sendWithSettings(settings, to, "UnrealIRCd Webpanel - Test Email",
		"This is a test email from UnrealIRCd Webpanel.\n\nIf you received this email, your SMTP settings are configured correctly.")
}

// sendWithSettings sends an email using the provided settings
func (s *Service) sendWithSettings(settings *models.SmtpSettings, to, subject, body string) error {
	if settings.Host == "" {
		return fmt.Errorf("SMTP host is not configured")
	}

	// Construct the email
	from := settings.FromAddress
	if settings.FromName != "" {
		from = fmt.Sprintf("%s <%s>", settings.FromName, settings.FromAddress)
	}

	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		from, to, subject, body)

	addr := fmt.Sprintf("%s:%d", settings.Host, settings.Port)

	// Setup auth if credentials provided
	var auth smtp.Auth
	if settings.Username != "" && settings.Password != "" {
		auth = smtp.PlainAuth("", settings.Username, settings.Password, settings.Host)
	}

	// Connect based on TLS settings
	if settings.UseTLS {
		// Direct TLS connection (typically port 465)
		return s.sendTLS(addr, settings.Host, auth, settings.FromAddress, to, []byte(msg))
	} else if settings.UseStartTLS {
		// STARTTLS connection (typically port 587)
		return s.sendStartTLS(addr, settings.Host, auth, settings.FromAddress, to, []byte(msg))
	} else {
		// Plain SMTP (not recommended, typically port 25)
		return smtp.SendMail(addr, auth, settings.FromAddress, []string{to}, []byte(msg))
	}
}

// sendTLS sends an email using direct TLS connection
func (s *Service) sendTLS(addr, host string, auth smtp.Auth, from, to string, msg []byte) error {
	tlsConfig := &tls.Config{
		ServerName: host,
	}

	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return fmt.Errorf("failed to connect with TLS: %w", err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return fmt.Errorf("failed to create SMTP client: %w", err)
	}
	defer client.Close()

	if auth != nil {
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("SMTP authentication failed: %w", err)
		}
	}

	if err := client.Mail(from); err != nil {
		return fmt.Errorf("MAIL FROM failed: %w", err)
	}

	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("RCPT TO failed: %w", err)
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("DATA failed: %w", err)
	}

	_, err = w.Write(msg)
	if err != nil {
		return fmt.Errorf("failed to write message: %w", err)
	}

	err = w.Close()
	if err != nil {
		return fmt.Errorf("failed to close message: %w", err)
	}

	return client.Quit()
}

// sendStartTLS sends an email using STARTTLS
func (s *Service) sendStartTLS(addr, host string, auth smtp.Auth, from, to string, msg []byte) error {
	client, err := smtp.Dial(addr)
	if err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}
	defer client.Close()

	// Check if server supports STARTTLS
	if ok, _ := client.Extension("STARTTLS"); ok {
		tlsConfig := &tls.Config{
			ServerName: host,
		}
		if err := client.StartTLS(tlsConfig); err != nil {
			return fmt.Errorf("STARTTLS failed: %w", err)
		}
	}

	if auth != nil {
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("SMTP authentication failed: %w", err)
		}
	}

	if err := client.Mail(from); err != nil {
		return fmt.Errorf("MAIL FROM failed: %w", err)
	}

	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("RCPT TO failed: %w", err)
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("DATA failed: %w", err)
	}

	_, err = w.Write(msg)
	if err != nil {
		return fmt.Errorf("failed to write message: %w", err)
	}

	err = w.Close()
	if err != nil {
		return fmt.Errorf("failed to close message: %w", err)
	}

	return client.Quit()
}

// FormatNotificationEmail formats a notification email for an IRC event
func FormatNotificationEmail(eventType, eventID, message string, timestamp string) (subject, body string) {
	// Map event types to human-readable names
	eventNames := map[string]string{
		"OPER_SUCCESS":            "IRC Operator Authentication",
		"OPER_FAILED":             "Failed IRC Operator Authentication",
		"SPAMFILTER_MATCH":        "Spamfilter Match",
		"OPEROVERRIDE":            "Oper Override",
		"SERVER_LINKED":           "Server Linked",
		"LINK_DISCONNECTED":       "Server Disconnected",
		"LINK_DENIED":             "Server Link Denied",
		"NICK_COLLISION":          "Nick Collision",
		"LOCAL_CLIENT_CONNECT":    "User Connected",
		"LOCAL_CLIENT_DISCONNECT": "User Disconnected",
		"KILL_COMMAND":            "User Killed",
		"TKL_ADD":                 "Ban Added",
		"TKL_DEL":                 "Ban Removed",
		"TKL_EXPIRE":              "Ban Expired",
		"FLOOD_BLOCKED":           "Flood Blocked",
		"CONNTHROTTLE_ACTIVATED":  "Connection Throttle Activated",
		"CONFIG_ERROR":            "Configuration Error",
		"CONFIG_LOADED":           "Configuration Loaded",
		"TLS_CERT_EXPIRING":       "TLS Certificate Expiring",
		"UNREALIRCD_RESTARTING":   "Server Restarting",
	}

	eventName := eventID
	if name, ok := eventNames[eventID]; ok {
		eventName = name
	}

	subject = fmt.Sprintf("[UnrealIRCd] %s", eventName)

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Event: %s\n", eventName))
	sb.WriteString(fmt.Sprintf("Event ID: %s\n", eventID))
	sb.WriteString(fmt.Sprintf("Time: %s\n", timestamp))
	sb.WriteString(fmt.Sprintf("\nMessage:\n%s\n", message))
	sb.WriteString("\n---\nThis notification was sent by UnrealIRCd Webpanel.")

	body = sb.String()
	return
}
