package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/api/middleware"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/rpc"
	"github.com/ValwareIRC/unrealircd-webpanel-2/internal/utils"
)

// ServerBan represents a server ban (TKL)
type ServerBan struct {
	Name           string `json:"name"`
	Type           string `json:"type"`
	TypeString     string `json:"type_string,omitempty"`
	SetBy          string `json:"set_by,omitempty"`
	SetAt          int64  `json:"set_at,omitempty"`
	ExpireAt       int64  `json:"expire_at,omitempty"`
	Duration       string `json:"duration,omitempty"`
	Reason         string `json:"reason,omitempty"`
	SetAtString    string `json:"set_at_string,omitempty"`
	ExpireAtString string `json:"expire_at_string,omitempty"`
}

// NameBan represents a name ban (Q-Line)
type NameBan struct {
	Name     string `json:"name"`
	SetBy    string `json:"set_by,omitempty"`
	SetAt    int64  `json:"set_at,omitempty"`
	ExpireAt int64  `json:"expire_at,omitempty"`
	Duration string `json:"duration,omitempty"`
	Reason   string `json:"reason,omitempty"`
}

// BanException represents a ban exception (E-Line)
type BanException struct {
	Name           string `json:"name"`
	ExceptionTypes string `json:"exception_types,omitempty"`
	SetBy          string `json:"set_by,omitempty"`
	SetAt          int64  `json:"set_at,omitempty"`
	ExpireAt       int64  `json:"expire_at,omitempty"`
	Duration       string `json:"duration,omitempty"`
	Reason         string `json:"reason,omitempty"`
}

// Spamfilter represents a spamfilter entry
type Spamfilter struct {
	Name              string `json:"name"`
	MatchType         string `json:"match_type"`
	SpamfilterTargets string `json:"spamfilter_targets"`
	BanAction         string `json:"ban_action"`
	BanDuration       string `json:"ban_duration,omitempty"`
	SetBy             string `json:"set_by,omitempty"`
	SetAt             int64  `json:"set_at,omitempty"`
	Reason            string `json:"reason,omitempty"`
	HitCount          int    `json:"hits,omitempty"`
	HitCountOper      int    `json:"hits_except,omitempty"`
}

// GetServerBans returns all server bans
func GetServerBans(c *gin.Context) {
	manager := rpc.GetManager()

	result, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.ServerBan().GetAll()
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get server bans: " + err.Error()})
		return
	}

	bans := parseServerBanList(result)
	c.JSON(http.StatusOK, bans)
}

// AddServerBanRequest represents a server ban add request
type AddServerBanRequest struct {
	Name     string `json:"name" binding:"required"`
	Type     string `json:"type" binding:"required"` // gline, kline, zline, etc.
	Duration string `json:"duration"`
	Reason   string `json:"reason"`
}

