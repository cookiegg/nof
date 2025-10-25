"use client";

// Compute dominant color for a set of image URLs (same-origin) and cache results.
// Returns a map from key (e.g., model id) to hex string like '#rrggbb'.

import { useEffect, useRef, useState } from "react";

function rgbToHex(r: number, g: number, b: number) {
  const to2 = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export function adjustLuminance(hex: string, amt: number) {
  // amt in [-1, 1]
  try {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return hex;
    const r = parseInt(m[1], 16),
      g = parseInt(m[2], 16),
      b = parseInt(m[3], 16);
    const nr = Math.round(clamp01(r / 255 + amt) * 255);
    const ng = Math.round(clamp01(g / 255 + amt) * 255);
    const nb = Math.round(clamp01(b / 255 + amt) * 255);
    return rgbToHex(nr, ng, nb);
  } catch {
    return hex;
  }
}

export function useDominantColors(
  iconByKey: Record<string, string | undefined>,
) {
  const [colors, setColors] = useState<Record<string, string>>({});
  const cacheRef = useRef<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const entries = Object.entries(iconByKey).filter(([, src]) => !!src) as [
      string,
      string,
    ][];
    entries.forEach(([key, src]) => {
      if (cacheRef.current[src]) {
        setColors((prev) => ({ ...prev, [key]: cacheRef.current[src] }));
        return;
      }
      const img = new Image();
      // Same-origin assets from /public; crossOrigin not required, but keep safe
      (img as any).crossOrigin = "anonymous";
      img.src = src;
      img.onload = () => {
        try {
          const w = 32; // downscale for speed
          const ratio = img.width ? w / img.width : 1;
          const h = Math.max(1, Math.round(img.height * ratio));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.min(64, w));
          canvas.height = Math.max(1, Math.min(64, h));
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) throw new Error("no ctx");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let r = 0,
            g = 0,
            b = 0,
            n = 0;
          for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (a < 150) continue; // ignore transparent/sem-transparent
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            n++;
          }
          const hex = n
            ? rgbToHex(Math.round(r / n), Math.round(g / n), Math.round(b / n))
            : "#888888";
          cacheRef.current[src] = hex;
          if (!cancelled) setColors((prev) => ({ ...prev, [key]: hex }));
        } catch {
          // ignore
        }
      };
      img.onerror = () => {
        // ignore
      };
    });
    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(iconByKey)]);

  return colors;
}
