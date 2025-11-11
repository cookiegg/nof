# nof — 面向多交易类型与多模型的 AI 交易实验系统

>最近很火的nof1.ai的alpha arena AI自动交易竞赛刚刚落下帷幕,但是如同《攻壳机动队》中所言的**全自动资本主义**的序幕才刚刚拉开。以其站在岸边见证它是最好的时代，抑或是最坏的时代， 不如亲身下场，将其构建成你希望的样子。


跟其他仿nof1的项目不一样的地方在于，该项目更加趋于一个量化交易实验系统，提供了更加方便的模拟交易类型集成，以及prompt修改与复用，以便调整出更加完善的prompt,以避免交易损失。

- 支持多交易类型：期货测试（demo-futures）、现货测试（test-spot）、本地模拟（local-simulated）以及实盘自动交易。
- 支持多模型自由切换：Qwen、DeepSeek、GLM 等，通过更换 API Key 或预设即可迅速验证不同模型的策略效果。
- Prompt 可视化管理：内置 Prompt Studio，按环境与 Bot 分别管理系统/用户模板，随时微调、热更新生效。
- 多 Bot 并行：多台 Bot 同时运行、独立账户状态与会话/成交数据，支持排行榜与净值曲线对比。


适合人群：
- 想快速验证“不同 LLM + 不同交易环境 + 不同提示词”组合的研究者/开发者。
- 需要低门槛启动（不必部署数据库/队列）的个人或小团队。

项目前端基于 @wquguru 构建的 nof0 前端系统进行改造，非常感谢作者开源。

>加密货币市场交易波动巨大，风险极高，请务必谨慎，保护好自己的资金。

---

## 界面预览（Interface Preview）

<div align="center" style="margin-bottom: 1.5rem;">
  <img src="assets/home_page.png" alt="交易主页全貌" style="max-width: 100%; width: 860px; border: 1px solid #e5e5e5; border-radius: 8px;" />
  <p style="margin-top: 0.5rem; color: #666;">交易面板：行情 Ticker、Bot 列表、Prompt Studio Chat 与账户曲线一览</p>
</div>

<div align="center" style="margin-bottom: 1.5rem;">
  <img src="assets/add_bot.png" alt="添加交易 Bot 弹窗" style="max-width: 100%; width: 420px; border: 1px solid #e5e5e5; border-radius: 8px;" />
  <p style="margin-top: 0.5rem; color: #666;">添加 Bot 弹窗：选择交易类型、AI 模型、Prompt 模式与轮询间隔</p>
</div>

---

## 快速开始（3 分钟）
0）注册币安账户(使用如下链接注册,你我都能享受手续费优惠):
  [注册链接]https://accounts.maxweb.red/register?ref=BEC0NPI5
1) 创建配置文件（推荐）
- 参考`config.json.example`,在仓库根目录新建/编辑 `config.json`（示例见下方）。

1) 安装与运行
```bash
# 后端
cd backend && npm install && npm run dev
# 前端（另一个终端）
cd web && npm install && npm run dev
# 打开 http://localhost:3000
```

1) 一键启动
```bash
bash scripts/oneclick.sh   # 自动检查 Node、安装依赖、后台启动
bash scripts/stop.sh       # 一键停止
```

Windows (.bat) 一键脚本：
```bat
scripts\oneclick-win.bat   # 安装依赖并在新窗口启动前后端
scripts\stop-win.bat       # 停止 dev 进程（按命令行匹配）
```

---

## 你可以用 nof 做什么？
- 同时跑多台 Bot，对比不同模型或不同提示词的表现。
- 随时修改 Prompt 模板（系统/用户），实验风险控制、开平仓规则与风格偏好。
- 在现货测试网/期货 Demo 上进行“真接口、假资金”的风控验证；或在本地模拟撮合下做策略回归。
- 通过图表与排行榜快速洞察收益曲线、胜率与成交分布。

---

## 配置文件示例（config.json）
将以下内容保存为仓库根目录的 `config.json`：
```json
{
  "env": {
    "NEXT_PUBLIC_URL": "http://localhost:3000",
    "DASHSCOPE_API_KEY_1": "sk-xxx",
    "DASHSCOPE_API_KEY_2": "sk-xxx",
    "HTTPS_PROXY": "http://127.0.0.1:7890",
    "HTTP_PROXY": "http://127.0.0.1:7890",
    "NO_PROXY": "localhost,127.0.0.1",
    "TRADING_ENV": "demo-futures",
    "BINANCE_API_KEY_DEMO_FUTURES": "xxx",
    "BINANCE_API_SECRET_DEMO_FUTURES": "xxx",
    "BINANCE_DEMO": "true",
    "BINANCE_DEMO_FUTURES_BASE_URL": "https://demo-fapi.binance.com",
    "BINANCE_API_KEY_TEST_SPOT": "xxx",
    "BINANCE_API_SECRET_TEST_SPOT": "xxx",
    "BINANCE_TEST": "true",
    "BINANCE_API_KEY_LIVE_SPOT": "xxx",
    "BINANCE_API_SECRET_LIVE_SPOT": "-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----",
    "BINANCE_SPOT_BASE_URL": "https://api.binance.com",
    "BINANCE_API_KEY_LIVE_FUTURES": "xxx",
    "BINANCE_PRIVATE_SECRET_LIVE_FUTURES": "-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----",
    "BINANCE_FUTURES_BASE_URL": "https://fapi.binance.com",
    "CRON_SECRET_KEY": "xxx",
    "START_MONEY": "30"
  }
}

```
配置解释：
- NEXT_PUBLIC_URL：前端访问地址（浏览器可见）。
- DASHSCOPE_API_KEY_1..5：阿里云百炼大模型 API Key。
  - 它提供了deepseek,qwen,glm,kimi 等模型的接入，图方便就使用它了。建议多申请几个，每个交易 Bot 用一个，避免单 Key 触发速率限制。
