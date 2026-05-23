/**
 * Open Graph scraper.
 *   GET /api/og?url=https://example.com
 *   →  { title, description, image, siteName, host, url }
 *
 * Runs server-side so cross-origin OG/Twitter meta can be fetched without
 * CORS issues. Tiny regex-based parser — no HTML parser dependency.
 */
import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface OgPayload {
  url: string;
  host: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

/** Walk every <meta> tag in the document, parse its attributes into a map
 *  keyed by property/name lowercase. Tolerant of attribute order, quote
 *  style, single vs double quotes, newlines, and self-closing slashes. */
function parseMetaTags(html: string): Map<string, string> {
  const out = new Map<string, string>();
  const metaTag = /<meta\b([^>]*?)\/?>/gi;
  const attrPattern = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;

  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = metaTag.exec(html)) !== null) {
    const attrs: Record<string, string> = {};
    attrPattern.lastIndex = 0;
    let am: RegExpExecArray | null;
    while ((am = attrPattern.exec(tagMatch[1])) !== null) {
      const name = am[1].toLowerCase();
      const value = am[2] ?? am[3] ?? am[4] ?? "";
      attrs[name] = value;
    }
    const key = (attrs.property || attrs.name || attrs.itemprop)?.toLowerCase();
    const content = attrs.content;
    if (key && content && !out.has(key)) {
      out.set(key, decodeEntities(content));
    }
  }
  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'");
}

function absolutize(maybeRelative: string, base: string): string {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return maybeRelative;
  }
}

export async function GET(req: Request) {
  const incoming = new URL(req.url);
  const target = incoming.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "missing url" }, { status: 400 });
  }
  let urlObj: URL;
  try {
    urlObj = new URL(target);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
    return NextResponse.json({ error: "unsupported protocol" }, { status: 400 });
  }

  try {
    const res = await fetch(urlObj.toString(), {
      headers: {
        // Some sites (incl. Vercel previews behind a CDN) only return OG
        // tags to real-browser UAs. Match what a real Chrome would send.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "fetch failed", status: res.status },
        { status: 502 }
      );
    }

    // Read up to 512KB — enough for any reasonable <head> with OG metadata
    // (don't bail at </head> since some Next.js / SPA setups inject OG in <body>).
    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      const decoder = new TextDecoder();
      let bytes = 0;
      while (bytes < 512 * 1024) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        html += decoder.decode(value, { stream: true });
      }
      html += decoder.decode();
      reader.cancel().catch(() => {});
    } else {
      html = await res.text();
    }

    const meta = parseMetaTags(html);

    const title =
      meta.get("og:title") ??
      meta.get("twitter:title") ??
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();

    const description =
      meta.get("og:description") ??
      meta.get("twitter:description") ??
      meta.get("description");

    const rawImage =
      meta.get("og:image") ??
      meta.get("og:image:url") ??
      meta.get("og:image:secure_url") ??
      meta.get("twitter:image") ??
      meta.get("twitter:image:src");

    const image = rawImage ? absolutize(rawImage, urlObj.toString()) : undefined;

    const siteName =
      meta.get("og:site_name") ??
      meta.get("application-name") ??
      meta.get("apple-mobile-web-app-title");

    const payload: OgPayload = {
      url: urlObj.toString(),
      host: urlObj.host,
      title: title ? decodeEntities(title) : undefined,
      description: description ? decodeEntities(description) : undefined,
      image,
      siteName
    };

    return NextResponse.json(payload, {
      // cache hard at the edge — the same URL gives the same card for hours
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400"
      }
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
