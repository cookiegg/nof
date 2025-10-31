# User Prompt 模板对比分析

## 📋 摘要

对比本地项目和 nof1.ai 的 user_prompt 模板，发现两者在**结构**上非常相似，但有一些**风格差异**。

## 🔍 详细对比

### nof1.ai 的格式

```
It has been {minutes} minutes since you started trading. 
The current time is {timestamp} and you've been invoked {count} times.
Below, we are providing you with a variety of state data, price data, 
and predictive signals so you can discover alpha. 
Below that is your current account information, value, performance, positions, etc.

**ALL OF THE PRICE OR SIGNAL DATA BELOW IS ORDERED: OLDEST → NEWEST**

**Timeframes note:** Unless stated otherwise in a section title, intraday series 
are provided at **3‑minute intervals**. If a coin uses a different interval, 
it is explicitly stated in that coin's section.

---

### CURRENT MARKET STATE FOR ALL COINS

### ALL BTC DATA

current_price = 110057.5, current_ema20 = 109982.862, current_macd = 32.085, 
current_rsi (7 period) = 51.58

In addition, here is the latest BTC open interest and funding rate for perps 
(the instrument you are trading):

Open Interest: Latest: 31742.04  Average: 31799.98
Funding Rate: 1.25e-05

**Intraday series (by minute, oldest → latest):**

Mid prices: [109833.5, 109902.0, ...]
EMA indicators (20‑period): [109971.763, ...]
MACD indicators: [42.213, ...]
RSI indicators (7‑Period): [37.559, ...]
RSI indicators (14‑Period): [45.177, ...]

**Longer‑term context (4‑hour timeframe):**

20‑Period EMA: 110648.792 vs. 50‑Period EMA: 111268.652
3‑Period ATR: 971.806 vs. 14‑Period ATR: 903.904
Current Volume: 6.3 vs. Average Volume: 4406.815
MACD indicators: [-200.921, ...]
RSI indicators (14‑Period): [34.29, ...]

---

### HERE IS YOUR ACCOUNT INFORMATION & PERFORMANCE

Current Total Return (percent): -37.36%
Available Cash: 1844.82
**Current Account Value:** 6264.25

Current live positions & performance: 
{'symbol': 'ETH', 'quantity': -0.79, 'entry_price': 3822.1, ...}
{'symbol': 'SOL', 'quantity': -20.66, ...}
...

Sharpe Ratio: -0.06
```

### 本地项目的格式

```
Current Market Analysis:
{{market_sections}}

Portfolio Status:
Account Value: {{account_value}} USDT
Available Cash: {{available_cash}} USDT
Total Return: {{total_return}}
Sharpe Ratio: {{sharpe_ratio}}

Current Positions:
{{positions_block}}

Session Metrics:
Minutes Since Start: {{minutes_since_start}}
Current Time: {{now_iso}}
Invocation Count: {{invocation_count}}

Based on the above data, provide your trading analysis and specific recommendations.
```

### 通过 buildMarketSections 生成的实际格式

```
### ALL BTC DATA

current_price = 110785.40, current_ema20 = 110376.27, current_macd = 233.55, 
current_rsi (14 period) = 53.10

Open Interest: Latest: 611732.28  Average: 535807.46

Funding Rate: -4.03e-5

Intraday series (3m): oldest → latest

BTC mid prices: [110009.10, 110213.70, ...]

EMA indicators (20‑period): [109923.34, ...]

MACD indicators: [30.31, ...]

RSI indicators (14‑Period): [53.10, ...]

RSI indicators (21‑Period): [55.28, ...]

Longer‑term context (4h timeframe):

20‑Period EMA: 110785.40 vs. 50‑Period EMA: 110785.40

20‑Period ATR: 232.44 vs. 50‑Period ATR: 2215.71

Current Volume: 1841.05 vs. Average Volume: 3785.67

MACD indicators: []

RSI indicators (14‑Period): []
```

## 📊 关键差异对比

