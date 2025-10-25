"use client";

import Link from "next/link";
import { useTheme } from "@/store/useTheme";

export function Header() {
  const theme = useTheme((s) => s.theme);
  const resolved = useTheme((s) => s.resolved);
  const setTheme = useTheme((s) => s.setTheme);
  const barCls = `sticky top-0 z-50 w-full border-b backdrop-blur`;
  const textCls = "";
  const hoverLink = "";
  const brandCls = "";

  return (
    <header
      className={barCls}
      style={{
        background: "var(--header-bg)",
        borderColor: "var(--header-border)",
      }}
    >
      <div
        className={`ui-sans flex h-[var(--header-h)] w-full items-center justify-between px-3 text-xs`}
        style={{ color: "var(--foreground)" }}
      >
        <Link
          href="/"
          className={`font-semibold tracking-wide ui-sans`}
          style={{ color: "var(--brand-accent)" }}
        >
          nof0
        </Link>
        <nav className="ui-sans flex items-center gap-4 sm:gap-6">
          <Link href="/" className={hoverLink} style={{ color: "inherit" }}>
            实盘
          </Link>
          <Link
            href="/leaderboard"
            className={hoverLink}
            style={{ color: "inherit" }}
          >
            排行榜
          </Link>
          <span
            title="待开发"
            aria-disabled
            className={`cursor-not-allowed select-none`}
            style={{ color: "var(--muted-text)" }}
          >
            模型
          </span>
          {/* Theme toggle */}
          <div className="ml-2 hidden sm:flex items-center gap-1 text-[11px]">
            <div
              className={`flex overflow-hidden rounded border`}
              style={{ borderColor: "var(--chip-border)" }}
            >
              {["dark", "light", "system"].map((t) => (
                <button
                  key={t}
                  title={t}
                  className={`px-2 py-1 capitalize chip-btn`}
                  style={
                    theme === t
                      ? {
                          background: "var(--btn-active-bg)",
                          color: "var(--btn-active-fg)",
                        }
                      : { color: "var(--btn-inactive-fg)" }
                  }
                  onClick={() => setTheme(t as any)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Header;
