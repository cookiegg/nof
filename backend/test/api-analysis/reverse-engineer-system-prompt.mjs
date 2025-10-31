// 根据 cot_trace、user_prompt 和 llm_response 反推 system prompt
// 用法：node backend/test/api-analysis/reverse-engineer-system-prompt.mjs

import fs from 'fs';
import https from 'https';

const API_URL = 'https://nof1.ai/api/conversations';

// 发送HTTP请求
function fetchData(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } 
        catch (e) { reject(new Error(`JSON解析失败: ${e.message}`)); }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

// 分析 CoT 中的关键信息
function analyzeCoT(cotTrace) {
  const insights = {
    requiredFields: [],
    outputFormat: null,
    instructions: [],
    constraints: []
  };
  
  if (!cotTrace || typeof cotTrace !== 'string') return insights;
  
  // 提取字段要求
  const fieldMatches = cotTrace.match(/(\w+),? (?:must be|should be|must include|includes?|from|taken from)/gi);
  if (fieldMatches) {
    insights.requiredFields = [...new Set(fieldMatches.map(m => m.split(/[ ,]/)[0].toLowerCase()))];
  }
  
  // 提取格式要求
  if (cotTrace.toLowerCase().includes('json')) {
    insights.outputFormat = 'JSON';
  }
  
  // 提取指令关键词
  const instructionKeywords = ['ensure', 'must', 'should', 'need', 'require', 'expect', 'include'];
  for (const keyword of instructionKeywords) {
    const regex = new RegExp(`${keyword}[\\w\\s]+`, 'gi');
    const matches = cotTrace.match(regex);
    if (matches) {
      insights.instructions.push(...matches.slice(0, 3).map(m => m.trim()));
    }
  }
  
  // 提取约束
  const constraintKeywords = ['must match', 'cannot', 'not allowed', 'integer', 'float'];
  for (const keyword of constraintKeywords) {
    const regex = new RegExp(`[^.]*${keyword}[^.]*`, 'gi');
    const matches = cotTrace.match(regex);
    if (matches) {
      insights.constraints.push(...matches.slice(0, 2).map(m => m.trim()));
    }
  }
  
  return insights;
}

// 分析 llm_response 结构推断输出格式
function inferOutputFormat(llmResponse) {
  if (!llmResponse || typeof llmResponse !== 'object') return null;
  
  const structure = {
    type: Array.isArray(llmResponse) ? 'array' : 'object',
    keys: Object.keys(llmResponse).slice(0, 10),
    sampleStructure: {}
  };
  
  // 获取每个key的值类型
  for (const key of structure.keys) {
    if (typeof llmResponse[key] === 'object' && llmResponse[key] !== null) {
      structure.sampleStructure[key] = Object.keys(llmResponse[key]).slice(0, 10);
    } else {
      structure.sampleStructure[key] = typeof llmResponse[key];
    }
  }
  
  return structure;
}

