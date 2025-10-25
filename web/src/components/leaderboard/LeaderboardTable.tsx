"use client";
import { useState, useMemo } from "react";
import { useLeaderboard, LeaderboardRow } from "@/lib/api/hooks/useLeaderboard";
import { getModelName, getModelMeta } from "@/lib/model/meta";
import { fmtUSD, pnlClass } from "@/lib/utils/formatters";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { useTheme } from "@/store/useTheme";
import { SkeletonRow } from "@/components/ui/Skeleton";
import clsx from "clsx";

type SortKey = "equity" | "return_pct" | "num_trades" | "sharpe";

export default function LeaderboardTable() {
  // remove theme branching; rely on CSS variables
  const { rows, isLoading, isError } = useLeaderboard();
  const [sortKey, setSortKey] = useState<SortKey>("equity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const data = useMemo(() => {
    const arr = [...rows];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a: any, b: any) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return (Number(av) - Number(bv)) * dir;
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  return (
    <div className={`rounded-md border p-3`} style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className={`text-sm font-semibold`} style={{ color: 'var(--foreground)' }}>排行榜</h2>
      </div>
      <ErrorBanner message={isError ? "排行榜数据源暂时不可用，请稍后重试。" : undefined} />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead style={{ color: 'var(--muted-text)' }}>
            <tr className={`border-b`} style={{ borderColor: 'var(--panel-border)' }}>
              <Th label="#" />
              <Th label="模型" />
              <ThSort label="净值" active={sortKey === "equity"} dir={sortDir} onClick={() => toggleSort("equity")} />
              <ThSort label="收益率" active={sortKey === "return_pct"} dir={sortDir} onClick={() => toggleSort("return_pct")} />
              <ThSort label="交易数" active={sortKey === "num_trades"} dir={sortDir} onClick={() => toggleSort("num_trades")} />
              <ThSort label="夏普" active={sortKey === "sharpe"} dir={sortDir} onClick={() => toggleSort("sharpe")} />
            </tr>
          </thead>
          <tbody style={{ color: 'var(--foreground)' }}>
            {isLoading ? (
              <>
                <SkeletonRow cols={6} />
                <SkeletonRow cols={6} />
                <SkeletonRow cols={6} />
              </>
            ) : (
              data.map((r: LeaderboardRow, idx: number) => (
                <tr key={r.id} className={clsx("border-b")}
                    style={{ borderColor: 'color-mix(in oklab, var(--panel-border) 50%, transparent)', background: idx===0? 'var(--table-row-alt)' : undefined }}> 
                  <td className="py-1.5 pr-3">{idx + 1}</td>
                  <td className="py-1.5 pr-3">
                    <a className={`inline-flex items-center gap-2 hover:underline`} style={{ color: 'inherit' }}
                       onMouseOver={(e)=>{ (e.currentTarget as HTMLElement).style.color = 'var(--link-hover)'; }}
                       onMouseOut={(e)=>{ (e.currentTarget as HTMLElement).style.color = ''; }}
                       href={`/?tab=chat&model=${encodeURIComponent(r.id)}`}>
                      {getModelMeta(r.id).icon ? (
                        <img src={getModelMeta(r.id).icon} alt="" className="h-4 w-4 rounded-sm object-contain" />
                      ) : null}
                      {getModelName(r.id)}
                    </a>
                  </td>
                  <td className="py-1.5 pr-3 tabular-nums">{fmtUSD(r.equity)}</td>
                  <td className={clsx("py-1.5 pr-3 tabular-nums", pnlClass(r.return_pct))}>{r.return_pct != null ? `${r.return_pct.toFixed(2)}%` : "—"}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{r.num_trades ?? "—"}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{r.sharpe != null ? r.sharpe.toFixed(2) : "—"}</td>
                </tr>
              ))
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
}

function Th({ label }: { label: string }) {
  return <th className="py-1.5 pr-3 text-xs">{label}</th>;
}

function ThSort({ label, active, dir, onClick }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void }) {
  return (
    <th className="py-1.5 pr-3 text-xs">
      <button className={clsx("flex items-center gap-1")} style={{ color: active ? 'var(--foreground)' : 'var(--muted-text)' }} onClick={onClick}>
        {label}
        {active ? <span className="text-[10px]">{dir === "asc" ? "▲" : "▼"}</span> : null}
      </button>
    </th>
  );
}
