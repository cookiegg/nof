# NOF1 Alpha Arena - Data Inventory

**Download Date**: 2025-10-26
**Download Time**: Approximately 23:18 UTC
**Method**: Direct API calls using curl

---

## 📊 Downloaded Files Summary

| File | Size | Description | Record Count |
|------|------|-------------|--------------|
| `crypto-prices.json` | 656B | Real-time cryptocurrency prices | 6 coins |
| `account-totals.json` | 5.2M | Historical account totals with timestamps | ~15,000+ records |
| `trades.json` | 264K | All completed trades across all models | ~286 trades |
| `since-inception-values.json` | 1.5K | Account value time series | Time series data |
| `leaderboard.json` | 1.4K | Current leaderboard rankings | 6 models |
| `analytics.json` | 29K | Advanced analytics for all models | 6 models |
| `analytics-qwen3-max.json` | 4.8K | Detailed analytics for Qwen3 Max | 1 model |
| `analytics-deepseek-chat-v3.1.json` | 4.7K | Detailed analytics for DeepSeek V3.1 | 1 model |
| `analytics-claude-sonnet-4-5.json` | 4.6K | Detailed analytics for Claude 4.5 | 1 model |
| `analytics-grok-4.json` | 4.7K | Detailed analytics for Grok 4 | 1 model |
| `analytics-gemini-2.5-pro.json` | 4.8K | Detailed analytics for Gemini 2.5 Pro | 1 model |
| `analytics-gpt-5.json` | 4.8K | Detailed analytics for GPT 5 | 1 model |

**Total Data Size**: ~5.5 MB

---

## 📁 File Details

### 1. `crypto-prices.json` (656B)
**Endpoint**: `/api/crypto-prices`

**Content**: Real-time cryptocurrency prices at the time of download

**Structure**:
```json
{
  "prices": {
    "BTC": { "symbol": "BTC", "price": 111317.5, "timestamp": 1761452335744 },
    "ETH": { "symbol": "ETH", "price": 3929.85, "timestamp": 1761452335744 },
    "SOL": { "symbol": "SOL", "price": 193.235, "timestamp": 1761452335744 },
    "BNB": { "symbol": "BNB", "price": 1117.95, "timestamp": 1761452335744 },
    "DOGE": { "symbol": "DOGE", "price": 0.195255, "timestamp": 1761452335744 },
    "XRP": { "symbol": "XRP", "price": 2.60815, "timestamp": 1761452335744 }
  },
  "serverTime": 1761452335744
}
```

**Snapshot Values** (at download time):
- BTC: $111,317.50
- ETH: $3,929.85
- SOL: $193.24
- BNB: $1,117.95
- DOGE: $0.195
- XRP: $2.608

---

### 2. `account-totals.json` (5.2M)
**Endpoint**: `/api/account-totals`

**Content**: Complete historical account totals for all 6 AI models

**Data Points**: ~15,000+ timestamp records per model

**Contains**:
- Timestamp-based account values
- Historical equity tracking
- High-frequency data points (appears to be hourly or more frequent)
- Complete history from competition start

**Value**: This is the MOST CRITICAL file - contains all historical performance data

---

### 3. `trades.json` (264K)
**Endpoint**: `/api/trades`

**Content**: All completed trades across all 6 models

**Estimated Trade Count**: ~286 trades total

**Trade Data Includes**:
- Entry and exit prices
- Trade side (LONG/SHORT)
- Cryptocurrency symbol
- Position size/quantity
- Holding period
- Fees paid
- Net P&L
- Timestamps
- Model ID

**Models Trade Counts** (approximate from leaderboard):
- Gemini 2.5 Pro: ~157 trades
- GPT 5: ~55 trades
- Qwen3 Max: ~22 trades
- Grok 4: ~20 trades
- Claude 4.5: ~19 trades
- DeepSeek V3.1: ~14 trades

---

### 4. `since-inception-values.json` (1.5K)
**Endpoint**: `/api/since-inception-values`

**Content**: Time series of account values since competition inception

**Data Structure**: Time-indexed account values for chart rendering

**Usage**: Primary data source for the main dashboard chart

---

### 5. `leaderboard.json` (1.4K)
**Endpoint**: `/api/leaderboard`

**Content**: Current leaderboard snapshot with basic statistics

**Model Rankings** (at download time):
1. Qwen3 Max: $10,625.12 (+6.25%)
2. DeepSeek V3.1: $10,900.67 (+9.01%)
3. Claude 4.5: $8,552.70 (-14.47%)
4. Grok 4: $8,913.74 (-10.86%)
5. Gemini 2.5 Pro: $3,334.89 (-66.65%)
6. GPT 5: $3,063.56 (-69.36%)

**Data Includes**:
- Current equity
- Return percentage
- Number of trades
- Win/loss counts
- Win/loss dollars
- Sharpe ratio

---

### 6. `analytics.json` (29K)
**Endpoint**: `/api/analytics`

**Content**: Comprehensive analytics for all 6 models

**Metrics Included**:
- Average/Median trade size
- Average/Median holding periods
- Long/Short distribution
- Leverage statistics
- Confidence levels
- Expectancy calculations
- Fee analysis
- Winner/Loser breakdowns

---

### 7-12. Individual Model Analytics (4.6K - 4.8K each)
**Endpoints**: `/api/analytics/{model-id}`

**Models**:
- `qwen3-max`
- `deepseek-chat-v3.1`
- `claude-sonnet-4-5`
- `grok-4`
- `gemini-2.5-pro`
- `gpt-5`

**Content Per Model**:

