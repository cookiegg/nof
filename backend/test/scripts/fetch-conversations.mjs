// 获取对话记录端点数据并保存
// 用法：node backend/test/fetch-conversations.mjs

import https from 'https';
import { writeFileSync } from 'fs';

class ConversationFetcher {
  constructor() {
    this.baseUrl = 'https://nof1.ai/api';
    this.conversationsData = null;
  }

  // 发送HTTP请求
  async makeRequest(url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Conversation-Fetcher/1.0',
          'Accept': 'application/json, text/plain, */*',
        },
        timeout: 30000 // 30秒超时
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            url: url
          });
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  // 获取对话记录
  async fetchConversations() {
    const url = `${this.baseUrl}/conversations`;
    console.log(`正在获取对话记录: ${url}`);
    
    try {
      const response = await this.makeRequest(url);
      
      if (response.statusCode !== 200) {
        throw new Error(`HTTP ${response.statusCode}: ${response.data}`);
      }

      // 解析JSON数据
      this.conversationsData = JSON.parse(response.data);
      console.log(`✅ 成功获取对话记录`);
      console.log(`   状态码: ${response.statusCode}`);
      console.log(`   内容长度: ${response.data.length} 字节`);
      console.log(`   对话数量: ${this.conversationsData.conversations?.length || 0}`);
      
      return this.conversationsData;
    } catch (error) {
      console.error('❌ 获取对话记录失败:', error.message);
      throw error;
    }
  }

  // 分析对话数据结构
  analyzeConversationStructure() {
    if (!this.conversationsData || !this.conversationsData.conversations) {
      console.log('❌ 没有对话数据可分析');
      return null;
    }

    const conversations = this.conversationsData.conversations;
    const analysis = {
      totalConversations: conversations.length,
      conversationFields: {},
      messageFields: {},
      sampleConversation: null,
      statistics: {
        totalMessages: 0,
        averageMessagesPerConversation: 0,
        fieldFrequency: {}
      }
    };

    // 分析第一个对话的结构
    if (conversations.length > 0) {
      const firstConv = conversations[0];
      analysis.conversationFields = this.analyzeObjectStructure(firstConv);
      analysis.sampleConversation = this.getSampleData(firstConv, 2);
      
      // 分析消息结构
      if (firstConv.messages && Array.isArray(firstConv.messages)) {
        analysis.messageFields = this.analyzeObjectStructure(firstConv.messages[0]);
        analysis.statistics.totalMessages = conversations.reduce((total, conv) => {
          return total + (conv.messages ? conv.messages.length : 0);
        }, 0);
        analysis.statistics.averageMessagesPerConversation = 
          analysis.statistics.totalMessages / conversations.length;
      }
    }

    return analysis;
  }

  // 分析对象结构
  analyzeObjectStructure(obj, maxDepth = 3, currentDepth = 0) {
    if (currentDepth >= maxDepth || !obj || typeof obj !== 'object') {
      return typeof obj;
    }

    if (Array.isArray(obj)) {
      return {
        type: 'array',
        length: obj.length,
        itemType: obj.length > 0 ? this.analyzeObjectStructure(obj[0], maxDepth, currentDepth + 1) : 'unknown'
      };
    }

    const structure = {
      type: 'object',
      keys: Object.keys(obj),
      keyTypes: {}
    };

    for (const [key, value] of Object.entries(obj)) {
      structure.keyTypes[key] = this.analyzeObjectStructure(value, maxDepth, currentDepth + 1);
    }

    return structure;
  }

  // 获取示例数据
  getSampleData(obj, maxDepth = 2, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
      return '[truncated]';
    }

    if (Array.isArray(obj)) {
      return obj.slice(0, 3).map(item => 
        this.getSampleData(item, maxDepth, currentDepth + 1)
      );
    } else if (typeof obj === 'object' && obj !== null) {
      const sample = {};
      const keys = Object.keys(obj).slice(0, 5);
      for (const key of keys) {
        sample[key] = this.getSampleData(obj[key], maxDepth, currentDepth + 1);
      }
      return sample;
    } else {
      return obj;
    }
  }

  // 保存对话数据
  saveConversations() {
    if (!this.conversationsData) {
      console.log('❌ 没有对话数据可保存');
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // 保存完整数据
    const fullDataPath = `/data/proj/open_nof1/nof0/backend/test/conversations-full-${timestamp}.json`;
    writeFileSync(fullDataPath, JSON.stringify(this.conversationsData, null, 2), 'utf8');
    console.log(`💾 完整对话数据已保存: ${fullDataPath}`);

    // 保存分析结果
    const analysis = this.analyzeConversationStructure();
    if (analysis) {
      const analysisPath = `/data/proj/open_nof1/nof0/backend/test/conversations-analysis-${timestamp}.json`;
      writeFileSync(analysisPath, JSON.stringify(analysis, null, 2), 'utf8');
      console.log(`📊 对话分析结果已保存: ${analysisPath}`);
    }

    // 保存简化版本（只包含基本信息）
    const simplifiedData = {
      metadata: {
        totalConversations: this.conversationsData.conversations?.length || 0,
        serverTime: this.conversationsData.serverTime,
        fetchedAt: new Date().toISOString()
      },
      conversations: this.conversationsData.conversations?.map(conv => ({
        id: conv.id,
        title: conv.title,
        messageCount: conv.messages?.length || 0,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        firstMessage: conv.messages?.[0]?.content?.substring(0, 100) || 'No messages'
      })) || []
    };

    const simplifiedPath = `/data/proj/open_nof1/nof0/backend/test/conversations-summary-${timestamp}.json`;
    writeFileSync(simplifiedPath, JSON.stringify(simplifiedData, null, 2), 'utf8');
    console.log(`📋 对话摘要已保存: ${simplifiedPath}`);

    return {
      fullData: fullDataPath,
      analysis: analysis ? `/data/proj/open_nof1/nof0/backend/test/conversations-analysis-${timestamp}.json` : null,
      summary: simplifiedPath
    };
  }

  // 显示对话摘要
  showConversationSummary() {
    if (!this.conversationsData || !this.conversationsData.conversations) {
      console.log('❌ 没有对话数据可显示');
      return;
    }

    const conversations = this.conversationsData.conversations;
    console.log('\n📋 对话记录摘要:');
    console.log('='.repeat(60));
    console.log(`总对话数: ${conversations.length}`);
    console.log(`服务器时间: ${this.conversationsData.serverTime ? new Date(this.conversationsData.serverTime).toISOString() : '未知'}`);
    
    // 显示前5个对话的基本信息
    console.log('\n前5个对话:');
    conversations.slice(0, 5).forEach((conv, index) => {
      console.log(`\n${index + 1}. ${conv.title || '无标题'}`);
      console.log(`   ID: ${conv.id}`);
      console.log(`   消息数: ${conv.messages?.length || 0}`);
      console.log(`   创建时间: ${conv.createdAt ? new Date(conv.createdAt).toISOString() : '未知'}`);
      console.log(`   更新时间: ${conv.updatedAt ? new Date(conv.updatedAt).toISOString() : '未知'}`);
      if (conv.messages && conv.messages.length > 0) {
        const firstMsg = conv.messages[0];
        console.log(`   首条消息: ${firstMsg.content?.substring(0, 100)}...`);
      }
    });

    if (conversations.length > 5) {
      console.log(`\n... 还有 ${conversations.length - 5} 个对话`);
    }
  }

  // 主执行函数
  async run() {
    try {
      console.log('🚀 开始获取对话记录...');
      
      await this.fetchConversations();
      this.showConversationSummary();
      
      const savedFiles = this.saveConversations();
      
      console.log('\n✅ 对话记录获取和保存完成!');
      console.log('保存的文件:');
      if (savedFiles.fullData) console.log(`  - 完整数据: ${savedFiles.fullData}`);
      if (savedFiles.analysis) console.log(`  - 分析结果: ${savedFiles.analysis}`);
      if (savedFiles.summary) console.log(`  - 摘要数据: ${savedFiles.summary}`);
      
    } catch (error) {
      console.error('❌ 执行失败:', error.message);
      process.exit(1);
    }
  }
}

// 主函数
async function main() {
  const fetcher = new ConversationFetcher();
  await fetcher.run();
}

// 运行
main().catch(console.error);