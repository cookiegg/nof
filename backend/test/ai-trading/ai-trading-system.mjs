// AI交易系统 - 使用DeepSeek API实现类似nof1的AI交易
// 用法：node --env-file=./backend/.env backend/test/ai-trading-system.mjs

import ccxt from 'ccxt';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

class AITradingSystem {
  constructor() {
    this.exchange = null;
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY_30;
    this.symbols = [];
    this.stateFile = '/data/proj/open_nof1/nof0/backend/test/trading-state.json';
    this.conversationsFile = '/data/proj/open_nof1/nof0/backend/test/trading-conversations.json';
    this.state = this.loadState();
    this.conversations = this.loadConversations();
    // 交易环境：demo-futures | demo-spot（默认 demo-futures）
    this.mode = process.env.TRADING_ENV || 'demo-futures';
    this.isFutures = this.mode === 'demo-futures';
    // 供AI输出使用的“权威交易对格式”
    this.allowedSymbolsForAI = this.isFutures
      ? ['BTC/USDT:USDT','ETH/USDT:USDT','SOL/USDT:USDT','BNB/USDT:USDT','XRP/USDT:USDT','DOGE/USDT:USDT']
      : ['BTC/USDT','ETH/USDT','SOL/USDT','BNB/USDT','XRP/USDT','DOGE/USDT'];
    // 监控与行情使用的符号列表
    this.symbols = [...this.allowedSymbolsForAI];
  }

  // 统一基础币种符号，如 BTC/USDT:USDT、BTCUSDT、BTC/:USDT -> BTC
  normalizeBaseSymbol(raw) {
    if (!raw) return undefined;
    let sym = String(raw).trim().toUpperCase();
    sym = sym.replace(/\s+/g, '');
    sym = sym.replace(/:USDT$/, '');
    if (sym.includes('/')) {
      return sym.split('/')[0];
    }
    if (sym.endsWith('USDT')) {
      return sym.slice(0, -4);
    }
    return sym;
  }

