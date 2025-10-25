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
  addPoint: (ts, byModel) =>
    set((s) => {
      const map = new Map(s.seriesMap);
      const p = map.get(ts) || { timestamp: ts };
      for (const [k, v] of Object.entries(byModel)) p[k] = v;
      map.set(ts, p);
      return { seriesMap: map };
    }),
  clear: () => set({ seriesMap: new Map() }),
  getSeries: () =>
    Array.from(get().seriesMap.values()).sort(
      (a, b) => a.timestamp - b.timestamp,
    ),
}));
