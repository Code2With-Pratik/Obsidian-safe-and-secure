"use client";

import type { Board, Element, NoteElement } from "@/store/use-whiteboard-store";

/* -------------------------------------------------------- */
/* SVG-from-scratch exporter                                */
/* -------------------------------------------------------- */
/**
 * Renders an entire board to a high-resolution PNG by building a self-
 * contained SVG and rasterising it via a 2x canvas. We rebuild the scene
 * from element data (not from the live DOM) so the export is independent
 * of camera/zoom — the user always gets the full canvas at full quality.
 */

const PAD = 80;
const HD_SCALE = 2;
const BG = "#0a0a0f";

/* -------------------------------------------------------- */
/* Font mapping + embedding                                 */
/* -------------------------------------------------------- */
/**
 * SVG rasterised from a Blob URL doesn't inherit the page's @font-face
 * rules — so custom sticky-note fonts fall back to sans-serif unless we
 * inline the font data. We:
 *  1. translate `var(--font-X)` CSS variables to real font names
 *  2. fetch each used font's woff2 from Google Fonts
 *  3. base64-embed it into a <style> at the top of the SVG
 */

const FONT_VAR_TO_NAME: Record<string, string> = {
  "var(--font-sans)": "Inter",
  "var(--font-indie)": "Indie Flower",
  "var(--font-caveat)": "Caveat",
  "var(--font-marker)": "Permanent Marker",
  "var(--font-shadows)": "Shadows Into Light",
  "var(--font-merienda)": "Merienda"
};

/** Resolve an element's CSS-variable font to a real family name with fallback.
 *  Inner family names are wrapped in *single* quotes so the whole string is
 *  safe to drop into a double-quoted SVG `font-family="…"` attribute without
 *  closing it prematurely. */
function resolveFontFamily(raw: string | undefined): string {
  if (!raw) return "Inter, sans-serif";
  const direct = FONT_VAR_TO_NAME[raw];
  if (direct) return `'${direct}', sans-serif`;
  // If the user passed a literal family already, just use it.
  return `${raw}, sans-serif`;
}

/** Build an @font-face stylesheet (with base64-embedded woff2) covering
 *  every Google-Fonts family used in the board. Returns "" if nothing
 *  needs embedding or the fetch fails — text still renders in the
 *  fallback sans-serif. */
