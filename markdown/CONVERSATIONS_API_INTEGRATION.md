# Conversations API 对接方案

## 📋 概述

本文档说明如何将AI交易系统的对话数据与前端进行完整对接，实现结构化交易决策数据的展示。

## 🔄 数据流

```
AI交易系统 (ai-trading-system.v2.mjs)
    ↓
保存对话 (saveConversation)
    ↓
conversations.json (结构化数据)
    ↓
后端API (/api/nof1/conversations)
    ↓
前端Hook (useConversations)
    ↓
展示组件 (TradingConversationPanel)
```

## 📦 数据结构

### 1. 后端保存格式 (conversations.json)

```json
{
  "conversations": [
    {
      "timestamp": "2025-10-31T10:00:39.695Z",
      "invocationCount": 3,
      "userPrompt": "市场分析提示...",
      "aiResponse": "AI完整响应文本...",
      "aiParsed": {
        "analysis": {
          "market_summary": "市场总结",
          "key_observations": ["观察1", "观察2"]
        },
        "trading_decision": {
          "action": "BUY",
          "symbol": "ETH/USDT:USDT",
          "quantity": 1,
          "leverage": 3,
          "reasoning": "决策理由"
        },
        "trading_decisions": [
          {
            "action": "HOLD",
            "symbol": "SOL/USDT:USDT",
            "quantity": 10,
            "leverage": 1,
            "reasoning": "候选决策理由"
          }
        ],
        "account_management": {
          "current_value": 4999.17,
          "available_cash": 4906.78,
          "total_return": -50.01,
          "sharpe_ratio": -0.36,
          "recommendations": ["建议1", "建议2"]
        }
      },
      "decision": {
        "action": "BUY",
        "symbol": "ETH/USDT:USDT",
        "quantity": 1,
        "leverage": 3,
        "reasoning": "主决策"
      },
      "decision_normalized": {
        "action": "hold",
        "symbol": "SOL",
        "quantity": 10,
        "reasoning": "归一化执行决策"
      },
      "trading_decisions": [...],
      "accountValue": 4999.17,
      "totalReturn": -50.01
    }
  ]
}
```

### 2. API 返回格式 (/api/nof1/conversations)

```json
{
  "conversations": [
    {
      "model_id": "deepseek-chat",
      "timestamp": 1730373639,
      "inserted_at": 1730373639,
      "invocationCount": 3,
      
      "cot_trace_summary": "📈 买入 ETH - ETH severely oversold...",
      "summary": "📈 买入 ETH - ETH severely oversold...",
      
      "user_prompt": "市场分析提示...",
      
      "llm_response": {
        "raw_text": "AI完整响应",
        "parsed": { ... },
        "decision": { ... },
        "decision_normalized": { ... },
        "trading_decisions": [ ... ]
      },
      
      "cot_trace": {
        "action": "buy",
        "symbol": "ETH",
        "reasoning": "...",
        "analysis": { ... },
        "account_management": { ... }
      },
      
      "account": {
        "accountValue": 4999.17,
        "totalReturn": -50.01
      },
      
      "raw": { /* 完整原始数据 */ }
    }
  ]
}
```

### 3. 前端TypeScript类型

```typescript
// 交易决策
export interface TradingDecision {
  action: 'buy' | 'sell' | 'close_position' | 'hold';
  symbol?: string;
  quantity?: number;
  leverage?: number;
  reasoning?: string;
}

// LLM响应
export interface LLMResponse {
  raw_text: string;
  parsed: {
    analysis?: {
      market_summary?: string;
      key_observations?: string[];
    };
    trading_decision?: TradingDecision;
    trading_decisions?: TradingDecision[];
    account_management?: { ... };
  } | null;
  decision: TradingDecision | null;
  decision_normalized: TradingDecision | null;
  trading_decisions: TradingDecision[] | null;
}

// 对话条目
export interface ConversationItem {
  model_id: string;
  timestamp: number;
  invocationCount?: number;
  cot_trace_summary?: string;
  user_prompt?: string;
  llm_response?: LLMResponse;
  cot_trace?: CoTTrace;
  account?: {
    accountValue: number;
    totalReturn: number;
  };
  raw?: any;
}
```

## 🔧 关键修改

### 1. 后端 - AI交易系统 (ai-trading-system.v2.mjs)

**修改的方法**: `saveConversation()`

**新功能**:
- ✅ 完整保存AI解析后的JSON结构 (`aiParsed`)
- ✅ 保存原始决策对象 (`decision`)
- ✅ 保存归一化决策 (`decision_normalized`)
- ✅ 保存候选决策数组 (`trading_decisions`)
- ✅ 自动提取主决策（优先选择与持仓相关的）

### 2. 后端 - API路由 (nof1.js)

**端点**: `GET /api/nof1/conversations`

**新功能**:
- ✅ 解析conversations.json的完整结构
- ✅ 生成智能摘要 (emoji + 决策 + 简短理由)
- ✅ 将时间戳转换为Unix时间戳
- ✅ 提取并结构化所有决策信息
- ✅ 兼容nof1.ai的数据格式

### 3. 前端 - 类型定义 (useConversations.ts)

**新类型**:
- `TradingDecision` - 交易决策
- `LLMResponse` - LLM响应结构
- `CoTTrace` - 思维链追踪
- `ConversationItem` (增强版) - 包含所有结构化数据

