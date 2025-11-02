"use client";
import { useEffect, useMemo, useState } from "react";
import BotList from "@/components/trading/BotList";
import type { BotConfig } from "@/components/trading/BotControlPanel";

type Msg = { role: 'user' | 'assistant' | 'system'; content: string };

export default function PromptStudioChatPanel() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'system', content: 'Prompt Studio Chat 已就绪：输入问题进行问答（ask），或点击"建议"让模型产出模板草稿。' }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBot, setSelectedBot] = useState<BotConfig | null>(null);

  async function onAsk() {
    if (!input.trim()) return;
    const q = input.trim();
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const body: any = { question: q };
      if (selectedBot?.id) {
        body.botId = selectedBot.id;
      }
      const r = await fetch('/api/nof1/ai/prompt/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setMessages((m) => [...m, { role: 'assistant', content: String(j?.answer || '(no answer)') }]);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onSuggest() {
    setBusy(true);
    setError(null);
    try {
      const body: any = {};
      if (selectedBot?.id) {
        body.botId = selectedBot.id;
      }
      const r = await fetch('/api/nof1/ai/prompt/suggest', { 
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      const s = j?.suggestion || {};
      const botInfo = selectedBot ? `[基于Bot: ${selectedBot.name || selectedBot.id}]\n\n` : '';
      const blocks = [
        s.system_prompt_en ? `System Prompt (EN)\n\n${s.system_prompt_en}` : null,
        s.user_prompt_en ? `User Prompt (EN)\n\n${s.user_prompt_en}` : null,
        s.rationale_en ? `Rationale\n\n${s.rationale_en}` : null,
        s.config_updates ? `Config Updates (JSON)\n\n${JSON.stringify(s.config_updates, null, 2)}` : null,
      ].filter(Boolean);
      setMessages((m) => [...m, { role: 'assistant', content: botInfo + blocks.join('\n\n---\n\n') }]);
      // 缓存草稿以便 Diff/Apply
      setDraft({ system: s.system_prompt_en || '', user: s.user_prompt_en || '' });
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  const [draft, setDraft] = useState<{ system: string; user: string } | null>(null);

  // --- 配置加载（用于获取AI预设列表） ---
  const [cfg, setCfg] = useState<any>(null);
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const c = await fetch('/api/nof1/ai/config', { cache: 'no-store' });
        const cj = await c.json();
        if (!abort) {
          setCfg(cj);
        }
      } catch (_) {
        // ignore
      }
    })();
    return () => { abort = true; };
  }, []);

  async function onShow() {
    setBusy(true); setError(null);
    try {
      let url = '/api/nof1/ai/prompts';
      // 如果选中了Bot，根据promptMode加载对应的Prompt
      if (selectedBot?.id) {
        if (selectedBot.promptMode === 'bot-specific') {
          url = `/api/nof1/bots/${selectedBot.id}/prompts`;
        } else {
          url = `/api/nof1/ai/prompts?env=${selectedBot.env}`;
        }
      }
      const r = await fetch(url);
      const j = await r.json();
      const botInfo = selectedBot ? `[Bot: ${selectedBot.name || selectedBot.id}, Mode: ${selectedBot.promptMode || 'env-shared'}]\n\n` : '';
      setMessages((m) => [...m, { role: 'assistant', content: `${botInfo}Current System\n\n${j.system || ''}\n\n---\n\nCurrent User\n\n${j.user || ''}` }]);
    } finally { setBusy(false); }
  }

  async function onDiff() {
    if (!draft) return;
    setBusy(true); setError(null);
    try {
      // 加载当前Prompt用于对比
      let currentUrl = '/api/nof1/ai/prompts';
      if (selectedBot?.id) {
        if (selectedBot.promptMode === 'bot-specific') {
          currentUrl = `/api/nof1/bots/${selectedBot.id}/prompts`;
        } else {
          currentUrl = `/api/nof1/ai/prompts?env=${selectedBot.env}`;
        }
      }
      const r0 = await fetch(currentUrl);
      const cur = await r0.json();
      
      const diffBody: any = { system: draft.system, user: draft.user };
      if (selectedBot?.id) {
        diffBody.botId = selectedBot.id;
      }
      const r = await fetch('/api/nof1/ai/prompt/diff', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(diffBody)
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      const target = selectedBot?.id ? (selectedBot.promptMode === 'bot-specific' ? `Bot "${selectedBot.name || selectedBot.id}"` : `环境 "${selectedBot.env}"`) : '模板';
      setMessages((m) => [...m, { role: 'assistant', content: `[${target}] System Diff\n\n${j.system_diff}\n\n---\n\nUser Diff\n\n${j.user_diff}` }]);
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setBusy(false); }
  }

  async function onApply() {
    if (!draft) return;
    setBusy(true); setError(null);
    try {
      let url: string;
      let body: any;
      
      // 如果选中了Bot且是bot-specific模式，直接保存到Bot的Prompt
      if (selectedBot?.id && selectedBot.promptMode === 'bot-specific') {
        url = `/api/nof1/bots/${selectedBot.id}/prompts`;
        body = draft;
      } else if (selectedBot?.id) {
        // env-shared模式，使用环境模板的apply API
        url = '/api/nof1/ai/prompt/apply';
        body = { ...draft, env: selectedBot.env };
      } else {
        // 没有选中Bot，使用默认模板的apply API
        url = '/api/nof1/ai/prompt/apply';
        body = draft;
      }
      
      const r = await fetch(url, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      const j = await r.json(); if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      const target = selectedBot?.id ? (selectedBot.promptMode === 'bot-specific' ? `Bot "${selectedBot.name || selectedBot.id}"` : `环境 "${selectedBot.env}"`) : '模板';
      setMessages((m) => [...m, { role: 'assistant', content: `已应用草稿到${target}的Prompt${selectedBot?.promptMode === 'bot-specific' ? '' : '（已备份）'}` }]);
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setBusy(false); }
  }

  async function onSave() {
    // Save current (no-op chat side), suggest user uses apply which already writes files
    await onShow();
  }

  async function onRevert() {
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/nof1/ai/prompt/revert', { method: 'POST' });
      const j = await r.json(); if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setMessages((m) => [...m, { role: 'assistant', content: '已回滚至最近的模板备份' }]);
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setBusy(false); }
  }

  async function onPlaceholders() {
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/nof1/ai/prompt/placeholders');
      const j = await r.json();
      setMessages((m) => [...m, { role: 'assistant', content: `Placeholders\n\n${(j.placeholders || []).join('\n')}` }]);
    } finally { setBusy(false); }
  }

  async function onCapabilities() {
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/nof1/ai/capabilities/compact');
      const j = await r.json();
      setMessages((m) => [...m, { role: 'assistant', content: `Capabilities (compact)\n\n${JSON.stringify(j, null, 2)}` }]);
    } finally { setBusy(false); }
  }

  return (
    <aside className="h-full flex flex-col pr-1">
      {/* 多Bot交易控制区：固定在顶部，可滚动 */}
      <div className="flex-shrink-0 mb-3" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
        <BotList 
          aiPresets={aiPresetKeys} 
          onBotSelect={setSelectedBot}
          selectedBotId={selectedBot?.id || null}
        />
      </div>

      {/* Prompt Studio Chat */}
      <div className="flex-shrink-0 mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
          Prompt Studio Chat
        </div>
        {selectedBot && (
          <div className="text-[10px] px-2 py-0.5 rounded" style={{ 
            background: 'rgba(59, 130, 246, 0.15)',
            color: 'rgb(59, 130, 246)',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            编辑: {selectedBot.name || selectedBot.id} ({selectedBot.promptMode === 'bot-specific' ? '独立' : '共享'})
          </div>
        )}
      </div>
      {error && (
        <div className="flex-shrink-0 mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: 'var(--chip-border)', color: 'var(--danger)' }}>{error}</div>
      )}
      <div className="flex-shrink-0 mb-2 flex flex-wrap gap-2 text-xs">
        <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={onShow} disabled={busy}>show</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }} onClick={onSuggest} disabled={busy}>suggest</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={onDiff} disabled={busy || !draft}>diff</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }} onClick={onApply} disabled={busy || !draft}>apply</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={onSave} disabled={busy}>save</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={onRevert} disabled={busy}>revert</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={onPlaceholders} disabled={busy}>placeholders</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={onCapabilities} disabled={busy}>cap-ccxt-compact</button>
      </div>
      
      {/* 对话内容区：可滚动 */}
      <div className="flex-1 overflow-y-auto mb-2 flex flex-col gap-2 text-xs">
        {messages.map((m, i) => (
          <div key={i} className="rounded border p-2" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}>
            <div className="mb-1 opacity-70">{m.role}</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
          </div>
        ))}
      </div>
      
      {/* 输入区：固定在底部 */}
      <div className="flex-shrink-0 flex flex-col gap-2 bg-transparent">
        <textarea
          className="w-full h-24 rounded border p-2 text-xs"
          style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="提出关于模板/配置/能力的问题…"
        />
        <div className="flex items-center gap-2 text-xs">
          <button className="rounded px-2 py-1 chip-btn" style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }} onClick={onAsk} disabled={busy || !input.trim()}>问答</button>
          <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={onSuggest} disabled={busy}>建议</button>
        </div>
      </div>

    </aside>
  );
}


