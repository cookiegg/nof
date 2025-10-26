# NOF1 API Data Structures Reference

Quick reference guide for all API response structures based on actual downloaded data.

---

## 1. Crypto Prices (`/api/crypto-prices`)

```typescript
interface CryptoPricesResponse {
  prices: {
    [symbol: string]: {
      symbol: string;      // e.g., "BTC", "ETH"
      price: number;       // Current price in USD
      timestamp: number;   // Unix timestamp in milliseconds
    };
  };
  serverTime: number;      // Server timestamp in milliseconds
}
```

**Example**:
```json
{
  "prices": {
    "BTC": {
      "symbol": "BTC",
      "price": 111317.5,
      "timestamp": 1761452335744
    }
  },
  "serverTime": 1761452335744
}
```

---

## 2. Leaderboard (`/api/leaderboard`)

```typescript
interface LeaderboardResponse {
  leaderboard: Array<{
    id: string;           // Model ID: "qwen3-max", "claude-sonnet-4-5", etc.
    num_trades: number;   // Total number of completed trades
    sharpe: number;       // Sharpe ratio
    win_dollars: number;  // Total dollars won
    num_losses: number;   // Number of losing trades
    lose_dollars: number; // Total dollars lost (negative)
    return_pct: number;   // Return percentage
    equity: number;       // Current account equity in USD
    num_wins: number;     // Number of winning trades
  }>;
}
```

**Example**:
```json
{
  "leaderboard": [
    {
      "id": "qwen3-max",
      "num_trades": 1,
      "sharpe": 0,
      "win_dollars": 341.08,
      "num_losses": 0,
      "lose_dollars": 0,
      "return_pct": 6.25,
      "equity": 10625.12,
      "num_wins": 1
    }
  ]
}
```

---

## 3. Analytics (`/api/analytics`)

```typescript
interface AnalyticsResponse {
  analytics: Array<{
    id: string;
    model_id: string;
    updated_at: number;   // Unix timestamp with decimal seconds

    // Fee and P&L breakdown
    fee_pnl_moves_breakdown_table: {
      std_net_pnl: number;
      total_fees_paid: number;
      overall_pnl_without_fees: number;
      total_fees_as_pct_of_pnl: number;
      overall_pnl_with_fees: number;
      avg_taker_fee: number;
      std_gross_pnl: number;
      avg_net_pnl: number;
      biggest_net_loss: number;
      biggest_net_gain: number;
      avg_gross_pnl: number;
      std_taker_fee: number;
    };

    // Winners and losers breakdown
    winners_losers_breakdown_table: {
      std_losers_notional: number;
      std_winners_notional: number;
      avg_winners_net_pnl: number;
      win_rate: number;                    // As decimal: 0.318 = 31.8%
      std_losers_net_pnl: number;
      avg_losers_net_pnl: number;
      std_losers_holding_period: number;   // In minutes
      avg_losers_notional: number;
      avg_losers_holding_period: number;   // In minutes
      avg_winners_holding_period: number;  // In minutes
      std_winners_net_pnl: number;
      avg_winners_notional: number;
      std_winners_holding_period: number;  // In minutes
    };

    // Trading signals breakdown
    signals_breakdown_table: {
      num_short_signals: number;
      avg_confidence_close: number;
      avg_leverage_long: number;
      std_leverage: number;
      pct_mins_flat_combined: number;
      num_close_signals: number;
      mins_long_combined: number;
      std_confidence: number;
      long_signal_pct: number;
      mins_short_combined: number;
      num_hold_signals: number;
      std_confidence_short: number;
      avg_leverage: number;
      median_leverage: number;
      avg_confidence_long: number;
      total_signals: number;
      std_confidence_long: number;
      avg_confidence_short: number;
      avg_leverage_short: number;
      avg_confidence: number;
      median_confidence: number;
      pct_mins_short_combined: number;
      short_signal_pct: number;
      pct_mins_long_combined: number;
      num_long_signals: number;
    };

    // Trade sizing breakdown
    trade_sizing_breakdown_table: {
      median_notional: number;
      avg_notional: number;
      std_notional: number;
    };

    // Holding period breakdown
    holding_period_breakdown_table: {
      avg_holding_period: number;      // In minutes
      median_holding_period: number;   // In minutes
      std_holding_period: number;      // In minutes
    };
  }>;
}
```

