"use client";

import Link from "next/link";
import { useTheme } from "@/store/useTheme";
import { useLocale } from "@/store/useLocale";

export function Header() {
  const theme = useTheme((s) => s.theme);
  const resolved = useTheme((s) => s.resolved);
  const setTheme = useTheme((s) => s.setTheme);
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  const barCls = `sticky top-0 z-50 w-full border-b backdrop-blur`;
  const textCls = "";
  const hoverLink = "";
  const brandCls = "";

  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);

  return (
    <header
      className={barCls}
      style={{
        background: "var(--header-bg)",
        borderColor: "var(--header-border)",
      }}
    >
      <div
        className={`ui-sans relative flex h-[var(--header-h)] w-full items-center px-3 text-xs`}
        style={{ color: "var(--foreground)", height: "calc(var(--header-h) * 2)" }}
      >
        {/* 左：品牌 */}
        <div className="flex min-w-0 flex-1">
          <Link
            href="/"
            className={`font-semibold tracking-wide ui-sans text-4xl`}
            style={{ color: "var(--brand-accent)" }}
          >
            nof
          </Link>
        </div>

        {/* 中：主导航（绝对居中） */}
        <nav
          className="ui-sans absolute left-1/2 -translate-x-1/2 flex items-center gap-6"
          aria-label="Primary"
        >
          <Link href="/" className={`${hoverLink} text-xl font-medium`} style={{ color: "inherit" }}>
            {t("交易", "Trade")}
          </Link>
          <span aria-hidden="true" className="text-sm" style={{ color: "var(--muted-text)" }}>|</span>
          <Link href="/leaderboard" className={`${hoverLink} text-xl font-medium`} style={{ color: "inherit" }}>
            {t("排行榜", "Leaderboard")}
          </Link>
          <span aria-hidden="true" className="text-sm" style={{ color: "var(--muted-text)" }}>|</span>
          <Link href="/models" className={`${hoverLink} text-xl font-medium`} style={{ color: "inherit" }}>
            {t("bot详情", "Bots")}
          </Link>
        </nav>

        {/* 右：主题与语言切换 */}
        <div className="flex min-w-0 flex-1 justify-end">
          <div className="ml-2 hidden sm:flex items-center gap-2 text-[11px]">
            <div
              className={`flex overflow-hidden rounded border`}
              style={{ borderColor: "var(--chip-border)" }}
            >
              {["dark", "light", "system"].map((tkey) => (
                <button
                  key={tkey}
                  title={tkey}
                  className={`px-2 py-1 capitalize chip-btn`}
                  style={
                    theme === (tkey as any)
                      ? {
                          background: "var(--btn-active-bg)",
                          color: "var(--btn-active-fg)",
                        }
                      : { color: "var(--btn-inactive-fg)" }
                  }
                  onClick={() => setTheme(tkey as any)}
                >
                  {tkey}
                </button>
              ))}
            </div>
            <div
              className={`flex overflow-hidden rounded border`}
              style={{ borderColor: "var(--chip-border)" }}
            >
              {["zh", "en"].map((l) => (
                <button
                  key={l}
                  title={l}
                  className={`px-2 py-1 uppercase chip-btn`}
                  style={
                    locale === l
                      ? {
                          background: "var(--btn-active-bg)",
                          color: "var(--btn-active-fg)",
                        }
                      : { color: "var(--btn-inactive-fg)" }
                  }
                  onClick={() => setLocale(l as any)}
                >
                  {l === "zh" ? "中" : "EN"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
