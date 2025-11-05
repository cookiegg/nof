"use client";
import { useState } from "react";
import { useAnalyticsMap } from "@/lib/api/hooks/useAnalyticsMap";
import { fmtUSD } from "@/lib/utils/formatters";
import { useLocale } from "@/store/useLocale";

export default function ModelAnalyticsDetails({ modelId }: { modelId: string }) {
  const { map } = useAnalyticsMap();
  const a: any = map[modelId] || {};
  const [open, setOpen] = useState(false);
  const { locale } = useLocale();
  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);

  if (!a || Object.keys(a).length === 0) return null;

  const trades = a.overall_trades_overview_table || {};
  const w = a.winners_losers_breakdown_table || {};
  const f = a.fee_pnl_moves_breakdown_table || {};
  const s = a.signals_breakdown_table || {};
  const inv = a.invocation_breakdown_table || {};
  const ls = a.longs_shorts_breakdown_table || {};

  return (
    <div className="rounded-md border" style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="ui-sans text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          {t("分析详情", "Analytics Details")}
        </div>
        <button
          className="ui-sans rounded border px-2 py-1 text-xs chip-btn"
          style={{ borderColor: "var(--chip-border)", color: "var(--foreground)" }}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? t("收起", "Collapse") : t("展开", "Expand")}
        </button>
      </div>
      {open && (
        <div className="px-3 pb-3">
          {/* 顶部KPI条：紧凑四列/八项，金融风格右对齐 */}
          <dl
            className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4 lg:grid-cols-8 border-b pb-2"
            style={{ borderColor: "var(--panel-border)" }}
          >
            {kpi(t("总交易数", "Total Trades"), intFmt(trades.total_trades))}
            {kpi(t("平均持有", "Avg Holding"), minsCompact(trades.avg_holding_period_mins, locale))}
            {kpi(t("平均杠杆", "Avg Leverage"), numFmt(trades.avg_convo_leverage, 1))}
            {kpi(t("平均名义", "Avg Notional"), fmtUSD(trades.avg_size_of_trade_notional))}
            {kpi(t("胜率", "Win Rate"), pctFmt(w.win_rate))}
            {kpi(t("总手续费", "Total Fees"), fmtUSD(f.total_fees_paid))}
            {kpiColored(t("最大盈利", "Max Gain"), fmtUSD(f.biggest_net_gain), f.biggest_net_gain)}
            {kpiColored(t("最大亏损", "Max Loss"), fmtUSD(f.biggest_net_loss), f.biggest_net_loss)}
          </dl>

          {/* 单列信息：更紧凑的分组，以小标题+三列格栅呈现 */}
          <Subhead title={t("交易概览", "Trades Overview")} />
          <StatGrid>
            {stat(t("中位持有时长", "Median Holding"), minsCompact(trades.median_holding_period_mins, locale))}
            {stat(t("持有时长标准差", "Holding Std Dev"), minsCompact(trades.std_holding_period_mins, locale))}
            {stat(t("中位会话杠杆", "Median Leverage"), numFmt(trades.median_convo_leverage, 1))}
            {stat(t("中位名义金额", "Median Notional"), fmtUSD(trades.median_size_of_trade_notional))}
            {stat(t("名义金额标准差", "Notional Std Dev"), fmtUSD(trades.std_size_of_trade_notional))}
          </StatGrid>

          <Subhead title={t("胜负分布", "Winners/Losers")} />
          <StatGrid>
            {statColored(t("盈利单平均净盈亏", "Avg Winner P&L"), fmtUSD(w.avg_winners_net_pnl), w.avg_winners_net_pnl)}
            {statColored(t("亏损单平均净盈亏", "Avg Loser P&L"), fmtUSD(w.avg_losers_net_pnl), w.avg_losers_net_pnl)}
            {stat(t("盈利单平均持有", "Avg Winner Holding"), minsCompact(w.avg_winners_holding_period, locale))}
            {stat(t("亏损单平均持有", "Avg Loser Holding"), minsCompact(w.avg_losers_holding_period, locale))}
            {stat(t("盈利单平均名义", "Avg Winner Notional"), fmtUSD(w.avg_winners_notional))}
            {stat(t("亏损单平均名义", "Avg Loser Notional"), fmtUSD(w.avg_losers_notional))}
          </StatGrid>

          <Subhead title={t("信号统计", "Signals")} />
          <StatGrid>
            {stat(t("总信号数", "Total Signals"), intFmt(s.total_signals))}
            {stat(t("多/空/持有/平仓占比", "Long/Short/Hold/Close %"), percentMix(s, locale))}
            {stat(t("空仓时间占比", "Flat Time %"), pctFmt(s.pct_mins_flat_combined))}
            {stat(t("平均置信度（总）", "Avg Confidence (Total)"), pctFrom0to1(s.avg_confidence))}
            {stat(t("平均置信度（多）", "Avg Confidence (Long)"), pctFrom0to1(s.avg_confidence_long))}
            {stat(t("平均置信度（平仓）", "Avg Confidence (Close)"), pctFrom0to1(s.avg_confidence_close))}
          </StatGrid>

          <Subhead title={t("调用节奏", "Invocation Rhythm")} />
          <StatGrid>
            {stat(t("调用次数", "Invocations"), intFmt(inv.num_invocations))}
            {stat(t("平均间隔", "Avg Interval"), minsCompact(inv.avg_invocation_break_mins, locale))}
            {stat(t("最小/最大间隔", "Min/Max Interval"), rangeFmt(inv.min_invocation_break_mins, inv.max_invocation_break_mins, locale))}
          </StatGrid>

          <Subhead title={t("多空交易拆分", "Long/Short Breakdown")} />
          <StatGrid>
            {stat(t("多/空交易数", "Long/Short Count"), `${intFmt(ls.num_long_trades)} / ${intFmt(ls.num_short_trades)}`)}
            {statColored(t("多头平均净盈亏", "Avg Long P&L"), fmtUSD(ls.avg_longs_net_pnl), ls.avg_longs_net_pnl)}
            {statColored(t("空头平均净盈亏", "Avg Short P&L"), fmtUSD(ls.avg_shorts_net_pnl), ls.avg_shorts_net_pnl)}
            {stat(t("多/空平均持有", "Long/Short Avg Holding"), `${minsCompact(ls.avg_longs_holding_period, locale)} / ${minsCompact(ls.avg_shorts_holding_period, locale)}`)}
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

function minsCompact(n?: number, locale: "zh" | "en" = "zh") {
  if (n == null || Number.isNaN(n)) return "—";
  const m = Math.round(n);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const hh = h % 24;
    return locale === "zh" ? `${d}天${hh}小时` : `${d}d${hh}h`;
  }
  if (locale === "zh") {
    return h ? `${h}小时${String(mm).padStart(2, "0")}分` : `${mm}分`;
  }
  return h ? `${h}h${String(mm).padStart(2, "0")}m` : `${mm}m`;
}

function rangeFmt(a?: number, b?: number, locale: "zh" | "en" = "zh") {
  const A = minsCompact(a, locale);
  const B = minsCompact(b, locale);
  if (A === "—" && B === "—") return "—";
  return `${A}/${B}`;
}

function percentMix(s: any, locale: "zh" | "en" = "zh") {
  const L = s.long_signal_pct, S = s.short_signal_pct, H = s.hold_signal_pct, C = s.close_signal_pct;
  const parts: string[] = [];
  if (locale === "zh") {
  if (L != null) parts.push(`多${L.toFixed(1)}%`);
  if (S != null) parts.push(`空${S.toFixed(1)}%`);
  if (H != null) parts.push(`持有${H.toFixed(1)}%`);
  if (C != null) parts.push(`平仓${C.toFixed(1)}%`);
  } else {
    if (L != null) parts.push(`Long ${L.toFixed(1)}%`);
    if (S != null) parts.push(`Short ${S.toFixed(1)}%`);
    if (H != null) parts.push(`Hold ${H.toFixed(1)}%`);
    if (C != null) parts.push(`Close ${C.toFixed(1)}%`);
  }
  return parts.length ? parts.join(" · ") : "—";
}
