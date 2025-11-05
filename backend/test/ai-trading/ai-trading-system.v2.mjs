import ccxt from 'ccxt';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function expandEnvMaybe(value) {
  if (typeof value !== 'string') return value;
  const m = value.match(/^\$\{(.+)\}$/);
  if (m) return process.env[m[1]] || '';
  return value;
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && idx < process.argv.length - 1) return process.argv[idx + 1];
  const envKey = name.replace(/^--/, '').toUpperCase();
  return process.env[envKey];
}

function loadConfig() {
  const configPath = resolve(process.cwd(), 'backend/test/ai-trading/config.json');
  const raw = readFileSync(configPath, 'utf8');
  const cfg = JSON.parse(raw);
  // 展开可能的 ${ENV}
  if (cfg.ai && cfg.ai.api_key) cfg.ai.api_key = expandEnvMaybe(cfg.ai.api_key);
  const f = cfg.exchange?.binance?.futures_demo;
  const s = cfg.exchange?.binance?.spot_testnet;
  if (f) {
    f.api_key = expandEnvMaybe(f.api_key);
    f.api_secret = expandEnvMaybe(f.api_secret);
  }
  if (s) {
    s.api_key = expandEnvMaybe(s.api_key);
    s.api_secret = expandEnvMaybe(s.api_secret);
  }
  return cfg;
}

function renderSections(template, flags) {
  let out = template;
  out = out.replace(/\{\{#is_futures\}\}([\s\S]*?)\{\{\/is_futures\}\}/g, (_, inner) => (flags.is_futures ? inner : ''));
  out = out.replace(/\{\{\^is_futures\}\}([\s\S]*?)\{\{\/is_futures\}\}/g, (_, inner) => (!flags.is_futures ? inner : ''));
  return out;
}

function renderSimple(template, context) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g, (_, key) => {
    const val = key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : ''), context);
    return String(val ?? '');
  });
}

class AITradingSystemV2 {
  constructor() {
    this.config = loadConfig();

    // 读取命令行/环境参数
    const argEnv = getArg('--env'); // demo-futures | demo-spot | futures | spot
    const argAi = getArg('--ai');   // 如 deepseek | deepseek-reasoner

    // 确定交易环境
    this.tradingEnv = (argEnv && typeof argEnv === 'string') ? argEnv : (this.config.trading_env || 'demo-futures');
    this.isFutures = this.tradingEnv === 'demo-futures' || this.tradingEnv === 'futures';

    // 确定 AI 设置：优先 --ai 对应的 ai.presets，再退回到顶层 ai
    const aiPreset = (argAi && this.config.ai?.presets?.[argAi]) ? this.config.ai.presets[argAi] : null;
    this.aiProvider = (aiPreset?.provider || this.config.ai?.provider || 'deepseek');
    this.aiModel = (aiPreset?.model || this.config.ai?.model || 'deepseek-chat');
    this.aiApiKey = expandEnvMaybe(aiPreset?.api_key || this.config.ai?.api_key || process.env.DEEPSEEK_API_KEY_30 || '');
    this.aiTemperature = (aiPreset?.temperature ?? this.config.ai?.temperature ?? 0.7);
    this.aiMaxTokens = (aiPreset?.max_tokens ?? this.config.ai?.max_tokens ?? 2000);

    this.exchange = null;
    this.stateFile = '/data/proj/open_nof1/nof0/backend/test/trading-state.json';
    this.conversationsFile = '/data/proj/open_nof1/nof0/backend/test/trading-conversations.json';

    this.state = this.loadState();
    this.conversations = this.loadConversations();

    // allowed_symbols 选择顺序：显式 allowed_symbols -> presets[env] -> 内置默认
    const defaultAllowed = this.isFutures
      ? ['BTC/USDT:USDT','ETH/USDT:USDT','SOL/USDT:USDT','BNB/USDT:USDT','XRP/USDT:USDT','DOGE/USDT:USDT']
      : ['BTC/USDT','ETH/USDT','SOL/USDT','BNB/USDT','XRP/USDT','DOGE/USDT'];

    const presetAllowed = this.config.presets?.[this.tradingEnv]?.allowed_symbols;

    this.allowedSymbolsForAI = Array.isArray(this.config.allowed_symbols) && this.config.allowed_symbols.length > 0
      ? this.config.allowed_symbols
      : (Array.isArray(presetAllowed) && presetAllowed.length > 0 ? presetAllowed : defaultAllowed);

    this.symbols = (Array.isArray(this.config.symbols_monitor) && this.config.symbols_monitor.length > 0)
      ? this.config.symbols_monitor
      : [...this.allowedSymbolsForAI];

    // 预加载模板
    this.systemPromptTemplatePath = resolve(process.cwd(), this.config.prompt_files?.system_prompt_path || '');
    this.userPromptTemplatePath = resolve(process.cwd(), this.config.prompt_files?.user_prompt_path || '');
    this.systemPromptTemplate = existsSync(this.systemPromptTemplatePath)
      ? readFileSync(this.systemPromptTemplatePath, 'utf8')
      : '';
    this.userPromptTemplate = existsSync(this.userPromptTemplatePath)
      ? readFileSync(this.userPromptTemplatePath, 'utf8')
      : '';

    this.dataCfg = {
      intraday_tf: this.config.data?.intraday_tf || '1m',
      intraday_limit: this.config.data?.intraday_limit || 50,
      context_tf: this.config.data?.context_tf || '4h',
      context_limit: this.config.data?.context_limit || 10
    };
  }

