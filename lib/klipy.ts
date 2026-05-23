/**
 * Klipy v1 client. Goes through the Next.js proxy at /api/klipy/[kind] so
 * the key stays server-side and CORS is bypassed. The picker calls into
 * this module from the browser.
 *
 * Klipy docs:  https://klipy.com/docs
 */

import type { GifItem, MemeItem } from "@/features/chat/expressions-data";

/** Sticker shape returned from Klipy — image URL based rather than emoji. */
export interface StickerApiItem {
  id: string;
  src: string;
  alt: string;
}

// The Klipy proxy route — same origin as the app
const BASE = "/api/klipy";

export const KLIPY_AVAILABLE = true;

type Kind = "gifs" | "stickers" | "clips";

/** Klipy returns lots of media variants per item; pick the smallest animated
 *  one we can find so the picker stays fast. */
type FileMeta = Record<string, { url?: string; width?: number; height?: number } | undefined>;

interface KlipyItem {
  id?: string | number;
  slug?: string;
  title?: string;
  url?: string;
  src?: string;
  file_meta?: FileMeta;
  // some payloads put preview at the root
  preview?: { url?: string };
}

interface KlipyResponse {
  result?: boolean;
  data?: {
    data?: KlipyItem[];
    has_next?: boolean;
    current_page?: number;
  };
}

/** Deep-walk an object looking for any .url string ending in a media extension.
 *  Klipy nests media URLs under varying keys depending on content type/version
 *  (`file_meta.gif.url`, `file_meta.hd.url`, etc.), so an exhaustive walk is
 *  more robust than guessing key names. */
function deepFindUrl(node: unknown, prefer: string[] = []): string | null {
  const found: string[] = [];
  const walk = (v: unknown) => {
    if (!v) return;
    if (typeof v === "string") {
      if (/^https?:\/\//.test(v)) found.push(v);
      return;
    }
    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }
    if (typeof v === "object") {
      // url field shortcut
      const obj = v as Record<string, unknown>;
      if (typeof obj.url === "string" && /^https?:\/\//.test(obj.url)) {
        found.push(obj.url);
      }
      Object.values(obj).forEach(walk);
    }
  };
  walk(node);

  // Prefer URLs whose path includes one of the preferred extensions.
  for (const ext of prefer) {
    const match = found.find((u) => u.toLowerCase().includes(ext));
    if (match) return match;
  }
  return found[0] ?? null;
}

function pickGifUrl(item: KlipyItem): string | null {
  return deepFindUrl(item, [".gif", ".webp", ".mp4"]);
}

function pickStickerUrl(item: KlipyItem): string | null {
  return deepFindUrl(item, [".webp", ".png", ".gif"]);
}

function pickMemeUrl(item: KlipyItem): string | null {
  // Prefer image formats first; mp4 only as a fallback. The picker tile
  // detects video URLs and renders <video> when needed.
  return deepFindUrl(item, [".gif", ".webp", ".jpg", ".jpeg", ".png", ".mp4"]);
}

/** True if the URL points at a video container (Klipy clips often do). */
export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

const isDev = process.env.NODE_ENV !== "production";

async function request<T extends KlipyItem>(
  kind: Kind,
  query: string,
  signal?: AbortSignal,
  limit = 24
): Promise<T[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const q = query.trim();
  if (q) params.set("q", q);

  const res = await fetch(`${BASE}/${kind}?${params.toString()}`, {
    signal,
    headers: { Accept: "application/json" }
  });
  if (!res.ok) {
    if (isDev) console.warn(`[klipy] ${kind} HTTP ${res.status}`);
    throw new Error(`Klipy ${kind} failed: ${res.status}`);
  }
  const json = (await res.json()) as KlipyResponse;
  // Klipy nests results under several possible shapes — be lenient.
  const items =
    (json.data?.data ??
      (json as unknown as { results?: T[] }).results ??
      (json.data as unknown as T[] | undefined) ??
      []) as T[];
  if (isDev && items.length === 0) {
    console.warn(`[klipy] ${kind} returned 0 items; raw response:`, json);
  }
  return items;
}

export async function fetchKlipyGifs(
  query: string,
  opts: { signal?: AbortSignal; limit?: number } = {}
): Promise<GifItem[]> {
  const items = await request("gifs", query, opts.signal, opts.limit ?? 24);
  return items
    .map((r): GifItem | null => {
      const src = pickGifUrl(r);
      if (!src) return null;
      return {
        id: String(r.id ?? r.slug ?? r.title ?? src),
        src,
        alt: r.title ?? "GIF",
        tags: []
      };
    })
    .filter((g): g is GifItem => g !== null);
}

export async function fetchKlipyStickers(
  query: string,
  opts: { signal?: AbortSignal; limit?: number } = {}
): Promise<StickerApiItem[]> {
  const items = await request("stickers", query, opts.signal, opts.limit ?? 24);
  return items
    .map((r): StickerApiItem | null => {
      const src = pickStickerUrl(r);
      if (!src) return null;
      return {
        id: String(r.id ?? r.slug ?? src),
        src,
        alt: r.title ?? "Sticker"
      };
    })
    .filter((s): s is StickerApiItem => s !== null);
}

export async function fetchKlipyMemes(
  query: string,
  opts: { signal?: AbortSignal; limit?: number } = {}
): Promise<MemeItem[]> {
  const items = await request("clips", query, opts.signal, opts.limit ?? 12);
  return items
    .map((r): MemeItem | null => {
      const src = pickMemeUrl(r);
      if (!src) return null;
      return {
        id: String(r.id ?? r.slug ?? src),
        src,
        caption: r.title ?? "Meme",
        tag: ""
      };
    })
    .filter((m): m is MemeItem => m !== null);
}
