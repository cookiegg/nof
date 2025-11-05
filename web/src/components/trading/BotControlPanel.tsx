"use client";
import { useState, useEffect } from "react";
import { useLocale } from "@/store/useLocale";

export interface BotConfig {
  id?: string;
  env: 'demo-futures' | 'test-spot' | 'futures' | 'spot';
  model: string; // 模型名称，如 'qwen3-plus', 'deepseek-v3.2-exp' 等
  intervalMinutes: number;
  name?: string;
  tradingMode?: 'binance-demo' | 'local-simulated';
  promptMode?: 'env-shared' | 'bot-specific';
  dashscopeApiKey?: string; // 环境变量名，如 'DASHSCOPE_API_KEY_1'
  enableThinking?: boolean; // 是否启用思考模式
}

export interface BotStatus {
  running: boolean;
  pid?: number;
  startedAt?: string;
  lastExitCode?: number;
  env?: string;
  ai?: string;
  intervalMinutes?: number;
}

interface BotControlPanelProps {
  bot: BotConfig;
  status?: BotStatus;
  models: string[];
  onStart: (config: BotConfig) => Promise<void>;
  onStop: (botId: string) => Promise<void>;
  onDelete?: (botId: string) => Promise<void>;
  onStatusChange?: (status: BotStatus) => void;
  onEditPrompt?: (bot: BotConfig) => void;
}

