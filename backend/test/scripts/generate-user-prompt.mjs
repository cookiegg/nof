// 使用ccxt生成nof1.ai格式的user_prompt
// 用法：node --env-file=./backend/.env backend/test/generate-user-prompt.mjs

import ccxt from 'ccxt';
import { writeFileSync } from 'fs';

class UserPromptGenerator {
  constructor() {
    this.exchange = null;
    this.symbols = ['BTC/USDT:USDT', 'ETH/USDT:USDT', 'SOL/USDT:USDT', 'BNB/USDT:USDT', 'XRP/USDT:USDT', 'DOGE/USDT:USDT'];
    this.timeframes = ['1m', '5m', '15m', '1h', '4h'];
    this.startTime = new Date();
  }

  // 初始化交易所
  async initializeExchange() {
    try {
      // 设置代理
      process.env.HTTPS_PROXY = process.env.HTTPS_PROXY || 'http://127.0.0.1:7890';
      process.env.HTTP_PROXY = process.env.HTTP_PROXY || 'http://127.0.0.1:7890';

      const apiKey = process.env.BINANCE_FUTURES_DEMO_API_KEY;
      const secret = process.env.BINANCE_FUTURES_DEMO_API_SECRET;
      const testnet = process.env.BINANCE_TESTNET === 'true';

      if (!apiKey || !secret) {
        throw new Error('请设置BINANCE_FUTURES_DEMO_API_KEY和BINANCE_FUTURES_DEMO_API_SECRET环境变量');
      }

      this.exchange = new ccxt.binanceusdm({
        apiKey,
        secret,
        enableRateLimit: true,
        options: {
          defaultType: 'future',
          warnOnFetchCurrencies: false,
          fetchCurrencies: false
        },
      });

      this.exchange.httpsProxy = 'http://127.0.0.1:7890/';
      this.exchange.enableDemoTrading(true);

      console.log('✅ 交易所初始化成功');
      return true;
    } catch (error) {
      console.error('❌ 交易所初始化失败:', error.message);
      return false;
    }
  }

  // 获取技术指标
  calculateEMA(prices, period) {
    if (prices.length < period) return null;
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length < slowPeriod) return null;
    
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    
    if (!fastEMA || !slowEMA) return null;
    
    const macd = fastEMA - slowEMA;
    return macd;
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
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
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

  // 获取币种数据
  async getSymbolData(symbol) {
    try {
      console.log(`📊 获取 ${symbol} 数据...`);
      
      // 获取当前价格
      const ticker = await this.exchange.fetchTicker(symbol);
      const currentPrice = ticker.last;
      
      // 获取K线数据
      const ohlcv = await this.exchange.fetchOHLCV(symbol, '1m', undefined, 50);
      const prices = ohlcv.map(candle => (candle[2] + candle[3]) / 2); // 使用最高价和最低价的平均值
      const highs = ohlcv.map(candle => candle[2]);
      const lows = ohlcv.map(candle => candle[3]);
      const closes = ohlcv.map(candle => candle[4]);
      const volumes = ohlcv.map(candle => candle[5]);
      
      // 计算技术指标
      const ema20 = this.calculateEMA(prices, 20) || currentPrice;
      const macd = this.calculateMACD(prices) || 0;
      const rsi14 = this.calculateRSI(prices, 14) || 50;
      const rsi21 = this.calculateRSI(prices, 21) || 50;
      const atr = this.calculateATR(highs, lows, closes) || currentPrice * 0.02;
      
      // 获取更长时间框架的数据
      const ohlcv4h = await this.exchange.fetchOHLCV(symbol, '4h', undefined, 10);
      const prices4h = ohlcv4h.map(candle => (candle[2] + candle[3]) / 2);
      const ema20_4h = this.calculateEMA(prices4h, 20) || currentPrice;
      const ema50_4h = this.calculateEMA(prices4h, 50) || currentPrice;
      const atr_4h = this.calculateATR(
        ohlcv4h.map(c => c[2]), 
        ohlcv4h.map(c => c[3]), 
        ohlcv4h.map(c => c[4])
      ) || currentPrice * 0.02;
      
      // 计算成交量
      const currentVolume = volumes[volumes.length - 1];
      const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
      
      // 获取资金费率（模拟）
      const fundingRate = (Math.random() - 0.5) * 0.001; // 模拟资金费率
      
      // 获取持仓量（模拟）
      const openInterest = Math.random() * 1000000 + 500000; // 模拟持仓量
      const avgOpenInterest = openInterest * (0.8 + Math.random() * 0.4);
      
      return {
        symbol: symbol.replace('/USDT:USDT', ''),
        currentPrice,
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
        prices: prices.slice(-10), // 最近10个价格
        ema20_series: this.generateEMASeries(prices, 20).slice(-10),
        macd_series: this.generateMACDSeries(prices).slice(-10),
        rsi14_series: this.generateRSISeries(prices, 14).slice(-10),
        rsi21_series: this.generateRSISeries(prices, 21).slice(-10),
        macd_4h_series: this.generateMACDSeries(prices4h).slice(-10),
        rsi14_4h_series: this.generateRSISeries(prices4h, 14).slice(-10)
      };
    } catch (error) {
      console.error(`❌ 获取 ${symbol} 数据失败:`, error.message);
      return null;
    }
  }

