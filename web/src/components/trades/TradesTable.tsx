"use client";
import { useMemo, useState } from "react";
import { useTrades } from "@/lib/api/hooks/useTrades";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { fmtUSD, pnlClass } from "@/lib/utils/formatters";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { useTheme } from "@/store/useTheme";

type SortKey = "exit_time" | "realized_net_pnl" | "leverage";

export default function TradesTable() {
  // no theme branching: use CSS variables in styles
  const { trades, isLoading, isError } = useTrades();
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const qModel = (search.get("model") || "ALL").toLowerCase();
  const qSymbol = (search.get("symbol") || "ALL").toUpperCase();
  const qSide = (search.get("side") || "ALL").toUpperCase();
  const page = Number(search.get("page") || 1);
  const pageSize = 20;

  const [sortKey, setSortKey] = useState<SortKey>("exit_time");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const arr = trades
      .filter((t) => (qModel === "all" ? true : t.model_id?.toLowerCase() === qModel))
      .filter((t) => (qSymbol === "ALL" ? true : t.symbol?.toUpperCase() === qSymbol))
      .filter((t) => (qSide === "ALL" ? true : t.side?.toUpperCase() === qSide));
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a: any, b: any) => (Number(a[sortKey]) - Number(b[sortKey])) * dir);
    return arr;
  }, [trades, qModel, qSymbol, qSide, sortKey, sortDir]);

  const start = (page - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  return (
    <div className={`rounded-md border p-3`} style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
      <div className="mb-2 flex items-center justify-between">
        <div className={`text-sm font-semibold`} style={{ color: 'var(--foreground)' }}>成交记录</div>
        <div className={`flex items-center gap-2 text-[11px]`} style={{ color: 'var(--muted-text)' }}>
          <button className={`rounded border px-2 py-0.5`} style={{ borderColor: 'var(--panel-border)' }} disabled={page <= 1} onClick={() => setPage(page - 1)}>
            上一页
          </button>
          <span className="tabular-nums">{page}/{totalPages}</span>
          <button className={`rounded border px-2 py-0.5`} style={{ borderColor: 'var(--panel-border)' }} disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            下一页
          </button>
        </div>
      </div>
      <ErrorBanner message={isError ? "成交记录数据源暂时不可用，请稍后重试。" : undefined} />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px]">
          <thead style={{ color: 'var(--muted-text)' }}>
            <tr className={`border-b`} style={{ borderColor: 'var(--panel-border)' }}>
              <Th label="时间" k="exit_time" />
              <Th label="模型" />
              <Th label="币种" />
              <Th label="方向" />
              <Th label="杠杆" k="leverage" />
              <Th label="净盈亏" k="realized_net_pnl" />
            </tr>
          </thead>
          <tbody style={{ color: 'var(--foreground)' }}>
            {isLoading ? (
              <>
                <SkeletonRow cols={6} />
                <SkeletonRow cols={6} />
                <SkeletonRow cols={6} />
              </>
            ) : pageRows.length ? (
              pageRows.map((t: any, idx: number) => (
                <tr key={t.id} className={`border-b`} style={{ borderColor: 'color-mix(in oklab, var(--panel-border) 50%, transparent)' }}>
                  <td className="py-1.5 pr-3 tabular-nums">{fmtTime(t.exit_time || t.entry_time)}</td>
                  <td className="py-1.5 pr-3">{t.model_id}</td>
                  <td className="py-1.5 pr-3">{t.symbol}</td>
                  <td className="py-1.5 pr-3">{t.side?.toUpperCase()}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{t.leverage}x</td>
                  <td className={`py-1.5 pr-3 tabular-nums ${pnlClass(t.realized_net_pnl)}`}>{fmtUSD(t.realized_net_pnl)}</td>
                </tr>
              ))
            ) : (
              <tr><td className={`p-3 text-xs`} style={{ color: 'var(--muted-text)' }} colSpan={6}>暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  function setPage(p: number) {
    const params = new URLSearchParams(search.toString());
    params.set("page", String(p));
    router.replace(`${pathname}?${params.toString()}`);
  }
}

function Th({ label, k }: { label: string; k?: SortKey }) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  if (!k) return <th className="py-1.5 pr-3">{label}</th>;
  const active = sortKey === k;
  return (
    <th className="py-1.5 pr-3">
      <button
        className={`flex items-center gap-1`}
        style={{ color: active ? 'var(--foreground)' : 'var(--muted-text)' }}
        onClick={() => {
          setSortDir((d) => (active ? (d === "asc" ? "desc" : "asc") : d));
          setSortKey(k);
        }}
      >
        {label}
        {active ? <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span> : null}
      </button>
    </th>
  );
}

function fmtTime(sec?: number) {
  if (!sec) return "--";
  const d = new Date((sec > 1e12 ? sec : sec * 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
