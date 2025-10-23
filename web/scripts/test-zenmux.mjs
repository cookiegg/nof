#!/usr/bin/env node
/**
 * Quick tester for ZenMux OpenAI‑compatible gateway.
 *
 * Reads env:
 *  - OPENAI_API_URL (default https://zenmux.ai/api/v1)
 *  - OPENAI_API_KEY (required)
 *  - OPENAI_MODEL   (default openai/gpt-5)
 *  - OPENAI_EXTRA_HEADERS (JSON, optional)
 *  - OPENAI_EXTRA_BODY    (JSON, optional)
 *
 * Usage:
 *   node scripts/test-zenmux.mjs [--content "要提问的内容"]
 */

import process from 'node:process';

const argv = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) {
    const k = a.slice(2);
    const v = (i + 1 < process.argv.length && !process.argv[i + 1].startsWith('--')) ? process.argv[++i] : 'true';
    argv.set(k, v);
  }
}

const baseURL = (process.env.OPENAI_API_URL || 'https://zenmux.ai/api/v1').replace(/\/+$/, '');
const endpoint = baseURL + '/chat/completions';
const apiKey = process.env.OPENAI_API_KEY || '';
const model = process.env.OPENAI_MODEL || 'openai/gpt-5';
const extraHeaders = safeJSON(process.env.OPENAI_EXTRA_HEADERS) || {};
const extraBody = safeJSON(process.env.OPENAI_EXTRA_BODY) || undefined;
const content = argv.get('content') || '解释一下什么是量子计算';

if (!apiKey) {
  console.error('OPENAI_API_KEY not set');
  process.exit(1);
}

const headers = {
  'content-type': 'application/json',
  'accept': 'application/json',
  'authorization': `Bearer ${apiKey}`,
  ...extraHeaders,
};

const payloadMinimal = {
  model,
  messages: [{ role: 'user', content }],
};

const payloadRouted = extraBody ? { ...payloadMinimal, ...extraBody } : payloadMinimal;

console.log('== ZenMux chat/completions test ==');
console.log('URL      :', endpoint);
console.log('Model    :', model);
console.log('Headers  :', redactHeaders(headers));

await run('minimal', payloadMinimal);
if (extraBody) await run('with-extra-body', payloadRouted);

async function run(label, body) {
  const started = Date.now();
  const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) }).catch(e => ({ ok: false, status: 0, text: async () => String(e) }));
  const ms = Date.now() - started;
  let text = '';
  try { text = await res.text(); } catch { /* noop */ }
  console.log(`\n-- Case: ${label}`);
  console.log('Status   :', res.status, res.ok ? '(OK)' : '(FAIL)', `${ms}ms`);
  const ct = res.headers?.get?.('content-type') || '';
  console.log('CT       :', ct);
  try {
    const json = JSON.parse(text);
    const content = json?.choices?.[0]?.message?.content || json?.output_text || null;
    if (content) {
      console.log('Answer   :', oneLine(content));
    } else {
      console.log('JSON     :', slice(text, 800));
    }
  } catch {
    console.log('Body     :', slice(text, 800));
  }
}

function safeJSON(s) { try { return s ? JSON.parse(s) : undefined; } catch { return undefined; } }
function slice(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : s; }
function oneLine(s) { return s.replace(/\s+/g, ' ').trim(); }
function redactHeaders(h) {
  const out = { ...h };
  for (const k of Object.keys(out)) {
    const low = k.toLowerCase();
    if (low.includes('authorization') || low.includes('api-key') || low.includes('token') || low.includes('secret')) {
      out[k] = redact(out[k]);
    }
  }
  return out;
}
function redact(val) {
  if (!val) return val;
  if (val.length <= 6) return '***';
  return `${val.slice(0, 6)}…${val.slice(-4)}`;
}