#### Fee & P&L Breakdown
- Standard deviation of net/gross P&L
- Total fees paid
- Overall P&L with/without fees
- Average taker fees
- Biggest wins/losses

#### Winners/Losers Analysis
- Win rate
- Average winner/loser P&L
- Average notional sizes
- Holding period statistics
- Standard deviations

#### Signals Breakdown
- Long/Short signal counts
- Confidence levels (avg, median, std)
- Leverage statistics
- Time spent long/short/flat
- Signal percentages

#### Trade History
- Last 25+ completed trades
- Active positions (if any)
- Entry/exit details
- P&L per trade
- Fees per trade

#### Position Details
- Current active positions
- Entry prices
- Liquidation prices
- Unrealized P&L
- Margin used
- Position sizes

---

## 🔑 Key Insights from Downloaded Data

### Competition Status (at download time)
- **Total Capital Deployed**: $60,000 ($10K per model)
- **Current Total Value**: ~$45,400 (estimated from leaderboard)
- **Overall Loss**: ~-24% across all models
- **Total Trades Executed**: ~286 trades

### Top Performers
1. **DeepSeek V3.1**: +9.01% ($10,900.67)
2. **Qwen3 Max**: +6.25% ($10,625.12)

### Bottom Performers
1. **GPT 5**: -69.36% ($3,063.56)
2. **Gemini 2.5 Pro**: -66.65% ($3,334.89)

### Trading Activity
- **Most Active**: Gemini 2.5 Pro (157 trades)
- **Least Active**: DeepSeek V3.1 (14 trades)

### Market Snapshot
- BTC trading at $111,317.50
- ETH trading at $3,929.85
- Market appears to be in high volatility period

---

## 💾 Data Preservation Notes

### Why This Data is Important

1. **Historical Record**: Complete trading history of 6 AI models in live markets
2. **Research Value**: Unique dataset of AI trading behavior
3. **Benchmarking**: Performance metrics for different LLMs in trading
4. **API Shutdown Risk**: Platform may close or restrict API access
5. **Competition Context**: Season 1 runs until Nov 3, 2025

### Data Completeness

✅ **Complete Historical Data**:
- Full account value history (5.2MB of time-series data)
- Complete trade history (~286 trades)
- Detailed analytics for all models

✅ **Point-in-Time Snapshots**:
- Current prices
- Current leaderboard
- Current analytics

✅ **Individual Model Details**:
- All 6 models' detailed analytics
- Active positions
- Trade histories

### Missing Data (Intentionally Not Downloaded)

- Static assets (logos, images)
- Frontend code/JavaScript bundles
- Vercel insights/analytics
- User interaction data

---

## 🔄 Data Refresh Recommendations

If you want to capture data at different time points:

```bash
# Quick snapshot script
timestamp=$(date +%Y%m%d_%H%M%S)
mkdir -p mcp/data/snapshots/$timestamp

# Download current state
curl -s 'https://nof1.ai/api/crypto-prices' > mcp/data/snapshots/$timestamp/crypto-prices.json
curl -s 'https://nof1.ai/api/leaderboard' > mcp/data/snapshots/$timestamp/leaderboard.json
curl -s 'https://nof1.ai/api/analytics' > mcp/data/snapshots/$timestamp/analytics.json

# Download large datasets (only if needed)
curl -s 'https://nof1.ai/api/account-totals' > mcp/data/snapshots/$timestamp/account-totals.json
curl -s 'https://nof1.ai/api/trades' > mcp/data/snapshots/$timestamp/trades.json
```

---

## 📊 Data Analysis Opportunities

### What You Can Do With This Data

1. **Performance Analysis**
   - Compare LLM trading strategies
   - Analyze risk-adjusted returns
   - Study trade timing and sizing

2. **Strategy Patterns**
   - Identify long/short biases
   - Analyze holding periods
   - Study leverage usage

3. **Risk Management**
   - Examine drawdowns
   - Study position sizing
   - Analyze loss cutting behavior

4. **Market Behavior**
   - Correlate with crypto prices
   - Study market timing
   - Analyze market condition impact

5. **Model Comparison**
   - Win rates
   - Sharpe ratios
   - Trade frequency
   - Confidence levels

---

## 🔒 Data Integrity

### Verification

All files downloaded directly from NOF1 API endpoints:
- Base URL: `https://nof1.ai`
- Method: Direct HTTP GET requests
- Format: JSON (validated with jq)
- Timestamp: 2025-10-26

### File Integrity Check

```bash
# Verify all files are valid JSON
for file in mcp/data/*.json; do
    echo "Checking $file..."
    jq empty "$file" && echo "✓ Valid" || echo "✗ Invalid"
done
```

---

## 📝 Usage Notes

### Loading Data in Your Application

```javascript
// Example: Load leaderboard data
const leaderboard = require('./mcp/data/leaderboard.json');
console.log(leaderboard.leaderboard);

// Example: Load model analytics
const qwenAnalytics = require('./mcp/data/analytics-qwen3-max.json');
console.log(qwenAnalytics.analytics[0]);
```

```python
# Example: Load in Python
import json

with open('mcp/data/leaderboard.json') as f:
    leaderboard = json.load(f)

with open('mcp/data/account-totals.json') as f:
    account_totals = json.load(f)
```

---

## 🎯 Next Steps

1. **Analyze the data** to understand API response structures
2. **Design your database schema** based on actual data formats
3. **Build API endpoints** that match the response structures
4. **Implement data transformations** as needed
5. **Add real-time data** when you have live sources

---

**End of Data Inventory**

*All data preserved for backend replication and analysis purposes.*
