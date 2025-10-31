// API 文档生成器 - 基于分析结果生成详细的API文档
// 用法：node backend/test/api-documentation.mjs

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

class APIDocumentationGenerator {
  constructor() {
    this.apiData = null;
    this.documentation = {
      title: 'NOF1 API 文档',
      version: '1.0.0',
      baseUrl: 'https://nof1.ai/api',
      description: 'NOF1 交易平台 API 接口文档',
      endpoints: [],
      summary: {}
    };
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
      
      // 获取最新的文件
      const latestFile = files.sort().pop();
      console.log(`加载分析结果: ${latestFile}`);
      
      this.apiData = JSON.parse(readFileSync(latestFile, 'utf8'));
      return true;
    } catch (error) {
      console.error('加载分析结果失败:', error.message);
      return false;
    }
  }

  // 生成端点文档
  generateEndpointDocumentation() {
    const endpoints = [];
    
    for (const [key, result] of Object.entries(this.apiData.endpoints)) {
      if (!result.success) continue;
      
      const endpoint = {
        method: result.method,
        path: result.endpoint,
        statusCode: result.statusCode,
        contentType: result.contentType,
        description: this.generateDescription(result),
        response: this.generateResponseDocumentation(result),
        examples: this.generateExamples(result)
      };
      
      endpoints.push(endpoint);
    }
    
    // 按路径和方法排序
    endpoints.sort((a, b) => {
      if (a.path !== b.path) {
        return a.path.localeCompare(b.path);
      }
      return a.method.localeCompare(b.method);
    });
    
    this.documentation.endpoints = endpoints;
  }

  // 生成端点描述
  generateDescription(result) {
    const descriptions = {
      '/': 'API 根路径，重定向到 /api',
      '/trades': '获取交易记录数据',
      '/positions': '获取持仓信息（已废弃，请使用 account-totals）',
      '/analytics': '获取分析数据',
      '/leaderboard': '获取排行榜数据',
      '/crypto-prices': '获取加密货币价格数据',
      '/conversations': '获取对话记录数据',
      '/account-totals': '获取账户总额数据',
      '/since-inception-values': '获取自成立以来的价值数据'
    };
    
    // 处理分析端点
    if (result.endpoint.startsWith('/analytics/')) {
      const model = result.endpoint.split('/')[2];
      return `获取 ${model} 模型的分析数据`;
    }
    
    return descriptions[result.endpoint] || 'API 端点';
  }

  // 生成响应文档
  generateResponseDocumentation(result) {
    const response = {
      statusCode: result.statusCode,
      contentType: result.contentType,
      description: this.getStatusCodeDescription(result.statusCode)
    };
    
    if (result.isJson && result.dataStructure) {
      response.schema = this.generateSchemaDocumentation(result.dataStructure);
    }
    
    return response;
  }

  // 获取状态码描述
  getStatusCodeDescription(statusCode) {
    const descriptions = {
      200: '请求成功',
      308: '永久重定向',
      404: '资源未找到',
      405: '方法不允许',
      410: '资源已废弃'
    };
    
    return descriptions[statusCode] || `HTTP ${statusCode}`;
  }

  // 生成Schema文档
  generateSchemaDocumentation(structure) {
    if (structure.type === 'object') {
      const schema = {
        type: 'object',
        properties: {}
      };
      
      for (const key of structure.keys) {
        schema.properties[key] = {
          type: structure.keyTypes[key],
          description: this.getFieldDescription(key)
        };
      }
      
      return schema;
    } else if (structure.type === 'array') {
      return {
        type: 'array',
        items: structure.itemStructure ? 
          this.generateSchemaDocumentation(structure.itemStructure) : 
          { type: 'object' }
      };
    } else {
      return {
        type: structure.type,
        example: structure.value
      };
    }
  }

  // 获取字段描述
  getFieldDescription(fieldName) {
    const descriptions = {
      'trades': '交易记录数组',
      'positions': '持仓信息数组',
      'analytics': '分析数据数组',
      'leaderboard': '排行榜数据数组',
      'prices': '价格数据对象',
      'conversations': '对话记录数组',
      'accountTotals': '账户总额数据数组',
      'sinceInceptionValues': '自成立以来的价值数据数组',
      'serverTime': '服务器时间戳',
      'lastHourlyMarkerRead': '最后读取的小时标记',
      'redirect': '重定向URL',
      'status': '状态信息',
      'message': '响应消息'
    };
    
    return descriptions[fieldName] || `${fieldName} 字段`;
  }

  // 生成示例
  generateExamples(result) {
    if (!result.sampleData) return null;
    
    return {
      request: this.generateRequestExample(result),
      response: {
        statusCode: result.statusCode,
        headers: {
          'Content-Type': result.contentType
        },
        body: result.sampleData
      }
    };
  }

  // 生成请求示例
  generateRequestExample(result) {
    return {
      method: result.method,
      url: `${this.documentation.baseUrl}${result.endpoint}`,
      headers: {
        'Accept': 'application/json'
      }
    };
  }

  // 生成总结
  generateSummary() {
    const summary = {
      totalEndpoints: this.documentation.endpoints.length,
      methods: {},
      statusCodes: {},
      categories: {}
    };
    
    for (const endpoint of this.documentation.endpoints) {
      // 方法统计
      summary.methods[endpoint.method] = (summary.methods[endpoint.method] || 0) + 1;
      
      // 状态码统计
      summary.statusCodes[endpoint.statusCode] = (summary.statusCodes[endpoint.statusCode] || 0) + 1;
      
      // 分类统计
      const category = this.categorizeEndpoint(endpoint.path);
      summary.categories[category] = (summary.categories[category] || 0) + 1;
    }
    
    this.documentation.summary = summary;
  }

  // 端点分类
  categorizeEndpoint(path) {
    if (path === '/') return 'Root';
    if (path.startsWith('/analytics/')) return 'Model Analytics';
    if (path.startsWith('/analytics')) return 'Analytics';
    if (path.includes('trades')) return 'Trading';
    if (path.includes('positions')) return 'Positions';
    if (path.includes('prices')) return 'Market Data';
    if (path.includes('conversations')) return 'Conversations';
    if (path.includes('account')) return 'Account';
    if (path.includes('leaderboard')) return 'Leaderboard';
    return 'Other';
  }

  // 生成Markdown文档
  generateMarkdownDocumentation() {
    let markdown = `# ${this.documentation.title}\n\n`;
    markdown += `**版本**: ${this.documentation.version}  \n`;
    markdown += `**基础URL**: \`${this.documentation.baseUrl}\`  \n`;
    markdown += `**描述**: ${this.documentation.description}\n\n`;
    
    // 总结
    markdown += `## 📊 API 总结\n\n`;
    markdown += `- **总端点数**: ${this.documentation.summary.totalEndpoints}\n`;
    markdown += `- **支持的方法**: ${Object.keys(this.documentation.summary.methods).join(', ')}\n`;
    markdown += `- **状态码分布**: ${Object.entries(this.documentation.summary.statusCodes)
      .map(([code, count]) => `${code}(${count})`).join(', ')}\n\n`;
    
    // 分类统计
    markdown += `### 端点分类\n\n`;
    for (const [category, count] of Object.entries(this.documentation.summary.categories)) {
      markdown += `- **${category}**: ${count} 个端点\n`;
    }
    markdown += '\n';
    
    // 端点详情
    markdown += `## 🔗 API 端点详情\n\n`;
    
    let currentCategory = '';
    for (const endpoint of this.documentation.endpoints) {
      const category = this.categorizeEndpoint(endpoint.path);
      
      if (category !== currentCategory) {
        currentCategory = category;
        markdown += `### ${category}\n\n`;
      }
      
      markdown += `#### ${endpoint.method} ${endpoint.path}\n\n`;
      markdown += `**描述**: ${endpoint.description}\n\n`;
      markdown += `**状态码**: ${endpoint.statusCode} - ${endpoint.response.description}\n\n`;
      markdown += `**内容类型**: \`${endpoint.contentType}\`\n\n`;
      
      if (endpoint.response.schema) {
        markdown += `**响应结构**:\n\n`;
        markdown += '```json\n';
        markdown += JSON.stringify(endpoint.response.schema, null, 2);
        markdown += '\n```\n\n';
      }
      
      if (endpoint.examples) {
        markdown += `**请求示例**:\n\n`;
        markdown += '```bash\n';
        markdown += `curl -X ${endpoint.examples.request.method} "${endpoint.examples.request.url}" \\\n`;
        markdown += `  -H "Accept: application/json"\n`;
        markdown += '```\n\n';
        
        markdown += `**响应示例**:\n\n`;
        markdown += '```json\n';
        markdown += JSON.stringify(endpoint.examples.response.body, null, 2);
        markdown += '\n```\n\n';
      }
      
      markdown += '---\n\n';
    }
    
    return markdown;
  }

  // 生成JSON文档
  generateJSONDocumentation() {
    return JSON.stringify(this.documentation, null, 2);
  }

  // 保存文档
  saveDocumentation() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // 保存Markdown文档
    const markdownDoc = this.generateMarkdownDocumentation();
    const markdownPath = `/data/proj/open_nof1/nof0/backend/test/API_DOCUMENTATION_${timestamp}.md`;
    writeFileSync(markdownPath, markdownDoc, 'utf8');
    console.log(`📄 Markdown文档已保存: ${markdownPath}`);
    
    // 保存JSON文档
    const jsonDoc = this.generateJSONDocumentation();
    const jsonPath = `/data/proj/open_nof1/nof0/backend/test/API_DOCUMENTATION_${timestamp}.json`;
    writeFileSync(jsonPath, jsonDoc, 'utf8');
    console.log(`📄 JSON文档已保存: ${jsonPath}`);
    
    return { markdownPath, jsonPath };
  }

  // 生成完整文档
  generate() {
    if (!this.loadLatestAnalysis()) {
      return false;
    }
    
    console.log('📝 生成API文档...');
    
    this.generateEndpointDocumentation();
    this.generateSummary();
    
    const files = this.saveDocumentation();
    
    console.log('\n✅ API文档生成完成!');
    console.log(`📊 共生成 ${this.documentation.endpoints.length} 个端点的文档`);
    
    return files;
  }
}

// 主函数
async function main() {
  const generator = new APIDocumentationGenerator();
  generator.generate();
}

// 运行生成器
main().catch(console.error);