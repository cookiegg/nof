"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTheme } from "@/store/useTheme";

export default function TabButton({
  name,
  tabKey,
  disabled = false,
}: {
  name: string;
  tabKey?: string;
  disabled?: boolean;
}) {
  // rely on theme CSS variables
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
        if (tabKey === "positions") params.delete("tab");
        else params.set("tab", tabKey);
        router.replace(`${pathname}?${params.toString()}`);
      }}
      aria-disabled={disabled}
      className={`rounded border px-2 py-1 chip-btn ${disabled ? "cursor-not-allowed" : ""}`}
      style={{
        borderColor: "var(--panel-border)",
        background: disabled
          ? "transparent"
          : active
            ? "var(--btn-active-bg)"
            : "transparent",
        color: disabled
          ? "var(--muted-text)"
          : active
            ? "var(--btn-active-fg)"
            : "var(--btn-inactive-fg)",
      }}
      type="button"
    >
      {name}
    </button>
  );
}
