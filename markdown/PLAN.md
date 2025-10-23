# nof0 MVP 前端实现方案

## 项目概述

**nof0** 是 nof1.ai 的仿盘版本，专注于展示 AI 交易代理的逻辑、提示词和持仓信息。MVP 版本采用 Next.js 实现，**直接使用 nof1.ai 提供的公开 REST API**，无需 mock 数据，实现快速真实测试。

## 重大发现：nof1.ai REST API

通过浏览器网络分析，我们发现 nof1.ai 提供了完整的公开 REST API！这意味着我们可以直接使用真实数据，无需创建 mock 数据层，大大加速开发进程。

## nof1.ai REST API 文档

### API 基础信息
- **Base URL**: `https://nof1.ai/api`
- **认证**: 无需认证（公开 API）
- **CORS**: 支持跨域请求

### 可用端点

#### 1. 加密货币价格 `/crypto-prices`
获取实时加密货币价格。

**请求**:
```http
GET /api/crypto-prices
```

**响应示例**:
```json
{
  "prices": {
    "BTC": {
      "symbol": "BTC",
      "price": 108199.5,
      "timestamp": 1761151919417
    },
    "ETH": {
      "symbol": "ETH",
      "price": 3832.05,
      "timestamp": 1761151919417
    },
    "SOL": { "symbol": "SOL", "price": 183.635, "timestamp": 1761151919417 },
    "BNB": { "symbol": "BNB", "price": 1074.35, "timestamp": 1761151919417 },
    "DOGE": { "symbol": "DOGE", "price": 0.191425, "timestamp": 1761151919417 },
    "XRP": { "symbol": "XRP", "price": 2.3914, "timestamp": 1761151919417 }
  },
  "serverTime": 1761151919417
}
```

#### 2. 持仓信息 `/positions`
获取所有 AI 模型的当前持仓。

**请求**:
```http
GET /api/positions?limit=1000
```

**参数**:
- `limit` (可选): 返回的持仓数量限制，默认 1000

**响应示例**:
```json
{
  "positions": [
    {
      "id": "claude-sonnet-4-5",
      "positions": {
        "XRP": {
          "entry_oid": 204655970889,
          "risk_usd": 594.7,
          "confidence": 0.62,
          "exit_plan": {
            "profit_target": 2.6485,
            "stop_loss": 2.1877,
            "invalidation_condition": "BTC breaks below 105,000, confirming deeper market correction"
          },
          "entry_time": 1760744224.108066,
          "symbol": "XRP",
          "entry_price": 2.3031,
          "margin": 1968.147779,
          "leverage": 8,
          "quantity": 5164,
          "current_price": 2.39705,
          "unrealized_pnl": 483.3504,
          "closed_pnl": -5.35
        }
      }
    }
  ]
}
```

#### 3. 交易历史 `/trades`
获取所有已完成的交易记录。

**请求**:
```http
GET /api/trades
```

**响应示例**:
```json
{
  "trades": [
    {
      "id": "gpt-5_e5516874-14bd-4971-a50f-c09ca575f745",
      "symbol": "DOGE",
      "model_id": "gpt-5",
      "side": "long",
      "entry_price": 0.19651,
      "exit_price": 0.1901,
      "quantity": 14258,
      "leverage": 1,
      "entry_time": 1760901231.033,
      "exit_time": 1761130495.339,
      "entry_human_time": "2025-10-19 19:13:51.033000",
      "exit_human_time": "2025-10-22 10:54:55.339000",
      "realized_net_pnl": -93.738785,
      "realized_gross_pnl": -91.39378,
      "total_commission_dollars": 2.345005,
      "exit_plan": {}
    }
  ]
}
```

#### 4. 账户总值 `/account-totals`
获取所有模型的账户总值和详细持仓信息。

**请求**:
```http
GET /api/account-totals
GET /api/account-totals?lastHourlyMarker=114
```

**参数**:
- `lastHourlyMarker` (可选): 用于增量更新的标记

**响应**: 包含每个模型的完整持仓详情、未实现盈亏、已实现盈亏等。

#### 5. 历史价值数据 `/since-inception-values`
获取自启动以来的账户价值历史数据。

**请求**:
```http
GET /api/since-inception-values
```

**响应示例**:
```json
{
  "serverTime": 1761151919417,
  "sinceInceptionValues": [
    {
      "id": "117506d4-d377-47b2-a90b-b86853f796d7",
      "nav_since_inception": 10000,
      "inception_date": 1760738409.834185,
      "num_invocations": 0,
      "model_id": "gpt-5"
    }
  ]
}
```

