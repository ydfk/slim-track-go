package storage

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

const (
	defaultDBPath = "./slimtrack.db"
	dateLayout    = "2006-01-02"
	timeLayout    = time.RFC3339
)

// Repository wraps the SQLite connection that stores the weight entries.
type Repository struct {
	db *sql.DB
}

// WeightEntry models a single record persisted in the WeightEntries table.
type WeightEntry struct {
	ID        int64    `json:"id"`
	Date      string   `json:"date"`
	WeightKg  float64  `json:"weightKg"`
	WeightJin float64  `json:"weightJin"`
	WaistCm   *float64 `json:"waistCm,omitempty"`
	Note      string   `json:"note"`
	CreatedAt string   `json:"createdAt"`
	UpdatedAt string   `json:"updatedAt"`
}

// EntryInput represents the payload required to create or update an entry.
type EntryInput struct {
	Date      time.Time
	WeightJin float64
	Waist     *float64
	Note      string
	NowFunc   func() time.Time
}

// NewRepository opens (or creates) the SQLite database and returns a Repository.
func NewRepository(path string) (*Repository, error) {
	if path == "" {
		path = defaultDBPath
	}

	dir := filepath.Dir(path)
	if dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, fmt.Errorf("create db directory: %w", err)
		}
	}

	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open sqlite database: %w", err)
	}
	db.SetMaxOpenConns(1)
	db.SetConnMaxLifetime(0)

	return &Repository{db: db}, nil
}

// Close releases the underlying database connection.
func (r *Repository) Close() error {
	if r == nil || r.db == nil {
		return nil
	}
	return r.db.Close()
}

// DBPathFromEnv resolves the SQLite path using the DATABASE_PATH env or the default path.
func DBPathFromEnv() string {
	if val := strings.TrimSpace(os.Getenv("DATABASE_PATH")); val != "" {
		return val
	}
	return defaultDBPath
}

// UpsertEntry inserts or updates an entry based on its date and returns the persisted row.
func (r *Repository) UpsertEntry(ctx context.Context, input EntryInput) (*WeightEntry, error) {
	if r == nil || r.db == nil {
		return nil, errors.New("repository is not initialized")
	}
	now := time.Now
	if input.NowFunc != nil {
		now = input.NowFunc
	}

	current := now().UTC().Format(timeLayout)
	weightKg := formatDecimal(input.WeightJin/2, 2)
	weightJin := formatDecimal(input.WeightJin, 1)

	var waist interface{}
	if input.Waist != nil {
		v := formatDecimal(*input.Waist, 1)
		waist = v
	}

	note := strings.TrimSpace(input.Note)

	query := `
INSERT INTO WeightEntries (Date, WeightGongJin, WeightJin, WaistCircumference, Note, CreatedAt, UpdatedAt)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(Date) DO UPDATE SET
	WeightGongJin = excluded.WeightGongJin,
	WeightJin = excluded.WeightJin,
	WaistCircumference = excluded.WaistCircumference,
	Note = excluded.Note,
	UpdatedAt = excluded.UpdatedAt
RETURNING Id, Date, WeightGongJin, WeightJin, WaistCircumference, Note, CreatedAt, UpdatedAt;
`

	row := r.db.QueryRowContext(
		ctx,
		query,
		input.Date.Format(dateLayout),
		weightKg,
		weightJin,
		waist,
		note,
		current,
		current,
	)

	return scanEntry(row)
}

// ListEntries returns entries ordered by date descending. A limit <= 0 fetches every row.
func (r *Repository) ListEntries(ctx context.Context, limit, offset int) ([]WeightEntry, error) {
	if r == nil || r.db == nil {
		return nil, errors.New("repository is not initialized")
	}

	base := `
SELECT Id, Date, WeightGongJin, WeightJin, WaistCircumference, Note, CreatedAt, UpdatedAt
FROM WeightEntries
ORDER BY Date DESC, Id DESC`

	var (
		rows *sql.Rows
		err  error
	)

	if limit > 0 {
		query := base + " LIMIT ? OFFSET ?"
		rows, err = r.db.QueryContext(ctx, query, limit, offset)
	} else {
		rows, err = r.db.QueryContext(ctx, base)
	}
	if err != nil {
		return nil, fmt.Errorf("query entries: %w", err)
	}
	defer rows.Close()

	var entries []WeightEntry
	for rows.Next() {
		entry, err := scanEntry(rows)
		if err != nil {
			return nil, err
		}
		entries = append(entries, *entry)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate entries: %w", err)
	}

	return entries, nil
}

// CountEntries returns the total number of records in the WeightEntries table.
func (r *Repository) CountEntries(ctx context.Context) (int, error) {
	if r == nil || r.db == nil {
		return 0, errors.New("repository is not initialized")
	}

	var total int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM WeightEntries`).Scan(&total); err != nil {
		return 0, fmt.Errorf("count entries: %w", err)
	}
	return total, nil
}

func scanEntry(scanner interface {
	Scan(dest ...any) error
}) (*WeightEntry, error) {
	var (
		id                                   int64
		dateStr, weightKgStr, weightJinStr   string
		waistStr, note, createdAt, updatedAt sql.NullString
	)

	if err := scanner.Scan(&id, &dateStr, &weightKgStr, &weightJinStr, &waistStr, &note, &createdAt, &updatedAt); err != nil {
		return nil, fmt.Errorf("scan entry: %w", err)
	}

	entry := WeightEntry{
		ID:        id,
		Date:      dateStr,
		WeightKg:  parseDecimal(weightKgStr),
		WeightJin: parseDecimal(weightJinStr),
		Note:      note.String,
		CreatedAt: createdAt.String,
		UpdatedAt: updatedAt.String,
	}

	if waistStr.Valid {
		value := parseDecimal(waistStr.String)
		entry.WaistCm = &value
	}

	return &entry, nil
}

func formatDecimal(value float64, precision int) string {
	return strconv.FormatFloat(value, 'f', precision, 64)
}

func parseDecimal(value string) float64 {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0
	}
	v, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return 0
	}
	return v
}
