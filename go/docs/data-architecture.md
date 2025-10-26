# Data Architecture: Postgres + Redis (Design Only)

This document outlines a production-ready schema and cache plan to back all existing endpoints without changing the current runtime (which still loads from JSON). It provides a normalized relational model, derived/materialized views for the API layer, and a Redis keyspace design for low-latency reads and incremental ingest.

## Goals

- Normalize core trading domain (models, symbols, accounts, positions, trades, prices).
- Separate raw facts (DB) from view-layer aggregates (materialized views + Redis).
- Enable incremental ingestion (append-only ticks and trades) and periodic aggregation jobs.
- Allow phased migration: endpoints can switch from JSON → DB/Redis per route later.

## Postgres Schema Overview

- `models(id, display_name, created_at)`
- `symbols(symbol)`
- `price_ticks(id, symbol, price, ts_ms)` + idx `(symbol, ts_ms desc)`
- `price_latest(symbol pk, price, ts_ms)` — latest per symbol maintained via upsert
- `accounts(model_id pk)` — 1:1 with model
- `account_equity_snapshots(id, model_id, ts_ms, equity_usd, realized_pnl, unrealized_pnl)`
- `positions(id pk, model_id, symbol, side, entry_price, quantity, leverage, confidence, entry_ts_ms, current_price, liquidation_price, commission, status)`
- `trades(id pk, model_id, symbol, side, trade_type, quantity, leverage, confidence, entry_price, entry_ts_ms, exit_price, exit_ts_ms, realized_gross_pnl, realized_net_pnl, total_commission_dollars, entry_oid, exit_oid)`
- `model_analytics(model_id pk, updated_at, payload jsonb)` — mirrors API analytics shape
- `conversations(id, model_id)` + `conversation_messages(id, conversation_id, role, content, ts_ms)`

### Materialized Views (API-facing)

- `v_crypto_prices_latest(symbol, price, timestamp_ms)` from `price_latest`
- `v_leaderboard(model_id, equity, sharpe, num_trades, num_wins, num_losses, win_dollars, lose_dollars, return_pct)` seeded from snapshots; refined by nightly ETL
- `v_since_inception(model_id, timestamp, value)` from `account_equity_snapshots`

`refresh_views_nof0()` helper function refreshes all views concurrently (002_refresh_helpers.sql).

## Redis Keyspace Design

Namespace prefix: `nof0:`

- Prices
  - `nof0:price:latest:{symbol}` → string JSON `{"symbol","price","timestamp"}` TTL=10s
  - `nof0:crypto_prices` → string JSON map of latest prices TTL=10s
- Trades
  - `nof0:trades:recent:{model_id}` → list of JSON trades (LPUSH+LTRIM N) TTL=60s
  - `nof0:trades:stream` → Redis Stream for real-time ingestion/consumers (optional)
  - Idempotency: `nof0:ingest:trade:{trade_id}` → set-if-not-exists TTL=24h
- Positions
  - `nof0:positions:{model_id}` → hash by `symbol` with JSON position values TTL=30s
  - Lock for recompute: `nof0:lock:positions:{model_id}` → simple lock key with short TTL
- Leaderboard
  - `nof0:leaderboard` → sorted set score=`return_pct` or `equity`, member=`model_id`
  - `nof0:leaderboard:cache` → string JSON of top-K TTL=60s
- Since Inception
  - `nof0:since_inception:{model_id}` → list of `{timestamp,value}` downsampled points TTL=5m
- Analytics
  - `nof0:analytics:{model_id}` → string JSON (same shape as API) TTL=10m
- Conversations
  - `nof0:conversations:{model_id}` → list of message JSON; alternative is Redis Stream

### Caching Strategy

- DB is the source of truth; Redis caches derived or denormalized payloads for endpoints.
- Writers (ingest/ETL) update DB and then invalidate/update Redis keys. Use short TTLs as safety nets.
- Prefer bulk cache for small payloads (e.g., `crypto_prices`), per-model keys for larger ones.

## Ingestion and ETL Notes

- Prices: append to `price_ticks`, upsert into `price_latest`, publish to `nof0:price:latest:{symbol}`; periodically refresh `v_crypto_prices_latest`.
- Trades: upsert `trades`; update `account_equity_snapshots`; recompute leaderboard metrics; update caches.
- Positions: write `positions` for open positions; set `status='closed'` when closed; update caches.
- Analytics: produce JSON to `model_analytics.payload` and to `nof0:analytics:{model_id}`.

## Migration Path (Future Work, not done now)

- Add repository layer per endpoint to read from DB/Redis.
- Switch logic from file loader to repository per route behind a feature flag.
- Validate payload parity versus current JSON responses with integration tests.
