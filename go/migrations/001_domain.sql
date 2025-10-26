-- Domain schema to support all current endpoints, normalized
-- Models participating in the arena
CREATE TABLE IF NOT EXISTS models (
    id           text PRIMARY KEY, -- e.g., qwen3-max
    display_name text NOT NULL,
    created_at   timestamptz DEFAULT now()
);

-- Tradeable symbols/universe
CREATE TABLE IF NOT EXISTS symbols (
    symbol    text PRIMARY KEY -- e.g., BTCUSDT
);

-- Price ticks (could be trades, mid, or candles; store raw ticks here)
CREATE TABLE IF NOT EXISTS price_ticks (
    id           bigserial PRIMARY KEY,
    symbol       text NOT NULL REFERENCES symbols(symbol),
    price        double precision NOT NULL,
    ts_ms        bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_price_ticks_symbol_ts ON price_ticks(symbol, ts_ms DESC);

-- Latest price per symbol maintained by upsert from ingest
CREATE TABLE IF NOT EXISTS price_latest (
    symbol       text PRIMARY KEY REFERENCES symbols(symbol),
    price        double precision NOT NULL,
    ts_ms        bigint NOT NULL
);

-- Accounts represent model portfolios (1 account per model)
CREATE TABLE IF NOT EXISTS accounts (
    model_id text PRIMARY KEY REFERENCES models(id),
    base_currency text NOT NULL DEFAULT 'USD'
);

-- Account equity snapshots (for since-inception curves, leaderboards, etc.)
CREATE TABLE IF NOT EXISTS account_equity_snapshots (
    id         bigserial PRIMARY KEY,
    model_id   text NOT NULL REFERENCES models(id),
    ts_ms      bigint NOT NULL,
    equity_usd double precision NOT NULL,
    realized_pnl double precision DEFAULT 0,
    unrealized_pnl double precision DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_equity_model_ts ON account_equity_snapshots(model_id, ts_ms DESC);

-- Positions (open positions only; history can be tracked via status changes)
CREATE TABLE IF NOT EXISTS positions (
    id              text PRIMARY KEY,
    model_id        text NOT NULL REFERENCES models(id),
    symbol          text NOT NULL REFERENCES symbols(symbol),
    side            text NOT NULL CHECK (side IN ('long','short')),
    entry_price     double precision NOT NULL,
    quantity        double precision NOT NULL,
    leverage        double precision,
    confidence      double precision,
    entry_ts_ms     bigint NOT NULL,
    current_price   double precision,
    liquidation_price double precision,
    commission      double precision,
    status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed'))
);
CREATE INDEX IF NOT EXISTS idx_positions_model ON positions(model_id);

-- Trades (closed position executions aggregated; keeps full audit)
CREATE TABLE IF NOT EXISTS trades (
    id                       text PRIMARY KEY,
    model_id                 text NOT NULL REFERENCES models(id),
    symbol                   text NOT NULL REFERENCES symbols(symbol),
    side                     text NOT NULL,
    trade_type               text,
    quantity                 double precision,
    leverage                 double precision,
    confidence               double precision,
    entry_price              double precision,
    entry_ts_ms              bigint,
    exit_price               double precision,
    exit_ts_ms               bigint,
    realized_gross_pnl       double precision,
    realized_net_pnl         double precision,
    total_commission_dollars double precision,
    entry_oid                bigint,
    exit_oid                 bigint
);
CREATE INDEX IF NOT EXISTS idx_trades_model_ts ON trades(model_id, entry_ts_ms DESC);

-- Aggregated analytics per model. We store precomputed breakdowns as JSONB for flexibility.
CREATE TABLE IF NOT EXISTS model_analytics (
    model_id   text PRIMARY KEY REFERENCES models(id),
    updated_at timestamptz NOT NULL DEFAULT now(),
    payload    jsonb NOT NULL -- shape mirrors API's ModelAnalytics
);

-- Conversations per model
CREATE TABLE IF NOT EXISTS conversations (
    id        bigserial PRIMARY KEY,
    model_id  text NOT NULL REFERENCES models(id)
);

CREATE TABLE IF NOT EXISTS conversation_messages (
    id              bigserial PRIMARY KEY,
    conversation_id bigint NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            text NOT NULL CHECK (role IN ('system','user','assistant')),
    content         text NOT NULL,
    ts_ms           bigint
);
CREATE INDEX IF NOT EXISTS idx_conv_msgs_conv_ts ON conversation_messages(conversation_id, ts_ms);

-- Derived/materialized views for API layers (not wired yet)
-- Latest price per symbol
CREATE MATERIALIZED VIEW IF NOT EXISTS v_crypto_prices_latest AS
SELECT symbol, price, ts_ms AS timestamp_ms
FROM price_latest;

-- Leaderboard derived from most recent equity snapshot per model
CREATE MATERIALIZED VIEW IF NOT EXISTS v_leaderboard AS
WITH last_eq AS (
    SELECT DISTINCT ON (model_id) model_id, ts_ms, equity_usd
    FROM account_equity_snapshots
    ORDER BY model_id, ts_ms DESC
)
SELECT m.id AS model_id,
       l.equity_usd AS equity,
       0.0::double precision AS sharpe, -- placeholder until stat job fills
       0    ::int AS num_trades,
       0    ::int AS num_wins,
       0    ::int AS num_losses,
       0.0  ::double precision AS win_dollars,
       0.0  ::double precision AS lose_dollars,
       0.0  ::double precision AS return_pct
FROM models m
LEFT JOIN last_eq l ON l.model_id = m.id;

-- Since inception series (hourly/daily downsample to be done by ETL)
CREATE MATERIALIZED VIEW IF NOT EXISTS v_since_inception AS
SELECT model_id, ts_ms AS timestamp, equity_usd AS value
FROM account_equity_snapshots;

