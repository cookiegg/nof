"use client";
import { useState } from "react";
import { usePositions } from "@/lib/api/hooks/usePositions";
import { fmtUSD, pnlClass } from "@/lib/utils/formatters";
import ExitPlanModal from "@/components/positions/ExitPlanModal";
import clsx from "clsx";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { useAccountTotals } from "@/lib/api/hooks/useAccountTotals";
import PositionsFilter from "@/components/positions/PositionsFilter";
import { useSearchParams } from "next/navigation";
import { useTheme } from "@/store/useTheme";

type SortKey = "symbol" | "leverage" | "entry_price" | "current_price" | "unrealized_pnl" | "side";

export function PositionsPanel() {
  // remove theme branching; rely on CSS variables
  const { positionsByModel, isLoading, isError } = usePositions();
  const { data: totalsData } = useAccountTotals();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCtx, setModalCtx] = useState<{ modelId: string; symbol: string; } | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("unrealized_pnl");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const search = useSearchParams();
  const qModel = (search.get("model") || "ALL").toLowerCase();
  const qSymbol = (search.get("symbol") || "ALL").toUpperCase();
  const qSide = (search.get("side") || "ALL").toUpperCase();

  if (isLoading)
    return (
      <div className={`rounded-md border p-4`} style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
        <div className={`mb-2 text-sm`} style={{ color: 'var(--muted-text)' }}>加载持仓中…</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <tbody>
              <SkeletonRow cols={7} />
              <SkeletonRow cols={7} />
              <SkeletonRow cols={7} />
            </tbody>
          </table>
        </div>
      </div>
    );

  if (!positionsByModel.length) {
    return <div className={`text-sm`} style={{ color: 'var(--muted-text)' }}>暂无持仓。</div>;
  }

  return (
    <div className="space-y-3">
      <ErrorBanner message={isError ? "上游持仓接口暂时不可用，请稍后重试。" : undefined} />
      <PositionsFilter
        models={positionsByModel.map((m) => m.id)}
        symbols={Array.from(new Set(positionsByModel.flatMap((m) => Object.keys(m.positions || {}))))}
      />
      {positionsByModel
        .filter((m) => (qModel === "all" ? true : m.id.toLowerCase() === qModel))
        .map((m) => {
        const positionsRaw = Object.values(m.positions || {});
        type PositionWithSide = typeof positionsRaw[number] & { side: "LONG" | "SHORT" };
        const positions = (() => {
          const arr: PositionWithSide[] = positionsRaw.map((p) => ({
            ...p,
            side: p.quantity > 0 ? ("LONG" as const) : ("SHORT" as const),
          }));
          const dir = sortDir === "asc" ? 1 : -1;
          return arr.sort((a, b) => {
            const av = sortKey === "side" ? a.side : a[sortKey];
            const bv = sortKey === "side" ? b.side : b[sortKey];
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
            return (Number(av) - Number(bv)) * dir;
          });
        })();
        const filtered = positions
          .filter((p: any) => (qSymbol === "ALL" ? true : p.symbol?.toUpperCase() === qSymbol))
          .filter((p: any) => (qSide === "ALL" ? true : (p.quantity > 0 ? "LONG" : "SHORT") === qSide));
        const totalUnreal = filtered.reduce((acc, p) => acc + (p.unrealized_pnl || 0), 0);
        const sumMargin = filtered.reduce((acc, p) => acc + (p.margin || 0), 0);
        const sumRisk = filtered.reduce((acc, p) => acc + (p.risk_usd || 0), 0);
        const avgConf = filtered.length ? filtered.reduce((a, p) => a + (p.confidence || 0), 0) / filtered.length : 0;

        // Extract latest totals snapshot for this model
        let equity: number | undefined;
        let realizedPnL: number | undefined;
        const list: any[] = (totalsData && (totalsData as any).accountTotals) ? (totalsData as any).accountTotals : [];
        for (let i = list.length - 1; i >= 0; i--) {
          const row = list[i];
          if ((row?.model_id === m.id) || (row?.id === m.id)) {
            equity = row.dollar_equity ?? row.equity ?? row.account_value;
            realizedPnL = row.realized_pnl;
            break;
          }
        }
        const availableCash = equity != null ? equity - sumMargin : undefined;
        return (
          <div key={m.id} className={`rounded-md border p-4`} style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            <div className="mb-3 flex items-center justify-between">
              <div className={`text-sm font-semibold`} style={{ color: 'var(--foreground)' }}>{m.id}</div>
              <div className={`text-[11px]`} style={{ color: 'var(--muted-text)' }}>
                未实现盈亏合计：<span className={totalUnreal >= 0 ? "text-green-400" : "text-red-400"}>{fmtUSD(totalUnreal)}</span>
              </div>
            </div>
            <div className={`mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]`} style={{ color: 'var(--muted-text)' }}>
              <div>净值：<span className="tabular-nums">{fmtUSD(equity)}</span></div>
              <div>已实现盈亏：<span className="tabular-nums">{fmtUSD(realizedPnL)}</span></div>
              <div>可用现金≈<span className="tabular-nums">{fmtUSD(availableCash)}</span></div>
              <div>风险金额合计：<span className="tabular-nums">{fmtUSD(sumRisk)}</span></div>
              <div>平均置信度：<span className="tabular-nums">{(avgConf ? (avgConf * 100).toFixed(1) + '%' : '—')}</span></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className={clsx("sticky top-0 z-10") } style={{ background: 'var(--panel-bg)', color: 'var(--muted-text)' }}>
                  <tr className={clsx("border-b") } style={{ borderColor: 'var(--panel-border)' }}>
                    {[
                      { k: "side", label: "方向" },
                      { k: "symbol", label: "币种" },
                      { k: "leverage", label: "杠杆" },
                      { k: "entry_price", label: "入场价" },
                      { k: "current_price", label: "当前价" },
                      { k: "unrealized_pnl", label: "未实现盈亏" },
                    ].map((c) => (
                      <th key={c.k} className="py-1.5 pr-3">
                        <button
                          className={clsx("flex items-center gap-1")}
                          style={{ color: sortKey === (c.k as SortKey) ? 'var(--foreground)' : 'var(--muted-text)' }}
                          onClick={() => {
                            if (sortKey === (c.k as SortKey)) setSortDir(sortDir === "asc" ? "desc" : "asc");
                            setSortKey(c.k as SortKey);
                          }}
                        >
                          {c.label}
                          {sortKey === (c.k as SortKey) ? <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span> : null}
                        </button>
                      </th>
                    ))}
                    <th className="py-1.5 pr-3">退出计划</th>
                  </tr>
                </thead>
                <tbody style={{ color: 'var(--foreground)' }}>
                  {filtered.map((p, i) => {
                    const side = p.quantity > 0 ? "LONG" : "SHORT";
                    return (
                      <tr key={i} className={clsx("border-b") } style={{ borderColor: 'color-mix(in oklab, var(--panel-border) 50%, transparent)' }}>
                        <td className="py-1.5 pr-3">{side}</td>
                        <td className="py-1.5 pr-3">{p.symbol}</td>
                        <td className="py-1.5 pr-3">{p.leverage}x</td>
                        <td className="py-1.5 pr-3 tabular-nums">{fmtUSD(p.entry_price)}</td>
                        <td className="py-1.5 pr-3 tabular-nums">{fmtUSD(p.current_price)}</td>
                        <td className={clsx("py-1.5 pr-3 tabular-nums", pnlClass(p.unrealized_pnl))}>{fmtUSD(p.unrealized_pnl)}</td>
                        <td className="py-1.5 pr-3">
                          {p.exit_plan?.profit_target || p.exit_plan?.stop_loss || p.exit_plan?.invalidation_condition ? (
                            <button
                              className={clsx("rounded border px-2 py-0.5 text-[11px]")}
                              style={{ borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}
                              onClick={() => {
                                setModalCtx({ modelId: m.id, symbol: p.symbol });
                                setModalOpen(true);
                              }}
                            >
                              查看
                            </button>
                          ) : (
                            <span style={{ color: 'var(--muted-text)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ExitPlanModal
              open={modalOpen && !!modalCtx}
              onClose={() => setModalOpen(false)}
              modelId={modalCtx?.modelId || m.id}
              symbol={modalCtx?.symbol || ""}
              exitPlan={modalCtx ? m.positions[modalCtx.symbol]?.exit_plan : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
