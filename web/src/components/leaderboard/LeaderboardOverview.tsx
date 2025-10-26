"use client";
import { useMemo } from "react";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import { useLeaderboard } from "@/lib/api/hooks/useLeaderboard";
import { useAccountTotals } from "@/lib/api/hooks/useAccountTotals";
import { usePositions } from "@/lib/api/hooks/usePositions";
import { getModelName, getModelColor } from "@/lib/model/meta";
import { ModelLogoChip } from "@/components/shared/ModelLogo";
import CoinIcon from "@/components/shared/CoinIcon";
import { fmtUSD } from "@/lib/utils/formatters";
import { useLatestEquityMap } from "@/lib/api/hooks/useModelSnapshots";

export default function LeaderboardOverview({
  mode = "overall",
}: {
  mode?: "overall" | "advanced";
}) {
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
      {/* 排行榜表格 */}
      <LeaderboardTable mode={mode} />

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
  const max = Math.max(...rows.map((r) => Number(r.equity || 0)), 1);
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
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {rows.map((r) => {
          const color = getModelColor(r.id);
          const h = Math.max(
            6,
            Math.round((Number(r.equity || 0) / max) * 120),
          );
          return (
            <div key={r.id} className="flex flex-col items-center gap-2">
              <div
                className="w-10 rounded-sm border"
                style={{
                  height: h,
                  background: color,
                  borderColor:
                    "color-mix(in oklab, var(--panel-border) 60%, transparent)",
                }}
              />
              <div
                className="ui-sans text-[11px]"
                style={{ color: "var(--muted-text)" }}
              >
                {getModelName(r.id)}
              </div>
              <div
                className="tabular-nums text-[11px]"
                style={{ color: "var(--foreground)" }}
              >
                {fmtUSD(r.equity)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
