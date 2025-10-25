"use client";
import useSWR from "swr";
import { endpoints, fetcher } from "../nof1";
import type { AccountTotalsRow } from "./useAccountTotals";

export interface RawPositionRow {
  entry_oid: number;
  risk_usd: number;
  confidence: number;
  exit_plan: ExitPlan;
  entry_time: number; // unix seconds
  symbol: string;
  entry_price: number;
  margin: number;
  leverage: number;
  quantity: number; // positive long, negative short
  current_price: number;
  unrealized_pnl: number;
  closed_pnl?: number;
}

export interface ExitPlan {
  profit_target?: number;
  stop_loss?: number;
  invalidation_condition?: string;
}

export interface PositionsByModel {
  id: string; // model id
  positions: Record<string, RawPositionRow>;
}

export function usePositions() {
  const { data, error, isLoading } = useSWR<{
    accountTotals: AccountTotalsRow[];
  }>(endpoints.accountTotals(), fetcher, {
    refreshInterval: 5000,
    dedupingInterval: 2000,
  });

  const positionsByModel: PositionsByModel[] = (() => {
    const rows = data?.accountTotals ?? [];
    const latestById = new Map<
      string,
      AccountTotalsRow & { positions?: Record<string, RawPositionRow> }
    >();
    for (const row of rows) {
      const id = String((row as any).model_id ?? (row as any).id ?? "");
      if (!id) continue;
      const ts = Number((row as any).timestamp ?? 0);
      const prev = latestById.get(id);
      if (!prev || Number((prev as any).timestamp ?? 0) <= ts)
        latestById.set(id, row as any);
    }
    return Array.from(latestById.entries()).map(([id, row]) => ({
      id,
      positions: (row as any).positions ?? {},
    }));
  })();

  return { positionsByModel, isLoading, isError: !!error };
}