#### 6. 排行榜数据 `/leaderboard`
获取所有模型的排行榜统计数据。

**请求**:
```http
GET /api/leaderboard
```

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
- `sharpe`: 夏普比率
- `return_pct`: 收益率百分比
- `equity`: 当前账户价值
- `win_rate`: 胜率（通过 num_wins / num_trades 计算）

#### 7. 高级分析数据 `/analytics`
获取每个模型的详细分析指标和统计数据（用于 LEADERBOARD 页面的 ADVANCED ANALYTICS 标签页）。

**请求**:
```http
GET /api/analytics
```

**响应包含的分析表**:
- `overall_trades_overview_table`: 整体交易概览（平均持仓时间、交易规模等）
- `longs_shorts_breakdown_table`: 多空仓位分析
- `winners_losers_breakdown_table`: 盈利和亏损交易分析
- `signals_breakdown_table`: 信号统计（做多/做空/持有）
- `fee_pnl_moves_breakdown_table`: 费用和盈亏分解
- `invocation_breakdown_table`: 调用频率统计

**关键字段**:
- `avg_holding_period_mins` / `median_holding_period_mins`: 持仓时间
- `avg_size_of_trade_notional` / `median_size_of_trade_notional`: 交易规模
- `avg_convo_leverage` / `median_convo_leverage`: 杠杆倍数
- `avg_confidence` / `median_confidence`: 置信度
- `long_short_trades_ratio`: 多空交易比率
- `win_rate`: 胜率

### API 使用建议

1. **轮询频率**
   - 价格数据: 每 2-5 秒更新一次
   - 持仓数据: 每 5-10 秒更新一次
   - 交易历史: 每 10-30 秒更新一次
   - 排行榜数据: 每 30 秒更新一次
   - 分析数据: 每 60 秒更新一次（数据量大，刷新频率可适当降低）

2. **数据缓存**
   - 使用 SWR 或 React Query 进行数据缓存
   - 设置合理的 `revalidateOnFocus` 和 `refreshInterval`

3. **错误处理**
   - 实现重试机制
   - 优雅降级（显示上次成功的数据）

## 核心功能要求

基于对 nof1.ai 的分析和可用 API，MVP 需要实现以下核心功能：

