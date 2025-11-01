import ccxt from 'ccxt';

/**
 * 现货基础实现
 * 提供现货相关的共享业务逻辑（getPrices, getAccountBalance, getRealTimeAccountData）
 * 具体的 createExchange 由子环境文件实现
 */

/**
 * 获取价格（现货）
 */
export async function getPrices(symbols, createExchange) {
  try {
    const ex = createExchange();
    const out = {};
    
    // 优化：批量获取价格
    if (ex.has?.fetchTickers && symbols.length > 1) {
      try {
        const tickers = await ex.fetchTickers(symbols);
        
        // 创建symbol到ticker的映射
        const tickerMap = {};
        for (const [key, ticker] of Object.entries(tickers)) {
          if (ticker && ticker.symbol) {
            const baseSymbol = ticker.symbol.replace(/[:/].*/, '');
            const fullSymbol = ticker.symbol;
            tickerMap[fullSymbol] = ticker;
            tickerMap[baseSymbol + '/USDT'] = ticker;
          }
        }
        
        for (const s of symbols) {
          let t = tickers[s] || tickerMap[s];
          if (!t) {
            const baseSymbol = s.split('/')[0];
            t = Object.values(tickers).find(ticker => 
              ticker && ticker.symbol && (
                ticker.symbol === s || 
                ticker.symbol.startsWith(baseSymbol + '/')
              )
            );
          }
          
          if (t) {
            out[s] = { 
              symbol: s.split('/')[0],
              price: Number(t.last || t.close || 0), 
              timestamp: Number(t.timestamp || Date.now()) 
            };
          }
        }
      } catch (e) {
        console.warn('[getPrices] 批量获取价格失败，降级到逐个获取:', e.message);
        for (const s of symbols) {
          try {
            const t = await ex.fetchTicker(s);
            out[s] = { 
              symbol: s.split('/')[0],
              price: Number(t.last || t.close || 0), 
              timestamp: Number(t.timestamp || Date.now()) 
            };
          } catch (err) {
            console.warn(`[getPrices] 获取${s}价格失败:`, err.message);
          }
        }
      }
    } else {
      for (const s of symbols) {
        try {
          const t = await ex.fetchTicker(s);
          out[s] = { 
            symbol: s.split('/')[0],
            price: Number(t.last || t.close || 0), 
            timestamp: Number(t.timestamp || Date.now()) 
          };
        } catch (err) {
          console.warn(`[getPrices] 获取${s}价格失败:`, err.message);
        }
      }
    }
    
    return out;
  } catch (e) {
    console.error('[getPrices] 获取价格失败:', e.message);
    return {};
  }
}

/**
 * 获取账户余额（现货）
 */
export async function getAccountBalance(createExchange) {
  try {
    const ex = createExchange();
    const balance = await ex.fetchBalance();
    
    if (balance.USDT) {
      const total = Number(balance.USDT.total || 0);
      return total > 0 ? total : null;
    }
    return null;
  } catch (e) {
    console.error('获取账户余额失败:', e.message);
    return null;
  }
}

/**
 * 获取实时账户数据（现货）
 */
export async function getRealTimeAccountData(createExchange) {
  try {
    const ex = createExchange();
    const balance = await ex.fetchBalance();
    
    return {
      balance: balance.USDT?.total || 0,
      availableCash: balance.USDT?.free || 0,
      positions: [],
    };
  } catch (e) {
    console.error('获取实时账户数据失败:', e.message);
    return null;
  }
}

