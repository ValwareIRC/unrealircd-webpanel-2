package handlers

import (
	"net/http"
	"sort"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/rpc"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/utils"
)

// TLSStats represents TLS usage statistics
type TLSStats struct {
	TotalUsers         int            `json:"total_users"`
	TLSUsers           int            `json:"tls_users"`
	PlainUsers         int            `json:"plain_users"`
	TLSPercentage      float64        `json:"tls_percentage"`
	CipherUsage        map[string]int `json:"cipher_usage"`
	UniqueFingerprints int            `json:"unique_fingerprints"`
}

// TLSUserInfo represents TLS info for a specific user
type TLSUserInfo struct {
	Nick     string `json:"nick"`
	Ident    string `json:"ident"`
	Hostname string `json:"hostname"`
	RealHost string `json:"real_host,omitempty"`
	Cipher   string `json:"cipher,omitempty"`
	CertFP   string `json:"certfp,omitempty"`
	HasTLS   bool   `json:"has_tls"`
	Server   string `json:"server,omitempty"`
}

// CertFPGroup represents users sharing a certificate fingerprint
type CertFPGroup struct {
	Fingerprint string        `json:"fingerprint"`
	Users       []TLSUserInfo `json:"users"`
	Count       int           `json:"count"`
}

// GetTLSStats returns TLS usage statistics
func GetTLSStats(c *gin.Context) {
	manager := rpc.GetManager()

	// Get all users
	result, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.User().GetAll(4)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get users: " + err.Error()})
		return
	}

	users := utils.InterfaceToSlice(result)

	stats := TLSStats{
		CipherUsage: make(map[string]int),
	}
	fingerprints := make(map[string]bool)

	for _, u := range users {
		uMap := utils.InterfaceToMap(u)
		if uMap == nil {
			continue
		}

		stats.TotalUsers++

		// Check for TLS info
		if tlsData := utils.InterfaceToMap(uMap["tls"]); tlsData != nil {
			stats.TLSUsers++

			cipher := utils.SafeMapGetString(tlsData, "cipher")
			if cipher != "" {
				stats.CipherUsage[cipher]++
			}

			certfp := utils.SafeMapGetString(tlsData, "certfp")
			if certfp != "" {
				fingerprints[certfp] = true
			}
		} else {
			stats.PlainUsers++
		}
	}

	stats.UniqueFingerprints = len(fingerprints)
	if stats.TotalUsers > 0 {
		stats.TLSPercentage = float64(stats.TLSUsers) / float64(stats.TotalUsers) * 100
	}

	c.JSON(http.StatusOK, stats)
}

// GetTLSUsers returns users with TLS information
func GetTLSUsers(c *gin.Context) {
	manager := rpc.GetManager()
	tlsOnly := c.Query("tls_only") == "true"
	plainOnly := c.Query("plain_only") == "true"

	// Get all users
	result, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.User().GetAll(4)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get users: " + err.Error()})
		return
	}

	users := utils.InterfaceToSlice(result)
	var tlsUsers []TLSUserInfo

	for _, u := range users {
		uMap := utils.InterfaceToMap(u)
		if uMap == nil {
			continue
		}

		hasTLS := false
		cipher := ""
		certfp := ""

		if tlsData := utils.InterfaceToMap(uMap["tls"]); tlsData != nil {
			hasTLS = true
			cipher = utils.SafeMapGetString(tlsData, "cipher")
			certfp = utils.SafeMapGetString(tlsData, "certfp")
		}

		// Filter based on query params
		if tlsOnly && !hasTLS {
			continue
		}
		if plainOnly && hasTLS {
			continue
		}

		userInfo := TLSUserInfo{
			Nick:     utils.SafeMapGetString(uMap, "name"),
			Ident:    utils.SafeMapGetString(uMap, "id"),
			Hostname: utils.SafeMapGetString(uMap, "hostname"),
			RealHost: utils.SafeMapGetString(uMap, "ip"),
			Cipher:   cipher,
			CertFP:   certfp,
			HasTLS:   hasTLS,
		}

		// Get server info
		if srvData := utils.InterfaceToMap(uMap["server"]); srvData != nil {
			userInfo.Server = utils.SafeMapGetString(srvData, "name")
		}

		tlsUsers = append(tlsUsers, userInfo)
	}

	c.JSON(http.StatusOK, tlsUsers)
}

// GetCertFPGroups returns users grouped by certificate fingerprint
func GetCertFPGroups(c *gin.Context) {
	manager := rpc.GetManager()

	// Get all users
	result, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.User().GetAll(4)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get users: " + err.Error()})
		return
	}

	users := utils.InterfaceToSlice(result)
	fpGroups := make(map[string][]TLSUserInfo)

	for _, u := range users {
		uMap := utils.InterfaceToMap(u)
		if uMap == nil {
			continue
		}

		if tlsData := utils.InterfaceToMap(uMap["tls"]); tlsData != nil {
			certfp := utils.SafeMapGetString(tlsData, "certfp")
			if certfp == "" {
				continue
			}

			userInfo := TLSUserInfo{
				Nick:     utils.SafeMapGetString(uMap, "name"),
				Ident:    utils.SafeMapGetString(uMap, "id"),
				Hostname: utils.SafeMapGetString(uMap, "hostname"),
				Cipher:   utils.SafeMapGetString(tlsData, "cipher"),
				CertFP:   certfp,
				HasTLS:   true,
			}

			if srvData := utils.InterfaceToMap(uMap["server"]); srvData != nil {
				userInfo.Server = utils.SafeMapGetString(srvData, "name")
			}

			fpGroups[certfp] = append(fpGroups[certfp], userInfo)
		}
	}

	// Convert to slice and sort by count
	var groups []CertFPGroup
	for fp, users := range fpGroups {
		groups = append(groups, CertFPGroup{
			Fingerprint: fp,
			Users:       users,
			Count:       len(users),
		})
	}

	sort.Slice(groups, func(i, j int) bool {
		return groups[i].Count > groups[j].Count
	})

	c.JSON(http.StatusOK, groups)
}

// GetCipherStats returns detailed cipher usage statistics
func GetCipherStats(c *gin.Context) {
	manager := rpc.GetManager()

	// Get all users
	result, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.User().GetAll(4)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get users: " + err.Error()})
		return
	}

	users := utils.InterfaceToSlice(result)

	type CipherInfo struct {
		Cipher string   `json:"cipher"`
		Count  int      `json:"count"`
		Users  []string `json:"users,omitempty"`
	}

	cipherMap := make(map[string][]string)

	for _, u := range users {
		uMap := utils.InterfaceToMap(u)
		if uMap == nil {
			continue
		}

		if tlsData := utils.InterfaceToMap(uMap["tls"]); tlsData != nil {
			cipher := utils.SafeMapGetString(tlsData, "cipher")
			if cipher == "" {
				cipher = "Unknown"
			}
			nick := utils.SafeMapGetString(uMap, "name")
			cipherMap[cipher] = append(cipherMap[cipher], nick)
		}
	}

	var ciphers []CipherInfo
	for cipher, users := range cipherMap {
		ciphers = append(ciphers, CipherInfo{
			Cipher: cipher,
			Count:  len(users),
			Users:  users,
		})
	}

	sort.Slice(ciphers, func(i, j int) bool {
		return ciphers[i].Count > ciphers[j].Count
	})

	c.JSON(http.StatusOK, ciphers)
}
