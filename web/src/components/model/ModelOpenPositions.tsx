"use client";
import clsx from "clsx";
import { useMemo } from "react";
import { usePositions } from "@/lib/api/hooks/usePositions";
import { useAccountTotals } from "@/lib/api/hooks/useAccountTotals";
import { fmtUSD, pnlClass } from "@/lib/utils/formatters";
import { getModelName } from "@/lib/model/meta";
import CoinIcon from "@/components/shared/CoinIcon";
import { useLocale } from "@/store/useLocale";

function fmtTime(sec?: number) {
  if (!sec) return "—";
  const d = new Date((sec > 1e12 ? sec : sec * 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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

export default function ModelOpenPositions({ modelId }: { modelId: string }) {
  const { positionsByModel } = usePositions();
  const { data: totalsData } = useAccountTotals();
  const { locale } = useLocale();
  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);
  const model = positionsByModel.find((m) => m.id === modelId);
  const positionsRaw = Object.values(model?.positions || {});
  const positions = useMemo(() =>
    positionsRaw.map((p: any) => ({
      ...p,
      side: p.quantity > 0 ? ("LONG" as const) : ("SHORT" as const),
    })),
  [positionsRaw]);

  // 顶部小计
  const totalUnreal = positions.reduce((acc, p: any) => acc + (p.unrealized_pnl || 0), 0);

  if (!positions.length)
    return (
      <div>
        <div className="ui-sans mb-2 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          {t("当前持仓", "Current Positions")} · {modelId}
        </div>
        <div className={`text-sm`} style={{ color: "var(--muted-text)" }}>
          {t("暂无持仓。", "No positions.")}
        </div>
      </div>
    );

  return (
    <div>
      <div className="ui-sans mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          {t("当前持仓", "Current Positions")} · {modelId}
        </div>
        <div className="text-xs" style={{ color: "var(--muted-text)" }}>
          {t("未实现盈亏合计：", "Total Unrealized P&L:")}
          <span className={totalUnreal >= 0 ? "text-green-400" : "text-red-400"}>
            {fmtUSD(totalUnreal)}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px] terminal-text">
          <thead
            className={clsx("sticky top-0 z-10 ui-sans")}
            style={{ background: "var(--panel-bg)", color: "var(--muted-text)" }}
          >
            <tr className={clsx("border-b")} style={{ borderColor: "var(--panel-border)" }}>
              <th className="py-1.5 pr-3">{t("入场时间", "Entry Time")}</th>
              <th className="py-1.5 pr-3">{t("币种", "Symbol")}</th>
              <th className="py-1.5 pr-3">{t("入场价", "Entry Price")}</th>
              <th className="py-1.5 pr-3">{t("方向", "Side")}</th>
              <th className="py-1.5 pr-3">{t("数量", "Quantity")}</th>
              <th className="py-1.5 pr-3">{t("杠杆", "Leverage")}</th>
              <th className="py-1.5 pr-3">{t("强平价", "Liquidation Price")}</th>
              <th className="py-1.5 pr-3">{t("保证金", "Margin")}</th>
              <th className="py-1.5 pr-3">{t("名义金额", "Notional")}</th>
              <th className="py-1.5 pr-3">{t("未实现盈亏", "Unrealized P&L")}</th>
              <th className="py-1.5 pr-3">{t("退出计划", "Exit Plan")}</th>
            </tr>
          </thead>
          <tbody style={{ color: "var(--foreground)" }}>
            {positions.map((p: any, i: number) => {
              const isLong = p.quantity > 0;
              const notional = Math.abs(p.quantity) * (p.current_price ?? 0);
              return (
                <tr
                  key={i}
                  className={clsx("border-b")}
                  style={{
                    borderColor:
                      "color-mix(in oklab, var(--panel-border) 50%, transparent)",
                  }}
                >
                  <td className="py-1.5 pr-3 tabular-nums">{fmtTime(p.entry_time)}</td>
                  <td className="py-1.5 pr-3">
                    <span className="inline-flex items-center gap-1">
                      <CoinIcon symbol={p.symbol} size={16} />
                      <span className="ui-sans">{p.symbol?.toUpperCase()}</span>
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 tabular-nums">{fmtUSD(p.entry_price)}</td>
                  <td className="py-1.5 pr-3" style={{ color: isLong ? "#16a34a" : "#ef4444" }}>
                    {isLong ? (locale === "zh" ? "做多" : "LONG") : (locale === "zh" ? "做空" : "SHORT")}
                  </td>
                  <td className="py-1.5 pr-3 tabular-nums">{fmtNumber(Math.abs(p.quantity), 2)}</td>
                  <td className="py-1.5 pr-3">{p.leverage}X</td>
                  <td className="py-1.5 pr-3 tabular-nums">{fmtUSD(p.liquidation_price)}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{fmtUSD(p.margin)}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{fmtUSD(notional)}</td>
                  <td className={clsx("py-1.5 pr-3 tabular-nums", pnlClass(p.unrealized_pnl))}>
                    {fmtUSD(p.unrealized_pnl)}
                  </td>
                  <td className="py-1.5 pr-3">{renderExitPlan(p.exit_plan, locale)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderExitPlan(plan?: any, locale: "zh" | "en" = "zh") {
  if (!plan || !(plan.profit_target || plan.stop_loss || plan.invalidation_condition))
    return <span style={{ color: "var(--muted-text)" }}>—</span> as any;
  if (locale === "zh") {
    return (
      <span className="ui-sans text-[11px]" style={{ color: "var(--muted-text)" }}>
        目标 {plan.profit_target ?? "—"}，止损 {plan.stop_loss ?? "—"}
      </span>
    ) as any;
  }
  return (
    <span className="ui-sans text-[11px]" style={{ color: "var(--muted-text)" }}>
      Target {plan.profit_target ?? "—"}, Stop {plan.stop_loss ?? "—"}
    </span>
  ) as any;
}
