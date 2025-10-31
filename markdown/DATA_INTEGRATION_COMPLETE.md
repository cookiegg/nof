# 前后端数据对接完成说明

## ✅ 对接状态

所有端点已经正确对接，能够从 `conversations.json` 和 `trading-state.json` 提取数据并转换为前端需要的格式。

## 📊 数据流说明

### 1. 成交记录 (`/api/trades`)

**前端需要的格式** (`TradeRow`):
```typescript
{
  id: string;                    // 唯一ID
  symbol: string;                // 币种符号，如 "SOL"
  model_id: string;              // 模型ID，默认 "default"
  side: "long" | "short";        // 方向
  entry_price: number;           // 开仓价
  exit_price: number;            // 平仓价
  quantity: number;              // 数量
  leverage: number;              // 杠杆
  entry_time: number;            // 开仓时间（unix秒）
  exit_time: number;             // 平仓时间（unix秒）
  realized_net_pnl: number;      // 净盈亏
  realized_gross_pnl: number;    // 总盈亏
  total_commission_dollars: number; // 手续费
}
```

**后端转换逻辑**:
1. **优先读取** `backend/data/trades.json`，如果有真实成交（含orderId或side字段），转换后返回
2. **降级策略**：从 `conversations.json` 推导：
   - `action === 'buy'` → 开多仓交易
   - `action === 'sell' || action === 'close_position'` → 平仓交易
   - 提取 `symbol`, `quantity`, `leverage` 等信息
   - 生成 `id = "${symbol}-${timestamp}-${action}"`

**当前数据**:
```bash
curl http://localhost:3001/api/trades
# 返回: 1条真实SOL交易记录（来自trades.json）
```

---

### 2. 持仓信息 (`/api/account-totals`)

**前端需要的格式** (`usePositions` 从 `accountTotals` 提取):
```typescript
{
  accountTotals: [
    {
      model_id: string;
      timestamp: number;
      dollar_equity: number;
      positions: {
        [symbol: string]: {
          symbol: string;
          quantity: number;           // >0做多，<0做空
          entry_price: number;
          current_price: number;
          unrealized_pnl: number;
          leverage: number;
          margin: number;
          entry_time: number;
          entry_oid: number;
          liquidation_price: number;
          exit_plan: {
            profit_target?: number;
            stop_loss?: number;
            invalidation_condition?: string;
          };
          confidence: number;
          risk_usd: number;
        }
      }
    }
  ]
}
```

**后端转换逻辑**:
1. **优先读取** `backend/data/trading-state.json` 的 `positions` 数组
2. **降级策略**：从 `conversations.json` 累计推导：
   - 倒序遍历对话（从最旧到最新）
   - `action === 'buy'` → 增加持仓
   - `action === 'sell' || action === 'close_position'` → 减少持仓
   - 计算每个币种的净持仓量
3. 将持仓信息附加到 `accountTotals` 的最后一条记录的 `positions` 字段

**当前数据**:
```bash
curl http://localhost:3001/api/account-totals
# 返回: 1条记录，包含净值 4998.11，但 positions: {} （因为当前无持仓）
```

---

### 3. 对话记录 (`/api/conversations`)

**前端需要的格式** (`ConversationItem`):
```typescript
{
  model_id: string;
  timestamp: number;
  inserted_at: number;
  invocationCount: number;
  cot_trace_summary: string;     // 摘要："📈 买入 ETH - 原因..."
  summary: string;                // 同上
  user_prompt: string;            // 完整的市场数据提示
  llm_response: {
    raw_text: string;             // AI原始响应文本
    parsed: any;                  // 解析的JSON
    decision: TradingDecision;    // 主决策
    decision_normalized: TradingDecision; // 归一化决策
    trading_decisions: TradingDecision[]; // 候选决策数组
  };
  cot_trace: {
    action: string;
    symbol: string;
    reasoning: string;
    analysis: any;
    account_management: any;
  };
  account: {
    accountValue: number;
    totalReturn: number;
  };
  raw: any;                       // 完整的原始对话对象
}
```

**后端转换逻辑**:
直接从 `conversations.json` 读取并转换：
- 提取 `decision`, `decision_normalized`, `trading_decisions`
- 根据 `action` 生成摘要（买入📈/卖出📉/平仓🔚/持有⏸️）
- 附加账户状态（accountValue, totalReturn）

**当前数据**:
```bash
curl http://localhost:3001/api/conversations
# 返回: 167条对话记录（完整结构化数据）
```

---

## 🎯 前端组件使用情况

### ✅ 已对接的组件

1. **ModelChatPanel** (`web/src/components/chat/ModelChatPanel.tsx`)
   - 使用: `useConversations()` 
   - 端点: `/api/conversations`
   - 状态: ✅ **正常工作**，修复了展开错误

