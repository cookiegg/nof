"use client";
import { useEffect, useMemo, useState } from "react";

type Config = {
  trading_env?: string;
  allowed_symbols?: string[];
  ai?: { provider?: string; model?: string; presets?: Record<string, any> };
  data?: Record<string, any>;
};

export default function PromptEditorPanel() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(3);
  const [env, setEnv] = useState<string>("");
  const [ai, setAi] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [configUpdates, setConfigUpdates] = useState<any>(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [p, c, s] = await Promise.all([
          fetch("/api/nof1/ai/prompts", { cache: "no-store" }),
          fetch("/api/nof1/ai/config", { cache: "no-store" }),
          fetch("/api/nof1/ai/trading/status", { cache: "no-store" }),
        ]);
        const pj = await p.json();
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setSystemPrompt(pj.system || "");
          setUserPrompt(pj.user || "");
          setCfg(cj);
          setStatus(sj);
          setEnv(String(cj?.trading_env || ""));
          setAi("");
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSuggest() {
    try {
      setSuggesting(true);
      setError(null);
      setRationale(null);
      setConfigUpdates(null);
      const r = await fetch("/api/nof1/ai/prompt/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const s = j?.suggestion || {};
      if (typeof s.system_prompt_en === "string") setSystemPrompt(s.system_prompt_en);
      if (typeof s.user_prompt_en === "string") setUserPrompt(s.user_prompt_en);
      if (s.rationale_en) setRationale(String(s.rationale_en));
      if (s.config_updates) setConfigUpdates(s.config_updates);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function onApplyConfigUpdates() {
    if (!configUpdates) return;
    try {
      const r = await fetch("/api/nof1/ai/config/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config_updates: configUpdates })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next = await r.json();
      setCfg(next);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const whitelist = useMemo(() => (cfg?.allowed_symbols || []).join(", "), [cfg]);
  const aiPresetKeys = useMemo(() => Object.keys(cfg?.ai?.presets || {}), [cfg]);
  const isRunning = !!status?.running;

  async function startTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intervalMinutes, env, ai })
      });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function stopTrading() {
    try {
      const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
      const j = await r.json();
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  return (
    <aside className="h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Prompt 工作台</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ color: "var(--btn-inactive-fg)", border: "1px solid var(--chip-border)" }}
            onClick={onSuggest}
            disabled={suggesting}
          >{suggesting ? '建议中…' : '建议'}</button>
          <button
            className="rounded px-2 py-1 chip-btn"
            style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
            onClick={onSave}
            disabled={saving}
          >{saving ? '保存中…' : '保存'}</button>
        </div>
      </div>

      {/* 交易控制 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
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
      </div>

      {error && (
        <div className="mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--chip-border)", color: "var(--danger)" }}>{error}</div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500">加载中…</div>
      ) : (
        <>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>System Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-40 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>User Prompt</div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-48 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>

          {rationale && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>Rationale</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{rationale}</pre>
            </div>
          )}

          <div className="mb-2">
            <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>符号白名单</div>
            <div className="text-xs" style={{ color: "var(--foreground)" }}>{whitelist || '—'}</div>
          </div>

          {configUpdates && (
            <div className="mb-2">
              <div className="mb-1 text-[11px]" style={{ color: "var(--muted-text)" }}>建议的配置更新</div>
              <pre className="whitespace-pre-wrap text-xs rounded border p-2 mb-2" style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}>{JSON.stringify(configUpdates, null, 2)}</pre>
              <button
                className="rounded px-2 py-1 chip-btn text-xs"
                style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
                onClick={onApplyConfigUpdates}
              >应用配置更新</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}