### 4. 前端 - 展示组件 (TradingConversationPanel.tsx)

**新组件**:
- `DecisionBadge` - 决策徽章（买入📈/卖出📉/平仓🔚/观望⏸️）
- `TradingDecisionCard` - 决策卡片
- `ConversationCard` - 单条对话展示（可展开）
- `TradingConversationPanel` - 主面板

**功能特性**:
- ✅ 列表视图显示所有对话
- ✅ 一键展开/折叠详情
- ✅ 显示市场分析摘要
- ✅ 显示主决策和候选决策
- ✅ 显示账户管理建议
- ✅ 显示账户状态和收益
- ✅ 可查看AI原始响应

## 🎨 UI展示示例

```
┌─────────────────────────────────────────────────────┐
│ AI交易对话记录                           3 条记录   │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ ▶  │
│ │ [📈 买入] ETH #3                            │     │
│ │ ETH severely oversold with RSI 29.73...     │     │
│ │ 账户: $4999.17  收益: -50.01%  10:00:39    │     │
│ └─────────────────────────────────────────────┘     │
│                                                     │
│ ┌─────────────────────────────────────────────┐ ▼  │
│ │ [⏸️ 观望] SOL #2                             │     │
│ │ Existing SOL position near breakeven...     │     │
│ │ 账户: $4999.35  收益: -50.01%  09:59:22    │     │
│ │ ────────────────────────────────────────    │     │
│ │ 📊 市场分析                                 │     │
│ │ BTC shows bearish momentum with price...   │     │
│ │ • BTC MACD deteriorating                   │     │
│ │ • ETH RSI at 29.73 oversold                │     │
│ │                                             │     │
│ │ 🎯 主决策                                   │     │
│ │ [⏸️ 观望] SOL                               │     │
│ │ 数量: 10  杠杆: 1x                         │     │
│ │ Current SOL position shows minimal...     │     │
│ │                                             │     │
│ │ 💡 候选决策                                 │     │
│ │ [⏸️ 观望] ETH - ETH deeply oversold...     │     │
│ │                                             │     │
│ │ 💰 账户管理建议                             │     │
│ │ • Maintain current SOL position            │     │
│ │ • Wait for clearer market direction        │     │
│ └─────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────┘
```

## 🚀 使用方法

### 1. 启动交易系统

```bash
cd /data/proj/open_nof1/nof0/backend/ai/ai-trading
node --env-file=../../.env ai-trading-system.v2.mjs
```

### 2. 访问前端

在前端代码中使用新组件：

```tsx
import TradingConversationPanel from '@/components/chat/TradingConversationPanel';

export default function TradingPage() {
  return (
    <div>
      <TradingConversationPanel />
    </div>
  );
}
```

### 3. 直接访问API

```bash
curl http://localhost:3001/api/nof1/conversations | jq .
```

## 📊 数据兼容性

### 兼容nof1.ai格式

后端API返回的数据完全兼容nof1.ai的基本格式：

- ✅ `model_id` - 模型标识
- ✅ `timestamp` - Unix时间戳
- ✅ `cot_trace_summary` - 摘要文本
- ✅ `user_prompt` - 用户提示
- ✅ `llm_response` - LLM响应
- ✅ `cot_trace` - 思维链追踪

### 扩展字段

同时提供额外的结构化信息：

- ✅ `decision` - 原始AI决策
- ✅ `decision_normalized` - 归一化执行决策
- ✅ `trading_decisions` - 候选决策数组
- ✅ `account` - 账户状态
- ✅ `raw` - 完整原始数据

## ✅ 测试清单

- [ ] 交易系统正常运行并保存完整conversations
- [ ] 后端API返回正确的结构化数据
- [ ] 前端正确解析和展示决策信息
- [ ] 展开/折叠功能正常
- [ ] 决策徽章正确显示
- [ ] 账户信息正确显示
- [ ] 兼容旧格式数据

## 🔍 调试技巧

### 1. 检查保存的数据

```bash
# 查看最新对话
cat /data/proj/open_nof1/nof0/backend/data/conversations.json | jq '.conversations[0]'
```

### 2. 检查API返回

```bash
# 测试API端点
curl http://localhost:3001/api/nof1/conversations | jq '.conversations[0]'
```

### 3. 前端调试

```typescript
// 在组件中打印数据
const { items } = useConversations();
console.log('Conversations:', items);
```

## 📝 待办事项

- [ ] 添加过滤功能（按决策类型、时间范围）
- [ ] 添加搜索功能（按交易对、理由）
- [ ] 添加导出功能（CSV/JSON）
- [ ] 添加统计图表（决策分布、成功率）
- [ ] 支持多模型对比
- [ ] 实时推送新对话

## 🎯 总结

通过本次对接，实现了：

1. ✅ **完整的数据结构保存** - AI决策的所有信息都被保存
2. ✅ **结构化的API接口** - 提供丰富的结构化数据
3. ✅ **类型安全的前端** - TypeScript类型完整定义
4. ✅ **友好的UI展示** - 直观展示所有交易决策信息
5. ✅ **向后兼容** - 兼容nof1.ai的数据格式

现在前端可以完整展示AI交易系统的所有决策信息，包括市场分析、主决策、候选决策、账户管理建议等！🎉