- HTTPS_PROXY / HTTP_PROXY / NO_PROXY：网络代理配置（就是你的vpn的port）。
- TRADING_ENV：默认交易环境，常用值, 不用管它：
  - demo-futures：Binance 期货“演示环境”。
  - test-spot：Binance 现货“测试网”。
  - local-simulated：本地撮合模拟（创建 Bot 时可填初始资金）。


- 期货测试网络api key, 请登录 demo.binance.com进行申请, 测试网的api key可以申请系统生成的，更加简单
  - BINANCE_API_KEY_DEMO_FUTURES="xxx"
  - BINANCE_API_SECRET_DEMO_FUTURES="xxx"
  - BINANCE_DEMO=true
  - BINANCE_DEMO_FUTURES_BASE_URL=https://demo-fapi.binance.com
  
![](assets/demo_api_key.png)

- binance 现货测试网络api,请参考https://developers.binance.com/docs/binance-spot-api-docs/faqs/testnet进行 api key 申请
  - BINANCE_API_KEY_TEST_SPOT="xxx"
  - BINANCE_API_SECRET_TEST_SPOT="xxx"
  - BINANCE_TEST=true

- binance 现货实盘api key, 请参考https://www.binance.com/en/binance-api 进行申请。实盘的API KEY请务必申请为 自行生成的api key。系统生成的api key 不支持进行交易。同时请添加IP白名单，保障安全。
  - BINANCE_API_KEY_LIVE_SPOT="xxx"
  - BINANCE_API_SECRET_LIVE_SPOT="-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----"
  - BINANCE_SPOT_BASE_URL=https://api.binance.com

- binance 期货实盘api key,使用执行, 请参考https://www.binance.com/en/binance-api进行申请
  - BINANCE_API_KEY_LIVE_FUTURES="xxx"
  - BINANCE_PRIVATE_SECRET_LIVE_FUTURES="-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----"
  - BINANCE_FUTURES_BASE_URL=https://fapi.binance.com
- CRON_SECRET_KEY：计划任务/内部触发的简单保护口令（若有使用定时触发场景）。
- START_MONEY：仅本地模拟（local-simulated）模式下创建 Bot 的默认初始 USDT。

![](assets/live_api_key.png)

---

## 日常使用小贴士
- 启动/停止：用上文命令或一键脚本。
- 创建/启动 Bot：在前端“交易控制”面板选择交易类型、模型与间隔；本地模拟可手填初始资金。
- 只显示“运行中的 Bot”：若图表空白，请先启动至少一个 Bot。
- Prompt 调整：在 Prompt Studio 选择环境或指定 Bot 保存模板，下一轮轮询即生效。

---

## 常见问题（FAQ）
- 前端没显示我的 Bot？
  - 检查是否已在运行；前端只显示运行中的 Bot。
  - 排行榜为空但已在跑：后端会为运行中且无成交的 Bot 补齐占位行，稍等刷新即可。
- test-spot 报权限/签名错误？
  - 请确认使用的是 Binance 现货 Testnet 的 API Key，并确保系统启用了 sandbox（项目已内置）。
- 仍看到 “default” 项？
  - 后端已去除 default 回填并过滤 default 项；若 UI 还出现，请强刷或清缓存。

---

## 目录速览（了解即可）
- `backend/`：后端服务与 AI 交易循环；`/api/nof1` 提供数据与控制接口。
- `web/`：前端应用；仅展示运行中的 Bot，按 `bot_id` 显示排行榜/曲线/对话。
- `markdown/`：项目文档。
- `scripts/`：一键启动/停止脚本。

---

## 安全提示
- 切勿将真实密钥 `config.json` 提交到仓库；生产部署时优先使用平台环境变量覆盖。
- 若需使用代理访问交易所，请在 `config.json` 设置 `HTTPS_PROXY`/`HTTP_PROXY`。


## 支持项目（Buy me a coffee）

如果这个项目对你有帮助，欢迎在 GitHub 项目中 Star / 分享给朋友, 或者为作者买杯咖啡(救救孩子吧， 最近太穷了2333)，支持持续维护与新特性开发：

- **收款地址（TRC20 链）**：
  - 地址：TVEWZuHaCZCao4xSPmVF1ceGCxkWMFXzsM
  - 推荐币种：USDT（最通用的稳定币）
  - ⚠️ **重要**：必须选择 **TRC20 网络**，该地址可以接收 TRC20 链上的任何代币（USDT、USDC、TRX 等），但无法接收其他链（如 ERC20、BSC）的代币

<img src="assets/add.png" width="300" alt="收款地址二维码" />


非常感谢你的支持！
