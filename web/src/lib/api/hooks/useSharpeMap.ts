"use client";
import useSWR from "swr";
import { endpoints, fetcher } from "../nof1";

type TotalsRow = {
  model_id?: string;
  id?: string;
  timestamp: number;
  equity?: number | null;
  dollar_equity?: number | null;
  account_value?: number | null;
};

type TradesRow = {
  model_id: string;
  exit_closed_pnl?: number;
  entry_closed_pnl?: number;
  exit_time?: number;
  exit_human_time?: string; // e.g. 2025-10-26 11:20:33
};

type TotalsResp = { accountTotals: TotalsRow[] };
type TradesResp = { trades: TradesRow[] };

function dayFromAny(x?: number | string | null): string | null {
  if (!x) return null;
  if (typeof x === "number")
    return new Date(x * 1000).toISOString().slice(0, 10);
  return String(x).slice(0, 10);
}

function benchDailyReturns(rows: TotalsRow[]) {
  const src = rows
    .filter((r) => (r.model_id || r.id) === "buynhold_btc")
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  const byDay = new Map<string, number>();
  for (const r of src) {
    const d = new Date((r.timestamp || 0) * 1000).toISOString().slice(0, 10);
    const eq = (r.dollar_equity ?? r.account_value ?? r.equity ?? 0) as number;
    byDay.set(d, eq);
  }
  const days = Array.from(byDay.keys()).sort();
  const rets: number[] = [];
  for (let i = 1; i < days.length; i++) {
    const p = byDay.get(days[i - 1])!;
    const c = byDay.get(days[i])!;
    if (p) rets.push(c / p - 1);
  }
  return { days: days.slice(1), rets };
}

function modelDailyEquityFromTrades(
  trades: TradesRow[],
  id: string,
  base = 10000,
) {
  const agg = new Map<string, number>(); // day -> sum pnl
  for (const t of trades) {
    if (!t || t.model_id !== id) continue;
    const d = dayFromAny((t as any).exit_time ?? t.exit_human_time);
    if (!d) continue;
    const pnl =
      Number(t.exit_closed_pnl || 0) + Number(t.entry_closed_pnl || 0);
    agg.set(d, (agg.get(d) || 0) + pnl);
  }
  const days = Array.from(agg.keys()).sort();
  const equity = new Map<string, number>();
  let eq = base;
  for (const d of days) {
    eq += agg.get(d)!;
    equity.set(d, eq);
  }
  return equity; // day -> equity
}

function dailyReturnsFromEquityMap(eq: Map<string, number>) {
  const days = Array.from(eq.keys()).sort();
  const rets: number[] = [];
  for (let i = 1; i < days.length; i++) {
    const p = eq.get(days[i - 1])!;
    const c = eq.get(days[i])!;
    if (p) rets.push(c / p - 1);
  }
  return { days: days.slice(1), rets };
}

function alignExcess(
  model: { days: string[]; rets: number[] },
  bench: { days: string[]; rets: number[] },
) {
  const idx: Record<string, number> = {};
  bench.days.forEach((d, i) => (idx[d] = i));
  const ex: number[] = [];
  for (let i = 0; i < model.days.length; i++) {
    const d = model.days[i];
    const bi = idx[d];
    if (bi == null) continue;
    ex.push(model.rets[i] - bench.rets[bi]);
  }
  return ex;
}

function winsorize(arr: number[], p = 0.1) {
  if (!arr.length) return arr;
  const s = arr.slice().sort((a, b) => a - b);
  const lo = s[Math.floor(p * s.length)] ?? s[0];
  const hi = s[Math.floor((1 - p) * s.length) - 1] ?? s[s.length - 1];
  return arr.map((x) => Math.min(hi, Math.max(lo, x)));
}

function sharpeRatio(excess: number[]) {
  if (!excess || excess.length < 3) return 0;
  const xs = winsorize(excess, 0.1);
  const n = xs.length;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(
    xs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1),
  );
  if (!std) return 0;
  return mean / std; // 不年化，更贴近原站数值量级
}

export function useSharpeMap() {
  const {
    data: totals,
    error: e1,
    isLoading: l1,
  } = useSWR<TotalsResp>(endpoints.accountTotals(), fetcher, {
    refreshInterval: 15000,
  });
  const {
    data: trades,
    error: e2,
    isLoading: l2,
  } = useSWR<TradesResp>(endpoints.trades?.() ?? "/api/nof1/trades", fetcher, {
    refreshInterval: 15000,
  });

  const map: Record<string, number> = {};
  const stats: Record<
    string,
    { n: number; mean: number; std: number; sharpe: number }
  > = {};
  const rows = totals?.accountTotals ?? [];
  const bench = benchDailyReturns(rows);
  const arr = trades?.trades ?? [];

  // 取出所有模型 id（排除基准）
  const ids = Array.from(
    new Set(
      arr.map((t) => t.model_id).filter((id) => id && id !== "buynhold_btc"),
    ),
  );
  for (const id of ids) {
    const eq = modelDailyEquityFromTrades(arr, id, 10000);
    const mr = dailyReturnsFromEquityMap(eq);
    const ex = alignExcess(mr, bench);
    const xs = winsorize(ex, 0.1);
    const n = xs.length;
    const mean = n ? xs.reduce((a, b) => a + b, 0) / n : 0;
    const std =
      n > 1
        ? Math.sqrt(xs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1))
        : 0;
    const s = std ? mean / std : 0;
    map[id] = s;
    stats[id] = { n, mean, std, sharpe: s };
  }

  return { map, stats, isLoading: l1 || l2, isError: !!(e1 || e2) };
}
