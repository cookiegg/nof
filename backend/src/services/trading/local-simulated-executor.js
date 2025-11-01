/**
 * 本地模拟交易执行器
 * 只读取行情数据，不实际下单，本地维护虚拟账户状态
 */

import { TradingExecutor } from './executor.js';
import { BotStateManager } from './bot-state-manager.js';
import ccxt from 'ccxt';

export class LocalSimulatedExecutor extends TradingExecutor {
  constructor(config) {
    super(config);
    this.botId = config.botId;
    this.env = config.env;
    this.isFutures = config.env === 'demo-futures' || config.env === 'futures';
    this.stateManager = new BotStateManager(this.botId);
    this._initialBalance = 10000; // 初始余额
  }

  /**
   * 标准化交易对符号
   */
  _normalizeSymbol(base) {
    return base.toUpperCase();
  }

  /**
   * 获取交易对符号（用于行情查询）
   */
  _getMarketSymbol(base) {
    const baseUpper = base.toUpperCase();
    if (this.isFutures) {
      return `${baseUpper}/USDT:USDT`;
    } else {
      return `${baseUpper}/USDT`;
    }
  }

  /**
   * 获取exchange实例（用于读取行情）
   */
  async _getExchange() {
    if (!this._exchange) {
      // 创建只读的exchange实例（不需要API key，只读行情）
      if (this.isFutures) {
        this._exchange = new ccxt.binanceusdm({
          enableRateLimit: true,
          options: {
            defaultType: 'future',
            warnOnFetchCurrencies: false,
            fetchCurrencies: false
          }
        });
      } else {
        this._exchange = new ccxt.binance({
          enableRateLimit: true,
          options: {
            defaultType: 'spot',
            warnOnFetchCurrencies: false,
            fetchCurrencies: false
          }
        });
      }
    }
    return this._exchange;
  }

  /**
   * 获取当前价格（从行情获取）
   */
  async getCurrentPrice(symbol) {
    try {
      const exchange = await this._getExchange();
      const marketSymbol = this._getMarketSymbol(symbol);
      const ticker = await exchange.fetchTicker(marketSymbol);
      return ticker.last || 0;
    } catch (e) {
      console.error(`[LocalSimulatedExecutor] 获取价格失败 (${symbol}):`, e.message);
      return 0;
    }
  }

  /**
   * 加载或初始化状态
   */
  async _getState() {
    let state = await this.stateManager.loadState();
    
    if (!state) {
      // 初始化状态
      state = {
        accountValue: this._initialBalance,
        availableCash: this._initialBalance,
        positions: [],
        trades: [],
        initialBalance: this._initialBalance
      };
      await this.stateManager.saveState(state);
    }
    
    return state;
  }

  /**
   * 执行买入订单（模拟）
   */
  async executeBuyOrder(decision) {
    const symbol = this._normalizeSymbol(decision.symbol);
    const quantity = decision.quantity || 0.001;
    const leverage = this.isFutures && decision.leverage !== undefined
      ? Math.floor(Number(decision.leverage))
      : 1;

    try {
      // 获取当前价格
      const currentPrice = await this.getCurrentPrice(symbol);
      if (!currentPrice || currentPrice <= 0) {
        throw new Error(`无法获取 ${symbol} 的价格`);
      }

      // 加载状态
      const state = await this._getState();
      
      // 计算所需资金
      const notional = quantity * currentPrice;
      const requiredMargin = this.isFutures ? notional / leverage : notional;
      
      if (state.availableCash < requiredMargin) {
        throw new Error(`资金不足：需要 ${requiredMargin.toFixed(2)} USDT，当前可用 ${state.availableCash.toFixed(2)} USDT`);
      }

      // 查找现有持仓
      const existingPos = state.positions.find(p => p.symbol === symbol);
      
      if (existingPos) {
        // 合并持仓（计算平均成本）
        const oldQty = parseFloat(existingPos.quantity);
        const oldCost = oldQty * parseFloat(existingPos.entry_price);
        const newCost = quantity * currentPrice;
        const totalQty = oldQty + quantity;
        const avgPrice = (oldCost + newCost) / totalQty;
        
        existingPos.quantity = totalQty;
        existingPos.entry_price = avgPrice;
        existingPos.current_price = currentPrice;
        existingPos.leverage = leverage;
        existingPos.notional_usd = totalQty * currentPrice;
        existingPos.margin = (totalQty * currentPrice) / leverage;
      } else {
        // 新建持仓
        state.positions.push({
          symbol,
          quantity,
          entry_price: currentPrice,
          current_price: currentPrice,
          leverage,
          notional_usd: notional,
          margin: requiredMargin,
          entry_time: Math.floor(Date.now() / 1000),
          unrealized_pnl: 0
        });
      }

      // 更新可用资金
      state.availableCash -= requiredMargin;

      // 记录交易
      const trade = {
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        symbol,
        side: 'buy',
        quantity,
        price: currentPrice,
        leverage,
        timestamp: Date.now(),
        status: 'filled'
      };
      state.trades.push(trade);

      // 更新账户总值
      await this._updateAccountValue(state);

      // 保存状态
      await this.stateManager.saveState(state);

      return {
        id: trade.id,
        symbol: decision.symbol,
        side: 'buy',
        quantity,
        price: currentPrice,
        timestamp: trade.timestamp,
        status: 'filled'
      };
    } catch (e) {
      console.error('[LocalSimulatedExecutor] 买入失败:', e.message);
      throw e;
    }
  }

