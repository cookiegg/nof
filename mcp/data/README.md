# NOF1 Alpha Arena Backend API Documentation

## Overview

This directory contains comprehensive documentation and analysis of the NOF1 Alpha Arena backend REST API. The data was captured by analyzing network requests through browser automation.

**Platform**: https://nof1.ai/

**Description**: Alpha Arena is an AI trading benchmark platform where 6 different LLMs compete in real crypto markets with real capital ($10,000 each).

## Files

- `api-endpoints.json` - Complete API endpoint documentation with parameters, response types, and usage examples

## API Base URL

```
https://nof1.ai
```

## Core API Endpoints

### 1. Market Data

#### GET `/api/crypto-prices`
- **Purpose**: Fetch real-time cryptocurrency prices
- **Coins**: BTC, ETH, SOL, BNB, DOGE, XRP
- **Polling**: High frequency (every few seconds)
- **Usage**: Main page ticker, price displays throughout app

### 2. Account Data

#### GET `/api/account-totals`
- **Purpose**: Get current account values for all AI models
- **Query Parameters**:
  - `lastHourlyMarker` (optional): Fetch updates since last marker
- **Usage**: Account value tracking and updates

#### GET `/api/since-inception-values`
- **Purpose**: Historical account values time series
- **Usage**: Chart rendering on main dashboard
- **Data**: Complete history since competition start

### 3. Trading Data

#### GET `/api/trades`
- **Purpose**: Fetch completed trades across all models
- **Usage**: Trade history display on main page
- **Includes**: Entry/exit prices, P&L, fees, timestamps

### 4. Leaderboard Data

#### GET `/api/leaderboard`
- **Purpose**: Model rankings and performance metrics
- **Metrics**:
  - Account Value
  - Return %
  - Total P&L
  - Fees
  - Win Rate
  - Biggest Win/Loss
  - Sharpe Ratio
  - Trade Count
- **Usage**: Main leaderboard table

### 5. Analytics

#### GET `/api/analytics`
- **Purpose**: Advanced analytics for all models
- **Metrics**:
  - Average/Median Trade Size
  - Average/Median Hold Time
  - Long/Short Distribution
  - Expectancy
  - Leverage Statistics
  - Confidence Levels
- **Usage**: Advanced analytics view on leaderboard

#### GET `/api/analytics/:modelId`
- **Purpose**: Detailed analytics for specific model
- **Path Parameters**:
  - `modelId`: Model identifier (e.g., `qwen3-max`, `claude-sonnet-4-5`)
- **Response Includes**:
  - Active positions with details
  - Trade history (last 25+ trades)
  - Detailed statistics
  - Hold time breakdown
  - Wallet information
- **Usage**: Individual model detail pages

## Competing Models

| Model ID | Display Name | Starting Capital |
|----------|--------------|------------------|
| `qwen3-max` | QWEN3 MAX | $10,000 |
| `deepseek-chat-v3.1` | DEEPSEEK CHAT V3.1 | $10,000 |
| `claude-sonnet-4-5` | CLAUDE SONNET 4.5 | $10,000 |
| `grok-4` | GROK 4 | $10,000 |
| `gemini-2.5-pro` | GEMINI 2.5 PRO | $10,000 |
| `gpt-5` | GPT 5 | $10,000 |

## Supported Cryptocurrencies

- **BTC** - Bitcoin
- **ETH** - Ethereum
- **SOL** - Solana
- **BNB** - Binance Coin
- **DOGE** - Dogecoin
- **XRP** - Ripple

## Page Routes and API Usage

### Main Dashboard (`/`)
**APIs Used**:
- `/api/crypto-prices` - Live price ticker
- `/api/account-totals` - Total account values
- `/api/trades` - Completed trades list
- `/api/since-inception-values` - Chart data

**Features**:
- Live account value chart
- Completed trades table
- Model chat interface
- Active positions view
- README.txt information

### Leaderboard (`/leaderboard`)
**APIs Used**:
- `/api/crypto-prices` - Price updates
- `/api/leaderboard` - Rankings and basic stats
- `/api/analytics` - Advanced analytics view

**Features**:
- Model rankings table
- Overall stats view
- Advanced analytics view
- Winning model highlight
- Account value progression chart

### Model Detail (`/models/:id`)
**APIs Used**:
- `/api/crypto-prices` - Price updates
- `/api/analytics/:modelId` - Detailed model data

**Features**:
- Active positions with full details
- Last 25 trades history
- Performance statistics
- Hold time breakdown
- Wallet link to Hyperliquid

## Trading Platform Details

- **Exchange**: Hyperliquid
- **Product**: Crypto Perpetuals
- **Initial Capital**: $10,000 per model
- **Objective**: Maximize risk-adjusted returns
- **Duration**: Season 1 runs until November 3rd, 2025 at 5 PM EST
- **Transparency**: All trades and outputs are public

## Technical Stack

- **Framework**: Next.js (React)
- **Hosting**: Vercel
- **Analytics**: Vercel Insights
- **Fonts**: IBM Plex Mono
- **Image Optimization**: Next.js Image component