1. **展示 Agent 逻辑 (Agent's Logic)**
   - 从 `/account-totals` 获取持仓的 `exit_plan`
   - 展示决策逻辑和风险管理策略
   - 显示置信度 (`confidence`) 和风险金额 (`risk_usd`)

2. **展示 Prompts**
   - 基于 API 数据推断系统提示词
   - 展示市场数据输入格式
   - 说明决策框架

3. **展示 Positions**
   - 从 `/positions` API 获取当前持仓
   - 显示 Exit Plan（`profit_target`、`stop_loss`、`invalidation_condition`）
   - 展示未实现盈亏 (`unrealized_pnl`)
   - 显示杠杆倍数 (`leverage`)

## 技术栈

### 核心框架
- **Next.js 14+** (App Router)
- **TypeScript**
- **React 18+**

### UI 框架与样式
- **Tailwind CSS** - 快速构建紧凑型金融 UI
- **shadcn/ui** - 高质量组件库
- **Recharts** - 图表库（类似 CoinGecko 的数据可视化）
- **Framer Motion** - 动画效果

### 状态管理
- **Zustand** - 轻量级状态管理
- **React Query / SWR** - 数据获取（为未来真实 API 做准备）

### 工具库
- **date-fns** - 日期处理
- **numeral** - 数字格式化
- **clsx / cn** - 类名合并

## UI/UX 设计原则

### 视觉风格（参考 CoinGecko）
1. **紧凑型设计**
   - 高信息密度
   - 最小化空白间距
   - 表格式数据展示

2. **配色方案**
   - 深色主题优先（终端风格）
   - 绿色（盈利）/ 红色（亏损）- 金融通用色
   - 高对比度文本
   - 品牌色：参考 nof1.ai 的紫色/蓝色系

3. **字体**
   - 等宽字体用于数据展示（如 JetBrains Mono）
   - 清晰的层级关系

4. **响应式**
   - 桌面优先
   - 移动端适配（表格横向滚动）

## 专业交易系统 UI/UX 设计原则

### 核心设计理念

#### 1. 信息层次与视觉扫描
专业交易员需要在秒级做出决策，UI必须支持**快速视觉扫描**：

- **F型扫描模式**
  - 最重要信息放在左上角（价格、盈亏）
  - 次要信息沿左侧纵向排列
  - 详细数据在右侧或底部

- **视觉权重分配**
  - 大字号：当前价格、总盈亏、账户价值
  - 中字号：持仓详情、交易历史
  - 小字号：时间戳、技术指标

- **颜色编码系统**
  - 红色：亏损、警告、负向变化（`text-red-500/600`）
  - 绿色：盈利、成功、正向变化（`text-green-500/600`）
  - 灰色：中性数据（`text-gray-400/500`）
  - 黄色/琥珀色：警示、待确认（`text-amber-500`）
  - 蓝色/紫色：品牌色、链接、次要操作

#### 2. 数据密度与可读性平衡

**高密度原则**：
- 单屏显示尽可能多的关键信息
- 行高：表格使用 `leading-tight` (1.25)
- 间距：组件间 `gap-2` 或 `gap-3`（8-12px）
- 字号：主要数据 14-16px，次要数据 12-13px

**可读性保障**：
- 对比度至少 4.5:1 (WCAG AA标准)
- 等宽字体用于数字和代码
- 充足的行间距防止信息混淆
- 视觉分组：使用边框、背景色区分不同数据块

#### 3. 实时数据更新反馈

**数据变化可见性**：
```typescript
// 价格变化闪烁效果
- 上涨：短暂绿色高亮 (200ms)
- 下跌：短暂红色高亮 (200ms)
- 使用 transition-colors duration-200
```

**加载状态**：
- 骨架屏（Skeleton）优于转圈 Spinner
- 局部刷新优于全屏刷新
- 保持上次数据可见（Stale-While-Revalidate）

**错误处理**：
- Toast通知（右上角，3秒自动消失）
- 内联错误提示（API失败时）
- 降级显示（显示缓存数据 + "数据可能过期"提示）

#### 4. 交互效率优化

**键盘快捷键支持**（可选，但专业）：
- `1-4`: 切换主页标签页
- `L`: 跳转到 Leaderboard
- `M`: 打开模型选择器
- `Esc`: 关闭弹窗

**点击目标区域**：
- 按钮最小 44x44px (移动端)
- 表格行整行可点击（cursor-pointer）
- 避免过小的点击区域

**Hover 状态**：
- 表格行 hover: 背景色变化 (`hover:bg-gray-800/50`)
- 按钮 hover: 颜色加深 + 轻微缩放 (`hover:scale-105`)
- 卡片 hover: 边框高亮或阴影加深

### 关键组件交互设计

#### 价格滚动条 (Ticker)
```
位置：页面顶部，固定或吸顶
高度：32-40px
交互：
  - 自动无限循环滚动（CSS animation）
  - Hover 暂停滚动
  - 点击币种：高亮该币种的相关持仓
更新：每2秒刷新一次，数字变化时闪烁
```

#### 图表控件布局
```
┌─────────────────────────────────────────────┐
│ [Loading...]           [ALL] [72H]  [$] [%] │ ← 控件右上角
│                                             │
│         图表主体区域                          │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

**交互逻辑**：
- 时间范围按钮：互斥选择，选中态明显
- 格式切换按钮：Toggle状态，图标+文字
- 图例：点击显示/隐藏对应模型的线

#### 持仓表格设计

**列宽分配**（基于重要性）：
```
SIDE      COIN    LEVERAGE  NOTIONAL   EXIT PLAN  UNREAL P&L
8%        12%     10%       15%        20%        15%
└─关键     └─标的   └─风险    └─规模      └─策略      └─结果（最重要）
```

**排序功能**：
- 默认按 UNREAL P&L 降序
- 列标题点击切换升序/降序
- 当前排序列显示箭头图标 ↑↓

**分组显示**：
- 按模型分组，折叠/展开功能
- 组头显示：模型名称 + 总盈亏 + 持仓数量
- 组内持仓按盈亏排序

#### Exit Plan 弹窗设计

**触发方式**：
- 点击表格中的 "VIEW" 按钮
- Hover 表格行时显示眼睛图标

**弹窗布局**（Modal）：
```
┌─ Exit Plan: XRP Long 8x ──────────────┐
│                                     [×]│
│  [TARGET] Profit Target                │
│     $2.6485  (+15.0% from entry)       │
│                                        │
│  [STOP] Stop Loss                      │
│     $2.1877  (-5.0% from entry)        │
│                                        │
│  [WARN] Invalidation Condition         │
│     BTC breaks below 105,000,          │
│     confirming deeper market correction│
│                                        │
│  [INFO] Risk/Reward Ratio: 3.0         │
│                                        │
│                      [UNDERSTOOD]      │
└────────────────────────────────────────┘
```

**视觉设计**：
- 半透明背景遮罩（backdrop-blur）
- 弹窗居中，最大宽度 500px
- 图标增强可读性
- 颜色编码：绿色（目标）、红色（止损）、黄色（失效）

#### 排行榜表格设计

**排名视觉化**：
```
RANK  MODEL              RETURN %    P&L
 #1   DeepSeek V3.1     +7.41%      $740.99  ━━━━━━━
 #2   Qwen3 Max         +3.75%      $375.09  ━━━
 #3   Grok 4            -3.19%      -$319.07 ▄▄▄
```

- 前三名使用特殊标记或高亮背景色
- 盈亏柱状图内嵌在表格中（类似 GitHub Insights）
- 排序列高亮显示

**Advanced Analytics 标签页**：
- 使用更小字号（12px）容纳更多列
- 可横向滚动
- 固定首列（模型名称）
- Tooltip 显示指标说明

### 布局设计要点

#### 主页 60/40 分割布局

**设计理由**：
- **左侧60%（图表区）**：趋势和全局视图，用于宏观判断
- **右侧40%（标签页）**：详细数据和操作，用于微观决策
- 符合人眼从左到右、从整体到细节的扫描习惯

**响应式断点**：
- Desktop (≥1280px): 60/40 分割
- Tablet (768-1279px): 上下堆叠，图表在上
- Mobile (<768px): 单列布局，图表优先

#### 标签页导航设计

**位置**：内容区域顶部
**样式**：
```
┌─────────────────────────────────────────┐
│ [COMPLETED TRADES] MODELCHAT POSITIONS  │ ← 激活态加粗+下划线
│ ─────────────────                       │
│                                         │
│      标签页内容                          │
```

**交互**：
- 点击切换内容（无页面跳转）
- 激活态视觉反馈：颜色、粗细、下划线
- 支持键盘导航（Tab键）

### 状态反馈系统

#### Empty States
```
┌─────────────────────────────────────────┐
│                                         │
│         No Active Positions             │
│                                         │
│   All models are currently in cash.     │
│   New positions will appear here when   │
│   AI models enter the market.           │
└─────────────────────────────────────────┘
```

#### Loading States
```
┌─────────────────────────────────────────┐
│  Loading positions...                   │
│                                         │
│  [Skeleton rows showing expected layout]│
└─────────────────────────────────────────┘
```

#### Error States
```
┌─────────────────────────────────────────┐
│                                         │
│      Failed to Load Positions           │
│                                         │
│   [RETRY]          [USE CACHED DATA]    │
└─────────────────────────────────────────┘
```

### 动画与过渡

**原则：微妙而有意义**

```typescript
// 数据更新动画
- 价格变化：Flash effect (200ms)
- 新持仓出现：Slide in from left (300ms)
- 持仓关闭：Fade out (200ms)

// 交互反馈
- 按钮点击：Scale down (100ms)
- 弹窗打开：Fade + Scale (250ms, ease-out)
- 标签页切换：Fade (150ms)

// 避免
- 过长的动画 (>500ms)
- 复杂的 3D 变换
- 分散注意力的循环动画
```

### 性能优化设计

**虚拟滚动**（数据量>100行）：
- 使用 `react-window` 或 `react-virtuoso`
- 只渲染可见区域的表格行

**图表性能**：
- 数据点>1000时进行采样
- 使用 Canvas 而非 SVG（Recharts 默认）
- 防抖图表交互（debounce 100ms）

**图片优化**：
- 模型 Logo 使用 WebP 格式
- Next.js Image 组件自动优化
- Lazy loading 非首屏图片

## 核心页面结构

### 1. 主页 (`/`)

#### 顶部导航栏
```
Logo | LIVE | LEADERBOARD | MODELS
```

#### 实时价格滚动条
```
BTC $108,367.50  ETH $3,833.45  SOL $183.65  BNB $1,074.75  DOGE $0.1916  XRP $2.39
HIGHEST: QWEN3 MAX $11,340.35 +13.40%  LOWEST: GPT 5 $3,392.73 -66.07%
```

#### 主体内容
**左侧：图表区域（60%）**
- 总账户价值图表（折线图）
- 时间范围切换（ALL / 72H）
- 数值格式切换（$ / %）
- 多条线代表不同 AI 模型

**右侧：标签页区域（40%）**
- Tab 切换：COMPLETED TRADES | MODELCHAT | POSITIONS | README.TXT
- 内容区域根据 tab 动态切换

### 2. POSITIONS 标签页（核心功能）

```
┌─ FILTER: ALL MODELS ▼ ──────────────────────────┐
│                                                  │
│ CLAUDE SONNET 4.5    TOTAL UNREALIZED P&L: $359.99 │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ SIDE │ COIN │ LEVERAGE │ NOTIONAL │ EXIT PLAN │ UNREAL P&L │
│ │ LONG │ XRP  │   8X     │ $12,348  │   VIEW    │  $454.95   │
│ │ LONG │ DOGE │   8X     │ $10,322  │   VIEW    │  -$94.95   │
│ └─────────────────────────────────────────────┘ │
│ AVAILABLE CASH: $5,232.54                        │
│                                                  │
│ [展开 EXIT PLAN 弹窗]                             │
│ ┌─ Exit Plan: ─────────────────────────────────┐│
│ │ Target: $2.65                                 ││
│ │ Stop: $2.19                                   ││
│ │ Invalid Condition: BTC breaks below 105,000   ││
│ └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

### 3. MODELCHAT 标签页（展示 Logic & Prompts）

```
┌─ MODEL: CLAUDE SONNET 4.5 ▼ ────────────────────┐
│                                                  │
│ Agent Chat Log                                   │
│ ┌──────────────────────────────────────────────┐ │
│ │ [System] 08:15:23                            │ │
│ │ You are a crypto trading AI...               │ │
│ │                                              │ │
│ │ [Assistant] 08:15:45                         │ │
│ │ Analyzing market conditions...               │ │
│ │ - BTC showing bullish momentum               │ │
│ │ - XRP breakout above resistance              │ │
│ │ Decision: LONG XRP 8x leverage               │ │
│ │ Reasoning: Technical breakout + volume       │ │
│ │                                              │ │
│ │ [User] 08:16:00                              │ │
│ │ Current positions status?                    │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ Prompt Template                                  │
│ ┌──────────────────────────────────────────────┐ │
│ │ System Prompt:                               │ │
│ │ You are an expert crypto trader...          │ │
│ │                                              │ │
│ │ Market Data Format:                          │ │
│ │ {                                            │ │
│ │   "btc": { "price": 108367.50, ... },       │ │
│ │   "eth": { "price": 3833.45, ... }          │ │
│ │ }                                            │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### 4. LEADERBOARD 页面 (`/leaderboard`)

```
┌─ LEADERBOARD ────────────────────────────────────┐
│                                                  │
│ [OVERALL STATS] [ADVANCED ANALYTICS]             │
│                                                  │
│ ┌────┬──────────────┬────────┬─────────┬────────┐ │
│ │RANK│ MODEL        │ ACCT   │ RETURN  │ P&L    │ │
│ ├────┼──────────────┼────────┼─────────┼────────┤ │
│ │ 1  │ QWEN3 MAX    │$11,586 │ +15.86% │$1,586  │ │
│ │ 2  │ DEEPSEEK V3  │$11,056 │ +10.56% │$1,056  │ │
│ │ 3  │ GROK 4       │ $9,824 │  -1.76% │ -$176  │ │
│ └────┴──────────────┴────────┴─────────┴────────┘ │
│                                                  │
│ WINNING MODEL: QWEN3 MAX                         │
│ TOTAL EQUITY: $11,586                            │
│ ACTIVE POSITIONS: ETH, BTC                       │
└──────────────────────────────────────────────────┘
```

## 数据结构设计

### Model（AI 模型）
```typescript
interface Model {
  id: string;
  name: string;
  icon: string; // 图标 URL 或组件
  color: string; // 图表线条颜色
  totalEquity: number;
  returnPercent: number;
  unrealizedPnL: number;
  realizedPnL: number;
  availableCash: number;
  positions: Position[];
  trades: Trade[];
  chatHistory: ChatMessage[];
  systemPrompt: string;
}
```

### Position（持仓）
```typescript
interface Position {
  id: string;
  modelId: string;
  side: 'LONG' | 'SHORT';
  coin: string; // BTC, ETH, etc.
  leverage: number;
  notional: number; // 名义价值
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  exitPlan: ExitPlan;
  openedAt: Date;
}

interface ExitPlan {
  target: number; // 目标价
  stop: number; // 止损价
  invalidCondition: string; // 失效条件描述
}
```

### Trade（已完成交易）
```typescript
interface Trade {
  id: string;
  modelId: string;
  type: 'long' | 'short';
  coin: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  notional: number;
  holdingTime: string; // "7H 44M"
  netPnL: number;
  completedAt: Date;
}
```

### ChatMessage（聊天消息）
```typescript
interface ChatMessage {
  id: string;
  modelId: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    decision?: string; // "LONG XRP 8x"
    reasoning?: string;
  };
}
```

### ChartDataPoint（图表数据点）
```typescript
interface ChartDataPoint {
  timestamp: Date;
  [modelId: string]: number; // 每个模型的账户价值
}
```

## 组件架构

### 页面组件
```
app/
├── layout.tsx                 # 根布局
├── page.tsx                   # 主页
├── leaderboard/
│   └── page.tsx              # 排行榜页面
└── globals.css
```

### 功能组件
```
components/
├── layout/
│   ├── Header.tsx            # 顶部导航栏
│   ├── PriceTicker.tsx       # 价格滚动条
│   └── Footer.tsx
├── chart/
│   ├── AccountValueChart.tsx # 账户价值图表
│   └── ChartControls.tsx     # 图表控制器（时间/格式）
├── tabs/
│   ├── TabContainer.tsx      # 标签页容器
│   ├── CompletedTrades.tsx   # 已完成交易
│   ├── ModelChat.tsx         # 模型聊天（Logic & Prompts）
│   ├── Positions.tsx         # 持仓列表
│   └── Readme.tsx            # README
├── positions/
│   ├── PositionCard.tsx      # 单个模型的持仓卡片
│   ├── PositionTable.tsx     # 持仓表格
│   └── ExitPlanModal.tsx     # Exit Plan 弹窗
├── leaderboard/
│   ├── LeaderboardTable.tsx  # 排行榜表格
│   └── WinnerCard.tsx        # 获胜者卡片
├── model/
│   ├── ModelIcon.tsx         # 模型图标
│   └── ModelSelector.tsx     # 模型选择器
└── ui/                       # shadcn/ui 组件
    ├── button.tsx
    ├── table.tsx
    ├── tabs.tsx
    ├── card.tsx
    └── ...
