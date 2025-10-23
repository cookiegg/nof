# TODO

实时维护 nof0 MVP 的实现进度。更新时间：2025-10-22

## Phase 1: 脚手架与基础设施
- [x] 阅读 `README.md`、`API_DISCOVERY.md`、`PLAN.md`
- [x] 在 `web/` 目录创建 Next.js 16 + Tailwind v4 + TS 项目
- [x] 安装依赖：`swr`、`zustand`、`date-fns`、`numeral`、`clsx`、`recharts`
- [ ] 基础设计系统变量与暗色主题

## Phase 2: API 集成层
- [x] 创建通用 `fetcher` 与 `BASE_URL`
- [x] 实现 hooks：`useCryptoPrices`、`usePositions`、`useTrades`、`useAccountTotals`、`useSinceInception`
- [x] CORS 代理：`/api/nof1/[...path]` 路由，前端改走本地 API
- [ ] 错误重试与退避策略优化

## Phase 3: 核心 UI（MVP）
- [x] 顶部导航 `Header`
- [x] 实时价格滚动条 `PriceTicker`
- [x] 主页：嵌入价格条 + 持仓概览（精简表格）
 - [x] POSITIONS 表头排序（side/symbol/lev/entry/price/unreal）
 - [x] Exit Plan 弹窗（目标/止损/失效条件）
 - [ ] Leaderboard 页面骨架

## Phase 4: 工具与格式化
- [x] 货币、百分比与时间格式化工具
- [ ] 颜色编码（盈亏上/下色）

## 后续
- [x] Recharts 账户价值折线图（since-inception-values）
- [ ] Zustand 状态管理与筛选器
- [ ] shadcn/ui 集成与组件替换
- [ ] 部署脚本与 README

---

## 新增待办（深挖清单）

### High Priority（1-2 天）
- [x] Leaderboard 实现（新接口 `/leaderboard`）
  - [ ] 新增 hook：`useLeaderboard`（`equity`、`return_pct`、`num_trades`、`num_wins/num_losses`、`sharpe`）
  - [x] 排名表：排序（收益率/净值/夏普/交易数），百分比格式
  - [x] Top 1 高亮，预留 `/models/[id]` 跳转（占位）
- [ ] Positions 汇总增强（对齐 `account-totals`）
  - [x] 可用现金≈净值-保证金、已实现PnL、未实现PnL、风险合计、平均置信度（卡片顶部）
  - [ ] 行内徽标/提示（confidence/risk）
- [ ] 错误/网络状态
  - [ ] 全局错误提示条（上游错误/离线）
  - [ ] SWR 重试/退避（指数退避，最多 3 次）
- [ ] 账户价值图表（`since-inception-values` + `account-totals`）
  - [x] 基于两端点合并；会话内增量累积（Zustand）
  - [x] 72H 采样（≤600 点）；空数据提示与调试链接
  - [x] 折线颜色接入模型映射（统一配色）
  - [x] 相同时间戳就地合并；Legend 点击显隐
- [ ] 代理可配置化
  - [ ] `.env`：`NOF1_BASE`，默认 `https://nof1.ai/api`；最简 GET 5s 缓存
  - [ ] 速率限制（每路由 QPS 限制）与简单熔断
  - [ ] 代理日志开关（仅错误时输出）

### A. API/数据层
- [ ] Proxy 可配置化：从 `process.env.NOF1_BASE` 读取上游地址，默认 `https://nof1.ai/api`
- [ ] 代理容错：上游非 2xx 时返回相同状态码与 body，并在前端提示
- [ ] 速率限制与缓存：`/api/nof1` 增加轻量限流与可选 5s 缓存（仅 GET）
- [ ] Zod 校验：对 `positions`、`trades`、`since-inception-values` 做运行时校验
- [ ] 模型名映射表：`model_id` → 友好展示名与配色、图标
- [ ] 时间戳统一：所有 Unix 秒 → Date 转换封装
 - [ ] `/analytics` 集成：费用/盈亏分解、胜负分布等表（用于 Leaderboard 的“高级分析”）
 - [ ] `account-totals` 分段拉取：启动时按 `lastHourlyMarker` 分页，减少全量一次性压力

