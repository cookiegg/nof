"use client";
import { useState, useEffect } from "react";
import type { BotConfig, BotStatus } from "./BotControlPanel";
import BotControlPanel from "./BotControlPanel";
import AddBotDialog from "./AddBotDialog";
import { useLocale } from "@/store/useLocale";

interface ApiKeyInfo {
  envName: string;
  available: boolean;
  allocatedTo?: string;
}

interface BotListProps {
  aiPresets?: string[]; // 保留以兼容，但不再使用
  models?: string[];
  onBotSelect?: (bot: BotConfig | null) => void;
  selectedBotId?: string | null;
}

export default function BotList({ aiPresets, models: propsModels, onBotSelect, selectedBotId }: BotListProps) {
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [botStatuses, setBotStatuses] = useState<Record<string, BotStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [models, setModels] = useState<string[]>(propsModels || ['qwen3-max', 'qwen3-plus', 'glm-4.6', 'deepseek-v3.2-exp', 'deepseek-v3.1']);
  const { locale } = useLocale();
  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);

  // 加载所有Bots
  async function loadBots() {
    try {
      const r = await fetch('/api/nof1/bots', { cache: 'no-store' });
      if (!r.ok) throw new Error(t('加载Bots失败', 'Failed to load Bots'));
      const data = await r.json();
      setBots(data.bots || []);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  // 加载所有Bot状态
  async function loadBotStatuses() {
    try {
      const r = await fetch('/api/nof1/bots/status/all', { cache: 'no-store' });
      if (r.ok) {
        const data = await r.json();
        setBotStatuses(data.bots || {});
      }
    } catch (e) {
      console.error('加载Bot状态失败:', e);
    }
  }

  // 加载 API Keys
  async function loadApiKeys() {
    try {
      const r = await fetch('/api/nof1/api-keys', { cache: 'no-store' });
      if (r.ok) {
        const data = await r.json();
        setApiKeys(data.apiKeys || []);
      }
    } catch (e) {
      console.error('加载 API Keys 失败:', e);
    }
  }

  // 初始加载
  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadBots(), loadBotStatuses(), loadApiKeys()]);
      setLoading(false);
    }
    init();
  }, []);

  // 轮询 API Keys 状态（每5秒，以便及时更新占用状态）
  useEffect(() => {
    const interval = setInterval(() => {
      loadApiKeys();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // 轮询Bot状态（每5秒）
  useEffect(() => {
    const interval = setInterval(() => {
      loadBotStatuses();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  async function handleStartBot(config: BotConfig) {
    try {
      // 确保Bot已创建
      if (!config.id) {
        const createRes = await fetch('/api/nof1/bots', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(config)
        });
        if (!createRes.ok) {
          const err = await createRes.json();
          throw new Error(err.error || t('创建Bot失败', 'Failed to create Bot'));
        }
        const created = await createRes.json();
        config.id = created.id;
        await loadBots();
      }

      // 启动Bot
      const r = await fetch(`/api/nof1/bots/${config.id}/start`, {
        method: 'POST'
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || t('启动Bot失败', 'Failed to start Bot'));
      }
      await loadBotStatuses();
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function handleStopBot(botId: string) {
    try {
      const r = await fetch(`/api/nof1/bots/${botId}/stop`, {
        method: 'POST'
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || t('停止Bot失败', 'Failed to stop Bot'));
      }
      await loadBotStatuses();
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function handleDeleteBot(botId: string) {
    try {
      setError(null);
      setLoading(true);
      
      // 确保Bot已停止
      try {
        const stopRes = await fetch(`/api/nof1/bots/${encodeURIComponent(botId)}/stop`, { 
          method: 'POST' 
        });
        // 即使停止失败也继续删除流程
        if (!stopRes.ok) {
          console.log('停止Bot失败（可能已停止）:', await stopRes.text());
        }
      } catch (e) {
        // 忽略停止错误（Bot可能已经停止）
        console.log('停止Bot时出错（可能已停止）:', e);
      }
      
      // 删除Bot
      const r = await fetch(`/api/nof1/bots/${encodeURIComponent(botId)}`, {
        method: 'DELETE'
      });
      
      // 先读取响应文本（Response只能读取一次）
      const responseText = await r.text();
      const contentType = r.headers.get('content-type');
      const hasJsonContent = contentType && contentType.includes('application/json');
      
      if (!r.ok) {
        let errorMsg = t(`删除Bot失败 (HTTP ${r.status})`, `Failed to delete Bot (HTTP ${r.status})`);
        if (hasJsonContent && responseText.trim()) {
          try {
            const err = JSON.parse(responseText);
            errorMsg = err.error || errorMsg;
          } catch (e) {
            // 解析失败，使用默认错误信息
            console.warn(t('解析错误响应失败:', 'Failed to parse error response:'), e);
          }
        }
        throw new Error(errorMsg);
      }
      
      // 成功响应，尝试解析JSON
      let result = { ok: true, deletedBotId: botId }; // 默认值
      if (hasJsonContent && responseText.trim()) {
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          // JSON解析失败，但删除可能已成功，使用默认值继续
          console.warn('解析成功响应失败，但继续处理:', e);
        }
      }
      console.log('Bot删除成功:', result);
      
      // 立即从本地状态中移除（乐观更新）
      setBots(prev => {
        const filtered = prev.filter(b => b.id !== botId);
        console.log(`从列表中移除Bot: ${botId}, 剩余: ${filtered.length}`);
        return filtered;
      });
      setBotStatuses(prev => {
        const next = { ...prev };
        delete next[botId];
        return next;
      });
      
      // 重新加载以确保与服务器同步（双重验证）
      try {
        await Promise.all([loadBots(), loadBotStatuses()]);
      } catch (e) {
        console.error('重新加载Bot列表失败:', e);
        // 即使重新加载失败，本地状态已经更新，所以继续
      }
      
      setError(null);
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      console.error('删除Bot失败:', errorMsg);
      setError(errorMsg);
      // 即使出错也尝试重新加载，确保UI同步
      try {
        await loadBots();
      } catch (reloadErr) {
        console.error('重新加载失败:', reloadErr);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAddBot(bot: BotConfig) {
    try {
      const r = await fetch('/api/nof1/bots', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(bot)
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || t('创建Bot失败', 'Failed to create Bot'));
      }
      await loadBots();
      setShowAddDialog(false);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  function handleStatusChange(botId: string, status: BotStatus) {
    setBotStatuses(prev => ({
      ...prev,
      [botId]: status
    }));
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-xs" style={{ color: 'var(--muted-text)' }}>
        {t('加载中...', 'Loading...')}
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
          {t('交易Bot', 'Trading Bots')} ({bots.length})
        </div>
        <button
          className="rounded px-2 py-1 text-[10px]"
          style={{ 
            background: 'var(--btn-active-bg)', 
            color: 'var(--btn-active-fg)' 
          }}
          onClick={() => setShowAddDialog(true)}
        >
          + {t('添加', 'Add')}
        </button>
      </div>

      {error && (
        <div className="mb-2 rounded border px-2 py-1 text-[10px]" style={{ 
          borderColor: 'var(--chip-border)', 
          color: 'var(--danger)' 
        }}>
          {error}
        </div>
      )}

      {bots.length === 0 ? (
        <div className="text-center py-4">
          <div className="text-[10px] mb-2" style={{ color: 'var(--muted-text)' }}>
            {t('还没有创建任何Bot', 'No bots created yet')}
          </div>
          <button
            className="rounded px-3 py-1.5 text-[10px]"
            style={{ 
              background: 'var(--btn-active-bg)', 
              color: 'var(--btn-active-fg)' 
            }}
            onClick={() => setShowAddDialog(true)}
          >
            + {t('创建第一个Bot', 'Create First Bot')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {bots.map(bot => (
            <BotControlPanel
              key={bot.id}
              bot={bot}
              status={bot.id ? botStatuses[bot.id] : undefined}
              models={models}
              onStart={handleStartBot}
              onStop={handleStopBot}
              onDelete={handleDeleteBot}
              onStatusChange={(status) => bot.id && handleStatusChange(bot.id, status)}
              onEditPrompt={(bot) => onBotSelect && onBotSelect(bot)}
            />
          ))}
        </div>
      )}

      <AddBotDialog
        existingBots={bots}
        open={showAddDialog}
        models={models}
        apiKeys={apiKeys.filter(k => k.available)}
        onClose={() => {
          setShowAddDialog(false);
          loadApiKeys(); // 关闭时刷新 API Keys 状态
        }}
        onAdd={handleAddBot}
      />
    </div>
  );
}