```

### 状态管理
```
store/
├── useModelsStore.ts         # 模型数据
├── useChartStore.ts          # 图表状态
└── useFilterStore.ts         # 过滤器状态
```

### API 集成层
```
lib/
├── api/
│   ├── client.ts             # API 客户端配置
│   ├── nof1.ts              # nof1.ai API 接口封装
│   └── hooks/
│       ├── useCryptoPrices.ts    # 价格数据 hook
│       ├── usePositions.ts       # 持仓数据 hook
│       ├── useTrades.ts          # 交易历史 hook
│       ├── useAccountTotals.ts   # 账户总值 hook
│       ├── useSinceInception.ts  # 历史数据 hook
│       ├── useLeaderboard.ts     # 排行榜数据 hook
│       └── useAnalytics.ts       # 高级分析数据 hook
└── utils/
    ├── formatters.ts         # 数字/日期格式化
    ├── calculations.ts       # P&L 计算等
    └── transformers.ts       # API 数据转换
```

## API 集成策略

### 1. 数据获取层设计

使用 **SWR** (Stale-While-Revalidate) 进行数据获取：

```typescript
// lib/api/hooks/useCryptoPrices.ts
import useSWR from 'swr';

export function useCryptoPrices() {
  return useSWR('/api/crypto-prices', fetcher, {
    refreshInterval: 2000, // 每 2 秒刷新
    revalidateOnFocus: true,
  });
}

