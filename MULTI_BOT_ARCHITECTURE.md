# 多Bot架构设计文档

## 📋 需求理解

### 当前状态
- 只能运行一个bot实例
- 交易控制和prompt编辑混在一个面板

### 目标架构
- 支持同时运行多个bot实例
- 每个bot由唯一标识：`[env, ai, intervalMinutes]` 组合
- 交易控制和prompt编辑分离
- 组件化设计，便于复用

## 🏗️ 架构设计

### 1. Bot 定义

每个Bot的唯一标识：
```typescript
type BotId = string; // 例如: "demo-futures-deepseek-3" 或 UUID

interface BotConfig {
  id: BotId;
  env: 'demo-futures' | 'demo-spot' | 'futures' | 'spot';
  ai: string; // AI预设名称，如 'deepseek' | 'deepseek-reasoner' | ''
  intervalMinutes: number;
  name?: string; // 可选的友好名称，如 "期货策略-3分钟"
}
```

### 2. 后端多Bot管理

#### 当前结构（需要改造）
```javascript
// 当前：只能管理一个bot
class TradingRunnerService {
  this.child = null;  // 单个进程
  this.status = {...}; // 单个状态
}
```

#### 目标结构
```javascript
// 目标：管理多个bot
class TradingRunnerService {
  this.bots = new Map<BotId, BotInstance>();
  
  class BotInstance {
    id: BotId;
    config: BotConfig;
    child: ChildProcess;
    status: {
      running: boolean;
      pid: number;
      startedAt: string;
      // ...
    };
  }
}
```

### 3. 前端组件结构

#### 当前结构
```
PromptEditorPanel.tsx
├── Prompt编辑区
└── 交易控制区（嵌入）
```

#### 目标结构
```
TradingBotsManager.tsx (主面板)
├── Bot列表区
│   ├── BotCard组件（可复用）
│   │   ├── Bot信息显示
│   │   └── 启动/停止按钮
│   └── "添加Bot"按钮
└── PromptEditorPanel.tsx (独立面板)
    ├── Bot选择下拉框（选择已有的bot）
    └── Prompt Studio组件（复用现有）
```

### 4. 数据存储

#### Bot配置存储
```json
// backend/data/bots.json
{
  "bots": [
    {
      "id": "demo-futures-deepseek-3",
      "env": "demo-futures",
      "ai": "deepseek",
      "intervalMinutes": 3,
      "name": "期货快速策略",
      "createdAt": "2025-01-01T00:00:00Z"
    },
    {
      "id": "demo-spot-reasoner-5",
      "env": "demo-spot",
      "ai": "deepseek-reasoner",
      "intervalMinutes": 5,
      "name": "现货稳健策略",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### Bot状态存储（每个bot独立）
```json
// backend/data/bots/{botId}/
├── trading-state.json
├── conversations.json
└── trades.json
```

## 🔄 完整数据流

### Bot创建流程
```
用户点击"添加Bot"
    ↓
弹出Bot配置对话框
    ↓
输入：env, ai, intervalMinutes, name
    ↓
POST /api/nof1/bots
    ↓
后端创建Bot配置 → 保存到 bots.json
    ↓
返回BotId
    ↓
前端添加BotCard到列表
```

### Bot启动流程
```
用户点击BotCard上的"启动"
    ↓
POST /api/nof1/bots/{botId}/start
    ↓
后端：
1. 查找Bot配置
2. 创建独立进程（使用botId作为标识）
3. 设置环境变量：TRADING_ENV, AI_PRESET
4. 设置数据目录：backend/data/bots/{botId}/
    ↓
AI系统读取配置，使用botId对应的数据目录
```

### Prompt编辑流程
```
用户在Prompt编辑区选择Bot
    ↓
下拉框显示所有已创建的Bot（包括运行的）
    ↓
选择Bot（如 "demo-futures-deepseek-3"）
    ↓
根据Bot的env加载对应的prompt模板
    ↓
编辑并保存
    ↓
