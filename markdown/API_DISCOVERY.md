# nof1.ai API 发现文档

## 概述

通过浏览器网络分析，我们发现 nof1.ai 提供了完整的公开 REST API，可以直接用于前端开发，无需创建 mock 数据！

## API 端点列表

### Base URL
```
https://nof1.ai/api
```

### 1. 加密货币价格
**端点**: `/crypto-prices`
**方法**: GET
**刷新频率**: 每 2-5 秒

**响应示例**:
```json
{
  "prices": {
    "BTC": { "symbol": "BTC", "price": 108199.5, "timestamp": 1761151919417 },
    "ETH": { "symbol": "ETH", "price": 3832.05, "timestamp": 1761151919417 },
    "SOL": { "symbol": "SOL", "price": 183.635, "timestamp": 1761151919417 },
    "BNB": { "symbol": "BNB", "price": 1074.35, "timestamp": 1761151919417 },
    "DOGE": { "symbol": "DOGE", "price": 0.191425, "timestamp": 1761151919417 },
    "XRP": { "symbol": "XRP", "price": 2.3914, "timestamp": 1761151919417 }
  },
  "serverTime": 1761151919417
}
```

### 2. 持仓信息
**端点**: `/positions`
**方法**: GET
**参数**: `?limit=1000` (可选)
**刷新频率**: 每 5-10 秒

**关键字段**:
- `exit_plan`: 包含 `profit_target`, `stop_loss`, `invalidation_condition`
- `unrealized_pnl`: 未实现盈亏
- `leverage`: 杠杆倍数
- `confidence`: AI 模型的信心度 (0-1)
- `risk_usd`: 风险金额

### 3. 交易历史
**端点**: `/trades`
**方法**: GET
**刷新频率**: 每 10-30 秒

**关键字段**:
- `realized_net_pnl`: 净盈亏（扣除手续费）
- `realized_gross_pnl`: 毛盈亏
- `total_commission_dollars`: 总手续费
- `entry_human_time`, `exit_human_time`: 人类可读时间

### 4. 账户总值
**端点**: `/account-totals`
**方法**: GET
**参数**: `?lastHourlyMarker=114` (可选，用于增量更新)
**刷新频率**: 每 5-10 秒

**用途**: 获取最完整的持仓详情，包括所有字段

### 5. 历史价值数据
**端点**: `/since-inception-values`
**方法**: GET
**用途**: 绘制账户价值历史图表

**响应示例**:
```json
{
  "serverTime": 1761151919417,
  "sinceInceptionValues": [
    {
      "id": "uuid",
      "nav_since_inception": 10000,
      "inception_date": 1760738409.834185,
      "num_invocations": 0,
      "model_id": "gpt-5"
    }
  ]
}
```

### 6. 排行榜数据
**端点**: `/leaderboard`
**方法**: GET
**用途**: 获取所有模型的排行榜统计数据

**响应示例**:
```json
{
  "leaderboard": [
    {
      "id": "deepseek-chat-v3.1",
      "num_trades": 8,
      "win_dollars": 1489.52,
      "num_losses": 7,
      "num_wins": 1,
      "sharpe": 1.268,
      "lose_dollars": -1065.65,
      "return_pct": 7.41,
      "equity": 10741.0
    }
  ]
}
```

**关键字段**:
- `num_trades`: 交易总数
- `win_dollars`: 盈利总额
- `lose_dollars`: 亏损总额
- `num_wins`: 盈利交易数
- `num_losses`: 亏损交易数
- `sharpe`: 夏普比率
- `return_pct`: 收益率百分比
- `equity`: 当前账户价值

### 7. 高级分析数据
**端点**: `/analytics`
**方法**: GET
**用途**: 获取每个模型的详细分析指标和统计数据

**响应包含的分析表**:
- `fee_pnl_moves_breakdown_table`: 费用和盈亏分解
- `winners_losers_breakdown_table`: 盈利和亏损交易分析
- `signals_breakdown_table`: 信号统计（做多/做空/持有）
- `longs_shorts_breakdown_table`: 多空仓位分析
- `overall_trades_overview_table`: 整体交易概览
- `invocation_breakdown_table`: 调用频率统计

