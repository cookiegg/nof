"use client";
import { useState } from "react";
import { useAnalyticsMap } from "@/lib/api/hooks/useAnalyticsMap";
import { fmtUSD } from "@/lib/utils/formatters";

export default function ModelAnalyticsDetails({ modelId }: { modelId: string }) {
  const { map } = useAnalyticsMap();
  const a: any = map[modelId] || {};
  const [open, setOpen] = useState(false);

  if (!a || Object.keys(a).length === 0) return null;

  const t = a.overall_trades_overview_table || {};
  const w = a.winners_losers_breakdown_table || {};
  const f = a.fee_pnl_moves_breakdown_table || {};
  const s = a.signals_breakdown_table || {};
  const inv = a.invocation_breakdown_table || {};
  const ls = a.longs_shorts_breakdown_table || {};

  return (
    <div className="rounded-md border" style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="ui-sans text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          分析详情
        </div>
        <button
          className="ui-sans rounded border px-2 py-1 text-xs chip-btn"
          style={{ borderColor: "var(--chip-border)", color: "var(--foreground)" }}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "收起" : "展开"}
        </button>
      </div>
      {open && (
        <div className="px-3 pb-3">
          {/* 顶部KPI条：紧凑四列/八项，金融风格右对齐 */}
          <dl
            className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4 lg:grid-cols-8 border-b pb-2"
            style={{ borderColor: "var(--panel-border)" }}
          >
            {kpi("总交易数", intFmt(t.total_trades))}
            {kpi("平均持有", minsCompact(t.avg_holding_period_mins))}
            {kpi("平均杠杆", numFmt(t.avg_convo_leverage, 1))}
            {kpi("平均名义", fmtUSD(t.avg_size_of_trade_notional))}
            {kpi("胜率", pctFmt(w.win_rate))}
            {kpi("总手续费", fmtUSD(f.total_fees_paid))}
            {kpiColored("最大盈利", fmtUSD(f.biggest_net_gain), f.biggest_net_gain)}
            {kpiColored("最大亏损", fmtUSD(f.biggest_net_loss), f.biggest_net_loss)}
          </dl>

          {/* 单列信息：更紧凑的分组，以小标题+三列格栅呈现 */}
          <Subhead title="交易概览" />
          <StatGrid>
            {stat("中位持有时长", minsCompact(t.median_holding_period_mins))}
            {stat("持有时长标准差", minsCompact(t.std_holding_period_mins))}
            {stat("中位会话杠杆", numFmt(t.median_convo_leverage, 1))}
            {stat("中位名义金额", fmtUSD(t.median_size_of_trade_notional))}
            {stat("名义金额标准差", fmtUSD(t.std_size_of_trade_notional))}
          </StatGrid>

          <Subhead title="胜负分布" />
          <StatGrid>
            {statColored("盈利单平均净盈亏", fmtUSD(w.avg_winners_net_pnl), w.avg_winners_net_pnl)}
            {statColored("亏损单平均净盈亏", fmtUSD(w.avg_losers_net_pnl), w.avg_losers_net_pnl)}
            {stat("盈利单平均持有", minsCompact(w.avg_winners_holding_period))}
            {stat("亏损单平均持有", minsCompact(w.avg_losers_holding_period))}
            {stat("盈利单平均名义", fmtUSD(w.avg_winners_notional))}
            {stat("亏损单平均名义", fmtUSD(w.avg_losers_notional))}
          </StatGrid>

          <Subhead title="信号统计" />
          <StatGrid>
            {stat("总信号数", intFmt(s.total_signals))}
            {stat("多/空/持有/平仓占比", percentMix(s))}
            {stat("空仓时间占比", pctFmt(s.pct_mins_flat_combined))}
            {stat("平均置信度（总）", pctFrom0to1(s.avg_confidence))}
            {stat("平均置信度（多）", pctFrom0to1(s.avg_confidence_long))}
            {stat("平均置信度（平仓）", pctFrom0to1(s.avg_confidence_close))}
          </StatGrid>

          <Subhead title="调用节奏" />
          <StatGrid>
            {stat("调用次数", intFmt(inv.num_invocations))}
            {stat("平均间隔", minsCompact(inv.avg_invocation_break_mins))}
            {stat("最小/最大间隔", rangeFmt(inv.min_invocation_break_mins, inv.max_invocation_break_mins))}
          </StatGrid>

          <Subhead title="多空交易拆分" />
          <StatGrid>
            {stat("多/空交易数", `${intFmt(ls.num_long_trades)} / ${intFmt(ls.num_short_trades)}`)}
            {statColored("多头平均净盈亏", fmtUSD(ls.avg_longs_net_pnl), ls.avg_longs_net_pnl)}
            {statColored("空头平均净盈亏", fmtUSD(ls.avg_shorts_net_pnl), ls.avg_shorts_net_pnl)}
            {stat("多/空平均持有", `${minsCompact(ls.avg_longs_holding_period)} / ${minsCompact(ls.avg_shorts_holding_period)}`)}
          </StatGrid>
        </div>
      )}
    </div>
  );
}

