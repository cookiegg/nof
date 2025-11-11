"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
import type { BotConfig } from "@/components/trading/BotControlPanel";
import { useLocale } from "@/store/useLocale";

type Msg = { role: 'user' | 'assistant' | 'system'; content: string };

export default function PromptStudioChatPanel({ selectedBot }: { selectedBot: BotConfig | null }) {
  const Markdown: any = useMemo(() =>
    dynamic(() => import('react-markdown').then(mod => mod.default as any), { ssr: false, loading: () => null }) as any,
  []);
  const { locale } = useLocale();
  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);
  const [showHelp, setShowHelp] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'system', content: t('Prompt Studio Chat 已就绪：输入问题进行问答（问答），或点击“建议”让模型产出模板草稿。', 'Prompt Studio Chat ready: type a question to Ask, or click "Suggest" to draft prompts.') }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // selectedBot 由父级页面传入，以便将“交易 bot”与“Prompt Studio Chat”分栏

  function onClear() {
    setError(null);
    setDraft(null);
    setInput("");
    setMessages([
      { role: 'system', content: t('Prompt Studio Chat 已就绪：输入问题进行问答（问答），或点击“建议”让模型产出模板草稿。', 'Prompt Studio Chat ready: type a question to Ask, or click "Suggest" to draft prompts.') }
    ]);
  }
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
      const title = t('可用行情数据', 'Available market data');
      setMessages((m) => [...m, { role: 'assistant', content: `${title}\n\n${JSON.stringify(j, null, 2)}` }]);
    } finally { setBusy(false); }
  }

  return (
    <aside className="h-full flex flex-col pr-1">
      {/* 多Bot交易控制区已迁移到页面左侧独立栏位，这里移除 */}

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
        <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={onShow} disabled={busy}>{t('显示当前prompt', 'Show current prompt')}</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }} onClick={onSuggest} disabled={busy}>{t('建议', 'suggest')}</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={onDiff} disabled={busy || !draft}>{t('对比', 'diff')}</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }} onClick={onApply} disabled={busy || !draft}>{t('应用', 'apply')}</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={onSave} disabled={busy}>{t('保存', 'save')}</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={onRevert} disabled={busy}>{t('回滚', 'revert')}</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={onPlaceholders} disabled={busy}>{t('占位符', 'placeholders')}</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={onCapabilities} disabled={busy}>{t('可用行情数据', 'Available market data')}</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={() => setShowHelp(true)} disabled={busy}>{t('使用说明', 'Help')}</button>
        <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--danger)', border: '1px solid var(--chip-border)' }} onClick={onClear} disabled={busy}>{t('清空对话', 'Clear')}</button>
      </div>
      
      {/* 对话内容区：可滚动 */}
      <div className="flex-1 overflow-y-auto mb-2 flex flex-col gap-2 text-xs">
        {messages.map((m, i) => (
          <div key={i} className="rounded border p-2" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}>
            <div className="mb-1 opacity-70">{m.role}</div>
            {m.role === 'assistant' ? (
              // Markdown 渲染（仅对模型输出开启）
              // 说明：需要 web 侧安装 react-markdown 依赖
              <div className="markdown-body" style={{ lineHeight: 1.6 }}>
                <Markdown remarkPlugins={[remarkGfm]}>{m.content || ''}</Markdown>
              </div>
            ) : (
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
            )}
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
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!busy && input.trim()) {
                onAsk();
              }
            }
          }}
          placeholder={t('提出关于模板/配置/能力的问题…', 'Ask about prompts/config/capabilities…')}
        />
        <div className="flex items-center gap-2 text-xs">
          <button className="rounded px-2 py-1 chip-btn" style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }} onClick={onAsk} disabled={busy || !input.trim()}>{t('问答', 'Ask')}</button>
          <button className="rounded px-2 py-1 chip-btn" style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }} onClick={onSuggest} disabled={busy}>{t('建议', 'Suggest')}</button>
        </div>
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowHelp(false)}>
          <div className="max-w-2xl w-[92%] sm:w-[640px] max-h-[80vh] overflow-y-auto rounded border p-4 text-xs"
               style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
               onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">{t('Prompt Studio Chat 使用说明', 'Prompt Studio Chat Guide')}</div>
              <button className="rounded px-2 py-1 chip-btn" style={{ border: '1px solid var(--chip-border)', color: 'var(--btn-inactive-fg)' }} onClick={() => setShowHelp(false)}>
                {t('关闭', 'Close')}
              </button>
            </div>
            <div style={{ whiteSpace: 'pre-wrap' }}>
{t(`
一、它是什么
- 面向“提示词模板与配置”的对话式工作台：查看/生成/对比/应用/回滚 Prompt，支持按 Bot 或按环境共享管理。

二、基本流程
1) 显示当前prompt：读取当前 System/User 提示，确认基线内容。
2) 建议：由模型生成英文模板草稿（System/User/Rationale/Config）。
3) 对比：将草稿与当前提示做差异比对，便于审阅变更。
4) 应用：将草稿写入对应目标（Bot 独立 或 环境共享）；自动备份。
5) 回滚：恢复到最近一次模板备份。

三、选择目标
- 右上方选择 Bot：
  · 独立（bot-specific）：只影响该 Bot 的专属提示。
  · 共享（env-shared）：影响同一环境（如 test-spot / demo-futures）下的共用模板。

四、辅助能力
- 占位符：列出可用占位符键（用于在运行时注入变量）。
- 可用行情数据：展示后端可提供的精简数据能力，便于引用。

五、最佳实践
- 以英文维护主模板，减少歧义；必要时附中文注释。
- 先“显示当前prompt”，再“建议/对比”，最后“应用”。
- 小步快跑：频繁备份与回滚，确保可控演进。

六、常见问题
- 看不到差异：请先点击“建议”生成草稿；或确认已选择 Bot。
- 应用无效：检查是否选错“独立/共享”模式；或检查权限与文件写入。
`,
`
What is it
- A chat-based workspace for prompt templates/configs: view / suggest / diff / apply / revert. Supports per-Bot and env-shared management.

Typical flow
1) Show current prompt: load System/User as the baseline.
2) Suggest: let the model draft EN templates (System/User/Rationale/Config).
3) Diff: compare draft vs current prompts.
4) Apply: write the draft to target (bot-specific or env-shared) with backup.
5) Revert: restore to the latest backup.

Target selection
- Choose a Bot:
  · bot-specific: only this bot's prompts are affected.
  · env-shared: shared templates under the same environment (e.g., test-spot / demo-futures).

Assistive tools
- Placeholders: list available placeholder keys for runtime injection.
- Available market data: show compact backend data capabilities.

Best practices
- Keep EN as the primary template; add CN notes if needed.
- Do "Show" → "Suggest/Diff" → "Apply" in order.
- Iterate safely with frequent backups and reverts.

FAQ
- No diff shown: generate a draft with "Suggest"; ensure a Bot is selected.
- Apply not effective: confirm bot-specific/env-shared mode and file permissions.
`)}
            </div>
          </div>
        </div>
      )}

    </aside>
  );
}


