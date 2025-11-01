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
  const trades = await loadJson('trades.json', { trades: [] });
  // 优先返回真实成交（有 orderId 或 side 字段）
  const realTrades = (trades.trades || []).filter(t => t.orderId || t.side);
  if (realTrades.length > 0) {
    // 转换成前端需要的格式
    const normalized = realTrades.map((t, idx) => {
      const ts = t.exit_time || t.timestamp || Math.floor(Date.now() / 1000);
      const symbol = (t.symbol || 'UNKNOWN').toUpperCase().replace(/:USDT$/, '').split('/')[0];
      const sideRaw = String(t.side || '').toUpperCase();
      const side = (sideRaw === 'BUY' || sideRaw === 'LONG') ? 'long' : 
                   (sideRaw === 'SELL' || sideRaw === 'SHORT') ? 'short' : 'long';
      
      return {
        id: t.orderId ? String(t.orderId) : `${symbol}-${ts}-${idx}`,
        model_id: t.model_id || 'default',
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
    return res.json({ trades: normalized });
  }
  // 从 conversations 推导决策记录
  try {
    const buf = await fs.readFile(CONV_FILE, 'utf8');
    const raw = JSON.parse(buf);
    const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
    const out = [];
    
    for (const c of arr) {
      const tsIso = c?.timestamp || new Date().toISOString();
      const ts = Math.floor(new Date(tsIso).getTime() / 1000);
      const d = c?.decision_normalized || {};
      const action = String(d?.action || '').toLowerCase();
      const base = (d?.symbol || '').toString().toUpperCase().replace(/:USDT$/, '');
      const symbol = base.includes('/') ? base.split('/')[0] : base;
      const quantity = Number.isFinite(Number(d?.quantity)) ? Number(d.quantity) : 0;
      const leverage = Number.isFinite(Number(d?.leverage)) ? Number(d.leverage) : 1;
      
      if (!symbol) continue;
      
      // buy 表示开多仓
      if (action === 'buy') {
        out.push({
          id: `${symbol}-${ts}-buy`,
          model_id: 'default',
          side: 'long',
          symbol,
          entry_time: ts,
          entry_price: 0,
          exit_time: ts,
          exit_price: 0,
          quantity,
          leverage,
          realized_net_pnl: 0,
          realized_gross_pnl: 0,
          total_commission_dollars: 0,
        });
      } 
      // sell 或 close_position 表示平仓
      else if (action === 'sell' || action === 'close_position') {
        out.push({
          id: `${symbol}-${ts}-close`,
          model_id: 'default',
          side: 'long', // 平仓假设是long
          symbol,
          entry_time: ts - 3600, // 假设1小时前开仓
          entry_price: 0,
          exit_time: ts,
          exit_price: 0,
          quantity,
          leverage,
          realized_net_pnl: 0,
          realized_gross_pnl: 0,
          total_commission_dollars: 0,
        });
      }
    }
    
    if (out.length > 0) {
      return res.json({ trades: out });
    }
  } catch (e) {
    console.error('从conversations推导trades失败:', e.message);
  }
  
  // 如果都没有，返回空数组
  return res.json({ trades: [] });
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
    async function readConv(filePath) {
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
          model_id: 'deepseek-chat',  // 默认模型ID，可以从配置读取
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
        
        if (items.length >= 100) break;  // 限制返回数量
      }
      
      return items;
    }

    // 优先读 backend/data/conversations.json；若为空则回退到 backend/test/trading-conversations.json
    let items = [];
    try { items = await readConv(CONV_FILE); } catch (_) {}
    if (!items.length) {
      const TEST_CONV = path.join(TEST_DIR, 'trading-conversations.json');
      try { items = await readConv(TEST_CONV); } catch (_) {}
    }
    
    return res.json({ conversations: items });
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
    const [sys, user] = await Promise.all([
      fs.readFile(SYS_TPL, 'utf8').catch(() => ''),
      fs.readFile(USER_TPL, 'utf8').catch(() => ''),
    ]);
    res.json({ system: sys, user });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.post('/ai/prompts', async (req, res) => {
  try {
    const body = req.body || {};
    const system = String(body.system || '');
    const user = String(body.user || '');
    await fs.mkdir(TPL_DIR, { recursive: true }).catch(() => {});
    await Promise.all([
      fs.writeFile(SYS_TPL, system, 'utf8'),
      fs.writeFile(USER_TPL, user, 'utf8'),
      // keep a JSON mirror for legacy UI
      saveJson('prompts.json', { system, user }),
    ]);
    res.json({ system, user });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Diff between current templates and proposed ones
router.post('/ai/prompt/diff', async (req, res) => {
  try {
    const curSys = await fs.readFile(SYS_TPL, 'utf8').catch(() => '');
    const curUsr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    const nextSys = String(req.body?.system || '');
    const nextUsr = String(req.body?.user || '');
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
    const cfg = JSON.parse(await fs.readFile(CFG_FILE, 'utf8'));
    const sys = await fs.readFile(SYS_TPL, 'utf8').catch(() => '');
    const usr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    const body = req.body || {};
    const aiKey = cfg.ai?.api_key || process.env.DEEPSEEK_API_KEY_30 || '';
    const provider = cfg.ai?.provider || 'deepseek';
    const model = cfg.ai?.model || 'deepseek-chat';
    const temperature = cfg.ai?.temperature ?? 0.7;

    const context = {
      environment: cfg.trading_env,
      allowed_symbols: cfg.allowed_symbols,
      data: cfg.data,
      current_templates: { system: sys, user: usr }
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

    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${aiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You return ONLY valid JSON. No prose.' },
          { role: 'user', content: prompt }
        ],
        temperature,
        stream: false,
        max_tokens: 1500
      })
    });
    if (!resp.ok) throw new Error(`upstream ${resp.status}`);
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '{}';
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
    const cfg = JSON.parse(await fs.readFile(CFG_FILE, 'utf8'));
    const sys = await fs.readFile(SYS_TPL, 'utf8').catch(() => '');
    const usr = await fs.readFile(USER_TPL, 'utf8').catch(() => '');
    const question = String(req.body?.question || '').slice(0, 8000);
    const aiKey = cfg.ai?.api_key || process.env.DEEPSEEK_API_KEY_30 || '';
    const model = cfg.ai?.model || 'deepseek-chat';
    const temperature = cfg.ai?.temperature ?? 0.4;
    const context = {
      environment: cfg.trading_env,
      allowed_symbols: cfg.allowed_symbols,
      data: cfg.data,
      current_templates: { system: sys, user: usr }
    };
    if (!question) return res.status(400).json({ error: 'empty_question' });
    if (!aiKey) return res.json({ answer: null, disabled: true });
    const prompt = `You are a senior prompt engineer and trading systems architect. Answer user's question based on the JSON CONTEXT. Be concise and structured.\n\nCONTEXT:\n${JSON.stringify(context, null, 2)}\n\nUSER:\n${question}`;
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({ model, messages: [ { role: 'user', content: prompt } ], temperature, stream: false, max_tokens: 1200 })
    });
    if (!resp.ok) throw new Error(`upstream ${resp.status}`);
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || null;
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
  const trades = await loadJson('trades.json', { trades: [] });
  const totals = await deriveAccountTotals(trades, lastHourlyMarker);
  
  // 优先尝试从币安API获取实时数据
  let latestPositions = {};
  let latestAccountValue = null;
  let initialAccountValue = null;
  let initialBTCPrice = null;
  
  try {
    const realTimeData = await getRealTimeAccountData();
    if (realTimeData) {
      latestAccountValue = realTimeData.balance;
      // 将positions数组转为对象格式
      for (const p of realTimeData.positions) {
        const symbol = String(p.symbol || '').toUpperCase();
        if (symbol) {
          latestPositions[symbol] = {
            symbol,
            quantity: Number(p.quantity || 0),
            entry_price: Number(p.entry_price || 0),
            current_price: Number(p.current_price || 0),
            liquidation_price: Number(p.liquidation_price || 0),
            unrealized_pnl: Number(p.unrealized_pnl || 0),
            leverage: Number(p.leverage || 1),
            exit_plan: p.exit_plan || null,
            confidence: Number(p.confidence || 0),
            risk_usd: Number(p.risk_usd || 0),
            margin: Number(p.margin || 0),
            notional_usd: Number(p.notional_usd || 0),
            entry_time: Number(p.entry_time || Math.floor(Date.now() / 1000)),
            entry_oid: Number(p.entry_oid || 0),
          };
        }
      }
    }
  } catch (e) {
    console.warn('获取实时账户数据失败，降级到trading-state.json:', e.message);
  }
  
  // 始终从 trading-state.json 读取初始值（用于BTC持有曲线计算）
  try {
    const state = await loadJson('trading-state.json', { positions: [] });
    // 获取初始账户价值（启动时的值）
    if (state?.initialAccountValue) {
      initialAccountValue = Number(state.initialAccountValue);
    } else if (state?.accountValue) {
      // 如果没有保存初始值，使用当前值（可能是第一次启动）
      initialAccountValue = Number(state.accountValue);
    }
    // 获取初始BTC价格（用于计算BTC持有曲线）
    if (state?.initialBTCPrice) {
      initialBTCPrice = Number(state.initialBTCPrice);
    }
  } catch (e) {
    console.warn('读取 trading-state.json 失败:', e.message);
  }
  
  // 如果实时数据获取失败，降级到trading-state.json
  if (!latestAccountValue || Object.keys(latestPositions).length === 0) {
    try {
      // 从 trading-state.json 读取最新的账户价值和持仓
      const state = await loadJson('trading-state.json', { positions: [] });
      if (state?.accountValue) {
        latestAccountValue = Number(state.accountValue);
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
      
      // 如果没有，从 conversations 推导
      if (Object.keys(latestPositions).length === 0) {
        const buf = await fs.readFile(CONV_FILE, 'utf8');
        const raw = JSON.parse(buf);
        const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
        const posMap = {};
        // 倒序遍历（最新到最旧），累计持仓
        for (const c of arr.slice().reverse()) {
          const d = c?.decision_normalized || {};
          const action = String(d?.action || '').toLowerCase();
          const base = (d?.symbol || '').toString().toUpperCase().replace(/:USDT$/, '');
          const symbol = base.includes('/') ? base.split('/')[0] : base;
          const qty = Number.isFinite(Number(d?.quantity)) ? Number(d.quantity) : 0;
          
          // 只处理buy/sell/close_position，忽略hold操作
          if (!symbol) continue;
          if (action === 'buy' && qty > 0) {
            if (!posMap[symbol]) posMap[symbol] = { symbol, quantity: 0, entry_price: 0, leverage: 1 };
            posMap[symbol].quantity += qty;
          } else if ((action === 'sell' || action === 'close_position') && qty > 0) {
            if (posMap[symbol]) {
              posMap[symbol].quantity -= qty;
              if (posMap[symbol].quantity <= 0) delete posMap[symbol];
            }
          }
        }
        // 转换为标准格式
        for (const [symbol, p] of Object.entries(posMap)) {
          if (p.quantity > 0) {
            latestPositions[symbol] = {
              symbol: p.symbol,
              quantity: p.quantity,
              entry_price: p.entry_price || 0,
              current_price: 0,
              liquidation_price: 0,
              unrealized_pnl: 0,
              leverage: p.leverage || 1,
              exit_plan: null,
              confidence: 0,
              risk_usd: 0,
              margin: 0,
              entry_time: Math.floor(Date.now() / 1000),
              entry_oid: 0,
            };
          }
        }
      }
    } catch (e) {
      console.error('读取持仓失败:', e.message);
    }
  }
  
  // 从conversations中提取BTC价格历史的辅助函数
  function extractBTCPrice(userPrompt) {
    if (!userPrompt) return null;
    // 从userPrompt中提取 current_price = 109695.40 格式的BTC价格
    const match = userPrompt.match(/ALL BTC DATA[\s\S]*?current_price\s*=\s*([\d.]+)/);
    return match ? Number(match[1]) : null;
  }

  if (!totals || totals.length === 0) {
    // 从 conversations 生成净值时间序列
    try {
      const buf = await fs.readFile(CONV_FILE, 'utf8');
      const raw = JSON.parse(buf);
      const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
      const series = arr.slice().reverse().map(c => {
        const ts = Math.floor(new Date(c?.timestamp || Date.now()).getTime() / 1000);
        const equity = Number(c?.accountValue);
        if (!Number.isFinite(equity)) return null; // 跳过无效值，返回null
        // 从userPrompt中提取BTC价格
        const btcPrice = extractBTCPrice(c?.userPrompt);
        return {
          model_id: 'default',
          timestamp: ts,
          dollar_equity: equity,
          since_inception_hourly_marker: Math.floor(ts / 3600),
          positions: latestPositions, // 附加持仓信息
          btc_price: btcPrice || undefined, // 附加BTC价格（如果存在）
        };
      }).filter(item => item !== null); // 过滤掉null值
      if (series.length > 0) return res.json({ 
        accountTotals: series,
        initialAccountValue: initialAccountValue || undefined, // 如果没有则不返回，而不是返回null
        initialBTCPrice: initialBTCPrice || undefined, // 返回初始BTC价格
      });
    } catch (_) {}
    // 如果没有数据且没有初始值，返回空数组而不是伪造数据
    if (!initialAccountValue && !latestAccountValue) {
      return res.json({
        accountTotals: [],
        initialAccountValue: undefined
      });
    }
    
    const now = Date.now();
    const t0 = Math.floor((now - 60_000) / 1000);
    const t1 = Math.floor(now / 1000);
    // 使用实际的值，如果没有初始值就使用当前值
    const startValue = initialAccountValue || latestAccountValue || 0;
    const currentValue = latestAccountValue || initialAccountValue || 0;
    return res.json({
      accountTotals: [
        { model_id: 'default', timestamp: t0, dollar_equity: startValue, since_inception_hourly_marker: Math.floor(t0 / 3600), positions: latestPositions },
        { model_id: 'default', timestamp: t1, dollar_equity: currentValue, since_inception_hourly_marker: Math.floor(t1 / 3600), positions: latestPositions },
      ],
      // 只有确实有初始值时才返回
      initialAccountValue: initialAccountValue || undefined,
    });
  }
  
  // 为现有的 totals 也附加持仓信息和更新最新净值，以及BTC价格
  if (totals && totals.length > 0) {
    // 尝试从conversations中提取BTC价格历史
    let btcPriceMap = new Map(); // timestamp -> btc_price
    try {
      const buf = await fs.readFile(CONV_FILE, 'utf8');
      const raw = JSON.parse(buf);
      const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
      for (const c of arr) {
        const ts = Math.floor(new Date(c?.timestamp || Date.now()).getTime() / 1000);
        const btcPrice = extractBTCPrice(c?.userPrompt);
        if (btcPrice && !btcPriceMap.has(ts)) {
          btcPriceMap.set(ts, btcPrice);
        }
      }
    } catch (e) {
      console.warn('从conversations提取BTC价格失败:', e.message);
    }
    
    const latest = totals[totals.length - 1];
    latest.positions = latestPositions;
    // 如果有最新的账户价值，更新最后一条记录的净值
    if (latestAccountValue != null && Number.isFinite(latestAccountValue)) {
      latest.dollar_equity = latestAccountValue;
      latest.timestamp = Math.floor(Date.now() / 1000);
    }
    
    // 为每个totals项附加BTC价格（如果存在）
    for (const item of totals) {
      const ts = item.timestamp;
      // 查找最接近的时间戳的BTC价格
      let closestPrice = null;
      let minDiff = Infinity;
      for (const [priceTs, price] of btcPriceMap.entries()) {
        const diff = Math.abs(priceTs - ts);
        if (diff < minDiff && diff < 3600) { // 1小时内
          minDiff = diff;
          closestPrice = price;
        }
      }
      if (closestPrice) {
        item.btc_price = closestPrice;
      }
    }
    
    // 为最后一个点添加当前BTC价格（如果还没有）
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
  
  res.json({ 
    accountTotals: totals,
    // 只有确实有初始值时才返回，用于图表参考线
    initialAccountValue: initialAccountValue || undefined,
    initialBTCPrice: initialBTCPrice || undefined, // 返回初始BTC价格
  });
});

router.get('/leaderboard', async (req, res) => {
  const trades = await loadJson('trades.json', { trades: [] });
  const leaderboard = await deriveLeaderboard(trades);
  res.json({ leaderboard });
});

router.get('/since-inception-values', async (req, res) => {
  const trades = await loadJson('trades.json', { trades: [] });
  const out = await deriveSinceInception(trades);
  res.json(out);
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
  // 优先尝试实时数据
  try {
    const realTimeData = await getRealTimeAccountData();
    if (realTimeData && realTimeData.positions && realTimeData.positions.length > 0) {
      return res.json({ positions: realTimeData.positions });
    }
  } catch (_) {
    // 如果失败，继续使用原有逻辑
  }
  
  try {
    const state = await loadJson('trading-state.json', { positions: [] });
    const positions = Array.isArray(state?.positions) ? state.positions : [];
    const norm = positions.map((p) => ({
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
    }));
    if (norm.length > 0) return res.json({ positions: norm });
    // 从 conversations 累计推导净持仓
    try {
      const buf = await fs.readFile(CONV_FILE, 'utf8');
      const raw = JSON.parse(buf);
      const arr = Array.isArray(raw?.conversations) ? raw.conversations : [];
      const posMap = {};
      for (const c of arr.slice().reverse()) {
        const d = c?.decision_normalized || {};
        const action = String(d?.action || '').toLowerCase();
        const base = (d?.symbol || '').toString().toUpperCase().replace(/:USDT$/, '');
        const symbol = base.includes('/') ? base.split('/')[0] : base;
        const qty = Number.isFinite(Number(d?.quantity)) ? Number(d.quantity) : 0;
        if (!symbol || qty === 0) continue;
        if (action === 'buy') {
          if (!posMap[symbol]) posMap[symbol] = { symbol, quantity: 0, entry_price: 0, leverage: 1 };
          posMap[symbol].quantity += qty;
        } else if (action === 'sell' || action === 'close_position') {
          if (posMap[symbol]) {
            posMap[symbol].quantity -= qty;
            if (posMap[symbol].quantity <= 0) delete posMap[symbol];
          }
        }
      }
      const out = Object.values(posMap).map(p => ({
        symbol: p.symbol,
        quantity: p.quantity,
        entry_price: p.entry_price || 0,
        current_price: 0,
        liquidation_price: 0,
        unrealized_pnl: 0,
        leverage: p.leverage || 1,
        exit_plan: null,
        confidence: 0,
        risk_usd: 0,
      }));
      try {
        const prev = await loadJson('trading-state.json', { startTime: new Date().toISOString(), invocationCount: 0, positions: [] });
        await saveJson('trading-state.json', { ...prev, positions: out, lastUpdate: new Date().toISOString() });
      } catch (_) {}
      return res.json({ positions: out });
    } catch (_) {
      return res.json({ positions: [] });
    }
  } catch (e) {
    res.json({ positions: [] });
  }
});


