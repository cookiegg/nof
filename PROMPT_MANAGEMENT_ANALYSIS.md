# Prompt管理机制分析与改进建议

## 当前架构

### 1. 两种管理模式

#### `env-shared` 模式（环境共享）
- **存储位置**：`backend/ai/ai-trading/prompt_templates/`
- **目录结构**：
  ```
  prompt_templates/
  ├── futures/          # demo-futures 和 futures 共用
  │   ├── system_prompt.txt
  │   └── user_prompt.hbs
  └── spot/             # demo-spot 和 spot 共用
      ├── system_prompt.txt
      └── user_prompt.hbs
  ```
- **使用场景**：多个Bot共享同一个环境的prompt模板
- **问题**：demo和real环境共用同一套模板，无法区分

#### `bot-specific` 模式（Bot独立）
- **存储位置**：`backend/data/bots/{botId}/prompts/`
- **目录结构**：
  ```
  data/bots/
  └── {botId}/
      └── prompts/
          ├── system_prompt.txt
          └── user_prompt.hbs
  ```
- **使用场景**：每个Bot使用独立的prompt
- **初始化**：创建时可以从env模板继承

### 2. 当前实现的问题

1. **环境区分不足**：
   - `demo-futures` 和 `futures` 共用 `futures/` 目录
   - `demo-spot` 和 `spot` 共用 `spot/` 目录
   - 无法为demo和real环境分别定制prompt

2. **模板组织不够清晰**：
   - 只有两层：类型（futures/spot）
   - 缺少环境层（demo/real）

3. **扩展性差**：
   - 如果未来需要添加新的环境类型，需要修改代码逻辑

## 改进方案

### 方案1：四目录结构（推荐）✅

为四种交易环境分别建立独立的公共模板目录：

```
backend/ai/ai-trading/prompt_templates/
├── demo-futures/
│   ├── system_prompt.txt
│   └── user_prompt.hbs
├── demo-spot/
│   ├── system_prompt.txt
│   └── user_prompt.hbs
├── futures/
│   ├── system_prompt.txt
│   └── user_prompt.hbs
└── spot/
    ├── system_prompt.txt
    └── user_prompt.hbs
```

**优势**：
- ✅ 清晰分离：每种环境有独立的模板
- ✅ 易于管理：可以分别针对demo和real环境优化
- ✅ 向后兼容：可以迁移现有文件
- ✅ 扩展性强：未来添加新环境很容易

**迁移策略**：
1. 将现有的 `futures/` 内容复制到 `demo-futures/` 和 `futures/`
2. 将现有的 `spot/` 内容复制到 `demo-spot/` 和 `spot/`
3. 保留 `futures/` 和 `spot/` 作为向后兼容（如果新目录不存在则使用）

### 方案2：两层级结构

```
backend/ai/ai-trading/prompt_templates/
├── demo/
│   ├── futures/
│   │   ├── system_prompt.txt
│   │   └── user_prompt.hbs
│   └── spot/
│       ├── system_prompt.txt
│       └── user_prompt.hbs
└── real/
    ├── futures/
    │   ├── system_prompt.txt
    │   └── user_prompt.hbs
    └── spot/
        ├── system_prompt.txt
        └── user_prompt.hbs
```

**优势**：
- ✅ 层级清晰：先按环境类型（demo/real），再按交易类型（futures/spot）
- ✅ 适合更复杂的分层需求

**劣势**：
- ❌ 路径更长
- ❌ 对于4种环境可能过于复杂

## 推荐实施：方案1

### 实施步骤

1. **创建新的目录结构**
   ```bash
   mkdir -p backend/ai/ai-trading/prompt_templates/{demo-futures,demo-spot,futures,spot}
   ```

2. **迁移现有文件**
   - 从 `futures/` 复制到 `demo-futures/` 和 `futures/`
   - 从 `spot/` 复制到 `demo-spot/` 和 `spot/`

3. **更新代码逻辑**
   - 修改 `EnvPromptManager._resolvePaths()` 方法
   - 支持四种环境分别映射到对应目录
   - 保持向后兼容（如果新目录不存在，使用旧目录）

4. **更新文档**
   - 说明新的目录结构
   - 迁移指南

### 代码修改

需要修改 `backend/src/services/prompts/prompt-manager.js` 中的 `EnvPromptManager` 类：

```javascript
class EnvPromptManager {
  constructor(env) {
    this.env = env;
    this.sysPath = null;
    this.userPath = null;
    this._resolvePaths();
  }

  _resolvePaths() {
    // 直接使用环境名称作为目录名
    const envDir = this.env; // 'demo-futures', 'demo-spot', 'futures', 'spot'
    
    // 首先尝试使用精确匹配的目录
    this.sysPath = path.join(TPL_BASE_DIR, envDir, 'system_prompt.txt');
    this.userPath = path.join(TPL_BASE_DIR, envDir, 'user_prompt.hbs');
    
    // 向后兼容：如果新目录不存在，回退到旧逻辑
    // （可以通过检查文件是否存在来实现）
  }
  
  // ... 其他方法保持不变
}
```

## Bot独立Prompt的当前实现

### 存储位置
```
backend/data/bots/{botId}/prompts/
├── system_prompt.txt
└── user_prompt.hbs
```

### 继承机制
- 创建Bot时，如果选择 `bot-specific` 模式，可以从env模板继承
- 如果Bot的prompt文件为空，会自动从env模板加载并保存

### 建议保持
- ✅ 当前实现合理
- ✅ 独立目录便于Bot隔离
- ✅ 继承机制方便初始化

## 完整目录结构（改进后）

```
backend/
├── ai/ai-trading/prompt_templates/     # 公共模板（env-shared）
│   ├── demo-futures/
│   │   ├── system_prompt.txt
│   │   └── user_prompt.hbs
│   ├── demo-spot/
│   │   ├── system_prompt.txt
│   │   └── user_prompt.hbs
│   ├── futures/
│   │   ├── system_prompt.txt
│   │   └── user_prompt.hbs
│   └── spot/
│       ├── system_prompt.txt
│       └── user_prompt.hbs
└── data/
    └── bots/                           # Bot独立Prompt（bot-specific）
        └── {botId}/
            └── prompts/
                ├── system_prompt.txt
                └── user_prompt.hbs
```

## 使用场景总结

| 场景 | 模式 | 存储位置 | 用途 |
|------|------|----------|------|
| 同一环境的所有Bot共享prompt | env-shared | `prompt_templates/{env}/` | 统一管理，便于批量更新 |
| 某个Bot需要独立prompt | bot-specific | `data/bots/{botId}/prompts/` | 个性化定制，不影响其他Bot |
| Demo环境测试 | env-shared | `prompt_templates/demo-{type}/` | 测试环境专用prompt |
| 实盘交易 | env-shared | `prompt_templates/{type}/` | 实盘环境专用prompt |

## 实施优先级

1. **高优先级**（立即实施）：
   - 创建四种环境的独立目录
   - 更新 `EnvPromptManager` 支持四种环境
   - 迁移现有文件

2. **中优先级**（可选）：
   - 添加环境验证（确保环境名称有效）
   - 提供模板复制工具（方便创建新Bot时复制模板）

3. **低优先级**（未来考虑）：
   - 模板版本管理
   - 模板差异对比工具
   - 模板A/B测试

