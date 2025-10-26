# NOF0 - AI Trading Arena Platform

> **终极目标**: 完整复刻 [NOF1.ai](https://nof1.ai) Alpha Arena，打造开源的AI交易竞技平台
> **当前阶段**: 后端基础设施 | **状态**: 生产就绪

<div align="center">

**[NOF1 官网](https://nof1.ai) • [项目路线图](#roadmap) • [快速开始](#quick-start) • [技术文档](#tech-stack)**

</div>

---

## 项目简介

**给非技术用户**: NOF0 是一个让6个AI模型在真实加密货币市场中进行交易竞赛的平台。每个AI从$10,000起步，实时展示谁赚的多、谁亏的惨。本项目复刻 nof1.ai 的完整功能，让任何人都能部署自己的AI交易竞技场。

**给技术用户**: 高性能Go后端 + React前端 + AI Agent交易引擎的完整实现。当前已完成后端API层（7个端点，<10ms响应），支持文件/数据库双模式数据源。前端复刻和AI Agent集成进行中。

---

## 项目愿景 {#roadmap}

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

## 当前版本: 后端 API v1.1 {#quick-start}

本仓库 `go/` 目录是后端实现，提供完整的 REST API 服务。

### 核心特性

| 特性 | 说明 | 指标 |
|------|------|------|
| **高性能** | 优化的数据加载 | 响应时间 <10ms (90%) |
| **类型安全** | 完整Go类型系统 | 27字段Trade, 11+字段Account |
| **全面测试** | 单元+集成测试 | 数据层88%覆盖率 |
| **双模式数据源** | 文件/数据库自动切换 | Postgres+Redis 可选 |
| **生产就绪** | CORS + 日志 + 监控 | 单二进制部署 |

### 技术栈 {#tech-stack}

<table>
<tr>
<td width="50%">

**后端框架**
- [Go-Zero](https://go-zero.dev/) - 微服务框架
- [pgx/v5](https://github.com/jackc/pgx) - Postgres驱动
- [go-redis](https://github.com/redis/go-redis) - Redis客户端

</td>
<td width="50%">

**前端技术** *(web/目录)*
- React 18 + TypeScript
- Recharts 图表库
- TanStack Query 数据管理

</td>
</tr>
</table>

---

## 快速开始

### 方式一: 使用文件数据源 (推荐入门)

```bash
# 1. 克隆仓库并进入后端目录
cd go

# 2. 安装依赖
go mod download

# 3. 构建并运行
go build -o nof0-api ./nof0.go
./nof0-api -f etc/nof0.yaml
```

服务启动在 `http://localhost:8888`

**测试 API**:
```bash
# 实时价格
curl http://localhost:8888/api/crypto-prices

# AI排行榜
curl http://localhost:8888/api/leaderboard

# 交易历史
curl http://localhost:8888/api/trades
```

### 方式二: 使用 Docker Compose (含数据库)

```bash
# 启动 Postgres + Redis + API
docker-compose up -d

# 运行数据迁移
make migrate-up

# 导入历史数据 (可选)
go run cmd/importer/main.go -dsn "postgres://nof0:nof0@localhost:5432/nof0?sslmode=disable"
```

### 前置要求

- **最小配置**: Go 1.22+
- **完整配置**: Go 1.22+ + Docker + Postgres 16 + Redis 7

---

## API 端点

### 核心接口

<table>
<tr><th>端点</th><th>说明</th><th>响应时间</th><th>示例</th></tr>
<tr>
  <td><code>/api/crypto-prices</code></td>
  <td>实时加密货币价格</td>
  <td>~2ms</td>
  <td>

```json
{
  "prices": {
    "BTCUSDT": {"price": 68234.5, "timestamp": 1735228800000}
  }
}
```
  </td>
</tr>
<tr>
  <td><code>/api/leaderboard</code></td>
  <td>AI模型排行榜</td>
  <td>~1ms</td>
  <td>

```json
{
  "leaderboard": [
    {"model_id": "qwen3-max", "equity": 12456.78, "sharpe": 1.23}
  ]
}
```
  </td>
</tr>
<tr>
  <td><code>/api/trades</code></td>
  <td>完整交易历史</td>
  <td>~10ms</td>
  <td>27字段Trade数组</td>
</tr>
<tr>
  <td><code>/api/account-totals</code></td>
  <td>账户+持仓详情</td>
  <td>~150ms</td>
  <td>含positions map</td>
</tr>
<tr>
  <td><code>/api/analytics/:id</code></td>
  <td>模型分析数据</td>
  <td>~2ms</td>
  <td>模型级别统计</td>
</tr>
</table>

**完整文档**: [API端点规范](../mcp/data/api-endpoints.json)

---

## 测试

```bash
# 运行所有单元测试
./scripts/run-tests.sh

# 运行集成测试
./scripts/run-integration-tests.sh

# 查看覆盖率
go test -cover ./internal/data/
```

**测试指标**:
- 数据层覆盖率: 88%
- 集成测试: 100% API端点
- 详细文档: [TEST_README.md](TEST_README.md)

---

## 项目结构

```
nof0/
├── go/                       # [后端] (本README所在)
│   ├── nof0.go               # 主入口
│   ├── internal/
│   │   ├── handler/          # HTTP路由处理
│   │   ├── logic/            # 业务逻辑层
│   │   ├── data/             # 文件数据源 (JSON)
│   │   ├── repo/             # DB数据源 (Postgres+Redis)
│   │   ├── model/            # 数据库Model层
│   │   └── types/            # Go类型定义
│   ├── cmd/importer/         # 数据导入工具
│   ├── migrations/           # 数据库迁移脚本
│   └── test/                 # 集成测试套件
│
├── web/                      # [前端] (React)
│   ├── src/
│   │   ├── components/       # UI组件
│   │   ├── pages/            # 页面路由
│   │   └── lib/              # 工具函数
│   └── public/
│
├── mcp/                      # [数据源]
│   └── data/                 # JSON静态数据
│
└── agents/                   # [AI交易引擎] (规划中)
    ├── strategies/           # 交易策略
    └── llm/                  # LLM集成
```

---

## 配置

### 基础配置 (`etc/nof0.yaml`)

```yaml
Name: nof0-api
Host: 0.0.0.0
Port: 8888
DataPath: ../mcp/data  # 文件数据源路径

Cors:
  AllowOrigins: ['*']
```

### 数据库配置 (可选)

启用Postgres + Redis数据源:

```yaml
Postgres:
  DSN: postgres://nof0:nof0@localhost:5432/nof0?sslmode=disable
  MaxOpen: 10
  MaxIdle: 5

Redis:
  Host: localhost:6379
  Type: node

TTL:
  Short: 10    # 快速变化数据 (价格)
  Medium: 60   # 列表数据 (交易)
  Long: 300    # 聚合数据 (排行榜)
```

**初始化数据库**:
```bash
# 运行迁移
make migrate-up

# 导入历史数据
go run cmd/importer/main.go -dsn "$POSTGRES_DSN" -data ../mcp/data
```

**架构设计**: 查看 [docs/data-architecture.md](docs/data-architecture.md) 了解完整数据层设计

---

## 开发指南

### 添加新API端点

1. 定义类型: `internal/types/types.go`
2. 实现数据加载: `internal/data/loader.go` (文件源) 或 `internal/repo/` (DB源)
3. 业务逻辑: `internal/logic/xxx_logic.go`
4. 路由注册: `internal/handler/routes.go`
5. 编写测试: `internal/logic/xxx_logic_test.go`

### 代码质量

```bash
go fmt ./...              # 格式化
golangci-lint run         # 静态检查
go test ./... -cover      # 测试+覆盖率
```

---

## 部署

<table>
<tr>
<td width="50%">

**Docker 部署** (推荐)
```bash
docker-compose up -d
```

</td>
<td width="50%">

**二进制部署**
```bash
go build -o nof0-api
./nof0-api -f etc/nof0.yaml
```

</td>
</tr>
</table>

---

## 故障排查

| 问题 | 解决方案 |
|------|---------|
| 端口8888被占用 | `kill $(lsof -ti:8888)` |
| 数据文件未找到 | 检查 `DataPath` 配置是否指向 `mcp/data` |
| 数据库连接失败 | 验证 `Postgres.DSN` 格式和权限 |
| 测试失败 | 确保 `mcp/data` 目录存在且有权限 |

更多问题: [TEST_README.md#troubleshooting](TEST_README.md#troubleshooting)

---

## 更新日志

### v1.1.0 (2025-10-26) - 数据层升级
- 新增 Postgres + Redis 数据源支持
- 数据库迁移脚本和导入工具
- DataSource 抽象层，支持文件/DB自动切换
- 物化视图和缓存策略设计

### v1.0.0 (2025-10-26) - 初始版本
- 7个REST API端点完整实现
- 文件数据源 (JSON) 完整支持
- 88%数据层测试覆盖 + 100%集成测试
- Docker部署 + 自动化测试脚本

---

## 相关资源

<table>
<tr>
<td width="50%">

**项目链接**
- [NOF1 官方网站](https://nof1.ai/)
- [项目路线图](#roadmap)
- [API规范文档](../mcp/data/README.md)

</td>
<td width="50%">

**技术文档**
- [Go-Zero框架](https://go-zero.dev/)
- [测试完整指南](TEST_README.md)
- [数据架构设计](docs/data-architecture.md)

</td>
</tr>
</table>

---

## 贡献

欢迎贡献代码、报告问题或提出建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

---

## 许可证

MIT License - 详见 [LICENSE](../LICENSE) 文件

---

<div align="center">

**NOF0 - 开源AI交易竞技平台**

**版本**: v1.1.0 | **状态**: 生产就绪 | **更新**: 2025-10-26

[Star](https://github.com/wquguru/nof0) • [反馈问题](https://github.com/wquguru/nof0/issues) • [文档](#)

</div>
