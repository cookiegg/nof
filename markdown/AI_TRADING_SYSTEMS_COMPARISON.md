# AI交易系统对比分析

## 🚨 当前问题诊断

### 症状
```json
{
  "userPrompt": "MARKET DATA UNAVAILABLE",
  "aiResponse": null,
  "aiParsed": null,
  "decision": null,
  "decision_normalized": {
    "action": "hold",
    "reasoning": "error"
  }
}
```

### 根本原因

从后端日志发现：
```
初始化交易所失败: binanceusdm GET https://demo-fapi.binance.com/fapi/v1/exchangeInfo fetch failed
进入离线模式：使用本地伪数据生成提示与对话
```

**系统无法连接到Binance Demo API**，导致：
1. ❌ 无法获取真实市场数据 → `userPrompt = "MARKET DATA UNAVAILABLE"`
2. ❌ 未调用DeepSeek API → `aiResponse = null`
3. ❌ 无法解析AI响应 → `aiParsed = null`, `decision = null`
4. ✅ 进入兜底逻辑 → 生成错误对话记录

---

## 📊 三个系统对比

### 1. **ai-trading-system.mjs** (test目录)

**特点**：
- 📂 位置：`backend/test/ai-trading/`
- 🎯 用途：**测试/完整版本**
- 💾 数据保存：`backend/test/trading-state.json`, `backend/test/trading-conversations.json`
- 📝 System Prompt：**硬编码在代码中**（400-467行）
- 🔧 配置：**环境变量直接读取**

**System Prompt结构**：
```javascript
[
  'You are an expert crypto trader operating Binance USDT-margined perpetual futures...',
  'Hard constraints:',
  '- Use isolated margin.',
  '- Leverage must be an integer within [1,20].',
  '- Symbols MUST be chosen from this exact whitelist:',
  '  BTC/USDT:USDT, ETH/USDT:USDT, ...',
  '',
  'OUTPUT MUST BE STRICT JSON (no markdown fences). Return exactly one top-level object:',
  '{',
  '  "analysis": { ... },',
  '  "trading_decision": { ... },',
  '  "trading_decisions": [ ... ],',
  '  "account_management": { ... }',
  '}'
].join('\n')
```

**User Prompt生成**（306-388行）：
```javascript
generateUserPrompt(marketData) {
  let prompt = `It has been ${minutesSinceStart} minutes...
  
**ALL OF THE PRICE OR SIGNAL DATA BELOW IS ORDERED: OLDEST → NEWEST**
...
### ALL BTC DATA
current_price = 134.14, current_ema20 = 133.88, ...
...
### HERE IS YOUR ACCOUNT INFORMATION & PERFORMANCE
...`;
  return prompt;
}
```

**决策解析**（492-584行）：
```javascript
parseAIResponse(response) {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  const rawObj = JSON.parse(jsonMatch[0]);
  
  // 支持 trading_decision 和 trading_decisions 数组
  const decisionsArray = Array.isArray(rawObj.trading_decisions) ? ... : null;
  let d = rawObj.trading_decision ? rawObj.trading_decision : rawObj;
  
  // 归一化 action
  const normalizeAction = (a) => {
    if (x === 'buy' || x === 'long') return 'buy';
    if (x === 'sell' || x === 'short') return 'sell';
    if (x === 'close' || x === 'close_position') return 'close_position';
    return 'hold';
  };
  
  // 从数组中智能选择最佳决策
  if (decisionsArray && decisionsArray.length > 0) {
    // 优先选择对现有持仓的操作
    let chosen = ranked.find(x => isHeld(x.symbol) && (x.action === 'close_position' || x.action === 'sell'))
      || ranked.find(x => x.action === 'buy' || x.action === 'sell')
      || ...;
  }
  
  return decision;
}
```

