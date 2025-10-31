# 问题已诊断：AI返回文本而非JSON

## 🎯 问题根源

### 症状
```json
{
  "aiResponse": "Based on the current market data... (1885 characters of markdown text)",
  "aiParsed": null,
  "decision": null
}
```

### 根本原因

**当前的`system_prompt.txt`太简单，没有指定JSON输出格式！**

**当前版本**（`backend/ai/ai-trading/prompt_templates/system_prompt.txt`）：
```
You are an expert crypto trader agent. Operate strictly within the provided exchange environment and symbols whitelist.

Allowed symbols:
{{allowed_symbols_csv}}

{{#is_futures}}
Environment: USDT‑M Perpetual Futures (isolated)
Risk discipline: use isolated margin; prefer tight stops and defined exits.
{{/is_futures}}
{{^is_futures}}
Environment: Spot Testnet (no leverage)
Risk discipline: cash-only, no leverage, avoid overtrading.
{{/is_futures}}

Follow the prompt formatting contract and only propose trades for whitelisted symbols.
```

**问题**：
- ❌ 没有明确要求JSON输出
- ❌ 没有定义输出schema
- ❌ AI自由发挥，返回了markdown文本

**AI实际返回**：
```
Based on the current market data and my risk parameters, here is my analysis...

## Market Analysis Summary
**BTC**: Price ($110,147) above EMA20 with bullish MACD crossover...
...

## Trading Recommendation
**NO NEW POSITIONS AT THIS TIME**
...
```

这是纯文本，无法用`JSON.parse()`解析！

---

## ✅ 解决方案

### 方案1：使用test版的完整system prompt

test版（`backend/test/ai-trading/ai-trading-system.mjs`行409-467）有完整的JSON规范：

```javascript
[
  this.isFutures
    ? 'You are an expert crypto trader operating Binance USDT-margined perpetual futures (U-margined).'
    : 'You are an expert crypto trader operating Binance Spot Testnet (no leverage).',
  'Hard constraints:',
  this.isFutures ? '- Use isolated margin.' : '- Spot environment (no margin/leverage).',
  this.isFutures ? '- Leverage must be an integer within [1,20].' : '- Do not specify leverage.',
  this.isFutures
    ? '- Symbols MUST be chosen from this exact whitelist (Binance USDM pairs):'
    : '- Symbols MUST be chosen from this exact whitelist (Binance Spot pairs):',
  `  ${this.allowedSymbolsForAI.join(', ')}`,
  '- Do NOT invent other symbols or formats.',
  '',
  'OUTPUT MUST BE STRICT JSON (no markdown fences). Return exactly one top-level object that conforms to this schema:',
  '',
  '{',
  '  "analysis": {',
  '    "market_summary": string,                    // required, 1-4 sentences',
  '    "key_observations": string[]                // optional, short bullet points',
  '  },',
  '  "trading_decision": {                         // required primary decision',
  '    "action": "BUY" | "SELL" | "CLOSE_POSITION" | "HOLD",',
  '    "symbol": string,                           // required, one of the whitelist',
  '    "quantity": number,                         // required, > 0 when action is BUY/SELL/CLOSE_POSITION',
  this.isFutures
    ? '    "leverage": integer,                        // required for contract trades, 1..20'
    : '    "leverage": integer | null,                  // optional/ignored in spot',
  '    "reasoning": string                         // required, concise rationale',
  '  },',
  '  "trading_decisions": [                        // optional alternatives',
  '    {',
  '      "action": "BUY" | "SELL" | "CLOSE_POSITION" | "HOLD",',
  '      "symbol": string,                          // one of the whitelist',
  '      "quantity": number,',
  this.isFutures
    ? '      "leverage": integer,                       // 1..20 if present'
    : '      "leverage": integer | null,                 // optional/ignored in spot',
  '      "reasoning": string',
  '    }',
  '  ],',
  '  "account_management": {                       // required account guidance',
  '    "current_value": number,                    // required',
  '    "available_cash": number,                   // required',
  '    "total_return": number,                     // required, percent',
  '    "sharpe_ratio": number,                     // required',
  '    "recommendations": string[]                 // optional',
  '  }',
  '}',
  '',
  'Rules:',
  '- All required fields must be present on every response.',
  '- Be concise. Keep strings short and informative.',
  '- If closing an existing position but quantity is not specified in the prompt, set quantity to the full position size.',
  this.isFutures
    ? '- Use integer leverage within [1,20]. If leverage is irrelevant (e.g., HOLD), still include it with the last used value or 1.'
    : '- Do not include leverage unless explicitly requested; it will be ignored in spot.',
  '- The "symbol" must be exactly one from the whitelist; otherwise, respond with HOLD and explain briefly in reasoning.'
].join('\n')
```

