# 当前交易控制面板分析

## 📍 当前结构（PromptEditorPanel.tsx）

### 组件布局

```
PromptEditorPanel (整个面板)
├── 顶部工具栏
│   ├── 标题："Prompt 工作台"
│   └── 按钮：[建议] [保存] [应用Prompt]
│
├── Bot选择区（239-265行）
│   └── 选择交易环境（用于编辑prompt）
│
├── 交易控制区（267-309行）⭐ 需要提取
│   ├── 交易类型选择（env）
│   ├── AI模型选择（ai）
│   ├── 间隔分钟数（intervalMinutes）
│   ├── [启动] [停止] 按钮
│   └── 状态显示
│
└── Prompt编辑区（315-362行）
    ├── System Prompt文本区
    ├── User Prompt文本区
    └── 其他配置显示
```

## 🔍 交易控制区详细分析

### 当前实现（267-309行）

```tsx
{/* 交易控制 */}
<div className="mb-3 rounded border p-2">
  <div className="mb-2 text-[11px]">交易控制</div>
  
  {/* 配置输入 */}
  <div className="mb-2 grid grid-cols-3 gap-2">
    <label>交易类型</label>
    <select value={env} onChange={...}>
      {/* demo-futures, demo-spot, futures, spot */}
    </select>
    
    <label>AI模型</label>
    <select value={ai} onChange={...}>
      {/* (默认) + aiPresetKeys */}
    </select>
    
    <label>间隔(分)</label>
    <input type="number" value={intervalMinutes} ... />
  </div>
  
  {/* 控制按钮 */}
  <div className="flex items-center gap-2">
    <button onClick={startTrading} disabled={isRunning}>启动</button>
    <button onClick={stopTrading} disabled={!isRunning}>停止</button>
    <div>状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}</div>
  </div>
</div>
```

### 相关状态和函数

**状态**：
- `env`: 交易类型（demo-futures/demo-spot/futures/spot）
- `ai`: AI模型预设名称（可选）
- `intervalMinutes`: 运行间隔（分钟）
- `status`: Bot运行状态（从 `/api/nof1/ai/trading/status` 获取）

**函数**：
- `startTrading()`: POST `/api/nof1/ai/trading/start`，传递 `{ intervalMinutes, env, ai }`
- `stopTrading()`: POST `/api/nof1/ai/trading/stop`
- `isRunning`: 从 `status?.running` 判断

**数据来源**：
- `aiPresetKeys`: 从 `cfg?.ai?.presets` 获取AI预设列表
- `status`: 从 `/api/nof1/ai/trading/status` 获取当前运行状态

## 🎯 提取为组件的设计

### 目标：BotControlPanel 组件

```tsx
// web/src/components/trading/BotControlPanel.tsx

interface BotControlPanelProps {
  bot?: BotConfig;           // 如果传入bot，显示bot的配置；否则显示空配置用于创建新bot
  onStart?: (config: BotConfig) => void;
  onStop?: (botId: string) => void;
  status?: BotStatus;        // 该bot的运行状态
  aiPresets?: string[];      // AI预设列表
}

function BotControlPanel({ bot, onStart, onStop, status, aiPresets }) {
  // 提取当前交易控制区的所有逻辑
}
```

### 提取的内容

1. **UI部分**（267-309行）：
   - 整个 `<div className="mb-3 rounded border p-2">` 区域
   - 所有表单控件
   - 启动/停止按钮和状态显示

2. **逻辑部分**：
   - `startTrading()` 函数
   - `stopTrading()` 函数
   - 相关的状态管理（env, ai, intervalMinutes）
   - isRunning 判断逻辑

3. **依赖数据**：
   - `aiPresetKeys`: 需要从外部传入
   - `status`: 需要从外部传入（或组件内部获取）

## 🔄 改造后的结构

### Option 1: 单Bot模式（当前保持兼容）

```tsx
// PromptEditorPanel.tsx
<BotControlPanel
  status={status}
  aiPresets={aiPresetKeys}
  onStart={handleStart}
  onStop={handleStop}
/>
```

### Option 2: 多Bot模式（目标架构）

```tsx
// TradingBotsManager.tsx
{bots.map(bot => (
  <BotCard key={bot.id}>
    <BotControlPanel
      bot={bot}
      status={botStatuses[bot.id]}
      aiPresets={aiPresetKeys}
      onStart={() => handleStartBot(bot.id)}
      onStop={() => handleStopBot(bot.id)}
    />
  </BotCard>
))}
```

## 📋 需要提取的具体代码

### 1. JSX部分（267-309行）

```tsx
{/* 交易控制 */}
<div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
  <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
  <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
    {/* ... 表单控件 ... */}
  </div>
  <div className="flex items-center gap-2">
    {/* ... 按钮 ... */}
  </div>
</div>
```

### 2. 状态管理

```tsx
const [env, setEnv] = useState<string>("");
const [ai, setAi] = useState<string>("");
const [intervalMinutes, setIntervalMinutes] = useState<number>(3);
```

### 3. 函数

```tsx
async function startTrading() {
  // POST /api/nof1/ai/trading/start
  // body: { intervalMinutes, env, ai }
}

async function stopTrading() {
  // POST /api/nof1/ai/trading/stop
}
```

### 4. 计算值

```tsx
const isRunning = !!status?.running;
```

## 🚀 改造步骤

### Step 1: 创建 BotControlPanel 组件
- 提取UI和逻辑
- 支持传入bot配置（可选）
- 支持回调函数（onStart/onStop）

### Step 2: 修改 PromptEditorPanel
- 使用新的 BotControlPanel 组件
- 移除重复代码

### Step 3: 创建 BotCard 组件（为多Bot做准备）
- 包装 BotControlPanel
- 显示Bot名称和基本信息

### Step 4: 创建 TradingBotsManager（主面板）
- Bot列表
- "添加Bot"按钮
- 管理所有Bot

## ⚠️ 注意事项

1. **状态同步**：
   - 如果Bot在外部被启动/停止，需要刷新status
   - 可能需要轮询或WebSocket更新

2. **配置验证**：
   - 启动前验证配置完整性
   - env、intervalMinutes必须有效

3. **错误处理**：
   - 启动/停止失败的错误提示
   - 网络错误的处理

4. **UI反馈**：
   - 启动/停止中的loading状态
   - 成功/失败的提示

