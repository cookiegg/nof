# Prompt Studio（交互式 Prompt 工作室）

面向交易策略的 Prompt 迭代工具：在终端与大模型协作，对 system/user 模板进行审阅、生成改写草稿、对比差异、应用到工作副本并保存；同时提供能力/数据结构查询与问答说明，支持多语言界面（模板始终以英文落盘）。

## 功能概览
- 多语言 REPL：`en | zh | fr | es | ru | ja`（界面/说明多语言，模板保存固定英文）
- 能力洞察：查看 CCXT 能力、支持的时间框、策略相关精简能力对象
- 数据结构：常见对象字段参考（ticker / ohlcv / balance / position）
- 模板工作流：`show → suggest → diff → apply → save → revert`
- 问答模式：不改模板，仅基于上下文输出结构化长答案（中英双语）
- 配置闭环：建议可返回 `config_updates`，经确认后写回 `backend/test/ai-trading/config.json`

## 运行
```bash
node --env-file=./backend/.env backend/test/prompt-studio/prompt_studio.mjs \
  --env demo-futures \
  --ai deepseek \
  --lang zh
```

- **--env**：`demo-futures | demo-spot | futures | spot`（决定是否期货模式、默认白名单符号形态等）
- **--ai**：使用 `backend/test/ai-trading/config.json` 中 `ai.presets` 的预设名（如 `deepseek`、`deepseek-reasoner`）
- **--lang**：界面/说明语言偏好（模板保存始终英文）

必要文件与路径来自 `config.json`：
- `prompt_files.system_prompt_path`
- `prompt_files.user_prompt_path`

## 环境与依赖
- Node.js 运行时
- 代理（如需要）：默认读取 `HTTP(S)_PROXY`，并为 CCXT 设定 `exchange.httpsProxy`
- 交易所连接（可选，用于快照/能力探测）：
  - 期货（demo）：`BINANCE_API_KEY_DEMO_FUTURES` / `BINANCE_API_SECRET_DEMO_FUTURES`
  - 现货（testnet）：`BINANCE_SPOT_TESTNET_API_KEY` / `BINANCE_SPOT_TESTNET_API_SECRET`
- 大模型 API：
  - Provider/Model 取自 `config.ai.{provider,model}` 或 `ai.presets[*]`
  - 默认使用 DeepSeek：`DEEPSEEK_API_KEY_30`

> 若无有效交易所密钥，工具将进入离线模式，仍可进行模板审阅与建议。

## REPL 命令
- **help**：查看命令帮助
- **lang [code]**：设置界面语言（`en|zh|fr|es|ru|ja`）
- **cap**：输出当前可用数据/能力总览（环境、白名单、占位符、快照符号）
- **cap-ccxt**：查看 CCXT `describe()` 能力（限速、has.*、timeframes、API URL、样例市场）
- **cap-ccxt-compact**：输出与策略相关的精简能力对象；附逐字段本地化说明
- **schema**：常见数据对象字段参考（ticker/ohlcv/balance/position）
- **placeholders**：解析当前模板中的占位符键名
- **explain-prompts**：输出 `system/user prompt` 设计要点、占位符清单与 `market_sections` 说明
- **show-config**：展示当前关键配置（数据窗口、白名单等）；如存在待应用的 `config_updates`，会一并展示
- **apply-config**：将最近一次建议中的 `config_updates` 合并写回 `backend/test/ai-trading/config.json`（自动备份）
- **discard-config**：丢弃待应用的 `config_updates`
- **fetch SYMBOL**：示例模式提示未连接；标准运行下用于抓取小样本
- **show system|user**：查看当前模板（英文）
- **ask [问题]**：问答模式（结构化长答案；不改模板；中英双语）
- **suggest [说明]**：生成模板改写草稿（返回英文与本地化两版；实际应用使用英文）
- **diff system|user**：查看草稿与当前模板的逐行差异
- **apply system|user**：将草稿应用到工作副本（英文）
- **test-render**：用当前工作副本渲染 `user_prompt` 预览（截断展示）
- **save**：保存工作副本至模板文件（自动 `.bak` 备份；英文落盘）
- **revert**：回滚至文件原始内容
- **exit**：退出

> 演示会话中部分编辑/保存类命令可能被禁用；请在标准运行中使用完整功能。

## 模板与占位符
- 模板文件：
  - `prompt_templates/system_prompt.txt`
  - `prompt_templates/user_prompt.hbs`
- 常见占位符（来自代码内置与 `explanations.json`）：
  - `minutes_since_start`, `now_iso`, `invocation_count`, `market_sections`, `account_value`, `available_cash`, `total_return`, `positions_block`, `sharpe_ratio`
- `market_sections`：按交易对输出近期 1m 指标（EMA20、MACD、RSI14/21、ATR）、4h 上下文（EMA20/50、ATR、MACD、RSI14）、近期序列（中间价/EMA/MACD/RSI）、成交量对比、资金费率、未平仓量（示例）。

## 能力对象（精简）
`cap-ccxt-compact` 输出：
- `exchange`：`id/name/futures/marketType`
- `timeframes`：`fetchOHLCV` 支持的K线粒度
- `api_has`：核心接口可用性（`fetchOHLCV/fetchTicker/fetchBalance/fetchPositions/createOrder/fetchOrder`）
- `schemas`：常见对象字段布局（用于设计占位符）
- `tradable_symbols`：策略白名单交易对

字段解释与多语言说明见 `backend/test/prompt-studio/explanations.json`。

## 配置与建议闭环
- `suggest` 会向模型发送上下文（环境、可用能力、当前模板、占位符、市场快照等）并请求严格 JSON：
  - `system_prompt_en`, `user_prompt_en`
  - `system_prompt_localized`, `user_prompt_localized`
  - `rationale_en`, `rationale_localized`
  - `config_updates`（可选）
- 若包含 `config_updates`：
  - 使用 `show-config` 查看与比对
  - 使用 `apply-config` 合并写回 `config.json`（自动备份，深度合并）

## 失败与离线模式
- 若交易所初始化失败，将提示并进入离线模式：
  - 仍可查看能力对象（基于静态描述）与模板占位符
  - 仍可使用 `ask/suggest/diff/apply/save` 等模板相关流程

## 注意事项
- 本地化输出仅供阅读，落盘模板统一英文，保证后端解析一致性与可移植性
- 保存前建议通过 `test-render`、`placeholders` 自检占位符可渲染性
- 变更模板与配置前后，建议先备份项目或使用 Git 分支管理

## 相关文件
- `backend/test/prompt-studio/prompt_studio.mjs`（主 CLI）
- `backend/test/prompt-studio/explanations.json`（多语言说明与字段释义）
- `backend/test/ai-trading/config.json`（运行配置、AI 预设、模板路径、数据窗口）
- `backend/test/ai-trading/prompt_builder.mjs`（模板构建器，协作生成/更新）
- `backend/test/ai-trading/ai-trading-system.v2.mjs`（策略脚本，按配置拉取数据）
