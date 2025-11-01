import ccxt from 'ccxt';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { resolve, dirname } from 'path';
import readline from 'readline';

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

const SupportedLangs = ['en','zh','fr','es','ru','ja'];
const LangName = { en: 'English', zh: '中文', fr: 'Français', es: 'Español', ru: 'Русский', ja: '日本語' };

function normalizeLang(input) {
  if (!input) return 'en';
  const s = input.trim().toLowerCase();
  if (SupportedLangs.includes(s)) return s;
  if (['zh-cn','zh-hans','cn','chinese','中文'].includes(s)) return 'zh';
  if (['eng','english'].includes(s)) return 'en';
  if (['jp','ja-jp','japanese','日本语','日本語'].includes(s)) return 'ja';
  if (['es-es','spanish','español'].includes(s)) return 'es';
  if (['fr-fr','french','francais','français'].includes(s)) return 'fr';
  if (['ru-ru','russian','русский'].includes(s)) return 'ru';
  return 'en';
}

function loadConfig() {
  const configPath = resolve(process.cwd(), 'backend/test/ai-trading/config.json');
  const raw = readFileSync(configPath, 'utf8');
  const cfg = JSON.parse(raw);
  if (cfg.ai && cfg.ai.api_key) cfg.ai.api_key = expandEnvMaybe(cfg.ai.api_key);
  const f = cfg.exchange?.binance?.futures_demo;
  const s = cfg.exchange?.binance?.spot_testnet;
  if (f) { f.api_key = expandEnvMaybe(f.api_key); f.api_secret = expandEnvMaybe(f.api_secret); }
  if (s) { s.api_key = expandEnvMaybe(s.api_key); s.api_secret = expandEnvMaybe(s.api_secret); }
  return cfg;
}

function loadExplanations() {
  try {
    const p = resolve(process.cwd(), 'backend/test/prompt-studio/explanations.json');
    if (existsSync(p)) {
      const raw = readFileSync(p, 'utf8');
      return JSON.parse(raw);
    }
  } catch (_) {}
  return {};
}

function ensureDir(filePath) {
  const d = dirname(filePath);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function backupFile(filePath) {
  if (existsSync(filePath)) {
    const bak = filePath + '.' + new Date().toISOString().replace(/[:.]/g, '-') + '.bak';
    copyFileSync(filePath, bak);
    return bak;
  }
  return null;
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

async function callDeepSeek(apiKey, model, systemPrompt, userPrompt, temperature = 0.5, maxTokens = 1500) {
  const resp = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: false,
      temperature,
      max_tokens: maxTokens
    })
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? '';
}

function buildSuggestSystemPrompt(targetLang) {
  return (
    'You are a senior prompt engineer and trading product designer. Provide STRICT JSON suggestions for improving two prompts: system and user. ' +
    'Constraints: keep JSON schema requirement strict; keep whitelist symbols and leverage rules explicit; avoid hallucinations. ' +
    `Additionally, provide a localized version in the user's preferred language (${targetLang}). ` +
    'You MAY propose config updates (e.g., data.timeframes) in a separate object. ' +
    'Output STRICT JSON only with keys: {' +
    '"system_prompt_en": string, "user_prompt_en": string,' +
    ' "system_prompt_localized": string, "user_prompt_localized": string,' +
    ' "rationale_en": string, "rationale_localized": string,' +
    ' "config_updates": object | null' +
    '}.'
  );
}

function buildSuggestUserPrompt(context) {
  const snapshot = JSON.stringify(context, null, 2);
  return (
    'Context (env, placeholders, current prompts, sample market snapshot):\n' + snapshot + '\n\n' +
    'Please propose improved prompts (concise, strict, robust). Keep placeholders unchanged unless necessary. ' +
    'If you suggest changing timeframes or market data cadence, put them under "config_updates": {"data": {"intraday_tf": "3m", ...}}.'
  );
}

