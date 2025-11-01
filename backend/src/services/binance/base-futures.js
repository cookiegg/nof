import ccxt from 'ccxt';

/**
 * 期货基础实现
 * 提供期货相关的共享业务逻辑（getPrices, getAccountBalance, getRealTimeAccountData）
 * 具体的 createExchange 由子环境文件实现
 */

/**
 * 获取价格（期货）
 */
export async function getPrices(symbols, createExchange) {
  try {
    const ex = createExchange();
    const out = {};
    
    // 优化：批量获取价格，而不是逐个请求
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
            tickerMap[baseSymbol + '/USDT:USDT'] = ticker;
          }
        }
        
        for (const s of symbols) {
          let t = tickers[s] || tickerMap[s];
          if (!t) {
            const baseSymbol = s.split('/')[0];
            t = Object.values(tickers).find(ticker => 
              ticker && ticker.symbol && (
                ticker.symbol === s || 
                ticker.symbol === s + ':USDT' ||
                ticker.symbol.startsWith(baseSymbol + '/') ||
                ticker.symbol.startsWith(baseSymbol + ':')
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
 * 获取账户余额（期货）
 */
export async function getAccountBalance(createExchange) {
  try {
    const ex = createExchange();
    const balance = await ex.fetchBalance();
    const positions = await ex.fetchPositions();
    let totalEquity = 0;
    
    // USDT余额
    if (balance.USDT) {
      totalEquity += Number(balance.USDT.total || 0);
    }
    
    // 加上持仓未实现盈亏
    for (const pos of positions) {
      if (pos.contracts && Number(pos.contracts) !== 0) {
        const unrealizedPnl = Number(pos.unrealizedPnl || 0);
        totalEquity += unrealizedPnl;
      }
    }
    
    return totalEquity > 0 ? totalEquity : null;
  } catch (e) {
    console.error('获取账户余额失败:', e.message);
    return null;
  }
}

/**
 * 获取实时账户数据和持仓（期货）
 */
export async function getRealTimeAccountData(createExchange) {
  try {
    const ex = createExchange();
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
          quantity: contracts,
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
          confidence: 0.8,
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

