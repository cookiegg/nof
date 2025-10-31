# nof1.ai System Prompt 集成

## 📋 摘要

成功推断出 nof1.ai 的系统提示词，并将其关键要素（CoT 生成要求、详细交易参数）集成到本地系统中。

## ✅ 完成的修改

### 1. 更新 System Prompt

**文件**: `backend/ai/ai-trading/prompt_templates/system_prompt.txt`

**新增要素**:
- ✅ 要求模型进行逐步推理（"YOU MUST THINK STEP-BY-STEP"）
- ✅ 添加 `chain_of_thought` 字段到输出格式
- ✅ 添加详细的决策流程指导（5 步决策过程）
- ✅ 添加 `profit_target`、`stop_loss`、`invalidation_condition` 字段
- ✅ 添加 `confidence` 字段

**保留的本地设计**:
- ✅ 保持单决策格式（不是 nof1.ai 的多币种格式）
- ✅ 保留 `analysis` 和 `account_management` 字段
- ✅ 保留 `trading_decisions` 候选数组

### 2. 更新后端代码

**文件**: `backend/ai/ai-trading/ai-trading-system.v2.mjs`

```javascript
// 在 saveConversation 中添加
chain_of_thought: aiParsed?.chain_of_thought || null,
```

**文件**: `backend/src/routes/nof1.js`

```javascript
// 在 cot_trace 中添加
chain_of_thought: c?.chain_of_thought || null
```

### 3. 更新前端显示

**文件**: `web/src/components/chat/ModelChatPanel.tsx`

```typescript
// 优先显示 chain_of_thought
{cot_trace?.chain_of_thought ? (
  <MarkdownBlock text={cot_trace.chain_of_thought} />
) : typeof cot_trace === "string" ? (
  <MarkdownBlock text={cot_trace} />
) : (
  <pre>{formatCot(cot_trace)}</pre>
)}
```

## 🔍 推断的 nof1.ai System Prompt

完整的推断版本保存在：
`backend/test/api-analysis/inferred-system-prompt-nof1ai.txt`

### 核心差异

| 特征 | nof1.ai | 本地系统（新） |
|------|---------|--------------|
| **输出格式** | 多币种 `{BTC: {...}, ETH: {...}}` | 单决策 + 候选数组 |
| **CoT 生成** | ✅ 强制生成 | ✅ 强制生成 |
| **CoT 字段** | `chain_of_thought` 字符串 | `chain_of_thought` 字符串 |
| **交易参数** | profit_target, stop_loss, invalidation_condition | profit_target, stop_loss, invalidation_condition |
| **分析字段** | ❌ 无 | ✅ 有 analysis |
| **账户建议** | ❌ 无 | ✅ 有 account_management |

### 设计选择

**本地系统采用混合设计**:
- ✅ 借鉴 nof1.ai 的 CoT 生成要求
- ✅ 借鉴详细的交易参数字段
- ✅ 借鉴逐步决策流程
- ✅ 保留本地系统的简洁执行结构
- ❌ 不使用多币种格式（避免复杂的解析逻辑）

## 📝 新 System Prompt 特点

### 1. 强制 CoT 生成

```
**YOU MUST THINK STEP-BY-STEP** before making your decision.

Before making your final decision, you MUST think through your reasoning:
1. Review all open positions and their exit plans
2. Check if any exit conditions have been triggered
3. Analyze market signals and indicators
4. Make an informed decision
5. Justify your choices based on the data provided
```

### 2. 新增字段

在 `trading_decision` 中添加了可选字段：
- `profit_target`: 止盈价格
- `stop_loss`: 止损价格
- `invalidation_condition`: 提前退出条件
- `confidence`: 置信度（0-1）

在顶层添加了：
- `chain_of_thought`: 完整推理过程

### 3. 详细决策指导

提供明确的 5 步决策流程，引导模型：
1. 检查现有持仓和退出计划
2. 验证退出条件是否触发
3. 分析市场信号
4. 做出决策
5. 证明选择的合理性

## 🚀 使用方法

### 运行 AI 交易系统

```bash
cd /data/proj/open_nof1/nof0
node --env-file=./backend/.env backend/ai/ai-trading/ai-trading-system.v2.mjs
```

### 预期输出

模型现在会返回包含 `chain_of_thought` 的完整 JSON：

```json
{
  "analysis": {
    "market_summary": "...",
    "key_observations": [...]
  },
  "trading_decision": {
    "action": "BUY",
    "symbol": "ETH/USDT:USDT",
    "quantity": 0.5,
    "profit_target": 4000,
    "stop_loss": 3800,
    "invalidation_condition": "If price closes below 3750 on 4-hour candle",
    "leverage": 10,
    "reasoning": "...",
    "confidence": 0.75
  },
  "chain_of_thought": "First, I reviewed my open positions. I have no current ETH position, so I can enter a new trade. The current price is 3850, EMA20 is bullish, RSI is neutral at 50. The MACD shows positive momentum. I'll enter a long position with 10x leverage, setting profit target at 4000 and stop loss at 3800..."
}
```

### 前端显示

在对话面板展开后，将显示：
- **USER_PROMPT**: 完整的市场数据
- **CHAIN_OF_THOUGHT**: 模型的详细推理过程（从 `chain_of_thought` 字段）
- **TRADING_DECISIONS**: 格式化后的交易决策

## 📊 对比分析

### 优化前

- ❌ 模型只返回简单的 reasoning
- ❌ 没有详细的推理过程展示
- ❌ 缺少 profit_target 和 stop_loss
- ❌ 无法理解模型的思考路径

### 优化后

- ✅ 模型生成详细的 CoT
- ✅ 前端展示完整推理过程
- ✅ 有完整的交易参数
- ✅ 提供决策透明度

## 🔗 相关文件

- `backend/ai/ai-trading/prompt_templates/system_prompt.txt` - 新的 system prompt
- `backend/ai/ai-trading/prompt_templates/system_prompt.txt.bak` - 旧版本备份
- `backend/test/api-analysis/inferred-system-prompt-nof1ai.txt` - 推断的 nof1.ai prompt
- `backend/test/api-analysis/SYSTEM_PROMPT_COMPARISON.md` - 详细对比分析
- `backend/test/api-analysis/SYSTEM_PROMPT_REVERSE_ENGINEERING.md` - 反推过程

## 📌 注意事项

1. **兼容性**: 新 prompt 向后兼容，旧数据仍然可用
2. **可选字段**: `profit_target`、`stop_loss`、`invalidation_condition`、`confidence` 都是可选的
3. **CoT**: `chain_of_thought` 字段由模型生成，如果模型不生成则显示其他内容
4. **执行逻辑**: 交易执行逻辑保持不变，只使用 `decision_normalized`

## 🎯 下一步

可以考虑：
1. 测试新的 system prompt 生成效果
2. 调整 max_tokens 以适应更长的 CoT
3. 添加 CoT 质量评估指标
4. 考虑是否采用多币种决策格式

## 📚 参考文档

- [CHAIN_OF_THOUGHT_ANALYSIS.md](./backend/test/api-analysis/CHAIN_OF_THOUGHT_ANALYSIS.md)
- [SYSTEM_PROMPT_COMPARISON.md](./backend/test/api-analysis/SYSTEM_PROMPT_COMPARISON.md)
- [SYSTEM_PROMPT_REVERSE_ENGINEERING.md](./backend/test/api-analysis/SYSTEM_PROMPT_REVERSE_ENGINEERING.md)