function buildAskSystemPrompt(targetLang) {
  return (
    'You are a helpful assistant for a prompt-engineering CLI for trading systems. Decide whether the user input is a QUESTION or a CHANGE REQUEST. ' +
    'If it is a question, answer with a structured and detailed explanation using the provided context. Sections: (1) Summary; (2) Data sources; (3) Timeframes & indicators; (4) Placeholders & rendering; (5) How this informs decisions. ' +
    'If it is a change request, return a short recommendation summary without editing templates. ' +
    `Provide both English and localized (${targetLang}) answers. Output STRICT JSON: {"type":"question|change","answer_en":string,"answer_localized":string}.`
  );
}

function buildAskUserPrompt(context, input) {
  const payload = { ...context, user_input: input };
  return 'Context for Q&A (do not edit prompts):\n' + JSON.stringify(payload, null, 2);
}

async function getMarketSnapshot(exchange, symbols, isFutures) {
  const result = {};
  for (const sym of symbols) {
    try {
      const ticker = await exchange.fetchTicker(sym);
      const ohlcv = await exchange.fetchOHLCV(sym, '1m', undefined, 20);
      const prices = ohlcv.map(c => (c[2] + c[3]) / 2);
      result[sym] = {
        last: ticker.last,
        mid_prices: prices.slice(-10),
        volume: ohlcv[ohlcv.length - 1]?.[5] ?? 0
      };
      await new Promise(r => setTimeout(r, 80));
    } catch (e) {
      result[sym] = { error: e.message };
    }
  }
  return result;
}

function diffText(oldText, newText) {
  const oldLines = (oldText || '').split('\n');
  const newLines = (newText || '').split('\n');
  const max = Math.max(oldLines.length, newLines.length);
  const lines = [];
  for (let i = 0; i < max; i++) {
    const o = oldLines[i] ?? '';
    const n = newLines[i] ?? '';
    if (o === n) lines.push('  ' + n);
    else {
      if (o) lines.push('- ' + o);
      if (n) lines.push('+ ' + n);
    }
  }
  return lines.join('\n');
}

function extractPlaceholders(tpl) {
  const set = new Set();
  (tpl || '').replace(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g, (_, k) => { set.add(k); return ''; });
  return Array.from(set);
}

async function buildCcxtCapabilities(exchange, isFutures) {
  const info = { connected: !!exchange };
  if (!exchange) return info;
  try {
    const d = exchange.describe ? exchange.describe() : {};
    info.id = exchange.id;
    info.name = d.name;
    info.version = d.version;
    info.rateLimit = d.rateLimit;
    info.timeframes = d.timeframes || null;
    info.urls = d.urls?.api || d.urls || null;
    info.has = {};
    const keys = ['fetchTicker','fetchOHLCV','fetchBalance','fetchPositions','createOrder','fetchOrder','loadMarkets'];
    for (const k of keys) info.has[k] = d.has?.[k] === true;
    info.options = d.options || null;
    if (d.has?.loadMarkets) {
      try {
        await exchange.loadMarkets();
        const syms = Object.keys(exchange.markets || {}).slice(0, 20);
        info.sampleMarkets = syms;
      } catch (_) {}
    }
  } catch (e) {
    info.error = e.message;
  }
  info.dataSchemas = {
    ticker: ['symbol','timestamp','datetime','high','low','bid','ask','vwap','open','close','last','baseVolume','quoteVolume','info'],
    ohlcv: ['timestamp','open','high','low','close','volume'] ,
    balance: ['free','used','total','info'],
    position: isFutures ? ['symbol','contracts','entryPrice','markPrice','liquidationPrice','unrealizedPnl','notional'] : null
  };
  return info;
}

