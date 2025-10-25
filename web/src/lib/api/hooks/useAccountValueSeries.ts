"use client";
import useSWR from "swr";
import { useEffect, useMemo, useRef, useState } from "react";
import { endpoints, fetcher } from "../nof1";
import { useChartStore } from "@/store/useChartStore";

export interface SeriesPoint {
  timestamp: number; // ms epoch
  [modelId: string]: number | undefined;
}

interface AccountTotalsItem {
  model_id: string;
  timestamp: number; // seconds
  dollar_equity?: number;
  equity?: number;
  account_value?: number;
  since_inception_hourly_marker?: number;
}

function toMs(t: number) {
  return t > 1e12 ? Math.floor(t) : Math.floor(t * 1000);
}

function ingestTotals(
  map: Map<number, SeriesPoint>,
  items: AccountTotalsItem[],
) {
  for (const it of items) {
    if (!it?.model_id || typeof it.timestamp !== "number") continue;
    const ts = toMs(it.timestamp);
    const v = it.dollar_equity ?? it.equity ?? it.account_value;
    if (typeof v !== "number") continue;
    const p = map.get(ts) || { timestamp: ts };
    p[it.model_id] = v;
    map.set(ts, p);
  }
}

interface AccountTotalsResponse {
  accountTotals: AccountTotalsItem[];
}

export function useAccountValueSeries() {
  // 1) Full history once
  const {
    data: base,
    error: baseErr,
    isLoading: baseLoading,
  } = useSWR<AccountTotalsResponse>(endpoints.accountTotals(), fetcher, {
    refreshInterval: 0,
  });

  // Track last hourly marker from base
  const lastMarkerRef = useRef<number | null>(null);

  // Memoize baseItems to avoid changing dependency
  const baseItems = useMemo<AccountTotalsItem[]>(() => {
    return base && base.accountTotals ? base.accountTotals : [];
  }, [base]);

  const initialMarker = useMemo(() => {
    let m = -1;
    for (const it of baseItems) {
      if (typeof it.since_inception_hourly_marker === "number")
        m = Math.max(m, it.since_inception_hourly_marker);
    }
    return m >= 0 ? m : null;
  }, [baseItems]);

  useEffect(() => {
    if (initialMarker != null) lastMarkerRef.current = initialMarker;
  }, [initialMarker]);

  // 2) Incremental updates - use separate effect to get ref value
  const [incKey, setIncKey] = useState<string | null>(null);
  useEffect(() => {
    if (lastMarkerRef.current != null) {
      setIncKey(endpoints.accountTotals(lastMarkerRef.current));
    } else {
      setIncKey(null);
    }
  }, [initialMarker]);

  const { data: inc, error: incErr } = useSWR<AccountTotalsResponse>(
    incKey,
    fetcher,
    { refreshInterval: 5000 },
  );

  // Accumulate into store
  const clear = useChartStore((s) => s.clear);
  const addPoint = useChartStore((s) => s.addPoint);
  const getSessionSeries = useChartStore((s) => s.getSeries);

  // Seed base once
  useEffect(() => {
    if (!baseItems?.length) return;
    clear();
    const tmp = new Map<number, SeriesPoint>();
    ingestTotals(tmp, baseItems);
    for (const p of Array.from(tmp.values())) {
      const byModel: Record<string, number> = {};
      for (const [k, v] of Object.entries(p))
        if (k !== "timestamp" && typeof v === "number")
          byModel[k] = v as number;
      addPoint(p.timestamp, byModel);
    }
  }, [baseItems, clear, addPoint]);

  // Merge incremental
  useEffect(() => {
    const incItems: AccountTotalsItem[] =
      inc && (inc as any).accountTotals ? (inc as any).accountTotals : [];
    if (!incItems.length) return;
    const tmp = new Map<number, SeriesPoint>();
    ingestTotals(tmp, incItems);
    let maxMarker = lastMarkerRef.current ?? -1;
    for (const it of incItems) {
      if (typeof it.since_inception_hourly_marker === "number")
        maxMarker = Math.max(maxMarker, it.since_inception_hourly_marker);
    }
    if (maxMarker >= 0) lastMarkerRef.current = maxMarker;
    for (const p of Array.from(tmp.values())) {
      const byModel: Record<string, number> = {};
      for (const [k, v] of Object.entries(p))
        if (k !== "timestamp" && typeof v === "number")
          byModel[k] = v as number;
      addPoint(p.timestamp, byModel);
    }
  }, [inc, addPoint]);

  // Read back series
  const merged = getSessionSeries();
  const idsSet = new Set<string>();
  for (const p of merged)
    for (const k of Object.keys(p)) if (k !== "timestamp") idsSet.add(k);

  // If still only 1 point, synthesize a baseline one minute earlier
  let out = merged;
  if (out.length === 1) {
    const only = out[0];
    const prevTs = only.timestamp - 60_000;
    const synth: SeriesPoint = { timestamp: prevTs };
    for (const [k, v] of Object.entries(only))
      if (k !== "timestamp" && typeof v === "number")
        (synth as any)[k] = v as number;
    out = [synth, only];
  }

  return {
    series: out,
    modelIds: Array.from(idsSet),
    isLoading: baseLoading,
    isError: !!(baseErr || incErr),
  };
}
