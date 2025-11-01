"use client";
import useSWR from "swr";
import { useEffect, useMemo, useRef, useState } from "react";
import { endpoints, fetcher } from "../nof1";
import { useChartStore } from "@/store/useChartStore";
import { useCryptoPrices } from "./useCryptoPrices";

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
  btc_price?: number; // BTC价格（如果存在）
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
  initialAccountValue?: number; // 初始账户价值
  initialBTCPrice?: number; // 初始BTC价格（启动时）
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
    { refreshInterval: 3000 }, // Reduced from 5s to 10s to minimize Fast Origin Transfer costs
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

  // ????????
  const initialAccountValue = base?.initialAccountValue || inc?.initialAccountValue || null;
  const initialBTCPrice = base?.initialBTCPrice || inc?.initialBTCPrice || null;

  // 计算"买入并持有BTC"的假设曲线
  // 使用真实的BTC价格历史（从accountTotals中的btc_price字段）
  const { prices: cryptoPrices } = useCryptoPrices();
  const currentBTCPrice = cryptoPrices?.BTC?.price || 0;
  
  // 构建BTC价格映射：从accountTotals中提取每个时间点的BTC价格
  const btcPriceMap = useMemo(() => {
    const map = new Map<number, number>();
    // 从base和inc中提取所有BTC价格
    for (const item of [...baseItems, ...(inc?.accountTotals || [])]) {
      if (item.btc_price && typeof item.btc_price === 'number') {
        const ts = toMs(item.timestamp);
        map.set(ts, item.btc_price);
      }
    }
    return map;
  }, [baseItems, inc]);
  
  const btcHoldSeries = useMemo(() => {
    if (!out.length) return [];
    
    // 如果没有初始账户价值，使用第一个数据点的账户价值
    const startAccountValue = initialAccountValue || (() => {
      for (const p of out) {
        for (const [k, v] of Object.entries(p)) {
          if (k !== 'timestamp' && typeof v === 'number' && v > 0) {
            return v;
          }
        }
      }
      return null;
    })();
    
    if (!startAccountValue || startAccountValue <= 0) {
      console.warn('无法获取初始账户价值，跳过BTC持有曲线计算');
      return [];
    }
    
    // 使用真实的初始BTC价格（从API获取，启动时保存）
    const startBTCPrice = initialBTCPrice || (btcPriceMap.size > 0 ? Array.from(btcPriceMap.values())[0] : null) || currentBTCPrice;
    
    if (!startBTCPrice || startBTCPrice <= 0) {
      console.warn('无法获取初始BTC价格，跳过BTC持有曲线计算');
      return [];
    }
    
    // 计算初始买入的BTC数量
    const btcQuantity = startAccountValue / startBTCPrice;
    
    // 计算每个时间点的BTC持有价值
    return out.map((p) => {
      const copy: SeriesPoint = { timestamp: p.timestamp };
      
      // 复制原有的模型数据
      for (const [k, v] of Object.entries(p)) {
        if (k !== 'timestamp' && typeof v === 'number') {
          (copy as any)[k] = v;
        }
      }
      
      // 获取该时间点的BTC价格（从映射中查找最接近的时间戳）
      let btcPriceAtTime: number | null = null;
      
      // 直接查找相同时间戳
      if (btcPriceMap.has(p.timestamp)) {
        btcPriceAtTime = btcPriceMap.get(p.timestamp)!;
      } else {
        // 查找最接近的时间戳（1小时内）
        let closestTs: number | null = null;
        let minDiff = Infinity;
        for (const [ts, price] of btcPriceMap.entries()) {
          const diff = Math.abs(ts - p.timestamp);
          if (diff < minDiff && diff < 3600_000) { // 1小时内
            minDiff = diff;
            closestTs = ts;
            btcPriceAtTime = price;
          }
        }
      }
      
      // 如果找不到历史价格，使用线性插值（仅作为最后手段）
      if (!btcPriceAtTime) {
        const sortedPrices = Array.from(btcPriceMap.entries()).sort((a, b) => a[0] - b[0]);
        if (sortedPrices.length > 0) {
          const firstPrice = sortedPrices[0][1];
          const lastPrice = sortedPrices[sortedPrices.length - 1][1] || currentBTCPrice;
          
          // 计算时间进度
          const firstTs = sortedPrices[0][0];
          const lastTs = sortedPrices[sortedPrices.length - 1][0] || p.timestamp;
          const progress = lastTs > firstTs ? (p.timestamp - firstTs) / (lastTs - firstTs) : 0;
          btcPriceAtTime = firstPrice + (lastPrice - firstPrice) * progress;
        } else {
          // 如果完全没有历史价格，使用当前价格
          btcPriceAtTime = currentBTCPrice || startBTCPrice;
        }
      }
      
      // 计算BTC持有价值
      if (btcPriceAtTime && btcPriceAtTime > 0) {
        (copy as any)['btc-hold'] = btcQuantity * btcPriceAtTime;
      }
      
      return copy;
    });
  }, [out, initialAccountValue, initialBTCPrice, btcPriceMap, currentBTCPrice]);

  // 判断是否成功计算了BTC持有曲线
  const hasBTCHold = btcHoldSeries.length > 0 && btcHoldSeries.some(p => typeof (p as any)['btc-hold'] === 'number');
  
  return {
    series: hasBTCHold ? btcHoldSeries : out,
    modelIds: hasBTCHold ? [...Array.from(idsSet), 'btc-hold'] : Array.from(idsSet),
    isLoading: baseLoading,
    isError: !!(baseErr || incErr),
    initialAccountValue,
  };
}
