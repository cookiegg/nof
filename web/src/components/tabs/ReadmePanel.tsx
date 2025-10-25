"use client";
import { useEffect, useState } from "react";
import { useTheme } from "@/store/useTheme";

export default function ReadmePanel() {
  // Use CSS variables only
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    fetch("/README.md", { cache: "no-store" })
      .then((r) => r.text())
      .then((t) => mounted && setText(t))
      .catch(() => mounted && setError("无法加载 README.md"));
    return () => {
      mounted = false;
    };
  }, []);

  if (error) return <div className={`text-xs`} style={{ color: 'red' }}>{error}</div>;
  if (!text) return <div className={`text-xs`} style={{ color: 'var(--muted-text)' }}>加载 README.md…</div>;

  return (
    <article className="max-w-none text-sm">
      <pre className={`whitespace-pre-wrap`} style={{ color: 'var(--foreground)' }}>{text}</pre>
    </article>
  );
}