  normalizeBaseSymbol(raw) {
    if (!raw) return undefined;
    let sym = String(raw).trim().toUpperCase();
    sym = sym.replace(/\s+/g, '');
    sym = sym.replace(/:USDT$/, '');
    if (sym.includes('/')) return sym.split('/')[0];
    if (sym.endsWith('USDT')) return sym.slice(0, -4);
    return sym;
  }

  loadState() {
    try {
      if (existsSync(this.stateFile)) {
        const data = readFileSync(this.stateFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (_) {}
    return {
      startTime: new Date().toISOString(),
      invocationCount: 0,
      totalReturn: 0,
      accountValue: 10000,
      availableCash: 10000,
      positions: [],
      lastUpdate: new Date().toISOString(),
      tradingEnabled: true
    };
  }

  saveState() {
    this.state.lastUpdate = new Date().toISOString();
    writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf8');
  }

  loadConversations() {
    try {
      if (existsSync(this.conversationsFile)) {
        const data = readFileSync(this.conversationsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (_) {}
    return { conversations: [], lastUpdate: new Date().toISOString() };
  }

  saveConversations() {
    this.conversations.lastUpdate = new Date().toISOString();
    writeFileSync(this.conversationsFile, JSON.stringify(this.conversations, null, 2), 'utf8');
  }

  async initializeExchange() {
    try {
      process.env.HTTPS_PROXY = process.env.HTTPS_PROXY || 'http://127.0.0.1:7890';
      process.env.HTTP_PROXY = process.env.HTTP_PROXY || 'http://127.0.0.1:7890';

      const envKey = this.tradingEnv;
      const isDemoFutures = envKey === 'demo-futures';
      const isDemoSpot = envKey === 'demo-spot';

      if (isDemoFutures || envKey === 'futures') {
        const apiKey = this.config.exchange?.binance?.futures_demo?.api_key || process.env.BINANCE_API_KEY_DEMO_FUTURES;
        const secret = this.config.exchange?.binance?.futures_demo?.api_secret || process.env.BINANCE_API_SECRET_DEMO_FUTURES;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_API_KEY_DEMO_FUTURES/SECRET或在config.json配置');
        this.exchange = new ccxt.binanceusdm({ apiKey, secret, enableRateLimit: true, options: { defaultType: 'future', warnOnFetchCurrencies: false, fetchCurrencies: false, enableDemoTrading: true } });
        this.exchange.httpsProxy = 'http://127.0.0.1:7890/';
        this.exchange.enableDemoTrading(true);
        await this.exchange.fetchBalance();
      } else if (isDemoSpot || envKey === 'spot') {
        const apiKey = this.config.exchange?.binance?.spot_testnet?.api_key || process.env.BINANCE_SPOT_TESTNET_API_KEY;
        const secret = this.config.exchange?.binance?.spot_testnet?.api_secret || process.env.BINANCE_SPOT_TESTNET_API_SECRET;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_SPOT_TESTNET_API_KEY/SECRET或在config.json配置');
        this.exchange = new ccxt.binance({ apiKey, secret, enableRateLimit: true });
        this.exchange.httpsProxy = 'http://127.0.0.1:7890/';
        if (typeof this.exchange.setSandboxMode === 'function') this.exchange.setSandboxMode(true);
        await this.exchange.fetchBalance();
      }
      return true;
    } catch (e) {
      console.error('初始化交易所失败:', e.message);
      return false;
    }
  }

  calculateEMA(prices, period) {
    if (prices.length < period) return null;
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    return ema;
  }
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26) {
    if (prices.length < slowPeriod) return null;
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    if (!fastEMA || !slowEMA) return null;
    return fastEMA - slowEMA;
  }
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change; else losses += Math.abs(change);
    }
    const avgGain = gains / period; const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  calculateATR(highs, lows, closes, period = 14) {
    if (highs.length < period + 1) return null;
    const trueRanges = [];
    for (let i = 1; i < highs.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  async getMarketData() {
    const marketData = {};
    const intradayTf = this.dataCfg.intraday_tf;
    const intradayLimit = this.dataCfg.intraday_limit;
    const ctxTf = this.dataCfg.context_tf;
    const ctxLimit = this.dataCfg.context_limit;
    for (const symbol of this.symbols) {
      try {
        const ticker = await this.exchange.fetchTicker(symbol);
        const ohlcv = await this.exchange.fetchOHLCV(symbol, intradayTf, undefined, intradayLimit);
        const prices = ohlcv.map(c => (c[2] + c[3]) / 2);
        const highs = ohlcv.map(c => c[2]);
        const lows = ohlcv.map(c => c[3]);
        const closes = ohlcv.map(c => c[4]);
        const volumes = ohlcv.map(c => c[5]);
        const ema20 = this.calculateEMA(prices, 20) || ticker.last;
        const macd = this.calculateMACD(prices) || 0;
        const rsi14 = this.calculateRSI(prices, 14) || 50;
        const rsi21 = this.calculateRSI(prices, 21) || 50;
        const atr = this.calculateATR(highs, lows, closes) || ticker.last * 0.02;

        const ohlcvCtx = await this.exchange.fetchOHLCV(symbol, ctxTf, undefined, ctxLimit);
        const pricesCtx = ohlcvCtx.map(c => (c[2] + c[3]) / 2);
        const ema20_4h = this.calculateEMA(pricesCtx, 20) || ticker.last;
        const ema50_4h = this.calculateEMA(pricesCtx, 50) || ticker.last;
        const atr_4h = this.calculateATR(ohlcvCtx.map(c => c[2]), ohlcvCtx.map(c => c[3]), ohlcvCtx.map(c => c[4])) || ticker.last * 0.02;

        const currentVolume = volumes[volumes.length - 1];
        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        const fundingRate = (Math.random() - 0.5) * 0.001;
        const openInterest = Math.random() * 1000000 + 500000;
        const avgOpenInterest = openInterest * (0.8 + Math.random() * 0.4);
        const baseKey = this.normalizeBaseSymbol(symbol);

        marketData[baseKey] = {
          symbol: baseKey,
          currentPrice: ticker.last,
          ema20, macd, rsi14, rsi21, atr,
          ema20_4h, ema50_4h, atr_4h,
          currentVolume, avgVolume, fundingRate, openInterest, avgOpenInterest,
          prices: prices.slice(-10),
          ema20_series: this.generateEMASeries(prices, 20).slice(-10),
          macd_series: this.generateMACDSeries(prices).slice(-10),
          rsi14_series: this.generateRSISeries(prices, 14).slice(-10),
          rsi21_series: this.generateRSISeries(prices, 21).slice(-10),
          macd_4h_series: this.generateMACDSeries(pricesCtx).slice(-10),
          rsi14_4h_series: this.generateRSISeries(pricesCtx, 14).slice(-10)
        };
      } catch (e) {
        console.error('获取数据失败', symbol, e.message);
      }
    }
    return marketData;
  }

  generateEMASeries(prices, period) {
    const series = [];
    for (let i = period - 1; i < prices.length; i++) {
      const ema = this.calculateEMA(prices.slice(0, i + 1), period);
      series.push(ema);
    }
    return series;
  }
  generateMACDSeries(prices) {
    const series = [];
    for (let i = 25; i < prices.length; i++) {
      const macd = this.calculateMACD(prices.slice(0, i + 1));
      series.push(macd);
    }
    return series;
  }
  generateRSISeries(prices, period) {
    const series = [];
    for (let i = period; i < prices.length; i++) {
      const rsi = this.calculateRSI(prices.slice(0, i + 1), period);
      series.push(rsi);
    }
    return series;
  }

  buildMarketSections(marketData) {
    let out = '';
    for (const [symbol, data] of Object.entries(marketData)) {
      out += `### ALL ${symbol} DATA\n\n` +
        `current_price = ${data.currentPrice.toFixed(2)}, current_ema20 = ${data.ema20.toFixed(2)}, current_macd = ${data.macd.toFixed(2)}, current_rsi (14 period) = ${data.rsi14.toFixed(2)}\n\n` +
        `Open Interest: Latest: ${data.openInterest.toFixed(2)}  Average: ${data.avgOpenInterest.toFixed(2)}\n\n` +
        `Funding Rate: ${data.fundingRate.toExponential(2)}\n\n` +
        `Intraday series (${this.dataCfg.intraday_tf}): oldest → latest\n\n` +
        `${symbol} mid prices: [${data.prices.map(p => p.toFixed(2)).join(', ')}]\n\n` +
        `EMA indicators (20‑period): [${data.ema20_series.map(p => p.toFixed(2)).join(', ')}]\n\n` +
        `MACD indicators: [${data.macd_series.map(p => p.toFixed(2)).join(', ')}]\n\n` +
        `RSI indicators (14‑Period): [${data.rsi14_series.map(p => p.toFixed(2)).join(', ')}]\n\n` +
        `RSI indicators (21‑Period): [${data.rsi21_series.map(p => p.toFixed(2)).join(', ')}]\n\n` +
        `Longer‑term context (${this.dataCfg.context_tf} timeframe):\n\n` +
        `20‑Period EMA: ${data.ema20_4h.toFixed(2)} vs. 50‑Period EMA: ${data.ema50_4h.toFixed(2)}\n\n` +
        `20‑Period ATR: ${data.atr.toFixed(2)} vs. 50‑Period ATR: ${data.atr_4h.toFixed(2)}\n\n` +
        `Current Volume: ${data.currentVolume.toFixed(2)} vs. Average Volume: ${data.avgVolume.toFixed(2)}\n\n` +
        `MACD indicators: [${data.macd_4h_series.map(p => p.toFixed(2)).join(', ')}]\n\n` +
        `RSI indicators (14‑Period): [${data.rsi14_4h_series.map(p => p.toFixed(2)).join(', ')}]\n\n` +
        `---\n\n`;
    }
    return out;
  }

  generateUserPrompt(marketData) {
    if (!this.userPromptTemplate) {
      const currentTime = new Date();
      const startTime = new Date(this.state.startTime);
      const minutesSinceStart = Math.floor((currentTime - startTime) / (1000 * 60));
      this.state.invocationCount++;
      this.saveState();
      const marketSections = this.buildMarketSections(marketData);
      const positionsBlock = this.state.positions.map(p => JSON.stringify(p)).join('\n');
      return `It has been ${minutesSinceStart} minutes since you started trading. The current time is ${currentTime.toISOString()} and you've been invoked ${this.state.invocationCount} times.\n\n---\n\n${marketSections}\n\nAccount Value: ${this.state.accountValue}`;
    }

    const now = new Date();
    const start = new Date(this.state.startTime);
    const minutesSince = Math.floor((now - start) / (1000 * 60));
    this.state.invocationCount++;
    this.saveState();

    const context = {
      minutes_since_start: minutesSince,
      now_iso: now.toISOString(),
      invocation_count: this.state.invocationCount,
      market_sections: this.buildMarketSections(marketData),
      account_value: this.state.accountValue.toFixed(2),
      available_cash: this.state.availableCash.toFixed(2),
      total_return: this.state.totalReturn.toFixed(2),
      positions_block: this.state.positions.map(p => JSON.stringify(p)).join('\n'),
      sharpe_ratio: this.calculateSharpeRatio().toFixed(2)
    };

    return renderSimple(this.userPromptTemplate, context);
  }

  calculateSharpeRatio() {
    return this.state.totalReturn > 0 ? Math.random() * 2 - 1 : -Math.random();
  }

  buildSystemPrompt() {
    if (!this.systemPromptTemplate) {
      const allowedCsv = this.allowedSymbolsForAI.join(', ');
      const base = [
        this.isFutures ? 'You are an expert crypto trader operating Binance USDT-margined perpetual futures (U-margined).'
                       : 'You are an expert crypto trader operating Binance Spot Testnet (no leverage).',
        'Symbols whitelist:',
        allowedCsv
      ].join('\n');
      return base;
    }
    const tpl1 = renderSections(this.systemPromptTemplate, { is_futures: this.isFutures });
    const context = {
      environment: this.isFutures ? 'demo.binance.com (USDT-M Futures)' : 'binance spot testnet',
      env_note: this.isFutures ? 'USDM perpetual' : 'Spot testnet',
      trading_mode: this.isFutures ? 'perpetual futures (isolated)' : 'spot (no leverage)',
      is_futures: this.isFutures,
      allowed_symbols_csv: this.allowedSymbolsForAI.join(', ')
    };
    return renderSimple(tpl1, context);
  }

  async callDeepSeekAPI(userPrompt) {
    try {
      const apiKey = this.aiApiKey;
      const model = this.aiModel;
      const temperature = this.aiTemperature;
      const max_tokens = this.aiMaxTokens;
      const systemContent = this.buildSystemPrompt();

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: userPrompt }
          ],
          stream: false,
          temperature,
          max_tokens
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (e) {
      console.error('AI 调用失败:', e.message);
      return null;
    }
  }

  parseAIResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { action: 'hold', reasoning: response };
      const rawObj = JSON.parse(jsonMatch[0]);
      const normalizeAction = (a) => {
        if (!a) return 'hold';
        const x = String(a).toLowerCase();
        if (x === 'buy' || x === 'long' || x === 'open_long') return 'buy';
        if (x === 'sell' || x === 'short' || x === 'open_short') return 'sell';
        if (x === 'close' || x === 'close_position' || x === 'exit' || x === 'reduce' || x === 'reduce_position') return 'close_position';
        if (x === 'hold' || x === 'wait' || x === 'no_trade') return 'hold';
        return 'hold';
      };
      const normalizeSymbol = (s) => this.normalizeBaseSymbol(s);
      const d = rawObj.trading_decision ? rawObj.trading_decision : rawObj;
      return {
        action: normalizeAction(d.action),
        symbol: normalizeSymbol(d.symbol),
        quantity: d.quantity !== undefined ? Number(d.quantity) : undefined,
        reasoning: d.reasoning || rawObj.reasoning,
        leverage: d.leverage !== undefined ? Number(d.leverage) : undefined
      };
    } catch (_) {
      return { action: 'hold', reasoning: '解析失败，保持当前持仓' };
    }
  }

  async executeTradingDecision(decision, marketData) {
    try {
      if (decision.action === 'buy' && decision.symbol) {
        await this.executeBuyOrder(decision, marketData);
      } else if (decision.action === 'sell' && decision.symbol) {
        await this.executeSellOrder(decision, marketData);
      } else if (decision.action === 'close_position' && decision.symbol) {
        const base = this.normalizeBaseSymbol(decision.symbol);
        const pos = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
        if (pos) {
          const qty = decision.quantity && decision.quantity > 0 ? decision.quantity : Number(pos.quantity);
          await this.executeSellOrder({ ...decision, symbol: base, quantity: qty }, marketData);
        }
      }
      await this.updateAccountState();
    } catch (e) {
      console.error('交易执行失败:', e.message);
    }
    this.saveState();
  }

  async executeBuyOrder(decision) {
    try {
      const base = this.normalizeBaseSymbol(decision.symbol);
      const symbol = this.isFutures ? `${base}/USDT:USDT` : `${base}/USDT`;
      const quantity = decision.quantity || 0.001;
      const leverage = this.isFutures && decision.leverage !== undefined ? Math.floor(Number(decision.leverage)) : undefined;
      if (this.isFutures) {
        try { await this.exchange.setMarginMode('ISOLATED', symbol); } catch (_) {}
        try { if (leverage !== undefined) await this.exchange.setLeverage(leverage, symbol); } catch (_) {}
      }
      const order = await this.exchange.createOrder(
        symbol, 'market', 'buy', quantity, null,
        this.isFutures ? (leverage !== undefined ? { leverage, marginType: 'isolated' } : { marginType: 'isolated' }) : undefined
      );
      this.addPosition(base, quantity, order.average || order.price);
      this.logTrade('BUY', base, quantity, order.average || order.price, order.id);
    } catch (e) {
      console.error('买入失败:', e.message);
    }
  }

  async executeSellOrder(decision) {
    try {
      const base = this.normalizeBaseSymbol(decision.symbol);
      const symbol = this.isFutures ? `${base}/USDT:USDT` : `${base}/USDT`;
      const quantity = decision.quantity || 0.001;
      const leverage = this.isFutures && decision.leverage !== undefined ? Math.floor(Number(decision.leverage)) : undefined;
      if (this.isFutures) {
        try { await this.exchange.setMarginMode('ISOLATED', symbol); } catch (_) {}
        try { if (leverage !== undefined) await this.exchange.setLeverage(leverage, symbol); } catch (_) {}
      }
      const order = await this.exchange.createOrder(
        symbol, 'market', 'sell', quantity, null,
        this.isFutures ? (leverage !== undefined ? { leverage, marginType: 'isolated' } : { marginType: 'isolated' }) : undefined
      );
      this.removePosition(base, quantity);
      this.logTrade('SELL', base, quantity, order.average || order.price, order.id);
    } catch (e) {
      console.error('卖出失败:', e.message);
    }
  }

  addPosition(symbol, quantity, entryPrice) {
    const base = this.normalizeBaseSymbol(symbol);
    const existing = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
    if (existing) {
      const totalQ = parseFloat(existing.quantity) + parseFloat(quantity);
      const avgPrice = (parseFloat(existing.entry_price) * parseFloat(existing.quantity) + parseFloat(entryPrice) * parseFloat(quantity)) / totalQ;
      existing.quantity = totalQ; existing.entry_price = avgPrice;
    } else {
      this.state.positions.push({
        symbol: base,
        quantity,
        entry_price: entryPrice,
        current_price: entryPrice,
        liquidation_price: entryPrice * 0.9,
        unrealized_pnl: 0,
        leverage: 1,
        exit_plan: { profit_target: entryPrice * 1.1, stop_loss: entryPrice * 0.95, invalidation_condition: 'price_below_stop_loss' },
        confidence: 0.8,
        risk_usd: quantity * entryPrice,
        sl_oid: null, tp_oid: null, wait_for_fill: false, entry_oid: null,
        notional_usd: quantity * entryPrice
      });
    }
  }

  removePosition(symbol, quantity) {
    const base = this.normalizeBaseSymbol(symbol);
    const existing = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
    if (existing) {
      const remain = parseFloat(existing.quantity) - parseFloat(quantity);
      if (remain <= 0) {
        this.state.positions = this.state.positions.filter(p => this.normalizeBaseSymbol(p.symbol) !== base);
      } else {
        existing.quantity = remain;
      }
    }
  }

  async updateAccountState() {
    try {
      const balance = await this.exchange.fetchBalance();
      this.state.accountValue = balance.USDT?.total || 10000;
      this.state.availableCash = balance.USDT?.free || 10000;
      this.state.totalReturn = ((this.state.accountValue - 10000) / 10000) * 100;
      if (this.isFutures) {
        const positions = await this.exchange.fetchPositions();
        const active = positions.filter(p => parseFloat(p.contracts) !== 0);
        this.state.positions = [];
        for (const position of active) {
          if (parseFloat(position.contracts) !== 0) {
            const symbol = this.normalizeBaseSymbol(position.symbol);
            this.state.positions.push({
              symbol,
              quantity: Math.abs(parseFloat(position.contracts)),
              entry_price: parseFloat(position.entryPrice),
              current_price: parseFloat(position.markPrice),
              liquidation_price: parseFloat(position.liquidationPrice) || 0,
              unrealized_pnl: parseFloat(position.unrealizedPnl),
              leverage: 1,
              exit_plan: {
                profit_target: parseFloat(position.entryPrice) * 1.1,
                stop_loss: parseFloat(position.entryPrice) * 0.95,
                invalidation_condition: 'price_below_stop_loss'
              },
              confidence: 0.8,
              risk_usd: Math.abs(parseFloat(position.contracts)) * parseFloat(position.entryPrice),
              sl_oid: null, tp_oid: null, wait_for_fill: false, entry_oid: null,
              notional_usd: parseFloat(position.notional)
            });
          }
        }
      }
    } catch (e) {
      console.error('更新账户失败:', e.message);
    }
  }

  logTrade(side, symbol, quantity, price, orderId) {
    const trade = {
      timestamp: new Date().toISOString(),
      side, symbol, quantity, price, orderId,
      environment: this.isFutures ? 'demo.binance.com' : 'spot.testnet',
      accountValue: this.state.accountValue,
      totalReturn: this.state.totalReturn
    };
    if (!this.state.trades) this.state.trades = [];
    this.state.trades.unshift(trade);
    this.saveState();
  }

  saveConversation(userPrompt, aiResponse, decision) {
    let aiParsed = null;
    try {
      if (typeof aiResponse === 'string') {
        const match = aiResponse.match(/\{[\s\S]*\}/);
        if (match) aiParsed = JSON.parse(match[0]);
      }
    } catch (_) {}

    const conversation = {
      timestamp: new Date().toISOString(),
      invocationCount: this.state.invocationCount,
      userPrompt,
      aiResponse,
      aiParsed,
      decision_normalized: decision,
      accountValue: this.state.accountValue,
      totalReturn: this.state.totalReturn
    };
    if (!this.conversations.conversations) this.conversations.conversations = [];
    this.conversations.conversations.unshift(conversation);
    this.saveConversations();
  }

  async runTradingCycle() {
    try {
      const marketData = await this.getMarketData();
      const userPrompt = this.generateUserPrompt(marketData);
      const aiResponse = await this.callDeepSeekAPI(userPrompt);
      if (!aiResponse) return;
      const decision = this.parseAIResponse(aiResponse);
      await this.executeTradingDecision(decision, marketData);
      this.saveConversation(userPrompt, aiResponse, decision);
    } catch (e) {
      console.error('交易循环失败:', e.message);
    }
  }

  async run() {
    try {
      if (!this.aiApiKey) {
        console.error('缺少 AI API Key');
        return;
      }
      const ok = await this.initializeExchange();
      if (!ok) return;
      await this.runTradingCycle();
      console.log(`AI交易系统v2运行完成 (env=${this.tradingEnv}, ai=${this.aiProvider}:${this.aiModel})`);
    } catch (e) {
      console.error('系统运行失败:', e.message);
      process.exit(1);
    }
  }
}

async function main() {
  const sys = new AITradingSystemV2();
  await sys.run();
}

main().catch(console.error);
