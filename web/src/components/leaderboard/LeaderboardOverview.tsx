"use client";
import { useMemo } from "react";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import { useState } from "react";
import { useLeaderboard } from "@/lib/api/hooks/useLeaderboard";
import { useAccountTotals } from "@/lib/api/hooks/useAccountTotals";
import { usePositions } from "@/lib/api/hooks/usePositions";
import { getModelName, getModelColor, getModelIcon } from "@/lib/model/meta";
import { ModelLogoChip } from "@/components/shared/ModelLogo";
import CoinIcon from "@/components/shared/CoinIcon";
import { fmtUSD } from "@/lib/utils/formatters";
import { useLatestEquityMap } from "@/lib/api/hooks/useModelSnapshots";

export default function LeaderboardOverview({ mode: _mode }: { mode?: "overall" | "advanced" }) {
  const [tab, setTab] = useState<"overall" | "advanced">(_mode || "overall");
  const { rows } = useLeaderboard();
  const { map: equityMap } = useLatestEquityMap();
  const rowsWithEq = rows.map((r) => ({
    ...r,
    equity: equityMap[r.id] ?? r.equity,
  }));
  const top =
    rowsWithEq && rowsWithEq.length
      ? rowsWithEq
          .slice()
          .sort((a, b) => (Number(b.equity) || 0) - (Number(a.equity) || 0))[0]
      : undefined;

  const { data: totalsData } = useAccountTotals();
  const latestByModel = useMemo(() => {
    const map = new Map<string, any>();
    const arr = (totalsData?.accountTotals ?? []) as any[];
    for (const r of arr) {
      const id = String(r.model_id || r.id || "");
      const ts = Number(r.timestamp || 0);
      const prev = map.get(id);
      if (!prev || (prev.timestamp || 0) <= ts) map.set(id, r);
    }
    return Array.from(map.values());
  }, [totalsData]);

  const totalEquity = useMemo(() => {
    return latestByModel.reduce(
      (sum, r: any) =>
        sum + Number(r.equity || r.account_value || r.dollar_equity || 0),
      0,
    );
  }, [latestByModel]);

  const { positionsByModel } = usePositions();
  const activeSymbols = useMemo(() => {
    const set = new Set<string>();
    for (const m of positionsByModel) {
      for (const sym of Object.keys(m.positions || {}))
        set.add(sym.toUpperCase());
    }
    return Array.from(set.values()).slice(0, 8);
  }, [positionsByModel]);

  return (
    <div className="space-y-3">
      {/* 控制区：左侧边缘对齐，位于表格上方 */}
      <div className="flex items-center gap-2">
        <TabButton active={tab === "overall"} onClick={() => setTab("overall")}>
          总体统计
        </TabButton>
        <TabButton active={tab === "advanced"} onClick={() => setTab("advanced")}>
          高级分析
        </TabButton>
      </div>
      {/* 排行榜表格 */}
      <LeaderboardTable mode={tab} />

      {/* 摘要区块 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <WinnerCard id={top?.id} equity={top?.equity} />
        <SummaryCard title="总权益" value={fmtUSD(totalEquity || 0)} />
        <ActivePositions symbols={activeSymbols} />
      </div>

      {/* 条形图：各模型账户价值 */}
      {!!rows?.length && <Bars rows={rowsWithEq} />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
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

function WinnerCard({ id, equity }: { id?: string; equity?: number }) {
  return (
    <div
      className="rounded-md border p-3"
      style={{
        background: "var(--panel-bg)",
        borderColor: "var(--panel-border)",
      }}
    >
      <div className="ui-sans text-xs" style={{ color: "var(--muted-text)" }}>
        最佳模型
      </div>
      <div className="mt-2 flex items-center gap-2">
        {id ? <ModelLogoChip modelId={id} size="md" /> : null}
        <div>
          <div
            className="ui-sans text-sm"
            style={{ color: "var(--foreground)" }}
          >
            {id ? getModelName(id) : "—"}
          </div>
          <div
            className="tabular-nums text-xs"
            style={{ color: "var(--muted-text)" }}
          >
            {equity != null ? fmtUSD(equity) : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value?: string }) {
  return (
    <div
      className="rounded-md border p-3"
      style={{
        background: "var(--panel-bg)",
        borderColor: "var(--panel-border)",
      }}
    >
      <div className="ui-sans text-xs" style={{ color: "var(--muted-text)" }}>
        {title}
      </div>
      <div className="mt-2 text-sm" style={{ color: "var(--foreground)" }}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function ActivePositions({ symbols }: { symbols: string[] }) {
  return (
    <div
      className="rounded-md border p-3"
      style={{
        background: "var(--panel-bg)",
        borderColor: "var(--panel-border)",
      }}
    >
      <div className="ui-sans text-xs" style={{ color: "var(--muted-text)" }}>
        持仓概览
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {symbols.length ? (
          symbols.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px]"
              style={{ borderColor: "var(--panel-border)" }}
            >
              <CoinIcon symbol={s} size={16} />
              <span className="ui-sans" style={{ color: "var(--foreground)" }}>
                {s}
              </span>
            </span>
          ))
        ) : (
          <span className="text-xs" style={{ color: "var(--muted-text)" }}>
            暂无持仓
          </span>
        )}
      </div>
    </div>
  );
}

function Bars({ rows }: { rows: { id: string; equity: number }[] }) {
  const FULL = 120; // 固定容器高度
  // 自适应刻度：向上取整到最近的 2k 档，并至少 12k
  const maxEq = Math.max(...rows.map((r) => Number(r.equity || 0)), 1);
  const SCALE = Math.max(12000, Math.ceil(maxEq / 2000) * 2000);
  return (
    <div
      className="rounded-md border p-3"
      style={{
        background: "var(--panel-bg)",
        borderColor: "var(--panel-border)",
      }}
    >
      <div className="ui-sans text-xs" style={{ color: "var(--muted-text)" }}>
        账户价值
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6 md:grid-cols-6">
        {rows.map((r) => {
          const color = getModelColor(r.id);
          const eq = Number(r.equity || 0);
          const pct = Math.max(0, Math.min(eq / SCALE, 1));
          const fill = Math.max(2, Math.round(pct * FULL));
          const icon = getModelIcon(r.id);
          const ICON = 16; // logo 直径
          return (
            <div key={r.id} className="flex flex-col items-center gap-1">
              <div className="tabular-nums text-[11px]" style={{ color: "var(--foreground)" }}>
                {fmtUSD(r.equity)}
              </div>
              <div className="relative w-10" style={{ height: FULL }}>
                <div
                  className="absolute inset-0 rounded-sm border"
                  style={{
                    background:
                      "color-mix(in oklab, var(--panel-border) 22%, transparent)",
                    borderColor:
                      "color-mix(in oklab, var(--panel-border) 60%, transparent)",
                  }}
                />
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-b-sm"
                  style={{
                    height: fill,
                    background: color,
                  }}
                />
                {icon && fill >= ICON + 6 ? (
                  <div
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 overflow-hidden rounded-sm"
                    style={{ width: ICON, height: ICON }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={icon}
                      alt=""
                      width={ICON}
                      height={ICON}
                      style={{ objectFit: "contain", filter: "brightness(0) invert(1)" }}
                    />
                  </div>
                ) : null}
              </div>
              <div className="ui-sans text-[11px] text-center" style={{ color: "var(--muted-text)" }}>
                {getModelName(r.id)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
