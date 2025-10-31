// 提取并清理各个模型的user_prompt，剔除具体数值
// 用法：node backend/test/extract-user-prompts.mjs

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';

class UserPromptExtractor {
  constructor() {
    this.conversationsData = null;
    this.cleanedPrompts = {};
  }

  // 加载对话数据
  loadConversationsData() {
    try {
      const testDir = '/data/proj/open_nof1/nof0/backend/test';
      const files = readdirSync(testDir)
        .filter(file => file.startsWith('conversations-full-') && file.endsWith('.json'))
        .map(file => join(testDir, file))
        .filter(file => {
          try {
            return statSync(file).isFile();
          } catch {
            return false;
          }
        });
        
      if (files.length === 0) {
        throw new Error('未找到对话数据文件');
      }
      
      const latestFile = files.sort().pop();
      console.log(`加载对话数据: ${latestFile}`);
      
      this.conversationsData = JSON.parse(readFileSync(latestFile, 'utf8'));
      return true;
    } catch (error) {
      console.error('加载对话数据失败:', error.message);
      return false;
    }
  }

  // 清理数值，保留结构
  cleanNumericalValues(text) {
    if (!text || typeof text !== 'string') return text;
    
    let cleaned = text;
    
    // 替换时间戳
    cleaned = cleaned.replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+/g, 'YYYY-MM-DD HH:MM:SS.fff');
    
    // 替换分钟数
    cleaned = cleaned.replace(/It has been \d+ minutes since/g, 'It has been XXX minutes since');
    
    // 替换调用次数
    cleaned = cleaned.replace(/you've been invoked \d+ times/g, 'you\'ve been invoked XXX times');
    
    // 替换价格数值
    cleaned = cleaned.replace(/\d+\.\d+/g, 'XX.XX');
    
    // 替换整数
    cleaned = cleaned.replace(/\b\d+\b/g, 'XX');
    
    // 替换百分比
    cleaned = cleaned.replace(/\d+\.\d+%/g, 'XX.XX%');
    
    // 替换美元金额
    cleaned = cleaned.replace(/\$\d+\.\d+/g, '$XX.XX');
    cleaned = cleaned.replace(/\$\d+/g, '$XX');
    
    // 替换科学计数法
    cleaned = cleaned.replace(/\d+\.\d+e[+-]\d+/g, 'X.XXe+XX');
    
    // 替换时间间隔
    cleaned = cleaned.replace(/\d+ms/g, 'XXms');
    cleaned = cleaned.replace(/\d+s/g, 'XXs');
    cleaned = cleaned.replace(/\d+m/g, 'XXm');
    cleaned = cleaned.replace(/\d+h/g, 'XXh');
    