### B. UI/交互
- [ ] Positions 过滤器：按模型、币种、方向过滤
- [ ] Exit Plan 弹窗：复制按钮与快捷分享
- [ ] Completed Trades Tab：最近 N 条成交，支持搜索与分页
- [ ] ModelChat Tab：占位与结构（后续接真实日志再填充）
- [ ] Leaderboard：按 `account-totals` 汇总账户净值、收益率、P&L 排名
- [ ] Chart：多模型账户价值折线图（ALL/72H，$/% 切换）
- [ ] 骨架屏与空态：loading skeleton、空数据提示
- [ ] 错误状态条：上游错误统一在页面顶部显示可关闭的提示条
- [x] 表格粘性表头、PnL 颜色工具、价格/表格骨架屏
 - [ ] 图例“仅看此模型”手势（Cmd/Ctrl 点击单选，双击重置）
 - [ ] 顶部价格条断线指示与最新更新时间戳
 - [ ] `/models/[id]` 详情页：概览（净值/收益率）、持仓、交易、价值曲线（同色）

### C. 设计与样式
- [ ] 深色主题 token：语义化颜色/间距/圆角变量
- [ ] 盈亏颜色规则：强弱/闪烁动画仅在变动时触发
- [ ] 等宽数字与箭头符号：涨跌视觉强化
- [ ] 终端风格微调：扫描线、栅格、轻噪声背景开关
- [x] 全局 Tabular 数字、终端扫描线背景
 - [ ] 自定义滚动条样式（暗色、细滚动条，仅在可滚动时显示）

### 新增：模型元信息
- [x] `model_id → 名称/颜色/图标` 映射：`lib/model/meta.ts`
- [ ] 图表折线颜色与表格徽标统一引用该映射

### D. 性能与稳定性
- [ ] SWR 重试与退避：指数退避、最大重试、离线提示
- [ ] 图表采样：>1000 点时降采样
- [ ] 列表虚拟化（如需要）
- [ ] Dev/Prod 差异：开发环境降低轮询频率
 - [ ] 图表就地更新：窗口切换/resize 时增量重算，避免全量重绘

### E. 工程与质量
- [ ] 轻量日志：前端 + 代理路由打印关键错误（可选接 Sentry）
- [ ] TypeScript 严格模式：补齐类型定义与 `noImplicitAny`
- [ ] E2E 冒烟脚本：简单 Playwright 检查页面可渲染与代理 200
- [ ] 简单单测：格式化与数据转换函数（Vitest）
 - [ ] Lint 规则收紧与 CI（eslint:recommended + typescript-eslint）

### F. 配置与部署
- [ ] `.env` 模板：`NOF1_BASE`、`NEXT_PUBLIC_APP_NAME`
- [ ] Vercel/Node 部署说明：无状态代理路由注意事项
- [ ] SEO/Meta：`metadata`、`robots.txt`、`sitemap`
- [ ] 监控：可选接入 Sentry DSN（环境区分）
 - [ ] 构建环境变量校验与回退（NOF1_BASE 缺失时提示）

### G. 法务与合规
- [ ] 数据来源与免责声明：非投资建议、第三方数据、可能延迟/不保证准确
- [ ] 版权与品牌：对 `nof1.ai` 的命名与标识做说明，避免混淆
 - [ ] 速率限制/使用条款提示（若对方 API 限制提高）

### H. 可用性与可访问性
- [ ] 键盘操作与焦点顺序
- [ ] 语义化标签与 `aria-*`
- [ ] 国际化预留：中/英文文案分离

### I. 路线图（可选）
- [ ] WebSocket 推进（如对方开放）
- [ ] 自定义模型对比视图
- [ ] 风险指标（回撤、夏普、胜率、R/R）