  // 生成EMA序列
  generateEMASeries(prices, period) {
    const series = [];
    for (let i = period - 1; i < prices.length; i++) {
      const ema = this.calculateEMA(prices.slice(0, i + 1), period);
      series.push(ema);
    }
    return series;
  }

  // 生成MACD序列
  generateMACDSeries(prices) {
    const series = [];
    for (let i = 25; i < prices.length; i++) {
      const macd = this.calculateMACD(prices.slice(0, i + 1));
      series.push(macd);
    }
    return series;
  }

  // 生成RSI序列
  generateRSISeries(prices, period) {
    const series = [];
    for (let i = period; i < prices.length; i++) {
      const rsi = this.calculateRSI(prices.slice(0, i + 1), period);
      series.push(rsi);
    }
    return series;
  }

  // 生成模拟账户信息
  generateAccountInfo() {
    const totalReturn = (Math.random() - 0.5) * 20; // -10% 到 +10%
    const accountValue = 10000 + Math.random() * 5000; // 10k-15k
    const availableCash = accountValue * (0.1 + Math.random() * 0.2); // 10%-30%现金
    
    // 生成模拟持仓
    const positions = [];
    const symbols = ['ETH', 'SOL', 'XRP', 'BTC', 'DOGE', 'BNB'];
    
    for (const symbol of symbols) {
      if (Math.random() > 0.3) { // 70%概率有持仓
        const quantity = Math.random() * 100;
        const entryPrice = Math.random() * 1000 + 100;
        const currentPrice = entryPrice * (0.8 + Math.random() * 0.4);
        const unrealizedPnl = (currentPrice - entryPrice) * quantity;
        const leverage = Math.floor(Math.random() * 5) + 1;
        
        positions.push({
          symbol,
          quantity: parseFloat(quantity.toFixed(2)),
          entry_price: parseFloat(entryPrice.toFixed(2)),
          current_price: parseFloat(currentPrice.toFixed(2)),
          liquidation_price: parseFloat((entryPrice * 0.8).toFixed(2)),
          unrealized_pnl: parseFloat(unrealizedPnl.toFixed(2)),
          leverage,
          exit_plan: {
            profit_target: parseFloat((entryPrice * 1.1).toFixed(2)),
            stop_loss: parseFloat((entryPrice * 0.95).toFixed(2)),
            invalidation_condition: '4H MACD turns negative or price closes below $XX,XX on 4H timeframe'
          },
          confidence: parseFloat((0.5 + Math.random() * 0.5).toFixed(2)),
          risk_usd: parseFloat((Math.abs(unrealizedPnl) * 0.1).toFixed(2)),
          sl_oid: Math.floor(Math.random() * 1000),
          tp_oid: Math.floor(Math.random() * 1000),
          wait_for_fill: false,
          entry_oid: Math.floor(Math.random() * 1000),
          notional_usd: parseFloat((quantity * currentPrice).toFixed(2))
        });
      }
    }
    
    return {
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      accountValue: parseFloat(accountValue.toFixed(2)),
      availableCash: parseFloat(availableCash.toFixed(2)),
      positions,
      sharpeRatio: parseFloat((Math.random() * 2 - 1).toFixed(2))
    };
  }

