"use client";

import Link from "next/link";
import { useTheme } from "@/store/useTheme";

export function Header() {
  const theme = useTheme((s) => s.theme);
  const resolved = useTheme((s) => s.resolved);
  const setTheme = useTheme((s) => s.setTheme);
  const isDark = resolved === "dark";
  const barCls = `sticky top-0 z-50 w-full border-b ${isDark ? "border-white/10 bg-black/70" : "border-black/10 bg-white/70"} backdrop-blur`;
  const textCls = isDark ? "text-zinc-200" : "text-zinc-700";
  const hoverLink = isDark ? "hover:text-white" : "hover:text-black";
  const brandCls = isDark ? "text-purple-300" : "text-purple-600";

  return (
    <header className={barCls}>
      <div className={`flex h-[var(--header-h)] w-full items-center justify-between px-3 text-xs ${textCls}`}>
        <Link href="/" className={`font-semibold tracking-wide ${brandCls}`}>
          nof0
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className={hoverLink}>
            实盘
          </Link>
          <Link href="/leaderboard" className={hoverLink}>
            排行榜
          </Link>
          <span
            title="待开发"
            aria-disabled
            className={`${isDark ? "text-zinc-400" : "text-zinc-500"} cursor-not-allowed select-none`}
          >
            模型
          </span>
          {/* Theme toggle */}
          <div className="ml-2 hidden sm:flex items-center gap-1 text-[11px]">
            <div className={`flex overflow-hidden rounded border ${isDark ? "border-white/15" : "border-black/15"}`}>
              {["dark","light","system"].map((t) => (
                <button
                  key={t}
                  title={t}
                  className={`px-2 py-1 capitalize ${theme===t ? (isDark?"bg-white/10 text-zinc-100":"bg-black/10 text-zinc-800") : (isDark?"text-zinc-300 hover:bg-white/5":"text-zinc-600 hover:bg-black/5")}`}
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
