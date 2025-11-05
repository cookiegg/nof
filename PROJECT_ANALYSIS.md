# NOF0 项目总体分析报告

**生成时间**: 2025-01-XX  
**项目路径**: `/data/proj/open_nof1/nof0`

---

## 📋 项目概述

**NOF0** 是一个基于 AI 的加密货币自动化交易系统，灵感来源于 nof1.ai。该系统实现了多 Bot 管理、AI 驱动交易决策、实时市场数据分析等功能。

### 核心定位
- **目标**: 构建一个类似 nof1.ai 的 AI 量化交易平台
- **特点**: 支持多 Bot 同时运行，每个 Bot 使用独立的 AI 模型和 API Key
- **架构**: 前后端分离，Next.js + Express.js

---

## 🏗️ 技术架构

### 前端技术栈
- **框架**: Next.js 16.0.0 (React 19.2.0)
- **语言**: TypeScript
- **状态管理**: Zustand
- **数据获取**: SWR
- **图表**: Recharts
- **UI**: Tailwind CSS 4
- **Markdown**: react-markdown

### 后端技术栈
- **运行时**: Node.js (ES Modules)
- **框架**: Express.js 4.19.2
- **日志**: Pino
- **交易所接口**: CCXT 4.4.37
- **AI SDK**: OpenAI SDK 6.7.0 (兼容百炼 API)
- **HTTP 客户端**: node-fetch 3.3.2

---

## 📁 项目结构

```
nof0/
├── backend/              # 后端服务
│   ├── src/
│   │   ├── server.js           # Express 服务器入口
│   │   ├── routes/
│   │   │   └── nof1.js         # 主要 API 路由
│   │   └── services/
│   │       ├── ai/              # AI 相关服务
│   │       │   ├── bailian-client.js    # 百炼 API 统一客户端
│   │       │   └── model-config.js      # 模型配置管理
│   │       ├── api-key-manager.js        # API Key 管理
│   │       ├── binance/                  # Binance 交易所接口
│   │       ├── bots/                     # Bot 配置管理
│   │       ├── prompts/                  # Prompt 管理
│   │       ├── runner.js                 # Bot 进程管理
│   │       ├── trading/                  # 交易执行器
│   │       └── metrics.js                # 指标计算
│   ├── ai/
│   │   ├── ai-trading/          # AI 交易核心系统
│   │   │   ├── ai-trading-system.v2.mjs  # 主交易系统
│   │   │   ├── run-ai-trading.mjs        # 运行脚本
│   │   │   └── prompt_templates/         # Prompt 模板
│   │   └── prompt-studio/       # Prompt 调试工具
│   └── data/                    # 数据存储
│       ├── bots.json            # Bot 配置列表
│       └── bots/                # 每个 Bot 的独立数据
│
├── web/                  # 前端应用
│   ├── src/
│   │   ├── app/                 # Next.js App Router
│   │   │   ├── page.tsx        # 首页
│   │   │   ├── leaderboard/     # 排行榜
│   │   │   └── models/         # 模型详情
│   │   ├── components/
│   │   │   ├── trading/        # 交易 Bot 管理组件
│   │   │   ├── prompts/        # Prompt 编辑组件
│   │   │   ├── analytics/      # 数据分析组件
│   │   │   ├── chart/          # 图表组件
│   │   │   └── ...
│   │   └── lib/                # 工具库
│   │       ├── api/            # API 客户端和 Hooks
│   │       └── utils/           # 工具函数
│
└── learning/             # 学习文档
└── markdown/            # 项目文档
```

---

## 🎯 核心功能模块

### 1. 多 Bot 管理系统

#### 功能特性
- ✅ 支持同时运行多个交易 Bot
- ✅ 每个 Bot 独立配置（环境、模型、间隔）
- ✅ Bot 状态管理（启动/停止/删除）
- ✅ API Key 动态分配和占用管理

#### 技术实现
- **配置存储**: `backend/data/bots.json`
- **进程管理**: `backend/src/services/runner.js`
- **状态隔离**: 每个 Bot 使用独立的数据目录 `backend/data/bots/{botId}/`

#### Bot 配置结构
```typescript
interface BotConfig {
  id: string;
  env: 'demo-futures' | 'demo-spot' | 'futures' | 'spot';
  model: string;  // 如 'qwen3-plus', 'deepseek-v3.2-exp'
  intervalMinutes: number;
  name?: string;
  tradingMode?: 'binance-demo' | 'local-simulated';
  promptMode?: 'env-shared' | 'bot-specific';
  dashscopeApiKey?: string;  // API Key 环境变量名
  enableThinking?: boolean;  // 思考模式
}
```

### 2. AI 交易决策系统

#### 支持的 AI 模型
- **Qwen 系列**: qwen3-max, qwen3-plus
- **GLM 系列**: glm-4.6 (支持思考模式)
- **DeepSeek 系列**: deepseek-v3.2-exp, deepseek-v3.1 (支持思考模式)

