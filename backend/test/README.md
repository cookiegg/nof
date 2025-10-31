# Test 文件夹说明

## 📁 文件夹结构

```
test/
├── ai-trading/           # AI交易系统
├── api-analysis/         # API分析工具
├── data/                 # 数据文件
├── deepseek/            # DeepSeek API文档
├── docs/                # 文档
└── scripts/             # 各种分析脚本
```

## 🤖 AI交易系统 (`ai-trading/`)

完整的AI交易系统，模拟nof1.ai的功能。

### 文件说明
- `ai-trading-system.mjs` - 主交易系统
- `run-ai-trading.mjs` - 定时运行脚本
- `view-trading-status.mjs` - 状态查看脚本
- `trading-state.json` - 交易状态文件
- `trading-conversations.json` - 对话记录文件

### 使用方法
```bash
# 运行单次交易
node --env-file=./backend/.env ai-trading/ai-trading-system.mjs

# 定时运行（每3分钟）
node --env-file=./backend/.env ai-trading/run-ai-trading.mjs

# 查看状态
node ai-trading/view-trading-status.mjs
```

## 🔍 API分析工具 (`api-analysis/`)

用于分析nof1.ai API的临时脚手架工具（已归档）。

### 文件说明
- `api-analyzer.mjs` - API端点分析器
- `api-documentation.mjs` - 生成API文档
- `api-summary.mjs` - 生成API摘要
- `api-analysis-*.json` - 分析结果数据
- `API_DOCUMENTATION_*.md` - 生成的API文档

> **注意**: 这些是临时的脚手架工具，仅用于明确API调用方式，不包含在快速启动工具中。

## 📊 数据文件 (`data/`)

存储各种分析结果和数据文件。

### 文件说明
- `conversations-*.json` - 对话数据文件
- `generated-user-prompt-*.json` - 生成的用户提示
- `cleaned-user-prompts-*.json` - 清理后的用户提示
- `model-similarity-analysis-*.json` - 模型相似性分析
- `trading-conversations.json` - 交易对话记录

## 📚 文档 (`docs/`)

项目相关文档。

### 文件说明
- `README_AI_TRADING.md` - AI交易系统详细说明
- `user-prompt-generation-summary.md` - 用户提示生成总结

## 🛠️ 脚本工具 (`scripts/`)

各种分析和测试脚本。

### 文件说明
- `ccxt-binance-usdm-test.mjs` - CCXT Binance测试
- `fetch-conversations.mjs` - 获取对话数据
- `generate-user-prompt.mjs` - 生成用户提示
- `extract-user-prompts.mjs` - 提取用户提示
- `compare-generated-prompt.mjs` - 比较生成的提示
- `analyze-model-similarity.mjs` - 分析模型相似性

### 使用方法
```bash
# 测试CCXT连接
node --env-file=./backend/.env scripts/ccxt-binance-usdm-test.mjs

# 获取对话数据
node scripts/fetch-conversations.mjs

# 生成用户提示
node --env-file=./backend/.env scripts/generate-user-prompt.mjs

# 分析模型相似性
node scripts/analyze-model-similarity.mjs
```

## 🔧 DeepSeek API (`deepseek/`)

DeepSeek API相关文档和配置。

### 文件说明
- `deepseek_api.md` - DeepSeek API使用文档

## 🚀 快速开始

### 1. 环境配置
确保在 `backend/.env` 中设置了必要的环境变量：
- `DEEPSEEK_API_KEY_30` - DeepSeek API密钥
- `BINANCE_FUTURES_DEMO_API_KEY` - Binance API密钥
- `BINANCE_FUTURES_DEMO_API_SECRET` - Binance API密钥

### 2. 运行AI交易系统
```bash
# 进入test目录
cd backend/test

# 运行AI交易系统
node --env-file=../.env ai-trading/ai-trading-system.mjs
```

### 3. 查看系统状态
```bash
# 查看交易状态
node ai-trading/view-trading-status.mjs
```

## 📈 主要功能

1. **AI交易系统** - 基于DeepSeek API的智能交易
2. **数据管理** - 存储和管理各种分析数据
3. **脚本工具** - 提供各种分析和测试工具
4. **快速启动** - 统一的命令接口管理所有功能

## ⚠️ 注意事项

1. 确保环境变量正确设置
2. 网络连接稳定（需要访问Binance API和DeepSeek API）
3. 某些脚本需要代理设置
4. 数据文件会自动生成，请定期清理

## 🔮 未来计划

1. 添加更多技术指标
2. 支持更多交易所
3. 实现Web界面
4. 添加回测功能
5. 优化性能

---

*最后更新: 2025-10-28*
*版本: v1.0*