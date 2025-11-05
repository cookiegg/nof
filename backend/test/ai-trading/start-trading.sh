#!/bin/bash

# AI交易系统启动脚本
# 使用方法: ./start-trading.sh

echo "🚀 启动AI交易系统..."
echo "🌐 交易环境: demo.binance.com"
echo "💰 资金类型: 模拟资金 (无风险)"
echo ""

# 检查环境变量文件
if [ ! -f "../../.env" ]; then
    echo "❌ 错误: 找不到环境变量文件 backend/.env"
    echo "💡 请确保设置了以下环境变量:"
    echo "   - DEEPSEEK_API_KEY_30"
    echo "   - BINANCE_API_KEY_DEMO_FUTURES"
    echo "   - BINANCE_API_SECRET_DEMO_FUTURES"
    exit 1
fi

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到Node.js"
    echo "💡 请先安装Node.js"
    exit 1
fi

# 检查依赖
if [ ! -d "../../../node_modules" ]; then
    echo "📦 安装依赖..."
    cd ../../../
    npm install
    cd backend/test/ai-trading/
fi

echo "✅ 环境检查完成"
echo ""

# 运行交易系统
echo "🤖 启动AI交易系统..."
node --env-file=../../.env ai-trading-system.mjs

echo ""
echo "✨ 交易系统运行完成！"
echo "📊 查看交易记录: https://demo.binance.com"