  // 生成user_prompt
  generateUserPrompt(symbolsData, accountInfo) {
    const currentTime = new Date();
    const minutesSinceStart = Math.floor((currentTime - this.startTime) / (1000 * 60));
    const invocationCount = Math.floor(Math.random() * 5000) + 3000;
    
    let prompt = `It has been ${minutesSinceStart} minutes since you started trading. The current time is ${currentTime.toISOString()} and you've been invoked ${invocationCount} times. Below, we are providing you with a variety of state data, price data, and predictive signals so you can discover alpha. Below that is your current account information, value, performance, positions, etc.

**ALL OF THE PRICE OR SIGNAL DATA BELOW IS ORDERED: OLDEST → NEWEST**

**Timeframes note:** Unless stated otherwise in a section title, intraday series are provided at **3‑minute intervals**. If a coin uses a different interval, it is explicitly stated in that coin's section.

---

### CURRENT MARKET STATE FOR ALL COINS

`;

    // 为每个币种生成数据
    for (const data of symbolsData) {
      if (!data) continue;
      
      prompt += `### ALL ${data.symbol} DATA

current_price = ${data.currentPrice.toFixed(2)}, current_ema20 = ${data.ema20.toFixed(2)}, current_macd = ${data.macd.toFixed(2)}, current_rsi (14 period) = ${data.rsi14.toFixed(2)}

In addition, here is the latest ${data.symbol} open interest and funding rate for perps${data.symbol === 'BTC' ? ' (the instrument you are trading)' : ''}:

Open Interest: Latest: ${data.openInterest.toFixed(2)}  Average: ${data.avgOpenInterest.toFixed(2)}

Funding Rate: ${data.fundingRate.toExponential(2)}

**Intraday series (${data.symbol === 'BTC' ? 'by minute' : '3‑minute intervals'}, oldest → latest):**

${data.symbol === 'BTC' ? 'Mid prices' : `${data.symbol} mid prices`}: [${data.prices.map(p => p.toFixed(2)).join(', ')}]

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

Current Total Return (percent): ${accountInfo.totalReturn.toFixed(2)}%

Available Cash: ${accountInfo.availableCash.toFixed(2)}

**Current Account Value:** ${accountInfo.accountValue.toFixed(2)}

Current live positions & performance: 
`;

    for (const position of accountInfo.positions) {
      prompt += `{'symbol': '${position.symbol}', 'quantity': ${position.quantity}, 'entry_price': ${position.entry_price}, 'current_price': ${position.current_price}, 'liquidation_price': ${position.liquidation_price}, 'unrealized_pnl': ${position.unrealized_pnl}, 'leverage': ${position.leverage}, 'exit_plan': {'profit_target': ${position.exit_plan.profit_target}, 'stop_loss': ${position.exit_plan.stop_loss}, 'invalidation_condition': '${position.exit_plan.invalidation_condition}'}, 'confidence': ${position.confidence}, 'risk_usd': ${position.risk_usd}, 'sl_oid': ${position.sl_oid}, 'tp_oid': ${position.tp_oid}, 'wait_for_fill': ${position.wait_for_fill}, 'entry_oid': ${position.entry_oid}, 'notional_usd': ${position.notional_usd}}
`;
    }

    prompt += `\nSharpe Ratio: ${accountInfo.sharpeRatio.toFixed(2)}`;

    return prompt;
  }

  // 主执行函数
  async run() {
    try {
      console.log('🚀 开始生成user_prompt...');
      
      if (!await this.initializeExchange()) {
        return;
      }

      // 获取所有币种数据
      console.log('\n📊 获取市场数据...');
      const symbolsData = [];
      for (const symbol of this.symbols) {
        const data = await this.getSymbolData(symbol);
        symbolsData.push(data);
        await new Promise(resolve => setTimeout(resolve, 100)); // 避免频率限制
      }

      // 生成账户信息
      console.log('\n💰 生成账户信息...');
      const accountInfo = this.generateAccountInfo();

      // 生成user_prompt
      console.log('\n📝 生成user_prompt...');
      const userPrompt = this.generateUserPrompt(symbolsData, accountInfo);

      // 保存结果
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const result = {
        timestamp: new Date().toISOString(),
        userPrompt,
        symbolsData,
        accountInfo,
        metadata: {
          symbols: this.symbols,
          timeframes: this.timeframes,
          promptLength: userPrompt.length
        }
      };

      const filepath = `/data/proj/open_nof1/nof0/backend/test/generated-user-prompt-${timestamp}.json`;
      writeFileSync(filepath, JSON.stringify(result, null, 2), 'utf8');

      console.log('\n' + '='.repeat(80));
      console.log('📝 生成的User Prompt');
      console.log('='.repeat(80));
      console.log(`长度: ${userPrompt.length} 字符`);
      console.log(`文件已保存: ${filepath}`);
      console.log('\n内容预览:');
      console.log('─'.repeat(60));
      console.log(userPrompt.substring(0, 1000) + '...');
      console.log('─'.repeat(60));

      console.log('\n✨ 生成完成！');

    } catch (error) {
      console.error('❌ 生成失败:', error.message);
      process.exit(1);
    }
  }
}

// 主函数
async function main() {
  const generator = new UserPromptGenerator();
  await generator.run();
}

// 运行生成器
main().catch(console.error);