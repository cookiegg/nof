# NOF1 API 文档

**版本**: 1.0.0  
**基础URL**: `https://nof1.ai/api`  
**描述**: NOF1 交易平台 API 接口文档

## 📊 API 总结

- **总端点数**: 27
- **支持的方法**: GET, POST
- **状态码分布**: 200(13), 308(1), 404(3), 405(8), 410(2)

### 端点分类

- **Root**: 1 个端点
- **Account**: 1 个端点
- **Analytics**: 2 个端点
- **Model Analytics**: 12 个端点
- **Other**: 4 个端点
- **Conversations**: 1 个端点
- **Market Data**: 1 个端点
- **Leaderboard**: 1 个端点
- **Positions**: 2 个端点
- **Trading**: 2 个端点

## 🔗 API 端点详情

### Root

#### GET /

**描述**: API 根路径，重定向到 /api

**状态码**: 308 - 永久重定向

**内容类型**: `application/json`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "redirect": {
      "type": "string",
      "description": "重定向URL"
    },
    "status": {
      "type": "string",
      "description": "状态信息"
    }
  }
}
```

**请求示例**:

```bash
curl -X GET "https://nof1.ai/api/" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "redirect": "/api",
  "status": "308"
}
```

---

### Account

#### GET /account-totals

**描述**: 获取账户总额数据

**状态码**: 200 - 请求成功

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "accountTotals": {
      "type": "array",
      "description": "账户总额数据数组"
    },
    "lastHourlyMarkerRead": {
      "type": "number",
      "description": "最后读取的小时标记"
    },
    "serverTime": {
      "type": "number",
      "description": "服务器时间戳"
    }
  }
}
```

**请求示例**:

```bash
curl -X GET "https://nof1.ai/api/account-totals" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "accountTotals": [
    "[truncated]",
    "[truncated]",
    "[truncated]"
  ],
  "lastHourlyMarkerRead": 254,
  "serverTime": 1761653006699
}
```

---

### Analytics

#### GET /analytics

**描述**: 获取分析数据

**状态码**: 200 - 请求成功

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "analytics": {
      "type": "array",
      "description": "分析数据数组"
    },
    "serverTime": {
      "type": "number",
      "description": "服务器时间戳"
    }
  }
}
```

**请求示例**:

```bash
curl -X GET "https://nof1.ai/api/analytics" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "analytics": [
    "[truncated]",
    "[truncated]",
    "[truncated]"
  ],
  "serverTime": 1761652982152
}
```

---

#### POST /analytics

**描述**: 获取分析数据

**状态码**: 405 - 方法不允许

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "message": {
      "type": "string",
      "description": "响应消息"
    }
  }
}
```

**请求示例**:

```bash
curl -X POST "https://nof1.ai/api/analytics" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "message": "Method not allowed"
}
```

---

### Model Analytics

#### GET /analytics/claude-sonnet-4-5

**描述**: 获取 claude-sonnet-4-5 模型的分析数据

**状态码**: 200 - 请求成功

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "analytics": {
      "type": "array",
      "description": "分析数据数组"
    }
  }
}
```

**请求示例**:

```bash
curl -X GET "https://nof1.ai/api/analytics/claude-sonnet-4-5" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "analytics": [
    "[truncated]"
  ]
}
```

---

#### POST /analytics/claude-sonnet-4-5

**描述**: 获取 claude-sonnet-4-5 模型的分析数据

**状态码**: 405 - 方法不允许

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "message": {
      "type": "string",
      "description": "响应消息"
    }
  }
}
```

**请求示例**:

```bash
curl -X POST "https://nof1.ai/api/analytics/claude-sonnet-4-5" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "message": "Method not allowed"
}
```

---

#### GET /analytics/deepseek-chat-v3.1

**描述**: 获取 deepseek-chat-v3.1 模型的分析数据

**状态码**: 200 - 请求成功

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "analytics": {
      "type": "array",
      "description": "分析数据数组"
    }
  }
}
```

**请求示例**:

```bash
curl -X GET "https://nof1.ai/api/analytics/deepseek-chat-v3.1" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "analytics": [
    "[truncated]"
  ]
}
```

---

#### POST /analytics/deepseek-chat-v3.1

**描述**: 获取 deepseek-chat-v3.1 模型的分析数据

**状态码**: 405 - 方法不允许

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "message": {
      "type": "string",
      "description": "响应消息"
    }
  }
}
```

