// 获取 https://nof1.ai/api/conversations 中一个条目的 user_prompt 示例
// 用法：node backend/test/api-analysis/fetch-user-prompt.mjs

import https from 'https';

const API_URL = 'https://nof1.ai/api/conversations';

// 发送HTTP请求
function fetchData(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (e) {
          reject(new Error(`JSON解析失败: ${e.message}`));
        }
      });
      
      res.on('error', (err) => {
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
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
    
    // 按模型分组，获取每个模型的第一个有效条目
    const conversationsByModel = {};
    for (const c of data.conversations) {
      if (c.user_prompt && c.user_prompt.trim().length > 0 && c.model_id) {
        if (!conversationsByModel[c.model_id]) {
          conversationsByModel[c.model_id] = c;
        }
      }
    }
    
    const models = Object.keys(conversationsByModel);
    console.log(`✅ 找到 ${models.length} 个模型的对话数据: ${models.join(', ')}\n`);
    
    // 显示每个模型的数据
    for (const modelId of models) {
      const conversation = conversationsByModel[modelId];
      
      console.log('='.repeat(80));
      console.log(`模型: ${modelId}`);
      console.log('='.repeat(80));
      console.log(`时间戳: ${conversation.timestamp || 'N/A'}`);
      console.log(`调用次数: ${conversation.invocationCount || 'N/A'}`);
      console.log(`摘要: ${conversation.cot_trace_summary || conversation.summary || 'N/A'}`);
      console.log(`user_prompt 长度: ${conversation.user_prompt ? conversation.user_prompt.length : 0} 字符`);
      
      if (conversation.llm_response) {
        const llmResp = conversation.llm_response;
        console.log(`原始文本长度: ${llmResp.raw_text ? llmResp.raw_text.length : 0} 字符`);
        console.log(`是否解析成功: ${llmResp.parsed ? '✅ 是' : '❌ 否'}`);
        
        if (llmResp.decision) {
          console.log(`决策: ${JSON.stringify(llmResp.decision, null, 2)}`);
        }
      }
      console.log('');
    }
    
    // 显示第一个模型的完整 user_prompt
    if (models.length > 0) {
      const firstModel = models[0];
      const conversation = conversationsByModel[firstModel];
      
      console.log('\n' + '='.repeat(80));
      console.log(`${firstModel} 的 user_prompt 完整内容:`);
      console.log('='.repeat(80));
      console.log(conversation.user_prompt);
    }
    
    // 保存所有数据到文件
    const fs = await import('fs');
    const output = {
      summary: {
        total_models: models.length,
        models: models,
        fetched_at: new Date().toISOString()
      },
      conversations_by_model: {}
    };
    
    for (const modelId of models) {
      const conversation = conversationsByModel[modelId];
      output.conversations_by_model[modelId] = {
        metadata: {
          timestamp: conversation.timestamp,
          model_id: conversation.model_id,
          invocationCount: conversation.invocationCount
        },
        user_prompt: conversation.user_prompt,
        llm_response: conversation.llm_response,
        full_data: conversation
      };
    }
    
    const filename = `user-prompt-samples-${Date.now()}.json`;
    const filepath = `/data/proj/open_nof1/nof0/backend/test/${filename}`;
    fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
    console.log(`\n💾 所有模型的数据已保存到: ${filepath}`);
    
  } catch (error) {
    console.error('❌ 获取数据失败:', error.message);
    process.exit(1);
  }
}

// 运行
main().catch(console.error);

