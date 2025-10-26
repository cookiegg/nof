"use client";
import useSWR from "swr";
import { endpoints, fetcher } from "../nof1";
import type { RawPositionRow } from "./usePositions";

export interface AccountTotalsRow {
  model_id: string;
  timestamp: number; // unix seconds
  equity?: number;
  dollar_equity?: number;
  account_value?: number;
  realized_pnl?: number;
  unrealized_pnl?: number;
  return_pct?: number;
  positions?: Record<string, RawPositionRow>;
}

type AccountTotalsResponse = { accountTotals: AccountTotalsRow[] };

export function useAccountTotals(lastHourlyMarker?: number) {
  const { data, error, isLoading } = useSWR<AccountTotalsResponse>(
    endpoints.accountTotals(lastHourlyMarker),
    fetcher,
    {
      refreshInterval: 10000, // Reduced from 5s to 10s to minimize Fast Origin Transfer costs
      dedupingInterval: 2000,
    },
  );

  return {
    data,
    isLoading,
    isError: !!error,
  };
}
