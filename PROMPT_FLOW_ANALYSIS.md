# Prompt 编辑到 AI 决策系统的对接流程分析

## 当前实现流程

### 1. 前端编辑保存流程
```
用户编辑 Prompt → 点击保存
    ↓
POST /api/nof1/ai/prompts
{
  system: "...",
  user: "...",
  env: "demo-futures" (promptEnv)
}
    ↓
后端根据 env 保存到：
- futures: prompt_templates/futures/system_prompt.txt
- spot: prompt_templates/spot/system_prompt.txt
```

### 2. AI 系统启动时读取流程
```
ai-trading-system.v2.mjs 启动
    ↓
constructor() {
  this.tradingEnv = 'demo-futures' (从 --env 或 config.trading_env)
    ↓
  从 config.presets[tradingEnv].prompt_files 读取路径
    ↓
  读取模板文件到内存：
  - this.systemPromptTemplate (一次性读取)
  - this.userPromptTemplate (一次性读取)
}
```

### 3. AI 运行时使用流程
```
runTradingCycle()
    ↓
generateUserPrompt(marketData)
  → 使用 this.userPromptTemplate 渲染
    ↓
buildSystemPrompt()
  → 使用 this.systemPromptTemplate 渲染
    ↓
callDeepSeekAPI(userPrompt)
  → 发送 system + user prompt 给 AI
```

## 发现的问题

### ❌ 问题 1: 模板只在启动时读取，运行时修改无效

**问题描述**：
- 模板在 `constructor()` 中一次性读取到内存
- 如果用户在系统运行时修改了 prompt 文件，AI 系统不会重新加载
- 需要重启整个交易系统才能生效

**影响**：
- 用户编辑 prompt 后，必须停止并重启交易系统
- 无法实时生效，体验差

**解决方案**：
- 方案A：每次调用时重新读取文件（性能开销）
- 方案B：添加文件监听（watch），文件变更时重新加载
- 方案C：添加手动重新加载功能（API接口）

### ❌ 问题 2: renderSections 函数可能多余

**问题描述**：
- `buildSystemPrompt()` 中调用了 `renderSections(this.systemPromptTemplate, { is_futures: this.isFutures })`
- 但新的 futures/spot 模板已经不包含 `{{#is_futures}}` 条件渲染标签
- 这个函数调用可能是不必要的

**影响**：
- 虽然不影响功能，但代码冗余

**解决方案**：
- 检查模板是否包含条件标签，如果没有则跳过 renderSections

### ⚠️ 问题 3: promptEnv 和 tradingEnv 可能不一致

**问题描述**：
- 前端保存 prompt 时使用 `promptEnv`（用户选择的模板环境）
- AI 系统运行时使用 `tradingEnv`（实际交易环境）
- 这两个可能不一致

**示例场景**：
- 用户在 "Prompt 环境" 选择 "Spot"，编辑并保存 spot 模板
- 但在 "交易控制" 中选择 "demo-futures" 启动交易
- 结果是：AI 系统会读取 futures 模板，但用户编辑的是 spot 模板

**影响**：
- 用户可能以为编辑的是当前运行的模板，实际不是

**解决方案**：
- 前端保存时，应该提示用户当前编辑的模板对应的交易环境
- 或者，保存时同时检查 tradingEnv，如果不一致给出警告

### ⚠️ 问题 4: 模板文件路径硬编码在 config.json

**问题描述**：
- 模板路径在 config.json 的 presets 中硬编码
- 如果路径变更，需要手动修改 config.json

**影响**：
- 不够灵活

### ❌ 问题 5: 缺少模板热重载机制

**问题描述**：
- 没有机制检测模板文件变更
- 没有 API 接口让前端触发重新加载

**影响**：
- 用户编辑后不知道何时生效

