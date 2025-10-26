"use client";
import useSWR from "swr";
import { endpoints, fetcher } from "../nof1";

type Row = {
  model_id: string;
  timestamp: number;
  equity?: number | null;
  dollar_equity?: number | null;
  account_value?: number | null;
};

type Resp = { accountTotals: Row[] };

export function useLatestEquityMap() {
  const { data, error, isLoading } = useSWR<Resp>(
    endpoints.accountTotals(),
    fetcher,
    {
      refreshInterval: 10000,
    },
  );
  const map: Record<string, number> = {};
  const rows = data?.accountTotals ?? [];
  // 取每个模型最新一条记录的 dollar_equity（回退 account_value/equity）
  const latest = new Map<string, Row>();
  for (const r of rows) {
    const id = String((r as any).model_id ?? (r as any).id ?? "");
    if (!id) continue;
    const ts = Number((r as any).timestamp ?? 0);
    const prev = latest.get(id);
    if (!prev || Number((prev as any).timestamp ?? 0) <= ts) latest.set(id, r);
  }
  for (const [id, r] of latest) {
    const eq = (r.dollar_equity ?? r.account_value ?? r.equity ?? 0) as number;
    map[id] = Number(eq) || 0;
  }
  return { map, isLoading, isError: !!error };
}
