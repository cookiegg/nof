// 比较生成的user_prompt与原始nof1.ai格式的相似性
// 用法：node backend/test/compare-generated-prompt.mjs

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

class PromptComparator {
  constructor() {
    this.generatedPrompt = null;
    this.originalPrompts = {};
  }

  // 加载生成的prompt
  loadGeneratedPrompt() {
    try {
      const testDir = '/data/proj/open_nof1/nof0/backend/test';
      const files = readdirSync(testDir)
        .filter(file => file.startsWith('generated-user-prompt-') && file.endsWith('.json'))
        .map(file => join(testDir, file))
        .filter(file => {
          try {
            return statSync(file).isFile();
          } catch {
            return false;
          }
        });
        
      if (files.length === 0) {
        throw new Error('未找到生成的user_prompt文件');
      }
      
      const latestFile = files.sort().pop();
      console.log(`加载生成的prompt: ${latestFile}`);
      
      const data = JSON.parse(readFileSync(latestFile, 'utf8'));
      this.generatedPrompt = data.userPrompt;
      return true;
    } catch (error) {
      console.error('加载生成的prompt失败:', error.message);
      return false;
    }
  }

  // 加载原始prompt
  loadOriginalPrompts() {
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
        throw new Error('未找到原始对话数据文件');
      }
      
      const latestFile = files.sort().pop();
      console.log(`加载原始对话数据: ${latestFile}`);
      
      const data = JSON.parse(readFileSync(latestFile, 'utf8'));
      
      // 提取每个模型的user_prompt
      for (const conv of data.conversations) {
        const modelId = conv.model_id;
        if (!this.originalPrompts[modelId]) {
          this.originalPrompts[modelId] = conv.user_prompt || '';
        }
      }
      
      return true;
    } catch (error) {
      console.error('加载原始prompt失败:', error.message);
      return false;
    }
  }

  // 清理数值
  cleanNumericalValues(text) {
    if (!text || typeof text !== 'string') return text;
    
    let cleaned = text;
    
    // 替换时间戳
    cleaned = cleaned.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z/g, 'YYYY-MM-DDTHH:MM:SS.fffZ');
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
    
    return cleaned;
  }

  // 计算文本相似度
  calculateSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  // 比较prompt
  comparePrompts() {
    console.log('\n🔍 比较生成的prompt与原始prompt...');
    
    if (!this.generatedPrompt) {
      console.error('❌ 没有生成的prompt数据');
      return;
    }
    
    const cleanedGenerated = this.cleanNumericalValues(this.generatedPrompt);
    
    console.log('\n📊 相似度分析:');
    console.log('─'.repeat(60));
    
    let totalSimilarity = 0;
    let count = 0;
    
    for (const [modelId, originalPrompt] of Object.entries(this.originalPrompts)) {
      if (!originalPrompt) continue;
      
      const cleanedOriginal = this.cleanNumericalValues(originalPrompt);
      const similarity = this.calculateSimilarity(cleanedGenerated, cleanedOriginal);
      
      console.log(`${modelId.padEnd(20)}: ${(similarity * 100).toFixed(2)}%`);
      
      totalSimilarity += similarity;
      count++;
    }
    
    const avgSimilarity = count > 0 ? totalSimilarity / count : 0;
    console.log('─'.repeat(60));
    console.log(`平均相似度: ${(avgSimilarity * 100).toFixed(2)}%`);
    
    return avgSimilarity;
  }

  // 分析结构相似性
  analyzeStructure() {
    console.log('\n🏗️ 结构分析:');
    console.log('─'.repeat(60));
    
    const generated = this.generatedPrompt;
    if (!generated) return;
    
    // 检查关键结构元素
    const structureElements = [
      'It has been',
      'minutes since you started trading',
      'CURRENT MARKET STATE FOR ALL COINS',
      'ALL BTC DATA',
      'ALL ETH DATA',
      'ALL SOL DATA',
      'ALL BNB DATA',
      'ALL XRP DATA',
      'ALL DOGE DATA',
      'current_price =',
      'current_ema20 =',
      'current_macd =',
      'current_rsi',
      'Open Interest:',
      'Funding Rate:',
      'Intraday series',
      'EMA indicators',
      'MACD indicators',
      'RSI indicators',
      'Longer‑term context',
      'HERE IS YOUR ACCOUNT INFORMATION',
      'Current Total Return',
      'Available Cash',
      'Current Account Value',
      'Current live positions',
      'Sharpe Ratio'
    ];
    
    let foundElements = 0;
    for (const element of structureElements) {
      if (generated.includes(element)) {
        foundElements++;
        console.log(`✅ ${element}`);
      } else {
        console.log(`❌ ${element}`);
      }
    }
    
    const structureScore = (foundElements / structureElements.length) * 100;
    console.log('─'.repeat(60));
    console.log(`结构完整性: ${structureScore.toFixed(1)}% (${foundElements}/${structureElements.length})`);
    
    return structureScore;
  }

  // 生成对比报告
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 User Prompt 生成质量报告');
    console.log('='.repeat(80));
    
    const similarity = this.comparePrompts();
    const structure = this.analyzeStructure();
    
    console.log('\n🎯 总体评估:');
    console.log('─'.repeat(60));
    
    if (similarity > 0.9) {
      console.log('✅ 相似度: 优秀 - 生成的prompt与原始格式高度相似');
    } else if (similarity > 0.8) {
      console.log('⚠️  相似度: 良好 - 生成的prompt与原始格式较为相似');
    } else if (similarity > 0.7) {
      console.log('⚠️  相似度: 一般 - 生成的prompt与原始格式有一定差异');
    } else {
      console.log('❌ 相似度: 较差 - 生成的prompt与原始格式差异较大');
    }
    
    if (structure > 90) {
      console.log('✅ 结构: 优秀 - 包含了所有必要的结构元素');
    } else if (structure > 80) {
      console.log('⚠️  结构: 良好 - 包含了大部分必要的结构元素');
    } else if (structure > 70) {
      console.log('⚠️  结构: 一般 - 缺少一些重要的结构元素');
    } else {
      console.log('❌ 结构: 较差 - 缺少多个重要的结构元素');
    }
    
    console.log('\n📝 建议:');
    if (similarity < 0.8) {
      console.log('- 检查数值格式和精度');
      console.log('- 确保时间戳格式正确');
      console.log('- 验证技术指标计算');
    }
    if (structure < 90) {
      console.log('- 添加缺失的结构元素');
      console.log('- 检查文本格式和换行');
      console.log('- 确保所有币种数据完整');
    }
    
    console.log('\n✨ 分析完成！');
  }

  // 主执行函数
  async run() {
    try {
      console.log('🚀 开始比较user_prompt...');
      
      if (!this.loadGeneratedPrompt()) {
        return;
      }
      
      if (!this.loadOriginalPrompts()) {
        return;
      }
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ 比较失败:', error.message);
      process.exit(1);
    }
  }
}

// 主函数
async function main() {
  const comparator = new PromptComparator();
  await comparator.run();
}

// 运行比较
main().catch(console.error);