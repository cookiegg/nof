"use client";
import useSWR from "swr";
import { endpoints, fetcher } from "../nof1";

export interface AnalyticsRow {
  id: string;
  model_id?: string;
  fee_pnl_moves_breakdown_table?: {
    total_fees_paid?: number;
    biggest_net_gain?: number;
    biggest_net_loss?: number;
    overall_pnl_with_fees?: number;
    overall_pnl_without_fees?: number;
  };
  winners_losers_breakdown_table?: {
    win_rate?: number; // 0-1
    avg_winners_holding_period?: number; // minutes
    avg_losers_holding_period?: number; // minutes
  };
  signals_breakdown_table?: {
    avg_confidence?: number; // 0-1
    median_confidence?: number; // 0-1
  };
}

type AnalyticsResponse = { analytics: AnalyticsRow[] };

export function useAnalyticsMap() {
  const { data, error, isLoading } = useSWR<AnalyticsResponse>(
    endpoints.analytics(),
    fetcher,
    { refreshInterval: 15000 },
  );
  const map: Record<string, AnalyticsRow> = {};
  for (const r of data?.analytics ?? []) {
    const id = String(r.id || r.model_id || "");
    if (!id) continue;
    map[id] = r;
  }
  return { map, isLoading, isError: !!error };
}