async function buildFontFaceCSS(elements: Element[]): Promise<string> {
  // Collect every non-default font referenced by a note or text label.
  const used = new Set<string>();
  for (const el of elements) {
    if (el.kind === "note" || el.kind === "text") {
      const name = el.font ? FONT_VAR_TO_NAME[el.font] : undefined;
      if (name && name !== "Inter") used.add(name);
    }
  }
  if (used.size === 0) return "";

  try {
    // One Google-Fonts CSS request that covers every family at once.
    const families = [...used]
      .map((n) => `family=${encodeURIComponent(n)}`)
      .join("&");
    const cssRes = await fetch(
      `https://fonts.googleapis.com/css2?${families}&display=swap`
    );
    if (!cssRes.ok) return "";
    let css = await cssRes.text();

    // The CSS body has `src: url(https://fonts.gstatic.com/...)` for each
    // weight/subset. Pull every unique URL out and fetch the font binaries.
    const urls = [
      ...new Set(
        [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(
          (m) => m[1]
        )
      )
    ];
    const fetched = await Promise.all(
      urls.map(async (url) => {
        try {
          const r = await fetch(url);
          if (!r.ok) return [url, null] as const;
          const buf = await r.arrayBuffer();
          // Convert ArrayBuffer to base64 without blowing the call stack on
          // larger fonts — chunked String.fromCharCode + btoa.
          const bytes = new Uint8Array(buf);
          let bin = "";
          const CHUNK = 0x8000;
          for (let i = 0; i < bytes.length; i += CHUNK) {
            bin += String.fromCharCode(
              ...bytes.subarray(i, Math.min(i + CHUNK, bytes.length))
            );
          }
          const b64 = btoa(bin);
          const fmt = url.endsWith(".woff") ? "woff" : "woff2";
          return [url, `data:font/${fmt};base64,${b64}`] as const;
        } catch {
          return [url, null] as const;
        }
      })
    );
    // If ANY font URL failed to embed we'd leave a dangling external URL in
    // the SVG, which the Image()→canvas rasteriser refuses to load. In that
    // case bail out cleanly so text just falls back to sans-serif.
    if (fetched.some(([, dataUrl]) => !dataUrl)) return "";
    for (const [url, dataUrl] of fetched) {
      if (!dataUrl) continue;
      css = css.split(url).join(dataUrl);
    }
    return css;
  } catch {
    return "";
  }
}

interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

function computeBounds(elements: Element[]): Bounds {
  if (elements.length === 0) return { x: 0, y: 0, w: 1200, h: 800 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elements) {
    if (el.kind === "path") {
      for (let i = 0; i < el.points.length; i += 2) {
        if (el.points[i] < minX) minX = el.points[i];
        if (el.points[i + 1] < minY) minY = el.points[i + 1];
        if (el.points[i] > maxX) maxX = el.points[i];
        if (el.points[i + 1] > maxY) maxY = el.points[i + 1];
      }
    } else if (el.kind === "line") {
      minX = Math.min(minX, el.x, el.x2);
      minY = Math.min(minY, el.y, el.y2);
      maxX = Math.max(maxX, el.x, el.x2);
      maxY = Math.max(maxY, el.y, el.y2);
    } else if (el.kind === "connection") {
      continue;
    } else {
      const w = (el as { w?: number }).w ?? 100;
      const h = (el as { h?: number }).h ?? 30;
      if (el.x < minX) minX = el.x;
      if (el.y < minY) minY = el.y;
      if (el.x + w > maxX) maxX = el.x + w;
      if (el.y + h > maxY) maxY = el.y + h;
    }
  }
  return {
    x: minX - PAD,
    y: minY - PAD,
    w: Math.max(800, maxX - minX + PAD * 2),
    h: Math.max(600, maxY - minY + PAD * 2)
  };
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/* --- text wrapping --------------------------------------------------- */
/* SVG <text> doesn't honour width — long lines spill past the note's
 * boundary. We use a hidden canvas context to measure word widths and
 * pre-wrap each line so it fits inside the available pixel budget. */

let measureCanvas: HTMLCanvasElement | null = null;
function measureWidth(text: string, fontSize: number, fontFamily: string): number {
  if (!measureCanvas) measureCanvas = document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) return text.length * fontSize * 0.55;
  ctx.font = `${fontSize}px ${fontFamily}, sans-serif`;
  return ctx.measureText(text).width;
}

/** Break a string into lines that fit `maxWidth` at the given font.
 *  Honours explicit `\n` and falls back to char-wrap for any single
 *  word that's still wider than the box. */
function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string
): string[] {
  if (maxWidth <= 0) return [text];
  const out: string[] = [];
  for (const block of text.split("\n")) {
    if (block === "") {
      out.push("");
      continue;
    }
    const words = block.split(/\s+/);
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (measureWidth(next, fontSize, fontFamily) <= maxWidth) {
        line = next;
        continue;
      }
      if (line) out.push(line);
      // The word itself may still be wider than the box (very long URL,
      // unbroken token) — char-wrap as a last resort.
      if (measureWidth(w, fontSize, fontFamily) > maxWidth) {
        let chunk = "";
        for (const ch of w) {
          if (measureWidth(chunk + ch, fontSize, fontFamily) > maxWidth) {
            if (chunk) out.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        line = chunk;
      } else {
        line = w;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

/** Look up a note's center for connection wires. */
function findNote(els: Element[], id: string): NoteElement | undefined {
  return els.find((e): e is NoteElement => e.kind === "note" && e.id === id);
}

/** Tailwind gradient fragment ("from-amber-300 to-amber-400") → start/stop
 *  hex pair. Limited to the palette used by NOTE_COLORS in the store. */
function noteGradient(cls: string): { from: string; to: string } {
  const palette: Record<string, string> = {
    "amber-300": "#FCD34D",
    "amber-400": "#FBBF24",
    "pink-300": "#F9A8D4",
    "pink-400": "#F472B6",
    "cyan-300": "#67E8F9",
    "cyan-400": "#22D3EE",
    "violet-300": "#C4B5FD",
    "violet-400": "#A78BFA",
    "emerald-300": "#6EE7B7",
    "emerald-400": "#34D399",
    "rose-300": "#FDA4AF",
    "rose-400": "#FB7185"
  };
  const fromMatch = cls.match(/from-([a-z]+-\d{3})/);
  const toMatch = cls.match(/to-([a-z]+-\d{3})/);
  return {
    from: palette[fromMatch?.[1] ?? ""] ?? "#FCD34D",
    to: palette[toMatch?.[1] ?? ""] ?? "#FBBF24"
  };
}

/** Fetch an Iconify icon as an inline SVG markup string. We strip the
 *  outer <svg> tags so the caller can drop it inside a transform group. */
async function fetchIconBody(iconId: string, color: string): Promise<string> {
  try {
    const url = `https://api.iconify.design/${iconId}.svg?color=${encodeURIComponent(color)}`;
    const res = await fetch(url);
    if (!res.ok) return "";
    const text = await res.text();
    // Strip outer <svg>…</svg> wrapper so the body integrates into our SVG.
    const body = text.replace(/<svg[^>]*>/i, "").replace(/<\/svg>\s*$/i, "");
    return body;
  } catch {
    return "";
  }
}

/** Bezier wire helper — mirrors the in-app render. */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const bend = Math.max(50, Math.abs(x2 - x1) / 2);
  return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
}

function arrowPolygon(x1: number, y1: number, x2: number, y2: number, w: number) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = Math.max(10, w * 3.5);
  const back = headLen * 0.55;
  const bx = x2 - headLen * Math.cos(angle);
  const by = y2 - headLen * Math.sin(angle);
  const lx = bx + back * Math.cos(angle - Math.PI / 2);
  const ly = by + back * Math.sin(angle - Math.PI / 2);
  const rx = bx + back * Math.cos(angle + Math.PI / 2);
  const ry = by + back * Math.sin(angle + Math.PI / 2);
  return `${x2},${y2} ${lx},${ly} ${rx},${ry}`;
}

/** Serialise an element into SVG markup. */
async function renderElement(el: Element, all: Element[]): Promise<string> {
  if (el.kind === "path") {
    if (el.points.length < 2) return "";
    let d = `M ${el.points[0]} ${el.points[1]}`;
    for (let i = 2; i < el.points.length; i += 2) {
      d += ` L ${el.points[i]} ${el.points[i + 1]}`;
    }
    return `<path d="${d}" fill="none" stroke="${el.color}" stroke-width="${el.width}" stroke-linecap="round" stroke-linejoin="round" />`;
  }
  if (el.kind === "rect") {
    return `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" rx="8" fill="none" stroke="${el.color}" stroke-width="${el.width}" />`;
  }
  if (el.kind === "circle") {
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    return `<ellipse cx="${cx}" cy="${cy}" rx="${el.w / 2}" ry="${el.h / 2}" fill="none" stroke="${el.color}" stroke-width="${el.width}" />`;
  }
  if (el.kind === "line") {
    const line = `<line x1="${el.x}" y1="${el.y}" x2="${el.x2}" y2="${el.y2}" stroke="${el.color}" stroke-width="${el.width}" stroke-linecap="round" />`;
    if (!el.arrow) return line;
    return `${line}<polygon points="${arrowPolygon(el.x, el.y, el.x2, el.y2, el.width)}" fill="${el.color}" />`;
  }
  if (el.kind === "connection") {
    const a = findNote(all, el.fromNoteId);
    const b = findNote(all, el.toNoteId);
    if (!a || !b) return "";
    const x1 = a.x + a.w;
    const y1 = a.y + a.h / 2;
    const x2 = b.x;
    const y2 = b.y + b.h / 2;
    const path = `<path d="${bezier(x1, y1, x2, y2)}" fill="none" stroke="${el.color}" stroke-width="${el.width}" stroke-linecap="round" />`;
    if (!el.arrow) return path;
    return `${path}<polygon points="${arrowPolygon(x2 - 50, y2, x2, y2, el.width)}" fill="${el.color}" />`;
  }
  if (el.kind === "note") {
    const grad = noteGradient(el.color);
    const gradId = `g-${el.id}`;
    const fontFamily = resolveFontFamily(el.font);
    const fontSize = el.fontSize ?? 16;
    const padX = 14;
    const padY = 12;
    const lineHeight = fontSize * 1.25;
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    const lines = wrapText(el.text || "", el.w - padX * 2, fontSize, fontFamily);
    // One <text> per line with an absolute y — avoids any tspan/dy quirks
    // in the Image()→canvas SVG rasteriser.
    const lineEls = lines
      .map((ln, i) => {
        const ly = el.y + padY + fontSize + i * lineHeight;
        return `<text x="${el.x + padX}" y="${ly}" font-family="${fontFamily}" font-size="${fontSize}" fill="#0F172A">${escapeXml(ln)}</text>`;
      })
      .join("\n");
    return `
      <g transform="rotate(${el.rot} ${cx} ${cy})">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${grad.from}" />
            <stop offset="100%" stop-color="${grad.to}" />
          </linearGradient>
        </defs>
        <rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" rx="14" fill="url(#${gradId})" />
        ${lineEls}
      </g>
    `;
  }
  if (el.kind === "text") {
    const fontSize = el.fontSize ?? 16;
    const padX = 8;
    const padY = 4;
    const lineHeight = fontSize * 1.25;
    const fontFamily = resolveFontFamily(el.font);
    const lines = wrapText(el.text || "", el.w - padX * 2, fontSize, fontFamily);
    return lines
      .map((ln, i) => {
        const ly = el.y + padY + fontSize + i * lineHeight;
        return `<text x="${el.x + padX}" y="${ly}" font-family="${fontFamily}" font-size="${fontSize}" fill="${el.color}">${escapeXml(ln)}</text>`;
      })
      .join("\n");
  }
  if (el.kind === "icon") {
    const body = await fetchIconBody(el.icon, el.color);
    // Iconify icons are authored on a 24×24 viewBox by default; scale to fit
    // the element's box.
    return `
      <g transform="translate(${el.x} ${el.y}) scale(${el.w / 24} ${el.h / 24})">
        ${body}
      </g>
    `;
  }
  return "";
}

/** Build a full SVG string for the given board.
 *  `includeFonts: false` skips the slow Google Fonts fetch + embed step;
 *  used as a retry path when the first attempt fails to rasterise. */
async function buildSvg(
  board: Board,
  options: { includeFonts: boolean } = { includeFonts: true }
): Promise<{ svg: string; bounds: Bounds }> {
  const els = board.elements;
  const bounds = computeBounds(els);

  // Render connections first so they sit beneath notes.
  const orderedEls = [
    ...els.filter((e) => e.kind === "connection"),
    ...els.filter((e) => e.kind !== "connection")
  ];
  const renderJobs = orderedEls.map((e) => renderElement(e, els));
  const fontJob = options.includeFonts
    ? buildFontFaceCSS(els)
    : Promise.resolve("");

  const [fontCss, ...parts] = await Promise.all([fontJob, ...renderJobs]);

  const styleBlock = fontCss
    ? `<defs><style type="text/css"><![CDATA[\n${fontCss}\n]]></style></defs>`
    : "";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}" width="${bounds.w}" height="${bounds.h}">
  ${styleBlock}
  <rect x="${bounds.x}" y="${bounds.y}" width="${bounds.w}" height="${bounds.h}" fill="${BG}" />
  ${parts.join("\n")}
</svg>`;
  return { svg, bounds };
}

/** Rasterise an SVG string into a PNG Blob at 2× scale. Throws on any
 *  rendering failure so the caller can decide whether to retry. */
async function rasterizeToPng(svg: string, bounds: Bounds): Promise<Blob> {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image failed to load"));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = bounds.w * HD_SCALE;
    canvas.height = bounds.h * HD_SCALE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.scale(HD_SCALE, HD_SCALE);
    ctx.drawImage(img, 0, 0, bounds.w, bounds.h);

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png", 1)
    );
    if (!pngBlob) throw new Error("Failed to encode PNG");
    return pngBlob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Public API: download the board as a high-res PNG.
 *  Two-stage strategy:
 *   1. Try to render with custom fonts embedded as base64.
 *   2. If that fails for any reason (bad data URL, blocked Google Fonts,
 *      CDATA quirk, …) retry once with fonts stripped so the user still
 *      gets a usable image. */
export async function downloadBoardAsPng(board: Board) {
  let pngBlob: Blob;
  try {
    const { svg, bounds } = await buildSvg(board, { includeFonts: true });
    try {
      pngBlob = await rasterizeToPng(svg, bounds);
    } catch (rasterErr) {
      // Show the user a sample of the SVG so the failing markup is
      // discoverable from devtools.
      console.warn(
        "Export with embedded fonts failed; retrying without custom fonts.",
        rasterErr,
        "\nSVG preview:",
        svg.slice(0, 800)
      );
      const fallback = await buildSvg(board, { includeFonts: false });
      pngBlob = await rasterizeToPng(fallback.svg, fallback.bounds);
    }
  } catch (buildErr) {
    // If even the no-font build fails we want to surface the real cause.
    console.error("Failed to build SVG for export", buildErr);
    throw buildErr;
  }

  const pngUrl = URL.createObjectURL(pngBlob);
  const a = document.createElement("a");
  a.href = pngUrl;
  const safe = (board.name || "whiteboard").replace(/[^a-z0-9-_]+/gi, "-");
  a.download = `${safe}-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(pngUrl);
}