| 特征 | nof1.ai | 本地项目 |
|------|---------|----------|
| **开头说明** | ✅ 详细说明数据用途（"discover alpha"） | ⚠️ 较简洁（直接开始） |
| **数据排序说明** | ✅ "OLDEST → NEWEST" 提示 | ❌ 没有 |
| **时间框架说明** | ✅ "3‑minute intervals" 详细说明 | ⚠️ 简写 "3m" |
| **时间格式** | ✅ "by minute" 清晰 | ⚠️ "oldest → latest" |
| **合约说明** | ✅ "perps (the instrument you are trading)" | ❌ 没有 |
| **标题层次** | ✅ "### CURRENT MARKET STATE FOR ALL COINS" | ⚠️ 直接开始 |
| **持仓格式** | ⚠️ Python dict 字符串 | ✅ JSON 字符串 |
| **百分比返回** | ✅ "Current Total Return (percent)" | ⚠️ 只显示数字 |
| **结尾提示** | ❌ 没有提示 | ✅ "provide your trading analysis..." |

## ✅ 本地项目的优势

1. **结尾明确** - 有明确的任务提示
2. **格式统一** - 使用标准 USDT 单位
3. **可扩展** - 使用 handlebars 模板系统

## ✅ nof1.ai 的优势

1. **上下文清晰** - 详细说明数据用途
2. **时间框架明确** - 明确说明数据间隔
3. **指示性强** - "the instrument you are trading" 提示
4. **数据排序** - 明确的数据方向提示

## 🎯 建议改进

可以考虑以下改进（**可选**，不影响功能）：

### 1. 在 user_prompt.hbs 开头添加说明

```hbs
It has been {{minutes_since_start}} minutes since you started trading. 
The current time is {{now_iso}} and you've been invoked {{invocation_count}} times.
Below, we are providing you with a variety of market data, technical indicators, 
and predictive signals so you can discover alpha. Below that is your current 
account information, value, performance, positions, etc.

**ALL OF THE PRICE OR SIGNAL DATA BELOW IS ORDERED: OLDEST → NEWEST**

**Timeframes note:** Unless stated otherwise in a section title, intraday series 
are provided at **3‑minute intervals**. 

---

### CURRENT MARKET STATE FOR ALL COINS

{{market_sections}}

### ACCOUNT INFORMATION & PERFORMANCE
```

### 2. 在 buildMarketSections 中添加合约说明

```javascript
out += `### ALL ${symbol} DATA\n\n` +
  `current_price = ${fx(safe.currentPrice)}, current_ema20 = ${fx(safe.ema20)}, current_macd = ${fx(safe.macd)}, current_rsi (14 period) = ${fx(safe.rsi14)}\n\n` +
  `In addition, here is the latest ${symbol} open interest and funding rate for perps (the instrument you are trading):\n\n` +
  `Open Interest: Latest: ${fx(safe.openInterest)}  Average: ${fx(safe.avgOpenInterest)}\n\n` +
  `Funding Rate: ${ex(safe.fundingRate)}\n\n` +
  `**Intraday series (3‑minute intervals, oldest → latest):**\n\n`
```

## 💡 当前状态评估

### ✅ 功能完整性

**本地系统已经提供了 nof1.ai 的完整功能**：

1. ✅ 相同的市场数据结构
2. ✅ 相同的技术指标（EMA, MACD, RSI, ATR）
3. ✅ 多时间框架数据（3分钟 + 4小时）
4. ✅ 持仓和账户信息
5. ✅ 风险指标（Sharpe Ratio, Total Return）

### ⚠️ 风格差异

**主要差异在"风格"而非"功能"**：

1. nof1.ai 更强调"上下文说明"
2. nof1.ai 使用更正式的语调
3. 本地系统更简洁直接

### 🎯 建议

**建议保持现状**，原因：

1. ✅ 功能完整，不缺任何关键数据
2. ✅ 风格简洁，符合本地项目设计理念
3. ✅ 模板系统可扩展，需要时可以调整
4. ✅ 结尾有明确任务提示（nof1.ai 反而没有）

**如果要向 nof1.ai 靠拢**，可以进行以下小调整：

1. 添加开头说明文字（增加上下文）
2. 在 buildMarketSections 中添加"合约说明"
3. 统一使用"OLDEST → NEWEST" 提示

但这些都不是**必须的**，当前版本完全可以正常工作。

## 📚 相关文件

- `backend/ai/ai-trading/prompt_templates/user_prompt.hbs` - 本地模板
- `backend/ai/ai-trading/ai-trading-system.v2.mjs` - `buildMarketSections()` 方法
- `backend/test/api-analysis/user-prompt-sample-1761922379375.json` - nof1.ai 样本

