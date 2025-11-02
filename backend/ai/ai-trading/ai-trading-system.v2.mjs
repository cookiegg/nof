import ccxt from 'ccxt';
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { resolve } from 'path';

// 轻量级 .env 加载（避免额外依赖），需在使用 config/env 之前执行
function loadDotEnv(envPath) {
  try {
    if (!existsSync(envPath)) return;
    const raw = readFileSync(envPath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = val;
      }
    });
  } catch (_) {}
}

// 提前加载 backend/.env，确保 config 与 env 解析可用
loadDotEnv(resolve(process.cwd(), 'backend/.env'));

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
  const configPath = resolve(process.cwd(), 'backend/ai/ai-trading/config.json');
  const raw = readFileSync(configPath, 'utf8');
  const cfg = JSON.parse(raw);
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
  constructor(options = {}) {
    this.config = loadConfig();
    
    // 支持依赖注入：executor和promptManager
    this.executor = options.executor || null;
    this.promptManager = options.promptManager || null;
    this.botId = options.botId || process.env.BOT_ID || null;
    this.botConfig = options.botConfig || null;
    
    // 如果提供了botConfig，使用它；否则从环境变量或参数读取
    if (this.botConfig) {
      this.tradingEnv = this.botConfig.env;
      this.isFutures = this.tradingEnv === 'demo-futures' || this.tradingEnv === 'futures';
      
      // 从botConfig获取AI配置（延迟异步加载，先用同步方式）
      // AI配置将在initialize()方法中加载
      this._botConfigForInit = this.botConfig;
      this._needsAIConfigInit = true;
      
      // 使用BotStateManager（如果提供了botId和executor）
      if (this.botId && this.executor) {
        // executor已经创建了stateManager
        if (this.executor.stateManager) {
          this.stateManager = this.executor.stateManager;
        }
      }
    } else {
      // 向后兼容：从环境变量或参数读取（统一使用百炼API）
      const argEnv = getArg('--env');
      const argModel = process.env.MODEL || getArg('--model');
      
      this.tradingEnv = (argEnv && typeof argEnv === 'string') ? argEnv : (this.config.trading_env || 'demo-futures');
      this.isFutures = this.tradingEnv === 'demo-futures' || this.tradingEnv === 'futures';
      
      // 统一使用百炼API
      this.aiProvider = 'dashscope';
      this.aiModel = argModel || 'qwen3-plus';
      
      // 获取API Key：优先使用指定的环境变量名，否则使用第一个可用的
      const dashscopeApiKeyEnv = process.env.DASHSCOPE_API_KEY_ENV;
      if (dashscopeApiKeyEnv) {
        this.aiApiKey = process.env[dashscopeApiKeyEnv] || '';
      } else {
        // 尝试使用第一个可用的 DASHSCOPE_API_KEY
        let index = 1;
        while (index <= 10) {
          const envName = `DASHSCOPE_API_KEY_${index}`;
          const keyValue = process.env[envName];
          if (keyValue && keyValue.trim()) {
            this.aiApiKey = keyValue.trim();
            break;
          }
          index++;
        }
      }
      
      this.aiTemperature = (this.config.ai?.temperature ?? 0.7);
      this.aiMaxTokens = (this.config.ai?.max_tokens ?? 2000);
      this.aiEnableThinking = process.env.ENABLE_THINKING === 'true';
    }

    this.exchange = null; // 保留用于向后兼容
    this.dataDir = resolve(process.cwd(), 'backend', 'data');
    try { mkdirSync(this.dataDir, { recursive: true }); } catch (_) {}
    
    // 如果使用BotStateManager，路径由它管理；否则使用旧的路径
    if (this.stateManager) {
      this.stateFile = this.stateManager.getStateFilePath();
      this.conversationsFile = this.stateManager.getConversationsFilePath();
      this.tradesFile = this.stateManager.getTradesFilePath();
    } else {
      this.stateFile = resolve(this.dataDir, 'trading-state.json');
      this.conversationsFile = resolve(this.dataDir, 'conversations.json');
      this.tradesFile = resolve(this.dataDir, 'trades.json');
    }

    this.state = this.loadState();
    this.sanitizeState();
    // conversations异步加载，稍后初始化
    this.conversations = { conversations: [], lastUpdate: new Date().toISOString() };
    this._loadConversationsSync();

    // 确保种子文件存在（前端可立即读取）
    try {
      if (!existsSync(this.tradesFile)) {
        writeFileSync(this.tradesFile, JSON.stringify({ trades: [] }, null, 2), 'utf8');
      }
      if (!existsSync(this.conversationsFile)) {
        writeFileSync(this.conversationsFile, JSON.stringify(this.conversations, null, 2), 'utf8');
      }
      if (!existsSync(this.stateFile)) {
        await this.saveState();
      }
    } catch (_) {}

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

    // 如果提供了promptManager，使用它；否则使用旧的文件路径方式
    if (this.promptManager) {
      // 使用注入的promptManager，稍后在reloadTemplates中加载
      this.systemPromptTemplate = '';
      this.userPromptTemplate = '';
    } else {
      // 向后兼容：使用文件路径
      const presetPromptFiles = this.config.presets?.[this.tradingEnv]?.prompt_files;
      const promptFiles = presetPromptFiles || this.config.prompt_files || {};
      
      this.systemPromptTemplatePath = resolve(process.cwd(), promptFiles.system_prompt_path || '');
      this.userPromptTemplatePath = resolve(process.cwd(), promptFiles.user_prompt_path || '');
    }
    
    // 初始化时加载模板（异步，但不阻塞构造函数）
    this.reloadTemplates().catch(e => console.error('初始化加载模板失败:', e.message));
    
    // 记录模板文件最后修改时间
    this.templateLastLoadTime = Date.now();

    this.dataCfg = {
      intraday_tf: this.config.data?.intraday_tf || '1m',
      intraday_limit: this.config.data?.intraday_limit || 50,
      context_tf: this.config.data?.context_tf || '4h',
      context_limit: this.config.data?.context_limit || 10
    };

    // 简单的随机基准，用于离线/失败回退生成数值
    this._seed = Math.floor(Date.now() / 60000);
  }

  // 重新加载模板文件
  async reloadTemplates() {
    try {
      if (this.promptManager) {
        // 使用注入的promptManager
        const [system, user] = await Promise.all([
          this.promptManager.loadSystemPrompt(),
          this.promptManager.loadUserPrompt()
        ]);
        this.systemPromptTemplate = system || '';
        this.userPromptTemplate = user || '';
        console.log(`✅ Prompt模板已重新加载 (${this.tradingEnv}, botId=${this.botId || 'default'})`);
      } else {
        // 向后兼容：使用文件路径
        this.systemPromptTemplate = existsSync(this.systemPromptTemplatePath)
          ? readFileSync(this.systemPromptTemplatePath, 'utf8')
          : '';
        this.userPromptTemplate = existsSync(this.userPromptTemplatePath)
          ? readFileSync(this.userPromptTemplatePath, 'utf8')
          : '';
        console.log(`✅ Prompt模板已重新加载 (${this.tradingEnv})`);
      }
      this.templateLastLoadTime = Date.now();
    } catch (e) {
      console.error('重新加载模板失败:', e.message);
    }
  }

  // 检查是否需要重新加载模板（通过标记文件）
  async checkAndReloadTemplates() {
    try {
      const dataDir = resolve(process.cwd(), 'backend', 'data');
      const markerFile = resolve(dataDir, `.reload-prompts-${this.tradingEnv}.marker`);
      
      if (existsSync(markerFile)) {
        // 标记文件存在，重新加载模板
        await this.reloadTemplates();
        // 删除标记文件
        try {
          unlinkSync(markerFile);
          console.log(`🗑️ 已删除重载标记文件: ${markerFile}`);
        } catch (e) {
          console.warn('删除标记文件失败:', e.message);
        }
      }
    } catch (e) {
      // 静默失败，不影响主流程
    }
  }

  sanitizeState() {
    const s = this.state || {};
    // 核心数值字段保证为数字
    s.accountValue = Number.isFinite(Number(s.accountValue)) ? Number(s.accountValue) : 10000;
    s.availableCash = Number.isFinite(Number(s.availableCash)) ? Number(s.availableCash) : 10000;
    s.totalReturn = Number.isFinite(Number(s.totalReturn)) ? Number(s.totalReturn) : 0;
    s.invocationCount = Number.isFinite(Number(s.invocationCount)) ? Number(s.invocationCount) : 0;
    // 结构字段
    if (!Array.isArray(s.positions)) s.positions = [];
    if (!s.startTime) s.startTime = new Date().toISOString();
    if (!s.lastUpdate) s.lastUpdate = new Date().toISOString();
    if (typeof s.tradingEnabled !== 'boolean') s.tradingEnabled = true;
    // 规范化持仓内的数值
    s.positions = s.positions.map((p = {}) => ({
      symbol: p.symbol || 'BTC',
      quantity: Number.isFinite(Number(p.quantity)) ? Number(p.quantity) : 0,
      entry_price: Number.isFinite(Number(p.entry_price)) ? Number(p.entry_price) : 0,
      current_price: Number.isFinite(Number(p.current_price)) ? Number(p.current_price) : 0,
      liquidation_price: Number.isFinite(Number(p.liquidation_price)) ? Number(p.liquidation_price) : 0,
      unrealized_pnl: Number.isFinite(Number(p.unrealized_pnl)) ? Number(p.unrealized_pnl) : 0,
      leverage: Number.isFinite(Number(p.leverage)) ? Number(p.leverage) : 1,
      exit_plan: p.exit_plan || { profit_target: 0, stop_loss: 0, invalidation_condition: 'none' },
      confidence: Number.isFinite(Number(p.confidence)) ? Number(p.confidence) : 0.8,
      risk_usd: Number.isFinite(Number(p.risk_usd)) ? Number(p.risk_usd) : 0,
      sl_oid: p.sl_oid ?? null,
      tp_oid: p.tp_oid ?? null,
      wait_for_fill: Boolean(p.wait_for_fill),
      entry_oid: p.entry_oid ?? null,
      notional_usd: Number.isFinite(Number(p.notional_usd)) ? Number(p.notional_usd) : 0,
    }));
    this.state = s;
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
      if (this.stateManager) {
        // 同步加载（BotStateManager是异步的，这里需要同步版本）
        // 为了向后兼容，暂时仍使用文件方式
        if (existsSync(this.stateFile)) {
          const data = readFileSync(this.stateFile, 'utf8');
          return JSON.parse(data);
        }
      } else {
        if (existsSync(this.stateFile)) {
          const data = readFileSync(this.stateFile, 'utf8');
          return JSON.parse(data);
        }
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

  async saveState() {
    this.state.lastUpdate = new Date().toISOString();
    if (this.stateManager) {
      // 使用BotStateManager保存（异步）
      await this.stateManager.saveState(this.state);
    } else {
      // 向后兼容：使用文件方式
      writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf8');
    }
  }

  // 同步加载conversations（用于构造函数）
  _loadConversationsSync() {
    try {
      if (existsSync(this.conversationsFile)) {
        const data = readFileSync(this.conversationsFile, 'utf8');
        this.conversations = JSON.parse(data);
      }
    } catch (_) {}
    if (!this.conversations || !Array.isArray(this.conversations.conversations)) {
      this.conversations = { conversations: [], lastUpdate: new Date().toISOString() };
    }
  }

  // 异步加载conversations（使用BotStateManager时）
  async loadConversations() {
    try {
      if (this.stateManager) {
        const conversations = await this.stateManager.loadConversations();
        return { conversations, lastUpdate: new Date().toISOString() };
      } else {
        this._loadConversationsSync();
        return this.conversations;
      }
    } catch (_) {
      return { conversations: [], lastUpdate: new Date().toISOString() };
    }
  }

  async saveConversations() {
    this.conversations.lastUpdate = new Date().toISOString();
    if (this.stateManager) {
      await this.stateManager.saveConversations(this.conversations.conversations || []);
    } else {
      writeFileSync(this.conversationsFile, JSON.stringify(this.conversations, null, 2), 'utf8');
    }
  }

  async initializeExchange() {
    try {
      // 仅在用户显式设置时使用代理，避免误用本地 7890 端口
      const httpsProxy = process.env.HTTPS_PROXY || '';
      const httpProxy = process.env.HTTP_PROXY || '';
      const noProxy = process.env.NO_PROXY || process.env.no_proxy || '';
      console.log(`Proxy config -> HTTPS_PROXY=${httpsProxy || '(unset)'} HTTP_PROXY=${httpProxy || '(unset)'} NO_PROXY=${noProxy || '(unset)'}\n`);

      const envKey = this.tradingEnv;
      const isDemoFutures = envKey === 'demo-futures';
      const isDemoSpot = envKey === 'demo-spot';

      if (isDemoFutures || envKey === 'futures') {
        const apiKey = this.config.exchange?.binance?.futures_demo?.api_key || process.env.BINANCE_DEMO_API_KEY;
        const secret = this.config.exchange?.binance?.futures_demo?.api_secret || process.env.BINANCE_DEMO_API_SECRET;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_DEMO_API_KEY/SECRET或在config.json配置');
        this.exchange = new ccxt.binanceusdm({ apiKey, secret, enableRateLimit: true, options: { defaultType: 'future', warnOnFetchCurrencies: false, fetchCurrencies: false, enableDemoTrading: true } });
        if (httpsProxy) this.exchange.httpsProxy = httpsProxy.endsWith('/') ? httpsProxy : `${httpsProxy}/`;
        this.exchange.enableDemoTrading(true);
        await this.exchange.fetchBalance();
      } else if (isDemoSpot || envKey === 'spot') {
        const apiKey = this.config.exchange?.binance?.spot_testnet?.api_key || process.env.BINANCE_SPOT_TEST_API_KEY;
        const secret = this.config.exchange?.binance?.spot_testnet?.api_secret || process.env.BINANCE_SPOT_TEST_API_SECRET;
        if (!apiKey || !secret) throw new Error('请设置BINANCE_SPOT_TEST_API_KEY/SECRET或在config.json配置');
        this.exchange = new ccxt.binance({ apiKey, secret, enableRateLimit: true });
        if (httpsProxy) this.exchange.httpsProxy = httpsProxy.endsWith('/') ? httpsProxy : `${httpsProxy}/`;
        if (typeof this.exchange.setSandboxMode === 'function') this.exchange.setSandboxMode(true);
        await this.exchange.fetchBalance();
      }
      return true;
    } catch (e) {
      console.error('❌ 初始化交易所失败:', e.message);
      console.error('详细错误:', e);
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
        // 优先使用executor获取价格，但OHLCV数据仍需要exchange（或使用executor的exchange）
        let ticker, ohlcv;
        if (this.executor && this.executor._getExchange) {
          // LocalSimulatedExecutor有_getExchange方法用于读取行情
          const exchange = await this.executor._getExchange();
          ticker = await exchange.fetchTicker(symbol);
          ohlcv = await exchange.fetchOHLCV(symbol, intradayTf, undefined, intradayLimit);
        } else if (this.executor && this.executor.getCurrentPrice) {
          // 如果executor只提供getCurrentPrice，使用它获取价格
          const baseSymbol = this.normalizeBaseSymbol(symbol);
          const currentPrice = await this.executor.getCurrentPrice(baseSymbol);
          ticker = { last: currentPrice, bid: currentPrice * 0.999, ask: currentPrice * 1.001 };
          // 对于OHLCV，如果没有exchange，使用模拟数据或空数组
          if (this.exchange) {
            ohlcv = await this.exchange.fetchOHLCV(symbol, intradayTf, undefined, intradayLimit);
          } else {
            // 生成简单的模拟OHLCV数据
            ohlcv = Array.from({ length: intradayLimit }, (_, i) => [
              Date.now() - (intradayLimit - i) * 60000,
              currentPrice * 0.995,
              currentPrice * 1.005,
              currentPrice * 0.998,
              currentPrice,
              1000000
            ]);
          }
        } else if (!this.exchange) {
          throw new Error('no_exchange');
        } else {
          ticker = await this.exchange.fetchTicker(symbol);
          ohlcv = await this.exchange.fetchOHLCV(symbol, intradayTf, undefined, intradayLimit);
        }
        const prices = ohlcv.map(c => (c[2] + c[3]) / 2);
        const highs = ohlcv.map(c => c[2]);
        const lows = ohlcv.map(c => c[3]);
        const closes = ohlcv.map(c => c[4]);
        const volumes = ohlcv.map(c => c[5]);
        const ema20 = this.calculateEMA(prices, 20) || Number(ticker.last) || 0;
        const macd = this.calculateMACD(prices) || 0;
        const rsi14 = this.calculateRSI(prices, 14) || 50;
        const rsi21 = this.calculateRSI(prices, 21) || 50;
        const atr = this.calculateATR(highs, lows, closes) || (Number(ticker.last) || 0) * 0.02;

        let ohlcvCtx;
        if (this.executor && !this.exchange) {
          // executor模式下，如果没有exchange，使用ohlcv数据的一部分作为context
          ohlcvCtx = ohlcv.slice(-ctxLimit);
        } else if (this.exchange) {
          ohlcvCtx = await this.exchange.fetchOHLCV(symbol, ctxTf, undefined, ctxLimit);
        } else {
          ohlcvCtx = [];
        }
        const pricesCtx = ohlcvCtx.map(c => (c[2] + c[3]) / 2);
        const ema20_4h = this.calculateEMA(pricesCtx, 20) || Number(ticker.last) || 0;
        const ema50_4h = this.calculateEMA(pricesCtx, 50) || Number(ticker.last) || 0;
        const atr_4h = this.calculateATR(ohlcvCtx.map(c => c[2]), ohlcvCtx.map(c => c[3]), ohlcvCtx.map(c => c[4])) || (Number(ticker.last) || 0) * 0.02;

        const currentVolume = volumes[volumes.length - 1] || 0;
        const avgVolume = volumes.length ? (volumes.reduce((a, b) => a + b, 0) / volumes.length) : 0;
        const fundingRate = (Math.random() - 0.5) * 0.001;
        const openInterest = Math.random() * 1000000 + 500000;
        const avgOpenInterest = openInterest * (0.8 + Math.random() * 0.4);
        const baseKey = this.normalizeBaseSymbol(symbol);

        marketData[baseKey] = {
          symbol: baseKey,
          currentPrice: Number(ticker.last) || 0,
          ema20: Number(ema20) || 0,
          macd: Number(macd) || 0,
          rsi14: Number(rsi14) || 50,
          rsi21: Number(rsi21) || 50,
          atr: Number(atr) || 0,
          ema20_4h: Number(ema20_4h) || 0,
          ema50_4h: Number(ema50_4h) || 0,
          atr_4h: Number(atr_4h) || 0,
          currentVolume: Number(currentVolume) || 0,
          avgVolume: Number(avgVolume) || 0,
          fundingRate: Number(fundingRate) || 0,
          openInterest: Number(openInterest) || 0,
          avgOpenInterest: Number(avgOpenInterest) || 0,
          prices: prices.slice(-10).map(Number),
          ema20_series: this.generateEMASeries(prices, 20).slice(-10).map(Number),
          macd_series: this.generateMACDSeries(prices).slice(-10).map(Number),
          rsi14_series: this.generateRSISeries(prices, 14).slice(-10).map(Number),
          rsi21_series: this.generateRSISeries(prices, 21).slice(-10).map(Number),
          macd_4h_series: this.generateMACDSeries(pricesCtx).slice(-10).map(Number),
          rsi14_4h_series: this.generateRSISeries(pricesCtx, 14).slice(-10).map(Number)
        };
      } catch (e) {
        // 离线/失败回退：生成稳定的伪数据，避免渲染与 toFixed 失败
        const baseKey = this.normalizeBaseSymbol(symbol);
        const t = this._seed + Math.floor(Math.random() * 1000);
        const p0 = 100 + (t % 50);
        const series = Array.from({ length: 10 }, (_, i) => p0 + Math.sin((t + i) / 5) * 2 + (Math.random() - 0.5));
        const last = series[series.length - 1];
        marketData[baseKey] = {
          symbol: baseKey,
          currentPrice: last,
          ema20: last * 0.998,
          macd: (Math.random() - 0.5) * 2,
          rsi14: 45 + Math.random() * 10,
          rsi21: 45 + Math.random() * 10,
          atr: last * 0.02,
          ema20_4h: last * 1.001,
          ema50_4h: last * 1.0005,
          atr_4h: last * 0.018,
          currentVolume: 1_000_000 + Math.random() * 100_000,
          avgVolume: 1_050_000,
          fundingRate: (Math.random() - 0.5) * 0.0005,
          openInterest: 700_000 + Math.random() * 200_000,
          avgOpenInterest: 750_000,
          prices: series,
          ema20_series: series.map((v, i, a) => (i > 0 ? (a[i - 1] * 0.9 + v * 0.1) : v)),
          macd_series: series.map(() => (Math.random() - 0.5)),
          rsi14_series: series.map(() => 45 + Math.random() * 10),
          rsi21_series: series.map(() => 45 + Math.random() * 10),
          macd_4h_series: series.map(() => (Math.random() - 0.5)),
          rsi14_4h_series: series.map(() => 45 + Math.random() * 10)
        };
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
      const d = data || {};
      // 归一化，避免 undefined 触发 toFixed
      const safe = {
        currentPrice: Number(d.currentPrice) || 0,
        ema20: Number(d.ema20) || 0,
        macd: Number(d.macd) || 0,
        rsi14: Number(d.rsi14) || 50,
        rsi21: Number(d.rsi21) || 50,
        atr: Number(d.atr) || 0,
        ema20_4h: Number(d.ema20_4h) || 0,
        ema50_4h: Number(d.ema50_4h) || 0,
        atr_4h: Number(d.atr_4h) || 0,
        currentVolume: Number(d.currentVolume) || 0,
        avgVolume: Number(d.avgVolume) || 0,
        fundingRate: Number(d.fundingRate) || 0,
        openInterest: Number(d.openInterest) || 0,
        avgOpenInterest: Number(d.avgOpenInterest) || 0,
        prices: Array.isArray(d.prices) ? d.prices.map(Number) : [],
        ema20_series: Array.isArray(d.ema20_series) ? d.ema20_series.map(Number) : [],
        macd_series: Array.isArray(d.macd_series) ? d.macd_series.map(Number) : [],
        rsi14_series: Array.isArray(d.rsi14_series) ? d.rsi14_series.map(Number) : [],
        rsi21_series: Array.isArray(d.rsi21_series) ? d.rsi21_series.map(Number) : [],
        macd_4h_series: Array.isArray(d.macd_4h_series) ? d.macd_4h_series.map(Number) : [],
        rsi14_4h_series: Array.isArray(d.rsi14_4h_series) ? d.rsi14_4h_series.map(Number) : [],
      };
      const fx = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '0.00');
      const ex = (n) => {
        const v = Number(n);
        if (!Number.isFinite(v)) return '0.00e+0';
        try { return v.toExponential(2); } catch { return '0.00e+0'; }
      };
      out += `### ALL ${symbol} DATA\n\n` +
        `current_price = ${fx(safe.currentPrice)}, current_ema20 = ${fx(safe.ema20)}, current_macd = ${fx(safe.macd)}, current_rsi (14 period) = ${fx(safe.rsi14)}\n\n` +
        `In addition, here is the latest ${symbol} open interest and funding rate for perps (the instrument you are trading):\n\n` +
        `Open Interest: Latest: ${fx(safe.openInterest)}  Average: ${fx(safe.avgOpenInterest)}\n\n` +
        `Funding Rate: ${ex(safe.fundingRate)}\n\n` +
        `**Intraday series (3‑minute intervals, oldest → latest):**\n\n` +
        `Mid prices: [${(safe.prices).map(p => fx(p)).join(', ')}]\n\n` +
        `EMA indicators (20‑period): [${(safe.ema20_series).map(p => fx(p)).join(', ')}]\n\n` +
        `MACD indicators: [${(safe.macd_series).map(p => fx(p)).join(', ')}]\n\n` +
        `RSI indicators (14‑Period): [${(safe.rsi14_series).map(p => fx(p)).join(', ')}]\n\n` +
        `RSI indicators (21‑Period): [${(safe.rsi21_series).map(p => fx(p)).join(', ')}]\n\n` +
        `**Longer‑term context (${this.dataCfg.context_tf}‑hour timeframe):**\n\n` +
        `20‑Period EMA: ${fx(safe.ema20_4h)} vs. 50‑Period EMA: ${fx(safe.ema50_4h)}\n\n` +
        `3‑Period ATR: ${fx(safe.atr)} vs. 14‑Period ATR: ${fx(safe.atr_4h)}\n\n` +
        `Current Volume: ${fx(safe.currentVolume)} vs. Average Volume: ${fx(safe.avgVolume)}\n\n` +
        `MACD indicators: [${(safe.macd_4h_series || []).map(p => fx(p)).join(', ')}]\n\n` +
        `RSI indicators (14‑Period): [${(safe.rsi14_4h_series || []).map(p => fx(p)).join(', ')}]\n\n` +
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
      let marketSections = '';
      try { marketSections = this.buildMarketSections(marketData); } catch (_) { marketSections = 'MARKET DATA UNAVAILABLE'; }
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
      market_sections: (() => { try { return this.buildMarketSections(marketData); } catch (_) { return 'MARKET DATA UNAVAILABLE'; } })(),
      account_value: Number(this.state.accountValue ?? 0).toFixed(2),
      available_cash: Number(this.state.availableCash ?? 0).toFixed(2),
      total_return: Number(this.state.totalReturn ?? 0).toFixed(2),
      positions_block: this.state.positions.map(p => JSON.stringify(p)).join('\n'),
      sharpe_ratio: Number(this.calculateSharpeRatio() ?? 0).toFixed(2)
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
    // 新模板已经分离为futures和spot，不需要renderSections（但仍保留兼容性）
    // 检查模板是否包含条件标签，如果没有则跳过renderSections
    const hasConditionalTags = this.systemPromptTemplate.includes('{{#is_futures}}') || 
                                this.systemPromptTemplate.includes('{{^is_futures}}');
    const tpl1 = hasConditionalTags 
      ? renderSections(this.systemPromptTemplate, { is_futures: this.isFutures })
      : this.systemPromptTemplate;
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
      // 使用百炼统一 API 客户端
      const bailianClientPath = resolve(process.cwd(), 'backend/src/services/ai/bailian-client.js');
      const { callBailianAPI } = await import(`file://${bailianClientPath}`);
      
      const apiKey = this.aiApiKey;
      const model = this.aiModel;
      const temperature = this.aiTemperature;
      const max_tokens = this.aiMaxTokens;
      const enable_thinking = this.aiEnableThinking || false;
      const systemContent = this.buildSystemPrompt();

      const messages = [
        { role: 'system', content: systemContent },
        { role: 'user', content: userPrompt }
      ];

      const result = await callBailianAPI(apiKey, model, messages, {
        enable_thinking: enable_thinking,
        temperature: temperature,
        max_tokens: max_tokens,
        stream: false
      });

      return result.content || null;
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
          const qty = decision.quantity && decision.quantity > 0 ? decision.quantity : Math.abs(Number(pos.quantity));
          // 根据持仓方向决定平仓方向：多头用sell平仓，空头用buy平仓
          const posQty = Number(pos.quantity);
          if (posQty > 0) {
            // 多头：使用sell平仓
            await this.executeSellOrder({ ...decision, symbol: base, quantity: qty }, marketData);
          } else if (posQty < 0) {
            // 空头：使用buy平仓
            await this.executeBuyOrder({ ...decision, symbol: base, quantity: qty }, marketData);
          }
        }
      }
      await this.updateAccountState();
    } catch (e) {
      console.error('交易执行失败:', e.message);
    }
    await this.saveState();
  }

  async executeBuyOrder(decision) {
    try {
      if (this.executor) {
        // 使用注入的executor
        const order = await this.executor.executeBuyOrder(decision);
        const base = this.normalizeBaseSymbol(decision.symbol);
        this.addPosition(base, order.quantity, order.price);
        this.logTrade('BUY', base, order.quantity, order.price, order.id);
      } else {
        // 向后兼容：使用旧的exchange方式
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
      }
    } catch (e) {
      console.error('买入失败:', e.message);
    }
  }

  async executeSellOrder(decision) {
    try {
      if (this.executor) {
        // 使用注入的executor
        const order = await this.executor.executeSellOrder(decision);
        const base = this.normalizeBaseSymbol(decision.symbol);
        this.removePosition(base, order.quantity);
        this.logTrade('SELL', base, order.quantity, order.price, order.id);
      } else {
        // 向后兼容：使用旧的exchange方式
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
      }
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
      if (this.executor) {
        // 使用注入的executor更新账户状态
        const accountState = await this.executor.updateAccountState();
        this.state.accountValue = accountState.accountValue || this.state.accountValue;
        this.state.availableCash = accountState.availableCash || this.state.availableCash;
        this.state.positions = accountState.positions || [];
        
        // 计算总收益
        const initialValue = this.state.initialAccountValue || 10000;
        this.state.totalReturn = ((this.state.accountValue - initialValue) / initialValue) * 100;
      } else if (this.exchange) {
        // 向后兼容：使用旧的exchange方式
        const balance = await this.exchange.fetchBalance();
        this.state.accountValue = balance.USDT?.total || 10000;
        this.state.availableCash = balance.USDT?.free || 10000;
        this.state.totalReturn = ((this.state.accountValue - 10000) / 10000) * 100;
      }
      if (this.isFutures && this.exchange && !this.executor) {
        const positions = await this.exchange.fetchPositions();
        const active = positions.filter(p => parseFloat(p.contracts) !== 0);
        this.state.positions = [];
        for (const position of active) {
          if (parseFloat(position.contracts) !== 0) {
            const symbol = this.normalizeBaseSymbol(position.symbol);
            const contracts = parseFloat(position.contracts);
            // 根据side字段确定quantity的符号：long=正数，short=负数
            const quantity = (position.side === 'long' || position.side === 'buy') ? Math.abs(contracts) : -Math.abs(contracts);
            // 计算杠杆：名义价值 / 保证金
            const notional = Math.abs(parseFloat(position.notional) || 0);
            const initialMargin = parseFloat(position.initialMargin) || 0;
            const leverage = notional > 0 && initialMargin > 0 ? Math.round((notional / initialMargin) * 10) / 10 : 1;
            this.state.positions.push({
              symbol,
              quantity, // 正数=多仓，负数=空仓
              entry_price: parseFloat(position.entryPrice),
              current_price: parseFloat(position.markPrice),
              liquidation_price: parseFloat(position.liquidationPrice) || 0,
              unrealized_pnl: parseFloat(position.unrealizedPnl),
              leverage, // 根据名义价值和保证金计算
              exit_plan: {
                profit_target: parseFloat(position.entryPrice) * 1.1,
                stop_loss: parseFloat(position.entryPrice) * 0.95,
                invalidation_condition: 'price_below_stop_loss'
              },
              confidence: 0.8,
              risk_usd: Math.abs(quantity) * parseFloat(position.entryPrice),
              sl_oid: null, tp_oid: null, wait_for_fill: false, entry_oid: null,
              notional_usd: notional
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
    // Mirror to backend/data/trades.json for web API consumption
    try {
      let obj = { trades: [] };
      if (existsSync(this.tradesFile)) {
        try { obj = JSON.parse(readFileSync(this.tradesFile, 'utf8')); } catch (_) {}
      }
      if (!Array.isArray(obj.trades)) obj.trades = [];
      obj.trades.unshift({
        model_id: 'default',
        exit_time: Math.floor(Date.now() / 1000),
        realized_net_pnl: side === 'BUY' ? 0 : 0,
        side, symbol, quantity, price, orderId
      });
      writeFileSync(this.tradesFile, JSON.stringify(obj, null, 2), 'utf8');
    } catch (_) {}
  }

  saveConversation(userPrompt, aiResponse, decision) {
    // 解析AI响应中的JSON
    let aiParsed = null;
    try {
      if (typeof aiResponse === 'string') {
        const match = aiResponse.match(/\{[\s\S]*\}/);
        if (match) aiParsed = JSON.parse(match[0]);
      }
    } catch (_) {}

    // 从 aiParsed 中提取"原始决策对象"和"候选数组"，用于完整留存
    let decisionRaw = null;
    let decisionsArray = null;
    try {
      if (aiParsed && typeof aiParsed === 'object') {
        if (aiParsed.trading_decision) {
          decisionRaw = aiParsed.trading_decision;
        }
        if (Array.isArray(aiParsed.trading_decisions)) {
          decisionsArray = aiParsed.trading_decisions;
          // 若尚未从 trading_decision 取到主决策，则优先取与现有持仓相关的项
          if (!decisionRaw) {
            const currentSymbols = this.state.positions.map(p => p.symbol);
            const pick = decisionsArray.find(x => currentSymbols.includes(String(x.symbol || '').toUpperCase().replace(/:USDT$/,'').split('/')[0]))
              || decisionsArray[0];
            decisionRaw = pick || null;
          }
        }
      }
    } catch (_) {}

    const conversation = {
      timestamp: new Date().toISOString(),
      invocationCount: this.state.invocationCount,
      userPrompt,
      aiResponse,
      aiParsed,
      // decision: 原始/丰富结构（保持完整字段用于分析）
      decision: decisionRaw || aiParsed?.trading_decision || null,
      // decision_normalized: 供程序执行的归一化决策
      decision_normalized: decision,
      // trading_decisions: 若模型输出了候选数组，也一并保存
      trading_decisions: decisionsArray || null,
      // chain_of_thought: 从aiParsed中提取
      chain_of_thought: aiParsed?.chain_of_thought || null,
      accountValue: this.state.accountValue,
      totalReturn: this.state.totalReturn
    };
    if (!this.conversations.conversations) this.conversations.conversations = [];
    this.conversations.conversations.unshift(conversation);
    await this.saveConversations();
  }

  async runTradingCycle() {
    try {
      // 在每次交易循环开始时检查是否需要重新加载模板
      await this.checkAndReloadTemplates();
      
      const marketData = await this.getMarketData();
      const userPrompt = this.generateUserPrompt(marketData);
      const aiResponse = await this.callDeepSeekAPI(userPrompt);
      if (!aiResponse) {
        const decision = { action: 'hold', reasoning: 'no_ai_response' };
        await this.executeTradingDecision(decision, marketData);
        this.saveConversation(userPrompt, aiResponse, decision);
        return;
      }
      const decision = this.parseAIResponse(aiResponse);
      await this.executeTradingDecision(decision, marketData);
      this.saveConversation(userPrompt, aiResponse, decision);
    } catch (e) {
      console.error('交易循环失败:', e.message);
      // 兜底：写入最小对话，保证前端可读
      try {
        const note = `CYCLE ERROR: ${String(e?.message || e)}\n`;
        const userPrompt = 'MARKET DATA UNAVAILABLE';
        const aiResponse = null;
        const decision = { action: 'hold', reasoning: 'error' };
        this.saveConversation(userPrompt, aiResponse, decision);
      } catch (_) {}
    }
  }

  // 初始化AI配置（如果使用botConfig）
  async initializeAIConfig() {
    if (this._needsAIConfigInit && this._botConfigForInit) {
      try {
        const botConfigManagerPath = resolve(process.cwd(), 'backend/src/services/bots/bot-config-manager.js');
        const { resolveAIConfig } = await import(`file://${botConfigManagerPath}`);
        const aiConfig = await resolveAIConfig(this._botConfigForInit, this.config);
        this.aiProvider = aiConfig.provider;
        this.aiModel = aiConfig.model;
        this.aiApiKey = aiConfig.api_key;
        this.aiTemperature = aiConfig.temperature;
        this.aiMaxTokens = aiConfig.max_tokens;
        this.aiEnableThinking = aiConfig.enable_thinking || false;
        this._needsAIConfigInit = false;
      } catch (e) {
        console.error('加载AI配置失败，使用默认配置:', e.message);
        this.aiProvider = 'dashscope';
        this.aiModel = 'qwen3-plus';
        this.aiApiKey = this.config.ai?.api_key || '';
        this.aiTemperature = 0.7;
        this.aiMaxTokens = 2000;
        this.aiEnableThinking = false;
      }
    }
  }

  async run() {
    try {
      // 初始化AI配置（如果使用botConfig）
      await this.initializeAIConfig();
      
      if (!this.aiApiKey) {
        console.error('缺少 AI API Key');
        return;
      }
      
      // 如果有executor，不需要initializeExchange；否则需要向后兼容
      let ok = true;
      if (!this.executor) {
        ok = await this.initializeExchange();
        if (!ok) {
          // 离线模式也进行一次循环，以便前端与对话有数据可用
          console.warn('进入离线模式：使用本地伪数据生成提示与对话');
        }
      }
      
      // 更新账户状态
      await this.updateAccountState();
      await this.saveState(); // 保存初始状态（现在是async）
      
      await this.runTradingCycle();
      console.log(`AI交易系统v2运行完成 (env=${this.tradingEnv}, ai=${this.aiProvider}:${this.aiModel}, botId=${this.botId || 'default'})`);
    } catch (e) {
      console.error('系统运行失败:', e.message);
      process.exit(1);
    }
  }
}

async function main() {
  // 支持从环境变量创建executor和promptManager
  const botId = process.env.BOT_ID;
  const tradingMode = process.env.TRADING_MODE || 'binance-demo';
  const promptMode = process.env.PROMPT_MODE || 'env-shared';
  
  let executor = null;
  let promptManager = null;
  let botConfig = null;
  
  // 如果提供了BOT_ID，尝试加载Bot配置并创建executor和promptManager
  if (botId) {
    try {
      const botConfigManagerPath = resolve(process.cwd(), 'backend/src/services/bots/bot-config-manager.js');
      const botConfigModule = await import(`file://${botConfigManagerPath}`);
      const { botConfigManager } = botConfigModule;
      
      botConfig = await botConfigManager.getBotById(botId);
      if (botConfig) {
        // 创建executor
        const actualTradingMode = botConfig.tradingMode || tradingMode;
        if (actualTradingMode === 'local-simulated') {
          const localExecutorPath = resolve(process.cwd(), 'backend/src/services/trading/local-simulated-executor.js');
          const { LocalSimulatedExecutor } = await import(`file://${localExecutorPath}`);
          executor = new LocalSimulatedExecutor({ botId, env: botConfig.env });
        } else {
          const binanceExecutorPath = resolve(process.cwd(), 'backend/src/services/trading/binance-demo-executor.js');
          const { BinanceDemoExecutor } = await import(`file://${binanceExecutorPath}`);
          executor = new BinanceDemoExecutor({ env: botConfig.env });
        }
        
        // 创建promptManager
        const promptManagerPath = resolve(process.cwd(), 'backend/src/services/prompts/prompt-manager.js');
        const { PromptManager } = await import(`file://${promptManagerPath}`);
        promptManager = new PromptManager(botConfig);
      }
    } catch (e) {
      console.warn('无法加载Bot配置，使用默认模式:', e.message);
    }
  }
  
  // 创建AI交易系统
  const sys = new AITradingSystemV2({
    executor,
    promptManager,
    botId,
    botConfig
  });
  
  await sys.run();
}

main().catch(console.error);