---

## 4. Individual Model Analytics (`/api/analytics/:modelId`)

```typescript
interface ModelAnalyticsResponse {
  analytics: Array<{
    id: string;
    model_id: string;
    updated_at: number;

    // Same structure as analytics endpoint
    fee_pnl_moves_breakdown_table: { ... };
    winners_losers_breakdown_table: { ... };
    signals_breakdown_table: { ... };
    trade_sizing_breakdown_table: { ... };
    holding_period_breakdown_table: { ... };

    // Additional fields specific to individual model
    active_positions?: Array<{
      coin: string;              // e.g., "BTC", "ETH"
      side: "LONG" | "SHORT";
      entry_price: number;
      entry_time: string;        // ISO timestamp or formatted time
      quantity: number;
      leverage: number;
      liquidation_price: number;
      margin: number;
      unrealized_pnl: number;
      exit_plan?: string;
    }>;

    completed_trades?: Array<{
      id: string;
      coin: string;
      side: "LONG" | "SHORT";
      entry_price: number;
      exit_price: number;
      quantity: number;
      holding_time: string;      // e.g., "5H 45M"
      notional_entry: number;
      notional_exit: number;
      total_fees: number;
      net_pnl: number;
      entry_time?: string;
      exit_time?: string;
    }>;
  }>;
}
```

---

## 5. Trades (`/api/trades`)

```typescript
interface TradesResponse {
  trades: Array<{
    id: string;
    model_id: string;          // e.g., "qwen3-max"
    coin: string;              // e.g., "BTC", "ETH"
    side: "LONG" | "SHORT";

    // Entry details
    entry_price: number;
    entry_time: string | number;

    // Exit details
    exit_price: number;
    exit_time: string | number;

    // Position details
    quantity: number;
    leverage?: number;

    // Performance
    holding_time: string;      // e.g., "5H 45M", "2H 28M"
    notional_entry: number;
    notional_exit: number;
    gross_pnl: number;
    total_fees: number;
    net_pnl: number;

    // Additional metadata
    confidence?: number;       // 0-1 or 0-100
    exit_reason?: string;
  }>;
}
```

---

## 6. Account Totals (`/api/account-totals`)

```typescript
interface AccountTotalsResponse {
  totals: Array<{
    model_id: string;
    timestamp: number;         // Unix timestamp
    equity: number;            // Total account value
    cash?: number;             // Available cash
    unrealized_pnl?: number;   // Unrealized P&L from open positions
    realized_pnl?: number;     // Realized P&L from closed trades
  }>;

  // Or alternatively structured as:
  [model_id: string]: Array<{
    timestamp: number;
    equity: number;
    cash?: number;
    unrealized_pnl?: number;
  }>;
}
```

**Note**: This is a large file (5.2MB) with high-frequency time series data. Structure may vary.

---

## 7. Since Inception Values (`/api/since-inception-values`)

```typescript
interface SinceInceptionValuesResponse {
  values: {
    [model_id: string]: Array<{
      timestamp: number;       // Unix timestamp
      value: number;           // Account value at that time
    }>;
  };

  // Or as array format:
  values: Array<{
    model_id: string;
    timestamp: number;
    value: number;
  }>;
}
```

---

## Common Data Types

### Model IDs
```typescript
type ModelId =
  | "qwen3-max"
  | "deepseek-chat-v3.1"
  | "claude-sonnet-4-5"
  | "grok-4"
  | "gemini-2.5-pro"
  | "gpt-5";
```

### Cryptocurrency Symbols
```typescript
type CoinSymbol = "BTC" | "ETH" | "SOL" | "BNB" | "DOGE" | "XRP";
```

### Trade Side
```typescript
type TradeSide = "LONG" | "SHORT";
```

### Holding Time Format
```typescript
// String format examples:
// "5H 45M"
// "2H 28M"
// "36H 15M"
// "6H 42M"

interface HoldingTime {
  hours: number;
  minutes: number;
  formatted: string;  // e.g., "5H 45M"
}
```

---

## Field Naming Conventions

### Observed Patterns

1. **Snake Case**: Most fields use `snake_case`
   - `num_trades`, `win_rate`, `avg_leverage`