    // 替换ID和哈希
    cleaned = cleaned.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g, 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX');
    cleaned = cleaned.replace(/[a-f0-9]{32}/g, 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    cleaned = cleaned.replace(/[a-f0-9]{40}/g, 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    
    // 替换地址
    cleaned = cleaned.replace(/0x[a-f0-9]{40}/g, '0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    
    // 替换交易对
    cleaned = cleaned.replace(/[A-Z]{3,6}\/[A-Z]{3,6}/g, 'XXX/XXX');
    
    return cleaned;
  }

  // 按模型分组并提取user_prompt
  extractUserPrompts() {
    console.log('\n🔍 提取各模型的user_prompt...');
    
    const modelGroups = {};
    
    for (const conv of this.conversationsData.conversations) {
      const modelId = conv.model_id;
      if (!modelGroups[modelId]) {
        modelGroups[modelId] = [];
      }
      modelGroups[modelId].push(conv);
    }
    
    // 为每个模型提取最新的user_prompt并清理
    for (const [modelId, conversations] of Object.entries(modelGroups)) {
      if (conversations.length > 0) {
        const latestConv = conversations[0]; // 最新的对话
        const originalPrompt = latestConv.user_prompt || '';
        const cleanedPrompt = this.cleanNumericalValues(originalPrompt);
        
        this.cleanedPrompts[modelId] = {
          original: originalPrompt,
          cleaned: cleanedPrompt,
          length: originalPrompt.length,
          cleanedLength: cleanedPrompt.length
        };
        
        console.log(`✅ ${modelId}: 原始长度 ${originalPrompt.length} 字符，清理后 ${cleanedPrompt.length} 字符`);
      }
    }
    
    return this.cleanedPrompts;
  }

  // 比较清理后的prompt相似性
  compareCleanedPrompts() {
    console.log('\n🔍 比较清理后的prompt相似性...');
    
    const models = Object.keys(this.cleanedPrompts);
    const similarityMatrix = {};
    
    // 计算文本相似度 (简单的Jaccard相似度)
    const calculateSimilarity = (text1, text2) => {
      if (!text1 || !text2) return 0;
      
      const words1 = new Set(text1.toLowerCase().split(/\s+/));
      const words2 = new Set(text2.toLowerCase().split(/\s+/));
      
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);
      
      return intersection.size / union.size;
    };
    
    // 初始化相似度矩阵
    for (const model1 of models) {
      similarityMatrix[model1] = {};
      for (const model2 of models) {
        similarityMatrix[model1][model2] = 0;
      }
    }
    
    // 计算每对模型之间的相似度
    for (let i = 0; i < models.length; i++) {
      for (let j = i + 1; j < models.length; j++) {
        const model1 = models[i];
        const model2 = models[j];
        
        const prompt1 = this.cleanedPrompts[model1].cleaned;
        const prompt2 = this.cleanedPrompts[model2].cleaned;
        
        const similarity = calculateSimilarity(prompt1, prompt2);
        similarityMatrix[model1][model2] = similarity;
        similarityMatrix[model2][model1] = similarity;
      }
    }
    
    // 计算每个模型与其他模型的平均相似度
    const modelSimilarity = {};
    for (const model of models) {
      const similarities = Object.values(similarityMatrix[model]).filter(s => s > 0);
      modelSimilarity[model] = similarities.length > 0 ? 
        similarities.reduce((a, b) => a + b, 0) / similarities.length : 0;
    }
    
    const overallAverage = Object.values(modelSimilarity).reduce((a, b) => a + b, 0) / Object.values(modelSimilarity).length;
    
    console.log(`\n📊 清理后的相似度分析:`);
    console.log(`整体平均相似度: ${(overallAverage * 100).toFixed(2)}%`);
    console.log('\n各模型平均相似度:');
    for (const [model, similarity] of Object.entries(modelSimilarity)) {
      console.log(`  ${model}: ${(similarity * 100).toFixed(2)}%`);
    }
    
    return { similarityMatrix, modelSimilarity, overallAverage };
  }

  // 输出清理后的prompt
  outputCleanedPrompts() {
    console.log('\n' + '='.repeat(80));
    console.log('📝 各模型清理后的user_prompt');
    console.log('='.repeat(80));
    
    for (const [modelId, data] of Object.entries(this.cleanedPrompts)) {
      console.log(`\n🤖 ${modelId.toUpperCase()}`);
      console.log('─'.repeat(60));
      console.log(`原始长度: ${data.length} 字符`);
      console.log(`清理后长度: ${data.cleanedLength} 字符`);
      console.log(`压缩率: ${((1 - data.cleanedLength / data.length) * 100).toFixed(1)}%`);
      console.log('\n清理后的内容:');
      console.log('─'.repeat(60));
      console.log(data.cleaned);
      console.log('─'.repeat(60));
    }
  }

  // 保存结果
  saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filepath = `/data/proj/open_nof1/nof0/backend/test/cleaned-user-prompts-${timestamp}.json`;
    
    const results = {
      timestamp: new Date().toISOString(),
      totalModels: Object.keys(this.cleanedPrompts).length,
      prompts: this.cleanedPrompts
    };
    
    writeFileSync(filepath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`\n💾 清理后的prompt已保存: ${filepath}`);
    
    return filepath;
  }

  // 主执行函数
  async run() {
    try {
      console.log('🚀 开始提取和清理user_prompt...');
      
      if (!this.loadConversationsData()) {
        return;
      }
      
      this.extractUserPrompts();
      this.compareCleanedPrompts();
      this.outputCleanedPrompts();
      this.saveResults();
      
      console.log('\n✨ 提取完成！');
      
    } catch (error) {
      console.error('❌ 提取失败:', error.message);
      process.exit(1);
    }
  }
}

// 主函数
async function main() {
  const extractor = new UserPromptExtractor();
  await extractor.run();
}

// 运行提取
main().catch(console.error);