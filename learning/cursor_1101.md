# 流式处理与请求响应的区别
_Exported on 11/1/2025 at 20:17:07 GMT+8 from Cursor (2.0.34)_

---

**User**

流式处理websocket,跟请求响应rest的区别是什么

---

**Cursor**


查看项目中是否有 WebSocket 和 REST 的实现，以便结合具体代码解释：


## WebSocket 流式处理 vs REST 请求响应

### 1. **通信模式**

**REST (请求-响应模式)**
```5:18:web/src/lib/api/client.ts
export async function fetcher<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    // Ensure no-cache semantics but allow browser caching heuristics
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}
```
- 客户端发起请求 → 服务器响应 → 连接关闭
- 每次请求都需要重新建立连接
- 单向通信：客户端必须主动请求

**WebSocket (长连接双向通信)**
- 一次握手建立连接，之后保持打开
- 服务器可以主动推送数据
- 双向通信：客户端和服务器都可以随时发送消息

### 2. **数据更新方式**

**REST**
- 需要客户端轮询（polling）来获取更新
- 项目中的轮询示例：

```15:116:web/src/components/layout/PriceTicker.tsx
export default function PriceTicker() {
```

**WebSocket**
- 服务器有新数据时主动推送
- 无需客户端轮询，减少无效请求

### 3. **性能差异**

| 特性 | REST | WebSocket |
|------|------|-----------|
| 连接开销 | 每次请求都有 TCP 握手开销 | 一次握手，长期复用 |
| 实时性 | 有延迟（取决于轮询间隔） | 低延迟，接近实时 |
| 服务器资源 | 高（大量短连接） | 相对低（少量长连接） |
| 带宽消耗 | 请求头重复开销 | 仅数据，开销小 |

### 4. **适用场景**

**REST 适合：**
- 一次性数据查询
- 不需要频繁更新
- 简单的 CRUD 操作
- 项目中用于获取交易历史、账户信息等：

```996:1033:backend/src/routes/nof1.js
router.get('/realtime', async (req, res) => {
  try {
    const realTimeData = await getRealTimeAccountData();
    if (!realTimeData) {
      // 如果实时获取失败，降级到trading-state.json
      const state = await loadJson('trading-state.json', {});
      return res.json({
        balance: state.accountValue || 0,
        availableCash: state.availableCash || 0,
        positions: state.positions || [],
        source: 'fallback',
      });
    }
    return res.json({
      ...realTimeData,
      source: 'realtime',
    });
  } catch (e) {
    console.error('获取实时数据失败:', e.message);
    // 降级到trading-state.json
    try {
      const state = await loadJson('trading-state.json', {});
      res.json({
        balance: state.accountValue || 0,
        availableCash: state.availableCash || 0,
        positions: state.positions || [],
        source: 'fallback',
      });
    } catch (_) {
      res.json({
        balance: 0,
        availableCash: 0,
        positions: [],
        source: 'error',
      });
    }
  }
});
```

**WebSocket 适合：**
- 实时价格推送（如加密货币价格）
- 即时通讯
- 实时交易数据
- 需要服务器主动推送的场景

### 5. **代码复杂度**

**REST** - 简单直接：
```javascript
// 每次需要数据时发起请求
const data = await fetch('/api/crypto-prices').then(r => r.json());
```

**WebSocket** - 需要管理连接状态：
```javascript
// 需要处理连接、重连、错误处理等
const ws = new WebSocket('ws://localhost:3001/prices');
ws.onmessage = (event) => {
  const price = JSON.parse(event.data);
  // 更新UI
};
ws.onerror = () => { /* 重连逻辑 */ };
```

### 总结

- REST：简单、易维护，适合非实时查询，但实时性弱，轮询有开销
- WebSocket：实时性好、服务器可推送，适合实时数据，但需要更多连接管理和错误处理

在交易系统中，通常将 WebSocket 用于实时价格推送，REST 用于账户信息、交易历史等查询。项目文档也提到了这种方式（Binance Testnet 同时提供 REST / WS）。

```typescript
export async function fetcher<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    // Ensure no-cache semantics but allow browser caching heuristics
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}
```

```typescriptreact
export default function PriceTicker() {
```

```javascript
router.get('/realtime', async (req, res) => {
  try {
    const realTimeData = await getRealTimeAccountData();
    if (!realTimeData) {
      // 如果实时获取失败，降级到trading-state.json
      const state = await loadJson('trading-state.json', {});
      return res.json({
        balance: state.accountValue || 0,
        availableCash: state.availableCash || 0,
        positions: state.positions || [],
        source: 'fallback',
      });
    }
    return res.json({
      ...realTimeData,
      source: 'realtime',
    });
  } catch (e) {
    console.error('获取实时数据失败:', e.message);
    // 降级到trading-state.json
    try {
      const state = await loadJson('trading-state.json', {});
      res.json({
        balance: state.accountValue || 0,
        availableCash: state.availableCash || 0,
        positions: state.positions || [],
        source: 'fallback',
      });
    } catch (_) {
      res.json({
        balance: 0,
        availableCash: 0,
        positions: [],
        source: 'error',
      });
    }
  }
});
```

```javascript
// 每次需要数据时发起请求
const data = await fetch('/api/crypto-prices').then(r => r.json());
```

```javascript
// 需要处理连接、重连、错误处理等
const ws = new WebSocket('ws://localhost:3001/prices');
ws.onmessage = (event) => {
  const price = JSON.parse(event.data);
  // 更新UI
};
ws.onerror = () => { /* 重连逻辑 */ };
```

---

**User**

帮我分析一下当前项目结构

---

**Cursor**


分析项目结构。先查看关键文件和目录：


改用其他方式获取信息：


基于已收集的信息，以下是项目结构分析：

## 项目结构分析

### 整体架构

项目采用前后端分离架构，包含以下部分：

```
nof0/
├── backend/          # Node.js 后端服务
├── web/              # Next.js 前端应用
├── learning/         # 学习文档和 API 文档
├── markdown/         # 项目文档和开发记录
├── mcp/              # MCP (Model Context Protocol) 数据
└── tests/            # 测试文件
```

### 1. 后端部分 (`backend/`)

#### 核心服务
- `src/server.js` - Express 服务器入口
- `src/routes/nof1.js` - NOF1 API 路由实现
- `src/services/` - 业务服务层
  - `binance.js` - Binance 交易所集成（ccxt）
  - `metrics.js` - 指标计算（净值、排行榜等）
  - `runner.js` - 交易执行器
  - `fsStore.js` - 文件存储服务（JSON）

#### 数据存储
- `data/` - 运行时数据
  - `conversations.json` - AI 对话记录
  - `trades.json` - 交易历史
  - `trading-state.json` - 交易状态
  - `analytics.json` - 分析数据

#### AI 交易系统
- `ai/ai-trading/` - AI 交易系统核心
  - `ai-trading-system.v2.mjs` - 交易系统主程序
  - `run-ai-trading.mjs` - 启动脚本
  - `prompt_templates/` - 提示词模板
- `ai/prompt-studio/` - 提示词工作室工具

#### 测试和工具
- `test/` - 测试代码和示例
  - `api-analysis/` - API 分析工具
  - `ai-trading/` - AI 交易系统测试

### 2. 前端部分 (`web/`)

#### Next.js App Router 结构
- `src/app/` - 页面和 API 路由
  - `api/nof1/[...path]/route.ts` - NOF1 API 代理（Edge Runtime）
  - `api/translate/route.ts` - 翻译服务 API
- `src/components/` - React 组件（约 31 个组件）
  - `layout/PriceTicker.tsx` - 价格滚动条组件
- `src/lib/` - 工具库（约 20 个文件）
  - `api/` - API 客户端封装
    - `nof1.ts` - NOF1 API 客户端
    - `client.ts` - 基础 HTTP 客户端
    - `hooks/` - React Hooks
- `src/store/` - 状态管理

#### 静态资源
- `public/coins/` - 加密货币图标（6 个 SVG）
- `public/logos/` - 模型和平台 Logo

#### 脚本工具
- `scripts/snapshot-nof1.mjs` - NOF1 数据快照工具

### 3. 文档部分

#### `learning/` - 技术文档
- `system-architecture.md` - 系统架构文档
- `api_doc/` - API 文档
  - `ccxt_binance/` - Binance ccxt 库文档
  - `bailian/` - 阿里云百炼 API 文档（DeepSeek、GLM 等）

#### `markdown/` - 开发文档
- 包含开发记录、问题解决、TODO 等文档

#### `mcp/data/` - MCP 数据
- 各种模型的 analytics JSON
- API 端点配置
- 数据清单文档

### 4. 技术栈

#### 后端
- Node.js + Express
- ccxt - 加密货币交易所统一接口
- 文件存储（JSON 文件）

#### 前端
- Next.js (App Router)
- React + TypeScript
- Edge Runtime（API 代理）

### 5. 核心功能模块

1. 数据流向：前端 → API 代理 → 后端服务 → Binance API
2. API 端点（在 `backend/src/routes/nof1.js`）：
   - `/crypto-prices` - 加密货币价格
   - `/account-totals` - 账户总值
   - `/trades` - 交易历史
   - `/positions` - 持仓信息
   - `/leaderboard` - 排行榜
   - `/analytics` - 分析数据
   - `/conversations` - 对话记录
   - `/prompts` - 提示词管理
   - `/realtime` - 实时数据

3. AI 交易流程：
   - 价格监控 → AI 决策 → 交易执行 → 状态更新

### 6. 项目特点

- 前后端分离，独立开发和部署
- 本地文件存储（可升级为数据库）
- AI 驱动交易决策
- 多模型支持（DeepSeek、GLM、GPT 等）
- API 代理模式，支持切换上游服务

### 7. 数据流向图

```
前端 Next.js (localhost:3000)
  ↓
API 代理 /api/nof1/* (Edge Runtime)
  ↓
后端服务 (localhost:3001)
  ↓
Binance API / 本地数据存储
```

项目结构清晰，采用分层架构，便于维护和扩展。如需更详细的某个模块分析，请告知。

```plaintext
nof0/
├── backend/          # Node.js 后端服务
├── web/              # Next.js 前端应用
├── learning/         # 学习文档和 API 文档
├── markdown/         # 项目文档和开发记录
├── mcp/              # MCP (Model Context Protocol) 数据
└── tests/            # 测试文件
```

```plaintext
前端 Next.js (localhost:3000)
  ↓
API 代理 /api/nof1/* (Edge Runtime)
  ↓
后端服务 (localhost:3001)
  ↓
Binance API / 本地数据存储
```

---

**User**

选择 demo-futures, demo-spot, futures, spot的逻辑代码在哪里

---

**Cursor**


搜索选择 demo-futures、demo-spot、futures、spot 的逻辑代码位置。


查看关键文件，定位环境选择逻辑：


查看后端处理启动交易的逻辑：


查看运行脚本如何使用环境变量：


环境选择逻辑代码位置：

## 环境选择逻辑代码位置

### 1. **前端界面选择** 
**文件**: `web/src/components/prompts/PromptEditorPanel.tsx`

```167:174:web/src/components/prompts/PromptEditorPanel.tsx
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}>
            {['demo-futures','demo-spot','futures','spot'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
```

启动交易时传递环境参数：
```118:130:web/src/components/prompts/PromptEditorPanel.tsx
  async function startTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intervalMinutes, env, ai })
      });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }
```

### 2. **后端 API 路由处理**
**文件**: `backend/src/routes/nof1.js`

接收启动请求并设置环境变量：
```596:630:backend/src/routes/nof1.js
router.post('/ai/trading/start', async (req, res) => {
  try {
    const { intervalMinutes = 3, env, ai } = req.body || {};
    // ?? backend/data ??????????????????
    const dataDir = path.resolve(process.cwd(), 'backend', 'data');
    await fs.mkdir(dataDir, { recursive: true }).catch(() => {});
    
    // 在启动时从交易所获取实际账户余额和BTC价格作为初始值
    let initialAccountValue = null;
    let initialBTCPrice = null;
    try {
      // 临时设置环境变量以便 getAccountBalance 使用
      if (env) process.env.TRADING_ENV = env;
      const balance = await getAccountBalance();
```

### 3. **交易运行器服务**
**文件**: `backend/src/services/runner.js`

将环境变量传递给子进程：
```18:40:backend/src/services/runner.js
  start({ intervalMinutes = 3, env = undefined, ai = undefined } = {}) {
    if (this.child && this.status.running) return this.status;
    // 确保工作目录是项目根目录（不是backend目录）
    const projectRoot = process.cwd().endsWith('backend') ? path.resolve(process.cwd(), '..') : process.cwd();
    const runnerPath = path.resolve(projectRoot, 'backend/ai/ai-trading/run-ai-trading.mjs');
    const args = [runnerPath, String(intervalMinutes)];
    // ??????server.js???? dotenv ?? backend/.env???????????
    const child = spawn('node', args, {
      stdio: 'inherit',
      cwd: projectRoot, // 确保在项目根目录运行
      env: {
        ...process.env,
        ...(env ? { TRADING_ENV: env } : {}),
        ...(ai ? { AI_PRESET: ai } : {}),
      },
    });
    this.child = child;
    this.status.running = true;
    this.status.pid = child.pid;
    this.status.startedAt = new Date().toISOString();
    this.status.intervalMinutes = intervalMinutes;
    this.status.env = env || null;
    this.status.ai = ai || null;
```

### 4. **运行脚本传递参数**
**文件**: `backend/ai/ai-trading/run-ai-trading.mjs`

从环境变量读取并传递给交易系统：
```19:29:backend/ai/ai-trading/run-ai-trading.mjs
  async runTrading() {
    return new Promise((resolve, reject) => {
      const scriptPath = join(__dirname, 'ai-trading-system.v2.mjs');
      console.log(`🚀 运行AI交易系统: ${scriptPath}`);
      const envArg = process.env.TRADING_ENV ? ['--env', process.env.TRADING_ENV] : [];
      const aiArg = process.env.AI_PRESET ? ['--ai', process.env.AI_PRESET] : [];
      const child = spawn('node', ['--env-file=./backend/.env', scriptPath, ...envArg, ...aiArg], {
        stdio: 'inherit',
        // 关键：将工作目录切到项目根，使 ai-trading-system 按相对路径读取 backend/ai/ai-trading/config.json
        cwd: join(__dirname, '..', '..', '..')
      });
```

### 5. **AI交易系统解析环境**
**文件**: `backend/ai/ai-trading/ai-trading-system.v2.mjs` (或 `backend/test/ai-trading/ai-trading-system.v2.mjs`)

解析命令行参数并确定环境：
```57:62:backend/test/ai-trading/ai-trading-system.v2.mjs
    // 读取命令行/环境参数
    const argEnv = getArg('--env'); // demo-futures | demo-spot | futures | spot
    const argAi = getArg('--ai');   // 如 deepseek | deepseek-reasoner

    // 确定交易环境
    this.tradingEnv = (argEnv && typeof argEnv === 'string') ? argEnv : (this.config.trading_env || 'demo-futures');
    this.isFutures = this.tradingEnv === 'demo-futures' || this.tradingEnv === 'futures';
```

初始化交易所：
```161:192:backend/test/ai-trading/ai-trading-system.v2.mjs
  async initializeExchange() {
    try {
      process.env.HTTPS_PROXY = process.env.HTTPS_PROXY || 'http://127.0.0.1:7890';
      process.env.HTTP_PROXY = process.env.HTTP_PROXY || 'http://127.0.0.1:7890';

      const envKey = this.tradingEnv;
      const isDemoFutures = envKey === 'demo-futures';
      const isDemoSpot = envKey === 'demo-spot';

      if (isDemoFutures || envKey === 'futures') {
        const apiKey = this.config.exchange?.binance?.futures_demo?.api_key || process.env.BINANCE_DEMO_API_KEY;
        const secret = this.config.exchange?.binance?.futures_demo?.api_secret || process.env.BINANCE_DEMO_API_SECRET;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_DEMO_API_KEY/SECRET或在config.json配置');
        this.exchange = new ccxt.binanceusdm({ apiKey, secret, enableRateLimit: true, options: { defaultType: 'future', warnOnFetchCurrencies: false, fetchCurrencies: false, enableDemoTrading: true } });
        this.exchange.httpsProxy = 'http://127.0.0.1:7890/';
        this.exchange.enableDemoTrading(true);
        await this.exchange.fetchBalance();
      } else if (isDemoSpot || envKey === 'spot') {
        const apiKey = this.config.exchange?.binance?.spot_testnet?.api_key || process.env.BINANCE_SPOT_TESTNET_API_KEY;
        const secret = this.config.exchange?.binance?.spot_testnet?.api_secret || process.env.BINANCE_SPOT_TESTNET_API_SECRET;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_SPOT_TESTNET_API_KEY/SECRET或在config.json配置');
        this.exchange = new ccxt.binance({ apiKey, secret, enableRateLimit: true });
        this.exchange.httpsProxy = 'http://127.0.0.1:7890/';
        if (typeof this.exchange.setSandboxMode === 'function') this.exchange.setSandboxMode(true);
        await this.exchange.fetchBalance();
      }
      return true;
    } catch (e) {
      console.error('初始化交易所失败:', e.message);
      return false;
    }
  }
```

### 6. **Binance 服务根据环境创建交易所**
**文件**: `backend/src/services/binance.js`

根据 `TRADING_ENV` 创建对应交易所实例：
```3:63:backend/src/services/binance.js
function createExchange() {
  // 优先使用期货demo API密钥，如果没有则使用通用密钥
  const env = String(process.env.TRADING_ENV || 'demo-futures').toLowerCase();
  const isFutures = env.includes('futures');
  const isDemo = env.includes('demo');
  
  const apiKey = isFutures 
    ? (process.env.BINANCE_DEMO_API_KEY || process.env.BINANCE_API_KEY || '')
    : (process.env.BINANCE_SPOT_TEST_API_KEY || process.env.BINANCE_API_KEY || '');
  
  const secret = isFutures
    ? (process.env.BINANCE_DEMO_API_SECRET || process.env.BINANCE_API_SECRET || '')
    : (process.env.BINANCE_SPOT_TEST_API_SECRET || process.env.BINANCE_API_SECRET || '');
  
  // 如果是期货，使用binanceusdm
  const ExchangeClass = isFutures ? ccxt.binanceusdm : ccxt.binance;
  
  const ex = new ExchangeClass({
    apiKey,
    secret,
    enableRateLimit: true,
    options: {
      defaultType: 'future',
      warnOnFetchCurrencies: false,
      fetchCurrencies: false,
    },
  });
  
  // 如果是demo模式，必须在初始化后立即调用enableDemoTrading
  if (isDemo) {
    // 必须先禁用sandbox模式（demo trading不支持sandbox）
    if (ex?.setSandboxMode) {
      ex.setSandboxMode(false);
    }
    // 立即启用demo trading
    if (ex.enableDemoTrading) {
      try {
        ex.enableDemoTrading(true);
      } catch (e) {
        console.warn('无法启用demo trading:', e.message);
      }
    }
  } else {
    // 非demo模式才使用sandbox
    if (ex?.setSandboxMode) {
      const testnet = String(process.env.BINANCE_TESTNET || 'true').toLowerCase() === 'true';
      ex.setSandboxMode(testnet);
    }
  }
  
  // 配置代理（如果设置了环境变量）
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (proxy) {
      // 只设置httpsProxy，避免冲突
      ex.httpsProxy = proxy;
    }
  }
  
  return ex;
}
```

### 7. **配置文件预设**
**文件**: `backend/test/ai-trading/config.json` (或 `backend/ai/ai-trading/config.json`)

定义各环境的配置：
```51:91:backend/test/ai-trading/config.json
  "presets": {
    "demo-futures": {
      "allowed_symbols": [
        "BTC/USDT:USDT",
        "ETH/USDT:USDT",
        "SOL/USDT:USDT",
        "BNB/USDT:USDT",
        "XRP/USDT:USDT",
        "DOGE/USDT:USDT"
      ]
    },
    "demo-spot": {
      "allowed_symbols": [
        "BTC/USDT",
        "ETH/USDT",
        "SOL/USDT",
        "BNB/USDT",
        "XRP/USDT",
        "DOGE/USDT"
      ]
    },
    "futures": {
      "allowed_symbols": [
        "BTC/USDT:USDT",
        "ETH/USDT:USDT",
        "SOL/USDT:USDT",
        "BNB/USDT:USDT",
        "XRP/USDT:USDT",
        "DOGE/USDT:USDT"
      ]
    },
    "spot": {
      "allowed_symbols": [
        "BTC/USDT",
        "ETH/USDT",
        "SOL/USDT",
        "BNB/USDT",
        "XRP/USDT",
        "DOGE/USDT"
      ]
    }
  },
```

## 总结

环境选择流程：
1. 前端选择环境 → `PromptEditorPanel.tsx`
2. 后端 API 接收 → `routes/nof1.js`
3. 运行器服务传递环境变量 → `services/runner.js`
4. 运行脚本传递参数 → `run-ai-trading.mjs`
5. AI 交易系统解析并初始化 → `ai-trading-system.v2.mjs`
6. Binance 服务根据环境创建交易所 → `services/binance.js`

判断逻辑：
- `isFutures` = `env.includes('futures')` （包含 'futures' 即为期货）
- `isDemo` = `env.includes('demo')` （包含 'demo' 即为演示模式）
- 根据这两个标志选择 API 密钥、交易所类和配置

```typescriptreact
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}>
            {['demo-futures','demo-spot','futures','spot'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
```

```typescriptreact
  async function startTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intervalMinutes, env, ai })
      });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }
```

```javascript
router.post('/ai/trading/start', async (req, res) => {
  try {
    const { intervalMinutes = 3, env, ai } = req.body || {};
    // ?? backend/data ??????????????????
    const dataDir = path.resolve(process.cwd(), 'backend', 'data');
    await fs.mkdir(dataDir, { recursive: true }).catch(() => {});
    
    // 在启动时从交易所获取实际账户余额和BTC价格作为初始值
    let initialAccountValue = null;
    let initialBTCPrice = null;
    try {
      // 临时设置环境变量以便 getAccountBalance 使用
      if (env) process.env.TRADING_ENV = env;
      const balance = await getAccountBalance();
```

```javascript
  start({ intervalMinutes = 3, env = undefined, ai = undefined } = {}) {
    if (this.child && this.status.running) return this.status;
    // 确保工作目录是项目根目录（不是backend目录）
    const projectRoot = process.cwd().endsWith('backend') ? path.resolve(process.cwd(), '..') : process.cwd();
    const runnerPath = path.resolve(projectRoot, 'backend/ai/ai-trading/run-ai-trading.mjs');
    const args = [runnerPath, String(intervalMinutes)];
    // ??????server.js???? dotenv ?? backend/.env???????????
    const child = spawn('node', args, {
      stdio: 'inherit',
      cwd: projectRoot, // 确保在项目根目录运行
      env: {
        ...process.env,
        ...(env ? { TRADING_ENV: env } : {}),
        ...(ai ? { AI_PRESET: ai } : {}),
      },
    });
    this.child = child;
    this.status.running = true;
    this.status.pid = child.pid;
    this.status.startedAt = new Date().toISOString();
    this.status.intervalMinutes = intervalMinutes;
    this.status.env = env || null;
    this.status.ai = ai || null;
```

```plaintext
  async runTrading() {
    return new Promise((resolve, reject) => {
      const scriptPath = join(__dirname, 'ai-trading-system.v2.mjs');
      console.log(`🚀 运行AI交易系统: ${scriptPath}`);
      const envArg = process.env.TRADING_ENV ? ['--env', process.env.TRADING_ENV] : [];
      const aiArg = process.env.AI_PRESET ? ['--ai', process.env.AI_PRESET] : [];
      const child = spawn('node', ['--env-file=./backend/.env', scriptPath, ...envArg, ...aiArg], {
        stdio: 'inherit',
        // 关键：将工作目录切到项目根，使 ai-trading-system 按相对路径读取 backend/ai/ai-trading/config.json
        cwd: join(__dirname, '..', '..', '..')
      });
```

```plaintext
    // 读取命令行/环境参数
    const argEnv = getArg('--env'); // demo-futures | demo-spot | futures | spot
    const argAi = getArg('--ai');   // 如 deepseek | deepseek-reasoner

    // 确定交易环境
    this.tradingEnv = (argEnv && typeof argEnv === 'string') ? argEnv : (this.config.trading_env || 'demo-futures');
    this.isFutures = this.tradingEnv === 'demo-futures' || this.tradingEnv === 'futures';
```

```plaintext
  async initializeExchange() {
    try {
      process.env.HTTPS_PROXY = process.env.HTTPS_PROXY || 'http://127.0.0.1:7890';
      process.env.HTTP_PROXY = process.env.HTTP_PROXY || 'http://127.0.0.1:7890';

      const envKey = this.tradingEnv;
      const isDemoFutures = envKey === 'demo-futures';
      const isDemoSpot = envKey === 'demo-spot';

      if (isDemoFutures || envKey === 'futures') {
        const apiKey = this.config.exchange?.binance?.futures_demo?.api_key || process.env.BINANCE_DEMO_API_KEY;
        const secret = this.config.exchange?.binance?.futures_demo?.api_secret || process.env.BINANCE_DEMO_API_SECRET;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_DEMO_API_KEY/SECRET或在config.json配置');
        this.exchange = new ccxt.binanceusdm({ apiKey, secret, enableRateLimit: true, options: { defaultType: 'future', warnOnFetchCurrencies: false, fetchCurrencies: false, enableDemoTrading: true } });
        this.exchange.httpsProxy = 'http://127.0.0.1:7890/';
        this.exchange.enableDemoTrading(true);
        await this.exchange.fetchBalance();
      } else if (isDemoSpot || envKey === 'spot') {
        const apiKey = this.config.exchange?.binance?.spot_testnet?.api_key || process.env.BINANCE_SPOT_TESTNET_API_KEY;
        const secret = this.config.exchange?.binance?.spot_testnet?.api_secret || process.env.BINANCE_SPOT_TESTNET_API_SECRET;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_SPOT_TESTNET_API_KEY/SECRET或在config.json配置');
        this.exchange = new ccxt.binance({ apiKey, secret, enableRateLimit: true });
        this.exchange.httpsProxy = 'http://127.0.0.1:7890/';
        if (typeof this.exchange.setSandboxMode === 'function') this.exchange.setSandboxMode(true);
        await this.exchange.fetchBalance();
      }
      return true;
    } catch (e) {
      console.error('初始化交易所失败:', e.message);
      return false;
    }
  }
```

```javascript
function createExchange() {
  // 优先使用期货demo API密钥，如果没有则使用通用密钥
  const env = String(process.env.TRADING_ENV || 'demo-futures').toLowerCase();
  const isFutures = env.includes('futures');
  const isDemo = env.includes('demo');
  
  const apiKey = isFutures 
    ? (process.env.BINANCE_DEMO_API_KEY || process.env.BINANCE_API_KEY || '')
    : (process.env.BINANCE_SPOT_TEST_API_KEY || process.env.BINANCE_API_KEY || '');
  
  const secret = isFutures
    ? (process.env.BINANCE_DEMO_API_SECRET || process.env.BINANCE_API_SECRET || '')
    : (process.env.BINANCE_SPOT_TEST_API_SECRET || process.env.BINANCE_API_SECRET || '');
  
  // 如果是期货，使用binanceusdm
  const ExchangeClass = isFutures ? ccxt.binanceusdm : ccxt.binance;
  
  const ex = new ExchangeClass({
    apiKey,
    secret,
    enableRateLimit: true,
    options: {
      defaultType: 'future',
      warnOnFetchCurrencies: false,
      fetchCurrencies: false,
    },
  });
  
  // 如果是demo模式，必须在初始化后立即调用enableDemoTrading
  if (isDemo) {
    // 必须先禁用sandbox模式（demo trading不支持sandbox）
    if (ex?.setSandboxMode) {
      ex.setSandboxMode(false);
    }
    // 立即启用demo trading
    if (ex.enableDemoTrading) {
      try {
        ex.enableDemoTrading(true);
      } catch (e) {
        console.warn('无法启用demo trading:', e.message);
      }
    }
  } else {
    // 非demo模式才使用sandbox
    if (ex?.setSandboxMode) {
      const testnet = String(process.env.BINANCE_TESTNET || 'true').toLowerCase() === 'true';
      ex.setSandboxMode(testnet);
    }
  }
  
  // 配置代理（如果设置了环境变量）
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (proxy) {
      // 只设置httpsProxy，避免冲突
      ex.httpsProxy = proxy;
    }
  }
  
  return ex;
}
```

```json
  "presets": {
    "demo-futures": {
      "allowed_symbols": [
        "BTC/USDT:USDT",
        "ETH/USDT:USDT",
        "SOL/USDT:USDT",
        "BNB/USDT:USDT",
        "XRP/USDT:USDT",
        "DOGE/USDT:USDT"
      ]
    },
    "demo-spot": {
      "allowed_symbols": [
        "BTC/USDT",
        "ETH/USDT",
        "SOL/USDT",
        "BNB/USDT",
        "XRP/USDT",
        "DOGE/USDT"
      ]
    },
    "futures": {
      "allowed_symbols": [
        "BTC/USDT:USDT",
        "ETH/USDT:USDT",
        "SOL/USDT:USDT",
        "BNB/USDT:USDT",
        "XRP/USDT:USDT",
        "DOGE/USDT:USDT"
      ]
    },
    "spot": {
      "allowed_symbols": [
        "BTC/USDT",
        "ETH/USDT",
        "SOL/USDT",
        "BNB/USDT",
        "XRP/USDT",
        "DOGE/USDT"
      ]
    }
  },
```

---

**User**

我发现 币安的 demo-futures, demo-spot 是共用同一个网络 @demo.binance.com, 这个跟binance testnet 好像并不一样？ 

---

**Cursor**


查找代码中关于 Binance demo 和 testnet 的配置差异：


分析代码中的问题：


根据代码分析，发现配置不一致：

## 当前代码问题分析

### Binance 环境区别

1. Demo Trading (`demo.binance.com`)
   - 使用 `enableDemoTrading(true)`
   - 统一的演示环境，支持期货和现货
   - demo-futures 和 demo-spot 应该都使用这个

2. Testnet (`testnet.binance.vision` 或 sandbox)
   - 使用 `setSandboxMode(true)`
   - 传统测试网络，与 Demo Trading 分离

### 代码中的问题

#### 1. `backend/src/services/binance.js` - 处理不一致

```31:51:backend/src/services/binance.js
  // 如果是demo模式，必须在初始化后立即调用enableDemoTrading
  if (isDemo) {
    // 必须先禁用sandbox模式（demo trading不支持sandbox）
    if (ex?.setSandboxMode) {
      ex.setSandboxMode(false);
    }
    // 立即启用demo trading
    if (ex.enableDemoTrading) {
      try {
        ex.enableDemoTrading(true);
      } catch (e) {
        console.warn('无法启用demo trading:', e.message);
      }
    }
  } else {
    // 非demo模式才使用sandbox
    if (ex?.setSandboxMode) {
      const testnet = String(process.env.BINANCE_TESTNET || 'true').toLowerCase() === 'true';
      ex.setSandboxMode(testnet);
    }
  }
```

这里处理正确：demo 模式统一使用 `enableDemoTrading(true)`。

#### 2. `ai-trading-system.v2.mjs` - 处理错误

```178:186:backend/test/ai-trading/ai-trading-system.v2.mjs
      } else if (isDemoSpot || envKey === 'spot') {
        const apiKey = this.config.exchange?.binance?.spot_testnet?.api_key || process.env.BINANCE_SPOT_TESTNET_API_KEY;
        const secret = this.config.exchange?.binance?.spot_testnet?.api_secret || process.env.BINANCE_SPOT_TESTNET_API_SECRET;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_SPOT_TESTNET_API_KEY/SECRET或在config.json配置');
        this.exchange = new ccxt.binance({ apiKey, secret, enableRateLimit: true });
        this.exchange.httpsProxy = 'http://127.0.0.1:7890/';
        if (typeof this.exchange.setSandboxMode === 'function') this.exchange.setSandboxMode(true);
        await this.exchange.fetchBalance();
      }
```

问题：
- `demo-spot` 错误地使用了 `setSandboxMode(true)`，应使用 `enableDemoTrading(true)`
- `spot`（非 demo）使用 testnet 是正确的

### 正确的配置应该是

| 环境 | 交易所类 | API端点 | 使用的方法 |
|------|---------|---------|-----------|
| `demo-futures` | `ccxt.binanceusdm` | `demo.binance.com` | `enableDemoTrading(true)` |
| `demo-spot` | `ccxt.binance` | `demo.binance.com` | `enableDemoTrading(true)` |
| `futures` | `ccxt.binanceusdm` | 生产环境 | 不需要特殊设置 |
| `spot` | `ccxt.binance` | `testnet.binance.vision` | `setSandboxMode(true)` |

### 需要修复的地方

1. `backend/test/ai-trading/ai-trading-system.v2.mjs` - demo-spot 应该使用 `enableDemoTrading(true)`
2. `backend/ai/ai-trading/ai-trading-system.v2.mjs` - 同样的问题
3. `backend/src/services/binance.js` - 已经是正确的，但需要确保 demo-spot 也走这个逻辑

需要我创建一个修复方案吗？

```javascript
  // 如果是demo模式，必须在初始化后立即调用enableDemoTrading
  if (isDemo) {
    // 必须先禁用sandbox模式（demo trading不支持sandbox）
    if (ex?.setSandboxMode) {
      ex.setSandboxMode(false);
    }
    // 立即启用demo trading
    if (ex.enableDemoTrading) {
      try {
        ex.enableDemoTrading(true);
      } catch (e) {
        console.warn('无法启用demo trading:', e.message);
      }
    }
  } else {
    // 非demo模式才使用sandbox
    if (ex?.setSandboxMode) {
      const testnet = String(process.env.BINANCE_TESTNET || 'true').toLowerCase() === 'true';
      ex.setSandboxMode(testnet);
    }
  }
```

```plaintext
      } else if (isDemoSpot || envKey === 'spot') {
        const apiKey = this.config.exchange?.binance?.spot_testnet?.api_key || process.env.BINANCE_SPOT_TESTNET_API_KEY;
        const secret = this.config.exchange?.binance?.spot_testnet?.api_secret || process.env.BINANCE_SPOT_TESTNET_API_SECRET;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_SPOT_TESTNET_API_KEY/SECRET或在config.json配置');
        this.exchange = new ccxt.binance({ apiKey, secret, enableRateLimit: true });
        this.exchange.httpsProxy = 'http://127.0.0.1:7890/';
        if (typeof this.exchange.setSandboxMode === 'function') this.exchange.setSandboxMode(true);
        await this.exchange.fetchBalance();
      }
```

---

**User**

我觉得还不如分别对 binance的 demo-futures, demo-spot, futures, spot写对应的文件，省得混在一起感觉很乱。 还有 正确的 spot配置端点不是 testnet, 这个是一个专门的现货测试网络，应该是面向开发者的。而 demo.binance.com 感觉更多是面向交易者的。

---

**Cursor**


分析当前代码结构，制定重构计划，将不同环境分离到独立文件：


制定重构计划，将 Binance 环境配置拆分为独立文件。


---

**User**

还是有问题， spot 不对应现货测试网络，而是就是现货生产环境。 不过我现在对 futurer, spot这两个生产环境的api key都还只是占位符xxx. 先将功能代码实现，我看ccxt中 只需要在初始化交易所binance后立刻 enableDemoTrading(true)就启动了对应的demo环境， 也就是感觉 demo-futures跟 futures, demo-spot跟spot的API结构应该基本是一致的。

---

**Cursor**


更新计划：`spot` 是生产环境，demo 与生产环境的结构基本一致，仅区别在于是否调用 `enableDemoTrading(true)`。


---

**User**

不过demo 环境使用的api key 是 BINANCE_DEMO_API_KEY, 而 生产环境使用的api key 是 BINANCE_LIVE_API_KEY

---

**Cursor**


更新计划，反映正确的 API key 命名：


---

**User**

先帮我将当前代码git commit,然后进行实现

---

**Cursor**


查看当前 git 状态，然后提交，再开始实现：


添加所有更改并提交：


开始实现重构。创建目录结构：


创建基础实现文件：先创建 `base-futures.js`：


```javascript
import ccxt from 'ccxt';

/**
 * 期货基础实现
 * 提供期货相关的共享业务逻辑（getPrices, getAccountBalance, getRealTimeAccountData）
 * 具体的 createExchange 由子环境文件实现
 */

/**
 * 获取价格（期货）
 */
export async function getPrices(symbols, createExchange) {
  try {
    const ex = createExchange();
    const out = {};
    
    // 优化：批量获取价格，而不是逐个请求
    if (ex.has?.fetchTickers && symbols.length > 1) {
      try {
        const tickers = await ex.fetchTickers(symbols);
        
        // 创建symbol到ticker的映射
        const tickerMap = {};
        for (const [key, ticker] of Object.entries(tickers)) {
          if (ticker && ticker.symbol) {
            const baseSymbol = ticker.symbol.replace(/[:/].*/, '');
            const fullSymbol = ticker.symbol;
            tickerMap[fullSymbol] = ticker;
            tickerMap[baseSymbol + '/USDT'] = ticker;
            tickerMap[baseSymbol + '/USDT:USDT'] = ticker;
          }
        }
        
        for (const s of symbols) {
          let t = tickers[s] || tickerMap[s];
          if (!t) {
            const baseSymbol = s.split('/')[0];
            t = Object.values(tickers).find(ticker => 
              ticker && ticker.symbol && (
                ticker.symbol === s || 
                ticker.symbol === s + ':USDT' ||
                ticker.symbol.startsWith(baseSymbol + '/') ||
                ticker.symbol.startsWith(baseSymbol + ':')
              )
            );
          }
          
          if (t) {
            out[s] = { 
              symbol: s.split('/')[0],
              price: Number(t.last || t.close || 0), 
              timestamp: Number(t.timestamp || Date.now()) 
            };
          }
        }
      } catch (e) {
        console.warn('[getPrices] 批量获取价格失败，降级到逐个获取:', e.message);
        for (const s of symbols) {
          try {
            const t = await ex.fetchTicker(s);
            out[s] = { 
              symbol: s.split('/')[0],
              price: Number(t.last || t.close || 0), 
              timestamp: Number(t.timestamp || Date.now()) 
            };
          } catch (err) {
            console.warn(`[getPrices] 获取${s}价格失败:`, err.message);
          }
        }
      }
    } else {
      for (const s of symbols) {
        try {
          const t = await ex.fetchTicker(s);
          out[s] = { 
            symbol: s.split('/')[0],
            price: Number(t.last || t.close || 0), 
            timestamp: Number(t.timestamp || Date.now()) 
          };
        } catch (err) {
          console.warn(`[getPrices] 获取${s}价格失败:`, err.message);
        }
      }
    }
    
    return out;
  } catch (e) {
    console.error('[getPrices] 获取价格失败:', e.message);
    return {};
  }
}

/**
 * 获取账户余额（期货）
 */
export async function getAccountBalance(createExchange) {
  try {
    const ex = createExchange();
    const balance = await ex.fetchBalance();
    const positions = await ex.fetchPositions();
    let totalEquity = 0;
    
    // USDT余额
    if (balance.USDT) {
      totalEquity += Number(balance.USDT.total || 0);
    }
    
    // 加上持仓未实现盈亏
    for (const pos of positions) {
      if (pos.contracts && Number(pos.contracts) !== 0) {
        const unrealizedPnl = Number(pos.unrealizedPnl || 0);
        totalEquity += unrealizedPnl;
      }
    }
    
    return totalEquity > 0 ? totalEquity : null;
  } catch (e) {
    console.error('获取账户余额失败:', e.message);
    return null;
  }
}

/**
 * 获取实时账户数据和持仓（期货）
 */
export async function getRealTimeAccountData(createExchange) {
  try {
    const ex = createExchange();
    const balance = await ex.fetchBalance();
    const positions = await ex.fetchPositions();
    
    const activePositions = [];
    let totalEquity = Number(balance.USDT?.total || 0);
    
    for (const pos of positions) {
      const contracts = Number(pos.contracts || 0);
      if (contracts !== 0) {
        const symbol = String(pos.symbol || '').replace('/USDT:USDT', '').replace(':USDT', '');
        const unrealizedPnl = Number(pos.unrealizedPnl || 0);
        totalEquity += unrealizedPnl;
        
        const notional = Math.abs(Number(pos.notional || 0));
        const margin = Number(pos.initialMargin || 0);
        const leverage = notional > 0 && margin > 0 ? Math.round((notional / margin) * 10) / 10 : 1;
        
        activePositions.push({
          symbol,
          quantity: contracts,
          entry_price: Number(pos.entryPrice || 0),
          current_price: Number(pos.markPrice || pos.markPrice || 0),
          liquidation_price: Number(pos.liquidationPrice || 0),
          unrealized_pnl: unrealizedPnl,
          leverage,
          margin,
          notional_usd: notional,
          entry_time: pos.entryTime ? Math.floor(new Date(pos.entryTime).getTime() / 1000) : Math.floor(Date.now() / 1000),
          entry_oid: Number(pos.id || 0),
          risk_usd: Math.abs(contracts) * Number(pos.entryPrice || 0),
          confidence: 0.8,
          exit_plan: null,
        });
      }
    }
    
    return {
      balance: totalEquity,
      availableCash: Number(balance.USDT?.free || 0),
      positions: activePositions,
    };
  } catch (e) {
    console.error('获取实时账户数据失败:', e.message);
    return null;
  }
}

```

---

**User**

Implement the plan as specified. To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one.

---

**Cursor**


继续实现：先完成基础文件，再创建各环境文件。


```javascript
import ccxt from 'ccxt';

/**
 * 现货基础实现
 * 提供现货相关的共享业务逻辑（getPrices, getAccountBalance, getRealTimeAccountData）
 * 具体的 createExchange 由子环境文件实现
 */

/**
 * 获取价格（现货）
 */
export async function getPrices(symbols, createExchange) {
  try {
    const ex = createExchange();
    const out = {};
    
    // 优化：批量获取价格
    if (ex.has?.fetchTickers && symbols.length > 1) {
      try {
        const tickers = await ex.fetchTickers(symbols);
        
        // 创建symbol到ticker的映射
        const tickerMap = {};
        for (const [key, ticker] of Object.entries(tickers)) {
          if (ticker && ticker.symbol) {
            const baseSymbol = ticker.symbol.replace(/[:/].*/, '');
            const fullSymbol = ticker.symbol;
            tickerMap[fullSymbol] = ticker;
            tickerMap[baseSymbol + '/USDT'] = ticker;
          }
        }
        
        for (const s of symbols) {
          let t = tickers[s] || tickerMap[s];
          if (!t) {
            const baseSymbol = s.split('/')[0];
            t = Object.values(tickers).find(ticker => 
              ticker && ticker.symbol && (
                ticker.symbol === s || 
                ticker.symbol.startsWith(baseSymbol + '/')
              )
            );
          }
          
          if (t) {
            out[s] = { 
              symbol: s.split('/')[0],
              price: Number(t.last || t.close || 0), 
              timestamp: Number(t.timestamp || Date.now()) 
            };
          }
        }
      } catch (e) {
        console.warn('[getPrices] 批量获取价格失败，降级到逐个获取:', e.message);
        for (const s of symbols) {
          try {
            const t = await ex.fetchTicker(s);
            out[s] = { 
              symbol: s.split('/')[0],
              price: Number(t.last || t.close || 0), 
              timestamp: Number(t.timestamp || Date.now()) 
            };
          } catch (err) {
            console.warn(`[getPrices] 获取${s}价格失败:`, err.message);
          }
        }
      }
    } else {
      for (const s of symbols) {
        try {
          const t = await ex.fetchTicker(s);
          out[s] = { 
            symbol: s.split('/')[0],
            price: Number(t.last || t.close || 0), 
            timestamp: Number(t.timestamp || Date.now()) 
          };
        } catch (err) {
          console.warn(`[getPrices] 获取${s}价格失败:`, err.message);
        }
      }
    }
    
    return out;
  } catch (e) {
    console.error('[getPrices] 获取价格失败:', e.message);
    return {};
  }
}

/**
 * 获取账户余额（现货）
 */
export async function getAccountBalance(createExchange) {
  try {
    const ex = createExchange();
    const balance = await ex.fetchBalance();
    
    if (balance.USDT) {
      const total = Number(balance.USDT.total || 0);
      return total > 0 ? total : null;
    }
    return null;
  } catch (e) {
    console.error('获取账户余额失败:', e.message);
    return null;
  }
}

/**
 * 获取实时账户数据（现货）
 */
export async function getRealTimeAccountData(createExchange) {
  try {
    const ex = createExchange();
    const balance = await ex.fetchBalance();
    
    return {
      balance: balance.USDT?.total || 0,
      availableCash: balance.USDT?.free || 0,
      positions: [],
    };
  } catch (e) {
    console.error('获取实时账户数据失败:', e.message);
    return null;
  }
}

```

```javascript
import ccxt from 'ccxt';
import * as baseFutures from './base-futures.js';

/**
 * 期货演示环境 (demo.binance.com)
 * 使用 enableDemoTrading(true) 启用演示交易
 */

function createExchange() {
  const apiKey = process.env.BINANCE_DEMO_API_KEY || '';
  const secret = process.env.BINANCE_DEMO_API_SECRET || '';
  
  const ex = new ccxt.binanceusdm({
    apiKey,
    secret,
    enableRateLimit: true,
    options: {
      defaultType: 'future',
      warnOnFetchCurrencies: false,
      fetchCurrencies: false,
    },
  });
  
  // 必须先禁用sandbox模式（demo trading不支持sandbox）
  if (ex?.setSandboxMode) {
    ex.setSandboxMode(false);
  }
  
  // 启用demo trading
  if (ex.enableDemoTrading) {
    try {
      ex.enableDemoTrading(true);
    } catch (e) {
      console.warn('无法启用demo trading:', e.message);
    }
  }
  
  // 配置代理（如果设置了环境变量）
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (proxy) {
      ex.httpsProxy = proxy;
    }
  }
  
  return ex;
}

export async function getPrices(symbols) {
  return baseFutures.getPrices(symbols, createExchange);
}

export async function getAccountBalance() {
  return baseFutures.getAccountBalance(createExchange);
}

export async function getRealTimeAccountData() {
  return baseFutures.getRealTimeAccountData(createExchange);
}

```

```javascript
import ccxt from 'ccxt';
import * as baseFutures from './base-futures.js';

/**
 * 生产环境期货
 * 标准生产环境配置，不使用 demo trading
 */

function createExchange() {
  const apiKey = process.env.BINANCE_LIVE_API_KEY || 'xxx';
  const secret = process.env.BINANCE_LIVE_API_SECRET || 'xxx';
  
  const ex = new ccxt.binanceusdm({
    apiKey,
    secret,
    enableRateLimit: true,
    options: {
      defaultType: 'future',
      warnOnFetchCurrencies: false,
      fetchCurrencies: false,
    },
  });
  
  // 配置代理（如果设置了环境变量）
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (proxy) {
      ex.httpsProxy = proxy;
    }
  }
  
  return ex;
}

export async function getPrices(symbols) {
  return baseFutures.getPrices(symbols, createExchange);
}

export async function getAccountBalance() {
  return baseFutures.getAccountBalance(createExchange);
}

export async function getRealTimeAccountData() {
  return baseFutures.getRealTimeAccountData(createExchange);
}

```

```javascript
import ccxt from 'ccxt';
import * as baseSpot from './base-spot.js';

/**
 * 现货演示环境 (demo.binance.com)
 * 使用 enableDemoTrading(true) 启用演示交易
 */

function createExchange() {
  const apiKey = process.env.BINANCE_DEMO_API_KEY || '';
  const secret = process.env.BINANCE_DEMO_API_SECRET || '';
  
  const ex = new ccxt.binance({
    apiKey,
    secret,
    enableRateLimit: true,
  });
  
  // 必须先禁用sandbox模式（demo trading不支持sandbox）
  if (ex?.setSandboxMode) {
    ex.setSandboxMode(false);
  }
  
  // 启用demo trading
  if (ex.enableDemoTrading) {
    try {
      ex.enableDemoTrading(true);
    } catch (e) {
      console.warn('无法启用demo trading:', e.message);
    }
  }
  
  // 配置代理（如果设置了环境变量）
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (proxy) {
      ex.httpsProxy = proxy;
    }
  }
  
  return ex;
}

export async function getPrices(symbols) {
  return baseSpot.getPrices(symbols, createExchange);
}

export async function getAccountBalance() {
  return baseSpot.getAccountBalance(createExchange);
}

export async function getRealTimeAccountData() {
  return baseSpot.getRealTimeAccountData(createExchange);
}

```

```javascript
import ccxt from 'ccxt';
import * as baseSpot from './base-spot.js';

/**
 * 生产环境现货
 * 标准生产环境配置，不使用 demo trading
 */

function createExchange() {
  const apiKey = process.env.BINANCE_LIVE_API_KEY || 'xxx';
  const secret = process.env.BINANCE_LIVE_API_SECRET || 'xxx';
  
  const ex = new ccxt.binance({
    apiKey,
    secret,
    enableRateLimit: true,
  });
  
  // 配置代理（如果设置了环境变量）
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (proxy) {
      ex.httpsProxy = proxy;
    }
  }
  
  return ex;
}

export async function getPrices(symbols) {
  return baseSpot.getPrices(symbols, createExchange);
}

export async function getAccountBalance() {
  return baseSpot.getAccountBalance(createExchange);
}

export async function getRealTimeAccountData() {
  return baseSpot.getRealTimeAccountData(createExchange);
}

```

```javascript
/**
 * Binance 服务统一入口
 * 根据 TRADING_ENV 环境变量选择对应的环境实现
 */

import demoFutures from './demo-futures.js';
import demoSpot from './demo-spot.js';
import futures from './futures.js';
import spot from './spot.js';

const envHandlers = {
  'demo-futures': demoFutures,
  'demo-spot': demoSpot,
  'futures': futures,
  'spot': spot,
};

function getEnvHandler() {
  const env = String(process.env.TRADING_ENV || 'demo-futures').toLowerCase();
  const handler = envHandlers[env];
  if (!handler) {
    console.warn(`未知的交易环境: ${env}，使用默认环境 demo-futures`);
    return envHandlers['demo-futures'];
  }
  return handler;
}

/**
 * 获取价格
 */
export async function getPrices(symbols) {
  const handler = getEnvHandler();
  return handler.getPrices(symbols);
}

/**
 * 获取账户余额
 */
export async function getAccountBalance() {
  const handler = getEnvHandler();
  return handler.getAccountBalance();
}

/**
 * 获取实时账户数据
 */
export async function getRealTimeAccountData() {
  const handler = getEnvHandler();
  return handler.getRealTimeAccountData();
}

```

更新原来的 `binance.js` 以保持向后兼容：


```javascript
/**
 * Binance 服务入口（向后兼容）
 * 现在委托给 binance/index.js 处理
 */

export { getPrices, getAccountBalance, getRealTimeAccountData } from './binance/index.js';

```

验证调用点是否正常工作：


修复导出问题：将所有环境文件改为使用 named exports，并更新 index.js。


```javascript
/**
 * Binance 服务统一入口
 * 根据 TRADING_ENV 环境变量选择对应的环境实现
 */

import * as demoFutures from './demo-futures.js';
import * as demoSpot from './demo-spot.js';
import * as futures from './futures.js';
import * as spot from './spot.js';

const envHandlers = {
  'demo-futures': demoFutures,
  'demo-spot': demoSpot,
  'futures': futures,
  'spot': spot,
};

function getEnvHandler() {
  const env = String(process.env.TRADING_ENV || 'demo-futures').toLowerCase();
  const handler = envHandlers[env];
  if (!handler) {
    console.warn(`未知的交易环境: ${env}，使用默认环境 demo-futures`);
    return envHandlers['demo-futures'];
  }
  return handler;
}

/**
 * 获取价格
 */
export async function getPrices(symbols) {
  const handler = getEnvHandler();
  return handler.getPrices(symbols);
}

/**
 * 获取账户余额
 */
export async function getAccountBalance() {
  const handler = getEnvHandler();
  return handler.getAccountBalance();
}

/**
 * 获取实时账户数据
 */
export async function getRealTimeAccountData() {
  const handler = getEnvHandler();
  return handler.getRealTimeAccountData();
}


```

验证重构后的代码是否正常工作：


导入成功。验证新结构是否正常工作：


所有文件已创建并通过导入验证。检查文件内容，确保逻辑正确：


重构已完成。总结如下：

## 重构完成总结

### 创建的文件结构

```
backend/src/services/binance/
├── base-futures.js      # 期货基础实现（共享业务逻辑）
├── base-spot.js         # 现货基础实现（共享业务逻辑）
├── demo-futures.js      # 期货演示环境 (demo.binance.com)
├── demo-spot.js         # 现货演示环境 (demo.binance.com)
├── futures.js           # 生产环境期货
├── spot.js              # 生产环境现货
└── index.js             # 统一入口，根据 TRADING_ENV 选择环境
```

### 关键实现要点

1. 环境分离
   - 每个环境（demo-futures, demo-spot, futures, spot）有独立文件
   - 清晰区分演示环境与生产环境

2. 代码复用
   - `base-futures.js` 和 `base-spot.js` 包含共享业务逻辑
   - 各环境文件只负责 `createExchange()` 的初始化差异

3. Demo 与生产环境的区别
   - demo-futures/futures: 都使用 `ccxt.binanceusdm`，区别在于是否调用 `enableDemoTrading(true)`
   - demo-spot/spot: 都使用 `ccxt.binance`，区别在于是否调用 `enableDemoTrading(true)`

4. API Key 配置
   - Demo 环境: `BINANCE_DEMO_API_KEY` / `BINANCE_DEMO_API_SECRET`
   - 生产环境: `BINANCE_LIVE_API_KEY` / `BINANCE_LIVE_API_SECRET` (目前占位符 xxx)

5. 向后兼容
   - `binance.js` 保持原有导出接口
   - 现有代码（如 `routes/nof1.js`）无需修改

### 验证结果

- 所有文件可正常导入
- 导出函数正确（getPrices, getAccountBalance, getRealTimeAccountData）
- 无语法错误

重构完成，代码结构更清晰，各环境逻辑分离，易于维护和扩展。

```plaintext
backend/src/services/binance/
├── base-futures.js      # 期货基础实现（共享业务逻辑）
├── base-spot.js         # 现货基础实现（共享业务逻辑）
├── demo-futures.js      # 期货演示环境 (demo.binance.com)
├── demo-spot.js         # 现货演示环境 (demo.binance.com)
├── futures.js           # 生产环境期货
├── spot.js              # 生产环境现货
└── index.js             # 统一入口，根据 TRADING_ENV 选择环境
```

---

**User**

帮我分析一下当前项目，我觉得还有不少地方需要修改， 比如 prompt-studio是不是应该对futures和spot生成不同的system prompt, 和user prompt模板， 毕竟两者有很多不一样的地方，主要是futures有杠杆。 

---

**Cursor**


检查 prompt-studio 对 futures/spot 差异的处理：


查看 user_prompt 模板和配置结构：


分析当前项目存在的问题，并整理改进建议：


分析当前项目存在的问题和改进建议：

## 项目分析报告

### 当前存在的问题

#### 1. Prompt 模板管理问题

问题描述：
- 使用同一个模板文件（`system_prompt.txt`、`user_prompt.hbs`）
- 通过 `{{#is_futures}}` 条件渲染处理差异
- `config.json` 中的 `presets` 没有为不同环境指定独立的 prompt 文件

影响：
- 模板复杂度高，维护成本大
- Futures 和 Spot 差异显著，混在一起易出错
- 难以针对特定环境优化 prompt

Futures 与 Spot 的核心差异：

| 特性 | Futures | Spot |
|------|---------|------|
| 杠杆 | 支持 1-20x | 无杠杆 |
| 交易方向 | 可做多/做空 | 只能做多 |
| 保证金 | 需要保证金 | 全额现金 |
| 强制平仓 | 有强制平仓价格 | 无强制平仓 |
| 持仓结构 | 合约数量（正负） | 资产数量（正） |
| 盈亏计算 | 未实现盈亏、资金费率 | 简单价差 |
| 风险控制 | 更复杂（杠杆、保证金率） | 相对简单 |
| Symbol 格式 | `BTC/USDT:USDT` | `BTC/USDT` |

#### 2. Prompt Studio 的问题

问题：
- `prompt-studio` 目前只读取全局的 `prompt_files` 配置
- 没有根据 `--env` 参数选择对应的模板
- 生成建议时无法区分环境特性

#### 3. Config 结构问题

问题：
- `presets` 中只有 `allowed_symbols`，缺少其他配置
- 没有环境特定的 `prompt_files` 配置
- 没有环境特定的 `data` 配置（比如不同的时间框架）

#### 4. 其他潜在问题

1. `prompt-studio` 初始化交易所时，`demo-spot` 错误地使用了 `setSandboxMode`，应使用 `enableDemoTrading`
2. API 路由 `/api/nof1/ai/prompts` 只读取固定路径的模板，没有根据环境选择
3. 前端可能无法区分不同环境的 prompt 需求

### 改进建议

#### 方案 A：为每个环境创建独立的模板文件（推荐）

```
prompt_templates/
├── futures/
│   ├── system_prompt.txt    # 期货专用
│   └── user_prompt.hbs      # 期货专用
├── spot/
│   ├── system_prompt.txt    # 现货专用
│   └── user_prompt.hbs      # 现货专用
└── shared/
    └── (共用部分，如果有)
```

优点：
- 清晰分离，易于维护
- 可针对特定环境优化
- 无需条件渲染，逻辑更直接

#### 方案 B：在 config.json presets 中添加 prompt_files 配置

```json
{
  "presets": {
    "demo-futures": {
      "allowed_symbols": [...],
      "prompt_files": {
        "system_prompt_path": "./backend/ai/ai-trading/prompt_templates/futures/system_prompt.txt",
        "user_prompt_path": "./backend/ai/ai-trading/prompt_templates/futures/user_prompt.hbs"
      }
    },
    "demo-spot": {
      "allowed_symbols": [...],
      "prompt_files": {
        "system_prompt_path": "./backend/ai/ai-trading/prompt_templates/spot/system_prompt.txt",
        "user_prompt_path": "./backend/ai/ai-trading/prompt_templates/spot/user_prompt.hbs"
      }
    }
  }
}
```

### 具体需要修改的地方

1. 修改 `ai-trading-system.v2.mjs`
   - 从 `presets[tradingEnv].prompt_files` 读取模板路径
   - 如果没有，回退到全局 `prompt_files`

2. 修改 `prompt-studio/prompt_studio.mjs`
   - 根据 `--env` 参数选择对应的模板文件
   - 修复 `demo-spot` 使用 `enableDemoTrading` 的问题

3. 修改 `config.json`
   - 在 `presets` 中为每个环境添加 `prompt_files` 配置

4. 创建独立的模板文件
   - 为 futures 和 spot 创建专门的模板
   - 移除条件渲染逻辑

5. 修改 API 路由（如果需要）
   - `/api/nof1/ai/prompts` 需要支持根据环境返回对应模板

建议优先实施方案 A（独立模板文件）+ 方案 B（config 配置）。需要我开始实现吗？

```plaintext
prompt_templates/
├── futures/
│   ├── system_prompt.txt    # 期货专用
│   └── user_prompt.hbs      # 期货专用
├── spot/
│   ├── system_prompt.txt    # 现货专用
│   └── user_prompt.hbs      # 现货专用
└── shared/
    └── (共用部分，如果有)
```

```json
{
  "presets": {
    "demo-futures": {
      "allowed_symbols": [...],
      "prompt_files": {
        "system_prompt_path": "./backend/ai/ai-trading/prompt_templates/futures/system_prompt.txt",
        "user_prompt_path": "./backend/ai/ai-trading/prompt_templates/futures/user_prompt.hbs"
      }
    },
    "demo-spot": {
      "allowed_symbols": [...],
      "prompt_files": {
        "system_prompt_path": "./backend/ai/ai-trading/prompt_templates/spot/system_prompt.txt",
        "user_prompt_path": "./backend/ai/ai-trading/prompt_templates/spot/user_prompt.hbs"
      }
    }
  }
}
```

---

**User**

用方案A， 并且在前端prompt studio 那个面板里面加入一个切换按钮

---

**Cursor**


实施方案 A：创建独立模板文件，并在前端 prompt studio 面板添加切换按钮。开始实施：


实施方案 A，并添加前端切换按钮。创建独立的模板文件：


```plaintext
You are an expert crypto trader agent operating Binance USDT-margined perpetual futures. Operate strictly within the provided exchange environment and symbols whitelist.

**Environment:** {{environment}}
**Trading Mode:** {{trading_mode}}

**Allowed Symbols Whitelist:**
{{allowed_symbols_csv}}

**Risk Discipline:**
- Use isolated margin
- Leverage range: 1-20x (integer only)
- Prefer tight stops and defined exits
- Monitor liquidation prices carefully
- Consider funding rates when opening positions
- Can go both LONG (positive quantity) and SHORT (negative quantity)

---

## OUTPUT FORMAT REQUIREMENT

**YOU MUST THINK STEP-BY-STEP** before making your decision.

**YOU MUST RETURN STRICT JSON** (no markdown fences, no extra text).

Return exactly one top-level JSON object:

{
  "analysis": {
    "market_summary": "string (required, 1-4 sentences)",
    "key_observations": ["optional bullet points"]
  },
  "trading_decision": {
    "action": "BUY" | "SELL" | "CLOSE_POSITION" | "HOLD",
    "symbol": "string (required, from whitelist)",
    "quantity": 0.001,
    "profit_target": "number (optional, float)",
    "stop_loss": "number (optional, float)",
    "invalidation_condition": "string (optional)",
    "leverage": 1,
    "reasoning": "string (required, concise rationale)",
    "confidence": "number (optional, 0-1)"
  },
  "trading_decisions": [
    {
      "action": "BUY|SELL|CLOSE_POSITION|HOLD",
      "symbol": "string (from whitelist)",
      "quantity": 0.001,
      "leverage": 1,
      "reasoning": "string"
    }
  ],
  "account_management": {
    "current_value": 10000,
    "available_cash": 10000,
    "total_return": 0,
    "sharpe_ratio": 0,
    "recommendations": ["optional guidance"]
  },
  "chain_of_thought": "string (your step-by-step reasoning process)"
}

**Decision Making Process:**

Before making your final decision, you MUST think through your reasoning step-by-step:

1. **Review all open positions and their exit plans**
   - Check current prices against entry prices
   - Compare current prices with stop_loss and profit_target levels
   - Verify if any invalidation_condition has been triggered
   - Check liquidation prices (especially important for leveraged positions)
   - Review unrealized P&L and margin requirements

2. **Check if any exit conditions have been triggered**
   - Stop loss levels
   - Profit target levels
   - Invalidation conditions
   - Liquidation risk

3. **Analyze market signals and indicators**
   - Use the provided technical indicators (EMA, MACD, RSI, ATR, Volume)
   - Consider open interest and funding rates (important for futures)
   - Compare current prices with liquidation prices
   - Assess market momentum and volatility

4. **Make an informed decision**
   - Decide whether to hold, close, or enter/exit positions
   - Consider leverage impact on risk and reward
   - If holding, explain why
   - If trading, provide clear justification including leverage choice

5. **Justify your choices based on the data provided**
   - Reference specific technical indicators
   - Explain your reasoning
   - Show how your analysis led to the action
   - Justify leverage selection (1-20x)

**Critical Rules:**
1. All required fields MUST be present
2. Return ONLY the JSON object (no markdown)
3. symbol must be from: {{allowed_symbols_csv}}
4. leverage must be integer 1-20
5. quantity can be positive (LONG) or negative (SHORT)
6. Be concise and actionable
7. Show your chain of thought reasoning in the "chain_of_thought" field
8. Provide specific values for profit_target and stop_loss when entering positions
9. Include invalidation_condition to define exit criteria
10. Always consider liquidation price when using leverage

```

```plaintext
You are an expert crypto trader agent operating Binance Spot trading. Operate strictly within the provided exchange environment and symbols whitelist.

**Environment:** {{environment}}
**Trading Mode:** {{trading_mode}}

**Allowed Symbols Whitelist:**
{{allowed_symbols_csv}}

**Risk Discipline:**
- Cash-only trading (no leverage)
- Avoid overtrading
- Focus on spot price movements
- Only LONG positions (can only buy, not short)
- Quantity must always be positive
- Manage position sizes based on available cash

---

## OUTPUT FORMAT REQUIREMENT

**YOU MUST THINK STEP-BY-STEP** before making your decision.

**YOU MUST RETURN STRICT JSON** (no markdown fences, no extra text).

Return exactly one top-level JSON object:

{
  "analysis": {
    "market_summary": "string (required, 1-4 sentences)",
    "key_observations": ["optional bullet points"]
  },
  "trading_decision": {
    "action": "BUY" | "SELL" | "CLOSE_POSITION" | "HOLD",
    "symbol": "string (required, from whitelist)",
    "quantity": 0.001,
    "profit_target": "number (optional, float)",
    "stop_loss": "number (optional, float)",
    "invalidation_condition": "string (optional)",
    "reasoning": "string (required, concise rationale)",
    "confidence": "number (optional, 0-1)"
  },
  "trading_decisions": [
    {
      "action": "BUY|SELL|CLOSE_POSITION|HOLD",
      "symbol": "string (from whitelist)",
      "quantity": 0.001,
      "reasoning": "string"
    }
  ],
  "account_management": {
    "current_value": 10000,
    "available_cash": 10000,
    "total_return": 0,
    "sharpe_ratio": 0,
    "recommendations": ["optional guidance"]
  },
  "chain_of_thought": "string (your step-by-step reasoning process)"
}

**Decision Making Process:**

Before making your final decision, you MUST think through your reasoning step-by-step:

1. **Review all open positions and their exit plans**
   - Check current prices against entry prices
   - Compare current prices with stop_loss and profit_target levels
   - Verify if any invalidation_condition has been triggered
   - Calculate unrealized gains/losses

2. **Check if any exit conditions have been triggered**
   - Stop loss levels
   - Profit target levels
   - Invalidation conditions

3. **Analyze market signals and indicators**
   - Use the provided technical indicators (EMA, MACD, RSI, ATR, Volume)
   - Focus on spot price movements and trends
   - Assess market momentum and volatility
   - Consider volume and liquidity

4. **Make an informed decision**
   - Decide whether to hold, close, or enter/exit positions
   - Ensure you have sufficient cash for new positions
   - If holding, explain why
   - If trading, provide clear justification

5. **Justify your choices based on the data provided**
   - Reference specific technical indicators
   - Explain your reasoning
   - Show how your analysis led to the action
   - Consider cash management (don't over-allocate)

**Critical Rules:**
1. All required fields MUST be present
2. Return ONLY the JSON object (no markdown)
3. symbol must be from: {{allowed_symbols_csv}}
4. Do NOT include leverage field (spot trading has no leverage)
5. quantity must always be positive (can only buy, not short)
6. Be concise and actionable
7. Show your chain of thought reasoning in the "chain_of_thought" field
8. Provide specific values for profit_target and stop_loss when entering positions
9. Include invalidation_condition to define exit criteria
10. Always ensure sufficient available_cash before making BUY decisions

```

创建 user_prompt 模板（futures 和 spot 可共用，但为以后扩展保留独立文件）：


```handlebars
It has been {{minutes_since_start}} minutes since you started trading. The current time is {{now_iso}} and you've been invoked {{invocation_count}} times. Below, we are providing you with a variety of state data, price data, and predictive signals so you can discover alpha. Below that is your current account information, value, performance, positions, etc.

**ALL OF THE PRICE OR SIGNAL DATA BELOW IS ORDERED: OLDEST → NEWEST**

**Timeframes note:** Unless stated otherwise in a section title, intraday series are provided at **3‑minute intervals**. If a coin uses a different interval, it is explicitly stated in that coin's section.

---

### CURRENT MARKET STATE FOR ALL COINS

{{market_sections}}

### HERE IS YOUR ACCOUNT INFORMATION & PERFORMANCE

Current Total Return (percent): {{total_return}}%

Available Cash (Margin): {{available_cash}}

**Current Account Value:** {{account_value}}

Current live positions & performance (Futures): 

{{positions_block}}

Note: Positions show contract quantities (positive = LONG, negative = SHORT), leverage, margin used, unrealized P&L, and liquidation prices.

Sharpe Ratio: {{sharpe_ratio}}

Based on the above data, provide your trading analysis and specific recommendations. Remember you can go both LONG and SHORT, and leverage is available (1-20x).

```

```handlebars
It has been {{minutes_since_start}} minutes since you started trading. The current time is {{now_iso}} and you've been invoked {{invocation_count}} times. Below, we are providing you with a variety of state data, price data, and predictive signals so you can discover alpha. Below that is your current account information, value, performance, positions, etc.

**ALL OF THE PRICE OR SIGNAL DATA BELOW IS ORDERED: OLDEST → NEWEST**

**Timeframes note:** Unless stated otherwise in a section title, intraday series are provided at **3‑minute intervals**. If a coin uses a different interval, it is explicitly stated in that coin's section.

---

### CURRENT MARKET STATE FOR ALL COINS

{{market_sections}}

### HERE IS YOUR ACCOUNT INFORMATION & PERFORMANCE

Current Total Return (percent): {{total_return}}%

Available Cash: {{available_cash}}

**Current Account Value:** {{account_value}}

Current live positions & performance (Spot): 

{{positions_block}}

Note: Positions show asset quantities held (always positive - you can only own assets, not short them). No leverage is available in spot trading.

Sharpe Ratio: {{sharpe_ratio}}

Based on the above data, provide your trading analysis and specific recommendations. Remember this is cash-only spot trading with no leverage.

```

更新配置文件，在 presets 中添加 prompt_files 配置：


```json
{
  "trading_env": "demo-futures",
  "allowed_symbols": [
    "BTC/USDT:USDT",
    "ETH/USDT:USDT",
    "SOL/USDT:USDT",
    "BNB/USDT:USDT",
    "XRP/USDT:USDT",
    "DOGE/USDT:USDT"
  ],
  "symbols_monitor": [],
  "exchange": {
    "binance": {
      "futures_demo": {
        "api_key": "${BINANCE_DEMO_API_KEY}",
        "api_secret": "${BINANCE_DEMO_API_SECRET}"
      },
      "spot_testnet": {
        "api_key": "${BINANCE_SPOT_TEST_API_KEY}",
        "api_secret": "${BINANCE_SPOT_TEST_API_SECRET}"
      }
    }
  },
  "ai": {
    "provider": "deepseek",
    "model": "deepseek-chat",
    "api_key": "${DEEPSEEK_API_KEY_30}",
    "temperature": 0.7,
    "max_tokens": 2000,
    "presets": {
      "deepseek": {
        "provider": "deepseek",
        "model": "deepseek-chat",
        "api_key": "${DEEPSEEK_API_KEY_30}",
        "temperature": 0.7,
        "max_tokens": 2000
      },
      "deepseek-reasoner": {
        "provider": "deepseek",
        "model": "deepseek-reasoner",
        "api_key": "${DEEPSEEK_API_KEY_30}",
        "temperature": 0.7,
        "max_tokens": 2000
      }
    }
  },
  "prompt_files": {
    "system_prompt_path": "./backend/ai/ai-trading/prompt_templates/system_prompt.txt",
    "user_prompt_path": "./backend/ai/ai-trading/prompt_templates/user_prompt.hbs"
  },
  "presets": {
    "demo-futures": {
      "allowed_symbols": [
        "BTC/USDT:USDT",
        "ETH/USDT:USDT",
        "SOL/USDT:USDT",
        "BNB/USDT:USDT",
        "XRP/USDT:USDT",
        "DOGE/USDT:USDT"
      ],
      "prompt_files": {
        "system_prompt_path": "./backend/ai/ai-trading/prompt_templates/futures/system_prompt.txt",
        "user_prompt_path": "./backend/ai/ai-trading/prompt_templates/futures/user_prompt.hbs"
      }
    },
    "demo-spot": {
      "allowed_symbols": [
        "BTC/USDT",
        "ETH/USDT",
        "SOL/USDT",
        "BNB/USDT",
        "XRP/USDT",
        "DOGE/USDT"
      ],
      "prompt_files": {
        "system_prompt_path": "./backend/ai/ai-trading/prompt_templates/spot/system_prompt.txt",
        "user_prompt_path": "./backend/ai/ai-trading/prompt_templates/spot/user_prompt.hbs"
      }
    },
    "futures": {
      "allowed_symbols": [
        "BTC/USDT:USDT",
        "ETH/USDT:USDT",
        "SOL/USDT:USDT",
        "BNB/USDT:USDT",
        "XRP/USDT:USDT",
        "DOGE/USDT:USDT"
      ],
      "prompt_files": {
        "system_prompt_path": "./backend/ai/ai-trading/prompt_templates/futures/system_prompt.txt",
        "user_prompt_path": "./backend/ai/ai-trading/prompt_templates/futures/user_prompt.hbs"
      }
    },
    "spot": {
      "allowed_symbols": [
        "BTC/USDT",
        "ETH/USDT",
        "SOL/USDT",
        "BNB/USDT",
        "XRP/USDT",
        "DOGE/USDT"
      ],
      "prompt_files": {
        "system_prompt_path": "./backend/ai/ai-trading/prompt_templates/spot/system_prompt.txt",
        "user_prompt_path": "./backend/ai/ai-trading/prompt_templates/spot/user_prompt.hbs"
      }
    }
  },
  "data": {
    "intraday_tf": "3m",
    "intraday_limit": 50,
    "context_tf": "4h",
    "context_limit": 10
  }
}



```

查找并修改 `ai-trading-system.v2.mjs` 以根据环境加载模板：


修改代码以优先从 presets 加载模板：


```javascript
import ccxt from 'ccxt';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

// 轻量级 .env 加载（避免额外依赖），需在使用 config/env 之前执行
function loadDotEnv(envPath) {
  try {
    if (!existsSync(envPath)) return;
    const raw = readFileSync(envPath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = val;
      }
    });
  } catch (_) {}
}

// 提前加载 backend/.env，确保 config 与 env 解析可用
loadDotEnv(resolve(process.cwd(), 'backend/.env'));

function expandEnvMaybe(value) {
  if (typeof value !== 'string') return value;
  const m = value.match(/^\$\{(.+)\}$/);
  if (m) return process.env[m[1]] || '';
  return value;
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && idx < process.argv.length - 1) return process.argv[idx + 1];
  const envKey = name.replace(/^--/, '').toUpperCase();
  return process.env[envKey];
}

function loadConfig() {
  const configPath = resolve(process.cwd(), 'backend/ai/ai-trading/config.json');
  const raw = readFileSync(configPath, 'utf8');
  const cfg = JSON.parse(raw);
  if (cfg.ai && cfg.ai.api_key) cfg.ai.api_key = expandEnvMaybe(cfg.ai.api_key);
  const f = cfg.exchange?.binance?.futures_demo;
  const s = cfg.exchange?.binance?.spot_testnet;
  if (f) {
    f.api_key = expandEnvMaybe(f.api_key);
    f.api_secret = expandEnvMaybe(f.api_secret);
  }
  if (s) {
    s.api_key = expandEnvMaybe(s.api_key);
    s.api_secret = expandEnvMaybe(s.api_secret);
  }
  return cfg;
}

function renderSections(template, flags) {
  let out = template;
  out = out.replace(/\{\{#is_futures\}\}([\s\S]*?)\{\{\/is_futures\}\}/g, (_, inner) => (flags.is_futures ? inner : ''));
  out = out.replace(/\{\{\^is_futures\}\}([\s\S]*?)\{\{\/is_futures\}\}/g, (_, inner) => (!flags.is_futures ? inner : ''));
  return out;
}

function renderSimple(template, context) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g, (_, key) => {
    const val = key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : ''), context);
    return String(val ?? '');
  });
}

class AITradingSystemV2 {
  constructor() {
    this.config = loadConfig();

    const argEnv = getArg('--env');
    const argAi = getArg('--ai');

    this.tradingEnv = (argEnv && typeof argEnv === 'string') ? argEnv : (this.config.trading_env || 'demo-futures');
    this.isFutures = this.tradingEnv === 'demo-futures' || this.tradingEnv === 'futures';

    const aiPreset = (argAi && this.config.ai?.presets?.[argAi]) ? this.config.ai.presets[argAi] : null;
    this.aiProvider = (aiPreset?.provider || this.config.ai?.provider || 'deepseek');
    this.aiModel = (aiPreset?.model || this.config.ai?.model || 'deepseek-chat');
    this.aiApiKey = expandEnvMaybe(aiPreset?.api_key || this.config.ai?.api_key || process.env.DEEPSEEK_API_KEY_30 || '');
    this.aiTemperature = (aiPreset?.temperature ?? this.config.ai?.temperature ?? 0.7);
    this.aiMaxTokens = (aiPreset?.max_tokens ?? this.config.ai?.max_tokens ?? 2000);

    this.exchange = null;
    this.dataDir = resolve(process.cwd(), 'backend', 'data');
    try { mkdirSync(this.dataDir, { recursive: true }); } catch (_) {}
    this.stateFile = resolve(this.dataDir, 'trading-state.json');
    this.conversationsFile = resolve(this.dataDir, 'conversations.json');
    this.tradesFile = resolve(this.dataDir, 'trades.json');

    this.state = this.loadState();
    this.sanitizeState();
    this.conversations = this.loadConversations();

    // 确保种子文件存在（前端可立即读取）
    try {
      if (!existsSync(this.tradesFile)) {
        writeFileSync(this.tradesFile, JSON.stringify({ trades: [] }, null, 2), 'utf8');
      }
      if (!existsSync(this.conversationsFile)) {
        writeFileSync(this.conversationsFile, JSON.stringify(this.conversations, null, 2), 'utf8');
      }
      if (!existsSync(this.stateFile)) {
        this.saveState();
      }
    } catch (_) {}

    const defaultAllowed = this.isFutures
      ? ['BTC/USDT:USDT','ETH/USDT:USDT','SOL/USDT:USDT','BNB/USDT:USDT','XRP/USDT:USDT','DOGE/USDT:USDT']
      : ['BTC/USDT','ETH/USDT','SOL/USDT','BNB/USDT','XRP/USDT','DOGE/USDT'];

    const presetAllowed = this.config.presets?.[this.tradingEnv]?.allowed_symbols;

    this.allowedSymbolsForAI = Array.isArray(this.config.allowed_symbols) && this.config.allowed_symbols.length > 0
      ? this.config.allowed_symbols
      : (Array.isArray(presetAllowed) && presetAllowed.length > 0 ? presetAllowed : defaultAllowed);

    this.symbols = (Array.isArray(this.config.symbols_monitor) && this.config.symbols_monitor.length > 0)
      ? this.config.symbols_monitor
      : [...this.allowedSymbolsForAI];

    // 优先从 presets 读取环境特定的模板路径，否则使用全局配置
    const presetPromptFiles = this.config.presets?.[this.tradingEnv]?.prompt_files;
    const promptFiles = presetPromptFiles || this.config.prompt_files || {};
    
    this.systemPromptTemplatePath = resolve(process.cwd(), promptFiles.system_prompt_path || '');
    this.userPromptTemplatePath = resolve(process.cwd(), promptFiles.user_prompt_path || '');
    this.systemPromptTemplate = existsSync(this.systemPromptTemplatePath)
      ? readFileSync(this.systemPromptTemplatePath, 'utf8')
      : '';
    this.userPromptTemplate = existsSync(this.userPromptTemplatePath)
      ? readFileSync(this.userPromptTemplatePath, 'utf8')
      : '';

    this.dataCfg = {
      intraday_tf: this.config.data?.intraday_tf || '1m',
      intraday_limit: this.config.data?.intraday_limit || 50,
      context_tf: this.config.data?.context_tf || '4h',
      context_limit: this.config.data?.context_limit || 10
    };

    // 简单的随机基准，用于离线/失败回退生成数值
    this._seed = Math.floor(Date.now() / 60000);
  }

  sanitizeState() {
    const s = this.state || {};
    // 核心数值字段保证为数字
    s.accountValue = Number.isFinite(Number(s.accountValue)) ? Number(s.accountValue) : 10000;
    s.availableCash = Number.isFinite(Number(s.availableCash)) ? Number(s.availableCash) : 10000;
    s.totalReturn = Number.isFinite(Number(s.totalReturn)) ? Number(s.totalReturn) : 0;
    s.invocationCount = Number.isFinite(Number(s.invocationCount)) ? Number(s.invocationCount) : 0;
    // 结构字段
    if (!Array.isArray(s.positions)) s.positions = [];
    if (!s.startTime) s.startTime = new Date().toISOString();
    if (!s.lastUpdate) s.lastUpdate = new Date().toISOString();
    if (typeof s.tradingEnabled !== 'boolean') s.tradingEnabled = true;
    // 规范化持仓内的数值
    s.positions = s.positions.map((p = {}) => ({
      symbol: p.symbol || 'BTC',
      quantity: Number.isFinite(Number(p.quantity)) ? Number(p.quantity) : 0,
      entry_price: Number.isFinite(Number(p.entry_price)) ? Number(p.entry_price) : 0,
      current_price: Number.isFinite(Number(p.current_price)) ? Number(p.current_price) : 0,
      liquidation_price: Number.isFinite(Number(p.liquidation_price)) ? Number(p.liquidation_price) : 0,
      unrealized_pnl: Number.isFinite(Number(p.unrealized_pnl)) ? Number(p.unrealized_pnl) : 0,
      leverage: Number.isFinite(Number(p.leverage)) ? Number(p.leverage) : 1,
      exit_plan: p.exit_plan || { profit_target: 0, stop_loss: 0, invalidation_condition: 'none' },
      confidence: Number.isFinite(Number(p.confidence)) ? Number(p.confidence) : 0.8,
      risk_usd: Number.isFinite(Number(p.risk_usd)) ? Number(p.risk_usd) : 0,
      sl_oid: p.sl_oid ?? null,
      tp_oid: p.tp_oid ?? null,
      wait_for_fill: Boolean(p.wait_for_fill),
      entry_oid: p.entry_oid ?? null,
      notional_usd: Number.isFinite(Number(p.notional_usd)) ? Number(p.notional_usd) : 0,
    }));
    this.state = s;
  }

  normalizeBaseSymbol(raw) {
    if (!raw) return undefined;
    let sym = String(raw).trim().toUpperCase();
    sym = sym.replace(/\s+/g, '');
    sym = sym.replace(/:USDT$/, '');
    if (sym.includes('/')) return sym.split('/')[0];
    if (sym.endsWith('USDT')) return sym.slice(0, -4);
    return sym;
  }

  loadState() {
    try {
      if (existsSync(this.stateFile)) {
        const data = readFileSync(this.stateFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (_) {}
    return {
      startTime: new Date().toISOString(),
      invocationCount: 0,
      totalReturn: 0,
      accountValue: 10000,
      availableCash: 10000,
      positions: [],
      lastUpdate: new Date().toISOString(),
      tradingEnabled: true
    };
  }

  saveState() {
    this.state.lastUpdate = new Date().toISOString();
    writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf8');
  }

  loadConversations() {
    try {
      if (existsSync(this.conversationsFile)) {
        const data = readFileSync(this.conversationsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (_) {}
    return { conversations: [], lastUpdate: new Date().toISOString() };
  }

  saveConversations() {
    this.conversations.lastUpdate = new Date().toISOString();
    writeFileSync(this.conversationsFile, JSON.stringify(this.conversations, null, 2), 'utf8');
  }

  async initializeExchange() {
    try {
      // 仅在用户显式设置时使用代理，避免误用本地 7890 端口
      const httpsProxy = process.env.HTTPS_PROXY || '';
      const httpProxy = process.env.HTTP_PROXY || '';
      const noProxy = process.env.NO_PROXY || process.env.no_proxy || '';
      console.log(`Proxy config -> HTTPS_PROXY=${httpsProxy || '(unset)'} HTTP_PROXY=${httpProxy || '(unset)'} NO_PROXY=${noProxy || '(unset)'}\n`);

      const envKey = this.tradingEnv;
      const isDemoFutures = envKey === 'demo-futures';
      const isDemoSpot = envKey === 'demo-spot';

      if (isDemoFutures || envKey === 'futures') {
        const apiKey = this.config.exchange?.binance?.futures_demo?.api_key || process.env.BINANCE_DEMO_API_KEY;
        const secret = this.config.exchange?.binance?.futures_demo?.api_secret || process.env.BINANCE_DEMO_API_SECRET;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_DEMO_API_KEY/SECRET或在config.json配置');
        this.exchange = new ccxt.binanceusdm({ apiKey, secret, enableRateLimit: true, options: { defaultType: 'future', warnOnFetchCurrencies: false, fetchCurrencies: false, enableDemoTrading: true } });
        if (httpsProxy) this.exchange.httpsProxy = httpsProxy.endsWith('/') ? httpsProxy : `${httpsProxy}/`;
        this.exchange.enableDemoTrading(true);
        await this.exchange.fetchBalance();
      } else if (isDemoSpot || envKey === 'spot') {
        const apiKey = this.config.exchange?.binance?.spot_testnet?.api_key || process.env.BINANCE_SPOT_TEST_API_KEY;
        const secret = this.config.exchange?.binance?.spot_testnet?.api_secret || process.env.BINANCE_SPOT_TEST_API_SECRET;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_SPOT_TEST_API_KEY/SECRET或在config.json配置');
        this.exchange = new ccxt.binance({ apiKey, secret, enableRateLimit: true });
        if (httpsProxy) this.exchange.httpsProxy = httpsProxy.endsWith('/') ? httpsProxy : `${httpsProxy}/`;
        if (typeof this.exchange.setSandboxMode === 'function') this.exchange.setSandboxMode(true);
        await this.exchange.fetchBalance();
      }
      return true;
    } catch (e) {
      console.error('❌ 初始化交易所失败:', e.message);
      console.error('详细错误:', e);
      return false;
    }
  }

  calculateEMA(prices, period) {
    if (prices.length < period) return null;
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    return ema;
  }
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26) {
    if (prices.length < slowPeriod) return null;
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    if (!fastEMA || !slowEMA) return null;
    return fastEMA - slowEMA;
  }
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change; else losses += Math.abs(change);
    }
    const avgGain = gains / period; const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  calculateATR(highs, lows, closes, period = 14) {
    if (highs.length < period + 1) return null;
    const trueRanges = [];
    for (let i = 1; i < highs.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  async getMarketData() {
    const marketData = {};
    const intradayTf = this.dataCfg.intraday_tf;
    const intradayLimit = this.dataCfg.intraday_limit;
    const ctxTf = this.dataCfg.context_tf;
    const ctxLimit = this.dataCfg.context_limit;
    for (const symbol of this.symbols) {
      try {
        if (!this.exchange) throw new Error('no_exchange');
        const ticker = await this.exchange.fetchTicker(symbol);
        const ohlcv = await this.exchange.fetchOHLCV(symbol, intradayTf, undefined, intradayLimit);
        const prices = ohlcv.map(c => (c[2] + c[3]) / 2);
        const highs = ohlcv.map(c => c[2]);
        const lows = ohlcv.map(c => c[3]);
        const closes = ohlcv.map(c => c[4]);
        const volumes = ohlcv.map(c => c[5]);
        const ema20 = this.calculateEMA(prices, 20) || Number(ticker.last) || 0;
        const macd = this.calculateMACD(prices) || 0;
        const rsi14 = this.calculateRSI(prices, 14) || 50;
        const rsi21 = this.calculateRSI(prices, 21) || 50;
        const atr = this.calculateATR(highs, lows, closes) || (Number(ticker.last) || 0) * 0.02;

        const ohlcvCtx = await this.exchange.fetchOHLCV(symbol, ctxTf, undefined, ctxLimit);
        const pricesCtx = ohlcvCtx.map(c => (c[2] + c[3]) / 2);
        const ema20_4h = this.calculateEMA(pricesCtx, 20) || Number(ticker.last) || 0;
        const ema50_4h = this.calculateEMA(pricesCtx, 50) || Number(ticker.last) || 0;
        const atr_4h = this.calculateATR(ohlcvCtx.map(c => c[2]), ohlcvCtx.map(c => c[3]), ohlcvCtx.map(c => c[4])) || (Number(ticker.last) || 0) * 0.02;

        const currentVolume = volumes[volumes.length - 1] || 0;
        const avgVolume = volumes.length ? (volumes.reduce((a, b) => a + b, 0) / volumes.length) : 0;
        const fundingRate = (Math.random() - 0.5) * 0.001;
        const openInterest = Math.random() * 1000000 + 500000;
        const avgOpenInterest = openInterest * (0.8 + Math.random() * 0.4);
        const baseKey = this.normalizeBaseSymbol(symbol);

        marketData[baseKey] = {
          symbol: baseKey,
          currentPrice: Number(ticker.last) || 0,
          ema20: Number(ema20) || 0,
          macd: Number(macd) || 0,
          rsi14: Number(rsi14) || 50,
          rsi21: Number(rsi21) || 50,
          atr: Number(atr) || 0,
          ema20_4h: Number(ema20_4h) || 0,
          ema50_4h: Number(ema50_4h) || 0,
          atr_4h: Number(atr_4h) || 0,
          currentVolume: Number(currentVolume) || 0,
          avgVolume: Number(avgVolume) || 0,
          fundingRate: Number(fundingRate) || 0,
          openInterest: Number(openInterest) || 0,
          avgOpenInterest: Number(avgOpenInterest) || 0,
          prices: prices.slice(-10).map(Number),
          ema20_series: this.generateEMASeries(prices, 20).slice(-10).map(Number),
          macd_series: this.generateMACDSeries(prices).slice(-10).map(Number),
          rsi14_series: this.generateRSISeries(prices, 14).slice(-10).map(Number),
          rsi21_series: this.generateRSISeries(prices, 21).slice(-10).map(Number),
          macd_4h_series: this.generateMACDSeries(pricesCtx).slice(-10).map(Number),
          rsi14_4h_series: this.generateRSISeries(pricesCtx, 14).slice(-10).map(Number)
        };
      } catch (e) {
        // 离线/失败回退：生成稳定的伪数据，避免渲染与 toFixed 失败
        const baseKey = this.normalizeBaseSymbol(symbol);
        const t = this._seed + Math.floor(Math.random() * 1000);
        const p0 = 100 + (t % 50);
        const series = Array.from({ length: 10 }, (_, i) => p0 + Math.sin((t + i) / 5) * 2 + (Math.random() - 0.5));
        const last = series[series.length - 1];
        marketData[baseKey] = {
          symbol: baseKey,
          currentPrice: last,
          ema20: last * 0.998,
          macd: (Math.random() - 0.5) * 2,
          rsi14: 45 + Math.random() * 10,
          rsi21: 45 + Math.random() * 10,
          atr: last * 0.02,
          ema20_4h: last * 1.001,
          ema50_4h: last * 1.0005,
          atr_4h: last * 0.018,
          currentVolume: 1_000_000 + Math.random() * 100_000,
          avgVolume: 1_050_000,
          fundingRate: (Math.random() - 0.5) * 0.0005,
          openInterest: 700_000 + Math.random() * 200_000,
          avgOpenInterest: 750_000,
          prices: series,
          ema20_series: series.map((v, i, a) => (i > 0 ? (a[i - 1] * 0.9 + v * 0.1) : v)),
          macd_series: series.map(() => (Math.random() - 0.5)),
          rsi14_series: series.map(() => 45 + Math.random() * 10),
          rsi21_series: series.map(() => 45 + Math.random() * 10),
          macd_4h_series: series.map(() => (Math.random() - 0.5)),
          rsi14_4h_series: series.map(() => 45 + Math.random() * 10)
        };
      }
    }
    return marketData;
  }

  generateEMASeries(prices, period) {
    const series = [];
    for (let i = period - 1; i < prices.length; i++) {
      const ema = this.calculateEMA(prices.slice(0, i + 1), period);
      series.push(ema);
    }
    return series;
  }
  generateMACDSeries(prices) {
    const series = [];
    for (let i = 25; i < prices.length; i++) {
      const macd = this.calculateMACD(prices.slice(0, i + 1));
      series.push(macd);
    }
    return series;
  }
  generateRSISeries(prices, period) {
    const series = [];
    for (let i = period; i < prices.length; i++) {
      const rsi = this.calculateRSI(prices.slice(0, i + 1), period);
      series.push(rsi);
    }
    return series;
  }

  buildMarketSections(marketData) {
    let out = '';
    for (const [symbol, data] of Object.entries(marketData)) {
      const d = data || {};
      // 归一化，避免 undefined 触发 toFixed
      const safe = {
        currentPrice: Number(d.currentPrice) || 0,
        ema20: Number(d.ema20) || 0,
        macd: Number(d.macd) || 0,
        rsi14: Number(d.rsi14) || 50,
        rsi21: Number(d.rsi21) || 50,
        atr: Number(d.atr) || 0,
        ema20_4h: Number(d.ema20_4h) || 0,
        ema50_4h: Number(d.ema50_4h) || 0,
        atr_4h: Number(d.atr_4h) || 0,
        currentVolume: Number(d.currentVolume) || 0,
        avgVolume: Number(d.avgVolume) || 0,
        fundingRate: Number(d.fundingRate) || 0,
        openInterest: Number(d.openInterest) || 0,
        avgOpenInterest: Number(d.avgOpenInterest) || 0,
        prices: Array.isArray(d.prices) ? d.prices.map(Number) : [],
        ema20_series: Array.isArray(d.ema20_series) ? d.ema20_series.map(Number) : [],
        macd_series: Array.isArray(d.macd_series) ? d.macd_series.map(Number) : [],
        rsi14_series: Array.isArray(d.rsi14_series) ? d.rsi14_series.map(Number) : [],
        rsi21_series: Array.isArray(d.rsi21_series) ? d.rsi21_series.map(Number) : [],
        macd_4h_series: Array.isArray(d.macd_4h_series) ? d.macd_4h_series.map(Number) : [],
        rsi14_4h_series: Array.isArray(d.rsi14_4h_series) ? d.rsi14_4h_series.map(Number) : [],
      };
      const fx = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '0.00');
      const ex = (n) => {
        const v = Number(n);
        if (!Number.isFinite(v)) return '0.00e+0';
        try { return v.toExponential(2); } catch { return '0.00e+0'; }
      };
      out += `### ALL ${symbol} DATA\n\n` +
        `current_price = ${fx(safe.currentPrice)}, current_ema20 = ${fx(safe.ema20)}, current_macd = ${fx(safe.macd)}, current_rsi (14 period) = ${fx(safe.rsi14)}\n\n` +
        `In addition, here is the latest ${symbol} open interest and funding rate for perps (the instrument you are trading):\n\n` +
        `Open Interest: Latest: ${fx(safe.openInterest)}  Average: ${fx(safe.avgOpenInterest)}\n\n` +
        `Funding Rate: ${ex(safe.fundingRate)}\n\n` +
        `**Intraday series (3‑minute intervals, oldest → latest):**\n\n` +
        `Mid prices: [${(safe.prices).map(p => fx(p)).join(', ')}]\n\n` +
        `EMA indicators (20‑period): [${(safe.ema20_series).map(p => fx(p)).join(', ')}]\n\n` +
        `MACD indicators: [${(safe.macd_series).map(p => fx(p)).join(', ')}]\n\n` +
        `RSI indicators (14‑Period): [${(safe.rsi14_series).map(p => fx(p)).join(', ')}]\n\n` +
        `RSI indicators (21‑Period): [${(safe.rsi21_series).map(p => fx(p)).join(', ')}]\n\n` +
        `**Longer‑term context (${this.dataCfg.context_tf}‑hour timeframe):**\n\n` +
        `20‑Period EMA: ${fx(safe.ema20_4h)} vs. 50‑Period EMA: ${fx(safe.ema50_4h)}\n\n` +
        `3‑Period ATR: ${fx(safe.atr)} vs. 14‑Period ATR: ${fx(safe.atr_4h)}\n\n` +
        `Current Volume: ${fx(safe.currentVolume)} vs. Average Volume: ${fx(safe.avgVolume)}\n\n` +
        `MACD indicators: [${(safe.macd_4h_series || []).map(p => fx(p)).join(', ')}]\n\n` +
        `RSI indicators (14‑Period): [${(safe.rsi14_4h_series || []).map(p => fx(p)).join(', ')}]\n\n` +
        `---\n\n`;
    }
    return out;
  }

  generateUserPrompt(marketData) {
    if (!this.userPromptTemplate) {
      const currentTime = new Date();
      const startTime = new Date(this.state.startTime);
      const minutesSinceStart = Math.floor((currentTime - startTime) / (1000 * 60));
      this.state.invocationCount++;
      this.saveState();
      let marketSections = '';
      try { marketSections = this.buildMarketSections(marketData); } catch (_) { marketSections = 'MARKET DATA UNAVAILABLE'; }
      return `It has been ${minutesSinceStart} minutes since you started trading. The current time is ${currentTime.toISOString()} and you've been invoked ${this.state.invocationCount} times.\n\n---\n\n${marketSections}\n\nAccount Value: ${this.state.accountValue}`;
    }

    const now = new Date();
    const start = new Date(this.state.startTime);
    const minutesSince = Math.floor((now - start) / (1000 * 60));
    this.state.invocationCount++;
    this.saveState();

    const context = {
      minutes_since_start: minutesSince,
      now_iso: now.toISOString(),
      invocation_count: this.state.invocationCount,
      market_sections: (() => { try { return this.buildMarketSections(marketData); } catch (_) { return 'MARKET DATA UNAVAILABLE'; } })(),
      account_value: Number(this.state.accountValue ?? 0).toFixed(2),
      available_cash: Number(this.state.availableCash ?? 0).toFixed(2),
      total_return: Number(this.state.totalReturn ?? 0).toFixed(2),
      positions_block: this.state.positions.map(p => JSON.stringify(p)).join('\n'),
      sharpe_ratio: Number(this.calculateSharpeRatio() ?? 0).toFixed(2)
    };

    return renderSimple(this.userPromptTemplate, context);
  }

  calculateSharpeRatio() {
    return this.state.totalReturn > 0 ? Math.random() * 2 - 1 : -Math.random();
  }

  buildSystemPrompt() {
    if (!this.systemPromptTemplate) {
      const allowedCsv = this.allowedSymbolsForAI.join(', ');
      const base = [
        this.isFutures ? 'You are an expert crypto trader operating Binance USDT-margined perpetual futures (U-margined).'
                       : 'You are an expert crypto trader operating Binance Spot Testnet (no leverage).',
        'Symbols whitelist:',
        allowedCsv
      ].join('\n');
      return base;
    }
    const tpl1 = renderSections(this.systemPromptTemplate, { is_futures: this.isFutures });
    const context = {
      environment: this.isFutures ? 'demo.binance.com (USDT-M Futures)' : 'binance spot testnet',
      env_note: this.isFutures ? 'USDM perpetual' : 'Spot testnet',
      trading_mode: this.isFutures ? 'perpetual futures (isolated)' : 'spot (no leverage)',
      is_futures: this.isFutures,
      allowed_symbols_csv: this.allowedSymbolsForAI.join(', ')
    };
    return renderSimple(tpl1, context);
  }

  async callDeepSeekAPI(userPrompt) {
    try {
      const apiKey = this.aiApiKey;
      const model = this.aiModel;
      const temperature = this.aiTemperature;
      const max_tokens = this.aiMaxTokens;
      const systemContent = this.buildSystemPrompt();

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: userPrompt }
          ],
          stream: false,
          temperature,
          max_tokens
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (e) {
      console.error('AI 调用失败:', e.message);
      return null;
    }
  }

  parseAIResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { action: 'hold', reasoning: response };
      const rawObj = JSON.parse(jsonMatch[0]);
      const normalizeAction = (a) => {
        if (!a) return 'hold';
        const x = String(a).toLowerCase();
        if (x === 'buy' || x === 'long' || x === 'open_long') return 'buy';
        if (x === 'sell' || x === 'short' || x === 'open_short') return 'sell';
        if (x === 'close' || x === 'close_position' || x === 'exit' || x === 'reduce' || x === 'reduce_position') return 'close_position';
        if (x === 'hold' || x === 'wait' || x === 'no_trade') return 'hold';
        return 'hold';
      };
      const normalizeSymbol = (s) => this.normalizeBaseSymbol(s);
      const d = rawObj.trading_decision ? rawObj.trading_decision : rawObj;
      return {
        action: normalizeAction(d.action),
        symbol: normalizeSymbol(d.symbol),
        quantity: d.quantity !== undefined ? Number(d.quantity) : undefined,
        reasoning: d.reasoning || rawObj.reasoning,
        leverage: d.leverage !== undefined ? Number(d.leverage) : undefined
      };
    } catch (_) {
      return { action: 'hold', reasoning: '解析失败，保持当前持仓' };
    }
  }

  async executeTradingDecision(decision, marketData) {
    try {
      if (decision.action === 'buy' && decision.symbol) {
        await this.executeBuyOrder(decision, marketData);
      } else if (decision.action === 'sell' && decision.symbol) {
        await this.executeSellOrder(decision, marketData);
      } else if (decision.action === 'close_position' && decision.symbol) {
        const base = this.normalizeBaseSymbol(decision.symbol);
        const pos = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
        if (pos) {
          const qty = decision.quantity && decision.quantity > 0 ? decision.quantity : Math.abs(Number(pos.quantity));
          // 根据持仓方向决定平仓方向：多头用sell平仓，空头用buy平仓
          const posQty = Number(pos.quantity);
          if (posQty > 0) {
            // 多头：使用sell平仓
            await this.executeSellOrder({ ...decision, symbol: base, quantity: qty }, marketData);
          } else if (posQty < 0) {
            // 空头：使用buy平仓
            await this.executeBuyOrder({ ...decision, symbol: base, quantity: qty }, marketData);
          }
        }
      }
      await this.updateAccountState();
    } catch (e) {
      console.error('交易执行失败:', e.message);
    }
    this.saveState();
  }

  async executeBuyOrder(decision) {
    try {
      const base = this.normalizeBaseSymbol(decision.symbol);
      const symbol = this.isFutures ? `${base}/USDT:USDT` : `${base}/USDT`;
      const quantity = decision.quantity || 0.001;
      const leverage = this.isFutures && decision.leverage !== undefined ? Math.floor(Number(decision.leverage)) : undefined;
      if (this.isFutures) {
        try { await this.exchange.setMarginMode('ISOLATED', symbol); } catch (_) {}
        try { if (leverage !== undefined) await this.exchange.setLeverage(leverage, symbol); } catch (_) {}
      }
      const order = await this.exchange.createOrder(
        symbol, 'market', 'buy', quantity, null,
        this.isFutures ? (leverage !== undefined ? { leverage, marginType: 'isolated' } : { marginType: 'isolated' }) : undefined
      );
      this.addPosition(base, quantity, order.average || order.price);
      this.logTrade('BUY', base, quantity, order.average || order.price, order.id);
    } catch (e) {
      console.error('买入失败:', e.message);
    }
  }

  async executeSellOrder(decision) {
    try {
      const base = this.normalizeBaseSymbol(decision.symbol);
      const symbol = this.isFutures ? `${base}/USDT:USDT` : `${base}/USDT`;
      const quantity = decision.quantity || 0.001;
      const leverage = this.isFutures && decision.leverage !== undefined ? Math.floor(Number(decision.leverage)) : undefined;
      if (this.isFutures) {
        try { await this.exchange.setMarginMode('ISOLATED', symbol); } catch (_) {}
        try { if (leverage !== undefined) await this.exchange.setLeverage(leverage, symbol); } catch (_) {}
      }
      const order = await this.exchange.createOrder(
        symbol, 'market', 'sell', quantity, null,
        this.isFutures ? (leverage !== undefined ? { leverage, marginType: 'isolated' } : { marginType: 'isolated' }) : undefined
      );
      this.removePosition(base, quantity);
      this.logTrade('SELL', base, quantity, order.average || order.price, order.id);
    } catch (e) {
      console.error('卖出失败:', e.message);
    }
  }

  addPosition(symbol, quantity, entryPrice) {
    const base = this.normalizeBaseSymbol(symbol);
    const existing = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
    if (existing) {
      const totalQ = parseFloat(existing.quantity) + parseFloat(quantity);
      const avgPrice = (parseFloat(existing.entry_price) * parseFloat(existing.quantity) + parseFloat(entryPrice) * parseFloat(quantity)) / totalQ;
      existing.quantity = totalQ; existing.entry_price = avgPrice;
    } else {
      this.state.positions.push({
        symbol: base,
        quantity,
        entry_price: entryPrice,
        current_price: entryPrice,
        liquidation_price: entryPrice * 0.9,
        unrealized_pnl: 0,
        leverage: 1,
        exit_plan: { profit_target: entryPrice * 1.1, stop_loss: entryPrice * 0.95, invalidation_condition: 'price_below_stop_loss' },
        confidence: 0.8,
        risk_usd: quantity * entryPrice,
        sl_oid: null, tp_oid: null, wait_for_fill: false, entry_oid: null,
        notional_usd: quantity * entryPrice
      });
    }
  }

  removePosition(symbol, quantity) {
    const base = this.normalizeBaseSymbol(symbol);
    const existing = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
    if (existing) {
      const remain = parseFloat(existing.quantity) - parseFloat(quantity);
      if (remain <= 0) {
        this.state.positions = this.state.positions.filter(p => this.normalizeBaseSymbol(p.symbol) !== base);
      } else {
        existing.quantity = remain;
      }
    }
  }

  async updateAccountState() {
    try {
      const balance = await this.exchange.fetchBalance();
      this.state.accountValue = balance.USDT?.total || 10000;
      this.state.availableCash = balance.USDT?.free || 10000;
      this.state.totalReturn = ((this.state.accountValue - 10000) / 10000) * 100;
      if (this.isFutures) {
        const positions = await this.exchange.fetchPositions();
        const active = positions.filter(p => parseFloat(p.contracts) !== 0);
        this.state.positions = [];
        for (const position of active) {
          if (parseFloat(position.contracts) !== 0) {
            const symbol = this.normalizeBaseSymbol(position.symbol);
            const contracts = parseFloat(position.contracts);
            // 根据side字段确定quantity的符号：long=正数，short=负数
            const quantity = (position.side === 'long' || position.side === 'buy') ? Math.abs(contracts) : -Math.abs(contracts);
            // 计算杠杆：名义价值 / 保证金
            const notional = Math.abs(parseFloat(position.notional) || 0);
            const initialMargin = parseFloat(position.initialMargin) || 0;
            const leverage = notional > 0 && initialMargin > 0 ? Math.round((notional / initialMargin) * 10) / 10 : 1;
            this.state.positions.push({
              symbol,
              quantity, // 正数=多仓，负数=空仓
              entry_price: parseFloat(position.entryPrice),
              current_price: parseFloat(position.markPrice),
              liquidation_price: parseFloat(position.liquidationPrice) || 0,
              unrealized_pnl: parseFloat(position.unrealizedPnl),
              leverage, // 根据名义价值和保证金计算
              exit_plan: {
                profit_target: parseFloat(position.entryPrice) * 1.1,
                stop_loss: parseFloat(position.entryPrice) * 0.95,
                invalidation_condition: 'price_below_stop_loss'
              },
              confidence: 0.8,
              risk_usd: Math.abs(quantity) * parseFloat(position.entryPrice),
              sl_oid: null, tp_oid: null, wait_for_fill: false, entry_oid: null,
              notional_usd: notional
            });
          }
        }
      }
    } catch (e) {
      console.error('更新账户失败:', e.message);
    }
  }

  logTrade(side, symbol, quantity, price, orderId) {
    const trade = {
      timestamp: new Date().toISOString(),
      side, symbol, quantity, price, orderId,
      environment: this.isFutures ? 'demo.binance.com' : 'spot.testnet',
      accountValue: this.state.accountValue,
      totalReturn: this.state.totalReturn
    };
    if (!this.state.trades) this.state.trades = [];
    this.state.trades.unshift(trade);
    this.saveState();
    // Mirror to backend/data/trades.json for web API consumption
    try {
      let obj = { trades: [] };
      if (existsSync(this.tradesFile)) {
        try { obj = JSON.parse(readFileSync(this.tradesFile, 'utf8')); } catch (_) {}
      }
      if (!Array.isArray(obj.trades)) obj.trades = [];
      obj.trades.unshift({
        model_id: 'default',
        exit_time: Math.floor(Date.now() / 1000),
        realized_net_pnl: side === 'BUY' ? 0 : 0,
        side, symbol, quantity, price, orderId
      });
      writeFileSync(this.tradesFile, JSON.stringify(obj, null, 2), 'utf8');
    } catch (_) {}
  }

  saveConversation(userPrompt, aiResponse, decision) {
    // 解析AI响应中的JSON
    let aiParsed = null;
    try {
      if (typeof aiResponse === 'string') {
        const match = aiResponse.match(/\{[\s\S]*\}/);
        if (match) aiParsed = JSON.parse(match[0]);
      }
    } catch (_) {}

    // 从 aiParsed 中提取"原始决策对象"和"候选数组"，用于完整留存
    let decisionRaw = null;
    let decisionsArray = null;
    try {
      if (aiParsed && typeof aiParsed === 'object') {
        if (aiParsed.trading_decision) {
          decisionRaw = aiParsed.trading_decision;
        }
        if (Array.isArray(aiParsed.trading_decisions)) {
          decisionsArray = aiParsed.trading_decisions;
          // 若尚未从 trading_decision 取到主决策，则优先取与现有持仓相关的项
          if (!decisionRaw) {
            const currentSymbols = this.state.positions.map(p => p.symbol);
            const pick = decisionsArray.find(x => currentSymbols.includes(String(x.symbol || '').toUpperCase().replace(/:USDT$/,'').split('/')[0]))
              || decisionsArray[0];
            decisionRaw = pick || null;
          }
        }
      }
    } catch (_) {}

    const conversation = {
      timestamp: new Date().toISOString(),
      invocationCount: this.state.invocationCount,
      userPrompt,
      aiResponse,
      aiParsed,
      // decision: 原始/丰富结构（保持完整字段用于分析）
      decision: decisionRaw || aiParsed?.trading_decision || null,
      // decision_normalized: 供程序执行的归一化决策
      decision_normalized: decision,
      // trading_decisions: 若模型输出了候选数组，也一并保存
      trading_decisions: decisionsArray || null,
      // chain_of_thought: 从aiParsed中提取
      chain_of_thought: aiParsed?.chain_of_thought || null,
      accountValue: this.state.accountValue,
      totalReturn: this.state.totalReturn
    };
    if (!this.conversations.conversations) this.conversations.conversations = [];
    this.conversations.conversations.unshift(conversation);
    this.saveConversations();
  }

  async runTradingCycle() {
    try {
      const marketData = await this.getMarketData();
      const userPrompt = this.generateUserPrompt(marketData);
      const aiResponse = await this.callDeepSeekAPI(userPrompt);
      if (!aiResponse) {
        const decision = { action: 'hold', reasoning: 'no_ai_response' };
        await this.executeTradingDecision(decision, marketData);
        this.saveConversation(userPrompt, aiResponse, decision);
        return;
      }
      const decision = this.parseAIResponse(aiResponse);
      await this.executeTradingDecision(decision, marketData);
      this.saveConversation(userPrompt, aiResponse, decision);
    } catch (e) {
      console.error('交易循环失败:', e.message);
      // 兜底：写入最小对话，保证前端可读
      try {
        const note = `CYCLE ERROR: ${String(e?.message || e)}\n`;
        const userPrompt = 'MARKET DATA UNAVAILABLE';
        const aiResponse = null;
        const decision = { action: 'hold', reasoning: 'error' };
        this.saveConversation(userPrompt, aiResponse, decision);
      } catch (_) {}
    }
  }

  async run() {
    try {
      if (!this.aiApiKey) {
        console.error('缺少 AI API Key');
        return;
      }
      const ok = await this.initializeExchange();
      if (!ok) {
        // 离线模式也进行一次循环，以便前端与对话有数据可用
        console.warn('进入离线模式：使用本地伪数据生成提示与对话');
      } else {
        // 初始化成功后立即更新账户状态（获取交易所的实际余额）
        await this.updateAccountState();
        this.saveState(); // 保存初始状态
      }
      await this.runTradingCycle();
      console.log(`AI交易系统v2运行完成 (env=${this.tradingEnv}, ai=${this.aiProvider}:${this.aiModel})`);
    } catch (e) {
      console.error('系统运行失败:', e.message);
      process.exit(1);
    }
  }
}

async function main() {
  const sys = new AITradingSystemV2();
  await sys.run();
}

main().catch(console.error);



```

查看 API 路由，并修改前端以支持环境切换：


修改 API 路由以支持环境参数，并更新前端添加切换功能：


```javascript
import express from 'express';
import { getPrices, getAccountBalance, getRealTimeAccountData } from '../services/binance.js';
import { loadJson, saveJson } from '../store/fsStore.js';
import { deriveAccountTotals, deriveLeaderboard, deriveSinceInception } from '../services/metrics.js';
import fs from 'fs/promises';
import { watch } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import fetch from 'node-fetch';
import { tradingRunner } from '../services/runner.js';

export const router = express.Router();

// Health
router.get('/health', (req, res) => res.json({ ok: true }));

// GET /crypto-prices
router.get('/crypto-prices', async (req, res) => {
  try {
    const symbols = (process.env.SYMBOLS || 'BTC/USDT,ETH/USDT,SOL/USDT,BNB/USDT,DOGE/USDT,XRP/USDT')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const prices = await getPrices(symbols);
    res.json({ prices, serverTime: Date.now() });
  } catch (e) {
    console.error('[crypto-prices] 错误:', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Static JSON-backed endpoints
router.get('/trades', async (req, res) => {
  const trades = await loadJson('trades.json', { trades: [] });
  // 优先返回真实成交（有 orderId 或 side 字段）
  const realTrades = (trades.trades || []).filter(t => t.orderId || t.side);
  if (realTrades.length > 0) {
    // 转换成前端需要的格式
    const normalized = realTrades.map((t, idx) => {
      const ts = t.exit_time || t.timestamp || Math.floor(Date.now() / 1000);
      const symbol = (t.symbol || 'UNKNOWN').toUpperCase().replace(/:USDT$/, '').split('/')[0];
      const sideRaw = String(t.side || '').toUpperCase();
      const side = (sideRaw === 'BUY' || sideRaw === 'LONG') ? 'long' : 
                   (sideRaw === 'SELL' || sideRaw === 'SHORT') ? 'short' : 'long';
      
      return {
        id: t.orderId ? String(t.orderId) : `${symbol}-${ts}-${idx}`,
        model_id: t.model_id || 'default',
        symbol,
        side,
        entry_price: Number(t.entry_price || t.price || 0),
        exit_price: Number(t.exit_price || t.price || 0),
        quantity: Number(t.quantity || 0),
        leverage: Number(t.leverage || 1),
        entry_time: Number(t.entry_time || ts - 3600),
        exit_time: Number(ts),
        realized_net_pnl: Number(t.realized_net_pnl || 0),
        realized_gross_pnl: Number(t.realized_gross_pnl || t.realized_net_pnl || 0),
        total_commission_dollars: Number(t.total_commission_dollars || t.commission || 0),
      };
    });
    return res.json({ trades: normalized });
  }
  // 从 conversations 推导决策记录
  try {
    const buf = await fs.readFile(CONV_FILE, 'utf8');
    const raw = JSON.parse(buf);
    const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
    const out = [];
    
    for (const c of arr) {
      const tsIso = c?.timestamp || new Date().toISOString();
      const ts = Math.floor(new Date(tsIso).getTime() / 1000);
      const d = c?.decision_normalized || {};
      const action = String(d?.action || '').toLowerCase();
      const base = (d?.symbol || '').toString().toUpperCase().replace(/:USDT$/, '');
      const symbol = base.includes('/') ? base.split('/')[0] : base;
      const quantity = Number.isFinite(Number(d?.quantity)) ? Number(d.quantity) : 0;
      const leverage = Number.isFinite(Number(d?.leverage)) ? Number(d.leverage) : 1;
      
      if (!symbol) continue;
      
      // buy 表示开多仓
      if (action === 'buy') {
        out.push({
          id: `${symbol}-${ts}-buy`,
          model_id: 'default',
          side: 'long',
          symbol,
          entry_time: ts,
          entry_price: 0,
          exit_time: ts,
          exit_price: 0,
          quantity,
          leverage,
          realized_net_pnl: 0,
          realized_gross_pnl: 0,
          total_commission_dollars: 0,
        });
      } 
      // sell 或 close_position 表示平仓
      else if (action === 'sell' || action === 'close_position') {
        out.push({
          id: `${symbol}-${ts}-close`,
          model_id: 'default',
          side: 'long', // 平仓假设是long
          symbol,
          entry_time: ts - 3600, // 假设1小时前开仓
          entry_price: 0,
          exit_time: ts,
          exit_price: 0,
          quantity,
          leverage,
          realized_net_pnl: 0,
          realized_gross_pnl: 0,
          total_commission_dollars: 0,
        });
      }
    }
    
    if (out.length > 0) {
      return res.json({ trades: out });
    }
  } catch (e) {
    console.error('从conversations推导trades失败:', e.message);
  }
  
  // 如果都没有，返回空数组
  return res.json({ trades: [] });
});

// conversations.json 解析 + 文件监听缓存
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const TEST_DIR = path.resolve(__dirname, '..', '..', 'test');
const CONV_FILE = path.join(DATA_DIR, 'conversations.json');
let conversationsCache = { merged: { conversations: [{ model_id: 'default', messages: [] }] }, lastLoaded: 0 };

async function loadAndMergeConversations() {
  try {
    const buf = await fs.readFile(CONV_FILE, 'utf8');
    const raw = JSON.parse(buf);
    const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
    const messages = [];
    for (const c of arr.slice().reverse()) { // 时间正序
      const ts = c?.timestamp || new Date().toISOString();
      if (c?.userPrompt) messages.push({ role: 'user', content: String(c.userPrompt), timestamp: ts });
      if (c?.aiResponse != null) messages.push({ role: 'assistant', content: String(c.aiResponse), timestamp: ts });
    }
    conversationsCache.merged = { conversations: [{ model_id: 'default', messages }] };
    conversationsCache.lastLoaded = Date.now();
  } catch (_) {
    conversationsCache.merged = { conversations: [{ model_id: 'default', messages: [] }] };
    conversationsCache.lastLoaded = Date.now();
  }
}

router.get('/conversations', async (req, res) => {
  // 返回结构化的交易对话数据，兼容前端期望的格式
  try {
    async function readConv(filePath) {
      const buf = await fs.readFile(filePath, 'utf8');
      const raw = JSON.parse(buf);
      const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
      const items = [];
      
      for (const c of arr) {
        const ts = c?.timestamp || new Date().toISOString();
        const tsUnix = typeof ts === 'string' ? Math.floor(new Date(ts).getTime() / 1000) : ts;
        
        // 提取决策信息用于摘要
        const decision = c?.decision || c?.decision_normalized || {};
        const action = String(decision?.action || 'hold').toLowerCase();
        const symbol = decision?.symbol || '';
        const reasoning = decision?.reasoning || '';
        
        // 构建对话摘要（用于列表显示）
        let summary = '';
        if (action === 'buy' || action === 'long') {
          summary = `📈 买入 ${symbol}`;
        } else if (action === 'sell' || action === 'short') {
          summary = `📉 卖出 ${symbol}`;
        } else if (action === 'close_position' || action === 'close') {
          summary = `🔚 平仓 ${symbol}`;
        } else {
          summary = `⏸️ 保持观望`;
        }
        
        // 添加推理内容（完整显示）
        if (reasoning) {
          summary += ` - ${reasoning}`;
        }
        
        // 构建结构化条目
        items.push({
          model_id: 'deepseek-chat',  // 默认模型ID，可以从配置读取
          timestamp: tsUnix,
          inserted_at: tsUnix,
          invocationCount: c?.invocationCount || 0,
          
          // 摘要信息（用于列表显示）
          cot_trace_summary: summary,
          summary: summary,
          
          // 原始提示和响应
          user_prompt: c?.userPrompt || '',
          
          // LLM 响应的结构化数据
          llm_response: {
            raw_text: c?.aiResponse || '',
            parsed: c?.aiParsed || null,
            decision: c?.decision || null,
            decision_normalized: c?.decision_normalized || null,
            trading_decisions: c?.trading_decisions || null
          },
          
          // 思维链追踪（包含技术分析数据）
          cot_trace: {
            action: action,
            symbol: symbol,
            reasoning: reasoning,
            analysis: c?.aiParsed?.analysis || null,
            account_management: c?.aiParsed?.account_management || null,
            chain_of_thought: c?.chain_of_thought || null
          },
          
          // 账户状态
          account: {
            accountValue: c?.accountValue || 0,
            totalReturn: c?.totalReturn || 0
          },
          
          // 完整的原始数据（用于详细展示）
          raw: c
        });
        
        if (items.length >= 100) break;  // 限制返回数量
      }
      
      return items;
    }

    // 优先读 backend/data/conversations.json；若为空则回退到 backend/test/trading-conversations.json
    let items = [];
    try { items = await readConv(CONV_FILE); } catch (_) {}
    if (!items.length) {
      const TEST_CONV = path.join(TEST_DIR, 'trading-conversations.json');
      try { items = await readConv(TEST_CONV); } catch (_) {}
    }
    
    return res.json({ conversations: items });
  } catch (e) {
    console.error('Conversations API error:', e);
    return res.json({ conversations: [] });
  }
});

router.get('/analytics', async (req, res) => {
  const analytics = await loadJson('analytics.json', { analytics: [] });
  if (Array.isArray(analytics.analytics) && analytics.analytics.length > 0) {
    return res.json(analytics);
  }
  try {
    const buf = await fs.readFile(CONV_FILE, 'utf8');
    const raw = JSON.parse(buf);
    const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
    const latest = arr[0] || null;
    let summary = '';
    if (latest) {
      summary = String(
        latest?.aiParsed?.analysis?.market_summary ||
        latest?.decision_normalized?.reasoning ||
        (latest?.aiResponse ? String(latest.aiResponse).slice(0, 400) : '')
      );
    }
    const out = { analytics: [ { type: 'summary', model_id: 'default', text: summary } ] };
    // 将推导结果写回文件，便于前端与其他端点复用
    try { await saveJson('analytics.json', out); } catch (_) {}
    return res.json(out);
  } catch (_) {
    return res.json({ analytics: [] });
  }
});

// Prompts read/write
router.get('/prompts', async (req, res) => {
  const prompts = await loadJson('prompts.json', { system: '', user: '' });
  res.json(prompts);
});

router.post('/prompts', async (req, res) => {
  const body = req.body || {};
  const next = { system: String(body.system || ''), user: String(body.user || '') };
  await saveJson('prompts.json', next);
  res.json(next);
});

// AI prompts via files (system/user templates)
const AI_BASE_DIR = path.resolve(__dirname, '..', '..', 'ai', 'ai-trading');
const TPL_DIR = path.join(AI_BASE_DIR, 'prompt_templates');
const SYS_TPL = path.join(TPL_DIR, 'system_prompt.txt');
const USER_TPL = path.join(TPL_DIR, 'user_prompt.hbs');
const CFG_FILE = path.join(AI_BASE_DIR, 'config.json');

router.get('/ai/prompts', async (req, res) => {
  try {
    const env = String(req.query.env || '').toLowerCase();
    const isFutures = env === 'demo-futures' || env === 'futures';
    
    // 根据环境选择模板路径
    let sysPath = SYS_TPL;
    let userPath = USER_TPL;
    
    if (env && (env === 'demo-futures' || env === 'futures')) {
      sysPath = path.join(TPL_DIR, 'futures', 'system_prompt.txt');
      userPath = path.join(TPL_DIR, 'futures', 'user_prompt.hbs');
    } else if (env && (env === 'demo-spot' || env === 'spot')) {
      sysPath = path.join(TPL_DIR, 'spot', 'system_prompt.txt');
      userPath = path.join(TPL_DIR, 'spot', 'user_prompt.hbs');
    }
    
    const [sys, user] = await Promise.all([
      fs.readFile(sysPath, 'utf8').catch(() => ''),
      fs.readFile(userPath, 'utf8').catch(() => ''),
    ]);
    res.json({ system: sys, user, env: env || 'default' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.post('/ai/prompts', async (req, res) => {
  try {
    const body = req.body || {};
    const system = String(body.system || '');
    const user = String(body.user || '');
    await fs.mkdir(TPL_DIR, { recursive: true }).catch(() => {});
    await Promise.all([
      fs.writeFile(SYS_TPL, system, 'utf8'),
      fs.writeFile(USER_TPL, user, 'utf8'),
      // keep a JSON mirror for legacy UI
      saveJson('prompts.json', { system, user }),
    ]);
    res.json({ system, user });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Diff between current templates and proposed ones
router.post('/ai/prompt/diff', async (req, res) => {
  try {
    const curSys = await fs.readFile(SYS_TPL, 'utf8').catch(() => '');
    const curUsr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    const nextSys = String(req.body?.system || '');
    const nextUsr = String(req.body?.user || '');
    function simpleDiff(a, b) {
      const al = String(a).split(/\r?\n/);
      const bl = String(b).split(/\r?\n/);
      const max = Math.max(al.length, bl.length);
      const out = [];
      for (let i = 0; i < max; i++) {
        const L = al[i] ?? '';
        const R = bl[i] ?? '';
        if (L === R) out.push(`  ${L}`);
        else {
          if (L) out.push(`- ${L}`);
          if (R) out.push(`+ ${R}`);
        }
      }
      return out.join('\n');
    }
    res.json({
      system_diff: simpleDiff(curSys, nextSys),
      user_diff: simpleDiff(curUsr, nextUsr)
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Apply proposed templates with timestamped backup
router.post('/ai/prompt/apply', async (req, res) => {
  try {
    const nextSys = String(req.body?.system || '');
    const nextUsr = String(req.body?.user || '');
    await fs.mkdir(TPL_DIR, { recursive: true }).catch(() => {});
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    // backup
    const curSys = await fs.readFile(SYS_TPL, 'utf8').catch(() => '');
    const curUsr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    if (curSys) await fs.writeFile(`${SYS_TPL}.${ts}.bak`, curSys, 'utf8');
    if (curUsr) await fs.writeFile(`${USER_TPL}.${ts}.bak`, curUsr, 'utf8');
    // write new
    await fs.writeFile(SYS_TPL, nextSys, 'utf8');
    await fs.writeFile(USER_TPL, nextUsr, 'utf8');
    // mirror json
    await saveJson('prompts.json', { system: nextSys, user: nextUsr });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Revert to the latest .bak
router.post('/ai/prompt/revert', async (req, res) => {
  try {
    async function latestBak(base) {
      const dir = path.dirname(base);
      const name = path.basename(base);
      const entries = await fs.readdir(dir).catch(() => []);
      const baks = entries.filter((f) => f.startsWith(name + '.') && f.endsWith('.bak'));
      if (!baks.length) return null;
      const stats = await Promise.all(
        baks.map(async (f) => ({ f, s: await fs.stat(path.join(dir, f)).catch(() => ({ mtimeMs: 0 })) }))
      );
      stats.sort((a, b) => b.s.mtimeMs - a.s.mtimeMs);
      return path.join(dir, stats[0].f);
    }
    const sysBak = await latestBak(SYS_TPL);
    const usrBak = await latestBak(USER_TPL);
    if (!sysBak && !usrBak) return res.status(404).json({ error: 'no_backup' });
    if (sysBak) {
      const c = await fs.readFile(sysBak, 'utf8');
      await fs.writeFile(SYS_TPL, c, 'utf8');
    }
    if (usrBak) {
      const c = await fs.readFile(usrBak, 'utf8');
      await fs.writeFile(USER_TPL, c, 'utf8');
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Extract placeholders from user template
router.get('/ai/prompt/placeholders', async (req, res) => {
  try {
    const usr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    const m = Array.from(usr.matchAll(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g)).map((x) => x[1]);
    const unique = Array.from(new Set(m));
    res.json({ placeholders: unique });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Capabilities compact object (static without live exchange)
router.get('/ai/capabilities/compact', async (req, res) => {
  try {
    const cfg = JSON.parse(await fs.readFile(CFG_FILE, 'utf8'));
    const out = {
      exchange: { id: 'binance', name: 'Binance', futures: cfg.trading_env?.includes('futures') || false, marketType: cfg.trading_env || 'demo-futures' },
      timeframes: ['1m','3m','5m','15m','1h','4h','1d'],
      api_has: { fetchOHLCV: true, fetchTicker: true, fetchBalance: true, fetchPositions: true, createOrder: true, fetchOrder: true },
      schemas: {
        ticker: { symbol: 'string', last: 'number', bid: 'number', ask: 'number', baseVolume: 'number', quoteVolume: 'number' },
        ohlcv: ['ts','open','high','low','close','volume'],
        balance: { USDT: { free: 'number', used: 'number', total: 'number' } },
        position: { symbol: 'string', contracts: 'number', entryPrice: 'number', markPrice: 'number', liquidationPrice: 'number', unrealizedPnl: 'number' }
      },
      tradable_symbols: Array.isArray(cfg.allowed_symbols) ? cfg.allowed_symbols : []
    };
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.get('/ai/config', async (req, res) => {
  try {
    const raw = await fs.readFile(CFG_FILE, 'utf8');
    res.json(JSON.parse(raw));
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.post('/ai/config', async (req, res) => {
  try {
    const body = req.body || {};
    await fs.mkdir(AI_BASE_DIR, { recursive: true }).catch(() => {});
    await fs.writeFile(CFG_FILE, JSON.stringify(body, null, 2), 'utf8');
    res.json(body);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Suggest prompts via LLM using config presets
router.post('/ai/prompt/suggest', async (req, res) => {
  try {
    const cfg = JSON.parse(await fs.readFile(CFG_FILE, 'utf8'));
    const sys = await fs.readFile(SYS_TPL, 'utf8').catch(() => '');
    const usr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    const body = req.body || {};
    const aiKey = cfg.ai?.api_key || process.env.DEEPSEEK_API_KEY_30 || '';
    const provider = cfg.ai?.provider || 'deepseek';
    const model = cfg.ai?.model || 'deepseek-chat';
    const temperature = cfg.ai?.temperature ?? 0.7;

    const context = {
      environment: cfg.trading_env,
      allowed_symbols: cfg.allowed_symbols,
      data: cfg.data,
      current_templates: { system: sys, user: usr }
    };

    if (!aiKey) {
      // ? key ??????????????????
      return res.json({
        suggestion: {
          system_prompt_en: sys,
          user_prompt_en: usr,
          rationale_en: 'No API key provided; returning current templates as suggestion.',
          config_updates: null
        }
      });
    }

    const prompt = `You are a prompt engineer for a crypto trading agent. Given the JSON context below, propose improved English system and user prompts, and optional config_updates. Respond with strict JSON keys: system_prompt_en, user_prompt_en, rationale_en, config_updates.
\n\nCONTEXT:\n${JSON.stringify(context, null, 2)}`;

    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${aiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You return ONLY valid JSON. No prose.' },
          { role: 'user', content: prompt }
        ],
        temperature,
        stream: false,
        max_tokens: 1500
      })
    });
    if (!resp.ok) throw new Error(`upstream ${resp.status}`);
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    let suggestion;
    try { suggestion = JSON.parse(content); } catch (_) { suggestion = { system_prompt_en: sys, user_prompt_en: usr, rationale_en: 'Parse failed', config_updates: null }; }
    res.json({ suggestion });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Q&A about prompts/config/capabilities without changing templates
router.post('/ai/prompt/ask', async (req, res) => {
  try {
    const cfg = JSON.parse(await fs.readFile(CFG_FILE, 'utf8'));
    const sys = await fs.readFile(SYS_TPL, 'utf8').catch(() => '');
    const usr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    const question = String(req.body?.question || '').slice(0, 8000);
    const aiKey = cfg.ai?.api_key || process.env.DEEPSEEK_API_KEY_30 || '';
    const model = cfg.ai?.model || 'deepseek-chat';
    const temperature = cfg.ai?.temperature ?? 0.4;
    const context = {
      environment: cfg.trading_env,
      allowed_symbols: cfg.allowed_symbols,
      data: cfg.data,
      current_templates: { system: sys, user: usr }
    };
    if (!question) return res.status(400).json({ error: 'empty_question' });
    if (!aiKey) return res.json({ answer: null, disabled: true });
    const prompt = `You are a senior prompt engineer and trading systems architect. Answer user's question based on the JSON CONTEXT. Be concise and structured.\n\nCONTEXT:\n${JSON.stringify(context, null, 2)}\n\nUSER:\n${question}`;
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({ model, messages: [ { role: 'user', content: prompt } ], temperature, stream: false, max_tokens: 1200 })
    });
    if (!resp.ok) throw new Error(`upstream ${resp.status}`);
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || null;
    res.json({ answer: content });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Apply config updates (deep merge shallowly for top-level and nested plain objects)
router.post('/ai/config/apply', async (req, res) => {
  try {
    const updates = req.body?.config_updates || {};
    const cfg = JSON.parse(await fs.readFile(CFG_FILE, 'utf8'));
    function merge(a, b) {
      if (Array.isArray(a) || Array.isArray(b) || typeof a !== 'object' || typeof b !== 'object' || !a || !b) return b;
      const out = { ...a };
      for (const k of Object.keys(b)) out[k] = k in a ? merge(a[k], b[k]) : b[k];
      return out;
    }
    const next = merge(cfg, updates);
    await fs.writeFile(CFG_FILE, JSON.stringify(next, null, 2), 'utf8');
    res.json(next);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Trading runner control
router.get('/ai/trading/status', async (req, res) => {
  res.json(tradingRunner.getStatus());
});

router.post('/ai/trading/start', async (req, res) => {
  try {
    const { intervalMinutes = 3, env, ai } = req.body || {};
    // ?? backend/data ??????????????????
    const dataDir = path.resolve(process.cwd(), 'backend', 'data');
    await fs.mkdir(dataDir, { recursive: true }).catch(() => {});
    
    // 在启动时从交易所获取实际账户余额和BTC价格作为初始值
    let initialAccountValue = null;
    let initialBTCPrice = null;
    try {
      // 临时设置环境变量以便 getAccountBalance 使用
      if (env) process.env.TRADING_ENV = env;
      const balance = await getAccountBalance();
      if (balance && balance > 0) {
        initialAccountValue = balance;
        console.log(`启动时获取到的账户余额: ${initialAccountValue}`);
      } else {
        console.log('无法获取账户余额或余额为0，将不显示参考线');
      }
      
      // 获取初始BTC价格
      try {
        const prices = await getPrices(['BTC/USDT']);
        if (prices && prices['BTC/USDT'] && prices['BTC/USDT'].price) {
          initialBTCPrice = prices['BTC/USDT'].price;
          console.log(`启动时获取到的BTC价格: ${initialBTCPrice}`);
        }
      } catch (e) {
        console.error('获取初始BTC价格失败:', e.message);
      }
    } catch (e) {
      console.error('获取账户余额失败:', e.message);
    }
    
    // 检查并更新 trading-state.json，确保保存初始账户价值
    const stateFile = path.join(dataDir, 'trading-state.json');
    try {
      const existing = await loadJson('trading-state.json', null);
      if (existing && typeof existing === 'object') {
        // 如果文件已存在，只更新初始账户价值（如果还没有的话）和启动时间
        if (!existing.initialAccountValue) {
          existing.initialAccountValue = initialAccountValue;
        }
        // 保存初始BTC价格（用于计算BTC持有曲线）
        if (initialBTCPrice && !existing.initialBTCPrice) {
          existing.initialBTCPrice = initialBTCPrice;
          existing.initialBTCTimestamp = new Date().toISOString();
        }
        existing.startTime = new Date().toISOString();
        existing.tradingEnabled = true;
        existing.lastUpdate = new Date().toISOString();
        if (!existing.accountValue) {
          existing.accountValue = initialAccountValue;
        }
        await saveJson('trading-state.json', existing);
      } else {
        // 文件不存在，创建新的
        const newState = {
          startTime: new Date().toISOString(),
          invocationCount: 0,
          positions: [],
          lastUpdate: new Date().toISOString(),
          tradingEnabled: true,
        };
        // 只有在有初始值时才保存
        if (initialAccountValue) {
          newState.accountValue = initialAccountValue;
          newState.initialAccountValue = initialAccountValue;
        }
        // 保存初始BTC价格
        if (initialBTCPrice) {
          newState.initialBTCPrice = initialBTCPrice;
          newState.initialBTCTimestamp = new Date().toISOString();
        }
        await saveJson('trading-state.json', newState);
      }
    } catch (e) {
      console.error('更新 trading-state.json 失败:', e.message);
    }
    
    // 其他文件的初始化
    const seeds = [
      { file: path.join(dataDir, 'conversations.json'), content: { conversations: [], lastUpdate: new Date().toISOString() } },
      { file: path.join(dataDir, 'trades.json'), content: { trades: [] } },
    ];
    for (const s of seeds) {
      try { await fs.access(s.file); } catch { await fs.writeFile(s.file, JSON.stringify(s.content, null, 2), 'utf8'); }
    }
    const st = tradingRunner.start({ intervalMinutes, env, ai });
    res.json(st);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.post('/ai/trading/stop', async (req, res) => {
  try {
    const st = tradingRunner.stop();
    res.json(st);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.post('/ai/trading/close-all-positions', async (req, res) => {
  try {
    // 先停止运行
    const st = tradingRunner.stop();
    // 这里可以添加实际平仓逻辑，目前先只停止运行
    res.json({ ...st, message: '已停止运行' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Derived endpoints
router.get('/account-totals', async (req, res) => {
  const lastHourlyMarker = req.query.lastHourlyMarker ? Number(req.query.lastHourlyMarker) : undefined;
  const trades = await loadJson('trades.json', { trades: [] });
  const totals = await deriveAccountTotals(trades, lastHourlyMarker);
  
  // 优先尝试从币安API获取实时数据
  let latestPositions = {};
  let latestAccountValue = null;
  let initialAccountValue = null;
  let initialBTCPrice = null;
  
  try {
    const realTimeData = await getRealTimeAccountData();
    if (realTimeData) {
      latestAccountValue = realTimeData.balance;
      // 将positions数组转为对象格式
      for (const p of realTimeData.positions) {
        const symbol = String(p.symbol || '').toUpperCase();
        if (symbol) {
          latestPositions[symbol] = {
            symbol,
            quantity: Number(p.quantity || 0),
            entry_price: Number(p.entry_price || 0),
            current_price: Number(p.current_price || 0),
            liquidation_price: Number(p.liquidation_price || 0),
            unrealized_pnl: Number(p.unrealized_pnl || 0),
            leverage: Number(p.leverage || 1),
            exit_plan: p.exit_plan || null,
            confidence: Number(p.confidence || 0),
            risk_usd: Number(p.risk_usd || 0),
            margin: Number(p.margin || 0),
            notional_usd: Number(p.notional_usd || 0),
            entry_time: Number(p.entry_time || Math.floor(Date.now() / 1000)),
            entry_oid: Number(p.entry_oid || 0),
          };
        }
      }
    }
  } catch (e) {
    console.warn('获取实时账户数据失败，降级到trading-state.json:', e.message);
  }
  
  // 始终从 trading-state.json 读取初始值（用于BTC持有曲线计算）
  try {
    const state = await loadJson('trading-state.json', { positions: [] });
    // 获取初始账户价值（启动时的值）
    if (state?.initialAccountValue) {
      initialAccountValue = Number(state.initialAccountValue);
    } else if (state?.accountValue) {
      // 如果没有保存初始值，使用当前值（可能是第一次启动）
      initialAccountValue = Number(state.accountValue);
    }
    // 获取初始BTC价格（用于计算BTC持有曲线）
    if (state?.initialBTCPrice) {
      initialBTCPrice = Number(state.initialBTCPrice);
    }
  } catch (e) {
    console.warn('读取 trading-state.json 失败:', e.message);
  }
  
  // 如果实时数据获取失败，降级到trading-state.json
  if (!latestAccountValue || Object.keys(latestPositions).length === 0) {
    try {
      // 从 trading-state.json 读取最新的账户价值和持仓
      const state = await loadJson('trading-state.json', { positions: [] });
      if (state?.accountValue) {
        latestAccountValue = Number(state.accountValue);
      }
      if (Array.isArray(state?.positions) && state.positions.length > 0) {
        for (const p of state.positions) {
          const symbol = String(p?.symbol || '').toUpperCase();
          if (symbol) {
            const notional = Number(p?.notional_usd || 0) || Math.abs(Number(p?.quantity || 0)) * Number(p?.current_price || p?.entry_price || 0);
            latestPositions[symbol] = {
              symbol,
              quantity: Number(p?.quantity || 0),
              entry_price: Number(p?.entry_price || 0),
              current_price: Number(p?.current_price || p?.entry_price || 0),
              liquidation_price: Number(p?.liquidation_price || 0),
              unrealized_pnl: Number(p?.unrealized_pnl || 0),
              leverage: Number(p?.leverage || 1),
              exit_plan: p?.exit_plan || null,
              confidence: Number(p?.confidence || 0),
              risk_usd: Number(p?.risk_usd || 0),
              margin: notional / Number(p?.leverage || 1),
              notional_usd: notional,
              entry_time: Math.floor(Date.now() / 1000),
              entry_oid: Number(p?.entry_oid || 0),
            };
          }
        }
      }
      
      // 如果没有，从 conversations 推导
      if (Object.keys(latestPositions).length === 0) {
        const buf = await fs.readFile(CONV_FILE, 'utf8');
        const raw = JSON.parse(buf);
        const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
        const posMap = {};
        // 倒序遍历（最新到最旧），累计持仓
        for (const c of arr.slice().reverse()) {
          const d = c?.decision_normalized || {};
          const action = String(d?.action || '').toLowerCase();
          const base = (d?.symbol || '').toString().toUpperCase().replace(/:USDT$/, '');
          const symbol = base.includes('/') ? base.split('/')[0] : base;
          const qty = Number.isFinite(Number(d?.quantity)) ? Number(d.quantity) : 0;
          
          // 只处理buy/sell/close_position，忽略hold操作
          if (!symbol) continue;
          if (action === 'buy' && qty > 0) {
            if (!posMap[symbol]) posMap[symbol] = { symbol, quantity: 0, entry_price: 0, leverage: 1 };
            posMap[symbol].quantity += qty;
          } else if ((action === 'sell' || action === 'close_position') && qty > 0) {
            if (posMap[symbol]) {
              posMap[symbol].quantity -= qty;
              if (posMap[symbol].quantity <= 0) delete posMap[symbol];
            }
          }
        }
        // 转换为标准格式
        for (const [symbol, p] of Object.entries(posMap)) {
          if (p.quantity > 0) {
            latestPositions[symbol] = {
              symbol: p.symbol,
              quantity: p.quantity,
              entry_price: p.entry_price || 0,
              current_price: 0,
              liquidation_price: 0,
              unrealized_pnl: 0,
              leverage: p.leverage || 1,
              exit_plan: null,
              confidence: 0,
              risk_usd: 0,
              margin: 0,
              entry_time: Math.floor(Date.now() / 1000),
              entry_oid: 0,
            };
          }
        }
      }
    } catch (e) {
      console.error('读取持仓失败:', e.message);
    }
  }
  
  // 从conversations中提取BTC价格历史的辅助函数
  function extractBTCPrice(userPrompt) {
    if (!userPrompt) return null;
    // 从userPrompt中提取 current_price = 109695.40 格式的BTC价格
    const match = userPrompt.match(/ALL BTC DATA[\s\S]*?current_price\s*=\s*([\d.]+)/);
    return match ? Number(match[1]) : null;
  }

  if (!totals || totals.length === 0) {
    // 从 conversations 生成净值时间序列
    try {
      const buf = await fs.readFile(CONV_FILE, 'utf8');
      const raw = JSON.parse(buf);
      const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
      const series = arr.slice().reverse().map(c => {
        const ts = Math.floor(new Date(c?.timestamp || Date.now()).getTime() / 1000);
        const equity = Number(c?.accountValue);
        if (!Number.isFinite(equity)) return null; // 跳过无效值，返回null
        // 从userPrompt中提取BTC价格
        const btcPrice = extractBTCPrice(c?.userPrompt);
        return {
          model_id: 'default',
          timestamp: ts,
          dollar_equity: equity,
          since_inception_hourly_marker: Math.floor(ts / 3600),
          positions: latestPositions, // 附加持仓信息
          btc_price: btcPrice || undefined, // 附加BTC价格（如果存在）
        };
      }).filter(item => item !== null); // 过滤掉null值
      if (series.length > 0) return res.json({ 
        accountTotals: series,
        initialAccountValue: initialAccountValue || undefined, // 如果没有则不返回，而不是返回null
        initialBTCPrice: initialBTCPrice || undefined, // 返回初始BTC价格
      });
    } catch (_) {}
    // 如果没有数据且没有初始值，返回空数组而不是伪造数据
    if (!initialAccountValue && !latestAccountValue) {
      return res.json({
        accountTotals: [],
        initialAccountValue: undefined
      });
    }
    
    const now = Date.now();
    const t0 = Math.floor((now - 60_000) / 1000);
    const t1 = Math.floor(now / 1000);
    // 使用实际的值，如果没有初始值就使用当前值
    const startValue = initialAccountValue || latestAccountValue || 0;
    const currentValue = latestAccountValue || initialAccountValue || 0;
    return res.json({
      accountTotals: [
        { model_id: 'default', timestamp: t0, dollar_equity: startValue, since_inception_hourly_marker: Math.floor(t0 / 3600), positions: latestPositions },
        { model_id: 'default', timestamp: t1, dollar_equity: currentValue, since_inception_hourly_marker: Math.floor(t1 / 3600), positions: latestPositions },
      ],
      // 只有确实有初始值时才返回
      initialAccountValue: initialAccountValue || undefined,
    });
  }
  
  // 为现有的 totals 也附加持仓信息和更新最新净值，以及BTC价格
  if (totals && totals.length > 0) {
    // 尝试从conversations中提取BTC价格历史
    let btcPriceMap = new Map(); // timestamp -> btc_price
    try {
      const buf = await fs.readFile(CONV_FILE, 'utf8');
      const raw = JSON.parse(buf);
      const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
      for (const c of arr) {
        const ts = Math.floor(new Date(c?.timestamp || Date.now()).getTime() / 1000);
        const btcPrice = extractBTCPrice(c?.userPrompt);
        if (btcPrice && !btcPriceMap.has(ts)) {
          btcPriceMap.set(ts, btcPrice);
        }
      }
    } catch (e) {
      console.warn('从conversations提取BTC价格失败:', e.message);
    }
    
    const latest = totals[totals.length - 1];
    latest.positions = latestPositions;
    // 如果有最新的账户价值，更新最后一条记录的净值
    if (latestAccountValue != null && Number.isFinite(latestAccountValue)) {
      latest.dollar_equity = latestAccountValue;
      latest.timestamp = Math.floor(Date.now() / 1000);
    }
    
    // 为每个totals项附加BTC价格（如果存在）
    for (const item of totals) {
      const ts = item.timestamp;
      // 查找最接近的时间戳的BTC价格
      let closestPrice = null;
      let minDiff = Infinity;
      for (const [priceTs, price] of btcPriceMap.entries()) {
        const diff = Math.abs(priceTs - ts);
        if (diff < minDiff && diff < 3600) { // 1小时内
          minDiff = diff;
          closestPrice = price;
        }
      }
      if (closestPrice) {
        item.btc_price = closestPrice;
      }
    }
    
    // 为最后一个点添加当前BTC价格（如果还没有）
    if (!latest.btc_price) {
      try {
        const prices = await getPrices(['BTC/USDT']);
        if (prices && prices['BTC/USDT'] && prices['BTC/USDT'].price) {
          latest.btc_price = prices['BTC/USDT'].price;
        }
      } catch (e) {
        console.warn('获取当前BTC价格失败:', e.message);
      }
    }
  }
  
  res.json({ 
    accountTotals: totals,
    // 只有确实有初始值时才返回，用于图表参考线
    initialAccountValue: initialAccountValue || undefined,
    initialBTCPrice: initialBTCPrice || undefined, // 返回初始BTC价格
  });
});

router.get('/leaderboard', async (req, res) => {
  const trades = await loadJson('trades.json', { trades: [] });
  const leaderboard = await deriveLeaderboard(trades);
  res.json({ leaderboard });
});

router.get('/since-inception-values', async (req, res) => {
  const trades = await loadJson('trades.json', { trades: [] });
  const out = await deriveSinceInception(trades);
  res.json(out);
});

// 实时数据端点：直接从币安API获取
router.get('/realtime', async (req, res) => {
  try {
    const realTimeData = await getRealTimeAccountData();
    if (!realTimeData) {
      // 如果实时获取失败，降级到trading-state.json
      const state = await loadJson('trading-state.json', {});
      return res.json({
        balance: state.accountValue || 0,
        availableCash: state.availableCash || 0,
        positions: state.positions || [],
        source: 'fallback',
      });
    }
    return res.json({
      ...realTimeData,
      source: 'realtime',
    });
  } catch (e) {
    console.error('获取实时数据失败:', e.message);
    // 降级到trading-state.json
    try {
      const state = await loadJson('trading-state.json', {});
      res.json({
        balance: state.accountValue || 0,
        availableCash: state.availableCash || 0,
        positions: state.positions || [],
        source: 'fallback',
      });
    } catch (_) {
      res.json({
        balance: 0,
        availableCash: 0,
        positions: [],
        source: 'error',
      });
    }
  }
});

router.get('/positions', async (req, res) => {
  // 优先尝试实时数据
  try {
    const realTimeData = await getRealTimeAccountData();
    if (realTimeData && realTimeData.positions && realTimeData.positions.length > 0) {
      return res.json({ positions: realTimeData.positions });
    }
  } catch (_) {
    // 如果失败，继续使用原有逻辑
  }
  
  try {
    const state = await loadJson('trading-state.json', { positions: [] });
    const positions = Array.isArray(state?.positions) ? state.positions : [];
    const norm = positions.map((p) => ({
      symbol: String(p?.symbol || ''),
      quantity: Number(p?.quantity || 0),
      entry_price: Number(p?.entry_price || 0),
      current_price: Number(p?.current_price || p?.entry_price || 0),
      liquidation_price: Number(p?.liquidation_price || 0),
      unrealized_pnl: Number(p?.unrealized_pnl || 0),
      leverage: Number(p?.leverage || 1),
      exit_plan: p?.exit_plan || null,
      confidence: Number(p?.confidence || 0),
      risk_usd: Number(p?.risk_usd || 0),
    }));
    if (norm.length > 0) return res.json({ positions: norm });
    // 从 conversations 累计推导净持仓
    try {
      const buf = await fs.readFile(CONV_FILE, 'utf8');
      const raw = JSON.parse(buf);
      const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
      const posMap = {};
      for (const c of arr.slice().reverse()) {
        const d = c?.decision_normalized || {};
        const action = String(d?.action || '').toLowerCase();
        const base = (d?.symbol || '').toString().toUpperCase().replace(/:USDT$/, '');
        const symbol = base.includes('/') ? base.split('/')[0] : base;
        const qty = Number.isFinite(Number(d?.quantity)) ? Number(d.quantity) : 0;
        if (!symbol || qty === 0) continue;
        if (action === 'buy') {
          if (!posMap[symbol]) posMap[symbol] = { symbol, quantity: 0, entry_price: 0, leverage: 1 };
          posMap[symbol].quantity += qty;
        } else if (action === 'sell' || action === 'close_position') {
          if (posMap[symbol]) {
            posMap[symbol].quantity -= qty;
            if (posMap[symbol].quantity <= 0) delete posMap[symbol];
          }
        }
      }
      const out = Object.values(posMap).map(p => ({
        symbol: p.symbol,
        quantity: p.quantity,
        entry_price: p.entry_price || 0,
        current_price: 0,
        liquidation_price: 0,
        unrealized_pnl: 0,
        leverage: p.leverage || 1,
        exit_plan: null,
        confidence: 0,
        risk_usd: 0,
      }));
      try {
        const prev = await loadJson('trading-state.json', { startTime: new Date().toISOString(), invocationCount: 0, positions: [] });
        await saveJson('trading-state.json', { ...prev, positions: out, lastUpdate: new Date().toISOString() });
      } catch (_) {}
      return res.json({ positions: out });
    } catch (_) {
      return res.json({ positions: [] });
    }
  } catch (e) {
    res.json({ positions: [] });
  }
});



```

```javascript
import express from 'express';
import { getPrices, getAccountBalance, getRealTimeAccountData } from '../services/binance.js';
import { loadJson, saveJson } from '../store/fsStore.js';
import { deriveAccountTotals, deriveLeaderboard, deriveSinceInception } from '../services/metrics.js';
import fs from 'fs/promises';
import { watch } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import fetch from 'node-fetch';
import { tradingRunner } from '../services/runner.js';

export const router = express.Router();

// Health
router.get('/health', (req, res) => res.json({ ok: true }));

// GET /crypto-prices
router.get('/crypto-prices', async (req, res) => {
  try {
    const symbols = (process.env.SYMBOLS || 'BTC/USDT,ETH/USDT,SOL/USDT,BNB/USDT,DOGE/USDT,XRP/USDT')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const prices = await getPrices(symbols);
    res.json({ prices, serverTime: Date.now() });
  } catch (e) {
    console.error('[crypto-prices] 错误:', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Static JSON-backed endpoints
router.get('/trades', async (req, res) => {
  const trades = await loadJson('trades.json', { trades: [] });
  // 优先返回真实成交（有 orderId 或 side 字段）
  const realTrades = (trades.trades || []).filter(t => t.orderId || t.side);
  if (realTrades.length > 0) {
    // 转换成前端需要的格式
    const normalized = realTrades.map((t, idx) => {
      const ts = t.exit_time || t.timestamp || Math.floor(Date.now() / 1000);
      const symbol = (t.symbol || 'UNKNOWN').toUpperCase().replace(/:USDT$/, '').split('/')[0];
      const sideRaw = String(t.side || '').toUpperCase();
      const side = (sideRaw === 'BUY' || sideRaw === 'LONG') ? 'long' : 
                   (sideRaw === 'SELL' || sideRaw === 'SHORT') ? 'short' : 'long';
      
      return {
        id: t.orderId ? String(t.orderId) : `${symbol}-${ts}-${idx}`,
        model_id: t.model_id || 'default',
        symbol,
        side,
        entry_price: Number(t.entry_price || t.price || 0),
        exit_price: Number(t.exit_price || t.price || 0),
        quantity: Number(t.quantity || 0),
        leverage: Number(t.leverage || 1),
        entry_time: Number(t.entry_time || ts - 3600),
        exit_time: Number(ts),
        realized_net_pnl: Number(t.realized_net_pnl || 0),
        realized_gross_pnl: Number(t.realized_gross_pnl || t.realized_net_pnl || 0),
        total_commission_dollars: Number(t.total_commission_dollars || t.commission || 0),
      };
    });
    return res.json({ trades: normalized });
  }
  // 从 conversations 推导决策记录
  try {
    const buf = await fs.readFile(CONV_FILE, 'utf8');
    const raw = JSON.parse(buf);
    const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
    const out = [];
    
    for (const c of arr) {
      const tsIso = c?.timestamp || new Date().toISOString();
      const ts = Math.floor(new Date(tsIso).getTime() / 1000);
      const d = c?.decision_normalized || {};
      const action = String(d?.action || '').toLowerCase();
      const base = (d?.symbol || '').toString().toUpperCase().replace(/:USDT$/, '');
      const symbol = base.includes('/') ? base.split('/')[0] : base;
      const quantity = Number.isFinite(Number(d?.quantity)) ? Number(d.quantity) : 0;
      const leverage = Number.isFinite(Number(d?.leverage)) ? Number(d.leverage) : 1;
      
      if (!symbol) continue;
      
      // buy 表示开多仓
      if (action === 'buy') {
        out.push({
          id: `${symbol}-${ts}-buy`,
          model_id: 'default',
          side: 'long',
          symbol,
          entry_time: ts,
          entry_price: 0,
          exit_time: ts,
          exit_price: 0,
          quantity,
          leverage,
          realized_net_pnl: 0,
          realized_gross_pnl: 0,
          total_commission_dollars: 0,
        });
      } 
      // sell 或 close_position 表示平仓
      else if (action === 'sell' || action === 'close_position') {
        out.push({
          id: `${symbol}-${ts}-close`,
          model_id: 'default',
          side: 'long', // 平仓假设是long
          symbol,
          entry_time: ts - 3600, // 假设1小时前开仓
          entry_price: 0,
          exit_time: ts,
          exit_price: 0,
          quantity,
          leverage,
          realized_net_pnl: 0,
          realized_gross_pnl: 0,
          total_commission_dollars: 0,
        });
      }
    }
    
    if (out.length > 0) {
      return res.json({ trades: out });
    }
  } catch (e) {
    console.error('从conversations推导trades失败:', e.message);
  }
  
  // 如果都没有，返回空数组
  return res.json({ trades: [] });
});

// conversations.json 解析 + 文件监听缓存
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const TEST_DIR = path.resolve(__dirname, '..', '..', 'test');
const CONV_FILE = path.join(DATA_DIR, 'conversations.json');
let conversationsCache = { merged: { conversations: [{ model_id: 'default', messages: [] }] }, lastLoaded: 0 };

async function loadAndMergeConversations() {
  try {
    const buf = await fs.readFile(CONV_FILE, 'utf8');
    const raw = JSON.parse(buf);
    const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
    const messages = [];
    for (const c of arr.slice().reverse()) { // 时间正序
      const ts = c?.timestamp || new Date().toISOString();
      if (c?.userPrompt) messages.push({ role: 'user', content: String(c.userPrompt), timestamp: ts });
      if (c?.aiResponse != null) messages.push({ role: 'assistant', content: String(c.aiResponse), timestamp: ts });
    }
    conversationsCache.merged = { conversations: [{ model_id: 'default', messages }] };
    conversationsCache.lastLoaded = Date.now();
  } catch (_) {
    conversationsCache.merged = { conversations: [{ model_id: 'default', messages: [] }] };
    conversationsCache.lastLoaded = Date.now();
  }
}

router.get('/conversations', async (req, res) => {
  // 返回结构化的交易对话数据，兼容前端期望的格式
  try {
    async function readConv(filePath) {
      const buf = await fs.readFile(filePath, 'utf8');
      const raw = JSON.parse(buf);
      const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
      const items = [];
      
      for (const c of arr) {
        const ts = c?.timestamp || new Date().toISOString();
        const tsUnix = typeof ts === 'string' ? Math.floor(new Date(ts).getTime() / 1000) : ts;
        
        // 提取决策信息用于摘要
        const decision = c?.decision || c?.decision_normalized || {};
        const action = String(decision?.action || 'hold').toLowerCase();
        const symbol = decision?.symbol || '';
        const reasoning = decision?.reasoning || '';
        
        // 构建对话摘要（用于列表显示）
        let summary = '';
        if (action === 'buy' || action === 'long') {
          summary = `📈 买入 ${symbol}`;
        } else if (action === 'sell' || action === 'short') {
          summary = `📉 卖出 ${symbol}`;
        } else if (action === 'close_position' || action === 'close') {
          summary = `🔚 平仓 ${symbol}`;
        } else {
          summary = `⏸️ 保持观望`;
        }
        
        // 添加推理内容（完整显示）
        if (reasoning) {
          summary += ` - ${reasoning}`;
        }
        
        // 构建结构化条目
        items.push({
          model_id: 'deepseek-chat',  // 默认模型ID，可以从配置读取
          timestamp: tsUnix,
          inserted_at: tsUnix,
          invocationCount: c?.invocationCount || 0,
          
          // 摘要信息（用于列表显示）
          cot_trace_summary: summary,
          summary: summary,
          
          // 原始提示和响应
          user_prompt: c?.userPrompt || '',
          
          // LLM 响应的结构化数据
          llm_response: {
            raw_text: c?.aiResponse || '',
            parsed: c?.aiParsed || null,
            decision: c?.decision || null,
            decision_normalized: c?.decision_normalized || null,
            trading_decisions: c?.trading_decisions || null
          },
          
          // 思维链追踪（包含技术分析数据）
          cot_trace: {
            action: action,
            symbol: symbol,
            reasoning: reasoning,
            analysis: c?.aiParsed?.analysis || null,
            account_management: c?.aiParsed?.account_management || null,
            chain_of_thought: c?.chain_of_thought || null
          },
          
          // 账户状态
          account: {
            accountValue: c?.accountValue || 0,
            totalReturn: c?.totalReturn || 0
          },
          
          // 完整的原始数据（用于详细展示）
          raw: c
        });
        
        if (items.length >= 100) break;  // 限制返回数量
      }
      
      return items;
    }

    // 优先读 backend/data/conversations.json；若为空则回退到 backend/test/trading-conversations.json
    let items = [];
    try { items = await readConv(CONV_FILE); } catch (_) {}
    if (!items.length) {
      const TEST_CONV = path.join(TEST_DIR, 'trading-conversations.json');
      try { items = await readConv(TEST_CONV); } catch (_) {}
    }
    
    return res.json({ conversations: items });
  } catch (e) {
    console.error('Conversations API error:', e);
    return res.json({ conversations: [] });
  }
});

router.get('/analytics', async (req, res) => {
  const analytics = await loadJson('analytics.json', { analytics: [] });
  if (Array.isArray(analytics.analytics) && analytics.analytics.length > 0) {
    return res.json(analytics);
  }
  try {
    const buf = await fs.readFile(CONV_FILE, 'utf8');
    const raw = JSON.parse(buf);
    const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
    const latest = arr[0] || null;
    let summary = '';
    if (latest) {
      summary = String(
        latest?.aiParsed?.analysis?.market_summary ||
        latest?.decision_normalized?.reasoning ||
        (latest?.aiResponse ? String(latest.aiResponse).slice(0, 400) : '')
      );
    }
    const out = { analytics: [ { type: 'summary', model_id: 'default', text: summary } ] };
    // 将推导结果写回文件，便于前端与其他端点复用
    try { await saveJson('analytics.json', out); } catch (_) {}
    return res.json(out);
  } catch (_) {
    return res.json({ analytics: [] });
  }
});

// Prompts read/write
router.get('/prompts', async (req, res) => {
  const prompts = await loadJson('prompts.json', { system: '', user: '' });
  res.json(prompts);
});

router.post('/prompts', async (req, res) => {
  const body = req.body || {};
  const next = { system: String(body.system || ''), user: String(body.user || '') };
  await saveJson('prompts.json', next);
  res.json(next);
});

// AI prompts via files (system/user templates)
const AI_BASE_DIR = path.resolve(__dirname, '..', '..', 'ai', 'ai-trading');
const TPL_DIR = path.join(AI_BASE_DIR, 'prompt_templates');
const SYS_TPL = path.join(TPL_DIR, 'system_prompt.txt');
const USER_TPL = path.join(TPL_DIR, 'user_prompt.hbs');
const CFG_FILE = path.join(AI_BASE_DIR, 'config.json');

router.get('/ai/prompts', async (req, res) => {
  try {
    const env = String(req.query.env || '').toLowerCase();
    const isFutures = env === 'demo-futures' || env === 'futures';
    
    // 根据环境选择模板路径
    let sysPath = SYS_TPL;
    let userPath = USER_TPL;
    
    if (env && (env === 'demo-futures' || env === 'futures')) {
      sysPath = path.join(TPL_DIR, 'futures', 'system_prompt.txt');
      userPath = path.join(TPL_DIR, 'futures', 'user_prompt.hbs');
    } else if (env && (env === 'demo-spot' || env === 'spot')) {
      sysPath = path.join(TPL_DIR, 'spot', 'system_prompt.txt');
      userPath = path.join(TPL_DIR, 'spot', 'user_prompt.hbs');
    }
    
    const [sys, user] = await Promise.all([
      fs.readFile(sysPath, 'utf8').catch(() => ''),
      fs.readFile(userPath, 'utf8').catch(() => ''),
    ]);
    res.json({ system: sys, user, env: env || 'default' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.post('/ai/prompts', async (req, res) => {
  try {
    const body = req.body || {};
    const system = String(body.system || '');
    const user = String(body.user || '');
    const env = String(body.env || '').toLowerCase();
    
    // 根据环境选择保存路径
    let sysPath = SYS_TPL;
    let userPath = USER_TPL;
    
    if (env && (env === 'demo-futures' || env === 'futures')) {
      sysPath = path.join(TPL_DIR, 'futures', 'system_prompt.txt');
      userPath = path.join(TPL_DIR, 'futures', 'user_prompt.hbs');
    } else if (env && (env === 'demo-spot' || env === 'spot')) {
      sysPath = path.join(TPL_DIR, 'spot', 'system_prompt.txt');
      userPath = path.join(TPL_DIR, 'spot', 'user_prompt.hbs');
    }
    
    await fs.mkdir(path.dirname(sysPath), { recursive: true }).catch(() => {});
    await Promise.all([
      fs.writeFile(sysPath, system, 'utf8'),
      fs.writeFile(userPath, user, 'utf8'),
      // keep a JSON mirror for legacy UI
      saveJson('prompts.json', { system, user }),
    ]);
    res.json({ system, user, env: env || 'default' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Diff between current templates and proposed ones
router.post('/ai/prompt/diff', async (req, res) => {
  try {
    const curSys = await fs.readFile(SYS_TPL, 'utf8').catch(() => '');
    const curUsr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    const nextSys = String(req.body?.system || '');
    const nextUsr = String(req.body?.user || '');
    function simpleDiff(a, b) {
      const al = String(a).split(/\r?\n/);
      const bl = String(b).split(/\r?\n/);
      const max = Math.max(al.length, bl.length);
      const out = [];
      for (let i = 0; i < max; i++) {
        const L = al[i] ?? '';
        const R = bl[i] ?? '';
        if (L === R) out.push(`  ${L}`);
        else {
          if (L) out.push(`- ${L}`);
          if (R) out.push(`+ ${R}`);
        }
      }
      return out.join('\n');
    }
    res.json({
      system_diff: simpleDiff(curSys, nextSys),
      user_diff: simpleDiff(curUsr, nextUsr)
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Apply proposed templates with timestamped backup
router.post('/ai/prompt/apply', async (req, res) => {
  try {
    const nextSys = String(req.body?.system || '');
    const nextUsr = String(req.body?.user || '');
    await fs.mkdir(TPL_DIR, { recursive: true }).catch(() => {});
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    // backup
    const curSys = await fs.readFile(SYS_TPL, 'utf8').catch(() => '');
    const curUsr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    if (curSys) await fs.writeFile(`${SYS_TPL}.${ts}.bak`, curSys, 'utf8');
    if (curUsr) await fs.writeFile(`${USER_TPL}.${ts}.bak`, curUsr, 'utf8');
    // write new
    await fs.writeFile(SYS_TPL, nextSys, 'utf8');
    await fs.writeFile(USER_TPL, nextUsr, 'utf8');
    // mirror json
    await saveJson('prompts.json', { system: nextSys, user: nextUsr });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Revert to the latest .bak
router.post('/ai/prompt/revert', async (req, res) => {
  try {
    async function latestBak(base) {
      const dir = path.dirname(base);
      const name = path.basename(base);
      const entries = await fs.readdir(dir).catch(() => []);
      const baks = entries.filter((f) => f.startsWith(name + '.') && f.endsWith('.bak'));
      if (!baks.length) return null;
      const stats = await Promise.all(
        baks.map(async (f) => ({ f, s: await fs.stat(path.join(dir, f)).catch(() => ({ mtimeMs: 0 })) }))
      );
      stats.sort((a, b) => b.s.mtimeMs - a.s.mtimeMs);
      return path.join(dir, stats[0].f);
    }
    const sysBak = await latestBak(SYS_TPL);
    const usrBak = await latestBak(USER_TPL);
    if (!sysBak && !usrBak) return res.status(404).json({ error: 'no_backup' });
    if (sysBak) {
      const c = await fs.readFile(sysBak, 'utf8');
      await fs.writeFile(SYS_TPL, c, 'utf8');
    }
    if (usrBak) {
      const c = await fs.readFile(usrBak, 'utf8');
      await fs.writeFile(USER_TPL, c, 'utf8');
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Extract placeholders from user template
router.get('/ai/prompt/placeholders', async (req, res) => {
  try {
    const usr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    const m = Array.from(usr.matchAll(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g)).map((x) => x[1]);
    const unique = Array.from(new Set(m));
    res.json({ placeholders: unique });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Capabilities compact object (static without live exchange)
router.get('/ai/capabilities/compact', async (req, res) => {
  try {
    const cfg = JSON.parse(await fs.readFile(CFG_FILE, 'utf8'));
    const out = {
      exchange: { id: 'binance', name: 'Binance', futures: cfg.trading_env?.includes('futures') || false, marketType: cfg.trading_env || 'demo-futures' },
      timeframes: ['1m','3m','5m','15m','1h','4h','1d'],
      api_has: { fetchOHLCV: true, fetchTicker: true, fetchBalance: true, fetchPositions: true, createOrder: true, fetchOrder: true },
      schemas: {
        ticker: { symbol: 'string', last: 'number', bid: 'number', ask: 'number', baseVolume: 'number', quoteVolume: 'number' },
        ohlcv: ['ts','open','high','low','close','volume'],
        balance: { USDT: { free: 'number', used: 'number', total: 'number' } },
        position: { symbol: 'string', contracts: 'number', entryPrice: 'number', markPrice: 'number', liquidationPrice: 'number', unrealizedPnl: 'number' }
      },
      tradable_symbols: Array.isArray(cfg.allowed_symbols) ? cfg.allowed_symbols : []
    };
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.get('/ai/config', async (req, res) => {
  try {
    const raw = await fs.readFile(CFG_FILE, 'utf8');
    res.json(JSON.parse(raw));
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.post('/ai/config', async (req, res) => {
  try {
    const body = req.body || {};
    await fs.mkdir(AI_BASE_DIR, { recursive: true }).catch(() => {});
    await fs.writeFile(CFG_FILE, JSON.stringify(body, null, 2), 'utf8');
    res.json(body);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Suggest prompts via LLM using config presets
router.post('/ai/prompt/suggest', async (req, res) => {
  try {
    const cfg = JSON.parse(await fs.readFile(CFG_FILE, 'utf8'));
    const sys = await fs.readFile(SYS_TPL, 'utf8').catch(() => '');
    const usr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    const body = req.body || {};
    const aiKey = cfg.ai?.api_key || process.env.DEEPSEEK_API_KEY_30 || '';
    const provider = cfg.ai?.provider || 'deepseek';
    const model = cfg.ai?.model || 'deepseek-chat';
    const temperature = cfg.ai?.temperature ?? 0.7;

    const context = {
      environment: cfg.trading_env,
      allowed_symbols: cfg.allowed_symbols,
      data: cfg.data,
      current_templates: { system: sys, user: usr }
    };

    if (!aiKey) {
      // ? key ??????????????????
      return res.json({
        suggestion: {
          system_prompt_en: sys,
          user_prompt_en: usr,
          rationale_en: 'No API key provided; returning current templates as suggestion.',
          config_updates: null
        }
      });
    }

    const prompt = `You are a prompt engineer for a crypto trading agent. Given the JSON context below, propose improved English system and user prompts, and optional config_updates. Respond with strict JSON keys: system_prompt_en, user_prompt_en, rationale_en, config_updates.
\n\nCONTEXT:\n${JSON.stringify(context, null, 2)}`;

    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${aiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You return ONLY valid JSON. No prose.' },
          { role: 'user', content: prompt }
        ],
        temperature,
        stream: false,
        max_tokens: 1500
      })
    });
    if (!resp.ok) throw new Error(`upstream ${resp.status}`);
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    let suggestion;
    try { suggestion = JSON.parse(content); } catch (_) { suggestion = { system_prompt_en: sys, user_prompt_en: usr, rationale_en: 'Parse failed', config_updates: null }; }
    res.json({ suggestion });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Q&A about prompts/config/capabilities without changing templates
router.post('/ai/prompt/ask', async (req, res) => {
  try {
    const cfg = JSON.parse(await fs.readFile(CFG_FILE, 'utf8'));
    const sys = await fs.readFile(SYS_TPL, 'utf8').catch(() => '');
    const usr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    const question = String(req.body?.question || '').slice(0, 8000);
    const aiKey = cfg.ai?.api_key || process.env.DEEPSEEK_API_KEY_30 || '';
    const model = cfg.ai?.model || 'deepseek-chat';
    const temperature = cfg.ai?.temperature ?? 0.4;
    const context = {
      environment: cfg.trading_env,
      allowed_symbols: cfg.allowed_symbols,
      data: cfg.data,
      current_templates: { system: sys, user: usr }
    };
    if (!question) return res.status(400).json({ error: 'empty_question' });
    if (!aiKey) return res.json({ answer: null, disabled: true });
    const prompt = `You are a senior prompt engineer and trading systems architect. Answer user's question based on the JSON CONTEXT. Be concise and structured.\n\nCONTEXT:\n${JSON.stringify(context, null, 2)}\n\nUSER:\n${question}`;
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({ model, messages: [ { role: 'user', content: prompt } ], temperature, stream: false, max_tokens: 1200 })
    });
    if (!resp.ok) throw new Error(`upstream ${resp.status}`);
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || null;
    res.json({ answer: content });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Apply config updates (deep merge shallowly for top-level and nested plain objects)
router.post('/ai/config/apply', async (req, res) => {
  try {
    const updates = req.body?.config_updates || {};
    const cfg = JSON.parse(await fs.readFile(CFG_FILE, 'utf8'));
    function merge(a, b) {
      if (Array.isArray(a) || Array.isArray(b) || typeof a !== 'object' || typeof b !== 'object' || !a || !b) return b;
      const out = { ...a };
      for (const k of Object.keys(b)) out[k] = k in a ? merge(a[k], b[k]) : b[k];
      return out;
    }
    const next = merge(cfg, updates);
    await fs.writeFile(CFG_FILE, JSON.stringify(next, null, 2), 'utf8');
    res.json(next);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Trading runner control
router.get('/ai/trading/status', async (req, res) => {
  res.json(tradingRunner.getStatus());
});

router.post('/ai/trading/start', async (req, res) => {
  try {
    const { intervalMinutes = 3, env, ai } = req.body || {};
    // ?? backend/data ??????????????????
    const dataDir = path.resolve(process.cwd(), 'backend', 'data');
    await fs.mkdir(dataDir, { recursive: true }).catch(() => {});
    
    // 在启动时从交易所获取实际账户余额和BTC价格作为初始值
    let initialAccountValue = null;
    let initialBTCPrice = null;
    try {
      // 临时设置环境变量以便 getAccountBalance 使用
      if (env) process.env.TRADING_ENV = env;
      const balance = await getAccountBalance();
      if (balance && balance > 0) {
        initialAccountValue = balance;
        console.log(`启动时获取到的账户余额: ${initialAccountValue}`);
      } else {
        console.log('无法获取账户余额或余额为0，将不显示参考线');
      }
      
      // 获取初始BTC价格
      try {
        const prices = await getPrices(['BTC/USDT']);
        if (prices && prices['BTC/USDT'] && prices['BTC/USDT'].price) {
          initialBTCPrice = prices['BTC/USDT'].price;
          console.log(`启动时获取到的BTC价格: ${initialBTCPrice}`);
        }
      } catch (e) {
        console.error('获取初始BTC价格失败:', e.message);
      }
    } catch (e) {
      console.error('获取账户余额失败:', e.message);
    }
    
    // 检查并更新 trading-state.json，确保保存初始账户价值
    const stateFile = path.join(dataDir, 'trading-state.json');
    try {
      const existing = await loadJson('trading-state.json', null);
      if (existing && typeof existing === 'object') {
        // 如果文件已存在，只更新初始账户价值（如果还没有的话）和启动时间
        if (!existing.initialAccountValue) {
          existing.initialAccountValue = initialAccountValue;
        }
        // 保存初始BTC价格（用于计算BTC持有曲线）
        if (initialBTCPrice && !existing.initialBTCPrice) {
          existing.initialBTCPrice = initialBTCPrice;
          existing.initialBTCTimestamp = new Date().toISOString();
        }
        existing.startTime = new Date().toISOString();
        existing.tradingEnabled = true;
        existing.lastUpdate = new Date().toISOString();
        if (!existing.accountValue) {
          existing.accountValue = initialAccountValue;
        }
        await saveJson('trading-state.json', existing);
      } else {
        // 文件不存在，创建新的
        const newState = {
          startTime: new Date().toISOString(),
          invocationCount: 0,
          positions: [],
          lastUpdate: new Date().toISOString(),
          tradingEnabled: true,
        };
        // 只有在有初始值时才保存
        if (initialAccountValue) {
          newState.accountValue = initialAccountValue;
          newState.initialAccountValue = initialAccountValue;
        }
        // 保存初始BTC价格
        if (initialBTCPrice) {
          newState.initialBTCPrice = initialBTCPrice;
          newState.initialBTCTimestamp = new Date().toISOString();
        }
        await saveJson('trading-state.json', newState);
      }
    } catch (e) {
      console.error('更新 trading-state.json 失败:', e.message);
    }
    
    // 其他文件的初始化
    const seeds = [
      { file: path.join(dataDir, 'conversations.json'), content: { conversations: [], lastUpdate: new Date().toISOString() } },
      { file: path.join(dataDir, 'trades.json'), content: { trades: [] } },
    ];
    for (const s of seeds) {
      try { await fs.access(s.file); } catch { await fs.writeFile(s.file, JSON.stringify(s.content, null, 2), 'utf8'); }
    }
    const st = tradingRunner.start({ intervalMinutes, env, ai });
    res.json(st);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.post('/ai/trading/stop', async (req, res) => {
  try {
    const st = tradingRunner.stop();
    res.json(st);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.post('/ai/trading/close-all-positions', async (req, res) => {
  try {
    // 先停止运行
    const st = tradingRunner.stop();
    // 这里可以添加实际平仓逻辑，目前先只停止运行
    res.json({ ...st, message: '已停止运行' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Derived endpoints
router.get('/account-totals', async (req, res) => {
  const lastHourlyMarker = req.query.lastHourlyMarker ? Number(req.query.lastHourlyMarker) : undefined;
  const trades = await loadJson('trades.json', { trades: [] });
  const totals = await deriveAccountTotals(trades, lastHourlyMarker);
  
  // 优先尝试从币安API获取实时数据
  let latestPositions = {};
  let latestAccountValue = null;
  let initialAccountValue = null;
  let initialBTCPrice = null;
  
  try {
    const realTimeData = await getRealTimeAccountData();
    if (realTimeData) {
      latestAccountValue = realTimeData.balance;
      // 将positions数组转为对象格式
      for (const p of realTimeData.positions) {
        const symbol = String(p.symbol || '').toUpperCase();
        if (symbol) {
          latestPositions[symbol] = {
            symbol,
            quantity: Number(p.quantity || 0),
            entry_price: Number(p.entry_price || 0),
            current_price: Number(p.current_price || 0),
            liquidation_price: Number(p.liquidation_price || 0),
            unrealized_pnl: Number(p.unrealized_pnl || 0),
            leverage: Number(p.leverage || 1),
            exit_plan: p.exit_plan || null,
            confidence: Number(p.confidence || 0),
            risk_usd: Number(p.risk_usd || 0),
            margin: Number(p.margin || 0),
            notional_usd: Number(p.notional_usd || 0),
            entry_time: Number(p.entry_time || Math.floor(Date.now() / 1000)),
            entry_oid: Number(p.entry_oid || 0),
          };
        }
      }
    }
  } catch (e) {
    console.warn('获取实时账户数据失败，降级到trading-state.json:', e.message);
  }
  
  // 始终从 trading-state.json 读取初始值（用于BTC持有曲线计算）
  try {
    const state = await loadJson('trading-state.json', { positions: [] });
    // 获取初始账户价值（启动时的值）
    if (state?.initialAccountValue) {
      initialAccountValue = Number(state.initialAccountValue);
    } else if (state?.accountValue) {
      // 如果没有保存初始值，使用当前值（可能是第一次启动）
      initialAccountValue = Number(state.accountValue);
    }
    // 获取初始BTC价格（用于计算BTC持有曲线）
    if (state?.initialBTCPrice) {
      initialBTCPrice = Number(state.initialBTCPrice);
    }
  } catch (e) {
    console.warn('读取 trading-state.json 失败:', e.message);
  }
  
  // 如果实时数据获取失败，降级到trading-state.json
  if (!latestAccountValue || Object.keys(latestPositions).length === 0) {
    try {
      // 从 trading-state.json 读取最新的账户价值和持仓
      const state = await loadJson('trading-state.json', { positions: [] });
      if (state?.accountValue) {
        latestAccountValue = Number(state.accountValue);
      }
      if (Array.isArray(state?.positions) && state.positions.length > 0) {
        for (const p of state.positions) {
          const symbol = String(p?.symbol || '').toUpperCase();
          if (symbol) {
            const notional = Number(p?.notional_usd || 0) || Math.abs(Number(p?.quantity || 0)) * Number(p?.current_price || p?.entry_price || 0);
            latestPositions[symbol] = {
              symbol,
              quantity: Number(p?.quantity || 0),
              entry_price: Number(p?.entry_price || 0),
              current_price: Number(p?.current_price || p?.entry_price || 0),
              liquidation_price: Number(p?.liquidation_price || 0),
              unrealized_pnl: Number(p?.unrealized_pnl || 0),
              leverage: Number(p?.leverage || 1),
              exit_plan: p?.exit_plan || null,
              confidence: Number(p?.confidence || 0),
              risk_usd: Number(p?.risk_usd || 0),
              margin: notional / Number(p?.leverage || 1),
              notional_usd: notional,
              entry_time: Math.floor(Date.now() / 1000),
              entry_oid: Number(p?.entry_oid || 0),
            };
          }
        }
      }
      
      // 如果没有，从 conversations 推导
      if (Object.keys(latestPositions).length === 0) {
        const buf = await fs.readFile(CONV_FILE, 'utf8');
        const raw = JSON.parse(buf);
        const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
        const posMap = {};
        // 倒序遍历（最新到最旧），累计持仓
        for (const c of arr.slice().reverse()) {
          const d = c?.decision_normalized || {};
          const action = String(d?.action || '').toLowerCase();
          const base = (d?.symbol || '').toString().toUpperCase().replace(/:USDT$/, '');
          const symbol = base.includes('/') ? base.split('/')[0] : base;
          const qty = Number.isFinite(Number(d?.quantity)) ? Number(d.quantity) : 0;
          
          // 只处理buy/sell/close_position，忽略hold操作
          if (!symbol) continue;
          if (action === 'buy' && qty > 0) {
            if (!posMap[symbol]) posMap[symbol] = { symbol, quantity: 0, entry_price: 0, leverage: 1 };
            posMap[symbol].quantity += qty;
          } else if ((action === 'sell' || action === 'close_position') && qty > 0) {
            if (posMap[symbol]) {
              posMap[symbol].quantity -= qty;
              if (posMap[symbol].quantity <= 0) delete posMap[symbol];
            }
          }
        }
        // 转换为标准格式
        for (const [symbol, p] of Object.entries(posMap)) {
          if (p.quantity > 0) {
            latestPositions[symbol] = {
              symbol: p.symbol,
              quantity: p.quantity,
              entry_price: p.entry_price || 0,
              current_price: 0,
              liquidation_price: 0,
              unrealized_pnl: 0,
              leverage: p.leverage || 1,
              exit_plan: null,
              confidence: 0,
              risk_usd: 0,
              margin: 0,
              entry_time: Math.floor(Date.now() / 1000),
              entry_oid: 0,
            };
          }
        }
      }
    } catch (e) {
      console.error('读取持仓失败:', e.message);
    }
  }
  
  // 从conversations中提取BTC价格历史的辅助函数
  function extractBTCPrice(userPrompt) {
    if (!userPrompt) return null;
    // 从userPrompt中提取 current_price = 109695.40 格式的BTC价格
    const match = userPrompt.match(/ALL BTC DATA[\s\S]*?current_price\s*=\s*([\d.]+)/);
    return match ? Number(match[1]) : null;
  }

  if (!totals || totals.length === 0) {
    // 从 conversations 生成净值时间序列
    try {
      const buf = await fs.readFile(CONV_FILE, 'utf8');
      const raw = JSON.parse(buf);
      const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
      const series = arr.slice().reverse().map(c => {
        const ts = Math.floor(new Date(c?.timestamp || Date.now()).getTime() / 1000);
        const equity = Number(c?.accountValue);
        if (!Number.isFinite(equity)) return null; // 跳过无效值，返回null
        // 从userPrompt中提取BTC价格
        const btcPrice = extractBTCPrice(c?.userPrompt);
        return {
          model_id: 'default',
          timestamp: ts,
          dollar_equity: equity,
          since_inception_hourly_marker: Math.floor(ts / 3600),
          positions: latestPositions, // 附加持仓信息
          btc_price: btcPrice || undefined, // 附加BTC价格（如果存在）
        };
      }).filter(item => item !== null); // 过滤掉null值
      if (series.length > 0) return res.json({ 
        accountTotals: series,
        initialAccountValue: initialAccountValue || undefined, // 如果没有则不返回，而不是返回null
        initialBTCPrice: initialBTCPrice || undefined, // 返回初始BTC价格
      });
    } catch (_) {}
    // 如果没有数据且没有初始值，返回空数组而不是伪造数据
    if (!initialAccountValue && !latestAccountValue) {
      return res.json({
        accountTotals: [],
        initialAccountValue: undefined
      });
    }
    
    const now = Date.now();
    const t0 = Math.floor((now - 60_000) / 1000);
    const t1 = Math.floor(now / 1000);
    // 使用实际的值，如果没有初始值就使用当前值
    const startValue = initialAccountValue || latestAccountValue || 0;
    const currentValue = latestAccountValue || initialAccountValue || 0;
    return res.json({
      accountTotals: [
        { model_id: 'default', timestamp: t0, dollar_equity: startValue, since_inception_hourly_marker: Math.floor(t0 / 3600), positions: latestPositions },
        { model_id: 'default', timestamp: t1, dollar_equity: currentValue, since_inception_hourly_marker: Math.floor(t1 / 3600), positions: latestPositions },
      ],
      // 只有确实有初始值时才返回
      initialAccountValue: initialAccountValue || undefined,
    });
  }
  
  // 为现有的 totals 也附加持仓信息和更新最新净值，以及BTC价格
  if (totals && totals.length > 0) {
    // 尝试从conversations中提取BTC价格历史
    let btcPriceMap = new Map(); // timestamp -> btc_price
    try {
      const buf = await fs.readFile(CONV_FILE, 'utf8');
      const raw = JSON.parse(buf);
      const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
      for (const c of arr) {
        const ts = Math.floor(new Date(c?.timestamp || Date.now()).getTime() / 1000);
        const btcPrice = extractBTCPrice(c?.userPrompt);
        if (btcPrice && !btcPriceMap.has(ts)) {
          btcPriceMap.set(ts, btcPrice);
        }
      }
    } catch (e) {
      console.warn('从conversations提取BTC价格失败:', e.message);
    }
    
    const latest = totals[totals.length - 1];
    latest.positions = latestPositions;
    // 如果有最新的账户价值，更新最后一条记录的净值
    if (latestAccountValue != null && Number.isFinite(latestAccountValue)) {
      latest.dollar_equity = latestAccountValue;
      latest.timestamp = Math.floor(Date.now() / 1000);
    }
    
    // 为每个totals项附加BTC价格（如果存在）
    for (const item of totals) {
      const ts = item.timestamp;
      // 查找最接近的时间戳的BTC价格
      let closestPrice = null;
      let minDiff = Infinity;
      for (const [priceTs, price] of btcPriceMap.entries()) {
        const diff = Math.abs(priceTs - ts);
        if (diff < minDiff && diff < 3600) { // 1小时内
          minDiff = diff;
          closestPrice = price;
        }
      }
      if (closestPrice) {
        item.btc_price = closestPrice;
      }
    }
    
    // 为最后一个点添加当前BTC价格（如果还没有）
    if (!latest.btc_price) {
      try {
        const prices = await getPrices(['BTC/USDT']);
        if (prices && prices['BTC/USDT'] && prices['BTC/USDT'].price) {
          latest.btc_price = prices['BTC/USDT'].price;
        }
      } catch (e) {
        console.warn('获取当前BTC价格失败:', e.message);
      }
    }
  }
  
  res.json({ 
    accountTotals: totals,
    // 只有确实有初始值时才返回，用于图表参考线
    initialAccountValue: initialAccountValue || undefined,
    initialBTCPrice: initialBTCPrice || undefined, // 返回初始BTC价格
  });
});

router.get('/leaderboard', async (req, res) => {
  const trades = await loadJson('trades.json', { trades: [] });
  const leaderboard = await deriveLeaderboard(trades);
  res.json({ leaderboard });
});

router.get('/since-inception-values', async (req, res) => {
  const trades = await loadJson('trades.json', { trades: [] });
  const out = await deriveSinceInception(trades);
  res.json(out);
});

// 实时数据端点：直接从币安API获取
router.get('/realtime', async (req, res) => {
  try {
    const realTimeData = await getRealTimeAccountData();
    if (!realTimeData) {
      // 如果实时获取失败，降级到trading-state.json
      const state = await loadJson('trading-state.json', {});
      return res.json({
        balance: state.accountValue || 0,
        availableCash: state.availableCash || 0,
        positions: state.positions || [],
        source: 'fallback',
      });
    }
    return res.json({
      ...realTimeData,
      source: 'realtime',
    });
  } catch (e) {
    console.error('获取实时数据失败:', e.message);
    // 降级到trading-state.json
    try {
      const state = await loadJson('trading-state.json', {});
      res.json({
        balance: state.accountValue || 0,
        availableCash: state.availableCash || 0,
        positions: state.positions || [],
        source: 'fallback',
      });
    } catch (_) {
      res.json({
        balance: 0,
        availableCash: 0,
        positions: [],
        source: 'error',
      });
    }
  }
});

router.get('/positions', async (req, res) => {
  // 优先尝试实时数据
  try {
    const realTimeData = await getRealTimeAccountData();
    if (realTimeData && realTimeData.positions && realTimeData.positions.length > 0) {
      return res.json({ positions: realTimeData.positions });
    }
  } catch (_) {
    // 如果失败，继续使用原有逻辑
  }
  
  try {
    const state = await loadJson('trading-state.json', { positions: [] });
    const positions = Array.isArray(state?.positions) ? state.positions : [];
    const norm = positions.map((p) => ({
      symbol: String(p?.symbol || ''),
      quantity: Number(p?.quantity || 0),
      entry_price: Number(p?.entry_price || 0),
      current_price: Number(p?.current_price || p?.entry_price || 0),
      liquidation_price: Number(p?.liquidation_price || 0),
      unrealized_pnl: Number(p?.unrealized_pnl || 0),
      leverage: Number(p?.leverage || 1),
      exit_plan: p?.exit_plan || null,
      confidence: Number(p?.confidence || 0),
      risk_usd: Number(p?.risk_usd || 0),
    }));
    if (norm.length > 0) return res.json({ positions: norm });
    // 从 conversations 累计推导净持仓
    try {
      const buf = await fs.readFile(CONV_FILE, 'utf8');
      const raw = JSON.parse(buf);
      const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
      const posMap = {};
      for (const c of arr.slice().reverse()) {
        const d = c?.decision_normalized || {};
        const action = String(d?.action || '').toLowerCase();
        const base = (d?.symbol || '').toString().toUpperCase().replace(/:USDT$/, '');
        const symbol = base.includes('/') ? base.split('/')[0] : base;
        const qty = Number.isFinite(Number(d?.quantity)) ? Number(d.quantity) : 0;
        if (!symbol || qty === 0) continue;
        if (action === 'buy') {
          if (!posMap[symbol]) posMap[symbol] = { symbol, quantity: 0, entry_price: 0, leverage: 1 };
          posMap[symbol].quantity += qty;
        } else if (action === 'sell' || action === 'close_position') {
          if (posMap[symbol]) {
            posMap[symbol].quantity -= qty;
            if (posMap[symbol].quantity <= 0) delete posMap[symbol];
          }
        }
      }
      const out = Object.values(posMap).map(p => ({
        symbol: p.symbol,
        quantity: p.quantity,
        entry_price: p.entry_price || 0,
        current_price: 0,
        liquidation_price: 0,
        unrealized_pnl: 0,
        leverage: p.leverage || 1,
        exit_plan: null,
        confidence: 0,
        risk_usd: 0,
      }));
      try {
        const prev = await loadJson('trading-state.json', { startTime: new Date().toISOString(), invocationCount: 0, positions: [] });
        await saveJson('trading-state.json', { ...prev, positions: out, lastUpdate: new Date().toISOString() });
      } catch (_) {}
      return res.json({ positions: out });
    } catch (_) {
      return res.json({ positions: [] });
    }
  } catch (e) {
    res.json({ positions: [] });
  }
});



```

```typescriptreact
"use client";
import { useEffect, useMemo, useState } from "react";

type Config = {
  trading_env?: string;
  allowed_symbols?: string[];
  ai?: { provider?: string; model?: string; presets?: Record<string, any> };
  data?: Record<string, any>;
};

export default function PromptEditorPanel() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(3);
  const [env, setEnv] = useState<string>("");
  const [ai, setAi] = useState<string>("");
  const [promptEnv, setPromptEnv] = useState<string>("demo-futures"); // Prompt环境切换，独立于交易环境
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [configUpdates, setConfigUpdates] = useState<any>(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [p, c, s] = await Promise.all([
          fetch("/api/nof1/ai/prompts", { cache: "no-store" }),
          fetch("/api/nof1/ai/config", { cache: "no-store" }),
          fetch("/api/nof1/ai/trading/status", { cache: "no-store" }),
        ]);
        const pj = await p.json();
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setSystemPrompt(pj.system || "");
          setUserPrompt(pj.user || "");
          setCfg(cj);
          setStatus(sj);
          setEnv(String(cj?.trading_env || ""));
          setAi("");
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSuggest() {
    try {
      setSuggesting(true);
      setError(null);
      setRationale(null);
      setConfigUpdates(null);
      const r = await fetch("/api/nof1/ai/prompt/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const s = j?.suggestion || {};
      if (typeof s.system_prompt_en === "string") setSystemPrompt(s.system_prompt_en);
      if (typeof s.user_prompt_en === "string") setUserPrompt(s.user_prompt_en);
      if (s.rationale_en) setRationale(String(s.rationale_en));
      if (s.config_updates) setConfigUpdates(s.config_updates);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function onApplyConfigUpdates() {
    if (!configUpdates) return;
    try {
      const r = await fetch("/api/nof1/ai/config/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config_updates: configUpdates })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next = await r.json();
      setCfg(next);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const whitelist = useMemo(() => (cfg?.allowed_symbols || []).join(", "), [cfg]);
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);
  const isRunning = !!status?.running;

  async function startTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intervalMinutes, env, ai })
      });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function stopTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  return (
    <aside className="h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Prompt 工作台</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ color: "var(--btn-inactive-fg)", border: "1px solid var(--chip-border)" }}
            onClick={onSuggest}
            disabled={suggesting}
          >{suggesting ? '建议中…' : '建议'}</button>
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
            onClick={onSave}
            disabled={saving}
          >{saving ? '保存中…' : '保存'}</button>
        </div>
      </div>

      {/* 交易控制 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易类型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}>
            {['demo-futures','demo-spot','futures','spot'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">AI模型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={ai}
                  onChange={(e) => setAi(e.target.value)}>
            <option value="">(默认)</option>
            {aiPresetKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">间隔(分)</label>
          <input className="col-span-2 rounded border px-2 py-1"
                 style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                 type="number" min={1} value={intervalMinutes}
                 onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))} />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }}
                  onClick={startTrading}
                  disabled={isRunning}>启动</button>
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }}
                  onClick={stopTrading}
                  disabled={!isRunning}>停止</button>
          <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
            状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--chip-border)", color: "var(--danger)" }}>{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500">加载中…</div>
      ) : (
        <>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>System Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-40 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>User Prompt</div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-48 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>

          {rationale && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>Rationale</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{rationale}</pre>
            </div>
          )}

          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>符号白名单</div>
            <div className="text-xs" style={{ color: "var(--foreground)" }}>{whitelist || '—'}</div>
          </div>

          {configUpdates && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>建议的配置更新</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2 mb-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{JSON.stringify(configUpdates, null, 2)}</pre>
              <button
                className="rounded px-2 py-1 chip-btn text-xs"
                style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
                onClick={onApplyConfigUpdates}
              >应用配置更新</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}



```

```typescriptreact
"use client";
import { useEffect, useMemo, useState } from "react";

type Config = {
  trading_env?: string;
  allowed_symbols?: string[];
  ai?: { provider?: string; model?: string; presets?: Record<string, any> };
  data?: Record<string, any>;
};

export default function PromptEditorPanel() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(3);
  const [env, setEnv] = useState<string>("");
  const [ai, setAi] = useState<string>("");
  const [promptEnv, setPromptEnv] = useState<string>("demo-futures"); // Prompt环境切换，独立于交易环境
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [configUpdates, setConfigUpdates] = useState<any>(null);

  // 加载prompt的函数
  async function loadPrompts(env: string) {
    try {
      const url = `/api/nof1/ai/prompts${env ? `?env=${env}` : ''}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pj = await r.json();
      setSystemPrompt(pj.system || "");
      setUserPrompt(pj.user || "");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [c, s] = await Promise.all([
          fetch("/api/nof1/ai/config", { cache: "no-store" }),
          fetch("/api/nof1/ai/trading/status", { cache: "no-store" }),
        ]);
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setCfg(cj);
          setStatus(sj);
          const tradingEnv = String(cj?.trading_env || "demo-futures");
          setEnv(tradingEnv);
          setPromptEnv(tradingEnv); // 初始化为当前交易环境
          setAi("");
          // 加载对应环境的prompt
          await loadPrompts(tradingEnv);
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // 当promptEnv改变时，重新加载prompt
  useEffect(() => {
    if (promptEnv) {
      loadPrompts(promptEnv);
    }
  }, [promptEnv]);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSuggest() {
    try {
      setSuggesting(true);
      setError(null);
      setRationale(null);
      setConfigUpdates(null);
      const r = await fetch("/api/nof1/ai/prompt/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const s = j?.suggestion || {};
      if (typeof s.system_prompt_en === "string") setSystemPrompt(s.system_prompt_en);
      if (typeof s.user_prompt_en === "string") setUserPrompt(s.user_prompt_en);
      if (s.rationale_en) setRationale(String(s.rationale_en));
      if (s.config_updates) setConfigUpdates(s.config_updates);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function onApplyConfigUpdates() {
    if (!configUpdates) return;
    try {
      const r = await fetch("/api/nof1/ai/config/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config_updates: configUpdates })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next = await r.json();
      setCfg(next);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const whitelist = useMemo(() => (cfg?.allowed_symbols || []).join(", "), [cfg]);
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);
  const isRunning = !!status?.running;

  async function startTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intervalMinutes, env, ai })
      });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function stopTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  return (
    <aside className="h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Prompt 工作台</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ color: "var(--btn-inactive-fg)", border: "1px solid var(--chip-border)" }}
            onClick={onSuggest}
            disabled={suggesting}
          >{suggesting ? '建议中…' : '建议'}</button>
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
            onClick={onSave}
            disabled={saving}
          >{saving ? '保存中…' : '保存'}</button>
        </div>
      </div>

      {/* 交易控制 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易类型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}>
            {['demo-futures','demo-spot','futures','spot'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">AI模型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={ai}
                  onChange={(e) => setAi(e.target.value)}>
            <option value="">(默认)</option>
            {aiPresetKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">间隔(分)</label>
          <input className="col-span-2 rounded border px-2 py-1"
                 style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                 type="number" min={1} value={intervalMinutes}
                 onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))} />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }}
                  onClick={startTrading}
                  disabled={isRunning}>启动</button>
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }}
                  onClick={stopTrading}
                  disabled={!isRunning}>停止</button>
          <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
            状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--chip-border)", color: "var(--danger)" }}>{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500">加载中…</div>
      ) : (
        <>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>System Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-40 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>User Prompt</div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-48 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>

          {rationale && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>Rationale</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{rationale}</pre>
            </div>
          )}

          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>符号白名单</div>
            <div className="text-xs" style={{ color: "var(--foreground)" }}>{whitelist || '—'}</div>
          </div>

          {configUpdates && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>建议的配置更新</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2 mb-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{JSON.stringify(configUpdates, null, 2)}</pre>
              <button
                className="rounded px-2 py-1 chip-btn text-xs"
                style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
                onClick={onApplyConfigUpdates}
              >应用配置更新</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}



```

```typescriptreact
"use client";
import { useEffect, useMemo, useState } from "react";

type Config = {
  trading_env?: string;
  allowed_symbols?: string[];
  ai?: { provider?: string; model?: string; presets?: Record<string, any> };
  data?: Record<string, any>;
};

export default function PromptEditorPanel() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(3);
  const [env, setEnv] = useState<string>("");
  const [ai, setAi] = useState<string>("");
  const [promptEnv, setPromptEnv] = useState<string>("demo-futures"); // Prompt环境切换，独立于交易环境
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [configUpdates, setConfigUpdates] = useState<any>(null);

  // 加载prompt的函数
  async function loadPrompts(env: string) {
    try {
      const url = `/api/nof1/ai/prompts${env ? `?env=${env}` : ''}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pj = await r.json();
      setSystemPrompt(pj.system || "");
      setUserPrompt(pj.user || "");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [c, s] = await Promise.all([
          fetch("/api/nof1/ai/config", { cache: "no-store" }),
          fetch("/api/nof1/ai/trading/status", { cache: "no-store" }),
        ]);
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setCfg(cj);
          setStatus(sj);
          const tradingEnv = String(cj?.trading_env || "demo-futures");
          setEnv(tradingEnv);
          setPromptEnv(tradingEnv); // 初始化为当前交易环境
          setAi("");
          // 加载对应环境的prompt
          await loadPrompts(tradingEnv);
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // 当promptEnv改变时，重新加载prompt
  useEffect(() => {
    if (promptEnv) {
      loadPrompts(promptEnv);
    }
  }, [promptEnv]);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSuggest() {
    try {
      setSuggesting(true);
      setError(null);
      setRationale(null);
      setConfigUpdates(null);
      const r = await fetch("/api/nof1/ai/prompt/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const s = j?.suggestion || {};
      if (typeof s.system_prompt_en === "string") setSystemPrompt(s.system_prompt_en);
      if (typeof s.user_prompt_en === "string") setUserPrompt(s.user_prompt_en);
      if (s.rationale_en) setRationale(String(s.rationale_en));
      if (s.config_updates) setConfigUpdates(s.config_updates);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function onApplyConfigUpdates() {
    if (!configUpdates) return;
    try {
      const r = await fetch("/api/nof1/ai/config/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config_updates: configUpdates })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next = await r.json();
      setCfg(next);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const whitelist = useMemo(() => (cfg?.allowed_symbols || []).join(", "), [cfg]);
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);
  const isRunning = !!status?.running;

  async function startTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intervalMinutes, env, ai })
      });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function stopTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  return (
    <aside className="h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Prompt 工作台</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ color: "var(--btn-inactive-fg)", border: "1px solid var(--chip-border)" }}
            onClick={onSuggest}
            disabled={suggesting}
          >{suggesting ? '建议中…' : '建议'}</button>
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
            onClick={onSave}
            disabled={saving}
          >{saving ? '保存中…' : '保存'}</button>
        </div>
      </div>

      {/* 交易控制 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易类型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}>
            {['demo-futures','demo-spot','futures','spot'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">AI模型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={ai}
                  onChange={(e) => setAi(e.target.value)}>
            <option value="">(默认)</option>
            {aiPresetKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">间隔(分)</label>
          <input className="col-span-2 rounded border px-2 py-1"
                 style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                 type="number" min={1} value={intervalMinutes}
                 onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))} />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }}
                  onClick={startTrading}
                  disabled={isRunning}>启动</button>
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }}
                  onClick={stopTrading}
                  disabled={!isRunning}>停止</button>
          <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
            状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--chip-border)", color: "var(--danger)" }}>{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500">加载中…</div>
      ) : (
        <>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>System Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-40 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>User Prompt</div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-48 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>

          {rationale && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>Rationale</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{rationale}</pre>
            </div>
          )}

          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>符号白名单</div>
            <div className="text-xs" style={{ color: "var(--foreground)" }}>{whitelist || '—'}</div>
          </div>

          {configUpdates && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>建议的配置更新</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2 mb-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{JSON.stringify(configUpdates, null, 2)}</pre>
              <button
                className="rounded px-2 py-1 chip-btn text-xs"
                style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
                onClick={onApplyConfigUpdates}
              >应用配置更新</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}



```

```typescriptreact
"use client";
import { useEffect, useMemo, useState } from "react";

type Config = {
  trading_env?: string;
  allowed_symbols?: string[];
  ai?: { provider?: string; model?: string; presets?: Record<string, any> };
  data?: Record<string, any>;
};

export default function PromptEditorPanel() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(3);
  const [env, setEnv] = useState<string>("");
  const [ai, setAi] = useState<string>("");
  const [promptEnv, setPromptEnv] = useState<string>("demo-futures"); // Prompt环境切换，独立于交易环境
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [configUpdates, setConfigUpdates] = useState<any>(null);

  // 加载prompt的函数
  async function loadPrompts(env: string) {
    try {
      const url = `/api/nof1/ai/prompts${env ? `?env=${env}` : ''}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pj = await r.json();
      setSystemPrompt(pj.system || "");
      setUserPrompt(pj.user || "");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [c, s] = await Promise.all([
          fetch("/api/nof1/ai/config", { cache: "no-store" }),
          fetch("/api/nof1/ai/trading/status", { cache: "no-store" }),
        ]);
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setCfg(cj);
          setStatus(sj);
          const tradingEnv = String(cj?.trading_env || "demo-futures");
          setEnv(tradingEnv);
          setPromptEnv(tradingEnv); // 初始化为当前交易环境
          setAi("");
          // 加载对应环境的prompt
          await loadPrompts(tradingEnv);
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // 当promptEnv改变时，重新加载prompt
  useEffect(() => {
    if (promptEnv) {
      loadPrompts(promptEnv);
    }
  }, [promptEnv]);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSuggest() {
    try {
      setSuggesting(true);
      setError(null);
      setRationale(null);
      setConfigUpdates(null);
      const r = await fetch("/api/nof1/ai/prompt/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const s = j?.suggestion || {};
      if (typeof s.system_prompt_en === "string") setSystemPrompt(s.system_prompt_en);
      if (typeof s.user_prompt_en === "string") setUserPrompt(s.user_prompt_en);
      if (s.rationale_en) setRationale(String(s.rationale_en));
      if (s.config_updates) setConfigUpdates(s.config_updates);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function onApplyConfigUpdates() {
    if (!configUpdates) return;
    try {
      const r = await fetch("/api/nof1/ai/config/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config_updates: configUpdates })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next = await r.json();
      setCfg(next);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const whitelist = useMemo(() => (cfg?.allowed_symbols || []).join(", "), [cfg]);
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);
  const isRunning = !!status?.running;

  async function startTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intervalMinutes, env, ai })
      });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function stopTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  return (
    <aside className="h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Prompt 工作台</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ color: "var(--btn-inactive-fg)", border: "1px solid var(--chip-border)" }}
            onClick={onSuggest}
            disabled={suggesting}
          >{suggesting ? '建议中…' : '建议'}</button>
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
            onClick={onSave}
            disabled={saving}
          >{saving ? '保存中…' : '保存'}</button>
        </div>
      </div>

      {/* Prompt环境切换 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>Prompt 环境</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">模板类型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={promptEnv}
                  onChange={(e) => setPromptEnv(e.target.value)}>
            <option value="demo-futures">Futures (期货)</option>
            <option value="demo-spot">Spot (现货)</option>
          </select>
        </div>
        <div className="text-[10px]" style={{ color: 'var(--muted-text)' }}>
          {promptEnv.includes('futures') ? '期货模板：支持杠杆、做多做空' : '现货模板：无杠杆、只能做多'}
        </div>
      </div>

      {/* 交易控制 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易类型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}>
            {['demo-futures','demo-spot','futures','spot'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">AI模型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={ai}
                  onChange={(e) => setAi(e.target.value)}>
            <option value="">(默认)</option>
            {aiPresetKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">间隔(分)</label>
          <input className="col-span-2 rounded border px-2 py-1"
                 style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                 type="number" min={1} value={intervalMinutes}
                 onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))} />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }}
                  onClick={startTrading}
                  disabled={isRunning}>启动</button>
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }}
                  onClick={stopTrading}
                  disabled={!isRunning}>停止</button>
          <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
            状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--chip-border)", color: "var(--danger)" }}>{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500">加载中…</div>
      ) : (
        <>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>System Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-40 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>User Prompt</div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-48 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>

          {rationale && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>Rationale</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{rationale}</pre>
            </div>
          )}

          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>符号白名单</div>
            <div className="text-xs" style={{ color: "var(--foreground)" }}>{whitelist || '—'}</div>
          </div>

          {configUpdates && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>建议的配置更新</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2 mb-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{JSON.stringify(configUpdates, null, 2)}</pre>
              <button
                className="rounded px-2 py-1 chip-btn text-xs"
                style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
                onClick={onApplyConfigUpdates}
              >应用配置更新</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}



```

修复 useEffect 的依赖问题：


```typescriptreact
"use client";
import { useEffect, useMemo, useState } from "react";

type Config = {
  trading_env?: string;
  allowed_symbols?: string[];
  ai?: { provider?: string; model?: string; presets?: Record<string, any> };
  data?: Record<string, any>;
};

export default function PromptEditorPanel() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(3);
  const [env, setEnv] = useState<string>("");
  const [ai, setAi] = useState<string>("");
  const [promptEnv, setPromptEnv] = useState<string>("demo-futures"); // Prompt环境切换，独立于交易环境
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [configUpdates, setConfigUpdates] = useState<any>(null);

  // 加载prompt的函数
  async function loadPrompts(env: string) {
    try {
      const url = `/api/nof1/ai/prompts${env ? `?env=${env}` : ''}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pj = await r.json();
      setSystemPrompt(pj.system || "");
      setUserPrompt(pj.user || "");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [c, s] = await Promise.all([
          fetch("/api/nof1/ai/config", { cache: "no-store" }),
          fetch("/api/nof1/ai/trading/status", { cache: "no-store" }),
        ]);
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setCfg(cj);
          setStatus(sj);
          const tradingEnv = String(cj?.trading_env || "demo-futures");
          setEnv(tradingEnv);
          setPromptEnv(tradingEnv); // 初始化为当前交易环境
          setAi("");
          // 加载对应环境的prompt
          await loadPrompts(tradingEnv);
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // 当promptEnv改变时，重新加载prompt
  useEffect(() => {
    if (promptEnv && !loading) {
      loadPrompts(promptEnv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptEnv]);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSuggest() {
    try {
      setSuggesting(true);
      setError(null);
      setRationale(null);
      setConfigUpdates(null);
      const r = await fetch("/api/nof1/ai/prompt/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const s = j?.suggestion || {};
      if (typeof s.system_prompt_en === "string") setSystemPrompt(s.system_prompt_en);
      if (typeof s.user_prompt_en === "string") setUserPrompt(s.user_prompt_en);
      if (s.rationale_en) setRationale(String(s.rationale_en));
      if (s.config_updates) setConfigUpdates(s.config_updates);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function onApplyConfigUpdates() {
    if (!configUpdates) return;
    try {
      const r = await fetch("/api/nof1/ai/config/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config_updates: configUpdates })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next = await r.json();
      setCfg(next);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const whitelist = useMemo(() => (cfg?.allowed_symbols || []).join(", "), [cfg]);
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);
  const isRunning = !!status?.running;

  async function startTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intervalMinutes, env, ai })
      });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function stopTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  return (
    <aside className="h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Prompt 工作台</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ color: "var(--btn-inactive-fg)", border: "1px solid var(--chip-border)" }}
            onClick={onSuggest}
            disabled={suggesting}
          >{suggesting ? '建议中…' : '建议'}</button>
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
            onClick={onSave}
            disabled={saving}
          >{saving ? '保存中…' : '保存'}</button>
        </div>
      </div>

      {/* Prompt环境切换 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>Prompt 环境</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">模板类型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={promptEnv}
                  onChange={(e) => setPromptEnv(e.target.value)}>
            <option value="demo-futures">Futures (期货)</option>
            <option value="demo-spot">Spot (现货)</option>
          </select>
        </div>
        <div className="text-[10px]" style={{ color: 'var(--muted-text)' }}>
          {promptEnv.includes('futures') ? '期货模板：支持杠杆、做多做空' : '现货模板：无杠杆、只能做多'}
        </div>
      </div>

      {/* 交易控制 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易类型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}>
            {['demo-futures','demo-spot','futures','spot'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">AI模型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={ai}
                  onChange={(e) => setAi(e.target.value)}>
            <option value="">(默认)</option>
            {aiPresetKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">间隔(分)</label>
          <input className="col-span-2 rounded border px-2 py-1"
                 style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                 type="number" min={1} value={intervalMinutes}
                 onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))} />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }}
                  onClick={startTrading}
                  disabled={isRunning}>启动</button>
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }}
                  onClick={stopTrading}
                  disabled={!isRunning}>停止</button>
          <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
            状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--chip-border)", color: "var(--danger)" }}>{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500">加载中…</div>
      ) : (
        <>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>System Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-40 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>User Prompt</div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-48 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>

          {rationale && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>Rationale</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{rationale}</pre>
            </div>
          )}

          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>符号白名单</div>
            <div className="text-xs" style={{ color: "var(--foreground)" }}>{whitelist || '—'}</div>
          </div>

          {configUpdates && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>建议的配置更新</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2 mb-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{JSON.stringify(configUpdates, null, 2)}</pre>
              <button
                className="rounded px-2 py-1 chip-btn text-xs"
                style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
                onClick={onApplyConfigUpdates}
              >应用配置更新</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}



```

验证文件结构是否正确：


## 实施完成总结

### 已完成的工作

#### 1. 创建独立的模板文件结构
```
prompt_templates/
├── futures/
│   ├── system_prompt.txt    # 期货专用系统提示
│   └── user_prompt.hbs      # 期货专用用户提示
└── spot/
    ├── system_prompt.txt     # 现货专用系统提示
    └── user_prompt.hbs       # 现货专用用户提示
```

#### 2. 模板差异
- Futures 模板：
  - 支持杠杆（1-20x）
  - 支持做多/做空
  - 强调强制平仓价格
  - 包含杠杆字段
- Spot 模板：
  - 无杠杆
  - 只能做多
  - 强调现金管理
  - 不包含杠杆字段

#### 3. 后端修改
- 更新 `config.json`：在 `presets` 中为每个环境添加 `prompt_files` 配置
- 修改 `ai-trading-system.v2.mjs`：优先从 `presets[tradingEnv].prompt_files` 读取模板路径
- 更新 API 路由 `/api/nof1/ai/prompts`：
  - GET：支持 `?env=` 参数，根据环境返回对应模板
  - POST：支持 `env` 字段，保存到对应环境的模板文件

#### 4. 前端修改
- 在 `PromptEditorPanel` 中添加独立的“Prompt 环境”切换面板
- 添加 `promptEnv` 状态（独立于交易环境 `env`）
- 切换环境时自动加载对应的 prompt 模板
- 保存时自动保存到对应环境的模板文件

### 功能特点

1. 环境分离：Futures 和 Spot 模板完全独立，无条件渲染
2. 灵活切换：前端可独立切换 Prompt 环境和交易环境
3. 自动加载：切换 Prompt 环境时自动加载对应模板
4. 向后兼容：保留原有的全局模板路径作为默认值

### 使用说明

1. 前端使用：
   - 在“Prompt 环境”面板选择模板类型（Futures/Spot）
   - 编辑和保存会自动应用到对应环境的模板文件
   - “交易控制”面板的“交易类型”用于设置实际运行环境

2. 后端使用：
   - 系统会根据 `TRADING_ENV` 自动加载对应环境的模板
   - 支持 demo-futures, demo-spot, futures, spot 四个环境

所有修改已完成，代码已通过 lint 检查。

```plaintext
prompt_templates/
├── futures/
│   ├── system_prompt.txt    # 期货专用系统提示
│   └── user_prompt.hbs      # 期货专用用户提示
└── spot/
    ├── system_prompt.txt     # 现货专用系统提示
    └── user_prompt.hbs       # 现货专用用户提示
```

---

**User**

我在prompt编辑面板编辑后生成的 prompt, 是如何对接到AI决策系统的？帮我分析一下当前实现，看看有没有什么问题

---

**Cursor**


分析 prompt 编辑到 AI 决策系统的对接流程：


查看 prompt 如何在运行时被使用：


查看 `renderSections` 的实现，检查模板渲染逻辑：


绘制完整流程图，分析潜在问题：


```markdown
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

```

已创建分析文档。生成更详细的问题分析和建议：


## Prompt 对接流程分析总结

### 当前流程

1. 前端编辑 → 保存到文件系统
   - 用户在 `PromptEditorPanel` 编辑
   - 根据 `promptEnv` 保存到对应文件（futures/spot）

2. AI 系统启动时读取
   - 根据 `tradingEnv` 从 `config.json` 读取模板路径
   - 一次性读取到内存（`this.systemPromptTemplate`, `this.userPromptTemplate`）

3. 运行时使用
   - `generateUserPrompt()` 和 `buildSystemPrompt()` 渲染模板
   - `callDeepSeekAPI()` 发送给 AI

### 发现的问题

#### 问题 1: 模板热重载缺失（严重）

问题：
- 模板只在系统启动时读取一次
- 运行时修改文件不会生效
- 必须重启交易系统

影响：
- 用户体验差，编辑后不知道何时生效
- 需要停止交易才能看到效果

#### 问题 2: promptEnv 和 tradingEnv 可能不一致（严重）

问题：
- 前端保存用 `promptEnv`（模板环境）
- AI 系统运行时用 `tradingEnv`（交易环境）
- 两者可能不一致，导致编辑了错误的模板

示例：
```
用户在 "Prompt 环境" 选择 Spot，编辑 spot 模板并保存 ✅
但在 "交易控制" 选择 demo-futures 启动交易 ❌
结果：AI 系统读取的是 futures 模板，用户的编辑不生效
```

#### 问题 3: renderSections 调用多余（轻微）

问题：
- 新的 futures/spot 模板已不包含 `{{#is_futures}}` 标签
- 但代码仍调用 `renderSections()`，虽然不影响但冗余

#### 问题 4: 缺少错误提示

问题：
- 模板加载失败时使用默认值，但用户可能不知道

### 建议修复优先级

1. 高优先级：
   - 实现模板热重载（文件监听或手动重载 API）
   - 前端提示 promptEnv 和 tradingEnv 的一致性

2. 中优先级：
   - 移除多余的 `renderSections` 调用
   - 添加模板加载状态显示

3. 低优先级：
   - 添加模板格式验证
   - 优化用户界面提示

需要我实现这些修复吗？

```plaintext
用户在 "Prompt 环境" 选择 Spot，编辑 spot 模板并保存 ✅
但在 "交易控制" 选择 demo-futures 启动交易 ❌
结果：AI 系统读取的是 futures 模板，用户的编辑不生效
```

---

**User**

1. 模板热重载和前端提示 promptEnv 和 tradingEnv 的一致性这两个你建议怎么做。 我的想法是让用户手动按钮，而不是后台自动逻辑, 在promptEnv中加入检测当前交易类型tradingEnv? 但也不太对， 因为我后续计划 可以同时启用多个 交易控制bot, 应该是在prompt编辑功能区中先要选择想要修改的 交易控制bot tradingEnv，确认后编辑的就是这个bot对应的prompt, 只会影响该bot。 

还有现在的交易控制逻辑是点击启动后 AI模型一次载入prompt？那可以加入一个逻辑，在用户点击应用当前prompt时，正在运行模型使用修改后的prompt？

---

**Cursor**


分析当前状态管理，实现手动控制的多 bot 支持方案：


基于你的需求，设计并实现该方案：


实现你的方案：先选择要编辑的 bot，然后编辑对应 prompt，并提供“应用 Prompt”按钮。


```typescriptreact
"use client";
import { useEffect, useMemo, useState } from "react";

type Config = {
  trading_env?: string;
  allowed_symbols?: string[];
  ai?: { provider?: string; model?: string; presets?: Record<string, any> };
  data?: Record<string, any>;
};

export default function PromptEditorPanel() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(3);
  const [env, setEnv] = useState<string>("");
  const [ai, setAi] = useState<string>("");
  const [promptEnv, setPromptEnv] = useState<string>("demo-futures"); // Prompt环境切换，独立于交易环境
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [configUpdates, setConfigUpdates] = useState<any>(null);

  // 加载prompt的函数
  async function loadPrompts(env: string) {
    try {
      const url = `/api/nof1/ai/prompts${env ? `?env=${env}` : ''}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pj = await r.json();
      setSystemPrompt(pj.system || "");
      setUserPrompt(pj.user || "");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [c, s] = await Promise.all([
          fetch("/api/nof1/ai/config", { cache: "no-store" }),
          fetch("/api/nof1/ai/trading/status", { cache: "no-store" }),
        ]);
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setCfg(cj);
          setStatus(sj);
          const tradingEnv = String(cj?.trading_env || "demo-futures");
          setEnv(tradingEnv);
          setPromptEnv(tradingEnv); // 初始化为当前交易环境
          setAi("");
          // 加载对应环境的prompt
          await loadPrompts(tradingEnv);
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // 当promptEnv改变时，重新加载prompt
  useEffect(() => {
    if (promptEnv && !loading) {
      loadPrompts(promptEnv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptEnv]);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSuggest() {
    try {
      setSuggesting(true);
      setError(null);
      setRationale(null);
      setConfigUpdates(null);
      const r = await fetch("/api/nof1/ai/prompt/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const s = j?.suggestion || {};
      if (typeof s.system_prompt_en === "string") setSystemPrompt(s.system_prompt_en);
      if (typeof s.user_prompt_en === "string") setUserPrompt(s.user_prompt_en);
      if (s.rationale_en) setRationale(String(s.rationale_en));
      if (s.config_updates) setConfigUpdates(s.config_updates);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function onApplyConfigUpdates() {
    if (!configUpdates) return;
    try {
      const r = await fetch("/api/nof1/ai/config/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config_updates: configUpdates })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next = await r.json();
      setCfg(next);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const whitelist = useMemo(() => (cfg?.allowed_symbols || []).join(", "), [cfg]);
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);
  const isRunning = !!status?.running;

  async function startTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intervalMinutes, env, ai })
      });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function stopTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  return (
    <aside className="h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Prompt 工作台</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ color: "var(--btn-inactive-fg)", border: "1px solid var(--chip-border)" }}
            onClick={onSuggest}
            disabled={suggesting}
          >{suggesting ? '建议中…' : '建议'}</button>
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
            onClick={onSave}
            disabled={saving}
          >{saving ? '保存中…' : '保存'}</button>
        </div>
      </div>

      {/* Bot选择 - 选择要编辑的Bot */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>选择 Bot</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易环境</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={promptEnv}
                  onChange={(e) => setPromptEnv(e.target.value)}>
            <option value="demo-futures">demo-futures (期货演示)</option>
            <option value="demo-spot">demo-spot (现货演示)</option>
            <option value="futures">futures (期货生产)</option>
            <option value="spot">spot (现货生产)</option>
          </select>
        </div>
        <div className="text-[10px] mb-2" style={{ color: 'var(--muted-text)' }}>
          {promptEnv.includes('futures') ? '⚠️ 将编辑期货Bot的Prompt（支持杠杆、做多做空）' : '⚠️ 将编辑现货Bot的Prompt（无杠杆、只能做多）'}
        </div>
        {status?.running && status?.env && (
          <div className="text-[10px]" style={{ color: status.env === promptEnv ? 'var(--success)' : 'var(--warning)' }}>
            {status.env === promptEnv 
              ? `✅ 当前运行的Bot使用此环境 (pid=${status.pid})`
              : `⚠️ 当前运行的是 ${status.env} Bot，编辑的模板不会影响运行中的Bot`
            }
          </div>
        )}
      </div>

      {/* 交易控制 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易类型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}>
            {['demo-futures','demo-spot','futures','spot'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">AI模型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={ai}
                  onChange={(e) => setAi(e.target.value)}>
            <option value="">(默认)</option>
            {aiPresetKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">间隔(分)</label>
          <input className="col-span-2 rounded border px-2 py-1"
                 style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                 type="number" min={1} value={intervalMinutes}
                 onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))} />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }}
                  onClick={startTrading}
                  disabled={isRunning}>启动</button>
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }}
                  onClick={stopTrading}
                  disabled={!isRunning}>停止</button>
          <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
            状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--chip-border)", color: "var(--danger)" }}>{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500">加载中…</div>
      ) : (
        <>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>System Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-40 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>User Prompt</div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-48 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>

          {rationale && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>Rationale</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{rationale}</pre>
            </div>
          )}

          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>符号白名单</div>
            <div className="text-xs" style={{ color: "var(--foreground)" }}>{whitelist || '—'}</div>
          </div>

          {configUpdates && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>建议的配置更新</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2 mb-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{JSON.stringify(configUpdates, null, 2)}</pre>
              <button
                className="rounded px-2 py-1 chip-btn text-xs"
                style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
                onClick={onApplyConfigUpdates}
              >应用配置更新</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}



```

```typescriptreact
"use client";
import { useEffect, useMemo, useState } from "react";

type Config = {
  trading_env?: string;
  allowed_symbols?: string[];
  ai?: { provider?: string; model?: string; presets?: Record<string, any> };
  data?: Record<string, any>;
};

export default function PromptEditorPanel() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(3);
  const [env, setEnv] = useState<string>("");
  const [ai, setAi] = useState<string>("");
  const [promptEnv, setPromptEnv] = useState<string>("demo-futures"); // Prompt环境切换，独立于交易环境
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [configUpdates, setConfigUpdates] = useState<any>(null);

  // 加载prompt的函数
  async function loadPrompts(env: string) {
    try {
      const url = `/api/nof1/ai/prompts${env ? `?env=${env}` : ''}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pj = await r.json();
      setSystemPrompt(pj.system || "");
      setUserPrompt(pj.user || "");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [c, s] = await Promise.all([
          fetch("/api/nof1/ai/config", { cache: "no-store" }),
          fetch("/api/nof1/ai/trading/status", { cache: "no-store" }),
        ]);
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setCfg(cj);
          setStatus(sj);
          const tradingEnv = String(cj?.trading_env || "demo-futures");
          setEnv(tradingEnv);
          setPromptEnv(tradingEnv); // 初始化为当前交易环境
          setAi("");
          // 加载对应环境的prompt
          await loadPrompts(tradingEnv);
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // 当promptEnv改变时，重新加载prompt
  useEffect(() => {
    if (promptEnv && !loading) {
      loadPrompts(promptEnv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptEnv]);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // 保存成功提示
      const saved = await r.json();
      setError(null);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onApplyPrompt() {
    if (!status?.running) {
      setError('没有运行中的Bot，无法应用Prompt');
      return;
    }
    if (status?.env !== promptEnv) {
      setError(`当前运行的Bot环境是 ${status.env}，但编辑的是 ${promptEnv} 的模板，不匹配！`);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      // 先保存文件
      await onSave();
      // 然后触发重新加载
      const r = await fetch("/api/nof1/ai/trading/reload-prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const result = await r.json();
      setError(null);
      // 可以显示成功消息
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSuggest() {
    try {
      setSuggesting(true);
      setError(null);
      setRationale(null);
      setConfigUpdates(null);
      const r = await fetch("/api/nof1/ai/prompt/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const s = j?.suggestion || {};
      if (typeof s.system_prompt_en === "string") setSystemPrompt(s.system_prompt_en);
      if (typeof s.user_prompt_en === "string") setUserPrompt(s.user_prompt_en);
      if (s.rationale_en) setRationale(String(s.rationale_en));
      if (s.config_updates) setConfigUpdates(s.config_updates);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function onApplyConfigUpdates() {
    if (!configUpdates) return;
    try {
      const r = await fetch("/api/nof1/ai/config/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config_updates: configUpdates })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next = await r.json();
      setCfg(next);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const whitelist = useMemo(() => (cfg?.allowed_symbols || []).join(", "), [cfg]);
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);
  const isRunning = !!status?.running;

  async function startTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intervalMinutes, env, ai })
      });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function stopTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  return (
    <aside className="h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Prompt 工作台</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ color: "var(--btn-inactive-fg)", border: "1px solid var(--chip-border)" }}
            onClick={onSuggest}
            disabled={suggesting}
          >{suggesting ? '建议中…' : '建议'}</button>
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
            onClick={onSave}
            disabled={saving}
          >{saving ? '保存中…' : '保存'}</button>
        </div>
      </div>

      {/* Bot选择 - 选择要编辑的Bot */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>选择 Bot</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易环境</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={promptEnv}
                  onChange={(e) => setPromptEnv(e.target.value)}>
            <option value="demo-futures">demo-futures (期货演示)</option>
            <option value="demo-spot">demo-spot (现货演示)</option>
            <option value="futures">futures (期货生产)</option>
            <option value="spot">spot (现货生产)</option>
          </select>
        </div>
        <div className="text-[10px] mb-2" style={{ color: 'var(--muted-text)' }}>
          {promptEnv.includes('futures') ? '⚠️ 将编辑期货Bot的Prompt（支持杠杆、做多做空）' : '⚠️ 将编辑现货Bot的Prompt（无杠杆、只能做多）'}
        </div>
        {status?.running && status?.env && (
          <div className="text-[10px]" style={{ color: status.env === promptEnv ? 'var(--success)' : 'var(--warning)' }}>
            {status.env === promptEnv 
              ? `✅ 当前运行的Bot使用此环境 (pid=${status.pid})`
              : `⚠️ 当前运行的是 ${status.env} Bot，编辑的模板不会影响运行中的Bot`
            }
          </div>
        )}
      </div>

      {/* 交易控制 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易类型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}>
            {['demo-futures','demo-spot','futures','spot'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">AI模型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={ai}
                  onChange={(e) => setAi(e.target.value)}>
            <option value="">(默认)</option>
            {aiPresetKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">间隔(分)</label>
          <input className="col-span-2 rounded border px-2 py-1"
                 style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                 type="number" min={1} value={intervalMinutes}
                 onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))} />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }}
                  onClick={startTrading}
                  disabled={isRunning}>启动</button>
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }}
                  onClick={stopTrading}
                  disabled={!isRunning}>停止</button>
          <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
            状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--chip-border)", color: "var(--danger)" }}>{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500">加载中…</div>
      ) : (
        <>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>System Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-40 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>User Prompt</div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-48 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>

          {rationale && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>Rationale</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{rationale}</pre>
            </div>
          )}

          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>符号白名单</div>
            <div className="text-xs" style={{ color: "var(--foreground)" }}>{whitelist || '—'}</div>
          </div>

          {configUpdates && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>建议的配置更新</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2 mb-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{JSON.stringify(configUpdates, null, 2)}</pre>
              <button
                className="rounded px-2 py-1 chip-btn text-xs"
                style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
                onClick={onApplyConfigUpdates}
              >应用配置更新</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}



```

```typescriptreact
"use client";
import { useEffect, useMemo, useState } from "react";

type Config = {
  trading_env?: string;
  allowed_symbols?: string[];
  ai?: { provider?: string; model?: string; presets?: Record<string, any> };
  data?: Record<string, any>;
};

export default function PromptEditorPanel() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(3);
  const [env, setEnv] = useState<string>("");
  const [ai, setAi] = useState<string>("");
  const [promptEnv, setPromptEnv] = useState<string>("demo-futures"); // Prompt环境切换，独立于交易环境
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [configUpdates, setConfigUpdates] = useState<any>(null);

  // 加载prompt的函数
  async function loadPrompts(env: string) {
    try {
      const url = `/api/nof1/ai/prompts${env ? `?env=${env}` : ''}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pj = await r.json();
      setSystemPrompt(pj.system || "");
      setUserPrompt(pj.user || "");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [c, s] = await Promise.all([
          fetch("/api/nof1/ai/config", { cache: "no-store" }),
          fetch("/api/nof1/ai/trading/status", { cache: "no-store" }),
        ]);
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setCfg(cj);
          setStatus(sj);
          const tradingEnv = String(cj?.trading_env || "demo-futures");
          setEnv(tradingEnv);
          setPromptEnv(tradingEnv); // 初始化为当前交易环境
          setAi("");
          // 加载对应环境的prompt
          await loadPrompts(tradingEnv);
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // 当promptEnv改变时，重新加载prompt
  useEffect(() => {
    if (promptEnv && !loading) {
      loadPrompts(promptEnv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptEnv]);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // 保存成功提示
      const saved = await r.json();
      setError(null);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onApplyPrompt() {
    if (!status?.running) {
      setError('没有运行中的Bot，无法应用Prompt');
      return;
    }
    if (status?.env !== promptEnv) {
      setError(`当前运行的Bot环境是 ${status.env}，但编辑的是 ${promptEnv} 的模板，不匹配！`);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      // 先保存文件
      await onSave();
      // 然后触发重新加载
      const r = await fetch("/api/nof1/ai/trading/reload-prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const result = await r.json();
      setError(null);
      // 可以显示成功消息
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSuggest() {
    try {
      setSuggesting(true);
      setError(null);
      setRationale(null);
      setConfigUpdates(null);
      const r = await fetch("/api/nof1/ai/prompt/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const s = j?.suggestion || {};
      if (typeof s.system_prompt_en === "string") setSystemPrompt(s.system_prompt_en);
      if (typeof s.user_prompt_en === "string") setUserPrompt(s.user_prompt_en);
      if (s.rationale_en) setRationale(String(s.rationale_en));
      if (s.config_updates) setConfigUpdates(s.config_updates);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function onApplyConfigUpdates() {
    if (!configUpdates) return;
    try {
      const r = await fetch("/api/nof1/ai/config/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config_updates: configUpdates })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next = await r.json();
      setCfg(next);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const whitelist = useMemo(() => (cfg?.allowed_symbols || []).join(", "), [cfg]);
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);
  const isRunning = !!status?.running;

  async function startTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intervalMinutes, env, ai })
      });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function stopTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  return (
    <aside className="h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Prompt 工作台</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ color: "var(--btn-inactive-fg)", border: "1px solid var(--chip-border)" }}
            onClick={onSuggest}
            disabled={suggesting}
          >{suggesting ? '建议中…' : '建议'}</button>
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
            onClick={onSave}
            disabled={saving}
            title="保存Prompt模板到文件（不会立即生效，需要重启Bot或点击'应用Prompt'）"
          >{saving ? '保存中…' : '保存'}</button>
          {isRunning && status?.env === promptEnv && (
            <button
              className="rounded px-2 py-1 chip-btn"
              style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
              onClick={onApplyPrompt}
              disabled={saving}
              title="保存并立即应用到运行中的Bot"
            >{saving ? '应用中…' : '应用Prompt'}</button>
          )}
        </div>
      </div>

      {/* Bot选择 - 选择要编辑的Bot */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>选择 Bot</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易环境</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={promptEnv}
                  onChange={(e) => setPromptEnv(e.target.value)}>
            <option value="demo-futures">demo-futures (期货演示)</option>
            <option value="demo-spot">demo-spot (现货演示)</option>
            <option value="futures">futures (期货生产)</option>
            <option value="spot">spot (现货生产)</option>
          </select>
        </div>
        <div className="text-[10px] mb-2" style={{ color: 'var(--muted-text)' }}>
          {promptEnv.includes('futures') ? '⚠️ 将编辑期货Bot的Prompt（支持杠杆、做多做空）' : '⚠️ 将编辑现货Bot的Prompt（无杠杆、只能做多）'}
        </div>
        {status?.running && status?.env && (
          <div className="text-[10px]" style={{ color: status.env === promptEnv ? 'var(--success)' : 'var(--warning)' }}>
            {status.env === promptEnv 
              ? `✅ 当前运行的Bot使用此环境 (pid=${status.pid})`
              : `⚠️ 当前运行的是 ${status.env} Bot，编辑的模板不会影响运行中的Bot`
            }
          </div>
        )}
      </div>

      {/* 交易控制 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易类型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}>
            {['demo-futures','demo-spot','futures','spot'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">AI模型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={ai}
                  onChange={(e) => setAi(e.target.value)}>
            <option value="">(默认)</option>
            {aiPresetKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">间隔(分)</label>
          <input className="col-span-2 rounded border px-2 py-1"
                 style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                 type="number" min={1} value={intervalMinutes}
                 onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))} />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }}
                  onClick={startTrading}
                  disabled={isRunning}>启动</button>
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }}
                  onClick={stopTrading}
                  disabled={!isRunning}>停止</button>
          <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
            状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--chip-border)", color: "var(--danger)" }}>{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500">加载中…</div>
      ) : (
        <>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>System Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-40 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>User Prompt</div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-48 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>

          {rationale && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>Rationale</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{rationale}</pre>
            </div>
          )}

          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>符号白名单</div>
            <div className="text-xs" style={{ color: "var(--foreground)" }}>{whitelist || '—'}</div>
          </div>

          {configUpdates && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>建议的配置更新</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2 mb-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{JSON.stringify(configUpdates, null, 2)}</pre>
              <button
                className="rounded px-2 py-1 chip-btn text-xs"
                style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
                onClick={onApplyConfigUpdates}
              >应用配置更新</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}



```

```typescriptreact
"use client";
import { useEffect, useMemo, useState } from "react";

type Config = {
  trading_env?: string;
  allowed_symbols?: string[];
  ai?: { provider?: string; model?: string; presets?: Record<string, any> };
  data?: Record<string, any>;
};

export default function PromptEditorPanel() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(3);
  const [env, setEnv] = useState<string>("");
  const [ai, setAi] = useState<string>("");
  const [promptEnv, setPromptEnv] = useState<string>("demo-futures"); // Prompt环境切换，独立于交易环境
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [configUpdates, setConfigUpdates] = useState<any>(null);

  // 加载prompt的函数
  async function loadPrompts(env: string) {
    try {
      const url = `/api/nof1/ai/prompts${env ? `?env=${env}` : ''}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pj = await r.json();
      setSystemPrompt(pj.system || "");
      setUserPrompt(pj.user || "");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [c, s] = await Promise.all([
          fetch("/api/nof1/ai/config", { cache: "no-store" }),
          fetch("/api/nof1/ai/trading/status", { cache: "no-store" }),
        ]);
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setCfg(cj);
          setStatus(sj);
          const tradingEnv = String(cj?.trading_env || "demo-futures");
          setEnv(tradingEnv);
          // 如果有运行的bot，使用bot的环境；否则使用配置的默认环境
          const activeEnv = sj?.running && sj?.env ? sj.env : tradingEnv;
          setPromptEnv(activeEnv);
          setAi("");
          // 加载对应环境的prompt
          await loadPrompts(tradingEnv);
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // 当promptEnv改变时，重新加载prompt
  useEffect(() => {
    if (promptEnv && !loading) {
      loadPrompts(promptEnv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptEnv]);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // 保存成功提示
      const saved = await r.json();
      setError(null);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onApplyPrompt() {
    if (!status?.running) {
      setError('没有运行中的Bot，无法应用Prompt');
      return;
    }
    if (status?.env !== promptEnv) {
      setError(`当前运行的Bot环境是 ${status.env}，但编辑的是 ${promptEnv} 的模板，不匹配！`);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      // 先保存文件
      await onSave();
      // 然后触发重新加载
      const r = await fetch("/api/nof1/ai/trading/reload-prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const result = await r.json();
      setError(null);
      // 可以显示成功消息
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSuggest() {
    try {
      setSuggesting(true);
      setError(null);
      setRationale(null);
      setConfigUpdates(null);
      const r = await fetch("/api/nof1/ai/prompt/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const s = j?.suggestion || {};
      if (typeof s.system_prompt_en === "string") setSystemPrompt(s.system_prompt_en);
      if (typeof s.user_prompt_en === "string") setUserPrompt(s.user_prompt_en);
      if (s.rationale_en) setRationale(String(s.rationale_en));
      if (s.config_updates) setConfigUpdates(s.config_updates);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function onApplyConfigUpdates() {
    if (!configUpdates) return;
    try {
      const r = await fetch("/api/nof1/ai/config/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config_updates: configUpdates })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next = await r.json();
      setCfg(next);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const whitelist = useMemo(() => (cfg?.allowed_symbols || []).join(", "), [cfg]);
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);
  const isRunning = !!status?.running;

  async function startTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intervalMinutes, env, ai })
      });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function stopTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  return (
    <aside className="h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Prompt 工作台</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ color: "var(--btn-inactive-fg)", border: "1px solid var(--chip-border)" }}
            onClick={onSuggest}
            disabled={suggesting}
          >{suggesting ? '建议中…' : '建议'}</button>
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
            onClick={onSave}
            disabled={saving}
            title="保存Prompt模板到文件（不会立即生效，需要重启Bot或点击'应用Prompt'）"
          >{saving ? '保存中…' : '保存'}</button>
          {isRunning && status?.env === promptEnv && (
            <button
              className="rounded px-2 py-1 chip-btn"
              style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
              onClick={onApplyPrompt}
              disabled={saving}
              title="保存并立即应用到运行中的Bot"
            >{saving ? '应用中…' : '应用Prompt'}</button>
          )}
        </div>
      </div>

      {/* Bot选择 - 选择要编辑的Bot */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>选择 Bot</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易环境</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={promptEnv}
                  onChange={(e) => setPromptEnv(e.target.value)}>
            <option value="demo-futures">demo-futures (期货演示)</option>
            <option value="demo-spot">demo-spot (现货演示)</option>
            <option value="futures">futures (期货生产)</option>
            <option value="spot">spot (现货生产)</option>
          </select>
        </div>
        <div className="text-[10px] mb-2" style={{ color: 'var(--muted-text)' }}>
          {promptEnv.includes('futures') ? '⚠️ 将编辑期货Bot的Prompt（支持杠杆、做多做空）' : '⚠️ 将编辑现货Bot的Prompt（无杠杆、只能做多）'}
        </div>
        {status?.running && status?.env && (
          <div className="text-[10px]" style={{ color: status.env === promptEnv ? 'var(--success)' : 'var(--warning)' }}>
            {status.env === promptEnv 
              ? `✅ 当前运行的Bot使用此环境 (pid=${status.pid})`
              : `⚠️ 当前运行的是 ${status.env} Bot，编辑的模板不会影响运行中的Bot`
            }
          </div>
        )}
      </div>

      {/* 交易控制 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易类型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}>
            {['demo-futures','demo-spot','futures','spot'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">AI模型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={ai}
                  onChange={(e) => setAi(e.target.value)}>
            <option value="">(默认)</option>
            {aiPresetKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">间隔(分)</label>
          <input className="col-span-2 rounded border px-2 py-1"
                 style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                 type="number" min={1} value={intervalMinutes}
                 onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))} />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }}
                  onClick={startTrading}
                  disabled={isRunning}>启动</button>
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }}
                  onClick={stopTrading}
                  disabled={!isRunning}>停止</button>
          <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
            状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--chip-border)", color: "var(--danger)" }}>{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500">加载中…</div>
      ) : (
        <>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>System Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-40 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>User Prompt</div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-48 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>

          {rationale && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>Rationale</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{rationale}</pre>
            </div>
          )}

          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>符号白名单</div>
            <div className="text-xs" style={{ color: "var(--foreground)" }}>{whitelist || '—'}</div>
          </div>

          {configUpdates && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>建议的配置更新</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2 mb-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{JSON.stringify(configUpdates, null, 2)}</pre>
              <button
                className="rounded px-2 py-1 chip-btn text-xs"
                style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
                onClick={onApplyConfigUpdates}
              >应用配置更新</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}



```

修改后端，添加重新加载 prompt 的机制：


```javascript
import express from 'express';
import { getPrices, getAccountBalance, getRealTimeAccountData } from '../services/binance.js';
import { loadJson, saveJson } from '../store/fsStore.js';
import { deriveAccountTotals, deriveLeaderboard, deriveSinceInception } from '../services/metrics.js';
import fs from 'fs/promises';
import { watch } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import fetch from 'node-fetch';
import { tradingRunner } from '../services/runner.js';

export const router = express.Router();

// Health
router.get('/health', (req, res) => res.json({ ok: true }));

// GET /crypto-prices
router.get('/crypto-prices', async (req, res) => {
  try {
    const symbols = (process.env.SYMBOLS || 'BTC/USDT,ETH/USDT,SOL/USDT,BNB/USDT,DOGE/USDT,XRP/USDT')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const prices = await getPrices(symbols);
    res.json({ prices, serverTime: Date.now() });
  } catch (e) {
    console.error('[crypto-prices] 错误:', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Static JSON-backed endpoints
router.get('/trades', async (req, res) => {
  const trades = await loadJson('trades.json', { trades: [] });
  // 优先返回真实成交（有 orderId 或 side 字段）
  const realTrades = (trades.trades || []).filter(t => t.orderId || t.side);
  if (realTrades.length > 0) {
    // 转换成前端需要的格式
    const normalized = realTrades.map((t, idx) => {
      const ts = t.exit_time || t.timestamp || Math.floor(Date.now() / 1000);
      const symbol = (t.symbol || 'UNKNOWN').toUpperCase().replace(/:USDT$/, '').split('/')[0];
      const sideRaw = String(t.side || '').toUpperCase();
      const side = (sideRaw === 'BUY' || sideRaw === 'LONG') ? 'long' : 
                   (sideRaw === 'SELL' || sideRaw === 'SHORT') ? 'short' : 'long';
      
      return {
        id: t.orderId ? String(t.orderId) : `${symbol}-${ts}-${idx}`,
        model_id: t.model_id || 'default',
        symbol,
        side,
        entry_price: Number(t.entry_price || t.price || 0),
        exit_price: Number(t.exit_price || t.price || 0),
        quantity: Number(t.quantity || 0),
        leverage: Number(t.leverage || 1),
        entry_time: Number(t.entry_time || ts - 3600),
        exit_time: Number(ts),
        realized_net_pnl: Number(t.realized_net_pnl || 0),
        realized_gross_pnl: Number(t.realized_gross_pnl || t.realized_net_pnl || 0),
        total_commission_dollars: Number(t.total_commission_dollars || t.commission || 0),
      };
    });
    return res.json({ trades: normalized });
  }
  // 从 conversations 推导决策记录
  try {
    const buf = await fs.readFile(CONV_FILE, 'utf8');
    const raw = JSON.parse(buf);
    const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
    const out = [];
    
    for (const c of arr) {
      const tsIso = c?.timestamp || new Date().toISOString();
      const ts = Math.floor(new Date(tsIso).getTime() / 1000);
      const d = c?.decision_normalized || {};
      const action = String(d?.action || '').toLowerCase();
      const base = (d?.symbol || '').toString().toUpperCase().replace(/:USDT$/, '');
      const symbol = base.includes('/') ? base.split('/')[0] : base;
      const quantity = Number.isFinite(Number(d?.quantity)) ? Number(d.quantity) : 0;
      const leverage = Number.isFinite(Number(d?.leverage)) ? Number(d.leverage) : 1;
      
      if (!symbol) continue;
      
      // buy 表示开多仓
      if (action === 'buy') {
        out.push({
          id: `${symbol}-${ts}-buy`,
          model_id: 'default',
          side: 'long',
          symbol,
          entry_time: ts,
          entry_price: 0,
          exit_time: ts,
          exit_price: 0,
          quantity,
          leverage,
          realized_net_pnl: 0,
          realized_gross_pnl: 0,
          total_commission_dollars: 0,
        });
      } 
      // sell 或 close_position 表示平仓
      else if (action === 'sell' || action === 'close_position') {
        out.push({
          id: `${symbol}-${ts}-close`,
          model_id: 'default',
          side: 'long', // 平仓假设是long
          symbol,
          entry_time: ts - 3600, // 假设1小时前开仓
          entry_price: 0,
          exit_time: ts,
          exit_price: 0,
          quantity,
          leverage,
          realized_net_pnl: 0,
          realized_gross_pnl: 0,
          total_commission_dollars: 0,
        });
      }
    }
    
    if (out.length > 0) {
      return res.json({ trades: out });
    }
  } catch (e) {
    console.error('从conversations推导trades失败:', e.message);
  }
  
  // 如果都没有，返回空数组
  return res.json({ trades: [] });
});

// conversations.json 解析 + 文件监听缓存
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const TEST_DIR = path.resolve(__dirname, '..', '..', 'test');
const CONV_FILE = path.join(DATA_DIR, 'conversations.json');
let conversationsCache = { merged: { conversations: [{ model_id: 'default', messages: [] }] }, lastLoaded: 0 };

async function loadAndMergeConversations() {
  try {
    const buf = await fs.readFile(CONV_FILE, 'utf8');
    const raw = JSON.parse(buf);
    const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
    const messages = [];
    for (const c of arr.slice().reverse()) { // 时间正序
      const ts = c?.timestamp || new Date().toISOString();
      if (c?.userPrompt) messages.push({ role: 'user', content: String(c.userPrompt), timestamp: ts });
      if (c?.aiResponse != null) messages.push({ role: 'assistant', content: String(c.aiResponse), timestamp: ts });
    }
    conversationsCache.merged = { conversations: [{ model_id: 'default', messages }] };
    conversationsCache.lastLoaded = Date.now();
  } catch (_) {
    conversationsCache.merged = { conversations: [{ model_id: 'default', messages: [] }] };
    conversationsCache.lastLoaded = Date.now();
  }
}

router.get('/conversations', async (req, res) => {
  // 返回结构化的交易对话数据，兼容前端期望的格式
  try {
    async function readConv(filePath) {
      const buf = await fs.readFile(filePath, 'utf8');
      const raw = JSON.parse(buf);
      const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
      const items = [];
      
      for (const c of arr) {
        const ts = c?.timestamp || new Date().toISOString();
        const tsUnix = typeof ts === 'string' ? Math.floor(new Date(ts).getTime() / 1000) : ts;
        
        // 提取决策信息用于摘要
        const decision = c?.decision || c?.decision_normalized || {};
        const action = String(decision?.action || 'hold').toLowerCase();
        const symbol = decision?.symbol || '';
        const reasoning = decision?.reasoning || '';
        
        // 构建对话摘要（用于列表显示）
        let summary = '';
        if (action === 'buy' || action === 'long') {
          summary = `📈 买入 ${symbol}`;
        } else if (action === 'sell' || action === 'short') {
          summary = `📉 卖出 ${symbol}`;
        } else if (action === 'close_position' || action === 'close') {
          summary = `🔚 平仓 ${symbol}`;
        } else {
          summary = `⏸️ 保持观望`;
        }
        
        // 添加推理内容（完整显示）
        if (reasoning) {
          summary += ` - ${reasoning}`;
        }
        
        // 构建结构化条目
        items.push({
          model_id: 'deepseek-chat',  // 默认模型ID，可以从配置读取
          timestamp: tsUnix,
          inserted_at: tsUnix,
          invocationCount: c?.invocationCount || 0,
          
          // 摘要信息（用于列表显示）
          cot_trace_summary: summary,
          summary: summary,
          
          // 原始提示和响应
          user_prompt: c?.userPrompt || '',
          
          // LLM 响应的结构化数据
          llm_response: {
            raw_text: c?.aiResponse || '',
            parsed: c?.aiParsed || null,
            decision: c?.decision || null,
            decision_normalized: c?.decision_normalized || null,
            trading_decisions: c?.trading_decisions || null
          },
          
          // 思维链追踪（包含技术分析数据）
          cot_trace: {
            action: action,
            symbol: symbol,
            reasoning: reasoning,
            analysis: c?.aiParsed?.analysis || null,
            account_management: c?.aiParsed?.account_management || null,
            chain_of_thought: c?.chain_of_thought || null
          },
          
          // 账户状态
          account: {
            accountValue: c?.accountValue || 0,
            totalReturn: c?.totalReturn || 0
          },
          
          // 完整的原始数据（用于详细展示）
          raw: c
        });
        
        if (items.length >= 100) break;  // 限制返回数量
      }
      
      return items;
    }

    // 优先读 backend/data/conversations.json；若为空则回退到 backend/test/trading-conversations.json
    let items = [];
    try { items = await readConv(CONV_FILE); } catch (_) {}
    if (!items.length) {
      const TEST_CONV = path.join(TEST_DIR, 'trading-conversations.json');
      try { items = await readConv(TEST_CONV); } catch (_) {}
    }
    
    return res.json({ conversations: items });
  } catch (e) {
    console.error('Conversations API error:', e);
    return res.json({ conversations: [] });
  }
});

router.get('/analytics', async (req, res) => {
  const analytics = await loadJson('analytics.json', { analytics: [] });
  if (Array.isArray(analytics.analytics) && analytics.analytics.length > 0) {
    return res.json(analytics);
  }
  try {
    const buf = await fs.readFile(CONV_FILE, 'utf8');
    const raw = JSON.parse(buf);
    const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
    const latest = arr[0] || null;
    let summary = '';
    if (latest) {
      summary = String(
        latest?.aiParsed?.analysis?.market_summary ||
        latest?.decision_normalized?.reasoning ||
        (latest?.aiResponse ? String(latest.aiResponse).slice(0, 400) : '')
      );
    }
    const out = { analytics: [ { type: 'summary', model_id: 'default', text: summary } ] };
    // 将推导结果写回文件，便于前端与其他端点复用
    try { await saveJson('analytics.json', out); } catch (_) {}
    return res.json(out);
  } catch (_) {
    return res.json({ analytics: [] });
  }
});

// Prompts read/write
router.get('/prompts', async (req, res) => {
  const prompts = await loadJson('prompts.json', { system: '', user: '' });
  res.json(prompts);
});

router.post('/prompts', async (req, res) => {
  const body = req.body || {};
  const next = { system: String(body.system || ''), user: String(body.user || '') };
  await saveJson('prompts.json', next);
  res.json(next);
});

// AI prompts via files (system/user templates)
const AI_BASE_DIR = path.resolve(__dirname, '..', '..', 'ai', 'ai-trading');
const TPL_DIR = path.join(AI_BASE_DIR, 'prompt_templates');
const SYS_TPL = path.join(TPL_DIR, 'system_prompt.txt');
const USER_TPL = path.join(TPL_DIR, 'user_prompt.hbs');
const CFG_FILE = path.join(AI_BASE_DIR, 'config.json');

router.get('/ai/prompts', async (req, res) => {
  try {
    const env = String(req.query.env || '').toLowerCase();
    const isFutures = env === 'demo-futures' || env === 'futures';
    
    // 根据环境选择模板路径
    let sysPath = SYS_TPL;
    let userPath = USER_TPL;
    
    if (env && (env === 'demo-futures' || env === 'futures')) {
      sysPath = path.join(TPL_DIR, 'futures', 'system_prompt.txt');
      userPath = path.join(TPL_DIR, 'futures', 'user_prompt.hbs');
    } else if (env && (env === 'demo-spot' || env === 'spot')) {
      sysPath = path.join(TPL_DIR, 'spot', 'system_prompt.txt');
      userPath = path.join(TPL_DIR, 'spot', 'user_prompt.hbs');
    }
    
    const [sys, user] = await Promise.all([
      fs.readFile(sysPath, 'utf8').catch(() => ''),
      fs.readFile(userPath, 'utf8').catch(() => ''),
    ]);
    res.json({ system: sys, user, env: env || 'default' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.post('/ai/prompts', async (req, res) => {
  try {
    const body = req.body || {};
    const system = String(body.system || '');
    const user = String(body.user || '');
    const env = String(body.env || '').toLowerCase();
    
    // 根据环境选择保存路径
    let sysPath = SYS_TPL;
    let userPath = USER_TPL;
    
    if (env && (env === 'demo-futures' || env === 'futures')) {
      sysPath = path.join(TPL_DIR, 'futures', 'system_prompt.txt');
      userPath = path.join(TPL_DIR, 'futures', 'user_prompt.hbs');
    } else if (env && (env === 'demo-spot' || env === 'spot')) {
      sysPath = path.join(TPL_DIR, 'spot', 'system_prompt.txt');
      userPath = path.join(TPL_DIR, 'spot', 'user_prompt.hbs');
    }
    
    await fs.mkdir(path.dirname(sysPath), { recursive: true }).catch(() => {});
    await Promise.all([
      fs.writeFile(sysPath, system, 'utf8'),
      fs.writeFile(userPath, user, 'utf8'),
      // keep a JSON mirror for legacy UI
      saveJson('prompts.json', { system, user }),
    ]);
    res.json({ system, user, env: env || 'default' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Diff between current templates and proposed ones
router.post('/ai/prompt/diff', async (req, res) => {
  try {
    const curSys = await fs.readFile(SYS_TPL, 'utf8').catch(() => '');
    const curUsr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    const nextSys = String(req.body?.system || '');
    const nextUsr = String(req.body?.user || '');
    function simpleDiff(a, b) {
      const al = String(a).split(/\r?\n/);
      const bl = String(b).split(/\r?\n/);
      const max = Math.max(al.length, bl.length);
      const out = [];
      for (let i = 0; i < max; i++) {
        const L = al[i] ?? '';
        const R = bl[i] ?? '';
        if (L === R) out.push(`  ${L}`);
        else {
          if (L) out.push(`- ${L}`);
          if (R) out.push(`+ ${R}`);
        }
      }
      return out.join('\n');
    }
    res.json({
      system_diff: simpleDiff(curSys, nextSys),
      user_diff: simpleDiff(curUsr, nextUsr)
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Apply proposed templates with timestamped backup
router.post('/ai/prompt/apply', async (req, res) => {
  try {
    const nextSys = String(req.body?.system || '');
    const nextUsr = String(req.body?.user || '');
    await fs.mkdir(TPL_DIR, { recursive: true }).catch(() => {});
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    // backup
    const curSys = await fs.readFile(SYS_TPL, 'utf8').catch(() => '');
    const curUsr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    if (curSys) await fs.writeFile(`${SYS_TPL}.${ts}.bak`, curSys, 'utf8');
    if (curUsr) await fs.writeFile(`${USER_TPL}.${ts}.bak`, curUsr, 'utf8');
    // write new
    await fs.writeFile(SYS_TPL, nextSys, 'utf8');
    await fs.writeFile(USER_TPL, nextUsr, 'utf8');
    // mirror json
    await saveJson('prompts.json', { system: nextSys, user: nextUsr });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Revert to the latest .bak
router.post('/ai/prompt/revert', async (req, res) => {
  try {
    async function latestBak(base) {
      const dir = path.dirname(base);
      const name = path.basename(base);
      const entries = await fs.readdir(dir).catch(() => []);
      const baks = entries.filter((f) => f.startsWith(name + '.') && f.endsWith('.bak'));
      if (!baks.length) return null;
      const stats = await Promise.all(
        baks.map(async (f) => ({ f, s: await fs.stat(path.join(dir, f)).catch(() => ({ mtimeMs: 0 })) }))
      );
      stats.sort((a, b) => b.s.mtimeMs - a.s.mtimeMs);
      return path.join(dir, stats[0].f);
    }
    const sysBak = await latestBak(SYS_TPL);
    const usrBak = await latestBak(USER_TPL);
    if (!sysBak && !usrBak) return res.status(404).json({ error: 'no_backup' });
    if (sysBak) {
      const c = await fs.readFile(sysBak, 'utf8');
      await fs.writeFile(SYS_TPL, c, 'utf8');
    }
    if (usrBak) {
      const c = await fs.readFile(usrBak, 'utf8');
      await fs.writeFile(USER_TPL, c, 'utf8');
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Extract placeholders from user template
router.get('/ai/prompt/placeholders', async (req, res) => {
  try {
    const usr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    const m = Array.from(usr.matchAll(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g)).map((x) => x[1]);
    const unique = Array.from(new Set(m));
    res.json({ placeholders: unique });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Capabilities compact object (static without live exchange)
router.get('/ai/capabilities/compact', async (req, res) => {
  try {
    const cfg = JSON.parse(await fs.readFile(CFG_FILE, 'utf8'));
    const out = {
      exchange: { id: 'binance', name: 'Binance', futures: cfg.trading_env?.includes('futures') || false, marketType: cfg.trading_env || 'demo-futures' },
      timeframes: ['1m','3m','5m','15m','1h','4h','1d'],
      api_has: { fetchOHLCV: true, fetchTicker: true, fetchBalance: true, fetchPositions: true, createOrder: true, fetchOrder: true },
      schemas: {
        ticker: { symbol: 'string', last: 'number', bid: 'number', ask: 'number', baseVolume: 'number', quoteVolume: 'number' },
        ohlcv: ['ts','open','high','low','close','volume'],
        balance: { USDT: { free: 'number', used: 'number', total: 'number' } },
        position: { symbol: 'string', contracts: 'number', entryPrice: 'number', markPrice: 'number', liquidationPrice: 'number', unrealizedPnl: 'number' }
      },
      tradable_symbols: Array.isArray(cfg.allowed_symbols) ? cfg.allowed_symbols : []
    };
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.get('/ai/config', async (req, res) => {
  try {
    const raw = await fs.readFile(CFG_FILE, 'utf8');
    res.json(JSON.parse(raw));
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.post('/ai/config', async (req, res) => {
  try {
    const body = req.body || {};
    await fs.mkdir(AI_BASE_DIR, { recursive: true }).catch(() => {});
    await fs.writeFile(CFG_FILE, JSON.stringify(body, null, 2), 'utf8');
    res.json(body);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Suggest prompts via LLM using config presets
router.post('/ai/prompt/suggest', async (req, res) => {
  try {
    const cfg = JSON.parse(await fs.readFile(CFG_FILE, 'utf8'));
    const sys = await fs.readFile(SYS_TPL, 'utf8').catch(() => '');
    const usr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    const body = req.body || {};
    const aiKey = cfg.ai?.api_key || process.env.DEEPSEEK_API_KEY_30 || '';
    const provider = cfg.ai?.provider || 'deepseek';
    const model = cfg.ai?.model || 'deepseek-chat';
    const temperature = cfg.ai?.temperature ?? 0.7;

    const context = {
      environment: cfg.trading_env,
      allowed_symbols: cfg.allowed_symbols,
      data: cfg.data,
      current_templates: { system: sys, user: usr }
    };

    if (!aiKey) {
      // ? key ??????????????????
      return res.json({
        suggestion: {
          system_prompt_en: sys,
          user_prompt_en: usr,
          rationale_en: 'No API key provided; returning current templates as suggestion.',
          config_updates: null
        }
      });
    }

    const prompt = `You are a prompt engineer for a crypto trading agent. Given the JSON context below, propose improved English system and user prompts, and optional config_updates. Respond with strict JSON keys: system_prompt_en, user_prompt_en, rationale_en, config_updates.
\n\nCONTEXT:\n${JSON.stringify(context, null, 2)}`;

    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${aiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You return ONLY valid JSON. No prose.' },
          { role: 'user', content: prompt }
        ],
        temperature,
        stream: false,
        max_tokens: 1500
      })
    });
    if (!resp.ok) throw new Error(`upstream ${resp.status}`);
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    let suggestion;
    try { suggestion = JSON.parse(content); } catch (_) { suggestion = { system_prompt_en: sys, user_prompt_en: usr, rationale_en: 'Parse failed', config_updates: null }; }
    res.json({ suggestion });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Q&A about prompts/config/capabilities without changing templates
router.post('/ai/prompt/ask', async (req, res) => {
  try {
    const cfg = JSON.parse(await fs.readFile(CFG_FILE, 'utf8'));
    const sys = await fs.readFile(SYS_TPL, 'utf8').catch(() => '');
    const usr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    const question = String(req.body?.question || '').slice(0, 8000);
    const aiKey = cfg.ai?.api_key || process.env.DEEPSEEK_API_KEY_30 || '';
    const model = cfg.ai?.model || 'deepseek-chat';
    const temperature = cfg.ai?.temperature ?? 0.4;
    const context = {
      environment: cfg.trading_env,
      allowed_symbols: cfg.allowed_symbols,
      data: cfg.data,
      current_templates: { system: sys, user: usr }
    };
    if (!question) return res.status(400).json({ error: 'empty_question' });
    if (!aiKey) return res.json({ answer: null, disabled: true });
    const prompt = `You are a senior prompt engineer and trading systems architect. Answer user's question based on the JSON CONTEXT. Be concise and structured.\n\nCONTEXT:\n${JSON.stringify(context, null, 2)}\n\nUSER:\n${question}`;
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({ model, messages: [ { role: 'user', content: prompt } ], temperature, stream: false, max_tokens: 1200 })
    });
    if (!resp.ok) throw new Error(`upstream ${resp.status}`);
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || null;
    res.json({ answer: content });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Apply config updates (deep merge shallowly for top-level and nested plain objects)
router.post('/ai/config/apply', async (req, res) => {
  try {
    const updates = req.body?.config_updates || {};
    const cfg = JSON.parse(await fs.readFile(CFG_FILE, 'utf8'));
    function merge(a, b) {
      if (Array.isArray(a) || Array.isArray(b) || typeof a !== 'object' || typeof b !== 'object' || !a || !b) return b;
      const out = { ...a };
      for (const k of Object.keys(b)) out[k] = k in a ? merge(a[k], b[k]) : b[k];
      return out;
    }
    const next = merge(cfg, updates);
    await fs.writeFile(CFG_FILE, JSON.stringify(next, null, 2), 'utf8');
    res.json(next);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Trading runner control
router.get('/ai/trading/status', async (req, res) => {
  res.json(tradingRunner.getStatus());
});

router.post('/ai/trading/start', async (req, res) => {
  try {
    const { intervalMinutes = 3, env, ai } = req.body || {};
    // ?? backend/data ??????????????????
    const dataDir = path.resolve(process.cwd(), 'backend', 'data');
    await fs.mkdir(dataDir, { recursive: true }).catch(() => {});
    
    // 在启动时从交易所获取实际账户余额和BTC价格作为初始值
    let initialAccountValue = null;
    let initialBTCPrice = null;
    try {
      // 临时设置环境变量以便 getAccountBalance 使用
      if (env) process.env.TRADING_ENV = env;
      const balance = await getAccountBalance();
      if (balance && balance > 0) {
        initialAccountValue = balance;
        console.log(`启动时获取到的账户余额: ${initialAccountValue}`);
      } else {
        console.log('无法获取账户余额或余额为0，将不显示参考线');
      }
      
      // 获取初始BTC价格
      try {
        const prices = await getPrices(['BTC/USDT']);
        if (prices && prices['BTC/USDT'] && prices['BTC/USDT'].price) {
          initialBTCPrice = prices['BTC/USDT'].price;
          console.log(`启动时获取到的BTC价格: ${initialBTCPrice}`);
        }
      } catch (e) {
        console.error('获取初始BTC价格失败:', e.message);
      }
    } catch (e) {
      console.error('获取账户余额失败:', e.message);
    }
    
    // 检查并更新 trading-state.json，确保保存初始账户价值
    const stateFile = path.join(dataDir, 'trading-state.json');
    try {
      const existing = await loadJson('trading-state.json', null);
      if (existing && typeof existing === 'object') {
        // 如果文件已存在，只更新初始账户价值（如果还没有的话）和启动时间
        if (!existing.initialAccountValue) {
          existing.initialAccountValue = initialAccountValue;
        }
        // 保存初始BTC价格（用于计算BTC持有曲线）
        if (initialBTCPrice && !existing.initialBTCPrice) {
          existing.initialBTCPrice = initialBTCPrice;
          existing.initialBTCTimestamp = new Date().toISOString();
        }
        existing.startTime = new Date().toISOString();
        existing.tradingEnabled = true;
        existing.lastUpdate = new Date().toISOString();
        if (!existing.accountValue) {
          existing.accountValue = initialAccountValue;
        }
        await saveJson('trading-state.json', existing);
      } else {
        // 文件不存在，创建新的
        const newState = {
          startTime: new Date().toISOString(),
          invocationCount: 0,
          positions: [],
          lastUpdate: new Date().toISOString(),
          tradingEnabled: true,
        };
        // 只有在有初始值时才保存
        if (initialAccountValue) {
          newState.accountValue = initialAccountValue;
          newState.initialAccountValue = initialAccountValue;
        }
        // 保存初始BTC价格
        if (initialBTCPrice) {
          newState.initialBTCPrice = initialBTCPrice;
          newState.initialBTCTimestamp = new Date().toISOString();
        }
        await saveJson('trading-state.json', newState);
      }
    } catch (e) {
      console.error('更新 trading-state.json 失败:', e.message);
    }
    
    // 其他文件的初始化
    const seeds = [
      { file: path.join(dataDir, 'conversations.json'), content: { conversations: [], lastUpdate: new Date().toISOString() } },
      { file: path.join(dataDir, 'trades.json'), content: { trades: [] } },
    ];
    for (const s of seeds) {
      try { await fs.access(s.file); } catch { await fs.writeFile(s.file, JSON.stringify(s.content, null, 2), 'utf8'); }
    }
    const st = tradingRunner.start({ intervalMinutes, env, ai });
    res.json(st);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.post('/ai/trading/stop', async (req, res) => {
  try {
    const st = tradingRunner.stop();
    res.json(st);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// 重新加载Prompt模板（手动触发）
router.post('/ai/trading/reload-prompts', async (req, res) => {
  try {
    const { env } = req.body || {};
    if (!env) {
      return res.status(400).json({ error: 'env parameter is required' });
    }
    
    // 创建重载标记文件，让运行中的AI系统在下次运行时重新加载模板
    const dataDir = path.resolve(process.cwd(), 'backend', 'data');
    const reloadMarkerFile = path.join(dataDir, `.reload-prompts-${env}.marker`);
    
    // 写入标记文件（包含时间戳）
    await fs.writeFile(reloadMarkerFile, JSON.stringify({
      env,
      timestamp: new Date().toISOString(),
      triggeredBy: 'manual'
    }), 'utf8');
    
    res.json({ 
      success: true, 
      message: `已创建重载标记，运行中的 ${env} Bot将在下次交易循环时重新加载Prompt`,
      markerFile: reloadMarkerFile
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.post('/ai/trading/close-all-positions', async (req, res) => {
  try {
    // 先停止运行
    const st = tradingRunner.stop();
    // 这里可以添加实际平仓逻辑，目前先只停止运行
    res.json({ ...st, message: '已停止运行' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Derived endpoints
router.get('/account-totals', async (req, res) => {
  const lastHourlyMarker = req.query.lastHourlyMarker ? Number(req.query.lastHourlyMarker) : undefined;
  const trades = await loadJson('trades.json', { trades: [] });
  const totals = await deriveAccountTotals(trades, lastHourlyMarker);
  
  // 优先尝试从币安API获取实时数据
  let latestPositions = {};
  let latestAccountValue = null;
  let initialAccountValue = null;
  let initialBTCPrice = null;
  
  try {
    const realTimeData = await getRealTimeAccountData();
    if (realTimeData) {
      latestAccountValue = realTimeData.balance;
      // 将positions数组转为对象格式
      for (const p of realTimeData.positions) {
        const symbol = String(p.symbol || '').toUpperCase();
        if (symbol) {
          latestPositions[symbol] = {
            symbol,
            quantity: Number(p.quantity || 0),
            entry_price: Number(p.entry_price || 0),
            current_price: Number(p.current_price || 0),
            liquidation_price: Number(p.liquidation_price || 0),
            unrealized_pnl: Number(p.unrealized_pnl || 0),
            leverage: Number(p.leverage || 1),
            exit_plan: p.exit_plan || null,
            confidence: Number(p.confidence || 0),
            risk_usd: Number(p.risk_usd || 0),
            margin: Number(p.margin || 0),
            notional_usd: Number(p.notional_usd || 0),
            entry_time: Number(p.entry_time || Math.floor(Date.now() / 1000)),
            entry_oid: Number(p.entry_oid || 0),
          };
        }
      }
    }
  } catch (e) {
    console.warn('获取实时账户数据失败，降级到trading-state.json:', e.message);
  }
  
  // 始终从 trading-state.json 读取初始值（用于BTC持有曲线计算）
  try {
    const state = await loadJson('trading-state.json', { positions: [] });
    // 获取初始账户价值（启动时的值）
    if (state?.initialAccountValue) {
      initialAccountValue = Number(state.initialAccountValue);
    } else if (state?.accountValue) {
      // 如果没有保存初始值，使用当前值（可能是第一次启动）
      initialAccountValue = Number(state.accountValue);
    }
    // 获取初始BTC价格（用于计算BTC持有曲线）
    if (state?.initialBTCPrice) {
      initialBTCPrice = Number(state.initialBTCPrice);
    }
  } catch (e) {
    console.warn('读取 trading-state.json 失败:', e.message);
  }
  
  // 如果实时数据获取失败，降级到trading-state.json
  if (!latestAccountValue || Object.keys(latestPositions).length === 0) {
    try {
      // 从 trading-state.json 读取最新的账户价值和持仓
      const state = await loadJson('trading-state.json', { positions: [] });
      if (state?.accountValue) {
        latestAccountValue = Number(state.accountValue);
      }
      if (Array.isArray(state?.positions) && state.positions.length > 0) {
        for (const p of state.positions) {
          const symbol = String(p?.symbol || '').toUpperCase();
          if (symbol) {
            const notional = Number(p?.notional_usd || 0) || Math.abs(Number(p?.quantity || 0)) * Number(p?.current_price || p?.entry_price || 0);
            latestPositions[symbol] = {
              symbol,
              quantity: Number(p?.quantity || 0),
              entry_price: Number(p?.entry_price || 0),
              current_price: Number(p?.current_price || p?.entry_price || 0),
              liquidation_price: Number(p?.liquidation_price || 0),
              unrealized_pnl: Number(p?.unrealized_pnl || 0),
              leverage: Number(p?.leverage || 1),
              exit_plan: p?.exit_plan || null,
              confidence: Number(p?.confidence || 0),
              risk_usd: Number(p?.risk_usd || 0),
              margin: notional / Number(p?.leverage || 1),
              notional_usd: notional,
              entry_time: Math.floor(Date.now() / 1000),
              entry_oid: Number(p?.entry_oid || 0),
            };
          }
        }
      }
      
      // 如果没有，从 conversations 推导
      if (Object.keys(latestPositions).length === 0) {
        const buf = await fs.readFile(CONV_FILE, 'utf8');
        const raw = JSON.parse(buf);
        const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
        const posMap = {};
        // 倒序遍历（最新到最旧），累计持仓
        for (const c of arr.slice().reverse()) {
          const d = c?.decision_normalized || {};
          const action = String(d?.action || '').toLowerCase();
          const base = (d?.symbol || '').toString().toUpperCase().replace(/:USDT$/, '');
          const symbol = base.includes('/') ? base.split('/')[0] : base;
          const qty = Number.isFinite(Number(d?.quantity)) ? Number(d.quantity) : 0;
          
          // 只处理buy/sell/close_position，忽略hold操作
          if (!symbol) continue;
          if (action === 'buy' && qty > 0) {
            if (!posMap[symbol]) posMap[symbol] = { symbol, quantity: 0, entry_price: 0, leverage: 1 };
            posMap[symbol].quantity += qty;
          } else if ((action === 'sell' || action === 'close_position') && qty > 0) {
            if (posMap[symbol]) {
              posMap[symbol].quantity -= qty;
              if (posMap[symbol].quantity <= 0) delete posMap[symbol];
            }
          }
        }
        // 转换为标准格式
        for (const [symbol, p] of Object.entries(posMap)) {
          if (p.quantity > 0) {
            latestPositions[symbol] = {
              symbol: p.symbol,
              quantity: p.quantity,
              entry_price: p.entry_price || 0,
              current_price: 0,
              liquidation_price: 0,
              unrealized_pnl: 0,
              leverage: p.leverage || 1,
              exit_plan: null,
              confidence: 0,
              risk_usd: 0,
              margin: 0,
              entry_time: Math.floor(Date.now() / 1000),
              entry_oid: 0,
            };
          }
        }
      }
    } catch (e) {
      console.error('读取持仓失败:', e.message);
    }
  }
  
  // 从conversations中提取BTC价格历史的辅助函数
  function extractBTCPrice(userPrompt) {
    if (!userPrompt) return null;
    // 从userPrompt中提取 current_price = 109695.40 格式的BTC价格
    const match = userPrompt.match(/ALL BTC DATA[\s\S]*?current_price\s*=\s*([\d.]+)/);
    return match ? Number(match[1]) : null;
  }

  if (!totals || totals.length === 0) {
    // 从 conversations 生成净值时间序列
    try {
      const buf = await fs.readFile(CONV_FILE, 'utf8');
      const raw = JSON.parse(buf);
      const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
      const series = arr.slice().reverse().map(c => {
        const ts = Math.floor(new Date(c?.timestamp || Date.now()).getTime() / 1000);
        const equity = Number(c?.accountValue);
        if (!Number.isFinite(equity)) return null; // 跳过无效值，返回null
        // 从userPrompt中提取BTC价格
        const btcPrice = extractBTCPrice(c?.userPrompt);
        return {
          model_id: 'default',
          timestamp: ts,
          dollar_equity: equity,
          since_inception_hourly_marker: Math.floor(ts / 3600),
          positions: latestPositions, // 附加持仓信息
          btc_price: btcPrice || undefined, // 附加BTC价格（如果存在）
        };
      }).filter(item => item !== null); // 过滤掉null值
      if (series.length > 0) return res.json({ 
        accountTotals: series,
        initialAccountValue: initialAccountValue || undefined, // 如果没有则不返回，而不是返回null
        initialBTCPrice: initialBTCPrice || undefined, // 返回初始BTC价格
      });
    } catch (_) {}
    // 如果没有数据且没有初始值，返回空数组而不是伪造数据
    if (!initialAccountValue && !latestAccountValue) {
      return res.json({
        accountTotals: [],
        initialAccountValue: undefined
      });
    }
    
    const now = Date.now();
    const t0 = Math.floor((now - 60_000) / 1000);
    const t1 = Math.floor(now / 1000);
    // 使用实际的值，如果没有初始值就使用当前值
    const startValue = initialAccountValue || latestAccountValue || 0;
    const currentValue = latestAccountValue || initialAccountValue || 0;
    return res.json({
      accountTotals: [
        { model_id: 'default', timestamp: t0, dollar_equity: startValue, since_inception_hourly_marker: Math.floor(t0 / 3600), positions: latestPositions },
        { model_id: 'default', timestamp: t1, dollar_equity: currentValue, since_inception_hourly_marker: Math.floor(t1 / 3600), positions: latestPositions },
      ],
      // 只有确实有初始值时才返回
      initialAccountValue: initialAccountValue || undefined,
    });
  }
  
  // 为现有的 totals 也附加持仓信息和更新最新净值，以及BTC价格
  if (totals && totals.length > 0) {
    // 尝试从conversations中提取BTC价格历史
    let btcPriceMap = new Map(); // timestamp -> btc_price
    try {
      const buf = await fs.readFile(CONV_FILE, 'utf8');
      const raw = JSON.parse(buf);
      const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
      for (const c of arr) {
        const ts = Math.floor(new Date(c?.timestamp || Date.now()).getTime() / 1000);
        const btcPrice = extractBTCPrice(c?.userPrompt);
        if (btcPrice && !btcPriceMap.has(ts)) {
          btcPriceMap.set(ts, btcPrice);
        }
      }
    } catch (e) {
      console.warn('从conversations提取BTC价格失败:', e.message);
    }
    
    const latest = totals[totals.length - 1];
    latest.positions = latestPositions;
    // 如果有最新的账户价值，更新最后一条记录的净值
    if (latestAccountValue != null && Number.isFinite(latestAccountValue)) {
      latest.dollar_equity = latestAccountValue;
      latest.timestamp = Math.floor(Date.now() / 1000);
    }
    
    // 为每个totals项附加BTC价格（如果存在）
    for (const item of totals) {
      const ts = item.timestamp;
      // 查找最接近的时间戳的BTC价格
      let closestPrice = null;
      let minDiff = Infinity;
      for (const [priceTs, price] of btcPriceMap.entries()) {
        const diff = Math.abs(priceTs - ts);
        if (diff < minDiff && diff < 3600) { // 1小时内
          minDiff = diff;
          closestPrice = price;
        }
      }
      if (closestPrice) {
        item.btc_price = closestPrice;
      }
    }
    
    // 为最后一个点添加当前BTC价格（如果还没有）
    if (!latest.btc_price) {
      try {
        const prices = await getPrices(['BTC/USDT']);
        if (prices && prices['BTC/USDT'] && prices['BTC/USDT'].price) {
          latest.btc_price = prices['BTC/USDT'].price;
        }
      } catch (e) {
        console.warn('获取当前BTC价格失败:', e.message);
      }
    }
  }
  
  res.json({ 
    accountTotals: totals,
    // 只有确实有初始值时才返回，用于图表参考线
    initialAccountValue: initialAccountValue || undefined,
    initialBTCPrice: initialBTCPrice || undefined, // 返回初始BTC价格
  });
});

router.get('/leaderboard', async (req, res) => {
  const trades = await loadJson('trades.json', { trades: [] });
  const leaderboard = await deriveLeaderboard(trades);
  res.json({ leaderboard });
});

router.get('/since-inception-values', async (req, res) => {
  const trades = await loadJson('trades.json', { trades: [] });
  const out = await deriveSinceInception(trades);
  res.json(out);
});

// 实时数据端点：直接从币安API获取
router.get('/realtime', async (req, res) => {
  try {
    const realTimeData = await getRealTimeAccountData();
    if (!realTimeData) {
      // 如果实时获取失败，降级到trading-state.json
      const state = await loadJson('trading-state.json', {});
      return res.json({
        balance: state.accountValue || 0,
        availableCash: state.availableCash || 0,
        positions: state.positions || [],
        source: 'fallback',
      });
    }
    return res.json({
      ...realTimeData,
      source: 'realtime',
    });
  } catch (e) {
    console.error('获取实时数据失败:', e.message);
    // 降级到trading-state.json
    try {
      const state = await loadJson('trading-state.json', {});
      res.json({
        balance: state.accountValue || 0,
        availableCash: state.availableCash || 0,
        positions: state.positions || [],
        source: 'fallback',
      });
    } catch (_) {
      res.json({
        balance: 0,
        availableCash: 0,
        positions: [],
        source: 'error',
      });
    }
  }
});

router.get('/positions', async (req, res) => {
  // 优先尝试实时数据
  try {
    const realTimeData = await getRealTimeAccountData();
    if (realTimeData && realTimeData.positions && realTimeData.positions.length > 0) {
      return res.json({ positions: realTimeData.positions });
    }
  } catch (_) {
    // 如果失败，继续使用原有逻辑
  }
  
  try {
    const state = await loadJson('trading-state.json', { positions: [] });
    const positions = Array.isArray(state?.positions) ? state.positions : [];
    const norm = positions.map((p) => ({
      symbol: String(p?.symbol || ''),
      quantity: Number(p?.quantity || 0),
      entry_price: Number(p?.entry_price || 0),
      current_price: Number(p?.current_price || p?.entry_price || 0),
      liquidation_price: Number(p?.liquidation_price || 0),
      unrealized_pnl: Number(p?.unrealized_pnl || 0),
      leverage: Number(p?.leverage || 1),
      exit_plan: p?.exit_plan || null,
      confidence: Number(p?.confidence || 0),
      risk_usd: Number(p?.risk_usd || 0),
    }));
    if (norm.length > 0) return res.json({ positions: norm });
    // 从 conversations 累计推导净持仓
    try {
      const buf = await fs.readFile(CONV_FILE, 'utf8');
      const raw = JSON.parse(buf);
      const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
      const posMap = {};
      for (const c of arr.slice().reverse()) {
        const d = c?.decision_normalized || {};
        const action = String(d?.action || '').toLowerCase();
        const base = (d?.symbol || '').toString().toUpperCase().replace(/:USDT$/, '');
        const symbol = base.includes('/') ? base.split('/')[0] : base;
        const qty = Number.isFinite(Number(d?.quantity)) ? Number(d.quantity) : 0;
        if (!symbol || qty === 0) continue;
        if (action === 'buy') {
          if (!posMap[symbol]) posMap[symbol] = { symbol, quantity: 0, entry_price: 0, leverage: 1 };
          posMap[symbol].quantity += qty;
        } else if (action === 'sell' || action === 'close_position') {
          if (posMap[symbol]) {
            posMap[symbol].quantity -= qty;
            if (posMap[symbol].quantity <= 0) delete posMap[symbol];
          }
        }
      }
      const out = Object.values(posMap).map(p => ({
        symbol: p.symbol,
        quantity: p.quantity,
        entry_price: p.entry_price || 0,
        current_price: 0,
        liquidation_price: 0,
        unrealized_pnl: 0,
        leverage: p.leverage || 1,
        exit_plan: null,
        confidence: 0,
        risk_usd: 0,
      }));
      try {
        const prev = await loadJson('trading-state.json', { startTime: new Date().toISOString(), invocationCount: 0, positions: [] });
        await saveJson('trading-state.json', { ...prev, positions: out, lastUpdate: new Date().toISOString() });
      } catch (_) {}
      return res.json({ positions: out });
    } catch (_) {
      return res.json({ positions: [] });
    }
  } catch (e) {
    res.json({ positions: [] });
  }
});



```

```javascript
import ccxt from 'ccxt';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

// 轻量级 .env 加载（避免额外依赖），需在使用 config/env 之前执行
function loadDotEnv(envPath) {
  try {
    if (!existsSync(envPath)) return;
    const raw = readFileSync(envPath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = val;
      }
    });
  } catch (_) {}
}

// 提前加载 backend/.env，确保 config 与 env 解析可用
loadDotEnv(resolve(process.cwd(), 'backend/.env'));

function expandEnvMaybe(value) {
  if (typeof value !== 'string') return value;
  const m = value.match(/^\$\{(.+)\}$/);
  if (m) return process.env[m[1]] || '';
  return value;
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && idx < process.argv.length - 1) return process.argv[idx + 1];
  const envKey = name.replace(/^--/, '').toUpperCase();
  return process.env[envKey];
}

function loadConfig() {
  const configPath = resolve(process.cwd(), 'backend/ai/ai-trading/config.json');
  const raw = readFileSync(configPath, 'utf8');
  const cfg = JSON.parse(raw);
  if (cfg.ai && cfg.ai.api_key) cfg.ai.api_key = expandEnvMaybe(cfg.ai.api_key);
  const f = cfg.exchange?.binance?.futures_demo;
  const s = cfg.exchange?.binance?.spot_testnet;
  if (f) {
    f.api_key = expandEnvMaybe(f.api_key);
    f.api_secret = expandEnvMaybe(f.api_secret);
  }
  if (s) {
    s.api_key = expandEnvMaybe(s.api_key);
    s.api_secret = expandEnvMaybe(s.api_secret);
  }
  return cfg;
}

function renderSections(template, flags) {
  let out = template;
  out = out.replace(/\{\{#is_futures\}\}([\s\S]*?)\{\{\/is_futures\}\}/g, (_, inner) => (flags.is_futures ? inner : ''));
  out = out.replace(/\{\{\^is_futures\}\}([\s\S]*?)\{\{\/is_futures\}\}/g, (_, inner) => (!flags.is_futures ? inner : ''));
  return out;
}

function renderSimple(template, context) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g, (_, key) => {
    const val = key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : ''), context);
    return String(val ?? '');
  });
}

class AITradingSystemV2 {
  constructor() {
    this.config = loadConfig();

    const argEnv = getArg('--env');
    const argAi = getArg('--ai');

    this.tradingEnv = (argEnv && typeof argEnv === 'string') ? argEnv : (this.config.trading_env || 'demo-futures');
    this.isFutures = this.tradingEnv === 'demo-futures' || this.tradingEnv === 'futures';

    const aiPreset = (argAi && this.config.ai?.presets?.[argAi]) ? this.config.ai.presets[argAi] : null;
    this.aiProvider = (aiPreset?.provider || this.config.ai?.provider || 'deepseek');
    this.aiModel = (aiPreset?.model || this.config.ai?.model || 'deepseek-chat');
    this.aiApiKey = expandEnvMaybe(aiPreset?.api_key || this.config.ai?.api_key || process.env.DEEPSEEK_API_KEY_30 || '');
    this.aiTemperature = (aiPreset?.temperature ?? this.config.ai?.temperature ?? 0.7);
    this.aiMaxTokens = (aiPreset?.max_tokens ?? this.config.ai?.max_tokens ?? 2000);

    this.exchange = null;
    this.dataDir = resolve(process.cwd(), 'backend', 'data');
    try { mkdirSync(this.dataDir, { recursive: true }); } catch (_) {}
    this.stateFile = resolve(this.dataDir, 'trading-state.json');
    this.conversationsFile = resolve(this.dataDir, 'conversations.json');
    this.tradesFile = resolve(this.dataDir, 'trades.json');

    this.state = this.loadState();
    this.sanitizeState();
    this.conversations = this.loadConversations();

    // 确保种子文件存在（前端可立即读取）
    try {
      if (!existsSync(this.tradesFile)) {
        writeFileSync(this.tradesFile, JSON.stringify({ trades: [] }, null, 2), 'utf8');
      }
      if (!existsSync(this.conversationsFile)) {
        writeFileSync(this.conversationsFile, JSON.stringify(this.conversations, null, 2), 'utf8');
      }
      if (!existsSync(this.stateFile)) {
        this.saveState();
      }
    } catch (_) {}

    const defaultAllowed = this.isFutures
      ? ['BTC/USDT:USDT','ETH/USDT:USDT','SOL/USDT:USDT','BNB/USDT:USDT','XRP/USDT:USDT','DOGE/USDT:USDT']
      : ['BTC/USDT','ETH/USDT','SOL/USDT','BNB/USDT','XRP/USDT','DOGE/USDT'];

    const presetAllowed = this.config.presets?.[this.tradingEnv]?.allowed_symbols;

    this.allowedSymbolsForAI = Array.isArray(this.config.allowed_symbols) && this.config.allowed_symbols.length > 0
      ? this.config.allowed_symbols
      : (Array.isArray(presetAllowed) && presetAllowed.length > 0 ? presetAllowed : defaultAllowed);

    this.symbols = (Array.isArray(this.config.symbols_monitor) && this.config.symbols_monitor.length > 0)
      ? this.config.symbols_monitor
      : [...this.allowedSymbolsForAI];

    // 优先从 presets 读取环境特定的模板路径，否则使用全局配置
    const presetPromptFiles = this.config.presets?.[this.tradingEnv]?.prompt_files;
    const promptFiles = presetPromptFiles || this.config.prompt_files || {};
    
    this.systemPromptTemplatePath = resolve(process.cwd(), promptFiles.system_prompt_path || '');
    this.userPromptTemplatePath = resolve(process.cwd(), promptFiles.user_prompt_path || '');
    
    // 初始化时加载模板
    this.reloadTemplates();
    
    // 记录模板文件最后修改时间
    this.templateLastLoadTime = Date.now();

    this.dataCfg = {
      intraday_tf: this.config.data?.intraday_tf || '1m',
      intraday_limit: this.config.data?.intraday_limit || 50,
      context_tf: this.config.data?.context_tf || '4h',
      context_limit: this.config.data?.context_limit || 10
    };

    // 简单的随机基准，用于离线/失败回退生成数值
    this._seed = Math.floor(Date.now() / 60000);
  }

  sanitizeState() {
    const s = this.state || {};
    // 核心数值字段保证为数字
    s.accountValue = Number.isFinite(Number(s.accountValue)) ? Number(s.accountValue) : 10000;
    s.availableCash = Number.isFinite(Number(s.availableCash)) ? Number(s.availableCash) : 10000;
    s.totalReturn = Number.isFinite(Number(s.totalReturn)) ? Number(s.totalReturn) : 0;
    s.invocationCount = Number.isFinite(Number(s.invocationCount)) ? Number(s.invocationCount) : 0;
    // 结构字段
    if (!Array.isArray(s.positions)) s.positions = [];
    if (!s.startTime) s.startTime = new Date().toISOString();
    if (!s.lastUpdate) s.lastUpdate = new Date().toISOString();
    if (typeof s.tradingEnabled !== 'boolean') s.tradingEnabled = true;
    // 规范化持仓内的数值
    s.positions = s.positions.map((p = {}) => ({
      symbol: p.symbol || 'BTC',
      quantity: Number.isFinite(Number(p.quantity)) ? Number(p.quantity) : 0,
      entry_price: Number.isFinite(Number(p.entry_price)) ? Number(p.entry_price) : 0,
      current_price: Number.isFinite(Number(p.current_price)) ? Number(p.current_price) : 0,
      liquidation_price: Number.isFinite(Number(p.liquidation_price)) ? Number(p.liquidation_price) : 0,
      unrealized_pnl: Number.isFinite(Number(p.unrealized_pnl)) ? Number(p.unrealized_pnl) : 0,
      leverage: Number.isFinite(Number(p.leverage)) ? Number(p.leverage) : 1,
      exit_plan: p.exit_plan || { profit_target: 0, stop_loss: 0, invalidation_condition: 'none' },
      confidence: Number.isFinite(Number(p.confidence)) ? Number(p.confidence) : 0.8,
      risk_usd: Number.isFinite(Number(p.risk_usd)) ? Number(p.risk_usd) : 0,
      sl_oid: p.sl_oid ?? null,
      tp_oid: p.tp_oid ?? null,
      wait_for_fill: Boolean(p.wait_for_fill),
      entry_oid: p.entry_oid ?? null,
      notional_usd: Number.isFinite(Number(p.notional_usd)) ? Number(p.notional_usd) : 0,
    }));
    this.state = s;
  }

  normalizeBaseSymbol(raw) {
    if (!raw) return undefined;
    let sym = String(raw).trim().toUpperCase();
    sym = sym.replace(/\s+/g, '');
    sym = sym.replace(/:USDT$/, '');
    if (sym.includes('/')) return sym.split('/')[0];
    if (sym.endsWith('USDT')) return sym.slice(0, -4);
    return sym;
  }

  loadState() {
    try {
      if (existsSync(this.stateFile)) {
        const data = readFileSync(this.stateFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (_) {}
    return {
      startTime: new Date().toISOString(),
      invocationCount: 0,
      totalReturn: 0,
      accountValue: 10000,
      availableCash: 10000,
      positions: [],
      lastUpdate: new Date().toISOString(),
      tradingEnabled: true
    };
  }

  saveState() {
    this.state.lastUpdate = new Date().toISOString();
    writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf8');
  }

  loadConversations() {
    try {
      if (existsSync(this.conversationsFile)) {
        const data = readFileSync(this.conversationsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (_) {}
    return { conversations: [], lastUpdate: new Date().toISOString() };
  }

  saveConversations() {
    this.conversations.lastUpdate = new Date().toISOString();
    writeFileSync(this.conversationsFile, JSON.stringify(this.conversations, null, 2), 'utf8');
  }

  async initializeExchange() {
    try {
      // 仅在用户显式设置时使用代理，避免误用本地 7890 端口
      const httpsProxy = process.env.HTTPS_PROXY || '';
      const httpProxy = process.env.HTTP_PROXY || '';
      const noProxy = process.env.NO_PROXY || process.env.no_proxy || '';
      console.log(`Proxy config -> HTTPS_PROXY=${httpsProxy || '(unset)'} HTTP_PROXY=${httpProxy || '(unset)'} NO_PROXY=${noProxy || '(unset)'}\n`);

      const envKey = this.tradingEnv;
      const isDemoFutures = envKey === 'demo-futures';
      const isDemoSpot = envKey === 'demo-spot';

      if (isDemoFutures || envKey === 'futures') {
        const apiKey = this.config.exchange?.binance?.futures_demo?.api_key || process.env.BINANCE_DEMO_API_KEY;
        const secret = this.config.exchange?.binance?.futures_demo?.api_secret || process.env.BINANCE_DEMO_API_SECRET;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_DEMO_API_KEY/SECRET或在config.json配置');
        this.exchange = new ccxt.binanceusdm({ apiKey, secret, enableRateLimit: true, options: { defaultType: 'future', warnOnFetchCurrencies: false, fetchCurrencies: false, enableDemoTrading: true } });
        if (httpsProxy) this.exchange.httpsProxy = httpsProxy.endsWith('/') ? httpsProxy : `${httpsProxy}/`;
        this.exchange.enableDemoTrading(true);
        await this.exchange.fetchBalance();
      } else if (isDemoSpot || envKey === 'spot') {
        const apiKey = this.config.exchange?.binance?.spot_testnet?.api_key || process.env.BINANCE_SPOT_TEST_API_KEY;
        const secret = this.config.exchange?.binance?.spot_testnet?.api_secret || process.env.BINANCE_SPOT_TEST_API_SECRET;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_SPOT_TEST_API_KEY/SECRET或在config.json配置');
        this.exchange = new ccxt.binance({ apiKey, secret, enableRateLimit: true });
        if (httpsProxy) this.exchange.httpsProxy = httpsProxy.endsWith('/') ? httpsProxy : `${httpsProxy}/`;
        if (typeof this.exchange.setSandboxMode === 'function') this.exchange.setSandboxMode(true);
        await this.exchange.fetchBalance();
      }
      return true;
    } catch (e) {
      console.error('❌ 初始化交易所失败:', e.message);
      console.error('详细错误:', e);
      return false;
    }
  }

  calculateEMA(prices, period) {
    if (prices.length < period) return null;
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    return ema;
  }
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26) {
    if (prices.length < slowPeriod) return null;
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    if (!fastEMA || !slowEMA) return null;
    return fastEMA - slowEMA;
  }
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change; else losses += Math.abs(change);
    }
    const avgGain = gains / period; const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  calculateATR(highs, lows, closes, period = 14) {
    if (highs.length < period + 1) return null;
    const trueRanges = [];
    for (let i = 1; i < highs.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  async getMarketData() {
    const marketData = {};
    const intradayTf = this.dataCfg.intraday_tf;
    const intradayLimit = this.dataCfg.intraday_limit;
    const ctxTf = this.dataCfg.context_tf;
    const ctxLimit = this.dataCfg.context_limit;
    for (const symbol of this.symbols) {
      try {
        if (!this.exchange) throw new Error('no_exchange');
        const ticker = await this.exchange.fetchTicker(symbol);
        const ohlcv = await this.exchange.fetchOHLCV(symbol, intradayTf, undefined, intradayLimit);
        const prices = ohlcv.map(c => (c[2] + c[3]) / 2);
        const highs = ohlcv.map(c => c[2]);
        const lows = ohlcv.map(c => c[3]);
        const closes = ohlcv.map(c => c[4]);
        const volumes = ohlcv.map(c => c[5]);
        const ema20 = this.calculateEMA(prices, 20) || Number(ticker.last) || 0;
        const macd = this.calculateMACD(prices) || 0;
        const rsi14 = this.calculateRSI(prices, 14) || 50;
        const rsi21 = this.calculateRSI(prices, 21) || 50;
        const atr = this.calculateATR(highs, lows, closes) || (Number(ticker.last) || 0) * 0.02;

        const ohlcvCtx = await this.exchange.fetchOHLCV(symbol, ctxTf, undefined, ctxLimit);
        const pricesCtx = ohlcvCtx.map(c => (c[2] + c[3]) / 2);
        const ema20_4h = this.calculateEMA(pricesCtx, 20) || Number(ticker.last) || 0;
        const ema50_4h = this.calculateEMA(pricesCtx, 50) || Number(ticker.last) || 0;
        const atr_4h = this.calculateATR(ohlcvCtx.map(c => c[2]), ohlcvCtx.map(c => c[3]), ohlcvCtx.map(c => c[4])) || (Number(ticker.last) || 0) * 0.02;

        const currentVolume = volumes[volumes.length - 1] || 0;
        const avgVolume = volumes.length ? (volumes.reduce((a, b) => a + b, 0) / volumes.length) : 0;
        const fundingRate = (Math.random() - 0.5) * 0.001;
        const openInterest = Math.random() * 1000000 + 500000;
        const avgOpenInterest = openInterest * (0.8 + Math.random() * 0.4);
        const baseKey = this.normalizeBaseSymbol(symbol);

        marketData[baseKey] = {
          symbol: baseKey,
          currentPrice: Number(ticker.last) || 0,
          ema20: Number(ema20) || 0,
          macd: Number(macd) || 0,
          rsi14: Number(rsi14) || 50,
          rsi21: Number(rsi21) || 50,
          atr: Number(atr) || 0,
          ema20_4h: Number(ema20_4h) || 0,
          ema50_4h: Number(ema50_4h) || 0,
          atr_4h: Number(atr_4h) || 0,
          currentVolume: Number(currentVolume) || 0,
          avgVolume: Number(avgVolume) || 0,
          fundingRate: Number(fundingRate) || 0,
          openInterest: Number(openInterest) || 0,
          avgOpenInterest: Number(avgOpenInterest) || 0,
          prices: prices.slice(-10).map(Number),
          ema20_series: this.generateEMASeries(prices, 20).slice(-10).map(Number),
          macd_series: this.generateMACDSeries(prices).slice(-10).map(Number),
          rsi14_series: this.generateRSISeries(prices, 14).slice(-10).map(Number),
          rsi21_series: this.generateRSISeries(prices, 21).slice(-10).map(Number),
          macd_4h_series: this.generateMACDSeries(pricesCtx).slice(-10).map(Number),
          rsi14_4h_series: this.generateRSISeries(pricesCtx, 14).slice(-10).map(Number)
        };
      } catch (e) {
        // 离线/失败回退：生成稳定的伪数据，避免渲染与 toFixed 失败
        const baseKey = this.normalizeBaseSymbol(symbol);
        const t = this._seed + Math.floor(Math.random() * 1000);
        const p0 = 100 + (t % 50);
        const series = Array.from({ length: 10 }, (_, i) => p0 + Math.sin((t + i) / 5) * 2 + (Math.random() - 0.5));
        const last = series[series.length - 1];
        marketData[baseKey] = {
          symbol: baseKey,
          currentPrice: last,
          ema20: last * 0.998,
          macd: (Math.random() - 0.5) * 2,
          rsi14: 45 + Math.random() * 10,
          rsi21: 45 + Math.random() * 10,
          atr: last * 0.02,
          ema20_4h: last * 1.001,
          ema50_4h: last * 1.0005,
          atr_4h: last * 0.018,
          currentVolume: 1_000_000 + Math.random() * 100_000,
          avgVolume: 1_050_000,
          fundingRate: (Math.random() - 0.5) * 0.0005,
          openInterest: 700_000 + Math.random() * 200_000,
          avgOpenInterest: 750_000,
          prices: series,
          ema20_series: series.map((v, i, a) => (i > 0 ? (a[i - 1] * 0.9 + v * 0.1) : v)),
          macd_series: series.map(() => (Math.random() - 0.5)),
          rsi14_series: series.map(() => 45 + Math.random() * 10),
          rsi21_series: series.map(() => 45 + Math.random() * 10),
          macd_4h_series: series.map(() => (Math.random() - 0.5)),
          rsi14_4h_series: series.map(() => 45 + Math.random() * 10)
        };
      }
    }
    return marketData;
  }

  generateEMASeries(prices, period) {
    const series = [];
    for (let i = period - 1; i < prices.length; i++) {
      const ema = this.calculateEMA(prices.slice(0, i + 1), period);
      series.push(ema);
    }
    return series;
  }
  generateMACDSeries(prices) {
    const series = [];
    for (let i = 25; i < prices.length; i++) {
      const macd = this.calculateMACD(prices.slice(0, i + 1));
      series.push(macd);
    }
    return series;
  }
  generateRSISeries(prices, period) {
    const series = [];
    for (let i = period; i < prices.length; i++) {
      const rsi = this.calculateRSI(prices.slice(0, i + 1), period);
      series.push(rsi);
    }
    return series;
  }

  buildMarketSections(marketData) {
    let out = '';
    for (const [symbol, data] of Object.entries(marketData)) {
      const d = data || {};
      // 归一化，避免 undefined 触发 toFixed
      const safe = {
        currentPrice: Number(d.currentPrice) || 0,
        ema20: Number(d.ema20) || 0,
        macd: Number(d.macd) || 0,
        rsi14: Number(d.rsi14) || 50,
        rsi21: Number(d.rsi21) || 50,
        atr: Number(d.atr) || 0,
        ema20_4h: Number(d.ema20_4h) || 0,
        ema50_4h: Number(d.ema50_4h) || 0,
        atr_4h: Number(d.atr_4h) || 0,
        currentVolume: Number(d.currentVolume) || 0,
        avgVolume: Number(d.avgVolume) || 0,
        fundingRate: Number(d.fundingRate) || 0,
        openInterest: Number(d.openInterest) || 0,
        avgOpenInterest: Number(d.avgOpenInterest) || 0,
        prices: Array.isArray(d.prices) ? d.prices.map(Number) : [],
        ema20_series: Array.isArray(d.ema20_series) ? d.ema20_series.map(Number) : [],
        macd_series: Array.isArray(d.macd_series) ? d.macd_series.map(Number) : [],
        rsi14_series: Array.isArray(d.rsi14_series) ? d.rsi14_series.map(Number) : [],
        rsi21_series: Array.isArray(d.rsi21_series) ? d.rsi21_series.map(Number) : [],
        macd_4h_series: Array.isArray(d.macd_4h_series) ? d.macd_4h_series.map(Number) : [],
        rsi14_4h_series: Array.isArray(d.rsi14_4h_series) ? d.rsi14_4h_series.map(Number) : [],
      };
      const fx = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '0.00');
      const ex = (n) => {
        const v = Number(n);
        if (!Number.isFinite(v)) return '0.00e+0';
        try { return v.toExponential(2); } catch { return '0.00e+0'; }
      };
      out += `### ALL ${symbol} DATA\n\n` +
        `current_price = ${fx(safe.currentPrice)}, current_ema20 = ${fx(safe.ema20)}, current_macd = ${fx(safe.macd)}, current_rsi (14 period) = ${fx(safe.rsi14)}\n\n` +
        `In addition, here is the latest ${symbol} open interest and funding rate for perps (the instrument you are trading):\n\n` +
        `Open Interest: Latest: ${fx(safe.openInterest)}  Average: ${fx(safe.avgOpenInterest)}\n\n` +
        `Funding Rate: ${ex(safe.fundingRate)}\n\n` +
        `**Intraday series (3‑minute intervals, oldest → latest):**\n\n` +
        `Mid prices: [${(safe.prices).map(p => fx(p)).join(', ')}]\n\n` +
        `EMA indicators (20‑period): [${(safe.ema20_series).map(p => fx(p)).join(', ')}]\n\n` +
        `MACD indicators: [${(safe.macd_series).map(p => fx(p)).join(', ')}]\n\n` +
        `RSI indicators (14‑Period): [${(safe.rsi14_series).map(p => fx(p)).join(', ')}]\n\n` +
        `RSI indicators (21‑Period): [${(safe.rsi21_series).map(p => fx(p)).join(', ')}]\n\n` +
        `**Longer‑term context (${this.dataCfg.context_tf}‑hour timeframe):**\n\n` +
        `20‑Period EMA: ${fx(safe.ema20_4h)} vs. 50‑Period EMA: ${fx(safe.ema50_4h)}\n\n` +
        `3‑Period ATR: ${fx(safe.atr)} vs. 14‑Period ATR: ${fx(safe.atr_4h)}\n\n` +
        `Current Volume: ${fx(safe.currentVolume)} vs. Average Volume: ${fx(safe.avgVolume)}\n\n` +
        `MACD indicators: [${(safe.macd_4h_series || []).map(p => fx(p)).join(', ')}]\n\n` +
        `RSI indicators (14‑Period): [${(safe.rsi14_4h_series || []).map(p => fx(p)).join(', ')}]\n\n` +
        `---\n\n`;
    }
    return out;
  }

  generateUserPrompt(marketData) {
    if (!this.userPromptTemplate) {
      const currentTime = new Date();
      const startTime = new Date(this.state.startTime);
      const minutesSinceStart = Math.floor((currentTime - startTime) / (1000 * 60));
      this.state.invocationCount++;
      this.saveState();
      let marketSections = '';
      try { marketSections = this.buildMarketSections(marketData); } catch (_) { marketSections = 'MARKET DATA UNAVAILABLE'; }
      return `It has been ${minutesSinceStart} minutes since you started trading. The current time is ${currentTime.toISOString()} and you've been invoked ${this.state.invocationCount} times.\n\n---\n\n${marketSections}\n\nAccount Value: ${this.state.accountValue}`;
    }

    const now = new Date();
    const start = new Date(this.state.startTime);
    const minutesSince = Math.floor((now - start) / (1000 * 60));
    this.state.invocationCount++;
    this.saveState();

    const context = {
      minutes_since_start: minutesSince,
      now_iso: now.toISOString(),
      invocation_count: this.state.invocationCount,
      market_sections: (() => { try { return this.buildMarketSections(marketData); } catch (_) { return 'MARKET DATA UNAVAILABLE'; } })(),
      account_value: Number(this.state.accountValue ?? 0).toFixed(2),
      available_cash: Number(this.state.availableCash ?? 0).toFixed(2),
      total_return: Number(this.state.totalReturn ?? 0).toFixed(2),
      positions_block: this.state.positions.map(p => JSON.stringify(p)).join('\n'),
      sharpe_ratio: Number(this.calculateSharpeRatio() ?? 0).toFixed(2)
    };

    return renderSimple(this.userPromptTemplate, context);
  }

  calculateSharpeRatio() {
    return this.state.totalReturn > 0 ? Math.random() * 2 - 1 : -Math.random();
  }

  buildSystemPrompt() {
    if (!this.systemPromptTemplate) {
      const allowedCsv = this.allowedSymbolsForAI.join(', ');
      const base = [
        this.isFutures ? 'You are an expert crypto trader operating Binance USDT-margined perpetual futures (U-margined).'
                       : 'You are an expert crypto trader operating Binance Spot Testnet (no leverage).',
        'Symbols whitelist:',
        allowedCsv
      ].join('\n');
      return base;
    }
    const tpl1 = renderSections(this.systemPromptTemplate, { is_futures: this.isFutures });
    const context = {
      environment: this.isFutures ? 'demo.binance.com (USDT-M Futures)' : 'binance spot testnet',
      env_note: this.isFutures ? 'USDM perpetual' : 'Spot testnet',
      trading_mode: this.isFutures ? 'perpetual futures (isolated)' : 'spot (no leverage)',
      is_futures: this.isFutures,
      allowed_symbols_csv: this.allowedSymbolsForAI.join(', ')
    };
    return renderSimple(tpl1, context);
  }

  async callDeepSeekAPI(userPrompt) {
    try {
      const apiKey = this.aiApiKey;
      const model = this.aiModel;
      const temperature = this.aiTemperature;
      const max_tokens = this.aiMaxTokens;
      const systemContent = this.buildSystemPrompt();

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: userPrompt }
          ],
          stream: false,
          temperature,
          max_tokens
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (e) {
      console.error('AI 调用失败:', e.message);
      return null;
    }
  }

  parseAIResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { action: 'hold', reasoning: response };
      const rawObj = JSON.parse(jsonMatch[0]);
      const normalizeAction = (a) => {
        if (!a) return 'hold';
        const x = String(a).toLowerCase();
        if (x === 'buy' || x === 'long' || x === 'open_long') return 'buy';
        if (x === 'sell' || x === 'short' || x === 'open_short') return 'sell';
        if (x === 'close' || x === 'close_position' || x === 'exit' || x === 'reduce' || x === 'reduce_position') return 'close_position';
        if (x === 'hold' || x === 'wait' || x === 'no_trade') return 'hold';
        return 'hold';
      };
      const normalizeSymbol = (s) => this.normalizeBaseSymbol(s);
      const d = rawObj.trading_decision ? rawObj.trading_decision : rawObj;
      return {
        action: normalizeAction(d.action),
        symbol: normalizeSymbol(d.symbol),
        quantity: d.quantity !== undefined ? Number(d.quantity) : undefined,
        reasoning: d.reasoning || rawObj.reasoning,
        leverage: d.leverage !== undefined ? Number(d.leverage) : undefined
      };
    } catch (_) {
      return { action: 'hold', reasoning: '解析失败，保持当前持仓' };
    }
  }

  async executeTradingDecision(decision, marketData) {
    try {
      if (decision.action === 'buy' && decision.symbol) {
        await this.executeBuyOrder(decision, marketData);
      } else if (decision.action === 'sell' && decision.symbol) {
        await this.executeSellOrder(decision, marketData);
      } else if (decision.action === 'close_position' && decision.symbol) {
        const base = this.normalizeBaseSymbol(decision.symbol);
        const pos = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
        if (pos) {
          const qty = decision.quantity && decision.quantity > 0 ? decision.quantity : Math.abs(Number(pos.quantity));
          // 根据持仓方向决定平仓方向：多头用sell平仓，空头用buy平仓
          const posQty = Number(pos.quantity);
          if (posQty > 0) {
            // 多头：使用sell平仓
            await this.executeSellOrder({ ...decision, symbol: base, quantity: qty }, marketData);
          } else if (posQty < 0) {
            // 空头：使用buy平仓
            await this.executeBuyOrder({ ...decision, symbol: base, quantity: qty }, marketData);
          }
        }
      }
      await this.updateAccountState();
    } catch (e) {
      console.error('交易执行失败:', e.message);
    }
    this.saveState();
  }

  async executeBuyOrder(decision) {
    try {
      const base = this.normalizeBaseSymbol(decision.symbol);
      const symbol = this.isFutures ? `${base}/USDT:USDT` : `${base}/USDT`;
      const quantity = decision.quantity || 0.001;
      const leverage = this.isFutures && decision.leverage !== undefined ? Math.floor(Number(decision.leverage)) : undefined;
      if (this.isFutures) {
        try { await this.exchange.setMarginMode('ISOLATED', symbol); } catch (_) {}
        try { if (leverage !== undefined) await this.exchange.setLeverage(leverage, symbol); } catch (_) {}
      }
      const order = await this.exchange.createOrder(
        symbol, 'market', 'buy', quantity, null,
        this.isFutures ? (leverage !== undefined ? { leverage, marginType: 'isolated' } : { marginType: 'isolated' }) : undefined
      );
      this.addPosition(base, quantity, order.average || order.price);
      this.logTrade('BUY', base, quantity, order.average || order.price, order.id);
    } catch (e) {
      console.error('买入失败:', e.message);
    }
  }

  async executeSellOrder(decision) {
    try {
      const base = this.normalizeBaseSymbol(decision.symbol);
      const symbol = this.isFutures ? `${base}/USDT:USDT` : `${base}/USDT`;
      const quantity = decision.quantity || 0.001;
      const leverage = this.isFutures && decision.leverage !== undefined ? Math.floor(Number(decision.leverage)) : undefined;
      if (this.isFutures) {
        try { await this.exchange.setMarginMode('ISOLATED', symbol); } catch (_) {}
        try { if (leverage !== undefined) await this.exchange.setLeverage(leverage, symbol); } catch (_) {}
      }
      const order = await this.exchange.createOrder(
        symbol, 'market', 'sell', quantity, null,
        this.isFutures ? (leverage !== undefined ? { leverage, marginType: 'isolated' } : { marginType: 'isolated' }) : undefined
      );
      this.removePosition(base, quantity);
      this.logTrade('SELL', base, quantity, order.average || order.price, order.id);
    } catch (e) {
      console.error('卖出失败:', e.message);
    }
  }

  addPosition(symbol, quantity, entryPrice) {
    const base = this.normalizeBaseSymbol(symbol);
    const existing = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
    if (existing) {
      const totalQ = parseFloat(existing.quantity) + parseFloat(quantity);
      const avgPrice = (parseFloat(existing.entry_price) * parseFloat(existing.quantity) + parseFloat(entryPrice) * parseFloat(quantity)) / totalQ;
      existing.quantity = totalQ; existing.entry_price = avgPrice;
    } else {
      this.state.positions.push({
        symbol: base,
        quantity,
        entry_price: entryPrice,
        current_price: entryPrice,
        liquidation_price: entryPrice * 0.9,
        unrealized_pnl: 0,
        leverage: 1,
        exit_plan: { profit_target: entryPrice * 1.1, stop_loss: entryPrice * 0.95, invalidation_condition: 'price_below_stop_loss' },
        confidence: 0.8,
        risk_usd: quantity * entryPrice,
        sl_oid: null, tp_oid: null, wait_for_fill: false, entry_oid: null,
        notional_usd: quantity * entryPrice
      });
    }
  }

  removePosition(symbol, quantity) {
    const base = this.normalizeBaseSymbol(symbol);
    const existing = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
    if (existing) {
      const remain = parseFloat(existing.quantity) - parseFloat(quantity);
      if (remain <= 0) {
        this.state.positions = this.state.positions.filter(p => this.normalizeBaseSymbol(p.symbol) !== base);
      } else {
        existing.quantity = remain;
      }
    }
  }

  async updateAccountState() {
    try {
      const balance = await this.exchange.fetchBalance();
      this.state.accountValue = balance.USDT?.total || 10000;
      this.state.availableCash = balance.USDT?.free || 10000;
      this.state.totalReturn = ((this.state.accountValue - 10000) / 10000) * 100;
      if (this.isFutures) {
        const positions = await this.exchange.fetchPositions();
        const active = positions.filter(p => parseFloat(p.contracts) !== 0);
        this.state.positions = [];
        for (const position of active) {
          if (parseFloat(position.contracts) !== 0) {
            const symbol = this.normalizeBaseSymbol(position.symbol);
            const contracts = parseFloat(position.contracts);
            // 根据side字段确定quantity的符号：long=正数，short=负数
            const quantity = (position.side === 'long' || position.side === 'buy') ? Math.abs(contracts) : -Math.abs(contracts);
            // 计算杠杆：名义价值 / 保证金
            const notional = Math.abs(parseFloat(position.notional) || 0);
            const initialMargin = parseFloat(position.initialMargin) || 0;
            const leverage = notional > 0 && initialMargin > 0 ? Math.round((notional / initialMargin) * 10) / 10 : 1;
            this.state.positions.push({
              symbol,
              quantity, // 正数=多仓，负数=空仓
              entry_price: parseFloat(position.entryPrice),
              current_price: parseFloat(position.markPrice),
              liquidation_price: parseFloat(position.liquidationPrice) || 0,
              unrealized_pnl: parseFloat(position.unrealizedPnl),
              leverage, // 根据名义价值和保证金计算
              exit_plan: {
                profit_target: parseFloat(position.entryPrice) * 1.1,
                stop_loss: parseFloat(position.entryPrice) * 0.95,
                invalidation_condition: 'price_below_stop_loss'
              },
              confidence: 0.8,
              risk_usd: Math.abs(quantity) * parseFloat(position.entryPrice),
              sl_oid: null, tp_oid: null, wait_for_fill: false, entry_oid: null,
              notional_usd: notional
            });
          }
        }
      }
    } catch (e) {
      console.error('更新账户失败:', e.message);
    }
  }

  logTrade(side, symbol, quantity, price, orderId) {
    const trade = {
      timestamp: new Date().toISOString(),
      side, symbol, quantity, price, orderId,
      environment: this.isFutures ? 'demo.binance.com' : 'spot.testnet',
      accountValue: this.state.accountValue,
      totalReturn: this.state.totalReturn
    };
    if (!this.state.trades) this.state.trades = [];
    this.state.trades.unshift(trade);
    this.saveState();
    // Mirror to backend/data/trades.json for web API consumption
    try {
      let obj = { trades: [] };
      if (existsSync(this.tradesFile)) {
        try { obj = JSON.parse(readFileSync(this.tradesFile, 'utf8')); } catch (_) {}
      }
      if (!Array.isArray(obj.trades)) obj.trades = [];
      obj.trades.unshift({
        model_id: 'default',
        exit_time: Math.floor(Date.now() / 1000),
        realized_net_pnl: side === 'BUY' ? 0 : 0,
        side, symbol, quantity, price, orderId
      });
      writeFileSync(this.tradesFile, JSON.stringify(obj, null, 2), 'utf8');
    } catch (_) {}
  }

  saveConversation(userPrompt, aiResponse, decision) {
    // 解析AI响应中的JSON
    let aiParsed = null;
    try {
      if (typeof aiResponse === 'string') {
        const match = aiResponse.match(/\{[\s\S]*\}/);
        if (match) aiParsed = JSON.parse(match[0]);
      }
    } catch (_) {}

    // 从 aiParsed 中提取"原始决策对象"和"候选数组"，用于完整留存
    let decisionRaw = null;
    let decisionsArray = null;
    try {
      if (aiParsed && typeof aiParsed === 'object') {
        if (aiParsed.trading_decision) {
          decisionRaw = aiParsed.trading_decision;
        }
        if (Array.isArray(aiParsed.trading_decisions)) {
          decisionsArray = aiParsed.trading_decisions;
          // 若尚未从 trading_decision 取到主决策，则优先取与现有持仓相关的项
          if (!decisionRaw) {
            const currentSymbols = this.state.positions.map(p => p.symbol);
            const pick = decisionsArray.find(x => currentSymbols.includes(String(x.symbol || '').toUpperCase().replace(/:USDT$/,'').split('/')[0]))
              || decisionsArray[0];
            decisionRaw = pick || null;
          }
        }
      }
    } catch (_) {}

    const conversation = {
      timestamp: new Date().toISOString(),
      invocationCount: this.state.invocationCount,
      userPrompt,
      aiResponse,
      aiParsed,
      // decision: 原始/丰富结构（保持完整字段用于分析）
      decision: decisionRaw || aiParsed?.trading_decision || null,
      // decision_normalized: 供程序执行的归一化决策
      decision_normalized: decision,
      // trading_decisions: 若模型输出了候选数组，也一并保存
      trading_decisions: decisionsArray || null,
      // chain_of_thought: 从aiParsed中提取
      chain_of_thought: aiParsed?.chain_of_thought || null,
      accountValue: this.state.accountValue,
      totalReturn: this.state.totalReturn
    };
    if (!this.conversations.conversations) this.conversations.conversations = [];
    this.conversations.conversations.unshift(conversation);
    this.saveConversations();
  }

  async runTradingCycle() {
    try {
      const marketData = await this.getMarketData();
      const userPrompt = this.generateUserPrompt(marketData);
      const aiResponse = await this.callDeepSeekAPI(userPrompt);
      if (!aiResponse) {
        const decision = { action: 'hold', reasoning: 'no_ai_response' };
        await this.executeTradingDecision(decision, marketData);
        this.saveConversation(userPrompt, aiResponse, decision);
        return;
      }
      const decision = this.parseAIResponse(aiResponse);
      await this.executeTradingDecision(decision, marketData);
      this.saveConversation(userPrompt, aiResponse, decision);
    } catch (e) {
      console.error('交易循环失败:', e.message);
      // 兜底：写入最小对话，保证前端可读
      try {
        const note = `CYCLE ERROR: ${String(e?.message || e)}\n`;
        const userPrompt = 'MARKET DATA UNAVAILABLE';
        const aiResponse = null;
        const decision = { action: 'hold', reasoning: 'error' };
        this.saveConversation(userPrompt, aiResponse, decision);
      } catch (_) {}
    }
  }

  async run() {
    try {
      if (!this.aiApiKey) {
        console.error('缺少 AI API Key');
        return;
      }
      const ok = await this.initializeExchange();
      if (!ok) {
        // 离线模式也进行一次循环，以便前端与对话有数据可用
        console.warn('进入离线模式：使用本地伪数据生成提示与对话');
      } else {
        // 初始化成功后立即更新账户状态（获取交易所的实际余额）
        await this.updateAccountState();
        this.saveState(); // 保存初始状态
      }
      await this.runTradingCycle();
      console.log(`AI交易系统v2运行完成 (env=${this.tradingEnv}, ai=${this.aiProvider}:${this.aiModel})`);
    } catch (e) {
      console.error('系统运行失败:', e.message);
      process.exit(1);
    }
  }
}

async function main() {
  const sys = new AITradingSystemV2();
  await sys.run();
}

main().catch(console.error);



```

```javascript
import ccxt from 'ccxt';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

// 轻量级 .env 加载（避免额外依赖），需在使用 config/env 之前执行
function loadDotEnv(envPath) {
  try {
    if (!existsSync(envPath)) return;
    const raw = readFileSync(envPath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = val;
      }
    });
  } catch (_) {}
}

// 提前加载 backend/.env，确保 config 与 env 解析可用
loadDotEnv(resolve(process.cwd(), 'backend/.env'));

function expandEnvMaybe(value) {
  if (typeof value !== 'string') return value;
  const m = value.match(/^\$\{(.+)\}$/);
  if (m) return process.env[m[1]] || '';
  return value;
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && idx < process.argv.length - 1) return process.argv[idx + 1];
  const envKey = name.replace(/^--/, '').toUpperCase();
  return process.env[envKey];
}

function loadConfig() {
  const configPath = resolve(process.cwd(), 'backend/ai/ai-trading/config.json');
  const raw = readFileSync(configPath, 'utf8');
  const cfg = JSON.parse(raw);
  if (cfg.ai && cfg.ai.api_key) cfg.ai.api_key = expandEnvMaybe(cfg.ai.api_key);
  const f = cfg.exchange?.binance?.futures_demo;
  const s = cfg.exchange?.binance?.spot_testnet;
  if (f) {
    f.api_key = expandEnvMaybe(f.api_key);
    f.api_secret = expandEnvMaybe(f.api_secret);
  }
  if (s) {
    s.api_key = expandEnvMaybe(s.api_key);
    s.api_secret = expandEnvMaybe(s.api_secret);
  }
  return cfg;
}

function renderSections(template, flags) {
  let out = template;
  out = out.replace(/\{\{#is_futures\}\}([\s\S]*?)\{\{\/is_futures\}\}/g, (_, inner) => (flags.is_futures ? inner : ''));
  out = out.replace(/\{\{\^is_futures\}\}([\s\S]*?)\{\{\/is_futures\}\}/g, (_, inner) => (!flags.is_futures ? inner : ''));
  return out;
}

function renderSimple(template, context) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g, (_, key) => {
    const val = key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : ''), context);
    return String(val ?? '');
  });
}

class AITradingSystemV2 {
  constructor() {
    this.config = loadConfig();

    const argEnv = getArg('--env');
    const argAi = getArg('--ai');

    this.tradingEnv = (argEnv && typeof argEnv === 'string') ? argEnv : (this.config.trading_env || 'demo-futures');
    this.isFutures = this.tradingEnv === 'demo-futures' || this.tradingEnv === 'futures';

    const aiPreset = (argAi && this.config.ai?.presets?.[argAi]) ? this.config.ai.presets[argAi] : null;
    this.aiProvider = (aiPreset?.provider || this.config.ai?.provider || 'deepseek');
    this.aiModel = (aiPreset?.model || this.config.ai?.model || 'deepseek-chat');
    this.aiApiKey = expandEnvMaybe(aiPreset?.api_key || this.config.ai?.api_key || process.env.DEEPSEEK_API_KEY_30 || '');
    this.aiTemperature = (aiPreset?.temperature ?? this.config.ai?.temperature ?? 0.7);
    this.aiMaxTokens = (aiPreset?.max_tokens ?? this.config.ai?.max_tokens ?? 2000);

    this.exchange = null;
    this.dataDir = resolve(process.cwd(), 'backend', 'data');
    try { mkdirSync(this.dataDir, { recursive: true }); } catch (_) {}
    this.stateFile = resolve(this.dataDir, 'trading-state.json');
    this.conversationsFile = resolve(this.dataDir, 'conversations.json');
    this.tradesFile = resolve(this.dataDir, 'trades.json');

    this.state = this.loadState();
    this.sanitizeState();
    this.conversations = this.loadConversations();

    // 确保种子文件存在（前端可立即读取）
    try {
      if (!existsSync(this.tradesFile)) {
        writeFileSync(this.tradesFile, JSON.stringify({ trades: [] }, null, 2), 'utf8');
      }
      if (!existsSync(this.conversationsFile)) {
        writeFileSync(this.conversationsFile, JSON.stringify(this.conversations, null, 2), 'utf8');
      }
      if (!existsSync(this.stateFile)) {
        this.saveState();
      }
    } catch (_) {}

    const defaultAllowed = this.isFutures
      ? ['BTC/USDT:USDT','ETH/USDT:USDT','SOL/USDT:USDT','BNB/USDT:USDT','XRP/USDT:USDT','DOGE/USDT:USDT']
      : ['BTC/USDT','ETH/USDT','SOL/USDT','BNB/USDT','XRP/USDT','DOGE/USDT'];

    const presetAllowed = this.config.presets?.[this.tradingEnv]?.allowed_symbols;

    this.allowedSymbolsForAI = Array.isArray(this.config.allowed_symbols) && this.config.allowed_symbols.length > 0
      ? this.config.allowed_symbols
      : (Array.isArray(presetAllowed) && presetAllowed.length > 0 ? presetAllowed : defaultAllowed);

    this.symbols = (Array.isArray(this.config.symbols_monitor) && this.config.symbols_monitor.length > 0)
      ? this.config.symbols_monitor
      : [...this.allowedSymbolsForAI];

    // 优先从 presets 读取环境特定的模板路径，否则使用全局配置
    const presetPromptFiles = this.config.presets?.[this.tradingEnv]?.prompt_files;
    const promptFiles = presetPromptFiles || this.config.prompt_files || {};
    
    this.systemPromptTemplatePath = resolve(process.cwd(), promptFiles.system_prompt_path || '');
    this.userPromptTemplatePath = resolve(process.cwd(), promptFiles.user_prompt_path || '');
    
    // 初始化时加载模板
    this.reloadTemplates();
    
    // 记录模板文件最后修改时间
    this.templateLastLoadTime = Date.now();

    this.dataCfg = {
      intraday_tf: this.config.data?.intraday_tf || '1m',
      intraday_limit: this.config.data?.intraday_limit || 50,
      context_tf: this.config.data?.context_tf || '4h',
      context_limit: this.config.data?.context_limit || 10
    };

    // 简单的随机基准，用于离线/失败回退生成数值
    this._seed = Math.floor(Date.now() / 60000);
  }

  // 重新加载模板文件
  reloadTemplates() {
    try {
      this.systemPromptTemplate = existsSync(this.systemPromptTemplatePath)
        ? readFileSync(this.systemPromptTemplatePath, 'utf8')
        : '';
      this.userPromptTemplate = existsSync(this.userPromptTemplatePath)
        ? readFileSync(this.userPromptTemplatePath, 'utf8')
        : '';
      this.templateLastLoadTime = Date.now();
      console.log(`✅ Prompt模板已重新加载 (${this.tradingEnv})`);
    } catch (e) {
      console.error('重新加载模板失败:', e.message);
    }
  }

  // 检查是否需要重新加载模板（通过标记文件）
  checkAndReloadTemplates() {
    try {
      const dataDir = resolve(process.cwd(), 'backend', 'data');
      const markerFile = resolve(dataDir, `.reload-prompts-${this.tradingEnv}.marker`);
      
      if (existsSync(markerFile)) {
        // 标记文件存在，重新加载模板
        this.reloadTemplates();
        // 删除标记文件
        try {
          unlinkSync(markerFile);
          console.log(`🗑️ 已删除重载标记文件: ${markerFile}`);
        } catch (e) {
          console.warn('删除标记文件失败:', e.message);
        }
      }
    } catch (e) {
      // 静默失败，不影响主流程
    }
  }

  sanitizeState() {
    const s = this.state || {};
    // 核心数值字段保证为数字
    s.accountValue = Number.isFinite(Number(s.accountValue)) ? Number(s.accountValue) : 10000;
    s.availableCash = Number.isFinite(Number(s.availableCash)) ? Number(s.availableCash) : 10000;
    s.totalReturn = Number.isFinite(Number(s.totalReturn)) ? Number(s.totalReturn) : 0;
    s.invocationCount = Number.isFinite(Number(s.invocationCount)) ? Number(s.invocationCount) : 0;
    // 结构字段
    if (!Array.isArray(s.positions)) s.positions = [];
    if (!s.startTime) s.startTime = new Date().toISOString();
    if (!s.lastUpdate) s.lastUpdate = new Date().toISOString();
    if (typeof s.tradingEnabled !== 'boolean') s.tradingEnabled = true;
    // 规范化持仓内的数值
    s.positions = s.positions.map((p = {}) => ({
      symbol: p.symbol || 'BTC',
      quantity: Number.isFinite(Number(p.quantity)) ? Number(p.quantity) : 0,
      entry_price: Number.isFinite(Number(p.entry_price)) ? Number(p.entry_price) : 0,
      current_price: Number.isFinite(Number(p.current_price)) ? Number(p.current_price) : 0,
      liquidation_price: Number.isFinite(Number(p.liquidation_price)) ? Number(p.liquidation_price) : 0,
      unrealized_pnl: Number.isFinite(Number(p.unrealized_pnl)) ? Number(p.unrealized_pnl) : 0,
      leverage: Number.isFinite(Number(p.leverage)) ? Number(p.leverage) : 1,
      exit_plan: p.exit_plan || { profit_target: 0, stop_loss: 0, invalidation_condition: 'none' },
      confidence: Number.isFinite(Number(p.confidence)) ? Number(p.confidence) : 0.8,
      risk_usd: Number.isFinite(Number(p.risk_usd)) ? Number(p.risk_usd) : 0,
      sl_oid: p.sl_oid ?? null,
      tp_oid: p.tp_oid ?? null,
      wait_for_fill: Boolean(p.wait_for_fill),
      entry_oid: p.entry_oid ?? null,
      notional_usd: Number.isFinite(Number(p.notional_usd)) ? Number(p.notional_usd) : 0,
    }));
    this.state = s;
  }

  normalizeBaseSymbol(raw) {
    if (!raw) return undefined;
    let sym = String(raw).trim().toUpperCase();
    sym = sym.replace(/\s+/g, '');
    sym = sym.replace(/:USDT$/, '');
    if (sym.includes('/')) return sym.split('/')[0];
    if (sym.endsWith('USDT')) return sym.slice(0, -4);
    return sym;
  }

  loadState() {
    try {
      if (existsSync(this.stateFile)) {
        const data = readFileSync(this.stateFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (_) {}
    return {
      startTime: new Date().toISOString(),
      invocationCount: 0,
      totalReturn: 0,
      accountValue: 10000,
      availableCash: 10000,
      positions: [],
      lastUpdate: new Date().toISOString(),
      tradingEnabled: true
    };
  }

  saveState() {
    this.state.lastUpdate = new Date().toISOString();
    writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf8');
  }

  loadConversations() {
    try {
      if (existsSync(this.conversationsFile)) {
        const data = readFileSync(this.conversationsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (_) {}
    return { conversations: [], lastUpdate: new Date().toISOString() };
  }

  saveConversations() {
    this.conversations.lastUpdate = new Date().toISOString();
    writeFileSync(this.conversationsFile, JSON.stringify(this.conversations, null, 2), 'utf8');
  }

  async initializeExchange() {
    try {
      // 仅在用户显式设置时使用代理，避免误用本地 7890 端口
      const httpsProxy = process.env.HTTPS_PROXY || '';
      const httpProxy = process.env.HTTP_PROXY || '';
      const noProxy = process.env.NO_PROXY || process.env.no_proxy || '';
      console.log(`Proxy config -> HTTPS_PROXY=${httpsProxy || '(unset)'} HTTP_PROXY=${httpProxy || '(unset)'} NO_PROXY=${noProxy || '(unset)'}\n`);

      const envKey = this.tradingEnv;
      const isDemoFutures = envKey === 'demo-futures';
      const isDemoSpot = envKey === 'demo-spot';

      if (isDemoFutures || envKey === 'futures') {
        const apiKey = this.config.exchange?.binance?.futures_demo?.api_key || process.env.BINANCE_DEMO_API_KEY;
        const secret = this.config.exchange?.binance?.futures_demo?.api_secret || process.env.BINANCE_DEMO_API_SECRET;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_DEMO_API_KEY/SECRET或在config.json配置');
        this.exchange = new ccxt.binanceusdm({ apiKey, secret, enableRateLimit: true, options: { defaultType: 'future', warnOnFetchCurrencies: false, fetchCurrencies: false, enableDemoTrading: true } });
        if (httpsProxy) this.exchange.httpsProxy = httpsProxy.endsWith('/') ? httpsProxy : `${httpsProxy}/`;
        this.exchange.enableDemoTrading(true);
        await this.exchange.fetchBalance();
      } else if (isDemoSpot || envKey === 'spot') {
        const apiKey = this.config.exchange?.binance?.spot_testnet?.api_key || process.env.BINANCE_SPOT_TEST_API_KEY;
        const secret = this.config.exchange?.binance?.spot_testnet?.api_secret || process.env.BINANCE_SPOT_TEST_API_SECRET;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_SPOT_TEST_API_KEY/SECRET或在config.json配置');
        this.exchange = new ccxt.binance({ apiKey, secret, enableRateLimit: true });
        if (httpsProxy) this.exchange.httpsProxy = httpsProxy.endsWith('/') ? httpsProxy : `${httpsProxy}/`;
        if (typeof this.exchange.setSandboxMode === 'function') this.exchange.setSandboxMode(true);
        await this.exchange.fetchBalance();
      }
      return true;
    } catch (e) {
      console.error('❌ 初始化交易所失败:', e.message);
      console.error('详细错误:', e);
      return false;
    }
  }

  calculateEMA(prices, period) {
    if (prices.length < period) return null;
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    return ema;
  }
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26) {
    if (prices.length < slowPeriod) return null;
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    if (!fastEMA || !slowEMA) return null;
    return fastEMA - slowEMA;
  }
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change; else losses += Math.abs(change);
    }
    const avgGain = gains / period; const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  calculateATR(highs, lows, closes, period = 14) {
    if (highs.length < period + 1) return null;
    const trueRanges = [];
    for (let i = 1; i < highs.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  async getMarketData() {
    const marketData = {};
    const intradayTf = this.dataCfg.intraday_tf;
    const intradayLimit = this.dataCfg.intraday_limit;
    const ctxTf = this.dataCfg.context_tf;
    const ctxLimit = this.dataCfg.context_limit;
    for (const symbol of this.symbols) {
      try {
        if (!this.exchange) throw new Error('no_exchange');
        const ticker = await this.exchange.fetchTicker(symbol);
        const ohlcv = await this.exchange.fetchOHLCV(symbol, intradayTf, undefined, intradayLimit);
        const prices = ohlcv.map(c => (c[2] + c[3]) / 2);
        const highs = ohlcv.map(c => c[2]);
        const lows = ohlcv.map(c => c[3]);
        const closes = ohlcv.map(c => c[4]);
        const volumes = ohlcv.map(c => c[5]);
        const ema20 = this.calculateEMA(prices, 20) || Number(ticker.last) || 0;
        const macd = this.calculateMACD(prices) || 0;
        const rsi14 = this.calculateRSI(prices, 14) || 50;
        const rsi21 = this.calculateRSI(prices, 21) || 50;
        const atr = this.calculateATR(highs, lows, closes) || (Number(ticker.last) || 0) * 0.02;

        const ohlcvCtx = await this.exchange.fetchOHLCV(symbol, ctxTf, undefined, ctxLimit);
        const pricesCtx = ohlcvCtx.map(c => (c[2] + c[3]) / 2);
        const ema20_4h = this.calculateEMA(pricesCtx, 20) || Number(ticker.last) || 0;
        const ema50_4h = this.calculateEMA(pricesCtx, 50) || Number(ticker.last) || 0;
        const atr_4h = this.calculateATR(ohlcvCtx.map(c => c[2]), ohlcvCtx.map(c => c[3]), ohlcvCtx.map(c => c[4])) || (Number(ticker.last) || 0) * 0.02;

        const currentVolume = volumes[volumes.length - 1] || 0;
        const avgVolume = volumes.length ? (volumes.reduce((a, b) => a + b, 0) / volumes.length) : 0;
        const fundingRate = (Math.random() - 0.5) * 0.001;
        const openInterest = Math.random() * 1000000 + 500000;
        const avgOpenInterest = openInterest * (0.8 + Math.random() * 0.4);
        const baseKey = this.normalizeBaseSymbol(symbol);

        marketData[baseKey] = {
          symbol: baseKey,
          currentPrice: Number(ticker.last) || 0,
          ema20: Number(ema20) || 0,
          macd: Number(macd) || 0,
          rsi14: Number(rsi14) || 50,
          rsi21: Number(rsi21) || 50,
          atr: Number(atr) || 0,
          ema20_4h: Number(ema20_4h) || 0,
          ema50_4h: Number(ema50_4h) || 0,
          atr_4h: Number(atr_4h) || 0,
          currentVolume: Number(currentVolume) || 0,
          avgVolume: Number(avgVolume) || 0,
          fundingRate: Number(fundingRate) || 0,
          openInterest: Number(openInterest) || 0,
          avgOpenInterest: Number(avgOpenInterest) || 0,
          prices: prices.slice(-10).map(Number),
          ema20_series: this.generateEMASeries(prices, 20).slice(-10).map(Number),
          macd_series: this.generateMACDSeries(prices).slice(-10).map(Number),
          rsi14_series: this.generateRSISeries(prices, 14).slice(-10).map(Number),
          rsi21_series: this.generateRSISeries(prices, 21).slice(-10).map(Number),
          macd_4h_series: this.generateMACDSeries(pricesCtx).slice(-10).map(Number),
          rsi14_4h_series: this.generateRSISeries(pricesCtx, 14).slice(-10).map(Number)
        };
      } catch (e) {
        // 离线/失败回退：生成稳定的伪数据，避免渲染与 toFixed 失败
        const baseKey = this.normalizeBaseSymbol(symbol);
        const t = this._seed + Math.floor(Math.random() * 1000);
        const p0 = 100 + (t % 50);
        const series = Array.from({ length: 10 }, (_, i) => p0 + Math.sin((t + i) / 5) * 2 + (Math.random() - 0.5));
        const last = series[series.length - 1];
        marketData[baseKey] = {
          symbol: baseKey,
          currentPrice: last,
          ema20: last * 0.998,
          macd: (Math.random() - 0.5) * 2,
          rsi14: 45 + Math.random() * 10,
          rsi21: 45 + Math.random() * 10,
          atr: last * 0.02,
          ema20_4h: last * 1.001,
          ema50_4h: last * 1.0005,
          atr_4h: last * 0.018,
          currentVolume: 1_000_000 + Math.random() * 100_000,
          avgVolume: 1_050_000,
          fundingRate: (Math.random() - 0.5) * 0.0005,
          openInterest: 700_000 + Math.random() * 200_000,
          avgOpenInterest: 750_000,
          prices: series,
          ema20_series: series.map((v, i, a) => (i > 0 ? (a[i - 1] * 0.9 + v * 0.1) : v)),
          macd_series: series.map(() => (Math.random() - 0.5)),
          rsi14_series: series.map(() => 45 + Math.random() * 10),
          rsi21_series: series.map(() => 45 + Math.random() * 10),
          macd_4h_series: series.map(() => (Math.random() - 0.5)),
          rsi14_4h_series: series.map(() => 45 + Math.random() * 10)
        };
      }
    }
    return marketData;
  }

  generateEMASeries(prices, period) {
    const series = [];
    for (let i = period - 1; i < prices.length; i++) {
      const ema = this.calculateEMA(prices.slice(0, i + 1), period);
      series.push(ema);
    }
    return series;
  }
  generateMACDSeries(prices) {
    const series = [];
    for (let i = 25; i < prices.length; i++) {
      const macd = this.calculateMACD(prices.slice(0, i + 1));
      series.push(macd);
    }
    return series;
  }
  generateRSISeries(prices, period) {
    const series = [];
    for (let i = period; i < prices.length; i++) {
      const rsi = this.calculateRSI(prices.slice(0, i + 1), period);
      series.push(rsi);
    }
    return series;
  }

  buildMarketSections(marketData) {
    let out = '';
    for (const [symbol, data] of Object.entries(marketData)) {
      const d = data || {};
      // 归一化，避免 undefined 触发 toFixed
      const safe = {
        currentPrice: Number(d.currentPrice) || 0,
        ema20: Number(d.ema20) || 0,
        macd: Number(d.macd) || 0,
        rsi14: Number(d.rsi14) || 50,
        rsi21: Number(d.rsi21) || 50,
        atr: Number(d.atr) || 0,
        ema20_4h: Number(d.ema20_4h) || 0,
        ema50_4h: Number(d.ema50_4h) || 0,
        atr_4h: Number(d.atr_4h) || 0,
        currentVolume: Number(d.currentVolume) || 0,
        avgVolume: Number(d.avgVolume) || 0,
        fundingRate: Number(d.fundingRate) || 0,
        openInterest: Number(d.openInterest) || 0,
        avgOpenInterest: Number(d.avgOpenInterest) || 0,
        prices: Array.isArray(d.prices) ? d.prices.map(Number) : [],
        ema20_series: Array.isArray(d.ema20_series) ? d.ema20_series.map(Number) : [],
        macd_series: Array.isArray(d.macd_series) ? d.macd_series.map(Number) : [],
        rsi14_series: Array.isArray(d.rsi14_series) ? d.rsi14_series.map(Number) : [],
        rsi21_series: Array.isArray(d.rsi21_series) ? d.rsi21_series.map(Number) : [],
        macd_4h_series: Array.isArray(d.macd_4h_series) ? d.macd_4h_series.map(Number) : [],
        rsi14_4h_series: Array.isArray(d.rsi14_4h_series) ? d.rsi14_4h_series.map(Number) : [],
      };
      const fx = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '0.00');
      const ex = (n) => {
        const v = Number(n);
        if (!Number.isFinite(v)) return '0.00e+0';
        try { return v.toExponential(2); } catch { return '0.00e+0'; }
      };
      out += `### ALL ${symbol} DATA\n\n` +
        `current_price = ${fx(safe.currentPrice)}, current_ema20 = ${fx(safe.ema20)}, current_macd = ${fx(safe.macd)}, current_rsi (14 period) = ${fx(safe.rsi14)}\n\n` +
        `In addition, here is the latest ${symbol} open interest and funding rate for perps (the instrument you are trading):\n\n` +
        `Open Interest: Latest: ${fx(safe.openInterest)}  Average: ${fx(safe.avgOpenInterest)}\n\n` +
        `Funding Rate: ${ex(safe.fundingRate)}\n\n` +
        `**Intraday series (3‑minute intervals, oldest → latest):**\n\n` +
        `Mid prices: [${(safe.prices).map(p => fx(p)).join(', ')}]\n\n` +
        `EMA indicators (20‑period): [${(safe.ema20_series).map(p => fx(p)).join(', ')}]\n\n` +
        `MACD indicators: [${(safe.macd_series).map(p => fx(p)).join(', ')}]\n\n` +
        `RSI indicators (14‑Period): [${(safe.rsi14_series).map(p => fx(p)).join(', ')}]\n\n` +
        `RSI indicators (21‑Period): [${(safe.rsi21_series).map(p => fx(p)).join(', ')}]\n\n` +
        `**Longer‑term context (${this.dataCfg.context_tf}‑hour timeframe):**\n\n` +
        `20‑Period EMA: ${fx(safe.ema20_4h)} vs. 50‑Period EMA: ${fx(safe.ema50_4h)}\n\n` +
        `3‑Period ATR: ${fx(safe.atr)} vs. 14‑Period ATR: ${fx(safe.atr_4h)}\n\n` +
        `Current Volume: ${fx(safe.currentVolume)} vs. Average Volume: ${fx(safe.avgVolume)}\n\n` +
        `MACD indicators: [${(safe.macd_4h_series || []).map(p => fx(p)).join(', ')}]\n\n` +
        `RSI indicators (14‑Period): [${(safe.rsi14_4h_series || []).map(p => fx(p)).join(', ')}]\n\n` +
        `---\n\n`;
    }
    return out;
  }

  generateUserPrompt(marketData) {
    if (!this.userPromptTemplate) {
      const currentTime = new Date();
      const startTime = new Date(this.state.startTime);
      const minutesSinceStart = Math.floor((currentTime - startTime) / (1000 * 60));
      this.state.invocationCount++;
      this.saveState();
      let marketSections = '';
      try { marketSections = this.buildMarketSections(marketData); } catch (_) { marketSections = 'MARKET DATA UNAVAILABLE'; }
      return `It has been ${minutesSinceStart} minutes since you started trading. The current time is ${currentTime.toISOString()} and you've been invoked ${this.state.invocationCount} times.\n\n---\n\n${marketSections}\n\nAccount Value: ${this.state.accountValue}`;
    }

    const now = new Date();
    const start = new Date(this.state.startTime);
    const minutesSince = Math.floor((now - start) / (1000 * 60));
    this.state.invocationCount++;
    this.saveState();

    const context = {
      minutes_since_start: minutesSince,
      now_iso: now.toISOString(),
      invocation_count: this.state.invocationCount,
      market_sections: (() => { try { return this.buildMarketSections(marketData); } catch (_) { return 'MARKET DATA UNAVAILABLE'; } })(),
      account_value: Number(this.state.accountValue ?? 0).toFixed(2),
      available_cash: Number(this.state.availableCash ?? 0).toFixed(2),
      total_return: Number(this.state.totalReturn ?? 0).toFixed(2),
      positions_block: this.state.positions.map(p => JSON.stringify(p)).join('\n'),
      sharpe_ratio: Number(this.calculateSharpeRatio() ?? 0).toFixed(2)
    };

    return renderSimple(this.userPromptTemplate, context);
  }

  calculateSharpeRatio() {
    return this.state.totalReturn > 0 ? Math.random() * 2 - 1 : -Math.random();
  }

  buildSystemPrompt() {
    if (!this.systemPromptTemplate) {
      const allowedCsv = this.allowedSymbolsForAI.join(', ');
      const base = [
        this.isFutures ? 'You are an expert crypto trader operating Binance USDT-margined perpetual futures (U-margined).'
                       : 'You are an expert crypto trader operating Binance Spot Testnet (no leverage).',
        'Symbols whitelist:',
        allowedCsv
      ].join('\n');
      return base;
    }
    const tpl1 = renderSections(this.systemPromptTemplate, { is_futures: this.isFutures });
    const context = {
      environment: this.isFutures ? 'demo.binance.com (USDT-M Futures)' : 'binance spot testnet',
      env_note: this.isFutures ? 'USDM perpetual' : 'Spot testnet',
      trading_mode: this.isFutures ? 'perpetual futures (isolated)' : 'spot (no leverage)',
      is_futures: this.isFutures,
      allowed_symbols_csv: this.allowedSymbolsForAI.join(', ')
    };
    return renderSimple(tpl1, context);
  }

  async callDeepSeekAPI(userPrompt) {
    try {
      const apiKey = this.aiApiKey;
      const model = this.aiModel;
      const temperature = this.aiTemperature;
      const max_tokens = this.aiMaxTokens;
      const systemContent = this.buildSystemPrompt();

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: userPrompt }
          ],
          stream: false,
          temperature,
          max_tokens
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (e) {
      console.error('AI 调用失败:', e.message);
      return null;
    }
  }

  parseAIResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { action: 'hold', reasoning: response };
      const rawObj = JSON.parse(jsonMatch[0]);
      const normalizeAction = (a) => {
        if (!a) return 'hold';
        const x = String(a).toLowerCase();
        if (x === 'buy' || x === 'long' || x === 'open_long') return 'buy';
        if (x === 'sell' || x === 'short' || x === 'open_short') return 'sell';
        if (x === 'close' || x === 'close_position' || x === 'exit' || x === 'reduce' || x === 'reduce_position') return 'close_position';
        if (x === 'hold' || x === 'wait' || x === 'no_trade') return 'hold';
        return 'hold';
      };
      const normalizeSymbol = (s) => this.normalizeBaseSymbol(s);
      const d = rawObj.trading_decision ? rawObj.trading_decision : rawObj;
      return {
        action: normalizeAction(d.action),
        symbol: normalizeSymbol(d.symbol),
        quantity: d.quantity !== undefined ? Number(d.quantity) : undefined,
        reasoning: d.reasoning || rawObj.reasoning,
        leverage: d.leverage !== undefined ? Number(d.leverage) : undefined
      };
    } catch (_) {
      return { action: 'hold', reasoning: '解析失败，保持当前持仓' };
    }
  }

  async executeTradingDecision(decision, marketData) {
    try {
      if (decision.action === 'buy' && decision.symbol) {
        await this.executeBuyOrder(decision, marketData);
      } else if (decision.action === 'sell' && decision.symbol) {
        await this.executeSellOrder(decision, marketData);
      } else if (decision.action === 'close_position' && decision.symbol) {
        const base = this.normalizeBaseSymbol(decision.symbol);
        const pos = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
        if (pos) {
          const qty = decision.quantity && decision.quantity > 0 ? decision.quantity : Math.abs(Number(pos.quantity));
          // 根据持仓方向决定平仓方向：多头用sell平仓，空头用buy平仓
          const posQty = Number(pos.quantity);
          if (posQty > 0) {
            // 多头：使用sell平仓
            await this.executeSellOrder({ ...decision, symbol: base, quantity: qty }, marketData);
          } else if (posQty < 0) {
            // 空头：使用buy平仓
            await this.executeBuyOrder({ ...decision, symbol: base, quantity: qty }, marketData);
          }
        }
      }
      await this.updateAccountState();
    } catch (e) {
      console.error('交易执行失败:', e.message);
    }
    this.saveState();
  }

  async executeBuyOrder(decision) {
    try {
      const base = this.normalizeBaseSymbol(decision.symbol);
      const symbol = this.isFutures ? `${base}/USDT:USDT` : `${base}/USDT`;
      const quantity = decision.quantity || 0.001;
      const leverage = this.isFutures && decision.leverage !== undefined ? Math.floor(Number(decision.leverage)) : undefined;
      if (this.isFutures) {
        try { await this.exchange.setMarginMode('ISOLATED', symbol); } catch (_) {}
        try { if (leverage !== undefined) await this.exchange.setLeverage(leverage, symbol); } catch (_) {}
      }
      const order = await this.exchange.createOrder(
        symbol, 'market', 'buy', quantity, null,
        this.isFutures ? (leverage !== undefined ? { leverage, marginType: 'isolated' } : { marginType: 'isolated' }) : undefined
      );
      this.addPosition(base, quantity, order.average || order.price);
      this.logTrade('BUY', base, quantity, order.average || order.price, order.id);
    } catch (e) {
      console.error('买入失败:', e.message);
    }
  }

  async executeSellOrder(decision) {
    try {
      const base = this.normalizeBaseSymbol(decision.symbol);
      const symbol = this.isFutures ? `${base}/USDT:USDT` : `${base}/USDT`;
      const quantity = decision.quantity || 0.001;
      const leverage = this.isFutures && decision.leverage !== undefined ? Math.floor(Number(decision.leverage)) : undefined;
      if (this.isFutures) {
        try { await this.exchange.setMarginMode('ISOLATED', symbol); } catch (_) {}
        try { if (leverage !== undefined) await this.exchange.setLeverage(leverage, symbol); } catch (_) {}
      }
      const order = await this.exchange.createOrder(
        symbol, 'market', 'sell', quantity, null,
        this.isFutures ? (leverage !== undefined ? { leverage, marginType: 'isolated' } : { marginType: 'isolated' }) : undefined
      );
      this.removePosition(base, quantity);
      this.logTrade('SELL', base, quantity, order.average || order.price, order.id);
    } catch (e) {
      console.error('卖出失败:', e.message);
    }
  }

  addPosition(symbol, quantity, entryPrice) {
    const base = this.normalizeBaseSymbol(symbol);
    const existing = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
    if (existing) {
      const totalQ = parseFloat(existing.quantity) + parseFloat(quantity);
      const avgPrice = (parseFloat(existing.entry_price) * parseFloat(existing.quantity) + parseFloat(entryPrice) * parseFloat(quantity)) / totalQ;
      existing.quantity = totalQ; existing.entry_price = avgPrice;
    } else {
      this.state.positions.push({
        symbol: base,
        quantity,
        entry_price: entryPrice,
        current_price: entryPrice,
        liquidation_price: entryPrice * 0.9,
        unrealized_pnl: 0,
        leverage: 1,
        exit_plan: { profit_target: entryPrice * 1.1, stop_loss: entryPrice * 0.95, invalidation_condition: 'price_below_stop_loss' },
        confidence: 0.8,
        risk_usd: quantity * entryPrice,
        sl_oid: null, tp_oid: null, wait_for_fill: false, entry_oid: null,
        notional_usd: quantity * entryPrice
      });
    }
  }

  removePosition(symbol, quantity) {
    const base = this.normalizeBaseSymbol(symbol);
    const existing = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
    if (existing) {
      const remain = parseFloat(existing.quantity) - parseFloat(quantity);
      if (remain <= 0) {
        this.state.positions = this.state.positions.filter(p => this.normalizeBaseSymbol(p.symbol) !== base);
      } else {
        existing.quantity = remain;
      }
    }
  }

  async updateAccountState() {
    try {
      const balance = await this.exchange.fetchBalance();
      this.state.accountValue = balance.USDT?.total || 10000;
      this.state.availableCash = balance.USDT?.free || 10000;
      this.state.totalReturn = ((this.state.accountValue - 10000) / 10000) * 100;
      if (this.isFutures) {
        const positions = await this.exchange.fetchPositions();
        const active = positions.filter(p => parseFloat(p.contracts) !== 0);
        this.state.positions = [];
        for (const position of active) {
          if (parseFloat(position.contracts) !== 0) {
            const symbol = this.normalizeBaseSymbol(position.symbol);
            const contracts = parseFloat(position.contracts);
            // 根据side字段确定quantity的符号：long=正数，short=负数
            const quantity = (position.side === 'long' || position.side === 'buy') ? Math.abs(contracts) : -Math.abs(contracts);
            // 计算杠杆：名义价值 / 保证金
            const notional = Math.abs(parseFloat(position.notional) || 0);
            const initialMargin = parseFloat(position.initialMargin) || 0;
            const leverage = notional > 0 && initialMargin > 0 ? Math.round((notional / initialMargin) * 10) / 10 : 1;
            this.state.positions.push({
              symbol,
              quantity, // 正数=多仓，负数=空仓
              entry_price: parseFloat(position.entryPrice),
              current_price: parseFloat(position.markPrice),
              liquidation_price: parseFloat(position.liquidationPrice) || 0,
              unrealized_pnl: parseFloat(position.unrealizedPnl),
              leverage, // 根据名义价值和保证金计算
              exit_plan: {
                profit_target: parseFloat(position.entryPrice) * 1.1,
                stop_loss: parseFloat(position.entryPrice) * 0.95,
                invalidation_condition: 'price_below_stop_loss'
              },
              confidence: 0.8,
              risk_usd: Math.abs(quantity) * parseFloat(position.entryPrice),
              sl_oid: null, tp_oid: null, wait_for_fill: false, entry_oid: null,
              notional_usd: notional
            });
          }
        }
      }
    } catch (e) {
      console.error('更新账户失败:', e.message);
    }
  }

  logTrade(side, symbol, quantity, price, orderId) {
    const trade = {
      timestamp: new Date().toISOString(),
      side, symbol, quantity, price, orderId,
      environment: this.isFutures ? 'demo.binance.com' : 'spot.testnet',
      accountValue: this.state.accountValue,
      totalReturn: this.state.totalReturn
    };
    if (!this.state.trades) this.state.trades = [];
    this.state.trades.unshift(trade);
    this.saveState();
    // Mirror to backend/data/trades.json for web API consumption
    try {
      let obj = { trades: [] };
      if (existsSync(this.tradesFile)) {
        try { obj = JSON.parse(readFileSync(this.tradesFile, 'utf8')); } catch (_) {}
      }
      if (!Array.isArray(obj.trades)) obj.trades = [];
      obj.trades.unshift({
        model_id: 'default',
        exit_time: Math.floor(Date.now() / 1000),
        realized_net_pnl: side === 'BUY' ? 0 : 0,
        side, symbol, quantity, price, orderId
      });
      writeFileSync(this.tradesFile, JSON.stringify(obj, null, 2), 'utf8');
    } catch (_) {}
  }

  saveConversation(userPrompt, aiResponse, decision) {
    // 解析AI响应中的JSON
    let aiParsed = null;
    try {
      if (typeof aiResponse === 'string') {
        const match = aiResponse.match(/\{[\s\S]*\}/);
        if (match) aiParsed = JSON.parse(match[0]);
      }
    } catch (_) {}

    // 从 aiParsed 中提取"原始决策对象"和"候选数组"，用于完整留存
    let decisionRaw = null;
    let decisionsArray = null;
    try {
      if (aiParsed && typeof aiParsed === 'object') {
        if (aiParsed.trading_decision) {
          decisionRaw = aiParsed.trading_decision;
        }
        if (Array.isArray(aiParsed.trading_decisions)) {
          decisionsArray = aiParsed.trading_decisions;
          // 若尚未从 trading_decision 取到主决策，则优先取与现有持仓相关的项
          if (!decisionRaw) {
            const currentSymbols = this.state.positions.map(p => p.symbol);
            const pick = decisionsArray.find(x => currentSymbols.includes(String(x.symbol || '').toUpperCase().replace(/:USDT$/,'').split('/')[0]))
              || decisionsArray[0];
            decisionRaw = pick || null;
          }
        }
      }
    } catch (_) {}

    const conversation = {
      timestamp: new Date().toISOString(),
      invocationCount: this.state.invocationCount,
      userPrompt,
      aiResponse,
      aiParsed,
      // decision: 原始/丰富结构（保持完整字段用于分析）
      decision: decisionRaw || aiParsed?.trading_decision || null,
      // decision_normalized: 供程序执行的归一化决策
      decision_normalized: decision,
      // trading_decisions: 若模型输出了候选数组，也一并保存
      trading_decisions: decisionsArray || null,
      // chain_of_thought: 从aiParsed中提取
      chain_of_thought: aiParsed?.chain_of_thought || null,
      accountValue: this.state.accountValue,
      totalReturn: this.state.totalReturn
    };
    if (!this.conversations.conversations) this.conversations.conversations = [];
    this.conversations.conversations.unshift(conversation);
    this.saveConversations();
  }

  async runTradingCycle() {
    try {
      const marketData = await this.getMarketData();
      const userPrompt = this.generateUserPrompt(marketData);
      const aiResponse = await this.callDeepSeekAPI(userPrompt);
      if (!aiResponse) {
        const decision = { action: 'hold', reasoning: 'no_ai_response' };
        await this.executeTradingDecision(decision, marketData);
        this.saveConversation(userPrompt, aiResponse, decision);
        return;
      }
      const decision = this.parseAIResponse(aiResponse);
      await this.executeTradingDecision(decision, marketData);
      this.saveConversation(userPrompt, aiResponse, decision);
    } catch (e) {
      console.error('交易循环失败:', e.message);
      // 兜底：写入最小对话，保证前端可读
      try {
        const note = `CYCLE ERROR: ${String(e?.message || e)}\n`;
        const userPrompt = 'MARKET DATA UNAVAILABLE';
        const aiResponse = null;
        const decision = { action: 'hold', reasoning: 'error' };
        this.saveConversation(userPrompt, aiResponse, decision);
      } catch (_) {}
    }
  }

  async run() {
    try {
      if (!this.aiApiKey) {
        console.error('缺少 AI API Key');
        return;
      }
      const ok = await this.initializeExchange();
      if (!ok) {
        // 离线模式也进行一次循环，以便前端与对话有数据可用
        console.warn('进入离线模式：使用本地伪数据生成提示与对话');
      } else {
        // 初始化成功后立即更新账户状态（获取交易所的实际余额）
        await this.updateAccountState();
        this.saveState(); // 保存初始状态
      }
      await this.runTradingCycle();
      console.log(`AI交易系统v2运行完成 (env=${this.tradingEnv}, ai=${this.aiProvider}:${this.aiModel})`);
    } catch (e) {
      console.error('系统运行失败:', e.message);
      process.exit(1);
    }
  }
}

async function main() {
  const sys = new AITradingSystemV2();
  await sys.run();
}

main().catch(console.error);



```

```javascript
import ccxt from 'ccxt';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

// 轻量级 .env 加载（避免额外依赖），需在使用 config/env 之前执行
function loadDotEnv(envPath) {
  try {
    if (!existsSync(envPath)) return;
    const raw = readFileSync(envPath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = val;
      }
    });
  } catch (_) {}
}

// 提前加载 backend/.env，确保 config 与 env 解析可用
loadDotEnv(resolve(process.cwd(), 'backend/.env'));

function expandEnvMaybe(value) {
  if (typeof value !== 'string') return value;
  const m = value.match(/^\$\{(.+)\}$/);
  if (m) return process.env[m[1]] || '';
  return value;
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && idx < process.argv.length - 1) return process.argv[idx + 1];
  const envKey = name.replace(/^--/, '').toUpperCase();
  return process.env[envKey];
}

function loadConfig() {
  const configPath = resolve(process.cwd(), 'backend/ai/ai-trading/config.json');
  const raw = readFileSync(configPath, 'utf8');
  const cfg = JSON.parse(raw);
  if (cfg.ai && cfg.ai.api_key) cfg.ai.api_key = expandEnvMaybe(cfg.ai.api_key);
  const f = cfg.exchange?.binance?.futures_demo;
  const s = cfg.exchange?.binance?.spot_testnet;
  if (f) {
    f.api_key = expandEnvMaybe(f.api_key);
    f.api_secret = expandEnvMaybe(f.api_secret);
  }
  if (s) {
    s.api_key = expandEnvMaybe(s.api_key);
    s.api_secret = expandEnvMaybe(s.api_secret);
  }
  return cfg;
}

function renderSections(template, flags) {
  let out = template;
  out = out.replace(/\{\{#is_futures\}\}([\s\S]*?)\{\{\/is_futures\}\}/g, (_, inner) => (flags.is_futures ? inner : ''));
  out = out.replace(/\{\{\^is_futures\}\}([\s\S]*?)\{\{\/is_futures\}\}/g, (_, inner) => (!flags.is_futures ? inner : ''));
  return out;
}

function renderSimple(template, context) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g, (_, key) => {
    const val = key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : ''), context);
    return String(val ?? '');
  });
}

class AITradingSystemV2 {
  constructor() {
    this.config = loadConfig();

    const argEnv = getArg('--env');
    const argAi = getArg('--ai');

    this.tradingEnv = (argEnv && typeof argEnv === 'string') ? argEnv : (this.config.trading_env || 'demo-futures');
    this.isFutures = this.tradingEnv === 'demo-futures' || this.tradingEnv === 'futures';

    const aiPreset = (argAi && this.config.ai?.presets?.[argAi]) ? this.config.ai.presets[argAi] : null;
    this.aiProvider = (aiPreset?.provider || this.config.ai?.provider || 'deepseek');
    this.aiModel = (aiPreset?.model || this.config.ai?.model || 'deepseek-chat');
    this.aiApiKey = expandEnvMaybe(aiPreset?.api_key || this.config.ai?.api_key || process.env.DEEPSEEK_API_KEY_30 || '');
    this.aiTemperature = (aiPreset?.temperature ?? this.config.ai?.temperature ?? 0.7);
    this.aiMaxTokens = (aiPreset?.max_tokens ?? this.config.ai?.max_tokens ?? 2000);

    this.exchange = null;
    this.dataDir = resolve(process.cwd(), 'backend', 'data');
    try { mkdirSync(this.dataDir, { recursive: true }); } catch (_) {}
    this.stateFile = resolve(this.dataDir, 'trading-state.json');
    this.conversationsFile = resolve(this.dataDir, 'conversations.json');
    this.tradesFile = resolve(this.dataDir, 'trades.json');

    this.state = this.loadState();
    this.sanitizeState();
    this.conversations = this.loadConversations();

    // 确保种子文件存在（前端可立即读取）
    try {
      if (!existsSync(this.tradesFile)) {
        writeFileSync(this.tradesFile, JSON.stringify({ trades: [] }, null, 2), 'utf8');
      }
      if (!existsSync(this.conversationsFile)) {
        writeFileSync(this.conversationsFile, JSON.stringify(this.conversations, null, 2), 'utf8');
      }
      if (!existsSync(this.stateFile)) {
        this.saveState();
      }
    } catch (_) {}

    const defaultAllowed = this.isFutures
      ? ['BTC/USDT:USDT','ETH/USDT:USDT','SOL/USDT:USDT','BNB/USDT:USDT','XRP/USDT:USDT','DOGE/USDT:USDT']
      : ['BTC/USDT','ETH/USDT','SOL/USDT','BNB/USDT','XRP/USDT','DOGE/USDT'];

    const presetAllowed = this.config.presets?.[this.tradingEnv]?.allowed_symbols;

    this.allowedSymbolsForAI = Array.isArray(this.config.allowed_symbols) && this.config.allowed_symbols.length > 0
      ? this.config.allowed_symbols
      : (Array.isArray(presetAllowed) && presetAllowed.length > 0 ? presetAllowed : defaultAllowed);

    this.symbols = (Array.isArray(this.config.symbols_monitor) && this.config.symbols_monitor.length > 0)
      ? this.config.symbols_monitor
      : [...this.allowedSymbolsForAI];

    // 优先从 presets 读取环境特定的模板路径，否则使用全局配置
    const presetPromptFiles = this.config.presets?.[this.tradingEnv]?.prompt_files;
    const promptFiles = presetPromptFiles || this.config.prompt_files || {};
    
    this.systemPromptTemplatePath = resolve(process.cwd(), promptFiles.system_prompt_path || '');
    this.userPromptTemplatePath = resolve(process.cwd(), promptFiles.user_prompt_path || '');
    
    // 初始化时加载模板
    this.reloadTemplates();
    
    // 记录模板文件最后修改时间
    this.templateLastLoadTime = Date.now();

    this.dataCfg = {
      intraday_tf: this.config.data?.intraday_tf || '1m',
      intraday_limit: this.config.data?.intraday_limit || 50,
      context_tf: this.config.data?.context_tf || '4h',
      context_limit: this.config.data?.context_limit || 10
    };

    // 简单的随机基准，用于离线/失败回退生成数值
    this._seed = Math.floor(Date.now() / 60000);
  }

  // 重新加载模板文件
  reloadTemplates() {
    try {
      this.systemPromptTemplate = existsSync(this.systemPromptTemplatePath)
        ? readFileSync(this.systemPromptTemplatePath, 'utf8')
        : '';
      this.userPromptTemplate = existsSync(this.userPromptTemplatePath)
        ? readFileSync(this.userPromptTemplatePath, 'utf8')
        : '';
      this.templateLastLoadTime = Date.now();
      console.log(`✅ Prompt模板已重新加载 (${this.tradingEnv})`);
    } catch (e) {
      console.error('重新加载模板失败:', e.message);
    }
  }

  // 检查是否需要重新加载模板（通过标记文件）
  checkAndReloadTemplates() {
    try {
      const dataDir = resolve(process.cwd(), 'backend', 'data');
      const markerFile = resolve(dataDir, `.reload-prompts-${this.tradingEnv}.marker`);
      
      if (existsSync(markerFile)) {
        // 标记文件存在，重新加载模板
        this.reloadTemplates();
        // 删除标记文件
        try {
          unlinkSync(markerFile);
          console.log(`🗑️ 已删除重载标记文件: ${markerFile}`);
        } catch (e) {
          console.warn('删除标记文件失败:', e.message);
        }
      }
    } catch (e) {
      // 静默失败，不影响主流程
    }
  }

  sanitizeState() {
    const s = this.state || {};
    // 核心数值字段保证为数字
    s.accountValue = Number.isFinite(Number(s.accountValue)) ? Number(s.accountValue) : 10000;
    s.availableCash = Number.isFinite(Number(s.availableCash)) ? Number(s.availableCash) : 10000;
    s.totalReturn = Number.isFinite(Number(s.totalReturn)) ? Number(s.totalReturn) : 0;
    s.invocationCount = Number.isFinite(Number(s.invocationCount)) ? Number(s.invocationCount) : 0;
    // 结构字段
    if (!Array.isArray(s.positions)) s.positions = [];
    if (!s.startTime) s.startTime = new Date().toISOString();
    if (!s.lastUpdate) s.lastUpdate = new Date().toISOString();
    if (typeof s.tradingEnabled !== 'boolean') s.tradingEnabled = true;
    // 规范化持仓内的数值
    s.positions = s.positions.map((p = {}) => ({
      symbol: p.symbol || 'BTC',
      quantity: Number.isFinite(Number(p.quantity)) ? Number(p.quantity) : 0,
      entry_price: Number.isFinite(Number(p.entry_price)) ? Number(p.entry_price) : 0,
      current_price: Number.isFinite(Number(p.current_price)) ? Number(p.current_price) : 0,
      liquidation_price: Number.isFinite(Number(p.liquidation_price)) ? Number(p.liquidation_price) : 0,
      unrealized_pnl: Number.isFinite(Number(p.unrealized_pnl)) ? Number(p.unrealized_pnl) : 0,
      leverage: Number.isFinite(Number(p.leverage)) ? Number(p.leverage) : 1,
      exit_plan: p.exit_plan || { profit_target: 0, stop_loss: 0, invalidation_condition: 'none' },
      confidence: Number.isFinite(Number(p.confidence)) ? Number(p.confidence) : 0.8,
      risk_usd: Number.isFinite(Number(p.risk_usd)) ? Number(p.risk_usd) : 0,
      sl_oid: p.sl_oid ?? null,
      tp_oid: p.tp_oid ?? null,
      wait_for_fill: Boolean(p.wait_for_fill),
      entry_oid: p.entry_oid ?? null,
      notional_usd: Number.isFinite(Number(p.notional_usd)) ? Number(p.notional_usd) : 0,
    }));
    this.state = s;
  }

  normalizeBaseSymbol(raw) {
    if (!raw) return undefined;
    let sym = String(raw).trim().toUpperCase();
    sym = sym.replace(/\s+/g, '');
    sym = sym.replace(/:USDT$/, '');
    if (sym.includes('/')) return sym.split('/')[0];
    if (sym.endsWith('USDT')) return sym.slice(0, -4);
    return sym;
  }

  loadState() {
    try {
      if (existsSync(this.stateFile)) {
        const data = readFileSync(this.stateFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (_) {}
    return {
      startTime: new Date().toISOString(),
      invocationCount: 0,
      totalReturn: 0,
      accountValue: 10000,
      availableCash: 10000,
      positions: [],
      lastUpdate: new Date().toISOString(),
      tradingEnabled: true
    };
  }

  saveState() {
    this.state.lastUpdate = new Date().toISOString();
    writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf8');
  }

  loadConversations() {
    try {
      if (existsSync(this.conversationsFile)) {
        const data = readFileSync(this.conversationsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (_) {}
    return { conversations: [], lastUpdate: new Date().toISOString() };
  }

  saveConversations() {
    this.conversations.lastUpdate = new Date().toISOString();
    writeFileSync(this.conversationsFile, JSON.stringify(this.conversations, null, 2), 'utf8');
  }

  async initializeExchange() {
    try {
      // 仅在用户显式设置时使用代理，避免误用本地 7890 端口
      const httpsProxy = process.env.HTTPS_PROXY || '';
      const httpProxy = process.env.HTTP_PROXY || '';
      const noProxy = process.env.NO_PROXY || process.env.no_proxy || '';
      console.log(`Proxy config -> HTTPS_PROXY=${httpsProxy || '(unset)'} HTTP_PROXY=${httpProxy || '(unset)'} NO_PROXY=${noProxy || '(unset)'}\n`);

      const envKey = this.tradingEnv;
      const isDemoFutures = envKey === 'demo-futures';
      const isDemoSpot = envKey === 'demo-spot';

      if (isDemoFutures || envKey === 'futures') {
        const apiKey = this.config.exchange?.binance?.futures_demo?.api_key || process.env.BINANCE_DEMO_API_KEY;
        const secret = this.config.exchange?.binance?.futures_demo?.api_secret || process.env.BINANCE_DEMO_API_SECRET;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_DEMO_API_KEY/SECRET或在config.json配置');
        this.exchange = new ccxt.binanceusdm({ apiKey, secret, enableRateLimit: true, options: { defaultType: 'future', warnOnFetchCurrencies: false, fetchCurrencies: false, enableDemoTrading: true } });
        if (httpsProxy) this.exchange.httpsProxy = httpsProxy.endsWith('/') ? httpsProxy : `${httpsProxy}/`;
        this.exchange.enableDemoTrading(true);
        await this.exchange.fetchBalance();
      } else if (isDemoSpot || envKey === 'spot') {
        const apiKey = this.config.exchange?.binance?.spot_testnet?.api_key || process.env.BINANCE_SPOT_TEST_API_KEY;
        const secret = this.config.exchange?.binance?.spot_testnet?.api_secret || process.env.BINANCE_SPOT_TEST_API_SECRET;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_SPOT_TEST_API_KEY/SECRET或在config.json配置');
        this.exchange = new ccxt.binance({ apiKey, secret, enableRateLimit: true });
        if (httpsProxy) this.exchange.httpsProxy = httpsProxy.endsWith('/') ? httpsProxy : `${httpsProxy}/`;
        if (typeof this.exchange.setSandboxMode === 'function') this.exchange.setSandboxMode(true);
        await this.exchange.fetchBalance();
      }
      return true;
    } catch (e) {
      console.error('❌ 初始化交易所失败:', e.message);
      console.error('详细错误:', e);
      return false;
    }
  }

  calculateEMA(prices, period) {
    if (prices.length < period) return null;
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    return ema;
  }
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26) {
    if (prices.length < slowPeriod) return null;
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    if (!fastEMA || !slowEMA) return null;
    return fastEMA - slowEMA;
  }
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change; else losses += Math.abs(change);
    }
    const avgGain = gains / period; const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  calculateATR(highs, lows, closes, period = 14) {
    if (highs.length < period + 1) return null;
    const trueRanges = [];
    for (let i = 1; i < highs.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  async getMarketData() {
    const marketData = {};
    const intradayTf = this.dataCfg.intraday_tf;
    const intradayLimit = this.dataCfg.intraday_limit;
    const ctxTf = this.dataCfg.context_tf;
    const ctxLimit = this.dataCfg.context_limit;
    for (const symbol of this.symbols) {
      try {
        if (!this.exchange) throw new Error('no_exchange');
        const ticker = await this.exchange.fetchTicker(symbol);
        const ohlcv = await this.exchange.fetchOHLCV(symbol, intradayTf, undefined, intradayLimit);
        const prices = ohlcv.map(c => (c[2] + c[3]) / 2);
        const highs = ohlcv.map(c => c[2]);
        const lows = ohlcv.map(c => c[3]);
        const closes = ohlcv.map(c => c[4]);
        const volumes = ohlcv.map(c => c[5]);
        const ema20 = this.calculateEMA(prices, 20) || Number(ticker.last) || 0;
        const macd = this.calculateMACD(prices) || 0;
        const rsi14 = this.calculateRSI(prices, 14) || 50;
        const rsi21 = this.calculateRSI(prices, 21) || 50;
        const atr = this.calculateATR(highs, lows, closes) || (Number(ticker.last) || 0) * 0.02;

        const ohlcvCtx = await this.exchange.fetchOHLCV(symbol, ctxTf, undefined, ctxLimit);
        const pricesCtx = ohlcvCtx.map(c => (c[2] + c[3]) / 2);
        const ema20_4h = this.calculateEMA(pricesCtx, 20) || Number(ticker.last) || 0;
        const ema50_4h = this.calculateEMA(pricesCtx, 50) || Number(ticker.last) || 0;
        const atr_4h = this.calculateATR(ohlcvCtx.map(c => c[2]), ohlcvCtx.map(c => c[3]), ohlcvCtx.map(c => c[4])) || (Number(ticker.last) || 0) * 0.02;

        const currentVolume = volumes[volumes.length - 1] || 0;
        const avgVolume = volumes.length ? (volumes.reduce((a, b) => a + b, 0) / volumes.length) : 0;
        const fundingRate = (Math.random() - 0.5) * 0.001;
        const openInterest = Math.random() * 1000000 + 500000;
        const avgOpenInterest = openInterest * (0.8 + Math.random() * 0.4);
        const baseKey = this.normalizeBaseSymbol(symbol);

        marketData[baseKey] = {
          symbol: baseKey,
          currentPrice: Number(ticker.last) || 0,
          ema20: Number(ema20) || 0,
          macd: Number(macd) || 0,
          rsi14: Number(rsi14) || 50,
          rsi21: Number(rsi21) || 50,
          atr: Number(atr) || 0,
          ema20_4h: Number(ema20_4h) || 0,
          ema50_4h: Number(ema50_4h) || 0,
          atr_4h: Number(atr_4h) || 0,
          currentVolume: Number(currentVolume) || 0,
          avgVolume: Number(avgVolume) || 0,
          fundingRate: Number(fundingRate) || 0,
          openInterest: Number(openInterest) || 0,
          avgOpenInterest: Number(avgOpenInterest) || 0,
          prices: prices.slice(-10).map(Number),
          ema20_series: this.generateEMASeries(prices, 20).slice(-10).map(Number),
          macd_series: this.generateMACDSeries(prices).slice(-10).map(Number),
          rsi14_series: this.generateRSISeries(prices, 14).slice(-10).map(Number),
          rsi21_series: this.generateRSISeries(prices, 21).slice(-10).map(Number),
          macd_4h_series: this.generateMACDSeries(pricesCtx).slice(-10).map(Number),
          rsi14_4h_series: this.generateRSISeries(pricesCtx, 14).slice(-10).map(Number)
        };
      } catch (e) {
        // 离线/失败回退：生成稳定的伪数据，避免渲染与 toFixed 失败
        const baseKey = this.normalizeBaseSymbol(symbol);
        const t = this._seed + Math.floor(Math.random() * 1000);
        const p0 = 100 + (t % 50);
        const series = Array.from({ length: 10 }, (_, i) => p0 + Math.sin((t + i) / 5) * 2 + (Math.random() - 0.5));
        const last = series[series.length - 1];
        marketData[baseKey] = {
          symbol: baseKey,
          currentPrice: last,
          ema20: last * 0.998,
          macd: (Math.random() - 0.5) * 2,
          rsi14: 45 + Math.random() * 10,
          rsi21: 45 + Math.random() * 10,
          atr: last * 0.02,
          ema20_4h: last * 1.001,
          ema50_4h: last * 1.0005,
          atr_4h: last * 0.018,
          currentVolume: 1_000_000 + Math.random() * 100_000,
          avgVolume: 1_050_000,
          fundingRate: (Math.random() - 0.5) * 0.0005,
          openInterest: 700_000 + Math.random() * 200_000,
          avgOpenInterest: 750_000,
          prices: series,
          ema20_series: series.map((v, i, a) => (i > 0 ? (a[i - 1] * 0.9 + v * 0.1) : v)),
          macd_series: series.map(() => (Math.random() - 0.5)),
          rsi14_series: series.map(() => 45 + Math.random() * 10),
          rsi21_series: series.map(() => 45 + Math.random() * 10),
          macd_4h_series: series.map(() => (Math.random() - 0.5)),
          rsi14_4h_series: series.map(() => 45 + Math.random() * 10)
        };
      }
    }
    return marketData;
  }

  generateEMASeries(prices, period) {
    const series = [];
    for (let i = period - 1; i < prices.length; i++) {
      const ema = this.calculateEMA(prices.slice(0, i + 1), period);
      series.push(ema);
    }
    return series;
  }
  generateMACDSeries(prices) {
    const series = [];
    for (let i = 25; i < prices.length; i++) {
      const macd = this.calculateMACD(prices.slice(0, i + 1));
      series.push(macd);
    }
    return series;
  }
  generateRSISeries(prices, period) {
    const series = [];
    for (let i = period; i < prices.length; i++) {
      const rsi = this.calculateRSI(prices.slice(0, i + 1), period);
      series.push(rsi);
    }
    return series;
  }

  buildMarketSections(marketData) {
    let out = '';
    for (const [symbol, data] of Object.entries(marketData)) {
      const d = data || {};
      // 归一化，避免 undefined 触发 toFixed
      const safe = {
        currentPrice: Number(d.currentPrice) || 0,
        ema20: Number(d.ema20) || 0,
        macd: Number(d.macd) || 0,
        rsi14: Number(d.rsi14) || 50,
        rsi21: Number(d.rsi21) || 50,
        atr: Number(d.atr) || 0,
        ema20_4h: Number(d.ema20_4h) || 0,
        ema50_4h: Number(d.ema50_4h) || 0,
        atr_4h: Number(d.atr_4h) || 0,
        currentVolume: Number(d.currentVolume) || 0,
        avgVolume: Number(d.avgVolume) || 0,
        fundingRate: Number(d.fundingRate) || 0,
        openInterest: Number(d.openInterest) || 0,
        avgOpenInterest: Number(d.avgOpenInterest) || 0,
        prices: Array.isArray(d.prices) ? d.prices.map(Number) : [],
        ema20_series: Array.isArray(d.ema20_series) ? d.ema20_series.map(Number) : [],
        macd_series: Array.isArray(d.macd_series) ? d.macd_series.map(Number) : [],
        rsi14_series: Array.isArray(d.rsi14_series) ? d.rsi14_series.map(Number) : [],
        rsi21_series: Array.isArray(d.rsi21_series) ? d.rsi21_series.map(Number) : [],
        macd_4h_series: Array.isArray(d.macd_4h_series) ? d.macd_4h_series.map(Number) : [],
        rsi14_4h_series: Array.isArray(d.rsi14_4h_series) ? d.rsi14_4h_series.map(Number) : [],
      };
      const fx = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '0.00');
      const ex = (n) => {
        const v = Number(n);
        if (!Number.isFinite(v)) return '0.00e+0';
        try { return v.toExponential(2); } catch { return '0.00e+0'; }
      };
      out += `### ALL ${symbol} DATA\n\n` +
        `current_price = ${fx(safe.currentPrice)}, current_ema20 = ${fx(safe.ema20)}, current_macd = ${fx(safe.macd)}, current_rsi (14 period) = ${fx(safe.rsi14)}\n\n` +
        `In addition, here is the latest ${symbol} open interest and funding rate for perps (the instrument you are trading):\n\n` +
        `Open Interest: Latest: ${fx(safe.openInterest)}  Average: ${fx(safe.avgOpenInterest)}\n\n` +
        `Funding Rate: ${ex(safe.fundingRate)}\n\n` +
        `**Intraday series (3‑minute intervals, oldest → latest):**\n\n` +
        `Mid prices: [${(safe.prices).map(p => fx(p)).join(', ')}]\n\n` +
        `EMA indicators (20‑period): [${(safe.ema20_series).map(p => fx(p)).join(', ')}]\n\n` +
        `MACD indicators: [${(safe.macd_series).map(p => fx(p)).join(', ')}]\n\n` +
        `RSI indicators (14‑Period): [${(safe.rsi14_series).map(p => fx(p)).join(', ')}]\n\n` +
        `RSI indicators (21‑Period): [${(safe.rsi21_series).map(p => fx(p)).join(', ')}]\n\n` +
        `**Longer‑term context (${this.dataCfg.context_tf}‑hour timeframe):**\n\n` +
        `20‑Period EMA: ${fx(safe.ema20_4h)} vs. 50‑Period EMA: ${fx(safe.ema50_4h)}\n\n` +
        `3‑Period ATR: ${fx(safe.atr)} vs. 14‑Period ATR: ${fx(safe.atr_4h)}\n\n` +
        `Current Volume: ${fx(safe.currentVolume)} vs. Average Volume: ${fx(safe.avgVolume)}\n\n` +
        `MACD indicators: [${(safe.macd_4h_series || []).map(p => fx(p)).join(', ')}]\n\n` +
        `RSI indicators (14‑Period): [${(safe.rsi14_4h_series || []).map(p => fx(p)).join(', ')}]\n\n` +
        `---\n\n`;
    }
    return out;
  }

  generateUserPrompt(marketData) {
    if (!this.userPromptTemplate) {
      const currentTime = new Date();
      const startTime = new Date(this.state.startTime);
      const minutesSinceStart = Math.floor((currentTime - startTime) / (1000 * 60));
      this.state.invocationCount++;
      this.saveState();
      let marketSections = '';
      try { marketSections = this.buildMarketSections(marketData); } catch (_) { marketSections = 'MARKET DATA UNAVAILABLE'; }
      return `It has been ${minutesSinceStart} minutes since you started trading. The current time is ${currentTime.toISOString()} and you've been invoked ${this.state.invocationCount} times.\n\n---\n\n${marketSections}\n\nAccount Value: ${this.state.accountValue}`;
    }

    const now = new Date();
    const start = new Date(this.state.startTime);
    const minutesSince = Math.floor((now - start) / (1000 * 60));
    this.state.invocationCount++;
    this.saveState();

    const context = {
      minutes_since_start: minutesSince,
      now_iso: now.toISOString(),
      invocation_count: this.state.invocationCount,
      market_sections: (() => { try { return this.buildMarketSections(marketData); } catch (_) { return 'MARKET DATA UNAVAILABLE'; } })(),
      account_value: Number(this.state.accountValue ?? 0).toFixed(2),
      available_cash: Number(this.state.availableCash ?? 0).toFixed(2),
      total_return: Number(this.state.totalReturn ?? 0).toFixed(2),
      positions_block: this.state.positions.map(p => JSON.stringify(p)).join('\n'),
      sharpe_ratio: Number(this.calculateSharpeRatio() ?? 0).toFixed(2)
    };

    return renderSimple(this.userPromptTemplate, context);
  }

  calculateSharpeRatio() {
    return this.state.totalReturn > 0 ? Math.random() * 2 - 1 : -Math.random();
  }

  buildSystemPrompt() {
    if (!this.systemPromptTemplate) {
      const allowedCsv = this.allowedSymbolsForAI.join(', ');
      const base = [
        this.isFutures ? 'You are an expert crypto trader operating Binance USDT-margined perpetual futures (U-margined).'
                       : 'You are an expert crypto trader operating Binance Spot Testnet (no leverage).',
        'Symbols whitelist:',
        allowedCsv
      ].join('\n');
      return base;
    }
    const tpl1 = renderSections(this.systemPromptTemplate, { is_futures: this.isFutures });
    const context = {
      environment: this.isFutures ? 'demo.binance.com (USDT-M Futures)' : 'binance spot testnet',
      env_note: this.isFutures ? 'USDM perpetual' : 'Spot testnet',
      trading_mode: this.isFutures ? 'perpetual futures (isolated)' : 'spot (no leverage)',
      is_futures: this.isFutures,
      allowed_symbols_csv: this.allowedSymbolsForAI.join(', ')
    };
    return renderSimple(tpl1, context);
  }

  async callDeepSeekAPI(userPrompt) {
    try {
      const apiKey = this.aiApiKey;
      const model = this.aiModel;
      const temperature = this.aiTemperature;
      const max_tokens = this.aiMaxTokens;
      const systemContent = this.buildSystemPrompt();

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: userPrompt }
          ],
          stream: false,
          temperature,
          max_tokens
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (e) {
      console.error('AI 调用失败:', e.message);
      return null;
    }
  }

  parseAIResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { action: 'hold', reasoning: response };
      const rawObj = JSON.parse(jsonMatch[0]);
      const normalizeAction = (a) => {
        if (!a) return 'hold';
        const x = String(a).toLowerCase();
        if (x === 'buy' || x === 'long' || x === 'open_long') return 'buy';
        if (x === 'sell' || x === 'short' || x === 'open_short') return 'sell';
        if (x === 'close' || x === 'close_position' || x === 'exit' || x === 'reduce' || x === 'reduce_position') return 'close_position';
        if (x === 'hold' || x === 'wait' || x === 'no_trade') return 'hold';
        return 'hold';
      };
      const normalizeSymbol = (s) => this.normalizeBaseSymbol(s);
      const d = rawObj.trading_decision ? rawObj.trading_decision : rawObj;
      return {
        action: normalizeAction(d.action),
        symbol: normalizeSymbol(d.symbol),
        quantity: d.quantity !== undefined ? Number(d.quantity) : undefined,
        reasoning: d.reasoning || rawObj.reasoning,
        leverage: d.leverage !== undefined ? Number(d.leverage) : undefined
      };
    } catch (_) {
      return { action: 'hold', reasoning: '解析失败，保持当前持仓' };
    }
  }

  async executeTradingDecision(decision, marketData) {
    try {
      if (decision.action === 'buy' && decision.symbol) {
        await this.executeBuyOrder(decision, marketData);
      } else if (decision.action === 'sell' && decision.symbol) {
        await this.executeSellOrder(decision, marketData);
      } else if (decision.action === 'close_position' && decision.symbol) {
        const base = this.normalizeBaseSymbol(decision.symbol);
        const pos = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
        if (pos) {
          const qty = decision.quantity && decision.quantity > 0 ? decision.quantity : Math.abs(Number(pos.quantity));
          // 根据持仓方向决定平仓方向：多头用sell平仓，空头用buy平仓
          const posQty = Number(pos.quantity);
          if (posQty > 0) {
            // 多头：使用sell平仓
            await this.executeSellOrder({ ...decision, symbol: base, quantity: qty }, marketData);
          } else if (posQty < 0) {
            // 空头：使用buy平仓
            await this.executeBuyOrder({ ...decision, symbol: base, quantity: qty }, marketData);
          }
        }
      }
      await this.updateAccountState();
    } catch (e) {
      console.error('交易执行失败:', e.message);
    }
    this.saveState();
  }

  async executeBuyOrder(decision) {
    try {
      const base = this.normalizeBaseSymbol(decision.symbol);
      const symbol = this.isFutures ? `${base}/USDT:USDT` : `${base}/USDT`;
      const quantity = decision.quantity || 0.001;
      const leverage = this.isFutures && decision.leverage !== undefined ? Math.floor(Number(decision.leverage)) : undefined;
      if (this.isFutures) {
        try { await this.exchange.setMarginMode('ISOLATED', symbol); } catch (_) {}
        try { if (leverage !== undefined) await this.exchange.setLeverage(leverage, symbol); } catch (_) {}
      }
      const order = await this.exchange.createOrder(
        symbol, 'market', 'buy', quantity, null,
        this.isFutures ? (leverage !== undefined ? { leverage, marginType: 'isolated' } : { marginType: 'isolated' }) : undefined
      );
      this.addPosition(base, quantity, order.average || order.price);
      this.logTrade('BUY', base, quantity, order.average || order.price, order.id);
    } catch (e) {
      console.error('买入失败:', e.message);
    }
  }

  async executeSellOrder(decision) {
    try {
      const base = this.normalizeBaseSymbol(decision.symbol);
      const symbol = this.isFutures ? `${base}/USDT:USDT` : `${base}/USDT`;
      const quantity = decision.quantity || 0.001;
      const leverage = this.isFutures && decision.leverage !== undefined ? Math.floor(Number(decision.leverage)) : undefined;
      if (this.isFutures) {
        try { await this.exchange.setMarginMode('ISOLATED', symbol); } catch (_) {}
        try { if (leverage !== undefined) await this.exchange.setLeverage(leverage, symbol); } catch (_) {}
      }
      const order = await this.exchange.createOrder(
        symbol, 'market', 'sell', quantity, null,
        this.isFutures ? (leverage !== undefined ? { leverage, marginType: 'isolated' } : { marginType: 'isolated' }) : undefined
      );
      this.removePosition(base, quantity);
      this.logTrade('SELL', base, quantity, order.average || order.price, order.id);
    } catch (e) {
      console.error('卖出失败:', e.message);
    }
  }

  addPosition(symbol, quantity, entryPrice) {
    const base = this.normalizeBaseSymbol(symbol);
    const existing = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
    if (existing) {
      const totalQ = parseFloat(existing.quantity) + parseFloat(quantity);
      const avgPrice = (parseFloat(existing.entry_price) * parseFloat(existing.quantity) + parseFloat(entryPrice) * parseFloat(quantity)) / totalQ;
      existing.quantity = totalQ; existing.entry_price = avgPrice;
    } else {
      this.state.positions.push({
        symbol: base,
        quantity,
        entry_price: entryPrice,
        current_price: entryPrice,
        liquidation_price: entryPrice * 0.9,
        unrealized_pnl: 0,
        leverage: 1,
        exit_plan: { profit_target: entryPrice * 1.1, stop_loss: entryPrice * 0.95, invalidation_condition: 'price_below_stop_loss' },
        confidence: 0.8,
        risk_usd: quantity * entryPrice,
        sl_oid: null, tp_oid: null, wait_for_fill: false, entry_oid: null,
        notional_usd: quantity * entryPrice
      });
    }
  }

  removePosition(symbol, quantity) {
    const base = this.normalizeBaseSymbol(symbol);
    const existing = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
    if (existing) {
      const remain = parseFloat(existing.quantity) - parseFloat(quantity);
      if (remain <= 0) {
        this.state.positions = this.state.positions.filter(p => this.normalizeBaseSymbol(p.symbol) !== base);
      } else {
        existing.quantity = remain;
      }
    }
  }

  async updateAccountState() {
    try {
      const balance = await this.exchange.fetchBalance();
      this.state.accountValue = balance.USDT?.total || 10000;
      this.state.availableCash = balance.USDT?.free || 10000;
      this.state.totalReturn = ((this.state.accountValue - 10000) / 10000) * 100;
      if (this.isFutures) {
        const positions = await this.exchange.fetchPositions();
        const active = positions.filter(p => parseFloat(p.contracts) !== 0);
        this.state.positions = [];
        for (const position of active) {
          if (parseFloat(position.contracts) !== 0) {
            const symbol = this.normalizeBaseSymbol(position.symbol);
            const contracts = parseFloat(position.contracts);
            // 根据side字段确定quantity的符号：long=正数，short=负数
            const quantity = (position.side === 'long' || position.side === 'buy') ? Math.abs(contracts) : -Math.abs(contracts);
            // 计算杠杆：名义价值 / 保证金
            const notional = Math.abs(parseFloat(position.notional) || 0);
            const initialMargin = parseFloat(position.initialMargin) || 0;
            const leverage = notional > 0 && initialMargin > 0 ? Math.round((notional / initialMargin) * 10) / 10 : 1;
            this.state.positions.push({
              symbol,
              quantity, // 正数=多仓，负数=空仓
              entry_price: parseFloat(position.entryPrice),
              current_price: parseFloat(position.markPrice),
              liquidation_price: parseFloat(position.liquidationPrice) || 0,
              unrealized_pnl: parseFloat(position.unrealizedPnl),
              leverage, // 根据名义价值和保证金计算
              exit_plan: {
                profit_target: parseFloat(position.entryPrice) * 1.1,
                stop_loss: parseFloat(position.entryPrice) * 0.95,
                invalidation_condition: 'price_below_stop_loss'
              },
              confidence: 0.8,
              risk_usd: Math.abs(quantity) * parseFloat(position.entryPrice),
              sl_oid: null, tp_oid: null, wait_for_fill: false, entry_oid: null,
              notional_usd: notional
            });
          }
        }
      }
    } catch (e) {
      console.error('更新账户失败:', e.message);
    }
  }

  logTrade(side, symbol, quantity, price, orderId) {
    const trade = {
      timestamp: new Date().toISOString(),
      side, symbol, quantity, price, orderId,
      environment: this.isFutures ? 'demo.binance.com' : 'spot.testnet',
      accountValue: this.state.accountValue,
      totalReturn: this.state.totalReturn
    };
    if (!this.state.trades) this.state.trades = [];
    this.state.trades.unshift(trade);
    this.saveState();
    // Mirror to backend/data/trades.json for web API consumption
    try {
      let obj = { trades: [] };
      if (existsSync(this.tradesFile)) {
        try { obj = JSON.parse(readFileSync(this.tradesFile, 'utf8')); } catch (_) {}
      }
      if (!Array.isArray(obj.trades)) obj.trades = [];
      obj.trades.unshift({
        model_id: 'default',
        exit_time: Math.floor(Date.now() / 1000),
        realized_net_pnl: side === 'BUY' ? 0 : 0,
        side, symbol, quantity, price, orderId
      });
      writeFileSync(this.tradesFile, JSON.stringify(obj, null, 2), 'utf8');
    } catch (_) {}
  }

  saveConversation(userPrompt, aiResponse, decision) {
    // 解析AI响应中的JSON
    let aiParsed = null;
    try {
      if (typeof aiResponse === 'string') {
        const match = aiResponse.match(/\{[\s\S]*\}/);
        if (match) aiParsed = JSON.parse(match[0]);
      }
    } catch (_) {}

    // 从 aiParsed 中提取"原始决策对象"和"候选数组"，用于完整留存
    let decisionRaw = null;
    let decisionsArray = null;
    try {
      if (aiParsed && typeof aiParsed === 'object') {
        if (aiParsed.trading_decision) {
          decisionRaw = aiParsed.trading_decision;
        }
        if (Array.isArray(aiParsed.trading_decisions)) {
          decisionsArray = aiParsed.trading_decisions;
          // 若尚未从 trading_decision 取到主决策，则优先取与现有持仓相关的项
          if (!decisionRaw) {
            const currentSymbols = this.state.positions.map(p => p.symbol);
            const pick = decisionsArray.find(x => currentSymbols.includes(String(x.symbol || '').toUpperCase().replace(/:USDT$/,'').split('/')[0]))
              || decisionsArray[0];
            decisionRaw = pick || null;
          }
        }
      }
    } catch (_) {}

    const conversation = {
      timestamp: new Date().toISOString(),
      invocationCount: this.state.invocationCount,
      userPrompt,
      aiResponse,
      aiParsed,
      // decision: 原始/丰富结构（保持完整字段用于分析）
      decision: decisionRaw || aiParsed?.trading_decision || null,
      // decision_normalized: 供程序执行的归一化决策
      decision_normalized: decision,
      // trading_decisions: 若模型输出了候选数组，也一并保存
      trading_decisions: decisionsArray || null,
      // chain_of_thought: 从aiParsed中提取
      chain_of_thought: aiParsed?.chain_of_thought || null,
      accountValue: this.state.accountValue,
      totalReturn: this.state.totalReturn
    };
    if (!this.conversations.conversations) this.conversations.conversations = [];
    this.conversations.conversations.unshift(conversation);
    this.saveConversations();
  }

  async runTradingCycle() {
    try {
      // 在每次交易循环开始时检查是否需要重新加载模板
      this.checkAndReloadTemplates();
      
      const marketData = await this.getMarketData();
      const userPrompt = this.generateUserPrompt(marketData);
      const aiResponse = await this.callDeepSeekAPI(userPrompt);
      if (!aiResponse) {
        const decision = { action: 'hold', reasoning: 'no_ai_response' };
        await this.executeTradingDecision(decision, marketData);
        this.saveConversation(userPrompt, aiResponse, decision);
        return;
      }
      const decision = this.parseAIResponse(aiResponse);
      await this.executeTradingDecision(decision, marketData);
      this.saveConversation(userPrompt, aiResponse, decision);
    } catch (e) {
      console.error('交易循环失败:', e.message);
      // 兜底：写入最小对话，保证前端可读
      try {
        const note = `CYCLE ERROR: ${String(e?.message || e)}\n`;
        const userPrompt = 'MARKET DATA UNAVAILABLE';
        const aiResponse = null;
        const decision = { action: 'hold', reasoning: 'error' };
        this.saveConversation(userPrompt, aiResponse, decision);
      } catch (_) {}
    }
  }

  async run() {
    try {
      if (!this.aiApiKey) {
        console.error('缺少 AI API Key');
        return;
      }
      const ok = await this.initializeExchange();
      if (!ok) {
        // 离线模式也进行一次循环，以便前端与对话有数据可用
        console.warn('进入离线模式：使用本地伪数据生成提示与对话');
      } else {
        // 初始化成功后立即更新账户状态（获取交易所的实际余额）
        await this.updateAccountState();
        this.saveState(); // 保存初始状态
      }
      await this.runTradingCycle();
      console.log(`AI交易系统v2运行完成 (env=${this.tradingEnv}, ai=${this.aiProvider}:${this.aiModel})`);
    } catch (e) {
      console.error('系统运行失败:', e.message);
      process.exit(1);
    }
  }
}

async function main() {
  const sys = new AITradingSystemV2();
  await sys.run();
}

main().catch(console.error);



```

添加 `unlinkSync` 导入：


```javascript
import ccxt from 'ccxt';
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { resolve } from 'path';

// 轻量级 .env 加载（避免额外依赖），需在使用 config/env 之前执行
function loadDotEnv(envPath) {
  try {
    if (!existsSync(envPath)) return;
    const raw = readFileSync(envPath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = val;
      }
    });
  } catch (_) {}
}

// 提前加载 backend/.env，确保 config 与 env 解析可用
loadDotEnv(resolve(process.cwd(), 'backend/.env'));

function expandEnvMaybe(value) {
  if (typeof value !== 'string') return value;
  const m = value.match(/^\$\{(.+)\}$/);
  if (m) return process.env[m[1]] || '';
  return value;
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && idx < process.argv.length - 1) return process.argv[idx + 1];
  const envKey = name.replace(/^--/, '').toUpperCase();
  return process.env[envKey];
}

function loadConfig() {
  const configPath = resolve(process.cwd(), 'backend/ai/ai-trading/config.json');
  const raw = readFileSync(configPath, 'utf8');
  const cfg = JSON.parse(raw);
  if (cfg.ai && cfg.ai.api_key) cfg.ai.api_key = expandEnvMaybe(cfg.ai.api_key);
  const f = cfg.exchange?.binance?.futures_demo;
  const s = cfg.exchange?.binance?.spot_testnet;
  if (f) {
    f.api_key = expandEnvMaybe(f.api_key);
    f.api_secret = expandEnvMaybe(f.api_secret);
  }
  if (s) {
    s.api_key = expandEnvMaybe(s.api_key);
    s.api_secret = expandEnvMaybe(s.api_secret);
  }
  return cfg;
}

function renderSections(template, flags) {
  let out = template;
  out = out.replace(/\{\{#is_futures\}\}([\s\S]*?)\{\{\/is_futures\}\}/g, (_, inner) => (flags.is_futures ? inner : ''));
  out = out.replace(/\{\{\^is_futures\}\}([\s\S]*?)\{\{\/is_futures\}\}/g, (_, inner) => (!flags.is_futures ? inner : ''));
  return out;
}

function renderSimple(template, context) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g, (_, key) => {
    const val = key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : ''), context);
    return String(val ?? '');
  });
}

class AITradingSystemV2 {
  constructor() {
    this.config = loadConfig();

    const argEnv = getArg('--env');
    const argAi = getArg('--ai');

    this.tradingEnv = (argEnv && typeof argEnv === 'string') ? argEnv : (this.config.trading_env || 'demo-futures');
    this.isFutures = this.tradingEnv === 'demo-futures' || this.tradingEnv === 'futures';

    const aiPreset = (argAi && this.config.ai?.presets?.[argAi]) ? this.config.ai.presets[argAi] : null;
    this.aiProvider = (aiPreset?.provider || this.config.ai?.provider || 'deepseek');
    this.aiModel = (aiPreset?.model || this.config.ai?.model || 'deepseek-chat');
    this.aiApiKey = expandEnvMaybe(aiPreset?.api_key || this.config.ai?.api_key || process.env.DEEPSEEK_API_KEY_30 || '');
    this.aiTemperature = (aiPreset?.temperature ?? this.config.ai?.temperature ?? 0.7);
    this.aiMaxTokens = (aiPreset?.max_tokens ?? this.config.ai?.max_tokens ?? 2000);

    this.exchange = null;
    this.dataDir = resolve(process.cwd(), 'backend', 'data');
    try { mkdirSync(this.dataDir, { recursive: true }); } catch (_) {}
    this.stateFile = resolve(this.dataDir, 'trading-state.json');
    this.conversationsFile = resolve(this.dataDir, 'conversations.json');
    this.tradesFile = resolve(this.dataDir, 'trades.json');

    this.state = this.loadState();
    this.sanitizeState();
    this.conversations = this.loadConversations();

    // 确保种子文件存在（前端可立即读取）
    try {
      if (!existsSync(this.tradesFile)) {
        writeFileSync(this.tradesFile, JSON.stringify({ trades: [] }, null, 2), 'utf8');
      }
      if (!existsSync(this.conversationsFile)) {
        writeFileSync(this.conversationsFile, JSON.stringify(this.conversations, null, 2), 'utf8');
      }
      if (!existsSync(this.stateFile)) {
        this.saveState();
      }
    } catch (_) {}

    const defaultAllowed = this.isFutures
      ? ['BTC/USDT:USDT','ETH/USDT:USDT','SOL/USDT:USDT','BNB/USDT:USDT','XRP/USDT:USDT','DOGE/USDT:USDT']
      : ['BTC/USDT','ETH/USDT','SOL/USDT','BNB/USDT','XRP/USDT','DOGE/USDT'];

    const presetAllowed = this.config.presets?.[this.tradingEnv]?.allowed_symbols;

    this.allowedSymbolsForAI = Array.isArray(this.config.allowed_symbols) && this.config.allowed_symbols.length > 0
      ? this.config.allowed_symbols
      : (Array.isArray(presetAllowed) && presetAllowed.length > 0 ? presetAllowed : defaultAllowed);

    this.symbols = (Array.isArray(this.config.symbols_monitor) && this.config.symbols_monitor.length > 0)
      ? this.config.symbols_monitor
      : [...this.allowedSymbolsForAI];

    // 优先从 presets 读取环境特定的模板路径，否则使用全局配置
    const presetPromptFiles = this.config.presets?.[this.tradingEnv]?.prompt_files;
    const promptFiles = presetPromptFiles || this.config.prompt_files || {};
    
    this.systemPromptTemplatePath = resolve(process.cwd(), promptFiles.system_prompt_path || '');
    this.userPromptTemplatePath = resolve(process.cwd(), promptFiles.user_prompt_path || '');
    
    // 初始化时加载模板
    this.reloadTemplates();
    
    // 记录模板文件最后修改时间
    this.templateLastLoadTime = Date.now();

    this.dataCfg = {
      intraday_tf: this.config.data?.intraday_tf || '1m',
      intraday_limit: this.config.data?.intraday_limit || 50,
      context_tf: this.config.data?.context_tf || '4h',
      context_limit: this.config.data?.context_limit || 10
    };

    // 简单的随机基准，用于离线/失败回退生成数值
    this._seed = Math.floor(Date.now() / 60000);
  }

  // 重新加载模板文件
  reloadTemplates() {
    try {
      this.systemPromptTemplate = existsSync(this.systemPromptTemplatePath)
        ? readFileSync(this.systemPromptTemplatePath, 'utf8')
        : '';
      this.userPromptTemplate = existsSync(this.userPromptTemplatePath)
        ? readFileSync(this.userPromptTemplatePath, 'utf8')
        : '';
      this.templateLastLoadTime = Date.now();
      console.log(`✅ Prompt模板已重新加载 (${this.tradingEnv})`);
    } catch (e) {
      console.error('重新加载模板失败:', e.message);
    }
  }

  // 检查是否需要重新加载模板（通过标记文件）
  checkAndReloadTemplates() {
    try {
      const dataDir = resolve(process.cwd(), 'backend', 'data');
      const markerFile = resolve(dataDir, `.reload-prompts-${this.tradingEnv}.marker`);
      
      if (existsSync(markerFile)) {
        // 标记文件存在，重新加载模板
        this.reloadTemplates();
        // 删除标记文件
        try {
          unlinkSync(markerFile);
          console.log(`🗑️ 已删除重载标记文件: ${markerFile}`);
        } catch (e) {
          console.warn('删除标记文件失败:', e.message);
        }
      }
    } catch (e) {
      // 静默失败，不影响主流程
    }
  }

  sanitizeState() {
    const s = this.state || {};
    // 核心数值字段保证为数字
    s.accountValue = Number.isFinite(Number(s.accountValue)) ? Number(s.accountValue) : 10000;
    s.availableCash = Number.isFinite(Number(s.availableCash)) ? Number(s.availableCash) : 10000;
    s.totalReturn = Number.isFinite(Number(s.totalReturn)) ? Number(s.totalReturn) : 0;
    s.invocationCount = Number.isFinite(Number(s.invocationCount)) ? Number(s.invocationCount) : 0;
    // 结构字段
    if (!Array.isArray(s.positions)) s.positions = [];
    if (!s.startTime) s.startTime = new Date().toISOString();
    if (!s.lastUpdate) s.lastUpdate = new Date().toISOString();
    if (typeof s.tradingEnabled !== 'boolean') s.tradingEnabled = true;
    // 规范化持仓内的数值
    s.positions = s.positions.map((p = {}) => ({
      symbol: p.symbol || 'BTC',
      quantity: Number.isFinite(Number(p.quantity)) ? Number(p.quantity) : 0,
      entry_price: Number.isFinite(Number(p.entry_price)) ? Number(p.entry_price) : 0,
      current_price: Number.isFinite(Number(p.current_price)) ? Number(p.current_price) : 0,
      liquidation_price: Number.isFinite(Number(p.liquidation_price)) ? Number(p.liquidation_price) : 0,
      unrealized_pnl: Number.isFinite(Number(p.unrealized_pnl)) ? Number(p.unrealized_pnl) : 0,
      leverage: Number.isFinite(Number(p.leverage)) ? Number(p.leverage) : 1,
      exit_plan: p.exit_plan || { profit_target: 0, stop_loss: 0, invalidation_condition: 'none' },
      confidence: Number.isFinite(Number(p.confidence)) ? Number(p.confidence) : 0.8,
      risk_usd: Number.isFinite(Number(p.risk_usd)) ? Number(p.risk_usd) : 0,
      sl_oid: p.sl_oid ?? null,
      tp_oid: p.tp_oid ?? null,
      wait_for_fill: Boolean(p.wait_for_fill),
      entry_oid: p.entry_oid ?? null,
      notional_usd: Number.isFinite(Number(p.notional_usd)) ? Number(p.notional_usd) : 0,
    }));
    this.state = s;
  }

  normalizeBaseSymbol(raw) {
    if (!raw) return undefined;
    let sym = String(raw).trim().toUpperCase();
    sym = sym.replace(/\s+/g, '');
    sym = sym.replace(/:USDT$/, '');
    if (sym.includes('/')) return sym.split('/')[0];
    if (sym.endsWith('USDT')) return sym.slice(0, -4);
    return sym;
  }

  loadState() {
    try {
      if (existsSync(this.stateFile)) {
        const data = readFileSync(this.stateFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (_) {}
    return {
      startTime: new Date().toISOString(),
      invocationCount: 0,
      totalReturn: 0,
      accountValue: 10000,
      availableCash: 10000,
      positions: [],
      lastUpdate: new Date().toISOString(),
      tradingEnabled: true
    };
  }

  saveState() {
    this.state.lastUpdate = new Date().toISOString();
    writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf8');
  }

  loadConversations() {
    try {
      if (existsSync(this.conversationsFile)) {
        const data = readFileSync(this.conversationsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (_) {}
    return { conversations: [], lastUpdate: new Date().toISOString() };
  }

  saveConversations() {
    this.conversations.lastUpdate = new Date().toISOString();
    writeFileSync(this.conversationsFile, JSON.stringify(this.conversations, null, 2), 'utf8');
  }

  async initializeExchange() {
    try {
      // 仅在用户显式设置时使用代理，避免误用本地 7890 端口
      const httpsProxy = process.env.HTTPS_PROXY || '';
      const httpProxy = process.env.HTTP_PROXY || '';
      const noProxy = process.env.NO_PROXY || process.env.no_proxy || '';
      console.log(`Proxy config -> HTTPS_PROXY=${httpsProxy || '(unset)'} HTTP_PROXY=${httpProxy || '(unset)'} NO_PROXY=${noProxy || '(unset)'}\n`);

      const envKey = this.tradingEnv;
      const isDemoFutures = envKey === 'demo-futures';
      const isDemoSpot = envKey === 'demo-spot';

      if (isDemoFutures || envKey === 'futures') {
        const apiKey = this.config.exchange?.binance?.futures_demo?.api_key || process.env.BINANCE_DEMO_API_KEY;
        const secret = this.config.exchange?.binance?.futures_demo?.api_secret || process.env.BINANCE_DEMO_API_SECRET;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_DEMO_API_KEY/SECRET或在config.json配置');
        this.exchange = new ccxt.binanceusdm({ apiKey, secret, enableRateLimit: true, options: { defaultType: 'future', warnOnFetchCurrencies: false, fetchCurrencies: false, enableDemoTrading: true } });
        if (httpsProxy) this.exchange.httpsProxy = httpsProxy.endsWith('/') ? httpsProxy : `${httpsProxy}/`;
        this.exchange.enableDemoTrading(true);
        await this.exchange.fetchBalance();
      } else if (isDemoSpot || envKey === 'spot') {
        const apiKey = this.config.exchange?.binance?.spot_testnet?.api_key || process.env.BINANCE_SPOT_TEST_API_KEY;
        const secret = this.config.exchange?.binance?.spot_testnet?.api_secret || process.env.BINANCE_SPOT_TEST_API_SECRET;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_SPOT_TEST_API_KEY/SECRET或在config.json配置');
        this.exchange = new ccxt.binance({ apiKey, secret, enableRateLimit: true });
        if (httpsProxy) this.exchange.httpsProxy = httpsProxy.endsWith('/') ? httpsProxy : `${httpsProxy}/`;
        if (typeof this.exchange.setSandboxMode === 'function') this.exchange.setSandboxMode(true);
        await this.exchange.fetchBalance();
      }
      return true;
    } catch (e) {
      console.error('❌ 初始化交易所失败:', e.message);
      console.error('详细错误:', e);
      return false;
    }
  }

  calculateEMA(prices, period) {
    if (prices.length < period) return null;
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    return ema;
  }
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26) {
    if (prices.length < slowPeriod) return null;
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    if (!fastEMA || !slowEMA) return null;
    return fastEMA - slowEMA;
  }
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change; else losses += Math.abs(change);
    }
    const avgGain = gains / period; const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  calculateATR(highs, lows, closes, period = 14) {
    if (highs.length < period + 1) return null;
    const trueRanges = [];
    for (let i = 1; i < highs.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  async getMarketData() {
    const marketData = {};
    const intradayTf = this.dataCfg.intraday_tf;
    const intradayLimit = this.dataCfg.intraday_limit;
    const ctxTf = this.dataCfg.context_tf;
    const ctxLimit = this.dataCfg.context_limit;
    for (const symbol of this.symbols) {
      try {
        if (!this.exchange) throw new Error('no_exchange');
        const ticker = await this.exchange.fetchTicker(symbol);
        const ohlcv = await this.exchange.fetchOHLCV(symbol, intradayTf, undefined, intradayLimit);
        const prices = ohlcv.map(c => (c[2] + c[3]) / 2);
        const highs = ohlcv.map(c => c[2]);
        const lows = ohlcv.map(c => c[3]);
        const closes = ohlcv.map(c => c[4]);
        const volumes = ohlcv.map(c => c[5]);
        const ema20 = this.calculateEMA(prices, 20) || Number(ticker.last) || 0;
        const macd = this.calculateMACD(prices) || 0;
        const rsi14 = this.calculateRSI(prices, 14) || 50;
        const rsi21 = this.calculateRSI(prices, 21) || 50;
        const atr = this.calculateATR(highs, lows, closes) || (Number(ticker.last) || 0) * 0.02;

        const ohlcvCtx = await this.exchange.fetchOHLCV(symbol, ctxTf, undefined, ctxLimit);
        const pricesCtx = ohlcvCtx.map(c => (c[2] + c[3]) / 2);
        const ema20_4h = this.calculateEMA(pricesCtx, 20) || Number(ticker.last) || 0;
        const ema50_4h = this.calculateEMA(pricesCtx, 50) || Number(ticker.last) || 0;
        const atr_4h = this.calculateATR(ohlcvCtx.map(c => c[2]), ohlcvCtx.map(c => c[3]), ohlcvCtx.map(c => c[4])) || (Number(ticker.last) || 0) * 0.02;

        const currentVolume = volumes[volumes.length - 1] || 0;
        const avgVolume = volumes.length ? (volumes.reduce((a, b) => a + b, 0) / volumes.length) : 0;
        const fundingRate = (Math.random() - 0.5) * 0.001;
        const openInterest = Math.random() * 1000000 + 500000;
        const avgOpenInterest = openInterest * (0.8 + Math.random() * 0.4);
        const baseKey = this.normalizeBaseSymbol(symbol);

        marketData[baseKey] = {
          symbol: baseKey,
          currentPrice: Number(ticker.last) || 0,
          ema20: Number(ema20) || 0,
          macd: Number(macd) || 0,
          rsi14: Number(rsi14) || 50,
          rsi21: Number(rsi21) || 50,
          atr: Number(atr) || 0,
          ema20_4h: Number(ema20_4h) || 0,
          ema50_4h: Number(ema50_4h) || 0,
          atr_4h: Number(atr_4h) || 0,
          currentVolume: Number(currentVolume) || 0,
          avgVolume: Number(avgVolume) || 0,
          fundingRate: Number(fundingRate) || 0,
          openInterest: Number(openInterest) || 0,
          avgOpenInterest: Number(avgOpenInterest) || 0,
          prices: prices.slice(-10).map(Number),
          ema20_series: this.generateEMASeries(prices, 20).slice(-10).map(Number),
          macd_series: this.generateMACDSeries(prices).slice(-10).map(Number),
          rsi14_series: this.generateRSISeries(prices, 14).slice(-10).map(Number),
          rsi21_series: this.generateRSISeries(prices, 21).slice(-10).map(Number),
          macd_4h_series: this.generateMACDSeries(pricesCtx).slice(-10).map(Number),
          rsi14_4h_series: this.generateRSISeries(pricesCtx, 14).slice(-10).map(Number)
        };
      } catch (e) {
        // 离线/失败回退：生成稳定的伪数据，避免渲染与 toFixed 失败
        const baseKey = this.normalizeBaseSymbol(symbol);
        const t = this._seed + Math.floor(Math.random() * 1000);
        const p0 = 100 + (t % 50);
        const series = Array.from({ length: 10 }, (_, i) => p0 + Math.sin((t + i) / 5) * 2 + (Math.random() - 0.5));
        const last = series[series.length - 1];
        marketData[baseKey] = {
          symbol: baseKey,
          currentPrice: last,
          ema20: last * 0.998,
          macd: (Math.random() - 0.5) * 2,
          rsi14: 45 + Math.random() * 10,
          rsi21: 45 + Math.random() * 10,
          atr: last * 0.02,
          ema20_4h: last * 1.001,
          ema50_4h: last * 1.0005,
          atr_4h: last * 0.018,
          currentVolume: 1_000_000 + Math.random() * 100_000,
          avgVolume: 1_050_000,
          fundingRate: (Math.random() - 0.5) * 0.0005,
          openInterest: 700_000 + Math.random() * 200_000,
          avgOpenInterest: 750_000,
          prices: series,
          ema20_series: series.map((v, i, a) => (i > 0 ? (a[i - 1] * 0.9 + v * 0.1) : v)),
          macd_series: series.map(() => (Math.random() - 0.5)),
          rsi14_series: series.map(() => 45 + Math.random() * 10),
          rsi21_series: series.map(() => 45 + Math.random() * 10),
          macd_4h_series: series.map(() => (Math.random() - 0.5)),
          rsi14_4h_series: series.map(() => 45 + Math.random() * 10)
        };
      }
    }
    return marketData;
  }

  generateEMASeries(prices, period) {
    const series = [];
    for (let i = period - 1; i < prices.length; i++) {
      const ema = this.calculateEMA(prices.slice(0, i + 1), period);
      series.push(ema);
    }
    return series;
  }
  generateMACDSeries(prices) {
    const series = [];
    for (let i = 25; i < prices.length; i++) {
      const macd = this.calculateMACD(prices.slice(0, i + 1));
      series.push(macd);
    }
    return series;
  }
  generateRSISeries(prices, period) {
    const series = [];
    for (let i = period; i < prices.length; i++) {
      const rsi = this.calculateRSI(prices.slice(0, i + 1), period);
      series.push(rsi);
    }
    return series;
  }

  buildMarketSections(marketData) {
    let out = '';
    for (const [symbol, data] of Object.entries(marketData)) {
      const d = data || {};
      // 归一化，避免 undefined 触发 toFixed
      const safe = {
        currentPrice: Number(d.currentPrice) || 0,
        ema20: Number(d.ema20) || 0,
        macd: Number(d.macd) || 0,
        rsi14: Number(d.rsi14) || 50,
        rsi21: Number(d.rsi21) || 50,
        atr: Number(d.atr) || 0,
        ema20_4h: Number(d.ema20_4h) || 0,
        ema50_4h: Number(d.ema50_4h) || 0,
        atr_4h: Number(d.atr_4h) || 0,
        currentVolume: Number(d.currentVolume) || 0,
        avgVolume: Number(d.avgVolume) || 0,
        fundingRate: Number(d.fundingRate) || 0,
        openInterest: Number(d.openInterest) || 0,
        avgOpenInterest: Number(d.avgOpenInterest) || 0,
        prices: Array.isArray(d.prices) ? d.prices.map(Number) : [],
        ema20_series: Array.isArray(d.ema20_series) ? d.ema20_series.map(Number) : [],
        macd_series: Array.isArray(d.macd_series) ? d.macd_series.map(Number) : [],
        rsi14_series: Array.isArray(d.rsi14_series) ? d.rsi14_series.map(Number) : [],
        rsi21_series: Array.isArray(d.rsi21_series) ? d.rsi21_series.map(Number) : [],
        macd_4h_series: Array.isArray(d.macd_4h_series) ? d.macd_4h_series.map(Number) : [],
        rsi14_4h_series: Array.isArray(d.rsi14_4h_series) ? d.rsi14_4h_series.map(Number) : [],
      };
      const fx = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '0.00');
      const ex = (n) => {
        const v = Number(n);
        if (!Number.isFinite(v)) return '0.00e+0';
        try { return v.toExponential(2); } catch { return '0.00e+0'; }
      };
      out += `### ALL ${symbol} DATA\n\n` +
        `current_price = ${fx(safe.currentPrice)}, current_ema20 = ${fx(safe.ema20)}, current_macd = ${fx(safe.macd)}, current_rsi (14 period) = ${fx(safe.rsi14)}\n\n` +
        `In addition, here is the latest ${symbol} open interest and funding rate for perps (the instrument you are trading):\n\n` +
        `Open Interest: Latest: ${fx(safe.openInterest)}  Average: ${fx(safe.avgOpenInterest)}\n\n` +
        `Funding Rate: ${ex(safe.fundingRate)}\n\n` +
        `**Intraday series (3‑minute intervals, oldest → latest):**\n\n` +
        `Mid prices: [${(safe.prices).map(p => fx(p)).join(', ')}]\n\n` +
        `EMA indicators (20‑period): [${(safe.ema20_series).map(p => fx(p)).join(', ')}]\n\n` +
        `MACD indicators: [${(safe.macd_series).map(p => fx(p)).join(', ')}]\n\n` +
        `RSI indicators (14‑Period): [${(safe.rsi14_series).map(p => fx(p)).join(', ')}]\n\n` +
        `RSI indicators (21‑Period): [${(safe.rsi21_series).map(p => fx(p)).join(', ')}]\n\n` +
        `**Longer‑term context (${this.dataCfg.context_tf}‑hour timeframe):**\n\n` +
        `20‑Period EMA: ${fx(safe.ema20_4h)} vs. 50‑Period EMA: ${fx(safe.ema50_4h)}\n\n` +
        `3‑Period ATR: ${fx(safe.atr)} vs. 14‑Period ATR: ${fx(safe.atr_4h)}\n\n` +
        `Current Volume: ${fx(safe.currentVolume)} vs. Average Volume: ${fx(safe.avgVolume)}\n\n` +
        `MACD indicators: [${(safe.macd_4h_series || []).map(p => fx(p)).join(', ')}]\n\n` +
        `RSI indicators (14‑Period): [${(safe.rsi14_4h_series || []).map(p => fx(p)).join(', ')}]\n\n` +
        `---\n\n`;
    }
    return out;
  }

  generateUserPrompt(marketData) {
    if (!this.userPromptTemplate) {
      const currentTime = new Date();
      const startTime = new Date(this.state.startTime);
      const minutesSinceStart = Math.floor((currentTime - startTime) / (1000 * 60));
      this.state.invocationCount++;
      this.saveState();
      let marketSections = '';
      try { marketSections = this.buildMarketSections(marketData); } catch (_) { marketSections = 'MARKET DATA UNAVAILABLE'; }
      return `It has been ${minutesSinceStart} minutes since you started trading. The current time is ${currentTime.toISOString()} and you've been invoked ${this.state.invocationCount} times.\n\n---\n\n${marketSections}\n\nAccount Value: ${this.state.accountValue}`;
    }

    const now = new Date();
    const start = new Date(this.state.startTime);
    const minutesSince = Math.floor((now - start) / (1000 * 60));
    this.state.invocationCount++;
    this.saveState();

    const context = {
      minutes_since_start: minutesSince,
      now_iso: now.toISOString(),
      invocation_count: this.state.invocationCount,
      market_sections: (() => { try { return this.buildMarketSections(marketData); } catch (_) { return 'MARKET DATA UNAVAILABLE'; } })(),
      account_value: Number(this.state.accountValue ?? 0).toFixed(2),
      available_cash: Number(this.state.availableCash ?? 0).toFixed(2),
      total_return: Number(this.state.totalReturn ?? 0).toFixed(2),
      positions_block: this.state.positions.map(p => JSON.stringify(p)).join('\n'),
      sharpe_ratio: Number(this.calculateSharpeRatio() ?? 0).toFixed(2)
    };

    return renderSimple(this.userPromptTemplate, context);
  }

  calculateSharpeRatio() {
    return this.state.totalReturn > 0 ? Math.random() * 2 - 1 : -Math.random();
  }

  buildSystemPrompt() {
    if (!this.systemPromptTemplate) {
      const allowedCsv = this.allowedSymbolsForAI.join(', ');
      const base = [
        this.isFutures ? 'You are an expert crypto trader operating Binance USDT-margined perpetual futures (U-margined).'
                       : 'You are an expert crypto trader operating Binance Spot Testnet (no leverage).',
        'Symbols whitelist:',
        allowedCsv
      ].join('\n');
      return base;
    }
    const tpl1 = renderSections(this.systemPromptTemplate, { is_futures: this.isFutures });
    const context = {
      environment: this.isFutures ? 'demo.binance.com (USDT-M Futures)' : 'binance spot testnet',
      env_note: this.isFutures ? 'USDM perpetual' : 'Spot testnet',
      trading_mode: this.isFutures ? 'perpetual futures (isolated)' : 'spot (no leverage)',
      is_futures: this.isFutures,
      allowed_symbols_csv: this.allowedSymbolsForAI.join(', ')
    };
    return renderSimple(tpl1, context);
  }

  async callDeepSeekAPI(userPrompt) {
    try {
      const apiKey = this.aiApiKey;
      const model = this.aiModel;
      const temperature = this.aiTemperature;
      const max_tokens = this.aiMaxTokens;
      const systemContent = this.buildSystemPrompt();

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: userPrompt }
          ],
          stream: false,
          temperature,
          max_tokens
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (e) {
      console.error('AI 调用失败:', e.message);
      return null;
    }
  }

  parseAIResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { action: 'hold', reasoning: response };
      const rawObj = JSON.parse(jsonMatch[0]);
      const normalizeAction = (a) => {
        if (!a) return 'hold';
        const x = String(a).toLowerCase();
        if (x === 'buy' || x === 'long' || x === 'open_long') return 'buy';
        if (x === 'sell' || x === 'short' || x === 'open_short') return 'sell';
        if (x === 'close' || x === 'close_position' || x === 'exit' || x === 'reduce' || x === 'reduce_position') return 'close_position';
        if (x === 'hold' || x === 'wait' || x === 'no_trade') return 'hold';
        return 'hold';
      };
      const normalizeSymbol = (s) => this.normalizeBaseSymbol(s);
      const d = rawObj.trading_decision ? rawObj.trading_decision : rawObj;
      return {
        action: normalizeAction(d.action),
        symbol: normalizeSymbol(d.symbol),
        quantity: d.quantity !== undefined ? Number(d.quantity) : undefined,
        reasoning: d.reasoning || rawObj.reasoning,
        leverage: d.leverage !== undefined ? Number(d.leverage) : undefined
      };
    } catch (_) {
      return { action: 'hold', reasoning: '解析失败，保持当前持仓' };
    }
  }

  async executeTradingDecision(decision, marketData) {
    try {
      if (decision.action === 'buy' && decision.symbol) {
        await this.executeBuyOrder(decision, marketData);
      } else if (decision.action === 'sell' && decision.symbol) {
        await this.executeSellOrder(decision, marketData);
      } else if (decision.action === 'close_position' && decision.symbol) {
        const base = this.normalizeBaseSymbol(decision.symbol);
        const pos = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
        if (pos) {
          const qty = decision.quantity && decision.quantity > 0 ? decision.quantity : Math.abs(Number(pos.quantity));
          // 根据持仓方向决定平仓方向：多头用sell平仓，空头用buy平仓
          const posQty = Number(pos.quantity);
          if (posQty > 0) {
            // 多头：使用sell平仓
            await this.executeSellOrder({ ...decision, symbol: base, quantity: qty }, marketData);
          } else if (posQty < 0) {
            // 空头：使用buy平仓
            await this.executeBuyOrder({ ...decision, symbol: base, quantity: qty }, marketData);
          }
        }
      }
      await this.updateAccountState();
    } catch (e) {
      console.error('交易执行失败:', e.message);
    }
    this.saveState();
  }

  async executeBuyOrder(decision) {
    try {
      const base = this.normalizeBaseSymbol(decision.symbol);
      const symbol = this.isFutures ? `${base}/USDT:USDT` : `${base}/USDT`;
      const quantity = decision.quantity || 0.001;
      const leverage = this.isFutures && decision.leverage !== undefined ? Math.floor(Number(decision.leverage)) : undefined;
      if (this.isFutures) {
        try { await this.exchange.setMarginMode('ISOLATED', symbol); } catch (_) {}
        try { if (leverage !== undefined) await this.exchange.setLeverage(leverage, symbol); } catch (_) {}
      }
      const order = await this.exchange.createOrder(
        symbol, 'market', 'buy', quantity, null,
        this.isFutures ? (leverage !== undefined ? { leverage, marginType: 'isolated' } : { marginType: 'isolated' }) : undefined
      );
      this.addPosition(base, quantity, order.average || order.price);
      this.logTrade('BUY', base, quantity, order.average || order.price, order.id);
    } catch (e) {
      console.error('买入失败:', e.message);
    }
  }

  async executeSellOrder(decision) {
    try {
      const base = this.normalizeBaseSymbol(decision.symbol);
      const symbol = this.isFutures ? `${base}/USDT:USDT` : `${base}/USDT`;
      const quantity = decision.quantity || 0.001;
      const leverage = this.isFutures && decision.leverage !== undefined ? Math.floor(Number(decision.leverage)) : undefined;
      if (this.isFutures) {
        try { await this.exchange.setMarginMode('ISOLATED', symbol); } catch (_) {}
        try { if (leverage !== undefined) await this.exchange.setLeverage(leverage, symbol); } catch (_) {}
      }
      const order = await this.exchange.createOrder(
        symbol, 'market', 'sell', quantity, null,
        this.isFutures ? (leverage !== undefined ? { leverage, marginType: 'isolated' } : { marginType: 'isolated' }) : undefined
      );
      this.removePosition(base, quantity);
      this.logTrade('SELL', base, quantity, order.average || order.price, order.id);
    } catch (e) {
      console.error('卖出失败:', e.message);
    }
  }

  addPosition(symbol, quantity, entryPrice) {
    const base = this.normalizeBaseSymbol(symbol);
    const existing = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
    if (existing) {
      const totalQ = parseFloat(existing.quantity) + parseFloat(quantity);
      const avgPrice = (parseFloat(existing.entry_price) * parseFloat(existing.quantity) + parseFloat(entryPrice) * parseFloat(quantity)) / totalQ;
      existing.quantity = totalQ; existing.entry_price = avgPrice;
    } else {
      this.state.positions.push({
        symbol: base,
        quantity,
        entry_price: entryPrice,
        current_price: entryPrice,
        liquidation_price: entryPrice * 0.9,
        unrealized_pnl: 0,
        leverage: 1,
        exit_plan: { profit_target: entryPrice * 1.1, stop_loss: entryPrice * 0.95, invalidation_condition: 'price_below_stop_loss' },
        confidence: 0.8,
        risk_usd: quantity * entryPrice,
        sl_oid: null, tp_oid: null, wait_for_fill: false, entry_oid: null,
        notional_usd: quantity * entryPrice
      });
    }
  }

  removePosition(symbol, quantity) {
    const base = this.normalizeBaseSymbol(symbol);
    const existing = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
    if (existing) {
      const remain = parseFloat(existing.quantity) - parseFloat(quantity);
      if (remain <= 0) {
        this.state.positions = this.state.positions.filter(p => this.normalizeBaseSymbol(p.symbol) !== base);
      } else {
        existing.quantity = remain;
      }
    }
  }

  async updateAccountState() {
    try {
      const balance = await this.exchange.fetchBalance();
      this.state.accountValue = balance.USDT?.total || 10000;
      this.state.availableCash = balance.USDT?.free || 10000;
      this.state.totalReturn = ((this.state.accountValue - 10000) / 10000) * 100;
      if (this.isFutures) {
        const positions = await this.exchange.fetchPositions();
        const active = positions.filter(p => parseFloat(p.contracts) !== 0);
        this.state.positions = [];
        for (const position of active) {
          if (parseFloat(position.contracts) !== 0) {
            const symbol = this.normalizeBaseSymbol(position.symbol);
            const contracts = parseFloat(position.contracts);
            // 根据side字段确定quantity的符号：long=正数，short=负数
            const quantity = (position.side === 'long' || position.side === 'buy') ? Math.abs(contracts) : -Math.abs(contracts);
            // 计算杠杆：名义价值 / 保证金
            const notional = Math.abs(parseFloat(position.notional) || 0);
            const initialMargin = parseFloat(position.initialMargin) || 0;
            const leverage = notional > 0 && initialMargin > 0 ? Math.round((notional / initialMargin) * 10) / 10 : 1;
            this.state.positions.push({
              symbol,
              quantity, // 正数=多仓，负数=空仓
              entry_price: parseFloat(position.entryPrice),
              current_price: parseFloat(position.markPrice),
              liquidation_price: parseFloat(position.liquidationPrice) || 0,
              unrealized_pnl: parseFloat(position.unrealizedPnl),
              leverage, // 根据名义价值和保证金计算
              exit_plan: {
                profit_target: parseFloat(position.entryPrice) * 1.1,
                stop_loss: parseFloat(position.entryPrice) * 0.95,
                invalidation_condition: 'price_below_stop_loss'
              },
              confidence: 0.8,
              risk_usd: Math.abs(quantity) * parseFloat(position.entryPrice),
              sl_oid: null, tp_oid: null, wait_for_fill: false, entry_oid: null,
              notional_usd: notional
            });
          }
        }
      }
    } catch (e) {
      console.error('更新账户失败:', e.message);
    }
  }

  logTrade(side, symbol, quantity, price, orderId) {
    const trade = {
      timestamp: new Date().toISOString(),
      side, symbol, quantity, price, orderId,
      environment: this.isFutures ? 'demo.binance.com' : 'spot.testnet',
      accountValue: this.state.accountValue,
      totalReturn: this.state.totalReturn
    };
    if (!this.state.trades) this.state.trades = [];
    this.state.trades.unshift(trade);
    this.saveState();
    // Mirror to backend/data/trades.json for web API consumption
    try {
      let obj = { trades: [] };
      if (existsSync(this.tradesFile)) {
        try { obj = JSON.parse(readFileSync(this.tradesFile, 'utf8')); } catch (_) {}
      }
      if (!Array.isArray(obj.trades)) obj.trades = [];
      obj.trades.unshift({
        model_id: 'default',
        exit_time: Math.floor(Date.now() / 1000),
        realized_net_pnl: side === 'BUY' ? 0 : 0,
        side, symbol, quantity, price, orderId
      });
      writeFileSync(this.tradesFile, JSON.stringify(obj, null, 2), 'utf8');
    } catch (_) {}
  }

  saveConversation(userPrompt, aiResponse, decision) {
    // 解析AI响应中的JSON
    let aiParsed = null;
    try {
      if (typeof aiResponse === 'string') {
        const match = aiResponse.match(/\{[\s\S]*\}/);
        if (match) aiParsed = JSON.parse(match[0]);
      }
    } catch (_) {}

    // 从 aiParsed 中提取"原始决策对象"和"候选数组"，用于完整留存
    let decisionRaw = null;
    let decisionsArray = null;
    try {
      if (aiParsed && typeof aiParsed === 'object') {
        if (aiParsed.trading_decision) {
          decisionRaw = aiParsed.trading_decision;
        }
        if (Array.isArray(aiParsed.trading_decisions)) {
          decisionsArray = aiParsed.trading_decisions;
          // 若尚未从 trading_decision 取到主决策，则优先取与现有持仓相关的项
          if (!decisionRaw) {
            const currentSymbols = this.state.positions.map(p => p.symbol);
            const pick = decisionsArray.find(x => currentSymbols.includes(String(x.symbol || '').toUpperCase().replace(/:USDT$/,'').split('/')[0]))
              || decisionsArray[0];
            decisionRaw = pick || null;
          }
        }
      }
    } catch (_) {}

    const conversation = {
      timestamp: new Date().toISOString(),
      invocationCount: this.state.invocationCount,
      userPrompt,
      aiResponse,
      aiParsed,
      // decision: 原始/丰富结构（保持完整字段用于分析）
      decision: decisionRaw || aiParsed?.trading_decision || null,
      // decision_normalized: 供程序执行的归一化决策
      decision_normalized: decision,
      // trading_decisions: 若模型输出了候选数组，也一并保存
      trading_decisions: decisionsArray || null,
      // chain_of_thought: 从aiParsed中提取
      chain_of_thought: aiParsed?.chain_of_thought || null,
      accountValue: this.state.accountValue,
      totalReturn: this.state.totalReturn
    };
    if (!this.conversations.conversations) this.conversations.conversations = [];
    this.conversations.conversations.unshift(conversation);
    this.saveConversations();
  }

  async runTradingCycle() {
    try {
      // 在每次交易循环开始时检查是否需要重新加载模板
      this.checkAndReloadTemplates();
      
      const marketData = await this.getMarketData();
      const userPrompt = this.generateUserPrompt(marketData);
      const aiResponse = await this.callDeepSeekAPI(userPrompt);
      if (!aiResponse) {
        const decision = { action: 'hold', reasoning: 'no_ai_response' };
        await this.executeTradingDecision(decision, marketData);
        this.saveConversation(userPrompt, aiResponse, decision);
        return;
      }
      const decision = this.parseAIResponse(aiResponse);
      await this.executeTradingDecision(decision, marketData);
      this.saveConversation(userPrompt, aiResponse, decision);
    } catch (e) {
      console.error('交易循环失败:', e.message);
      // 兜底：写入最小对话，保证前端可读
      try {
        const note = `CYCLE ERROR: ${String(e?.message || e)}\n`;
        const userPrompt = 'MARKET DATA UNAVAILABLE';
        const aiResponse = null;
        const decision = { action: 'hold', reasoning: 'error' };
        this.saveConversation(userPrompt, aiResponse, decision);
      } catch (_) {}
    }
  }

  async run() {
    try {
      if (!this.aiApiKey) {
        console.error('缺少 AI API Key');
        return;
      }
      const ok = await this.initializeExchange();
      if (!ok) {
        // 离线模式也进行一次循环，以便前端与对话有数据可用
        console.warn('进入离线模式：使用本地伪数据生成提示与对话');
      } else {
        // 初始化成功后立即更新账户状态（获取交易所的实际余额）
        await this.updateAccountState();
        this.saveState(); // 保存初始状态
      }
      await this.runTradingCycle();
      console.log(`AI交易系统v2运行完成 (env=${this.tradingEnv}, ai=${this.aiProvider}:${this.aiModel})`);
    } catch (e) {
      console.error('系统运行失败:', e.message);
      process.exit(1);
    }
  }
}

async function main() {
  const sys = new AITradingSystemV2();
  await sys.run();
}

main().catch(console.error);



```

修复前端逻辑，确保根据选择的 bot 加载正确的 prompt，并移除多余的 renderSections 调用：


```typescriptreact
"use client";
import { useEffect, useMemo, useState } from "react";

type Config = {
  trading_env?: string;
  allowed_symbols?: string[];
  ai?: { provider?: string; model?: string; presets?: Record<string, any> };
  data?: Record<string, any>;
};

export default function PromptEditorPanel() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(3);
  const [env, setEnv] = useState<string>("");
  const [ai, setAi] = useState<string>("");
  const [promptEnv, setPromptEnv] = useState<string>("demo-futures"); // Prompt环境切换，独立于交易环境
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [configUpdates, setConfigUpdates] = useState<any>(null);

  // 加载prompt的函数
  async function loadPrompts(env: string) {
    try {
      const url = `/api/nof1/ai/prompts${env ? `?env=${env}` : ''}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pj = await r.json();
      setSystemPrompt(pj.system || "");
      setUserPrompt(pj.user || "");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [c, s] = await Promise.all([
          fetch("/api/nof1/ai/config", { cache: "no-store" }),
          fetch("/api/nof1/ai/trading/status", { cache: "no-store" }),
        ]);
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setCfg(cj);
          setStatus(sj);
          const tradingEnv = String(cj?.trading_env || "demo-futures");
          setEnv(tradingEnv);
          // 如果有运行的bot，使用bot的环境；否则使用配置的默认环境
          const activeEnv = sj?.running && sj?.env ? sj.env : tradingEnv;
          setPromptEnv(activeEnv);
          setAi("");
          // 加载对应环境的prompt（使用activeEnv）
          await loadPrompts(activeEnv);
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // 当promptEnv改变时，重新加载prompt
  useEffect(() => {
    if (promptEnv && !loading) {
      loadPrompts(promptEnv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptEnv]);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // 保存成功提示
      const saved = await r.json();
      setError(null);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onApplyPrompt() {
    if (!status?.running) {
      setError('没有运行中的Bot，无法应用Prompt');
      return;
    }
    if (status?.env !== promptEnv) {
      setError(`当前运行的Bot环境是 ${status.env}，但编辑的是 ${promptEnv} 的模板，不匹配！`);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      // 先保存文件
      await onSave();
      // 然后触发重新加载
      const r = await fetch("/api/nof1/ai/trading/reload-prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const result = await r.json();
      setError(null);
      // 可以显示成功消息
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSuggest() {
    try {
      setSuggesting(true);
      setError(null);
      setRationale(null);
      setConfigUpdates(null);
      const r = await fetch("/api/nof1/ai/prompt/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const s = j?.suggestion || {};
      if (typeof s.system_prompt_en === "string") setSystemPrompt(s.system_prompt_en);
      if (typeof s.user_prompt_en === "string") setUserPrompt(s.user_prompt_en);
      if (s.rationale_en) setRationale(String(s.rationale_en));
      if (s.config_updates) setConfigUpdates(s.config_updates);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function onApplyConfigUpdates() {
    if (!configUpdates) return;
    try {
      const r = await fetch("/api/nof1/ai/config/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config_updates: configUpdates })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next = await r.json();
      setCfg(next);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const whitelist = useMemo(() => (cfg?.allowed_symbols || []).join(", "), [cfg]);
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);
  const isRunning = !!status?.running;

  async function startTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intervalMinutes, env, ai })
      });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function stopTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  return (
    <aside className="h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Prompt 工作台</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ color: "var(--btn-inactive-fg)", border: "1px solid var(--chip-border)" }}
            onClick={onSuggest}
            disabled={suggesting}
          >{suggesting ? '建议中…' : '建议'}</button>
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
            onClick={onSave}
            disabled={saving}
            title="保存Prompt模板到文件（不会立即生效，需要重启Bot或点击'应用Prompt'）"
          >{saving ? '保存中…' : '保存'}</button>
          {isRunning && status?.env === promptEnv && (
            <button
              className="rounded px-2 py-1 chip-btn"
              style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
              onClick={onApplyPrompt}
              disabled={saving}
              title="保存并立即应用到运行中的Bot"
            >{saving ? '应用中…' : '应用Prompt'}</button>
          )}
        </div>
      </div>

      {/* Bot选择 - 选择要编辑的Bot */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>选择 Bot</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易环境</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={promptEnv}
                  onChange={(e) => setPromptEnv(e.target.value)}>
            <option value="demo-futures">demo-futures (期货演示)</option>
            <option value="demo-spot">demo-spot (现货演示)</option>
            <option value="futures">futures (期货生产)</option>
            <option value="spot">spot (现货生产)</option>
          </select>
        </div>
        <div className="text-[10px] mb-2" style={{ color: 'var(--muted-text)' }}>
          {promptEnv.includes('futures') ? '⚠️ 将编辑期货Bot的Prompt（支持杠杆、做多做空）' : '⚠️ 将编辑现货Bot的Prompt（无杠杆、只能做多）'}
        </div>
        {status?.running && status?.env && (
          <div className="text-[10px]" style={{ color: status.env === promptEnv ? 'var(--success)' : 'var(--warning)' }}>
            {status.env === promptEnv 
              ? `✅ 当前运行的Bot使用此环境 (pid=${status.pid})`
              : `⚠️ 当前运行的是 ${status.env} Bot，编辑的模板不会影响运行中的Bot`
            }
          </div>
        )}
      </div>

      {/* 交易控制 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易类型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}>
            {['demo-futures','demo-spot','futures','spot'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">AI模型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={ai}
                  onChange={(e) => setAi(e.target.value)}>
            <option value="">(默认)</option>
            {aiPresetKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">间隔(分)</label>
          <input className="col-span-2 rounded border px-2 py-1"
                 style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                 type="number" min={1} value={intervalMinutes}
                 onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))} />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }}
                  onClick={startTrading}
                  disabled={isRunning}>启动</button>
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }}
                  onClick={stopTrading}
                  disabled={!isRunning}>停止</button>
          <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
            状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--chip-border)", color: "var(--danger)" }}>{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500">加载中…</div>
      ) : (
        <>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>System Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-40 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>User Prompt</div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-48 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>

          {rationale && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>Rationale</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{rationale}</pre>
            </div>
          )}

          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>符号白名单</div>
            <div className="text-xs" style={{ color: "var(--foreground)" }}>{whitelist || '—'}</div>
          </div>

          {configUpdates && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>建议的配置更新</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2 mb-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{JSON.stringify(configUpdates, null, 2)}</pre>
              <button
                className="rounded px-2 py-1 chip-btn text-xs"
                style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
                onClick={onApplyConfigUpdates}
              >应用配置更新</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}



```

```javascript
import ccxt from 'ccxt';
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { resolve } from 'path';

// 轻量级 .env 加载（避免额外依赖），需在使用 config/env 之前执行
function loadDotEnv(envPath) {
  try {
    if (!existsSync(envPath)) return;
    const raw = readFileSync(envPath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = val;
      }
    });
  } catch (_) {}
}

// 提前加载 backend/.env，确保 config 与 env 解析可用
loadDotEnv(resolve(process.cwd(), 'backend/.env'));

function expandEnvMaybe(value) {
  if (typeof value !== 'string') return value;
  const m = value.match(/^\$\{(.+)\}$/);
  if (m) return process.env[m[1]] || '';
  return value;
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && idx < process.argv.length - 1) return process.argv[idx + 1];
  const envKey = name.replace(/^--/, '').toUpperCase();
  return process.env[envKey];
}

function loadConfig() {
  const configPath = resolve(process.cwd(), 'backend/ai/ai-trading/config.json');
  const raw = readFileSync(configPath, 'utf8');
  const cfg = JSON.parse(raw);
  if (cfg.ai && cfg.ai.api_key) cfg.ai.api_key = expandEnvMaybe(cfg.ai.api_key);
  const f = cfg.exchange?.binance?.futures_demo;
  const s = cfg.exchange?.binance?.spot_testnet;
  if (f) {
    f.api_key = expandEnvMaybe(f.api_key);
    f.api_secret = expandEnvMaybe(f.api_secret);
  }
  if (s) {
    s.api_key = expandEnvMaybe(s.api_key);
    s.api_secret = expandEnvMaybe(s.api_secret);
  }
  return cfg;
}

function renderSections(template, flags) {
  let out = template;
  out = out.replace(/\{\{#is_futures\}\}([\s\S]*?)\{\{\/is_futures\}\}/g, (_, inner) => (flags.is_futures ? inner : ''));
  out = out.replace(/\{\{\^is_futures\}\}([\s\S]*?)\{\{\/is_futures\}\}/g, (_, inner) => (!flags.is_futures ? inner : ''));
  return out;
}

function renderSimple(template, context) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g, (_, key) => {
    const val = key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : ''), context);
    return String(val ?? '');
  });
}

class AITradingSystemV2 {
  constructor() {
    this.config = loadConfig();

    const argEnv = getArg('--env');
    const argAi = getArg('--ai');

    this.tradingEnv = (argEnv && typeof argEnv === 'string') ? argEnv : (this.config.trading_env || 'demo-futures');
    this.isFutures = this.tradingEnv === 'demo-futures' || this.tradingEnv === 'futures';

    const aiPreset = (argAi && this.config.ai?.presets?.[argAi]) ? this.config.ai.presets[argAi] : null;
    this.aiProvider = (aiPreset?.provider || this.config.ai?.provider || 'deepseek');
    this.aiModel = (aiPreset?.model || this.config.ai?.model || 'deepseek-chat');
    this.aiApiKey = expandEnvMaybe(aiPreset?.api_key || this.config.ai?.api_key || process.env.DEEPSEEK_API_KEY_30 || '');
    this.aiTemperature = (aiPreset?.temperature ?? this.config.ai?.temperature ?? 0.7);
    this.aiMaxTokens = (aiPreset?.max_tokens ?? this.config.ai?.max_tokens ?? 2000);

    this.exchange = null;
    this.dataDir = resolve(process.cwd(), 'backend', 'data');
    try { mkdirSync(this.dataDir, { recursive: true }); } catch (_) {}
    this.stateFile = resolve(this.dataDir, 'trading-state.json');
    this.conversationsFile = resolve(this.dataDir, 'conversations.json');
    this.tradesFile = resolve(this.dataDir, 'trades.json');

    this.state = this.loadState();
    this.sanitizeState();
    this.conversations = this.loadConversations();

    // 确保种子文件存在（前端可立即读取）
    try {
      if (!existsSync(this.tradesFile)) {
        writeFileSync(this.tradesFile, JSON.stringify({ trades: [] }, null, 2), 'utf8');
      }
      if (!existsSync(this.conversationsFile)) {
        writeFileSync(this.conversationsFile, JSON.stringify(this.conversations, null, 2), 'utf8');
      }
      if (!existsSync(this.stateFile)) {
        this.saveState();
      }
    } catch (_) {}

    const defaultAllowed = this.isFutures
      ? ['BTC/USDT:USDT','ETH/USDT:USDT','SOL/USDT:USDT','BNB/USDT:USDT','XRP/USDT:USDT','DOGE/USDT:USDT']
      : ['BTC/USDT','ETH/USDT','SOL/USDT','BNB/USDT','XRP/USDT','DOGE/USDT'];

    const presetAllowed = this.config.presets?.[this.tradingEnv]?.allowed_symbols;

    this.allowedSymbolsForAI = Array.isArray(this.config.allowed_symbols) && this.config.allowed_symbols.length > 0
      ? this.config.allowed_symbols
      : (Array.isArray(presetAllowed) && presetAllowed.length > 0 ? presetAllowed : defaultAllowed);

    this.symbols = (Array.isArray(this.config.symbols_monitor) && this.config.symbols_monitor.length > 0)
      ? this.config.symbols_monitor
      : [...this.allowedSymbolsForAI];

    // 优先从 presets 读取环境特定的模板路径，否则使用全局配置
    const presetPromptFiles = this.config.presets?.[this.tradingEnv]?.prompt_files;
    const promptFiles = presetPromptFiles || this.config.prompt_files || {};
    
    this.systemPromptTemplatePath = resolve(process.cwd(), promptFiles.system_prompt_path || '');
    this.userPromptTemplatePath = resolve(process.cwd(), promptFiles.user_prompt_path || '');
    
    // 初始化时加载模板
    this.reloadTemplates();
    
    // 记录模板文件最后修改时间
    this.templateLastLoadTime = Date.now();

    this.dataCfg = {
      intraday_tf: this.config.data?.intraday_tf || '1m',
      intraday_limit: this.config.data?.intraday_limit || 50,
      context_tf: this.config.data?.context_tf || '4h',
      context_limit: this.config.data?.context_limit || 10
    };

    // 简单的随机基准，用于离线/失败回退生成数值
    this._seed = Math.floor(Date.now() / 60000);
  }

  // 重新加载模板文件
  reloadTemplates() {
    try {
      this.systemPromptTemplate = existsSync(this.systemPromptTemplatePath)
        ? readFileSync(this.systemPromptTemplatePath, 'utf8')
        : '';
      this.userPromptTemplate = existsSync(this.userPromptTemplatePath)
        ? readFileSync(this.userPromptTemplatePath, 'utf8')
        : '';
      this.templateLastLoadTime = Date.now();
      console.log(`✅ Prompt模板已重新加载 (${this.tradingEnv})`);
    } catch (e) {
      console.error('重新加载模板失败:', e.message);
    }
  }

  // 检查是否需要重新加载模板（通过标记文件）
  checkAndReloadTemplates() {
    try {
      const dataDir = resolve(process.cwd(), 'backend', 'data');
      const markerFile = resolve(dataDir, `.reload-prompts-${this.tradingEnv}.marker`);
      
      if (existsSync(markerFile)) {
        // 标记文件存在，重新加载模板
        this.reloadTemplates();
        // 删除标记文件
        try {
          unlinkSync(markerFile);
          console.log(`🗑️ 已删除重载标记文件: ${markerFile}`);
        } catch (e) {
          console.warn('删除标记文件失败:', e.message);
        }
      }
    } catch (e) {
      // 静默失败，不影响主流程
    }
  }

  sanitizeState() {
    const s = this.state || {};
    // 核心数值字段保证为数字
    s.accountValue = Number.isFinite(Number(s.accountValue)) ? Number(s.accountValue) : 10000;
    s.availableCash = Number.isFinite(Number(s.availableCash)) ? Number(s.availableCash) : 10000;
    s.totalReturn = Number.isFinite(Number(s.totalReturn)) ? Number(s.totalReturn) : 0;
    s.invocationCount = Number.isFinite(Number(s.invocationCount)) ? Number(s.invocationCount) : 0;
    // 结构字段
    if (!Array.isArray(s.positions)) s.positions = [];
    if (!s.startTime) s.startTime = new Date().toISOString();
    if (!s.lastUpdate) s.lastUpdate = new Date().toISOString();
    if (typeof s.tradingEnabled !== 'boolean') s.tradingEnabled = true;
    // 规范化持仓内的数值
    s.positions = s.positions.map((p = {}) => ({
      symbol: p.symbol || 'BTC',
      quantity: Number.isFinite(Number(p.quantity)) ? Number(p.quantity) : 0,
      entry_price: Number.isFinite(Number(p.entry_price)) ? Number(p.entry_price) : 0,
      current_price: Number.isFinite(Number(p.current_price)) ? Number(p.current_price) : 0,
      liquidation_price: Number.isFinite(Number(p.liquidation_price)) ? Number(p.liquidation_price) : 0,
      unrealized_pnl: Number.isFinite(Number(p.unrealized_pnl)) ? Number(p.unrealized_pnl) : 0,
      leverage: Number.isFinite(Number(p.leverage)) ? Number(p.leverage) : 1,
      exit_plan: p.exit_plan || { profit_target: 0, stop_loss: 0, invalidation_condition: 'none' },
      confidence: Number.isFinite(Number(p.confidence)) ? Number(p.confidence) : 0.8,
      risk_usd: Number.isFinite(Number(p.risk_usd)) ? Number(p.risk_usd) : 0,
      sl_oid: p.sl_oid ?? null,
      tp_oid: p.tp_oid ?? null,
      wait_for_fill: Boolean(p.wait_for_fill),
      entry_oid: p.entry_oid ?? null,
      notional_usd: Number.isFinite(Number(p.notional_usd)) ? Number(p.notional_usd) : 0,
    }));
    this.state = s;
  }

  normalizeBaseSymbol(raw) {
    if (!raw) return undefined;
    let sym = String(raw).trim().toUpperCase();
    sym = sym.replace(/\s+/g, '');
    sym = sym.replace(/:USDT$/, '');
    if (sym.includes('/')) return sym.split('/')[0];
    if (sym.endsWith('USDT')) return sym.slice(0, -4);
    return sym;
  }

  loadState() {
    try {
      if (existsSync(this.stateFile)) {
        const data = readFileSync(this.stateFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (_) {}
    return {
      startTime: new Date().toISOString(),
      invocationCount: 0,
      totalReturn: 0,
      accountValue: 10000,
      availableCash: 10000,
      positions: [],
      lastUpdate: new Date().toISOString(),
      tradingEnabled: true
    };
  }

  saveState() {
    this.state.lastUpdate = new Date().toISOString();
    writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf8');
  }

  loadConversations() {
    try {
      if (existsSync(this.conversationsFile)) {
        const data = readFileSync(this.conversationsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (_) {}
    return { conversations: [], lastUpdate: new Date().toISOString() };
  }

  saveConversations() {
    this.conversations.lastUpdate = new Date().toISOString();
    writeFileSync(this.conversationsFile, JSON.stringify(this.conversations, null, 2), 'utf8');
  }

  async initializeExchange() {
    try {
      // 仅在用户显式设置时使用代理，避免误用本地 7890 端口
      const httpsProxy = process.env.HTTPS_PROXY || '';
      const httpProxy = process.env.HTTP_PROXY || '';
      const noProxy = process.env.NO_PROXY || process.env.no_proxy || '';
      console.log(`Proxy config -> HTTPS_PROXY=${httpsProxy || '(unset)'} HTTP_PROXY=${httpProxy || '(unset)'} NO_PROXY=${noProxy || '(unset)'}\n`);

      const envKey = this.tradingEnv;
      const isDemoFutures = envKey === 'demo-futures';
      const isDemoSpot = envKey === 'demo-spot';

      if (isDemoFutures || envKey === 'futures') {
        const apiKey = this.config.exchange?.binance?.futures_demo?.api_key || process.env.BINANCE_DEMO_API_KEY;
        const secret = this.config.exchange?.binance?.futures_demo?.api_secret || process.env.BINANCE_DEMO_API_SECRET;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_DEMO_API_KEY/SECRET或在config.json配置');
        this.exchange = new ccxt.binanceusdm({ apiKey, secret, enableRateLimit: true, options: { defaultType: 'future', warnOnFetchCurrencies: false, fetchCurrencies: false, enableDemoTrading: true } });
        if (httpsProxy) this.exchange.httpsProxy = httpsProxy.endsWith('/') ? httpsProxy : `${httpsProxy}/`;
        this.exchange.enableDemoTrading(true);
        await this.exchange.fetchBalance();
      } else if (isDemoSpot || envKey === 'spot') {
        const apiKey = this.config.exchange?.binance?.spot_testnet?.api_key || process.env.BINANCE_SPOT_TEST_API_KEY;
        const secret = this.config.exchange?.binance?.spot_testnet?.api_secret || process.env.BINANCE_SPOT_TEST_API_SECRET;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_SPOT_TEST_API_KEY/SECRET或在config.json配置');
        this.exchange = new ccxt.binance({ apiKey, secret, enableRateLimit: true });
        if (httpsProxy) this.exchange.httpsProxy = httpsProxy.endsWith('/') ? httpsProxy : `${httpsProxy}/`;
        if (typeof this.exchange.setSandboxMode === 'function') this.exchange.setSandboxMode(true);
        await this.exchange.fetchBalance();
      }
      return true;
    } catch (e) {
      console.error('❌ 初始化交易所失败:', e.message);
      console.error('详细错误:', e);
      return false;
    }
  }

  calculateEMA(prices, period) {
    if (prices.length < period) return null;
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    return ema;
  }
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26) {
    if (prices.length < slowPeriod) return null;
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    if (!fastEMA || !slowEMA) return null;
    return fastEMA - slowEMA;
  }
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change; else losses += Math.abs(change);
    }
    const avgGain = gains / period; const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  calculateATR(highs, lows, closes, period = 14) {
    if (highs.length < period + 1) return null;
    const trueRanges = [];
    for (let i = 1; i < highs.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  async getMarketData() {
    const marketData = {};
    const intradayTf = this.dataCfg.intraday_tf;
    const intradayLimit = this.dataCfg.intraday_limit;
    const ctxTf = this.dataCfg.context_tf;
    const ctxLimit = this.dataCfg.context_limit;
    for (const symbol of this.symbols) {
      try {
        if (!this.exchange) throw new Error('no_exchange');
        const ticker = await this.exchange.fetchTicker(symbol);
        const ohlcv = await this.exchange.fetchOHLCV(symbol, intradayTf, undefined, intradayLimit);
        const prices = ohlcv.map(c => (c[2] + c[3]) / 2);
        const highs = ohlcv.map(c => c[2]);
        const lows = ohlcv.map(c => c[3]);
        const closes = ohlcv.map(c => c[4]);
        const volumes = ohlcv.map(c => c[5]);
        const ema20 = this.calculateEMA(prices, 20) || Number(ticker.last) || 0;
        const macd = this.calculateMACD(prices) || 0;
        const rsi14 = this.calculateRSI(prices, 14) || 50;
        const rsi21 = this.calculateRSI(prices, 21) || 50;
        const atr = this.calculateATR(highs, lows, closes) || (Number(ticker.last) || 0) * 0.02;

        const ohlcvCtx = await this.exchange.fetchOHLCV(symbol, ctxTf, undefined, ctxLimit);
        const pricesCtx = ohlcvCtx.map(c => (c[2] + c[3]) / 2);
        const ema20_4h = this.calculateEMA(pricesCtx, 20) || Number(ticker.last) || 0;
        const ema50_4h = this.calculateEMA(pricesCtx, 50) || Number(ticker.last) || 0;
        const atr_4h = this.calculateATR(ohlcvCtx.map(c => c[2]), ohlcvCtx.map(c => c[3]), ohlcvCtx.map(c => c[4])) || (Number(ticker.last) || 0) * 0.02;

        const currentVolume = volumes[volumes.length - 1] || 0;
        const avgVolume = volumes.length ? (volumes.reduce((a, b) => a + b, 0) / volumes.length) : 0;
        const fundingRate = (Math.random() - 0.5) * 0.001;
        const openInterest = Math.random() * 1000000 + 500000;
        const avgOpenInterest = openInterest * (0.8 + Math.random() * 0.4);
        const baseKey = this.normalizeBaseSymbol(symbol);

        marketData[baseKey] = {
          symbol: baseKey,
          currentPrice: Number(ticker.last) || 0,
          ema20: Number(ema20) || 0,
          macd: Number(macd) || 0,
          rsi14: Number(rsi14) || 50,
          rsi21: Number(rsi21) || 50,
          atr: Number(atr) || 0,
          ema20_4h: Number(ema20_4h) || 0,
          ema50_4h: Number(ema50_4h) || 0,
          atr_4h: Number(atr_4h) || 0,
          currentVolume: Number(currentVolume) || 0,
          avgVolume: Number(avgVolume) || 0,
          fundingRate: Number(fundingRate) || 0,
          openInterest: Number(openInterest) || 0,
          avgOpenInterest: Number(avgOpenInterest) || 0,
          prices: prices.slice(-10).map(Number),
          ema20_series: this.generateEMASeries(prices, 20).slice(-10).map(Number),
          macd_series: this.generateMACDSeries(prices).slice(-10).map(Number),
          rsi14_series: this.generateRSISeries(prices, 14).slice(-10).map(Number),
          rsi21_series: this.generateRSISeries(prices, 21).slice(-10).map(Number),
          macd_4h_series: this.generateMACDSeries(pricesCtx).slice(-10).map(Number),
          rsi14_4h_series: this.generateRSISeries(pricesCtx, 14).slice(-10).map(Number)
        };
      } catch (e) {
        // 离线/失败回退：生成稳定的伪数据，避免渲染与 toFixed 失败
        const baseKey = this.normalizeBaseSymbol(symbol);
        const t = this._seed + Math.floor(Math.random() * 1000);
        const p0 = 100 + (t % 50);
        const series = Array.from({ length: 10 }, (_, i) => p0 + Math.sin((t + i) / 5) * 2 + (Math.random() - 0.5));
        const last = series[series.length - 1];
        marketData[baseKey] = {
          symbol: baseKey,
          currentPrice: last,
          ema20: last * 0.998,
          macd: (Math.random() - 0.5) * 2,
          rsi14: 45 + Math.random() * 10,
          rsi21: 45 + Math.random() * 10,
          atr: last * 0.02,
          ema20_4h: last * 1.001,
          ema50_4h: last * 1.0005,
          atr_4h: last * 0.018,
          currentVolume: 1_000_000 + Math.random() * 100_000,
          avgVolume: 1_050_000,
          fundingRate: (Math.random() - 0.5) * 0.0005,
          openInterest: 700_000 + Math.random() * 200_000,
          avgOpenInterest: 750_000,
          prices: series,
          ema20_series: series.map((v, i, a) => (i > 0 ? (a[i - 1] * 0.9 + v * 0.1) : v)),
          macd_series: series.map(() => (Math.random() - 0.5)),
          rsi14_series: series.map(() => 45 + Math.random() * 10),
          rsi21_series: series.map(() => 45 + Math.random() * 10),
          macd_4h_series: series.map(() => (Math.random() - 0.5)),
          rsi14_4h_series: series.map(() => 45 + Math.random() * 10)
        };
      }
    }
    return marketData;
  }

  generateEMASeries(prices, period) {
    const series = [];
    for (let i = period - 1; i < prices.length; i++) {
      const ema = this.calculateEMA(prices.slice(0, i + 1), period);
      series.push(ema);
    }
    return series;
  }
  generateMACDSeries(prices) {
    const series = [];
    for (let i = 25; i < prices.length; i++) {
      const macd = this.calculateMACD(prices.slice(0, i + 1));
      series.push(macd);
    }
    return series;
  }
  generateRSISeries(prices, period) {
    const series = [];
    for (let i = period; i < prices.length; i++) {
      const rsi = this.calculateRSI(prices.slice(0, i + 1), period);
      series.push(rsi);
    }
    return series;
  }

  buildMarketSections(marketData) {
    let out = '';
    for (const [symbol, data] of Object.entries(marketData)) {
      const d = data || {};
      // 归一化，避免 undefined 触发 toFixed
      const safe = {
        currentPrice: Number(d.currentPrice) || 0,
        ema20: Number(d.ema20) || 0,
        macd: Number(d.macd) || 0,
        rsi14: Number(d.rsi14) || 50,
        rsi21: Number(d.rsi21) || 50,
        atr: Number(d.atr) || 0,
        ema20_4h: Number(d.ema20_4h) || 0,
        ema50_4h: Number(d.ema50_4h) || 0,
        atr_4h: Number(d.atr_4h) || 0,
        currentVolume: Number(d.currentVolume) || 0,
        avgVolume: Number(d.avgVolume) || 0,
        fundingRate: Number(d.fundingRate) || 0,
        openInterest: Number(d.openInterest) || 0,
        avgOpenInterest: Number(d.avgOpenInterest) || 0,
        prices: Array.isArray(d.prices) ? d.prices.map(Number) : [],
        ema20_series: Array.isArray(d.ema20_series) ? d.ema20_series.map(Number) : [],
        macd_series: Array.isArray(d.macd_series) ? d.macd_series.map(Number) : [],
        rsi14_series: Array.isArray(d.rsi14_series) ? d.rsi14_series.map(Number) : [],
        rsi21_series: Array.isArray(d.rsi21_series) ? d.rsi21_series.map(Number) : [],
        macd_4h_series: Array.isArray(d.macd_4h_series) ? d.macd_4h_series.map(Number) : [],
        rsi14_4h_series: Array.isArray(d.rsi14_4h_series) ? d.rsi14_4h_series.map(Number) : [],
      };
      const fx = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '0.00');
      const ex = (n) => {
        const v = Number(n);
        if (!Number.isFinite(v)) return '0.00e+0';
        try { return v.toExponential(2); } catch { return '0.00e+0'; }
      };
      out += `### ALL ${symbol} DATA\n\n` +
        `current_price = ${fx(safe.currentPrice)}, current_ema20 = ${fx(safe.ema20)}, current_macd = ${fx(safe.macd)}, current_rsi (14 period) = ${fx(safe.rsi14)}\n\n` +
        `In addition, here is the latest ${symbol} open interest and funding rate for perps (the instrument you are trading):\n\n` +
        `Open Interest: Latest: ${fx(safe.openInterest)}  Average: ${fx(safe.avgOpenInterest)}\n\n` +
        `Funding Rate: ${ex(safe.fundingRate)}\n\n` +
        `**Intraday series (3‑minute intervals, oldest → latest):**\n\n` +
        `Mid prices: [${(safe.prices).map(p => fx(p)).join(', ')}]\n\n` +
        `EMA indicators (20‑period): [${(safe.ema20_series).map(p => fx(p)).join(', ')}]\n\n` +
        `MACD indicators: [${(safe.macd_series).map(p => fx(p)).join(', ')}]\n\n` +
        `RSI indicators (14‑Period): [${(safe.rsi14_series).map(p => fx(p)).join(', ')}]\n\n` +
        `RSI indicators (21‑Period): [${(safe.rsi21_series).map(p => fx(p)).join(', ')}]\n\n` +
        `**Longer‑term context (${this.dataCfg.context_tf}‑hour timeframe):**\n\n` +
        `20‑Period EMA: ${fx(safe.ema20_4h)} vs. 50‑Period EMA: ${fx(safe.ema50_4h)}\n\n` +
        `3‑Period ATR: ${fx(safe.atr)} vs. 14‑Period ATR: ${fx(safe.atr_4h)}\n\n` +
        `Current Volume: ${fx(safe.currentVolume)} vs. Average Volume: ${fx(safe.avgVolume)}\n\n` +
        `MACD indicators: [${(safe.macd_4h_series || []).map(p => fx(p)).join(', ')}]\n\n` +
        `RSI indicators (14‑Period): [${(safe.rsi14_4h_series || []).map(p => fx(p)).join(', ')}]\n\n` +
        `---\n\n`;
    }
    return out;
  }

  generateUserPrompt(marketData) {
    if (!this.userPromptTemplate) {
      const currentTime = new Date();
      const startTime = new Date(this.state.startTime);
      const minutesSinceStart = Math.floor((currentTime - startTime) / (1000 * 60));
      this.state.invocationCount++;
      this.saveState();
      let marketSections = '';
      try { marketSections = this.buildMarketSections(marketData); } catch (_) { marketSections = 'MARKET DATA UNAVAILABLE'; }
      return `It has been ${minutesSinceStart} minutes since you started trading. The current time is ${currentTime.toISOString()} and you've been invoked ${this.state.invocationCount} times.\n\n---\n\n${marketSections}\n\nAccount Value: ${this.state.accountValue}`;
    }

    const now = new Date();
    const start = new Date(this.state.startTime);
    const minutesSince = Math.floor((now - start) / (1000 * 60));
    this.state.invocationCount++;
    this.saveState();

    const context = {
      minutes_since_start: minutesSince,
      now_iso: now.toISOString(),
      invocation_count: this.state.invocationCount,
      market_sections: (() => { try { return this.buildMarketSections(marketData); } catch (_) { return 'MARKET DATA UNAVAILABLE'; } })(),
      account_value: Number(this.state.accountValue ?? 0).toFixed(2),
      available_cash: Number(this.state.availableCash ?? 0).toFixed(2),
      total_return: Number(this.state.totalReturn ?? 0).toFixed(2),
      positions_block: this.state.positions.map(p => JSON.stringify(p)).join('\n'),
      sharpe_ratio: Number(this.calculateSharpeRatio() ?? 0).toFixed(2)
    };

    return renderSimple(this.userPromptTemplate, context);
  }

  calculateSharpeRatio() {
    return this.state.totalReturn > 0 ? Math.random() * 2 - 1 : -Math.random();
  }

  buildSystemPrompt() {
    if (!this.systemPromptTemplate) {
      const allowedCsv = this.allowedSymbolsForAI.join(', ');
      const base = [
        this.isFutures ? 'You are an expert crypto trader operating Binance USDT-margined perpetual futures (U-margined).'
                       : 'You are an expert crypto trader operating Binance Spot Testnet (no leverage).',
        'Symbols whitelist:',
        allowedCsv
      ].join('\n');
      return base;
    }
    // 新模板已经分离为futures和spot，不需要renderSections（但仍保留兼容性）
    // 检查模板是否包含条件标签，如果没有则跳过renderSections
    const hasConditionalTags = this.systemPromptTemplate.includes('{{#is_futures}}') || 
                                this.systemPromptTemplate.includes('{{^is_futures}}');
    const tpl1 = hasConditionalTags 
      ? renderSections(this.systemPromptTemplate, { is_futures: this.isFutures })
      : this.systemPromptTemplate;
    const context = {
      environment: this.isFutures ? 'demo.binance.com (USDT-M Futures)' : 'binance spot testnet',
      env_note: this.isFutures ? 'USDM perpetual' : 'Spot testnet',
      trading_mode: this.isFutures ? 'perpetual futures (isolated)' : 'spot (no leverage)',
      is_futures: this.isFutures,
      allowed_symbols_csv: this.allowedSymbolsForAI.join(', ')
    };
    return renderSimple(tpl1, context);
  }

  async callDeepSeekAPI(userPrompt) {
    try {
      const apiKey = this.aiApiKey;
      const model = this.aiModel;
      const temperature = this.aiTemperature;
      const max_tokens = this.aiMaxTokens;
      const systemContent = this.buildSystemPrompt();

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: userPrompt }
          ],
          stream: false,
          temperature,
          max_tokens
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (e) {
      console.error('AI 调用失败:', e.message);
      return null;
    }
  }

  parseAIResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { action: 'hold', reasoning: response };
      const rawObj = JSON.parse(jsonMatch[0]);
      const normalizeAction = (a) => {
        if (!a) return 'hold';
        const x = String(a).toLowerCase();
        if (x === 'buy' || x === 'long' || x === 'open_long') return 'buy';
        if (x === 'sell' || x === 'short' || x === 'open_short') return 'sell';
        if (x === 'close' || x === 'close_position' || x === 'exit' || x === 'reduce' || x === 'reduce_position') return 'close_position';
        if (x === 'hold' || x === 'wait' || x === 'no_trade') return 'hold';
        return 'hold';
      };
      const normalizeSymbol = (s) => this.normalizeBaseSymbol(s);
      const d = rawObj.trading_decision ? rawObj.trading_decision : rawObj;
      return {
        action: normalizeAction(d.action),
        symbol: normalizeSymbol(d.symbol),
        quantity: d.quantity !== undefined ? Number(d.quantity) : undefined,
        reasoning: d.reasoning || rawObj.reasoning,
        leverage: d.leverage !== undefined ? Number(d.leverage) : undefined
      };
    } catch (_) {
      return { action: 'hold', reasoning: '解析失败，保持当前持仓' };
    }
  }

  async executeTradingDecision(decision, marketData) {
    try {
      if (decision.action === 'buy' && decision.symbol) {
        await this.executeBuyOrder(decision, marketData);
      } else if (decision.action === 'sell' && decision.symbol) {
        await this.executeSellOrder(decision, marketData);
      } else if (decision.action === 'close_position' && decision.symbol) {
        const base = this.normalizeBaseSymbol(decision.symbol);
        const pos = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
        if (pos) {
          const qty = decision.quantity && decision.quantity > 0 ? decision.quantity : Math.abs(Number(pos.quantity));
          // 根据持仓方向决定平仓方向：多头用sell平仓，空头用buy平仓
          const posQty = Number(pos.quantity);
          if (posQty > 0) {
            // 多头：使用sell平仓
            await this.executeSellOrder({ ...decision, symbol: base, quantity: qty }, marketData);
          } else if (posQty < 0) {
            // 空头：使用buy平仓
            await this.executeBuyOrder({ ...decision, symbol: base, quantity: qty }, marketData);
          }
        }
      }
      await this.updateAccountState();
    } catch (e) {
      console.error('交易执行失败:', e.message);
    }
    this.saveState();
  }

  async executeBuyOrder(decision) {
    try {
      const base = this.normalizeBaseSymbol(decision.symbol);
      const symbol = this.isFutures ? `${base}/USDT:USDT` : `${base}/USDT`;
      const quantity = decision.quantity || 0.001;
      const leverage = this.isFutures && decision.leverage !== undefined ? Math.floor(Number(decision.leverage)) : undefined;
      if (this.isFutures) {
        try { await this.exchange.setMarginMode('ISOLATED', symbol); } catch (_) {}
        try { if (leverage !== undefined) await this.exchange.setLeverage(leverage, symbol); } catch (_) {}
      }
      const order = await this.exchange.createOrder(
        symbol, 'market', 'buy', quantity, null,
        this.isFutures ? (leverage !== undefined ? { leverage, marginType: 'isolated' } : { marginType: 'isolated' }) : undefined
      );
      this.addPosition(base, quantity, order.average || order.price);
      this.logTrade('BUY', base, quantity, order.average || order.price, order.id);
    } catch (e) {
      console.error('买入失败:', e.message);
    }
  }

  async executeSellOrder(decision) {
    try {
      const base = this.normalizeBaseSymbol(decision.symbol);
      const symbol = this.isFutures ? `${base}/USDT:USDT` : `${base}/USDT`;
      const quantity = decision.quantity || 0.001;
      const leverage = this.isFutures && decision.leverage !== undefined ? Math.floor(Number(decision.leverage)) : undefined;
      if (this.isFutures) {
        try { await this.exchange.setMarginMode('ISOLATED', symbol); } catch (_) {}
        try { if (leverage !== undefined) await this.exchange.setLeverage(leverage, symbol); } catch (_) {}
      }
      const order = await this.exchange.createOrder(
        symbol, 'market', 'sell', quantity, null,
        this.isFutures ? (leverage !== undefined ? { leverage, marginType: 'isolated' } : { marginType: 'isolated' }) : undefined
      );
      this.removePosition(base, quantity);
      this.logTrade('SELL', base, quantity, order.average || order.price, order.id);
    } catch (e) {
      console.error('卖出失败:', e.message);
    }
  }

  addPosition(symbol, quantity, entryPrice) {
    const base = this.normalizeBaseSymbol(symbol);
    const existing = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
    if (existing) {
      const totalQ = parseFloat(existing.quantity) + parseFloat(quantity);
      const avgPrice = (parseFloat(existing.entry_price) * parseFloat(existing.quantity) + parseFloat(entryPrice) * parseFloat(quantity)) / totalQ;
      existing.quantity = totalQ; existing.entry_price = avgPrice;
    } else {
      this.state.positions.push({
        symbol: base,
        quantity,
        entry_price: entryPrice,
        current_price: entryPrice,
        liquidation_price: entryPrice * 0.9,
        unrealized_pnl: 0,
        leverage: 1,
        exit_plan: { profit_target: entryPrice * 1.1, stop_loss: entryPrice * 0.95, invalidation_condition: 'price_below_stop_loss' },
        confidence: 0.8,
        risk_usd: quantity * entryPrice,
        sl_oid: null, tp_oid: null, wait_for_fill: false, entry_oid: null,
        notional_usd: quantity * entryPrice
      });
    }
  }

  removePosition(symbol, quantity) {
    const base = this.normalizeBaseSymbol(symbol);
    const existing = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
    if (existing) {
      const remain = parseFloat(existing.quantity) - parseFloat(quantity);
      if (remain <= 0) {
        this.state.positions = this.state.positions.filter(p => this.normalizeBaseSymbol(p.symbol) !== base);
      } else {
        existing.quantity = remain;
      }
    }
  }

  async updateAccountState() {
    try {
      const balance = await this.exchange.fetchBalance();
      this.state.accountValue = balance.USDT?.total || 10000;
      this.state.availableCash = balance.USDT?.free || 10000;
      this.state.totalReturn = ((this.state.accountValue - 10000) / 10000) * 100;
      if (this.isFutures) {
        const positions = await this.exchange.fetchPositions();
        const active = positions.filter(p => parseFloat(p.contracts) !== 0);
        this.state.positions = [];
        for (const position of active) {
          if (parseFloat(position.contracts) !== 0) {
            const symbol = this.normalizeBaseSymbol(position.symbol);
            const contracts = parseFloat(position.contracts);
            // 根据side字段确定quantity的符号：long=正数，short=负数
            const quantity = (position.side === 'long' || position.side === 'buy') ? Math.abs(contracts) : -Math.abs(contracts);
            // 计算杠杆：名义价值 / 保证金
            const notional = Math.abs(parseFloat(position.notional) || 0);
            const initialMargin = parseFloat(position.initialMargin) || 0;
            const leverage = notional > 0 && initialMargin > 0 ? Math.round((notional / initialMargin) * 10) / 10 : 1;
            this.state.positions.push({
              symbol,
              quantity, // 正数=多仓，负数=空仓
              entry_price: parseFloat(position.entryPrice),
              current_price: parseFloat(position.markPrice),
              liquidation_price: parseFloat(position.liquidationPrice) || 0,
              unrealized_pnl: parseFloat(position.unrealizedPnl),
              leverage, // 根据名义价值和保证金计算
              exit_plan: {
                profit_target: parseFloat(position.entryPrice) * 1.1,
                stop_loss: parseFloat(position.entryPrice) * 0.95,
                invalidation_condition: 'price_below_stop_loss'
              },
              confidence: 0.8,
              risk_usd: Math.abs(quantity) * parseFloat(position.entryPrice),
              sl_oid: null, tp_oid: null, wait_for_fill: false, entry_oid: null,
              notional_usd: notional
            });
          }
        }
      }
    } catch (e) {
      console.error('更新账户失败:', e.message);
    }
  }

  logTrade(side, symbol, quantity, price, orderId) {
    const trade = {
      timestamp: new Date().toISOString(),
      side, symbol, quantity, price, orderId,
      environment: this.isFutures ? 'demo.binance.com' : 'spot.testnet',
      accountValue: this.state.accountValue,
      totalReturn: this.state.totalReturn
    };
    if (!this.state.trades) this.state.trades = [];
    this.state.trades.unshift(trade);
    this.saveState();
    // Mirror to backend/data/trades.json for web API consumption
    try {
      let obj = { trades: [] };
      if (existsSync(this.tradesFile)) {
        try { obj = JSON.parse(readFileSync(this.tradesFile, 'utf8')); } catch (_) {}
      }
      if (!Array.isArray(obj.trades)) obj.trades = [];
      obj.trades.unshift({
        model_id: 'default',
        exit_time: Math.floor(Date.now() / 1000),
        realized_net_pnl: side === 'BUY' ? 0 : 0,
        side, symbol, quantity, price, orderId
      });
      writeFileSync(this.tradesFile, JSON.stringify(obj, null, 2), 'utf8');
    } catch (_) {}
  }

  saveConversation(userPrompt, aiResponse, decision) {
    // 解析AI响应中的JSON
    let aiParsed = null;
    try {
      if (typeof aiResponse === 'string') {
        const match = aiResponse.match(/\{[\s\S]*\}/);
        if (match) aiParsed = JSON.parse(match[0]);
      }
    } catch (_) {}

    // 从 aiParsed 中提取"原始决策对象"和"候选数组"，用于完整留存
    let decisionRaw = null;
    let decisionsArray = null;
    try {
      if (aiParsed && typeof aiParsed === 'object') {
        if (aiParsed.trading_decision) {
          decisionRaw = aiParsed.trading_decision;
        }
        if (Array.isArray(aiParsed.trading_decisions)) {
          decisionsArray = aiParsed.trading_decisions;
          // 若尚未从 trading_decision 取到主决策，则优先取与现有持仓相关的项
          if (!decisionRaw) {
            const currentSymbols = this.state.positions.map(p => p.symbol);
            const pick = decisionsArray.find(x => currentSymbols.includes(String(x.symbol || '').toUpperCase().replace(/:USDT$/,'').split('/')[0]))
              || decisionsArray[0];
            decisionRaw = pick || null;
          }
        }
      }
    } catch (_) {}

    const conversation = {
      timestamp: new Date().toISOString(),
      invocationCount: this.state.invocationCount,
      userPrompt,
      aiResponse,
      aiParsed,
      // decision: 原始/丰富结构（保持完整字段用于分析）
      decision: decisionRaw || aiParsed?.trading_decision || null,
      // decision_normalized: 供程序执行的归一化决策
      decision_normalized: decision,
      // trading_decisions: 若模型输出了候选数组，也一并保存
      trading_decisions: decisionsArray || null,
      // chain_of_thought: 从aiParsed中提取
      chain_of_thought: aiParsed?.chain_of_thought || null,
      accountValue: this.state.accountValue,
      totalReturn: this.state.totalReturn
    };
    if (!this.conversations.conversations) this.conversations.conversations = [];
    this.conversations.conversations.unshift(conversation);
    this.saveConversations();
  }

  async runTradingCycle() {
    try {
      // 在每次交易循环开始时检查是否需要重新加载模板
      this.checkAndReloadTemplates();
      
      const marketData = await this.getMarketData();
      const userPrompt = this.generateUserPrompt(marketData);
      const aiResponse = await this.callDeepSeekAPI(userPrompt);
      if (!aiResponse) {
        const decision = { action: 'hold', reasoning: 'no_ai_response' };
        await this.executeTradingDecision(decision, marketData);
        this.saveConversation(userPrompt, aiResponse, decision);
        return;
      }
      const decision = this.parseAIResponse(aiResponse);
      await this.executeTradingDecision(decision, marketData);
      this.saveConversation(userPrompt, aiResponse, decision);
    } catch (e) {
      console.error('交易循环失败:', e.message);
      // 兜底：写入最小对话，保证前端可读
      try {
        const note = `CYCLE ERROR: ${String(e?.message || e)}\n`;
        const userPrompt = 'MARKET DATA UNAVAILABLE';
        const aiResponse = null;
        const decision = { action: 'hold', reasoning: 'error' };
        this.saveConversation(userPrompt, aiResponse, decision);
      } catch (_) {}
    }
  }

  async run() {
    try {
      if (!this.aiApiKey) {
        console.error('缺少 AI API Key');
        return;
      }
      const ok = await this.initializeExchange();
      if (!ok) {
        // 离线模式也进行一次循环，以便前端与对话有数据可用
        console.warn('进入离线模式：使用本地伪数据生成提示与对话');
      } else {
        // 初始化成功后立即更新账户状态（获取交易所的实际余额）
        await this.updateAccountState();
        this.saveState(); // 保存初始状态
      }
      await this.runTradingCycle();
      console.log(`AI交易系统v2运行完成 (env=${this.tradingEnv}, ai=${this.aiProvider}:${this.aiModel})`);
    } catch (e) {
      console.error('系统运行失败:', e.message);
      process.exit(1);
    }
  }
}

async function main() {
  const sys = new AITradingSystemV2();
  await sys.run();
}

main().catch(console.error);



```

修复 `onApplyPrompt` 中调用 `onSave` 的问题：


```typescriptreact
"use client";
import { useEffect, useMemo, useState } from "react";

type Config = {
  trading_env?: string;
  allowed_symbols?: string[];
  ai?: { provider?: string; model?: string; presets?: Record<string, any> };
  data?: Record<string, any>;
};

export default function PromptEditorPanel() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(3);
  const [env, setEnv] = useState<string>("");
  const [ai, setAi] = useState<string>("");
  const [promptEnv, setPromptEnv] = useState<string>("demo-futures"); // Prompt环境切换，独立于交易环境
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [configUpdates, setConfigUpdates] = useState<any>(null);

  // 加载prompt的函数
  async function loadPrompts(env: string) {
    try {
      const url = `/api/nof1/ai/prompts${env ? `?env=${env}` : ''}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pj = await r.json();
      setSystemPrompt(pj.system || "");
      setUserPrompt(pj.user || "");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [c, s] = await Promise.all([
          fetch("/api/nof1/ai/config", { cache: "no-store" }),
          fetch("/api/nof1/ai/trading/status", { cache: "no-store" }),
        ]);
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setCfg(cj);
          setStatus(sj);
          const tradingEnv = String(cj?.trading_env || "demo-futures");
          setEnv(tradingEnv);
          // 如果有运行的bot，使用bot的环境；否则使用配置的默认环境
          const activeEnv = sj?.running && sj?.env ? sj.env : tradingEnv;
          setPromptEnv(activeEnv);
          setAi("");
          // 加载对应环境的prompt（使用activeEnv）
          await loadPrompts(activeEnv);
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // 当promptEnv改变时，重新加载prompt
  useEffect(() => {
    if (promptEnv && !loading) {
      loadPrompts(promptEnv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptEnv]);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // 保存成功提示
      const saved = await r.json();
      setError(null);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onApplyPrompt() {
    if (!status?.running) {
      setError('没有运行中的Bot，无法应用Prompt');
      return;
    }
    if (status?.env !== promptEnv) {
      setError(`当前运行的Bot环境是 ${status.env}，但编辑的是 ${promptEnv} 的模板，不匹配！`);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      
      // 先保存文件
      const saveR = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!saveR.ok) throw new Error(`保存失败: HTTP ${saveR.status}`);
      
      // 然后触发重新加载
      const reloadR = await fetch("/api/nof1/ai/trading/reload-prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ env: promptEnv })
      });
      if (!reloadR.ok) throw new Error(`应用失败: HTTP ${reloadR.status}`);
      
      const result = await reloadR.json();
      setError(null);
      // 可以显示成功消息（通过清除错误消息）
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSuggest() {
    try {
      setSuggesting(true);
      setError(null);
      setRationale(null);
      setConfigUpdates(null);
      const r = await fetch("/api/nof1/ai/prompt/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const s = j?.suggestion || {};
      if (typeof s.system_prompt_en === "string") setSystemPrompt(s.system_prompt_en);
      if (typeof s.user_prompt_en === "string") setUserPrompt(s.user_prompt_en);
      if (s.rationale_en) setRationale(String(s.rationale_en));
      if (s.config_updates) setConfigUpdates(s.config_updates);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function onApplyConfigUpdates() {
    if (!configUpdates) return;
    try {
      const r = await fetch("/api/nof1/ai/config/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config_updates: configUpdates })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next = await r.json();
      setCfg(next);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const whitelist = useMemo(() => (cfg?.allowed_symbols || []).join(", "), [cfg]);
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);
  const isRunning = !!status?.running;

  async function startTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intervalMinutes, env, ai })
      });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function stopTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  return (
    <aside className="h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Prompt 工作台</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ color: "var(--btn-inactive-fg)", border: "1px solid var(--chip-border)" }}
            onClick={onSuggest}
            disabled={suggesting}
          >{suggesting ? '建议中…' : '建议'}</button>
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
            onClick={onSave}
            disabled={saving}
            title="保存Prompt模板到文件（不会立即生效，需要重启Bot或点击'应用Prompt'）"
          >{saving ? '保存中…' : '保存'}</button>
          {isRunning && status?.env === promptEnv && (
            <button
              className="rounded px-2 py-1 chip-btn"
              style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
              onClick={onApplyPrompt}
              disabled={saving}
              title="保存并立即应用到运行中的Bot"
            >{saving ? '应用中…' : '应用Prompt'}</button>
          )}
        </div>
      </div>

      {/* Bot选择 - 选择要编辑的Bot */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>选择 Bot</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易环境</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={promptEnv}
                  onChange={(e) => setPromptEnv(e.target.value)}>
            <option value="demo-futures">demo-futures (期货演示)</option>
            <option value="demo-spot">demo-spot (现货演示)</option>
            <option value="futures">futures (期货生产)</option>
            <option value="spot">spot (现货生产)</option>
          </select>
        </div>
        <div className="text-[10px] mb-2" style={{ color: 'var(--muted-text)' }}>
          {promptEnv.includes('futures') ? '⚠️ 将编辑期货Bot的Prompt（支持杠杆、做多做空）' : '⚠️ 将编辑现货Bot的Prompt（无杠杆、只能做多）'}
        </div>
        {status?.running && status?.env && (
          <div className="text-[10px]" style={{ color: status.env === promptEnv ? 'var(--success)' : 'var(--warning)' }}>
            {status.env === promptEnv 
              ? `✅ 当前运行的Bot使用此环境 (pid=${status.pid})`
              : `⚠️ 当前运行的是 ${status.env} Bot，编辑的模板不会影响运行中的Bot`
            }
          </div>
        )}
      </div>

      {/* 交易控制 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易类型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}>
            {['demo-futures','demo-spot','futures','spot'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">AI模型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={ai}
                  onChange={(e) => setAi(e.target.value)}>
            <option value="">(默认)</option>
            {aiPresetKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">间隔(分)</label>
          <input className="col-span-2 rounded border px-2 py-1"
                 style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                 type="number" min={1} value={intervalMinutes}
                 onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))} />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }}
                  onClick={startTrading}
                  disabled={isRunning}>启动</button>
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }}
                  onClick={stopTrading}
                  disabled={!isRunning}>停止</button>
          <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
            状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--chip-border)", color: "var(--danger)" }}>{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500">加载中…</div>
      ) : (
        <>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>System Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-40 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>User Prompt</div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-48 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>

          {rationale && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>Rationale</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{rationale}</pre>
            </div>
          )}

          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>符号白名单</div>
            <div className="text-xs" style={{ color: "var(--foreground)" }}>{whitelist || '—'}</div>
          </div>

          {configUpdates && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>建议的配置更新</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2 mb-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{JSON.stringify(configUpdates, null, 2)}</pre>
              <button
                className="rounded px-2 py-1 chip-btn text-xs"
                style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
                onClick={onApplyConfigUpdates}
              >应用配置更新</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}



```

## 实现总结

### 核心改动

#### 1. 前端 - Bot选择机制
- 将“Prompt环境”改为“选择 Bot”
- 用户先选择要编辑的bot（demo-futures/demo-spot/futures/spot）
- 根据选择的bot环境加载对应的prompt模板
- 显示当前运行的bot状态，并提示是否匹配

#### 2. 前端 - 应用Prompt按钮
- 仅在bot运行中且环境匹配时显示
- 点击后：保存文件 → 创建重载标记 → bot在下次循环时自动重载
- 无需重启bot即可生效

#### 3. 后端API - 重载端点
- `POST /api/nof1/ai/trading/reload-prompts`
- 创建标记文件 `.reload-prompts-{env}.marker`

#### 4. AI系统 - 标记文件检查机制
- 在每次 `runTradingCycle()` 开始时检查标记文件
- 如果存在标记，重新加载模板并删除标记
- 添加 `reloadTemplates()` 和 `checkAndReloadTemplates()` 方法

#### 5. 代码优化
- 移除多余的 `renderSections` 调用（新模板已分离，不需要条件渲染）
- 保留兼容性（检查是否有条件标签）

### 完整流程

```
用户操作流程：
1. 选择Bot（如 demo-futures）→ 系统加载对应的prompt
2. 编辑prompt
3. 点击"保存" → 保存到文件（不立即生效）
4. 如果bot运行中且环境匹配 → 显示"应用Prompt"按钮
5. 点击"应用Prompt" → 保存 + 创建标记文件
6. Bot在下一次交易循环时自动检测并重载 ✅
```

### 关键特性

1. 手动控制：不自动重载，完全由用户控制
2. 环境匹配：严格检查bot环境，避免编辑错误模板
3. 为多Bot扩展准备：选择机制已支持，可扩展到多bot管理
4. 延迟生效：在下次交易循环时生效，不影响当前执行

所有修改已完成并通过 lint 检查。用户可以：
- 选择要编辑的bot
- 编辑对应的prompt模板
- 手动应用prompt到运行中的bot（无需重启）

```plaintext
用户操作流程：
1. 选择Bot（如 demo-futures）→ 系统加载对应的prompt
2. 编辑prompt
3. 点击"保存" → 保存到文件（不立即生效）
4. 如果bot运行中且环境匹配 → 显示"应用Prompt"按钮
5. 点击"应用Prompt" → 保存 + 创建标记文件
6. Bot在下一次交易循环时自动检测并重载 ✅
```

---

**User**

感觉跟我想的不太一样， 我想要的 交易控制 bot是指  选择不同的[交易类型，AI模型， 时间间隔]， 在现在的交易控制区应该加入一个添加 交易bot的按钮，将现有的交易控制区内的面板做成一个组件。 而prompt编辑区则 先下拉选择 一个已有的交易bot, 然后复用现在的前端prompt studio区组件。这只是我初步的描述，你先帮我理清楚一下

---

**Cursor**


梳理需求和架构设计。分析当前实现，明确需要的改动：


梳理架构设计，理清需求：


```markdown
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

```

已整理架构设计文档。要点如下：

## 架构理解

### 核心概念

1. Bot定义：每个Bot由 `[env, ai, intervalMinutes]` 唯一标识
   - 例如：`demo-futures` + `deepseek` + `3分钟` = 一个Bot

2. 两个独立区域：
   - 交易控制区：管理多个Bot（添加、启动、停止）
   - Prompt编辑区：选择Bot后编辑其Prompt

3. 组件化：
   - 交易控制面板 → `BotControlPanel` 组件（可复用）
   - 每个Bot → `BotCard` 组件
   - Prompt Studio → 复用现有组件

### 数据结构

```
Bot配置：
{
  id: "demo-futures-deepseek-3",
  env: "demo-futures",
  ai: "deepseek", 
  intervalMinutes: 3,
  name: "期货快速策略" (可选)
}
```

### 需要确认的问题

1. Bot唯一标识方式？
   - 方案A：组合ID `{env}-{ai}-{interval}`（如 `demo-futures-deepseek-3`）
   - 方案B：UUID + 配置信息
   - 推荐：方案A，如果冲突加序号后缀

2. 相同配置能否创建多个Bot？
   - 允许：支持A/B测试
   - 不允许：提示已存在

3. Prompt存储策略？
   - 方案A：相同env的Bot共享prompt（当前实现）
   - 方案B：每个Bot独立的prompt

4. 运行中的Bot能否修改配置？
   - 需先停止再修改，或只允许部分字段修改

5. Bot数据查看方式？
   - BotCard上显示基础统计
   - 点击查看详情
   - 主界面按Bot筛选数据

### 建议的实施顺序

**Phase 1：后端多Bot支持**
- 改造 `runner.js` 支持多Bot管理
- 添加Bot配置存储（`bots.json`）
- 修改AI系统支持Bot ID参数
- 实现Bot管理API

**Phase 2：前端组件化**
- 提取交易控制面板为独立组件
- 创建BotCard组件
- 创建Bot列表管理器
- 实现"添加Bot"功能

**Phase 3：Prompt编辑改造**
- 修改PromptEditorPanel，添加Bot选择下拉框
- 根据选择的Bot加载对应prompt

### 可视化结构

```
┌─────────────────────────────────────────┐
│      TradingBotsManager (主面板)        │
├─────────────────────────────────────────┤
│  Bot列表区                               │
│  ┌─────────────┐  ┌─────────────┐      │
│  │  BotCard    │  │  BotCard    │      │
│  │ (demo-...)  │  │ (spot-...)  │      │
│  │ [启动][停止]│  │ [启动][停止]│      │
│  └─────────────┘  └─────────────┘      │
│  [+ 添加Bot]                            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      PromptEditorPanel (独立面板)      │
├─────────────────────────────────────────┤
│  [选择Bot: demo-futures-deepseek-3 ▼]  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   Prompt Studio (复用现有)      │   │
│  │  - System Prompt                │   │
│  │  - User Prompt                  │   │
│  │  [保存] [应用Prompt]            │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

请确认：
1. 上述理解是否准确？
2. 对上述问题的选择？
3. 是否有其他需求或约束？

```plaintext
Bot配置：
{
  id: "demo-futures-deepseek-3",
  env: "demo-futures",
  ai: "deepseek", 
  intervalMinutes: 3,
  name: "期货快速策略" (可选)
}
```

```plaintext
┌─────────────────────────────────────────┐
│      TradingBotsManager (主面板)        │
├─────────────────────────────────────────┤
│  Bot列表区                               │
│  ┌─────────────┐  ┌─────────────┐      │
│  │  BotCard    │  │  BotCard    │      │
│  │ (demo-...)  │  │ (spot-...)  │      │
│  │ [启动][停止]│  │ [启动][停止]│      │
│  └─────────────┘  └─────────────┘      │
│  [+ 添加Bot]                            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      PromptEditorPanel (独立面板)      │
├─────────────────────────────────────────┤
│  [选择Bot: demo-futures-deepseek-3 ▼]  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   Prompt Studio (复用现有)      │   │
│  │  - System Prompt                │   │
│  │  - User Prompt                  │   │
│  │  [保存] [应用Prompt]            │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

**User**

你先帮我看看当前交易控制面板

---

**Cursor**


查看当前交易控制面板的实现：


分析当前交易控制面板的结构，创建分析文档：


```markdown
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

```

## 当前交易控制面板分析总结

### 1. 当前位置和结构

**位置**：`PromptEditorPanel.tsx` 第 267-309 行

**包含内容**：
```
交易控制区
├── 表单配置（3个字段）
│   ├── 交易类型 (env): select下拉框
│   ├── AI模型 (ai): select下拉框  
│   └── 间隔(分) (intervalMinutes): number输入
│
├── 控制按钮
│   ├── [启动] 按钮 (调用 startTrading)
│   ├── [停止] 按钮 (调用 stopTrading)
│   └── 状态显示文本
│
└── 状态数据
    ├── status (从 API 获取)
    ├── isRunning (计算得出)
    └── aiPresetKeys (从配置获取)
```

### 2. 关键代码

**状态管理**：
```tsx
const [env, setEnv] = useState<string>("");
const [ai, setAi] = useState<string>("");
const [intervalMinutes, setIntervalMinutes] = useState<number>(3);
const [status, setStatus] = useState<any>(null);
```

**启动函数**：
```tsx
async function startTrading() {
  fetch('/api/nof1/ai/trading/start', {
    method: 'POST',
    body: JSON.stringify({ intervalMinutes, env, ai })
  });
}
```

**停止函数**：
```tsx
async function stopTrading() {
  fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
}
```

### 3. 需要提取的部分

1. UI部分（267-309行）
   - 整个交易控制面板的 `<div>`
   - 3个表单控件
   - 启动/停止按钮和状态显示

2. 逻辑部分
   - `startTrading()` 函数
   - `stopTrading()` 函数
   - 状态管理（env, ai, intervalMinutes）

3. 依赖数据
   - `aiPresetKeys` - 需要从外部传入
   - `status` - 需要从外部传入或内部获取

### 4. 建议的组件设计

```tsx
// BotControlPanel.tsx (可复用组件)
interface BotControlPanelProps {
  bot?: BotConfig;              // 可选：如果传入则显示bot配置
  status?: BotStatus;           // bot运行状态
  aiPresets?: string[];         // AI预设列表
  onStart: (config: BotConfig) => void;
  onStop: (botId: string) => void;
}
```

## 需要确认

1. 是否先提取 `BotControlPanel` 组件，保持当前单Bot功能不变？
2. 还是直接实现多Bot架构（包括后端改造）？

建议顺序：
- 先提取组件 → 保持兼容 → 再实现多Bot → 逐步迁移

需要我按此顺序开始吗？

```plaintext
交易控制区
├── 表单配置（3个字段）
│   ├── 交易类型 (env): select下拉框
│   ├── AI模型 (ai): select下拉框  
│   └── 间隔(分) (intervalMinutes): number输入
│
├── 控制按钮
│   ├── [启动] 按钮 (调用 startTrading)
│   ├── [停止] 按钮 (调用 stopTrading)
│   └── 状态显示文本
│
└── 状态数据
    ├── status (从 API 获取)
    ├── isRunning (计算得出)
    └── aiPresetKeys (从配置获取)
```

```typescriptreact
const [env, setEnv] = useState<string>("");
const [ai, setAi] = useState<string>("");
const [intervalMinutes, setIntervalMinutes] = useState<number>(3);
const [status, setStatus] = useState<any>(null);
```

```typescriptreact
async function startTrading() {
  fetch('/api/nof1/ai/trading/start', {
    method: 'POST',
    body: JSON.stringify({ intervalMinutes, env, ai })
  });
}
```

```typescriptreact
async function stopTrading() {
  fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
}
```

```typescriptreact
// BotControlPanel.tsx (可复用组件)
interface BotControlPanelProps {
  bot?: BotConfig;              // 可选：如果传入则显示bot配置
  status?: BotStatus;           // bot运行状态
  aiPresets?: string[];         // AI预设列表
  onStart: (config: BotConfig) => void;
  onStop: (botId: string) => void;
}
```

---

**User**

我的想法是将当前的 交易控制区那样做成一个 botcontrolPanel组件。交易控制区初始显示为空， 有一个添加 交易bot 按钮，就在交易控制区有一个这样的组件。也就是先将 其组件化，并且将 prompt编辑跟 交易bot对接。 先实现单个的 

---

**Cursor**


分步实现：
1. 提取 BotControlPanel 组件
2. 交易控制区初始为空，添加“添加Bot”按钮
3. 添加Bot后显示 BotControlPanel
4. 将 prompt 编辑与选中的 bot 对接

开始实现：


```typescriptreact
"use client";
import { useState, useEffect } from "react";

export interface BotConfig {
  id?: string;
  env: 'demo-futures' | 'demo-spot' | 'futures' | 'spot';
  ai: string;
  intervalMinutes: number;
  name?: string;
}

export interface BotStatus {
  running: boolean;
  pid?: number;
  startedAt?: string;
  lastExitCode?: number;
  env?: string;
  ai?: string;
  intervalMinutes?: number;
}

interface BotControlPanelProps {
  bot: BotConfig;
  status?: BotStatus;
  aiPresets: string[];
  onStart: (config: BotConfig) => Promise<void>;
  onStop: (botId: string) => Promise<void>;
  onDelete?: (botId: string) => Promise<void>;
  onStatusChange?: (status: BotStatus) => void;
}

export default function BotControlPanel({
  bot,
  status,
  aiPresets,
  onStart,
  onStop,
  onDelete,
  onStatusChange
}: BotControlPanelProps) {
  const [env, setEnv] = useState(bot.env);
  const [ai, setAi] = useState(bot.ai);
  const [intervalMinutes, setIntervalMinutes] = useState(bot.intervalMinutes);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 当bot配置改变时更新本地状态
  useEffect(() => {
    setEnv(bot.env);
    setAi(bot.ai);
    setIntervalMinutes(bot.intervalMinutes);
  }, [bot]);

  // 轮询状态（如果bot正在运行）
  useEffect(() => {
    if (!status?.running) return;
    
    const interval = setInterval(async () => {
      try {
        const r = await fetch('/api/nof1/ai/trading/status', { cache: 'no-store' });
        const s = await r.json();
        if (onStatusChange) {
          onStatusChange(s);
        }
      } catch (e) {
        console.error('获取状态失败:', e);
      }
    }, 3000); // 每3秒轮询一次

    return () => clearInterval(interval);
  }, [status?.running, onStatusChange]);

  const isRunning = !!status?.running;

  async function handleStart() {
    try {
      setStarting(true);
      setError(null);
      const config: BotConfig = {
        ...bot,
        env,
        ai,
        intervalMinutes
      };
      await onStart(config);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setStarting(false);
    }
  }

  async function handleStop() {
    try {
      setStopping(true);
      setError(null);
      await onStop(bot.id || 'default');
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setStopping(false);
    }
  }

  async function handleDelete() {
    if (!onDelete || !bot.id) return;
    if (!confirm(`确定要删除Bot "${bot.name || bot.id}"吗？`)) return;
    try {
      await onDelete(bot.id);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const canEdit = !isRunning;

  return (
    <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
          {bot.name || `Bot: ${bot.env}`}
        </div>
        {onDelete && bot.id && (
          <button
            className="text-[10px] px-1 py-0.5 rounded"
            style={{ color: 'var(--danger)', border: '1px solid var(--chip-border)' }}
            onClick={handleDelete}
            disabled={isRunning}
            title="删除Bot"
          >
            删除
          </button>
        )}
      </div>
      
      <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
        <label className="col-span-1">交易类型</label>
        <select 
          className="col-span-2 rounded border px-2 py-1"
          style={{ 
            borderColor: 'var(--panel-border)', 
            background: 'var(--panel-bg)', 
            color: 'var(--foreground)',
            opacity: canEdit ? 1 : 0.6
          }}
          value={env}
          onChange={(e) => setEnv(e.target.value as BotConfig['env'])}
          disabled={!canEdit}
        >
          {['demo-futures','demo-spot','futures','spot'].map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        
        <label className="col-span-1">AI模型</label>
        <select 
          className="col-span-2 rounded border px-2 py-1"
          style={{ 
            borderColor: 'var(--panel-border)', 
            background: 'var(--panel-bg)', 
            color: 'var(--foreground)',
            opacity: canEdit ? 1 : 0.6
          }}
          value={ai}
          onChange={(e) => setAi(e.target.value)}
          disabled={!canEdit}
        >
          <option value="">(默认)</option>
          {aiPresets.map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        
        <label className="col-span-1">间隔(分)</label>
        <input 
          className="col-span-2 rounded border px-2 py-1"
          style={{ 
            borderColor: 'var(--panel-border)', 
            background: 'var(--panel-bg)', 
            color: 'var(--foreground)',
            opacity: canEdit ? 1 : 0.6
          }}
          type="number" 
          min={1} 
          value={intervalMinutes}
          onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))}
          disabled={!canEdit}
        />
      </div>
      
      {error && (
        <div className="mb-2 text-[10px]" style={{ color: 'var(--danger)' }}>
          {error}
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <button 
          className="rounded px-2 py-1 chip-btn text-xs"
          style={{ 
            background: isRunning ? 'var(--btn-inactive-bg)' : 'var(--btn-active-bg)', 
            color: isRunning ? 'var(--btn-inactive-fg)' : 'var(--btn-active-fg)'
          }}
          onClick={handleStart}
          disabled={isRunning || starting}
        >
          {starting ? '启动中…' : '启动'}
        </button>
        
        <button 
          className="rounded px-2 py-1 chip-btn text-xs"
          style={{ 
            color: 'var(--btn-inactive-fg)', 
            border: '1px solid var(--chip-border)'
          }}
          onClick={handleStop}
          disabled={!isRunning || stopping}
        >
          {stopping ? '停止中…' : '停止'}
        </button>
        
        <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
          状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}
        </div>
      </div>
      
      {bot.id && (
        <div className="mt-1 text-[10px]" style={{ color: 'var(--muted-text)' }}>
          ID: {bot.id}
        </div>
      )}
    </div>
  );
}

```

创建添加 Bot 对话框组件，并修改 PromptEditorPanel：


```typescriptreact
"use client";
import { useState } from "react";
import type { BotConfig } from "./BotControlPanel";

interface AddBotDialogProps {
  open: boolean;
  aiPresets: string[];
  onClose: () => void;
  onAdd: (bot: BotConfig) => void;
}

export default function AddBotDialog({
  open,
  aiPresets,
  onClose,
  onAdd
}: AddBotDialogProps) {
  const [env, setEnv] = useState<BotConfig['env']>('demo-futures');
  const [ai, setAi] = useState<string>('');
  const [intervalMinutes, setIntervalMinutes] = useState<number>(3);
  const [name, setName] = useState<string>('');

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // 生成bot ID
    const botId = name || `${env}-${ai || 'default'}-${intervalMinutes}`;
    
    const bot: BotConfig = {
      id: botId,
      env,
      ai,
      intervalMinutes,
      name: name || undefined
    };
    
    onAdd(bot);
    
    // 重置表单
    setEnv('demo-futures');
    setAi('');
    setIntervalMinutes(3);
    setName('');
    onClose();
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="rounded border p-4 max-w-md w-full"
        style={{ 
          borderColor: 'var(--panel-border)', 
          background: 'var(--panel-bg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            添加交易Bot
          </div>
          <button
            className="text-xs px-2 py-1 rounded"
            style={{ color: 'var(--muted-text)', border: '1px solid var(--chip-border)' }}
            onClick={onClose}
          >
            取消
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block text-xs mb-1" style={{ color: 'var(--muted-text)' }}>
              Bot名称（可选）
            </label>
            <input
              type="text"
              className="w-full rounded border px-2 py-1 text-xs"
              style={{ 
                borderColor: 'var(--panel-border)', 
                background: 'var(--panel-bg)', 
                color: 'var(--foreground)' 
              }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：期货快速策略"
            />
          </div>

          <div className="mb-3">
            <label className="block text-xs mb-1" style={{ color: 'var(--muted-text)' }}>
              交易类型 *
            </label>
            <select
              className="w-full rounded border px-2 py-1 text-xs"
              style={{ 
                borderColor: 'var(--panel-border)', 
                background: 'var(--panel-bg)', 
                color: 'var(--foreground)' 
              }}
              value={env}
              onChange={(e) => setEnv(e.target.value as BotConfig['env'])}
              required
            >
              <option value="demo-futures">demo-futures (期货演示)</option>
              <option value="demo-spot">demo-spot (现货演示)</option>
              <option value="futures">futures (期货生产)</option>
              <option value="spot">spot (现货生产)</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-xs mb-1" style={{ color: 'var(--muted-text)' }}>
              AI模型
            </label>
            <select
              className="w-full rounded border px-2 py-1 text-xs"
              style={{ 
                borderColor: 'var(--panel-border)', 
                background: 'var(--panel-bg)', 
                color: 'var(--foreground)' 
              }}
              value={ai}
              onChange={(e) => setAi(e.target.value)}
            >
              <option value="">(默认)</option>
              {aiPresets.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-xs mb-1" style={{ color: 'var(--muted-text)' }}>
              间隔（分钟）*
            </label>
            <input
              type="number"
              min={1}
              className="w-full rounded border px-2 py-1 text-xs"
              style={{ 
                borderColor: 'var(--panel-border)', 
                background: 'var(--panel-bg)', 
                color: 'var(--foreground)' 
              }}
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))}
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 rounded px-2 py-1 text-xs"
              style={{ 
                background: 'var(--btn-active-bg)', 
                color: 'var(--btn-active-fg)' 
              }}
            >
              添加
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-xs"
              style={{ 
                color: 'var(--btn-inactive-fg)', 
                border: '1px solid var(--chip-border)' 
              }}
              onClick={onClose}
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

```

```typescriptreact
"use client";
import { useEffect, useMemo, useState } from "react";
import BotControlPanel, { type BotConfig, type BotStatus } from "../trading/BotControlPanel";
import AddBotDialog from "../trading/AddBotDialog";

type Config = {
  trading_env?: string;
  allowed_symbols?: string[];
  ai?: { provider?: string; model?: string; presets?: Record<string, any> };
  data?: Record<string, any>;
};

export default function PromptEditorPanel() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [bot, setBot] = useState<BotConfig | null>(null); // 当前选中的bot
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [promptEnv, setPromptEnv] = useState<string>("demo-futures"); // Prompt环境，基于选中的bot
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [configUpdates, setConfigUpdates] = useState<any>(null);

  // 加载prompt的函数
  async function loadPrompts(env: string) {
    try {
      const url = `/api/nof1/ai/prompts${env ? `?env=${env}` : ''}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pj = await r.json();
      setSystemPrompt(pj.system || "");
      setUserPrompt(pj.user || "");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [c, s] = await Promise.all([
          fetch("/api/nof1/ai/config", { cache: "no-store" }),
          fetch("/api/nof1/ai/trading/status", { cache: "no-store" }),
        ]);
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setCfg(cj);
          setStatus(sj);
          const tradingEnv = String(cj?.trading_env || "demo-futures");
          setEnv(tradingEnv);
          // 如果有运行的bot，使用bot的环境；否则使用配置的默认环境
          const activeEnv = sj?.running && sj?.env ? sj.env : tradingEnv;
          setPromptEnv(activeEnv);
          setAi("");
          // 加载对应环境的prompt（使用activeEnv）
          await loadPrompts(activeEnv);
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // 当promptEnv改变时，重新加载prompt
  useEffect(() => {
    if (promptEnv && !loading) {
      loadPrompts(promptEnv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptEnv]);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // 保存成功提示
      const saved = await r.json();
      setError(null);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onApplyPrompt() {
    if (!status?.running) {
      setError('没有运行中的Bot，无法应用Prompt');
      return;
    }
    if (status?.env !== promptEnv) {
      setError(`当前运行的Bot环境是 ${status.env}，但编辑的是 ${promptEnv} 的模板，不匹配！`);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      
      // 先保存文件
      const saveR = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!saveR.ok) throw new Error(`保存失败: HTTP ${saveR.status}`);
      
      // 然后触发重新加载
      const reloadR = await fetch("/api/nof1/ai/trading/reload-prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ env: promptEnv })
      });
      if (!reloadR.ok) throw new Error(`应用失败: HTTP ${reloadR.status}`);
      
      const result = await reloadR.json();
      setError(null);
      // 可以显示成功消息（通过清除错误消息）
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSuggest() {
    try {
      setSuggesting(true);
      setError(null);
      setRationale(null);
      setConfigUpdates(null);
      const r = await fetch("/api/nof1/ai/prompt/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const s = j?.suggestion || {};
      if (typeof s.system_prompt_en === "string") setSystemPrompt(s.system_prompt_en);
      if (typeof s.user_prompt_en === "string") setUserPrompt(s.user_prompt_en);
      if (s.rationale_en) setRationale(String(s.rationale_en));
      if (s.config_updates) setConfigUpdates(s.config_updates);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function onApplyConfigUpdates() {
    if (!configUpdates) return;
    try {
      const r = await fetch("/api/nof1/ai/config/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config_updates: configUpdates })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next = await r.json();
      setCfg(next);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const whitelist = useMemo(() => (cfg?.allowed_symbols || []).join(", "), [cfg]);
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);
  const isRunning = !!status?.running;

  async function startTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intervalMinutes, env, ai })
      });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function stopTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  return (
    <aside className="h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Prompt 工作台</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ color: "var(--btn-inactive-fg)", border: "1px solid var(--chip-border)" }}
            onClick={onSuggest}
            disabled={suggesting}
          >{suggesting ? '建议中…' : '建议'}</button>
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
            onClick={onSave}
            disabled={saving}
            title="保存Prompt模板到文件（不会立即生效，需要重启Bot或点击'应用Prompt'）"
          >{saving ? '保存中…' : '保存'}</button>
          {isRunning && status?.env === promptEnv && (
            <button
              className="rounded px-2 py-1 chip-btn"
              style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
              onClick={onApplyPrompt}
              disabled={saving}
              title="保存并立即应用到运行中的Bot"
            >{saving ? '应用中…' : '应用Prompt'}</button>
          )}
        </div>
      </div>

      {/* Bot选择 - 选择要编辑的Bot */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>选择 Bot</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易环境</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={promptEnv}
                  onChange={(e) => setPromptEnv(e.target.value)}>
            <option value="demo-futures">demo-futures (期货演示)</option>
            <option value="demo-spot">demo-spot (现货演示)</option>
            <option value="futures">futures (期货生产)</option>
            <option value="spot">spot (现货生产)</option>
          </select>
        </div>
        <div className="text-[10px] mb-2" style={{ color: 'var(--muted-text)' }}>
          {promptEnv.includes('futures') ? '⚠️ 将编辑期货Bot的Prompt（支持杠杆、做多做空）' : '⚠️ 将编辑现货Bot的Prompt（无杠杆、只能做多）'}
        </div>
        {status?.running && status?.env && (
          <div className="text-[10px]" style={{ color: status.env === promptEnv ? 'var(--success)' : 'var(--warning)' }}>
            {status.env === promptEnv 
              ? `✅ 当前运行的Bot使用此环境 (pid=${status.pid})`
              : `⚠️ 当前运行的是 ${status.env} Bot，编辑的模板不会影响运行中的Bot`
            }
          </div>
        )}
      </div>

      {/* 交易控制 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易类型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}>
            {['demo-futures','demo-spot','futures','spot'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">AI模型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={ai}
                  onChange={(e) => setAi(e.target.value)}>
            <option value="">(默认)</option>
            {aiPresetKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">间隔(分)</label>
          <input className="col-span-2 rounded border px-2 py-1"
                 style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                 type="number" min={1} value={intervalMinutes}
                 onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))} />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }}
                  onClick={startTrading}
                  disabled={isRunning}>启动</button>
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }}
                  onClick={stopTrading}
                  disabled={!isRunning}>停止</button>
          <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
            状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--chip-border)", color: "var(--danger)" }}>{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500">加载中…</div>
      ) : (
        <>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>System Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-40 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>User Prompt</div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-48 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>

          {rationale && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>Rationale</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{rationale}</pre>
            </div>
          )}

          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>符号白名单</div>
            <div className="text-xs" style={{ color: "var(--foreground)" }}>{whitelist || '—'}</div>
          </div>

          {configUpdates && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>建议的配置更新</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2 mb-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{JSON.stringify(configUpdates, null, 2)}</pre>
              <button
                className="rounded px-2 py-1 chip-btn text-xs"
                style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
                onClick={onApplyConfigUpdates}
              >应用配置更新</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}



```

```typescriptreact
"use client";
import { useEffect, useMemo, useState } from "react";
import BotControlPanel, { type BotConfig, type BotStatus } from "../trading/BotControlPanel";
import AddBotDialog from "../trading/AddBotDialog";

type Config = {
  trading_env?: string;
  allowed_symbols?: string[];
  ai?: { provider?: string; model?: string; presets?: Record<string, any> };
  data?: Record<string, any>;
};

export default function PromptEditorPanel() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [bot, setBot] = useState<BotConfig | null>(null); // 当前选中的bot
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [promptEnv, setPromptEnv] = useState<string>("demo-futures"); // Prompt环境，基于选中的bot
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [configUpdates, setConfigUpdates] = useState<any>(null);

  // 加载prompt的函数
  async function loadPrompts(env: string) {
    try {
      const url = `/api/nof1/ai/prompts${env ? `?env=${env}` : ''}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pj = await r.json();
      setSystemPrompt(pj.system || "");
      setUserPrompt(pj.user || "");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [c, s] = await Promise.all([
          fetch("/api/nof1/ai/config", { cache: "no-store" }),
          fetch("/api/nof1/ai/trading/status", { cache: "no-store" }),
        ]);
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setCfg(cj);
          setBotStatus(sj);
          
          // 如果有运行的bot，创建bot配置；否则不设置bot
          if (sj?.running && sj?.env) {
            const existingBot: BotConfig = {
              id: `bot-${sj.env}-${sj.ai || 'default'}-${sj.intervalMinutes || 3}`,
              env: sj.env as BotConfig['env'],
              ai: sj.ai || '',
              intervalMinutes: sj.intervalMinutes || 3
            };
            setBot(existingBot);
            setPromptEnv(sj.env);
            await loadPrompts(sj.env);
          } else {
            // 没有运行的bot，使用配置的默认环境加载prompt
            const tradingEnv = String(cj?.trading_env || "demo-futures");
            setPromptEnv(tradingEnv);
            await loadPrompts(tradingEnv);
          }
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // 当promptEnv改变时，重新加载prompt
  useEffect(() => {
    if (promptEnv && !loading) {
      loadPrompts(promptEnv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptEnv]);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // 保存成功提示
      const saved = await r.json();
      setError(null);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onApplyPrompt() {
    if (!status?.running) {
      setError('没有运行中的Bot，无法应用Prompt');
      return;
    }
    if (status?.env !== promptEnv) {
      setError(`当前运行的Bot环境是 ${status.env}，但编辑的是 ${promptEnv} 的模板，不匹配！`);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      
      // 先保存文件
      const saveR = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!saveR.ok) throw new Error(`保存失败: HTTP ${saveR.status}`);
      
      // 然后触发重新加载
      const reloadR = await fetch("/api/nof1/ai/trading/reload-prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ env: promptEnv })
      });
      if (!reloadR.ok) throw new Error(`应用失败: HTTP ${reloadR.status}`);
      
      const result = await reloadR.json();
      setError(null);
      // 可以显示成功消息（通过清除错误消息）
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSuggest() {
    try {
      setSuggesting(true);
      setError(null);
      setRationale(null);
      setConfigUpdates(null);
      const r = await fetch("/api/nof1/ai/prompt/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const s = j?.suggestion || {};
      if (typeof s.system_prompt_en === "string") setSystemPrompt(s.system_prompt_en);
      if (typeof s.user_prompt_en === "string") setUserPrompt(s.user_prompt_en);
      if (s.rationale_en) setRationale(String(s.rationale_en));
      if (s.config_updates) setConfigUpdates(s.config_updates);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function onApplyConfigUpdates() {
    if (!configUpdates) return;
    try {
      const r = await fetch("/api/nof1/ai/config/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config_updates: configUpdates })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next = await r.json();
      setCfg(next);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const whitelist = useMemo(() => (cfg?.allowed_symbols || []).join(", "), [cfg]);
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);
  const isRunning = !!status?.running;

  async function startTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intervalMinutes, env, ai })
      });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function stopTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  return (
    <aside className="h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Prompt 工作台</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ color: "var(--btn-inactive-fg)", border: "1px solid var(--chip-border)" }}
            onClick={onSuggest}
            disabled={suggesting}
          >{suggesting ? '建议中…' : '建议'}</button>
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
            onClick={onSave}
            disabled={saving}
            title="保存Prompt模板到文件（不会立即生效，需要重启Bot或点击'应用Prompt'）"
          >{saving ? '保存中…' : '保存'}</button>
          {isRunning && status?.env === promptEnv && (
            <button
              className="rounded px-2 py-1 chip-btn"
              style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
              onClick={onApplyPrompt}
              disabled={saving}
              title="保存并立即应用到运行中的Bot"
            >{saving ? '应用中…' : '应用Prompt'}</button>
          )}
        </div>
      </div>

      {/* Bot选择 - 选择要编辑的Bot */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>选择 Bot</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易环境</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={promptEnv}
                  onChange={(e) => setPromptEnv(e.target.value)}>
            <option value="demo-futures">demo-futures (期货演示)</option>
            <option value="demo-spot">demo-spot (现货演示)</option>
            <option value="futures">futures (期货生产)</option>
            <option value="spot">spot (现货生产)</option>
          </select>
        </div>
        <div className="text-[10px] mb-2" style={{ color: 'var(--muted-text)' }}>
          {promptEnv.includes('futures') ? '⚠️ 将编辑期货Bot的Prompt（支持杠杆、做多做空）' : '⚠️ 将编辑现货Bot的Prompt（无杠杆、只能做多）'}
        </div>
        {status?.running && status?.env && (
          <div className="text-[10px]" style={{ color: status.env === promptEnv ? 'var(--success)' : 'var(--warning)' }}>
            {status.env === promptEnv 
              ? `✅ 当前运行的Bot使用此环境 (pid=${status.pid})`
              : `⚠️ 当前运行的是 ${status.env} Bot，编辑的模板不会影响运行中的Bot`
            }
          </div>
        )}
      </div>

      {/* 交易控制 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易类型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}>
            {['demo-futures','demo-spot','futures','spot'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">AI模型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={ai}
                  onChange={(e) => setAi(e.target.value)}>
            <option value="">(默认)</option>
            {aiPresetKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">间隔(分)</label>
          <input className="col-span-2 rounded border px-2 py-1"
                 style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                 type="number" min={1} value={intervalMinutes}
                 onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))} />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }}
                  onClick={startTrading}
                  disabled={isRunning}>启动</button>
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }}
                  onClick={stopTrading}
                  disabled={!isRunning}>停止</button>
          <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
            状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--chip-border)", color: "var(--danger)" }}>{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500">加载中…</div>
      ) : (
        <>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>System Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-40 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>User Prompt</div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-48 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>

          {rationale && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>Rationale</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{rationale}</pre>
            </div>
          )}

          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>符号白名单</div>
            <div className="text-xs" style={{ color: "var(--foreground)" }}>{whitelist || '—'}</div>
          </div>

          {configUpdates && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>建议的配置更新</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2 mb-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{JSON.stringify(configUpdates, null, 2)}</pre>
              <button
                className="rounded px-2 py-1 chip-btn text-xs"
                style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
                onClick={onApplyConfigUpdates}
              >应用配置更新</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}



```

```typescriptreact
"use client";
import { useEffect, useMemo, useState } from "react";
import BotControlPanel, { type BotConfig, type BotStatus } from "../trading/BotControlPanel";
import AddBotDialog from "../trading/AddBotDialog";

type Config = {
  trading_env?: string;
  allowed_symbols?: string[];
  ai?: { provider?: string; model?: string; presets?: Record<string, any> };
  data?: Record<string, any>;
};

export default function PromptEditorPanel() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [bot, setBot] = useState<BotConfig | null>(null); // 当前选中的bot
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [promptEnv, setPromptEnv] = useState<string>("demo-futures"); // Prompt环境，基于选中的bot
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [configUpdates, setConfigUpdates] = useState<any>(null);

  // 加载prompt的函数
  async function loadPrompts(env: string) {
    try {
      const url = `/api/nof1/ai/prompts${env ? `?env=${env}` : ''}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pj = await r.json();
      setSystemPrompt(pj.system || "");
      setUserPrompt(pj.user || "");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [c, s] = await Promise.all([
          fetch("/api/nof1/ai/config", { cache: "no-store" }),
          fetch("/api/nof1/ai/trading/status", { cache: "no-store" }),
        ]);
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setCfg(cj);
          setBotStatus(sj);
          
          // 如果有运行的bot，创建bot配置；否则不设置bot
          if (sj?.running && sj?.env) {
            const existingBot: BotConfig = {
              id: `bot-${sj.env}-${sj.ai || 'default'}-${sj.intervalMinutes || 3}`,
              env: sj.env as BotConfig['env'],
              ai: sj.ai || '',
              intervalMinutes: sj.intervalMinutes || 3
            };
            setBot(existingBot);
            setPromptEnv(sj.env);
            await loadPrompts(sj.env);
          } else {
            // 没有运行的bot，使用配置的默认环境加载prompt
            const tradingEnv = String(cj?.trading_env || "demo-futures");
            setPromptEnv(tradingEnv);
            await loadPrompts(tradingEnv);
          }
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // 当bot改变时，更新promptEnv并加载prompt
  useEffect(() => {
    if (bot && !loading) {
      setPromptEnv(bot.env);
      loadPrompts(bot.env);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bot?.id]);
  
  // 当promptEnv改变时，重新加载prompt（手动切换时）
  useEffect(() => {
    if (promptEnv && !loading && bot) {
      loadPrompts(promptEnv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptEnv]);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // 保存成功提示
      const saved = await r.json();
      setError(null);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onApplyPrompt() {
    if (!status?.running) {
      setError('没有运行中的Bot，无法应用Prompt');
      return;
    }
    if (status?.env !== promptEnv) {
      setError(`当前运行的Bot环境是 ${status.env}，但编辑的是 ${promptEnv} 的模板，不匹配！`);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      
      // 先保存文件
      const saveR = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!saveR.ok) throw new Error(`保存失败: HTTP ${saveR.status}`);
      
      // 然后触发重新加载
      const reloadR = await fetch("/api/nof1/ai/trading/reload-prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ env: promptEnv })
      });
      if (!reloadR.ok) throw new Error(`应用失败: HTTP ${reloadR.status}`);
      
      const result = await reloadR.json();
      setError(null);
      // 可以显示成功消息（通过清除错误消息）
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSuggest() {
    try {
      setSuggesting(true);
      setError(null);
      setRationale(null);
      setConfigUpdates(null);
      const r = await fetch("/api/nof1/ai/prompt/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const s = j?.suggestion || {};
      if (typeof s.system_prompt_en === "string") setSystemPrompt(s.system_prompt_en);
      if (typeof s.user_prompt_en === "string") setUserPrompt(s.user_prompt_en);
      if (s.rationale_en) setRationale(String(s.rationale_en));
      if (s.config_updates) setConfigUpdates(s.config_updates);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function onApplyConfigUpdates() {
    if (!configUpdates) return;
    try {
      const r = await fetch("/api/nof1/ai/config/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config_updates: configUpdates })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next = await r.json();
      setCfg(next);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const whitelist = useMemo(() => (cfg?.allowed_symbols || []).join(", "), [cfg]);
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);
  const isRunning = !!status?.running;

  async function startTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intervalMinutes, env, ai })
      });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function stopTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  return (
    <aside className="h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Prompt 工作台</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ color: "var(--btn-inactive-fg)", border: "1px solid var(--chip-border)" }}
            onClick={onSuggest}
            disabled={suggesting}
          >{suggesting ? '建议中…' : '建议'}</button>
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
            onClick={onSave}
            disabled={saving}
            title="保存Prompt模板到文件（不会立即生效，需要重启Bot或点击'应用Prompt'）"
          >{saving ? '保存中…' : '保存'}</button>
          {isRunning && status?.env === promptEnv && (
            <button
              className="rounded px-2 py-1 chip-btn"
              style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
              onClick={onApplyPrompt}
              disabled={saving}
              title="保存并立即应用到运行中的Bot"
            >{saving ? '应用中…' : '应用Prompt'}</button>
          )}
        </div>
      </div>

      {/* Bot选择 - 选择要编辑的Bot */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>选择 Bot</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易环境</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={promptEnv}
                  onChange={(e) => setPromptEnv(e.target.value)}>
            <option value="demo-futures">demo-futures (期货演示)</option>
            <option value="demo-spot">demo-spot (现货演示)</option>
            <option value="futures">futures (期货生产)</option>
            <option value="spot">spot (现货生产)</option>
          </select>
        </div>
        <div className="text-[10px] mb-2" style={{ color: 'var(--muted-text)' }}>
          {promptEnv.includes('futures') ? '⚠️ 将编辑期货Bot的Prompt（支持杠杆、做多做空）' : '⚠️ 将编辑现货Bot的Prompt（无杠杆、只能做多）'}
        </div>
        {status?.running && status?.env && (
          <div className="text-[10px]" style={{ color: status.env === promptEnv ? 'var(--success)' : 'var(--warning)' }}>
            {status.env === promptEnv 
              ? `✅ 当前运行的Bot使用此环境 (pid=${status.pid})`
              : `⚠️ 当前运行的是 ${status.env} Bot，编辑的模板不会影响运行中的Bot`
            }
          </div>
        )}
      </div>

      {/* 交易控制 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易类型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}>
            {['demo-futures','demo-spot','futures','spot'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">AI模型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={ai}
                  onChange={(e) => setAi(e.target.value)}>
            <option value="">(默认)</option>
            {aiPresetKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">间隔(分)</label>
          <input className="col-span-2 rounded border px-2 py-1"
                 style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                 type="number" min={1} value={intervalMinutes}
                 onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))} />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }}
                  onClick={startTrading}
                  disabled={isRunning}>启动</button>
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }}
                  onClick={stopTrading}
                  disabled={!isRunning}>停止</button>
          <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
            状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--chip-border)", color: "var(--danger)" }}>{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500">加载中…</div>
      ) : (
        <>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>System Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-40 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>User Prompt</div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-48 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>

          {rationale && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>Rationale</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{rationale}</pre>
            </div>
          )}

          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>符号白名单</div>
            <div className="text-xs" style={{ color: "var(--foreground)" }}>{whitelist || '—'}</div>
          </div>

          {configUpdates && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>建议的配置更新</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2 mb-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{JSON.stringify(configUpdates, null, 2)}</pre>
              <button
                className="rounded px-2 py-1 chip-btn text-xs"
                style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
                onClick={onApplyConfigUpdates}
              >应用配置更新</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}



```

```typescriptreact
"use client";
import { useEffect, useMemo, useState } from "react";
import BotControlPanel, { type BotConfig, type BotStatus } from "../trading/BotControlPanel";
import AddBotDialog from "../trading/AddBotDialog";

type Config = {
  trading_env?: string;
  allowed_symbols?: string[];
  ai?: { provider?: string; model?: string; presets?: Record<string, any> };
  data?: Record<string, any>;
};

export default function PromptEditorPanel() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [bot, setBot] = useState<BotConfig | null>(null); // 当前选中的bot
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [promptEnv, setPromptEnv] = useState<string>("demo-futures"); // Prompt环境，基于选中的bot
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [configUpdates, setConfigUpdates] = useState<any>(null);

  // 加载prompt的函数
  async function loadPrompts(env: string) {
    try {
      const url = `/api/nof1/ai/prompts${env ? `?env=${env}` : ''}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pj = await r.json();
      setSystemPrompt(pj.system || "");
      setUserPrompt(pj.user || "");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [c, s] = await Promise.all([
          fetch("/api/nof1/ai/config", { cache: "no-store" }),
          fetch("/api/nof1/ai/trading/status", { cache: "no-store" }),
        ]);
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setCfg(cj);
          setBotStatus(sj);
          
          // 如果有运行的bot，创建bot配置；否则不设置bot
          if (sj?.running && sj?.env) {
            const existingBot: BotConfig = {
              id: `bot-${sj.env}-${sj.ai || 'default'}-${sj.intervalMinutes || 3}`,
              env: sj.env as BotConfig['env'],
              ai: sj.ai || '',
              intervalMinutes: sj.intervalMinutes || 3
            };
            setBot(existingBot);
            setPromptEnv(sj.env);
            await loadPrompts(sj.env);
          } else {
            // 没有运行的bot，使用配置的默认环境加载prompt
            const tradingEnv = String(cj?.trading_env || "demo-futures");
            setPromptEnv(tradingEnv);
            await loadPrompts(tradingEnv);
          }
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // 当bot改变时，更新promptEnv并加载prompt
  useEffect(() => {
    if (bot && !loading) {
      setPromptEnv(bot.env);
      loadPrompts(bot.env);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bot?.id]);
  
  // 当promptEnv改变时，重新加载prompt（手动切换时）
  useEffect(() => {
    if (promptEnv && !loading && bot) {
      loadPrompts(promptEnv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptEnv]);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // 保存成功提示
      const saved = await r.json();
      setError(null);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onApplyPrompt() {
    if (!status?.running) {
      setError('没有运行中的Bot，无法应用Prompt');
      return;
    }
    if (status?.env !== promptEnv) {
      setError(`当前运行的Bot环境是 ${status.env}，但编辑的是 ${promptEnv} 的模板，不匹配！`);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      
      // 先保存文件
      const saveR = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!saveR.ok) throw new Error(`保存失败: HTTP ${saveR.status}`);
      
      // 然后触发重新加载
      const reloadR = await fetch("/api/nof1/ai/trading/reload-prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ env: promptEnv })
      });
      if (!reloadR.ok) throw new Error(`应用失败: HTTP ${reloadR.status}`);
      
      const result = await reloadR.json();
      setError(null);
      // 可以显示成功消息（通过清除错误消息）
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSuggest() {
    try {
      setSuggesting(true);
      setError(null);
      setRationale(null);
      setConfigUpdates(null);
      const r = await fetch("/api/nof1/ai/prompt/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const s = j?.suggestion || {};
      if (typeof s.system_prompt_en === "string") setSystemPrompt(s.system_prompt_en);
      if (typeof s.user_prompt_en === "string") setUserPrompt(s.user_prompt_en);
      if (s.rationale_en) setRationale(String(s.rationale_en));
      if (s.config_updates) setConfigUpdates(s.config_updates);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function onApplyConfigUpdates() {
    if (!configUpdates) return;
    try {
      const r = await fetch("/api/nof1/ai/config/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config_updates: configUpdates })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next = await r.json();
      setCfg(next);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const whitelist = useMemo(() => (cfg?.allowed_symbols || []).join(", "), [cfg]);
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);
  const isRunning = !!botStatus?.running;

  // Bot控制函数
  async function handleStartBot(config: BotConfig) {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          intervalMinutes: config.intervalMinutes, 
          env: config.env, 
          ai: config.ai 
        })
      });
      const j = await r.json();
      setBotStatus(j);
      // 更新bot配置
      setBot(config);
      setPromptEnv(config.env);
    } catch (e: any) {
      setError(e?.message || String(e));
      throw e;
    }
  }

  async function handleStopBot(botId: string) {
    try {
      const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
      const j = await r.json();
      setBotStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
      throw e;
    }
  }

  function handleAddBot(newBot: BotConfig) {
    setBot(newBot);
    setPromptEnv(newBot.env);
    loadPrompts(newBot.env);
  }

  return (
    <aside className="h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Prompt 工作台</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ color: "var(--btn-inactive-fg)", border: "1px solid var(--chip-border)" }}
            onClick={onSuggest}
            disabled={suggesting}
          >{suggesting ? '建议中…' : '建议'}</button>
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
            onClick={onSave}
            disabled={saving}
            title="保存Prompt模板到文件（不会立即生效，需要重启Bot或点击'应用Prompt'）"
          >{saving ? '保存中…' : '保存'}</button>
          {isRunning && status?.env === promptEnv && (
            <button
              className="rounded px-2 py-1 chip-btn"
              style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
              onClick={onApplyPrompt}
              disabled={saving}
              title="保存并立即应用到运行中的Bot"
            >{saving ? '应用中…' : '应用Prompt'}</button>
          )}
        </div>
      </div>

      {/* Bot选择 - 选择要编辑的Bot */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>选择 Bot</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易环境</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={promptEnv}
                  onChange={(e) => setPromptEnv(e.target.value)}>
            <option value="demo-futures">demo-futures (期货演示)</option>
            <option value="demo-spot">demo-spot (现货演示)</option>
            <option value="futures">futures (期货生产)</option>
            <option value="spot">spot (现货生产)</option>
          </select>
        </div>
        <div className="text-[10px] mb-2" style={{ color: 'var(--muted-text)' }}>
          {promptEnv.includes('futures') ? '⚠️ 将编辑期货Bot的Prompt（支持杠杆、做多做空）' : '⚠️ 将编辑现货Bot的Prompt（无杠杆、只能做多）'}
        </div>
        {status?.running && status?.env && (
          <div className="text-[10px]" style={{ color: status.env === promptEnv ? 'var(--success)' : 'var(--warning)' }}>
            {status.env === promptEnv 
              ? `✅ 当前运行的Bot使用此环境 (pid=${status.pid})`
              : `⚠️ 当前运行的是 ${status.env} Bot，编辑的模板不会影响运行中的Bot`
            }
          </div>
        )}
      </div>

      {/* 交易控制 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易类型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}>
            {['demo-futures','demo-spot','futures','spot'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">AI模型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={ai}
                  onChange={(e) => setAi(e.target.value)}>
            <option value="">(默认)</option>
            {aiPresetKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">间隔(分)</label>
          <input className="col-span-2 rounded border px-2 py-1"
                 style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                 type="number" min={1} value={intervalMinutes}
                 onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))} />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }}
                  onClick={startTrading}
                  disabled={isRunning}>启动</button>
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }}
                  onClick={stopTrading}
                  disabled={!isRunning}>停止</button>
          <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
            状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--chip-border)", color: "var(--danger)" }}>{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500">加载中…</div>
      ) : (
        <>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>System Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-40 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>User Prompt</div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-48 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>

          {rationale && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>Rationale</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{rationale}</pre>
            </div>
          )}

          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>符号白名单</div>
            <div className="text-xs" style={{ color: "var(--foreground)" }}>{whitelist || '—'}</div>
          </div>

          {configUpdates && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>建议的配置更新</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2 mb-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{JSON.stringify(configUpdates, null, 2)}</pre>
              <button
                className="rounded px-2 py-1 chip-btn text-xs"
                style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
                onClick={onApplyConfigUpdates}
              >应用配置更新</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}



```

```typescriptreact
"use client";
import { useEffect, useMemo, useState } from "react";
import BotControlPanel, { type BotConfig, type BotStatus } from "../trading/BotControlPanel";
import AddBotDialog from "../trading/AddBotDialog";

type Config = {
  trading_env?: string;
  allowed_symbols?: string[];
  ai?: { provider?: string; model?: string; presets?: Record<string, any> };
  data?: Record<string, any>;
};

export default function PromptEditorPanel() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [bot, setBot] = useState<BotConfig | null>(null); // 当前选中的bot
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [promptEnv, setPromptEnv] = useState<string>("demo-futures"); // Prompt环境，基于选中的bot
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [configUpdates, setConfigUpdates] = useState<any>(null);

  // 加载prompt的函数
  async function loadPrompts(env: string) {
    try {
      const url = `/api/nof1/ai/prompts${env ? `?env=${env}` : ''}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pj = await r.json();
      setSystemPrompt(pj.system || "");
      setUserPrompt(pj.user || "");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [c, s] = await Promise.all([
          fetch("/api/nof1/ai/config", { cache: "no-store" }),
          fetch("/api/nof1/ai/trading/status", { cache: "no-store" }),
        ]);
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setCfg(cj);
          setBotStatus(sj);
          
          // 如果有运行的bot，创建bot配置；否则不设置bot
          if (sj?.running && sj?.env) {
            const existingBot: BotConfig = {
              id: `bot-${sj.env}-${sj.ai || 'default'}-${sj.intervalMinutes || 3}`,
              env: sj.env as BotConfig['env'],
              ai: sj.ai || '',
              intervalMinutes: sj.intervalMinutes || 3
            };
            setBot(existingBot);
            setPromptEnv(sj.env);
            await loadPrompts(sj.env);
          } else {
            // 没有运行的bot，使用配置的默认环境加载prompt
            const tradingEnv = String(cj?.trading_env || "demo-futures");
            setPromptEnv(tradingEnv);
            await loadPrompts(tradingEnv);
          }
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // 当bot改变时，更新promptEnv并加载prompt
  useEffect(() => {
    if (bot && !loading) {
      setPromptEnv(bot.env);
      loadPrompts(bot.env);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bot?.id]);
  
  // 当promptEnv改变时，重新加载prompt（手动切换时）
  useEffect(() => {
    if (promptEnv && !loading && bot) {
      loadPrompts(promptEnv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptEnv]);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // 保存成功提示
      const saved = await r.json();
      setError(null);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onApplyPrompt() {
    if (!status?.running) {
      setError('没有运行中的Bot，无法应用Prompt');
      return;
    }
    if (status?.env !== promptEnv) {
      setError(`当前运行的Bot环境是 ${status.env}，但编辑的是 ${promptEnv} 的模板，不匹配！`);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      
      // 先保存文件
      const saveR = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!saveR.ok) throw new Error(`保存失败: HTTP ${saveR.status}`);
      
      // 然后触发重新加载
      const reloadR = await fetch("/api/nof1/ai/trading/reload-prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ env: promptEnv })
      });
      if (!reloadR.ok) throw new Error(`应用失败: HTTP ${reloadR.status}`);
      
      const result = await reloadR.json();
      setError(null);
      // 可以显示成功消息（通过清除错误消息）
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSuggest() {
    try {
      setSuggesting(true);
      setError(null);
      setRationale(null);
      setConfigUpdates(null);
      const r = await fetch("/api/nof1/ai/prompt/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const s = j?.suggestion || {};
      if (typeof s.system_prompt_en === "string") setSystemPrompt(s.system_prompt_en);
      if (typeof s.user_prompt_en === "string") setUserPrompt(s.user_prompt_en);
      if (s.rationale_en) setRationale(String(s.rationale_en));
      if (s.config_updates) setConfigUpdates(s.config_updates);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function onApplyConfigUpdates() {
    if (!configUpdates) return;
    try {
      const r = await fetch("/api/nof1/ai/config/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config_updates: configUpdates })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next = await r.json();
      setCfg(next);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const whitelist = useMemo(() => (cfg?.allowed_symbols || []).join(", "), [cfg]);
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);
  const isRunning = !!botStatus?.running;

  // Bot控制函数
  async function handleStartBot(config: BotConfig) {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          intervalMinutes: config.intervalMinutes, 
          env: config.env, 
          ai: config.ai 
        })
      });
      const j = await r.json();
      setBotStatus(j);
      // 更新bot配置
      setBot(config);
      setPromptEnv(config.env);
    } catch (e: any) {
      setError(e?.message || String(e));
      throw e;
    }
  }

  async function handleStopBot(botId: string) {
    try {
      const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
      const j = await r.json();
      setBotStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
      throw e;
    }
  }

  function handleAddBot(newBot: BotConfig) {
    setBot(newBot);
    setPromptEnv(newBot.env);
    loadPrompts(newBot.env);
  }

  return (
    <aside className="h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Prompt 工作台</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ color: "var(--btn-inactive-fg)", border: "1px solid var(--chip-border)" }}
            onClick={onSuggest}
            disabled={suggesting}
          >{suggesting ? '建议中…' : '建议'}</button>
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
            onClick={onSave}
            disabled={saving}
            title="保存Prompt模板到文件（不会立即生效，需要重启Bot或点击'应用Prompt'）"
          >{saving ? '保存中…' : '保存'}</button>
          {isRunning && bot && bot.env === promptEnv && (
            <button
              className="rounded px-2 py-1 chip-btn"
              style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
              onClick={onApplyPrompt}
              disabled={saving}
              title="保存并立即应用到运行中的Bot"
            >{saving ? '应用中…' : '应用Prompt'}</button>
          )}
        </div>
      </div>

      {/* Bot选择 - 选择要编辑的Bot */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>选择 Bot</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易环境</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={promptEnv}
                  onChange={(e) => setPromptEnv(e.target.value)}>
            <option value="demo-futures">demo-futures (期货演示)</option>
            <option value="demo-spot">demo-spot (现货演示)</option>
            <option value="futures">futures (期货生产)</option>
            <option value="spot">spot (现货生产)</option>
          </select>
        </div>
        <div className="text-[10px] mb-2" style={{ color: 'var(--muted-text)' }}>
          {promptEnv.includes('futures') ? '⚠️ 将编辑期货Bot的Prompt（支持杠杆、做多做空）' : '⚠️ 将编辑现货Bot的Prompt（无杠杆、只能做多）'}
        </div>
        {status?.running && status?.env && (
          <div className="text-[10px]" style={{ color: status.env === promptEnv ? 'var(--success)' : 'var(--warning)' }}>
            {status.env === promptEnv 
              ? `✅ 当前运行的Bot使用此环境 (pid=${status.pid})`
              : `⚠️ 当前运行的是 ${status.env} Bot，编辑的模板不会影响运行中的Bot`
            }
          </div>
        )}
      </div>

      {/* 交易控制 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易类型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}>
            {['demo-futures','demo-spot','futures','spot'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">AI模型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={ai}
                  onChange={(e) => setAi(e.target.value)}>
            <option value="">(默认)</option>
            {aiPresetKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">间隔(分)</label>
          <input className="col-span-2 rounded border px-2 py-1"
                 style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                 type="number" min={1} value={intervalMinutes}
                 onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))} />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }}
                  onClick={startTrading}
                  disabled={isRunning}>启动</button>
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }}
                  onClick={stopTrading}
                  disabled={!isRunning}>停止</button>
          <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
            状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--chip-border)", color: "var(--danger)" }}>{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500">加载中…</div>
      ) : (
        <>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>System Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-40 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>User Prompt</div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-48 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>

          {rationale && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>Rationale</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{rationale}</pre>
            </div>
          )}

          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>符号白名单</div>
            <div className="text-xs" style={{ color: "var(--foreground)" }}>{whitelist || '—'}</div>
          </div>

          {configUpdates && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>建议的配置更新</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2 mb-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{JSON.stringify(configUpdates, null, 2)}</pre>
              <button
                className="rounded px-2 py-1 chip-btn text-xs"
                style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
                onClick={onApplyConfigUpdates}
              >应用配置更新</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}



```

```typescriptreact
      {/* Bot选择 - 选择要编辑的Bot */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>选择 Bot</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易环境</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={promptEnv}
                  onChange={(e) => setPromptEnv(e.target.value)}
                  disabled={!bot}>
            <option value="demo-futures">demo-futures (期货演示)</option>
            <option value="demo-spot">demo-spot (现货演示)</option>
            <option value="futures">futures (期货生产)</option>
            <option value="spot">spot (现货生产)</option>
          </select>
        </div>
        <div className="text-[10px] mb-2" style={{ color: 'var(--muted-text)' }}>
          {promptEnv.includes('futures') ? '⚠️ 将编辑期货Bot的Prompt（支持杠杆、做多做空）' : '⚠️ 将编辑现货Bot的Prompt（无杠杆、只能做多）'}
        </div>
        {bot && botStatus?.running && botStatus?.env && (
          <div className="text-[10px]" style={{ color: botStatus.env === promptEnv ? 'var(--success)' : 'var(--warning)' }}>
            {botStatus.env === promptEnv 
              ? `✅ 当前运行的Bot使用此环境 (pid=${botStatus.pid})`
              : `⚠️ 当前运行的是 ${botStatus.env} Bot，编辑的模板不会影响运行中的Bot`
            }
          </div>
        )}
      </div>

      {/* 交易控制区 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        
        {bot ? (
          <BotControlPanel
            bot={bot}
            status={botStatus || undefined}
            aiPresets={aiPresetKeys}
            onStart={handleStartBot}
            onStop={handleStopBot}
            onStatusChange={setBotStatus}
          />
        ) : (
          <div className="text-center py-4">
            <div className="text-xs mb-2" style={{ color: 'var(--muted-text)' }}>
              还没有添加Bot
            </div>
            <button
              className="rounded px-3 py-1.5 text-xs"
              style={{ 
                background: 'var(--btn-active-bg)', 
                color: 'var(--btn-active-fg)' 
              }}
              onClick={() => setShowAddDialog(true)}
            >
              + 添加交易Bot
            </button>
          </div>
        )}
      </div>

      {/* 添加Bot对话框 */}
      <AddBotDialog
        open={showAddDialog}
        aiPresets={aiPresetKeys}
        onClose={() => setShowAddDialog(false)}
        onAdd={handleAddBot}
      />
```

```typescriptreact
"use client";
import { useEffect, useMemo, useState } from "react";
import BotControlPanel, { type BotConfig, type BotStatus } from "../trading/BotControlPanel";
import AddBotDialog from "../trading/AddBotDialog";

type Config = {
  trading_env?: string;
  allowed_symbols?: string[];
  ai?: { provider?: string; model?: string; presets?: Record<string, any> };
  data?: Record<string, any>;
};

export default function PromptEditorPanel() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [bot, setBot] = useState<BotConfig | null>(null); // 当前选中的bot
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [promptEnv, setPromptEnv] = useState<string>("demo-futures"); // Prompt环境，基于选中的bot
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [configUpdates, setConfigUpdates] = useState<any>(null);

  // 加载prompt的函数
  async function loadPrompts(env: string) {
    try {
      const url = `/api/nof1/ai/prompts${env ? `?env=${env}` : ''}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pj = await r.json();
      setSystemPrompt(pj.system || "");
      setUserPrompt(pj.user || "");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [c, s] = await Promise.all([
          fetch("/api/nof1/ai/config", { cache: "no-store" }),
          fetch("/api/nof1/ai/trading/status", { cache: "no-store" }),
        ]);
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setCfg(cj);
          setBotStatus(sj);
          
          // 如果有运行的bot，创建bot配置；否则不设置bot
          if (sj?.running && sj?.env) {
            const existingBot: BotConfig = {
              id: `bot-${sj.env}-${sj.ai || 'default'}-${sj.intervalMinutes || 3}`,
              env: sj.env as BotConfig['env'],
              ai: sj.ai || '',
              intervalMinutes: sj.intervalMinutes || 3
            };
            setBot(existingBot);
            setPromptEnv(sj.env);
            await loadPrompts(sj.env);
          } else {
            // 没有运行的bot，使用配置的默认环境加载prompt
            const tradingEnv = String(cj?.trading_env || "demo-futures");
            setPromptEnv(tradingEnv);
            await loadPrompts(tradingEnv);
          }
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // 当bot改变时，更新promptEnv并加载prompt
  useEffect(() => {
    if (bot && !loading) {
      setPromptEnv(bot.env);
      loadPrompts(bot.env);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bot?.id]);
  
  // 当promptEnv改变时，重新加载prompt（手动切换时）
  useEffect(() => {
    if (promptEnv && !loading && bot) {
      loadPrompts(promptEnv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptEnv]);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // 保存成功提示
      const saved = await r.json();
      setError(null);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onApplyPrompt() {
    if (!botStatus?.running || !bot) {
      setError('没有运行中的Bot，无法应用Prompt');
      return;
    }
    if (bot.env !== promptEnv) {
      setError(`当前运行的Bot环境是 ${bot.env}，但编辑的是 ${promptEnv} 的模板，不匹配！`);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      
      // 先保存文件
      const saveR = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!saveR.ok) throw new Error(`保存失败: HTTP ${saveR.status}`);
      
      // 然后触发重新加载
      const reloadR = await fetch("/api/nof1/ai/trading/reload-prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ env: promptEnv })
      });
      if (!reloadR.ok) throw new Error(`应用失败: HTTP ${reloadR.status}`);
      
      const result = await reloadR.json();
      setError(null);
      // 可以显示成功消息（通过清除错误消息）
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSuggest() {
    try {
      setSuggesting(true);
      setError(null);
      setRationale(null);
      setConfigUpdates(null);
      const r = await fetch("/api/nof1/ai/prompt/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const s = j?.suggestion || {};
      if (typeof s.system_prompt_en === "string") setSystemPrompt(s.system_prompt_en);
      if (typeof s.user_prompt_en === "string") setUserPrompt(s.user_prompt_en);
      if (s.rationale_en) setRationale(String(s.rationale_en));
      if (s.config_updates) setConfigUpdates(s.config_updates);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function onApplyConfigUpdates() {
    if (!configUpdates) return;
    try {
      const r = await fetch("/api/nof1/ai/config/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config_updates: configUpdates })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next = await r.json();
      setCfg(next);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const whitelist = useMemo(() => (cfg?.allowed_symbols || []).join(", "), [cfg]);
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);
  const isRunning = !!botStatus?.running;

  // Bot控制函数
  async function handleStartBot(config: BotConfig) {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          intervalMinutes: config.intervalMinutes, 
          env: config.env, 
          ai: config.ai 
        })
      });
      const j = await r.json();
      setBotStatus(j);
      // 更新bot配置
      setBot(config);
      setPromptEnv(config.env);
    } catch (e: any) {
      setError(e?.message || String(e));
      throw e;
    }
  }

  async function handleStopBot(botId: string) {
    try {
      const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
      const j = await r.json();
      setBotStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
      throw e;
    }
  }

  function handleAddBot(newBot: BotConfig) {
    setBot(newBot);
    setPromptEnv(newBot.env);
    loadPrompts(newBot.env);
  }

  return (
    <aside className="h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Prompt 工作台</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ color: "var(--btn-inactive-fg)", border: "1px solid var(--chip-border)" }}
            onClick={onSuggest}
            disabled={suggesting}
          >{suggesting ? '建议中…' : '建议'}</button>
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
            onClick={onSave}
            disabled={saving}
            title="保存Prompt模板到文件（不会立即生效，需要重启Bot或点击'应用Prompt'）"
          >{saving ? '保存中…' : '保存'}</button>
          {isRunning && bot && bot.env === promptEnv && (
            <button
              className="rounded px-2 py-1 chip-btn"
              style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
              onClick={onApplyPrompt}
              disabled={saving}
              title="保存并立即应用到运行中的Bot"
            >{saving ? '应用中…' : '应用Prompt'}</button>
          )}
        </div>
      </div>

      {/* Bot选择 - 选择要编辑的Bot */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>选择 Bot</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易环境</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={promptEnv}
                  onChange={(e) => setPromptEnv(e.target.value)}>
            <option value="demo-futures">demo-futures (期货演示)</option>
            <option value="demo-spot">demo-spot (现货演示)</option>
            <option value="futures">futures (期货生产)</option>
            <option value="spot">spot (现货生产)</option>
          </select>
        </div>
        <div className="text-[10px] mb-2" style={{ color: 'var(--muted-text)' }}>
          {promptEnv.includes('futures') ? '⚠️ 将编辑期货Bot的Prompt（支持杠杆、做多做空）' : '⚠️ 将编辑现货Bot的Prompt（无杠杆、只能做多）'}
        </div>
        {status?.running && status?.env && (
          <div className="text-[10px]" style={{ color: status.env === promptEnv ? 'var(--success)' : 'var(--warning)' }}>
            {status.env === promptEnv 
              ? `✅ 当前运行的Bot使用此环境 (pid=${status.pid})`
              : `⚠️ 当前运行的是 ${status.env} Bot，编辑的模板不会影响运行中的Bot`
            }
          </div>
        )}
      </div>

      {/* 交易控制 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易类型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}>
            {['demo-futures','demo-spot','futures','spot'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">AI模型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={ai}
                  onChange={(e) => setAi(e.target.value)}>
            <option value="">(默认)</option>
            {aiPresetKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">间隔(分)</label>
          <input className="col-span-2 rounded border px-2 py-1"
                 style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                 type="number" min={1} value={intervalMinutes}
                 onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))} />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }}
                  onClick={startTrading}
                  disabled={isRunning}>启动</button>
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }}
                  onClick={stopTrading}
                  disabled={!isRunning}>停止</button>
          <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
            状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--chip-border)", color: "var(--danger)" }}>{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500">加载中…</div>
      ) : (
        <>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>System Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-40 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>User Prompt</div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-48 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>

          {rationale && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>Rationale</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{rationale}</pre>
            </div>
          )}

          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>符号白名单</div>
            <div className="text-xs" style={{ color: "var(--foreground)" }}>{whitelist || '—'}</div>
          </div>

          {configUpdates && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>建议的配置更新</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2 mb-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{JSON.stringify(configUpdates, null, 2)}</pre>
              <button
                className="rounded px-2 py-1 chip-btn text-xs"
                style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
                onClick={onApplyConfigUpdates}
              >应用配置更新</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}



```

```typescriptreact
"use client";
import { useEffect, useMemo, useState } from "react";
import BotControlPanel, { type BotConfig, type BotStatus } from "../trading/BotControlPanel";
import AddBotDialog from "../trading/AddBotDialog";

type Config = {
  trading_env?: string;
  allowed_symbols?: string[];
  ai?: { provider?: string; model?: string; presets?: Record<string, any> };
  data?: Record<string, any>;
};

export default function PromptEditorPanel() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [bot, setBot] = useState<BotConfig | null>(null); // 当前选中的bot
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [promptEnv, setPromptEnv] = useState<string>("demo-futures"); // Prompt环境，基于选中的bot
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [configUpdates, setConfigUpdates] = useState<any>(null);

  // 加载prompt的函数
  async function loadPrompts(env: string) {
    try {
      const url = `/api/nof1/ai/prompts${env ? `?env=${env}` : ''}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pj = await r.json();
      setSystemPrompt(pj.system || "");
      setUserPrompt(pj.user || "");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [c, s] = await Promise.all([
          fetch("/api/nof1/ai/config", { cache: "no-store" }),
          fetch("/api/nof1/ai/trading/status", { cache: "no-store" }),
        ]);
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setCfg(cj);
          setBotStatus(sj);
          
          // 如果有运行的bot，创建bot配置；否则不设置bot
          if (sj?.running && sj?.env) {
            const existingBot: BotConfig = {
              id: `bot-${sj.env}-${sj.ai || 'default'}-${sj.intervalMinutes || 3}`,
              env: sj.env as BotConfig['env'],
              ai: sj.ai || '',
              intervalMinutes: sj.intervalMinutes || 3
            };
            setBot(existingBot);
            setPromptEnv(sj.env);
            await loadPrompts(sj.env);
          } else {
            // 没有运行的bot，使用配置的默认环境加载prompt
            const tradingEnv = String(cj?.trading_env || "demo-futures");
            setPromptEnv(tradingEnv);
            await loadPrompts(tradingEnv);
          }
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // 当bot改变时，更新promptEnv并加载prompt
  useEffect(() => {
    if (bot && !loading) {
      setPromptEnv(bot.env);
      loadPrompts(bot.env);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bot?.id]);
  
  // 当promptEnv改变时，重新加载prompt（手动切换时）
  useEffect(() => {
    if (promptEnv && !loading && bot) {
      loadPrompts(promptEnv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptEnv]);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // 保存成功提示
      const saved = await r.json();
      setError(null);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onApplyPrompt() {
    if (!botStatus?.running || !bot) {
      setError('没有运行中的Bot，无法应用Prompt');
      return;
    }
    if (bot.env !== promptEnv) {
      setError(`当前运行的Bot环境是 ${bot.env}，但编辑的是 ${promptEnv} 的模板，不匹配！`);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      
      // 先保存文件
      const saveR = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!saveR.ok) throw new Error(`保存失败: HTTP ${saveR.status}`);
      
      // 然后触发重新加载
      const reloadR = await fetch("/api/nof1/ai/trading/reload-prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ env: bot.env })
      });
      if (!reloadR.ok) throw new Error(`应用失败: HTTP ${reloadR.status}`);
      
      const result = await reloadR.json();
      setError(null);
      // 可以显示成功消息（通过清除错误消息）
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSuggest() {
    try {
      setSuggesting(true);
      setError(null);
      setRationale(null);
      setConfigUpdates(null);
      const r = await fetch("/api/nof1/ai/prompt/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const s = j?.suggestion || {};
      if (typeof s.system_prompt_en === "string") setSystemPrompt(s.system_prompt_en);
      if (typeof s.user_prompt_en === "string") setUserPrompt(s.user_prompt_en);
      if (s.rationale_en) setRationale(String(s.rationale_en));
      if (s.config_updates) setConfigUpdates(s.config_updates);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function onApplyConfigUpdates() {
    if (!configUpdates) return;
    try {
      const r = await fetch("/api/nof1/ai/config/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config_updates: configUpdates })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next = await r.json();
      setCfg(next);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const whitelist = useMemo(() => (cfg?.allowed_symbols || []).join(", "), [cfg]);
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);
  const isRunning = !!botStatus?.running;

  // Bot控制函数
  async function handleStartBot(config: BotConfig) {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          intervalMinutes: config.intervalMinutes, 
          env: config.env, 
          ai: config.ai 
        })
      });
      const j = await r.json();
      setBotStatus(j);
      // 更新bot配置
      setBot(config);
      setPromptEnv(config.env);
    } catch (e: any) {
      setError(e?.message || String(e));
      throw e;
    }
  }

  async function handleStopBot(botId: string) {
    try {
      const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
      const j = await r.json();
      setBotStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
      throw e;
    }
  }

  function handleAddBot(newBot: BotConfig) {
    setBot(newBot);
    setPromptEnv(newBot.env);
    loadPrompts(newBot.env);
  }

  return (
    <aside className="h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Prompt 工作台</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ color: "var(--btn-inactive-fg)", border: "1px solid var(--chip-border)" }}
            onClick={onSuggest}
            disabled={suggesting}
          >{suggesting ? '建议中…' : '建议'}</button>
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
            onClick={onSave}
            disabled={saving}
            title="保存Prompt模板到文件（不会立即生效，需要重启Bot或点击'应用Prompt'）"
          >{saving ? '保存中…' : '保存'}</button>
          {isRunning && bot && bot.env === promptEnv && (
            <button
              className="rounded px-2 py-1 chip-btn"
              style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
              onClick={onApplyPrompt}
              disabled={saving}
              title="保存并立即应用到运行中的Bot"
            >{saving ? '应用中…' : '应用Prompt'}</button>
          )}
        </div>
      </div>

      {/* Bot选择 - 选择要编辑的Bot */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>选择 Bot</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易环境</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={promptEnv}
                  onChange={(e) => setPromptEnv(e.target.value)}>
            <option value="demo-futures">demo-futures (期货演示)</option>
            <option value="demo-spot">demo-spot (现货演示)</option>
            <option value="futures">futures (期货生产)</option>
            <option value="spot">spot (现货生产)</option>
          </select>
        </div>
        <div className="text-[10px] mb-2" style={{ color: 'var(--muted-text)' }}>
          {promptEnv.includes('futures') ? '⚠️ 将编辑期货Bot的Prompt（支持杠杆、做多做空）' : '⚠️ 将编辑现货Bot的Prompt（无杠杆、只能做多）'}
        </div>
        {status?.running && status?.env && (
          <div className="text-[10px]" style={{ color: status.env === promptEnv ? 'var(--success)' : 'var(--warning)' }}>
            {status.env === promptEnv 
              ? `✅ 当前运行的Bot使用此环境 (pid=${status.pid})`
              : `⚠️ 当前运行的是 ${status.env} Bot，编辑的模板不会影响运行中的Bot`
            }
          </div>
        )}
      </div>

      {/* 交易控制 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易类型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}>
            {['demo-futures','demo-spot','futures','spot'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">AI模型</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={ai}
                  onChange={(e) => setAi(e.target.value)}>
            <option value="">(默认)</option>
            {aiPresetKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">间隔(分)</label>
          <input className="col-span-2 rounded border px-2 py-1"
                 style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                 type="number" min={1} value={intervalMinutes}
                 onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))} />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }}
                  onClick={startTrading}
                  disabled={isRunning}>启动</button>
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }}
                  onClick={stopTrading}
                  disabled={!isRunning}>停止</button>
          <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
            状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--chip-border)", color: "var(--danger)" }}>{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500">加载中…</div>
      ) : (
        <>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>System Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-40 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>User Prompt</div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-48 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>

          {rationale && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>Rationale</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{rationale}</pre>
            </div>
          )}

          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>符号白名单</div>
            <div className="text-xs" style={{ color: "var(--foreground)" }}>{whitelist || '—'}</div>
          </div>

          {configUpdates && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>建议的配置更新</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2 mb-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{JSON.stringify(configUpdates, null, 2)}</pre>
              <button
                className="rounded px-2 py-1 chip-btn text-xs"
                style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
                onClick={onApplyConfigUpdates}
              >应用配置更新</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}



```

检查并修复剩余部分：


```typescriptreact
"use client";
import { useEffect, useMemo, useState } from "react";
import BotControlPanel, { type BotConfig, type BotStatus } from "../trading/BotControlPanel";
import AddBotDialog from "../trading/AddBotDialog";

type Config = {
  trading_env?: string;
  allowed_symbols?: string[];
  ai?: { provider?: string; model?: string; presets?: Record<string, any> };
  data?: Record<string, any>;
};

export default function PromptEditorPanel() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [bot, setBot] = useState<BotConfig | null>(null); // 当前选中的bot
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [promptEnv, setPromptEnv] = useState<string>("demo-futures"); // Prompt环境，基于选中的bot
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [configUpdates, setConfigUpdates] = useState<any>(null);

  // 加载prompt的函数
  async function loadPrompts(env: string) {
    try {
      const url = `/api/nof1/ai/prompts${env ? `?env=${env}` : ''}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pj = await r.json();
      setSystemPrompt(pj.system || "");
      setUserPrompt(pj.user || "");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [c, s] = await Promise.all([
          fetch("/api/nof1/ai/config", { cache: "no-store" }),
          fetch("/api/nof1/ai/trading/status", { cache: "no-store" }),
        ]);
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setCfg(cj);
          setBotStatus(sj);
          
          // 如果有运行的bot，创建bot配置；否则不设置bot
          if (sj?.running && sj?.env) {
            const existingBot: BotConfig = {
              id: `bot-${sj.env}-${sj.ai || 'default'}-${sj.intervalMinutes || 3}`,
              env: sj.env as BotConfig['env'],
              ai: sj.ai || '',
              intervalMinutes: sj.intervalMinutes || 3
            };
            setBot(existingBot);
            setPromptEnv(sj.env);
            await loadPrompts(sj.env);
          } else {
            // 没有运行的bot，使用配置的默认环境加载prompt
            const tradingEnv = String(cj?.trading_env || "demo-futures");
            setPromptEnv(tradingEnv);
            await loadPrompts(tradingEnv);
          }
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // 当bot改变时，更新promptEnv并加载prompt
  useEffect(() => {
    if (bot && !loading) {
      setPromptEnv(bot.env);
      loadPrompts(bot.env);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bot?.id]);
  
  // 当promptEnv改变时，重新加载prompt（手动切换时）
  useEffect(() => {
    if (promptEnv && !loading && bot) {
      loadPrompts(promptEnv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptEnv]);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // 保存成功提示
      const saved = await r.json();
      setError(null);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onApplyPrompt() {
    if (!botStatus?.running || !bot) {
      setError('没有运行中的Bot，无法应用Prompt');
      return;
    }
    if (bot.env !== promptEnv) {
      setError(`当前运行的Bot环境是 ${bot.env}，但编辑的是 ${promptEnv} 的模板，不匹配！`);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      
      // 先保存文件
      const saveR = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!saveR.ok) throw new Error(`保存失败: HTTP ${saveR.status}`);
      
      // 然后触发重新加载
      const reloadR = await fetch("/api/nof1/ai/trading/reload-prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ env: bot.env })
      });
      if (!reloadR.ok) throw new Error(`应用失败: HTTP ${reloadR.status}`);
      
      const result = await reloadR.json();
      setError(null);
      // 可以显示成功消息（通过清除错误消息）
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSuggest() {
    try {
      setSuggesting(true);
      setError(null);
      setRationale(null);
      setConfigUpdates(null);
      const r = await fetch("/api/nof1/ai/prompt/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const s = j?.suggestion || {};
      if (typeof s.system_prompt_en === "string") setSystemPrompt(s.system_prompt_en);
      if (typeof s.user_prompt_en === "string") setUserPrompt(s.user_prompt_en);
      if (s.rationale_en) setRationale(String(s.rationale_en));
      if (s.config_updates) setConfigUpdates(s.config_updates);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function onApplyConfigUpdates() {
    if (!configUpdates) return;
    try {
      const r = await fetch("/api/nof1/ai/config/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config_updates: configUpdates })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next = await r.json();
      setCfg(next);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const whitelist = useMemo(() => (cfg?.allowed_symbols || []).join(", "), [cfg]);
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);
  const isRunning = !!botStatus?.running;

  // Bot控制函数
  async function handleStartBot(config: BotConfig) {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          intervalMinutes: config.intervalMinutes, 
          env: config.env, 
          ai: config.ai 
        })
      });
      const j = await r.json();
      setBotStatus(j);
      // 更新bot配置
      setBot(config);
      setPromptEnv(config.env);
    } catch (e: any) {
      setError(e?.message || String(e));
      throw e;
    }
  }

  async function handleStopBot(botId: string) {
    try {
      const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
      const j = await r.json();
      setBotStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
      throw e;
    }
  }

  function handleAddBot(newBot: BotConfig) {
    setBot(newBot);
    setPromptEnv(newBot.env);
    loadPrompts(newBot.env);
  }

  return (
    <aside className="h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Prompt 工作台</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ color: "var(--btn-inactive-fg)", border: "1px solid var(--chip-border)" }}
            onClick={onSuggest}
            disabled={suggesting}
          >{suggesting ? '建议中…' : '建议'}</button>
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
            onClick={onSave}
            disabled={saving}
            title="保存Prompt模板到文件（不会立即生效，需要重启Bot或点击'应用Prompt'）"
          >{saving ? '保存中…' : '保存'}</button>
          {isRunning && bot && bot.env === promptEnv && (
            <button
              className="rounded px-2 py-1 chip-btn"
              style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
              onClick={onApplyPrompt}
              disabled={saving}
              title="保存并立即应用到运行中的Bot"
            >{saving ? '应用中…' : '应用Prompt'}</button>
          )}
        </div>
      </div>

      {/* Bot选择 - 选择要编辑的Bot */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>选择 Bot</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易环境</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={promptEnv}
                  onChange={(e) => setPromptEnv(e.target.value)}>
            <option value="demo-futures">demo-futures (期货演示)</option>
            <option value="demo-spot">demo-spot (现货演示)</option>
            <option value="futures">futures (期货生产)</option>
            <option value="spot">spot (现货生产)</option>
          </select>
        </div>
        <div className="text-[10px] mb-2" style={{ color: 'var(--muted-text)' }}>
          {promptEnv.includes('futures') ? '⚠️ 将编辑期货Bot的Prompt（支持杠杆、做多做空）' : '⚠️ 将编辑现货Bot的Prompt（无杠杆、只能做多）'}
        </div>
        {bot && botStatus?.running && botStatus?.env && (
          <div className="text-[10px]" style={{ color: botStatus.env === promptEnv ? 'var(--success)' : 'var(--warning)' }}>
            {botStatus.env === promptEnv 
              ? `✅ 当前运行的Bot使用此环境 (pid=${botStatus.pid})`
              : `⚠️ 当前运行的是 ${botStatus.env} Bot，编辑的模板不会影响运行中的Bot`
            }
          </div>
        )}
      </div>

      {/* 交易控制区 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        
        {bot ? (
          <BotControlPanel
            bot={bot}
            status={botStatus || undefined}
            aiPresets={aiPresetKeys}
            onStart={handleStartBot}
            onStop={handleStopBot}
            onStatusChange={setBotStatus}
          />
        ) : (
          <div className="text-center py-4">
            <div className="text-xs mb-2" style={{ color: 'var(--muted-text)' }}>
              还没有添加Bot
            </div>
            <button
              className="rounded px-3 py-1.5 text-xs"
              style={{ 
                background: 'var(--btn-active-bg)', 
                color: 'var(--btn-active-fg)' 
              }}
              onClick={() => setShowAddDialog(true)}
            >
              + 添加交易Bot
            </button>
          </div>
        )}
      </div>

      {/* 添加Bot对话框 */}
      <AddBotDialog
        open={showAddDialog}
        aiPresets={aiPresetKeys}
        onClose={() => setShowAddDialog(false)}
        onAdd={handleAddBot}
      />

      {error && (
        <div className="mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--chip-border)", color: "var(--danger)" }}>{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500">加载中…</div>
      ) : (
        <>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>System Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-40 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>User Prompt</div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-48 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>

          {rationale && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>Rationale</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{rationale}</pre>
            </div>
          )}

          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>符号白名单</div>
            <div className="text-xs" style={{ color: "var(--foreground)" }}>{whitelist || '—'}</div>
          </div>

          {configUpdates && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>建议的配置更新</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2 mb-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{JSON.stringify(configUpdates, null, 2)}</pre>
              <button
                className="rounded px-2 py-1 chip-btn text-xs"
                style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
                onClick={onApplyConfigUpdates}
              >应用配置更新</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}



```

清理遗留代码：


## 完成总结

### 已完成的组件

1. BotControlPanel 组件 (`web/src/components/trading/BotControlPanel.tsx`)
   - 从 PromptEditorPanel 提取的交易控制逻辑
   - 显示 Bot 配置，支持启动/停止
   - 运行时禁用编辑，支持状态轮询

2. AddBotDialog 组件 (`web/src/components/trading/AddBotDialog.tsx`)
   - 添加 Bot 的模态对话框
   - 配置 env、ai、intervalMinutes、name

3. PromptEditorPanel 重构
   - 移除内联交易控制代码
   - 集成 BotControlPanel 组件
   - 初始显示“添加 Bot”按钮
   - 添加 Bot 后显示 BotControlPanel
   - Prompt 编辑自动对接选中的 bot

### 新的UI流程

```
初始状态（无Bot）
└── 交易控制区显示 "+ 添加交易Bot" 按钮

添加Bot后
├── 交易控制区显示 BotControlPanel
│   ├── Bot配置（可编辑，运行时禁用）
│   ├── [启动] [停止] 按钮
│   └── 状态显示
│
└── Bot选择区自动更新
    └── Prompt编辑区加载对应env的模板
```

### 关键特性

1. 组件化：交易控制逻辑独立，便于复用和扩展
2. Bot 与 Prompt 对接：选择 Bot 后自动加载对应环境的 prompt
3. 向后兼容：如果已有运行中的 bot，自动创建 BotConfig

所有代码已通过 lint 检查。现在你可以：
- 点击“添加交易Bot”创建新的 Bot
- 在 BotControlPanel 中启动/停止 Bot
- 编辑对应 Bot 环境的 Prompt

需要我测试运行或继续优化吗？

```plaintext
初始状态（无Bot）
└── 交易控制区显示 "+ 添加交易Bot" 按钮

添加Bot后
├── 交易控制区显示 BotControlPanel
│   ├── Bot配置（可编辑，运行时禁用）
│   ├── [启动] [停止] 按钮
│   └── 状态显示
│
└── Bot选择区自动更新
    └── Prompt编辑区加载对应env的模板
```

