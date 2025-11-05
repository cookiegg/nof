"use client";
import clsx from "clsx";
import { useMemo } from "react";
import { useTrades } from "@/lib/api/hooks/useTrades";
import { fmtUSD } from "@/lib/utils/formatters";
import { useLocale } from "@/store/useLocale";

export default function ModelRecentTradesTable({ modelId }: { modelId: string }) {
  const { trades, isLoading } = useTrades();
  const { locale } = useLocale();
  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);
  const rows = useMemo(() => {
    const all = trades.filter((t) => t.model_id === modelId);
    all.sort(
      (a, b) =>
        Number(b.exit_time || b.entry_time) - Number(a.exit_time || a.entry_time),
    );
    return all.slice(0, 25);
  }, [trades, modelId]);

  return (
    <div>
      <div className="ui-sans mb-2 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
        {t("最近成交（25）", "Recent Trades (25)")}
      </div>
      <div className="overflow-x-auto" style={{ overflowY: "visible" }}>
        <table className="w-full text-left text-[12px] terminal-text">
          <thead className="ui-sans sticky top-0 z-10" style={{ color: "var(--muted-text)", background: "var(--panel-bg)" }}>
            <tr className="border-b" style={{ borderColor: "var(--panel-border)" }}>
              <th className="py-1.5 pr-3">{t("方向", "Side")}</th>
              <th className="py-1.5 pr-3">{t("币种", "Symbol")}</th>
              <th className="py-1.5 pr-3">{t("入场价", "Entry Price")}</th>
              <th className="py-1.5 pr-3">{t("出场价", "Exit Price")}</th>
              <th className="py-1.5 pr-3">{t("数量", "Quantity")}</th>
              <th className="py-1.5 pr-3">{t("持有时长", "Hold Time")}</th>
              <th className="py-1.5 pr-3">{t("名义入场", "Entry Notional")}</th>
              <th className="py-1.5 pr-3">{t("名义离场", "Exit Notional")}</th>
              <th className="py-1.5 pr-3">{t("手续费", "Fees")}</th>
              <th className="py-1.5 pr-3">{t("净盈亏", "Net P&L")}</th>
            </tr>
          </thead>
          <tbody style={{ color: "var(--foreground)" }}>
            {isLoading ? (
              <tr><td className="p-3 text-xs" colSpan={10} style={{ color: "var(--muted-text)" }}>{t("加载中…", "Loading…")}</td></tr>
            ) : rows.length ? (
              rows.map((t, i) => {
                const qty = Math.abs(t.quantity || 0);
                const notionalIn = (t.entry_price || 0) * qty;
                const notionalOut = (t.exit_price || 0) * qty;
                const sideText = t.side === "long"
                  ? (locale === "zh" ? "做多" : "LONG")
                  : t.side === "short"
                  ? (locale === "zh" ? "做空" : "SHORT")
                  : (t.side?.toUpperCase() || "");
                return (
                  <tr
                    key={i}
                    className={clsx("border-b")}
                    style={{ borderColor: "color-mix(in oklab, var(--panel-border) 50%, transparent)" }}
                  >
                    <td className="py-1.5 pr-3" style={{ color: sideColor(t.side) }}>{sideText}</td>
                    <td className="py-1.5 pr-3">{(t.symbol || "").toUpperCase()}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{fmtPrice(t.entry_price)}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{fmtPrice(t.exit_price)}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{fmtNumber(qty, 2)}</td>
                    <td className="py-1.5 pr-3">{holdHM(t.entry_time, t.exit_time, locale)}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{fmtUSD(notionalIn)}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{fmtUSD(notionalOut)}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{fmtUSD(t.total_commission_dollars)}</td>
                    <td className="py-1.5 pr-3 tabular-nums" style={{ color: pnlColor(t.realized_net_pnl) }}>{fmtUSD(t.realized_net_pnl)}</td>
                  </tr>
                );
              })
            ) : (
              <tr><td className="p-3 text-xs" colSpan={10} style={{ color: "var(--muted-text)" }}>{t("暂无成交", "No trades")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function sideColor(s?: string) {
  return s === "long" ? "#16a34a" : s === "short" ? "#ef4444" : "var(--muted-text)";
}
function pnlColor(n?: number | null) {
  if (n == null || Number.isNaN(n)) return "var(--muted-text)";
  return n > 0 ? "#22c55e" : n < 0 ? "#ef4444" : "var(--muted-text)";
}
function holdHM(entry?: number, exit?: number, locale: "zh" | "en" = "zh") {
  if (!entry) return "—";
  const a = entry > 1e12 ? entry : entry * 1000;
  const b = exit ? (exit > 1e12 ? exit : exit * 1000) : Date.now();
  const ms = Math.max(0, b - a);
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (locale === "zh") {
    return h ? `${h}小时${String(mm).padStart(2, "0")}分` : `${mm}分`;
  }
  return `${h}H ${String(mm).padStart(2, "0")}M`;
}
function fmtPrice(n?: number | null) {
  if (n == null || Number.isNaN(n)) return "--";
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 1 : abs >= 100 ? 2 : abs >= 1 ? 4 : 5;
  return `$${n.toFixed(digits)}`;
}
function fmtNumber(n?: number | null, digits = 2) {
  if (n == null || Number.isNaN(n)) return "--";
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${sign}${v}`;
}
