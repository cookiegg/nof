"use client";
import { useState } from "react";
import type { BotConfig } from "./BotControlPanel";

interface ApiKeyInfo {
  envName: string;
  available: boolean;
}

interface AddBotDialogProps {
  open: boolean;
  aiPresets?: string[]; // 保留以兼容，但不再使用
  models: string[];
  apiKeys?: ApiKeyInfo[];
  onClose: () => void;
  onAdd: (bot: BotConfig) => void;
}

const THINKING_MODELS = ['glm-4.6', 'deepseek-v3.2-exp', 'deepseek-v3.1'];

export default function AddBotDialog({
  open,
  aiPresets,
  models = [],
  apiKeys = [],
  onClose,
  onAdd
}: AddBotDialogProps) {
  const [env, setEnv] = useState<BotConfig['env']>('demo-futures');
  const [model, setModel] = useState<string>('');
  const [dashscopeApiKey, setDashscopeApiKey] = useState<string>('');
  const [enableThinking, setEnableThinking] = useState<boolean>(false);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(3);
  const [name, setName] = useState<string>('');
  const [promptMode, setPromptMode] = useState<'env-shared' | 'bot-specific'>('env-shared');
  const [nameError, setNameError] = useState<string>('');
  
  const supportsThinking = model && THINKING_MODELS.includes(model);

  if (!open) return null;

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    // 自动去除空格
    const trimmed = value.replace(/\s+/g, '');
    if (value !== trimmed) {
      setNameError('Bot ID不能包含空格，已自动去除');
      setTimeout(() => setNameError(''), 3000);
    } else {
      setNameError('');
    }
    setName(trimmed);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // 验证名称（如果提供了）
    if (name && name.trim() !== name || /\s/.test(name)) {
      setNameError('Bot ID不能包含空格');
      return;
    }
    
    // 验证模型必填
    if (!model || !model.trim()) {
      return; // 模型选择器会阻止提交
    }
    
    // 生成bot ID（如果未提供名称）
    const botId = name || `${env}-${model}-${intervalMinutes}`;
    
    const bot: BotConfig = {
      id: botId,
      env,
      model: model.trim(),
      intervalMinutes,
      name: name || undefined,
      promptMode,
      dashscopeApiKey: dashscopeApiKey || undefined,
      enableThinking: enableThinking && supportsThinking ? true : undefined
    };
    
    onAdd(bot);
    
    // 重置表单
    setEnv('demo-futures');
    setModel('');
    setDashscopeApiKey('');
    setEnableThinking(false);
    setIntervalMinutes(3);
    setName('');
    setPromptMode('env-shared');
    setNameError('');
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
              Bot名称（可选，用作Bot ID）
            </label>
            <input
              type="text"
              className="w-full rounded border px-2 py-1 text-xs"
              style={{ 
                borderColor: nameError ? 'var(--danger)' : 'var(--panel-border)', 
                background: 'var(--panel-bg)', 
                color: 'var(--foreground)' 
              }}
              value={name}
              onChange={handleNameChange}
              placeholder="例如：futures-quick-strategy（不要使用空格）"
            />
            {nameError && (
              <div className="mt-1 text-[10px]" style={{ color: 'var(--danger)' }}>
                {nameError}
              </div>
            )}
            <div className="mt-1 text-[10px]" style={{ color: 'var(--muted-text)', opacity: 0.7 }}>
              提示：Bot ID将用作文件路径，建议使用字母、数字、连字符（-）、下划线（_），不要包含空格
            </div>
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
              AI模型 *
            </label>
            <select
              className="w-full rounded border px-2 py-1 text-xs"
              style={{ 
                borderColor: 'var(--panel-border)', 
                background: 'var(--panel-bg)', 
                color: 'var(--foreground)' 
              }}
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                if (!THINKING_MODELS.includes(e.target.value)) {
                  setEnableThinking(false);
                }
              }}
              required
            >
              <option value="">请选择模型...</option>
              {models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {supportsThinking && (
            <div className="mb-3">
              <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-text)' }}>
                <input
                  type="checkbox"
                  checked={enableThinking}
                  onChange={(e) => setEnableThinking(e.target.checked)}
                  className="rounded"
                />
                <span>启用思考模式（{model} 支持思考模式，可提高回答质量）</span>
              </label>
            </div>
          )}

          {apiKeys.length > 0 && (
            <div className="mb-3">
              <label className="block text-xs mb-1" style={{ color: 'var(--muted-text)' }}>
                API Key（可选，用于独立管理）
              </label>
              <select
                className="w-full rounded border px-2 py-1 text-xs"
                style={{ 
                  borderColor: 'var(--panel-border)', 
                  background: 'var(--panel-bg)', 
                  color: 'var(--foreground)' 
                }}
                value={dashscopeApiKey}
                onChange={(e) => setDashscopeApiKey(e.target.value)}
              >
                <option value="">使用预设中的 API Key</option>
                {apiKeys.map(k => (
                  <option key={k.envName} value={k.envName}>{k.envName}</option>
                ))}
              </select>
              <div className="mt-1 text-[10px]" style={{ color: 'var(--muted-text)', opacity: 0.7 }}>
                提示：选择 API Key 后，Bot 启动时会占用该 Key，停止时会自动释放
              </div>
            </div>
          )}

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

