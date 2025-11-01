"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCryptoPrices } from "@/lib/api/hooks/useCryptoPrices";
import { fmtUSD } from "@/lib/utils/formatters";

const ORDER = ["BTC", "ETH", "SOL", "BNB", "DOGE", "XRP"] as const;

// 从symbol中提取币种名称（例如：BTC/USDT -> BTC）
function extractCoinSymbol(symbol: string): string {
  if (!symbol) return "";
  // 处理多种格式：BTC/USDT, BTC/USDT:USDT, BTC:USDT 等
  return symbol.split("/")[0].split(":")[0].toUpperCase();
}

export default function PriceTicker() {
  const { prices, isLoading, isError } = useCryptoPrices();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [loop, setLoop] = useState(false);
  // use CSS variables instead of theme branching
  const list = useMemo(() => {
    if (!prices || Object.keys(prices).length === 0) return [];
    
    // 从后端数据中匹配币种
    // 后端返回格式: { "BTC/USDT": { symbol: "BTC", price: ..., timestamp: ... }, ... }
    return ORDER.map((coinSymbol) => {
      // 先尝试用交易对格式匹配（如 prices["BTC/USDT"]）
      if (prices[`${coinSymbol}/USDT`]) {
        return prices[`${coinSymbol}/USDT`];
      }
      // 尝试直接用 key 匹配（如 prices["BTC"]）
      if (prices[coinSymbol]) {
        return prices[coinSymbol];
      }
      // 如果 key 不匹配，尝试从 values 中查找匹配的 symbol
      const vals = Object.values(prices);
      return vals.find((v) => {
        if (!v || typeof v !== 'object') return false;
        // 如果 symbol 已经是币种名称（如 "BTC"），直接比较
        if (v.symbol === coinSymbol) return true;
        // 如果 symbol 是交易对格式（如 "BTC/USDT"），提取币种名称后比较
        const vSymbol = extractCoinSymbol(v.symbol || "");
        return vSymbol === coinSymbol;
      });
    }).filter(Boolean) as Array<{ symbol: string; price: number; timestamp?: number }>;
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
        {isLoading && list.length === 0 ? (
          <div
            className="terminal-text flex h-full items-center gap-6 whitespace-nowrap text-xs leading-relaxed"
            style={{ color: "var(--muted-text)" }}
          >
            加载中...
          </div>
        ) : isError ? (
          <div
            className="terminal-text flex h-full items-center gap-6 whitespace-nowrap text-xs leading-relaxed"
            style={{ color: "var(--muted-text)" }}
          >
            数据获取失败，请检查后端连接
          </div>
        ) : list.length === 0 ? (
          <div
            className="terminal-text flex h-full items-center gap-6 whitespace-nowrap text-xs leading-relaxed"
            style={{ color: "var(--muted-text)" }}
          >
            暂无价格数据
          </div>
        ) : loop ? (
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
  return list.map((p) => {
    const displaySymbol = extractCoinSymbol(p.symbol || "");
    return (
      <span key={displaySymbol} className={`tabular-nums`} style={{ color: "var(--muted-text)" }}>
        <b className={`mr-1`} style={{ color: "var(--foreground)" }}>
          {displaySymbol}
        </b>
        {fmtUSD(p.price)}
      </span>
    );
  });
}
