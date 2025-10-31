"use client";
import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";

type Msg = { role: 'user' | 'assistant' | 'system'; content: string };

export default function PromptStudioChatPanel() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'system', content: 'Prompt Studio Chat 已就绪：输入问题进行问答（ask），或点击“建议”让模型产出模板草稿。' }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAsk() {
    if (!input.trim()) return;
    const q = input.trim();
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/nof1/ai/prompt/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: q })
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
      const r = await fetch('/api/nof1/ai/prompt/suggest', { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      const s = j?.suggestion || {};
      const blocks = [
        s.system_prompt_en ? `System Prompt (EN)\n\n${s.system_prompt_en}` : null,
        s.user_prompt_en ? `User Prompt (EN)\n\n${s.user_prompt_en}` : null,
        s.rationale_en ? `Rationale\n\n${s.rationale_en}` : null,
        s.config_updates ? `Config Updates (JSON)\n\n${JSON.stringify(s.config_updates, null, 2)}` : null,
      ].filter(Boolean);
      setMessages((m) => [...m, { role: 'assistant', content: blocks.join('\n\n---\n\n') }]);
      // 缓存草稿以便 Diff/Apply
      setDraft({ system: s.system_prompt_en || '', user: s.user_prompt_en || '' });
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  const [draft, setDraft] = useState<{ system: string; user: string } | null>(null);

  // --- 交易控制区状态 ---
  const [status, setStatus] = useState<any>(null);
  const [cfg, setCfg] = useState<any>(null);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(3);
  const [env, setEnv] = useState<string>("");
  const [ai, setAi] = useState<string>("");
  const [ctrlError, setCtrlError] = useState<string | null>(null);
  const [ctrlInfo, setCtrlInfo] = useState<string | null>(null);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const isRunning = !!status?.running;
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const [c, s] = await Promise.all([
          fetch('/api/nof1/ai/config', { cache: 'no-store' }),
          fetch('/api/nof1/ai/trading/status', { cache: 'no-store' }),
        ]);
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setCfg(cj);
          setEnv(String(cj?.trading_env || ''));
          setStatus(sj);
        }
      } catch (_) {
        // ignore
      }
    })();
    return () => { abort = true; };
  }, []);

  async function startTrading() {
    try {
      setCtrlError(null);
      setCtrlInfo(null);
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intervalMinutes, env, ai })
      });
      const txt = await r.text();
      if (!r.ok) {
        throw new Error(txt || `HTTP ${r.status}`);
      }
      const j = txt ? JSON.parse(txt) : {};
      setStatus(j);
      setCtrlInfo('已启动');
    } catch (e: any) {
      setCtrlError(e?.message || String(e));
    }
  }

  function stopTrading() {
    setShowStopConfirm(true);
  }

  async function confirmStopTrading() {
    setShowStopConfirm(false);
    try {
      setCtrlError(null);
      setCtrlInfo(null);
      const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
      const txt = await r.text();
      if (!r.ok) {
        throw new Error(txt || `HTTP ${r.status}`);
      }
      const j = txt ? JSON.parse(txt) : {};
      setStatus(j);
      setCtrlInfo('已停止');
    } catch (e: any) {
      setCtrlError(e?.message || String(e));
    }
  }

  async function onShow() {
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/nof1/ai/prompts');
      const j = await r.json();
      setMessages((m) => [...m, { role: 'assistant', content: `Current System\n\n${j.system || ''}\n\n---\n\nCurrent User\n\n${j.user || ''}` }]);
    } finally { setBusy(false); }
  }

  async function onDiff() {
    if (!draft) return;
    setBusy(true); setError(null);
    try {
      const r0 = await fetch('/api/nof1/ai/prompts');
      const cur = await r0.json();
      const r = await fetch('/api/nof1/ai/prompt/diff', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ system: draft.system, user: draft.user })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setMessages((m) => [...m, { role: 'assistant', content: `System Diff\n\n${j.system_diff}\n\n---\n\nUser Diff\n\n${j.user_diff}` }]);
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setBusy(false); }
  }

  async function onApply() {
    if (!draft) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/nof1/ai/prompt/apply', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft)
      });
      const j = await r.json(); if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setMessages((m) => [...m, { role: 'assistant', content: '已应用草稿到模板（已备份）' }]);
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
      {/* 交易控制区：固定在顶部 */}
      <div className="flex-shrink-0 mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">环境</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}>
            {['demo-futures','demo-spot','futures','spot'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">AI 预设</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={ai}
                  onChange={(e) => setAi(e.target.value)}>
            <option value="">(默认)</option>
            {aiPresetKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <label className="col-span-1">间隔(分)</label>
          <input className="col-span-2 rounded border px-2 py-1"
                 style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                 type="number" min={1} value={intervalMinutes}
                 onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))} />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }}
                  onClick={startTrading}
                  disabled={isRunning}>启动</button>
          <button className="rounded px-2 py-1 chip-btn text-xs"
                  style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }}
                  onClick={stopTrading}
                  disabled={!isRunning}>停止</button>
          <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
            状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}
          </div>
        </div>
        {ctrlError && (
          <div className="mt-2 rounded border px-2 py-1 text-xs" style={{ borderColor: 'var(--chip-border)', color: 'var(--danger)' }}>
            {ctrlError}
          </div>
        )}
        {ctrlInfo && (
          <div className="mt-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>
            {ctrlInfo}
          </div>
        )}
      </div>

      {/* Prompt Studio Chat */}
      <div className="flex-shrink-0 mb-2 text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Prompt Studio Chat</div>
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

      {/* 停止确认弹窗 */}
      <Modal open={showStopConfirm} onClose={() => setShowStopConfirm(false)} title="确认停止交易">
        <div className="mb-4 text-xs leading-relaxed" style={{ color: 'var(--foreground)' }}>
          <p className="mb-2">停止运行当前 AI 交易系统。</p>
          <p className="mb-2">⚠️ 注意：停止后系统将不再执行新的交易决策。</p>
          <p className="text-xs opacity-70">当前持仓将保持不变，如有需要请手动平仓。</p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            className="rounded px-3 py-1.5 text-xs chip-btn"
            style={{ color: 'var(--btn-inactive-fg)', border: '1px solid var(--chip-border)' }}
            onClick={() => setShowStopConfirm(false)}
          >
            取消
          </button>
          <button
            className="rounded px-3 py-1.5 text-xs chip-btn"
            style={{ background: 'var(--btn-active-bg)', color: 'var(--btn-active-fg)' }}
            onClick={confirmStopTrading}
          >
            确认停止
          </button>
        </div>
      </Modal>
    </aside>
  );
}