**请求示例**:

```bash
curl -X POST "https://nof1.ai/api/analytics/deepseek-chat-v3.1" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "message": "Method not allowed"
}
```

---

#### GET /analytics/gemini-2.5-pro

**描述**: 获取 gemini-2.5-pro 模型的分析数据

**状态码**: 200 - 请求成功

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "analytics": {
      "type": "array",
      "description": "分析数据数组"
    }
  }
}
```

**请求示例**:

```bash
curl -X GET "https://nof1.ai/api/analytics/gemini-2.5-pro" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "analytics": [
    "[truncated]"
  ]
}
```

---

#### POST /analytics/gemini-2.5-pro

**描述**: 获取 gemini-2.5-pro 模型的分析数据

**状态码**: 405 - 方法不允许

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "message": {
      "type": "string",
      "description": "响应消息"
    }
  }
}
```

**请求示例**:

```bash
curl -X POST "https://nof1.ai/api/analytics/gemini-2.5-pro" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "message": "Method not allowed"
}
```

---

#### GET /analytics/gpt-5

**描述**: 获取 gpt-5 模型的分析数据

**状态码**: 200 - 请求成功

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "analytics": {
      "type": "array",
      "description": "分析数据数组"
    }
  }
}
```

**请求示例**:

```bash
curl -X GET "https://nof1.ai/api/analytics/gpt-5" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "analytics": [
    "[truncated]"
  ]
}
```

---

#### POST /analytics/gpt-5

**描述**: 获取 gpt-5 模型的分析数据

**状态码**: 405 - 方法不允许

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "message": {
      "type": "string",
      "description": "响应消息"
    }
  }
}
```

**请求示例**:

```bash
curl -X POST "https://nof1.ai/api/analytics/gpt-5" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "message": "Method not allowed"
}
```

---

#### GET /analytics/grok-4

**描述**: 获取 grok-4 模型的分析数据

**状态码**: 200 - 请求成功

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "analytics": {
      "type": "array",
      "description": "分析数据数组"
    }
  }
}
```

**请求示例**:

```bash
curl -X GET "https://nof1.ai/api/analytics/grok-4" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "analytics": [
    "[truncated]"
  ]
}
```

---

#### POST /analytics/grok-4

**描述**: 获取 grok-4 模型的分析数据

**状态码**: 405 - 方法不允许

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "message": {
      "type": "string",
      "description": "响应消息"
    }
  }
}
```

**请求示例**:

```bash
curl -X POST "https://nof1.ai/api/analytics/grok-4" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "message": "Method not allowed"
}
```

---

#### GET /analytics/qwen3-max

**描述**: 获取 qwen3-max 模型的分析数据

**状态码**: 200 - 请求成功

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "analytics": {
      "type": "array",
      "description": "分析数据数组"
    }
  }
}
```

**请求示例**:

```bash
curl -X GET "https://nof1.ai/api/analytics/qwen3-max" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "analytics": [
    "[truncated]"
  ]
}
```

---

#### POST /analytics/qwen3-max

**描述**: 获取 qwen3-max 模型的分析数据

**状态码**: 405 - 方法不允许

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "message": {
      "type": "string",
      "description": "响应消息"
    }
  }
}
```

**请求示例**:

```bash
curl -X POST "https://nof1.ai/api/analytics/qwen3-max" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "message": "Method not allowed"
}
```

---

### Other

#### GET /api-endpoints

**描述**: API 端点

**状态码**: 404 - 资源未找到

**内容类型**: `text/html; charset=utf-8`

---

### Conversations

#### GET /conversations

**描述**: 获取对话记录数据

**状态码**: 200 - 请求成功

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "conversations": {
      "type": "array",
      "description": "对话记录数组"
    }
  }
}
```

**请求示例**:

```bash
curl -X GET "https://nof1.ai/api/conversations" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "conversations": [
    "[truncated]",
    "[truncated]",
    "[truncated]"
  ]
}
```

---

### Market Data

#### GET /crypto-prices

**描述**: 获取加密货币价格数据

**状态码**: 200 - 请求成功

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "prices": {
      "type": "object",
      "description": "价格数据对象"
    },
    "serverTime": {
      "type": "number",
      "description": "服务器时间戳"
    }
  }
}
```

