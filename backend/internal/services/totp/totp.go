package totp

import (
	"crypto/rand"
	"encoding/base32"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
)

const (
	Issuer          = "UnrealIRCd Web Panel"
	BackupCodeCount = 10
	BackupCodeLen   = 8
)

// GenerateSecret creates a new TOTP secret for a user
func GenerateSecret(username string) (*otp.Key, error) {
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      Issuer,
		AccountName: username,
		Period:      30,
		SecretSize:  32,
		Digits:      otp.DigitsSix,
		Algorithm:   otp.AlgorithmSHA1,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to generate TOTP secret: %w", err)
	}
	return key, nil
}

// ValidateCode validates a TOTP code against a secret
func ValidateCode(secret, code string) bool {
	return totp.Validate(code, secret)
}

// ValidateCodeWithWindow validates with a time window for clock drift
func ValidateCodeWithWindow(secret, code string) bool {
	// Allow 1 period before and after for clock drift
	opts := totp.ValidateOpts{
		Period:    30,
		Skew:      1,
		Digits:    otp.DigitsSix,
		Algorithm: otp.AlgorithmSHA1,
	}
	valid, _ := totp.ValidateCustom(code, secret, time.Now(), opts)
	return valid
}

// GenerateBackupCodes creates a set of single-use backup codes
func GenerateBackupCodes() ([]string, error) {
	codes := make([]string, BackupCodeCount)
	for i := 0; i < BackupCodeCount; i++ {
		code, err := generateRandomCode(BackupCodeLen)
		if err != nil {
			return nil, fmt.Errorf("failed to generate backup code: %w", err)
		}
		codes[i] = code
	}
	return codes, nil
}

// generateRandomCode creates a random alphanumeric code
func generateRandomCode(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	// Use base32 for human-readable codes (no confusing chars like 0/O, 1/l)
	encoded := base32.StdEncoding.EncodeToString(bytes)
	// Take first 'length' chars and format nicely
	code := strings.ToUpper(encoded[:length])
	// Format as XXXX-XXXX
	if length == 8 {
		return code[:4] + "-" + code[4:], nil
	}
	return code, nil
}

// SerializeBackupCodes converts backup codes to JSON string
func SerializeBackupCodes(codes []string) (string, error) {
	data, err := json.Marshal(codes)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// DeserializeBackupCodes converts JSON string back to backup codes
func DeserializeBackupCodes(data string) ([]string, error) {
	if data == "" {
		return []string{}, nil
	}
	var codes []string
	if err := json.Unmarshal([]byte(data), &codes); err != nil {
		return nil, err
	}
	return codes, nil
}

// ValidateBackupCode checks if a backup code is valid and removes it if so
func ValidateBackupCode(storedCodesJSON, providedCode string) (bool, string, error) {
	codes, err := DeserializeBackupCodes(storedCodesJSON)
	if err != nil {
		return false, storedCodesJSON, err
	}

	// Normalize the provided code (remove dashes, uppercase)
	normalizedProvided := strings.ToUpper(strings.ReplaceAll(providedCode, "-", ""))

	for i, code := range codes {
		normalizedStored := strings.ToUpper(strings.ReplaceAll(code, "-", ""))
		if normalizedStored == normalizedProvided {
			// Remove the used code
			codes = append(codes[:i], codes[i+1:]...)
			newJSON, err := SerializeBackupCodes(codes)
			if err != nil {
				return false, storedCodesJSON, err
			}
			return true, newJSON, nil
		}
	}

	return false, storedCodesJSON, nil
}

// GetQRCodeURL returns a URL that can be used to generate a QR code
// This is the otpauth:// URL that authenticator apps understand
func GetQRCodeURL(key *otp.Key) string {
	return key.URL()
}

// GetSecret returns the base32-encoded secret from the key
func GetSecret(key *otp.Key) string {
	return key.Secret()
}
