"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePositions } from "@/lib/api/hooks/usePositions";
import { fmtUSD, pnlClass } from "@/lib/utils/formatters";
import clsx from "clsx";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { SkeletonTableRow } from "@/components/ui/Skeleton";
import { useAccountTotals } from "@/lib/api/hooks/useAccountTotals";
import PositionsFilter from "@/components/positions/PositionsFilter";
import { useSearchParams } from "next/navigation";
import { getModelColor, getModelName } from "@/lib/model/meta";
import { ModelLogoChip } from "@/components/shared/ModelLogo";
import CoinIcon from "@/components/shared/CoinIcon";
import { useLocale } from "@/store/useLocale";

type SortKey =
  | "symbol"
  | "leverage"
  | "entry_price"
  | "current_price"
  | "unrealized_pnl"
  | "side";

export function PositionsPanel() {
  const locale = useLocale((s) => s.locale);
  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);
  // remove theme branching; rely on CSS variables
  const { positionsByModel, isLoading, isError } = usePositions();
  const { data: totalsData } = useAccountTotals();
  const [sortKey, setSortKey] = useState<SortKey>("unrealized_pnl");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const search = useSearchParams();
  const qModel = (search.get("model") || "ALL").toLowerCase();
  const qSymbol = (search.get("symbol") || "ALL").toUpperCase();
  const qSide = (search.get("side") || "ALL").toUpperCase();

  if (isLoading)
    return (
      <div
        className={`rounded-md border p-4`}
        style={{
          background: "var(--panel-bg)",
          borderColor: "var(--panel-border)",
        }}
      >
        <div className={`mb-2 text-sm`} style={{ color: "var(--muted-text)" }}>
          {t('加载持仓中…','Loading positions…')}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <tbody>
              <SkeletonTableRow cols={7} />
              <SkeletonTableRow cols={7} />
              <SkeletonTableRow cols={7} />
            </tbody>
          </table>
        </div>
      </div>
    );

  if (!positionsByModel.length) {
    return (
      <div className={`text-sm`} style={{ color: "var(--muted-text)" }}>
        {t('暂无持仓。','No open positions.')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ErrorBanner
        message={isError ? t('上游持仓接口暂时不可用，请稍后重试。','Positions data unavailable. Please try again later.') : undefined}
      />
      <PositionsFilter
        models={positionsByModel.map((m) => m.id)}
        symbols={Array.from(
          new Set(
            positionsByModel.flatMap((m) => Object.keys(m.positions || {})),
          ),
        )}
      />
      {positionsByModel
        .filter((m) =>
          qModel === "all" ? true : m.id.toLowerCase() === qModel,
        )
        .map((m) => {
          const positionsRaw = Object.values(m.positions || {});
          type PositionWithSide = (typeof positionsRaw)[number] & {
            side: "LONG" | "SHORT";
          };
          const positions = (() => {
            const arr: PositionWithSide[] = positionsRaw.map((p) => ({
              ...p,
              side: p.quantity > 0 ? ("LONG" as const) : ("SHORT" as const),
            }));
            const dir = sortDir === "asc" ? 1 : -1;
            return arr.sort((a, b) => {
              const av = sortKey === "side" ? a.side : (a as any)[sortKey];
              const bv = sortKey === "side" ? b.side : (b as any)[sortKey];
              if (av == null && bv == null) return 0;
              if (av == null) return 1;
              if (bv == null) return -1;
              if (typeof av === "string" && typeof bv === "string")
                return av.localeCompare(bv) * dir;
              return (Number(av) - Number(bv)) * dir;
            });
          })();
          const filtered = positions
            .filter((p: any) =>
              qSymbol === "ALL" ? true : p.symbol?.toUpperCase() === qSymbol,
            )
            .filter((p: any) =>
              qSide === "ALL"
                ? true
                : (p.quantity > 0 ? "LONG" : "SHORT") === qSide,
            );
          const totalUnreal = filtered.reduce(
            (acc, p) => acc + (p.unrealized_pnl || 0),
            0,
          );
          const sumMargin = filtered.reduce(
            (acc, p) => acc + (p.margin || 0),
            0,
          );
          const sumRisk = filtered.reduce(
            (acc, p) => acc + (p.risk_usd || 0),
            0,
          );
          const avgConf = filtered.length
            ? filtered.reduce((a, p) => a + (p.confidence || 0), 0) /
              filtered.length
            : 0;

          // Extract latest totals snapshot for this model
          let equity: number | undefined;
          let realizedPnL: number | undefined;
          const list: any[] =
            totalsData && (totalsData as any).accountTotals
              ? (totalsData as any).accountTotals
              : [];
          for (let i = list.length - 1; i >= 0; i--) {
            const row = list[i];
            if (row?.model_id === m.id || row?.id === m.id) {
              equity = row.dollar_equity ?? row.equity ?? row.account_value;
              realizedPnL = row.realized_pnl;
              break;
            }
          }
          const availableCash = equity != null ? equity - sumMargin : undefined;
          const color = getModelColor(m.id);
          const brandBg = `linear-gradient(0deg, ${color}10, var(--panel-bg))`;
          const brandBorder = `${color}55`;
          return (
            <div
              key={m.id}
              className={`rounded-md border p-3`}
              style={{
                background: brandBg as any,
                borderColor: brandBorder as any,
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ModelLogoChip modelId={m.id} size="sm" />
                  <div
                    className={`ui-sans text-sm font-semibold`}
                    style={{ color: "var(--foreground)" }}
                  >
                    {m.id}
                  </div>
                </div>
                <div
                  className={`ui-sans text-[11px]`}
                  style={{ color: "var(--muted-text)" }}
                >
                  {t('未实现盈亏合计：','Total Unrealized PnL: ')}
                  <span
                    className={
                      totalUnreal >= 0 ? "text-green-400" : "text-red-400"
                    }
                  >
                    {fmtUSD(totalUnreal)}
                  </span>
                </div>
              </div>
              <div
                className={`ui-sans mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]`}
                style={{ color: "var(--muted-text)" }}
              >
                <div>
                  {t('净值：','Equity: ')}<span className="tabular-nums">{fmtUSD(equity)}</span>
                </div>
                <div>
                  {t('已实现盈亏：','Realized PnL: ')}
                  <span className="tabular-nums">{fmtUSD(realizedPnL)}</span>
                </div>
                <div>
                  {t('可用现金≈','Available: ')}
                  <span className="tabular-nums">{fmtUSD(availableCash)}</span>
                </div>
                <div>
                  {t('风险金额合计：','Risk (sum): ')}
                  <span className="tabular-nums">{fmtUSD(sumRisk)}</span>
                </div>
                <div>
                  {t('平均置信度：','Avg. Confidence: ')}
                  <span className="tabular-nums">
                    {avgConf ? (avgConf * 100).toFixed(1) + "%" : "—"}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px] terminal-text">
                  <thead
                    className={clsx("sticky top-0 z-10 ui-sans")}
                    style={{
                      background: "var(--panel-bg)",
                      color: "var(--muted-text)",
                    }}
                  >
                    <tr
                      className={clsx("border-b")}
                      style={{ borderColor: "var(--panel-border)" }}
                    >
                      <th className="py-1.5 pr-3">{t('方向','Side')}</th>
                      <th className="py-1.5 pr-3">{t('币种','Symbol')}</th>
                      <th className="py-1.5 pr-3">{t('杠杆','Lev')}</th>
                      <th className="py-1.5 pr-3">{t('名义金额','Notional')}</th>
                      <th className="py-1.5 pr-3">{t('退出计划','Exit Plan')}</th>
                      <th className="py-1.5 pr-3">{t('未实现盈亏','Unrealized PnL')}</th>
                    </tr>
                  </thead>
                  <tbody style={{ color: "var(--foreground)" }}>
                    {filtered.map((p, i) => {
                      const isLong = p.quantity > 0;
                      // 优先使用 notional_usd 字段，如果不存在则计算
                      const notional =
                        (p as any).notional_usd ??
                        Math.abs(p.quantity) * ((p as any).current_price ?? 0);
                      return (
                        <tr
                          key={i}
                          className={clsx("border-b")}
                          style={{
                            borderColor:
                              "color-mix(in oklab, var(--panel-border) 50%, transparent)",
                          }}
                        >
                          <td
                            className="py-1.5 pr-3"
                            style={{ color: isLong ? "#16a34a" : "#ef4444" }}
                          >
                            {isLong ? t('做多','LONG') : t('做空','SHORT')}
                          </td>
                          <td className="py-1.5 pr-3">
                            <span className="inline-flex items-center gap-1">
                              <CoinIcon symbol={p.symbol} size={16} />
                              <span className="ui-sans">
                                {(p as any).symbol?.toUpperCase()
                                }
                              </span>
                            </span>
                          </td>
                          <td className="py-1.5 pr-3">{(p as any).leverage}x</td>
                          <td className="py-1.5 pr-3 tabular-nums">
                            {fmtUSD(notional)}
                          </td>
                          <td className="py-1.5 pr-3">
                            <ExitPlanPeek plan={(p as any).exit_plan} />
                          </td>
                          <td
                            className={clsx(
                              "py-1.5 pr-3 tabular-nums",
                              pnlClass((p as any).unrealized_pnl),
                            )}
                          >
                            {fmtUSD((p as any).unrealized_pnl)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
    </div>
  );
}

function ExitPlanPeek({ plan }: { plan?: any }) {
  const locale = useLocale((s) => s.locale);
  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const b = btnRef.current?.getBoundingClientRect();
      if (!b) return;
      const margin = 8;
      const width = 320;
      let left = Math.min(window.innerWidth - width - margin, b.right - width);
      if (left < margin) left = Math.max(margin, b.left);
      const top = Math.max(
        margin,
        Math.min(window.innerHeight - 160, b.bottom + 6),
      );
      setPos({ top, left });
    };
    place();
    const onDoc = (e: MouseEvent) => {
      const tgt = e.target as Node;
      if (popRef.current && popRef.current.contains(tgt)) return;
      if (btnRef.current && btnRef.current.contains(tgt)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (
    !plan ||
    !(plan.profit_target || plan.stop_loss || plan.invalidation_condition)
  )
    return (<span style={{ color: "var(--muted-text)" }}>—</span>) as any;

  return (
    <>
      <button
        ref={btnRef}
        className="ui-sans rounded border px-2 py-0.5 text-[11px]"
        style={{
          borderColor: "var(--panel-border)",
          color: "var(--foreground)",
        }}
        onClick={() => setOpen((v) => !v)}
      >
        {t('查看','View')}
      </button>
      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popRef}
            className="w-80 rounded border p-2 text-[12px] shadow-xl"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
              background: "var(--panel-bg)",
              borderColor: "var(--panel-border)",
              color: "var(--foreground)",
            }}
          >
            <div className="ui-sans mb-1 font-semibold">{t('退出计划','Exit Plan')}</div>
            <div className="terminal-text text-xs leading-relaxed">
              <div>
                {t('目标价：','Target: ')}
                <span className="tabular-nums">
                  {plan.profit_target ?? "—"}
                </span>
              </div>
              <div>
                {t('止损价：','Stop: ')}
                <span className="tabular-nums">{plan.stop_loss ?? "—"}</span>
              </div>
              <div>{t('失效条件：','Invalidation:')}</div>
              <div className="whitespace-pre-wrap">
                {plan.invalidation_condition || "—"}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  ) as any;
}
