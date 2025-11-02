"use client";
import { useState, useEffect } from "react";
import type { BotConfig, BotStatus } from "./BotControlPanel";
import BotControlPanel from "./BotControlPanel";
import AddBotDialog from "./AddBotDialog";

interface BotListProps {
  aiPresets: string[];
  onBotSelect?: (bot: BotConfig | null) => void;
  selectedBotId?: string | null;
}

export default function BotList({ aiPresets, onBotSelect, selectedBotId }: BotListProps) {
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [botStatuses, setBotStatuses] = useState<Record<string, BotStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // 加载所有Bots
  async function loadBots() {
    try {
      const r = await fetch('/api/nof1/bots', { cache: 'no-store' });
      if (!r.ok) throw new Error('加载Bots失败');
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

  // 初始加载
  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadBots(), loadBotStatuses()]);
      setLoading(false);
    }
    init();
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
          throw new Error(err.error || '创建Bot失败');
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
        throw new Error(err.error || '启动Bot失败');
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
        throw new Error(err.error || '停止Bot失败');
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
      
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || `删除Bot失败 (HTTP ${r.status})`);
      }
      
      const result = await r.json();
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
        throw new Error(err.error || '创建Bot失败');
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
        加载中...
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
          交易Bot ({bots.length})
        </div>
        <button
          className="rounded px-2 py-1 text-[10px]"
          style={{ 
            background: 'var(--btn-active-bg)', 
            color: 'var(--btn-active-fg)' 
          }}
          onClick={() => setShowAddDialog(true)}
        >
          + 添加
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
            还没有创建任何Bot
          </div>
          <button
            className="rounded px-3 py-1.5 text-[10px]"
            style={{ 
              background: 'var(--btn-active-bg)', 
              color: 'var(--btn-active-fg)' 
            }}
            onClick={() => setShowAddDialog(true)}
          >
            + 创建第一个Bot
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {bots.map(bot => (
            <BotControlPanel
              key={bot.id}
              bot={bot}
              status={botStatuses[bot.id]}
              aiPresets={aiPresets}
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
        open={showAddDialog}
        aiPresets={aiPresets}
        onClose={() => setShowAddDialog(false)}
        onAdd={handleAddBot}
      />
    </div>
  );
}

