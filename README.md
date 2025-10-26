# nof0

让 AI + Crypto 走向大众视野：用真实数据和清晰可视化，回答"哪个模型更会赚"的朴素问题。

**nof0/web** 是一个基于 Next.js 的前端实现，聚焦"开箱即用"的数据呈现与演示，最终目标是做一个nof1.ai的仿盘

---

## 项目结构

```
nof0/
├── web/        # 前端（Next.js + React + Recharts）
├── go/         # 后端（Go + go-zero，开发中🚧）
├── mcp/        # 数据与视觉参考资料
└── markdown/   # AI 代码 Plan 与设计文档
```

---

## 核心看点

- **账户总资产曲线**：模型多线对比，末端以模型 Logo 强调最新点，水印可见不扰视
- **模型图例**：带品牌色与白色版 Logo，支持单模型聚焦、移动端横向滑动
- **主题切换**：Dark/Light/System，颜色/网格/Tooltip 全量适配（默认 Dark）
- **移动端适配**：自适应边距与最小高度，保证小屏稳定出图

## 快速开始

### 前端

```bash
cd web
npm install
npm run dev
```

访问 `http://localhost:3000`

### 后端

```bash
cd go
go build -o nof0-api ./nof0.go
./nof0-api -f etc/nof0.yaml
```

服务运行在 `http://localhost:8888`，完整文档见 [go/README.md](go/README.md)

## 数据快照（备份参考）

一键下载 nof1.ai 的上游接口原始数据，离线保存：

```bash
npm run snapshot:nof1
```

**生成内容：**
- 生成目录：`snapshots/nof1/<ISO时间戳>/*.json` 与 `index.json`
- 已包含：crypto-prices、positions、trades、account-totals、since-inception-values、leaderboard、analytics、conversations
- **说明**：默认不提交到仓库（见 `.gitignore`），如需入库可移除忽略规则

## 主要特性与实现要点

### 自定义图例与末端标记
基于 Recharts，自定义 dot 与按钮；末端 Logo 尺寸与右侧边距动态联动，避免裁切同时减少留白。

### 品牌色与白色 Logo
在 `src/lib/model/meta.ts` 统一配置品牌色与白色版图标，风格一致。

### 主题变量驱动
`globals.css` 使用 CSS 变量驱动全部主题样式（如 `--panel-bg`、`--muted-text`、`--axis-tick` 等），避免 SSR/CSR 水合差异。

开发规范：请参考 `web/docs/theme.md`，新增组件不要再用 `isDark` 分支判断颜色，统一使用变量与 `.chip-btn` 等通用样式。

## 技术栈

### 前端 (web/)
- **框架**: Next.js 15 + React 19 + TypeScript
- **图表**: Recharts
- **状态**: Zustand
- **样式**: CSS Variables（主题系统）

### 后端 (go/) 🚧 开发中
- **框架**: go-zero（微服务框架）
- **特性**: 7个REST端点、88%测试覆盖、响应时间<200ms
- **数据**: 从 mcp/data 加载静态JSON
- **状态**: 功能完成，尚未正式发布

## 开发说明

- **前端**: 通过 `web/src/app/api/nof1/[...path]/route.ts` 代理上游接口（避免CORS）
- **后端**: 独立运行，从本地JSON文件读取数据，无需外部依赖
- **数据**: 上游接口不可用时，可用"数据快照"作为离线参考
