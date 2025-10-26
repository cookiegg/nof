"use client";
import { create } from "zustand";

export type SeriesPoint = {
  timestamp: number;
  [modelId: string]: number | undefined;
};

type State = {
  seriesMap: Map<number, SeriesPoint>;
  addPoint: (ts: number, byModel: Record<string, number>) => void;
  clear: () => void;
  getSeries: () => SeriesPoint[];
};

export const useChartStore = create<State>((set, get) => ({
  seriesMap: new Map<number, SeriesPoint>(),
  addPoint: (ts, byModel) => {
    // Directly mutate the map for better performance - React doesn't track Map internals
    const map = get().seriesMap;
    const p = map.get(ts) || { timestamp: ts };
    for (const [k, v] of Object.entries(byModel)) p[k] = v;
    map.set(ts, p);
    // Force re-render by creating new reference only when needed
    set({ seriesMap: new Map(map) });
  },
  clear: () => set({ seriesMap: new Map() }),
  getSeries: () =>
    Array.from(get().seriesMap.values()).sort(
      (a, b) => a.timestamp - b.timestamp,
    ),
}));