// AddServerBan adds a server ban
func AddServerBan(c *gin.Context) {
	var req AddServerBanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	manager := rpc.GetManager()

	duration := req.Duration
	if duration == "" {
		duration = "0" // Permanent
	}

	reason := req.Reason
	if reason == "" {
		reason = "No reason specified"
	}

	_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.ServerBan().Add(req.Name, req.Type, duration, reason)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add ban: " + err.Error()})
		return
	}

	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		logAction(c, currentUser, "add_server_ban", map[string]string{
			"name":     req.Name,
			"type":     req.Type,
			"duration": duration,
			"reason":   reason,
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Server ban added successfully"})
}

// DeleteServerBanRequest represents a server ban delete request
type DeleteServerBanRequest struct {
	Name string `json:"name" binding:"required"`
	Type string `json:"type" binding:"required"`
}

// DeleteServerBan removes a server ban
func DeleteServerBan(c *gin.Context) {
	var req DeleteServerBanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	manager := rpc.GetManager()

	_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.ServerBan().Delete(req.Name, req.Type)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete ban: " + err.Error()})
		return
	}

	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		logAction(c, currentUser, "delete_server_ban", map[string]string{
			"name": req.Name,
			"type": req.Type,
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Server ban removed successfully"})
}

// GetNameBans returns all name bans (Q-Lines)
func GetNameBans(c *gin.Context) {
	manager := rpc.GetManager()

	result, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.NameBan().GetAll()
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get name bans: " + err.Error()})
		return
	}

	bans := parseNameBanList(result)
	c.JSON(http.StatusOK, bans)
}

// AddNameBanRequest represents a name ban add request
type AddNameBanRequest struct {
	Name     string `json:"name" binding:"required"`
	Duration string `json:"duration"`
	Reason   string `json:"reason" binding:"required"`
}

// AddNameBan adds a name ban
func AddNameBan(c *gin.Context) {
	var req AddNameBanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	manager := rpc.GetManager()

	var duration *string
	if req.Duration != "" {
		duration = &req.Duration
	}

	_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.NameBan().Add(req.Name, req.Reason, duration, nil)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add name ban: " + err.Error()})
		return
	}

	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		logAction(c, currentUser, "add_name_ban", map[string]string{
			"name":   req.Name,
			"reason": req.Reason,
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Name ban added successfully"})
}

// DeleteNameBan removes a name ban
func DeleteNameBan(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return
	}

	manager := rpc.GetManager()

	_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.NameBan().Delete(name)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete name ban: " + err.Error()})
		return
	}

	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		logAction(c, currentUser, "delete_name_ban", map[string]string{
			"name": name,
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Name ban removed successfully"})
}

// GetBanExceptions returns all ban exceptions (E-Lines)
func GetBanExceptions(c *gin.Context) {
	manager := rpc.GetManager()

	result, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.ServerBanException().GetAll()
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get ban exceptions: " + err.Error()})
		return
	}

	exceptions := parseBanExceptionList(result)
	c.JSON(http.StatusOK, exceptions)
}

// AddBanExceptionRequest represents a ban exception add request
type AddBanExceptionRequest struct {
	Name           string `json:"name" binding:"required"`
	ExceptionTypes string `json:"exception_types" binding:"required"`
	Duration       string `json:"duration"`
	Reason         string `json:"reason" binding:"required"`
}

// AddBanException adds a ban exception
func AddBanException(c *gin.Context) {
	var req AddBanExceptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	manager := rpc.GetManager()

	var duration *string
	if req.Duration != "" {
		duration = &req.Duration
	}

	_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.ServerBanException().Add(req.Name, req.ExceptionTypes, req.Reason, nil, duration)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add ban exception: " + err.Error()})
		return
	}

	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		logAction(c, currentUser, "add_ban_exception", map[string]string{
			"name":   req.Name,
			"reason": req.Reason,
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ban exception added successfully"})
}

// DeleteBanException removes a ban exception
func DeleteBanException(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return
	}

	manager := rpc.GetManager()

	_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.ServerBanException().Delete(name)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete ban exception: " + err.Error()})
		return
	}

	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		logAction(c, currentUser, "delete_ban_exception", map[string]string{
			"name": name,
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ban exception removed successfully"})
}

// GetSpamfilters returns all spamfilters
func GetSpamfilters(c *gin.Context) {
	manager := rpc.GetManager()

	result, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Spamfilter().GetAll()
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get spamfilters: " + err.Error()})
		return
	}

	filters := parseSpamfilterList(result)
	c.JSON(http.StatusOK, filters)
}

// AddSpamfilterRequest represents a spamfilter add request
type AddSpamfilterRequest struct {
	Name              string `json:"name" binding:"required"`
	MatchType         string `json:"match_type" binding:"required"`
	SpamfilterTargets string `json:"spamfilter_targets" binding:"required"`
	BanAction         string `json:"ban_action" binding:"required"`
	BanDuration       string `json:"ban_duration"`
	Reason            string `json:"reason" binding:"required"`
}

// AddSpamfilter adds a spamfilter
func AddSpamfilter(c *gin.Context) {
	var req AddSpamfilterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	manager := rpc.GetManager()

	duration := req.BanDuration
	if duration == "" {
		duration = "0"
	}

	_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Spamfilter().Add(req.Name, req.MatchType, req.SpamfilterTargets, req.BanAction, duration, req.Reason)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add spamfilter: " + err.Error()})
		return
	}

	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		logAction(c, currentUser, "add_spamfilter", map[string]string{
			"name":       req.Name,
			"match_type": req.MatchType,
			"action":     req.BanAction,
			"reason":     req.Reason,
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Spamfilter added successfully"})
}

// DeleteSpamfilterRequest represents a spamfilter delete request
type DeleteSpamfilterRequest struct {
	Name              string `json:"name" binding:"required"`
	MatchType         string `json:"match_type" binding:"required"`
	SpamfilterTargets string `json:"spamfilter_targets" binding:"required"`
	BanAction         string `json:"ban_action" binding:"required"`
}

// DeleteSpamfilter removes a spamfilter
func DeleteSpamfilter(c *gin.Context) {
	var req DeleteSpamfilterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	manager := rpc.GetManager()

	_, err := manager.WithRetry(func(client *rpc.Client) (interface{}, error) {
		return client.Spamfilter().Delete(req.Name, req.MatchType, req.SpamfilterTargets, req.BanAction)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete spamfilter: " + err.Error()})
		return
	}

	currentUser := middleware.GetCurrentUser(c)
	if currentUser != nil {
		logAction(c, currentUser, "delete_spamfilter", map[string]string{
			"name":       req.Name,
			"match_type": req.MatchType,
			"action":     req.BanAction,
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Spamfilter removed successfully"})
}

// Helper functions

func parseServerBanList(result interface{}) []ServerBan {
	bans := make([]ServerBan, 0)

	list := utils.InterfaceToSlice(result)
	for _, item := range list {
		if ban := parseServerBan(item); ban != nil {
			bans = append(bans, *ban)
		}
	}

	return bans
}

func parseServerBan(result interface{}) *ServerBan {
	m := utils.InterfaceToMap(result)
	if m == nil {
		return nil
	}

	return &ServerBan{
		Name:           utils.SafeMapGetString(m, "name"),
		Type:           utils.SafeMapGetString(m, "type"),
		TypeString:     utils.SafeMapGetString(m, "type_string"),
		SetBy:          utils.SafeMapGetString(m, "set_by"),
		SetAt:          int64(utils.SafeMapGetInt(m, "set_at")),
		ExpireAt:       int64(utils.SafeMapGetInt(m, "expire_at")),
		Duration:       utils.SafeMapGetString(m, "duration_string"),
		Reason:         utils.SafeMapGetString(m, "reason"),
		SetAtString:    utils.SafeMapGetString(m, "set_at_string"),
		ExpireAtString: utils.SafeMapGetString(m, "expire_at_string"),
	}
}

func parseNameBanList(result interface{}) []NameBan {
	bans := make([]NameBan, 0)

	list := utils.InterfaceToSlice(result)
	for _, item := range list {
		if ban := parseNameBan(item); ban != nil {
			bans = append(bans, *ban)
		}
	}

	return bans
}

func parseNameBan(result interface{}) *NameBan {
	m := utils.InterfaceToMap(result)
	if m == nil {
		return nil
	}

	return &NameBan{
		Name:     utils.SafeMapGetString(m, "name"),
		SetBy:    utils.SafeMapGetString(m, "set_by"),
		SetAt:    int64(utils.SafeMapGetInt(m, "set_at")),
		ExpireAt: int64(utils.SafeMapGetInt(m, "expire_at")),
		Duration: utils.SafeMapGetString(m, "duration_string"),
		Reason:   utils.SafeMapGetString(m, "reason"),
	}
}

func parseBanExceptionList(result interface{}) []BanException {
	exceptions := make([]BanException, 0)

	list := utils.InterfaceToSlice(result)
	for _, item := range list {
		if exc := parseBanException(item); exc != nil {
			exceptions = append(exceptions, *exc)
		}
	}

	return exceptions
}

func parseBanException(result interface{}) *BanException {
	m := utils.InterfaceToMap(result)
	if m == nil {
		return nil
	}

	return &BanException{
		Name:           utils.SafeMapGetString(m, "name"),
		ExceptionTypes: utils.SafeMapGetString(m, "exception_types"),
		SetBy:          utils.SafeMapGetString(m, "set_by"),
		SetAt:          int64(utils.SafeMapGetInt(m, "set_at")),
		ExpireAt:       int64(utils.SafeMapGetInt(m, "expire_at")),
		Duration:       utils.SafeMapGetString(m, "duration_string"),
		Reason:         utils.SafeMapGetString(m, "reason"),
	}
}

func parseSpamfilterList(result interface{}) []Spamfilter {
	filters := make([]Spamfilter, 0)

	list := utils.InterfaceToSlice(result)
	for _, item := range list {
		if sf := parseSpamfilter(item); sf != nil {
			filters = append(filters, *sf)
		}
	}

	return filters
}

func parseSpamfilter(result interface{}) *Spamfilter {
	m := utils.InterfaceToMap(result)
	if m == nil {
		return nil
	}

	return &Spamfilter{
		Name:              utils.SafeMapGetString(m, "name"),
		MatchType:         utils.SafeMapGetString(m, "match_type"),
		SpamfilterTargets: utils.SafeMapGetString(m, "spamfilter_targets"),
		BanAction:         utils.SafeMapGetString(m, "ban_action"),
		BanDuration:       utils.SafeMapGetString(m, "ban_duration_string"),
		SetBy:             utils.SafeMapGetString(m, "set_by"),
		SetAt:             int64(utils.SafeMapGetInt(m, "set_at")),
		Reason:            utils.SafeMapGetString(m, "reason"),
		HitCount:          utils.SafeMapGetInt(m, "hits"),
		HitCountOper:      utils.SafeMapGetInt(m, "hits_except"),
	}
}
