# 快速开始 - Conversations API 对接

## 🚀 3步启动

### 1️⃣ 启动后端（如果还没启动）

```bash
cd /data/proj/open_nof1/nof0/backend
npm start
```

### 2️⃣ 运行AI交易系统（生成对话数据）

```bash
cd /data/proj/open_nof1/nof0/backend/ai/ai-trading
node --env-file=../../.env ai-trading-system.v2.mjs
```

### 3️⃣ 访问前端查看对话

```bash
# 启动前端（如果还没启动）
cd /data/proj/open_nof1/nof0/web
npm run dev

# 浏览器访问
# http://localhost:3000/
```

## 📡 API测试

### 测试conversations端点

```bash
# 获取所有对话
curl http://localhost:3001/api/nof1/conversations | jq '.'

# 查看第一条对话的摘要
curl http://localhost:3001/api/nof1/conversations | jq '.conversations[0] | {
  summary: .cot_trace_summary,
  action: .cot_trace.action,
  symbol: .cot_trace.symbol,
  account: .account
}'

# 查看决策详情
curl http://localhost:3001/api/nof1/conversations | jq '.conversations[0].llm_response.decision'

# 查看候选决策
curl http://localhost:3001/api/nof1/conversations | jq '.conversations[0].llm_response.trading_decisions'
```

## 🎨 前端集成示例

### 基础用法

```tsx
import TradingConversationPanel from '@/components/chat/TradingConversationPanel';

export default function Page() {
  return <TradingConversationPanel />;
}
```

### 自定义Hook

```tsx
import { useConversations } from '@/lib/api/hooks/useConversations';

export default function CustomComponent() {
  const { items, isLoading, isError } = useConversations();
  
  if (isLoading) return <div>加载中...</div>;
  if (isError) return <div>加载失败</div>;
  
  return (
    <div>
      <h2>共 {items.length} 条对话</h2>
      {items.map((item, i) => (
        <div key={i}>
          <div>{item.cot_trace_summary}</div>
          <div>决策: {item.cot_trace?.action}</div>
          <div>交易对: {item.cot_trace?.symbol}</div>
          <div>账户: ${item.account?.accountValue}</div>
        </div>
      ))}
    </div>
  );
}
```

### 访问详细数据

```tsx
import { useConversations } from '@/lib/api/hooks/useConversations';

export default function DetailedView() {
  const { items } = useConversations();
  const latest = items[0];
  
  if (!latest) return null;
  
  return (
    <div>
      {/* 市场分析 */}
      {latest.llm_response?.parsed?.analysis && (
        <div>
          <h3>市场分析</h3>
          <p>{latest.llm_response.parsed.analysis.market_summary}</p>
          <ul>
            {latest.llm_response.parsed.analysis.key_observations?.map((obs, i) => (
              <li key={i}>{obs}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* 主决策 */}
      {latest.llm_response?.decision && (
        <div>
          <h3>主决策</h3>
          <p>动作: {latest.llm_response.decision.action}</p>
          <p>交易对: {latest.llm_response.decision.symbol}</p>
          <p>数量: {latest.llm_response.decision.quantity}</p>
          <p>杠杆: {latest.llm_response.decision.leverage}x</p>
          <p>理由: {latest.llm_response.decision.reasoning}</p>
        </div>
      )}
      
      {/* 候选决策 */}
      {latest.llm_response?.trading_decisions?.map((dec, i) => (
        <div key={i}>
          <h4>候选 {i + 1}</h4>
          <p>{dec.action} {dec.symbol}</p>
          <p>{dec.reasoning}</p>
        </div>
      ))}
      
      {/* 账户管理建议 */}
      {latest.llm_response?.parsed?.account_management?.recommendations && (
        <div>
          <h3>账户管理建议</h3>
          <ul>
            {latest.llm_response.parsed.account_management.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

## 🔍 数据结构速查

### 常用字段

```typescript
// 摘要信息
item.cot_trace_summary   // "📈 买入 ETH - ETH severely oversold..."
item.summary             // 同上

