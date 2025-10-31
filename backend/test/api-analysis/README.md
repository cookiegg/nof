# nof1.ai API 分析工具集

本目录包含用于分析 nof1.ai 交易系统的工具和文档。

## 📁 文件清单

### 工具脚本

| 文件 | 说明 |
|------|------|
| `fetch-user-prompt.mjs` | 从 nof1.ai 获取 user_prompt 示例 |
| `reverse-engineer-system-prompt.mjs` | 反推 system prompt |
| `api-analyzer.mjs` | 分析 API 结构和端点 |
| `api-summary.mjs` | 生成 API 文档摘要 |

### 分析文档

| 文档 | 说明 |
|------|------|
| `USER_PROMPT_COMPARISON.md` | user_prompt 格式对比分析 |
| `CHAIN_OF_THOUGHT_ANALYSIS.md` | CoT 生成机制分析 |
| `SYSTEM_PROMPT_REVERSE_ENGINEERING.md` | System Prompt 反推工程 |
| `API_DOCUMENTATION_*.md` | nof1.ai API 完整文档 |

### 生成的数据

| 文件 | 说明 |
|------|------|
| `user-prompt-samples-{timestamp}.json` | user_prompt 示例集合 |
| `system-prompt-inference-{timestamp}.json` | 反推的 system prompt 数据 |
| `system-prompt-inference-{timestamp}-prompt.txt` | 推测的完整 system prompt |

## 🚀 快速使用

### 1. 获取 user_prompt 示例

```bash
node backend/test/api-analysis/fetch-user-prompt.mjs
```

从 nof1.ai 获取 6 个模型的 user_prompt 并保存到 JSON 文件。

### 2. 反推 system prompt

```bash
node backend/test/api-analysis/reverse-engineer-system-prompt.mjs
```

分析 cot_trace、user_prompt 和 llm_response 反推 system prompt。

### 3. 分析 API

```bash
node backend/test/api-analysis/api-analyzer.mjs
```

分析 nof1.ai 的 API 结构和端点。

## 📊 主要发现

### 1. user_prompt 格式

- **统一性**: 所有模型使用相同的 user_prompt 格式
- **内容**: 包含实时市场数据、持仓信息、技术指标
- **结构**: 
  - 时间戳和调用次数
  - 市场状态（BTC, ETH, SOL, BNB, XRP, DOGE）
  - 账户信息和持仓详情
  - Sharpe Ratio

### 2. CoT 生成机制

- **格式**: 大多数模型返回字符串格式的思维链
- **内容**: 详细的推理步骤、参数检查、决策逻辑
- **风格**: 不同模型有不同风格
  - GPT-5: 结构化章节（**Clarifying**, **Reviewing**）
  - Deepseek: 列表式分析
  - Gemini: 日记式风格
  - Qwen: 对象格式

### 3. System Prompt 关键要素

**输出格式**: 按币种组织的 JSON 对象
```json
{
  "BTC": { "signal", "quantity", "profit_target", ... },
  "ETH": { ... }
}
```

**必需字段**: signal, quantity, profit_target, stop_loss, invalidation_condition, confidence, leverage, risk_usd, coin

**约束条件**: 
- leverage 必须是整数（1-20）
- quantity 必须匹配持仓符号
- 仅返回 JSON，无 markdown

## 🔄 对比分析

### nof1.ai vs 本地系统

| 特征 | nof1.ai | 本地系统 |
|------|---------|---------|
| 输出组织 | 按币种 {BTC: {...}, ETH: {...}} | 单个决策 + 候选数组 |
| CoT 生成 | ✅ 要求模型生成 | ❌ 不要求 |
| CoT 格式 | 自然语言字符串 | JSON 结构化 |
| 字段命名 | `signal` | `action` |
| 决策方式 | 多币种同时决策 | 单决策执行 |

### 优缺点

**nof1.ai 方式**:
- ✅ 透明度高，推理过程清晰
- ✅ 多币种协调决策
- ❌ 输出复杂，解析成本高
- ❌ 依赖模型自然语言能力

**本地系统方式**:
- ✅ 结构简洁，易于执行
- ✅ 解析可靠，不受模型影响
- ❌ 缺少详细推理过程
- ❌ 单个决策，无全局协调

## 💡 应用建议

### 场景1: 需要透明度

采用 nof1.ai 的 CoT 生成方式：

```markdown
**YOU MUST THINK STEP-BY-STEP**

Show your reasoning:
1. Review positions
2. Check exit conditions  
3. Analyze signals
4. Make decisions
5. Justify choices
```

### 场景2: 追求效率

保持本地系统的简洁结构：

```markdown
**YOU MUST RETURN STRICT JSON**

Return exactly one top-level object:
{
  "analysis": { ... },
  "trading_decision": { ... }
}
```

### 场景3: 兼容两者

在 API 层实现两种格式的兼容：

```javascript
items.push({
  // nof1.ai 格式
  llm_response_by_symbol: { "BTC": {...}, "ETH": {...} },
  cot_trace: "...",
  
  // 本地格式  
  llm_response: { raw_text, parsed, decision },
  decision_normalized: {...}
});
```

## 📚 相关文档

- `../AI_TRADING_SYSTEMS_COMPARISON.md` - AI 交易系统对比
- `../CONVERSATIONS_API_INTEGRATION.md` - 对话 API 集成
- `../../ai/ai-trading/prompt_templates/system_prompt.txt` - 本地 system prompt

## 🔗 外部资源

- nof1.ai API: https://nof1.ai/api/
- nof1.ai Conversations: https://nof1.ai/api/conversations
- nof1.ai 前端: https://nof1.ai/

## 📝 更新日志

- **2025-10-31**: 创建 CoT 分析文档
- **2025-10-31**: 完成 system prompt 反推工程
- **2025-10-28**: 完成 API 文档分析
- **2025-10-28**: 完成 user_prompt 对比分析

