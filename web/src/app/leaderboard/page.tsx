"use client";
import { useState } from "react";
import LeaderboardOverview from "@/components/leaderboard/LeaderboardOverview";

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"overall" | "analytics">("overall");
  return (
    <main className="min-h-screen w-full p-3">
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
      {tab === "overall" ? (
        <LeaderboardOverview mode="overall" />
      ) : (
        <LeaderboardOverview mode="advanced" />
      )}
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
