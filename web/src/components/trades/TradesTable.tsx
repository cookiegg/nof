"use client";
import { useMemo, useEffect } from "react";
import { useTrades } from "@/lib/api/hooks/useTrades";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { fmtUSD } from "@/lib/utils/formatters";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { getModelName, getModelColor } from "@/lib/model/meta";
import { ModelLogoChip } from "@/components/shared/ModelLogo";
import type { TradeRow } from "@/lib/api/hooks/useTrades";
import { useLocale } from "@/store/useLocale";

export default function TradesTable() {
  const { trades, isLoading, isError } = useTrades();
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = useLocale();
  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);

  // 统一使用 bot_id 作为筛选键，沿用 query 参数名 "model"
  const qModel = (search.get("model") || "ALL").toLowerCase();
  // 若未选择特定bot（model参数缺失或为ALL），默认选中第一个运行中的bot_id
  // 仅在首次挂载时触发一次
  useEffect(() => {
    (async () => {
      try {
        const cur = (search.get('model') || 'ALL').toLowerCase();
        if (!cur || cur === 'all') {
          const res = await fetch('/api/nof1/runtime/bots');
          if (!res.ok) return;
          const j = await res.json();
          const first = Array.isArray(j?.bots) && j.bots.length ? j.bots[0]?.bot_id : null;
          if (first) {
            const params = new URLSearchParams(search.toString());
            params.set('model', first);
            router.replace(`${pathname}?${params.toString()}`);
          }
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const all = useMemo(() => {
    const arr = [...trades];
    arr.sort(
      (a, b) =>
        Number(b.exit_time || b.entry_time) -
        Number(a.exit_time || a.entry_time),
    );
    // show last 100 by default to match screenshot
    return arr.slice(0, 100);
  }, [trades]);

  const rows = useMemo(() => {
    return all.filter((t) => {
      if (qModel === "all") return true;
      // 统一使用 bot_id 进行过滤；向后兼容：若无 bot_id 则退化到 model_id
      const bid = ((t as any).bot_id || t.model_id || "").toLowerCase();
      return bid === qModel;
    });
  }, [all, qModel]);

  const models = useMemo(() => {
    // 统一使用 bot_id 作为选项；向后兼容：若无 bot_id 则退化到 model_id
    const ids = Array.from(
      new Set(trades.map((t) => (t as any).bot_id || t.model_id))
    ).filter(Boolean) as string[];
    return ids.sort((a, b) => a.localeCompare(b));
  }, [trades]);

  return (
    <div
      className={`rounded-md border terminal-text text-[13px] sm:text-xs leading-relaxed`}
      style={{
        background: "var(--panel-bg)",
        borderColor: "var(--panel-border)",
      }}
    >
      {/* Header: filter + count */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: "var(--panel-border)" }}
      >
        <div
          className="flex items-center gap-2 text-sm ui-sans"
          style={{ color: "var(--foreground)" }}
        >
          <span
            className="font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {t("筛选：", "Filter:")}
          </span>
          <select
            className="rounded border px-2 py-1 text-xs"
            style={{
              background: "var(--panel-bg)",
              borderColor: "var(--panel-border)",
              color: "var(--foreground)",
            }}
            value={search.get("model") || "ALL"}
            onChange={(e) => setQuery("model", e.target.value)}
          >
            <option value="ALL">{t("全部 Bot", "All Bots")}</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div
          className="text-xs font-semibold tabular-nums ui-sans"
          style={{ color: "var(--muted-text)" }}
        >
          {t("展示最近 100 笔成交", "Showing latest 100 trades")}
        </div>
      </div>

      <ErrorBanner
        message={isError ? t("成交记录数据源暂时不可用，请稍后重试。", "Trade data source temporarily unavailable, please try again later.") : undefined}
      />

      {/* List */}
      <div
        className="divide-y"
        style={{
          borderColor:
            "color-mix(in oklab, var(--panel-border) 50%, transparent)",
        }}
      >
        {isLoading ? (
          <div className="p-3">
            <SkeletonRow cols={6} />
            <SkeletonRow cols={6} />
            <SkeletonRow cols={6} />
          </div>
        ) : rows.length ? (
          rows.map((t, idx) => (
            <TradeItem
              key={
                (t as any).id ??
                `${(t as any).bot_id || t.model_id || 'default'}-${(t.symbol || 'sym').toUpperCase()}-${t.side || 'side'}-${
                  t.exit_time || t.entry_time || 'time'
                }-${idx}`
              }
              t={t}
            />
          ))
        ) : (
          <div className="p-3 text-xs" style={{ color: "var(--muted-text)" }}>
            {t("暂无数据", "No data")}
          </div>
        )}
      </div>
    </div>
  );

  function setQuery(k: string, v: string) {
    const params = new URLSearchParams(search.toString());
    if (v === "ALL") params.delete(k);
    else params.set(k, v);
    router.replace(`${pathname}?${params.toString()}`);
  }
}

function TradeItem({ t: trade }: { t: TradeRow }) {
  const { locale } = useLocale();
  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);
  const sideColor = trade.side === "long" ? "#16a34a" : "#ef4444"; // green-600 / red-500
  const modelColor = getModelColor(trade.model_id || "");
  const symbol = (trade.symbol || "").toUpperCase();
  const qty = trade.quantity;
  const absQty = Math.abs(qty ?? 0);
  const entry = trade.entry_price;
  const exit = trade.exit_price;
  const notionalIn = absQty * (entry ?? 0);
  const notionalOut = absQty * (exit ?? 0);
  const hold = humanHold(trade.entry_time, trade.exit_time, locale);
  const when = humanTime(trade.exit_time || trade.entry_time);

  return (
    <div className="px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className="mb-1 terminal-text text-[13px] sm:text-xs leading-relaxed"
            style={{ color: "var(--foreground)" }}
          >
            <span className="mr-1 align-middle">
              <ModelLogoChip modelId={(trade as any).bot_id || trade.model_id} size="sm" />
            </span>
            <b style={{ color: modelColor }}>{(trade as any).bot_id || trade.model_id}</b>
            <span> {t("完成了一笔", "completed a")} </span>
            <b style={{ color: sideColor }}>{sideZh(trade.side, locale)}</b>
            <span> {t("交易，标的", "trade on")} </span>
            <span className="inline-flex items-center gap-1 font-semibold">
              <CoinIcon symbol={symbol} />
              <span>{symbol}!</span>
            </span>
          </div>
        </div>
        <div
          className="text-xs whitespace-nowrap tabular-nums"
          style={{ color: "var(--muted-text)" }}
        >
          {when}
        </div>
      </div>

      <div
        className="mt-1 grid grid-cols-1 gap-0.5 text-[13px] sm:text-xs leading-relaxed sm:grid-cols-2"
        style={{ color: "var(--foreground)" }}
      >
        <div>
          {t("价格：", "Price:")}{fmtPrice(entry)} → {fmtPrice(exit)}
        </div>
        <div>
          {t("数量：", "Quantity:")}<span className="tabular-nums">{fmtNumber(qty, 2)}</span>
        </div>
        <div>
          {t("名义金额：", "Notional:")}{fmtUSD(notionalIn)} → {fmtUSD(notionalOut)}
        </div>
        <div>{t("持有时长：", "Holding:")}{hold}</div>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span
          className="ui-sans text-[12px] sm:text-sm"
          style={{ color: "var(--muted-text)" }}
        >
          {t("净盈亏：", "Net P&L:")}
        </span>
        <span
          className="terminal-text tabular-nums text-[13px] sm:text-sm font-semibold"
          style={{ color: pnlColor(trade.realized_net_pnl) }}
        >
          {fmtUSD(trade.realized_net_pnl)}
        </span>
      </div>
    </div>
  );
}

function CoinIcon({ symbol }: { symbol: string }) {
  const src = coinSrc(symbol);
  if (!src) return <span className="inline-block text-[12px]">{symbol}</span>;
  return (
    <span className="logo-chip logo-chip-md overflow-hidden">
      {/* use img to keep it simple; public/ path is already safe */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={symbol} width={16} height={16} />
    </span>
  );
}

function coinSrc(symbol: string): string | undefined {
  const k = symbol.toUpperCase();
  switch (k) {
    case "BTC":
      return "/coins/btc.svg";
    case "ETH":
      return "/coins/eth.svg";
    case "SOL":
      return "/coins/sol.svg";
    case "BNB":
      return "/coins/bnb.svg";
    case "DOGE":
      return "/coins/doge.svg";
    case "XRP":
      return "/coins/xrp.svg";
    default:
      return undefined;
  }
}

function pnlColor(n?: number | null) {
  if (n == null || Number.isNaN(n)) return "var(--muted-text)";
  return n > 0 ? "#22c55e" : n < 0 ? "#ef4444" : "var(--muted-text)";
}

function humanTime(sec?: number) {
  if (!sec) return "--";
  const d = new Date(sec > 1e12 ? sec : sec * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function humanHold(entry?: number, exit?: number, locale: "zh" | "en" = "zh") {
  if (!entry) return "—";
  const a = entry > 1e12 ? entry : entry * 1000;
  const b = exit ? (exit > 1e12 ? exit : exit * 1000) : Date.now();
  const ms = Math.max(0, b - a);
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (locale === "en") {
    return h ? `${h}h ${mm}m` : `${mm}m`;
  }
  return h ? `${h}小时${mm}分` : `${mm}分`;
}

function fmtPrice(n?: number | null) {
  if (n == null || Number.isNaN(n)) return "--";
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 1 : abs >= 100 ? 2 : abs >= 1 ? 4 : 5;
  return `$${n.toFixed(digits)}`;
}

function fmtNumber(n?: number | null, digits = 2) {
  if (n == null || Number.isNaN(n)) return "--";
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${sign}${v}`;
}

function sideZh(s?: string, locale: "zh" | "en" = "zh") {
  if (locale === "en") {
    return s === "long" ? "Long" : s === "short" ? "Short" : String(s ?? "—");
  }
  return s === "long" ? "做多" : s === "short" ? "做空" : String(s ?? "—");
}
