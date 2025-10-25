import PriceTicker from "@/components/layout/PriceTicker";
import AccountValueChart from "@/components/chart/AccountValueChart";
import { PositionsPanel } from "@/components/tabs/PositionsPanel";
import { Suspense } from "react";

export default function Home() {
  return (
    <main className="w-full terminal-scan flex flex-col h-[calc(100vh-var(--header-h))]">
      <PriceTicker />
      <section className="grid grid-cols-1 gap-3 p-3 overflow-hidden lg:grid-cols-3 lg:gap-3 lg:p-3 h-[calc(100vh-var(--header-h)-var(--ticker-h))]">
        <div className="lg:col-span-2 h-full">
          <AccountValueChart />
        </div>
        <div className="lg:col-span-1 h-full overflow-hidden">
          <Suspense
            fallback={
              <div className="mb-2 text-xs text-zinc-500">加载标签…</div>
            }
          >
            <div className="mb-2 flex items-center gap-3 text-xs">
              <TabButton name="持仓" tabKey="positions" />
              <TabButton name="模型对话" tabKey="chat" />
              <TabButton name="成交" tabKey="trades" />
              <TabButton name="分析" disabled />
              <TabButton name="README.md" tabKey="readme" />
            </div>
          </Suspense>
          <div className="h-[calc(100%-1.5rem)] overflow-y-auto pr-1">
            <Suspense
              fallback={<div className="text-xs text-zinc-500">加载数据…</div>}
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