**关键字段**:
- `avg_holding_period_mins`: 平均持仓时间（分钟）
- `median_holding_period_mins`: 中位数持仓时间
- `avg_size_of_trade_notional`: 平均交易规模
- `median_size_of_trade_notional`: 中位数交易规模
- `avg_convo_leverage`: 平均杠杆倍数
- `median_convo_leverage`: 中位数杠杆倍数
- `avg_confidence`: 平均置信度
- `median_confidence`: 中位数置信度
- `long_short_trades_ratio`: 多空交易比率
- `win_rate`: 胜率（百分比）

## AI 模型列表

从 API 数据中识别出的模型 ID：
- `gpt-5`
- `claude-sonnet-4-5`
- `deepseek-chat-v3.1`
- `gemini-2-5-pro`
- `grok-4`
- `qwen3-max`
- `buynhold_btc` (BTC 买入持有基准)

## 实现建议

### 使用 SWR 进行数据获取

```typescript
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

// 价格数据 - 每 2 秒刷新
export function useCryptoPrices() {
  return useSWR('https://nof1.ai/api/crypto-prices', fetcher, {
    refreshInterval: 2000,
    revalidateOnFocus: true,
  });
}

// 持仓数据 - 每 5 秒刷新
export function usePositions() {
  return useSWR('https://nof1.ai/api/positions?limit=1000', fetcher, {
    refreshInterval: 5000,
    dedupingInterval: 2000,
  });
}

// 交易历史 - 每 10 秒刷新
export function useTrades() {
  return useSWR('https://nof1.ai/api/trades', fetcher, {
    refreshInterval: 10000,
  });
}
```

### CORS 配置

API 支持跨域请求，无需额外配置代理。可以直接从前端调用。

### 错误处理

```typescript
export function usePositions() {
  const { data, error, isLoading } = useSWR(
    'https://nof1.ai/api/positions?limit=1000',
    fetcher,
    {
      refreshInterval: 5000,
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        if (retryCount >= 3) return; // 最多重试 3 次
        setTimeout(() => revalidate({ retryCount }), 5000); // 5 秒后重试
      },
    }
  );

  return {
    positions: data?.positions || [],
    isLoading,
    isError: error,
  };
}
```

## 数据特点

### Exit Plan 结构
每个持仓都包含详细的退出计划：
```typescript
interface ExitPlan {
  profit_target: number;        // 目标价
  stop_loss: number;            // 止损价
  invalidation_condition: string; // 失效条件描述
}
```

示例失效条件：
- "BTC breaks below 105,000, confirming deeper market correction"
- "Close if a 4h candle closes > 2.455 (20EMA + 1xATR14) AND the 4h MACD histogram turns >= 0"

### 时间戳格式
- API 返回的时间戳为 Unix 时间戳（秒）
- 需要转换：`new Date(timestamp * 1000)`

### 持仓方向判断
```typescript
const side = position.quantity > 0 ? 'LONG' : 'SHORT';
```

## MVP 开发优势

1. **真实数据**: 直接使用真实的 AI 交易数据，无需造假
2. **节省时间**: 省去创建 mock 数据的 2-3 天工作
3. **实时更新**: 数据自动更新，展示最新交易状态
4. **易于测试**: 可以观察真实 AI 模型的表现
5. **生产就绪**: 开发即生产，无需后续迁移

## 注意事项

1. **API 稳定性**: 这是公开 API，nof1.ai 可能随时修改
2. **速率限制**: 未发现明确的速率限制，建议合理控制请求频率
3. **数据一致性**: 不同端点的数据可能存在时间差
4. **模型名称**: API 返回的模型 ID 与显示名称需要映射

## 相关资源

- [nof1.ai 官网](https://nof1.ai)
- [PLAN.md - 完整实现方案](./PLAN.md)
- [SWR 文档](https://swr.vercel.app/)

---

**最后更新**: 2025-10-23
**发现者**: Claude Code (通过浏览器网络分析)
