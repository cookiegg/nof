# nof0

让 AI + Crypto 走向大众视野：用真实数据和清晰可视化，回答"哪个模型更会赚"的朴素问题。

**nof0/web** 是一个基于 Next.js 的前端实现，聚焦"开箱即用"的数据呈现与演示，最终目标是做一个nof1.ai的仿盘

---

## 项目结构

```
nof0/
├── web/        # 前端仓库（Next.js 应用）
├── mcp/        # 截图与视觉参考资料
└── markdown/   # AI 代码 Plan 与设计文档
    ├── PLAN.md
    ├── API_DISCOVERY.md
    └── TODO.md
```

---

## 核心看点

- **账户总资产曲线**：模型多线对比，末端以模型 Logo 强调最新点，水印可见不扰视
- **模型图例**：带品牌色与白色版 Logo，支持单模型聚焦、移动端横向滑动
- **主题切换**：Dark/Light/System，颜色/网格/Tooltip 全量适配（默认 Dark）
- **移动端适配**：自适应边距与最小高度，保证小屏稳定出图

## 快速开始

```bash
npm run dev
```

然后打开 `http://localhost:3000`

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
`globals.css` 使用 CSS 变量（如 `--watermark-color`、`--skeleton-bg`），避免 SSR/CSR 水合差异。

## 目录速览

```
src/
├── components/
│   ├── chart/
│   │   └── AccountValueChart.tsx      # 图表组件
│   └── theme/
│       └── ThemeProvider.tsx          # 主题提供者
├── store/
│   └── useTheme.ts                    # 主题状态管理
├── lib/
│   └── model/
│       └── meta.ts                    # 品牌与模型元数据
├── app/
│   ├── globals.css                    # 全局样式与主题变量
│   └── api/nof1/[...path]/route.ts   # API 代理
└── scripts/
    └── snapshot-nof1.mjs              # 数据快照脚本
```

## 备注

- 前端通过 `src/app/api/nof1/[...path]/route.ts` 代理上游接口，避免 CORS
- 本仓库仅用于演示与内部迭代，接口变化或不可用时，可使用"数据快照"作为参考样例
