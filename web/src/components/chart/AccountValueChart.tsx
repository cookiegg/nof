"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { useAccountValueSeries } from "@/lib/api/hooks/useAccountValueSeries";
import { format } from "date-fns";
import { getModelColor, getModelName, getModelIcon, resolveCanonicalId } from "@/lib/model/meta";
import { useTheme } from "@/store/useTheme";
import { adjustLuminance } from "@/lib/ui/useDominantColors";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { SkeletonBlock } from "@/components/ui/Skeleton";

type Range = "ALL" | "72H";
type Mode = "$" | "%";

interface ChartDataPoint {
  timestamp: Date;
  [modelId: string]: Date | number;
}

interface SeriesPoint {
  timestamp: number;
  [modelId: string]: number;
}

const MAX_POINTS_72H = 600;

export default function AccountValueChart() {
  const { series, modelIds, isLoading, isError } = useAccountValueSeries();
  const [range, setRange] = useState<Range>("ALL");
  const [mode, setMode] = useState<Mode>("$");
  const cutoffTimeRef = useRef<number>(0);
  const [dataRows, setDataRows] = useState<ChartDataPoint[]>([]);
  const [ids, setIds] = useState<string[]>([]);
  const lastTsRef = useRef<number | null>(null);
  const [active, setActive] = useState<Set<string>>(new Set());
  const [vw, setVw] = useState<number>(0);
  const resolvedTheme = useTheme((s) => s.resolved);
  const isDark = resolvedTheme === 'dark';
  const chartRef = useRef<HTMLDivElement | null>(null);

  // End-logo size and dynamic right margin (to avoid clipping without huge whitespace)
  // Rendered size = base * 2/3. Targets: ~14px (<380), ~18px (<640), ~28px (<1024)
  const endLogoBaseSize = vw < 380 ? 21 : vw < 640 ? 27 : vw < 1024 ? 42 : 44; // logical size used before scaling
  const endLogoSize = Math.round(endLogoBaseSize * 2 / 3); // actual rendered logo size
  // Responsive margin factor: tighter on very small screens since logo is smaller
  const marginFactor = vw < 380 ? 1.2 : vw < 640 ? 1.35 : vw < 1024 ? 1.6 : 1.7;
  const chartRightMargin = Math.max(64, Math.round(endLogoSize * marginFactor));

  const cssSafe = (s: string) => s.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");

  const clearFocus = () => {
    const root = chartRef.current;
    if (!root) return;
    root.querySelectorAll('g.series').forEach((g) => {
      g.classList.remove('dim');
      g.classList.remove('focused');
    });
  };

  const focusSeries = (id: string) => {
    const root = chartRef.current;
    if (!root) return;
    const safe = cssSafe(id);
    const all = root.querySelectorAll('g.series');
    all.forEach((g) => g.classList.add('dim'));
    const target = root.querySelector(`g.series.series-${safe}`);
    if (target) target.classList.add('focused');
  };

  // Initialize cutoff time on client side to avoid hydration mismatch
  useEffect(() => {
    cutoffTimeRef.current = Date.now() - 72 * 3600 * 1000;
  }, []);

  // Track viewport width for responsive sizing (logo size, button sizing)
  useEffect(() => {
    const upd = () => setVw(typeof window !== "undefined" ? window.innerWidth : 0);
    upd();
    window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);


  function hexToRGB(hex: string): { r: number; g: number; b: number } | null {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
    if (!m) return null;
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  }

  function relativeLuminance(hex: string): number | null {
    const rgb = hexToRGB(hex);
    if (!rgb) return null;
    const toLin = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const r = toLin(rgb.r), g = toLin(rgb.g), b = toLin(rgb.b);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function getStrokeColor(id: string): string {
    const base = getModelColor(id);
    const lum = relativeLuminance(base);
    if (lum == null) return base;
    const canon = resolveCanonicalId(id);
    if (isDark && canon === 'grok-4') {
      return '#ffffff';
    }
    if (isDark && lum < 0.06) {
      // too dark on dark bg → lift to neutral zinc-300 for visibility
      return '#d4d4d8';
    }
    if (!isDark && lum > 0.94) {
      // too light on light bg → darken a bit
      return adjustLuminance(base, -0.25);
    }
    return base;
  }

  // Append-only updates to避免整表重建
  useEffect(() => {
    if (!series.length) return;
    const nextIds = Array.from(new Set([...(ids || []), ...modelIds]));
    const sorted = [...series].sort((a, b) => a.timestamp - b.timestamp);
    const nextRows: ChartDataPoint[] = [...dataRows];
    if (lastTsRef.current == null) {
      for (const p of sorted) {
        const row: ChartDataPoint = { timestamp: new Date(p.timestamp) };
        for (const id of nextIds) {
          const value = (p as SeriesPoint)[id];
          if (typeof value === "number") {
            (row as any)[id] = value;
          }
        }
        nextRows.push(row);
      }
      lastTsRef.current = sorted[sorted.length - 1]?.timestamp ?? null;
      setDataRows(nextRows);
      setIds(nextIds);
      setActive((prev) => (prev.size ? prev : new Set(nextIds))); // initialize legend selection
      return;
    }
    for (const p of sorted) {
      if (p.timestamp < (lastTsRef.current as number)) continue;
      const row: ChartDataPoint = { timestamp: new Date(p.timestamp) };
      for (const id of nextIds) {
        const value = (p as SeriesPoint)[id];
        if (typeof value === "number") {
          (row as any)[id] = value;
        }
      }
      if (p.timestamp === (lastTsRef.current as number)) {
        // in-place merge for the last timestamp
        const idx = nextRows.length - 1;
        nextRows[idx] = { ...nextRows[idx], ...row } as any;
      } else {
        nextRows.push(row);
        lastTsRef.current = p.timestamp;
      }
    }
    if (nextRows.length !== dataRows.length) {
      setDataRows(nextRows);
      setIds(nextIds);
    }
  }, [series]);

  const { data, models } = useMemo(() => {
    let points = [...dataRows];
    // Filter by range
    if (range === "72H" && points.length) {
      const cutoff = cutoffTimeRef.current;
      points = points.filter((p) => (p.timestamp as Date).getTime() >= cutoff);
    }
    // Percent mode normalization
    if (mode === "%") {
      const bases: Record<string, number> = {};
      for (const id of ids) {
        for (const p of points) {
          const v = p[id];
          if (typeof v === "number") {
            bases[id] = v;
            break;
          }
        }
      }
      points = points.map((p) => {
        const cp: ChartDataPoint = { ...p } as any;
        for (const id of ids) {
          const base = bases[id];
          const v = p[id];
          if (typeof v === "number" && base) {
            cp[id] = ((v / base) - 1) * 100; // percent
          }
        }
        return cp;
      });
    }
    // Downsample for 72H range to keep chart performant
    if (range === "72H" && points.length > MAX_POINTS_72H) {
      const step = Math.ceil(points.length / MAX_POINTS_72H);
      const sampled: ChartDataPoint[] = [];
      for (let i = 0; i < points.length; i += step) sampled.push(points[i]);
      // ensure last point included
      if (sampled[sampled.length - 1] !== points[points.length - 1]) sampled.push(points[points.length - 1]);
      points = sampled;
    }
    return { data: points, models: ids };
  }, [dataRows, ids, range, mode]);

  // prefer global brand colors from meta as background for logo chips

  // compute last index per model to render only the end dot as logo
  const lastIdxById = useMemo(() => {
    const m: Record<string, number> = {};
    for (const id of models) {
      for (let i = data.length - 1; i >= 0; i--) {
        const v = (data[i] as any)[id];
        if (typeof v === "number") { m[id] = i; break; }
      }
    }
    return m;
  }, [models, data]);

  const lastValById = useMemo(() => {
    const m: Record<string, number | undefined> = {};
    for (const id of models) {
      const idx = lastIdxById[id];
      if (typeof idx === "number") {
        const v = (data[idx] as any)?.[id];
        if (typeof v === "number") m[id] = v;
      }
    }
    return m;
  }, [models, data, lastIdxById]);

  const formatValue = (v: number | undefined) => {
    if (typeof v !== "number") return "--";
    if (mode === "%") return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
    try {
      return `$${Math.round(v).toLocaleString()}`;
    } catch {
      return `$${Math.round(v)}`;
    }
  };

  const renderEndDot = (id: string) => (p: any) => {
    const { cx, cy, index } = p || {};
    if (cx == null || cy == null) return <></>;
    if (typeof lastIdxById[id] !== "number" || index !== lastIdxById[id]) return <></>;
    if (active.size && !active.has(id)) return <></>;
    const icon = getModelIcon(id);
    const color = getModelColor(id);
    const bg = color || "var(--chart-logo-bg)";
    const ring = typeof bg === "string" && bg.startsWith("#") ? adjustLuminance(bg, -0.15) : "var(--chart-logo-ring)";
    const size = endLogoSize; // logo size to 2/3
    const haloR = Math.round(endLogoBaseSize / 3); // halo to 1/3 of previous radius
    return (
      <g
        key={`${id}-dot-${index}`}
        transform={`translate(${cx}, ${cy})`}
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => focusSeries(id)}
        onMouseLeave={() => clearFocus()}
      >
        <g
          style={{
            transform: `scale(1)`,
            transformBox: 'fill-box',
            transformOrigin: '50% 50%',
            transition: 'transform 160ms ease',
          }}
        >
          {/* soft pulse halo (reduced) */}
          <circle r={haloR} className="animate-ping" fill={color} opacity={0.075} />
          {/* theme-aware solid chip behind logo for contrast */}
          <circle r={Math.round(size * 0.55)} fill={bg as any} stroke={ring as any} strokeWidth={1} />
          {icon ? (
            <image
              href={icon}
              x={-size / 2}
              y={-size / 2}
              width={size}
              height={size}
              focusable="false"
              tabIndex={-1}
              preserveAspectRatio="xMidYMid meet"
              style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.6))", pointerEvents: 'none' }}
            />
          ) : (
            <circle r={Math.max(6, Math.round(size * 0.38))} fill={color} />
          )}
        </g>
      </g>
    );
  };

  // theme-aware classes
  const panelBorder = isDark ? "border-white/10" : "border-black/10";
  const panelBg = isDark ? "bg-zinc-950" : "bg-white";
  const mutText = isDark ? "text-zinc-300" : "text-zinc-600";
  const tickFill = isDark ? "#a1a1aa" : "#52525b";
  const gridStroke = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const refLine = isDark ? "#a1a1aa" : "#9ca3af";
  const chipBorder = isDark ? "border-white/15" : "border-black/15";
  const actBtn = isDark ? "bg-white/10 text-zinc-100" : "bg-black/10 text-zinc-800";
  const inactBtn = isDark ? "text-zinc-300 hover:bg-white/5" : "text-zinc-600 hover:bg-black/5";

  return (
    <div className={`flex h-full min-h-[260px] sm:min-h-[300px] flex-col rounded-md border ${panelBorder} ${panelBg} p-3`}>
      <div className="mb-2 flex items-center justify-between">
        <div className={`text-xs font-semibold tracking-wider ${mutText}`}>账户总资产</div>
        {/* Small top-right range/unit toggles */}
        <div className="hidden sm:flex items-center gap-2 text-[11px]">
          <div className={`flex overflow-hidden rounded border ${chipBorder}`}>
            {(["ALL", "72H"] as Range[]).map((r) => (
              <button
                key={r}
                className={`px-2 py-1 ${range === r ? actBtn : inactBtn}`}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <div className={`flex overflow-hidden rounded border ${chipBorder}`}>
            {(["$", "%"] as Mode[]).map((m) => (
              <button
                key={m}
                className={`px-2 py-1 ${mode === m ? actBtn : inactBtn}`}
                onClick={() => setMode(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Legend below chart */}
      <ErrorBanner message={isError ? "账户价值数据源暂时不可用，请稍后重试。" : undefined} />
      <div className="w-full flex-1 min-h-0 flex flex-col">
        {isLoading ? (
          <SkeletonBlock className="h-full" />
        ) : data.length >= 2 ? (
          <>
          <div className="min-h-0 flex-1">
          <div
            ref={chartRef}
            className="relative h-full w-full no-tap-highlight select-none"
            tabIndex={-1}
            onMouseDown={(e) => {
              // Prevent Chrome from focusing the SVG on click, which shows a focus ring
              e.preventDefault();
            }}
          >
            <ResponsiveContainer>
              <LineChart
                data={data}
                margin={{ top: 8, right: chartRightMargin, bottom: 8, left: 0 }}
                onMouseLeave={() => clearFocus()}
              >
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(v: Date) => format(v, "MM-dd HH:mm")}
                tick={{ fill: tickFill, fontSize: 11 }}
              />
              <YAxis tickFormatter={(v: number) => (mode === "%" ? `${v.toFixed(1)}%` : `$${Math.round(v).toLocaleString()}`)} tick={{ fill: tickFill, fontSize: 11 }} width={60} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: isDark ? "#09090b" : "#ffffff", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.12)", color: isDark ? "#e4e4e7" : "#18181b" }}
                labelFormatter={(v) => (v instanceof Date ? format(v, "yyyy-MM-dd HH:mm") : String(v))}
                formatter={(val: number) => (mode === "%" ? `${Number(val).toFixed(2)}%` : `$${Number(val).toFixed(2)}`)}
              />
              {mode === "$" ? (
                <ReferenceLine y={10000} stroke={refLine} strokeDasharray="4 4" />
              ) : (
                <ReferenceLine y={0} stroke={refLine} strokeDasharray="4 4" />
              )}
              {models.map((id, i) => (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={id}
                  dot={renderEndDot(id)}
                  connectNulls
                  className={`series series-${cssSafe(id)}`}
                  stroke={getStrokeColor(id)}
                  strokeWidth={1.8}
                  isAnimationActive
                  animationDuration={700}
                  animationEasing="ease-out"
                  name={getModelName(id)}
                  hide={active.size ? !active.has(id) : false}
                />
              ))}
            </LineChart>
            </ResponsiveContainer>
            {/* Watermark near x-axis end (slightly above) */}
            <div
              className="pointer-events-none absolute select-none"
              style={{ right: Math.max(8, chartRightMargin - 12), bottom: 40 }}
            >
              <div
                className="font-semibold tracking-wider text-base sm:text-lg md:text-xl lg:text-2xl"
                style={{
                  color: 'var(--watermark-color)',
                  letterSpacing: '0.15em',
                  userSelect: 'none',
                }}
              >
                @wquguru
              </div>
            </div>
          </div>
          </div>
          {/* Bottom legend inside chart area flow */}
          {models.length > 0 && (
            <div className="mt-3">
              {/* Small screens: horizontal scrollable legend */}
              <div className="block md:hidden">
                <div className="flex flex-nowrap gap-2 overflow-x-auto whitespace-nowrap pr-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {models.map((id) => {
                    const activeOn = active.size ? active.has(id) : true;
                    const icon = getModelIcon(id);
                    return (
                      <button
                        key={id}
                        className={`inline-flex min-w-[120px] flex-shrink-0 flex-col items-center justify-center gap-1 rounded border px-2.5 py-2 text-[12px] transition-colors ${
                          activeOn
                            ? (isDark ? "border-white/25 bg-white/5 text-zinc-100 hover:bg-white/10" : "border-black/20 bg-black/5 text-zinc-800 hover:bg-black/10")
                            : (isDark ? "border-white/10 text-zinc-400 hover:bg-white/5" : "border-black/10 text-zinc-500 hover:bg-black/5")
                        }`}
                        onClick={() => {
                          setActive((prev) => {
                            if (prev.size === 1 && prev.has(id)) return new Set(models);
                            return new Set([id]);
                          });
                        }}
                      >
                        <div className="flex items-center gap-1 text-[11px] opacity-90">
                          {icon ? (
                            <span className="logo-chip logo-chip-sm" style={{ background: getModelColor(id), borderColor: adjustLuminance(getModelColor(id), -0.2) }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={icon} alt="" className="h-3 w-3 object-contain" />
                            </span>
                          ) : (
                            <span className="inline-block h-3 w-3 rounded-full" style={{ background: getModelColor(id) }} />
                          )}
                          <span className="truncate max-w-[9ch]">{getModelName(id)}</span>
                        </div>
                        <div className={`font-semibold leading-tight ${isDark ? "text-zinc-100" : "text-zinc-800"}`}>
                          {formatValue(lastValById[id])}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Desktop: equal-width grid legend */}
              <div className="hidden md:block">
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${models.length}, minmax(0, 1fr))` }}>
                  {models.map((id) => {
                    const activeOn = active.size ? active.has(id) : true;
                    const icon = getModelIcon(id);
                    return (
                      <button
                        key={id}
                        className={`w-full group inline-flex flex-col items-center justify-center gap-1 rounded border px-2.5 py-2 text-[12px] sm:text-[13px] transition-colors ${
                          activeOn
                            ? (isDark ? "border-white/25 bg-white/5 text-zinc-100 hover:bg-white/10" : "border-black/20 bg-black/5 text-zinc-800 hover:bg-black/10")
                            : (isDark ? "border-white/10 text-zinc-400 hover:bg-white/5" : "border-black/10 text-zinc-500 hover:bg-black/5")
                        }`}
                        onClick={() => {
                          setActive((prev) => {
                            if (prev.size === 1 && prev.has(id)) return new Set(models);
                            return new Set([id]);
                          });
                        }}
                      >
                        <div className="flex items-center gap-1 text-[11px] opacity-90">
                          {icon ? (
                            <span className="logo-chip logo-chip-sm" style={{ background: getModelColor(id), borderColor: adjustLuminance(getModelColor(id), -0.2) }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={icon} alt="" className="h-3 w-3 object-contain" />
                            </span>
                          ) : (
                            <span className="inline-block h-3 w-3 rounded-full" style={{ background: getModelColor(id) }} />
                          )}
                          <span className="truncate max-w-[9ch] sm:max-w-none">{getModelName(id)}</span>
                        </div>
                        <div className={`font-semibold leading-tight ${isDark ? "text-zinc-100" : "text-zinc-800"}`}>
                          {formatValue(lastValById[id])}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Range/unit toggles moved to top-right; no bottom controls */}
            </div>
          )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-zinc-400">
            <div>暂无足够的图表数据（需要至少 2 个时间点）。</div>
            <div className="text-xs text-zinc-500">建议保持页面打开几分钟，我们会按 5 秒节奏累积最新净值点。</div>
            <div className="text-xs text-zinc-500">
              调试：<a className="underline" href="/api/nof1/since-inception-values" target="_blank">since-inception-values</a>
              ，<a className="underline" href="/api/nof1/account-totals" target="_blank">account-totals</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
