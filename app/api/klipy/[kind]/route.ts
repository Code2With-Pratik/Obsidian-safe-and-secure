/**
 * Server-side Klipy proxy.
 *
 *   GET /api/klipy/gifs              → trending GIFs
 *   GET /api/klipy/gifs?q=hello      → search GIFs
 *   GET /api/klipy/stickers[?q=...]
 *   GET /api/klipy/clips[?q=...]      (memes)
 *
 * Calling Klipy from the browser hits CORS — this proxy avoids that AND
 * keeps the API key off the client bundle. The key is read from env var
 * KLIPY_API_KEY (server-only) and falls back to a hardcoded default so the
 * picker works without local setup.
 */
import { NextResponse } from "next/server";

const DEFAULT_KEY =
  "ksiibSg9aEmbMMtG7yAjPLdIJ4daLefJIcxILpu8Da4lfS4bNiaFR72wvz8vPlEQ";

const KLIPY_KEY =
  (process.env.KLIPY_API_KEY && process.env.KLIPY_API_KEY.length > 0
    ? process.env.KLIPY_API_KEY
    : process.env.NEXT_PUBLIC_KLIPY_API_KEY) || DEFAULT_KEY;

const VALID_KINDS = new Set(["gifs", "stickers", "clips"]);

export const runtime = "edge"; // fast cold start, low overhead
export const dynamic = "force-dynamic"; // never cache search at the edge

export async function GET(
  req: Request,
  context: { params: Promise<{ kind: string }> }
) {
  const { kind } = await context.params;
  if (!VALID_KINDS.has(kind)) {
    return NextResponse.json(
      { error: `invalid kind '${kind}'` },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(48, Math.max(1, Number(url.searchParams.get("limit")) || 24));
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

  const path = q ? "search" : "trending";
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(limit)
  });
  if (q) params.set("q", q);

  const upstream = `https://api.klipy.com/api/v1/${KLIPY_KEY}/${kind}/${path}?${params.toString()}`;

  try {
    const res = await fetch(upstream, {
      headers: { Accept: "application/json" },
      // small cache window so repeated taps don't all hit Klipy
      next: { revalidate: 30 }
    });
    const bodyText = await res.text();
    if (!res.ok) {
      console.warn(`[klipy proxy] ${kind} ${path} → HTTP ${res.status}: ${bodyText.slice(0, 200)}`);
      return NextResponse.json(
        { error: "klipy upstream", status: res.status, message: bodyText.slice(0, 500) },
        { status: 502 }
      );
    }
    // Parse to surface body shape issues during dev; pass-through to client.
    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      console.warn(`[klipy proxy] ${kind} ${path} → non-JSON body: ${bodyText.slice(0, 200)}`);
      return NextResponse.json({ error: "klipy non-json" }, { status: 502 });
    }
    return NextResponse.json(parsed, {
      headers: { "Cache-Control": "public, max-age=20, stale-while-revalidate=60" }
    });
  } catch (err) {
    console.warn(`[klipy proxy] ${kind} fetch failed`, err);
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