### 方案2：更新system_prompt.txt模板

创建改进的模板文件：

```
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
{{^is_futures}}
**Risk Discipline:**
- Cash-only trading (no leverage)
- Avoid overtrading
- Focus on spot price movements
{{/is_futures}}

---

## OUTPUT FORMAT REQUIREMENT

**YOU MUST RETURN STRICT JSON** (no markdown fences, no extra text).

Return exactly one top-level JSON object conforming to this schema:

```json
{
  "analysis": {
    "market_summary": "string (required, 1-4 sentences)",
    "key_observations": ["optional bullet points"]
  },
  "trading_decision": {
    "action": "BUY" | "SELL" | "CLOSE_POSITION" | "HOLD",
    "symbol": "string (required, from whitelist)",
    "quantity": 0.001,
{{#is_futures}}
    "leverage": 1,
{{/is_futures}}
    "reasoning": "string (required, concise rationale)"
  },
  "trading_decisions": [
    {
      "action": "BUY|SELL|CLOSE_POSITION|HOLD",
      "symbol": "string (from whitelist)",
      "quantity": 0.001,
{{#is_futures}}
      "leverage": 1,
{{/is_futures}}
      "reasoning": "string"
    }
  ],
  "account_management": {
    "current_value": 10000,
    "available_cash": 10000,
    "total_return": 0,
    "sharpe_ratio": 0,
    "recommendations": ["optional guidance"]
  }
}
```

**Critical Rules:**
1. All required fields MUST be present in every response
2. `action` must be one of: BUY, SELL, CLOSE_POSITION, HOLD
3. `symbol` must be exactly from the whitelist (no variations)
{{#is_futures}}
4. `leverage` must be an integer between 1 and 20
{{/is_futures}}
5. Be concise - keep strings short and informative
6. If you recommend HOLD, explain why in `reasoning`
7. Return ONLY the JSON object (no markdown, no extra text)
```

---

## 🔧 实施步骤

### 步骤1：备份当前模板
```bash
cp backend/ai/ai-trading/prompt_templates/system_prompt.txt \
   backend/ai/ai-trading/prompt_templates/system_prompt.txt.backup
```

### 步骤2：更新system_prompt.txt

将上面的新模板内容写入：
```bash
# 使用文本编辑器更新
nano backend/ai/ai-trading/prompt_templates/system_prompt.txt
```

### 步骤3：测试运行
```bash
cd /data/proj/open_nof1/nof0
node --env-file=./backend/.env backend/ai/ai-trading/ai-trading-system.v2.mjs
```

### 步骤4：验证输出
```bash
# 查看最新conversation
cat backend/data/conversations.json | jq '.conversations[0] | {
  timestamp,
  has_aiResponse: (.aiResponse != null),
  has_aiParsed: (.aiParsed != null),
  has_decision: (.decision != null),
  action: .decision_normalized.action
}'
```

**预期输出**：
```json
{
  "timestamp": "2025-10-31T...",
  "has_aiResponse": true,
  "has_aiParsed": true,
  "has_decision": true,
  "action": "hold"  // or "buy", "sell", "close_position"
}
```

---

## 📊 修复前后对比

### 修复前
```json
{
  "timestamp": "2025-10-31T13:58:54.704Z",
  "userPrompt": "Current Market Analysis: ...",
  "aiResponse": "Based on the current market data... ## Market Analysis...",
  "aiParsed": null,
  "decision": null,
  "decision_normalized": {
    "action": "hold",
    "reasoning": "解析失败，保持当前持仓"
  }
}
```

### 修复后
```json
{
  "timestamp": "2025-10-31T14:00:00.000Z",
  "userPrompt": "Current Market Analysis: ...",
  "aiResponse": "{\"analysis\":{\"market_summary\":\"BTC showing bullish momentum...\",\"key_observations\":[...]},\"trading_decision\":{\"action\":\"BUY\",\"symbol\":\"BTC\",\"quantity\":0.001,\"leverage\":3,\"reasoning\":\"Strong uptrend with...\"},\"trading_decisions\":[...],\"account_management\":{...}}",
  "aiParsed": {
    "analysis": {
      "market_summary": "BTC showing bullish momentum with RSI at 62",
      "key_observations": ["Price above EMA20", "Positive MACD crossover"]
    },
    "trading_decision": {
      "action": "BUY",
      "symbol": "BTC",
      "quantity": 0.001,
      "leverage": 3,
      "reasoning": "Strong uptrend with confirmed momentum"
    },
    "trading_decisions": [...],
    "account_management": {...}
  },
  "decision": {
    "action": "BUY",
    "symbol": "BTC",
    "quantity": 0.001,
    "leverage": 3,
    "reasoning": "Strong uptrend with confirmed momentum"
  },
  "decision_normalized": {
    "action": "buy",
    "symbol": "BTC",
    "quantity": 0.001,
    "leverage": 3,
    "reasoning": "Strong uptrend with confirmed momentum"
  }
}
```

---

## 🎯 总结

### 问题诊断链
1. ✅ CCXT连接 - **正常**（可以访问Binance Demo API）
2. ✅ AI API调用 - **正常**（DeepSeek返回了响应）
3. ❌ 输出格式 - **错误**（返回文本而非JSON）
4. ❌ 解析逻辑 - **失败**（无法解析文本为JSON）

### 根本原因
**system_prompt.txt缺少JSON输出格式规范**

### 解决方案
**更新system_prompt.txt，添加完整的JSON schema和规则说明**

### 预期效果
- ✅ AI返回标准JSON
- ✅ aiParsed有完整对象
- ✅ decision有决策信息
- ✅ 前端可以正常显示交易决策
- ✅ "展开"功能不再报错

---

## 🚀 立即执行

运行这个脚本创建新的system_prompt.txt：
```bash
cd /data/proj/open_nof1/nof0
cat > backend/ai/ai-trading/prompt_templates/system_prompt.txt << 'EOF'
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
{{^is_futures}}
**Risk Discipline:**
- Cash-only trading (no leverage)
- Avoid overtrading
- Focus on spot price movements
{{/is_futures}}

---

## OUTPUT FORMAT REQUIREMENT

**YOU MUST RETURN STRICT JSON** (no markdown fences, no extra text).

Return exactly one top-level JSON object:

{
  "analysis": {
    "market_summary": "string (required, 1-4 sentences)",
    "key_observations": ["optional bullet points"]
  },
  "trading_decision": {
    "action": "BUY" | "SELL" | "CLOSE_POSITION" | "HOLD",
    "symbol": "string (required, from whitelist)",
    "quantity": 0.001,
{{#is_futures}}
    "leverage": 1,
{{/is_futures}}
    "reasoning": "string (required, concise rationale)"
  },
  "trading_decisions": [
    {
      "action": "BUY|SELL|CLOSE_POSITION|HOLD",
      "symbol": "string (from whitelist)",
      "quantity": 0.001,
{{#is_futures}}
      "leverage": 1,
{{/is_futures}}
      "reasoning": "string"
    }
  ],
  "account_management": {
    "current_value": 10000,
    "available_cash": 10000,
    "total_return": 0,
    "sharpe_ratio": 0,
    "recommendations": ["optional guidance"]
  }
}

**Critical Rules:**
1. All required fields MUST be present
2. Return ONLY the JSON object (no markdown)
3. symbol must be from: {{allowed_symbols_csv}}
{{#is_futures}}
4. leverage must be integer 1-20
{{/is_futures}}
5. Be concise and actionable
EOF

echo "✅ system_prompt.txt已更新！"
echo "现在运行: node --env-file=./backend/.env backend/ai/ai-trading/ai-trading-system.v2.mjs"
```