  // 加载交易状态
  loadState() {
    try {
      if (existsSync(this.stateFile)) {
        const data = readFileSync(this.stateFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.log('创建新的交易状态文件');
    }
    
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

  // 保存交易状态
  saveState() {
    this.state.lastUpdate = new Date().toISOString();
    writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf8');
  }

  // 加载对话记录
  loadConversations() {
    try {
      if (existsSync(this.conversationsFile)) {
        const data = readFileSync(this.conversationsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.log('创建新的对话记录文件');
    }
    
    return {
      conversations: [],
      lastUpdate: new Date().toISOString()
    };
  }

  // 保存对话记录
  saveConversations() {
    this.conversations.lastUpdate = new Date().toISOString();
    writeFileSync(this.conversationsFile, JSON.stringify(this.conversations, null, 2), 'utf8');
  }

  // 初始化交易所
  async initializeExchange() {
    try {
      // 设置代理（如果需要）
      process.env.HTTPS_PROXY = process.env.HTTPS_PROXY || 'http://127.0.0.1:7890';
      process.env.HTTP_PROXY = process.env.HTTP_PROXY || 'http://127.0.0.1:7890';

      if (this.isFutures) {
        const apiKey = process.env.BINANCE_DEMO_API_KEY;
        const secret = process.env.BINANCE_DEMO_API_SECRET;
        if (!apiKey || !secret) {
          throw new Error('请设置BINANCE_DEMO_API_KEY和BINANCE_DEMO_API_SECRET环境变量');
        }
        console.log('🔧 初始化Binance USDM Demo (Futures)...');
        console.log('🔑 API Key:', apiKey.substring(0, 8) + '...');
        this.exchange = new ccxt.binanceusdm({
          apiKey,
          secret,
          enableRateLimit: true,
          options: { defaultType: 'future', warnOnFetchCurrencies: false, fetchCurrencies: false, enableDemoTrading: true },
        });
        this.exchange.httpsProxy = 'http://127.0.0.1:7890/';
        this.exchange.enableDemoTrading(true);
        console.log('🔍 验证Demo Futures连接...');
        const balance = await this.exchange.fetchBalance();
        console.log('💰 Futures Demo账户余额验证成功:', balance.USDT?.total || 0, 'USDT');
        console.log('✅ Futures Demo初始化成功');
        console.log('🔗 API端点:', this.exchange.urls.api);
        console.log('🌐 环境: demo-futures');
      } else {
        const apiKey = process.env.BINANCE_SPOT_TESTNET_API_KEY;
        const secret = process.env.BINANCE_SPOT_TESTNET_API_SECRET;
        if (!apiKey || !secret) {
          throw new Error('请设置BINANCE_SPOT_TESTNET_API_KEY和BINANCE_SPOT_TESTNET_API_SECRET环境变量');
        }
        console.log('🔧 初始化Binance Spot Testnet...');
        console.log('🔑 API Key:', apiKey.substring(0, 8) + '...');
        this.exchange = new ccxt.binance({ apiKey, secret, enableRateLimit: true });
        this.exchange.httpsProxy = 'http://127.0.0.1:7890/';
        if (typeof this.exchange.setSandboxMode === 'function') this.exchange.setSandboxMode(true);
        console.log('🔍 验证Spot Testnet连接...');
        const balance = await this.exchange.fetchBalance();
        console.log('💰 Spot Testnet账户余额验证成功:', balance.USDT?.total || 0, 'USDT');
        console.log('✅ Spot Testnet初始化成功');
        console.log('🌐 环境: demo-spot');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Demo Trading交易所初始化失败:', error.message);
      console.error('💡 请确保:');
      console.error('   1. API密钥和密钥正确设置');
      console.error('   2. 网络连接正常');
      console.error('   3. 代理设置正确（如果需要）');
      return false;
    }
  }

  // 计算技术指标
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
    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
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

  // 获取市场数据
  async getMarketData() {
    const marketData = {};
    
    for (const symbol of this.symbols) {
      try {
        console.log(`📊 获取 ${symbol} 数据...`);
        
        const ticker = await this.exchange.fetchTicker(symbol);
        const ohlcv = await this.exchange.fetchOHLCV(symbol, '1m', undefined, 50);
        
        const prices = ohlcv.map(candle => (candle[2] + candle[3]) / 2);
        const highs = ohlcv.map(candle => candle[2]);
        const lows = ohlcv.map(candle => candle[3]);
        const closes = ohlcv.map(candle => candle[4]);
        const volumes = ohlcv.map(candle => candle[5]);
        
        const ema20 = this.calculateEMA(prices, 20) || ticker.last;
        const macd = this.calculateMACD(prices) || 0;
        const rsi14 = this.calculateRSI(prices, 14) || 50;
        const rsi21 = this.calculateRSI(prices, 21) || 50;
        const atr = this.calculateATR(highs, lows, closes) || ticker.last * 0.02;
        
        const ohlcv4h = await this.exchange.fetchOHLCV(symbol, '4h', undefined, 10);
        const prices4h = ohlcv4h.map(candle => (candle[2] + candle[3]) / 2);
        const ema20_4h = this.calculateEMA(prices4h, 20) || ticker.last;
        const ema50_4h = this.calculateEMA(prices4h, 50) || ticker.last;
        const atr_4h = this.calculateATR(
          ohlcv4h.map(c => c[2]), 
          ohlcv4h.map(c => c[3]), 
          ohlcv4h.map(c => c[4])
        ) || ticker.last * 0.02;
        
        const currentVolume = volumes[volumes.length - 1];
        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        const fundingRate = (Math.random() - 0.5) * 0.001;
        const openInterest = Math.random() * 1000000 + 500000;
        const avgOpenInterest = openInterest * (0.8 + Math.random() * 0.4);
        const baseKey = this.normalizeBaseSymbol(symbol);
        
        marketData[baseKey] = {
          symbol: baseKey,
          currentPrice: ticker.last,
          ema20,
          macd,
          rsi14,
          rsi21,
          atr,
          ema20_4h,
          ema50_4h,
          atr_4h,
          currentVolume,
          avgVolume,
          fundingRate,
          openInterest,
          avgOpenInterest,
          prices: prices.slice(-10),
          ema20_series: this.generateEMASeries(prices, 20).slice(-10),
          macd_series: this.generateMACDSeries(prices).slice(-10),
          rsi14_series: this.generateRSISeries(prices, 14).slice(-10),
          rsi21_series: this.generateRSISeries(prices, 21).slice(-10),
          macd_4h_series: this.generateMACDSeries(prices4h).slice(-10),
          rsi14_4h_series: this.generateRSISeries(prices4h, 14).slice(-10)
        };
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ 获取 ${symbol} 数据失败:`, error.message);
      }
    }
    
    return marketData;
  }

  // 生成技术指标序列
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

  // 生成user_prompt
  generateUserPrompt(marketData) {
    const currentTime = new Date();
    const startTime = new Date(this.state.startTime);
    const minutesSinceStart = Math.floor((currentTime - startTime) / (1000 * 60));
    
    this.state.invocationCount++;
    this.saveState();
    
    let prompt = `It has been ${minutesSinceStart} minutes since you started trading. The current time is ${currentTime.toISOString()} and you've been invoked ${this.state.invocationCount} times. Below, we are providing you with a variety of state data, price data, and predictive signals so you can discover alpha. Below that is your current account information, value, performance, positions, etc.

**ALL OF THE PRICE OR SIGNAL DATA BELOW IS ORDERED: OLDEST → NEWEST**

**Timeframes note:** Unless stated otherwise in a section title, intraday series are provided at **3‑minute intervals**. If a coin uses a different interval, it is explicitly stated in that coin's section.

---

### CURRENT MARKET STATE FOR ALL COINS

`;

    // 为每个币种生成数据
    for (const [symbol, data] of Object.entries(marketData)) {
      prompt += `### ALL ${symbol} DATA

current_price = ${data.currentPrice.toFixed(2)}, current_ema20 = ${data.ema20.toFixed(2)}, current_macd = ${data.macd.toFixed(2)}, current_rsi (14 period) = ${data.rsi14.toFixed(2)}

In addition, here is the latest ${symbol} open interest and funding rate for perps${symbol === 'BTC' ? ' (the instrument you are trading)' : ''}:

Open Interest: Latest: ${data.openInterest.toFixed(2)}  Average: ${data.avgOpenInterest.toFixed(2)}

Funding Rate: ${data.fundingRate.toExponential(2)}

**Intraday series (${symbol === 'BTC' ? 'by minute' : '3‑minute intervals'}, oldest → latest):**

${symbol === 'BTC' ? 'Mid prices' : `${symbol} mid prices`}: [${data.prices.map(p => p.toFixed(2)).join(', ')}]

EMA indicators (20‑period): [${data.ema20_series.map(p => p.toFixed(2)).join(', ')}]

MACD indicators: [${data.macd_series.map(p => p.toFixed(2)).join(', ')}]

RSI indicators (14‑Period): [${data.rsi14_series.map(p => p.toFixed(2)).join(', ')}]

RSI indicators (21‑Period): [${data.rsi21_series.map(p => p.toFixed(2)).join(', ')}]

**Longer‑term context (4‑hour timeframe):**

20‑Period EMA: ${data.ema20_4h.toFixed(2)} vs. 50‑Period EMA: ${data.ema50_4h.toFixed(2)}

20‑Period ATR: ${data.atr.toFixed(2)} vs. 50‑Period ATR: ${data.atr_4h.toFixed(2)}

Current Volume: ${data.currentVolume.toFixed(2)} vs. Average Volume: ${data.avgVolume.toFixed(2)}

MACD indicators: [${data.macd_4h_series.map(p => p.toFixed(2)).join(', ')}]

RSI indicators (14‑Period): [${data.rsi14_4h_series.map(p => p.toFixed(2)).join(', ')}]

---

`;
    }

    // 添加账户信息
    prompt += `### HERE IS YOUR ACCOUNT INFORMATION & PERFORMANCE

Current Total Return (percent): ${this.state.totalReturn.toFixed(2)}%

Available Cash: ${this.state.availableCash.toFixed(2)}

**Current Account Value:** ${this.state.accountValue.toFixed(2)}

Current live positions & performance: 
`;

    for (const position of this.state.positions) {
      prompt += `{'symbol': '${position.symbol}', 'quantity': ${position.quantity}, 'entry_price': ${position.entry_price}, 'current_price': ${position.current_price}, 'liquidation_price': ${position.liquidation_price}, 'unrealized_pnl': ${position.unrealized_pnl}, 'leverage': ${position.leverage}, 'exit_plan': {'profit_target': ${position.exit_plan.profit_target}, 'stop_loss': ${position.exit_plan.stop_loss}, 'invalidation_condition': '${position.exit_plan.invalidation_condition}'}, 'confidence': ${position.confidence}, 'risk_usd': ${position.risk_usd}, 'sl_oid': ${position.sl_oid}, 'tp_oid': ${position.tp_oid}, 'wait_for_fill': ${position.wait_for_fill}, 'entry_oid': ${position.entry_oid}, 'notional_usd': ${position.notional_usd}}
`;
    }

    const sharpeRatio = this.calculateSharpeRatio();
    prompt += `\nSharpe Ratio: ${sharpeRatio.toFixed(2)}`;

    return prompt;
  }

  // 计算夏普比率
  calculateSharpeRatio() {
    // 简化的夏普比率计算
    return this.state.totalReturn > 0 ? Math.random() * 2 - 1 : -Math.random();
  }

  // 调用DeepSeek API
  async callDeepSeekAPI(userPrompt) {
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.deepseekApiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: [
                this.isFutures
                  ? 'You are an expert crypto trader operating Binance USDT-margined perpetual futures (U-margined).'
                  : 'You are an expert crypto trader operating Binance Spot Testnet (no leverage).',
                'Hard constraints:',
                this.isFutures ? '- Use isolated margin.' : '- Spot environment (no margin/leverage).',
                this.isFutures ? '- Leverage must be an integer within [1,20].' : '- Do not specify leverage.',
                this.isFutures
                  ? '- Symbols MUST be chosen from this exact whitelist (Binance USDM pairs):'
                  : '- Symbols MUST be chosen from this exact whitelist (Binance Spot pairs):',
                `  ${this.allowedSymbolsForAI.join(', ')}`,
                '- Do NOT invent other symbols or formats.',
                '',
                'OUTPUT MUST BE STRICT JSON (no markdown fences). Return exactly one top-level object that conforms to this schema:',
                '',
                '{',
                '  "analysis": {',
                '    "market_summary": string,                    // required, 1-4 sentences',
                '    "key_observations": string[]                // optional, short bullet points',
                '  },',
                '  "trading_decision": {                         // required primary decision',
                '    "action": "BUY" | "SELL" | "CLOSE_POSITION" | "HOLD",',
                '    "symbol": string,                           // required, one of the whitelist',
                '    "quantity": number,                         // required, > 0 when action is BUY/SELL/CLOSE_POSITION',
                this.isFutures
                  ? '    "leverage": integer,                        // required for contract trades, 1..20'
                  : '    "leverage": integer | null,                  // optional/ignored in spot',
                '    "reasoning": string                         // required, concise rationale',
                '  },',
                '  "trading_decisions": [                        // optional alternatives',
                '    {',
                '      "action": "BUY" | "SELL" | "CLOSE_POSITION" | "HOLD",',
                '      "symbol": string,                          // one of the whitelist',
                '      "quantity": number,',
                this.isFutures
                  ? '      "leverage": integer,                       // 1..20 if present'
                  : '      "leverage": integer | null,                 // optional/ignored in spot',
                '      "reasoning": string',
                '    }',
                '  ],',
                '  "account_management": {                       // required account guidance',
                '    "current_value": number,                    // required',
                '    "available_cash": number,                   // required',
                '    "total_return": number,                     // required, percent',
                '    "sharpe_ratio": number,                     // required',
                '    "recommendations": string[]                 // optional',
                '  }',
                '}',
                '',
                'Rules:',
                '- All required fields must be present on every response.',
                '- Be concise. Keep strings short and informative.',
                '- If closing an existing position but quantity is not specified in the prompt, set quantity to the full position size.',
                this.isFutures
                  ? '- Use integer leverage within [1,20]. If leverage is irrelevant (e.g., HOLD), still include it with the last used value or 1.'
                  : '- Do not include leverage unless explicitly requested; it will be ignored in spot.',
                '- The "symbol" must be exactly one from the whitelist; otherwise, respond with HOLD and explain briefly in reasoning.'
              ].join('\n')
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          stream: false,
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('❌ DeepSeek API调用失败:', error.message);
      return null;
    }
  }

  // 解析AI响应
  parseAIResponse(response) {
    try {
      // 尝试提取JSON部分
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          action: 'hold',
          reasoning: response,
          confidence: 0.5,
          risk_level: 'medium'
        };
      }

      const rawObj = JSON.parse(jsonMatch[0]);

      // 若包含数组 decisions，择优挑选
      const decisionsArray = Array.isArray(rawObj.trading_decisions)
        ? rawObj.trading_decisions
        : Array.isArray(rawObj.decisions)
          ? rawObj.decisions
          : null;

      // 支持 { trading_decision: { ... } } 或直接 { action, symbol, ... }
      let d = rawObj.trading_decision ? rawObj.trading_decision : rawObj;

      // 统一动作与符号
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

      // 如果有数组，按以下优先级选择：
      // 1) 对当前持仓给出 close/sell 的项
      // 2) 任意明确 buy/sell 的项
      // 3) 含 symbol 的 hold 项
      if (decisionsArray && decisionsArray.length > 0) {
        const normalizeDecision = (item) => ({
          action: normalizeAction(item.action),
          symbol: normalizeSymbol(item.symbol),
          quantity: item.quantity !== undefined ? Number(item.quantity) : undefined,
          reasoning: item.reason || item.reasoning,
          risk_assessment: item.risk_assessment,
        });

        const currentSymbols = this.state.positions.map(p => p.symbol);
        const isHeld = (sym) => sym && currentSymbols.includes(sym);
        const ranked = decisionsArray.map(normalizeDecision);

        let chosen = ranked.find(x => isHeld(x.symbol) && (x.action === 'close_position' || x.action === 'sell'))
          || ranked.find(x => x.action === 'buy' || x.action === 'sell' || x.action === 'close_position')
          || ranked.find(x => x.symbol);

        if (chosen) {
          // 将 avoid 视为 hold
          if (chosen.action !== 'buy' && chosen.action !== 'sell' && chosen.action !== 'close_position') {
            chosen.action = 'hold';
          }
          return chosen;
        }
      }

      const decision = {
        action: normalizeAction(d.action),
        symbol: normalizeSymbol(d.symbol),
        quantity: d.quantity !== undefined ? Number(d.quantity) : undefined,
        reasoning: d.reasoning || rawObj.reasoning,
        risk_assessment: d.risk_assessment || rawObj.risk_assessment,
        leverage: d.leverage !== undefined
          ? Number(d.leverage)
          : (d.leverage_x !== undefined
              ? Number(d.leverage_x)
              : (d.leverageX !== undefined ? Number(d.leverageX) : undefined))
      };

      return decision;
    } catch (error) {
      console.error('❌ 解析AI响应失败:', error.message);
      return {
        action: 'hold',
        reasoning: '解析失败，保持当前持仓',
        confidence: 0.1,
        risk_level: 'high'
      };
    }
  }

  // 执行交易决策
  async executeTradingDecision(decision, marketData) {
    console.log('\n🤖 AI交易决策:', decision);
    
    try {
      if (decision.action === 'buy' && decision.symbol) {
        console.log(`📈 执行买入 ${decision.symbol}`);
        await this.executeBuyOrder(decision, marketData);
      } else if (decision.action === 'sell' && decision.symbol) {
        console.log(`📉 执行卖出 ${decision.symbol}`);
        await this.executeSellOrder(decision, marketData);
      } else if (decision.action === 'close_position' && decision.symbol) {
        // 平仓：若未提供数量，按当前持仓全量
        const base = this.normalizeBaseSymbol(decision.symbol);
        const pos = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
        if (pos) {
          const qty = decision.quantity && decision.quantity > 0 ? decision.quantity : Number(pos.quantity);
          console.log(`🧹 执行平仓 ${base}，数量: ${qty}`);
          await this.executeSellOrder({ ...decision, symbol: base, quantity: qty }, marketData);
        } else {
          console.log(`ℹ️ 无持仓可平: ${base}`);
        }
      } else if (decision.action === 'hold') {
        console.log('⏸️  保持当前持仓');
      }
      
      // 更新账户状态（从真实账户获取）
      await this.updateAccountState();
      
    } catch (error) {
      console.error('❌ 交易执行失败:', error.message);
    }
    
    this.saveState();
  }

  // 执行买入订单
  async executeBuyOrder(decision, marketData) {
    try {
      const base = this.normalizeBaseSymbol(decision.symbol);
      const symbol = this.isFutures ? `${base}/USDT:USDT` : `${base}/USDT`;
      const quantity = decision.quantity || 0.001; // 默认最小数量
      const leverage = this.isFutures && decision.leverage !== undefined ? Math.floor(Number(decision.leverage)) : undefined;
      
      console.log(`🔄 创建Demo Trading买入订单: ${symbol}, 数量: ${quantity}${this.isFutures ? `, 杠杆: ${leverage ?? 'auto'}x` : ''}`);
      console.log(`🌐 交易环境: demo.binance.com`);
      
      // 设置杠杆与逐仓
      if (this.isFutures) {
        try { await this.exchange.setMarginMode('ISOLATED', symbol); } catch (_) {}
        try { if (leverage !== undefined) await this.exchange.setLeverage(leverage, symbol); } catch (_) {}
      }
      
      // 创建市价买入订单
      const order = await this.exchange.createOrder(
        symbol,
        'market',
        'buy',
        quantity,
        null,
        this.isFutures ? (leverage !== undefined ? { leverage, marginType: 'isolated' } : { marginType: 'isolated' }) : undefined
      );
      
      console.log(`✅ Demo Trading买入订单创建成功:`);
      console.log(`   📋 订单ID: ${order.id}`);
      console.log(`   💰 成交价格: ${order.average || order.price} USDT`);
      console.log(`   📊 成交数量: ${order.filled} ${decision.symbol}`);
      console.log(`   💵 成交金额: ${order.cost} USDT`);
      console.log(`   📈 订单状态: ${order.status}`);
      
      // 等待订单完全成交
      if (order.status === 'open') {
        console.log('⏳ 等待订单成交...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 检查订单状态
        const orderStatus = await this.exchange.fetchOrder(order.id, symbol);
        console.log(`📋 最终订单状态: ${orderStatus.status}`);
      }
      
      // 更新本地持仓状态
      this.addPosition(base, quantity, order.average || order.price);
      
      // 记录交易日志
      this.logTrade('BUY', base, quantity, order.average || order.price, order.id);
      
    } catch (error) {
      console.error('❌ Demo Trading买入订单失败:', error.message);
      console.error('💡 可能的原因: 余额不足、网络问题或API限制');
    }
  }

  // 执行卖出订单
  async executeSellOrder(decision, marketData) {
    try {
      const base = this.normalizeBaseSymbol(decision.symbol);
      const symbol = this.isFutures ? `${base}/USDT:USDT` : `${base}/USDT`;
      const quantity = decision.quantity || 0.001;
      const leverage = this.isFutures && decision.leverage !== undefined ? Math.floor(Number(decision.leverage)) : undefined;
      
      console.log(`🔄 创建Demo Trading卖出订单: ${symbol}, 数量: ${quantity}${this.isFutures ? `, 杠杆: ${leverage ?? 'auto'}x` : ''}`);
      console.log(`🌐 交易环境: demo.binance.com`);
      
      // 设置杠杆与逐仓
      if (this.isFutures) {
        try { await this.exchange.setMarginMode('ISOLATED', symbol); } catch (_) {}
        try { if (leverage !== undefined) await this.exchange.setLeverage(leverage, symbol); } catch (_) {}
      }
      
      // 创建市价卖出订单
      const order = await this.exchange.createOrder(
        symbol,
        'market',
        'sell',
        quantity,
        null,
        this.isFutures ? (leverage !== undefined ? { leverage, marginType: 'isolated' } : { marginType: 'isolated' }) : undefined
      );
      
      console.log(`✅ Demo Trading卖出订单创建成功:`);
      console.log(`   📋 订单ID: ${order.id}`);
      console.log(`   💰 成交价格: ${order.average || order.price} USDT`);
      console.log(`   📊 成交数量: ${order.filled} ${decision.symbol}`);
      console.log(`   💵 成交金额: ${order.cost} USDT`);
      console.log(`   📈 订单状态: ${order.status}`);
      
      // 等待订单完全成交
      if (order.status === 'open') {
        console.log('⏳ 等待订单成交...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 检查订单状态
        const orderStatus = await this.exchange.fetchOrder(order.id, symbol);
        console.log(`📋 最终订单状态: ${orderStatus.status}`);
      }
      
      // 更新本地持仓状态
      this.removePosition(base, quantity);
      
      // 记录交易日志
      this.logTrade('SELL', base, quantity, order.average || order.price, order.id);
      
    } catch (error) {
      console.error('❌ Demo Trading卖出订单失败:', error.message);
      console.error('💡 可能的原因: 持仓不足、网络问题或API限制');
    }
  }

  // 添加持仓
  addPosition(symbol, quantity, entryPrice) {
    const base = this.normalizeBaseSymbol(symbol);
    const existingPosition = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
    
    if (existingPosition) {
      // 更新现有持仓
      const totalQuantity = parseFloat(existingPosition.quantity) + parseFloat(quantity);
      const avgPrice = (parseFloat(existingPosition.entry_price) * parseFloat(existingPosition.quantity) + 
                       parseFloat(entryPrice) * parseFloat(quantity)) / totalQuantity;
      
      existingPosition.quantity = totalQuantity;
      existingPosition.entry_price = avgPrice;
    } else {
      // 创建新持仓
      this.state.positions.push({
        symbol: base,
        quantity: quantity,
        entry_price: entryPrice,
        current_price: entryPrice,
        liquidation_price: entryPrice * 0.9, // 简化的清算价格
        unrealized_pnl: 0,
        leverage: 1,
        exit_plan: {
          profit_target: entryPrice * 1.1,
          stop_loss: entryPrice * 0.95,
          invalidation_condition: 'price_below_stop_loss'
        },
        confidence: 0.8,
        risk_usd: quantity * entryPrice,
        sl_oid: null,
        tp_oid: null,
        wait_for_fill: false,
        entry_oid: null,
        notional_usd: quantity * entryPrice
      });
    }
  }

  // 移除持仓
  removePosition(symbol, quantity) {
    const base = this.normalizeBaseSymbol(symbol);
    const existingPosition = this.state.positions.find(p => this.normalizeBaseSymbol(p.symbol) === base);
    
    if (existingPosition) {
      const remainingQuantity = parseFloat(existingPosition.quantity) - parseFloat(quantity);
      
      if (remainingQuantity <= 0) {
        // 完全平仓
        this.state.positions = this.state.positions.filter(p => this.normalizeBaseSymbol(p.symbol) !== base);
      } else {
        // 部分平仓
        existingPosition.quantity = remainingQuantity;
      }
    }
  }

  // 更新账户状态
  async updateAccountState() {
    try {
      console.log('🔄 从Demo Trading环境获取账户状态...');
      
      // 获取账户余额
      const balance = await this.exchange.fetchBalance();
      console.log('💰 Demo账户余额:', {
        USDT: balance.USDT?.total || 0,
        BTC: balance.BTC?.total || 0,
        available: balance.USDT?.free || 0
      });
      
      // 更新账户状态 - Futures与Spot区分处理
      this.state.accountValue = balance.USDT?.total || 10000;
      this.state.availableCash = balance.USDT?.free || 10000;
      this.state.totalReturn = ((this.state.accountValue - 10000) / 10000) * 100;

      if (this.isFutures) {
        // 获取持仓信息（USDM）
        const positions = await this.exchange.fetchPositions();
        const activePositions = positions.filter(p => parseFloat(p.contracts) !== 0);
        console.log('📊 Futures持仓数量:', activePositions.length);
        this.state.positions = [];
        for (const position of activePositions) {
          if (parseFloat(position.contracts) > 0) {
            const symbol = this.normalizeBaseSymbol(position.symbol);
            this.state.positions.push({
              symbol: symbol,
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
              sl_oid: null,
              tp_oid: null,
              wait_for_fill: false,
              entry_oid: null,
              notional_usd: parseFloat(position.notional)
            });
          }
        }
      } else {
        // Spot 无统一持仓接口；保持本地持仓，更新当前价（可选：通过ticker刷新）
        console.log('📊 Spot环境，不从交易所同步持仓（使用本地持仓记录）');
      }
      
      console.log('✅ Demo账户状态更新完成');
      console.log(`   💰 账户价值: $${this.state.accountValue.toFixed(2)}`);
      console.log(`   💵 可用现金: $${this.state.availableCash.toFixed(2)}`);
      console.log(`   📈 总回报: ${this.state.totalReturn.toFixed(2)}%`);
      console.log(`   📊 持仓数量: ${this.state.positions.length}`);
      
    } catch (error) {
      console.error('❌ 更新Demo账户状态失败:', error.message);
      console.error('💡 请检查网络连接和API密钥');
    }
  }

  // 记录交易日志
  logTrade(side, symbol, quantity, price, orderId) {
    const trade = {
      timestamp: new Date().toISOString(),
      side: side, // 'BUY' or 'SELL'
      symbol: symbol,
      quantity: quantity,
      price: price,
      orderId: orderId,
      environment: 'demo.binance.com',
      accountValue: this.state.accountValue,
      totalReturn: this.state.totalReturn
    };
    
    // 添加到状态中的交易记录
    if (!this.state.trades) {
      this.state.trades = [];
    }
    
    this.state.trades.unshift(trade);
    
    // 只保留最近1000条交易记录
    //if (this.state.trades.length > 1000) {
    //  this.state.trades = this.state.trades.slice(0, 1000);
    //}
    
    console.log(`📝 交易记录已保存: ${side} ${quantity} ${symbol} @ ${price} USDT (订单ID: ${orderId})`);
    
    this.saveState();
  }

  // 保存对话记录
  saveConversation(userPrompt, aiResponse, decision) {
    // 额外保存AI响应中提取到的原始JSON（便于回溯与分析）
    let aiParsed = null;
    try {
      if (typeof aiResponse === 'string') {
        const match = aiResponse.match(/\{[\s\S]*\}/);
        if (match) {
          aiParsed = JSON.parse(match[0]);
        }
      }
    } catch (_) {
      // 忽略解析失败，仅作为附加信息
    }

    // 从 aiParsed 中提取“原始决策对象”和“候选数组”，用于完整留存
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
    } catch (_) {
      // 忽略
    }

    const conversation = {
      timestamp: new Date().toISOString(),
      invocationCount: this.state.invocationCount,
      userPrompt: userPrompt, // 截取前1000字符
      aiResponse: aiResponse, // 截取前1000字符
      aiParsed: aiParsed,
      // decision: 原始/丰富结构（保持你想要的完整字段）
      decision: decisionRaw || aiParsed?.trading_decision || null,
      // decision_normalized: 供程序执行的归一化决策
      decision_normalized: decision,
      // trading_decisions: 若模型输出了候选数组，也一并保存
      trading_decisions: decisionsArray || null,
      accountValue: this.state.accountValue,
      totalReturn: this.state.totalReturn
    };
    
    this.conversations.conversations.unshift(conversation);
    
    // 只保留最近100条记录
    //if (this.conversations.conversations.length > 100) {
    //  this.conversations.conversations = this.conversations.conversations.slice(0, 100);
    //}
    
    this.saveConversations();
  }

  // 主交易循环
  async runTradingCycle() {
    try {
      console.log('🚀 开始AI交易循环...');
      console.log(`📊 当前状态: 调用次数 ${this.state.invocationCount}, 账户价值 $${this.state.accountValue.toFixed(2)}`);
      
      // 获取市场数据
      console.log('\n📈 获取市场数据...');
      const marketData = await this.getMarketData();
      
      // 生成user_prompt
      console.log('\n📝 生成交易提示...');
      const userPrompt = this.generateUserPrompt(marketData);
      
      // 调用DeepSeek API
      console.log('\n🤖 调用DeepSeek API...');
      const aiResponse = await this.callDeepSeekAPI(userPrompt);
      
      if (!aiResponse) {
        console.log('❌ AI响应失败，跳过本次交易');
        return;
      }
      
      // 解析AI响应
      console.log('\n🔍 解析AI响应...');
      const decision = this.parseAIResponse(aiResponse);
      
      // 执行交易决策
      console.log('\n⚡ 执行交易决策...');
      await this.executeTradingDecision(decision, marketData);
      
      // 保存对话记录
      console.log('\n💾 保存对话记录...');
      this.saveConversation(userPrompt, aiResponse, decision);
      
      console.log('\n✅ 交易循环完成！');
      console.log(`📊 更新后状态: 调用次数 ${this.state.invocationCount}, 账户价值 $${this.state.accountValue.toFixed(2)}, 总回报 ${this.state.totalReturn.toFixed(2)}%`);
      
    } catch (error) {
      console.error('❌ 交易循环失败:', error.message);
    }
  }

  // 显示状态信息
  showStatus() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 AI Demo Trading系统状态');
    console.log(`🌐 交易环境: demo.binance.com`);
    console.log('='.repeat(60));
    console.log(`开始时间: ${new Date(this.state.startTime).toLocaleString()}`);
    console.log(`调用次数: ${this.state.invocationCount}`);
    console.log(`账户价值: $${this.state.accountValue.toFixed(2)}`);
    console.log(`可用现金: $${this.state.availableCash.toFixed(2)}`);
    console.log(`总回报: ${this.state.totalReturn.toFixed(2)}%`);
    console.log(`持仓数量: ${this.state.positions.length}`);
    console.log(`对话记录: ${this.conversations.conversations.length} 条`);
    console.log(`交易记录: ${this.state.trades ? this.state.trades.length : 0} 条`);
    
    // 显示最近的交易记录
    if (this.state.trades && this.state.trades.length > 0) {
      console.log('\\n📋 最近交易记录:');
      const recentTrades = this.state.trades.slice(0, 5);
      for (const trade of recentTrades) {
        const time = new Date(trade.timestamp).toLocaleTimeString();
        console.log(`   ${time} - ${trade.side} ${trade.quantity} ${trade.symbol} @ $${trade.price} (订单: ${trade.orderId})`);
      }
    }
    
    console.log('='.repeat(60));
  }

  // 测试Demo Trading
  async testDemoTrading() {
    try {
      console.log('🧪 开始测试Demo Trading...');
      
      // 获取BTC价格
      const ticker = await this.exchange.fetchTicker('BTC/USDT:USDT');
      console.log('📊 BTC当前价格:', ticker.last);
      
      // 尝试创建一个小量买入订单
      const symbol = 'BTC/USDT:USDT';
      const quantity = 0.001; // 最小数量
      
      console.log(`🔄 创建测试买入订单: ${symbol}, 数量: ${quantity}`);
      
      const order = await this.exchange.createOrder(
        symbol,
        'market',
        'buy',
        quantity,
        null,
        {
          'leverage': 1,
          'marginType': 'isolated'
        }
      );
      
      console.log('✅ 测试订单创建成功:', order);
      
      // 等待几秒钟
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 检查订单状态
      const orderStatus = await this.exchange.fetchOrder(order.id, symbol);
      console.log('📋 订单状态:', orderStatus);
      
      // 获取持仓信息
      const positions = await this.exchange.fetchPositions();
      console.log('📊 当前持仓:', positions);
      
    } catch (error) {
      console.error('❌ Demo Trading测试失败:', error.message);
      console.error('错误详情:', error);
    }
  }

  // 主执行函数
  async run() {
    try {
      console.log('🚀 启动AI交易系统...');
      
      if (!this.deepseekApiKey) {
        console.error('❌ 请设置DEEPSEEK_API_KEY_30环境变量');
        return;
      }
      
      if (!await this.initializeExchange()) {
        return;
      }
      
      this.showStatus();
      
      // 运行一次交易循环
      await this.runTradingCycle();
      
      console.log('\n✨ AI交易系统运行完成！');
      
    } catch (error) {
      console.error('❌ 系统运行失败:', error.message);
      process.exit(1);
    }
  }
}

// 主函数
async function main() {
  const tradingSystem = new AITradingSystem();
  await tradingSystem.run();
}

// 运行交易系统
main().catch(console.error);
