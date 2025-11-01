import ccxt from 'ccxt';
import * as baseFutures from './base-futures.js';

/**
 * 生产环境期货
 * 标准生产环境配置，不使用 demo trading
 */

function createExchange() {
  const apiKey = process.env.BINANCE_LIVE_API_KEY || 'xxx';
  const secret = process.env.BINANCE_LIVE_API_SECRET || 'xxx';
  
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