**对话保存**（890-951行）：
```javascript
saveConversation(userPrompt, aiResponse, decision) {
  let aiParsed = null;
  try {
    const match = aiResponse.match(/\{[\s\S]*\}/);
    if (match) aiParsed = JSON.parse(match[0]);
  } catch (_) {}
  
  // 提取原始决策和候选数组
  let decisionRaw = null;
  let decisionsArray = null;
  if (aiParsed) {
    decisionRaw = aiParsed.trading_decision;
    decisionsArray = aiParsed.trading_decisions;
  }
  
  const conversation = {
    timestamp: ...,
    userPrompt,           // 完整提示
    aiResponse,           // 完整响应
    aiParsed,             // 解析的JSON对象
    decision: decisionRaw,           // 原始决策对象
    decision_normalized: decision,   // 归一化决策
    trading_decisions: decisionsArray, // 候选数组
    accountValue,
    totalReturn
  };
}
```

---

### 2. **ai-trading-system.v2.mjs** (ai/ai-trading目录)

**特点**：
- 📂 位置：`backend/ai/ai-trading/`
- 🎯 用途：**生产版本**
- 💾 数据保存：`backend/data/trading-state.json`, `backend/data/conversations.json`
- 📝 System Prompt：**从模板文件读取** (`prompt_templates/system_prompt.txt`)
- 🔧 配置：**从config.json读取**，支持多环境、多AI预设
- 🌐 支持：demo-futures, demo-spot, futures, spot
- 🤖 支持：多个AI提供商（通过预设配置）

**模板系统**：

`system_prompt.txt`:
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

`user_prompt.hbs`:
```
Current Market Analysis:
{{market_sections}}

Portfolio Status:
Account Value: {{account_value}} USDT
Available Cash: {{available_cash}} USDT
Total Return: {{total_return}}
Sharpe Ratio: {{sharpe_ratio}}

Current Positions:
{{positions_block}}

Session Metrics:
Minutes Since Start: {{minutes_since_start}}
Current Time: {{now_iso}}
Invocation Count: {{invocation_count}}

Based on the above data, provide your trading analysis and specific recommendations.
```

**配置驱动**：
```javascript
constructor() {
  this.config = loadConfig();  // 从 config.json 读取
  
  // 支持命令行参数
  const argEnv = getArg('--env');    // --env demo-futures
  const argAi = getArg('--ai');      // --ai deepseek
  
  // 多环境支持
  this.tradingEnv = argEnv || this.config.trading_env || 'demo-futures';
  
  // AI预设支持
  const aiPreset = this.config.ai?.presets?.[argAi];
  this.aiProvider = aiPreset?.provider || 'deepseek';
  this.aiModel = aiPreset?.model || 'deepseek-chat';
  this.aiApiKey = expandEnvMaybe(aiPreset?.api_key || ...);
  
  // 模板路径
  this.systemPromptTemplatePath = resolve(this.config.prompt_files?.system_prompt_path);
  this.userPromptTemplatePath = resolve(this.config.prompt_files?.user_prompt_path);
}
```

**离线模式支持**（859-863行）：
```javascript
async run() {
  const ok = await this.initializeExchange();
  if (!ok) {
    console.warn('进入离线模式：使用本地伪数据生成提示与对话');
  }
  await this.runTradingCycle();
}
```

**简化的决策解析**（577-603行）：
```javascript
parseAIResponse(response) {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { action: 'hold', reasoning: response };
  
  const rawObj = JSON.parse(jsonMatch[0]);
  const d = rawObj.trading_decision ? rawObj.trading_decision : rawObj;
  
  return {
    action: normalizeAction(d.action),
    symbol: normalizeSymbol(d.symbol),
    quantity: d.quantity !== undefined ? Number(d.quantity) : undefined,
    reasoning: d.reasoning || rawObj.reasoning,
    leverage: d.leverage !== undefined ? Number(d.leverage) : undefined
  };
}
```

