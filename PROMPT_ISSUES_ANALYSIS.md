# Prompt 对接流程分析与问题总结

## 📊 完整数据流图

```
┌─────────────────────────────────────────────────────────────┐
│  前端 Prompt Editor Panel                                    │
│  - promptEnv: "demo-futures" (用户选择的模板环境)          │
│  - env: "demo-futures" (交易环境)                          │
└─────────────────┬───────────────────────────────────────────┘
                  │ POST /api/nof1/ai/prompts
                  │ { system, user, env: promptEnv }
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  后端 API Route (/api/nof1/ai/prompts)                      │
│  - 根据 env 参数保存到对应文件                              │
│  - futures → prompt_templates/futures/*.txt                │
│  - spot → prompt_templates/spot/*.txt                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  文件系统                                                     │
│  prompt_templates/                                           │
│  ├── futures/                                                │
│  │   ├── system_prompt.txt                                   │
│  │   └── user_prompt.hbs                                     │
│  └── spot/                                                   │
│      ├── system_prompt.txt                                   │
│      └── user_prompt.hbs                                     │
└─────────────────┬───────────────────────────────────────────┘
                  │ (系统启动时读取一次)
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  AI Trading System (ai-trading-system.v2.mjs)              │
│  constructor() {                                             │
│    this.tradingEnv = "demo-futures"                        │
│    ↓                                                         │
│    从 config.presets[tradingEnv].prompt_files 读取路径      │
│    ↓                                                         │
│    this.systemPromptTemplate = readFileSync(...)  ⚠️ 一次   │
│    this.userPromptTemplate = readFileSync(...)   ⚠️ 一次   │
│  }                                                           │
└─────────────────┬───────────────────────────────────────────┘
                  │ (运行时使用)
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  运行时调用                                                   │
│  runTradingCycle() {                                         │
│    userPrompt = generateUserPrompt(marketData)              │
│      → renderSimple(this.userPromptTemplate, context)       │
│    systemPrompt = buildSystemPrompt()                      │
│      → renderSections(...) + renderSimple(...)              │
│    callDeepSeekAPI(userPrompt)                              │
│      → 发送 { system: systemPrompt, user: userPrompt }      │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

## 🔴 严重问题

### 问题 1: 模板热重载缺失

**问题**：
- 模板在系统启动时一次性读取到内存
- 运行时修改模板文件不会生效
- 必须重启整个交易系统

**影响**：
- 用户体验差：编辑后不知道何时生效
- 需要停止交易才能看到效果
- 可能造成交易中断

**解决方案**：
```javascript
// 方案A：添加文件监听（推荐）
import { watch } from 'fs';

watch(this.systemPromptTemplatePath, () => {
  console.log('模板文件已更新，重新加载...');
  this.reloadTemplates();
});

// 方案B：每次使用时检查文件修改时间
getTemplate() {
  const mtime = fs.statSync(path).mtime;
  if (mtime > this.templateLastLoad) {
    this.reloadTemplates();
  }
}
```

### 问题 2: promptEnv 和 tradingEnv 不一致

**问题**：
- 前端保存时使用 `promptEnv`（模板环境选择）
- AI 系统运行时使用 `tradingEnv`（交易环境）
- 用户可能编辑错误的模板

**场景示例**：
```
用户操作：
1. Prompt 环境选择：Spot
2. 编辑并保存 spot 模板 ✅
3. 交易环境选择：demo-futures
4. 启动交易

结果：
- AI 系统读取的是 futures 模板 ❌
- 用户编辑的是 spot 模板，但不生效
```

**解决方案**：
- 前端保存时检查一致性，给出警告
- 或者，保存时同时更新当前 tradingEnv 对应的模板

## ⚠️ 中等问题

### 问题 3: renderSections 调用多余

**问题**：
- 新的 futures/spot 模板已不包含 `{{#is_futures}}` 标签
- 但 `buildSystemPrompt()` 仍调用 `renderSections()`
- 虽然不影响功能，但代码冗余

**当前代码**：
```javascript
const tpl1 = renderSections(this.systemPromptTemplate, { is_futures: this.isFutures });
// ↑ 这个调用对新的独立模板来说是多余的
```

**解决方案**：
- 移除 renderSections 调用，或
- 检查模板是否包含条件标签，如果没有则跳过

### 问题 4: 缺少模板加载错误处理

**问题**：
- 如果模板文件不存在或读取失败，使用默认值
- 但用户可能不知道模板加载失败

**解决方案**：
- 添加明确的错误日志
- 前端显示当前使用的模板路径

## 💡 改进建议

### 1. 添加模板重新加载 API
```javascript
router.post('/ai/trading/reload-prompts', async (req, res) => {
  // 通知运行中的交易系统重新加载模板
});
```

### 2. 前端显示当前使用的模板
- 显示当前编辑的模板对应哪个交易环境
- 显示当前运行的交易系统使用的模板路径

### 3. 添加模板验证
- 保存前验证模板格式
- 检查必需字段是否存在

### 4. 统一环境变量命名
- 明确区分 `promptEnv`（编辑环境）和 `tradingEnv`（运行环境）
- 提供清晰的用户界面说明
