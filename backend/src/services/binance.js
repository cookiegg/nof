/**
 * Binance 服务入口（向后兼容）
 * 现在委托给 binance/index.js 处理
 */

export { getPrices, getAccountBalance, getRealTimeAccountData } from './binance/index.js';