// 主函数
async function main() {
  try {
    console.log(`📡 正在从 ${API_URL} 获取数据...\n`);
    
    const data = await fetchData(API_URL);
    
    if (!data.conversations || data.conversations.length === 0) {
      console.log('❌ 未找到对话数据');
      return;
    }
    
    // 按模型分组
    const conversationsByModel = {};
    for (const c of data.conversations) {
      if (c.llm_response && c.cot_trace && c.model_id) {
        if (!conversationsByModel[c.model_id]) {
          conversationsByModel[c.model_id] = [];
        }
        conversationsByModel[c.model_id].push(c);
      }
    }
    
    const models = Object.keys(conversationsByModel);
    console.log(`✅ 找到 ${models.length} 个模型的数据\n`);
    
    // 分析每个模型
    for (const modelId of models) {
      console.log('='.repeat(80));
      console.log(`模型: ${modelId}`);
      console.log('='.repeat(80));
      
      const convs = conversationsByModel[modelId];
      const firstConv = convs[0];
      
      // 分析 CoT
      const cotAnalysis = analyzeCoT(firstConv.cot_trace);
      
      // 分析输出格式
      const outputStructure = inferOutputFormat(firstConv.llm_response);
      
      console.log('\n📊 CoT 分析结果:');
      console.log('  输出格式:', cotAnalysis.outputFormat || '未知');
      console.log('  识别到的字段:', cotAnalysis.requiredFields.join(', ') || '无');
      if (cotAnalysis.instructions.length > 0) {
        console.log('  指令片段:');
        cotAnalysis.instructions.slice(0, 3).forEach((inst, i) => {
          console.log(`    ${i+1}. ${inst.substring(0, 80)}...`);
        });
      }
      if (cotAnalysis.constraints.length > 0) {
        console.log('  约束条件:');
        cotAnalysis.constraints.slice(0, 3).forEach((constraint, i) => {
          console.log(`    ${i+1}. ${constraint.substring(0, 80)}...`);
        });
      }
      
      console.log('\n📐 llm_response 结构:');
      console.log('  类型:', outputStructure.type);
      console.log('  顶级keys:', outputStructure.keys.join(', '));
      console.log('  示例结构:');
      for (const [key, value] of Object.entries(outputStructure.sampleStructure).slice(0, 3)) {
        if (Array.isArray(value)) {
          console.log(`    ${key}: {${value.join(', ')}}`);
        } else {
          console.log(`    ${key}: ${value}`);
        }
      }
      
      console.log('\n💬 CoT 片段:');
      if (typeof firstConv.cot_trace === 'string') {
        const preview = firstConv.cot_trace.substring(0, 300);
        console.log(`  ${preview.replace(/\n/g, ' ')}...`);
      } else {
        console.log('  (对象格式)');
      }
      
      console.log('\n📝 推测的 System Prompt 关键要素:');
      
      // 基于分析推测 prompt 要素
      const inferredElements = [];
      
      if (cotAnalysis.outputFormat === 'JSON') {
        inferredElements.push('✅ 要求返回 JSON 格式');
      }
      
      if (firstConv.llm_response && typeof firstConv.llm_response === 'object') {
        inferredElements.push('✅ 输出是结构化对象（按币种组织）');
      }
      
      if (cotAnalysis.requiredFields.length > 0) {
        inferredElements.push(`✅ 必需字段: ${cotAnalysis.requiredFields.join(', ')}`);
      }
      
      if (cotAnalysis.constraints.some(c => c.toLowerCase().includes('integer'))) {
        inferredElements.push('✅ leverage 必须是整数');
      }
      
      if (cotAnalysis.constraints.some(c => c.toLowerCase().includes('float'))) {
        inferredElements.push('✅ price/quantity 使用浮点数');
      }
      
      // 从 cot_trace 中寻找更多线索
      const cotLower = typeof firstConv.cot_trace === 'string' ? firstConv.cot_trace.toLowerCase() : '';
      
      if (cotLower.includes('leverage') && cotLower.includes('range')) {
        const leverageMatch = cotLower.match(/leverage.*?(\d+.*?\d+)/);
        if (leverageMatch) {
          inferredElements.push(`✅ 杠杆范围: ${leverageMatch[1]}`);
        }
      }
      
      if (cotLower.includes('whitelist')) {
        inferredElements.push('✅ 有符号白名单限制');
      }
      
      inferredElements.forEach((elem, i) => {
        console.log(`  ${i+1}. ${elem}`);
      });
      
      console.log('');
    }
    
    // 尝试生成完整的推测 system prompt
    console.log('='.repeat(80));
    console.log('🔮 综合推测的 System Prompt:');
    console.log('='.repeat(80));
    
    console.log(`
You are an expert crypto trader operating on a perpetual futures exchange.

**Hard Constraints:**
- Use isolated margin
- Leverage must be an integer within a specified range
- Symbols must be chosen from a whitelist
- Do NOT invent other symbols or formats

**Output Format Requirements:**

Return a JSON object where each key is a symbol (e.g., "BTC", "ETH", "SOL", etc.):

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
  ...
}

**For each position, you MUST include:**
- signal: the action to take
- quantity: the signed size (negative for shorts, positive for longs)
- profit_target: float, the target price to take profits
- stop_loss: float, the stop loss price
- invalidation_condition: string, when to exit early
- confidence: your confidence level 0-1
- leverage: integer, the leverage to use
- risk_usd: the USD risk amount
- coin: the symbol

**Critical Rules:**
1. All required fields MUST be present for each coin
2. quantity must match the signed size from positions for holds/closes
3. leverage must be an integer (e.g., 1, 5, 10, 15, 20)
4. Return ONLY the JSON object (no markdown, no extra text)
5. Be concise and actionable

**Thinking Process:**

Before making your final decision, think through:
1. Review all open positions
2. Check if exit conditions are triggered  
3. Analyze market signals for each coin
4. Make a decision for each coin
5. Justify your choices

Your chain of thought will be captured for transparency and analysis.
    `);
    
    // 保存详细分析
    const analysis = {
      summary: {
        models_analyzed: models,
        total_conversations: Object.values(conversationsByModel).reduce((sum, arr) => sum + arr.length, 0),
        inferred_at: new Date().toISOString()
      },
      by_model: {}
    };
    
    for (const modelId of models) {
      const firstConv = conversationsByModel[modelId][0];
      analysis.by_model[modelId] = {
        cot_analysis: analyzeCoT(firstConv.cot_trace),
        output_structure: inferOutputFormat(firstConv.llm_response),
        sample_cot: typeof firstConv.cot_trace === 'string' 
          ? firstConv.cot_trace.substring(0, 500)
          : firstConv.cot_trace,
        sample_llm_response: firstConv.llm_response
      };
    }
    
    const filename = `system-prompt-inference-${Date.now()}.json`;
    const filepath = `/data/proj/open_nof1/nof0/backend/test/${filename}`;
    fs.writeFileSync(filepath, JSON.stringify(analysis, null, 2));
    console.log(`\n💾 详细分析已保存到: ${filepath}`);
    
    // 保存推测的 system prompt
    const inferredPrompt = `
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
    `.trim();
    
    const promptFilename = filepath.replace('.json', '-prompt.txt');
    fs.writeFileSync(promptFilename, inferredPrompt);
    console.log(`📝 推测的 system prompt 已保存到: ${promptFilename}`);
    
  } catch (error) {
    console.error('❌ 分析失败:', error.message);
    process.exit(1);
  }
}

// 运行
main().catch(console.error);

