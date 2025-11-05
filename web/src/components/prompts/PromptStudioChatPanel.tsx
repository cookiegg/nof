"use client";
import { useEffect, useMemo, useState } from "react";
import BotList from "@/components/trading/BotList";
import type { BotConfig } from "@/components/trading/BotControlPanel";
import { useLocale } from "@/store/useLocale";

type Msg = { role: 'user' | 'assistant' | 'system'; content: string };

export default function PromptStudioChatPanel() {
  const { locale } = useLocale();
  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'system', content: t('Prompt Studio Chat 已就绪：输入问题进行问答（问答），或点击“建议”让模型产出模板草稿。', 'Prompt Studio Chat ready: type a question to Ask, or click "Suggest" to draft prompts.') }
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
      setMessages((m) => [...m, { role: 'assistant', content: String(j?.answer || t('(无回答)', '(no answer)')) }]);
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
      const botInfo = selectedBot ? (locale === 'zh' ? `[基于Bot: ${selectedBot.name || selectedBot.id}]\n\n` : `[Based on Bot: ${selectedBot.name || selectedBot.id}]\n\n`) : '';
      const blocks = [
        s.system_prompt_en ? `${t('系统提示（英文）', 'System Prompt (EN)')}\n\n${s.system_prompt_en}` : null,
        s.user_prompt_en ? `${t('用户提示（英文）', 'User Prompt (EN)')}\n\n${s.user_prompt_en}` : null,
        s.rationale_en ? `${t('推理说明', 'Rationale')}\n\n${s.rationale_en}` : null,
        s.config_updates ? `${t('配置更新（JSON）', 'Config Updates (JSON)')}\n\n${JSON.stringify(s.config_updates, null, 2)}` : null,
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
      const modeLabel = selectedBot?.promptMode === 'bot-specific' ? t('独立', 'bot-specific') : t('共享', 'env-shared');
      const botInfo = selectedBot ? (locale === 'zh'
        ? `[Bot: ${selectedBot.name || selectedBot.id}, 模式: ${modeLabel}]\n\n`
        : `[Bot: ${selectedBot.name || selectedBot.id}, Mode: ${modeLabel}]\n\n`) : '';
      const sysTitle = t('当前 System 提示', 'Current System');
      const userTitle = t('当前 User 提示', 'Current User');
      setMessages((m) => [...m, { role: 'assistant', content: `${botInfo}${sysTitle}\n\n${j.system || ''}\n\n---\n\n${userTitle}\n\n${j.user || ''}` }]);
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
      const target = selectedBot?.id
        ? (selectedBot.promptMode === 'bot-specific'
            ? (locale === 'zh' ? `Bot "${selectedBot.name || selectedBot.id}"` : `Bot "${selectedBot.name || selectedBot.id}"`)
            : (locale === 'zh' ? `环境 "${selectedBot.env}"` : `Env "${selectedBot.env}"`))
        : (locale === 'zh' ? '模板' : 'Template');
      const sysDiff = t('System 差异', 'System Diff');
      const userDiff = t('User 差异', 'User Diff');
      setMessages((m) => [...m, { role: 'assistant', content: `[${target}] ${sysDiff}\n\n${j.system_diff}\n\n---\n\n${userDiff}\n\n${j.user_diff}` }]);
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
      const target = selectedBot?.id
        ? (selectedBot.promptMode === 'bot-specific'
            ? (locale === 'zh' ? `Bot "${selectedBot.name || selectedBot.id}"` : `Bot "${selectedBot.name || selectedBot.id}"`)
            : (locale === 'zh' ? `环境 "${selectedBot.env}"` : `Env "${selectedBot.env}"`))
        : (locale === 'zh' ? '模板' : 'Template');
      const applied = t('已应用草稿到', 'Applied draft to ');
      const tail = selectedBot?.promptMode === 'bot-specific' ? '' : t('（已备份）', '(backed up)');
      setMessages((m) => [...m, { role: 'assistant', content: `${applied}${target} 的 Prompt${locale === 'zh' ? '' : ''}${tail ? ' ' + tail : ''}` }]);
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
      setMessages((m) => [...m, { role: 'assistant', content: t('已回滚至最近的模板备份', 'Reverted to the latest template backup') }]);
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setBusy(false); }
  }

  async function onPlaceholders() {
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/nof1/ai/prompt/placeholders');
      const j = await r.json();
      const title = t('占位符', 'Placeholders');
      setMessages((m) => [...m, { role: 'assistant', content: `${title}\n\n${(j.placeholders || []).join('\n')}` }]);
    } finally { setBusy(false); }
  }

  async function onCapabilities() {
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/nof1/ai/capabilities/compact');
      const j = await r.json();
      const title = t('能力（简）', 'Capabilities (compact)');
      setMessages((m) => [...m, { role: 'assistant', content: `${title}\n\n${JSON.stringify(j, null, 2)}` }]);
    } finally { setBusy(false); }
  }

  return (
    <aside className="h-full flex flex-col pr-1">
      {/* 多Bot交易控制区：固定在顶部，可滚动 */}
      <div className="flex-shrink-0 mb-3" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
        <BotList 
          models={['qwen3-max', 'qwen3-plus', 'glm-4.6', 'deepseek-v3.2-exp', 'deepseek-v3.1']}
          onBotSelect={setSelectedBot}
          selectedBotId={selectedBot?.id || null}
        />
      </div>

      {/* Prompt Studio Chat */}
      <div className="flex-shrink-0 mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
          {t('Prompt Studio Chat', 'Prompt Studio Chat')}
        </div>
        {selectedBot && (
          <div className="text-[10px] px-2 py-0.5 rounded" style={{ 
            background: 'rgba(59, 130, 246, 0.15)',
            color: 'rgb(59, 130, 246)',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            {t('编辑', 'Editing')}: {selectedBot.name || selectedBot.id} ({selectedBot.promptMode === 'bot-specific' ? t('独立', 'bot-specific') : t('共享', 'env-shared')})
          </div>
        )}
      </div>
      {error && (
        <div className="flex-shrink-0 mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: 'var(--chip-border)', color: 'var(--danger)' }}>{error}</div>
      )}
      <div className="flex-shrink-0 mb-2 flex flex-wrap gap-2 text-xs">
        <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={onShow} disabled={busy}>{t('显示', 'show')}</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }} onClick={onSuggest} disabled={busy}>{t('建议', 'suggest')}</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={onDiff} disabled={busy || !draft}>{t('对比', 'diff')}</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }} onClick={onApply} disabled={busy || !draft}>{t('应用', 'apply')}</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={onSave} disabled={busy}>{t('保存', 'save')}</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={onRevert} disabled={busy}>{t('回滚', 'revert')}</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={onPlaceholders} disabled={busy}>{t('占位符', 'placeholders')}</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={onCapabilities} disabled={busy}>{t('能力（简）', 'cap-ccxt-compact')}</button>
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
          placeholder={t('提出关于模板/配置/能力的问题…', 'Ask about prompts/config/capabilities…')}
        />
        <div className="flex items-center gap-2 text-xs">
          <button className="rounded px-2 py-1 chip-btn" style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }} onClick={onAsk} disabled={busy || !input.trim()}>{t('问答', 'Ask')}</button>
          <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={onSuggest} disabled={busy}>{t('建议', 'Suggest')}</button>
        </div>
      </div>

    </aside>
  );
}


