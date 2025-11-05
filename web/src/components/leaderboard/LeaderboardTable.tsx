"use client";
import { useState, useMemo } from "react";
import { useLeaderboard, LeaderboardRow } from "@/lib/api/hooks/useLeaderboard";
import { useAnalyticsMap } from "@/lib/api/hooks/useAnalyticsMap";
import { useLatestEquityMap } from "@/lib/api/hooks/useModelSnapshots";
import { useTradesCountMap } from "@/lib/api/hooks/useTradesCount";
import { useSharpeMap } from "@/lib/api/hooks/useSharpeMap";
import Tooltip from "@/components/ui/Tooltip";
import { getModelName } from "@/lib/model/meta";
import { ModelLogoChip } from "@/components/shared/ModelLogo";
import { fmtUSD, pnlClass, fmtPct } from "@/lib/utils/formatters";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { SkeletonTableRow } from "@/components/ui/Skeleton";
import clsx from "clsx";
import { useLocale } from "@/store/useLocale";

type SortKey =
  | "equity"
  | "return_pct"
  | "num_trades"
  | "sharpe"
  | "win_rate"
  | "win_dollars"
  | "lose_dollars"
  | "total_pnl";

export default function LeaderboardTable({
  mode = "overall",
}: {
  mode?: "overall" | "advanced";
}) {
  const { rows, isLoading, isError } = useLeaderboard();
  const { map: analytics } = useAnalyticsMap();
  const { map: equityMap } = useLatestEquityMap();
  const { map: tradeCount } = useTradesCountMap();
  const { map: sharpeMap, stats: sharpeStats } = useSharpeMap();
  const [sortKey, setSortKey] = useState<SortKey>("equity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { locale } = useLocale();
  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);

  const data = useMemo(() => {
    // 预计算派生指标 + 关联 analytics 字段
    const arr = rows.map((r) =>
      withDerived(
        r,
        analytics[r.id],
        equityMap[r.id],
        tradeCount[r.id],
        sharpeMap[r.id],
      ),
    );
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a: any, b: any) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return (Number(av) - Number(bv)) * dir;
    });
    return arr;
  }, [rows, analytics, sortKey, sortDir]);

  return (
    <div
      className={`rounded-md border px-3 py-2 sm:px-3 sm:py-3`}
      style={{
        background: "var(--panel-bg)",
        borderColor: "var(--panel-border)",
      }}
    >
      <div className="mb-2">
        <h2 className={`ui-sans text-sm font-semibold`} style={{ color: "var(--foreground)" }}>
          {t("排行榜", "Leaderboard")}
        </h2>
      </div>
      <ErrorBanner
        message={isError ? t("排行榜数据源暂时不可用，请稍后重试。", "Leaderboard data source temporarily unavailable, please try again later.") : undefined}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="ui-sans" style={{ color: "var(--muted-text)" }}>
            <tr
              className={`border-b`}
              style={{ borderColor: "var(--panel-border)" }}
            >
              <Th label="#" />
              <Th label={t("Bot", "Bot")} />
              <ThSort
                label={t("净值", "Equity")}
                active={sortKey === "equity"}
                dir={sortDir}
                onClick={() => toggleSort("equity")}
              />
              <ThSort
                label={t("收益率", "Return %")}
                active={sortKey === "return_pct"}
                dir={sortDir}
                onClick={() => toggleSort("return_pct")}
              />
              {mode === "advanced" ? (
                <>
                  <ThSort
                    label={t("总盈亏", "Total P&L")}
                    active={sortKey === "total_pnl"}
                    dir={sortDir}
                    onClick={() => toggleSort("total_pnl")}
                  />
                  <Th label={t("费用", "Fees")} />
                  <ThSort
                    label={t("胜率", "Win Rate")}
                    active={sortKey === "win_rate"}
                    dir={sortDir}
                    onClick={() => toggleSort("win_rate")}
                  />
                  <ThSort
                    label={t("最大盈利", "Max Gain")}
                    active={sortKey === "win_dollars"}
                    dir={sortDir}
                    onClick={() => toggleSort("win_dollars")}
                  />
                  <ThSort
                    label={t("最大亏损", "Max Loss")}
                    active={sortKey === "lose_dollars"}
                    dir={sortDir}
                    onClick={() => toggleSort("lose_dollars")}
                  />
                  <Th label={t("平均置信度", "Avg Confidence")} />
                  <Th label={t("中位置信度", "Median Confidence")} />
                </>
              ) : null}
              <ThSort
                label={t("交易数", "Trades")}
                active={sortKey === "num_trades"}
                dir={sortDir}
                onClick={() => toggleSort("num_trades")}
              />
              <ThSort
                label={t("夏普", "Sharpe")}
                active={sortKey === "sharpe"}
                dir={sortDir}
                onClick={() => toggleSort("sharpe")}
              />
            </tr>
          </thead>
          <tbody style={{ color: "var(--foreground)" }}>
            {isLoading ? (
              <>
                <SkeletonTableRow cols={6} />
                <SkeletonTableRow cols={6} />
                <SkeletonTableRow cols={6} />
              </>
            ) : (
              data.map(
                (
                  r: LeaderboardRow & ReturnType<typeof withDerived>,
                  idx: number,
                ) => (
                  <tr
                    key={r.id}
                  className={clsx("border-b")}
                  style={{
                    borderColor:
                      "color-mix(in oklab, var(--panel-border) 50%, transparent)",
                  }}
                  >
                    <td className="py-1 pr-2 lg:pr-3">{idx + 1}</td>
                    <td className="py-1 pr-2 lg:pr-3">
                      <span className="inline-flex items-center gap-2 ui-sans" style={{ color: "inherit" }}>
                        <span className="font-medium" style={{ wordBreak: "break-all" }}>{r.id}</span>
                      </span>
                    </td>
                    <td className="py-1 pr-2 lg:pr-3 tabular-nums">
                      {fmtUSD(r.equity)}
                    </td>
                    <td
                      className={clsx(
                        "py-1 pr-2 lg:pr-3 tabular-nums",
                        pnlClass(r.return_pct),
                      )}
                    >
                      {renderReturnPct(r.return_pct)}
                    </td>
                    {mode === "advanced" ? (
                      <>
                        <td
                          className={clsx(
                            "py-1 pr-2 lg:pr-3 tabular-nums",
                            pnlClass(r.total_pnl),
                          )}
                          >
                          {renderTotalPnl(r.total_pnl)}
                        </td>
                        <td className="py-1 pr-2 lg:pr-3 tabular-nums">
                          {renderFees(r.id, r.total_fees_paid)}
                        </td>
                        <td className="py-1 pr-2 lg:pr-3 tabular-nums">
                          {renderWinRate(r.id, r.win_rate, r.num_trades)}
                        </td>
                        <td
                          className={clsx(
                            "py-1 pr-2 lg:pr-3 tabular-nums",
                            pnlClass(r.win_dollars),
                          )}
                        >
                          {renderExtreme(true, r.win_dollars)}
                        </td>
                        <td
                          className={clsx(
                            "py-1 pr-2 lg:pr-3 tabular-nums",
                            pnlClass(r.lose_dollars),
                          )}
                        >
                          {renderExtreme(false, r.lose_dollars)}
                        </td>
                        <td className="py-1 pr-2 lg:pr-3 tabular-nums">
                          {r.avg_confidence != null
                            ? `${(r.avg_confidence * 100).toFixed(1)}%`
                            : "—"}
                        </td>
                        <td className="py-1 pr-2 lg:pr-3 tabular-nums">
                          {r.median_confidence != null
                            ? `${(r.median_confidence * 100).toFixed(1)}%`
                            : "—"}
                        </td>
                      </>
                    ) : null}
                    <td className="py-1 pr-2 lg:pr-3 tabular-nums">
                      {r.num_trades ?? "—"}
                    </td>
                    <td className="py-1 pr-2 lg:pr-3 tabular-nums">
                      {renderSharpe(r.id, r.sharpe)}
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  function toggleSort(k: SortKey) {
    setSortDir((d) => (sortKey === k ? (d === "asc" ? "desc" : "asc") : d));
    setSortKey(k);
  }

  function renderSharpe(id: string, value?: number) {
    const n = sharpeStats?.[id]?.n ?? 0;
    const mean = sharpeStats?.[id]?.mean ?? 0;
    const std = sharpeStats?.[id]?.std ?? 0;
    const s = value != null ? value : sharpeStats?.[id]?.sharpe;
    const content = (
      <div className="space-y-1">
        <div>{t("Sharpe：", "Sharpe:")}{s != null ? s.toFixed(3) : "—"}</div>
        <div>{t("样本天数：", "Sample Days:")}{n} {t("天", "days")}</div>
        <div>{t("超额日收益", "Excess Daily Return")}</div>
        <div className="pl-3">{t("均值：", "Mean:")}{fmtPct(mean)}</div>
        <div className="pl-3">{t("标准差：", "Std Dev:")}{fmtPct(std)}</div>
        <div className="opacity-80">{getSharpeHint(locale)}</div>
      </div>
    );
    const muted = n < 3;
    return (
      <Tooltip content={content}>
        <span
          className={clsx(muted ? "text-zinc-400" : undefined)}
          style={{ cursor: "help" }}
        >
          {s != null ? s.toFixed(3) : "—"}
        </span>
      </Tooltip>
    );
  }

  function renderFees(id: string, fees?: number) {
    const a = (analytics as any)?.[id];
    const avg = a?.fee_pnl_moves_breakdown_table?.avg_taker_fee;
    const content = (
      <div className="space-y-1">
        <div>{t("费用（USD）：", "Fees (USD):")}{fees != null ? fmtUSD(fees) : "—"}</div>
        {avg != null ? <div>{t("平均单笔费：", "Avg Fee per Trade:")}{fmtUSD(avg)}</div> : null}
        <div className="opacity-80">
          {t("口径：已完成交易的成交手续费总额（含进/出场 taker 费）。", "Scope: Total trading fees for completed trades (including entry/exit taker fees).")}
        </div>
      </div>
    );
    return (
      <Tooltip content={content}>
        <span style={{ cursor: "help" }}>
          {fees != null ? fmtUSD(fees) : "—"}
        </span>
      </Tooltip>
    );
  }

  function renderWinRate(id: string, rate?: number, trades?: number) {
    const a = (analytics as any)?.[id];
    const wr = rate;
    const content = (
      <div className="space-y-1">
        <div>{t("胜率：", "Win Rate:")}{wr != null ? `${wr.toFixed(1)}%` : "—"}</div>
        <div>{t("交易数：", "Trades:")}{trades ?? "—"}</div>
        <div className="opacity-80">
          {t("口径：仅统计已完成交易，胜率=胜场数/（胜+负）；未平仓不计入。", "Scope: Only completed trades counted. Win rate = wins / (wins + losses); open positions excluded.")}
        </div>
      </div>
    );
    return (
      <Tooltip content={content}>
        <span style={{ cursor: "help" }}>
          {wr != null ? `${wr.toFixed(1)}%` : "—"}
        </span>
      </Tooltip>
    );
  }

  function renderReturnPct(val?: number) {
    const content = (
      <div className="space-y-1">
        <div>{t("收益率：", "Return %:")}{val != null ? `${val.toFixed(2)}%` : "—"}</div>
        <div className="opacity-80">
          {t("口径：基于账户总权益（含未平仓），相对各 bot 启动时的初始资本；公式：(Equity/Base - 1)。", "Scope: Based on total equity (incl. unrealized), relative to each bot's initial capital; Formula: (Equity/Base - 1).")}
        </div>
      </div>
    );
    return (
      <Tooltip content={content}>
        <span style={{ cursor: "help" }}>
          {val != null ? `${val.toFixed(2)}%` : "—"}
        </span>
      </Tooltip>
    );
  }

  function renderTotalPnl(val?: number) {
    const content = (
      <div className="space-y-1">
        <div>{t("总盈亏：", "Total P&L:")}{val != null ? fmtUSD(val) : "—"}</div>
        <div className="opacity-80">
          {t("口径：基于账户总权益（包含未平仓盈亏），相对初始资本 $10,000；公式：Equity − Base。", "Scope: Based on total equity (including unrealized P&L), relative to initial capital $10,000; Formula: Equity − Base.")}
        </div>
      </div>
    );
    return (
      <Tooltip content={content}>
        <span style={{ cursor: "help" }}>
          {val != null ? fmtUSD(val) : "—"}
        </span>
      </Tooltip>
    );
  }

  function renderExtreme(isWin: boolean, val?: number) {
    const label = isWin ? t("最大盈利", "Max Gain") : t("最大亏损", "Max Loss");
    const content = (
      <div className="space-y-1">
        <div>
          {label}{t("：", ":")}{val != null ? fmtUSD(val) : "—"}
        </div>
        <div className="opacity-80">
          {t("口径：单笔净盈亏（含手续费），仅统计已完成交易。", "Scope: Single trade net P&L (including fees), only completed trades counted.")}
        </div>
      </div>
    );
    return (
      <Tooltip content={content}>
        <span style={{ cursor: "help" }}>
          {val != null ? fmtUSD(val) : "—"}
        </span>
      </Tooltip>
    );
  }
}

// 初始资金不再硬编码；由后端提供 per-bot 的初始资本用于计算
function withDerived(
  r: LeaderboardRow,
  a?: any,
  latestEquity?: number,
  trades?: number,
  sharpe?: number,
) {
  const winRate = a?.winners_losers_breakdown_table?.win_rate as
    | number
    | undefined;
  // 从收益率与净值反推总盈亏，避免对初始资金的硬编码
  // 采用最新快照的 dollar_equity 计算净值/收益率/总盈亏
  const equity = latestEquity ?? undefined;
  // 由后端填充 r.total_pnl / r.return_pct 更为准确；这里仅回退显示净值
  const totalPnl = r.total_pnl ?? undefined;
  const returnPct = r.return_pct ?? undefined;
  return {
    ...r,
    equity: equity ?? r.equity,
    return_pct: returnPct ?? r.return_pct,
    win_rate: winRate,
    total_pnl: totalPnl,
    total_fees_paid: a?.fee_pnl_moves_breakdown_table?.total_fees_paid,
    avg_confidence: a?.signals_breakdown_table?.avg_confidence,
    median_confidence: a?.signals_breakdown_table?.median_confidence,
    win_dollars: a?.fee_pnl_moves_breakdown_table?.biggest_net_gain,
    lose_dollars: a?.fee_pnl_moves_breakdown_table?.biggest_net_loss,
    num_trades: trades ?? r.num_trades,
    sharpe: sharpe ?? r.sharpe,
  } as LeaderboardRow & { win_rate?: number; total_pnl?: number };
}

function Th({ label }: { label: string }) {
  return <th className="py-1.5 pr-3 text-xs">{label}</th>;
}

function getSharpeHint(locale: "zh" | "en") {
  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);
  return t("口径：基于已完成交易的日度超额收益（基准：BTC Buy&Hold），未年化，10%温莎化。", "Scope: Based on daily excess returns of completed trades (benchmark: BTC Buy&Hold), not annualized, 10% Winsorized.");
}

function ThSort({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th className="py-1.5 pr-3 text-xs">
      <button
        className={clsx("flex items-center gap-1")}
        style={{ color: active ? "var(--foreground)" : "var(--muted-text)" }}
        onClick={onClick}
      >
        {label}
        {active ? (
          <span className="text-[10px]">{dir === "asc" ? "▲" : "▼"}</span>
        ) : null}
      </button>
    </th>
  );
}
