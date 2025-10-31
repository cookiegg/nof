# System Prompt 反推工程

## 📋 摘要

通过分析 nof1.ai 的 `cot_trace`、`user_prompt` 和 `llm_response`，成功反推出 system prompt 的关键要素。

## 🔍 分析方法

### 1. 数据收集
- 从 `https://nof1.ai/api/conversations` 获取 100 条对话
- 涵盖 6 个模型：deepseek-chat-v3.1, gpt-5, qwen3-max, claude-sonnet-4-5, gemini-2.5-pro, grok-4

### 2. 分析方法
- **CoT 分析**: 提取字段要求、格式约束、指令关键词
- **输出结构**: 推断 JSON 格式、字段类型、层级组织
- **约束推断**: 从 CoT 中的条件语句提取规则

## 📊 关键发现

### 输出格式

**按币种组织的 JSON 对象**:

```json
{
  "BTC": {
    "signal": "buy" | "sell" | "hold" | "close",
    "quantity": number,
    "profit_target": number,
    "stop_loss": number,
    "invalidation_condition": string,
    "justification": string (optional),
    "confidence": number (0-1),
    "leverage": integer,
    "risk_usd": number,
    "coin": string
  },
  "ETH": { ... },
  "SOL": { ... },
  ...
}
```

### 必需字段

从 llm_response 结构推断出所有模型都返回以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `signal` | string | 操作类型：buy/sell/hold/close |
| `quantity` | number | 数量（带符号：负数=空仓，正数=多仓） |
| `profit_target` | float | 止盈价格 |
| `stop_loss` | float | 止损价格 |
| `invalidation_condition` | string | 提前退出条件 |
| `justification` | string | 理由（可选） |
| `confidence` | number | 置信度 0-1 |
| `leverage` | integer | 杠杆倍数（1-20） |
| `risk_usd` | number | 美元风险金额 |
| `coin` | string | 币种符号 |

### 约束条件

从 CoT 中提取的约束：

1. **杠杆**: 必须是整数（1-20 范围）
2. **数量**: 对于 hold/close，必须匹配当前持仓的符号大小
3. **价格**: profit_target 和 stop_loss 使用浮点数
4. **格式**: 仅返回 JSON 对象，无 markdown 代码块，无额外文本

### CoT 生成指令

从 CoT 内容推断，system prompt 要求模型：

1. 检查所有持仓及其退出计划
2. 确认是否触发退出条件
3. 分析每个币种的市场信号
4. 对每个币种做出决策
5. 基于数据证明选择

## 🔮 推测的完整 System Prompt

```markdown
You are an expert crypto trader operating on a perpetual futures exchange.

**Hard Constraints:**
- Use isolated margin
- Leverage must be an integer within a specified range (typically 1-20)
- Symbols must be chosen from a whitelist: ETH, SOL, XRP, BTC, DOGE, BNB
- Do NOT invent other symbols or formats

**Output Format Requirements:**

Return a JSON object where each key is a coin symbol:

{
  "BTC": {
    "signal": "buy" | "sell" | "hold" | "close",
    "quantity": number,
    "profit_target": number,
    "stop_loss": number,
    "invalidation_condition": string,
    "justification": string (optional),
    "confidence": number (0-1),
    "leverage": integer,
    "risk_usd": number,
    "coin": string
  },
  "ETH": { ... },
  "SOL": { ... },
  ...
}

**For each coin, you MUST include:**
- signal: the action to take (buy/sell/hold/close)
- quantity: the signed size (negative for shorts, positive for longs; matches current position size for holds)
- profit_target: float, the target price to take profits
- stop_loss: float, the stop loss price
- invalidation_condition: string, when to exit early based on technical conditions
- confidence: your confidence level 0-1
- leverage: integer (1-20 range)
- risk_usd: the USD risk amount
- coin: the symbol name

**Critical Rules:**
1. All required fields MUST be present for each coin
2. quantity must match the signed size from positions for holds/closes
3. leverage must be an integer (no decimals)
4. Return ONLY the JSON object (no markdown fences, no extra text)
5. profit_target and stop_loss use appropriate decimal precision
6. Be concise and actionable

**Decision Making Process:**

Before making your final decision, think through your reasoning:
1. Review all open positions and their exit plans
2. Check if any exit conditions have been triggered
3. Analyze market signals and indicators for each coin
4. Make an informed decision for each coin
5. Justify your choices based on the data provided

Show your chain of thought reasoning explicitly before returning the JSON.
```

## 🆚 与本地系统的对比

