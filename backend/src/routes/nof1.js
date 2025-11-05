import express from 'express';
import { getPrices, getAccountBalance, getRealTimeAccountData } from '../services/binance.js';
import { loadJson, saveJson } from '../store/fsStore.js';
import { deriveAccountTotals, deriveLeaderboard, deriveSinceInception } from '../services/metrics.js';
import fs from 'fs/promises';
import { watch } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import fetch from 'node-fetch';
import { tradingRunner } from '../services/runner.js';
import { botConfigManager } from '../services/bots/bot-config-manager.js';

export const router = express.Router();

// Health
router.get('/health', (req, res) => res.json({ ok: true }));

// GET /crypto-prices
router.get('/crypto-prices', async (req, res) => {
  try {
    const symbols = (process.env.SYMBOLS || 'BTC/USDT,ETH/USDT,SOL/USDT,BNB/USDT,DOGE/USDT,XRP/USDT')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const prices = await getPrices(symbols);
    res.json({ prices, serverTime: Date.now() });
  } catch (e) {
    console.error('[crypto-prices] 错误:', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Static JSON-backed endpoints
router.get('/trades', async (req, res) => {
  try {
    // 加载所有Bot配置
    const { botConfigManager } = await import('../services/bots/bot-config-manager.js');
    const bots = await botConfigManager.getAllBots();
    
    const allTrades = [];
    const { BotStateManager } = await import('../services/trading/bot-state-manager.js');
    
    // 聚合所有Bot的交易数据
    for (const bot of bots) {
      try {
        const stateManager = new BotStateManager(bot.id);
        const tradesData = await stateManager.loadTrades();
        
        if (Array.isArray(tradesData) && tradesData.length > 0) {
          const normalized = tradesData.map((t, idx) => {
            const ts = t.exit_time || t.timestamp || t.exitTime || Math.floor(Date.now() / 1000);
            const symbol = (t.symbol || 'UNKNOWN').toUpperCase().replace(/:USDT$/, '').split('/')[0];
            const sideRaw = String(t.side || '').toUpperCase();
            const side = (sideRaw === 'BUY' || sideRaw === 'LONG') ? 'long' : 
                         (sideRaw === 'SELL' || sideRaw === 'SHORT') ? 'short' : 'long';
            
            return {
              id: t.orderId ? String(t.orderId) : `${bot.id}-${symbol}-${ts}-${idx}`,
              model_id: bot.id, // 使用bot_id作为标识
              bot_id: bot.id,
              bot_name: bot.name || bot.id,
              model: bot.model || '', // 保留模型信息用于显示
              symbol,
              side,
              entry_price: Number(t.entry_price || t.entryPrice || t.price || 0),
              exit_price: Number(t.exit_price || t.exitPrice || t.price || 0),
              quantity: Number(t.quantity || 0),
              leverage: Number(t.leverage || 1),
              entry_time: Number(t.entry_time || t.entryTime || ts - 3600),
              exit_time: Number(ts),
              entry_human_time: t.entry_human_time || t.entryHumanTime || new Date(Number(t.entry_time || ts - 3600) * 1000).toISOString(),
              exit_human_time: t.exit_human_time || t.exitHumanTime || new Date(Number(ts) * 1000).toISOString(),
              realized_net_pnl: Number(t.realized_net_pnl || t.realizedNetPnl || 0),
              realized_gross_pnl: Number(t.realized_gross_pnl || t.realizedGrossPnl || t.realized_net_pnl || 0),
              total_commission_dollars: Number(t.total_commission_dollars || t.totalCommissionDollars || t.commission || 0),
            };
          });
          allTrades.push(...normalized);
        }
      } catch (e) {
        console.warn(`[Trades API] 读取Bot ${bot.id} 交易数据失败:`, e.message);
      }
    }
    
    // 如果从Bot数据中没有获取到，尝试全局数据
    if (allTrades.length === 0) {
      try {
        const trades = await loadJson('trades.json', { trades: [] });
        const realTrades = (trades.trades || []).filter(t => t.orderId || t.side);
        if (realTrades.length > 0) {
          const normalized = realTrades.map((t, idx) => {
            const ts = t.exit_time || t.timestamp || Math.floor(Date.now() / 1000);
            const symbol = (t.symbol || 'UNKNOWN').toUpperCase().replace(/:USDT$/, '').split('/')[0];
            const sideRaw = String(t.side || '').toUpperCase();
            const side = (sideRaw === 'BUY' || sideRaw === 'LONG') ? 'long' : 
                         (sideRaw === 'SELL' || sideRaw === 'SHORT') ? 'short' : 'long';
            
            return {
              id: t.orderId ? String(t.orderId) : `${symbol}-${ts}-${idx}`,
              model_id: t.model_id || t.bot_id || 'default',
              bot_id: t.bot_id || t.model_id || 'default',
              symbol,
              side,
              entry_price: Number(t.entry_price || t.price || 0),
              exit_price: Number(t.exit_price || t.price || 0),
              quantity: Number(t.quantity || 0),
              leverage: Number(t.leverage || 1),
              entry_time: Number(t.entry_time || ts - 3600),
              exit_time: Number(ts),
              realized_net_pnl: Number(t.realized_net_pnl || 0),
              realized_gross_pnl: Number(t.realized_gross_pnl || t.realized_net_pnl || 0),
              total_commission_dollars: Number(t.total_commission_dollars || t.commission || 0),
            };
          });
          allTrades.push(...normalized);
        }
      } catch (_) {}
    }
    
    return res.json({ trades: allTrades });
  } catch (e) {
    console.error('[Trades API] 错误:', e);
    res.json({ trades: [] });
  }
});

// conversations.json 解析 + 文件监听缓存
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const TEST_DIR = path.resolve(__dirname, '..', '..', 'test');
const CONV_FILE = path.join(DATA_DIR, 'conversations.json');
let conversationsCache = { merged: { conversations: [{ model_id: 'default', messages: [] }] }, lastLoaded: 0 };

async function loadAndMergeConversations() {
  try {
    const buf = await fs.readFile(CONV_FILE, 'utf8');
    const raw = JSON.parse(buf);
    const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
    const messages = [];
    for (const c of arr.slice().reverse()) { // 时间正序
      const ts = c?.timestamp || new Date().toISOString();
      if (c?.userPrompt) messages.push({ role: 'user', content: String(c.userPrompt), timestamp: ts });
      if (c?.aiResponse != null) messages.push({ role: 'assistant', content: String(c.aiResponse), timestamp: ts });
    }
    conversationsCache.merged = { conversations: [{ model_id: 'default', messages }] };
    conversationsCache.lastLoaded = Date.now();
  } catch (_) {
    conversationsCache.merged = { conversations: [{ model_id: 'default', messages: [] }] };
    conversationsCache.lastLoaded = Date.now();
  }
}

router.get('/conversations', async (req, res) => {
  // 返回结构化的交易对话数据，兼容前端期望的格式
  try {
    // 加载所有Bot配置
    const { botConfigManager } = await import('../services/bots/bot-config-manager.js');
    const bots = await botConfigManager.getAllBots();
    
    const allItems = [];
    const { BotStateManager } = await import('../services/trading/bot-state-manager.js');
    
    async function readConv(filePath, botId, modelId, botName) {
      try {
        const buf = await fs.readFile(filePath, 'utf8');
        const raw = JSON.parse(buf);
        const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
        const items = [];
        
        for (const c of arr) {
          const ts = c?.timestamp || new Date().toISOString();
          const tsUnix = typeof ts === 'string' ? Math.floor(new Date(ts).getTime() / 1000) : ts;
          
          // 提取决策信息用于摘要
          const decision = c?.decision || c?.decision_normalized || {};
          const action = String(decision?.action || 'hold').toLowerCase();
          const symbol = decision?.symbol || '';
          const reasoning = decision?.reasoning || '';
          
          // 构建对话摘要（用于列表显示）
          let summary = '';
          if (action === 'buy' || action === 'long') {
            summary = `📈 买入 ${symbol}`;
          } else if (action === 'sell' || action === 'short') {
            summary = `📉 卖出 ${symbol}`;
          } else if (action === 'close_position' || action === 'close') {
            summary = `🔚 平仓 ${symbol}`;
          } else {
            summary = `⏸️ 保持观望`;
          }
          
          // 添加推理内容（完整显示）
          if (reasoning) {
            summary += ` - ${reasoning}`;
          }
          
          // 构建结构化条目
          items.push({
            model_id: botId || 'default', // 使用bot_id作为标识（保持兼容性）
            bot_id: botId || 'default',
            bot_name: botName || botId || 'default',
            model: modelId || '', // 保留模型信息用于显示
            timestamp: tsUnix,
            inserted_at: tsUnix,
            invocationCount: c?.invocationCount || 0,
            
            // 摘要信息（用于列表显示）
            cot_trace_summary: summary,
            summary: summary,
            
            // 原始提示和响应
            user_prompt: c?.userPrompt || '',
            
            // LLM 响应的结构化数据
            llm_response: {
              raw_text: c?.aiResponse || '',
              parsed: c?.aiParsed || null,
              decision: c?.decision || null,
              decision_normalized: c?.decision_normalized || null,
              trading_decisions: c?.trading_decisions || null
            },
            
            // 思维链追踪（包含技术分析数据）
            cot_trace: {
              action: action,
              symbol: symbol,
              reasoning: reasoning,
              analysis: c?.aiParsed?.analysis || null,
              account_management: c?.aiParsed?.account_management || null,
              chain_of_thought: c?.chain_of_thought || null
            },
            
            // 账户状态
            account: {
              accountValue: c?.accountValue || 0,
              totalReturn: c?.totalReturn || 0
            },
            
            // 完整的原始数据（用于详细展示）
            raw: c
          });
          
          if (items.length >= 100) break;  // 限制每个Bot返回数量
        }
        
        return items;
      } catch (_) {
        return [];
      }
    }

    // 聚合所有Bot的对话数据
    for (const bot of bots) {
      try {
        const stateManager = new BotStateManager(bot.id);
        const convFile = stateManager.getConversationsFilePath();
        const items = await readConv(convFile, bot.id, bot.model || '', bot.name || bot.id);
        allItems.push(...items);
      } catch (e) {
        console.warn(`[Conversations API] 读取Bot ${bot.id} 对话数据失败:`, e.message);
      }
    }
    
    // 如果从Bot数据中没有获取到，尝试全局数据
    if (allItems.length === 0) {
      try { 
        const items = await readConv(CONV_FILE, 'default', '', 'default');
        allItems.push(...items);
      } catch (_) {}
      if (!allItems.length) {
        const TEST_CONV = path.join(TEST_DIR, 'trading-conversations.json');
        try { 
          const items = await readConv(TEST_CONV, 'default', '', 'default');
          allItems.push(...items);
        } catch (_) {}
      }
    }
    
    // 按时间戳排序（最新的在前）
    allItems.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    return res.json({ conversations: allItems });
  } catch (e) {
    console.error('Conversations API error:', e);
    return res.json({ conversations: [] });
  }
});

router.get('/analytics', async (req, res) => {
  const analytics = await loadJson('analytics.json', { analytics: [] });
  if (Array.isArray(analytics.analytics) && analytics.analytics.length > 0) {
    return res.json(analytics);
  }
  try {
    const buf = await fs.readFile(CONV_FILE, 'utf8');
    const raw = JSON.parse(buf);
    const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
    const latest = arr[0] || null;
    let summary = '';
    if (latest) {
      summary = String(
        latest?.aiParsed?.analysis?.market_summary ||
        latest?.decision_normalized?.reasoning ||
        (latest?.aiResponse ? String(latest.aiResponse).slice(0, 400) : '')
      );
    }
    const out = { analytics: [ { type: 'summary', model_id: 'default', text: summary } ] };
    // 将推导结果写回文件，便于前端与其他端点复用
    try { await saveJson('analytics.json', out); } catch (_) {}
    return res.json(out);
  } catch (_) {
    return res.json({ analytics: [] });
  }
});

// Prompts read/write
router.get('/prompts', async (req, res) => {
  const prompts = await loadJson('prompts.json', { system: '', user: '' });
  res.json(prompts);
});

router.post('/prompts', async (req, res) => {
  const body = req.body || {};
  const next = { system: String(body.system || ''), user: String(body.user || '') };
  await saveJson('prompts.json', next);
  res.json(next);
});

// AI prompts via files (system/user templates)
const AI_BASE_DIR = path.resolve(__dirname, '..', '..', 'ai', 'ai-trading');
const TPL_DIR = path.join(AI_BASE_DIR, 'prompt_templates');
const SYS_TPL = path.join(TPL_DIR, 'system_prompt.txt');
const USER_TPL = path.join(TPL_DIR, 'user_prompt.hbs');
const CFG_FILE = path.join(AI_BASE_DIR, 'config.json');

router.get('/ai/prompts', async (req, res) => {
  try {
    const env = String(req.query.env || '').toLowerCase();
    const isFutures = env === 'demo-futures' || env === 'futures';
    
    // 根据环境选择模板路径
    let sysPath = SYS_TPL;
    let userPath = USER_TPL;
    
  if (env && (env === 'demo-futures' || env === 'futures')) {
      sysPath = path.join(TPL_DIR, 'futures', 'system_prompt.txt');
      userPath = path.join(TPL_DIR, 'futures', 'user_prompt.hbs');
    } else if (env && (env === 'test-spot' || env === 'demo-spot' || env === 'spot')) {
      sysPath = path.join(TPL_DIR, 'spot', 'system_prompt.txt');
      userPath = path.join(TPL_DIR, 'spot', 'user_prompt.hbs');
    }
    
    const [sys, user] = await Promise.all([
      fs.readFile(sysPath, 'utf8').catch(() => ''),
      fs.readFile(userPath, 'utf8').catch(() => ''),
    ]);
    res.json({ system: sys, user, env: env || 'default' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.post('/ai/prompts', async (req, res) => {
  try {
    const body = req.body || {};
    const system = String(body.system || '');
    const user = String(body.user || '');
    const env = String(body.env || '').toLowerCase();
    
    // 根据环境选择保存路径
    let sysPath = SYS_TPL;
    let userPath = USER_TPL;
    
  if (env && (env === 'demo-futures' || env === 'futures')) {
      sysPath = path.join(TPL_DIR, 'futures', 'system_prompt.txt');
      userPath = path.join(TPL_DIR, 'futures', 'user_prompt.hbs');
    } else if (env && (env === 'test-spot' || env === 'demo-spot' || env === 'spot')) {
      sysPath = path.join(TPL_DIR, 'spot', 'system_prompt.txt');
      userPath = path.join(TPL_DIR, 'spot', 'user_prompt.hbs');
    }
    
    await fs.mkdir(path.dirname(sysPath), { recursive: true }).catch(() => {});
    await Promise.all([
      fs.writeFile(sysPath, system, 'utf8'),
      fs.writeFile(userPath, user, 'utf8'),
      // keep a JSON mirror for legacy UI
      saveJson('prompts.json', { system, user }),
    ]);
    res.json({ system, user, env: env || 'default' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Diff between current templates and proposed ones
router.post('/ai/prompt/diff', async (req, res) => {
  try {
    const body = req.body || {};
    const botId = body.botId;
    const nextSys = String(body.system || '');
    const nextUsr = String(body.user || '');
    
    let curSys = '';
    let curUsr = '';
    
    // 如果提供了botId，加载Bot对应的Prompt
    if (botId) {
      const botConfig = await botConfigManager.getBotById(botId);
      if (botConfig) {
        const { PromptManager } = await import('../services/prompts/prompt-manager.js');
        const promptManager = new PromptManager(botConfig);
        curSys = await promptManager.loadSystemPrompt() || '';
        curUsr = await promptManager.loadUserPrompt() || '';
      }
    }
    
    // 如果没有botId或Bot不存在，使用默认模板
    if (!curSys && !curUsr) {
      curSys = await fs.readFile(SYS_TPL, 'utf8').catch(() => '');
      curUsr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    }
    function simpleDiff(a, b) {
      const al = String(a).split(/\r?\n/);
      const bl = String(b).split(/\r?\n/);
      const max = Math.max(al.length, bl.length);
      const out = [];
      for (let i = 0; i < max; i++) {
        const L = al[i] ?? '';
        const R = bl[i] ?? '';
        if (L === R) out.push(`  ${L}`);
        else {
          if (L) out.push(`- ${L}`);
          if (R) out.push(`+ ${R}`);
        }
      }
      return out.join('\n');
    }
    res.json({
      system_diff: simpleDiff(curSys, nextSys),
      user_diff: simpleDiff(curUsr, nextUsr)
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Apply proposed templates with timestamped backup
router.post('/ai/prompt/apply', async (req, res) => {
  try {
    const nextSys = String(req.body?.system || '');
    const nextUsr = String(req.body?.user || '');
    await fs.mkdir(TPL_DIR, { recursive: true }).catch(() => {});
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    // backup
    const curSys = await fs.readFile(SYS_TPL, 'utf8').catch(() => '');
    const curUsr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    if (curSys) await fs.writeFile(`${SYS_TPL}.${ts}.bak`, curSys, 'utf8');
    if (curUsr) await fs.writeFile(`${USER_TPL}.${ts}.bak`, curUsr, 'utf8');
    // write new
    await fs.writeFile(SYS_TPL, nextSys, 'utf8');
    await fs.writeFile(USER_TPL, nextUsr, 'utf8');
    // mirror json
    await saveJson('prompts.json', { system: nextSys, user: nextUsr });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Revert to the latest .bak
router.post('/ai/prompt/revert', async (req, res) => {
  try {
    async function latestBak(base) {
      const dir = path.dirname(base);
      const name = path.basename(base);
      const entries = await fs.readdir(dir).catch(() => []);
      const baks = entries.filter((f) => f.startsWith(name + '.') && f.endsWith('.bak'));
      if (!baks.length) return null;
      const stats = await Promise.all(
        baks.map(async (f) => ({ f, s: await fs.stat(path.join(dir, f)).catch(() => ({ mtimeMs: 0 })) }))
      );
      stats.sort((a, b) => b.s.mtimeMs - a.s.mtimeMs);
      return path.join(dir, stats[0].f);
    }
    const sysBak = await latestBak(SYS_TPL);
    const usrBak = await latestBak(USER_TPL);
    if (!sysBak && !usrBak) return res.status(404).json({ error: 'no_backup' });
    if (sysBak) {
      const c = await fs.readFile(sysBak, 'utf8');
      await fs.writeFile(SYS_TPL, c, 'utf8');
    }
    if (usrBak) {
      const c = await fs.readFile(usrBak, 'utf8');
      await fs.writeFile(USER_TPL, c, 'utf8');
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Extract placeholders from user template
router.get('/ai/prompt/placeholders', async (req, res) => {
  try {
    const usr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    const m = Array.from(usr.matchAll(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g)).map((x) => x[1]);
    const unique = Array.from(new Set(m));
    res.json({ placeholders: unique });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Capabilities compact object (static without live exchange)
router.get('/ai/capabilities/compact', async (req, res) => {
  try {
    const cfg = JSON.parse(await fs.readFile(CFG_FILE, 'utf8'));
    const out = {
      exchange: { id: 'binance', name: 'Binance', futures: cfg.trading_env?.includes('futures') || false, marketType: cfg.trading_env || 'demo-futures' },
      timeframes: ['1m','3m','5m','15m','1h','4h','1d'],
      api_has: { fetchOHLCV: true, fetchTicker: true, fetchBalance: true, fetchPositions: true, createOrder: true, fetchOrder: true },
      schemas: {
        ticker: { symbol: 'string', last: 'number', bid: 'number', ask: 'number', baseVolume: 'number', quoteVolume: 'number' },
        ohlcv: ['ts','open','high','low','close','volume'],
        balance: { USDT: { free: 'number', used: 'number', total: 'number' } },
        position: { symbol: 'string', contracts: 'number', entryPrice: 'number', markPrice: 'number', liquidationPrice: 'number', unrealizedPnl: 'number' }
      },
      tradable_symbols: Array.isArray(cfg.allowed_symbols) ? cfg.allowed_symbols : []
    };
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.get('/ai/config', async (req, res) => {
  try {
    const raw = await fs.readFile(CFG_FILE, 'utf8');
    res.json(JSON.parse(raw));
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.post('/ai/config', async (req, res) => {
  try {
    const body = req.body || {};
    await fs.mkdir(AI_BASE_DIR, { recursive: true }).catch(() => {});
    await fs.writeFile(CFG_FILE, JSON.stringify(body, null, 2), 'utf8');
    res.json(body);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Suggest prompts via LLM using config presets
router.post('/ai/prompt/suggest', async (req, res) => {
  try {
    const body = req.body || {};
    const botId = body.botId;
    const cfg = JSON.parse(await fs.readFile(CFG_FILE, 'utf8'));
    
    let sys = '';
    let usr = '';
    let botConfig = null;
    let aiKey = cfg.ai?.api_key || '';
    let provider = cfg.ai?.provider || 'dashscope';
    let model = cfg.ai?.model || 'qwen3-plus';
    let temperature = cfg.ai?.temperature ?? 0.7;
    let enable_thinking = false;
    let env = cfg.trading_env || 'demo-futures';
    
    // 如果提供了botId，加载Bot对应的Prompt和配置
    if (botId) {
      botConfig = await botConfigManager.getBotById(botId);
      if (botConfig) {
        env = botConfig.env;
        // 加载Bot的AI配置
        const { resolveAIConfig } = await import('../services/bots/bot-config-manager.js');
        const aiConfig = await resolveAIConfig(botConfig, cfg);
        aiKey = aiConfig.api_key;
        provider = aiConfig.provider;
        model = aiConfig.model;
        temperature = aiConfig.temperature;
        enable_thinking = aiConfig.enable_thinking || false;
        
        // 加载Bot的Prompt
        const { PromptManager } = await import('../services/prompts/prompt-manager.js');
        const promptManager = new PromptManager(botConfig);
        sys = await promptManager.loadSystemPrompt() || '';
        usr = await promptManager.loadUserPrompt() || '';
      }
    }
    
    // 如果没有botId或Bot不存在，使用默认模板
    if (!sys && !usr) {
      sys = await fs.readFile(SYS_TPL, 'utf8').catch(() => '');
      usr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    }

    const context = {
      environment: env,
      allowed_symbols: cfg.allowed_symbols,
      data: cfg.data,
      current_templates: { system: sys, user: usr },
      bot_id: botId || null,
      bot_name: botConfig?.name || null,
      prompt_mode: botConfig?.promptMode || 'env-shared'
    };

    if (!aiKey) {
      // ? key ??????????????????
      return res.json({
        suggestion: {
          system_prompt_en: sys,
          user_prompt_en: usr,
          rationale_en: 'No API key provided; returning current templates as suggestion.',
          config_updates: null
        }
      });
    }

    const prompt = `You are a prompt engineer for a crypto trading agent. Given the JSON context below, propose improved English system and user prompts, and optional config_updates. Respond with strict JSON keys: system_prompt_en, user_prompt_en, rationale_en, config_updates.
\n\nCONTEXT:\n${JSON.stringify(context, null, 2)}`;

    // 使用百炼统一 API 客户端
    const { callBailianAPI } = await import('../services/ai/bailian-client.js');
    const result = await callBailianAPI(aiKey, model, [
      { role: 'system', content: 'You return ONLY valid JSON. No prose.' },
      { role: 'user', content: prompt }
    ], {
      enable_thinking: enable_thinking,
      temperature: temperature,
      max_tokens: 1500,
      stream: false
    });
    
    const content = result.content || '{}';
    let suggestion;
    try { suggestion = JSON.parse(content); } catch (_) { suggestion = { system_prompt_en: sys, user_prompt_en: usr, rationale_en: 'Parse failed', config_updates: null }; }
    res.json({ suggestion });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Q&A about prompts/config/capabilities without changing templates
router.post('/ai/prompt/ask', async (req, res) => {
  try {
    const body = req.body || {};
    const botId = body.botId;
    const question = String(body.question || '').slice(0, 8000);
    const cfg = JSON.parse(await fs.readFile(CFG_FILE, 'utf8'));
    
    let sys = '';
    let usr = '';
    let botConfig = null;
    let aiKey = cfg.ai?.api_key || '';
    let model = cfg.ai?.model || 'qwen3-plus';
    let temperature = cfg.ai?.temperature ?? 0.4;
    let enable_thinking = false;
    let env = cfg.trading_env || 'demo-futures';
    
    // 如果提供了botId，加载Bot对应的Prompt和配置
    if (botId) {
      botConfig = await botConfigManager.getBotById(botId);
      if (botConfig) {
        env = botConfig.env;
        // 加载Bot的AI配置
        const { resolveAIConfig } = await import('../services/bots/bot-config-manager.js');
        const aiConfig = await resolveAIConfig(botConfig, cfg);
        aiKey = aiConfig.api_key;
        model = aiConfig.model;
        temperature = aiConfig.temperature;
        enable_thinking = aiConfig.enable_thinking || false;
        
        // 加载Bot的Prompt
        const { PromptManager } = await import('../services/prompts/prompt-manager.js');
        const promptManager = new PromptManager(botConfig);
        sys = await promptManager.loadSystemPrompt() || '';
        usr = await promptManager.loadUserPrompt() || '';
      }
    }
    
    // 如果没有botId或Bot不存在，使用默认模板
    if (!sys && !usr) {
      sys = await fs.readFile(SYS_TPL, 'utf8').catch(() => '');
      usr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    }
    
    const context = {
      environment: env,
      allowed_symbols: cfg.allowed_symbols,
      data: cfg.data,
      current_templates: { system: sys, user: usr },
      bot_id: botId || null,
      bot_name: botConfig?.name || null,
      prompt_mode: botConfig?.promptMode || 'env-shared'
    };
    if (!question) return res.status(400).json({ error: 'empty_question' });
    if (!aiKey) return res.json({ answer: null, disabled: true });
    const prompt = `You are a senior prompt engineer and trading systems architect. Answer user's question based on the JSON CONTEXT. Be concise and structured.\n\nCONTEXT:\n${JSON.stringify(context, null, 2)}\n\nUSER:\n${question}`;
    
    // 使用百炼统一 API 客户端
    const { callBailianAPI } = await import('../services/ai/bailian-client.js');
    const result = await callBailianAPI(aiKey, model, [
      { role: 'user', content: prompt }
    ], {
      enable_thinking: enable_thinking,
      temperature: temperature,
      max_tokens: 1200,
      stream: false
    });
    
    const content = result.content || null;
    res.json({ answer: content });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Apply config updates (deep merge shallowly for top-level and nested plain objects)
router.post('/ai/config/apply', async (req, res) => {
  try {
    const updates = req.body?.config_updates || {};
    const cfg = JSON.parse(await fs.readFile(CFG_FILE, 'utf8'));
    function merge(a, b) {
      if (Array.isArray(a) || Array.isArray(b) || typeof a !== 'object' || typeof b !== 'object' || !a || !b) return b;
      const out = { ...a };
      for (const k of Object.keys(b)) out[k] = k in a ? merge(a[k], b[k]) : b[k];
      return out;
    }
    const next = merge(cfg, updates);
    await fs.writeFile(CFG_FILE, JSON.stringify(next, null, 2), 'utf8');
    res.json(next);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Trading runner control
router.get('/ai/trading/status', async (req, res) => {
  res.json(tradingRunner.getStatus());
});

// ==================== API Key 管理 API ====================

// 获取所有可用 API Keys 及其占用状态
router.get('/api-keys', async (req, res) => {
  try {
    const { apiKeyManager } = await import('../services/api-key-manager.js');
    const apiKeys = apiKeyManager.getAllApiKeys();
    res.json({ apiKeys });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// ==================== Bot启动/停止API ====================

// 启动指定Bot
router.post('/bots/:botId/start', async (req, res) => {
  try {
    const { botId } = req.params;
    const bot = await botConfigManager.getBotById(botId);
    if (!bot) {
      return res.status(404).json({ error: `Bot '${botId}' 不存在` });
    }

    // 检查是否已在运行
    const existingStatus = tradingRunner.getBotStatus(botId);
    if (existingStatus?.running) {
      return res.json({ message: 'Bot已在运行', status: existingStatus });
    }

    // 分配AI模型API Key（若未显式指定dashscopeApiKey，则自动选择一个可用Key）
      try {
        const { apiKeyManager } = await import('../services/api-key-manager.js');
      let keyName = bot.dashscopeApiKey;
      if (!keyName) {
        // 1) 从 apiKeyManager 的候选集中挑选可用的
        const all = apiKeyManager.getAllApiKeys?.() || [];
        const firstFree = Array.isArray(all)
          ? all.find((k) => apiKeyManager.isApiKeyAvailable?.(k))
          : undefined;
        if (firstFree) keyName = firstFree;
        // 2) 回退：从环境变量中自动发现 DASHSCOPE_API_KEY_1..10
        if (!keyName) {
          for (let i = 1; i <= 10; i++) {
            const envName = `DASHSCOPE_API_KEY_${i}`;
            if (process.env[envName]) { keyName = envName; break; }
          }
        }
        // 3) 若找到可用key则写回配置（持久化），以便后续显示/释放
        if (keyName) {
          try { await botConfigManager.updateBot(botId, { dashscopeApiKey: keyName }); } catch (_) {}
        }
      }
      if (keyName) {
        apiKeyManager.allocateApiKey(botId, keyName);
        console.log(`[Bot启动] Bot ${botId} 已占用 API Key: ${keyName}`);
      } else {
        console.warn(`[Bot启动] 未找到可用的 DASHSCOPE_API_KEY，继续启动但可能无法调用模型`);
      }
      } catch (e) {
      console.error(`[Bot启动] API Key 分配流程异常:`, e.message);
      // 不阻断启动，让后续流程继续，但前端会看到无AI调用
    }

    const status = await tradingRunner.startBot(botId, bot);
    res.json(status);
  } catch (e) {
    // 如果启动失败，释放 API Key
    try {
      const { apiKeyManager } = await import('../services/api-key-manager.js');
      apiKeyManager.releaseApiKey(req.params.botId);
    } catch (_) {}
    
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// 停止指定Bot
router.post('/bots/:botId/stop', async (req, res) => {
  try {
    const { botId } = req.params;
    const status = tradingRunner.stopBot(botId);
    
    // 释放 API Key
    try {
      const { apiKeyManager } = await import('../services/api-key-manager.js');
      apiKeyManager.releaseApiKey(botId);
      console.log(`[Bot停止] Bot ${botId} 已释放 API Key`);
    } catch (e) {
      console.warn(`[Bot停止] 释放 API Key 失败:`, e.message);
    }
    
    res.json(status);
  } catch (e) {
    res.status(404).json({ error: String(e?.message || e) });
  }
});

// 获取指定Bot状态
router.get('/bots/:botId/status', async (req, res) => {
  try {
    const { botId } = req.params;
    const status = tradingRunner.getBotStatus(botId);
    if (!status) {
      return res.status(404).json({ error: `Bot '${botId}' 不存在` });
    }
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// 获取所有Bot状态
router.get('/bots/status/all', async (req, res) => {
  try {
    const statuses = tradingRunner.getAllBotStatuses();
    res.json({ bots: statuses });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// ==================== 运行中Bot数据服务（面向前端实时看板） ====================

// GET /runtime/bots → 返回正在运行的bot列表及精简状态
router.get('/runtime/bots', async (req, res) => {
  try {
    const runningIds = tradingRunner.getRunningBotIds();
    const out = [];
    for (const botId of runningIds) {
      const status = tradingRunner.getBotStatus(botId) || {};
      const bot = await botConfigManager.getBotById(botId);
      out.push({
        bot_id: botId,
        env: bot?.env || status.env || null,
        model: bot?.model || status.model || '',
        running: Boolean(status.running),
        pid: status.pid || null,
        startedAt: status.startedAt || null,
        intervalMinutes: status.intervalMinutes || bot?.intervalMinutes || null,
        tradingMode: bot?.tradingMode || null,
        botClass: bot?.botClass || null,
        name: bot?.name || botId
      });
    }
    res.json({ bots: out });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// GET /runtime/overview → 聚合所有运行中bot的账户、持仓、最近对话/成交（轻量）
router.get('/runtime/overview', async (req, res) => {
  try {
    const runningIds = tradingRunner.getRunningBotIds();
    const limit = Math.max(0, Math.min(50, Number(req.query.limit) || 20));
    const out = [];

    const { BotStateManager } = await import('../services/trading/bot-state-manager.js');

    for (const botId of runningIds) {
      const sm = new BotStateManager(botId);
      const [state, conversations, trades] = await Promise.all([
        sm.loadState(),
        sm.loadConversations(),
        sm.loadTrades()
      ]);
      const bot = await botConfigManager.getBotById(botId);
      out.push({
        bot_id: botId,
        env: bot?.env || null,
        model: bot?.model || '',
        name: bot?.name || botId,
        account: {
          accountValue: Number(state?.accountValue || 0),
          availableCash: Number(state?.availableCash || 0),
          totalReturn: Number(state?.totalReturn || 0),
          lastUpdate: state?.lastUpdate || null
        },
        positions: Array.isArray(state?.positions) ? state.positions : [],
        conversations: (conversations || []).slice(0, limit),
        trades: (trades || []).slice(0, limit)
      });
    }

    res.json({ overview: out, count: out.length });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// GET /runtime/bots/:botId/summary → 单个bot摘要
router.get('/runtime/bots/:botId/summary', async (req, res) => {
  try {
    const botId = req.params.botId;
    const limit = Math.max(0, Math.min(100, Number(req.query.limit) || 20));
    const { BotStateManager } = await import('../services/trading/bot-state-manager.js');
    const sm = new BotStateManager(botId);
    const [state, conversations, trades] = await Promise.all([
      sm.loadState(),
      sm.loadConversations(),
      sm.loadTrades()
    ]);
    const bot = await botConfigManager.getBotById(botId);
    const status = tradingRunner.getBotStatus(botId) || {};
    res.json({
      bot_id: botId,
      running: Boolean(status.running),
      env: bot?.env || null,
      model: bot?.model || '',
      name: bot?.name || botId,
      account: {
        accountValue: Number(state?.accountValue || 0),
        availableCash: Number(state?.availableCash || 0),
        totalReturn: Number(state?.totalReturn || 0),
        lastUpdate: state?.lastUpdate || null
      },
      positions: Array.isArray(state?.positions) ? state.positions : [],
      conversations: (conversations || []).slice(0, limit),
      trades: (trades || []).slice(0, limit)
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.post('/ai/trading/start', async (req, res) => {
  try {
    const { intervalMinutes = 3, env, ai } = req.body || {};
    // ?? backend/data ??????????????????
    const dataDir = path.resolve(process.cwd(), 'backend', 'data');
    await fs.mkdir(dataDir, { recursive: true }).catch(() => {});
    
    // 在启动时从交易所获取实际账户余额和BTC价格作为初始值
    let initialAccountValue = null;
    let initialBTCPrice = null;
    try {
      // 临时设置环境变量以便 getAccountBalance 使用
      if (env) process.env.TRADING_ENV = env;
      const balance = await getAccountBalance();
      if (balance && balance > 0) {
        initialAccountValue = balance;
        console.log(`启动时获取到的账户余额: ${initialAccountValue}`);
      } else {
        console.log('无法获取账户余额或余额为0，将不显示参考线');
      }
      
      // 获取初始BTC价格
      try {
        const prices = await getPrices(['BTC/USDT']);
        if (prices && prices['BTC/USDT'] && prices['BTC/USDT'].price) {
          initialBTCPrice = prices['BTC/USDT'].price;
          console.log(`启动时获取到的BTC价格: ${initialBTCPrice}`);
        }
      } catch (e) {
        console.error('获取初始BTC价格失败:', e.message);
      }
    } catch (e) {
      console.error('获取账户余额失败:', e.message);
    }
    
    // 检查并更新 trading-state.json，确保保存初始账户价值
    const stateFile = path.join(dataDir, 'trading-state.json');
    try {
      const existing = await loadJson('trading-state.json', null);
      if (existing && typeof existing === 'object') {
        // 如果文件已存在，只更新初始账户价值（如果还没有的话）和启动时间
        if (!existing.initialAccountValue) {
          existing.initialAccountValue = initialAccountValue;
        }
        // 保存初始BTC价格（用于计算BTC持有曲线）
        if (initialBTCPrice && !existing.initialBTCPrice) {
          existing.initialBTCPrice = initialBTCPrice;
          existing.initialBTCTimestamp = new Date().toISOString();
        }
        existing.startTime = new Date().toISOString();
        existing.tradingEnabled = true;
        existing.lastUpdate = new Date().toISOString();
        if (!existing.accountValue) {
          existing.accountValue = initialAccountValue;
        }
        await saveJson('trading-state.json', existing);
      } else {
        // 文件不存在，创建新的
        const newState = {
          startTime: new Date().toISOString(),
          invocationCount: 0,
          positions: [],
          lastUpdate: new Date().toISOString(),
          tradingEnabled: true,
        };
        // 只有在有初始值时才保存
        if (initialAccountValue) {
          newState.accountValue = initialAccountValue;
          newState.initialAccountValue = initialAccountValue;
        }
        // 保存初始BTC价格
        if (initialBTCPrice) {
          newState.initialBTCPrice = initialBTCPrice;
          newState.initialBTCTimestamp = new Date().toISOString();
        }
        await saveJson('trading-state.json', newState);
      }
    } catch (e) {
      console.error('更新 trading-state.json 失败:', e.message);
    }
    
    // 其他文件的初始化
    const seeds = [
      { file: path.join(dataDir, 'conversations.json'), content: { conversations: [], lastUpdate: new Date().toISOString() } },
      { file: path.join(dataDir, 'trades.json'), content: { trades: [] } },
    ];
    for (const s of seeds) {
      try { await fs.access(s.file); } catch { await fs.writeFile(s.file, JSON.stringify(s.content, null, 2), 'utf8'); }
    }
    const st = tradingRunner.start({ intervalMinutes, env, ai });
    res.json(st);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.post('/ai/trading/stop', async (req, res) => {
  try {
    const st = tradingRunner.stop();
    res.json(st);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// 重新加载Prompt模板（手动触发）
router.post('/ai/trading/reload-prompts', async (req, res) => {
  try {
    const { env } = req.body || {};
    if (!env) {
      return res.status(400).json({ error: 'env parameter is required' });
    }
    
    // 创建重载标记文件，让运行中的AI系统在下次运行时重新加载模板
    const dataDir = path.resolve(process.cwd(), 'backend', 'data');
    const reloadMarkerFile = path.join(dataDir, `.reload-prompts-${env}.marker`);
    
    // 写入标记文件（包含时间戳）
    await fs.writeFile(reloadMarkerFile, JSON.stringify({
      env,
      timestamp: new Date().toISOString(),
      triggeredBy: 'manual'
    }), 'utf8');
    
    res.json({ 
      success: true, 
      message: `已创建重载标记，运行中的 ${env} Bot将在下次交易循环时重新加载Prompt`,
      markerFile: reloadMarkerFile
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.post('/ai/trading/close-all-positions', async (req, res) => {
  try {
    // 先停止运行
    const st = tradingRunner.stop();
    // 这里可以添加实际平仓逻辑，目前先只停止运行
    res.json({ ...st, message: '已停止运行' });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Derived endpoints
router.get('/account-totals', async (req, res) => {
  const lastHourlyMarker = req.query.lastHourlyMarker ? Number(req.query.lastHourlyMarker) : undefined;
  
  // 聚合所有Bot的交易数据
  let allTrades = { trades: [] };
  try {
    const { botConfigManager } = await import('../services/bots/bot-config-manager.js');
    const bots = await botConfigManager.getAllBots();
    const { BotStateManager } = await import('../services/trading/bot-state-manager.js');
    
    for (const bot of bots) {
      try {
        const stateManager = new BotStateManager(bot.id);
        const tradesData = await stateManager.loadTrades();
        if (Array.isArray(tradesData) && tradesData.length > 0) {
        // 为每个交易添加bot_id和model_id（model_id现在存储bot_id用于兼容）
        const tradesWithModel = tradesData.map(t => ({
          ...t,
          model_id: bot.id, // 使用bot_id作为标识（保持兼容性）
          bot_id: bot.id,
          bot_name: bot.name || bot.id,
          model: bot.model || '' // 保留模型信息用于显示
        }));
          allTrades.trades.push(...tradesWithModel);
        }
      } catch (e) {
        console.warn(`[AccountTotals] 读取Bot ${bot.id} 交易数据失败:`, e.message);
      }
    }
    
    // 如果从Bot数据中没有获取到，尝试全局数据
    if (allTrades.trades.length === 0) {
      allTrades = await loadJson('trades.json', { trades: [] });
    }
  } catch (e) {
    console.warn('[AccountTotals] 聚合Bot交易数据失败，使用全局数据:', e.message);
    allTrades = await loadJson('trades.json', { trades: [] });
  }
  
  const totals = await deriveAccountTotals(allTrades, lastHourlyMarker);
  
  // 聚合所有Bot的账户数据和持仓
  const botAccountData = new Map(); // bot_id -> { accountValue, positions, initialAccountValue, initialBTCPrice, bot, model }
  
  try {
    const { botConfigManager } = await import('../services/bots/bot-config-manager.js');
    const bots = await botConfigManager.getAllBots();
    const { BotStateManager } = await import('../services/trading/bot-state-manager.js');
    
    for (const bot of bots) {
      try {
        const stateManager = new BotStateManager(bot.id);
        const state = await stateManager.loadState();
        if (state) {
          const positions = (state.positions || []).reduce((acc, p) => {
            const symbol = String(p?.symbol || '').toUpperCase();
            if (symbol) {
              const notional = Number(p?.notional_usd || 0) || Math.abs(Number(p?.quantity || 0)) * Number(p?.current_price || p?.entry_price || 0);
              acc[symbol] = {
                symbol,
                quantity: Number(p?.quantity || 0),
                entry_price: Number(p?.entry_price || 0),
                current_price: Number(p?.current_price || p?.entry_price || 0),
                liquidation_price: Number(p?.liquidation_price || 0),
                unrealized_pnl: Number(p?.unrealized_pnl || 0),
                leverage: Number(p?.leverage || 1),
                exit_plan: p?.exit_plan || null,
                confidence: Number(p?.confidence || 0),
                risk_usd: Number(p?.risk_usd || 0),
                margin: Number(p?.margin || 0) || (notional / Number(p?.leverage || 1)),
                notional_usd: notional,
                entry_time: Number(p?.entry_time || Math.floor(Date.now() / 1000)),
                entry_oid: Number(p?.entry_oid || 0),
              };
            }
            return acc;
          }, {});
          
          // 使用bot.id作为键，而不是modelId
          botAccountData.set(bot.id, {
            accountValue: state.accountValue || 0,
            positions: positions,
            initialAccountValue: state.initialAccountValue || state.accountValue || 0,
            initialBTCPrice: state.initialBTCPrice || null,
            bot: bot, // 保存完整的bot信息，便于后续使用
            model: bot.model || ''
          });
        }
      } catch (e) {
        console.warn(`[AccountTotals] 读取Bot ${bot.id} 状态失败:`, e.message);
      }
    }
  } catch (e) {
    console.warn('[AccountTotals] 聚合Bot账户数据失败:', e.message);
  }
  
  // 如果没有Bot数据，尝试全局数据（向后兼容）
  let latestPositions = {};
  let latestAccountValue = null;
  let initialAccountValue = null;
  let initialBTCPrice = null;
  
  if (botAccountData.size === 0) {
    try {
      const state = await loadJson('trading-state.json', { positions: [] });
      if (state?.accountValue) {
        latestAccountValue = Number(state.accountValue);
      }
      if (state?.initialAccountValue) {
        initialAccountValue = Number(state.initialAccountValue);
      } else if (state?.accountValue) {
        initialAccountValue = Number(state.accountValue);
      }
      if (state?.initialBTCPrice) {
        initialBTCPrice = Number(state.initialBTCPrice);
      }
      if (Array.isArray(state?.positions) && state.positions.length > 0) {
        for (const p of state.positions) {
          const symbol = String(p?.symbol || '').toUpperCase();
          if (symbol) {
            const notional = Number(p?.notional_usd || 0) || Math.abs(Number(p?.quantity || 0)) * Number(p?.current_price || p?.entry_price || 0);
            latestPositions[symbol] = {
              symbol,
              quantity: Number(p?.quantity || 0),
              entry_price: Number(p?.entry_price || 0),
              current_price: Number(p?.current_price || p?.entry_price || 0),
              liquidation_price: Number(p?.liquidation_price || 0),
              unrealized_pnl: Number(p?.unrealized_pnl || 0),
              leverage: Number(p?.leverage || 1),
              exit_plan: p?.exit_plan || null,
              confidence: Number(p?.confidence || 0),
              risk_usd: Number(p?.risk_usd || 0),
              margin: notional / Number(p?.leverage || 1),
              notional_usd: notional,
              entry_time: Math.floor(Date.now() / 1000),
              entry_oid: Number(p?.entry_oid || 0),
            };
          }
        }
      }
    } catch (e) {
      console.warn('读取全局 trading-state.json 失败:', e.message);
    }
  }
  
  // 从conversations中提取BTC价格历史的辅助函数
  function extractBTCPrice(userPrompt) {
    if (!userPrompt) return null;
    // 从userPrompt中提取 current_price = 109695.40 格式的BTC价格
    const match = userPrompt.match(/ALL BTC DATA[\s\S]*?current_price\s*=\s*([\d.]+)/);
    return match ? Number(match[1]) : null;
  }

  // 为每个Bot生成账户时间序列（从conversations）
  const botConversations = new Map(); // bot_id -> { conversations, bot }
  
  try {
    const { botConfigManager } = await import('../services/bots/bot-config-manager.js');
    const bots = await botConfigManager.getAllBots();
    const { BotStateManager } = await import('../services/trading/bot-state-manager.js');
    
    for (const bot of bots) {
      try {
        const stateManager = new BotStateManager(bot.id);
        const conversations = await stateManager.loadConversations();
        if (Array.isArray(conversations) && conversations.length > 0) {
          // 使用bot.id作为键，而不是modelId
          botConversations.set(bot.id, { conversations, bot });
        }
      } catch (e) {
        console.warn(`[AccountTotals] 读取Bot ${bot.id} 对话数据失败:`, e.message);
      }
    }
  } catch (e) {
    console.warn('[AccountTotals] 聚合Bot对话数据失败:', e.message);
  }
  
  // 如果没有totals数据，从Bot的conversations生成
  if (!totals || totals.length === 0) {
    const series = [];
    
    // 从Bot的conversations生成时间序列
    for (const [botId, { conversations, bot }] of botConversations.entries()) {
      const botData = botAccountData.get(botId);
      const botPositions = botData?.positions || {};
      const botName = bot?.name || botId;
      const model = bot?.model || '';
      
      const modelSeries = conversations.slice().reverse().map(c => {
        const ts = Math.floor(new Date(c?.timestamp || Date.now()).getTime() / 1000);
        const equity = Number(c?.accountValue || botData?.accountValue || 0);
        if (!Number.isFinite(equity)) return null;
        const btcPrice = extractBTCPrice(c?.userPrompt);
        return {
          model_id: botId, // 使用bot_id作为标识（保持兼容性）
          bot_id: botId,
          bot_name: botName,
          model: model, // 保留模型信息用于显示
          timestamp: ts,
          dollar_equity: equity,
          since_inception_hourly_marker: Math.floor(ts / 3600),
          positions: botPositions,
          btc_price: btcPrice || undefined,
        };
      }).filter(item => item !== null);
      
      series.push(...modelSeries);
    }
    
    // 如果没有Bot数据，尝试全局conversations（向后兼容）
    if (series.length === 0) {
      try {
        const buf = await fs.readFile(CONV_FILE, 'utf8');
        const raw = JSON.parse(buf);
        const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
        const defaultSeries = arr.slice().reverse().map(c => {
          const ts = Math.floor(new Date(c?.timestamp || Date.now()).getTime() / 1000);
          const equity = Number(c?.accountValue);
          if (!Number.isFinite(equity)) return null;
          const btcPrice = extractBTCPrice(c?.userPrompt);
        return {
          model_id: 'default', // 使用bot_id作为标识（保持兼容性）
          bot_id: 'default',
          bot_name: 'default',
          model: '', // 保留模型信息用于显示
          timestamp: ts,
          dollar_equity: equity,
          since_inception_hourly_marker: Math.floor(ts / 3600),
          positions: latestPositions,
          btc_price: btcPrice || undefined,
        };
        }).filter(item => item !== null);
        series.push(...defaultSeries);
      } catch (_) {}
    }
    
    if (series.length > 0) {
      // 获取初始值（从第一个Bot或全局数据）
      let initialAcctValue = undefined;
      let initialBTC = undefined;
      if (botAccountData.size > 0) {
        const firstBotData = Array.from(botAccountData.values())[0];
        initialAcctValue = firstBotData?.initialAccountValue;
        initialBTC = firstBotData?.initialBTCPrice;
      } else {
        initialAcctValue = initialAccountValue;
        initialBTC = initialBTCPrice;
      }
      
      return res.json({ 
        accountTotals: series,
        initialAccountValue: initialAcctValue || undefined,
        initialBTCPrice: initialBTC || undefined,
      });
    }
    
    // 如果完全没有数据，返回空数组
    return res.json({
      accountTotals: [],
      initialAccountValue: undefined
    });
  }
  
  // 为现有的 totals 也附加持仓信息和更新最新净值，以及BTC价格
  if (totals && totals.length > 0) {
    // 按bot_id分组totals（model_id现在存储的是bot_id）
    const totalsByBot = new Map();
    for (const item of totals) {
      const botId = item.model_id || item.bot_id || 'default'; // model_id现在存储的是bot_id
      if (!totalsByBot.has(botId)) {
        totalsByBot.set(botId, []);
      }
      totalsByBot.get(botId).push(item);
    }
    
    // 为每个bot的totals附加对应的持仓信息
    for (const [botId, botTotals] of totalsByBot.entries()) {
      const botData = botAccountData.get(botId);
      const botPositions = botData?.positions || (botId === 'default' ? latestPositions : {});
      const botAccountValue = botData?.accountValue || (botId === 'default' ? latestAccountValue : null);
      
      // 更新每个item的持仓信息
      for (const item of botTotals) {
        // 确保item有bot_id字段
        if (!item.bot_id) {
          item.bot_id = botId;
        }
        
        // 如果这是最新的记录，附加当前持仓
        if (item === botTotals[botTotals.length - 1]) {
          item.positions = botPositions;
          if (botAccountValue != null && Number.isFinite(botAccountValue)) {
            item.dollar_equity = botAccountValue;
            item.timestamp = Math.floor(Date.now() / 1000);
          }
        } else {
          // 历史记录也可以附加持仓（可选）
          item.positions = botPositions;
        }
      }
    }

    // 追加：确保运行中的每个bot至少有一条当前快照（用于前端按 bot_id 展示）
    for (const [botId, data] of botAccountData.entries()) {
      if (!totalsByBot.has(botId)) {
        const nowTs = Math.floor(Date.now() / 1000);
        totals.push({
          model_id: botId, // 兼容前端现有逻辑
          bot_id: botId,
          id: botId,
          bot_name: data?.bot?.name || botId,
          model: data?.model || '',
          timestamp: nowTs,
          dollar_equity: data?.accountValue || 0,
          equity: data?.accountValue || 0,
          account_value: data?.accountValue || 0,
          positions: data?.positions || {},
          realized_pnl: 0,
          total_unrealized_pnl: 0,
        });
      }
    }
    
    // 尝试从conversations中提取BTC价格历史
    let btcPriceMap = new Map();
    for (const [botId, { conversations }] of botConversations.entries()) {
      for (const c of conversations) {
        const ts = Math.floor(new Date(c?.timestamp || Date.now()).getTime() / 1000);
        const btcPrice = extractBTCPrice(c?.userPrompt);
        if (btcPrice && !btcPriceMap.has(ts)) {
          btcPriceMap.set(ts, btcPrice);
        }
      }
    }
    
    // 为每个totals项附加BTC价格（如果存在）
    for (const item of totals) {
      const ts = item.timestamp;
      let closestPrice = null;
      let minDiff = Infinity;
      for (const [priceTs, price] of btcPriceMap.entries()) {
        const diff = Math.abs(priceTs - ts);
        if (diff < minDiff && diff < 3600) {
          minDiff = diff;
          closestPrice = price;
        }
      }
      if (closestPrice) {
        item.btc_price = closestPrice;
      }
    }
    
    // 为最后一个点添加当前BTC价格（如果还没有）
    if (totals.length > 0) {
      const latest = totals[totals.length - 1];
      if (!latest.btc_price) {
        try {
          const prices = await getPrices(['BTC/USDT']);
          if (prices && prices['BTC/USDT'] && prices['BTC/USDT'].price) {
            latest.btc_price = prices['BTC/USDT'].price;
          }
        } catch (e) {
          console.warn('获取当前BTC价格失败:', e.message);
        }
      }
    }
  }
  
  // 获取初始值（从第一个Bot或全局数据）
  let initialAcctValue = undefined;
  let initialBTC = undefined;
  if (botAccountData.size > 0) {
    const firstBotData = Array.from(botAccountData.values())[0];
    initialAcctValue = firstBotData?.initialAccountValue;
    initialBTC = firstBotData?.initialBTCPrice;
  } else {
    initialAcctValue = initialAccountValue;
    initialBTC = initialBTCPrice;
  }
  
  res.json({ 
    accountTotals: totals,
    initialAccountValue: initialAcctValue || undefined,
    initialBTCPrice: initialBTC || undefined,
  });
});

router.get('/leaderboard', async (req, res) => {
  try {
    // 聚合所有Bot的交易数据
    let allTrades = { trades: [] };
    const { botConfigManager } = await import('../services/bots/bot-config-manager.js');
    const bots = await botConfigManager.getAllBots();
    const { BotStateManager } = await import('../services/trading/bot-state-manager.js');
    
    for (const bot of bots) {
      try {
        const stateManager = new BotStateManager(bot.id);
        const tradesData = await stateManager.loadTrades();
        if (Array.isArray(tradesData) && tradesData.length > 0) {
          const tradesWithModel = tradesData.map(t => ({
            ...t,
            model_id: bot.id, // 使用bot_id作为标识（保持兼容性）
            bot_id: bot.id,
            bot_name: bot.name || bot.id,
            model: bot.model || '' // 保留模型信息用于显示
          }));
          allTrades.trades.push(...tradesWithModel);
        }
      } catch (e) {
        console.warn(`[Leaderboard] 读取Bot ${bot.id} 交易数据失败:`, e.message);
      }
    }
    
    if (allTrades.trades.length === 0) {
      allTrades = await loadJson('trades.json', { trades: [] });
    }
    
    let leaderboard = await deriveLeaderboard(allTrades);

    // 补齐：确保所有“运行中的 bot”至少占一行（即使暂无成交）
    try {
      const runningIds = tradingRunner.getRunningBotIds();
      const present = new Set((leaderboard || []).map((r) => String(r.id)));
      const { BotStateManager } = await import('../services/trading/bot-state-manager.js');
      const addRows = [];
      for (const botId of runningIds) {
        if (present.has(String(botId))) continue;
        try {
          const sm = new BotStateManager(botId);
          const state = await sm.loadState();
          addRows.push({
            id: botId,
            equity: Number(state?.accountValue || 0),
            return_pct: undefined,
            num_trades: 0,
            sharpe: undefined,
          });
        } catch (_) {}
      }
      if (addRows.length) leaderboard = [...(leaderboard || []), ...addRows];
    } catch (_) {}

    res.json({ leaderboard });
  } catch (e) {
    console.error('[Leaderboard] 错误:', e);
    res.json({ leaderboard: [] });
  }
});

router.get('/since-inception-values', async (req, res) => {
  try {
    // 聚合所有Bot的交易数据
    let allTrades = { trades: [] };
    const { botConfigManager } = await import('../services/bots/bot-config-manager.js');
    const bots = await botConfigManager.getAllBots();
    const { BotStateManager } = await import('../services/trading/bot-state-manager.js');
    
    for (const bot of bots) {
      try {
        const stateManager = new BotStateManager(bot.id);
        const tradesData = await stateManager.loadTrades();
        if (Array.isArray(tradesData) && tradesData.length > 0) {
          const tradesWithModel = tradesData.map(t => ({
            ...t,
            model_id: bot.id, // 使用bot_id作为标识（保持兼容性）
            bot_id: bot.id,
            bot_name: bot.name || bot.id,
            model: bot.model || '' // 保留模型信息用于显示
          }));
          allTrades.trades.push(...tradesWithModel);
        }
      } catch (e) {
        console.warn(`[SinceInception] 读取Bot ${bot.id} 交易数据失败:`, e.message);
      }
    }
    
    if (allTrades.trades.length === 0) {
      allTrades = await loadJson('trades.json', { trades: [] });
    }
    
    const out = await deriveSinceInception(allTrades);
    res.json(out);
  } catch (e) {
    console.error('[SinceInception] 错误:', e);
    res.json({});
  }
});

// 实时数据端点：直接从币安API获取
router.get('/realtime', async (req, res) => {
  try {
    const realTimeData = await getRealTimeAccountData();
    if (!realTimeData) {
      // 如果实时获取失败，降级到trading-state.json
      const state = await loadJson('trading-state.json', {});
      return res.json({
        balance: state.accountValue || 0,
        availableCash: state.availableCash || 0,
        positions: state.positions || [],
        source: 'fallback',
      });
    }
    return res.json({
      ...realTimeData,
      source: 'realtime',
    });
  } catch (e) {
    console.error('获取实时数据失败:', e.message);
    // 降级到trading-state.json
    try {
      const state = await loadJson('trading-state.json', {});
      res.json({
        balance: state.accountValue || 0,
        availableCash: state.availableCash || 0,
        positions: state.positions || [],
        source: 'fallback',
      });
    } catch (_) {
      res.json({
        balance: 0,
        availableCash: 0,
        positions: [],
        source: 'error',
      });
    }
  }
});

router.get('/positions', async (req, res) => {
  try {
    // 加载所有Bot配置
    const { botConfigManager } = await import('../services/bots/bot-config-manager.js');
    const bots = await botConfigManager.getAllBots();
    
    // 优先尝试实时数据
    try {
      const realTimeData = await getRealTimeAccountData();
      if (realTimeData && realTimeData.positions && realTimeData.positions.length > 0) {
        // 将实时数据映射到第一个运行的Bot
        const runningBots = bots.filter(b => {
          const status = tradingRunner.getBotStatus(b.id);
          return status?.running;
        });
        if (runningBots.length > 0) {
          const bot = runningBots[0];
          const { BotStateManager } = await import('../services/trading/bot-state-manager.js');
          const stateManager = new BotStateManager(bot.id);
          const state = await stateManager.loadState();
          if (state?.positions) {
            return res.json({ accountTotals: [{
              model_id: bot.id, // 使用bot_id作为标识
              id: bot.id,
              bot_id: bot.id,
              bot_name: bot.name || bot.id,
              model: bot.model || '', // 保留模型信息用于显示
              timestamp: Date.now() / 1000,
              positions: state.positions.reduce((acc, p) => {
                acc[p.symbol || ''] = {
                  symbol: String(p?.symbol || ''),
                  quantity: Number(p?.quantity || 0),
                  entry_price: Number(p?.entry_price || 0),
                  current_price: Number(p?.current_price || p?.entry_price || 0),
                  liquidation_price: Number(p?.liquidation_price || 0),
                  unrealized_pnl: Number(p?.unrealized_pnl || 0),
                  leverage: Number(p?.leverage || 1),
                  exit_plan: p?.exit_plan || null,
                  confidence: Number(p?.confidence || 0),
                  risk_usd: Number(p?.risk_usd || 0),
                  entry_oid: p?.entry_oid || 0,
                  entry_time: p?.entry_time || Date.now() / 1000,
                  margin: Number(p?.margin || 0),
                  notional_usd: Number(p?.notional_usd || (Math.abs(p?.quantity || 0) * (p?.current_price || p?.entry_price || 0)))
                };
                return acc;
              }, {})
            }]});
          }
        }
      }
    } catch (_) {
      // 继续使用Bot数据聚合逻辑
    }
    
    // 聚合所有Bot的持仓数据
    const accountTotals = [];
    const { BotStateManager } = await import('../services/trading/bot-state-manager.js');
    
    for (const bot of bots) {
      try {
        const stateManager = new BotStateManager(bot.id);
        const state = await stateManager.loadState();
        if (state?.positions && Array.isArray(state.positions) && state.positions.length > 0) {
          const positions = state.positions.reduce((acc, p) => {
            acc[p.symbol || `POS_${Math.random()}`] = {
              symbol: String(p?.symbol || ''),
              quantity: Number(p?.quantity || 0),
              entry_price: Number(p?.entry_price || 0),
              current_price: Number(p?.current_price || p?.entry_price || 0),
              liquidation_price: Number(p?.liquidation_price || 0),
              unrealized_pnl: Number(p?.unrealized_pnl || 0),
              leverage: Number(p?.leverage || 1),
              exit_plan: p?.exit_plan || null,
              confidence: Number(p?.confidence || 0),
              risk_usd: Number(p?.risk_usd || 0),
              entry_oid: p?.entry_oid || 0,
              entry_time: p?.entry_time || Date.now() / 1000,
              margin: Number(p?.margin || 0),
              notional_usd: Number(p?.notional_usd || (Math.abs(p?.quantity || 0) * (p?.current_price || p?.entry_price || 0)))
            };
            return acc;
          }, {});
          
          accountTotals.push({
            model_id: bot.id, // 使用bot_id作为标识
            id: bot.id,
            bot_id: bot.id, // 明确标识这是bot_id
            bot_name: bot.name || bot.id,
            model: bot.model || '', // 保留模型信息用于显示
            timestamp: Date.now() / 1000,
            positions: positions,
            dollar_equity: state.accountValue || 0,
            equity: state.accountValue || 0,
            account_value: state.accountValue || 0,
            total_return: state.totalReturn || 0,
            realized_pnl: state.realizedPnL || 0
          });
        }
      } catch (e) {
        console.warn(`[Positions API] 读取Bot ${bot.id} 数据失败:`, e.message);
      }
    }
    
    // 如果从Bot数据中没有获取到，尝试全局数据
    if (accountTotals.length === 0) {
      try {
        const state = await loadJson('trading-state.json', { positions: [] });
        const positions = Array.isArray(state?.positions) ? state.positions : [];
        if (positions.length > 0) {
          const posMap = positions.reduce((acc, p) => {
            acc[p.symbol || `POS_${Math.random()}`] = {
              symbol: String(p?.symbol || ''),
              quantity: Number(p?.quantity || 0),
              entry_price: Number(p?.entry_price || 0),
              current_price: Number(p?.current_price || p?.entry_price || 0),
              liquidation_price: Number(p?.liquidation_price || 0),
              unrealized_pnl: Number(p?.unrealized_pnl || 0),
              leverage: Number(p?.leverage || 1),
              exit_plan: p?.exit_plan || null,
              confidence: Number(p?.confidence || 0),
              risk_usd: Number(p?.risk_usd || 0),
              entry_oid: 0,
              entry_time: Date.now() / 1000,
              margin: 0,
              notional_usd: Math.abs(p?.quantity || 0) * (p?.current_price || p?.entry_price || 0)
            };
            return acc;
          }, {});
          
          accountTotals.push({
            model_id: 'default', // 使用bot_id作为标识（保持兼容性）
            id: 'default',
            bot_id: 'default',
            bot_name: 'default',
            model: '', // 保留模型信息用于显示
            timestamp: Date.now() / 1000,
            positions: posMap,
            dollar_equity: state.accountValue || 0,
            equity: state.accountValue || 0,
            account_value: state.accountValue || 0,
            total_return: state.totalReturn || 0,
            realized_pnl: 0
          });
        }
      } catch (_) {}
    }
    
    return res.json({ accountTotals });
  } catch (e) {
    console.error('[Positions API] 错误:', e);
    res.json({ accountTotals: [] });
  }
});

// ==================== Bot管理API ====================

// 获取所有Bot配置
router.get('/bots', async (req, res) => {
  try {
    const bots = await botConfigManager.getAllBots();
    res.json({ bots });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// 根据ID获取Bot配置
router.get('/bots/:botId', async (req, res) => {
  try {
    const { botId } = req.params;
    const bot = await botConfigManager.getBotById(botId);
    if (!bot) {
      return res.status(404).json({ error: `Bot '${botId}' 不存在` });
    }
    res.json(bot);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// 创建新Bot
router.post('/bots', async (req, res) => {
  try {
    const botConfig = req.body;
    
    // 如果提供了 dashscopeApiKey，验证其可用性（但不占用，占用发生在启动时）
    if (botConfig.dashscopeApiKey) {
      try {
        const { apiKeyManager } = await import('../services/api-key-manager.js');
        if (!apiKeyManager.isApiKeyAvailable(botConfig.dashscopeApiKey)) {
          // 检查是否被其他bot占用
          const usage = apiKeyManager.getApiKeyUsage();
          const allocatedTo = usage[botConfig.dashscopeApiKey];
          return res.status(400).json({ 
            error: `API Key '${botConfig.dashscopeApiKey}' 已被占用`,
            allocatedTo: allocatedTo || null
          });
        }
      } catch (e) {
        return res.status(400).json({ error: `API Key 验证失败: ${e.message}` });
      }
    }
    
    const created = await botConfigManager.createBot(botConfig);
    
    // 如果Bot是bot-specific模式，初始化Prompt目录
    if (created.promptMode === 'bot-specific' && created.id) {
      try {
        const { PromptManager } = await import('../services/prompts/prompt-manager.js');
        const promptManager = new PromptManager(created);
        
        // 如果指定了从其他Bot复制prompt
        const copyFromBotId = botConfig.copyPromptFromBotId;
        if (copyFromBotId) {
          // 验证源Bot存在
          const sourceBot = await botConfigManager.getBotById(copyFromBotId);
          if (!sourceBot) {
            return res.status(400).json({ 
              error: `源Bot '${copyFromBotId}' 不存在` 
            });
          }
          
          // 从源Bot复制prompt
          // PromptManager 使用 bot-specific 模式时，manager 是 BotPromptManager 实例
          if (promptManager.manager && promptManager.manager.constructor.name === 'BotPromptManager') {
            await promptManager.manager.copyFromBot(copyFromBotId);
          } else {
            return res.status(500).json({ 
              error: 'Prompt复制功能仅适用于bot-specific模式' 
            });
          }
        } else {
          // 默认：从env继承
          await Promise.all([
            promptManager.loadSystemPrompt(),
            promptManager.loadUserPrompt()
          ]);
        }
      } catch (e) {
        console.warn(`[Bot创建] 初始化Bot Prompt目录失败 (${created.id}):`, e.message);
        // 不影响Bot创建，只记录警告，但如果是复制失败应该返回错误
        if (botConfig.copyPromptFromBotId) {
          return res.status(500).json({ 
            error: `从Bot '${botConfig.copyPromptFromBotId}' 复制prompt失败: ${e.message}` 
          });
        }
      }
    }
    
    // 初始化Bot状态目录（如果tradingMode是local-simulated或需要独立状态）
    if (created.tradingMode === 'local-simulated' && created.id) {
      try {
        const { BotStateManager } = await import('../services/trading/bot-state-manager.js');
        const stateManager = new BotStateManager(created.id);
        // 创建初始状态文件
        const initialUsdt = Number(botConfig.initialUsdt);
        const seed = Number.isFinite(initialUsdt) && initialUsdt > 0 ? initialUsdt : undefined;
        const initialState = {
          startTime: new Date().toISOString(),
          invocationCount: 0,
          totalReturn: 0,
          accountValue: seed ?? 0,
          availableCash: seed ?? 0,
          positions: [],
          lastUpdate: new Date().toISOString(),
          tradingEnabled: true,
          initialAccountValue: seed ?? 0
        };
        await stateManager.saveState(initialState);
        // 初始化空数组
        await stateManager.saveConversations([]);
        await stateManager.saveTrades([]);
      } catch (e) {
        console.warn(`[Bot创建] 初始化Bot状态目录失败 (${created.id}):`, e.message);
        // 不影响Bot创建，只记录警告
      }
    }
    
    res.json(created);
  } catch (e) {
    res.status(400).json({ error: String(e?.message || e) });
  }
});

// 更新Bot配置
router.put('/bots/:botId', async (req, res) => {
  try {
    const { botId } = req.params;
    const updates = req.body;
    const updated = await botConfigManager.updateBot(botId, updates);
    
    // 如果更新后是bot-specific模式且之前没有初始化，现在初始化
    if (updated.promptMode === 'bot-specific' && updated.id) {
      try {
        const { PromptManager } = await import('../services/prompts/prompt-manager.js');
        const promptManager = new PromptManager(updated);
        // 触发加载，会自动从env继承并创建目录和文件
        await Promise.all([
          promptManager.loadSystemPrompt(),
          promptManager.loadUserPrompt()
        ]);
      } catch (e) {
        console.warn(`[Bot更新] 初始化Bot Prompt目录失败 (${updated.id}):`, e.message);
      }
    }
    
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: String(e?.message || e) });
  }
});

// 删除Bot
router.delete('/bots/:botId', async (req, res) => {
  try {
    // Express会自动解码URL参数
    const botId = decodeURIComponent(req.params.botId);
    console.log(`[Bot删除] 开始删除Bot: ${botId}`);
    
    // 先停止并移除运行中的Bot实例（如果存在）
    try {
      tradingRunner.removeBot(botId);
      console.log(`[Bot删除] 已停止运行中的Bot实例: ${botId}`);
    } catch (e) {
      // 如果Bot不在运行中，忽略错误
      console.log(`[Bot删除] Bot ${botId} 不在运行中或已移除:`, e.message);
    }
    
    // 释放 API Key
    try {
      const { apiKeyManager } = await import('../services/api-key-manager.js');
      apiKeyManager.releaseApiKey(botId);
      console.log(`[Bot删除] Bot ${botId} 已释放 API Key`);
    } catch (e) {
      console.warn(`[Bot删除] 释放 API Key 失败:`, e.message);
    }
    
    // 获取Bot配置（需要在删除配置之前获取，用于后续操作）
    const bot = await botConfigManager.getBotById(botId);
    if (!bot) {
      return res.status(404).json({ error: `Bot '${botId}' 不存在` });
    }
    console.log(`[Bot删除] 找到Bot配置: ${JSON.stringify({ id: bot.id, name: bot.name })}`);
    
    // 删除Bot对应的数据目录和文件（在删除配置之前，以便获取Bot信息）
    try {
      // 使用正确的路径：__dirname指向backend/src/routes，所以需要../../到达backend，然后data/bots
      // 但实际文件结构是 backend/src/routes -> backend/data/bots
      // 所以应该是: ../../data/bots (从backend/src/routes到backend/data/bots)
      const botDataDir = path.resolve(__dirname, '../../data/bots', botId);
      
      console.log(`[Bot删除] 准备删除数据目录: ${botDataDir}`);
      
      // 强制删除目录（即使不存在也尝试，force选项会忽略错误）
      try {
        // 使用force选项，即使目录不存在也不会报错
        await fs.rm(botDataDir, { recursive: true, force: true });
        
        // 验证删除是否成功
        await new Promise(resolve => setTimeout(resolve, 100)); // 等待100ms确保删除完成
        try {
          await fs.access(botDataDir);
          // 如果还能访问，说明删除失败
          console.warn(`[Bot删除] ⚠️ 目录删除后仍然存在，尝试再次删除: ${botDataDir}`);
          await fs.rm(botDataDir, { recursive: true, force: true });
        } catch (verifyErr) {
          if (verifyErr.code === 'ENOENT') {
            console.log(`[Bot删除] ✓ 已删除Bot数据目录: ${botDataDir}`);
          } else {
            throw verifyErr;
          }
        }
      } catch (e) {
        // 即使删除失败，也记录但不阻止Bot配置删除
        if (e.code === 'ENOENT') {
          console.log(`[Bot删除] Bot数据目录不存在: ${botDataDir}`);
        } else {
          console.warn(`[Bot删除] ⚠️ 删除目录时出错 (${botId}):`, e.message);
        }
      }
    } catch (e) {
      // 删除文件失败不影响Bot配置删除，但记录警告
      console.warn(`[Bot删除] ⚠️ 删除Bot数据目录失败 (${botId}):`, e.message);
    }
    
    // 最后删除Bot配置（确保即使文件删除失败，配置也能删除）
    await botConfigManager.deleteBot(botId);
    console.log(`[Bot删除] ✓ 已删除Bot配置: ${botId}`);
    
    res.json({ ok: true, deletedBotId: botId });
  } catch (e) {
    console.error(`[Bot删除] ✗ 删除Bot失败:`, e.message, e.stack);
    res.status(400).json({ error: String(e?.message || e) });
  }
});

// 获取Bot的完整配置（包含解析后的AI配置）
router.get('/bots/:botId/config-with-ai', async (req, res) => {
  try {
    const { botId } = req.params;
    const config = await botConfigManager.getBotConfigWithAI(botId);
    if (!config) {
      return res.status(404).json({ error: `Bot '${botId}' 不存在` });
    }
    res.json(config);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// 初始化Bot目录和文件（用于已存在的Bot）
// 注意：这个路由必须在其他 /bots/:botId/* 路由之前，否则会被 :botId 匹配
router.post('/bots/:botId/init', async (req, res) => {
  try {
    const { botId } = req.params;
    const bot = await botConfigManager.getBotById(botId);
    if (!bot) {
      return res.status(404).json({ error: `Bot '${botId}' 不存在` });
    }
    
    const results = { prompt: false, state: false };
    
    // 初始化Prompt目录（如果是bot-specific模式）
    if (bot.promptMode === 'bot-specific') {
      try {
        const { PromptManager } = await import('../services/prompts/prompt-manager.js');
        const promptManager = new PromptManager(bot);
        await Promise.all([
          promptManager.loadSystemPrompt(),
          promptManager.loadUserPrompt()
        ]);
        results.prompt = true;
      } catch (e) {
        console.error(`[Bot初始化] Prompt目录初始化失败:`, e.message);
      }
    }
    
    // 初始化状态目录（如果是local-simulated模式）
    if (bot.tradingMode === 'local-simulated') {
      try {
        const { BotStateManager } = await import('../services/trading/bot-state-manager.js');
        const stateManager = new BotStateManager(bot.id);
        const existingState = await stateManager.loadState();
        if (!existingState) {
          const initialUsdt = Number(bot.initialUsdt);
          const seed = Number.isFinite(initialUsdt) && initialUsdt > 0 ? initialUsdt : 0;
          const initialState = {
            startTime: new Date().toISOString(),
            invocationCount: 0,
            totalReturn: 0,
            accountValue: seed,
            availableCash: seed,
            positions: [],
            lastUpdate: new Date().toISOString(),
            tradingEnabled: true,
            initialAccountValue: seed
          };
          await stateManager.saveState(initialState);
          await stateManager.saveConversations([]);
          await stateManager.saveTrades([]);
        }
        results.state = true;
      } catch (e) {
        console.error(`[Bot初始化] 状态目录初始化失败:`, e.message);
      }
    }
    
    res.json({ ok: true, results });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// 获取Bot的Prompt（支持env-shared和bot-specific）
router.get('/bots/:botId/prompts', async (req, res) => {
  try {
    const { botId } = req.params;
    const bot = await botConfigManager.getBotById(botId);
    if (!bot) {
      return res.status(404).json({ error: `Bot '${botId}' 不存在` });
    }

    const { PromptManager } = await import('../services/prompts/prompt-manager.js');
    const promptManager = new PromptManager(bot);
    
    const [system, user] = await Promise.all([
      promptManager.loadSystemPrompt(),
      promptManager.loadUserPrompt()
    ]);

    res.json({ system, user, env: bot.env, promptMode: bot.promptMode });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// 保存Bot的Prompt
router.post('/bots/:botId/prompts', async (req, res) => {
  try {
    const { botId } = req.params;
    const { system, user } = req.body;
    const bot = await botConfigManager.getBotById(botId);
    if (!bot) {
      return res.status(404).json({ error: `Bot '${botId}' 不存在` });
    }

    const { PromptManager } = await import('../services/prompts/prompt-manager.js');
    const promptManager = new PromptManager(bot);
    
    await Promise.all([
      promptManager.saveSystemPrompt(system || ''),
      promptManager.saveUserPrompt(user || '')
    ]);

    res.json({ system, user, ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});


