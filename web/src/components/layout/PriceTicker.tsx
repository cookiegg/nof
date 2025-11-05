"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCryptoPrices } from "@/lib/api/hooks/useCryptoPrices";
import { fmtUSD } from "@/lib/utils/formatters";

const ORDER = ["BTC", "ETH", "SOL", "BNB", "DOGE", "XRP"] as const;

// 币种图标映射
const COIN_ICONS: Record<string, string> = {
  BTC: "/logos_white/btc.png",
  ETH: "/logos_white/eth.png",
  SOL: "/logos_white/sol.png",
  BNB: "/logos_white/bnb.png",
  DOGE: "/logos_white/doge.png",
  XRP: "/logos_white/xrp.png",
};

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
  const prevMapRef = useRef<Record<string, number>>({});
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

  // 固定显示 6 个币种，不做分页

  return (
    <div
      className={`w-full border-b h-[var(--ticker-h)]`}
      style={{
        borderColor: "var(--panel-border)",
        background: "var(--panel-bg)",
        height: "calc(var(--ticker-h) * 2)",
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
        ) : (
          <div className="relative h-full">
            <div
              ref={trackRef}
              className="flex h-full items-center gap-4 md:gap-6 whitespace-nowrap"
              style={{ color: "var(--foreground)" }}
            >
              {renderItems(list, prevMapRef)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function renderItems(list: { symbol: string; price: number }[], prevMapRef: React.MutableRefObject<Record<string, number>>) {
  return list.map((p) => {
    const displaySymbol = extractCoinSymbol(p.symbol || "");
    const prev = prevMapRef.current[displaySymbol];
    const direction: "up" | "down" | "none" = typeof prev === "number" ? (p.price > prev ? "up" : p.price < prev ? "down" : "none") : "none";
    // 更新 prev
    prevMapRef.current[displaySymbol] = p.price;
    const iconPath = COIN_ICONS[displaySymbol];
    return (
      <div
        key={displaySymbol}
        className="flex flex-col items-center justify-center gap-1 px-2"
        style={{ minWidth: "fit-content" }}
      >
        {/* 币种名 + 图标 */}
        <div className="flex items-center gap-1.5">
          {iconPath ? (
            <img
              src={iconPath}
              alt={displaySymbol}
              className="h-4 w-4 object-contain"
              onError={(e) => {
                // 图标加载失败时隐藏
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : null}
          <span
            className="text-xs md:text-sm font-semibold uppercase"
            style={{ color: "var(--foreground)" }}
          >
          {displaySymbol}
      </span>
        </div>
        {/* 价格滚轮 */}
        <div className="tabular-nums text-[13px] md:text-[14px]">
          <PriceRoll value={p.price} direction={direction} />
        </div>
      </div>
    );
  });
}

/** 将价格格式化成 $1,234.56 的字符串，返回不带 $ 的数字部分与符号 */
function toUSDParts(n: number): { sign: string; digits: string } {
  if (!Number.isFinite(n)) return { sign: "", digits: "0" };
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const s = abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return { sign, digits: s };
}

function PriceRoll({ value, direction }: { value: number; direction: "up" | "down" | "none" }) {
  const { sign, digits } = toUSDParts(value);
  return (
    <span className="inline-flex items-baseline">
      <span style={{ color: "var(--foreground)" }}>$</span>
      {sign && <span style={{ color: "var(--foreground)" }}>{sign}</span>}
      <DigitRoll text={digits} direction={direction} />
    </span>
  );
}

/**
 * 逐位数字滚轮：仅对 [0-9] 做滚动；逗号和小数点直接静态渲染。
 */
function DigitRoll({ text, direction }: { text: string; direction: "up" | "down" | "none" }) {
  return (
    <span className="inline-flex items-baseline">
      {Array.from(text).map((ch, idx) => {
        if (/[0-9]/.test(ch)) {
          return <DigitWheel key={idx} digit={Number(ch)} direction={direction} />;
        }
        return (
          <span key={idx} style={{ color: "var(--foreground)" }}>
            {ch}
          </span>
        );
      })}
    </span>
  );
}

function DigitWheel({ digit, direction }: { digit: number; direction: "up" | "down" | "none" }) {
  // 单位高度 1em，通过 translateY(-digit*1em) 定位；方向仅影响过渡曲线
  const translate = `translateY(${-digit}em)`;
  const ease = direction === "up" ? "cubic-bezier(0.2,0.6,0.2,1)" : direction === "down" ? "cubic-bezier(0.2,0,0.2,1)" : "ease";
  return (
    <span
      aria-hidden
      className="relative inline-flex overflow-hidden"
      style={{ height: "1em", width: "0.62em", lineHeight: 1, justifyContent: "center" }}
    >
      <span
        className="inline-flex flex-col"
        style={{ transform: translate, transition: `transform 260ms ${ease}` }}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className="leading-none" style={{ color: "var(--foreground)", height: "1em" }}>
            {i}
          </span>
        ))}
      </span>
    </span>
  );
}
