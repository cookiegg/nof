"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useTheme } from "@/store/useTheme";
import { useLocale } from "@/store/useLocale";

const SIDES = ["ALL", "LONG", "SHORT"] as const;

export default function PositionsFilter({
  models,
  symbols,
}: {
  models: string[];
  symbols: string[];
}) {
  // Use CSS variables in styles instead of theme branching
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = useLocale();
  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);

  const model = search.get("model") || "ALL";
  const symbol = search.get("symbol") || "ALL";
  const side = search.get("side") || "ALL";

  const modelOptions = useMemo(() => ["ALL", ...models], [models]);
  const symbolOptions = useMemo(() => ["ALL", ...symbols], [symbols]);
  
  const sideOptions = useMemo(() => {
    return SIDES.map((s) => {
      if (s === "ALL") return s;
      if (s === "LONG") return locale === "zh" ? "做多" : "LONG";
      if (s === "SHORT") return locale === "zh" ? "做空" : "SHORT";
      return s;
    });
  }, [locale]);

  function setQuery(next: Record<string, string>) {
    const params = new URLSearchParams(search.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === "ALL") params.delete(k);
      else params.set(k, v);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  const displaySide = useMemo(() => {
    if (side === "ALL") return "ALL";
    if (side === "LONG") return locale === "zh" ? "做多" : "LONG";
    if (side === "SHORT") return locale === "zh" ? "做空" : "SHORT";
    return side;
  }, [side, locale]);

  return (
    <div
      className={`mb-2 flex flex-wrap items-center gap-2 text-[11px]`}
      style={{ color: "var(--muted-text)" }}
    >
      <Select
        label={t("模型", "Model")}
        value={model}
        options={modelOptions}
        onChange={(v) => setQuery({ model: v })}
      />
      <Select
        label={t("币种", "Symbol")}
        value={symbol}
        options={symbolOptions}
        onChange={(v) => setQuery({ symbol: v })}
      />
      <Select
        label={t("方向", "Side")}
        value={displaySide}
        options={sideOptions}
        onChange={(v) => {
          // Convert display value back to internal value
          const internalValue = v === "ALL" ? "ALL" 
            : (v === (locale === "zh" ? "做多" : "LONG") ? "LONG" 
            : (v === (locale === "zh" ? "做空" : "SHORT") ? "SHORT" : v));
          setQuery({ side: internalValue });
        }}
      />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-1">
      <span style={{ color: "var(--muted-text)" }}>{label}</span>
      <select
        className={`rounded border px-2 py-1 text-xs`}
        style={{
          borderColor: "var(--panel-border)",
          background: "var(--panel-bg)",
          color: "var(--foreground)",
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
