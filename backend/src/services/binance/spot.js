import ccxt from 'ccxt';
import * as baseSpot from './base-spot.js';

/**
 * 生产环境现货
 * 标准生产环境配置，不使用 demo trading
 */

function createExchange() {
  const apiKey = process.env.BINANCE_LIVE_API_KEY || 'xxx';
  const secret = process.env.BINANCE_LIVE_API_SECRET || 'xxx';
  
  const ex = new ccxt.binance({
    apiKey,
    secret,
    enableRateLimit: true,
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
  return baseSpot.getPrices(symbols, createExchange);
}

export async function getAccountBalance() {
  return baseSpot.getAccountBalance(createExchange);
}

export async function getRealTimeAccountData() {
  return baseSpot.getRealTimeAccountData(createExchange);
}

