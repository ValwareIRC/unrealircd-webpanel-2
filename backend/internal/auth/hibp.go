package auth

import (
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// HIBPClient handles Have I Been Pwned password checks
type HIBPClient struct {
	client  *http.Client
	baseURL string
}

// HIBPResult contains the result of a password breach check
type HIBPResult struct {
	Breached bool
	Count    int
	Error    error
}

// NewHIBPClient creates a new HIBP client
func NewHIBPClient() *HIBPClient {
	return &HIBPClient{
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
		baseURL: "https://api.pwnedpasswords.com/range/",
	}
}

// CheckPassword checks if a password has been exposed in known data breaches
// using the k-anonymity model (only first 5 chars of SHA1 hash are sent)
func (h *HIBPClient) CheckPassword(password string) HIBPResult {
	// Hash the password with SHA1
	hasher := sha1.New()
	hasher.Write([]byte(password))
	hash := strings.ToUpper(hex.EncodeToString(hasher.Sum(nil)))

	// Split hash into prefix (first 5 chars) and suffix (rest)
	prefix := hash[:5]
	suffix := hash[5:]

	// Query the HIBP API with just the prefix
	resp, err := h.client.Get(h.baseURL + prefix)
	if err != nil {
		return HIBPResult{Error: fmt.Errorf("failed to check password: %w", err)}
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return HIBPResult{Error: fmt.Errorf("HIBP API returned status %d", resp.StatusCode)}
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return HIBPResult{Error: fmt.Errorf("failed to read response: %w", err)}
	}

	// Parse response - each line is "SUFFIX:COUNT"
	lines := strings.Split(string(body), "\r\n")
	for _, line := range lines {
		parts := strings.Split(line, ":")
		if len(parts) != 2 {
			continue
		}

		if strings.ToUpper(parts[0]) == suffix {
			var count int
			fmt.Sscanf(parts[1], "%d", &count)
			return HIBPResult{
				Breached: true,
				Count:    count,
			}
		}
	}

	return HIBPResult{Breached: false}
}

// Global HIBP client instance
var hibpClient = NewHIBPClient()

// CheckPasswordBreach checks if a password has been exposed in data breaches
// Returns (breached, count, error)
func CheckPasswordBreach(password string) (bool, int, error) {
	result := hibpClient.CheckPassword(password)
	return result.Breached, result.Count, result.Error
}
