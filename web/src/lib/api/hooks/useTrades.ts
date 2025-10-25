"use client";
import useSWR from "swr";
import { endpoints, fetcher } from "../nof1";

export interface TradeRow {
  id: string;
  symbol: string;
  model_id: string;
  side: "long" | "short";
  entry_price: number;
  exit_price: number;
  quantity: number;
  leverage: number;
  entry_time: number; // unix seconds
  exit_time: number; // unix seconds
  entry_human_time?: string;
  exit_human_time?: string;
  realized_net_pnl: number;
  realized_gross_pnl: number;
  total_commission_dollars: number;
}

type TradesResponse = { trades: TradeRow[] };

export function useTrades() {
  const { data, error, isLoading } = useSWR<TradesResponse>(
    endpoints.trades(),
    fetcher,
    {
      refreshInterval: 10000,
    },
  );

  return {
    trades: data?.trades ?? [],
    isLoading,
    isError: !!error,
  };
}
