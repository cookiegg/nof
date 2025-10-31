# 🚀 nof0 AI交易系统 - 快速访问

## ✅ 项目已运行

### 🌐 访问地址
- **前端界面**: http://localhost:3000
- **后端API**: http://localhost:3001

---

## 📊 当前数据

### 账户状态
- **净值**: $10,005.00
- **持仓**: XRP 1000枚
- **未实现盈亏**: ~$9.02
- **调用次数**: 353次

### 最新数据
- **对话记录**: 353条
- **成交记录**: 4条
- **AI决策**: HOLD XRP

---

## 🎮 快速操作

### 1️⃣ 查看持仓
访问 http://localhost:3000?tab=positions

### 2️⃣ 查看AI对话
访问 http://localhost:3000?tab=chat

### 3️⃣ 查看成交记录
访问 http://localhost:3000?tab=trades

### 4️⃣ 启动自动交易
- 左侧面板选择环境: **demo-futures**
- 设置间隔: **3分钟**
- 点击"**启动**"按钮

---

## 🔗 常用API端点

```bash
# 健康检查
curl http://localhost:3001/api/health

# 对话记录
curl http://localhost:3001/api/conversations

# 成交记录
curl http://localhost:3001/api/trades

# 持仓信息
curl http://localhost:3001/api/account-totals

# 持仓详情
curl http://localhost:3001/api/positions
```

---

## 📁 数据文件位置

```
backend/data/
├── conversations.json    # AI对话记录
├── trading-state.json    # 交易状态与持仓
├── trades.json          # 成交记录
└── analytics.json       # 分析数据
```

---

## 🎊 开始使用

**立即访问**: http://localhost:3000

所有功能正常运行！🚀

