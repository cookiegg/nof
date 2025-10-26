package repo

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/zeromicro/go-zero/core/logx"
	"github.com/zeromicro/go-zero/core/stores/redis"
	"github.com/zeromicro/go-zero/core/stores/sqlx"
	"nof0-api/internal/data"
	"nof0-api/internal/types"
)

// TTLs bundles cache durations in seconds.
type TTLs struct {
	Short  int
	Medium int
	Long   int
}

// DBRepo loads data from Postgres and caches in Redis.
// For resources not yet implemented in DB, it falls back to the file DataLoader.
type DBRepo struct {
	conn     sqlx.SqlConn
	rds      *redis.Redis
	fallback *data.DataLoader
	ttls     TTLs
}

func NewDBRepo(conn sqlx.SqlConn, rds *redis.Redis, fallback *data.DataLoader, ttls TTLs) *DBRepo {
	return &DBRepo{conn: conn, rds: rds, fallback: fallback, ttls: ttls}
}

// helper: get from redis into v
func (r *DBRepo) getCache(ctx context.Context, key string, v interface{}) (bool, error) {
	if r.rds == nil {
		return false, nil
	}
	s, err := r.rds.GetCtx(ctx, key)
	if err != nil || len(s) == 0 {
		return false, err
	}
	return json.Unmarshal([]byte(s), v) == nil, nil
}

// helper: set redis from v
func (r *DBRepo) setCache(ctx context.Context, key string, ttl int, v interface{}) {
	if r.rds == nil || ttl <= 0 {
		return
	}
	bs, err := json.Marshal(v)
	if err != nil {
		logx.WithContext(ctx).Errorf("marshal cache %s: %v", key, err)
		return
	}
	_ = r.rds.SetexCtx(ctx, key, string(bs), ttl)
}

// ================= Crypto Prices =================

type cryptoRow struct {
	Symbol    string  `db:"symbol"`
	Price     float64 `db:"price"`
	Timestamp int64   `db:"timestamp_ms"`
}

func (r *DBRepo) LoadCryptoPrices() (*types.CryptoPricesResponse, error) {
	ctx := context.Background()
	const key = "nof0:crypto_prices"
	var cached types.CryptoPricesResponse
	if ok, _ := r.getCache(ctx, key, &cached); ok {
		return &cached, nil
	}

	// Read from materialized view populated by migrations/importer
	const q = `SELECT symbol, price, timestamp_ms FROM v_crypto_prices_latest`

	var rows []cryptoRow
	if err := r.conn.QueryRowsCtx(ctx, &rows, q); err != nil {
		// Fallback to file data
		logx.WithContext(ctx).Errorf("db crypto_prices failed, falling back: %v", err)
		return r.fallback.LoadCryptoPrices()
	}

	resp := &types.CryptoPricesResponse{Prices: map[string]types.CryptoPrice{}, ServerTime: time.Now().UnixMilli()}
	for _, row := range rows {
		resp.Prices[row.Symbol] = types.CryptoPrice{Symbol: row.Symbol, Price: row.Price, Timestamp: row.Timestamp}
	}
	r.setCache(ctx, key, r.ttls.Short, resp)
	return resp, nil
}

// For the complex AccountTotals (nested positions, markers, etc.),
// we currently fall back to file data until a full schema is defined.
func (r *DBRepo) LoadAccountTotals() (*types.AccountTotalsResponse, error) {
	return r.fallback.LoadAccountTotals()
}

func (r *DBRepo) LoadTrades() (*types.TradesResponse, error) { return r.fallback.LoadTrades() }

// ======= Not yet DB-implemented: fallback to file loader =======

func (r *DBRepo) LoadSinceInception() (*types.SinceInceptionResponse, error) {
	return r.fallback.LoadSinceInception()
}

func (r *DBRepo) LoadLeaderboard() (*types.LeaderboardResponse, error) {
	return r.fallback.LoadLeaderboard()
}

func (r *DBRepo) LoadAnalytics() (*types.AnalyticsResponse, error) {
	return r.fallback.LoadAnalytics()
}

func (r *DBRepo) LoadModelAnalytics(modelId string) (*types.ModelAnalyticsResponse, error) {
	if modelId == "" {
		return nil, errors.New("modelId required")
	}
	return r.fallback.LoadModelAnalytics(modelId)
}

func (r *DBRepo) LoadPositions() (*types.PositionsResponse, error) {
	return r.fallback.LoadPositions()
}

func (r *DBRepo) LoadConversations() (*types.ConversationsResponse, error) {
	return r.fallback.LoadConversations()
}
