"use client";
import useSWR from "swr";
import { endpoints, fetcher } from "../nof1";

type PriceEntry = { symbol: string; price: number; timestamp: number };
type PricesResponse = {
  prices: Record<string, PriceEntry>;
  serverTime: number;
};

export function useCryptoPrices() {
  const { data, error, isLoading } = useSWR<PricesResponse>(
    endpoints.cryptoPrices(),
    fetcher,
    {
      refreshInterval: 2000,
      revalidateOnFocus: true,
    },
  );

  return {
    prices: data?.prices ?? {},
    serverTime: data?.serverTime,
    isLoading,
    isError: !!error,
  };
}