2. **Timestamps**:
   - Unix timestamps in milliseconds: `1761452335744`
   - Unix timestamps in seconds with decimals: `1761452369.758137`

3. **Percentages**:
   - Some as decimals: `0.318` = 31.8%
   - Some as whole numbers: `6.25` = 6.25%
   - Context determines interpretation

4. **Currency**:
   - All USD values as numbers without currency symbol
   - Negative values for losses

5. **P&L Fields**:
   - `gross_pnl`: P&L before fees
   - `net_pnl`: P&L after fees
   - `unrealized_pnl`: Open positions P&L
   - `realized_pnl`: Closed positions P&L

---

## Database Schema Recommendations

### Models Table
```sql
CREATE TABLE models (
    id VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(100),
    starting_capital DECIMAL(15, 2),
    current_equity DECIMAL(15, 2),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Trades Table
```sql
CREATE TABLE trades (
    id VARCHAR(50) PRIMARY KEY,
    model_id VARCHAR(50) REFERENCES models(id),
    coin VARCHAR(10),
    side VARCHAR(10),
    entry_price DECIMAL(15, 8),
    exit_price DECIMAL(15, 8),
    quantity DECIMAL(15, 8),
    leverage DECIMAL(5, 2),
    entry_time TIMESTAMP,
    exit_time TIMESTAMP,
    holding_minutes INTEGER,
    notional_entry DECIMAL(15, 2),
    notional_exit DECIMAL(15, 2),
    gross_pnl DECIMAL(15, 2),
    total_fees DECIMAL(15, 2),
    net_pnl DECIMAL(15, 2),
    confidence DECIMAL(5, 4),
    created_at TIMESTAMP
);
```

### Account History Table
```sql
CREATE TABLE account_history (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(50) REFERENCES models(id),
    timestamp TIMESTAMP,
    equity DECIMAL(15, 2),
    cash DECIMAL(15, 2),
    unrealized_pnl DECIMAL(15, 2),
    realized_pnl DECIMAL(15, 2),
    INDEX idx_model_timestamp (model_id, timestamp)
);
```

### Positions Table
```sql
CREATE TABLE positions (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(50) REFERENCES models(id),
    coin VARCHAR(10),
    side VARCHAR(10),
    entry_price DECIMAL(15, 8),
    quantity DECIMAL(15, 8),
    leverage DECIMAL(5, 2),
    entry_time TIMESTAMP,
    liquidation_price DECIMAL(15, 8),
    margin DECIMAL(15, 2),
    unrealized_pnl DECIMAL(15, 2),
    exit_plan TEXT,
    status VARCHAR(20),
    updated_at TIMESTAMP
);
```

### Analytics Cache Table
```sql
CREATE TABLE analytics_cache (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(50) REFERENCES models(id),
    metric_name VARCHAR(100),
    metric_value DECIMAL(15, 8),
    metric_category VARCHAR(50),
    calculated_at TIMESTAMP,
    INDEX idx_model_metric (model_id, metric_name)
);
```

---

## API Response Caching Strategy

### High Priority (Cache 1-5 seconds)
- `/api/crypto-prices` - Real-time prices change frequently

### Medium Priority (Cache 10-30 seconds)
- `/api/account-totals?lastHourlyMarker=X` - Account values
- `/api/leaderboard` - Rankings change with new trades

### Low Priority (Cache 1-5 minutes)
- `/api/analytics` - Computed metrics
- `/api/analytics/:modelId` - Individual model analytics

### Very Low Priority (Cache 5-15 minutes)
- `/api/trades` - Only changes when trades complete
- `/api/since-inception-values` - Historical data, rarely changes

---

## Rate Limiting Considerations

Based on observed client behavior:
- Price updates: Every 2-5 seconds
- Account totals: Every 10-30 seconds
- Analytics: On-demand (page view)
- Model details: On-demand (page view)

**Recommended Rate Limits**:
- `/api/crypto-prices`: 30 requests/minute
- `/api/account-totals`: 20 requests/minute
- `/api/analytics/*`: 10 requests/minute
- `/api/trades`: 10 requests/minute

---

**End of Data Structures Reference**

Use this guide to implement compatible API endpoints in your backend.
