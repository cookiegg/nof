# User Prompt 格式对比分析

## 📋 摘要

通过分析 https://nof1.ai/api/conversations 的6个AI模型对话数据，确认所有模型的 `user_prompt` 格式完全一致。

## 🤖 分析的模型

1. deepseek-chat-v3.1
2. gpt-5
3. qwen3-max
4. claude-sonnet-4-5
5. gemini-2.5-pro
6. grok-4

## 📊 user_prompt 结构

所有模型的 `user_prompt` 包含以下部分：

### 1. 开头信息
```
It has been {minutes} minutes since you started trading. 
The current time is {timestamp} and you've been invoked {count} times. 
Below, we are providing you with a variety of state data, price data, and predictive signals so you can discover alpha. 
Below that is your current account information, value, performance, positions, etc.
```

### 2. 数据排序说明
```
**ALL OF THE PRICE OR SIGNAL DATA BELOW IS ORDERED: OLDEST → NEWEST**

**Timeframes note:** Unless stated otherwise in a section title, intraday series are provided at **3‑minute intervals**. 
If a coin uses a different interval, it is explicitly stated in that coin’s section.
```

### 3. 市场数据 (对每个币种: BTC, ETH, SOL, BNB, XRP, DOGE)

#### 当前指标
```
current_price = {value}, current_ema20 = {value}, current_macd = {value}, current_rsi (7 period) = {value}
```

#### 合约信息
```
Open Interest: Latest: {value}  Average: {value}
Funding Rate: {value}
```

#### 日内序列 (3分钟间隔，10个数据点)
- Mid prices
- EMA indicators (20‑period)
- MACD indicators
- RSI indicators (7‑Period)
- RSI indicators (14‑Period)

#### 长期上下文 (4小时时间框架)
- 20‑Period EMA vs. 50‑Period EMA
- 3‑Period ATR vs. 14‑Period ATR
- Current Volume vs. Average Volume
- MACD indicators
- RSI indicators (14‑Period)

### 4. 账户信息
```
Current Total Return (percent): {value}
Available Cash: {value}
**Current Account Value:** {value}
```

### 5. 当前持仓
```
Current live positions & performance: 
{symbol: {details}, symbol2: {details}, ...}

每个持仓包含:
- symbol
- quantity (正数=多仓，负数=空仓)
- entry_price
- current_price
- liquidation_price
- unrealized_pnl
- leverage
- exit_plan (profit_target, stop_loss, invalidation_condition)
- confidence
- risk_usd
- sl_oid, tp_oid, entry_oid
- notional_usd
```

### 6. Sharpe Ratio
```
Sharpe Ratio: {value}
```

## 📏 数据量统计

| 模型 | user_prompt 长度 |
|------|-----------------|
| deepseek-chat-v3.1 | 11,377 字符 |
| gpt-5 | 11,719 字符 |
| qwen3-max | 9,052 字符 |
| claude-sonnet-4-5 | 9,096 字符 |
| gemini-2.5-pro | 11,294 字符 |
| grok-4 | 11,242 字符 |

**差异原因**: 实时数据不同（时间戳、持仓数量、价格等）

## 🔍 关键发现

1. ✅ **格式完全一致**: 所有模型的 `user_prompt` 结构相同
2. ✅ **内容实时生成**: 每次调用包含最新的市场数据和持仓信息
3. ✅ **数据丰富**: 包含多时间框架的技术指标、持仓详情和风险参数
4. ⚠️ **llm_response**: 大部分模型的 `llm_response.raw_text` 为空，仅包含解析后的结构化数据

## 📝 与本地系统对比

### 本地模板 (user_prompt.hbs)
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

### nof1.ai 实际格式
- 开头更详细（说明数据用途）
- 包含数据排序说明
- 市场数据更结构化（每个币种一个区块）
- 技术指标更丰富（多时间框架）
- 持仓数据以Python字典格式展示

## 🎯 结论

虽然本地模板较简洁，但通过 `buildMarketSections()` 方法生成的实际 prompt 与 nof1.ai 的格式高度一致。区别在于：
- nof1.ai 使用更详细的说明文字
- nof1.ai 的数据展示更结构化（使用Markdown标题）
- 两个系统都提供相同类型的市场数据和账户信息

**建议**: 保持当前的简洁模板风格即可，`buildMarketSections()` 负责生成详细的市场数据。

