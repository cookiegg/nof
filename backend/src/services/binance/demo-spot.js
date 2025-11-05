import ccxt from 'ccxt';
import * as baseSpot from './base-spot.js';

/**
 * 现货演示环境 (demo.binance.com)
 * 使用 enableDemoTrading(true) 启用演示交易
 */

function createExchange() {
  const apiKey = process.env.BINANCE_API_KEY_DEMO_FUTURES || '';
  const secret = process.env.BINANCE_API_SECRET_DEMO_FUTURES || '';
  
  const ex = new ccxt.binance({
    apiKey,
    secret,
    enableRateLimit: true,
  });
  
  // 必须先禁用sandbox模式（demo trading不支持sandbox）
  if (ex?.setSandboxMode) {
    ex.setSandboxMode(false);
  }
  
  // 启用demo trading
  if (ex.enableDemoTrading) {
    try {
      ex.enableDemoTrading(true);
    } catch (e) {
      console.warn('无法启用demo trading:', e.message);
    }
  }
  
  // 配置代理（如果设置了环境变量）
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (proxy) {
      ex.httpsProxy = proxy;
    }
  }
  
  return ex;
}

export async function getPrices(symbols) {
  return baseSpot.getPrices(symbols, createExchange);
}

export async function getAccountBalance() {
  return baseSpot.getAccountBalance(createExchange);
}

export async function getRealTimeAccountData() {
  return baseSpot.getRealTimeAccountData(createExchange);
}

