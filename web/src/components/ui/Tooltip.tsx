"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

export default function Tooltip({
  content,
  children,
  placement = "top",
  closeable = true,
  closeDelay = 120,
  trackPointer = true,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
  closeable?: boolean;
  closeDelay?: number;
  trackPointer?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const longPress = useRef<any>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const closeTimer = useRef<any>(null);
  const raf = useRef<number | null>(null);
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    try {
      // detect coarse pointer (mobile/touch)
      setCoarse(
        window.matchMedia && window.matchMedia("(pointer: coarse)").matches,
      );
    } catch {}
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current) return;
      const t = e.target as Node;
      if (
        !rootRef.current.contains(t) &&
        (!tipRef.current || !tipRef.current.contains(t as Node))
      )
        setOpen(false);
    };
    document.addEventListener("click", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      if (trackPointer && pointer.current && !coarse) {
        const { x, y } = pointer.current;
        const offset = 18;
        const top = Math.max(6, y - offset);
        const left = Math.min(Math.max(6, x), window.innerWidth - 6);
        setPos({ top, left });
      } else {
        const el = rootRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        let top = 0,
          left = 0;
        switch (placement) {
          case "bottom":
            top = r.bottom + 8;
            left = r.left + r.width / 2;
            break;
          case "left":
            top = r.top + r.height / 2;
            left = r.left - 8;
            break;
          case "right":
            top = r.top + r.height / 2;
            left = r.right + 8;
            break;
          case "top":
          default:
            top = r.top - 8;
            left = r.left + r.width / 2;
        }
        setPos({ top, left });
      }
    };
    update();
    const onScroll = () => update();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, placement, coarse, trackPointer]);

  const transform =
    placement === "left" || placement === "right"
      ? "-translate-y-1/2"
      : "-translate-x-1/2";

  return (
    <span
      ref={rootRef}
      className="relative inline-flex items-center"
      onMouseEnter={(e) => {
        if (trackPointer)
          pointer.current = { x: (e as any).clientX, y: (e as any).clientY };
        setOpen(true);
      }}
      onMouseLeave={() => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setOpen(false), closeDelay);
      }}
      onMouseMove={(e) => {
        if (trackPointer && !coarse) {
          pointer.current = { x: (e as any).clientX, y: (e as any).clientY };
          if (open) {
            if (raf.current) cancelAnimationFrame(raf.current);
            raf.current = requestAnimationFrame(() => {
              const { x, y } = pointer.current!;
              const offset = 18;
              const top = Math.max(6, y - offset);
              const left = Math.min(Math.max(6, x), window.innerWidth - 6);
              setPos({ top, left });
            });
          }
        }
      }}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}
      onTouchStart={() => {
        if (longPress.current) clearTimeout(longPress.current);
        longPress.current = setTimeout(() => setOpen(true), 350);
      }}
      onTouchEnd={() => {
        if (longPress.current) clearTimeout(longPress.current);
      }}
    >
      {children}
      {open &&
        pos &&
        createPortal(
          <>
            {/* 在桌面悬浮模式不渲染遮罩，避免阻挡鼠标；触屏设备保留遮罩用于关闭 */}
            {coarse && (
              <span
                className="fixed inset-0 z-[9998]"
                onClick={() => setOpen(false)}
                onTouchStart={() => setOpen(false)}
              />
            )}
            <div
              ref={tipRef as any}
              className={clsx(
                // 桌面悬浮下禁用指针事件，避免拦截鼠标
                coarse ? "pointer-events-auto" : "pointer-events-none",
                "fixed z-[9999] rounded-md border p-2 text-[11px] shadow-lg",
                transform,
              )}
              style={{
                top: pos.top,
                left: pos.left,
                background: "var(--tooltip-bg)",
                borderColor: "var(--tooltip-border)",
                color: "var(--tooltip-fg)",
                maxWidth: 300,
                whiteSpace: "normal",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
              role="tooltip"
              onMouseLeave={() => {
                if (closeTimer.current) clearTimeout(closeTimer.current);
                closeTimer.current = setTimeout(
                  () => setOpen(false),
                  closeDelay,
                );
              }}
              onMouseEnter={() => {
                if (closeTimer.current) clearTimeout(closeTimer.current);
              }}
            >
              {content}
            </div>
          </>,
          document.body,
        )}
    </span>
  );
}