应用Prompt → 只影响该Bot
```

## 📁 文件结构设计

### 后端
```
backend/
├── src/
│   ├── services/
│   │   ├── runner.js → 改造为 bots-manager.js
│   │   └── binance/ (已存在)
│   └── routes/
│       └── nof1.js → 添加 /api/nof1/bots/* 路由
├── data/
│   ├── bots.json (Bot配置列表)
│   └── bots/
│       ├── {botId1}/
│       │   ├── trading-state.json
│       │   ├── conversations.json
│       │   └── trades.json
│       └── {botId2}/
│           └── ...
└── ai/
    └── ai-trading/
        └── ai-trading-system.v2.mjs → 支持BOT_ID参数
```

### 前端
```
web/src/components/
├── trading/
│   ├── TradingBotsManager.tsx (新：主面板)
│   ├── BotCard.tsx (新：单个Bot卡片组件)
│   ├── AddBotDialog.tsx (新：添加Bot对话框)
│   └── BotControlPanel.tsx (从PromptEditorPanel提取)
└── prompts/
    ├── PromptEditorPanel.tsx (改造：选择Bot后编辑)
    └── PromptStudioChatPanel.tsx (已存在，复用)
```

## 🔑 关键设计决策

### 1. Bot唯一标识

**方案A：组合ID**
```
格式：{env}-{ai}-{intervalMinutes}
示例：demo-futures-deepseek-3
优点：直观，可读性好
缺点：如果用户创建相同配置的bot会冲突
```

**方案B：UUID + 配置**
```
格式：UUID（前端生成或后端生成）
示例：550e8400-e29b-41d4-a716-446655440000
优点：唯一性保证
缺点：不够直观
```

**推荐**：方案A + 序号后缀
```
格式：{env}-{ai}-{intervalMinutes}-{index}
示例：demo-futures-deepseek-3-1
如果冲突自动加序号：demo-futures-deepseek-3-2
```

### 2. Bot数据隔离

每个Bot有独立的数据目录：
```
backend/data/bots/{botId}/
├── trading-state.json
├── conversations.json
└── trades.json
```

修改 `ai-trading-system.v2.mjs` 支持 `BOT_ID` 环境变量：
```javascript
const botId = process.env.BOT_ID || 'default';
const dataDir = resolve(process.cwd(), 'backend', 'data', 'bots', botId);
```

### 3. 进程管理

每个Bot独立进程：
```javascript
// bots-manager.js
class BotInstance {
  constructor(botId, config) {
    this.botId = botId;
    this.config = config;
    this.child = null;
  }
  
  start() {
    const child = spawn('node', [runnerPath, interval], {
      env: {
        ...process.env,
        TRADING_ENV: this.config.env,
        AI_PRESET: this.config.ai,
        BOT_ID: this.botId  // 新增
      }
    });
    this.child = child;
  }
}
```

## 📝 API设计

### Bot管理API

```
GET    /api/nof1/bots           # 获取所有Bot配置
POST   /api/nof1/bots           # 创建新Bot
GET    /api/nof1/bots/:botId    # 获取Bot详情
PUT    /api/nof1/bots/:botId    # 更新Bot配置
DELETE /api/nof1/bots/:botId    # 删除Bot（需先停止）

POST   /api/nof1/bots/:botId/start    # 启动Bot
POST   /api/nof1/bots/:botId/stop     # 停止Bot
GET    /api/nof1/bots/:botId/status   # 获取Bot运行状态

POST   /api/nof1/bots/:botId/reload-prompts  # 重新加载Prompt
```

### Prompt API（需要修改）

```
GET  /api/nof1/bots/:botId/prompts  # 获取Bot的prompt
POST /api/nof1/bots/:botId/prompts  # 保存Bot的prompt
```

注意：prompt按env存储，多个相同env的bot共享prompt模板

## ❓ 需要确认的问题

1. **Bot命名**：用户是否需要给Bot起自定义名称？
   - 是：添加 `name` 字段
   - 否：自动生成（如 "Futures-DeepSeek-3分钟"）

2. **Bot配置修改**：运行中的Bot能否修改配置？
   - 允许：需要重启
   - 不允许：只能删除后重建

3. **相同配置的多个Bot**：是否允许？
   - 允许：用于A/B测试
   - 不允许：提示已存在

4. **Bot数据查看**：如何查看某个Bot的交易数据？
   - 在BotCard上显示基本统计
   - 点击进入详情页
   - 在主界面统一展示（按Bot筛选）

5. **Prompt共享策略**：
   - 方案A：相同env的bot共享prompt（当前实现）
   - 方案B：每个bot独立的prompt（需要修改存储）

## 🎯 实施步骤（建议）

### Phase 1: 后端多Bot支持
1. 改造 `runner.js` → `bots-manager.js`
2. 添加Bot配置存储（bots.json）
3. 修改AI系统支持BOT_ID
4. 实现Bot管理API

### Phase 2: 前端组件化
1. 提取BotControlPanel组件
2. 创建BotCard组件
3. 创建TradingBotsManager主面板
4. 实现Bot列表和添加功能

### Phase 3: Prompt编辑改造
1. 修改PromptEditorPanel，支持Bot选择
2. 实现Bot下拉框（显示所有Bot）
3. 根据选择的Bot加载对应prompt

### Phase 4: 数据展示
1. 修改数据API支持botId过滤
2. 前端按Bot显示数据

