## 系统功能与数据流向图（最新）

```mermaid
flowchart TB
  %% 视图分层：Web → 代理 → 上游 → 外部/本地数据

  subgraph Web[Web 前端（Next.js App Router）]
    Pages[页面/组件 src/app/* + src/components/*]
    Hooks[数据 Hooks src/lib/api/hooks/*]
    Nof1Client[API 封装 src/lib/api/nof1.ts + client.ts]
    ProxyEdge[代理 /api/nof1/*（Edge Runtime）]
    TranslateNode[翻译 /api/translate（Node Runtime）]
  end

  subgraph Upstream[上游 API（可配置）]
    EnvSel{优先级：\nNOF_API_BASE_URL → NOF1_API_BASE_URL → 官方}
    NodeBackend[本地后端 backend/（Node + ccxt）\n基址示例：http://localhost:3001/api]
    Official[(官方 NOF1 API\nhttps://nof1.ai/api)]
  end

  subgraph Backend[backend/（Node 服务，仅当选择本地上游）]
    ApiRoot[[API 网关 /api]]
    subgraph Nof1Compat[复刻 NOF1 契约（对齐前端结构）]
      CP[GET /crypto-prices]
      AT[GET /account-totals]
      TR[GET /trades]
      SI[GET /since-inception-values]
      LB[GET /leaderboard]
      AN[GET /analytics]
      CV[GET /conversations]
      PO[GET /positions]
      PR[GET/POST /prompts]
    end
    subgraph Services[内部服务]
      BinanceSvc[binance.ts（ccxt 封装：行情/余额/订单）]
      MetricsSvc[metrics.ts（推导净值/榜单/起始）]
      StoreSvc[fsStore.ts（JSON 读写）]
    end
    Data[(backend/data/*.json\ntrades.json / analytics.json\nconversations.json / prompts.json)]
    Env[(.env：BINANCE_API_KEY/SECRET\nBINANCE_TESTNET=true)]
  end

  subgraph External[外部服务]
    BinanceAPI[(Binance Testnet\nREST / WS)]
    LLM[(LLM/翻译供应商\n通过 /api/translate)]
  end

  %% 前端主要数据链路
  Pages --> Hooks --> Nof1Client --> ProxyEdge
  ProxyEdge -->|构造 /api/nof1/* → 选择上游| EnvSel
  EnvSel -->|NOF_API_BASE_URL| ApiRoot
  EnvSel -->|NOF1_API_BASE_URL| Official
  EnvSel -->|默认| Official

  %% 本地后端内部数据流
  ApiRoot --> CP
  ApiRoot --> AT
  ApiRoot --> TR
  ApiRoot --> SI
  ApiRoot --> LB
  ApiRoot --> AN
  ApiRoot --> CV
  ApiRoot --> PO
  ApiRoot --> PR

  %% 依赖关系
  CP --> BinanceSvc
  AT --> MetricsSvc
  LB --> MetricsSvc
  SI --> MetricsSvc
  TR --> StoreSvc
  AN --> StoreSvc
  CV --> StoreSvc
  PR --> StoreSvc

  BinanceSvc --> BinanceAPI
  StoreSvc <--> Data
  Env -.-> BinanceSvc

  %% 翻译/LLM 并行链路
  Pages -.-> TranslateNode -.-> LLM
```

### 说明
- 前端组件与 hooks 仍消费 `/api/nof1/*`；代理根据环境变量把流量导向本地 backend 或官方上游。
- 选择本地后端时：行情通过 ccxt 访问 Binance Testnet；`trades/analytics/conversations/prompts` 读写本地 JSON；`account-totals/leaderboard/since-inception-values` 由 `metrics.ts` 推导生成。
- `NOF_API_BASE_URL` 优先于 `NOF1_API_BASE_URL`；未设置时默认直连官方。

---

## 功能逻辑图（当前项目，贴近 framework.png）

