"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";

export default function PromptEditorDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const canSave = !saving && (systemPrompt.length >= 0 || userPrompt.length >= 0);

  useEffect(() => {
    if (!open) return;
    let abort = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch("/api/nof1/ai/prompts", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!abort) {
          setSystemPrompt(String(j.system || ""));
          setUserPrompt(String(j.user || ""));
        }
      } catch (e: any) {
        if (!abort) setErr(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [open]);

  async function onSave() {
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch("/api/nof1/ai/prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      onClose();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="编辑 Prompts">
      {loading ? (
        <div className="text-xs text-zinc-500">加载中…</div>
      ) : (
        <div className="flex flex-col gap-3">
          {err && (
            <div className="rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--chip-border)", color: "var(--danger)" }}>
              {err}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs" style={{ color: "var(--muted-text)" }}>System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-28 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs" style={{ color: "var(--muted-text)" }}>User Prompt</label>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full h-40 rounded border p-2 text-xs"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)", color: "var(--foreground)" }}
            />
          </div>
          <div className="flex items-center justify-end gap-2 text-xs">
            <button className="rounded px-2 py-1 chip-btn" style={{ color: "var(--muted-text)" }} onClick={onClose}>取消</button>
            <button
              disabled={!canSave}
              className="rounded px-2 py-1 chip-btn"
              style={canSave ? { background: "var(--btn-active-bg)", color: "var(--btn-active-fg)" } : { color: "var(--btn-inactive-fg)" }}
              onClick={onSave}
            >{saving ? '保存中…' : '保存'}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}


