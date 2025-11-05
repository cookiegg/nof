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
  notional_usd?: number; // 名义金额，如果存在则优先使用
}

export interface ExitPlan {
  profit_target?: number;
  stop_loss?: number;
  invalidation_condition?: string;
}

export interface PositionsByModel {
  id: string; // bot_id
  positions: Record<string, RawPositionRow>;
}

export function usePositions() {
  const { data, error, isLoading } = useSWR<{
    accountTotals: AccountTotalsRow[];
  }>(endpoints.accountTotals(), fetcher, {
    refreshInterval: 3000, // Reduced from 5s to 10s to minimize Fast Origin Transfer costs
    dedupingInterval: 2000,
  });

  const positionsByModel: PositionsByModel[] = (() => {
    const rows = data?.accountTotals ?? [];
    const latestById = new Map<
      string,
      AccountTotalsRow & { positions?: Record<string, RawPositionRow> }
    >();
    for (const row of rows) {
      // 统一使用 bot_id 作为聚合键
      const botId = String((row as any).bot_id ?? (row as any).model_id ?? (row as any).id ?? "");
      if (!botId) continue;
      const ts = Number((row as any).timestamp ?? 0);
      const prev = latestById.get(botId);
      if (!prev || Number((prev as any).timestamp ?? 0) <= ts)
        latestById.set(botId, row as any);
    }
    return Array.from(latestById.entries()).map(([id, row]) => ({
      id,
      positions: (row as any).positions ?? {},
    }));
  })();

  return { positionsByModel, isLoading, isError: !!error };
}