```mermaid
flowchart LR
  %% 方向：从左到右，强调“人→前端→后端→外部/数据”的业务流程

  User[用户] -->|交互| FE[前端网页]

  subgraph FE[前端网页（Next.js）]
    subgraph Panel[操作控件]
      ModelPick[模型选择]
      PromptsEdit[Prompts 编辑（system/user）]
      TradeType[交易类型选择（现仅展示）]
      RunCtrl[启动/暂停/停止（预留）]
    end
    subgraph View[数据展示区]
      PriceV[价格快照]
      TotalsV[账户净值曲线]
      LeaderV[排行榜]
      TradesV[历史成交]
      PosV[持仓（来自 totals 内嵌，若有）]
      AnalyticV[分析统计]
      ConvV[对话记录]
    end
    Proxy[/代理 /api/nof1/*/]
  end

  %% 代理上游选择
  Proxy -->|NOF_API_BASE_URL（优先）/ NOF1_API_BASE_URL / 默认| API

  subgraph BE[本地后端 backend/（Node）]
    API[[API 网关 /api]]
    CP[GET /crypto-prices]
    AT[GET /account-totals]
    TR[GET /trades]
    SI[GET /since-inception-values]
    LB[GET /leaderboard]
    AN[GET /analytics]
    CV[GET /conversations]
    PO[GET /positions]
    PR[GET/POST /prompts]

    CP --> BinanceSvc
    AT --> Metrics
    LB --> Metrics
    SI --> Metrics
    TR --> Store
    AN --> Store
    CV --> Store
    PR --> Store

    subgraph BinanceSvc[ccxt 封装]
    end
    subgraph Metrics[推导：净值/榜单/起始]
    end
    subgraph Store[本地 JSON 存储]
      Files[(prompts.json\ntrades.json\nanalytics.json\nconversations.json)]
    end
  end

  %% 外部服务
  BinanceSvc --> BX[(Binance Testnet)]

  %% 前端数据拉取与写入流
  ModelPick -. 状态 -.-> FE
  PromptsEdit <-.-> |/api/nof1/prompts| PR
  PriceV --> |/api/nof1/crypto-prices| CP
  TotalsV --> |/api/nof1/account-totals| AT
  LeaderV --> |/api/nof1/leaderboard| LB
  TradesV --> |/api/nof1/trades| TR
  PosV --> |/api/nof1/positions| PO
  AnalyticV --> |/api/nof1/analytics| AN
  ConvV --> |/api/nof1/conversations| CV
```

说明：
- 当前实现中，真实交易执行与账户订单同步未开启；交互侧以 prompts 保存、本地 JSON 数据与 ccxt 行情为主。
- 后端通过 `trades.json` 推导 `account-totals/leaderboard/since-inception-values`，用于驱动前端曲线与榜单。
```mermaid
flowchart TB
  %% 布局：自上而下
  subgraph Web[Web 前端（Next.js App Router）]
    Pages[页面/组件 src/app/* + src/components/*]
    Hooks[数据 hooks src/lib/api/hooks/*]
    Nof1Client[API 封装 src/lib/api/nof1.ts + client.ts]
    ProxyEdge[代理 /api/nof1/*（Edge Runtime）]
    TranslateNode[翻译 /api/translate（Node Runtime）]
  end

  subgraph Backend[自建后端 backend/（Node）]
    ApiRoot[[API 网关 /api]]
    subgraph NOF1Compat[复刻 NOF1 契约（对齐前端期望结构）]
      CP[GET /crypto-prices]
      AT[GET /account-totals]
      TR[GET /trades]
      SI[GET /since-inception-values]
      LB[GET /leaderboard]
      AN[GET /analytics]
      CV[GET /conversations]
      PO[GET /positions]
      PR[GET/POST /prompts]
    end
    subgraph Services[内部服务]
      BinanceSvc[binance.ts（ccxt 封装）]
      MetricsSvc[metrics.ts（净值/榜单推导）]
      StoreSvc[fsStore.ts（JSON 读写）]
    end
    Data[(backend/data/*.json)]
    Env[(.env：BINANCE_API_KEY/SECRET，BINANCE_TESTNET=true)]
  end

  subgraph Exchange[Binance Testnet]
    BinanceAPI[(REST / WS)]
  end

  %% 前端链路（仅切换上游目标）
  Pages --> Hooks --> Nof1Client --> ProxyEdge
  ProxyEdge -->|NOF1_API_BASE_URL=http://localhost:PORT/api| ApiRoot

  %% 后端对外到内部
  ApiRoot --> CP
  ApiRoot --> AT
  ApiRoot --> TR
  ApiRoot --> SI
  ApiRoot --> LB
  ApiRoot --> AN
  ApiRoot --> CV
  ApiRoot --> PO
  ApiRoot --> PR

  %% 内部依赖
  CP --> BinanceSvc
  AT --> MetricsSvc
  LB --> MetricsSvc
  SI --> MetricsSvc
  PO --> MetricsSvc
  TR --> StoreSvc
  AN --> StoreSvc
  CV --> StoreSvc
  PR --> StoreSvc

  BinanceSvc --> BinanceAPI
  StoreSvc <--> Data
  Env -.-> BinanceSvc

  %% 并行能力
  TranslateNode --> Pages
```
