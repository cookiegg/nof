import { NextRequest, NextResponse } from "next/server";

// Use Edge Runtime to completely eliminate Fast Origin Transfer costs on Vercel
// This runs the API route on Vercel's Edge Network instead of Serverless Functions
// On non-Vercel platforms, Next.js will gracefully degrade to Node.js runtime
// 使用 Node.js 运行时，避免 Edge 在本地访问 127.0.0.1/localhost 受限导致的 fetch failed
export const runtime = "nodejs";

// 优先使用 NOF_API_BASE_URL（本地 Node 后端），其次兼容 NOF1_API_BASE_URL；默认直连官方上游
const UPSTREAM =
  process.env.NOF_API_BASE_URL ||
  process.env.NOF1_API_BASE_URL ||
  // 本地开发默认直连本地后端，避免误走线上
  // 注意：路径需要包含 /nof1，因为路由是 /api/nof1/[...path]
  "http://127.0.0.1:3001/api/nof1";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await ctx.params;
    const subpath = (path || []).join("/");
    const target = `${UPSTREAM}/${subpath}${req.nextUrl.search}`;
    const upstream = await fetch(target, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const text = await upstream.text();
    const ct = upstream.headers.get("content-type") || "application/json; charset=utf-8";
    // 如果上游返回 HTML（Next 错页），改为 JSON 错误，避免污染前端 UI
    if (!upstream.ok || /text\/html/i.test(ct)) {
      return NextResponse.json(
        { error: "upstream_error", status: upstream.status, body: text.slice(0, 300) },
        { status: upstream.status || 502 },
      );
    }
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type": ct,
        "cache-control": "public, s-maxage=5, stale-while-revalidate=10",
        "cdn-cache-control": "public, s-maxage=5",
        "access-control-allow-origin": "*",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: "proxy_fetch_failed", message: String(e?.message || e) }, { status: 502 });
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await ctx.params;
    const subpath = (path || []).join("/");
    const target = `${UPSTREAM}/${subpath}${req.nextUrl.search}`;
    const bodyText = await req.text();
    const upstream = await fetch(target, {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": req.headers.get("content-type") || "application/json",
        accept: req.headers.get("accept") || "application/json",
      },
      body: bodyText,
    });
    const text = await upstream.text();
    const ct = upstream.headers.get("content-type") || "application/json; charset=utf-8";
    if (!upstream.ok || /text\/html/i.test(ct)) {
      return NextResponse.json(
        { error: "upstream_error", status: upstream.status, body: text.slice(0, 300) },
        { status: upstream.status || 502 },
      );
    }
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type": ct,
        "access-control-allow-origin": "*",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: "proxy_fetch_failed", message: String(e?.message || e) }, { status: 502 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "*",
    },
  });
}
