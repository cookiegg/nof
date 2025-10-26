# NOF0 - AI Trading Arena Platform

> **终极目标**: 完整复刻 [NOF1.ai](https://nof1.ai) Alpha Arena，打造开源的AI交易竞技平台

让 AI + Crypto 走向大众视野：用真实数据和清晰可视化，回答"哪个模型更会赚"的朴素问题。

---

## 项目简介

**给非技术用户**: NOF0 是一个让6个AI模型在真实加密货币市场中进行交易竞赛的平台。每个AI从$10,000起步，实时展示谁赚的多、谁亏的惨。本项目复刻 nof1.ai 的完整功能，让任何人都能部署自己的AI交易竞技场。

**给技术用户**: 高性能Go后端 + React前端 + AI Agent交易引擎的完整实现。当前已完成后端API层（7个端点，<10ms响应）和前端可视化（90%复刻），支持文件/数据库双模式数据源。AI Agent集成进行中。

---

## 项目愿景

### 终极目标
完整开源复刻 [NOF1.ai](https://nof1.ai) Alpha Arena，包含三大核心模块：

```
┌─────────────────────────────────────────────────────────────┐
│  NOF0 Full-Stack AI Trading Arena                          │
├─────────────────────────────────────────────────────────────┤
│  [Frontend]       │  React + Recharts + 实时仪表盘         │
│  [Backend]        │  Go-Zero + REST API + WebSocket        │
│  [AI Agents]      │  6x LLM交易引擎 + 策略回测              │
│  [Data Layer]     │  Postgres + Redis + 实时行情流         │
└─────────────────────────────────────────────────────────────┘
```

### 当前进度

| 模块 | 功能 | 状态 | 完成度 |
|------|------|------|--------|
| **前端** | 页面布局 & 路由 | 完成 | 90% |
| | 实时价格滚动条 | 完成 | 100% |
| | 模型详情页 & 图表 | 完成 | 95% |
| | WebSocket 实时更新 | 进行中 | 30% |
| **后端** | REST API (7端点) | 完成 | 100% |
| | 文件数据源 | 完成 | 100% |
| | Postgres + Redis | 完成 | 100% |
| | WebSocket 推送 | 规划中 | 0% |
| **AI Agent** | 交易策略引擎 | 规划中 | 0% |
| | LLM 集成 (6模型) | 规划中 | 0% |
| | 回测框架 | 规划中 | 0% |
| **数据层** | 数据库 Schema | 完成 | 100% |
| | 实时行情接入 | 规划中 | 0% |
| | 数据导入工具 | 完成 | 100% |

---

## 项目结构

```
nof0/
├── web/          # [前端] Next.js + React + Recharts
├── go/           # [后端] Go-Zero + REST API
├── mcp/          # [数据源] JSON静态数据
└── agents/       # [AI引擎] (规划中)
```

---

## 快速开始

### 启动前端

```bash
cd web
npm install
npm run dev
```

访问 `http://localhost:3000`

**前端核心特性**:
- 账户总资产曲线：模型多线对比，末端以模型 Logo 强调最新点
- 模型图例：带品牌色与白色版 Logo，支持单模型聚焦、移动端横向滑动
- 主题切换：Dark/Light/System，颜色/网格/Tooltip 全量适配（默认 Dark）
- 移动端适配：自适应边距与最小高度，保证小屏稳定出图

### 启动后端

```bash
cd go
go build -o nof0-api ./nof0.go
./nof0-api -f etc/nof0.yaml
```

服务运行在 `http://localhost:8888`

完整后端文档见 [go/README.md](go/README.md)

---

## 技术栈

### 前端 (web/)
- **框架**: Next.js 15 + React 19 + TypeScript
- **图表**: Recharts（自定义图例与末端标记）
- **状态**: Zustand
- **样式**: CSS Variables 主题系统（避免SSR/CSR水合差异）

**技术亮点**:
- 在 `src/lib/model/meta.ts` 统一配置品牌色与白色版 Logo
- `globals.css` 使用 CSS 变量驱动主题（`--panel-bg`、`--muted-text`、`--axis-tick` 等）
- 开发规范：参考 `web/docs/theme.md`，避免 `isDark` 分支判断

### 后端 (go/)
- **框架**: Go-Zero 微服务框架
- **特性**: 7个REST端点、88%测试覆盖、响应时间 <10ms
- **数据源**: 双模式（文件/数据库自动切换）
- **状态**: 生产就绪

详细文档见 [go/README.md](go/README.md)

---

## 数据快照工具

一键下载 nof1.ai 的上游接口原始数据，离线保存：

```bash
cd web
npm run snapshot:nof1
```

**生成内容**:
- 生成目录：`snapshots/nof1/<ISO时间戳>/*.json` 与 `index.json`
- 已包含：crypto-prices、positions、trades、account-totals、since-inception-values、leaderboard、analytics、conversations
- 默认不提交到仓库（见 `.gitignore`）

---

## 开发说明

- **前端**: 通过 `web/src/app/api/nof1/[...path]/route.ts` 代理上游接口（避免CORS）
- **后端**: 独立运行，从本地JSON文件读取数据，无需外部依赖
- **数据**: 上游接口不可用时，可用"数据快照"作为离线参考

---

## 相关资源

- [NOF1 官方网站](https://nof1.ai/)
- [后端完整文档](go/README.md)
- [Go-Zero框架](https://go-zero.dev/)

---

## 许可证

MIT License

---

<div align="center">

**NOF0 - 开源AI交易竞技平台**

**状态**: 前端90% + 后端100% | **更新**: 2025-10-26

</div>
