package handler

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"slim-track/internal/storage"
)

const (
	dateLayout         = "2006-01-02"
	pageTitle          = "\u4f53\u91cd\u4e0e\u8170\u56f4\u8bb0\u5f55"
	invalidPayloadText = "\u8bf7\u63d0\u4f9b\u5b8c\u6574\u4e14\u6709\u6548\u7684\u8bb0\u5f55\u6570\u636e"
	saveFailedText     = "\u4fdd\u5b58\u8bb0\u5f55\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5"
)

// TrackerHandler contains all HTTP handlers for the tracker experience.
type TrackerHandler struct {
	repo *storage.Repository
}

// RegisterTrackerRoutes wires the tracker handlers with the provided Gin router.
func RegisterTrackerRoutes(r *gin.Engine, repo *storage.Repository) {
	h := &TrackerHandler{repo: repo}

	r.GET("/", h.HomePage)

	api := r.Group("/api/entries")
	{
		api.GET("", h.ListEntries)
		api.POST("", h.SaveEntry)
	}
}

// HomePage renders the main tracker UI.
func (h *TrackerHandler) HomePage(c *gin.Context) {
	c.HTML(http.StatusOK, "tracker", gin.H{
		"Title": pageTitle,
	})
}

// ListEntries returns the tracked entries in JSON.
func (h *TrackerHandler) ListEntries(c *gin.Context) {
	limit := parseLimit(c.DefaultQuery("limit", "0"))
	entries, err := h.repo.ListEntries(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"entries": entries,
	})
}

// SaveEntry creates or updates a row identified by its date.
func (h *TrackerHandler) SaveEntry(c *gin.Context) {
	var req entryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": invalidPayloadText,
		})
		return
	}

	dateValue, err := time.Parse(dateLayout, req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": errInvalidDate.Error(),
		})
		return
	}

	if err := req.Validate(); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	entry, err := h.repo.UpsertEntry(
		c.Request.Context(),
		storage.EntryInput{
			Date:      dateValue,
			WeightJin: req.WeightJin,
			Waist:     req.WaistCm,
			Note:      req.Note,
		},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": saveFailedText,
		})
		return
	}

	c.JSON(http.StatusOK, entry)
}

func parseLimit(value string) int {
	limit, err := strconv.Atoi(value)
	if err != nil || limit < 0 {
		return 0
	}
	return limit
}

type entryRequest struct {
	Date      string   `json:"date"`
	WeightJin float64  `json:"weightJin"`
	WaistCm   *float64 `json:"waistCm"`
	Note      string   `json:"note"`
}

func (r entryRequest) Validate() error {
	if r.WeightJin <= 0 {
		return errInvalidWeight
	}

	if r.WaistCm != nil && *r.WaistCm <= 0 {
		return errInvalidWaist
	}

	return nil
}

var (
	errInvalidDate   = errors.New("\u65e5\u671f\u683c\u5f0f\u5e94\u4e3a YYYY-MM-DD")
	errInvalidWeight = errors.New("\u4f53\u91cd\u5fc5\u987b\u5927\u4e8e 0")
	errInvalidWaist  = errors.New("\u8170\u56f4\u5fc5\u987b\u5927\u4e8e 0")
)
