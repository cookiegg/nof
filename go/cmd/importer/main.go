package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/zeromicro/go-zero/core/logx"
	"github.com/zeromicro/go-zero/core/stores/sqlx"

	"nof0-api/internal/data"
	// internal types for mapping JSON to DB rows
	"nof0-api/internal/types"
)

func main() {
	var (
		dsn      string
		dataPath string
		truncate bool
	)
	flag.StringVar(&dsn, "dsn", "postgres://nof0:nof0@localhost:5432/nof0?sslmode=disable", "Postgres DSN")
	flag.StringVar(&dataPath, "data", "../mcp/data", "Path to MCP data directory")
	flag.BoolVar(&truncate, "truncate", false, "Truncate destination tables before import")
	flag.Parse()

	ctx := context.Background()
	conn := sqlx.NewSqlConn("pgx", dsn)
	logx.Infof("connecting to %s", dsn)

	if truncate {
		mustExec(ctx, conn, `TRUNCATE TABLE conversation_messages, conversations, model_analytics, trades, positions, account_equity_snapshots, accounts, price_ticks, price_latest, symbols, models RESTART IDENTITY CASCADE`)
	}

	// Use existing DataLoader to parse JSON
	dl := data.NewDataLoader(dataPath)

	// Collect models and symbols encountered for upsert
	modelSet := map[string]struct{}{}
	symbolSet := map[string]struct{}{}

	// 1) Crypto prices -> price_latest (+symbols)
	if resp, err := dl.LoadCryptoPrices(); err == nil {
		for sym, p := range resp.Prices {
			symbolSet[sym] = struct{}{}
			upsertSymbol(ctx, conn, sym)
			upsertPriceLatest(ctx, conn, sym, p.Price, p.Timestamp)
		}
		log.Printf("imported crypto prices: %d symbols", len(resp.Prices))
	} else {
		log.Printf("skip crypto prices: %v", err)
	}

	// 2) Since inception: current JSON不包含时间序列，跳过导入（由后续ETL产出再导入）。
	if _, err := dl.LoadSinceInception(); err == nil {
		log.Printf("skip since-inception: design expects timeseries; source has summary only")
	}

	// 3) Trades -> trades (+models, +symbols)
	if resp, err := dl.LoadTrades(); err == nil {
		for _, t := range resp.Trades {
			if t.ModelId != "" {
				modelSet[t.ModelId] = struct{}{}
				upsertModel(ctx, conn, t.ModelId, t.ModelId)
			}
			if t.Symbol != "" {
				symbolSet[t.Symbol] = struct{}{}
				upsertSymbol(ctx, conn, t.Symbol)
			}
			entryMs := toMsF(t.EntryTime)
			exitMs := toMsF(t.ExitTime)
			insertTrade(ctx, conn, &t, entryMs, exitMs)
		}
		log.Printf("imported trades: %d", len(resp.Trades))
	} else {
		log.Printf("skip trades: %v", err)
	}

	// 4) Positions -> positions (open)
	if resp, err := dl.LoadPositions(); err == nil {
		for _, pm := range resp.AccountTotals {
			if pm.ModelId != "" {
				modelSet[pm.ModelId] = struct{}{}
				upsertModel(ctx, conn, pm.ModelId, pm.ModelId)
			}
			for sym, pos := range pm.Positions {
				symbolSet[sym] = struct{}{}
				upsertSymbol(ctx, conn, sym)
				entryMs := toMsF(pos.EntryTime)
				pv := positionView{EntryPrice: pos.EntryPrice, Quantity: pos.Quantity, Leverage: pos.Leverage, Confidence: pos.Confidence}
				insertPositionOpen(ctx, conn, pm.ModelId, sym, pv, entryMs)
			}
		}
		log.Printf("imported positions: %d models", len(resp.AccountTotals))
	} else {
		log.Printf("skip positions: %v", err)
	}

	// 5) Analytics -> model_analytics
	if resp, err := dl.LoadAnalytics(); err == nil {
		// store per analytics item
		for _, a := range resp.Analytics {
			if a.ModelId != "" {
				modelSet[a.ModelId] = struct{}{}
				upsertModel(ctx, conn, a.ModelId, a.ModelId)
			}
		}
		// read raw file and write jsonb payload grouped by model
		rawFile := filepath.Join(dataPath, "analytics.json")
		raw, _ := os.ReadFile(rawFile)
		var tmp struct {
			Analytics []json.RawMessage `json:"analytics"`
		}
		if err := json.Unmarshal(raw, &tmp); err == nil {
			for _, item := range tmp.Analytics {
				var probe struct {
					ModelId string `json:"model_id"`
				}
				_ = json.Unmarshal(item, &probe)
				if probe.ModelId != "" {
					upsertModelAnalytics(ctx, conn, probe.ModelId, item)
				}
			}
		}
		log.Printf("imported analytics payloads: %d", len(resp.Analytics))
	} else {
		log.Printf("skip analytics: %v", err)
	}

	// 6) Conversations -> conversations & messages
	if resp, err := dl.LoadConversations(); err == nil {
		for _, c := range resp.Conversations {
			if c.ModelId != "" {
				modelSet[c.ModelId] = struct{}{}
				upsertModel(ctx, conn, c.ModelId, c.ModelId)
			}
			convID := insertConversation(ctx, conn, c.ModelId)
			for _, m := range c.Messages {
				ts := toMs(m.Timestamp)
				insertConversationMessage(ctx, conn, convID, m.Role, m.Content, ts)
			}
		}
		log.Printf("imported conversations: %d", len(resp.Conversations))
	} else {
		log.Printf("skip conversations: %v", err)
	}

	log.Printf("models upserted: %d, symbols upserted: %d", len(modelSet), len(symbolSet))
	log.Printf("done.")
}

