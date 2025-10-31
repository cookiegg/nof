// API 总结报告生成器
// 用法：node backend/test/api-summary.mjs

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

class APISummaryGenerator {
  constructor() {
    this.apiData = null;
  }

  // 加载最新的分析结果
  loadLatestAnalysis() {
    try {
      const testDir = '/data/proj/open_nof1/nof0/backend/test';
      const files = readdirSync(testDir)
        .filter(file => file.startsWith('api-analysis-') && file.endsWith('.json'))
        .map(file => join(testDir, file))
        .filter(file => {
          try {
            return statSync(file).isFile();
          } catch {
            return false;
          }
        });
        
      if (files.length === 0) {
        throw new Error('未找到API分析结果文件');
      }
      
      const latestFile = files.sort().pop();
      this.apiData = JSON.parse(readFileSync(latestFile, 'utf8'));
      return true;
    } catch (error) {
      console.error('加载分析结果失败:', error.message);
      return false;
    }
  }

  // 生成总结报告
  generateSummary() {
    if (!this.loadLatestAnalysis()) {
      return;
    }

    console.log('🔍 NOF1 API 分析总结报告');
    console.log('='.repeat(60));
    
    // 基本统计
    const totalEndpoints = Object.keys(this.apiData.endpoints).length;
    const workingEndpoints = this.apiData.summary.workingEndpoints;
    const errorEndpoints = this.apiData.summary.errorEndpoints;
    
    console.log(`\n📊 基本统计:`);
    console.log(`   总端点数: ${totalEndpoints}`);
    console.log(`   工作端点: ${workingEndpoints}`);
    console.log(`   错误端点: ${errorEndpoints}`);
    console.log(`   成功率: ${((workingEndpoints / totalEndpoints) * 100).toFixed(1)}%`);
    
    // 方法分布
    console.log(`\n🔧 HTTP方法分布:`);
    for (const [method, stats] of Object.entries(this.apiData.summary.methods)) {
      console.log(`   ${method}: ${stats.success}/${stats.total} (${((stats.success / stats.total) * 100).toFixed(1)}%)`);
    }
    
    // 状态码分布
    console.log(`\n📈 状态码分布:`);
    const statusStats = {};
    for (const [key, result] of Object.entries(this.apiData.endpoints)) {
      if (result.success) {
        statusStats[result.statusCode] = (statusStats[result.statusCode] || 0) + 1;
      }
    }
    
    for (const [code, count] of Object.entries(statusStats).sort((a, b) => b[1] - a[1])) {
      const percentage = ((count / workingEndpoints) * 100).toFixed(1);
      console.log(`   ${code}: ${count} 个端点 (${percentage}%)`);
    }
    
    // 端点分类
    console.log(`\n📂 端点分类:`);
    const categories = this.categorizeEndpoints();
    for (const [category, endpoints] of Object.entries(categories)) {
      console.log(`   ${category}: ${endpoints.length} 个端点`);
      endpoints.forEach(endpoint => {
        const result = this.apiData.endpoints[`${endpoint.method} ${endpoint.path}`];
        const status = result?.success ? `✅ ${result.statusCode}` : '❌';
        console.log(`     ${status} ${endpoint.method} ${endpoint.path}`);
      });
    }
    
    // 数据量分析
    console.log(`\n💾 数据量分析:`);
    const dataEndpoints = Object.entries(this.apiData.endpoints)
      .filter(([key, result]) => result.success && result.contentLength > 1000)
      .sort((a, b) => b[1].contentLength - a[1].contentLength);
    
    dataEndpoints.forEach(([key, result]) => {
      const sizeKB = (result.contentLength / 1024).toFixed(1);
      console.log(`   ${result.method} ${result.endpoint}: ${sizeKB} KB`);
    });
    
    // 主要功能端点
    console.log(`\n🎯 主要功能端点:`);
    const mainEndpoints = [
      { path: '/trades', desc: '交易记录' },
      { path: '/account-totals', desc: '账户总额' },
      { path: '/conversations', desc: '对话记录' },
      { path: '/analytics', desc: '分析数据' },
      { path: '/crypto-prices', desc: '加密货币价格' },
      { path: '/leaderboard', desc: '排行榜' }
    ];
    
    mainEndpoints.forEach(endpoint => {
      const result = this.apiData.endpoints[`GET ${endpoint.path}`];
      if (result && result.success) {
        const sizeKB = (result.contentLength / 1024).toFixed(1);
        console.log(`   ✅ ${endpoint.desc} (${endpoint.path}): ${result.statusCode}, ${sizeKB} KB`);
      } else {
        console.log(`   ❌ ${endpoint.desc} (${endpoint.path}): 不可用`);
      }
    });
    
    // 模型分析端点
    console.log(`\n🤖 AI模型分析端点:`);
    const modelEndpoints = Object.entries(this.apiData.endpoints)
      .filter(([key, result]) => result.endpoint.startsWith('/analytics/') && result.method === 'GET' && result.success)
      .sort((a, b) => a[1].endpoint.localeCompare(b[1].endpoint));
    
    modelEndpoints.forEach(([key, result]) => {
      const model = result.endpoint.split('/')[2];
      const sizeKB = (result.contentLength / 1024).toFixed(1);
      console.log(`   ${model}: ${result.statusCode}, ${sizeKB} KB`);
    });
    
    // 废弃端点
    console.log(`\n⚠️  废弃端点:`);
    const deprecatedEndpoints = Object.entries(this.apiData.endpoints)
      .filter(([key, result]) => result.statusCode === 410);
    
    deprecatedEndpoints.forEach(([key, result]) => {
      console.log(`   ${result.method} ${result.endpoint}: ${result.data?.message || '已废弃'}`);
    });
    
    // 不可用端点
    console.log(`\n❌ 不可用端点:`);
    const unavailableEndpoints = Object.entries(this.apiData.endpoints)
      .filter(([key, result]) => result.statusCode === 404);
    
    unavailableEndpoints.forEach(([key, result]) => {
      console.log(`   ${result.method} ${result.endpoint}: 404 Not Found`);
    });
    
    console.log(`\n📋 完整端点列表:`);
    const allEndpoints = Object.entries(this.apiData.endpoints)
      .filter(([key, result]) => result.success)
      .sort((a, b) => a[1].endpoint.localeCompare(b[1].endpoint));
    
    allEndpoints.forEach(([key, result]) => {
      const sizeKB = (result.contentLength / 1024).toFixed(1);
      console.log(`   ${result.method} ${result.endpoint} (${result.statusCode}) - ${sizeKB} KB`);
    });
    
    console.log(`\n✨ 分析完成！`);
  }

  // 端点分类
  categorizeEndpoints() {
    const categories = {};
    
    for (const [key, result] of Object.entries(this.apiData.endpoints)) {
      if (!result.success) continue;
      
      let category = 'Other';
      const path = result.endpoint;
      
      if (path === '/') category = 'Root';
      else if (path.startsWith('/analytics/')) category = 'Model Analytics';
      else if (path.startsWith('/analytics')) category = 'Analytics';
      else if (path.includes('trades')) category = 'Trading';
      else if (path.includes('positions')) category = 'Positions';
      else if (path.includes('prices')) category = 'Market Data';
      else if (path.includes('conversations')) category = 'Conversations';
      else if (path.includes('account')) category = 'Account';
      else if (path.includes('leaderboard')) category = 'Leaderboard';
      
      if (!categories[category]) {
        categories[category] = [];
      }
      
      categories[category].push({
        method: result.method,
        path: result.endpoint
      });
    }
    
    return categories;
  }
}

// 主函数
async function main() {
  const generator = new APISummaryGenerator();
  generator.generateSummary();
}

// 运行生成器
main().catch(console.error);