  /**
   * 执行卖出订单（模拟）
   */
  async executeSellOrder(decision) {
    const symbol = this._normalizeSymbol(decision.symbol);
    const quantity = Math.abs(decision.quantity || 0.001);

    try {
      // 获取当前价格
      const currentPrice = await this.getCurrentPrice(symbol);
      if (!currentPrice || currentPrice <= 0) {
        throw new Error(`无法获取 ${symbol} 的价格`);
      }

      // 加载状态
      const state = await this._getState();
      
      // 查找持仓
      const existingPos = state.positions.find(p => p.symbol === symbol);
      if (!existingPos || Math.abs(parseFloat(existingPos.quantity)) < quantity) {
        throw new Error(`持仓不足：${symbol} 当前持仓 ${existingPos?.quantity || 0}，需要 ${quantity}`);
      }

      const oldQty = parseFloat(existingPos.quantity);
      const entryPrice = parseFloat(existingPos.entry_price);
      const leverage = existingPos.leverage || 1;

      // 计算盈亏
      const pnl = (currentPrice - entryPrice) * quantity;
      const margin = (quantity * entryPrice) / leverage;

      // 更新持仓
      const remainingQty = oldQty - quantity;
      if (Math.abs(remainingQty) < 0.000001) {
        // 全部平仓
        state.positions = state.positions.filter(p => p.symbol !== symbol);
      } else {
        existingPos.quantity = remainingQty;
        existingPos.current_price = currentPrice;
        existingPos.notional_usd = remainingQty * currentPrice;
        existingPos.margin = (remainingQty * currentPrice) / leverage;
      }

      // 释放保证金并加上盈亏
      state.availableCash += margin + pnl;

      // 记录交易
      const trade = {
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        symbol,
        side: 'sell',
        quantity,
        price: currentPrice,
        leverage,
        realized_pnl: pnl,
        timestamp: Date.now(),
        status: 'filled'
      };
      state.trades.push(trade);

      // 更新账户总值
      await this._updateAccountValue(state);

      // 保存状态
      await this.stateManager.saveState(state);

      return {
        id: trade.id,
        symbol: decision.symbol,
        side: 'sell',
        quantity,
        price: currentPrice,
        timestamp: trade.timestamp,
        status: 'filled'
      };
    } catch (e) {
      console.error('[LocalSimulatedExecutor] 卖出失败:', e.message);
      throw e;
    }
  }

  /**
   * 更新账户总值（基于持仓市值）
   */
  async _updateAccountValue(state) {
    let totalValue = state.availableCash;
    
    for (const pos of state.positions) {
      const symbol = pos.symbol;
      const currentPrice = await this.getCurrentPrice(symbol);
      const quantity = parseFloat(pos.quantity);
      const notional = quantity * currentPrice;
      
      pos.current_price = currentPrice;
      pos.unrealized_pnl = (currentPrice - parseFloat(pos.entry_price)) * quantity;
      
      if (this.isFutures) {
        // 期货：保证金 + 未实现盈亏
        totalValue += pos.unrealized_pnl;
      } else {
        // 现货：持仓市值
        totalValue += notional;
      }
    }
    
    state.accountValue = totalValue;
  }

  /**
   * 更新账户状态
   */
  async updateAccountState() {
    const state = await this._getState();
    await this._updateAccountValue(state);
    await this.stateManager.saveState(state);
    return state;
  }

  /**
   * 获取账户余额
   */
  async getAccountBalance() {
    const state = await this._getState();
    await this._updateAccountValue(state);
    return state.accountValue;
  }

  /**
   * 获取持仓
   */
  async getPositions() {
    const state = await this._getState();
    // 更新持仓的当前价格
    for (const pos of state.positions) {
      pos.current_price = await this.getCurrentPrice(pos.symbol);
      pos.unrealized_pnl = (pos.current_price - parseFloat(pos.entry_price)) * parseFloat(pos.quantity);
    }
    return state.positions;
  }
}

