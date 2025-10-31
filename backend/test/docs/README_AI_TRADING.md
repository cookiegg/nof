# AI交易系统使用说明

## 🎯 系统概述

这是一个基于DeepSeek API的AI交易系统，模拟nof1.ai的交易模式，包括：
- 实时市场数据获取
- 技术指标计算
- AI决策生成
- 状态持久化
- 对话记录管理

## 📁 文件结构

```
backend/test/
├── ai-trading-system.mjs          # 主交易系统
├── run-ai-trading.mjs             # 定时运行脚本
├── view-trading-status.mjs        # 状态查看脚本
├── trading-state.json             # 交易状态文件（自动生成）
├── trading-conversations.json     # 对话记录文件（自动生成）
└── README_AI_TRADING.md           # 本说明文档
```

## 🚀 快速开始

### 1. 环境配置

确保在 `backend/.env` 文件中设置了以下环境变量：

```bash
# DeepSeek API密钥
DEEPSEEK_API_KEY_30="your_deepseek_api_key"

# Binance Futures API（用于获取市场数据）
BINANCE_FUTURES_DEMO_API_KEY="your_binance_api_key"
BINANCE_FUTURES_DEMO_API_SECRET="your_binance_secret"
BINANCE_TESTNET=true

# 代理设置（如果需要）
HTTPS_PROXY="http://127.0.0.1:7890"
HTTP_PROXY="http://127.0.0.1:7890"
```

### 2. 运行单次交易

```bash
# 运行一次AI交易分析
node --env-file=./backend/.env backend/test/ai-trading-system.mjs
```

### 3. 定时运行交易

```bash
# 每3分钟运行一次（默认）
node --env-file=./backend/.env backend/test/run-ai-trading.mjs

# 每5分钟运行一次
node --env-file=./backend/.env backend/test/run-ai-trading.mjs 5

# 每1分钟运行一次
node --env-file=./backend/.env backend/test/run-ai-trading.mjs 1
```

### 4. 查看交易状态

```bash
# 查看当前状态和交易历史
node backend/test/view-trading-status.mjs
```

## 📊 系统功能

### 1. 市场数据获取
- **币种**: BTC, ETH, SOL, BNB, XRP, DOGE
- **数据源**: Binance Futures API
- **时间框架**: 1分钟、4小时
- **指标**: 价格、成交量、持仓量、资金费率

### 2. 技术指标计算
- **EMA**: 指数移动平均线（20期）
- **MACD**: 移动平均收敛发散
- **RSI**: 相对强弱指数（14期、21期）
- **ATR**: 平均真实波幅

### 3. AI决策生成
- **模型**: DeepSeek Chat
- **输入**: 完整的市场数据和账户信息
- **输出**: 结构化的交易决策JSON
- **特点**: 包含分析、风险评估、具体操作建议

### 4. 状态管理
- **开始时间**: 系统启动时间
- **调用次数**: AI API调用计数
- **账户价值**: 模拟账户总价值
- **持仓信息**: 当前持仓详情
- **交易历史**: 完整的对话记录

## 🔧 核心特性

### 1. 时间记录
```javascript
// 系统自动记录
startTime: "2025-10-28T12:40:34.000Z"  // 开始交易时间
invocationCount: 1                      // 调用次数
lastUpdate: "2025-10-28T12:41:05.000Z" // 最后更新时间
```

### 2. User Prompt生成
```javascript
// 完全匹配nof1.ai格式
"It has been 0 minutes since you started trading. 
The current time is 2025-10-28T12:41:05.000Z and you've been invoked 1 times."
```

### 3. AI响应解析
```javascript
// 结构化的交易决策
{
  "analysis": {
    "market_conditions": "...",
    "risk_assessment": "...",
    "opportunities": "..."
  },
  "trading_decisions": [
    {
      "asset": "BTC",
      "action": "BUY",
      "size_percent": 40,
      "reason": "...",
      "stop_loss_percent": 1,
      "take_profit_percent": 2.5
    }
  ],
  "risk_management": {
    "max_position_size": "60% of portfolio",
    "portfolio_diversification": "...",
    "liquidity_note": "..."
  }
}
```

## 📈 状态文件说明

### trading-state.json
```json
{
  "startTime": "2025-10-28T12:40:34.000Z",
  "invocationCount": 1,
  "totalReturn": -0.44,
  "accountValue": 9956.46,
  "availableCash": 1991.29,
  "positions": [],
  "lastUpdate": "2025-10-28T12:41:05.000Z",
  "tradingEnabled": true
}
```

### trading-conversations.json
```json
{
  "conversations": [
    {
      "timestamp": "2025-10-28T12:41:05.000Z",
      "invocationCount": 1,
      "userPrompt": "It has been 0 minutes since...",
      "aiResponse": "Based on the market analysis...",
      "decision": {...},
      "accountValue": 9956.46,
      "totalReturn": -0.44
    }
  ],
  "lastUpdate": "2025-10-28T12:41:05.000Z"
}
```

## 🛠️ 自定义配置

### 1. 修改交易币种
在 `ai-trading-system.mjs` 中修改：
```javascript
this.symbols = ['BTC/USDT:USDT', 'ETH/USDT:USDT', 'SOL/USDT:USDT'];
```

### 2. 调整技术指标参数
```javascript
// 修改RSI周期
const rsi14 = this.calculateRSI(prices, 14);  // 改为其他值
const rsi21 = this.calculateRSI(prices, 21);  // 改为其他值
```

### 3. 修改AI提示词
在 `callDeepSeekAPI` 方法中修改system prompt：
```javascript
content: 'You are an expert cryptocurrency trader. Analyze the market data and provide trading decisions in JSON format. Focus on risk management and profit maximization.'
```

## 📊 监控和调试

### 1. 实时监控
```bash
# 持续查看状态
watch -n 10 "node backend/test/view-trading-status.mjs"
```

### 2. 日志分析
```bash
# 查看详细日志
node --env-file=./backend/.env backend/test/ai-trading-system.mjs 2>&1 | tee trading.log
```

### 3. 状态重置
```bash
# 删除状态文件重新开始
rm backend/test/trading-state.json
rm backend/test/trading-conversations.json
```

## ⚠️ 注意事项

1. **API限制**: DeepSeek API有调用频率限制，请合理设置运行间隔
2. **网络连接**: 需要稳定的网络连接访问Binance API
3. **代理设置**: 如果在中国大陆，可能需要设置代理
4. **数据准确性**: 系统使用模拟交易，不会进行真实交易
5. **资源消耗**: 频繁运行会消耗API调用次数和系统资源

## 🔮 未来改进

1. **真实交易集成**: 连接真实的交易API
2. **更多技术指标**: 添加布林带、KDJ等指标
3. **风险管理**: 实现更复杂的风险控制逻辑
4. **回测功能**: 支持历史数据回测
5. **Web界面**: 创建Web监控界面
6. **多模型支持**: 支持多个AI模型对比

## 📞 支持

如有问题，请检查：
1. 环境变量是否正确设置
2. 网络连接是否正常
3. API密钥是否有效
4. 代理设置是否正确

---

*创建时间: 2025-10-28*
*版本: v1.0*
*作者: AI Assistant*