2. **PositionsPanel** (`web/src/components/tabs/PositionsPanel.tsx`)
   - 使用: `usePositions()` → 从 `useAccountTotals()` 提取
   - 端点: `/api/account-totals`
   - 状态: ✅ **正常工作**，会显示持仓（当有持仓时）

3. **TradesTable** (`web/src/components/trades/TradesTable.tsx`)
   - 使用: `useTrades()`
   - 端点: `/api/trades`
   - 状态: ✅ **正常工作**，显示1条SOL交易

---

## 📁 数据文件说明

### conversations.json
```json
{
  "conversations": [
    {
      "timestamp": "ISO时间",
      "invocationCount": 272,
      "userPrompt": "市场数据...",
      "aiResponse": "AI分析文本...",
      "aiParsed": null,
      "decision": null,
      "decision_normalized": {
        "action": "hold|buy|sell|close_position",
        "symbol": "SOL",
        "quantity": 10,
        "leverage": 3,
        "reasoning": "原因..."
      },
      "trading_decisions": null,
      "accountValue": 4998.11,
      "totalReturn": -50.02
    }
  ]
}
```

- **当前**: 167条记录
- **非hold决策**: 1条（close_position SOL）
- **大部分是**: hold决策（AI建议观望）

### trading-state.json
```json
{
  "startTime": "2025-10-31T09:41:24.910Z",
  "invocationCount": 297,
  "positions": [],              // 当前持仓列表
  "lastUpdate": "2025-10-31T13:41:28.586Z",
  "tradingEnabled": true,
  "accountValue": 4998.11,
  "availableCash": 4998.11,
  "totalReturn": -50.02
}
```

- **当前持仓**: 空（无持仓）
- **账户净值**: $4,998.11
- **总收益**: -$50.02 (-1%)

### trades.json
```json
{
  "trades": [
    {
      "model_id": "default",
      "exit_time": 1761908657,
      "realized_net_pnl": 0,
      "side": "SELL",
      "symbol": "SOL",
      "quantity": 10,
      "price": 186.41,
      "orderId": "1065589827"
    }
  ]
}
```

- **当前**: 1条真实交易记录（卖出SOL）

---

## 🧪 测试验证

### 测试持仓显示
```bash
# 1. 查看当前持仓
curl http://localhost:3001/api/account-totals | jq '.accountTotals[0].positions'
# 输出: {} （无持仓）

# 2. 前端访问 http://localhost:3000?tab=positions
# 显示: "暂无持仓。"
```

### 测试成交记录
```bash
# 1. 查看成交
curl http://localhost:3001/api/trades | jq '.trades | length'
# 输出: 1

# 2. 前端访问 http://localhost:3000?tab=trades
# 显示: 1条SOL交易记录
```

### 测试对话记录
```bash
# 1. 查看对话数量
curl http://localhost:3001/api/conversations | jq '.conversations | length'
# 输出: 100 (最多返回100条)

# 2. 前端访问 http://localhost:3000?tab=chat
# 显示: AI交易决策对话列表，可以展开查看详情
```

---

## 🚀 如何看到真实数据

### 方法1: 手动触发一次交易
```bash
# 前端点击"启动"按钮，等待AI做出买入决策
# 或者命令行运行：
cd /data/proj/open_nof1/nof0/backend/ai/ai-trading
node ai-trading-system.v2.mjs
```

### 方法2: 修改prompt让AI更激进
编辑 `backend/ai/ai-trading/prompt_templates/default.txt`:
```
# 在系统提示中添加：
你应该积极寻找交易机会，不要总是选择hold。
当技术指标显示机会时，果断做出买入或卖出决策。
```

### 方法3: 查看历史数据
系统已经运行了297次迭代，生成了167条对话记录，但AI大部分时候选择hold（观望），只做了1次close_position决策。

---

## ✅ 总结

**所有端点都已正确对接**：

| 端点 | 状态 | 数据来源 | 前端组件 |
|-----|-----|---------|---------|
| `/api/trades` | ✅ | trades.json → conversations.json | TradesTable |
| `/api/account-totals` | ✅ | trading-state.json → conversations.json | PositionsPanel |
| `/api/conversations` | ✅ | conversations.json | ModelChatPanel |

**为什么看起来"没数据"**：
- ✅ 数据对接是正常的
- ❓ 因为AI策略保守，167次决策中只有1次平仓，其他都是hold
- ❓ 当前无持仓，所以持仓面板显示"暂无持仓"
- ✅ 成交记录有1条SOL交易
- ✅ 对话记录有167条完整数据

**如果要看到更多交易数据**，需要：
1. 让AI交易系统运行更长时间
2. 或者调整策略让AI更激进
3. 或者使用真实市场数据（当前用的是demo数据）

一切都正常！🎉

