"use client";
import { useState, useEffect } from "react";
import type { BotConfig, BotStatus } from "./BotControlPanel";
import BotControlPanel from "./BotControlPanel";
import AddBotDialog from "./AddBotDialog";

interface BotListProps {
  aiPresets: string[];
}

export default function BotList({ aiPresets }: BotListProps) {
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
      const r = await fetch(`/api/nof1/bots/${botId}`, {
        method: 'DELETE'
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || '删除Bot失败');
      }
      await loadBots();
      await loadBotStatuses();
    } catch (e: any) {
      setError(e?.message || String(e));
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
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          交易Bot列表 ({bots.length})
        </div>
        <button
          className="rounded px-3 py-1.5 text-xs"
          style={{ 
            background: 'var(--btn-active-bg)', 
            color: 'var(--btn-active-fg)' 
          }}
          onClick={() => setShowAddDialog(true)}
        >
          + 添加Bot
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded border px-3 py-2 text-xs" style={{ 
          borderColor: 'var(--chip-border)', 
          color: 'var(--danger)' 
        }}>
          {error}
        </div>
      )}

      {bots.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-xs mb-3" style={{ color: 'var(--muted-text)' }}>
            还没有创建任何Bot
          </div>
          <button
            className="rounded px-4 py-2 text-xs"
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
        <div className="space-y-3">
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

