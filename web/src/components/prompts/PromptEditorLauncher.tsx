"use client";
import { useState } from "react";
import PromptEditorDialog from "@/components/prompts/PromptEditorDialog";

export default function PromptEditorLauncher() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="rounded px-2 py-1 text-[11px] chip-btn"
        style={{ color: "var(--btn-inactive-fg)", border: "1px solid var(--chip-border)" }}
        onClick={() => setOpen(true)}
        title="编辑交易 Prompts"
      >
        Prompts
      </button>
      <PromptEditorDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}


