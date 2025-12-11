package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
	"strings"
)

// Encrypt encrypts a string using AES-256-GCM
func Encrypt(plaintext, key string) (string, error) {
	keyBytes := []byte(key)
	if len(keyBytes) < 32 {
		// Pad key to 32 bytes
		padded := make([]byte, 32)
		copy(padded, keyBytes)
		keyBytes = padded
	} else if len(keyBytes) > 32 {
		keyBytes = keyBytes[:32]
	}

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, aesGCM.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := aesGCM.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts a string encrypted with Encrypt
func Decrypt(ciphertext, key string) (string, error) {
	keyBytes := []byte(key)
	if len(keyBytes) < 32 {
		// Pad key to 32 bytes
		padded := make([]byte, 32)
		copy(padded, keyBytes)
		keyBytes = padded
	} else if len(keyBytes) > 32 {
		keyBytes = keyBytes[:32]
	}

	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := aesGCM.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertextBytes := data[:nonceSize], data[nonceSize:]
	plaintext, err := aesGCM.Open(nil, nonce, ciphertextBytes, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// ParseDuration parses a duration string like "1d", "2h", "30m", "1w", etc.
func ParseDuration(s string) string {
	s = strings.TrimSpace(s)
	if s == "" || s == "0" {
		return "0" // Permanent
	}
	return s
}

// TruncateString truncates a string to max length with ellipsis
func TruncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	if maxLen <= 3 {
		return s[:maxLen]
	}
	return s[:maxLen-3] + "..."
}

// SafeMapGet safely gets a value from a map[string]interface{}
func SafeMapGet(m map[string]interface{}, key string) interface{} {
	if m == nil {
		return nil
	}
	return m[key]
}

// SafeMapGetString safely gets a string from a map[string]interface{}
func SafeMapGetString(m map[string]interface{}, key string) string {
	if m == nil {
		return ""
	}
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

// SafeMapGetInt safely gets an int from a map[string]interface{}
func SafeMapGetInt(m map[string]interface{}, key string) int {
	if m == nil {
		return 0
	}
	if v, ok := m[key]; ok {
		switch n := v.(type) {
		case int:
			return n
		case int64:
			return int(n)
		case float64:
			return int(n)
		}
	}
	return 0
}

// SafeMapGetBool safely gets a bool from a map[string]interface{}
func SafeMapGetBool(m map[string]interface{}, key string) bool {
	if m == nil {
		return false
	}
	if v, ok := m[key]; ok {
		if b, ok := v.(bool); ok {
			return b
		}
	}
	return false
}

// SafeMapGetMap safely gets a nested map from a map[string]interface{}
func SafeMapGetMap(m map[string]interface{}, key string) map[string]interface{} {
	if m == nil {
		return nil
	}
	if v, ok := m[key]; ok {
		if nested, ok := v.(map[string]interface{}); ok {
			return nested
		}
	}
	return nil
}

// SafeMapGetSlice safely gets a slice from a map[string]interface{}
func SafeMapGetSlice(m map[string]interface{}, key string) []interface{} {
	if m == nil {
		return nil
	}
	if v, ok := m[key]; ok {
		if slice, ok := v.([]interface{}); ok {
			return slice
		}
	}
	return nil
}

// InterfaceSliceToStringSlice converts []interface{} to []string
func InterfaceSliceToStringSlice(slice []interface{}) []string {
	result := make([]string, 0, len(slice))
	for _, v := range slice {
		if s, ok := v.(string); ok {
			result = append(result, s)
		}
	}
	return result
}

// InterfaceToMap converts an interface{} to map[string]interface{}
func InterfaceToMap(v interface{}) map[string]interface{} {
	if m, ok := v.(map[string]interface{}); ok {
		return m
	}
	return nil
}

// InterfaceToSlice converts an interface{} to []interface{}
func InterfaceToSlice(v interface{}) []interface{} {
	if s, ok := v.([]interface{}); ok {
		return s
	}
	return nil
}

// FormatNumber formats an integer with thousand separators
func FormatNumber(n int) string {
	if n < 1000 {
		return strings.TrimLeft(strings.Replace(strings.Replace(strings.Replace(
			"000"+itoa(n), "000", "", 1), "00", "", 1), "0", "", 1), "0")
	}
	return itoa(n)
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	if n < 0 {
		return "-" + itoa(-n)
	}

	digits := ""
	for n > 0 {
		digits = string(rune('0'+n%10)) + digits
		n /= 10
	}

	// Add commas
	result := ""
	for i, c := range digits {
		if i > 0 && (len(digits)-i)%3 == 0 {
			result += ","
		}
		result += string(c)
	}
	return result
}
