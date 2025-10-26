"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useLatestEquityMap } from "@/lib/api/hooks/useModelSnapshots";
import { getModelColor, getModelIcon, getModelName } from "@/lib/model/meta";
import { adjustLuminance } from "@/lib/ui/useDominantColors";
import { fmtUSD } from "@/lib/utils/formatters";

export default function ModelSelectorBar({ activeId }: { activeId?: string }) {
  const { map, isLoading } = useLatestEquityMap();
  const models = useMemo(() => Object.keys(map || {}).sort(), [map]);

  if (isLoading && !models.length) {
    return (
      <div className="text-xs" style={{ color: "var(--muted-text)" }}>
        加载模型列表…
      </div>
    );
  }

  if (!models.length) {
    return (
      <div
        className="rounded-md border p-2 text-xs"
        style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)", color: "var(--muted-text)" }}
      >
        暂无可用模型。
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 小屏横滑，桌面等宽网格；无边框容器，仅按钮 */}
      <div className="block md:hidden">
        <div className="flex flex-nowrap gap-2 overflow-x-auto whitespace-nowrap pr-1" style={{ WebkitOverflowScrolling: "touch" }}>
          {models.map((id) => renderChip(id, activeId, map[id]))}
        </div>
      </div>
      <div className="hidden md:block">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${models.length}, minmax(0, 1fr))` }}
        >
          {models.map((id) => renderChip(id, activeId, map[id]))}
        </div>
      </div>
    </div>
  );
}

function renderChip(id: string, activeId?: string, equity?: number) {
  const active = activeId && id.toLowerCase() === activeId.toLowerCase();
  const icon = getModelIcon(id);
  const color = getModelColor(id);
  // 由于此处无法直接读取 equity map，简单在父组件传入前已排序；这里展示 id 作为回退
  return (
    <Link
      key={id}
      href={`/models/${encodeURIComponent(id)}`}
      className={`w-full inline-flex flex-col items-center justify-center gap-1 rounded border px-2.5 py-2 text-[12px] sm:text-[13px] chip-btn`}
      style={{
        borderColor: "var(--chip-border)",
        background: active ? "var(--btn-active-bg)" : "transparent",
        color: active ? "var(--btn-active-fg)" : "var(--btn-inactive-fg)",
        textDecoration: "none",
      }}
    >
      <div className="flex items-center gap-1 text-[11px] opacity-90">
        {icon ? (
          <span
            className="logo-chip logo-chip-sm"
            style={{ background: color, borderColor: adjustLuminance(color, -0.2) }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={icon} alt="" className="h-3 w-3 object-contain" />
          </span>
        ) : (
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: color }} />
        )}
        <span className="truncate max-w-[12ch] sm:max-w-none">{getModelName(id)}</span>
      </div>
      {/* 次级信息：优先显示净值，回退为模型ID */}
      <div className="text-[11px] tabular-nums" style={{ color: active ? "var(--btn-active-fg)" : "var(--btn-inactive-fg)" }}>
        {typeof equity === "number" ? fmtUSD(equity) : id}
      </div>
    </Link>
  );
}
