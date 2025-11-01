/**
 * Binance Demo交易执行器
 * 使用真实的Binance API进行交易（Demo账户）
 */

import ccxt from 'ccxt';
import { TradingExecutor } from './executor.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export class BinanceDemoExecutor extends TradingExecutor {
  constructor(config) {
    super(config);
    this.env = config.env;
    this.isFutures = config.env === 'demo-futures' || config.env === 'futures';
    this.exchange = null;
  }

  async _ensureExchange() {
    if (!this.exchange) {
      // 加载配置
      const configPath = resolve(process.cwd(), 'backend/ai/ai-trading/config.json');
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      
      // 根据环境选择配置
      const isFutures = this.env === 'demo-futures' || this.env === 'futures';
      const exchangeConfig = isFutures 
        ? config.exchange?.binance?.futures_demo
        : config.exchange?.binance?.spot_testnet;
      
      if (!exchangeConfig?.api_key || !exchangeConfig?.api_secret) {
        throw new Error(`缺少${this.env}环境的API配置`);
      }

      // 展开环境变量
      function expandEnvMaybe(value) {
        if (typeof value !== 'string') return value;
        const match = value.match(/^\$\{([^}]+)\}$/);
        if (match) return process.env[match[1]] || value;
        return value;
      }

      const apiKey = expandEnvMaybe(exchangeConfig.api_key);
      const apiSecret = expandEnvMaybe(exchangeConfig.api_secret);

      // 创建exchange实例
      if (isFutures) {
        this.exchange = new ccxt.binanceusdm({
          apiKey,
          secret: apiSecret,
          enableRateLimit: true,
          options: {
            defaultType: 'future',
            warnOnFetchCurrencies: false,
            fetchCurrencies: false
          }
        });
        this.exchange.enableDemoTrading(true);
      } else {
        this.exchange = new ccxt.binance({
          apiKey,
          secret: apiSecret,
          enableRateLimit: true,
          options: {
            defaultType: 'spot',
            warnOnFetchCurrencies: false,
            fetchCurrencies: false
          }
        });
        this.exchange.setSandboxMode(true);
      }
    }
    return this.exchange;
  }

  /**
   * 标准化交易对符号
   */
  _normalizeSymbol(base) {
    const baseUpper = base.toUpperCase();
    if (this.isFutures) {
      return `${baseUpper}/USDT:USDT`;
    } else {
      return `${baseUpper}/USDT`;
    }
  }

  /**
   * 执行买入订单
   */
  async executeBuyOrder(decision) {
    const exchange = await this._ensureExchange();
    const base = this._normalizeSymbol(decision.symbol);
    const quantity = decision.quantity || 0.001;
    const leverage = this.isFutures && decision.leverage !== undefined 
      ? Math.floor(Number(decision.leverage)) 
      : undefined;

    try {
      if (this.isFutures) {
        // 设置保证金模式和杠杆
        try {
          await exchange.setMarginMode('ISOLATED', base);
        } catch (_) {}
        if (leverage !== undefined) {
          try {
            await exchange.setLeverage(leverage, base);
          } catch (_) {}
        }
      }

      const order = await exchange.createOrder(
        base,
        'market',
        'buy',
        quantity,
        null,
        this.isFutures
          ? (leverage !== undefined
              ? { leverage, marginType: 'isolated' }
              : { marginType: 'isolated' })
          : undefined
      );

      return {
        id: order.id,
        symbol: decision.symbol,
        side: 'buy',
        quantity,
        price: order.average || order.price || 0,
        timestamp: order.timestamp || Date.now(),
        status: order.status || 'filled'
      };
    } catch (e) {
      console.error('[BinanceDemoExecutor] 买入失败:', e.message);
      throw e;
    }
  }

  /**
   * 执行卖出订单
   */
  async executeSellOrder(decision) {
    const exchange = await this._ensureExchange();
    const base = this._normalizeSymbol(decision.symbol);
    const quantity = decision.quantity || 0.001;
    const leverage = this.isFutures && decision.leverage !== undefined 
      ? Math.floor(Number(decision.leverage)) 
      : undefined;

    try {
      if (this.isFutures) {
        try {
          await exchange.setMarginMode('ISOLATED', base);
        } catch (_) {}
        if (leverage !== undefined) {
          try {
            await exchange.setLeverage(leverage, base);
          } catch (_) {}
        }
      }

      const order = await exchange.createOrder(
        base,
        'market',
        'sell',
        quantity,
        null,
        this.isFutures
          ? (leverage !== undefined
              ? { leverage, marginType: 'isolated' }
              : { marginType: 'isolated' })
          : undefined
      );

      return {
        id: order.id,
        symbol: decision.symbol,
        side: 'sell',
        quantity,
        price: order.average || order.price || 0,
        timestamp: order.timestamp || Date.now(),
        status: order.status || 'filled'
      };
    } catch (e) {
      console.error('[BinanceDemoExecutor] 卖出失败:', e.message);
      throw e;
    }
  }

  /**
   * 更新账户状态
   */
  async updateAccountState() {
    const exchange = await this._ensureExchange();
    
    try {
      const balance = await exchange.fetchBalance();
      let positions = [];

      if (this.isFutures) {
        positions = await exchange.fetchPositions();
        const active = positions.filter(p => parseFloat(p.contracts || 0) !== 0);
        positions = active.map(p => ({
          symbol: String(p.symbol || '').replace('/USDT:USDT', '').replace(':USDT', ''),
          quantity: parseFloat(p.contracts || 0),
          entry_price: parseFloat(p.entryPrice || 0),
          current_price: parseFloat(p.markPrice || 0),
          unrealized_pnl: parseFloat(p.unrealizedPnl || 0),
          leverage: parseFloat(p.leverage || 1)
        }));
      }

      return {
        accountValue: balance.USDT?.total || 0,
        availableCash: balance.USDT?.free || 0,
        positions
      };
    } catch (e) {
      console.error('[BinanceDemoExecutor] 更新账户状态失败:', e.message);
      throw e;
    }
  }

  /**
   * 获取账户余额
   */
  async getAccountBalance() {
    const exchange = await this._ensureExchange();
    const balance = await exchange.fetchBalance();
    return balance.USDT?.total || 0;
  }

  /**
   * 获取持仓
   */
  async getPositions() {
    if (!this.isFutures) {
      return [];
    }
    
    const exchange = await this._ensureExchange();
    const positions = await exchange.fetchPositions();
    const active = positions.filter(p => parseFloat(p.contracts || 0) !== 0);
    
    return active.map(p => ({
      symbol: String(p.symbol || '').replace('/USDT:USDT', '').replace(':USDT', ''),
      quantity: parseFloat(p.contracts || 0),
      entry_price: parseFloat(p.entryPrice || 0),
      current_price: parseFloat(p.markPrice || 0),
      unrealized_pnl: parseFloat(p.unrealizedPnl || 0),
      leverage: parseFloat(p.leverage || 1)
    }));
  }

  /**
   * 获取当前价格
   */
  async getCurrentPrice(symbol) {
    const exchange = await this._ensureExchange();
    const base = this._normalizeSymbol(symbol);
    const ticker = await exchange.fetchTicker(base);
    return ticker.last || 0;
  }
}

