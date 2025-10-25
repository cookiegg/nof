export type ModelMeta = {
  id: string;
  name: string;
  color: string;
  icon?: string; // future use
};

const DEFAULT_COLOR = "#a1a1aa";

// Global brand color registry (RGB specified by user)
export const BRAND_COLORS: Record<string, string> = {
  // canonical ids
  "qwen3-max": "#8b5cf6", // rgb(139, 92, 246)
  "deepseek-chat-v3.1": "#4d6bfe", // rgb(77, 107, 254)
  "claude-sonnet-4-5": "#ff6b35", // rgb(255, 107, 53)
  "grok-4": "#000000", // rgb(0, 0, 0)
  "gemini-2-5-pro": "#4285f4", // rgb(66, 133, 244)
  "gpt-5": "#10a37f", // rgb(16, 163, 127)
  // common aliases for convenience
  qwen: "#8b5cf6",
  deepseek: "#4d6bfe",
  "claude sonnet": "#ff6b35",
  "claude-sonnet": "#ff6b35",
  grok: "#000000",
  gemini: "#4285f4",
  gpt5: "#10a37f",
};

// Alias -> canonical id map, for consistent icon/name/color resolution
const MODEL_ALIASES: Record<string, string> = {
  qwen: "qwen3-max",
  deepseek: "deepseek-chat-v3.1",
  "claude sonnet": "claude-sonnet-4-5",
  "claude-sonnet": "claude-sonnet-4-5",
  grok: "grok-4",
  grok4: "grok-4",
  gemini: "gemini-2-5-pro",
  gpt5: "gpt-5",
};

function normalizeId(id: string): string {
  return id
    .toLowerCase()
    .trim()
    .replace(/[\s._]+/g, "-")
    .replace(/-+/g, "-");
}

function resolveCanonicalId(id: string): string | undefined {
  if (!id) return undefined;
  const raw = id;
  const lower = id.toLowerCase();
  const norm = normalizeId(id);

  // 1) exact canonical
  if (METAS[raw]) return raw;
  if (METAS[norm]) return norm;

  // 2) alias table
  if (MODEL_ALIASES[lower]) return MODEL_ALIASES[lower];
  if (MODEL_ALIASES[norm]) return MODEL_ALIASES[norm];

  // 3) common punctuation variants
  const dotToDash = lower.replace(/[._]+/g, "-");
  if (MODEL_ALIASES[dotToDash]) return MODEL_ALIASES[dotToDash];

  // 4) heuristic contains matching
  if (lower.includes("gemini")) return "gemini-2-5-pro";
  if (lower.includes("grok")) return "grok-4";
  if (lower.includes("deepseek")) return "deepseek-chat-v3.1";
  if (/(claude).*?(sonnet)/.test(lower) || lower.includes("sonnet"))
    return "claude-sonnet-4-5";
  if (lower.includes("qwen")) return "qwen3-max";
  if (/gpt[- ]?5|gpt5/.test(lower)) return "gpt-5";

  return undefined;
}

const METAS: Record<string, ModelMeta> = {
  "gpt-5": {
    id: "gpt-5",
    name: "GPT‑5",
    color: BRAND_COLORS["gpt-5"],
    icon: "/logos_white/GPT_logo.png",
  },
  "claude-sonnet-4-5": {
    id: "claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    color: BRAND_COLORS["claude-sonnet-4-5"],
    icon: "/logos_white/Claude_logo.png",
  },
  "deepseek-chat-v3.1": {
    id: "deepseek-chat-v3.1",
    name: "DeepSeek v3.1",
    color: BRAND_COLORS["deepseek-chat-v3.1"],
    icon: "/logos_white/deepseek_logo.png",
  },
  "gemini-2-5-pro": {
    id: "gemini-2-5-pro",
    name: "Gemini 2.5 Pro",
    color: BRAND_COLORS["gemini-2-5-pro"],
    icon: "/logos_white/Gemini_logo.webp",
  },
  "grok-4": {
    id: "grok-4",
    name: "Grok 4",
    color: BRAND_COLORS["grok-4"],
    icon: "/logos_white/Grok_logo.webp",
  },
  "qwen3-max": {
    id: "qwen3-max",
    name: "Qwen3 Max",
    color: BRAND_COLORS["qwen3-max"],
    icon: "/logos_white/qwen_logo.png",
  },
  buynhold_btc: {
    id: "buynhold_btc",
    name: "Buy&Hold BTC",
    color: "#a3e635",
    icon: "/logos_white/btc.png",
  },
};

function resolveBrandColor(id: string): string | undefined {
  if (!id) return undefined;
  if (BRAND_COLORS[id]) return BRAND_COLORS[id];
  const key = id.toLowerCase();
  if (BRAND_COLORS[key]) return BRAND_COLORS[key];
  const canon = MODEL_ALIASES[key];
  if (canon && BRAND_COLORS[canon]) return BRAND_COLORS[canon];
  const heur = resolveCanonicalId(id);
  if (heur && BRAND_COLORS[heur]) return BRAND_COLORS[heur];
  return undefined;
}

export function getModelMeta(id: string): ModelMeta {
  if (METAS[id]) return METAS[id];
  const canon = resolveCanonicalId(id);
  if (canon && METAS[canon]) {
    const base = METAS[canon];
    return { ...base, id };
  }
  const brand = resolveBrandColor(id);
  return { id, name: id, color: brand ?? DEFAULT_COLOR };
}

export function getModelColor(id: string): string {
  const meta = getModelMeta(id);
  return meta.color || resolveBrandColor(id) || DEFAULT_COLOR;
}

export function getModelName(id: string): string {
  return getModelMeta(id).name;
}

export { resolveCanonicalId };

export function getModelIcon(id: string): string | undefined {
  return getModelMeta(id).icon;
}
