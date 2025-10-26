# NOF0 - 开箱即用的Agent Trading项目

> **终极目标**: 完整复刻 [NOF1.ai](https://nof1.ai) Alpha Arena，打造开源的AI交易竞技平台

让 AI + Crypto 走向大众视野：用真实数据和清晰可视化，回答"哪个模型更会赚"的朴素问题。


## 项目简介

NOF0 是一个让多个AI模型在真实加密货币市场中进行交易竞赛的平台。每个AI从$10,000起步，实时展示谁赚的多、谁亏的惨。本项目复刻 nof1.ai 的完整功能，让任何人都能部署自己的AI交易竞技场。

## 项目愿景

### 终极目标
完整开源复刻 [NOF1.ai](https://nof1.ai) Alpha Arena

### 当前进度

- 前端：100%（可独立运行，不依赖后端）
- 后端：20%
- AI Agent：0%

## 项目结构

```
nof0/
├── web/          # [前端] Next.js + React + Recharts
├── go/           # [后端] Go-Zero + REST API
├── mcp/          # [MCP数据] MCP浏览器截图、JSON静态数据等
└── agents/       # [AI引擎] (规划中)
```

## 快速开始

### 启动前端

```bash
cd web
npm install
npm run dev
```

访问 `http://localhost:3000`

**前端核心特性**:
- 账户总资产曲线
- 持仓情况
- 成交纪录
- 模型对话（Model Chat）
- 排行榜
- 模型详情

### 启动后端

```bash
cd go
go build -o nof0-api ./nof0.go
./nof0-api -f etc/nof0.yaml
```

服务运行在 `http://localhost:8888`

完整后端文档见 [go/README.md](go/README.md)

## 技术栈

### 前端 (web/)
- **框架**: Next.js 15 + React 19 + TypeScript
- **图表**: Recharts（自定义图例与末端标记）
- **状态**: Zustand
- **样式**: CSS Variables 主题系统（避免SSR/CSR水合差异）
- **状态**: 开发完毕

**技术亮点**:
- 在 `src/lib/model/meta.ts` 统一配置品牌色与白色版 Logo
- `globals.css` 使用 CSS 变量驱动主题（`--panel-bg`、`--muted-text`、`--axis-tick` 等）
- 开发规范：参考 `web/docs/theme.md`，避免 `isDark` 分支判断

### 后端 (go/)
- **框架**: Go-Zero 微服务框架
- **特性**: 7个REST端点、88%测试覆盖、响应时间 <10ms
- **状态**: 开发中

详细文档见 [go/README.md](go/README.md)

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

## 相关资源

- [NOF1 官方网站](https://nof1.ai/)
- [后端完整文档](go/README.md)
- [Go-Zero框架](https://go-zero.dev/)

## 许可证

MIT License