"use client";
import { useState, useEffect } from "react";

export interface BotConfig {
  id?: string;
  env: 'demo-futures' | 'demo-spot' | 'futures' | 'spot';
  aiPreset: string;
  intervalMinutes: number;
  name?: string;
  tradingMode?: 'binance-demo' | 'local-simulated';
  promptMode?: 'env-shared' | 'bot-specific';
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
  aiPresets: string[];
  onStart: (config: BotConfig) => Promise<void>;
  onStop: (botId: string) => Promise<void>;
  onDelete?: (botId: string) => Promise<void>;
  onStatusChange?: (status: BotStatus) => void;
  onEditPrompt?: (bot: BotConfig) => void;
}

export default function BotControlPanel({
  bot,
  status,
  aiPresets,
  onStart,
  onStop,
  onDelete,
  onStatusChange,
  onEditPrompt
}: BotControlPanelProps) {
  const [env, setEnv] = useState(bot.env);
  const [aiPreset, setAiPreset] = useState(bot.aiPreset);
  const [intervalMinutes, setIntervalMinutes] = useState(bot.intervalMinutes);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 当bot配置改变时更新本地状态
  useEffect(() => {
    setEnv(bot.env);
    setAiPreset(bot.aiPreset);
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
        aiPreset,
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
    if (!confirm(`确定要删除Bot "${bot.name || bot.id}"吗？\n\n⚠️ 警告：此操作将永久删除Bot及其所有数据，包括：\n- Bot配置\n- 交易状态和持仓\n- 对话记录\n- Prompt文件\n\n此操作不可撤销！`)) return;
    
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
            {bot.name || `Bot: ${bot.env}`}
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
              title={bot.tradingMode === 'binance-demo' ? '真实API交易（Binance Demo）' : '本地模拟交易'}
            >
              {bot.tradingMode === 'binance-demo' ? '真实' : '模拟'}
            </span>
          )}
        </div>
        {onDelete && bot.id && (
          <button
            className="text-[10px] px-1 py-0.5 rounded"
            style={{ color: 'var(--danger)', border: '1px solid var(--chip-border)' }}
            onClick={handleDelete}
            disabled={isRunning}
            title="删除Bot"
          >
            删除
          </button>
        )}
      </div>
      
      <div className="mb-2 grid grid-cols-3 gap-2 items-center text-xs">
        <label className="col-span-1">交易类型</label>
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
          {['demo-futures','demo-spot','futures','spot'].map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        
        <label className="col-span-1">AI模型</label>
        <select 
          className="col-span-2 rounded border px-2 py-1"
          style={{ 
            borderColor: 'var(--panel-border)', 
            background: 'var(--panel-bg)', 
            color: 'var(--foreground)',
            opacity: canEdit ? 1 : 0.6
          }}
          value={aiPreset}
          onChange={(e) => setAiPreset(e.target.value)}
          disabled={!canEdit}
        >
          {aiPresets.map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        
        <label className="col-span-1">间隔(分)</label>
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
          {starting ? '启动中…' : '启动'}
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
          {stopping ? '停止中…' : '停止'}
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
            title="编辑此Bot的Prompt"
          >
            编辑Prompt
          </button>
        )}
        
        <div className="text-[11px]" style={{ color: 'var(--muted-text)' }}>
          状态：{isRunning ? `运行中(pid=${status?.pid})` : '未运行'}
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
              title={bot.promptMode === 'bot-specific' ? 'Bot独立Prompt' : '环境共享Prompt'}
            >
              {bot.promptMode === 'bot-specific' ? '独立Prompt' : '共享Prompt'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

