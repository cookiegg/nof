"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
import { useLocale } from "@/store/useLocale";

const Markdown = dynamic(() => import("react-markdown").then(m => m.default as any), { 
  ssr: false,
  loading: () => <div className="text-xs" style={{ color: "var(--muted-text)" }}>加载中...</div>
}) as any;

export default function ReadmePanel() {
  const locale = useLocale((s) => s.locale);
  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    // 根据语言选择对应的文件
    const fileName = locale === "en" ? "/INTRO.en.md" : "/INTRO.md";
    fetch(fileName, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((t) => {
        if (mounted) setText(t);
      })
      .catch((e) => {
        if (mounted) {
          setError(t(`无法加载 INTRO.md: ${e.message}`, `Failed to load INTRO.md: ${e.message}`));
          console.error("ReadmePanel fetch error:", e);
        }
      });
    return () => {
      mounted = false;
    };
  }, [locale]);

  if (error) {
    return (
      <div className="text-xs" style={{ color: "var(--danger)" }}>
        {error}
      </div>
    );
  }

  if (!text) {
    return (
      <div className="text-xs" style={{ color: "var(--muted-text)" }}>
        {t("加载中...", "Loading...")}
      </div>
    );
  }

  return (
    <article 
      className="max-w-none text-sm" 
      style={{ 
        color: "var(--foreground)",
        lineHeight: 1.6,
        padding: "0.5rem 0"
      }}
    >
      <Markdown 
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 style={{ fontSize: "1.25rem", fontWeight: "bold", marginTop: "1rem", marginBottom: "0.5rem" }}>{children}</h1>,
          h2: ({ children }) => <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginTop: "0.8rem", marginBottom: "0.4rem" }}>{children}</h2>,
          p: ({ children }) => <p style={{ marginBottom: "0.5rem" }}>{children}</p>,
          ul: ({ children }) => <ul style={{ marginLeft: "1.5rem", marginBottom: "0.5rem", listStyleType: "disc" }}>{children}</ul>,
          li: ({ children }) => <li style={{ marginBottom: "0.25rem" }}>{children}</li>,
          hr: () => <hr style={{ border: "none", borderTop: "1px solid var(--panel-border)", margin: "1rem 0" }} />,
          img: ({ src, alt }) => <img src={src} alt={alt} style={{ maxWidth: "100%", height: "auto", margin: "0.5rem 0" }} />
        }}
      >
        {text}
      </Markdown>
    </article>
  );
}