**错误处理**（824-848行）：
```javascript
async runTradingCycle() {
  try {
    const marketData = await this.getMarketData();
    const userPrompt = this.generateUserPrompt(marketData);
    const aiResponse = await this.callDeepSeekAPI(userPrompt);
    
    if (!aiResponse) {
      const decision = { action: 'hold', reasoning: 'no_ai_response' };
      await this.executeTradingDecision(decision, marketData);
      this.saveConversation(userPrompt, aiResponse, decision);
      return;
    }
    
    const decision = this.parseAIResponse(aiResponse);
    await this.executeTradingDecision(decision, marketData);
    this.saveConversation(userPrompt, aiResponse, decision);
    
  } catch (e) {
    console.error('交易循环失败:', e.message);
    // 兜底：写入最小对话
    try {
      const userPrompt = 'MARKET DATA UNAVAILABLE';  // ← 这就是你看到的
      const aiResponse = null;                        // ← 这就是问题
      const decision = { action: 'hold', reasoning: 'error' };
      this.saveConversation(userPrompt, aiResponse, decision);
    } catch (_) {}
  }
}
```

**对话保存**（773-822行）：
```javascript
saveConversation(userPrompt, aiResponse, decision) {
  // 解析AI响应中的JSON
  let aiParsed = null;
  try {
    if (typeof aiResponse === 'string') {
      const match = aiResponse.match(/\{[\s\S]*\}/);
      if (match) aiParsed = JSON.parse(match[0]);
    }
  } catch (_) {}
  
  // 从 aiParsed 中提取完整信息
  let decisionRaw = null;
  let decisionsArray = null;
  if (aiParsed && typeof aiParsed === 'object') {
    if (aiParsed.trading_decision) {
      decisionRaw = aiParsed.trading_decision;
    }
    if (Array.isArray(aiParsed.trading_decisions)) {
      decisionsArray = aiParsed.trading_decisions;
    }
  }
  
  const conversation = {
    timestamp: new Date().toISOString(),
    invocationCount: this.state.invocationCount,
    userPrompt,
    aiResponse,
    aiParsed,
    decision: decisionRaw || aiParsed?.trading_decision || null,
    decision_normalized: decision,
    trading_decisions: decisionsArray || null,
    accountValue: this.state.accountValue,
    totalReturn: this.state.totalReturn
  };
  
  this.conversations.conversations.unshift(conversation);
  this.saveConversations();
}
```

---

### 3. **prompt_studio.mjs** (prompt-studio目录)

**特点**：
- 📂 位置：`backend/ai/prompt-studio/`
- 🎯 用途：**交互式Prompt工程工具**
- 🎨 功能：
  - 实时测试prompt效果
  - 多语言支持（ask, suggest, show, diff, apply等命令）
  - 自动备份与版本管理
  - 与AI对话优化prompt
  - 生成候选模板
  - 对比新旧版本

**不是交易系统**，而是用来**设计和优化**prompt模板的工具！

**使用方式**：
```bash
# 启动交互式会话
node backend/ai/prompt-studio/prompt_studio.mjs

# 或者命令行模式
node backend/ai/prompt-studio/prompt_studio.mjs --cmd ask --question "如何改进trading_decision的输出格式？"
```

**工作流程**：
1. `show` - 查看当前prompt模板
2. `suggest` - 让AI提供改进建议
3. `ask` - 询问关于prompt的问题
4. `diff` - 对比新旧版本差异
5. `apply` - 应用新版本
6. `save` - 保存到文件
7. `revert` - 回滚到之前版本

---

## 🔥 问题解决方案

### 问题1：CCXT连接失败

**原因**：
- 网络问题：代理7890无法访问Binance Demo API
- 或者 Binance Demo API暂时不可用

**解决方案A：修复网络连接**
```bash
# 1. 测试代理连接
curl -x http://127.0.0.1:7890 https://demo-fapi.binance.com/fapi/v1/time

# 2. 如果代理失败，禁用代理
unset HTTPS_PROXY
unset HTTP_PROXY

# 3. 或者使用不同的代理
export HTTPS_PROXY=http://your-working-proxy:port
```

**解决方案B：测试真实API连接**
```bash
# 手动运行一次，查看详细错误
cd /data/proj/open_nof1/nof0
node --env-file=./backend/.env backend/ai/ai-trading/ai-trading-system.v2.mjs
```