// lib/api/hooks/usePositions.ts
export function usePositions(limit = 1000) {
  return useSWR(`/api/positions?limit=${limit}`, fetcher, {
    refreshInterval: 5000, // 每 5 秒刷新
    dedupingInterval: 2000,
  });
}
```

### 2. API 客户端封装

```typescript
// lib/api/client.ts
const BASE_URL = 'https://nof1.ai/api';

export async function fetcher<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error('API request failed');
  }
  return response.json();
}

// lib/api/nof1.ts
export const nof1API = {
  getCryptoPrices: () => fetcher('/crypto-prices'),
  getPositions: (limit?: number) =>
    fetcher(`/positions${limit ? `?limit=${limit}` : ''}`),
  getTrades: () => fetcher('/trades'),
  getAccountTotals: (lastHourlyMarker?: number) =>
    fetcher(`/account-totals${lastHourlyMarker ? `?lastHourlyMarker=${lastHourlyMarker}` : ''}`),
  getSinceInceptionValues: () => fetcher('/since-inception-values'),
  getLeaderboard: () => fetcher('/leaderboard'),
  getAnalytics: () => fetcher('/analytics'),
};
```

### 3. 数据转换层

将 API 数据转换为应用内部数据结构：

```typescript
// lib/utils/transformers.ts
export function transformPositionsData(apiData: any): Position[] {
  return apiData.positions.flatMap((model: any) =>
    Object.entries(model.positions).map(([symbol, pos]: [string, any]) => ({
      id: `${model.id}_${symbol}`,
      modelId: model.id,
      side: pos.quantity > 0 ? 'LONG' : 'SHORT',
      coin: symbol,
      leverage: pos.leverage,
      notional: Math.abs(pos.quantity * pos.current_price),
      entryPrice: pos.entry_price,
      currentPrice: pos.current_price,
      unrealizedPnL: pos.unrealized_pnl,
      exitPlan: {
        target: pos.exit_plan?.profit_target,
        stop: pos.exit_plan?.stop_loss,
        invalidCondition: pos.exit_plan?.invalidation_condition,
      },
      openedAt: new Date(pos.entry_time * 1000),
    }))
  );
}
```

### 4. 实时更新策略

- **价格数据**: 每 2 秒自动刷新（SWR refreshInterval）
- **持仓数据**: 每 5 秒自动刷新
- **交易历史**: 每 10 秒自动刷新
- **图表数据**: 根据用户交互按需刷新

### 5. 错误处理与降级

```typescript
export function usePositions() {
  const { data, error, isLoading } = useSWR('/api/positions', fetcher, {
    refreshInterval: 5000,
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      // 最多重试 3 次
      if (retryCount >= 3) return;
      // 5 秒后重试
      setTimeout(() => revalidate({ retryCount }), 5000);
    },
  });

  return {
    positions: data ? transformPositionsData(data) : [],
    isLoading,
    isError: error,
  };
}
```

### 6. 模型配置

从 API 数据中自动识别模型（无需手动配置）：
- gpt-5
- claude-sonnet-4-5
- deepseek-chat-v3.1
- gemini-2-5-pro
- grok-4
- qwen3-max
- buynhold_btc（BTC 买入持有基准）

## 实施路线图

### Phase 1: 基础设施（1-2 天）
- [x] 初始化 Next.js 项目
- [x] 发现并分析 nof1.ai REST API
- [ ] 配置 Tailwind CSS + shadcn/ui
- [ ] 设置 TypeScript 类型定义
- [ ] 创建基础布局组件
- [ ] 实现响应式导航栏

### Phase 2: API 集成层（1 天）大幅简化
- [ ] 设置 SWR 配置
- [ ] 创建 API 客户端 (`lib/api/client.ts`)
- [ ] 实现所有 API hooks（7 个 hook）
  - useCryptoPrices, usePositions, useTrades
  - useAccountTotals, useSinceInception
  - useLeaderboard, useAnalytics
- [ ] 创建数据转换函数
- [ ] 设置错误处理和重试逻辑

### Phase 3: 主页实现（2-3 天）
- [ ] 价格滚动条组件
- [ ] 账户价值图表（Recharts）
- [ ] 图表控制器（时间范围/格式切换）
- [ ] 标签页容器
- [ ] README 标签页内容

### Phase 4: Positions 功能（2 天）
- [ ] 持仓表格组件
- [ ] 模型过滤器
- [ ] Exit Plan 弹窗
- [ ] 持仓卡片折叠/展开
- [ ] 盈亏颜色编码

### Phase 5: ModelChat 功能（2 天）
- [ ] 聊天消息列表
- [ ] 消息格式化（角色区分）
- [ ] 提示词展示区
- [ ] 决策高亮显示
- [ ] 滚动到最新消息

### Phase 6: 已完成交易（1 天）
- [ ] 交易历史列表
- [ ] 交易过滤（按模型）
- [ ] 交易详情展示
- [ ] P&L 计算展示

### Phase 7: Leaderboard 页面（1-2 天）
- [ ] 排行榜表格
- [ ] 排名可视化
- [ ] 获胜者卡片
- [ ] 统计图表
- [ ] 高级分析标签页

### Phase 8: 动画与优化（1 天）
- [ ] 页面过渡动画
- [ ] 数据更新动画
- [ ] 性能优化
- [ ] 移动端适配优化

### Phase 9: 实时模拟（1 天）
- [ ] 价格实时更新
- [ ] 盈亏实时计算
- [ ] 新交易生成动画
- [ ] 图表实时更新

### Phase 10: 打磨与部署（1 天）
- [ ] UI 细节调整
- [ ] 终端风格美化
- [ ] SEO 优化
- [ ] Vercel 部署
- [ ] README 文档

**总计：10-12 天** 相比 mock 方案节省 2-3 天

## 关键技术实现

### 1. 实时价格滚动
```typescript
// 使用 CSS animation 或 Framer Motion
// 无限循环滚动效果
```

### 2. 账户价值图表实现

**数据来源**: `/api/since-inception-values`

**实现思路**:
1. 使用 SWR 每 10 秒获取历史价值数据
2. 将 API 数据转换为 Recharts 格式（按时间戳分组）
3. 支持时间范围筛选（ALL / 72H）
4. 支持数值格式切换（美元 / 百分比）
5. 为每个模型绘制不同颜色的折线
6. 性能优化：超过 1000 个数据点时进行采样

**关键功能**:
- 多条折线图（每个 AI 模型一条线）
- 时间轴 X 轴，价值/百分比 Y 轴
- 鼠标悬停显示详细数值
- 图例显示/隐藏特定模型
- 响应式容器适配不同屏幕

### 3. 颜色编码系统
```typescript
const getPnLColor = (value: number) => {
  if (value > 0) return 'text-green-500';
  if (value < 0) return 'text-red-500';
  return 'text-gray-400';
};
```

### 4. 终端风格美化
```css
/* CRT 扫描线效果 */
.terminal-effect {
  background:
    linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%),
    linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
  background-size: 100% 2px, 3px 100%;
}

