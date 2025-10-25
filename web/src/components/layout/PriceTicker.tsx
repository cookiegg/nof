"use client";
import { useMemo } from "react";
import { useCryptoPrices } from "@/lib/api/hooks/useCryptoPrices";
import { fmtUSD } from "@/lib/utils/formatters";
import { useTheme } from "@/store/useTheme";

const ORDER = ["BTC", "ETH", "SOL", "BNB", "DOGE", "XRP"] as const;

export default function PriceTicker() {
  const { prices } = useCryptoPrices();
  // use CSS variables instead of theme branching
  const list = useMemo(() => {
    const vals = Object.values(prices);
    return ORDER.map((s) => vals.find((v) => v.symbol === s)).filter(Boolean) as typeof vals;
  }, [prices]);

  return (
    <div className={`w-full border-b h-[var(--ticker-h)]`} style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
      <div className={`flex h-full items-center gap-x-6 gap-y-1 px-3 text-[11px] leading-5`} style={{ color: 'var(--foreground)' }}>
        {list.map((p) => (
          <span key={p.symbol} className={`tabular-nums`} style={{ color: 'var(--muted-text)' }}>
            <b className={`mr-1`} style={{ color: 'var(--foreground)' }}>{p.symbol}</b>
            {fmtUSD(p.price)}
          </span>
        ))}
      </div>
    </div>
  );
}