function buildUsefulCaps(ccxtCaps, isFutures, allowedSymbols) {
  const api_has = ccxtCaps?.has || {};
  const timeframes = ccxtCaps?.timeframes ? Object.keys(ccxtCaps.timeframes) : [];
  const schemas = ccxtCaps?.dataSchemas || {};
  return {
    exchange: {
      id: ccxtCaps?.id,
      name: ccxtCaps?.name,
      futures: !!isFutures,
      marketType: 'linear'
    },
    timeframes,
    api_has: {
      fetchOHLCV: !!api_has.fetchOHLCV,
      fetchTicker: !!api_has.fetchTicker,
      fetchBalance: !!api_has.fetchBalance,
      fetchPositions: !!api_has.fetchPositions,
      createOrder: !!api_has.createOrder,
      fetchOrder: !!api_has.fetchOrder
    },
    schemas: {
      ticker: schemas.ticker || [],
      ohlcv: schemas.ohlcv || [],
      balance: schemas.balance || [],
      position: schemas.position || []
    },
    tradable_symbols: allowedSymbols
  };
}

function printUsefulCapsExplanation(usefulCaps, lang, explanations) {
  const dict = (explanations.useful_caps && (explanations.useful_caps[lang] || explanations.useful_caps['en'])) || {};
  function explainKey(key, label) {
    const msg = dict[key];
    if (msg) console.log(`- ${label}: ${msg}`);
  }
  console.log('\n[字段解释]');
  explainKey('exchange', 'exchange');
  explainKey('exchange.id', 'exchange.id');
  explainKey('exchange.name', 'exchange.name');
  explainKey('exchange.futures', 'exchange.futures');
  explainKey('exchange.marketType', 'exchange.marketType');
  explainKey('timeframes', 'timeframes');
  explainKey('api_has', 'api_has');
  explainKey('api_has.fetchOHLCV', 'api_has.fetchOHLCV');
  explainKey('api_has.fetchTicker', 'api_has.fetchTicker');
  explainKey('api_has.fetchBalance', 'api_has.fetchBalance');
  explainKey('api_has.fetchPositions', 'api_has.fetchPositions');
  explainKey('api_has.createOrder', 'api_has.createOrder');
  explainKey('api_has.fetchOrder', 'api_has.fetchOrder');
  explainKey('schemas', 'schemas');
  explainKey('schemas.ticker', 'schemas.ticker');
  explainKey('schemas.ohlcv', 'schemas.ohlcv');
  explainKey('schemas.balance', 'schemas.balance');
  explainKey('schemas.position', 'schemas.position');
  explainKey('tradable_symbols', 'tradable_symbols');
  console.log('');
}

