import ccxt from 'ccxt';

function createExchange() {
  const ex = new ccxt.binance({
    apiKey: process.env.BINANCE_API_KEY || '',
    secret: process.env.BINANCE_API_SECRET || '',
    enableRateLimit: true,
    options: {},
  });
  if (ex?.setSandboxMode) {
    const testnet = String(process.env.BINANCE_TESTNET || 'true').toLowerCase() === 'true';
    ex.setSandboxMode(testnet);
  }
  return ex;
}

export async function getPrices(symbols) {
  const ex = createExchange();
  const out = {};
  for (const s of symbols) {
    const t = await ex.fetchTicker(s);
    out[s] = { symbol: s, price: Number(t.last || t.close || 0), timestamp: Number(t.timestamp || Date.now()) };
  }
  return out;
}


