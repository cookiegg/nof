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
        className={`ui-sans relative flex h-[var(--header-h)] w-full items-center px-3 text-xs`}
        style={{ color: "var(--foreground)" }}
      >
        {/* 左：品牌 */}
        <div className="flex min-w-0 flex-1">
          <Link
            href="/"
            className={`font-semibold tracking-wide ui-sans`}
            style={{ color: "var(--brand-accent)" }}
          >
            nof0
          </Link>
        </div>

        {/* 中：主导航（绝对居中） */}
        <nav
          className="ui-sans absolute left-1/2 -translate-x-1/2 flex items-center gap-6"
          aria-label="Primary"
        >
          <Link href="/" className={hoverLink} style={{ color: "inherit" }}>
            实盘
          </Link>
          <Link href="/leaderboard" className={hoverLink} style={{ color: "inherit" }}>
            排行榜
          </Link>
          <Link href="/models" className={hoverLink} style={{ color: "inherit" }}>
            模型
          </Link>
        </nav>

        {/* 右：主题切换占位，保证中间绝对定位不受挤压 */}
        <div className="flex min-w-0 flex-1 justify-end">
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
        </div>
      </div>
    </header>
  );
}

export default Header;
