# AI交易系统前端控制指南

## 🎯 概述

通过前端界面控制AI交易系统的启动、停止和监控，无需手动在命令行运行脚本。

## 🏗️ 架构

```
前端控制按钮
    ↓ HTTP请求
后端API (/api/nof1/ai/trading/*)
    ↓ 调用
交易运行器 (tradingRunner.js)
    ↓ spawn进程
AI交易系统 (ai-trading-system.v2.mjs)
    ↓ 保存数据
conversations.json + trading-state.json
```

## 🚀 快速开始

### 1. 启动后端

```bash
cd /data/proj/open_nof1/nof0/backend
npm start
```

后端将在 `http://localhost:3001` 启动

### 2. 启动前端

```bash
cd /data/proj/open_nof1/nof0/web
npm run dev
```

前端将在 `http://localhost:3000` 启动

### 3. 使用前端控制

在前端页面中添加控制组件：

```tsx
import TradingSystemControl from '@/components/trading/TradingSystemControl';

export default function TradingPage() {
  return (
    <div className="container mx-auto p-4">
      <TradingSystemControl />
    </div>
  );
}
```

## 📡 API 端点

### GET `/api/nof1/ai/trading/status`

获取交易系统当前状态

**响应示例:**
```json
{
  "status": "running",
  "isRunning": true,
  "intervalMinutes": 3,
  "lastRunTime": "2025-10-31T10:30:45.123Z",
  "lastError": null,
  "runCount": 5,
  "nextRunTime": "2025-10-31T10:33:45.123Z"
}
```

### POST `/api/nof1/ai/trading/start`

启动交易系统定时运行

**请求体:**
```json
{
  "intervalMinutes": 3  // 可选，默认3分钟
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "交易系统已启动，间隔3分钟",
  "status": { /* 状态信息 */ }
}
```

### POST `/api/nof1/ai/trading/stop`

停止交易系统

**响应示例:**
```json
{
  "success": true,
  "message": "交易系统已停止",
  "status": { /* 状态信息 */ }
}
```

### POST `/api/nof1/ai/trading/interval`

更新运行间隔（会重启系统）

**请求体:**
```json
{
  "intervalMinutes": 5
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "间隔时间已更新为5分钟",
  "status": { /* 状态信息 */ }
}
```

### POST `/api/nof1/ai/trading/run-once`

手动触发一次交易决策（不启动定时器）

**响应示例:**
```json
{
  "success": true,
  "message": "交易执行完成",
  "status": { /* 状态信息 */ }
}
```

## 🎨 前端组件功能

### TradingSystemControl

完整的交易系统控制面板，包含：

**实时状态显示:**
- ✅ 运行状态徽章（运行中/已停止/错误）
- ✅ 运行次数统计
- ✅ 间隔时间
- ✅ 上次运行时间
- ✅ 下次运行时间
- ✅ 错误信息显示

**控制功能:**
- 🚀 启动交易系统
- 🛑 停止交易系统
- ⚡ 手动运行一次
- ⚙️ 调整间隔时间

**特性:**
- 🔄 每3秒自动刷新状态
- 💬 操作结果提示
- 🔒 运行时禁用冲突操作
- 📱 响应式设计

## 🧪 测试API

### 使用curl测试

```bash
# 1. 查看状态
curl http://localhost:3001/api/nof1/ai/trading/status

# 2. 启动交易系统（3分钟间隔）
curl -X POST http://localhost:3001/api/nof1/ai/trading/start \
  -H "Content-Type: application/json" \
  -d '{"intervalMinutes": 3}'

# 3. 查看状态（应该显示running）
curl http://localhost:3001/api/nof1/ai/trading/status

# 4. 手动运行一次（在定时器之外）
curl -X POST http://localhost:3001/api/nof1/ai/trading/run-once

# 5. 停止交易系统
curl -X POST http://localhost:3001/api/nof1/ai/trading/stop

# 6. 查看状态（应该显示stopped）
curl http://localhost:3001/api/nof1/ai/trading/status
```

## 🔍 监控和日志

### 后端日志

