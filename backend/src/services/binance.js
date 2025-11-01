import ccxt from 'ccxt';

function createExchange() {
  // 优先使用期货demo API密钥，如果没有则使用通用密钥
  const env = String(process.env.TRADING_ENV || 'demo-futures').toLowerCase();
  const isFutures = env.includes('futures');
  const isDemo = env.includes('demo');
  
  const apiKey = isFutures 
    ? (process.env.BINANCE_FUTURES_DEMO_API_KEY || process.env.BINANCE_API_KEY || '')
    : (process.env.BINANCE_SPOT_TEST_API_KEY || process.env.BINANCE_API_KEY || '');
  
  const secret = isFutures
    ? (process.env.BINANCE_FUTURES_DEMO_API_SECRET || process.env.BINANCE_API_SECRET || '')
    : (process.env.BINANCE_SPOT_TEST_API_SECRET || process.env.BINANCE_API_SECRET || '');
  
  // 如果是期货，使用binanceusdm
  const ExchangeClass = isFutures ? ccxt.binanceusdm : ccxt.binance;
  
  const ex = new ExchangeClass({
    apiKey,
    secret,
    enableRateLimit: true,
    options: {
      defaultType: 'future',
      warnOnFetchCurrencies: false,
      fetchCurrencies: false,
    },
  });
  
  // 如果是demo模式，必须在初始化后立即调用enableDemoTrading
  if (isDemo) {
    // 必须先禁用sandbox模式（demo trading不支持sandbox）
    if (ex?.setSandboxMode) {
      ex.setSandboxMode(false);
    }
    // 立即启用demo trading
    if (ex.enableDemoTrading) {
      try {
        ex.enableDemoTrading(true);
      } catch (e) {
        console.warn('无法启用demo trading:', e.message);
      }
    }
  } else {
    // 非demo模式才使用sandbox
    if (ex?.setSandboxMode) {
      const testnet = String(process.env.BINANCE_TESTNET || 'true').toLowerCase() === 'true';
      ex.setSandboxMode(testnet);
    }
  }
  
  // 配置代理（如果设置了环境变量）
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (proxy) {
      // 只设置httpsProxy，避免冲突
      ex.httpsProxy = proxy;
    }
  }
  
  return ex;
}

export async function getPrices(symbols) {
  try {
    const ex = createExchange();
    const out = {};
    
    // 优化：批量获取价格，而不是逐个请求
    // fetchTickers可以一次性获取多个symbol的价格，更高效
    if (ex.has?.fetchTickers && symbols.length > 1) {
      try {
        const tickers = await ex.fetchTickers(symbols);
        for (const s of symbols) {
          const t = tickers[s];
          if (t) {
            out[s] = { 
              symbol: s.split('/')[0], // 只保留币种名称，如BTC
              price: Number(t.last || t.close || 0), 
              timestamp: Number(t.timestamp || Date.now()) 
            };
          }
        }
      } catch (e) {
        // 如果批量获取失败，降级到逐个获取
        console.warn('批量获取价格失败，降级到逐个获取:', e.message);
        for (const s of symbols) {
          try {
            const t = await ex.fetchTicker(s);
            out[s] = { 
              symbol: s.split('/')[0],
              price: Number(t.last || t.close || 0), 
              timestamp: Number(t.timestamp || Date.now()) 
            };
          } catch (err) {
            console.warn(`获取${s}价格失败:`, err.message);
          }
        }
      }
    } else {
      // 如果交易所不支持批量获取，逐个获取
      for (const s of symbols) {
        try {
          const t = await ex.fetchTicker(s);
          out[s] = { 
            symbol: s.split('/')[0],
            price: Number(t.last || t.close || 0), 
            timestamp: Number(t.timestamp || Date.now()) 
          };
        } catch (err) {
          console.warn(`获取${s}价格失败:`, err.message);
        }
      }
    }
    
    return out;
  } catch (e) {
    console.error('获取价格失败:', e.message);
    // 返回空对象而不是抛出错误，让前端可以优雅降级
    return {};
  }
}

/**
 * ????????????
 * @returns {Promise<number>} ?????????
 */
export async function getAccountBalance() {
  try {
    const ex = createExchange();
    const env = String(process.env.TRADING_ENV || 'demo-futures').toLowerCase();
    const isFutures = env.includes('futures');
    
    if (isFutures) {
      // ????
      const balance = await ex.fetchBalance();
      // ??????????????
      const positions = await ex.fetchPositions();
      let totalEquity = 0;
      
      // USDT??
      if (balance.USDT) {
        totalEquity += Number(balance.USDT.total || 0);
      }
      
      // ???????
      for (const pos of positions) {
        if (pos.contracts && Number(pos.contracts) !== 0) {
          const unrealizedPnl = Number(pos.unrealizedPnl || 0);
          totalEquity += unrealizedPnl;
        }
      }
      
      return totalEquity > 0 ? totalEquity : null;
    } else {
      // ????
      const balance = await ex.fetchBalance();
      if (balance.USDT) {
        const total = Number(balance.USDT.total || 0);
        return total > 0 ? total : null;
      }
      return null;
    }
  } catch (e) {
    console.error('????????:', e.message);
    // ?????????null???????
    return null;
  }
}

/**
 * 获取实时账户数据和持仓（直接从币安API）
 * @returns {Promise<{balance: number, positions: Array, availableCash: number}>}
 */
export async function getRealTimeAccountData() {
  try {
    const ex = createExchange();
    const env = String(process.env.TRADING_ENV || 'demo-futures').toLowerCase();
    const isFutures = env.includes('futures');
    
    if (!isFutures) {
      const balance = await ex.fetchBalance();
      return {
        balance: balance.USDT?.total || 0,
        availableCash: balance.USDT?.free || 0,
        positions: [],
      };
    }
    
    // 期货模式
    const balance = await ex.fetchBalance();
    const positions = await ex.fetchPositions();
    
    const activePositions = [];
    let totalEquity = Number(balance.USDT?.total || 0);
    
    for (const pos of positions) {
      const contracts = Number(pos.contracts || 0);
      if (contracts !== 0) {
        const symbol = String(pos.symbol || '').replace('/USDT:USDT', '').replace(':USDT', '');
        const unrealizedPnl = Number(pos.unrealizedPnl || 0);
        totalEquity += unrealizedPnl;
        
        const notional = Math.abs(Number(pos.notional || 0));
        const margin = Number(pos.initialMargin || 0);
        const leverage = notional > 0 && margin > 0 ? Math.round((notional / margin) * 10) / 10 : 1;
        
        activePositions.push({
          symbol,
          quantity: contracts, // 正数做多，负数做空
          entry_price: Number(pos.entryPrice || 0),
          current_price: Number(pos.markPrice || pos.markPrice || 0),
          liquidation_price: Number(pos.liquidationPrice || 0),
          unrealized_pnl: unrealizedPnl,
          leverage,
          margin,
          notional_usd: notional,
          entry_time: pos.entryTime ? Math.floor(new Date(pos.entryTime).getTime() / 1000) : Math.floor(Date.now() / 1000),
          entry_oid: Number(pos.id || 0),
          risk_usd: Math.abs(contracts) * Number(pos.entryPrice || 0),
          confidence: 0.8, // 默认值
          exit_plan: null,
        });
      }
    }
    
    return {
      balance: totalEquity,
      availableCash: Number(balance.USDT?.free || 0),
      positions: activePositions,
    };
  } catch (e) {
    console.error('获取实时账户数据失败:', e.message);
    return null;
  }
}