async function main() {
  const config = loadConfig();
  const explanations = loadExplanations();
  const argEnv = getArg('--env');
  const argAi = getArg('--ai');
  const argLang = normalizeLang(getArg('--lang'));
  let userLang = argLang;

  const tradingEnv = (argEnv && typeof argEnv === 'string') ? argEnv : (config.trading_env || 'demo-futures');
  const isFutures = tradingEnv === 'demo-futures' || tradingEnv === 'futures';

  const aiPreset = (argAi && config.ai?.presets?.[argAi]) ? config.ai.presets[argAi] : null;
  const aiProvider = (aiPreset?.provider || config.ai?.provider || 'deepseek');
  const aiModel = (aiPreset?.model || config.ai?.model || 'deepseek-chat');
  const aiApiKey = expandEnvMaybe(aiPreset?.api_key || config.ai?.api_key || process.env.DEEPSEEK_API_KEY_30 || '');
  const aiTemperature = (aiPreset?.temperature ?? config.ai?.temperature ?? 0.5);
  const aiMaxTokens = (aiPreset?.max_tokens ?? config.ai?.max_tokens ?? 1500);

  const systemPath = resolve(process.cwd(), config.prompt_files.system_prompt_path);
  const userPath = resolve(process.cwd(), config.prompt_files.user_prompt_path);
  const systemOrig = existsSync(systemPath) ? readFileSync(systemPath, 'utf8') : '';
  const userOrig = existsSync(userPath) ? readFileSync(userPath, 'utf8') : '';

  const presetAllowed = config.presets?.[tradingEnv]?.allowed_symbols;
  const defaultAllowed = isFutures
    ? ['BTC/USDT:USDT','ETH/USDT:USDT','SOL/USDT:USDT','BNB/USDT:USDT','XRP/USDT:USDT','DOGE/USDT:USDT']
    : ['BTC/USDT','ETH/USDT','SOL/USDT','BNB/USDT','XRP/USDT','DOGE/USDT'];
  const allowedSymbols = Array.isArray(config.allowed_symbols) && config.allowed_symbols.length > 0
    ? config.allowed_symbols
    : (Array.isArray(presetAllowed) && presetAllowed.length > 0 ? presetAllowed : defaultAllowed);

  const symbols = (Array.isArray(config.symbols_monitor) && config.symbols_monitor.length > 0)
    ? config.symbols_monitor
    : [...allowedSymbols];

  process.env.HTTPS_PROXY = process.env.HTTPS_PROXY || 'http://127.0.0.1:7890';
  process.env.HTTP_PROXY = process.env.HTTP_PROXY || 'http://127.0.0.1:7890';

  let exchange = null;
  let snapshot = {};
  let ccxtCaps = null;
  try {
    if (isFutures) {
      const k = config.exchange?.binance?.futures_demo?.api_key || process.env.BINANCE_DEMO_API_KEY;
      const s = config.exchange?.binance?.futures_demo?.api_secret || process.env.BINANCE_DEMO_API_SECRET;
      if (k && s) {
        exchange = new ccxt.binanceusdm({ apiKey: k, secret: s, enableRateLimit: true, options: { defaultType: 'future', enableDemoTrading: true } });
        exchange.httpsProxy = 'http://127.0.0.1:7890/';
        if (typeof exchange.enableDemoTrading === 'function') exchange.enableDemoTrading(true);
      }
    } else {
      const k = config.exchange?.binance?.spot_testnet?.api_key || process.env.BINANCE_SPOT_TESTNET_API_KEY;
      const s = config.exchange?.binance?.spot_testnet?.api_secret || process.env.BINANCE_SPOT_TESTNET_API_SECRET;
      if (k && s) {
        exchange = new ccxt.binance({ apiKey: k, secret: s, enableRateLimit: true });
        exchange.httpsProxy = 'http://127.0.0.1:7890/';
        if (typeof exchange.setSandboxMode === 'function') exchange.setSandboxMode(true);
      }
    }
    if (exchange) {
      await exchange.fetchBalance();
      const syms = symbols.slice(0, 3);
      snapshot = await getMarketSnapshot(exchange, syms, isFutures);
      ccxtCaps = await buildCcxtCapabilities(exchange, isFutures);
    }
  } catch (e) {
    console.log('⚠️ 行情初始化失败，进入离线模式：', e.message);
  }

  const usefulCaps = buildUsefulCaps(ccxtCaps || {}, isFutures, allowedSymbols);

  let systemWork = systemOrig;
  let userWork = userOrig;
  let systemDraft = '';
  let userDraft = '';
  let systemDraftLocalized = '';
  let userDraftLocalized = '';
  let pendingConfigUpdates = null;

  function help() {
    console.log('\n可用命令:');
    console.log('  help                 查看帮助');
    console.log('  lang [code]          设置语言(en/zh/fr/es/ru/ja)');
    console.log('  cap                  查看当前可用数据/能力清单');
    console.log('  cap-ccxt             查看 CCXT 能力与接口（describe/has/timeframes/urls 等）');
    console.log('  cap-ccxt-compact     查看精简后的“策略相关能力”');
    console.log('  schema               查看数据架构（ticker/ohlcv/balance/positions 字段说明）');
    console.log('  placeholders         查看模板中的可用占位符');
    console.log('  explain-prompts      查看本地详细说明（system/user prompt 与 market_sections）');
    console.log('  show-config          显示当前配置中的 data.* 与 allowed_symbols');
    console.log('  apply-config         应用最近一次建议中的 config_updates 到 config.json');
    console.log('  discard-config       丢弃待应用的 config_updates');
    console.log('  fetch SYMBOL         临时抓取某交易对小样本(需已连接)');
    console.log('  show system|user     查看当前模板');
    console.log('  ask [问题]           仅提问（Q&A），不修改模板');
    console.log('  suggest [说明]       生成改写建议（返回英文与本地化），若含 config_updates 可用 apply-config 落盘');
    console.log('  diff system|user     查看草稿与当前模板差异');
    console.log('  apply system|user    应用草稿到工作副本（使用英文版）');
    console.log('  test-render          预览当前 user_prompt 渲染');
    console.log('  save                 保存工作副本到文件（自动备份）');
    console.log('  revert               回滚到文件原始内容');
    console.log('  exit                 退出');
    console.log('  (提示) 自由输入默认按问答处理；只有显式使用 suggest 才生成改动草稿');
  }

  function explain(key) {
    const pack = explanations[key] || {};
    const msg = pack[userLang] || pack['en'];
    if (msg) console.log('\n' + msg + '\n');
  }

  function explainPrompts() {
    const pd = explanations.prompt_docs || {};
    const pack = pd[userLang] || pd['en'] || {};
    console.log('\n[system prompt]');
    console.log(pack.system_prompt || '(no doc)');
    console.log('\n[user prompt]');
    console.log(pack.user_prompt || '(no doc)');
    console.log('\n[placeholders]');
    console.log(JSON.stringify(pack.placeholders || [], null, 2));
    console.log('\n[market_sections]');
    console.log(pack.market_sections || '(no doc)');
    console.log('');
  }

  function showConfig() {
    const data = config.data || {};
    const out = {
      trading_env: config.trading_env,
      data: {
        intraday_tf: data.intraday_tf,
        intraday_limit: data.intraday_limit,
        context_tf: data.context_tf,
        context_limit: data.context_limit
      },
      allowed_symbols: config.allowed_symbols || null
    };
    console.log(JSON.stringify(out, null, 2));
    if (pendingConfigUpdates) {
      console.log('\n(有待应用的 config_updates)');
      console.log(JSON.stringify(pendingConfigUpdates, null, 2));
    }
  }

  function deepMerge(target, source) {
    if (!source || typeof source !== 'object') return target;
    for (const k of Object.keys(source)) {
      const sv = source[k];
      if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
        target[k] = deepMerge(target[k] || {}, sv);
      } else {
        target[k] = sv;
      }
    }
    return target;
  }

  function applyConfigUpdates() {
    if (!pendingConfigUpdates) return console.log('无待应用的 config_updates');
    const configPath = resolve(process.cwd(), 'backend/test/ai-trading/config.json');
    const bak = backupFile(configPath);
    if (bak) console.log('已备份配置 ->', bak);
    const raw = readFileSync(configPath, 'utf8');
    const current = JSON.parse(raw);
    const next = deepMerge({ ...current }, pendingConfigUpdates);
    writeFileSync(configPath, JSON.stringify(next, null, 2), 'utf8');
    console.log('✅ 配置已更新到 config.json');
    pendingConfigUpdates = null;
  }

  async function requestSuggestion(instruction) {
    if (!aiApiKey) throw new Error('缺少 AI API KEY');
    const context = {
      environment: isFutures ? 'demo.binance.com (USDT-M Futures)' : 'binance spot testnet',
      is_futures: isFutures,
      trading_mode: isFutures ? 'perpetual futures (isolated)' : 'spot (no leverage)',
      allowed_symbols: allowedSymbols,
      timeframes: usefulCaps.timeframes,
      api_has: usefulCaps.api_has,
      schemas: usefulCaps.schemas,
      placeholders: ['minutes_since_start','now_iso','invocation_count','market_sections','account_value','available_cash','total_return','positions_block','sharpe_ratio'],
      docs: explanations.prompt_docs || {},
      available_data: {
        config_fields: ['trading_env','allowed_symbols','symbols_monitor','ai.presets','data.intraday_tf','data.context_tf'],
        market_snapshot_symbols: Object.keys(snapshot),
        api_endpoints: ['fetchTicker','fetchOHLCV','fetchBalance'],
        render_placeholders: extractPlaceholders(userWork),
        useful_caps: usefulCaps
      },
      current_prompts: { system_prompt: systemWork, user_prompt: userWork },
      market_snapshot: snapshot,
      user_request: instruction || `improve clarity; keep schema strict; localize to ${userLang}`,
      target_language: userLang
    };
    const sys = buildSuggestSystemPrompt(userLang);
    const usr = buildSuggestUserPrompt(context);
    console.log('🧠 正在请求建议...');
    const raw = await callDeepSeek(aiApiKey, aiModel, sys, usr, aiTemperature, aiMaxTokens);
    let json = null;
    const match = raw.match(/\{[\s\S]*\}/);
    json = JSON.parse(match ? match[0] : raw);
    systemDraft = json.system_prompt_en || '';
    userDraft = json.user_prompt_en || '';
    systemDraftLocalized = json.system_prompt_localized || '';
    userDraftLocalized = json.user_prompt_localized || '';
    pendingConfigUpdates = json.config_updates || null;
    console.log('✅ 已生成草稿（英文为最终应用版本，本地化供阅读参考）');
    if (json.rationale_localized) console.log('\n理由(本地化):\n' + json.rationale_localized);
    if (json.rationale_en) console.log('\nRationale(EN):\n' + json.rationale_en);
    if (systemDraftLocalized) console.log('\n----- system prompt (Localized) -----\n' + systemDraftLocalized.slice(0, 1200));
    if (userDraftLocalized) console.log('\n----- user prompt (Localized) -----\n' + userDraftLocalized.slice(0, 1200));
    if (pendingConfigUpdates) {
      console.log('\n(检测到配置变更建议 config_updates，使用 show-config 查看，确认后可执行 apply-config 落盘)');
    }
  }

  async function requestAnswer(question) {
    if (!aiApiKey) throw new Error('缺少 AI API KEY');
    const context = {
      environment: isFutures ? 'demo.binance.com (USDT-M Futures)' : 'binance spot testnet',
      is_futures: isFutures,
      timeframes: usefulCaps.timeframes,
      api_has: usefulCaps.api_has,
      current_prompts: { system_prompt: systemWork, user_prompt: userWork },
      docs: explanations.prompt_docs || {},
      market_snapshot: snapshot
    };
    const sys = buildAskSystemPrompt(userLang);
    const usr = buildAskUserPrompt(context, question);
    console.log('💬 正在获取答案...');
    const raw = await callDeepSeek(aiApiKey, aiModel, sys, usr, 0.2, 1200);
    const match = raw.match(/\{[\s\S]*\}/);
    let json = null;
    try { json = JSON.parse(match ? match[0] : raw); } catch (_) {}
    if (!json) return console.log('无法解析模型回答');
    if (json.type === 'question') {
      if (json.answer_localized) console.log('\n答复(本地化):\n' + json.answer_localized);
      if (json.answer_en) console.log('\nAnswer(EN):\n' + json.answer_en);
    } else {
      if (json.answer_localized) console.log('\n建议(本地化):\n' + json.answer_localized);
      if (json.answer_en) console.log('\nSuggestion(EN):\n' + json.answer_en);
      console.log('\n(提示) 如需将建议落地为模板修改，请显式使用 suggest 命令)');
    }
  }

  console.log('🧰 Prompt Studio 已启动');
  console.log(`环境: ${tradingEnv}  模型: ${aiProvider}:${aiModel}`);
  console.log(`语言偏好: ${userLang} (${LangName[userLang]})`);
  help();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });
  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) return rl.prompt();
    const [cmd, ...rest] = input.split(' ');
    const arg = rest.join(' ').trim();

    try {
      if (cmd === 'help') {
        help();
      }
      else if (cmd === 'lang') {
        const l = normalizeLang(arg);
        userLang = l;
        console.log(`✅ 已设置语言: ${userLang} (${LangName[userLang]})`);
      }
      else if (cmd === 'cap') {
        const info = {
          env: tradingEnv,
          isFutures,
          allowedSymbols,
          symbols,
          exchangeConnected: false,
          apiEndpoints: ['fetchTicker','fetchOHLCV','fetchBalance'],
          availablePlaceholders: extractPlaceholders(userWork),
          recommendedPlaceholders: ['minutes_since_start','now_iso','invocation_count','market_sections','account_value','available_cash','total_return','positions_block','sharpe_ratio'],
          snapshotSymbols: Object.keys({})
        };
        console.log(JSON.stringify(info, null, 2));
        explain('cap');
      }
      else if (cmd === 'cap-ccxt') {
        const info = await buildCcxtCapabilities(null, isFutures);
        console.log(JSON.stringify(info, null, 2));
        explain('cap-ccxt');
      }
      else if (cmd === 'cap-ccxt-compact') {
        console.log(JSON.stringify(usefulCaps, null, 2));
        printUsefulCapsExplanation(usefulCaps, userLang, explanations);
      }
      else if (cmd === 'schema') {
        const schemas = {
          ticker: ['symbol','timestamp','datetime','high','low','bid','ask','vwap','open','close','last','baseVolume','quoteVolume','info'],
          ohlcv: ['timestamp','open','high','low','close','volume'],
          balance: ['free','used','total','info'],
          position: isFutures ? ['symbol','contracts','entryPrice','markPrice','liquidationPrice','unrealizedPnl','notional'] : []
        };
        console.log(JSON.stringify(schemas, null, 2));
        explain('schema');
      }
      else if (cmd === 'placeholders') {
        console.log(JSON.stringify({ system: extractPlaceholders(systemWork), user: extractPlaceholders(userWork) }, null, 2));
      }
      else if (cmd === 'explain-prompts') {
        explainPrompts();
      }
      else if (cmd === 'show-config') {
        showConfig();
      }
      else if (cmd === 'apply-config') {
        applyConfigUpdates();
      }
      else if (cmd === 'discard-config') {
        pendingConfigUpdates = null;
        console.log('已丢弃待应用的 config_updates');
      }
      else if (cmd === 'fetch') {
        console.log('此会话模式下未连接交易所');
      }
      else if (cmd === 'show') {
        if (arg === 'system') console.log('\n----- system prompt (EN) -----\n' + systemWork);
        else if (arg === 'user') console.log('\n----- user prompt (EN) -----\n' + userWork);
        else console.log('用法: show system|user');
      }
      else if (cmd === 'ask') {
        if (!arg) console.log('用法: ask 你的问题');
        else await requestAnswer(arg);
      }
      else if (cmd === 'suggest') {
        await requestSuggestion(arg);
      }
      else if (cmd === 'diff' || cmd === 'apply' || cmd === 'test-render' || cmd === 'save' || cmd === 'revert') {
        console.log('此会话的演示模式下禁用编辑/保存，请使用标准运行以启用完整功能');
      }
      else if (cmd === 'exit') {
        rl.close(); return;
      }
      else {
        await requestAnswer(input);
      }
    } catch (err) {
      console.log('操作失败:', err.message);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('👋 退出 Prompt Studio');
    process.exit(0);
  });
}

main().catch(err => {
  console.error('prompt_studio 运行失败:', err);
  process.exit(1);
});
