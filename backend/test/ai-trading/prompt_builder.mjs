import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { dirname, resolve } from 'path';

// 简单变量替换渲染（仅支持 {{key}} 级别，不做循环）
function renderSimple(template, context) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g, (_, key) => {
    const val = key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : ''), context);
    return String(val ?? '');
  });
}

function loadConfig() {
  const configPath = resolve(process.cwd(), 'backend/test/ai-trading/config.json');
  const raw = readFileSync(configPath, 'utf8');
  return JSON.parse(raw);
}

function ensureDir(path) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function backupFile(path) {
  if (existsSync(path)) {
    const bak = path + '.' + new Date().toISOString().replace(/[:.]/g, '-') + '.bak';
    copyFileSync(path, bak);
    return bak;
  }
  return null;
}

async function callDeepSeek(apiKey, model, systemPrompt, userPrompt, temperature = 0.7, maxTokens = 1500) {
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
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? '';
}

function buildMetaSystemPrompt() {
  return (
    'You are a senior prompt engineer. Help refine two templates: (1) system prompt; (2) user prompt template. ' +
    'User prompt template must be a plain text template with placeholders like {{market_sections}}, {{account_value}}, {{available_cash}}, {{total_return}}, {{positions_block}}, {{sharpe_ratio}}, {{minutes_since_start}}, {{now_iso}}, {{invocation_count}}. ' +
    'Only output STRICT JSON: {"system_prompt": string, "user_prompt": string}. No extra text.'
  );
}

function buildMetaUserPrompt(contextPreview) {
  return (
    'Context preview for placeholders and constraints:\n' +
    JSON.stringify(contextPreview, null, 2) + '\n\n' +
    'Please propose:\n' +
    '1) A concise but strict system prompt enforcing whitelists, env, leverage rules.\n' +
    '2) A user prompt template using the provided placeholders, no loops.\n' +
    'Output STRICT JSON only.'
  );
}

async function main() {
  const config = loadConfig();
  const systemPath = resolve(process.cwd(), config.prompt_files.system_prompt_path);
  const userPath = resolve(process.cwd(), config.prompt_files.user_prompt_path);

  const aiKey = (config.ai.api_key || '').replace(/^\$\{(.+)\}$/, (_, k) => process.env[k] || '');
  if (!aiKey) {
    console.error('缺少 AI API Key（config.ai.api_key 或 环境变量）。');
    process.exit(1);
  }

  const environment = config.trading_env === 'demo-futures' ? 'demo.binance.com (USDT-M Futures)' : 'binance spot testnet';
  const isFutures = config.trading_env === 'demo-futures';
  const allowed = (config.allowed_symbols && config.allowed_symbols.length > 0)
    ? config.allowed_symbols
    : (isFutures
       ? ['BTC/USDT:USDT','ETH/USDT:USDT','SOL/USDT:USDT','BNB/USDT:USDT','XRP/USDT:USDT','DOGE/USDT:USDT']
       : ['BTC/USDT','ETH/USDT','SOL/USDT','BNB/USDT','XRP/USDT','DOGE/USDT']);

  const contextPreview = {
    environment,
    is_futures: isFutures,
    trading_mode: isFutures ? 'perpetual futures (isolated)' : 'spot (no leverage)',
    allowed_symbols: allowed,
    placeholders: [
      'minutes_since_start','now_iso','invocation_count','market_sections','account_value','available_cash','total_return','positions_block','sharpe_ratio'
    ]
  };

  const metaSystem = buildMetaSystemPrompt();
  const metaUser = buildMetaUserPrompt(contextPreview);

  console.log('🧠 正在向模型请求改进的 prompts ...');
  const raw = await callDeepSeek(
    aiKey,
    config.ai.model || 'deepseek-chat',
    metaSystem,
    metaUser,
    config.ai.temperature ?? 0.7,
    Math.min(3000, config.ai.max_tokens ?? 2000)
  );

  let parsed = null;
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : raw);
  } catch (e) {
    console.error('解析模型输出失败，保留原模板。');
  }

  ensureDir(systemPath);
  ensureDir(userPath);

  const sysBak = backupFile(systemPath);
  const userBak = backupFile(userPath);
  if (sysBak) console.log('已备份 system_prompt ->', sysBak);
  if (userBak) console.log('已备份 user_prompt ->', userBak);

  if (parsed && typeof parsed.system_prompt === 'string') {
    writeFileSync(systemPath, parsed.system_prompt, 'utf8');
  } else {
    console.log('未获取到新的 system_prompt，保留现有文件。');
  }

  if (parsed && typeof parsed.user_prompt === 'string') {
    writeFileSync(userPath, parsed.user_prompt, 'utf8');
  } else {
    console.log('未获取到新的 user_prompt，保留现有文件。');
  }

  console.log('✅ 模板更新完成。');
}

main().catch(err => {
  console.error('prompt_builder 运行失败:', err);
  process.exit(1);
});
