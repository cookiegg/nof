import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
export const runtime = "nodejs";
import { createHash } from "node:crypto";

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const OPENAI_API_URL =
  process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const AUTH_HEADER = process.env.OPENAI_AUTH_HEADER || "Authorization"; // e.g., "X-API-Key"
const AUTH_SCHEME = process.env.OPENAI_AUTH_SCHEME ?? "Bearer"; // set to "" to omit scheme
const OPENAI_ORG =
  process.env.OPENAI_ORG || process.env.OPENAI_ORGANIZATION || "";
const OPENAI_PROJECT = process.env.OPENAI_PROJECT || "";
let EXTRA_HEADERS: Record<string, string> = {};
try {
  if (process.env.OPENAI_EXTRA_HEADERS)
    EXTRA_HEADERS = JSON.parse(process.env.OPENAI_EXTRA_HEADERS);
} catch {}
let EXTRA_BODY: any = undefined;
try {
  if (process.env.OPENAI_EXTRA_BODY)
    EXTRA_BODY = JSON.parse(process.env.OPENAI_EXTRA_BODY);
} catch {}

type CacheEntry = { v: string; ts: number };
const memCache = new Map<string, CacheEntry>();
const rl = new Map<string, { count: number; ts: number }>();
const WINDOW_MS = 60_000; // 60s
const MAX_REQ = 20; // per ip per window
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

function now() {
  return Date.now();
}
function hashKey(s: string) {
  return createHash("sha256").update(s).digest("base64url").slice(0, 16);
}
function getCached(key: string): string | undefined {
  const e = memCache.get(key);
  if (!e) return undefined;
  if (now() - e.ts > TTL_MS) {
    memCache.delete(key);
    return undefined;
  }
  return e.v;
}
function setCached(key: string, v: string) {
  memCache.set(key, { v, ts: now() });
}