export default function BotControlPanel({
  bot,
  status,
  models,
  onStart,
  onStop,
  onDelete,
  onStatusChange,
  onEditPrompt
}: BotControlPanelProps) {
  const [env, setEnv] = useState(bot.env);
  const [model, setModel] = useState(bot.model);
  const [intervalMinutes, setIntervalMinutes] = useState(bot.intervalMinutes);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { locale } = useLocale();
  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);

  // 当bot配置改变时更新本地状态
  useEffect(() => {
    setEnv(bot.env);
    setModel(bot.model);
    setIntervalMinutes(bot.intervalMinutes);
  }, [bot]);

  // 轮询状态（如果bot正在运行）
  useEffect(() => {
    if (!status?.running || !bot.id) return;
    
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`/api/nof1/bots/${bot.id}/status`, { cache: 'no-store' });
        const s = await r.json();
        if (onStatusChange) {
          onStatusChange(s);
        }
      } catch (e) {
        console.error('获取状态失败:', e);
      }
    }, 3000); // 每3秒轮询一次

    return () => clearInterval(interval);
  }, [status?.running, bot.id, onStatusChange]);

  const isRunning = !!status?.running;

  async function handleStart() {
    try {
      setStarting(true);
      setError(null);
      const config: BotConfig = {
        ...bot,
        env,
        model,
        intervalMinutes
      };
      await onStart(config);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setStarting(false);
    }
  }

  async function handleStop() {
    try {
      setStopping(true);
      setError(null);
      await onStop(bot.id || 'default');
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setStopping(false);
    }
  }

  async function handleDelete() {
    if (!onDelete || !bot.id) return;
    const confirmMsg = locale === "zh" 
      ? `确定要删除Bot "${bot.name || bot.id}"吗？\n\n⚠️ 警告：此操作将永久删除Bot及其所有数据，包括：\n- Bot配置\n- 交易状态和持仓\n- 对话记录\n- Prompt文件\n\n此操作不可撤销！`
      : `Are you sure you want to delete Bot "${bot.name || bot.id}"?\n\n⚠️ WARNING: This will permanently delete the bot and all its data, including:\n- Bot configuration\n- Trading state and positions\n- Conversation records\n- Prompt files\n\nThis action cannot be undone!`;
    if (!confirm(confirmMsg)) return;
    
    try {
      setError(null);
      await onDelete(bot.id);
      // 删除成功后，onDelete会更新父组件的状态
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const canEdit = !isRunning;

  return (
    <div className="mb-3 rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
            {bot.name || t(`Bot: ${bot.env}`, `Bot: ${bot.env}`)}
          </div>
          {bot.tradingMode && (
            <span 
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{ 
                background: bot.tradingMode === 'binance-demo' 
                  ? 'rgba(34, 197, 94, 0.2)' 
                  : 'rgba(251, 191, 36, 0.2)',
                color: bot.tradingMode === 'binance-demo' 
                  ? 'rgb(34, 197, 94)' 
                  : 'rgb(251, 191, 36)',
                border: `1px solid ${bot.tradingMode === 'binance-demo' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`
              }}
              title={bot.tradingMode === 'binance-demo' ? t('真实API交易（Binance Demo）', 'Real API Trading (Binance Demo)') : t('本地模拟交易', 'Local Simulated Trading')}
            >
              {bot.tradingMode === 'binance-demo' ? t('真实', 'Real') : t('模拟', 'Simulated')}
            </span>
          )}
        </div>
        {onDelete && bot.id && (
          <button
            className="text-[10px] px-1 py-0.5 rounded"
            style={{ color: 'var(--danger)', border: '1px solid var(--chip-border)' }}
            onClick={handleDelete}
            disabled={isRunning}
            title={t("删除Bot", "Delete Bot")}
          >
            {t("删除", "Delete")}
          </button>
        )}
      </div>
      
      <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
        <label className="col-span-1">{t("交易类型", "Trading Type")}</label>
        <select 
          className="col-span-2 rounded border px-2 py-1"
          style={{ 
            borderColor: 'var(--panel-border)', 
            background: 'var(--panel-bg)', 
            color: 'var(--foreground)',
            opacity: canEdit ? 1 : 0.6
          }}
          value={env}
          onChange={(e) => setEnv(e.target.value as BotConfig['env'])}
          disabled={!canEdit}
        >
          {['demo-futures','test-spot','futures','spot'].map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        
        <label className="col-span-1">{t("AI模型", "AI Model")}</label>
        <select 
          className="col-span-2 rounded border px-2 py-1"
          style={{ 
            borderColor: 'var(--panel-border)', 
            background: 'var(--panel-bg)', 
            color: 'var(--foreground)',
            opacity: canEdit ? 1 : 0.6
          }}
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={!canEdit}
        >
          {models.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        
        <label className="col-span-1">{t("间隔(分)", "Interval (min)")}</label>
        <input 
          className="col-span-2 rounded border px-2 py-1"
          style={{ 
            borderColor: 'var(--panel-border)', 
            background: 'var(--panel-bg)', 
            color: 'var(--foreground)',
            opacity: canEdit ? 1 : 0.6
          }}
          type="number" 
          min={1} 
          value={intervalMinutes}
          onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))}
          disabled={!canEdit}
        />
      </div>
      
      {error && (
        <div className="mb-2 text-[10px]" style={{ color: 'var(--danger)' }}>
          {error}
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <button 
          className="rounded px-2 py-1 chip-btn text-xs"
          style={{ 
            background: isRunning ? 'var(--btn-inactive-bg)' : 'var(--btn-active-bg)', 
            color: isRunning ? 'var(--btn-inactive-fg)' : 'var(--btn-active-fg)'
          }}
          onClick={handleStart}
          disabled={isRunning || starting}
        >
          {starting ? t('启动中…', 'Starting…') : t('启动', 'Start')}
        </button>
        
        <button 
          className="rounded px-2 py-1 chip-btn text-xs"
          style={{ 
            color: 'var(--btn-inactive-fg)', 
            border: '1px solid var(--chip-border)'
          }}
          onClick={handleStop}
          disabled={!isRunning || stopping}
        >
          {stopping ? t('停止中…', 'Stopping…') : t('停止', 'Stop')}
        </button>

        {onEditPrompt && bot.id && (
          <button 
            className="rounded px-2 py-1 chip-btn text-xs"
            style={{ 
              background: 'rgba(59, 130, 246, 0.15)',
              color: 'rgb(59, 130, 246)',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}
            onClick={() => onEditPrompt(bot)}
            title={t("编辑此Bot的Prompt", "Edit this Bot's Prompt")}
          >
            {t("编辑Prompt", "Edit Prompt")}
          </button>
        )}
        
        <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
          {t("状态：", "Status:")}{isRunning ? t(`运行中(pid=${status?.pid})`, `Running (pid=${status?.pid})`) : t('未运行', 'Not running')}
        </div>
      </div>
      
      {bot.id && (
        <div className="mt-1 flex items-center justify-between text-[10px]" style={{ color: 'var(--muted-text)' }}>
          <span>ID: {bot.id}</span>
          {bot.promptMode && (
            <span 
              className="px-1.5 py-0.5 rounded"
              style={{ 
                background: 'rgba(59, 130, 246, 0.15)',
                color: 'rgb(59, 130, 246)',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}
              title={bot.promptMode === 'bot-specific' ? t('Bot独立Prompt', 'Bot-specific Prompt') : t('环境共享Prompt', 'Env-shared Prompt')}
            >
              {bot.promptMode === 'bot-specific' ? t('独立Prompt', 'Independent Prompt') : t('共享Prompt', 'Shared Prompt')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

