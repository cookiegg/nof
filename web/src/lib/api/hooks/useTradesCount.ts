"use client";
import useSWR from "swr";
import { endpoints, fetcher } from "../nof1";

type Trade = { model_id: string };
type Resp = { trades: Trade[] };

export function useTradesCountMap() {
  const { data, error, isLoading } = useSWR<Resp>(
    endpoints.trades?.() ?? "/api/nof1/trades",
    fetcher,
    {
      refreshInterval: 15000,
    },
  );
  const map: Record<string, number> = {};
  for (const t of data?.trades ?? []) {
    const id = (t as any).model_id;
    if (!id) continue;
    map[id] = (map[id] || 0) + 1;
  }
  return { map, isLoading, isError: !!error };
}
