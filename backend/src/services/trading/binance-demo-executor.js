/**
 * Binance Demo交易执行器
 * 使用真实的Binance API进行交易（Demo账户）
 */

import ccxt from 'ccxt';
import { TradingExecutor } from './executor.js';
import { BotStateManager } from './bot-state-manager.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export class BinanceDemoExecutor extends TradingExecutor {
  constructor(config) {
    super(config);
    // 统一环境识别：优先使用传入，其次读取 TRADING_ENV，最后默认 demo-futures
    this.env = config.env || process.env.TRADING_ENV || 'demo-futures';
    this.botId = config.botId;
    this.isFutures = this.env === 'demo-futures' || this.env === 'futures';
    this.exchange = null;
    // 为真实demo执行器也注入独立的状态管理，确保AITradingSystem能够写入bot专属文件
    if (this.botId) {
      this.stateManager = new BotStateManager(this.botId);
    }
  }

  async _ensureExchange() {
    if (!this.exchange) {
      // 加载配置
      const configPath = resolve(process.cwd(), 'backend/ai/ai-trading/config.json');
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      
      // 根据环境选择配置
      const isFutures = this.env === 'demo-futures' || this.env === 'futures';
      let exchangeConfig;
      
      // 根据 TRADING_ENV 分支选择密钥来源
      if (this.env === 'test-spot' || this.env === 'demo-spot') {
        // Spot Testnet：使用 TEST_SPOT（优先），兼容老 DEMO_SPOT
        exchangeConfig = {
          api_key: process.env.BINANCE_API_KEY_TEST_SPOT || process.env.BINANCE_API_KEY_DEMO_SPOT,
          api_secret: process.env.BINANCE_API_SECRET_TEST_SPOT || process.env.BINANCE_API_SECRET_DEMO_SPOT,
        };
        if (!exchangeConfig.api_key || !exchangeConfig.api_secret) {
          throw new Error('缺少 TEST SPOT 密钥，请设置 BINANCE_API_KEY_TEST_SPOT 与 BINANCE_API_SECRET_TEST_SPOT');
        }
      } else if (this.env === 'spot') {
        // 现货实盘：使用 Live Spot 的 API Key + 私钥路径（ed25519）
        exchangeConfig = {
          api_key: process.env.BINANCE_API_KEY_LIVE_SPOT,
          api_secret: undefined, // 使用私钥签名
        };
        if (!exchangeConfig.api_key) {
          throw new Error('缺少 LIVE SPOT 密钥，请设置 BINANCE_API_KEY_LIVE_SPOT');
        }
      } else if (this.env === 'futures') {
        // 合约实盘：使用 Live Futures 的 API Key + 私钥路径（ed25519）
        exchangeConfig = {
          api_key: process.env.BINANCE_API_KEY_LIVE_FUTURES,
          api_secret: undefined,
        };
        if (!exchangeConfig.api_key) {
          throw new Error('缺少 LIVE FUTURES 密钥，请设置 BINANCE_API_KEY_LIVE_FUTURES');
        }
      } else {
        // 默认：demo-futures，读取配置文件（支持 ${ENV} 展开）
        exchangeConfig = config.exchange?.binance?.futures_demo;
        if (!exchangeConfig?.api_key || !exchangeConfig?.api_secret) {
          throw new Error(`缺少 ${this.env} 环境的API配置`);
        }
      }

      // 展开环境变量（仅对配置文件中的 ${ENV}）
      function expandEnvMaybe(value) {
        if (typeof value !== 'string') return value;
        const match = value.match(/^\$\{([^}]+)\}$/);
        if (match) return process.env[match[1]] || value;
        return value;
      }

      // 解析 API Key / Secret / 私钥
      const apiKey = (this.env === 'demo-futures')
        ? expandEnvMaybe(exchangeConfig.api_key)
        : exchangeConfig.api_key;
      const apiSecret = (this.env === 'demo-futures')
        ? expandEnvMaybe(exchangeConfig.api_secret)
        : exchangeConfig.api_secret;

      // 调试日志（不打印明文）
      try {
        const mask = (s) => (s ? `${String(s).slice(0, 4)}...(${String(s).length})` : 'null');
        console.log(
          `[BinanceDemoExecutor] env=${this.env}, isFutures=${isFutures} | apiKey=${mask(apiKey)} | apiSecret=${apiSecret ? '***' : 'null'} | keyType=${(process.env.KEY_TYPE||'').toLowerCase()}`
        );
      } catch (_) {}

      // 私钥与密钥类型（仅实盘使用；demo 环境强制使用对称 HMAC，不读取私钥）
      let privateKeyContent = undefined;
      const keyType = this.env === 'spot'
        ? (process.env.BINANCE_API_KEY_LIVE_SPOT_KEY_TYPE || process.env.KEY_TYPE || '').toLowerCase()
        : this.env === 'futures'
          ? (process.env.BINANCE_API_KEY_LIVE_FUTURES_KEY_TYPE || process.env.KEY_TYPE || '').toLowerCase()
          : '';
      if (this.env === 'spot') {
        const pkPath = process.env.BINANCE_PRIVATE_KEY_LIVE_SPOT_PATH;
        if (pkPath) {
          try { privateKeyContent = readFileSync(pkPath, 'utf8').trim(); } catch (_) {}
        }
      }
      if (this.env === 'futures') {
        const pkPath = process.env.BINANCE_PRIVATE_KEY_LIVE_FUTURES_PATH;
        if (pkPath) {
          try { privateKeyContent = readFileSync(pkPath, 'utf8').trim(); } catch (_) {}
        }
      }

      // 代理与超时设置（不硬编码，读取环境变量；默认 20000ms）
      const httpsProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || undefined;
      const timeoutMs = Number.parseInt(process.env.CCXT_TIMEOUT_MS || '', 10);
      const effectiveTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20000;

      // 创建exchange实例
      if (isFutures) {
        this.exchange = new ccxt.binanceusdm({
          apiKey,
          secret: apiSecret,
          enableRateLimit: true,
          options: {
            defaultType: 'future',
            warnOnFetchCurrencies: false,
            fetchCurrencies: false,
            enableDemoTrading: true
          }
        });
        console.log('[BinanceDemoExecutor] Initialized binanceusdm (futures)');
        // Base URL 覆盖（按环境变量优先）
        try {
          this.exchange.urls = this.exchange.urls || {};
          if (this.env === 'demo-futures') {
            const base = process.env.BINANCE_DEMO_FUTURES_BASE_URL || 'https://demo-fapi.binance.com';
            this.exchange.urls.api = base;
            console.log(`[BinanceDemoExecutor] Futures demo URL => ${base}`);
          } else if (this.env === 'futures') {
            const base = process.env.BINANCE_FUTURES_BASE_URL || 'https://fapi.binance.com';
            this.exchange.urls.api = base;
            console.log(`[BinanceDemoExecutor] Futures URL => ${base}`);
          }
        } catch (_) {}
        if (this.env === 'futures' && keyType === 'ed25519' && privateKeyContent) {
          try {
            this.exchange.options = this.exchange.options || {};
            this.exchange.options.keypair = { type: 'ed25519', privateKey: privateKeyContent };
          } catch (_) {}
        }
        // 代理与超时（ccxt 实例属性）
        if (httpsProxy) {
          this.exchange.httpsProxy = httpsProxy;
        }
        this.exchange.timeout = effectiveTimeout;
        // 有些版本提供该方法；若不存在则忽略
        try { if (typeof this.exchange.enableDemoTrading === 'function') this.exchange.enableDemoTrading(true); } catch (_) {}
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
        console.log('[BinanceDemoExecutor] Initialized binance (spot)');
        // Base URL 覆盖（按环境变量优先）
        try {
          this.exchange.urls = this.exchange.urls || {};
          if (this.env === 'spot') {
            const base = process.env.BINANCE_SPOT_BASE_URL || 'https://api.binance.com';
            this.exchange.urls.api = base;
            console.log(`[BinanceDemoExecutor] Spot URL => ${base}`);
          }
        } catch (_) {}
        if (this.env === 'spot' && keyType === 'ed25519' && privateKeyContent) {
          try {
            this.exchange.options = this.exchange.options || {};
            this.exchange.options.keypair = { type: 'ed25519', privateKey: privateKeyContent };
          } catch (_) {}
        }
        if (httpsProxy) {
          this.exchange.httpsProxy = httpsProxy;
        }
        this.exchange.timeout = effectiveTimeout;
        // test-spot / demo-spot 开启 sandbox（使用 testnet.binance.vision）
        if (this.env === 'test-spot' || this.env === 'demo-spot' || String(process.env.BINANCE_TEST).toLowerCase() === 'true') {
          try { if (typeof this.exchange.setSandboxMode === 'function') this.exchange.setSandboxMode(true); } catch (_) {}
        }
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
    
    // 确保 quantity 是有效的正数
    let quantity = decision.quantity;
    if (quantity == null || quantity === '' || quantity === 0) {
      quantity = 0.001; // 默认值
    } else {
      quantity = Number(quantity);
      if (isNaN(quantity) || quantity <= 0) {
        console.warn(`[BinanceDemoExecutor] 无效的quantity值: ${decision.quantity}，使用默认值 0.001`);
        quantity = 0.001;
      }
    }
    
    console.log(`[BinanceDemoExecutor] 买入订单: symbol=${base}, quantity=${quantity}, leverage=${decision.leverage || 'N/A'}`);
    
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
    
    // 确保 quantity 是有效的正数
    let quantity = decision.quantity;
    if (quantity == null || quantity === '' || quantity === 0) {
      quantity = 0.001; // 默认值
    } else {
      quantity = Number(quantity);
      if (isNaN(quantity) || quantity <= 0) {
        console.warn(`[BinanceDemoExecutor] 无效的quantity值: ${decision.quantity}，使用默认值 0.001`);
        quantity = 0.001;
      }
    }
    
    console.log(`[BinanceDemoExecutor] 卖出订单: symbol=${base}, quantity=${quantity}, leverage=${decision.leverage || 'N/A'}`);
    
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
        positions = active.map(p => {
          const symbol = String(p.symbol || '').replace('/USDT:USDT', '').replace(':USDT', '');
          const contractsRaw = parseFloat(p.contracts || 0);
          const side = String(p.side || '').toLowerCase();
          const qtyAbs = Math.abs(contractsRaw);
          const quantity = (side === 'long' || side === 'buy') ? qtyAbs : -qtyAbs;
          const notional = Math.abs(Number(p.notional || 0));
          const margin = Number(p.initialMargin || 0);
          const levFromMm = (notional > 0 && margin > 0) ? Math.round((notional / margin) * 10) / 10 : undefined;
          const leverage = Number.isFinite(parseFloat(p.leverage)) && parseFloat(p.leverage) > 0 ? parseFloat(p.leverage) : (levFromMm || 1);
          return {
            symbol,
            quantity,
          entry_price: parseFloat(p.entryPrice || 0),
          current_price: parseFloat(p.markPrice || 0),
            liquidation_price: Number(p.liquidationPrice || 0),
          unrealized_pnl: parseFloat(p.unrealizedPnl || 0),
            leverage,
            margin,
            notional_usd: notional,
            entry_time: p.entryTime ? Math.floor(new Date(p.entryTime).getTime() / 1000) : Math.floor(Date.now() / 1000),
            entry_oid: Number(p.id || 0),
            risk_usd: qtyAbs * Number(p.entryPrice || 0),
            confidence: 0.8,
            exit_plan: null,
          };
        });
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
    
    return active.map(p => {
      const symbol = String(p.symbol || '').replace('/USDT:USDT', '').replace(':USDT', '');
      const contractsRaw = parseFloat(p.contracts || 0);
      const side = String(p.side || '').toLowerCase();
      const qtyAbs = Math.abs(contractsRaw);
      const quantity = (side === 'long' || side === 'buy') ? qtyAbs : -qtyAbs;
      const notional = Math.abs(Number(p.notional || 0));
      const margin = Number(p.initialMargin || 0);
      const levFromMm = (notional > 0 && margin > 0) ? Math.round((notional / margin) * 10) / 10 : undefined;
      const leverage = Number.isFinite(parseFloat(p.leverage)) && parseFloat(p.leverage) > 0 ? parseFloat(p.leverage) : (levFromMm || 1);
      return {
        symbol,
        quantity,
      entry_price: parseFloat(p.entryPrice || 0),
      current_price: parseFloat(p.markPrice || 0),
        liquidation_price: Number(p.liquidationPrice || 0),
      unrealized_pnl: parseFloat(p.unrealizedPnl || 0),
        leverage,
        margin,
        notional_usd: notional,
      };
    });
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


