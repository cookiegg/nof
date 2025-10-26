import ModelSelectorBar from "@/components/model/ModelSelectorBar";
import ModelStatsSummary from "@/components/model/ModelStatsSummary";
import ModelOpenPositions from "@/components/model/ModelOpenPositions";
import ModelRecentTradesTable from "@/components/model/ModelRecentTradesTable";
import ModelAnalyticsDetails from "@/components/model/ModelAnalyticsDetails";

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: raw } = await params;
  const id = decodeURIComponent(raw || "");
  return (
    <main className="min-h-screen w-full px-3 py-3 sm:px-4 sm:py-4 lg:px-8 lg:py-6">
      <div className="mx-auto w-full max-w-7xl space-y-3">
        {/* 顶部模型选择按钮（无边框容器） */}
        <ModelSelectorBar activeId={id} />

        {/* 顶部统计摘要（两段，整行展示） */}
        <ModelStatsSummary modelId={id} />

        {/* 分析详情（可收起/展开） */}
        <ModelAnalyticsDetails modelId={id} />

        {/* 详情分块：当前持仓 与 最近成交（纵向堆叠） */}
        <div className="space-y-3">
          <div className="rounded-md border p-3" style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}>
            <ModelOpenPositions modelId={id} />
          </div>
          <div className="rounded-md border p-3" style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}>
            <ModelRecentTradesTable modelId={id} />
          </div>
        </div>
      </div>
    </main>
  );
}

// moved imports to top for clarity
