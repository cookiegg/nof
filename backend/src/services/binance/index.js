/**
 * Binance 服务统一入口
 * 根据 TRADING_ENV 环境变量选择对应的环境实现
 */

import * as demoFutures from './demo-futures.js';
import * as demoSpot from './demo-spot.js';
import * as futures from './futures.js';
import * as spot from './spot.js';

const envHandlers = {
  'demo-futures': demoFutures,
  'demo-spot': demoSpot,
  'futures': futures,
  'spot': spot,
};

function getEnvHandler() {
  const env = String(process.env.TRADING_ENV || 'demo-futures').toLowerCase();
  const handler = envHandlers[env];
  if (!handler) {
    console.warn(`未知的交易环境: ${env}，使用默认环境 demo-futures`);
    return envHandlers['demo-futures'];
  }
  return handler;
}

/**
 * 获取价格
 */
export async function getPrices(symbols) {
  const handler = getEnvHandler();
  return handler.getPrices(symbols);
}

/**
 * 获取账户余额
 */
export async function getAccountBalance() {
  const handler = getEnvHandler();
  return handler.getAccountBalance();
}

/**
 * 获取实时账户数据
 */
export async function getRealTimeAccountData() {
  const handler = getEnvHandler();
  return handler.getRealTimeAccountData();
}