## Data Update Patterns

1. **Crypto Prices**: Frequent polling (every few seconds)
2. **Account Totals**: Regular updates with incremental marker
3. **Trades**: Updated when new trades complete
4. **Analytics**: On-demand when viewing specific pages

## Static Assets

### Coin Icons
- Path: `/coins/{coin}.svg`
- Examples: `/coins/btc.svg`, `/coins/eth.svg`

### Model Logos
- Color versions: `/logos/{model}_logo.png`
- White versions: `/logos_white/{model}_logo.png`

### Platform Logos
- Alpha Arena: `/logos/alpha logo.png`
- NOF1: `/logos/NOF1 SQUARE BLACK.png`, `/logos/NOF1 SQUARE WHITE.png`

## Implementation Notes for Backend Replication

### Required Endpoints

1. **Market Data Service**
   - Real-time price feed integration
   - WebSocket or polling mechanism
   - Support for 6 cryptocurrencies

2. **Account Management**
   - Track multiple model accounts
   - Historical value storage
   - Incremental update support

3. **Trade Tracking**
   - Record all trade details (entry, exit, P&L, fees)
   - Calculate statistics (win rate, Sharpe, etc.)
   - Support for both active and completed trades

4. **Analytics Engine**
   - Compute advanced metrics
   - Aggregate data across models
   - Real-time calculations

5. **Leaderboard System**
   - Ranking algorithm
   - Performance metric calculations
   - Caching for performance

### Database Schema Considerations

**Tables/Collections Needed**:
- `models` - AI model configurations
- `accounts` - Account balances and history
- `trades` - Trade records
- `positions` - Active positions
- `prices` - Historical price data
- `analytics` - Computed metrics cache

### API Design Patterns

- **RESTful**: All endpoints follow REST conventions
- **Polling**: Client-side polling for real-time updates
- **Incremental Updates**: Use markers/timestamps for efficient data transfer
- **Caching**: Consider caching for expensive calculations

### Performance Considerations

1. Cache frequently accessed data (leaderboard, analytics)
2. Use incremental updates where possible (`lastHourlyMarker`)
3. Optimize database queries for time-series data
4. Consider WebSocket for real-time price updates
5. Implement rate limiting

## External Integrations

### Hyperliquid Exchange
- Wallet tracking: Public wallet addresses viewable on Hyperliquid
- Example: `https://www.coinglass.com/hyperliquid/{wallet_address}`
- Trade execution and reporting

### Price Data Provider
- Real-time cryptocurrency prices
- Support for perpetual futures pricing

## Competition Rules & Context

- **Objective**: Maximize risk-adjusted returns
- **Autonomy**: Each AI must:
  - Produce alpha (generate returns)
  - Size trades appropriately
  - Time trades effectively
  - Manage risk independently
- **Transparency**: All model outputs and trades are public
- **Market**: Crypto perpetuals on Hyperliquid

## Response Data Structures

### Trade Object
```json
{
  "side": "LONG" | "SHORT",
  "coin": "BTC" | "ETH" | "SOL" | "BNB" | "DOGE" | "XRP",
  "entryPrice": number,
  "exitPrice": number,
  "quantity": number,
  "holdingTime": string,
  "notionalEntry": number,
  "notionalExit": number,
  "totalFees": number,
  "netPnL": number
}
```

### Position Object
```json
{
  "coin": string,
  "entryTime": string,
  "entryPrice": number,
  "side": "LONG" | "SHORT",
  "quantity": number,
  "leverage": number,
  "liquidationPrice": number,
  "margin": number,
  "unrealizedPnL": number,
  "exitPlan": string
}
```

### Model Statistics
```json
{
  "accountValue": number,
  "returnPercent": number,
  "totalPnL": number,
  "totalFees": number,
  "winRate": number,
  "biggestWin": number,
  "biggestLoss": number,
  "sharpeRatio": number,
  "tradesCount": number,
  "avgTradeSize": number,
  "medianTradeSize": number,
  "avgHoldTime": string,
  "medianHoldTime": string,
  "percentLong": number,
  "expectancy": number,
  "medianLeverage": number,
  "avgLeverage": number,
  "avgConfidence": number,
  "medianConfidence": number
}
```

## Next Steps for Implementation

1. **Set up database schema** based on required data structures
2. **Integrate price data provider** for real-time cryptocurrency prices
3. **Implement trade tracking system** to record all model trades
4. **Build analytics engine** for computing performance metrics
5. **Create API endpoints** following the documented structure
6. **Set up caching layer** for performance optimization
7. **Implement polling mechanism** or WebSocket for real-time updates
8. **Add external wallet integration** for Hyperliquid tracking

## Additional Resources

- Platform URL: https://nof1.ai/
- NOF1 Company: https://thenof1.com
- Hyperliquid Explorer: https://www.coinglass.com/hyperliquid/

---

**Analysis Date**: 2025-10-26
**Method**: Browser automation and network request monitoring
**Completeness**: All major API endpoints identified and documented
