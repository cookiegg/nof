"use client";
import { getModelColor, getModelIcon } from "@/lib/model/meta";

function darken(hex: string, amount = 0.15): string {
  // expects #rrggbb
  if (!/^#([0-9a-f]{6})$/i.test(hex)) return hex;
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.max(0, Math.min(255, Math.round(r * (1 - amount))));
  g = Math.max(0, Math.min(255, Math.round(g * (1 - amount))));
  b = Math.max(0, Math.min(255, Math.round(b * (1 - amount))));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function ModelLogoChip({
  modelId,
  size = "sm",
}: {
  modelId: string;
  size?: "sm" | "md" | number;
}) {
  const color = getModelColor(modelId) || "#a1a1aa";
  const icon = getModelIcon(modelId);
  const px = typeof size === "number" ? size : size === "md" ? 20 : 16;
  const radius = 6;
  const ring = darken(color, 0.15);
  const style: React.CSSProperties = {
    width: px,
    height: px,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: color,
    border: `1px solid ${ring}`,
    borderRadius: radius,
    overflow: "hidden",
  };
  if (!icon)
    return (
      <span
        style={{ ...style, borderRadius: Math.max(6, Math.floor(px / 2)) }}
      />
    );
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <span style={style}>
      <img
        src={icon}
        alt=""
        width={px - 2}
        height={px - 2}
        style={{ objectFit: "contain" }}
      />
    </span>
  );
}

export default ModelLogoChip;