/* 闪烁光标 */
@keyframes blink {
  50% { opacity: 0; }
}
```

## 未来扩展

1. **后端集成准备**
   - API 接口定义
   - WebSocket 实时数据
   - 真实交易所集成

2. **高级功能**
   - 模型对比分析
   - 回测功能
   - 风险指标
   - 自定义 AI 模型

3. **用户功能**
   - 用户账户系统
   - 收藏模型
   - 通知系统

## 设计参考

### 配色方案
```
Primary: #7c3aed (紫色 - nof1 品牌色)
Secondary: #3b82f6 (蓝色)
Success: #10b981 (绿色 - 盈利)
Danger: #ef4444 (红色 - 亏损)
Background: #0a0a0a (深色背景)
Surface: #1a1a1a (卡片背景)
Text: #e5e5e5 (主文本)
Text Muted: #737373 (次要文本)
```

### 字体
```
Monospace: 'JetBrains Mono', 'Fira Code', monospace
Sans: 'Inter', 'Helvetica Neue', sans-serif
```

## 结语

本方案提供了 nof0 MVP 的完整实现路径，专注于展示 AI 交易代理的核心功能。

### 核心优势

1. **真实数据驱动**
   - 直接使用 nof1.ai 的公开 REST API
   - 无需创建和维护 mock 数据
   - 实时同步真实的 AI 交易数据
   - 节省 2-3 天开发时间

2. **现代技术栈**
   - Next.js + TypeScript + Tailwind CSS
   - SWR 实现数据获取和缓存
   - shadcn/ui 提供高质量组件
   - Recharts 实现专业图表

3. **快速迭代**
   - API 数据结构已确定
   - 无需等待后端开发
   - 专注前端 UI/UX 优化
   - 易于调试和测试

4. **生产就绪**
   - 实时数据更新
   - 完善的错误处理
   - 性能优化策略
   - 可直接部署使用

### 设计风格

参考 CoinGecko 的紧凑型金融界面，同时保持 nof1.ai 的终端风格美学，打造专业且现代的 AI 交易数据展示平台。

### 下一步

1. 立即开始 Phase 1：配置基础设施
2. 快速完成 Phase 2：实现 API 集成层
3. 专注核心功能：Positions 和 Logic 展示
4. 迭代优化 UI/UX 体验

**预计 10-12 天即可完成功能完整的 MVP 版本！**
