import { NextRequest, NextResponse } from "next/server";

const UPSTREAM = process.env.NOF1_API_BASE_URL || "https://nof1.ai/api";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const subpath = (path || []).join("/");
  const target = `${UPSTREAM}/${subpath}${req.nextUrl.search}`;
  const upstream = await fetch(target, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const text = await upstream.text();
  const res = new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ||
        "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
  return res;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-headers": "*",
    },
  });
}
