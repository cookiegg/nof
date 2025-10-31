import ccxt from 'ccxt';

async function main() {
  try {
    // set proxies if available or default to local
    process.env.HTTPS_PROXY = process.env.HTTPS_PROXY || 'http://127.0.0.1:7890';
    process.env.HTTP_PROXY = process.env.HTTP_PROXY || 'http://127.0.0.1:7890';

    const usdm = new ccxt.binanceusdm({
      enableRateLimit: true,
      options: { defaultType: 'future', enableDemoTrading: true }
    });
    if (typeof usdm.enableDemoTrading === 'function') usdm.enableDemoTrading(true);
    usdm.httpsProxy = 'http://127.0.0.1:7890/';

    const spot = new ccxt.binance({ enableRateLimit: true });
    if (typeof spot.setSandboxMode === 'function') spot.setSandboxMode(true);
    spot.httpsProxy = 'http://127.0.0.1:7890/';

    console.log('=== Binance USDM (demo) fetching markets ===');
    const fMarkets = await usdm.loadMarkets();
    const fSymbols = Object.values(fMarkets)
      .filter(m => m.quote === 'USDT')
      .map(m => ({ symbol: m.symbol, id: m.id, type: m.type, linear: m.linear }))
      .slice(0, 50);
    console.log(JSON.stringify(fSymbols, null, 2));

    console.log('=== Binance SPOT (testnet) fetching markets ===');
    const sMarkets = await spot.loadMarkets();
    const sSymbols = Object.values(sMarkets)
      .filter(m => m.quote === 'USDT')
      .map(m => ({ symbol: m.symbol, id: m.id, type: m.type }))
      .slice(0, 50);
    console.log(JSON.stringify(sSymbols, null, 2));

  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

main();