交易系统运行时会在后端控制台输出日志：

```
🚀 [2025-10-31T10:30:45.123Z] 运行AI交易系统
📂 脚本路径: /data/proj/open_nof1/nof0/backend/ai/ai-trading/ai-trading-system.v2.mjs
📂 工作目录: /data/proj/open_nof1/nof0

🔧 初始化Binance USDM Demo (Futures)...
✅ Futures Demo初始化成功

📊 获取 BTC/USDT:USDT 数据...
📊 获取 ETH/USDT:USDT 数据...
...

🤖 调用DeepSeek API...
⚡ 执行交易决策...
💾 保存对话记录...

✅ AI交易系统运行完成
```

### 查看生成的数据

```bash
# 查看交易状态
cat /data/proj/open_nof1/nof0/backend/data/trading-state.json

# 查看对话记录（最新5条）
cat /data/proj/open_nof1/nof0/backend/data/conversations.json | \
  jq '.conversations[:5]'

# 查看交易记录
cat /data/proj/open_nof1/nof0/backend/data/trades.json
```

## ⚠️ 常见问题

### Q1: 点击启动后没有反应？

**检查步骤:**
1. 打开浏览器控制台查看错误
2. 检查后端是否正常运行 `curl http://localhost:3001/api/health`
3. 检查环境变量是否正确设置（API密钥等）

### Q2: 显示错误状态？

**排查方法:**
1. 查看错误信息（组件会显示lastError）
2. 检查后端日志
3. 确认配置文件是否存在: `backend/ai/ai-trading/config.json`
4. 确认.env文件中的API密钥正确

### Q3: 交易系统运行但没有生成数据？

**检查点:**
1. 确认API密钥有效
2. 检查网络连接（如需要代理）
3. 查看后端日志中的详细错误信息
4. 手动运行一次测试: `curl -X POST http://localhost:3001/api/nof1/ai/trading/run-once`

### Q4: 如何停止失控的交易系统？

**紧急停止:**
```bash
# 方法1: 通过API
curl -X POST http://localhost:3001/api/nof1/ai/trading/stop

# 方法2: 重启后端
pkill -f "node.*server.js"
cd /data/proj/open_nof1/nof0/backend && npm start

# 方法3: 杀掉所有相关进程
pkill -f "ai-trading-system"
```

## 🎯 最佳实践

### 1. 开发/测试环境

```bash
# 使用较长的间隔避免频繁调用API
# 推荐: 5-10分钟
```

### 2. 生产环境

```bash
# 根据策略设置合适的间隔
# 推荐: 3-5分钟
# 确保监控和日志正常
```

### 3. 调试模式

```bash
# 使用"手动运行一次"功能测试
# 不启动定时器，便于调试
```

## 📊 完整示例页面

创建一个完整的交易控制页面:

```tsx
// app/trading/page.tsx
import TradingSystemControl from '@/components/trading/TradingSystemControl';
import TradingConversationPanel from '@/components/chat/TradingConversationPanel';

export default function TradingPage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">AI交易系统</h1>
      
      {/* 控制面板 */}
      <TradingSystemControl />
      
      {/* 对话记录 */}
      <TradingConversationPanel />
    </div>
  );
}
```

## 🔐 安全建议

1. ✅ 确保API端点有适当的访问控制
2. ✅ 不要在前端暴露API密钥
3. ✅ 使用环境变量管理敏感信息
4. ✅ 定期检查交易日志和状态
5. ✅ 设置合理的交易限额和风控

## 📚 相关文档

- [对话API对接文档](./CONVERSATIONS_API_INTEGRATION.md)
- [快速开始指南](./QUICK_START_CONVERSATIONS.md)
- [API文档](../learning/nof1_api.md)

## ✅ 总结

现在你可以：
- ✅ 通过前端按钮启动/停止交易系统
- ✅ 实时查看交易系统状态
- ✅ 调整运行间隔
- ✅ 手动触发单次交易
- ✅ 监控错误和日志
- ✅ 无需命令行操作

享受便捷的AI交易系统控制！🚀

