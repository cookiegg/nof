"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCryptoPrices } from "@/lib/api/hooks/useCryptoPrices";
import { fmtUSD } from "@/lib/utils/formatters";
import { useTheme } from "@/store/useTheme";

const ORDER = ["BTC", "ETH", "SOL", "BNB", "DOGE", "XRP"] as const;

export default function PriceTicker() {
  const { prices } = useCryptoPrices();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [loop, setLoop] = useState(false);
  // use CSS variables instead of theme branching
  const list = useMemo(() => {
    const vals = Object.values(prices);
    return ORDER.map((s) => vals.find((v) => v.symbol === s)).filter(
      Boolean,
    ) as typeof vals;
  }, [prices]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;
    const check = () => {
      const need = track.scrollWidth > wrap.clientWidth + 8;
      setLoop(need);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(wrap);
    ro.observe(track);
    return () => ro.disconnect();
  }, [list]);

  return (
    <div
      className={`w-full border-b h-[var(--ticker-h)]`}
      style={{
        borderColor: "var(--panel-border)",
        background: "var(--panel-bg)",
      }}
    >
      <div ref={wrapRef} className="h-full overflow-hidden px-3">
        {loop ? (
          <div className="relative h-full">
            <div
              ref={trackRef}
              className="ticker-track absolute left-0 top-0 flex h-full items-center gap-6 whitespace-nowrap text-xs leading-relaxed"
              style={{ color: "var(--foreground)" }}
            >
              {renderItems(list)}
              {renderItems(list)}
            </div>
          </div>
        ) : (
          <div
            ref={trackRef}
            className="terminal-text flex h-full items-center gap-6 whitespace-nowrap text-xs leading-relaxed"
            style={{ color: "var(--foreground)", overflowX: "auto" as any }}
          >
            {renderItems(list)}
          </div>
        )}
      </div>
    </div>
  );
}

function renderItems(list: { symbol: string; price: number }[]) {
  return list.map((p) => (
    <span key={`${p.symbol}-${Math.random()}`} className={`tabular-nums`} style={{ color: "var(--muted-text)" }}>
      <b className={`mr-1`} style={{ color: "var(--foreground)" }}>
        {p.symbol}
      </b>
      {fmtUSD(p.price)}
    </span>
  ));
}
