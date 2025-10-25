"use client";
import useSWR from "swr";
import { endpoints, fetcher } from "../nof1";

export interface SinceInceptionRow {
  id: string;
  nav_since_inception: number;
  inception_date: number; // unix seconds
  num_invocations: number;
  model_id: string;
}

export interface SinceInceptionResponse {
  serverTime: number;
  sinceInceptionValues: SinceInceptionRow[];
}

export function useSinceInception() {
  const { data, error, isLoading } = useSWR<SinceInceptionResponse>(
    endpoints.sinceInceptionValues(),
    fetcher,
    { refreshInterval: 10000 },
  );
  return {
    data,
    rows: data?.sinceInceptionValues ?? [],
    serverTime: data?.serverTime,
    isLoading,
    isError: !!error,
  };
}
