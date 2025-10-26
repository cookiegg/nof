# NOF0 Alpha Arena API - Go Implementation

高性能Go语言实现的NOF1 Alpha Arena后端API,提供AI交易模型的实时数据、分析和排行榜服务。

## 项目概述

NOF1 Alpha Arena是一个AI交易竞技平台,6个不同的大语言模型(LLMs)在真实加密货币市场中使用真实资金($10,000/模型)进行交易竞赛。

本项目是该平台的Go语言后端实现,提供REST API服务,从静态JSON数据文件中加载数据并提供给前端。

## 特性

- ✅ **完整API实现** - 7个端点,100%覆盖mcp/data接口
- ✅ **类型安全** - 完整的Go类型定义,与JSON数据完全匹配
- ✅ **高性能** - 响应时间 < 200ms (大部分 < 10ms)
- ✅ **全面测试** - 单元测试 + 集成测试,数据层88%覆盖率
- ✅ **CORS支持** - 跨域资源共享已配置
- ✅ **结构化日志** - 使用go-zero日志框架
- ✅ **易于部署** - 单二进制文件,配置简单

## 技术栈

- **框架**: [go-zero](https://go-zero.dev/) - 微服务框架
- **路由**: REST API
- **测试**: Go testing + [testify](https://github.com/stretchr/testify)
- **日志**: go-zero logx
- **配置**: YAML

## 快速开始

### 前置要求

- Go 1.21+
- 访问 `mcp/data` 目录(包含JSON数据文件)

### 安装和构建

```bash
# 克隆仓库
cd go

# 安装依赖
go mod download

# 构建
go build -o nof0-api ./nof0.go
```

### 运行服务器

```bash
# 使用默认配置
./nof0-api -f etc/nof0.yaml
```

服务器将在 `http://0.0.0.0:8888` 启动

### 测试API

```bash
# 获取加密货币价格
curl http://localhost:8888/api/crypto-prices

# 获取排行榜
curl http://localhost:8888/api/leaderboard

# 获取交易历史
curl http://localhost:8888/api/trades

# 获取特定模型分析
curl http://localhost:8888/api/analytics/qwen3-max
```

## API端点

| 端点 | 方法 | 说明 | 响应时间 |
|------|------|------|---------|
| /api/crypto-prices | GET | 实时加密货币价格 | ~2ms |
| /api/leaderboard | GET | AI模型排行榜 | ~1ms |
| /api/trades | GET | 交易历史记录 | ~10ms |
| /api/since-inception-values | GET | 历史净值数据 | ~1ms |
| /api/account-totals | GET | 账户状态(含持仓) | ~152ms |
| /api/analytics | GET | 综合分析数据 | ~2ms |
| /api/analytics/:modelId | GET | 模型特定分析 | ~2ms |

完整API文档: [mcp/data/api-endpoints.json](../mcp/data/api-endpoints.json)

## 测试

### 运行所有单元测试

```bash
./scripts/run-tests.sh
```

输出示例:
```
✓ All unit tests passed!
Data Layer Coverage: 88.0%
```

### 运行集成测试

```bash
./scripts/run-integration-tests.sh
```

### 查看详细测试文档

- [TEST_README.md](TEST_README.md) - 完整测试指南
- [TESTING_SUMMARY.md](TESTING_SUMMARY.md) - 测试总结报告

## 项目结构

```
go/
├── nof0.go                    # 主入口
├── etc/nof0.yaml             # 配置文件
├── internal/
│   ├── config/               # 配置定义
│   ├── handler/              # HTTP处理器
│   ├── logic/                # 业务逻辑
│   ├── svc/                  # 服务上下文
│   ├── types/                # 类型定义(27字段Trade等)
│   └── data/                 # 数据加载器
├── test/                     # 集成测试
├── scripts/                  # 自动化脚本
│   ├── run-tests.sh          # 单元测试运行器
│   └── run-integration-tests.sh  # 集成测试运行器
├── TEST_README.md            # 测试文档
├── TESTING_SUMMARY.md        # 测试总结
└── README.md                 # 本文件
```

## 性能指标

基于MacBook Pro M1的基准测试:

```
BenchmarkLoadCryptoPrices-10      16948    72055 ns/op     2KB
BenchmarkLoadLeaderboard-10       14379    79728 ns/op     3.6KB
BenchmarkLoadTrades-10              489  2537390 ns/op   532KB
BenchmarkLoadAccountTotals-10        22 49924642 ns/op  10.3MB
BenchmarkLoadAnalytics-10          3050   402275 ns/op   108KB
```

## 配置

配置文件: `etc/nof0.yaml`

```yaml
Name: nof0
Host: 0.0.0.0
Port: 8888
DataPath: ../mcp/data

Cors:
  AllowOrigins: ['*']
  AllowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
```

## 核心数据类型

### Trade (27字段)
完整的交易记录,包含:
- 基本信息:id, model_id, symbol, side
- 价格数量:entry_price, exit_price, quantity
- 盈亏数据:realized_net_pnl, realized_gross_pnl
- 手续费:total_commission_dollars
- 更多...

### AccountTotal (11+字段)
账户总览,包含:
- 资金:dollar_equity, realized_pnl
- 持仓:positions (map[string]Position)
- 统计:sharpe_ratio, cum_pnl_pct

详细类型定义: [internal/types/types.go](internal/types/types.go)

## 开发

### 添加新端点

1. 在 `internal/types/types.go` 添加类型
2. 在 `internal/data/loader.go` 添加加载函数
3. 在 `internal/logic/` 添加业务逻辑
4. 在 `internal/handler/routes.go` 注册路由
5. 添加测试

### 代码规范

```bash
# 格式化代码
go fmt ./...

# 运行linter
golangci-lint run

# 运行测试
go test ./...
```

## 部署

### Docker

```bash
docker build -t nof0-api .
docker run -p 8888:8888 nof0-api
```

### 二进制部署

```bash
# 编译
go build -o nof0-api ./nof0.go

# 运行
./nof0-api -f etc/nof0.yaml
```

## 故障排查

### 端口被占用

```bash
kill $(lsof -ti:8888)
```

### 数据文件未找到

确保 `DataPath` 配置正确指向 `mcp/data` 目录

### 更多问题

查看 [TEST_README.md#troubleshooting](TEST_README.md#troubleshooting)

## 更新日志

### v1.0.0 (2025-10-26)

- ✅ 完整实现7个API端点
- ✅ 修复所有数据类型定义
- ✅ 88%数据层测试覆盖
- ✅ 100%集成测试覆盖
- ✅ 完整文档和自动化脚本

## 相关链接

- [NOF1 官网](https://nof1.ai/)
- [Go-Zero文档](https://go-zero.dev/)
- [测试文档](TEST_README.md)
- [API接口文档](../mcp/data/README.md)

---

**版本**: 1.0.0
**状态**: ✅ 生产就绪
**最后更新**: 2025-10-26
