# AI交易系统使用指南

## 🚀 快速开始

### 1. 运行交易系统
```bash
cd /data/proj/open_nof1/nof0
node --env-file=./backend/.env backend/test/ai-trading/ai-trading-system.mjs
```

### 2. 系统会自动执行以下流程：
1. **初始化** - 连接到demo.binance.com
2. **获取市场数据** - 分析6个主要加密货币
3. **AI分析** - 使用DeepSeek API进行市场分析
4. **执行交易** - 根据AI建议执行买卖操作
5. **更新状态** - 同步账户和持仓信息

## 📊 系统功能

### 支持的交易对
- BTC/USDT:USDT (比特币)
- ETH/USDT:USDT (以太坊)
- SOL/USDT:USDT (Solana)
- BNB/USDT:USDT (币安币)
- XRP/USDT:USDT (瑞波币)
- DOGE/USDT:USDT (狗狗币)

### AI分析指标
- **技术指标**: EMA20, MACD, RSI14, RSI21, ATR
- **多时间框架**: 1分钟和4小时分析
- **市场数据**: 成交量、资金费率、持仓量
- **风险管理**: 止损、止盈、仓位管理

## 🔧 配置选项

### 环境变量 (backend/.env)
```bash
# DeepSeek API密钥
DEEPSEEK_API_KEY_30="your_deepseek_api_key"

# Binance Demo Trading API
BINANCE_FUTURES_DEMO_API_KEY="your_demo_api_key"
BINANCE_FUTURES_DEMO_API_SECRET="your_demo_api_secret"

# 代理设置 (如果需要)
HTTPS_PROXY="http://127.0.0.1:7890"
HTTP_PROXY="http://127.0.0.1:7890"
```

### 系统参数
- **初始资金**: 10,000 USDT (模拟)
- **杠杆**: 1倍 (无杠杆)
- **交易模式**: 逐仓模式
- **订单类型**: 市价单

## 📈 运行模式

### 单次运行模式 (当前)
- 运行一次完整的交易循环
- 分析市场 → AI决策 → 执行交易 → 更新状态
- 适合测试和验证

### 连续运行模式 (可扩展)
可以修改代码实现连续运行：
```javascript
// 在run()方法中添加循环
setInterval(async () => {
  await this.runTradingCycle();
}, 5 * 60 * 1000); // 每5分钟运行一次
```

## 📊 监控和日志

### 实时监控
系统运行时会显示：
- 🌐 交易环境: demo.binance.com
- 💰 账户余额和持仓
- 📈 总回报率
- 📝 交易记录
- 🤖 AI决策过程

### 日志文件
- `trading-state.json` - 交易状态和持仓信息
- `trading-conversations.json` - AI对话记录
- 控制台输出 - 实时交易信息

### Demo Trading验证
- 在 [demo.binance.com](https://demo.binance.com) 查看交易记录
- 所有订单都有唯一的订单ID
- 可以查看详细的交易历史

## 🎯 使用场景

### 1. 策略测试
- 测试AI交易策略
- 验证技术指标有效性
- 评估风险管理规则

### 2. 学习研究
- 了解AI交易流程
- 分析市场数据
- 研究交易模式

### 3. 系统验证
- 验证API连接
- 测试交易执行
- 检查数据同步

## ⚠️ 注意事项

### 安全提醒
- ✅ 使用模拟资金，无真实风险
- ✅ 所有交易在demo.binance.com进行
- ✅ API密钥仅用于demo环境

### 技术要求
- Node.js 环境
- 稳定的网络连接
- 有效的API密钥

### 限制说明
- 单次运行模式 (可扩展为连续运行)
- 固定交易对 (可修改symbols数组)
- 1倍杠杆 (可调整leverage参数)

## 🔄 自定义配置

### 修改交易对
```javascript
// 在constructor中修改
this.symbols = ['BTC/USDT:USDT', 'ETH/USDT:USDT', 'ADA/USDT:USDT'];
```

### 调整交易参数
```javascript
// 在executeBuyOrder中修改
const quantity = decision.quantity || 0.01; // 增加交易数量
const leverage = 2; // 调整杠杆
```

### 修改AI提示
```javascript
// 在generateUserPrompt中自定义提示词
// 添加更多技术指标或市场数据
```

## 📞 故障排除

### 常见问题
1. **API连接失败** - 检查网络和代理设置
2. **余额不足** - 确认demo账户有足够资金
3. **订单失败** - 检查交易对和数量设置
4. **AI响应错误** - 验证DeepSeek API密钥

### 调试模式
```bash
# 启用详细日志
DEBUG=* node --env-file=./backend/.env backend/test/ai-trading/ai-trading-system.mjs
```

---

**开始使用**: 运行上述命令即可开始AI交易！
**环境**: demo.binance.com (模拟交易)
**风险**: 无真实资金风险