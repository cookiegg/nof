"use client";
import { useMemo } from "react";
import { useAccountTotals } from "@/lib/api/hooks/useAccountTotals";
import { useAnalyticsMap } from "@/lib/api/hooks/useAnalyticsMap";
import { usePositions } from "@/lib/api/hooks/usePositions";
import { useTrades } from "@/lib/api/hooks/useTrades";
import { fmtUSD } from "@/lib/utils/formatters";
import Tooltip from "@/components/ui/Tooltip";

export default function ModelStatsSummary({ modelId }: { modelId: string }) {
  const { data: totalsData } = useAccountTotals();
  const { map: analytics } = useAnalyticsMap();
  const { positionsByModel } = usePositions();
  const { trades } = useTrades();

  const latest = useMemo(() => {
    const arr = totalsData?.accountTotals ?? [];
    for (let i = arr.length - 1; i >= 0; i--) {
      const r = arr[i] as any;
      const id = String(r.model_id || r.id || "");
      if (id === modelId) return r as any;
    }
    return undefined;
  }, [totalsData, modelId]);

  const open = useMemo(() => {
    const found = positionsByModel.find((m) => m.id === modelId);
    return Object.values(found?.positions || {});
  }, [positionsByModel, modelId]);

  const a = analytics[modelId] || {};
  const fees = a?.fee_pnl_moves_breakdown_table?.total_fees_paid;
  const biggestWin = a?.fee_pnl_moves_breakdown_table?.biggest_net_gain;
  const biggestLoss = a?.fee_pnl_moves_breakdown_table?.biggest_net_loss;
  const avgConf = a?.signals_breakdown_table?.avg_confidence; // 0-1

  // Total P&L 与 Net Realized：
  // - Total P&L 取 overall_pnl_with_fees（如可得）或 (realized_pnl + unrealized_pnl)
  // 总盈亏：与排行榜口径一致 = 最新净值 − 初始资金（$10,000）
  const BASE = 10000;
  const latestEquity = latest?.dollar_equity ?? latest?.equity ?? latest?.account_value;
  const totalPnl =
    typeof latestEquity === "number" ? latestEquity - BASE : undefined;

  // 已实现盈亏：以成交汇总求和，避免不同快照口径差异
  const netRealized = useMemo(() => {
    const my = trades.filter((t) => t.model_id === modelId);
    return my.reduce((acc, t) => acc + (Number(t.realized_net_pnl) || 0), 0);
  }, [trades, modelId]);
  const totalAccountValue = latest?.dollar_equity ?? latest?.equity ?? latest?.account_value;

  // 估算可用现金：净值 − 持仓保证金合计
  const sumMargin = open.reduce((acc: number, p: any) => acc + (p.margin || 0), 0);
  const availableCash =
    typeof totalAccountValue === "number" ? totalAccountValue - sumMargin : undefined;

  // 平均杠杆：按最近成交均值（更符合预期统计口径）
  const modelTrades = useMemo(() => trades.filter((t) => t.model_id === modelId), [trades, modelId]);
  const avgLev = useMemo(() => {
    // 1) 首选 overall_trades_overview_table.avg_convo_leverage
    const fromOverall = (analytics[modelId]?.overall_trades_overview_table as any)?.avg_convo_leverage;
    if (typeof fromOverall === 'number' && fromOverall > 0) return fromOverall;
    // 2) 其次 signals_breakdown_table.avg_leverage
    const fromSignals = (analytics[modelId]?.signals_breakdown_table as any)?.avg_leverage;
    if (typeof fromSignals === 'number' && fromSignals > 0) return fromSignals;
    // 3) 回退：最近成交的杠杆均值
    if (!modelTrades.length) return undefined;
    const sum = modelTrades.reduce((acc, t) => acc + (Number(t.leverage) || 0), 0);
    return sum / modelTrades.length;
  }, [analytics, modelId, modelTrades]);

  // HOLD TIMES：按最近 N=200 条成交的持有时长加权分解
  const holdTimes = useMemo(() => {
    const last = modelTrades
      .slice()
      .sort((a, b) => (b.exit_time || b.entry_time) - (a.exit_time || a.entry_time))
      .slice(0, 200);
    type Interval = { s: number; e: number };
    const longI: Interval[] = [];
    const shortI: Interval[] = [];
    for (const t of last) {
      const s = (t.entry_time || 0) * 1000;
      const e = (t.exit_time || t.entry_time || 0) * 1000;
      if (!s || !e || e <= s) continue;
      (t.side === "long" ? longI : shortI).push({ s, e });
    }
    if (!longI.length && !shortI.length) return { longPct: 0, shortPct: 0, flatPct: 100 };
    const minS = Math.min(...[...longI, ...shortI].map((x) => x.s));
    const maxE = Math.max(...[...longI, ...shortI].map((x) => x.e));
    const totalRange = Math.max(1, maxE - minS);
    const unionLen = (arr: Interval[]) => {
      if (!arr.length) return 0;
      const sorted = arr.slice().sort((a, b) => a.s - b.s);
      let curS = sorted[0].s,
        curE = sorted[0].e,
        sum = 0;
      for (let i = 1; i < sorted.length; i++) {
        const it = sorted[i];
        if (it.s <= curE) curE = Math.max(curE, it.e);
        else {
          sum += curE - curS;
          curS = it.s;
          curE = it.e;
        }
      }
      sum += curE - curS;
      return sum;
    };
    const longU = unionLen(longI);
    const shortU = unionLen(shortI);
    const anyU = unionLen([...longI, ...shortI]);
    const flat = Math.max(0, 1 - anyU / totalRange);
    const remain = 1 - flat;
    const sumLS = longU + shortU;
    const long = sumLS > 0 ? (longU / sumLS) * remain : 0;
    const short = sumLS > 0 ? (shortU / sumLS) * remain : 0;
    return {
      longPct: Math.max(0, Math.min(long * 100, 100)),
      shortPct: Math.max(0, Math.min(short * 100, 100)),
      flatPct: Math.max(0, Math.min(flat * 100, 100)),
    };
  }, [modelTrades]);

  return (
    <div className="space-y-3">
      {/* Part 1：更宽展示 + 中文 */}
      <div className="rounded-md border p-4 relative" style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}>
        {/* 右上角灰色小字 */}
        <div className="absolute right-3 top-2 ui-sans text-[11px] whitespace-nowrap" style={{ color: "var(--muted-text)" }}>
          不含资金费与返佣（Does not include funding costs and rebates）
        </div>
        {/* 优先展示与视觉权重更高的三项 */}
        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Stat
            label="账户总权益"
            value={fmtUSD(totalAccountValue)}
            tip={(<div>口径：最新快照的账户权益（含未实现盈亏）。</div>)}
          />
          <Stat
            label="总盈亏"
            value={fmtUSD(totalPnl)}
            tone="pnl"
            num={totalPnl}
            tip={(<div>口径：优先取分析接口的总体盈亏（含手续费），否则为已实现+未实现。</div>)}
          />
          <Stat
            label="已实现盈亏"
            value={fmtUSD(netRealized)}
            tone="pnl"
            num={netRealized}
            tip={(<div>口径：已平仓交易累计净盈亏。</div>)}
          />
        </div>
        {/* 次级信息置于下一行 */}
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Stat label="可用现金（估）" value={fmtUSD(availableCash)} tip={(<div>估算：账户总权益 − 当前持仓保证金。</div>)} />
          <Stat label="手续费总计" value={fmtUSD(fees)} tip={(<div>口径：已完成交易的成交手续费总额。</div>)} />
        </div>
      </div>

      {/* Part 2：更宽展示 + 中文 */}
      <div className="rounded-md border p-4" style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <Stat label="平均杠杆" value={avgLev != null ? `${avgLev.toFixed(1)}` : "—"} tip={(<div>口径：优先取 overall_trades_overview_table.avg_convo_leverage；无则回退为 signals.avg_leverage；仍无则取最近成交均值。</div>)} />
          <Stat label="平均置信度" value={avgConf != null ? `${(avgConf * 100).toFixed(1)}%` : "—"} tip={(<div>口径：信号置信度的算术平均。</div>)} />
          <Stat label="最大盈利" value={fmtUSD(biggestWin)} tone="pnl" num={biggestWin} tip={(<div>口径：单笔已完成交易的最大净盈利。</div>)} />
          <Stat label="最大亏损" value={fmtUSD(biggestLoss)} tone="pnl" num={biggestLoss} tip={(<div>口径：单笔已完成交易的最大净亏损。</div>)} />
        </div>
        <div className="mt-3">
          <div className="ui-sans text-xs" style={{ color: "var(--muted-text)" }}>
            持有时长构成
          </div>
          <div className="mt-1 grid grid-cols-3 gap-2 text-sm">
            <div>多头：<span className="tabular-nums">{holdTimes.longPct.toFixed(1)}%</span></div>
            <div>空头：<span className="tabular-nums">{holdTimes.shortPct.toFixed(1)}%</span></div>
            <div>空仓：<span className="tabular-nums">{holdTimes.flatPct.toFixed(1)}%</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone, num, tip }: { label: string; value?: string; tone?: "pnl"; num?: number | null | undefined; tip?: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="ui-sans text-xs" style={{ color: "var(--muted-text)" }}>
        {tip ? (
          <Tooltip content={tip}>
            <span style={{ cursor: "help" }}>{label}</span>
          </Tooltip>
        ) : (
          label
        )}
      </div>
      <div
        className="tabular-nums text-base font-semibold"
        style={{
          color:
            tone === "pnl"
              ? num == null || Number.isNaN(num)
                ? "var(--muted-text)"
                : num > 0
                  ? "#22c55e"
                  : num < 0
                    ? "#ef4444"
                    : "var(--muted-text)"
              : "var(--foreground)",
        }}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}
