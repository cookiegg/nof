"use client";
import useSWR from "swr";
import { endpoints, fetcher } from "../nof1";

export interface LeaderboardRow {
  id: string; // model_id
  equity: number;
  return_pct?: number;
  num_trades?: number;
  num_wins?: number;
  num_losses?: number;
  sharpe?: number;
  [k: string]: any;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardRow[];
}

export function useLeaderboard() {
  const { data, error, isLoading } = useSWR<LeaderboardResponse>(
    endpoints.leaderboard?.() ?? "/api/nof1/leaderboard",
    fetcher,
    { refreshInterval: 15000 },
  );
  return { rows: data?.leaderboard ?? [], isLoading, isError: !!error };
}