function Subhead({ title }: { title: string }) {
  return (
    <div
      className="ui-sans mt-2 mb-1 border-b pb-1 text-[11px] tracking-wide"
      style={{ borderColor: "var(--panel-border)", color: "var(--muted-text)" }}
    >
      {title}
    </div>
  );
}

function StatGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-4 gap-y-1 md:grid-cols-3 lg:grid-cols-4">{children}</dl>;
}

function kpi(label: string, value?: string) {
  return (
    <div key={label} className="flex items-baseline justify-between">
      <dt className="ui-sans text-[11px]" style={{ color: "var(--muted-text)" }}>
        {label}
      </dt>
      <dd className="terminal-text tabular-nums text-[12px]" style={{ color: "var(--foreground)" }}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

function kpiColored(label: string, value?: string, num?: number) {
  return (
    <div key={label} className="flex items-baseline justify-between">
      <dt className="ui-sans text-[11px]" style={{ color: "var(--muted-text)" }}>{label}</dt>
      <dd
        className="terminal-text tabular-nums text-[12px]"
        style={{ color: pnlColor(num) }}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

function stat(label: string, value?: string) {
  return (
    <div key={label} className="flex items-baseline justify-between">
      <dt className="ui-sans text-[11px]" style={{ color: "var(--muted-text)" }}>{label}</dt>
      <dd className="terminal-text tabular-nums text-[12px]" style={{ color: "var(--foreground)" }}>{value ?? "—"}</dd>
    </div>
  );
}

function statColored(label: string, value?: string, num?: number) {
  return (
    <div key={label} className="flex items-baseline justify-between">
      <dt className="ui-sans text-[11px]" style={{ color: "var(--muted-text)" }}>{label}</dt>
      <dd className="terminal-text tabular-nums text-[12px]" style={{ color: pnlColor(num) }}>{value ?? "—"}</dd>
    </div>
  );
}

function pnlColor(n?: number | null) {
  if (n == null || Number.isNaN(n)) return "var(--muted-text)";
  return n > 0 ? "#22c55e" : n < 0 ? "#ef4444" : "var(--muted-text)";
}

function intFmt(n?: number) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString();
}

function numFmt(n?: number, d = 1) {
  if (n == null || Number.isNaN(n)) return "—";
  return String(Number(n).toFixed(d));
}

function pctFmt(n?: number) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Number(n).toFixed(1)}%`;
}

function pctFrom0to1(n?: number) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${(Number(n) * 100).toFixed(1)}%`;
}

function minsCompact(n?: number) {
  if (n == null || Number.isNaN(n)) return "—";
  const m = Math.round(n);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const hh = h % 24;
    return `${d}d${hh}h`;
  }
  return h ? `${h}h${String(mm).padStart(2, "0")}m` : `${mm}m`;
}

function rangeFmt(a?: number, b?: number) {
  const A = minsCompact(a);
  const B = minsCompact(b);
  if (A === "—" && B === "—") return "—";
  return `${A}/${B}`;
}

function percentMix(s: any) {
  const L = s.long_signal_pct, S = s.short_signal_pct, H = s.hold_signal_pct, C = s.close_signal_pct;
  const parts: string[] = [];
  if (L != null) parts.push(`多${L.toFixed(1)}%`);
  if (S != null) parts.push(`空${S.toFixed(1)}%`);
  if (H != null) parts.push(`持有${H.toFixed(1)}%`);
  if (C != null) parts.push(`平仓${C.toFixed(1)}%`);
  return parts.length ? parts.join(" · ") : "—";
}
