"use client";
import { useState } from "react";
import LeaderboardOverview from "@/components/leaderboard/LeaderboardOverview";

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"overall" | "analytics">("overall");
  return (
    <main className="min-h-screen w-full px-3 py-3 sm:px-4 sm:py-4 lg:px-8 lg:py-6">
      <div className="mb-3 flex items-center gap-2">
        <TabButton active={tab === "overall"} onClick={() => setTab("overall")}>
          总体统计
        </TabButton>
        <TabButton
          active={tab === "analytics"}
          onClick={() => setTab("analytics")}
        >
          高级分析
        </TabButton>
      </div>
      <div className="mx-auto w-full max-w-7xl">
        {tab === "overall" ? (
          <LeaderboardOverview mode="overall" />
        ) : (
          <LeaderboardOverview mode="advanced" />
        )}
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="ui-sans rounded-md border px-3 py-1 text-xs"
      style={{
        background: active ? "var(--panel-bg)" : "transparent",
        borderColor: "var(--panel-border)",
        color: active ? "var(--foreground)" : "var(--muted-text)",
      }}
    >
      {children}
    </button>
  );
}
