### 技术记录（2025-10-31）

#### 目标与重构
- 可配置化与分环节化交易系统，支持交互式策略与前端对接。
- 产物：可配置交易脚本 v2、Prompt 模板与构建器、交互式 Prompt Studio。

#### 新增/改动文件
- 配置：`backend/test/ai-trading/config.json`
  - 预设环境：`demo-futures | demo-spot | futures | spot`（`presets` 白名单）
  - AI 预设：`ai.presets`（`deepseek`、`deepseek-reasoner`）
  - 数据配置：`data.intraday_tf/intraday_limit/context_tf/context_limit`
  - 模板路径：`prompt_files.*`
- 交易脚本：`backend/test/ai-trading/ai-trading-system.v2.mjs`
  - 读取 `config.json`、模板；支持 `--env`、`--ai`
  - 按 `config.data.*` 拉取 OHLCV（不再写死 1m/4h）
  - 统一代理设置与 `exchange.httpsProxy`
- 模板：`prompt_templates/system_prompt.txt`、`prompt_templates/user_prompt.hbs`
- Prompt 构建器：`backend/test/ai-trading/prompt_builder.mjs`
  - 与模型协作生成/更新模板（严格 JSON、自动备份）
- Prompt Studio（交互 CLI）：`backend/test/prompt-studio/prompt_studio.mjs`
  - 信息：`cap`、`cap-ccxt`、`cap-ccxt-compact`、`schema`、`placeholders`、`explain-prompts`
  - 语言：`--lang` 或 `lang`（`en|zh|fr|es|ru|ja`），展示本地化说明；模板始终英文落盘
  - 模板流：`show`、`suggest`（生成草稿）、`diff`/`apply`/`save`（备份）
  - 问答流：`ask`（结构化长答案，不改模板）；自由输入默认问答
  - 配置流：`show-config`、`apply-config`、`discard-config`
  - 能力裁剪：`cap-ccxt-compact` 输出策略相关精简对象（`timeframes`、`api_has`、`schemas`、`tradable_symbols`）
  - 文档说明：`explanations.json`（多语言说明与字段释义）、`prompt_docs`（system/user/占位符/market_sections）

#### 关键实现
- `market_sections` 的时间框架由 `config.data.*` 控制；v2 交易脚本据此生成数据与标签。
- Prompt Studio 仅改模板/配置，不直接产出行情数据，避免文案与数据不一致。
- 代理：统一设置 `HTTPS_PROXY/HTTP_PROXY` 与 `exchange.httpsProxy`。
- 解释增强：`cap-ccxt-compact` 后追加逐字段本地化说明；`ask` 注入 `prompt_docs` 输出分节长答案。
- 建议与变更分流：`ask` 只答疑；只有显式 `suggest` 才生成模板草稿。
- 配置闭环：`suggest` 可返回 `config_updates`，`show-config` 确认后 `apply-config` 落盘至 `config.json`。

#### 使用示例
- Prompt Studio：
  - `node --env-file=./backend/.env backend/test/prompt-studio/prompt_studio.mjs --env demo-futures --ai deepseek --lang zh`
  - 查看能力/说明：`cap` / `cap-ccxt-compact` / `schema` / `explain-prompts`
  - 问答：`ask market_sections中包含哪些指标？`
  - 生成草稿：`suggest 将user prompt的分钟级改为3m` → `diff user` → `apply user` → `save`
  - 配置变更：`show-config` → `apply-config`
- 交易脚本 v2：
  - `node --env-file=./backend/.env backend/test/ai-trading/ai-trading-system.v2.mjs --env demo-futures --ai deepseek`

#### 新闻 API（加密领域，个人开发者）
- 首选：CryptoPanic（免费层、来源广、带情绪）
- 情绪/社媒：LunarCrush（社交与情绪指标）
- 通用聚合：Newscatcher（关键词过滤）、NewsAPI（原型）
- 自建：RSS 聚合（CoinDesk、Cointelegraph 等）+ 去重/情绪源

#### 后续可拓展
- 为 `cap`/`schema` 增加更细的逐字段解释
- 更多业务规则（杠杆上限、风控门限）配置化并接入 `config_updates`
- 增加 `suggest system:` / `suggest user:` 仅改单一模板的语法糖