#### AI 调用流程
1. **数据准备**: 获取市场数据（K线、技术指标、账户状态）
2. **Prompt 构建**: 使用模板生成 system prompt 和 user prompt
3. **AI 调用**: 通过百炼 API 统一客户端调用
4. **决策解析**: 解析 AI 返回的 JSON 交易决策
5. **执行交易**: 通过执行器执行交易操作

#### 核心技术
- **统一 API 客户端**: `backend/src/services/ai/bailian-client.js`
  - 使用 OpenAI SDK 兼容格式
  - 支持流式和非流式调用
  - 支持思考模式（`enable_thinking` 参数）

### 3. 交易执行系统

#### 执行模式
- **Binance Demo**: 币安测试网络交易
- **Local Simulated**: 本地模拟交易

#### 执行器架构
```
backend/src/services/trading/
├── executor.js              # 基础执行器接口
├── binance-demo-executor.js # Binance 测试网执行器
└── local-simulated-executor.js # 本地模拟执行器
```

#### 交易流程
1. **接收决策**: 从 AI 系统接收交易决策 JSON
2. **验证决策**: 检查符号白名单、数量、风险参数
3. **执行订单**: 通过 CCXT 调用交易所 API
4. **更新状态**: 更新账户余额、持仓、交易记录
5. **持久化**: 保存到 `backend/data/bots/{botId}/`

### 4. Prompt 管理系统

#### Prompt 模式
- **环境共享模式** (`env-shared`): 相同环境的 Bot 共享 Prompt
- **Bot 独立模式** (`bot-specific`): 每个 Bot 有独立的 Prompt

#### Prompt 存储
```
backend/data/bots/{botId}/prompts/
├── system_prompt.txt
└── user_prompt.hbs
```

#### Prompt 模板系统
- **模板引擎**: Handlebars
- **模板位置**: `backend/ai/ai-trading/prompt_templates/`
- **动态变量**: 环境、交易对、账户状态、市场数据等

### 5. API Key 管理系统

#### 功能
- ✅ 自动检测环境变量中的 `DASHSCOPE_API_KEY_*`
- ✅ API Key 占用状态跟踪
- ✅ Bot 启动时自动分配，停止时自动释放
- ✅ 防止同一 API Key 被多个 Bot 同时使用

#### 实现
- **管理器**: `backend/src/services/api-key-manager.js`
- **API 端点**: `GET /api/nof1/api-keys`
- **占用机制**: 内存映射 `{ envName: botId }`

---

## 🔌 API 接口设计

### Bot 管理 API
```
GET    /api/nof1/bots              # 获取所有 Bot 配置
POST   /api/nof1/bots              # 创建新 Bot
GET    /api/nof1/bots/:botId       # 获取 Bot 详情
PUT    /api/nof1/bots/:botId       # 更新 Bot 配置
DELETE /api/nof1/bots/:botId       # 删除 Bot

POST   /api/nof1/bots/:botId/start  # 启动 Bot
POST   /api/nof1/bots/:botId/stop   # 停止 Bot
GET    /api/nof1/bots/:botId/status # 获取 Bot 状态
GET    /api/nof1/bots/status/all    # 获取所有 Bot 状态
```

### 数据 API
```
GET /api/nof1/crypto-prices        # 获取加密货币价格
GET /api/nof1/account/totals       # 获取账户总览
GET /api/nof1/positions            # 获取持仓
GET /api/nof1/trades               # 获取交易记录
GET /api/nof1/conversations        # 获取 AI 对话记录
GET /api/nof1/analytics            # 获取分析数据
GET /api/nof1/leaderboard         # 获取排行榜
```

### Prompt API
```
GET  /api/nof1/bots/:botId/prompts  # 获取 Bot 的 Prompt
POST /api/nof1/bots/:botId/prompts  # 保存 Bot 的 Prompt
```

### AI API
```
POST /api/nof1/ai/prompt/suggest   # AI 建议 Prompt
POST /api/nof1/ai/prompt/ask       # AI 回答 Prompt 问题
```

### API Key 管理
```
GET /api/nof1/api-keys             # 获取所有 API Keys 及其占用状态
```

---

## 📊 数据流架构

### Bot 启动流程
```
用户点击启动
  ↓
POST /api/nof1/bots/:botId/start
  ↓
Runner Service 创建 BotInstance
  ↓
分配 API Key（如果配置）
  ↓
Spawn 子进程运行 ai-trading-system.v2.mjs
  ↓
AI 系统读取 Bot 配置
  ↓
定时执行交易循环
```

