"use client";
import { useConversations } from "@/lib/api/hooks/useConversations";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCachedTranslation, setCachedTranslation, simpleHash } from "@/lib/translate/cache";
import { getModelName, getModelColor, getModelMeta } from "@/lib/model/meta";
// theme handled via CSS variables
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ModelChatPanel() {
  const { items, isLoading, isError } = useConversations();
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const qModel = (search.get("model") || "ALL").trim();
  // use CSS variables for colors instead of theme branching

  // Group conversations by model, sorted by time desc
  const grouped = useMemo(() => {
    const by: Record<string, any[]> = {};
    for (const it of items) {
      const id = (it as any).model_id;
      if (!id) continue;
      const ts = (it as any).timestamp || (it as any).inserted_at || 0;
      const content = (it as any).cot_trace_summary || (it as any).summary || "";
      const user_prompt = (it as any).user_prompt || "";
      const cot_trace = (it as any).cot_trace || {};
      const llm_response = (it as any).llm_response || {};
      (by[id] ||= []).push({ model_id: id, timestamp: ts, content, user_prompt, cot_trace, llm_response });
    }
    for (const k of Object.keys(by)) {
      by[k].sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    }
    return by;
  }, [items]);

  const list = useMemo(() => {
    const ids = Object.keys(grouped).filter((id) => (qModel === "ALL" ? true : id === qModel));
    ids.sort((a, b) => getModelName(a).localeCompare(getModelName(b)));
    return ids.map((id) => ({ model_id: id, latest: grouped[id][0], history: grouped[id].slice(1) }));
  }, [grouped, qModel]);

  // Prefetch translation for latest-only when content seems English
  const needTranslate: { key: string; text: string }[] = [];
  for (const row of list) {
    const txt = String(row.latest?.content || "");
    const hasCJK = /[\u4e00-\u9fa5]/.test(txt);
    if (!hasCJK && txt.trim()) {
      const tkey = `${row.model_id}:${simpleHash(txt.slice(0, 4096))}`;
      if (typeof window !== 'undefined' && !getCachedTranslation(tkey)) {
        needTranslate.push({ key: tkey, text: txt.slice(0, 8000) });
      }
    }
  }
  const processed = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!needTranslate.length || typeof window === 'undefined') return;
    // global disable flag if backend not configured/rate-limited
    const g: any = window as any;
    if (g.__translateDisabled) return;
    let cancelled = false;
    (async () => {
      for (const it of needTranslate) {
        if (cancelled) break;
        if (processed.current.has(it.key)) continue;
        processed.current.add(it.key);
        try {
          const res = await fetch('/api/translate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: it.text, key: it.key }) });
          if (!res.ok) {
            // disable further attempts in this session to avoid spamming when not configured
            g.__translateDisabled = true;
            break;
          }
          const j = await res.json();
          if (j?.disabled) { g.__translateDisabled = true; break; }
          const zh = j?.translation as string | undefined;
          if (zh) setCachedTranslation(it.key, zh);
        } catch {
          g.__translateDisabled = true;
          break;
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(needTranslate.map((x) => x.key))]);

  if (isLoading) return <div className={`text-xs`} style={{ color: 'var(--muted-text)' }}>加载模型对话中…</div>;
  if (isError) return <div className={`text-xs`} style={{ color: 'red' }}>模型对话接口暂不可用，请稍后重试。</div>;
  if (!list.length) return <div className={`text-xs`} style={{ color: 'var(--muted-text)' }}>暂无模型对话。</div>;

  return (
    <div className="space-y-3">
      <FilterBar model={qModel} onChange={(v) => setModel(v)} models={["ALL", ...Object.keys(grouped)]} />
      {list.map((row) => (
        <ChatCard
          key={row.model_id}
          modelId={row.model_id}
          content={row.latest?.content}
          timestamp={row.latest?.timestamp}
          user_prompt={row.latest?.user_prompt}
          cot_trace={row.latest?.cot_trace}
          llm_response={row.latest?.llm_response}
          history={row.history}
        />
      ))}
    </div>
  );

  function setModel(v: string) {
    const params = new URLSearchParams(search.toString());
    if (!v || v === "ALL") params.delete("model"); else params.set("model", v);
    router.replace(`${pathname}?${params.toString()}`);
  }
}

function fmtTime(t?: number | string) {
  if (!t) return "";
  const n = typeof t === "string" ? Number(t) : t;
  const ms = n > 1e12 ? n : n * 1000;
  const d = new Date(ms);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function FilterBar({ model, onChange, models }: { model: string; onChange: (v: string) => void; models: string[] }) {
  // theme vars only
  const uniq = Array.from(new Set(models));
  return (
    <div className="mb-1 flex items-center gap-2 text-[12px]" style={{ color: 'var(--muted-text)' }}>
      <span className={`font-semibold tracking-wide`}>FILTER:</span>
      <select className={`rounded border px-2 py-1 text-xs`} style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--foreground)' }} value={model} onChange={(e) => onChange(e.target.value)}>
        {uniq.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}

function ChatCard({ modelId, content, timestamp, user_prompt, cot_trace, llm_response, history }:
  { modelId: string; content?: string; timestamp?: number | string; user_prompt?: string; cot_trace?: any; llm_response?: any; history?: any[] }) {
  const color = getModelColor(modelId);
  const [open, setOpen] = useState(false);
  const [openHist, setOpenHist] = useState<Record<string, boolean>>({});

  const tkey = `${modelId}:${simpleHash(String(content || '').slice(0, 4096))}`;
  const translated = typeof window !== 'undefined' ? getCachedTranslation(tkey) : undefined;
  const [showZh, setShowZh] = useState<boolean>(true);
  return (
    <div className="relative pl-8">
      {/* left icon column */}
      <div className="absolute left-0 top-1">
        {getModelMeta(modelId).icon ? (
          <img src={getModelMeta(modelId).icon!} alt="" className="h-5 w-5 rounded-sm object-contain" />
        ) : (
          <span style={{ color }} className="text-lg leading-none">✦</span>
        )}
      </div>

      {/* header line: model name + timestamp */}
      <div className="mb-2 flex items-center justify-between">
        <div className={`text-sm font-extrabold uppercase tracking-wide`} style={{ color }}>{getModelName(modelId)}</div>
        <div className={`text-[11px] tabular-nums`} style={{ color: 'var(--muted-text)' }}>{fmtTime(timestamp)}</div>
      </div>

      {/* bubble */}
      <div className="relative rounded-md border px-3 py-2"
           style={{ borderColor: `${color}66`, background: `linear-gradient(0deg, ${color}10, var(--panel-bg))` }}>
        <div className={`whitespace-pre-wrap text-[13px] leading-6`}
             style={{ color: 'var(--foreground)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
          {showZh && translated ? translated : (content || "(no summary)")}
        </div>
        <button className={`absolute bottom-0 right-0 translate-y-5 text-[11px] italic`}
                style={{ color: 'var(--muted-text)' }} onClick={() => setOpen(!open)}>
          {open ? "click to collapse" : "click to expand"}
        </button>
        {translated && (
          <button className={`absolute bottom-0 left-0 translate-y-5 text-[11px]`}
                  style={{ color: 'var(--muted-text)' }} onClick={() => setShowZh((v) => !v)}>
            {showZh ? "显示原文" : "显示中文"}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-3 text-[12px]">
          <Section title="USER_PROMPT">
            <MarkdownBlock text={user_prompt} />
          </Section>
          <Section title="CHAIN_OF_THOUGHT">
            {typeof cot_trace === 'string' ? (
              <MarkdownBlock text={cot_trace} />
            ) : (
              <pre className={`whitespace-pre-wrap`} style={{ color: 'var(--foreground)' }}>{formatCot(cot_trace)}</pre>
            )}
          </Section>
          <Section title="TRADING_DECISIONS">
            {renderDecisions(llm_response)}
          </Section>
        </div>
      )}

      {!!history?.length && (
        <div className="mt-4">
          <div className={`mb-1 text-[11px] font-semibold`} style={{ color: 'var(--muted-text)' }}>历史对话</div>
          <div className="space-y-2">
            {history.slice(0, 5).map((h, idx) => {
              const key = String(h.timestamp || idx);
              const isOpen = !!openHist[key];
              return (
                <div key={key} className={`rounded border p-2`} style={{ borderColor: 'var(--panel-border)' }}>
                  <div className={`mb-1 flex items-center justify-between text-[11px]`} style={{ color: 'var(--muted-text)' }}>
                    <span>{fmtTime(h.timestamp)}</span>
                    <button className={`text-[11px] italic`} style={{ color: 'var(--muted-text)' }} onClick={() => setOpenHist({ ...openHist, [key]: !isOpen })}>
                      {isOpen ? "collapse" : "click to expand"}
                    </button>
                  </div>
                  {isOpen && (
                    <div className="space-y-2">
                      <Section title="USER_PROMPT"><MarkdownBlock text={h.user_prompt} /></Section>
                      <Section title="CHAIN_OF_THOUGHT">{typeof h.cot_trace === 'string' ? <MarkdownBlock text={h.cot_trace} /> : <pre className="whitespace-pre-wrap" style={{ color: 'var(--foreground)' }}>{formatCot(h.cot_trace)}</pre>}</Section>
                      <Section title="TRADING_DECISIONS">{renderDecisions(h.llm_response)}</Section>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--muted-text)' }}>▼ {title}</div>
      <div className="rounded border p-2" style={{ borderColor: 'var(--panel-border)' }}>{children}</div>
    </div>
  );
}

function formatCot(cot: any) {
  try {
    return JSON.stringify(cot ?? {}, null, 2);
  } catch {
    return String(cot ?? "—");
  }
}

function renderDecisions(resp: any) {
  const rows = [] as any[];
  if (resp && typeof resp === "object") {
    for (const [coin, v] of Object.entries(resp as Record<string, any>)) {
      rows.push({
        coin,
        signal: (v as any).signal,
        leverage: (v as any).leverage,
        target: (v as any).profit_target,
        stop: (v as any).stop_loss,
        risk: (v as any).risk_usd,
        invalid: (v as any).invalidation_condition,
        confidence: (v as any).confidence,
        quantity: (v as any).quantity,
      });
    }
  }
  if (!rows.length) return <div style={{ color: 'var(--muted-text)' }}>—</div>;
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between rounded border px-3 py-2"
             style={{ borderColor: 'var(--panel-border)', color: 'var(--foreground)' }}>
          <div className="min-w-0">
            <div className="text-sm font-semibold uppercase tracking-wide">{String(r.coin || '').toUpperCase()}</div>
            <div className="text-[11px] tabular-nums" style={{ color: 'var(--muted-text)' }}>QUANTITY: {r.quantity ?? '—'}</div>
          </div>
          <div>
            <span className="rounded border px-2 py-0.5 text-[11px] font-semibold"
                  style={{ borderColor: 'color-mix(in oklab, var(--panel-border) 70%, transparent)', color: '#4f46e5', background: 'color-mix(in oklab, #4f46e5 10%, transparent)' }}>
              {String(r.signal || '—').toUpperCase()} {r.confidence != null ? `${Math.round(r.confidence * 100)}%` : ''}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