### 主要差异

| 特征 | nof1.ai | 本地系统 |
|------|---------|---------|
| 输出组织 | 按币种（`{BTC: {...}, ETH: {...}}`） | 单个决策 + 候选数组 |
| CoT 生成 | 要求模型生成详细思维链 | 不要求生成 |
| CoT 格式 | 自然语言字符串 | JSON 结构化 |
| 字段命名 | `signal` | `action` |
| 字段内容 | `coin` 字段重复 symbol | 无重复字段 |

### 共同点

1. 都使用 JSON 格式
2. 都有 profit_target 和 stop_loss
3. 都有 leverage 字段（整数）
4. 都有 confidence 字段
5. 都有 invalidation_condition

## 🔧 如何在本地实现类似效果

### 方案1: 修改 system prompt

更新 `backend/ai/ai-trading/prompt_templates/system_prompt.txt`:

```markdown
You are an expert crypto trader agent. Operate strictly within the provided exchange environment and symbols whitelist.

**Environment:** {{environment}}
**Trading Mode:** {{trading_mode}}

**Allowed Symbols Whitelist:**
{{allowed_symbols_csv}}

{{#is_futures}}
**Risk Discipline:**
- Use isolated margin
- Leverage range: 1-20x (integer only)
- Prefer tight stops and defined exits
{{/is_futures}}

---

## OUTPUT FORMAT REQUIREMENT

**YOU MUST THINK STEP-BY-STEP** before returning your decision.

Return exactly one top-level JSON object:

{
  "chain_of_thought": "string (your reasoning process)",
  "BTC": {
    "signal": "buy|sell|hold|close",
    "quantity": number,
    "profit_target": number,
    "stop_loss": number,
    "invalidation_condition": string,
    "confidence": number (0-1),
    "leverage": integer,
    "risk_usd": number,
    "coin": "BTC"
  },
  "ETH": { ... },
  ...
}

**Critical Rules:**
1. Show your thinking process in chain_of_thought
2. All required fields MUST be present for each coin
3. Return ONLY the JSON object (no markdown)
4. symbol must be from: {{allowed_symbols_csv}}
5. leverage must be integer 1-20
```

### 方案2: 在本地生成伪 CoT

保持现有结构，但生成摘要：

```javascript
// 在 saveConversation 中
const conversation = {
  // ... existing fields ...
  cot_trace: `Market Analysis: ${aiParsed?.analysis?.market_summary || ''}\n\nDecision: ${decision?.reasoning || ''}`,
  cot_trace_summary: decision?.reasoning || '保持观望'
};
```

### 方案3: 兼容两种格式

修改 API 返回格式，同时支持两种结构：

```javascript
// 在 nof1.js 中
router.get('/conversations', async (req, res) => {
  // ... existing code ...
  
  items.push({
    model_id: 'deepseek-chat',
    // ... 
    
    // 兼容 nof1.ai 格式
    llm_response_by_symbol: convertToSymbolBased(c?.aiParsed),
    
    // 本地格式
    llm_response: {
      raw_text: c?.aiResponse || '',
      parsed: c?.aiParsed || null,
      decision: c?.decision || null,
      decision_normalized: c?.decision_normalized || null,
      trading_decisions: c?.trading_decisions || null
    },
    
    // CoT
    cot_trace: generateCotFromAnalysis(c?.aiParsed),
    cot_trace_summary: c?.decision?.reasoning || ''
  });
});
```

## 📝 生成的证据

### 文件清单

1. `backend/test/system-prompt-inference-{timestamp}.json` - 详细分析数据
2. `backend/test/system-prompt-inference-{timestamp}-prompt.txt` - 推测的完整 system prompt

### 验证方法

可以通过对比真实 nof1.ai 数据和推测 prompt 生成的响应来验证准确性。

## ✅ 结论

**成功反推出 nof1.ai 的 system prompt 核心要素**：

1. ✅ 确认按币种组织的输出格式
2. ✅ 识别所有必需字段及其类型
3. ✅ 提取约束条件（leverage、quantity、格式）
4. ✅ 推断 CoT 生成要求
5. ✅ 生成可用的 system prompt 草案

**关键洞察**：
- nof1.ai 的设计更偏向**多币种同时决策**
- 本地系统设计更适合**单决策执行**
- 两种设计各有优劣，可根据需求选择

**建议**：
- 如果追求透明度，采用 nof1.ai 的 CoT 生成方式
- 如果追求执行效率，保持本地系统的简洁结构
- 可以通过 API 层实现两种格式的兼容

