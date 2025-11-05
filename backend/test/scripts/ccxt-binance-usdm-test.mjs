// 用法：
//  1) 在 backend/.env 配置：
//     BINANCE_API_KEY=...
//     BINANCE_API_SECRET=...
//     BINANCE_TESTNET=true
//  2) 运行：
//     node --env-file=../.env backend/test/ccxt-binance-usdm-test.mjs
//  3) 可选下单（谨慎，测试网）：
//     PLACE_ORDER=true SIDE=buy QTY=0.001 SYMBOL=BTC/USDT node --env-file=../.env backend/test/ccxt-binance-usdm-test.mjs


// 强制本进程走代理（HTTP/HTTPS）
process.env.HTTPS_PROXY = process.env.HTTPS_PROXY || 'http://127.0.0.1:7890';
process.env.HTTP_PROXY  = process.env.HTTP_PROXY  || 'http://127.0.0.1:7890';
// 确保不被 NO_PROXY 绕过
delete process.env.NO_PROXY;
delete process.env.no_proxy;
console.log('HTTP_PROXY=', process.env.HTTP_PROXY, 'HTTPS_PROXY=', process.env.HTTPS_PROXY);

import ccxt from 'ccxt';

function envBool(name, def = false) {
  const v = process.env[name];
  if (v == null) return def;
  const s = String(v).toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'y';
}

async function main() {
  const apiKey = process.env.BINANCE_API_KEY_DEMO_FUTURES || '';
  const secret = process.env.BINANCE_API_SECRET_DEMO_FUTURES || '';
  const testnet = envBool('BINANCE_TESTNET', false);

  // binanceusdm = Binance USDT-Margined Perpetual Futures
  const exchange = new ccxt.binanceusdm({
    apiKey,
    secret,
    enableRateLimit: true,
    // hedgeMode 和 recvWindow 等可按需补充
    options: { 
      defaultType: 'future', 
      warnOnFetchCurrencies: false, 
      fetchCurrencies: false 
    },
  });
  
  // 设置代理 - 使用 CCXT 官方推荐的属性
  exchange.httpsProxy = 'http://127.0.0.1:7890/';
  
  exchange.enableDemoTrading(true);


  //console.log('Exchange id:', exchange.id, 'testnet:', testnet);

  // 加载市场
  const markets = await exchange.loadMarkets(undefined, { fetchCurrencies: false });
  const symbol = process.env.SYMBOL || 'BTC/USDT:USDT';
  if (!markets[symbol]) throw new Error(`Symbol not found in markets: ${symbol}`);

  // 行情
  const ticker = await exchange.fetchTicker(symbol);
  console.log('Ticker', symbol, {
    last: ticker?.last,
    bid: ticker?.bid,
    ask: ticker?.ask,
    ts: ticker?.datetime || new Date().toISOString(),
  });

  // 账户余额（USDT）- 优先使用 futures v2 原始端点，避免版本路径差异
  try {
    const acct = await exchange.fapiPrivateV2GetAccount();
    const assets = Array.isArray(acct?.assets) ? acct.assets : [];
    const usdtAsset = assets.find(a => a.asset === 'USDT');
    const walletBalance = Number(usdtAsset?.walletBalance || 0);
    console.log('Balance USDT walletBalance:', walletBalance);
  } catch (e) {
    console.log('fallback fetchBalance due to', String(e?.message || e));
    const balance = await exchange.fetchBalance();
    const usdt = balance?.total?.USDT ?? 0;
    console.log('Balance USDT total:', usdt);
  }

  // 当前仓位（若交易所与账户权限允许）
  let positions = [];
  try {
    positions = await exchange.fetchPositions([symbol]);
  } catch (e) {
    console.log('fetchPositions not available or no positions:', String(e?.message || e));
  }
  if (positions?.length) {
    const pos = positions.map(p => ({ symbol: p.symbol, side: p.side, contracts: p.contracts, entryPrice: p.entryPrice, unrealizedPnl: p.unrealizedPnl }));
    console.log('Positions:', pos);
  }

  // 可选：下单（测试网）。需要在 .env 或命令行设置 PLACE_ORDER=true
  if (envBool('PLACE_ORDER', false)) {
    const side = (process.env.SIDE || 'buy').toLowerCase();
    const qty = Number(process.env.QTY || '0.001');
    console.log(`Placing MARKET ${side} ${qty} ${symbol} ...`);
    const order = await exchange.createOrder(symbol, 'market', side, qty);
    console.log('Order placed:', { id: order?.id, status: order?.status, info: order?.info });

    // 查询未成交订单与最近成交
    const open = await exchange.fetchOpenOrders(symbol);
    console.log('OpenOrders:', open?.map(o => ({ id: o.id, status: o.status, type: o.type, side: o.side })));
    const trades = await exchange.fetchMyTrades(symbol, undefined, 10);
    console.log('MyTrades(last10):', trades?.map(t => ({ id: t.id, side: t.side, amount: t.amount, price: t.price, fee: t.fee })));
  }
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
