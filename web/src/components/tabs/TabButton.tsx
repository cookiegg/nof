"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTheme } from "@/store/useTheme";

export default function TabButton({ name, tabKey, disabled = false }: { name: string; tabKey?: string; disabled?: boolean }) {
  const isDark = useTheme((s) => s.resolved) === 'dark';
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = search.get("tab") || "positions";
  const active = tabKey ? tab === tabKey : false;
  return (
    <button
      onClick={() => {
        if (disabled || !tabKey) return;
        const params = new URLSearchParams(search.toString());
        if (tabKey === "positions") params.delete("tab"); else params.set("tab", tabKey);
        router.replace(`${pathname}?${params.toString()}`);
      }}
      aria-disabled={disabled}
      className={`rounded border px-2 py-1 ${
        disabled
          ? (isDark ? "border-white/10 text-zinc-500 cursor-not-allowed" : "border-black/10 text-zinc-400 cursor-not-allowed")
          : active
            ? (isDark?"border-white/20 bg-white/10 text-zinc-100":"border-black/20 bg-black/10 text-zinc-800")
            : (isDark?"border-white/10 text-zinc-300 hover:bg-white/5":"border-black/10 text-zinc-600 hover:bg-black/5")
      }`}
      type="button"
    >
      {name}
    </button>
  );
}
