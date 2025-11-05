"use client";
import { useState } from "react";
import type { BotConfig } from "./BotControlPanel";
import { useLocale } from "@/store/useLocale";

interface ApiKeyInfo {
  envName: string;
  available: boolean;
}

interface AddBotDialogProps {
  open: boolean;
  aiPresets?: string[]; // 保留以兼容，但不再使用
  models: string[];
  apiKeys?: ApiKeyInfo[];
  existingBots?: BotConfig[]; // 已有Bot列表，用于复制prompt
  onClose: () => void;
  onAdd: (bot: BotConfig) => void;
}

const THINKING_MODELS = ['glm-4.6', 'deepseek-v3.2-exp', 'deepseek-v3.1'];

export default function AddBotDialog({
  open,
  aiPresets,
  models = [],
  apiKeys = [],
  existingBots = [],
  onClose,
  onAdd
}: AddBotDialogProps) {
  const locale = useLocale((s) => s.locale);
  const t = (zh: string, en: string) => (locale === 'zh' ? zh : en);
  const [env, setEnv] = useState<BotConfig['env']>('demo-futures');
  const [model, setModel] = useState<string>('');
  const [dashscopeApiKey, setDashscopeApiKey] = useState<string>('');
  const [enableThinking, setEnableThinking] = useState<boolean>(false);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(3);
  const [name, setName] = useState<string>('');
  const [promptMode, setPromptMode] = useState<'env-shared' | 'bot-specific'>('env-shared');
  const [copyPromptFromBotId, setCopyPromptFromBotId] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  
  const supportsThinking = model && THINKING_MODELS.includes(model);
  
  // 过滤出有prompt的Bot（bot-specific模式且有id）
  const botsWithPrompts = existingBots.filter(bot => 
    bot.id && bot.promptMode === 'bot-specific'
  );

  // 检测当前选择env下是否已存在“真实”bot（非local-simulated）
  const hasRealBotInEnv = existingBots.some(b => b.env === env && b.tradingMode !== 'local-simulated');
  const isLiveEnv = env === 'futures' || env === 'spot';

  if (!open) return null;

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    // 自动去除空格
    const trimmed = value.replace(/\s+/g, '');
    if (value !== trimmed) {
      setNameError(t('Bot ID不能包含空格，已自动去除','Bot ID cannot contain spaces; removed automatically'));
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
      setNameError(t('Bot ID不能包含空格','Bot ID cannot contain spaces'));
      return;
    }
    
    // 验证模型必填
    if (!model || !model.trim()) {
      return; // 模型选择器会阻止提交
    }
    
    // 生成bot ID（如果未提供名称）
    const botId = name || `${env}-${model}-${intervalMinutes}`;
    
    const bot: BotConfig & { copyPromptFromBotId?: string } = {
      id: botId,
      env,
      model: model.trim(),
      intervalMinutes,
      name: name || undefined,
      promptMode,
      dashscopeApiKey: dashscopeApiKey || undefined,
      enableThinking: enableThinking && supportsThinking ? true : undefined,
      ...(promptMode === 'bot-specific' && copyPromptFromBotId ? { copyPromptFromBotId } : {})
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
    setCopyPromptFromBotId('');
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
            {t('添加交易Bot','Add Trading Bot')}
          </div>
          <button
            className="text-xs px-2 py-1 rounded"
            style={{ color: 'var(--muted-text)', border: '1px solid var(--chip-border)' }}
            onClick={onClose}
          >
            {t('取消','Cancel')}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 风险与降级提示 */}
          {isLiveEnv && (
            <div className="mb-3 text-[12px] p-2 rounded" style={{ background: 'rgba(180,0,0,0.1)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
              {t('实盘风险提示：该类型将连接 Binance 生产环境并可能实际成交，请务必确认 API 权限与资金风控。','Risk: Live trading will connect to Binance production and may place real orders. Confirm API permissions and risk controls.')}
            </div>
          )}
          {hasRealBotInEnv && (
            <div className="mb-3 text-[12px] p-2 rounded" style={{ background: 'rgba(255,165,0,0.1)', color: 'var(--warning, #d97706)', border: '1px solid var(--chip-border)' }}>
              {t('提示：当前交易类型已存在一个“真实”Bot。根据系统规则，新建的同类型 Bot 将被自动创建为“本地模拟”Bot。','Note: A real bot already exists for this env. New one will auto-downgrade to local simulated.')}
            </div>
          )}
          <div className="mb-3">
            <label className="block text-xs mb-1" style={{ color: 'var(--muted-text)' }}>
              {t('Bot名称（可选，用作Bot ID）','Bot Name (optional, used as ID)')}
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
              placeholder={t('例如：futures-quick-strategy（不要使用空格）','e.g. futures-quick-strategy (no spaces)')}
            />
            {nameError && (
              <div className="mt-1 text-[10px]" style={{ color: 'var(--danger)' }}>
                {nameError}
              </div>
            )}
            <div className="mt-1 text-[10px]" style={{ color: 'var(--muted-text)', opacity: 0.7 }}>
              {t('提示：Bot ID将用作文件路径，建议使用字母、数字、连字符（-）、下划线（_），不要包含空格','Tip: Bot ID is used in file paths. Use letters, digits, - and _, no spaces')}
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs mb-1" style={{ color: 'var(--muted-text)' }}>
              {t('交易类型 *','Env *')}
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
              <option value="demo-futures">demo-futures {t('(期货演示)','(Futures Demo)')}</option>
              <option value="test-spot">test-spot {t('(现货测试网)','(Spot Testnet)')}</option>
              <option value="futures">futures {t('(期货生产)','(Futures Live)')}</option>
              <option value="spot">spot {t('(现货生产)','(Spot Live)')}</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-xs mb-1" style={{ color: 'var(--muted-text)' }}>
              {t('AI模型 *','AI Model *')}
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
              <option value="">{t('请选择模型...','Select a model...')}</option>
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
                <span>{t(`启用思考模式（${model} 支持思考模式，可提高回答质量）`,`Enable Thinking mode (${model} supports enhanced reasoning)`)}</span>
              </label>
            </div>
          )}

          {apiKeys.length > 0 && (
            <div className="mb-3">
              <label className="block text-xs mb-1" style={{ color: 'var(--muted-text)' }}>
                {t('API Key（可选，用于独立管理）','API Key (optional, per-bot)')}
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
                <option value="">{t('使用预设中的 API Key','Use preset API Key')}</option>
                {apiKeys.map(k => (
                  <option key={k.envName} value={k.envName}>{k.envName}</option>
                ))}
              </select>
              <div className="mt-1 text-[10px]" style={{ color: 'var(--muted-text)', opacity: 0.7 }}>
                {t('提示：选择 API Key 后，Bot 启动时会占用该 Key，停止时会自动释放','Note: Bot will allocate this Key on start and release on stop')}
              </div>
            </div>
          )}

          <div className="mb-3">
            <label className="block text-xs mb-1" style={{ color: 'var(--muted-text)' }}>
              {t('Prompt模式','Prompt Mode')}
            </label>
            <select
              className="w-full rounded border px-2 py-1 text-xs"
              style={{ 
                borderColor: 'var(--panel-border)', 
                background: 'var(--panel-bg)', 
                color: 'var(--foreground)' 
              }}
              value={promptMode}
              onChange={(e) => {
                setPromptMode(e.target.value as 'env-shared' | 'bot-specific');
                if (e.target.value === 'env-shared') {
                  setCopyPromptFromBotId(''); // 切换模式时清空选择
                }
              }}
            >
              <option value="env-shared">{t('环境共享（相同env的Bot共享prompt）','Env-shared (bots in same env share prompts)')}</option>
              <option value="bot-specific">{t('Bot独立（每个Bot有自己的prompt）','Bot-specific (each bot has its own prompts)')}</option>
            </select>
          </div>

          {promptMode === 'bot-specific' && botsWithPrompts.length > 0 && (
            <div className="mb-3">
              <label className="block text-xs mb-1" style={{ color: 'var(--muted-text)' }}>
                {t('从已有Bot复制Prompt（可选）','Copy prompts from existing bot (optional)')}
              </label>
              <select
                className="w-full rounded border px-2 py-1 text-xs"
                style={{ 
                  borderColor: 'var(--panel-border)', 
                  background: 'var(--panel-bg)', 
                  color: 'var(--foreground)' 
                }}
                value={copyPromptFromBotId}
                onChange={(e) => setCopyPromptFromBotId(e.target.value)}
              >
                <option value="">{t('使用环境模板（默认）','Use env templates (default)')}</option>
                {botsWithPrompts.map(bot => (
                  <option key={bot.id} value={bot.id!}>
                    {bot.name || bot.id} ({bot.env} / {bot.model})
                  </option>
                ))}
              </select>
              <div className="mt-1 text-[10px]" style={{ color: 'var(--muted-text)', opacity: 0.7 }}>
                {t('提示：选择已有Bot后，新Bot将复制该Bot的prompt作为初始模板','Tip: Will copy prompts from the selected bot as initial templates')}
              </div>
            </div>
          )}

          <div className="mb-3">
            <label className="block text-xs mb-1" style={{ color: 'var(--muted-text)' }}>
              {t('间隔（分钟）*','Interval (min) *')}
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
              {t('添加','Add')}
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
              {t('取消','Cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