### 交易循环流程
```
获取市场数据 (CCXT)
  ↓
加载 Prompt 模板
  ↓
构建 AI Prompt（包含账户状态、市场数据）
  ↓
调用百炼 API (bailian-client.js)
  ↓
解析 AI 返回的 JSON 决策
  ↓
执行交易 (Executor)
  ↓
更新账户状态
  ↓
保存对话记录
  ↓
等待下次循环
```

---

## 🎨 前端架构

### 页面结构
- **首页** (`/`): 账户总览、图表、交易控制
- **排行榜** (`/leaderboard`): 多模型对比排行
- **模型详情** (`/models/[id]`): 单个模型的详细分析

### 组件组织
```
components/
├── trading/           # Bot 管理
│   ├── BotList.tsx          # Bot 列表
│   ├── BotControlPanel.tsx  # Bot 控制面板
│   └── AddBotDialog.tsx     # 添加 Bot 对话框
├── prompts/          # Prompt 编辑
│   ├── PromptEditorPanel.tsx      # Prompt 编辑器
│   └── PromptStudioChatPanel.tsx   # Prompt 调试聊天
├── analytics/        # 数据分析
├── chart/            # 图表组件
└── ...
```

### 状态管理
- **SWR**: 用于服务端数据获取和缓存
- **Zustand**: 用于客户端状态（主题、图表配置等）

---

## 🔐 安全性设计

### API Key 管理
- API Keys 存储在 `.env` 文件中，不提交到代码库
- 支持动态检测，无需硬编码数量
- 占用机制防止并发使用

### 交易安全
- 白名单机制：只允许交易指定的交易对
- 风险参数验证：杠杆、止损、止盈等
- Demo 模式：默认使用测试网络

---

## 📈 数据存储

### 配置数据
- **Bot 配置**: `backend/data/bots.json`
- **全局配置**: `backend/ai/ai-trading/config.json`

### 运行时数据
每个 Bot 独立目录：
```
backend/data/bots/{botId}/
├── trading-state.json    # 账户状态
├── conversations.json    # AI 对话记录
└── trades.json          # 交易历史
```

### 前端缓存
- SWR 自动缓存 API 响应
- 图表数据使用 Zustand 管理

---

## 🚀 部署架构

### 开发环境
- **前端**: Next.js dev server (端口 3000)
- **后端**: Express.js (端口 3001)
- **数据**: 本地文件系统

### 生产环境（建议）
- **前端**: Vercel / Next.js standalone
- **后端**: Node.js 进程 / PM2
- **数据**: 可迁移到数据库（PostgreSQL/MongoDB）

---

## 🧪 测试和调试

### 测试工具
- `backend/test/`: 测试脚本和示例
- `backend/ai/prompt-studio/`: Prompt 调试工具

### 调试功能
- Pino 日志系统
- Bot 状态实时监控
- AI 对话记录查看

---

## 📚 文档体系

### 项目文档
- `START_HERE.md`: 快速开始指南
- `MULTI_BOT_ARCHITECTURE.md`: 多 Bot 架构设计
- `markdown/`: 详细功能文档

### API 文档
- `learning/api_doc/`: API 使用文档
- `learning/bailian/`: 百炼 API 文档

---

## 🔄 最近更新（最新提交）

### 主要变更
1. **移除 AI 预设功能**: 改为直接使用模型选择
2. **统一百炼 API**: 移除所有 DeepSeek API 代码
3. **API Key 管理**: 添加动态检测和占用管理
4. **模型支持**: 支持 qwen3-max, qwen3-plus, glm-4.6, deepseek-v3.2-exp, deepseek-v3.1
5. **思考模式**: 支持混合模型的思考模式

---

## 🎯 项目优势

1. **模块化设计**: 清晰的模块划分，易于扩展
2. **多 Bot 支持**: 可同时运行多个独立策略
3. **灵活的 Prompt 管理**: 支持共享和独立两种模式
4. **统一 AI 接口**: 使用 OpenAI SDK 兼容格式
5. **完整的 Web UI**: 直观的管理界面
6. **数据隔离**: 每个 Bot 独立数据，互不干扰

---

## 🔮 未来发展方向

### 潜在改进
1. **数据库集成**: 迁移文件存储到数据库
2. **更多交易所支持**: 扩展 CCXT 支持的其他交易所
3. **策略模板**: 预设常用交易策略
4. **回测系统**: 历史数据回测功能
5. **风险控制**: 更完善的风控机制
6. **性能优化**: 多进程/多线程优化

---

## 📝 总结

**NOF0** 是一个功能完整、架构清晰的 AI 量化交易系统，实现了：
- ✅ 多 Bot 并行管理
- ✅ 统一的 AI 模型接入
- ✅ 完整的交易执行流程
- ✅ 友好的 Web 管理界面
- ✅ 灵活的配置和扩展能力

项目代码质量较高，文档完善，适合作为量化交易的基础平台进行进一步开发。

---

**分析完成时间**: 2025-01-XX  
**分析工具**: Cursor AI Assistant

