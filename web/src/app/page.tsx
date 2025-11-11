"use client";
import PriceTicker from "@/components/layout/PriceTicker";
import AccountValueChart from "@/components/chart/AccountValueChart";
import { PositionsPanel } from "@/components/tabs/PositionsPanel";
import { Suspense, useState } from "react";
import PromptStudioChatPanel from "@/components/prompts/PromptStudioChatPanel";
import { useLocale } from "@/store/useLocale";
import BotList from "@/components/trading/BotList";
import type { BotConfig } from "@/components/trading/BotControlPanel";

export default function Home() {
  const locale = useLocale((s) => s.locale);
  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);
  const [selectedBot, setSelectedBot] = useState<BotConfig | null>(null);
  return (
    <main className="w-full terminal-scan flex flex-col h-[calc(100vh-var(--header-h))]" style={{ height: 'calc(100vh - var(--header-h) * 2)' }}>
      <PriceTicker />
      <section
        className="grid grid-cols-1 gap-3 p-3 overflow-hidden lg:grid-cols-5 lg:gap-3 lg:p-3 h-[calc(100vh-var(--header-h)-var(--ticker-h))]"
        style={{ height: 'calc(100vh - var(--header-h) * 2 - var(--ticker-h) * 2)' }}
      >
        {/* 左侧：交易 Bot 独立窄栏 */}
        <div className="lg:col-span-1 h-full overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="flex-shrink-0 mb-2 text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
              {t('交易 Bot', 'Trading Bots')}
            </div>
            <div className="flex-1 min-h-0" style={{ overflowY: 'auto' }}>
              <BotList
                models={["qwen3-max", "qwen-plus", "glm-4.6", "deepseek-v3.2-exp", "deepseek-v3.1"]}
                onBotSelect={setSelectedBot}
                selectedBotId={selectedBot?.id || null}
              />
            </div>
          </div>
        </div>
        {/* 中左：Prompt Studio Chat（保持较宽，便于阅读输出） */}
        <div className="lg:col-span-1 h-full overflow-hidden">
          <PromptStudioChatPanel selectedBot={selectedBot} />
        </div>
        {/* 中右：账户价值图表（变窄） */}
        <div className="lg:col-span-2 h-full">
          <AccountValueChart />
        </div>
        {/* 右侧：持仓/模型对话/成交/README（窄一些） */}
        <div className="lg:col-span-1 h-full flex flex-col overflow-hidden">
          <Suspense
            fallback={
              <div className="flex-shrink-0 mb-2 text-xs text-zinc-500">{t('加载标签…','Loading tabs…')}</div>
            }
          >
            <div className="flex-shrink-0 mb-2 flex items-center gap-3 text-xs">
              <TabButton name={t('持仓','Positions')} tabKey="positions" />
              <TabButton name={t('模型对话','Chat')} tabKey="chat" />
              <TabButton name={t('成交','Trades')} tabKey="trades" />
              <TabButton name="README.md" tabKey="readme" />
            </div>
          </Suspense>
          <div className="flex-1 overflow-y-auto pr-1">
            <Suspense
              fallback={<div className="text-xs text-zinc-500">{t('加载数据…','Loading…')}</div>}
            >
              <RightTabs />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}

// Client subcomponents in separate file to keep server component clean
import RightTabs from "@/components/tabs/RightTabs";
import TabButton from "@/components/tabs/TabButton";
// RightTabs and TabButton are client components
