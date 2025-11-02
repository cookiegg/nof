"use client";
import { useEffect, useMemo, useState } from "react";
import BotControlPanel, { type BotConfig, type BotStatus } from "../trading/BotControlPanel";
import AddBotDialog from "../trading/AddBotDialog";

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
  const [bot, setBot] = useState<BotConfig | null>(null); // 当前选中的bot
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [promptEnv, setPromptEnv] = useState<string>("demo-futures"); // Prompt环境，基于选中的bot
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [configUpdates, setConfigUpdates] = useState<any>(null);

  // 加载prompt的函数（env-shared模式）
  async function loadPrompts(env: string) {
    try {
      const url = `/api/nof1/ai/prompts${env ? `?env=${env}` : ''}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pj = await r.json();
      setSystemPrompt(pj.system || "");
      setUserPrompt(pj.user || "");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  // 加载bot-specific prompt的函数
  async function loadBotPrompts(botId: string) {
    try {
      const r = await fetch(`/api/nof1/bots/${botId}/prompts`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pj = await r.json();
      setSystemPrompt(pj.system || "");
      setUserPrompt(pj.user || "");
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const [c, s] = await Promise.all([
          fetch("/api/nof1/ai/config", { cache: "no-store" }),
          fetch("/api/nof1/ai/trading/status", { cache: "no-store" }),
        ]);
        const cj = await c.json();
        const sj = await s.json();
        if (!abort) {
          setCfg(cj);
          setBotStatus(sj);
          
          // 尝试加载所有bots，如果有运行的bot就显示
          try {
            const botsRes = await fetch('/api/nof1/bots', { cache: 'no-store' });
            if (botsRes.ok) {
              const botsData = await botsRes.json();
              const bots = botsData.bots || [];
                // 查找运行的bot
                if (sj?.running && sj?.env) {
                  const runningBot = bots.find((b: BotConfig) => 
                    b.env === sj.env && 
                    (b.model === sj.model || (!sj.model && !b.model))
                  );
                  if (runningBot) {
                    setBot(runningBot);
                    setPromptEnv(runningBot.env);
                    if (runningBot.promptMode === 'bot-specific') {
                      await loadBotPrompts(runningBot.id!);
                    } else {
                      await loadPrompts(runningBot.env);
                    }
                  } else {
                    // 创建临时bot配置（向后兼容）
                    const existingBot: BotConfig = {
                      id: `bot-${sj.env}-${sj.model || 'qwen3-plus'}-${sj.intervalMinutes || 3}`,
                      env: sj.env as BotConfig['env'],
                      model: sj.model || 'qwen3-plus',
                      intervalMinutes: sj.intervalMinutes || 3,
                      promptMode: 'env-shared'
                    };
                    setBot(existingBot);
                    setPromptEnv(sj.env);
                    await loadPrompts(sj.env);
                  }
              } else if (bots.length > 0) {
                // 显示第一个bot
                setBot(bots[0]);
                setPromptEnv(bots[0].env);
                if (bots[0].promptMode === 'bot-specific') {
                  await loadBotPrompts(bots[0].id!);
                } else {
                  await loadPrompts(bots[0].env);
                }
              } else {
                // 没有bots，使用配置的默认环境加载prompt
                const tradingEnv = String(cj?.trading_env || "demo-futures");
                setPromptEnv(tradingEnv);
                await loadPrompts(tradingEnv);
              }
            } else {
              // API不可用，使用旧逻辑
              if (sj?.running && sj?.env) {
                const existingBot: BotConfig = {
                  id: `bot-${sj.env}-${sj.ai || 'default'}-${sj.intervalMinutes || 3}`,
                  env: sj.env as BotConfig['env'],
                  model: sj.model || 'qwen3-plus',
                  intervalMinutes: sj.intervalMinutes || 3,
                  promptMode: 'env-shared'
                };
                setBot(existingBot);
                setPromptEnv(sj.env);
                await loadPrompts(sj.env);
              } else {
                const tradingEnv = String(cj?.trading_env || "demo-futures");
                setPromptEnv(tradingEnv);
                await loadPrompts(tradingEnv);
              }
            }
          } catch (e) {
            console.error('加载bots失败:', e);
            // 降级到默认逻辑
            const tradingEnv = String(cj?.trading_env || "demo-futures");
            setPromptEnv(tradingEnv);
            await loadPrompts(tradingEnv);
          }
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // 当bot改变时，更新promptEnv并加载prompt
  useEffect(() => {
    if (bot && !loading && bot.id) {
      setPromptEnv(bot.env);
      // 根据promptMode加载prompt
      if (bot.promptMode === 'bot-specific') {
        loadBotPrompts(bot.id);
      } else {
        loadPrompts(bot.env);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bot?.id, bot?.promptMode]);
  
  // 当promptEnv改变时，重新加载prompt（手动切换时）
  useEffect(() => {
    if (promptEnv && !loading && bot) {
      loadPrompts(promptEnv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptEnv]);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // 保存成功提示
      const saved = await r.json();
      setError(null);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onApplyPrompt() {
    if (!botStatus?.running || !bot) {
      setError('没有运行中的Bot，无法应用Prompt');
      return;
    }
    if (bot.env !== promptEnv) {
      setError(`当前运行的Bot环境是 ${bot.env}，但编辑的是 ${promptEnv} 的模板，不匹配！`);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      
      // 先保存文件
      const saveR = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, env: promptEnv })
      });
      if (!saveR.ok) throw new Error(`保存失败: HTTP ${saveR.status}`);
      
      // 然后触发重新加载
      const reloadR = await fetch("/api/nof1/ai/trading/reload-prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ env: bot.env })
      });
      if (!reloadR.ok) throw new Error(`应用失败: HTTP ${reloadR.status}`);
      
      const result = await reloadR.json();
      setError(null);
      // 可以显示成功消息（通过清除错误消息）
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
  const isRunning = !!botStatus?.running;

  // Bot控制函数
  async function handleStartBot(config: BotConfig) {
    try {
      // 如果bot没有id，先创建bot
      if (!config.id) {
        const createRes = await fetch('/api/nof1/bots', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(config)
        });
        if (!createRes.ok) {
          const err = await createRes.json();
          throw new Error(err.error || '创建Bot失败');
        }
        const created = await createRes.json();
        config.id = created.id;
      }

      // 启动bot
      const r = await fetch(`/api/nof1/bots/${config.id}/start`, {
        method: 'POST'
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || '启动Bot失败');
      }
      const j = await r.json();
      setBotStatus(j);
      // 更新bot配置
      setBot(config);
      setPromptEnv(config.env);
      
      // 如果是bot-specific模式，加载bot的prompt
      if (config.promptMode === 'bot-specific') {
        await loadBotPrompts(config.id);
      }
    } catch (e: any) {
      setError(e?.message || String(e));
      throw e;
    }
  }

  async function handleStopBot(botId: string) {
    try {
      if (!botId) {
        // 向后兼容：使用旧API
        const r = await fetch('/api/nof1/ai/trading/stop', { method: 'POST' });
        const j = await r.json();
        setBotStatus(j);
        return;
      }
      
      const r = await fetch(`/api/nof1/bots/${botId}/stop`, { method: 'POST' });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || '停止Bot失败');
      }
      const j = await r.json();
      setBotStatus(j);
    } catch (e: any) {
      setError(e?.message || String(e));
      throw e;
    }
  }

  async function loadBotPrompts(botId: string) {
    try {
      const r = await fetch(`/api/nof1/bots/${botId}/prompts`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const pj = await r.json();
      setSystemPrompt(pj.system || '');
      setUserPrompt(pj.user || '');
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function handleAddBot(newBot: BotConfig) {
    try {
      // 创建bot
      const r = await fetch('/api/nof1/bots', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(newBot)
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || '创建Bot失败');
      }
      const created = await r.json();
      
      setBot(created);
      setPromptEnv(created.env);
      
      // 根据promptMode加载prompt
      if (created.promptMode === 'bot-specific') {
        await loadBotPrompts(created.id);
      } else {
        await loadPrompts(created.env);
      }
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
            title="保存Prompt模板到文件（不会立即生效，需要重启Bot或点击'应用Prompt'）"
          >{saving ? '保存中…' : '保存'}</button>
          {isRunning && bot && bot.env === promptEnv && (
            <button
              className="rounded px-2 py-1 chip-btn"
              style={{ background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" }}
              onClick={onApplyPrompt}
              disabled={saving}
              title="保存并立即应用到运行中的Bot"
            >{saving ? '应用中…' : '应用Prompt'}</button>
          )}
        </div>
      </div>

      {/* Bot选择 - 选择要编辑的Bot */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>选择 Bot</div>
        <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
          <label className="col-span-1">交易环境</label>
          <select className="col-span-2 rounded border px-2 py-1"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }}
                  value={promptEnv}
                  onChange={(e) => setPromptEnv(e.target.value)}>
            <option value="demo-futures">demo-futures (期货演示)</option>
            <option value="demo-spot">demo-spot (现货演示)</option>
            <option value="futures">futures (期货生产)</option>
            <option value="spot">spot (现货生产)</option>
          </select>
        </div>
        <div className="text-[10px] mb-2" style={{ color: 'var(--muted-text)' }}>
          {promptEnv.includes('futures') ? '⚠️ 将编辑期货Bot的Prompt（支持杠杆、做多做空）' : '⚠️ 将编辑现货Bot的Prompt（无杠杆、只能做多）'}
        </div>
        {bot && botStatus?.running && botStatus?.env && (
          <div className="text-[10px]" style={{ color: botStatus.env === promptEnv ? 'var(--success)' : 'var(--warning)' }}>
            {botStatus.env === promptEnv 
              ? `✅ 当前运行的Bot使用此环境 (pid=${botStatus.pid})`
              : `⚠️ 当前运行的是 ${botStatus.env} Bot，编辑的模板不会影响运行中的Bot`
            }
          </div>
        )}
      </div>

      {/* 交易控制区 */}
      <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted-text)' }}>交易控制</div>
        
        {bot ? (
          <BotControlPanel
            bot={bot}
            status={botStatus || undefined}
            models={['qwen3-max', 'qwen3-plus', 'glm-4.6', 'deepseek-v3.2-exp', 'deepseek-v3.1']}
            onStart={handleStartBot}
            onStop={handleStopBot}
            onStatusChange={setBotStatus}
          />
        ) : (
          <div className="text-center py-4">
            <div className="text-xs mb-2" style={{ color: 'var(--muted-text)' }}>
              还没有添加Bot
            </div>
            <button
              className="rounded px-3 py-1.5 text-xs"
              style={{ 
                background: 'var(--btn-active-bg)', 
                color: 'var(--btn-active-fg)' 
              }}
              onClick={() => setShowAddDialog(true)}
            >
              + 添加交易Bot
            </button>
          </div>
        )}
      </div>

      {/* 添加Bot对话框 */}
      <AddBotDialog
        open={showAddDialog}
        models={['qwen3-max', 'qwen3-plus', 'glm-4.6', 'deepseek-v3.2-exp', 'deepseek-v3.1']}
        onClose={() => setShowAddDialog(false)}
        onAdd={handleAddBot}
      />

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