**请求示例**:

```bash
curl -X GET "https://nof1.ai/api/crypto-prices" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "prices": {
    "BTC": "[truncated]",
    "ETH": "[truncated]",
    "SOL": "[truncated]",
    "BNB": "[truncated]",
    "DOGE": "[truncated]"
  },
  "serverTime": 1761652992345
}
```

---

### Other

#### GET /health

**描述**: API 端点

**状态码**: 404 - 资源未找到

**内容类型**: `text/html; charset=utf-8`

---

### Leaderboard

#### GET /leaderboard

**描述**: 获取排行榜数据

**状态码**: 200 - 请求成功

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "leaderboard": {
      "type": "array",
      "description": "排行榜数据数组"
    }
  }
}
```

**请求示例**:

```bash
curl -X GET "https://nof1.ai/api/leaderboard" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "leaderboard": [
    "[truncated]",
    "[truncated]",
    "[truncated]"
  ]
}
```

---

### Positions

#### GET /positions

**描述**: 获取持仓信息（已废弃，请使用 account-totals）

**状态码**: 410 - 资源已废弃

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "message": {
      "type": "string",
      "description": "响应消息"
    },
    "positions": {
      "type": "array",
      "description": "持仓信息数组"
    },
    "serverTime": {
      "type": "number",
      "description": "服务器时间戳"
    }
  }
}
```

**请求示例**:

```bash
curl -X GET "https://nof1.ai/api/positions" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "message": "Positions API deprecated - use account_totals instead",
  "positions": [],
  "serverTime": 1761652990750
}
```

---

#### POST /positions

**描述**: 获取持仓信息（已废弃，请使用 account-totals）

**状态码**: 410 - 资源已废弃

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "message": {
      "type": "string",
      "description": "响应消息"
    },
    "positions": {
      "type": "array",
      "description": "持仓信息数组"
    },
    "serverTime": {
      "type": "number",
      "description": "服务器时间戳"
    }
  }
}
```

**请求示例**:

```bash
curl -X POST "https://nof1.ai/api/positions" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "message": "Positions API deprecated - use account_totals instead",
  "positions": [],
  "serverTime": 1761652991434
}
```

---

### Other

#### GET /since-inception-values

**描述**: 获取自成立以来的价值数据

**状态码**: 200 - 请求成功

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "sinceInceptionValues": {
      "type": "array",
      "description": "自成立以来的价值数据数组"
    },
    "serverTime": {
      "type": "number",
      "description": "服务器时间戳"
    }
  }
}
```

**请求示例**:

```bash
curl -X GET "https://nof1.ai/api/since-inception-values" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "sinceInceptionValues": [
    "[truncated]",
    "[truncated]",
    "[truncated]"
  ],
  "serverTime": 1761653038715
}
```

---

#### GET /status

**描述**: API 端点

**状态码**: 404 - 资源未找到

**内容类型**: `text/html; charset=utf-8`

---

### Trading

#### GET /trades

**描述**: 获取交易记录数据

**状态码**: 200 - 请求成功

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "trades": {
      "type": "array",
      "description": "交易记录数组"
    },
    "serverTime": {
      "type": "number",
      "description": "服务器时间戳"
    }
  }
}
```

**请求示例**:

```bash
curl -X GET "https://nof1.ai/api/trades" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "trades": [
    "[truncated]",
    "[truncated]",
    "[truncated]"
  ],
  "serverTime": 1761652961762
}
```

---

#### POST /trades

**描述**: 获取交易记录数据

**状态码**: 405 - 方法不允许

**内容类型**: `application/json; charset=utf-8`

**响应结构**:

```json
{
  "type": "object",
  "properties": {
    "message": {
      "type": "string",
      "description": "响应消息"
    }
  }
}
```

**请求示例**:

```bash
curl -X POST "https://nof1.ai/api/trades" \
  -H "Accept: application/json"
```

**响应示例**:

```json
{
  "message": "Method not allowed"
}
```

---