**解决方案C：检查API密钥**
```bash
# 确认环境变量已设置
echo $BINANCE_API_KEY_DEMO_FUTURES
echo $BINANCE_API_SECRET_DEMO_FUTURES

# 或查看config.json
cat backend/ai/ai-trading/config.json | jq '.exchange.binance'
```

### 问题2：aiParsed/decision为null

**根本原因流程**：
```
CCXT连接失败 
  ↓
进入离线模式 
  ↓
getMarketData() 抛出异常
  ↓
runTradingCycle() catch块捕获
  ↓
userPrompt = "MARKET DATA UNAVAILABLE"
  ↓
跳过callDeepSeekAPI()
  ↓
aiResponse = null
  ↓
aiParsed = null, decision = null
```

**修复后的正常流程**：
```
CCXT连接成功
  ↓
getMarketData() 获取真实数据
  ↓
generateUserPrompt() 生成完整prompt
  ↓
callDeepSeekAPI() 调用AI
  ↓
aiResponse = "{ analysis: {...}, trading_decision: {...} }"
  ↓
parseAIResponse() 解析JSON
  ↓
aiParsed = {...}, decision = {...}
```

---

## 📋 对比总结

| 特性 | test/ai-trading-system.mjs | ai/ai-trading-system.v2.mjs | prompt-studio |
|------|---------------------------|----------------------------|---------------|
| 用途 | 测试/完整版 | 生产版 | Prompt工程工具 |
| Prompt | 硬编码 | 模板文件 | 交互式编辑 |
| 配置 | 环境变量 | config.json | config.json |
| 多环境 | ❌ | ✅ | ✅ |
| 离线模式 | ❌ | ✅ | ❌ |
| 决策解析 | 智能选择 | 简化版 | N/A |
| 数据保存 | test/ | data/ | N/A |
| 错误处理 | 基础 | 完善（兜底） | N/A |
| 交互式 | ❌ | ❌ | ✅ |

---

## ✅ 行动计划

### 立即行动（修复当前问题）

1. **诊断网络连接**
   ```bash
   # 测试Binance Demo API
   curl https://demo-fapi.binance.com/fapi/v1/time
   
   # 测试代理
   curl -x http://127.0.0.1:7890 https://demo-fapi.binance.com/fapi/v1/time
   ```

2. **手动运行一次，观察完整日志**
   ```bash
   cd /data/proj/open_nof1/nof0
   node --env-file=./backend/.env backend/ai/ai-trading/ai-trading-system.v2.mjs 2>&1 | tee /tmp/trading-debug.log
   ```

3. **检查API密钥配置**
   ```bash
   cat backend/ai/ai-trading/config.json | jq '.exchange'
   ```

### 长期优化（提升系统健壮性）

1. **增强错误日志**：在v2中添加更详细的错误信息
2. **添加健康检查**：启动时验证所有依赖（API密钥、网络、AI服务）
3. **优化离线模式**：即使离线也调用AI（使用模拟数据）
4. **统一Prompt格式**：将test版的详细prompt迁移到v2模板

---

## 🎯 下一步

1. ✅ 运行诊断命令，确定网络问题
2. ✅ 修复CCXT连接
3. ✅ 重新运行交易系统
4. ✅ 验证conversations.json中有完整的aiResponse和aiParsed
5. ✅ 前端应该能正常显示交易决策了

完成这些后，你应该会看到类似这样的conversations：
```json
{
  "timestamp": "2025-10-31T...",
  "userPrompt": "Current Market Analysis:\n### ALL BTC DATA\n...",
  "aiResponse": "{\n  \"analysis\": {...},\n  \"trading_decision\": {...}\n}",
  "aiParsed": {
    "analysis": {...},
    "trading_decision": {...}
  },
  "decision": {
    "action": "buy",
    "symbol": "BTC",
    ...
  },
  "decision_normalized": {
    "action": "buy",
    "symbol": "BTC",
    ...
  }
}
```