const IS_DEV = process.env.NODE_ENV !== "production";
function redact(val: string) {
  if (!val) return val;
  if (val.length <= 6) return "***";
  return `${val.slice(0, 3)}…${val.slice(-3)}`;
}
function sanitizeHeaders(h: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h)) {
    const low = k.toLowerCase();
    if (
      low.includes("authorization") ||
      low.includes("api-key") ||
      low.includes("token") ||
      low.includes("secret") ||
      k === AUTH_HEADER
    ) {
      out[k] = redact(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    // same-origin guard by Origin/Referer
    const origin = req.headers.get("origin");
    const referer = req.headers.get("referer");
    const selfOrigin = req.nextUrl.origin;
    if (
      (origin && origin !== selfOrigin) ||
      (referer && !referer.startsWith(selfOrigin))
    ) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    // basic rate-limit by ip
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "0.0.0.0";
    const now = Date.now();
    const entry = rl.get(ip) || { count: 0, ts: now };
    if (now - entry.ts > WINDOW_MS) {
      entry.count = 0;
      entry.ts = now;
    }
    entry.count += 1;
    rl.set(ip, entry);
    if (entry.count > MAX_REQ) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const { text, key } = await req.json();
    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "invalid text" }, { status: 400 });
    }
    const sliced = text.slice(0, 8000);
    if (!OPENAI_API_KEY) {
      // Graceful fallback: do not error; tell client to disable further attempts
      return NextResponse.json({ translation: null, disabled: true });
    }
    // cache by provided key or text slice
    const cacheKey = String(key || `t:${hashKey(sliced)}`);
    const cached = getCached(cacheKey);
    if (cached)
      return NextResponse.json(
        { translation: cached, cached: true },
        { headers: { "x-cache": "hit" } },
      );

    const prompt = `将以下内容翻译成简体中文，保留专有名词、符号与数值格式；如果包含代码/JSON/表格，只翻译注释与自然语言，不改变结构：\n\n${sliced}`;

    // Normalize base URL: if it looks like '/v1' root, default to chat/completions
    const trimmed = OPENAI_API_URL.replace(/\/+$/, "");
    const hasExplicitPath = /(chat\/completions|responses)(\b|\/|$)/.test(
      trimmed,
    );
    const effectiveUrl = hasExplicitPath
      ? trimmed
      : `${trimmed}/chat/completions`;
    const useResponses = /\/responses(\b|\/|$)/.test(effectiveUrl);
    const baseBody: any = useResponses
      ? { model: MODEL, input: prompt }
      : { model: MODEL, messages: [{ role: "user", content: prompt }] };
    // Merge vendor-specific config at top-level as well as extra_body for maximum compatibility
    const body = EXTRA_BODY
      ? { ...baseBody, ...EXTRA_BODY, extra_body: EXTRA_BODY }
      : baseBody;
    if (IS_DEV) {
      const keys = Object.keys(body || {});
      console.log(
        "[translate] body keys",
        keys,
        "has routing?",
        "model_routing_config" in body,
        "len",
        JSON.stringify(body).length,
      );
    }

    // Build headers with customizable auth header/scheme and optional org/project
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json",
      "user-agent": "OpenAI/JS (nof0-web)",
      ...EXTRA_HEADERS,
    };
    if (AUTH_SCHEME === "") headers[AUTH_HEADER] = OPENAI_API_KEY;
    else headers[AUTH_HEADER] = `${AUTH_SCHEME} ${OPENAI_API_KEY}`;
    // Always include standard Authorization: Bearer unless explicitly suppressed
    if (!("Authorization" in headers))
      headers["Authorization"] = `Bearer ${OPENAI_API_KEY}`;
    if (OPENAI_ORG) headers["OpenAI-Organization"] = OPENAI_ORG;
    if (OPENAI_PROJECT) headers["OpenAI-Project"] = OPENAI_PROJECT;

    if (IS_DEV) {
      console.log(
        "[translate] upstream",
        effectiveUrl,
        "headers",
        sanitizeHeaders(headers),
        "useResponses",
        useResponses,
        "model",
        MODEL,
      );
    }

    // Try SDK first to match Python client's behavior; fall back to fetch if SDK call fails
    let translation = "";
    try {
      const defaultHeaders: Record<string, string> = {
        accept: "application/json",
        ...EXTRA_HEADERS,
      };
      if (
        AUTH_HEADER &&
        (AUTH_HEADER !== "Authorization" || AUTH_SCHEME === "")
      ) {
        defaultHeaders[AUTH_HEADER] =
          AUTH_SCHEME === ""
            ? OPENAI_API_KEY!
            : `${AUTH_SCHEME} ${OPENAI_API_KEY}`.trim();
      }
      if (OPENAI_ORG) defaultHeaders["OpenAI-Organization"] = OPENAI_ORG;
      if (OPENAI_PROJECT) defaultHeaders["OpenAI-Project"] = OPENAI_PROJECT;

      // Extract base URL from effectiveUrl (remove /chat/completions or /responses)
      const baseURL = effectiveUrl.replace(
        /\/(chat\/completions|responses)(\b|\/|$)/,
        "",
      );
      const client = new OpenAI({
        apiKey: OPENAI_API_KEY!,
        baseURL: baseURL,
        defaultHeaders,
      });
      if (IS_DEV) {
        console.log(
          "[translate][sdk] baseURL",
          baseURL,
          "defaultHeaders",
          sanitizeHeaders(defaultHeaders),
        );
      }
      const req: any = useResponses
        ? { model: MODEL, input: prompt }
        : { model: MODEL, messages: [{ role: "user", content: prompt }] };
      if (EXTRA_BODY) {
        req.extra_body = EXTRA_BODY;
        Object.assign(req, EXTRA_BODY);
      }
      if (useResponses) {
        const r = await client.responses.create(req);
        translation =
          (r as any)?.output_text ||
          (r as any)?.choices?.[0]?.message?.content ||
          "";
      } else {
        try {
          const r = await client.chat.completions.create(req);
          translation = (r as any)?.choices?.[0]?.message?.content || "";
        } catch (e: any) {
          if (IS_DEV)
            console.log(
              "[translate][sdk] chat  error",
              String(e?.message || e).slice(0, 200),
            );
          // Fallback to responses endpoint via SDK if available
          try {
            const r2 = await client.responses.create({
              model: MODEL,
              input: prompt,
              ...(EXTRA_BODY ? EXTRA_BODY : {}),
            } as any);
            translation =
              (r2 as any)?.output_text ||
              (r2 as any)?.choices?.[0]?.message?.content ||
              "";
          } catch (e2: any) {
            if (IS_DEV)
              console.log(
                "[translate][sdk] resp error",
                String(e2?.message || e2).slice(0, 200),
              );
          }
        }
      }
      translation = translation?.trim?.() ?? "";
    } catch (e) {
      translation = "";
    }

    if (!translation) {
      let tryUrl = effectiveUrl;
      let upstream = await fetch(tryUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const ctype2 = upstream.headers.get("content-type") || "";
      if (!upstream.ok || !ctype2.includes("application/json")) {
        // If 403 on chat/completions, try /responses fallback automatically
        if (!useResponses && upstream.status === 403) {
          const respUrl = tryUrl.replace(
            /\/chat\/completions(\b|\/|$)/,
            "/responses",
          );
          const respBody = {
            model: MODEL,
            input: prompt,
            temperature: 0.2,
            ...(EXTRA_BODY ? EXTRA_BODY : {}),
          } as any;
          if (IS_DEV)
            console.log("[translate][fetch] fallback to responses", respUrl);
          upstream = await fetch(respUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(respBody),
          });
        }
      }
      const ctype3 = upstream.headers.get("content-type") || "";
      if (!upstream.ok || !ctype3.includes("application/json")) {
        const t = await upstream.text().catch(() => "");
        return NextResponse.json(
          {
            translation: null,
            disabled: true,
            error: t ? t.slice(0, 300) : `OpenAI ${upstream.status}`,
            meta: {
              url: effectiveUrl,
              auth_header: AUTH_HEADER,
              scheme: AUTH_SCHEME || "(none)",
            },
          },
          { headers: { "x-cache": "miss" } },
        );
      }
      const data2 = await upstream.json().catch(() => ({}));
      translation = useResponses
        ? ((
            data2?.output_text ||
            data2?.choices?.[0]?.message?.content ||
            ""
          ).trim?.() ?? "")
        : ((data2?.choices?.[0]?.message?.content || "").trim?.() ?? "");
    }
    if (translation) setCached(cacheKey, translation);
    return NextResponse.json(
      { translation },
      { headers: { "x-cache": "store" } },
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        translation: null,
        disabled: true,
        error: String(e?.message || e),
        meta: {
          url: process.env.OPENAI_API_URL || "",
          auth_header: AUTH_HEADER,
          scheme: AUTH_SCHEME || "(none)",
        },
      },
      { headers: { "x-cache": "error" } },
    );
  }
}
