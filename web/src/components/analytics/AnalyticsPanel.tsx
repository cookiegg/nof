"use client";
import { useAnalytics } from "@/lib/api/hooks/useAnalytics";
import CoinIcon from "@/components/shared/CoinIcon";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { useTheme } from "@/store/useTheme";

export default function AnalyticsPanel() {
  const { data, isLoading, isError } = useAnalytics();
  const fee = data?.fee_pnl_moves_breakdown_table || [];
  const wl = data?.winners_losers_breakdown_table || [];
  return (
    <div className="space-y-3">
      <ErrorBanner message={isError ? "分析数据暂不可用。" : undefined} />
      <div className="ui-sans grid grid-cols-2 gap-3 text-[11px]">
        <Kpi label="胜率" value={fmtPct(data?.win_rate)} />
        <Kpi
          label="多空比"
          value={
            data?.long_short_trades_ratio != null
              ? data?.long_short_trades_ratio.toFixed(2)
              : "—"
          }
        />
        <Kpi label="平均置信度" value={fmtPct(data?.avg_confidence)} />
        <Kpi label="中位置信度" value={fmtPct(data?.median_confidence)} />
      </div>
      <Block title="费用/盈亏分解">
        <MiniTable rows={fee} />
      </Block>
      <Block title="赢家/输家分布">
        <MiniTable rows={wl} />
      </Block>
      {isLoading ? (
        <div className="text-xs" style={{ color: "var(--muted-text)" }}>
          加载中…
        </div>
      ) : null}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value?: string }) {
  return (
    <div
      className={`rounded-md border p-3`}
      style={{
        background: "var(--panel-bg)",
        borderColor: "var(--panel-border)",
      }}
    >
      <div className="ui-sans" style={{ color: "var(--muted-text)" }}>
        {label}
      </div>
      <div className={`mt-1 text-sm`} style={{ color: "var(--foreground)" }}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-md border`}
      style={{ borderColor: "var(--panel-border)" }}
    >
      <div
        className={`ui-sans border-b px-3 py-2 text-xs`}
        style={{
          borderColor: "var(--panel-border)",
          color: "var(--muted-text)",
        }}
      >
        {title}
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

function MiniTable({ rows }: { rows: any[] }) {
  if (!rows?.length)
    return (
      <div className="text-xs" style={{ color: "var(--muted-text)" }}>
        暂无数据
      </div>
    );
  const cols = Object.keys(rows[0] || {});
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[11px]">
        <thead className="ui-sans" style={{ color: "var(--muted-text)" }}>
          <tr
            className={`border-b`}
            style={{ borderColor: "var(--panel-border)" }}
          >
            {cols.map((c) => (
              <th key={c} className="py-1.5 pr-3">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody style={{ color: "var(--foreground)" }}>
          {rows.slice(0, 20).map((r, idx) => (
            <tr
              key={idx}
              className={`border-b`}
              style={{
                borderColor:
                  "color-mix(in oklab, var(--panel-border) 50%, transparent)",
              }}
            >
              {cols.map((c) => {
                const v = r[c];
                const isCoin = /^(coin|symbol)$/i.test(c);
                return (
                  <td key={c} className="py-1.5 pr-3">
                    {isCoin ? (
                      <span className="inline-flex items-center gap-1">
                        <CoinIcon symbol={String(v || "")} size={16} />
                        <span className="ui-sans">{String(v || "")}</span>
                      </span>
                    ) : (
                      fmtAny(v)
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmtPct(n?: number) {
  if (n == null) return "—";
  return (n * 100).toFixed(1) + "%";
}
function fmtAny(v: any) {
  if (v == null) return "—";
  if (typeof v === "number") return String(Math.round(v * 1000) / 1000);
  return String(v);
}
