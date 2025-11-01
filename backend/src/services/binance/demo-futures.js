import ccxt from 'ccxt';
import * as baseFutures from './base-futures.js';

/**
 * 期货演示环境 (demo.binance.com)
 * 使用 enableDemoTrading(true) 启用演示交易
 */

function createExchange() {
  const apiKey = process.env.BINANCE_DEMO_API_KEY || '';
  const secret = process.env.BINANCE_DEMO_API_SECRET || '';
  
  const ex = new ccxt.binanceusdm({
    apiKey,
    secret,
    enableRateLimit: true,
    options: {
      defaultType: 'future',
      warnOnFetchCurrencies: false,
      fetchCurrencies: false,
    },
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
  return baseFutures.getPrices(symbols, createExchange);
}

export async function getAccountBalance() {
  return baseFutures.getAccountBalance(createExchange);
}

export async function getRealTimeAccountData() {
  return baseFutures.getRealTimeAccountData(createExchange);
}

