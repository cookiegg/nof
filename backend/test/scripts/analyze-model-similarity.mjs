// 分析各个模型的user_prompt和chain_of_thought相似性
// 用法：node backend/test/analyze-model-similarity.mjs

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';

class ModelSimilarityAnalyzer {
  constructor() {
    this.conversationsData = null;
    this.analysis = {
      userPromptSimilarity: {},
      cotSimilarity: {},
      modelStats: {},
      sampleData: {}
    };
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

  // 按模型分组对话
  groupConversationsByModel() {
    const modelGroups = {};
    
    for (const conv of this.conversationsData.conversations) {
      const modelId = conv.model_id;
      if (!modelGroups[modelId]) {
        modelGroups[modelId] = [];
      }
      modelGroups[modelId].push(conv);
    }
    
    return modelGroups;
  }

  // 计算文本相似度 (简单的Jaccard相似度)
  calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2 || typeof text1 !== 'string' || typeof text2 !== 'string') return 0;
    
    // 将文本转换为词集合
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    // 计算交集和并集
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  // 分析user_prompt相似性
  analyzeUserPromptSimilarity(modelGroups) {
    console.log('\n🔍 分析 user_prompt 相似性...');
    
    const models = Object.keys(modelGroups);
    const similarityMatrix = {};
    
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
        
        const convs1 = modelGroups[model1];
        const convs2 = modelGroups[model2];
        
        // 取每个模型的最新几个对话进行比较
        const sampleSize = Math.min(5, convs1.length, convs2.length);
        let totalSimilarity = 0;
        let comparisons = 0;
        
        for (let k = 0; k < sampleSize; k++) {
          const prompt1 = convs1[k]?.user_prompt || '';
          const prompt2 = convs2[k]?.user_prompt || '';
          
          if (prompt1 && prompt2) {
            const similarity = this.calculateTextSimilarity(prompt1, prompt2);
            totalSimilarity += similarity;
            comparisons++;
          }
        }
        
        const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;
        similarityMatrix[model1][model2] = avgSimilarity;
        similarityMatrix[model2][model1] = avgSimilarity;
      }
    }
    
    // 计算每个模型与其他模型的平均相似度
    const modelSimilarity = {};
    for (const model of models) {
      const similarities = Object.values(similarityMatrix[model]).filter(s => s > 0);
      modelSimilarity[model] = similarities.length > 0 ? 
        similarities.reduce((a, b) => a + b, 0) / similarities.length : 0;
    }
    
    this.analysis.userPromptSimilarity = {
      matrix: similarityMatrix,
      modelAverages: modelSimilarity,
      overallAverage: Object.values(modelSimilarity).reduce((a, b) => a + b, 0) / Object.values(modelSimilarity).length
    };
    
    return similarityMatrix;
  }

  // 分析chain_of_thought相似性
  analyzeCotSimilarity(modelGroups) {
    console.log('\n🧠 分析 chain_of_thought 相似性...');
    
    const models = Object.keys(modelGroups);
    const similarityMatrix = {};
    
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
        
        const convs1 = modelGroups[model1];
        const convs2 = modelGroups[model2];
        
        // 取每个模型的最新几个对话进行比较
        const sampleSize = Math.min(5, convs1.length, convs2.length);
        let totalSimilarity = 0;
        let comparisons = 0;
        
        for (let k = 0; k < sampleSize; k++) {
          const cot1 = convs1[k]?.cot_trace || '';
          const cot2 = convs2[k]?.cot_trace || '';
          
          if (cot1 && cot2) {
            const similarity = this.calculateTextSimilarity(cot1, cot2);
            totalSimilarity += similarity;
            comparisons++;
          }
        }
        
        const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;
        similarityMatrix[model1][model2] = avgSimilarity;
        similarityMatrix[model2][model1] = avgSimilarity;
      }
    }
    
    // 计算每个模型与其他模型的平均相似度
    const modelSimilarity = {};
    for (const model of models) {
      const similarities = Object.values(similarityMatrix[model]).filter(s => s > 0);
      modelSimilarity[model] = similarities.length > 0 ? 
        similarities.reduce((a, b) => a + b, 0) / similarities.length : 0;
    }
    
    this.analysis.cotSimilarity = {
      matrix: similarityMatrix,
      modelAverages: modelSimilarity,
      overallAverage: Object.values(modelSimilarity).reduce((a, b) => a + b, 0) / Object.values(modelSimilarity).length
    };
    
    return similarityMatrix;
  }

  // 分析模型统计信息
  analyzeModelStats(modelGroups) {
    console.log('\n📊 分析模型统计信息...');
    
    const stats = {};
    
    for (const [modelId, conversations] of Object.entries(modelGroups)) {
      const userPrompts = conversations.map(c => c.user_prompt || '').filter(p => p);
      const cotTraces = conversations.map(c => c.cot_trace || '').filter(c => c);
      
      // 计算平均长度
      const avgPromptLength = userPrompts.length > 0 ? 
        userPrompts.reduce((sum, p) => sum + p.length, 0) / userPrompts.length : 0;
      const avgCotLength = cotTraces.length > 0 ? 
        cotTraces.reduce((sum, c) => sum + c.length, 0) / cotTraces.length : 0;
      
      // 计算词汇多样性
      const promptWords = userPrompts.join(' ').toLowerCase().split(/\s+/);
      const cotWords = cotTraces.join(' ').toLowerCase().split(/\s+/);
      
      const promptUniqueWords = new Set(promptWords).size;
      const cotUniqueWords = new Set(cotWords).size;
      
      stats[modelId] = {
        conversationCount: conversations.length,
        avgPromptLength: Math.round(avgPromptLength),
        avgCotLength: Math.round(avgCotLength),
        promptUniqueWords,
        cotUniqueWords,
        promptLexicalDiversity: promptWords.length > 0 ? promptUniqueWords / promptWords.length : 0,
        cotLexicalDiversity: cotWords.length > 0 ? cotUniqueWords / cotWords.length : 0
      };
    }
    
    this.analysis.modelStats = stats;
    return stats;
  }

  // 提取样本数据
  extractSampleData(modelGroups) {
    console.log('\n📝 提取样本数据...');
    
    const samples = {};
    
    for (const [modelId, conversations] of Object.entries(modelGroups)) {
      if (conversations.length > 0) {
        const latestConv = conversations[0]; // 最新的对话
        
        const userPrompt = String(latestConv.user_prompt || '');
        const cotTrace = String(latestConv.cot_trace || '');
        
        samples[modelId] = {
          userPrompt: {
            length: userPrompt.length,
            preview: userPrompt.length > 200 ? userPrompt.substring(0, 200) + '...' : userPrompt || 'N/A',
            containsMarketData: userPrompt.includes('CURRENT MARKET STATE'),
            containsAccountInfo: userPrompt.includes('ACCOUNT INFORMATION')
          },
          cotTrace: {
            length: cotTrace.length,
            preview: cotTrace.length > 200 ? cotTrace.substring(0, 200) + '...' : cotTrace || 'N/A',
            containsAnalysis: cotTrace.includes('analysis'),
            containsDecision: cotTrace.includes('decision')
          },
          llmResponse: {
            hasResponse: !!latestConv.llm_response,
            responseKeys: latestConv.llm_response ? Object.keys(latestConv.llm_response) : []
          }
        };
      }
    }
    
    this.analysis.sampleData = samples;
    return samples;
  }

  // 生成相似性报告
  generateSimilarityReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🤖 AI模型相似性分析报告');
    console.log('='.repeat(80));
    
    // User Prompt 相似性
    console.log('\n📋 User Prompt 相似性分析:');
    console.log(`整体平均相似度: ${(this.analysis.userPromptSimilarity.overallAverage * 100).toFixed(2)}%`);
    console.log('\n各模型平均相似度:');
    for (const [model, similarity] of Object.entries(this.analysis.userPromptSimilarity.modelAverages)) {
      console.log(`  ${model}: ${(similarity * 100).toFixed(2)}%`);
    }
    
    console.log('\n模型间相似度矩阵:');
    const models = Object.keys(this.analysis.userPromptSimilarity.matrix);
    console.log('     ' + models.map(m => m.padEnd(15)).join(''));
    for (const model1 of models) {
      const row = model1.padEnd(15);
      const values = models.map(model2 => 
        (this.analysis.userPromptSimilarity.matrix[model1][model2] * 100).toFixed(1).padStart(6)
      );
      console.log(row + values.join(''));
    }
    
    // Chain of Thought 相似性
    console.log('\n\n🧠 Chain of Thought 相似性分析:');
    console.log(`整体平均相似度: ${(this.analysis.cotSimilarity.overallAverage * 100).toFixed(2)}%`);
    console.log('\n各模型平均相似度:');
    for (const [model, similarity] of Object.entries(this.analysis.cotSimilarity.modelAverages)) {
      console.log(`  ${model}: ${(similarity * 100).toFixed(2)}%`);
    }
    
    console.log('\n模型间相似度矩阵:');
    console.log('     ' + models.map(m => m.padEnd(15)).join(''));
    for (const model1 of models) {
      const row = model1.padEnd(15);
      const values = models.map(model2 => 
        (this.analysis.cotSimilarity.matrix[model1][model2] * 100).toFixed(1).padStart(6)
      );
      console.log(row + values.join(''));
    }
    
    // 模型统计信息
    console.log('\n\n📊 模型统计信息:');
    for (const [model, stats] of Object.entries(this.analysis.modelStats)) {
      console.log(`\n${model}:`);
      console.log(`  对话数量: ${stats.conversationCount}`);
      console.log(`  平均Prompt长度: ${stats.avgPromptLength} 字符`);
      console.log(`  平均CoT长度: ${stats.avgCotLength} 字符`);
      console.log(`  Prompt词汇多样性: ${(stats.promptLexicalDiversity * 100).toFixed(2)}%`);
      console.log(`  CoT词汇多样性: ${(stats.cotLexicalDiversity * 100).toFixed(2)}%`);
    }
    
    // 样本数据
    console.log('\n\n📝 样本数据预览:');
    for (const [model, sample] of Object.entries(this.analysis.sampleData)) {
      console.log(`\n${model}:`);
      console.log(`  User Prompt: ${sample.userPrompt.length} 字符`);
      console.log(`    包含市场数据: ${sample.userPrompt.containsMarketData ? '是' : '否'}`);
      console.log(`    包含账户信息: ${sample.userPrompt.containsAccountInfo ? '是' : '否'}`);
      console.log(`    预览: ${sample.userPrompt.preview}`);
      console.log(`  CoT Trace: ${sample.cotTrace.length} 字符`);
      console.log(`    包含分析: ${sample.cotTrace.containsAnalysis ? '是' : '否'}`);
      console.log(`    包含决策: ${sample.cotTrace.containsDecision ? '是' : '否'}`);
      console.log(`    预览: ${sample.cotTrace.preview}`);
    }
    
    // 结论
    console.log('\n\n🎯 分析结论:');
    const promptSimilarity = this.analysis.userPromptSimilarity.overallAverage;
    const cotSimilarity = this.analysis.cotSimilarity.overallAverage;
    
    console.log(`1. User Prompt 相似度: ${(promptSimilarity * 100).toFixed(2)}%`);
    if (promptSimilarity > 0.8) {
      console.log('   ✅ 高度相似 - 所有模型使用相同的输入格式');
    } else if (promptSimilarity > 0.6) {
      console.log('   ⚠️  中等相似 - 大部分模型使用相似的输入格式');
    } else {
      console.log('   ❌ 低相似度 - 模型间输入格式差异较大');
    }
    
    console.log(`2. Chain of Thought 相似度: ${(cotSimilarity * 100).toFixed(2)}%`);
    if (cotSimilarity > 0.3) {
      console.log('   ⚠️  中等相似 - 部分模型使用相似的思考模式');
    } else {
      console.log('   ✅ 低相似度 - 各模型有独特的思考模式');
    }
    
    console.log('\n✨ 分析完成！');
  }

  // 保存分析结果
  saveAnalysisResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filepath = `/data/proj/open_nof1/nof0/backend/test/model-similarity-analysis-${timestamp}.json`;
    
    writeFileSync(filepath, JSON.stringify(this.analysis, null, 2), 'utf8');
    console.log(`\n💾 分析结果已保存: ${filepath}`);
    
    return filepath;
  }

  // 主执行函数
  async run() {
    try {
      console.log('🚀 开始分析模型相似性...');
      
      if (!this.loadConversationsData()) {
        return;
      }
      
      const modelGroups = this.groupConversationsByModel();
      console.log(`发现 ${Object.keys(modelGroups).length} 个模型: ${Object.keys(modelGroups).join(', ')}`);
      
      this.analyzeUserPromptSimilarity(modelGroups);
      this.analyzeCotSimilarity(modelGroups);
      this.analyzeModelStats(modelGroups);
      this.extractSampleData(modelGroups);
      
      this.generateSimilarityReport();
      this.saveAnalysisResults();
      
    } catch (error) {
      console.error('❌ 分析失败:', error.message);
      process.exit(1);
    }
  }
}

// 主函数
async function main() {
  const analyzer = new ModelSimilarityAnalyzer();
  await analyzer.run();
}

// 运行分析
main().catch(console.error);