func toMs(v interface{}) int64 {
	switch t := v.(type) {
	case int64:
		return t
	case int:
		return int64(t)
	case float64:
		// some JSON times are seconds, others ms; heuristic: if < 1e12 treat as seconds
		if t < 1e12 {
			return int64(t * 1000)
		}
		return int64(t)
	case json.Number:
		if i, err := t.Int64(); err == nil {
			return i
		}
		if f, err := t.Float64(); err == nil {
			return int64(f)
		}
		return 0
	case string:
		// iso8601 support best-effort
		if ts, err := time.Parse(time.RFC3339, t); err == nil {
			return ts.UnixMilli()
		}
		return 0
	default:
		return 0
	}
}

func toMsF(f float64) int64 {
	if f < 1e12 {
		return int64(f * 1000)
	}
	return int64(f)
}

func mustExec(ctx context.Context, conn sqlx.SqlConn, query string, args ...interface{}) {
	if _, err := conn.ExecCtx(ctx, query, args...); err != nil {
		log.Fatalf("exec failed: %v", err)
	}
}

func upsertModel(ctx context.Context, conn sqlx.SqlConn, id, display string) {
	q := `INSERT INTO models(id, display_name) VALUES ($1,$2)
          ON CONFLICT (id) DO UPDATE SET display_name=EXCLUDED.display_name`
	mustExec(ctx, conn, q, strings.TrimSpace(id), display)
}

func upsertSymbol(ctx context.Context, conn sqlx.SqlConn, symbol string) {
	q := `INSERT INTO symbols(symbol) VALUES ($1) ON CONFLICT (symbol) DO NOTHING`
	mustExec(ctx, conn, q, strings.TrimSpace(symbol))
}

func upsertPriceLatest(ctx context.Context, conn sqlx.SqlConn, symbol string, price float64, ts int64) {
	q := `INSERT INTO price_latest(symbol, price, ts_ms) VALUES ($1,$2,$3)
          ON CONFLICT (symbol) DO UPDATE SET price=EXCLUDED.price, ts_ms=EXCLUDED.ts_ms`
	mustExec(ctx, conn, q, symbol, price, ts)
}

func insertEquitySnapshot(ctx context.Context, conn sqlx.SqlConn, modelId string, ts int64, equity float64) {
	q := `INSERT INTO account_equity_snapshots(model_id, ts_ms, equity_usd) VALUES ($1,$2,$3)`
	mustExec(ctx, conn, q, modelId, ts, equity)
}

func insertTrade(ctx context.Context, conn sqlx.SqlConn, t *types.Trade, entryMs, exitMs int64) {
	q := `INSERT INTO trades(
            id, model_id, symbol, side, trade_type, quantity, leverage, confidence,
            entry_price, entry_ts_ms, exit_price, exit_ts_ms,
            realized_gross_pnl, realized_net_pnl, total_commission_dollars)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
          ON CONFLICT (id) DO NOTHING`
	mustExec(ctx, conn, q, t.Id, t.ModelId, t.Symbol, t.Side, nullIfEmpty(t.TradeType),
		nullFloat(t.Quantity), nullFloat(t.Leverage), nullFloat(t.Confidence), t.EntryPrice, entryMs,
		t.ExitPrice, exitMs, t.RealizedGrossPnl, t.RealizedNetPnl, t.TotalCommissionDollars)
}

func nullIfEmpty(s string) interface{} {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return s
}
func nullFloat(f float64) interface{} {
	if f == 0 {
		return nil
	}
	return f
}

type positionView struct {
	EntryPrice float64 `json:"entry_price"`
	Quantity   float64 `json:"quantity"`
	Leverage   float64 `json:"leverage"`
	Confidence float64 `json:"confidence"`
}

func insertPositionOpen(ctx context.Context, conn sqlx.SqlConn, modelId, symbol string, pos positionView, entryMs int64) {
	q := `INSERT INTO positions(id, model_id, symbol, side, entry_price, quantity, leverage, confidence, entry_ts_ms, status)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open')
          ON CONFLICT (id) DO NOTHING`
	pid := fmt.Sprintf("%s:%s:%d", modelId, symbol, entryMs)
	side := "long" // 无法从示例数据稳定推断多空，默认 long；后续由导入源决定
	mustExec(ctx, conn, q, pid, modelId, symbol, side, pos.EntryPrice, pos.Quantity, nullFloat(pos.Leverage), nullFloat(pos.Confidence), entryMs)
}

func upsertModelAnalytics(ctx context.Context, conn sqlx.SqlConn, modelId string, payload json.RawMessage) {
	q := `INSERT INTO model_analytics(model_id, payload) VALUES ($1,$2)
          ON CONFLICT (model_id) DO UPDATE SET payload=EXCLUDED.payload, updated_at=now()`
	mustExec(ctx, conn, q, modelId, string(payload))
}

func insertConversation(ctx context.Context, conn sqlx.SqlConn, modelId string) int64 {
	q := `INSERT INTO conversations(model_id) VALUES ($1) RETURNING id`
	var id int64
	if err := conn.QueryRowCtx(ctx, &id, q, modelId); err != nil {
		log.Fatalf("insert conversation: %v", err)
	}
	return id
}

func insertConversationMessage(ctx context.Context, conn sqlx.SqlConn, convId int64, role, content string, ts int64) {
	if role == "" {
		role = "assistant"
	}
	q := `INSERT INTO conversation_messages(conversation_id, role, content, ts_ms) VALUES ($1,$2,$3,$4)`
	mustExec(ctx, conn, q, convId, role, content, ts)
}
