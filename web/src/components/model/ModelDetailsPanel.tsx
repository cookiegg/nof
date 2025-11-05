"use client";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAccountTotals } from "@/lib/api/hooks/useAccountTotals";
import { usePositions } from "@/lib/api/hooks/usePositions";
import { useTrades } from "@/lib/api/hooks/useTrades";
import { fmtUSD, pnlClass } from "@/lib/utils/formatters";
import { getModelName } from "@/lib/model/meta";
import { useTheme } from "@/store/useTheme";
import { useLocale } from "@/store/useLocale";

export default function ModelDetailsPanel({
  modelId: propModelId,
}: {
  modelId?: string;
}) {
  // Use CSS variables via styles instead of theme branching
  const search = useSearchParams();
  // 统一使用 bot_id 作为筛选键，沿用 query 参数名 "model" 以减少改动
  const urlModel = search.get("model") || undefined;
  const modelId = (propModelId || urlModel || "").trim(); // 用作 bot_id

  const { data: totalsData } = useAccountTotals();
  const { positionsByModel } = usePositions();
  const { trades } = useTrades();
  const { locale } = useLocale();
  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);

  const latest = useMemo(() => {
    const list: any[] =
      totalsData && (totalsData as any).accountTotals
        ? (totalsData as any).accountTotals
        : [];
    // Find latest entry for modelId（这里将 modelId 视为 bot_id）
    let row: any | undefined;
    for (let i = list.length - 1; i >= 0; i--) {
      const r = list[i];
      // 统一按 bot_id 匹配；向后兼容：若无 bot_id 则退化到 model_id
      const bid = r?.bot_id || r?.model_id || r?.id;
      if (bid === modelId) {
        row = r;
        break;
      }
    }
    if (!row && list.length) row = list[list.length - 1];
    return row;
  }, [totalsData, modelId]);

  const positions = useMemo(() => {
    const found = positionsByModel.find((m) => m.id === modelId);
    return found ? Object.values(found.positions || {}) : [];
  }, [positionsByModel, modelId]);

  const recentTrades = useMemo(
    () =>
      trades
        .filter((t) => {
          // 统一按 bot_id 匹配；向后兼容：若无 bot_id 则退化到 model_id
          const bid = (t as any).bot_id || (t as any).model_id;
          return bid === modelId;
        })
        .slice(-5)
        .reverse(),
    [trades, modelId],
  );

  if (!modelId)
    return (
      <div className="text-xs" style={{ color: "var(--muted-text)" }}>
        {t("请选择Bot（右上筛选）。", "Please select a Bot (use the filter on the top right).")}
      </div>
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div
          className={`text-sm font-semibold`}
          style={{ color: "var(--foreground)" }}
        >
          {modelId}
        </div>
        <div className={`text-xs`} style={{ color: "var(--muted-text)" }}>
          {t("Bot ID：", "Bot ID:")}{modelId}
        </div>
      </div>

      <div
        className={`grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]`}
        style={{ color: "var(--muted-text)" }}
      >
        <div>
          {t("净值：", "Equity:")}
          <span className="tabular-nums">
            {fmtUSD(
              latest?.dollar_equity ?? latest?.equity ?? latest?.account_value,
            )}
          </span>
        </div>
        <div>
          {t("累计收益：", "Total Return:")}
          <span className={pnlClass(latest?.cum_pnl_pct)}>
            {latest?.cum_pnl_pct != null
              ? `${latest.cum_pnl_pct.toFixed(2)}%`
              : "—"}
          </span>
        </div>
        <div>
          {t("已实现盈亏：", "Realized P&L:")}
          <span className={pnlClass(latest?.realized_pnl)}>
            {fmtUSD(latest?.realized_pnl)}
          </span>
        </div>
        <div>
          {t("未实现盈亏：", "Unrealized P&L:")}
          <span className={pnlClass(latest?.total_unrealized_pnl)}>
            {fmtUSD(latest?.total_unrealized_pnl)}
          </span>
        </div>
      </div>

      <div
        className={`rounded-md border`}
        style={{ borderColor: "var(--panel-border)" }}
      >
        <div
          className={`border-b px-3 py-2 text-xs`}
          style={{
            borderColor: "var(--panel-border)",
            color: "var(--muted-text)",
          }}
        >
          {t("当前持仓", "Current Positions")}
        </div>
        {/* bot_id 提示行 */}
        <div className="px-3 py-1 text-[11px]" style={{ color: "var(--muted-text)" }}>
          Bot: <span className="font-semibold" style={{ color: "var(--foreground)" }}>{modelId}</span>
        </div>
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-left text-[11px]">
            <thead style={{ color: "var(--muted-text)" }}>
              <tr
                className={`border-b`}
                style={{ borderColor: "var(--panel-border)" }}
              >
                <th className="py-1.5 pr-3">{t("方向", "Side")}</th>
                <th className="py-1.5 pr-3">{t("币种", "Symbol")}</th>
                <th className="py-1.5 pr-3">{t("杠杆", "Leverage")}</th>
                <th className="py-1.5 pr-3">{t("入场价", "Entry Price")}</th>
                <th className="py-1.5 pr-3">{t("当前价", "Current Price")}</th>
                <th className="py-1.5 pr-3">{t("未实现盈亏", "Unrealized P&L")}</th>
              </tr>
            </thead>
            <tbody style={{ color: "var(--foreground)" }}>
              {positions.length ? (
                positions.map((p: any, i: number) => {
                  const side = p.quantity > 0 
                    ? (locale === "zh" ? "做多" : "LONG")
                    : (locale === "zh" ? "做空" : "SHORT");
                  return (
                    <tr
                      key={i}
                      className={`border-b`}
                      style={{
                        borderColor:
                          "color-mix(in oklab, var(--panel-border) 50%, transparent)",
                      }}
                    >
                      <td className="py-1.5 pr-3">{side}</td>
                      <td className="py-1.5 pr-3">{p.symbol}</td>
                      <td className="py-1.5 pr-3">{p.leverage}x</td>
                      <td className="py-1.5 pr-3 tabular-nums">
                        {fmtUSD(p.entry_price)}
                      </td>
                      <td className="py-1.5 pr-3 tabular-nums">
                        {fmtUSD(p.current_price)}
                      </td>
                      <td
                        className={`py-1.5 pr-3 tabular-nums ${pnlClass(p.unrealized_pnl)}`}
                      >
                        {fmtUSD(p.unrealized_pnl)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    className={`p-3 text-xs`}
                    style={{ color: "var(--muted-text)" }}
                    colSpan={6}
                  >
                    {t("暂无持仓", "No positions")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className={`rounded-md border`}
        style={{ borderColor: "var(--panel-border)" }}
      >
        <div
          className={`border-b px-3 py-2 text-xs`}
          style={{
            borderColor: "var(--panel-border)",
            color: "var(--muted-text)",
          }}
        >
          {t("最近成交", "Recent Trades")}
        </div>
        <div className="max-h-48 overflow-auto">
          <table className="w-full text-left text-[11px]">
            <thead style={{ color: "var(--muted-text)" }}>
              <tr
                className={`border-b`}
                style={{ borderColor: "var(--panel-border)" }}
              >
                <th className="py-1.5 pr-3">{t("币种", "Symbol")}</th>
                <th className="py-1.5 pr-3">{t("方向", "Side")}</th>
                <th className="py-1.5 pr-3">{t("杠杆", "Leverage")}</th>
                <th className="py-1.5 pr-3">{t("净盈亏", "Net P&L")}</th>
              </tr>
            </thead>
            <tbody style={{ color: "var(--foreground)" }}>
              {recentTrades.length ? (
                recentTrades.map((t: any) => {
                  const side = t.side === "long"
                    ? (locale === "zh" ? "做多" : "LONG")
                    : t.side === "short"
                    ? (locale === "zh" ? "做空" : "SHORT")
                    : (t.side?.toUpperCase() || "");
                  return (
                  <tr
                    key={t.id}
                    className={`border-b`}
                    style={{
                      borderColor:
                        "color-mix(in oklab, var(--panel-border) 50%, transparent)",
                    }}
                  >
                    <td className="py-1.5 pr-3">{t.symbol}</td>
                      <td className="py-1.5 pr-3">{side}</td>
                    <td className="py-1.5 pr-3">{t.leverage}x</td>
                    <td
                      className={`py-1.5 pr-3 tabular-nums ${pnlClass(t.realized_net_pnl)}`}
                    >
                      {fmtUSD(t.realized_net_pnl)}
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    className={`p-3 text-xs`}
                    style={{ color: "var(--muted-text)" }}
                    colSpan={4}
                  >
                    {t("暂无成交", "No trades")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