// 决策信息
item.cot_trace.action    // "buy" | "sell" | "close_position" | "hold"
item.cot_trace.symbol    // "ETH"
item.cot_trace.reasoning // "决策理由"

// 账户信息
item.account.accountValue  // 4999.17
item.account.totalReturn   // -50.01

// AI响应
item.llm_response.raw_text          // AI原始文本
item.llm_response.parsed            // 解析后的JSON
item.llm_response.decision          // 主决策对象
item.llm_response.trading_decisions // 候选决策数组

// 元数据
item.timestamp        // Unix时间戳
item.invocationCount  // 调用次数
item.model_id         // 模型ID
```

## ✨ 特色功能

### 1. 智能摘要

每条对话都有emoji图标和简短摘要：
- 📈 买入 ETH - ETH severely oversold...
- 📉 卖出 BTC - BTC shows bearish momentum...
- 🔚 平仓 SOL - Exit with profit...
- ⏸️ 保持观望 - Waiting for clearer signals...

### 2. 结构化决策

完整保存AI的决策结构：
- 主决策 (decision)
- 候选决策 (trading_decisions)
- 归一化决策 (decision_normalized)

### 3. 市场分析

包含AI的市场分析：
- 市场总结 (market_summary)
- 关键观察 (key_observations)
- 账户管理建议 (recommendations)

### 4. 完整追溯

保存原始数据便于调试：
- 用户提示 (user_prompt)
- AI完整响应 (raw_text)
- 原始JSON (raw)

## 🎯 实战示例

### 示例1: 显示最近5条买入决策

```tsx
function RecentBuys() {
  const { items } = useConversations();
  
  const buys = items
    .filter(item => item.cot_trace?.action === 'buy')
    .slice(0, 5);
  
  return (
    <div>
      <h3>最近买入</h3>
      {buys.map((item, i) => (
        <div key={i}>
          {item.cot_trace?.symbol} @ {new Date(item.timestamp * 1000).toLocaleString()}
        </div>
      ))}
    </div>
  );
}
```

### 示例2: 统计决策分布

```tsx
function DecisionStats() {
  const { items } = useConversations();
  
  const stats = items.reduce((acc, item) => {
    const action = item.cot_trace?.action || 'unknown';
    acc[action] = (acc[action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return (
    <div>
      <h3>决策统计</h3>
      <ul>
        {Object.entries(stats).map(([action, count]) => (
          <li key={action}>{action}: {count}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 示例3: 显示账户变化趋势

```tsx
function AccountTrend() {
  const { items } = useConversations();
  
  const trend = items
    .map(item => ({
      time: new Date(item.timestamp * 1000),
      value: item.account?.accountValue || 0,
      return: item.account?.totalReturn || 0
    }))
    .reverse(); // 按时间正序
  
  return (
    <div>
      <h3>账户趋势</h3>
      {trend.map((point, i) => (
        <div key={i}>
          {point.time.toLocaleString()}: ${point.value.toFixed(2)} ({point.return.toFixed(2)}%)
        </div>
      ))}
    </div>
  );
}
```

## 🐛 常见问题

### Q: 为什么conversations是空的？

A: 确保AI交易系统已运行并生成对话数据：
```bash
ls -lh /data/proj/open_nof1/nof0/backend/data/conversations.json
# 或
ls -lh /data/proj/open_nof1/nof0/backend/test/trading-conversations.json
```

### Q: API返回格式不对？

A: 检查后端是否正确启动：
```bash
curl http://localhost:3001/api/nof1/conversations
```

### Q: 前端显示不出来？

A: 检查浏览器控制台是否有错误，确认Hook正确导入。

## 📚 更多文档

- 完整文档: [CONVERSATIONS_API_INTEGRATION.md](./CONVERSATIONS_API_INTEGRATION.md)
- API文档: [nof1_api.md](../learning/nof1_api.md)
- 项目架构: [system-architecture.md](../learning/system-architecture.md)

## 🎉 完成！

现在你可以在前端完整展示AI交易系统的所有对话和决策信息了！

