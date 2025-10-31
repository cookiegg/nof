// API 分析器 - 分析 nof1.ai/api 提供的所有端点
// 用法：node backend/test/api-analyzer.mjs

import https from 'https';
import http from 'http';
import { URL } from 'url';

// 配置
const BASE_URL = 'https://nof1.ai/api';
const TIMEOUT = 10000; // 10秒超时

// 已知的端点路径（基于项目结构推测）
const KNOWN_ENDPOINTS = [
  '/',
  '/health',
  '/status',
  '/trades',
  '/positions', 
  '/analytics',
  '/leaderboard',
  '/crypto-prices',
  '/conversations',
  '/account-totals',
  '/since-inception-values',
  '/api-endpoints',
  '/analytics/claude-sonnet-4-5',
  '/analytics/deepseek-chat-v3.1',
  '/analytics/gemini-2.5-pro',
  '/analytics/gpt-5',
  '/analytics/grok-4',
  '/analytics/qwen3-max'
];

// 请求方法
const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

class APIAnalyzer {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.results = {
      endpoints: {},
      errors: [],
      summary: {
        totalEndpoints: 0,
        workingEndpoints: 0,
        errorEndpoints: 0,
        methods: {}
      }
    };
  }

  // 发送HTTP请求
  async makeRequest(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: {
          'User-Agent': 'API-Analyzer/1.0',
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        },
        timeout: TIMEOUT
      };

      const client = urlObj.protocol === 'https:' ? https : http;
      const req = client.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            method: method,
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

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  // 分析响应数据
  analyzeResponse(response) {
    const analysis = {
      statusCode: response.statusCode,
      contentType: response.headers['content-type'] || 'unknown',
      contentLength: response.data.length,
      isJson: false,
      dataStructure: null,
      sampleData: null
    };

    // 检查是否为JSON
    if (analysis.contentType.includes('application/json')) {
      try {
        const jsonData = JSON.parse(response.data);
        analysis.isJson = true;
        analysis.dataStructure = this.analyzeDataStructure(jsonData);
        analysis.sampleData = this.getSampleData(jsonData);
      } catch (e) {
        analysis.jsonError = e.message;
      }
    }

    return analysis;
  }

  // 分析数据结构
  analyzeDataStructure(data) {
    if (Array.isArray(data)) {
      return {
        type: 'array',
        length: data.length,
        itemStructure: data.length > 0 ? this.analyzeDataStructure(data[0]) : null
      };
    } else if (typeof data === 'object' && data !== null) {
      const structure = {
        type: 'object',
        keys: Object.keys(data),
        keyTypes: {}
      };
      
      for (const [key, value] of Object.entries(data)) {
        structure.keyTypes[key] = typeof value;
        if (Array.isArray(value)) {
          structure.keyTypes[key] = 'array';
        }
      }
      
      return structure;
    } else {
      return {
        type: typeof data,
        value: data
      };
    }
  }

  // 获取示例数据
  getSampleData(data, maxDepth = 2, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
      return '[truncated]';
    }

    if (Array.isArray(data)) {
      return data.slice(0, 3).map(item => 
        this.getSampleData(item, maxDepth, currentDepth + 1)
      );
    } else if (typeof data === 'object' && data !== null) {
      const sample = {};
      const keys = Object.keys(data).slice(0, 5); // 只取前5个键
      for (const key of keys) {
        sample[key] = this.getSampleData(data[key], maxDepth, currentDepth + 1);
      }
      return sample;
    } else {
      return data;
    }
  }

  // 测试单个端点
  async testEndpoint(endpoint, method = 'GET') {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`测试 ${method} ${url}...`);
    
    try {
      const response = await this.makeRequest(url, method);
      const analysis = this.analyzeResponse(response);
      
      const result = {
        endpoint,
        method,
        url,
        ...analysis,
        success: true
      };

      this.results.endpoints[`${method} ${endpoint}`] = result;
      this.results.summary.workingEndpoints++;
      
      return result;
    } catch (error) {
      const result = {
        endpoint,
        method,
        url,
        error: error.message,
        success: false
      };

      this.results.endpoints[`${method} ${endpoint}`] = result;
      this.results.errors.push(result);
      this.results.summary.errorEndpoints++;
      
      return result;
    }
  }

  // 测试所有端点
  async testAllEndpoints() {
    console.log(`开始分析 API: ${this.baseUrl}`);
    console.log(`测试 ${KNOWN_ENDPOINTS.length} 个已知端点...\n`);

    for (const endpoint of KNOWN_ENDPOINTS) {
      // 主要测试 GET 方法
      await this.testEndpoint(endpoint, 'GET');
      
      // 如果端点看起来像数据端点，也测试 POST
      if (endpoint.includes('analytics') || endpoint.includes('trades') || endpoint.includes('positions')) {
        await this.testEndpoint(endpoint, 'POST');
      }
    }

    this.results.summary.totalEndpoints = Object.keys(this.results.endpoints).length;
    this.results.summary.methods = this.calculateMethodStats();
  }

  // 计算方法统计
  calculateMethodStats() {
    const stats = {};
    for (const [key, result] of Object.entries(this.results.endpoints)) {
      const method = result.method;
      if (!stats[method]) {
        stats[method] = { total: 0, success: 0, error: 0 };
      }
      stats[method].total++;
      if (result.success) {
        stats[method].success++;
      } else {
        stats[method].error++;
      }
    }
    return stats;
  }

  // 生成报告
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('API 分析报告');
    console.log('='.repeat(80));
    
    console.log(`\n📊 总体统计:`);
    console.log(`   总端点数: ${this.results.summary.totalEndpoints}`);
    console.log(`   工作端点: ${this.results.summary.workingEndpoints}`);
    console.log(`   错误端点: ${this.results.summary.errorEndpoints}`);
    
    console.log(`\n🔧 方法统计:`);
    for (const [method, stats] of Object.entries(this.results.summary.methods)) {
      console.log(`   ${method}: ${stats.success}/${stats.total} 成功`);
    }

    console.log(`\n✅ 工作端点详情:`);
    for (const [key, result] of Object.entries(this.results.endpoints)) {
      if (result.success) {
        console.log(`\n   ${key}`);
        console.log(`   状态码: ${result.statusCode}`);
        console.log(`   内容类型: ${result.contentType}`);
        console.log(`   内容长度: ${result.contentLength} 字节`);
        
        if (result.isJson && result.dataStructure) {
          console.log(`   数据结构: ${JSON.stringify(result.dataStructure, null, 2)}`);
          if (result.sampleData) {
            console.log(`   示例数据: ${JSON.stringify(result.sampleData, null, 2)}`);
          }
        }
      }
    }

    if (this.results.errors.length > 0) {
      console.log(`\n❌ 错误端点:`);
      for (const error of this.results.errors) {
        console.log(`   ${error.method} ${error.endpoint}: ${error.error}`);
      }
    }

    console.log(`\n📋 API 端点列表:`);
    const workingEndpoints = Object.entries(this.results.endpoints)
      .filter(([key, result]) => result.success)
      .map(([key, result]) => `${result.method} ${result.endpoint} (${result.statusCode})`);
    
    workingEndpoints.forEach(endpoint => {
      console.log(`   ${endpoint}`);
    });
  }

  // 保存结果到文件
  async saveResults() {
    const fs = await import('fs');
    const filename = `api-analysis-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = `/data/proj/open_nof1/nof0/backend/test/${filename}`;
    
    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 详细结果已保存到: ${filepath}`);
  }
}

// 主函数
async function main() {
  const analyzer = new APIAnalyzer(BASE_URL);
  
  try {
    await analyzer.testAllEndpoints();
    analyzer.generateReport();
    await analyzer.saveResults();
  } catch (error) {
    console.error('分析过程中出现错误:', error);
    process.exit(1);
  }
}

// 运行分析
main().catch(console.error);