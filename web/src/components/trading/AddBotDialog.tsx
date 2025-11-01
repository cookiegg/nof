"use client";
import { useState } from "react";
import type { BotConfig } from "./BotControlPanel";

interface AddBotDialogProps {
  open: boolean;
  aiPresets: string[];
  onClose: () => void;
  onAdd: (bot: BotConfig) => void;
}

export default function AddBotDialog({
  open,
  aiPresets,
  onClose,
  onAdd
}: AddBotDialogProps) {
  const [env, setEnv] = useState<BotConfig['env']>('demo-futures');
  const [aiPreset, setAiPreset] = useState<string>('');
  const [intervalMinutes, setIntervalMinutes] = useState<number>(3);
  const [name, setName] = useState<string>('');
  const [promptMode, setPromptMode] = useState<'env-shared' | 'bot-specific'>('env-shared');

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // 生成bot ID（如果未提供名称）
    const botId = name || `${env}-${aiPreset || 'default'}-${intervalMinutes}`;
    
    const bot: BotConfig = {
      id: botId,
      env,
      aiPreset: aiPreset || 'deepseek', // 默认使用deepseek preset
      intervalMinutes,
      name: name || undefined,
      promptMode
    };
    
    onAdd(bot);
    
    // 重置表单
    setEnv('demo-futures');
    setAiPreset('');
    setIntervalMinutes(3);
    setName('');
    setPromptMode('env-shared');
    onClose();
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="rounded border p-4 max-w-md w-full"
        style={{ 
          borderColor: 'var(--panel-border)', 
          background: 'var(--panel-bg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            添加交易Bot
          </div>
          <button
            className="text-xs px-2 py-1 rounded"
            style={{ color: 'var(--muted-text)', border: '1px solid var(--chip-border)' }}
            onClick={onClose}
          >
            取消
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block text-xs mb-1" style={{ color: 'var(--muted-text)' }}>
              Bot名称（可选）
            </label>
            <input
              type="text"
              className="w-full rounded border px-2 py-1 text-xs"
              style={{ 
                borderColor: 'var(--panel-border)', 
                background: 'var(--panel-bg)', 
                color: 'var(--foreground)' 
              }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：期货快速策略"
            />
          </div>

          <div className="mb-3">
            <label className="block text-xs mb-1" style={{ color: 'var(--muted-text)' }}>
              交易类型 *
            </label>
            <select
              className="w-full rounded border px-2 py-1 text-xs"
              style={{ 
                borderColor: 'var(--panel-border)', 
                background: 'var(--panel-bg)', 
                color: 'var(--foreground)' 
              }}
              value={env}
              onChange={(e) => setEnv(e.target.value as BotConfig['env'])}
              required
            >
              <option value="demo-futures">demo-futures (期货演示)</option>
              <option value="demo-spot">demo-spot (现货演示)</option>
              <option value="futures">futures (期货生产)</option>
              <option value="spot">spot (现货生产)</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-xs mb-1" style={{ color: 'var(--muted-text)' }}>
              AI模型预设 *
            </label>
            <select
              className="w-full rounded border px-2 py-1 text-xs"
              style={{ 
                borderColor: 'var(--panel-border)', 
                background: 'var(--panel-bg)', 
                color: 'var(--foreground)' 
              }}
              value={aiPreset}
              onChange={(e) => setAiPreset(e.target.value)}
              required
            >
              <option value="">请选择...</option>
              {aiPresets.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-xs mb-1" style={{ color: 'var(--muted-text)' }}>
              Prompt模式
            </label>
            <select
              className="w-full rounded border px-2 py-1 text-xs"
              style={{ 
                borderColor: 'var(--panel-border)', 
                background: 'var(--panel-bg)', 
                color: 'var(--foreground)' 
              }}
              value={promptMode}
              onChange={(e) => setPromptMode(e.target.value as 'env-shared' | 'bot-specific')}
            >
              <option value="env-shared">环境共享（相同env的Bot共享prompt）</option>
              <option value="bot-specific">Bot独立（每个Bot有自己的prompt）</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-xs mb-1" style={{ color: 'var(--muted-text)' }}>
              间隔（分钟）*
            </label>
            <input
              type="number"
              min={1}
              className="w-full rounded border px-2 py-1 text-xs"
              style={{ 
                borderColor: 'var(--panel-border)', 
                background: 'var(--panel-bg)', 
                color: 'var(--foreground)' 
              }}
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(parseInt(e.target.value || '3'))}
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 rounded px-2 py-1 text-xs"
              style={{ 
                background: 'var(--btn-active-bg)', 
                color: 'var(--btn-active-fg)' 
              }}
            >
              添加
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-xs"
              style={{ 
                color: 'var(--btn-inactive-fg)', 
                border: '1px solid var(--chip-border)' 
              }}
              onClick={onClose}
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

