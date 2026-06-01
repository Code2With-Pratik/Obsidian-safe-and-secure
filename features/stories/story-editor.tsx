"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, Reorder, useMotionValue, useDragControls } from "framer-motion";
import {
  ArrowLeft,
  Image as ImageIcon,
  Type as TypeIcon,
  Smile,
  Sparkles,
  Palette,
  Music,
  Pencil,
  Pipette,
  Eraser,
  Trash2,
  Bold,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Download,
  Send,
  X,
  Layers,
  Camera,
  Folder,
  Search,
  Play,
  Pause
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useStoriesStore } from "@/store/use-stories-store";
import { VinylDisc } from "@/components/stories/vinyl-disc";
import { currentUser } from "@/lib/mock-data";
import { useAuthStore } from "@/store/use-auth-store";
import { FONT_OPTIONS, DEFAULT_FONT, emojiFontFamily } from "@/app/fonts";
import { ExpressionsPicker, type ExpressionPick } from "@/features/chat/expressions-picker";

/* ----------------------------- types ----------------------------- */

interface BaseLayer {
  id: string;
  x: number;
  y: number;
  rotate: number;
  scale: number;
}

interface TextLayer extends BaseLayer {
  type: "text";
  text: string;
  color: string;
  bg: string;
  /** FONT_OPTIONS id (shared with the appearance setting). */
  font: string;
  bold: boolean;
  align: "left" | "center" | "right";
}

interface StickerLayer extends BaseLayer {
  type: "sticker";
  emoji: string;
  size: number;
}

interface MusicLayer extends BaseLayer {
  type: "music";
  title: string;
  artist: string;
  cover?: string;
  preview?: string;
  variant: MusicVariant;
}

interface ImageLayer extends BaseLayer {
  type: "image";
  src: string;
  width: number;
  height: number;
  filter: string;
}

type Layer = TextLayer | StickerLayer | MusicLayer | ImageLayer;

interface Background {
  kind: "image" | "gradient";
  value: string;
}

type MobileSheet = "media" | "text" | "stickers" | "draw" | "music" | "layers" | null;

const GRADIENTS: string[] = [
  "linear-gradient(135deg,#8B5CF6,#EC4899)",
  "linear-gradient(135deg,#22D3EE,#3B82F6)",
  "linear-gradient(135deg,#A3E635,#22D3EE)",
  "linear-gradient(135deg,#FBBF24,#EC4899)",
  "linear-gradient(135deg,#0EA5E9,#8B5CF6)",
  "linear-gradient(135deg,#F472B6,#FB923C)",
  "linear-gradient(135deg,#000000,#1F2937)",
  "linear-gradient(135deg,#10B981,#06B6D4)",
  "linear-gradient(135deg,#F43F5E,#8B5CF6)",
  "linear-gradient(135deg,#FBBF24,#06B6D4)"
];

const STOCK_IMAGES: string[] = [
  "https://images.unsplash.com/photo-1493612276216-ee3925520721?w=900&q=80",
  "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=900&q=80",
  "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=900&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=900&q=80",
  "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=900&q=80",
  "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=900&q=80",
  "https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=900&q=80",
  "https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?w=900&q=80",
  "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=900&q=80"
];

const FILTERS: { id: string; label: string; filter: string }[] = [
  { id: "none", label: "Original", filter: "none" },
  { id: "nova", label: "Obsidian", filter: "saturate(1.4) contrast(1.05) brightness(1.05)" },
  { id: "mono", label: "Mono", filter: "grayscale(1) contrast(1.05)" },
  { id: "vivid", label: "Vivid", filter: "saturate(1.8) contrast(1.1)" },
  { id: "fade", label: "Fade", filter: "saturate(0.7) brightness(1.05) contrast(0.92)" },
  { id: "warm", label: "Warm", filter: "saturate(1.2) hue-rotate(-10deg) brightness(1.02)" },
  { id: "cool", label: "Cool", filter: "saturate(1.1) hue-rotate(20deg) brightness(0.98)" },
  { id: "dream", label: "Dream", filter: "saturate(1.3) blur(0.4px) contrast(0.95) brightness(1.05)" },
  { id: "noir", label: "Noir", filter: "grayscale(1) contrast(1.3) brightness(0.9)" }
];

/** CSS font-family for a FONT_OPTIONS id (used for on-screen rendering). */
const fontFamilyFor = (id: string) =>
  FONT_OPTIONS.find((f) => f.id === id)?.family ?? "var(--font-sans)";

/** Canvas-safe family for the PNG export. CSS vars don't resolve in canvas,
 *  so the default maps to a concrete Inter stack; the rest use their concrete
 *  next/font family string (which the browser has already loaded). */
const canvasFontFor = (id: string) =>
  id === DEFAULT_FONT
    ? "Inter, sans-serif"
    : FONT_OPTIONS.find((f) => f.id === id)?.family ?? "Inter, sans-serif";

const TEXT_BGS: { label: string; value: string; fg: string }[] = [
  { label: "None", value: "transparent", fg: "#ffffff" },
  { label: "White", value: "#ffffffee", fg: "#000000" },
  { label: "Black", value: "#000000aa", fg: "#ffffff" },
  { label: "Violet", value: "#8B5CF6cc", fg: "#ffffff" },
  { label: "Pink", value: "#EC4899cc", fg: "#ffffff" }
];

const TEXT_COLORS = ["#ffffff", "#000000", "#8B5CF6", "#22D3EE", "#EC4899", "#FBBF24", "#A3E635", "#FB923C"];

/** A music result fetched live from the iTunes Search API. */
interface Track {
  id: string;
  title: string;
  artist: string;
  /** Square album artwork (upgraded to 300px). */
  cover: string;
  /** 30-second preview mp3 URL. */
  preview: string;
}

/** How a music layer is rendered on the story (mirrors Instagram's options):
 *  - card:   glass pill, square cover on the left + marquee title + artist
 *  - square: square cover art only
 *  - circle: circular cover that spins like a vinyl
 *  - note:   a music-note badge (no text) */
type MusicVariant = "card" | "square" | "circle" | "note";

/** Collision-free id generator: many calls inside one ms (e.g. batch-add)
 *  still get distinct ids. */
const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Debounced iTunes Search API query → song results with 30s previews.
 *  The API responds with CORS headers, so a plain client fetch works. */
function useItunesSearch() {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Track[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Empty query → show a trending/popular default set instead of a blank list.
    const q = query.trim() || "top hits";
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const id = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(
            q
          )}&media=music&entity=song&limit=24`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: { results?: Record<string, unknown>[] } = await res.json();
        const list: Track[] = (data.results ?? [])
          .filter((r) => r.previewUrl)
          .map((r) => ({
            id: String(r.trackId),
            title: String(r.trackName ?? ""),
            artist: String(r.artistName ?? ""),
            cover: String(r.artworkUrl100 ?? "").replace("100x100", "300x300"),
            preview: String(r.previewUrl)
          }));
        setResults(list);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError("Couldn't load music. Check your connection.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      window.clearTimeout(id);
      controller.abort();
    };
  }, [query]);

  return { query, setQuery, results, loading, error };
}

/** Plays a 30-second preview mp3 by URL; tapping the same id toggles off. */
function useAudioPreview() {
  const [playingId, setPlayingId] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const stop = React.useCallback(() => {
    audioRef.current?.pause();
    setPlayingId(null);
  }, []);

  const play = React.useCallback(
    (track: Track) => {
      if (playingId === track.id) {
        stop();
        return;
      }
      if (!audioRef.current) audioRef.current = new Audio();
      const a = audioRef.current;
      a.src = track.preview;
      a.currentTime = 0;
      a.onended = () => setPlayingId(null);
      a.play()
        .then(() => setPlayingId(track.id))
        .catch(() => setPlayingId(null));
    },
    [playingId, stop]
  );

  React.useEffect(() => () => audioRef.current?.pause(), []);

  return { playingId, play, stop };
}

/* ----------------------------- export helpers ----------------------------- */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function parseLinearGradient(
  value: string,
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): CanvasGradient | null {
  // Matches: linear-gradient(135deg,#aaa,#bbb,#ccc)  (no spaces required)
  const match = value.match(/linear-gradient\(\s*([\d.]+)deg\s*,\s*(.+)\)/i);
  if (!match) return null;
  const angle = (parseFloat(match[1]) * Math.PI) / 180;
  const colors = match[2].split(",").map((c) => c.trim()).filter(Boolean);
  if (colors.length < 2) return null;
  const cx = w / 2;
  const cy = h / 2;
  const len = Math.sqrt(w * w + h * h) / 2;
  const dx = Math.sin(angle) * len;
  const dy = -Math.cos(angle) * len;
  const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c));
  return g;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

/* ----------------------------- component ----------------------------- */

export function StoryEditor() {
  const t = useT();
  const router = useRouter();
  // ≥lg shows the three-pane layout (left tools · canvas · inspector). Set via
  // inline style rather than an arbitrary Tailwind class so the exact column
  // widths always apply (no JIT/arbitrary-value surprises).
  const isWide = useMediaQuery("(min-width: 1024px)");
  const startStoryUpload = useStoriesStore((s) => s.startStoryUpload);
  const attachStorySlide = useStoriesStore((s) => s.attachStorySlide);
  const clearPendingStory = useStoriesStore((s) => s.clearPendingStory);
  const meId = useAuthStore((s) => s.user?.id);
  const [bg, setBg] = React.useState<Background>({ kind: "gradient", value: GRADIENTS[0] });
  const [filter, setFilter] = React.useState<string>("none");
  const [layers, setLayers] = React.useState<Layer[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [tool, setTool] = React.useState<
    "media" | "text" | "stickers" | "filters" | "draw" | "music"
  >("media");
  const [sheet, setSheet] = React.useState<MobileSheet>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [drawColor, setDrawColor] = React.useState("#EC4899");
  const [drawSize, setDrawSize] = React.useState([4]);
  const [drawing, setDrawing] = React.useState(false);
  const [paths, setPaths] = React.useState<{ color: string; w: number; d: string }[]>([]);
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  // Whether the next device upload becomes the background or an overlay layer.
  // Set right before opening the file/camera picker, read back in onFile.
  const uploadTargetRef = React.useRef<"background" | "overlay">("background");
  const [showLayers, setShowLayers] = React.useState(false);
  // Mobile-only: opens the emoji/GIF/sticker picker as a bottom sheet. On
  // desktop the picker is embedded inline in the left rail (always visible
  // while the Stickers tool is active).
  const [stickerPickerOpen, setStickerPickerOpen] = React.useState(false);

  // Lock body scroll while editor is mounted so the underlying page's
  // scrollbar can't appear/disappear (which would resize the viewport and
  // shift the centered canvas slightly each time the sidebar tab changes).
  React.useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const selected = layers.find((l) => l.id === selectedId);
  const musicLayer = layers.find((l) => l.type === "music") as MusicLayer | undefined;
  const filterCss = FILTERS.find((f) => f.id === filter)?.filter ?? "none";

  /* ----- layer ops ----- */
  const addText = (initial?: Partial<TextLayer>) => {
    const l: TextLayer = {
      id: uid("t"),
      type: "text",
      text: "Type something",
      color: "#ffffff",
      bg: "transparent",
      font: DEFAULT_FONT,
      bold: true,
      align: "center",
      x: 50,
      y: 50,
      rotate: 0,
      scale: 1,
      ...initial
    };
    setLayers((l_) => [...l_, l]);
    setSelectedId(l.id);
    return l;
  };

  const addImage = (src: string) => {
    const l: ImageLayer = {
      id: uid("i"),
      type: "image",
      src,
      width: 200,
      height: 200,
      filter: "none",
      x: 50,
      y: 50,
      rotate: 0,
      scale: 1
    };
    setLayers((l_) => [...l_, l]);
    setSelectedId(l.id);
  };

  const addSticker = (emoji: string) => {
    const l: StickerLayer = {
      id: uid("s"),
      type: "sticker",
      emoji,
      size: 64,
      x: 50,
      y: 50,
      rotate: 0,
      scale: 1
    };
    setLayers((l_) => [...l_, l]);
    setSelectedId(l.id);
  };

  /** Bridge the shared emoji/GIF/sticker picker → story layers. Emoji + bundled
   *  stickers become sticker layers; API stickers, GIFs and memes (image URLs)
   *  become image layers. */
  const onExpression = (pick: ExpressionPick) => {
    if (pick.kind === "emoji") addSticker(pick.value);
    else if (pick.kind === "sticker") {
      if (pick.sticker.src) addImage(pick.sticker.src);
      else if (pick.sticker.emoji) addSticker(pick.sticker.emoji);
    } else if (pick.kind === "gif") addImage(pick.gif.src);
    else if (pick.kind === "meme") addImage(pick.meme.src);
    setStickerPickerOpen(false);
  };

  const addMusic = (track: Track) => {
    // Replace any existing music layer (only one allowed)
    const filtered = layers.filter((l) => l.type !== "music");
    const l: MusicLayer = {
      id: uid("m"),
      type: "music",
      title: track.title,
      artist: track.artist,
      cover: track.cover,
      preview: track.preview,
      variant: "card",
      x: 50,
      y: 12,
      rotate: 0,
      scale: 1
    };
    setLayers([...filtered, l]);
    setSelectedId(l.id);
  };

  const updateSelected = (patch: Partial<Layer>) => {
    if (!selectedId) return;
    setLayers((l_) =>
      l_.map((x) => (x.id === selectedId ? ({ ...x, ...patch } as Layer) : x))
    );
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setLayers((l_) => l_.filter((x) => x.id !== selectedId));
    setSelectedId(null);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (uploadTargetRef.current === "overlay") addImage(url);
    else setBg({ kind: "image", value: url });
    uploadTargetRef.current = "background";
    e.target.value = "";
  };

  /* ----- drawing ----- */
  const drawStart = (e: React.PointerEvent) => {
    if (tool !== "draw" || !canvasRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setDrawing(true);
    setPaths((p) => [...p, { color: drawColor, w: drawSize[0], d: `M ${x} ${y}` }]);
  };
  const drawMove = (e: React.PointerEvent) => {
    if (!drawing || !canvasRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setPaths((cur) => {
      const next = [...cur];
      next[next.length - 1] = { ...next[next.length - 1], d: next[next.length - 1].d + ` L ${x} ${y}` };
      return next;
    });
  };
  const drawEnd = () => setDrawing(false);

  /* ----- mobile sheet open helpers ----- */
  const openSheet = (s: Exclude<MobileSheet, null>) => {
    setSheet(s);
    if (s === "media") setTool("media");
    else if (s === "text") setTool("text");
    else if (s === "stickers") setTool("stickers");
    else if (s === "draw") setTool("draw");
    else if (s === "music") setTool("music");
  };

  const removeLayer = (id: string) => {
    setLayers((cur) => cur.filter((l) => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  /* ----- filter for selected image layer or background ----- */
  const selectedImageLayer =
    selected?.type === "image" ? (selected as ImageLayer) : null;
  const showFilterStrip = !!selectedImageLayer || bg.kind === "image";

  const applyFilterToCurrent = (f: string) => {
    if (selectedImageLayer) {
      updateSelected({ filter: f } as Partial<ImageLayer>);
    } else if (bg.kind === "image") {
      setFilter(f);
    }
  };
  const currentFilter = selectedImageLayer
    ? selectedImageLayer.filter
    : bg.kind === "image"
      ? filter
      : "none";

  /* ----- compose / download / share story ----- */
  const [downloading, setDownloading] = React.useState(false);

  /** Render the current story (background + drawing + layers) onto a
   *  1080×1920 canvas. Shared by Download (→ PNG) and Share (→ data URL).
   *  When `skipMusic` is set the music sticker is left out so it can be
   *  re-rendered as a live (spinning / playing) overlay in the viewer. */
  const composeCanvas = async (
    opts?: { skipMusic?: boolean; skipImages?: boolean; dispRect?: DOMRect }
  ): Promise<HTMLCanvasElement | null> => {
    const skipMusic = opts?.skipMusic ?? false;
    const skipImages = opts?.skipImages ?? false;
    // dispRect can be captured before navigating away, so compose still works
    // after the editor unmounts (Share closes the editor instantly).
    const dispRect = opts?.dispRect ?? canvasRef.current?.getBoundingClientRect();
    if (!dispRect) return null;
    {
      const W = 1080;
      const H = 1920;
      const out = document.createElement("canvas");
      out.width = W;
      out.height = H;
      const ctx = out.getContext("2d");
      if (!ctx) return null;

      // Background
      if (bg.kind === "image") {
        try {
          const img = await loadImage(bg.value);
          ctx.filter = filterCss;
          const ar = img.width / img.height;
          const targetAr = W / H;
          let dw, dh, dx, dy;
          if (ar > targetAr) {
            dh = H;
            dw = ar * H;
            dx = (W - dw) / 2;
            dy = 0;
          } else {
            dw = W;
            dh = W / ar;
            dx = 0;
            dy = (H - dh) / 2;
          }
          ctx.drawImage(img, dx, dy, dw, dh);
          ctx.filter = "none";
        } catch {
          ctx.fillStyle = "#1a1a1a";
          ctx.fillRect(0, 0, W, H);
        }
      } else {
        const grad = parseLinearGradient(bg.value, ctx, W, H);
        if (grad) {
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, W, H);
        }
      }

      // Scale factors (display → export)
      const sx = W / dispRect.width;
      const sy = H / dispRect.height;

      // Paths
      for (const p of paths) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.w * sx;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        const tokens = p.d.match(/[ML][^ML]+/g) ?? [];
        for (const t of tokens) {
          const cmd = t[0];
          const nums = t
            .slice(1)
            .trim()
            .split(/\s+/)
            .map(Number);
          if (cmd === "M") ctx.moveTo(nums[0] * sx, nums[1] * sy);
          else if (cmd === "L") ctx.lineTo(nums[0] * sx, nums[1] * sy);
        }
        ctx.stroke();
      }

      // Layers
      for (const l of layers) {
        ctx.save();
        const cx = (l.x / 100) * W;
        const cy = (l.y / 100) * H;
        ctx.translate(cx, cy);
        ctx.rotate((l.rotate * Math.PI) / 180);
        ctx.scale(l.scale, l.scale);

        if (l.type === "text") {
          const t = l as TextLayer;
          const fontFamily = canvasFontFor(t.font);
          const fontSize = 26 * sx;
          ctx.font = `${t.bold ? "bold " : ""}${fontSize}px ${fontFamily}`;
          ctx.textAlign = t.align as CanvasTextAlign;
          ctx.textBaseline = "middle";
          if (t.bg !== "transparent") {
            const textW = ctx.measureText(t.text).width;
            const padX = 12 * sx;
            const padY = 6 * sy;
            const h = fontSize * 1.15;
            ctx.fillStyle = t.bg;
            const bgX =
              t.align === "center"
                ? -textW / 2 - padX
                : t.align === "right"
                  ? -textW - padX
                  : -padX;
            roundedRect(ctx, bgX, -h / 2 - padY, textW + padX * 2, h + padY * 2, 6 * sx);
            ctx.fill();
          } else {
            ctx.shadowColor = "rgba(0,0,0,0.45)";
            ctx.shadowBlur = 4 * sx;
            ctx.shadowOffsetY = 1.5 * sy;
          }
          ctx.fillStyle = t.color;
          ctx.fillText(t.text, 0, 0);
        } else if (l.type === "sticker") {
          const s = l as StickerLayer;
          ctx.font = `${s.size * sx}px ${emojiFontFamily}, "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(s.emoji, 0, 0);
        } else if (l.type === "image" && !skipImages) {
          const im = l as ImageLayer;
          try {
            const img = await loadImage(im.src);
            const filterDef = FILTERS.find((f) => f.id === im.filter)?.filter ?? "none";
            ctx.filter = filterDef;
            const w = im.width * sx;
            const h = im.height * sx;
            // Rounded clip
            ctx.save();
            roundedRect(ctx, -w / 2, -h / 2, w, h, 12 * sx);
            ctx.clip();
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
            ctx.restore();
            ctx.filter = "none";
          } catch {
            /* skip on load failure */
          }
        } else if (l.type === "music" && !skipMusic) {
          const m = l as MusicLayer;
          let coverImg: HTMLImageElement | null = null;
          if (m.cover && m.variant !== "note") {
            try {
              coverImg = await loadImage(m.cover);
            } catch {
              /* CORS / load failure — fall back to a placeholder block */
            }
          }
          if (m.variant === "square") {
            const s = 96 * sx;
            ctx.save();
            roundedRect(ctx, -s / 2, -s / 2, s, s, 16 * sx);
            ctx.clip();
            if (coverImg) ctx.drawImage(coverImg, -s / 2, -s / 2, s, s);
            else {
              ctx.fillStyle = "rgba(255,255,255,0.15)";
              ctx.fillRect(-s / 2, -s / 2, s, s);
            }
            ctx.restore();
          } else if (m.variant === "circle") {
            const r = 48 * sx;
            ctx.save();
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.clip();
            if (coverImg) ctx.drawImage(coverImg, -r, -r, r * 2, r * 2);
            else {
              ctx.fillStyle = "rgba(255,255,255,0.15)";
              ctx.fillRect(-r, -r, r * 2, r * 2);
            }
            ctx.restore();
            ctx.fillStyle = "rgba(0,0,0,0.8)";
            ctx.beginPath();
            ctx.arc(0, 0, 10 * sx, 0, Math.PI * 2);
            ctx.fill();
          } else if (m.variant === "note") {
            /* "Music only" — no visual on the exported story. */
          } else {
            // card
            const art = 44 * sx;
            const titleFont = 14 * sx;
            const artistFont = 11 * sx;
            ctx.font = `bold ${titleFont}px Inter, sans-serif`;
            const tW = ctx.measureText(m.title).width;
            ctx.font = `${artistFont}px Inter, sans-serif`;
            const aW = ctx.measureText(m.artist).width;
            const textW = Math.min(160 * sx, Math.max(tW, aW));
            const padL = 8 * sx;
            const padR = 16 * sx;
            const gap = 12 * sx;
            const boxH = art + 16 * sx;
            const boxW = padL + art + gap + textW + padR;
            ctx.fillStyle = "rgba(0,0,0,0.55)";
            roundedRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 16 * sx);
            ctx.fill();
            const artX = -boxW / 2 + padL;
            const artY = -art / 2;
            if (coverImg) {
              ctx.save();
              roundedRect(ctx, artX, artY, art, art, 10 * sx);
              ctx.clip();
              ctx.drawImage(coverImg, artX, artY, art, art);
              ctx.restore();
            } else {
              ctx.fillStyle = "rgba(255,255,255,0.15)";
              roundedRect(ctx, artX, artY, art, art, 10 * sx);
              ctx.fill();
            }
            const textX = artX + art + gap;
            ctx.save();
            ctx.beginPath();
            ctx.rect(textX, -boxH / 2, textW, boxH);
            ctx.clip();
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#ffffff";
            ctx.font = `bold ${titleFont}px Inter, sans-serif`;
            ctx.fillText(m.title, textX, -titleFont * 0.5);
            ctx.fillStyle = "rgba(255,255,255,0.75)";
            ctx.font = `${artistFont}px Inter, sans-serif`;
            ctx.fillText(m.artist, textX, artistFont * 0.9);
            ctx.restore();
          }
        }
        ctx.restore();
      }

      return out;
    }
  };

  const downloadStory = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const out = await composeCanvas();
      if (!out) return;
      await new Promise<void>((resolve) => {
        out.toBlob((blob) => {
          if (!blob) {
            resolve();
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `nova-story-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          resolve();
        }, "image/png");
      });
    } finally {
      setDownloading(false);
    }
  };

  /** Share: close the editor instantly and let the chat-list progress bar run
   *  the "upload". The canvas rect is captured synchronously so composing can
   *  finish in the background after this component unmounts; the composed slide
   *  is attached and committed once the bar completes. Music is kept out of the
   *  baked PNG and re-attached as live metadata so it spins / plays in the
   *  viewer (Instagram-style). */
  const shareStory = async () => {
    const dispRect = canvasRef.current?.getBoundingClientRect();
    const music = musicLayer
      ? {
          title: musicLayer.title,
          artist: musicLayer.artist,
          cover: musicLayer.cover,
          preview: musicLayer.preview,
          variant: musicLayer.variant,
          x: musicLayer.x,
          y: musicLayer.y,
          scale: musicLayer.scale,
          rotate: musicLayer.rotate
        }
      : undefined;

    // Image / GIF layers are kept OUT of the baked PNG and re-rendered live in
    // the viewer so GIFs keep animating. Capture them as % positions/sizes.
    const overlays =
      dispRect && dispRect.width > 0
        ? layers
            .filter((l) => l.type === "image")
            .map((l) => {
              const im = l as ImageLayer;
              return {
                id: im.id,
                src: im.src,
                x: im.x,
                y: im.y,
                wPct: (im.width / dispRect.width) * 100,
                hPct: (im.height / dispRect.height) * 100,
                scale: im.scale,
                rotate: im.rotate,
                filter: FILTERS.find((f) => f.id === im.filter)?.filter ?? "none"
              };
            })
        : [];

    startStoryUpload(meId || currentUser.id);
    router.push("/chats");

    // Bake images into the PNG too (so the rail thumbnail shows them) — the
    // live overlay then animates on top of that identical static frame.
    void composeCanvas({ skipMusic: true, dispRect }).then((out) => {
      if (out) {
        attachStorySlide({
          kind: "image",
          src: out.toDataURL("image/png"),
          music,
          overlays
        });
      } else {
        clearPendingStory();
      }
    });
  };

  /* ----- tap canvas to add text (Instagram-style) ----- */
  const onCanvasClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    setSelectedId(null);
    if (tool === "text") {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      addText({ x, y });
      setSheet("text");
    }
  };

  /* ----- render ----- */
  return (
    // Sits inside the app shell (below the Topbar, beside the Sidebar) rather
    // than as a full-viewport overlay, so the global top bar stays visible.
    <div
      className="relative isolate h-[calc(100dvh-4rem)] w-full grid grid-cols-1 bg-background/80 backdrop-blur-xl overflow-hidden"
      style={isWide ? { gridTemplateColumns: "380px 1fr 380px" } : undefined}
    >
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onFile} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />

      {/* ───── Left rail (desktop only) ───── */}
      <aside className="hidden lg:flex flex-col glass-strong glass-specular border-r border-border/60 h-full overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
            <ArrowLeft />
          </Button>
          <h2 className="font-display font-semibold tracking-tight">{t("New story")}</h2>
          <Button variant="ghost" size="icon-sm" onClick={() => setShowLayers((v) => !v)}>
            <Layers />
          </Button>
        </div>

        <Tabs value={tool} onValueChange={(v) => setTool(v as typeof tool)} className="px-3">
          <TabsList className="w-full grid grid-cols-3 gap-1">
            <TabsTrigger value="media">{t("Media")}</TabsTrigger>
            <TabsTrigger value="text">{t("Text")}</TabsTrigger>
            <TabsTrigger value="stickers">{t("Stickers")}</TabsTrigger>
          </TabsList>
          <TabsList className="w-full grid grid-cols-3 gap-1 mt-1">
            <TabsTrigger value="filters">{t("Filters")}</TabsTrigger>
            <TabsTrigger value="draw">{t("Draw")}</TabsTrigger>
            <TabsTrigger value="music">{t("Music")}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="px-3 mt-5 flex-1 overflow-y-auto no-scrollbar pb-6">
          {tool === "media" && (
            <DesktopMediaPanel
              onPickStock={(src) => setBg({ kind: "image", value: src })}
              onPickGradient={(g) => setBg({ kind: "gradient", value: g })}
              onPickOverlay={(src) => addImage(src)}
              onUpload={(mode) => {
                uploadTargetRef.current = mode;
                fileInputRef.current?.click();
              }}
            />
          )}
          {tool === "text" && (
            <TextPanel
              addText={() => addText()}
              selected={selected?.type === "text" ? (selected as TextLayer) : null}
              updateSelected={(p) => updateSelected(p)}
            />
          )}
          {tool === "stickers" && (
            <ExpressionsPicker inline open onClose={() => {}} onPick={onExpression} />
          )}
          {tool === "filters" && <FilterPanel value={filter} onChange={setFilter} preview={bg} />}
          {tool === "draw" && (
            <DrawPanel
              color={drawColor}
              setColor={setDrawColor}
              size={drawSize}
              setSize={setDrawSize}
              clear={() => setPaths([])}
            />
          )}
          {tool === "music" && <MusicPanel onPick={addMusic} />}
        </div>
      </aside>

      {/* ───── Canvas ───── */}
      <main className="relative grid place-items-center p-4 md:p-8 overflow-hidden h-full min-w-0">
        <div className="absolute top-4 left-4 lg:hidden flex gap-2 z-10">
          <Button variant="glass" size="icon" onClick={() => router.back()}>
            <ArrowLeft />
          </Button>
          <Button
            variant="glass"
            size="icon"
            onClick={() => setSheet("layers")}
            aria-label={t("Layers")}
            className="relative"
          >
            <Layers />
            {layers.length > 0 && (
              <span className="absolute -top-1 -right-1 size-4 rounded-full bg-cyan-400 text-[9px] font-bold text-black grid place-items-center">
                {layers.length}
              </span>
            )}
          </Button>
        </div>
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <Button variant="glass" size="icon" onClick={downloadStory} disabled={downloading} aria-label={t("Download story")}>
            {downloading ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="block size-4 border-2 border-foreground/30 border-t-foreground rounded-full"
              />
            ) : (
              <Download />
            )}
          </Button>
          <Button variant="gradient" onClick={shareStory}>
            <Send />
            {t("Share")}
          </Button>
        </div>

        <div
          ref={canvasRef}
          onPointerDown={drawStart}
          onPointerMove={drawMove}
          onPointerUp={drawEnd}
          onPointerLeave={drawEnd}
          onClick={onCanvasClick}
          className={cn(
            "relative w-full max-w-[420px] aspect-[9/16] rounded-[40px] overflow-hidden ring-1 ring-white/20 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]",
            tool === "draw" ? "cursor-crosshair" : "cursor-default"
          )}
        >
          {bg.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bg.value}
              alt=""
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{ filter: filterCss }}
            />
          ) : (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: bg.value, filter: filterCss }}
            />
          )}

          {paths.length > 0 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {paths.map((p, i) => (
                <path
                  key={i}
                  d={p.d}
                  stroke={p.color}
                  strokeWidth={p.w}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
            </svg>
          )}

          <AnimatePresence>
            {layers.map((l) => (
              <LayerView
                key={l.id}
                layer={l}
                selected={selectedId === l.id}
                onSelect={() => setSelectedId(l.id)}
                onUpdate={(patch) =>
                  setLayers((cur) => cur.map((x) => (x.id === l.id ? ({ ...x, ...patch } as Layer) : x)))
                }
                container={canvasRef}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* contextual action bar */}
        {selectedId && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-36 lg:bottom-6 inline-flex items-center gap-1 glass-strong rounded-full px-2 py-1.5 border border-border/50 z-10"
          >
            <Button variant="ghost" size="icon-sm" onClick={() => updateSelected({ rotate: (selected?.rotate ?? 0) - 15 })}>
              ↺
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => updateSelected({ rotate: (selected?.rotate ?? 0) + 15 })}>
              ↻
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => updateSelected({ scale: Math.max(0.3, (selected?.scale ?? 1) - 0.1) })}>
              −
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => updateSelected({ scale: Math.min(3, (selected?.scale ?? 1) + 0.1) })}>
              +
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button variant="ghost" size="icon-sm" onClick={removeSelected}>
              <Trash2 className="size-3.5" />
            </Button>
          </motion.div>
        )}

        {/* Music style switcher — shown when a music layer is selected */}
        {selected?.type === "music" && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-52 lg:bottom-20 inline-flex items-center gap-1 glass-strong rounded-full px-2 py-1.5 border border-border/50 z-10"
          >
            {(
              [
                { id: "card", label: "Card" },
                { id: "square", label: "Square" },
                { id: "circle", label: "Vinyl" },
                { id: "note", label: "Music only" }
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                onClick={() => updateSelected({ variant: v.id } as Partial<MusicLayer>)}
                className={cn(
                  "px-3 h-8 rounded-full text-xs font-medium transition-colors",
                  (selected as MusicLayer).variant === v.id
                    ? "bg-foreground text-background"
                    : "text-foreground/80 hover:bg-foreground/10"
                )}
              >
                {t(v.label)}
              </button>
            ))}
          </motion.div>
        )}

        {/* Filter strip — gated on toolbar toggle + image target available */}
        {filtersOpen && showFilterStrip && !sheet && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className="lg:hidden absolute bottom-20 inset-x-3 z-10"
          >
            <div className="glass-strong rounded-2xl border border-border/40 p-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-1.5">
                {selectedImageLayer ? t("Filter overlay") : t("Filter background")}
              </p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1.5 -mx-1 px-1">
                {FILTERS.map((f) => {
                  const previewSrc =
                    selectedImageLayer?.src ??
                    (bg.kind === "image" ? bg.value : "");
                  const isActive = currentFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => applyFilterToCurrent(f.id)}
                      className={cn(
                        "relative shrink-0 w-14 rounded-xl overflow-hidden transition",
                        isActive
                          ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-transparent"
                          : "ring-1 ring-border/50"
                      )}
                    >
                      <div className="relative aspect-square">
                        {previewSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewSrc}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{ filter: f.filter }}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-foreground/10" />
                        )}
                      </div>
                      <span className="block text-[9px] font-semibold text-white py-1 bg-black/55">
                        {f.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* ───── Right rail (desktop only) ───── */}
      <aside className="hidden lg:flex flex-col glass-strong glass-specular border-l border-border/60 h-full overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{t("Inspector")}</h3>
          <span className="text-xs font-medium text-foreground/70">{layers.length} {t("layers")}</span>
        </div>

        <div className="px-3 flex-1 overflow-y-auto no-scrollbar pb-6">
          {selected ? (
            <Inspector
              layer={selected}
              update={(p) => updateSelected(p)}
              remove={removeSelected}
            />
          ) : (
            <div className="text-center text-sm text-foreground/80 py-12 px-4">
              <Sparkles className="size-7 mx-auto mb-2 text-violet-400" />
              {t("Tap a layer on the canvas to fine-tune position, font, color, and rotation.")}
            </div>
          )}

          <div className="mt-6">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/70 mb-2">{t("Layers")}</h4>
            {layers.length === 0 ? (
              <p className="text-sm text-foreground/80">{t("No layers yet.")}</p>
            ) : (
              <Reorder.Group
                axis="y"
                values={layers.slice().reverse()}
                onReorder={(next) => setLayers(next.slice().reverse())}
                className="space-y-1"
              >
                {layers.slice().reverse().map((l) => (
                  <DesktopLayerRow
                    key={l.id}
                    layer={l}
                    isActive={selectedId === l.id}
                    onSelect={() => setSelectedId(l.id)}
                  />
                ))}
              </Reorder.Group>
            )}
          </div>
        </div>
      </aside>

      {/* ───── Mobile bottom toolbar ───── */}
      <MobileToolbar
        active={sheet}
        filtersOpen={filtersOpen}
        onSelect={(s) => {
          // Stickers tab opens the shared emoji/GIF/sticker picker.
          if (s === "stickers") {
            setTool("stickers");
            setStickerPickerOpen(true);
            return;
          }
          if (s === "text") {
            // Add text directly to center of canvas — Instagram style
            addText();
          }
          openSheet(s);
        }}
        onToggleFilters={() => setFiltersOpen((v) => !v)}
        onBack={() => router.back()}
      />

      {/* ───── Mobile sheets ───── */}
      <AnimatePresence mode="wait">
        {sheet === "media" && (
          <MobileMediaSheet
            key="media"
            onClose={() => setSheet(null)}
            onPickStock={(src) => {
              setBg({ kind: "image", value: src });
              setSheet(null);
            }}
            onPickGradient={(g) => {
              setBg({ kind: "gradient", value: g });
              setSheet(null);
            }}
            onPickOverlay={(src) => {
              addImage(src);
              setSheet(null);
            }}
            onBrowse={(mode) => {
              uploadTargetRef.current = mode;
              fileInputRef.current?.click();
              setSheet(null);
            }}
            onCamera={(mode) => {
              uploadTargetRef.current = mode;
              cameraInputRef.current?.click();
              setSheet(null);
            }}
          />
        )}
        {sheet === "layers" && (
          <MobileLayersSheet
            key="layers"
            onClose={() => setSheet(null)}
            layers={layers}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
            onDelete={removeLayer}
            onReorder={setLayers}
          />
        )}
        {sheet === "text" && (
          <MobileTextSheet
            key="text"
            onClose={() => setSheet(null)}
            selected={selected?.type === "text" ? (selected as TextLayer) : null}
            update={(p) => updateSelected(p)}
            onAdd={() => addText()}
          />
        )}
        {sheet === "draw" && (
          <MobileDrawSheet
            key="draw"
            onClose={() => setSheet(null)}
            color={drawColor}
            setColor={setDrawColor}
            size={drawSize}
            setSize={setDrawSize}
            clear={() => setPaths([])}
          />
        )}
        {sheet === "music" && (
          <MobileMusicSheet
            key="music"
            onClose={() => setSheet(null)}
            onPick={(t) => {
              addMusic(t);
              setSheet(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Auto-play the selected track's 30s preview on loop — like Instagram. */}
      {musicLayer?.preview && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio key={musicLayer.id} src={musicLayer.preview} autoPlay loop className="hidden" />
      )}

      {/* Mobile emoji / GIF / sticker picker (bottom sheet). Desktop uses the
          inline picker embedded in the left rail instead. */}
      <ExpressionsPicker
        open={stickerPickerOpen}
        onClose={() => setStickerPickerOpen(false)}
        onPick={onExpression}
      />
    </div>
  );
}

/* ----------------------------- Mobile bottom sheet ----------------------------- */

function MobileSheetWrapper({
  title,
  onClose,
  children,
  height = "70vh"
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  height?: string;
}) {
  const t = useT();
  return (
    <motion.div
      className="fixed inset-0 z-[200] lg:hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="absolute bottom-0 inset-x-0 rounded-t-3xl glass glass-specular border-t border-border/40 flex flex-col overflow-hidden"
        style={{ height }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 360, damping: 36 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120 || info.velocity.y > 500) onClose();
        }}
      >
        <div className="pt-3 pb-2 flex flex-col items-center cursor-grab active:cursor-grabbing shrink-0">
          <div className="w-10 h-1 rounded-full bg-foreground/25 mb-3" />
          <div className="w-full px-5 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="size-8 rounded-full grid place-items-center hover:bg-foreground/10 transition text-foreground"
              aria-label={t("Close")}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ----------------------------- Mobile sheets ----------------------------- */

function MobileMediaSheet({
  onClose,
  onPickStock,
  onPickGradient,
  onBrowse,
  onCamera,
  onPickOverlay
}: {
  onClose: () => void;
  onPickStock: (src: string) => void;
  onPickGradient: (g: string) => void;
  onBrowse: (mode: "background" | "overlay") => void;
  onCamera: (mode: "background" | "overlay") => void;
  onPickOverlay: (src: string) => void;
}) {
  const t = useT();
  const [tab, setTab] = React.useState<"images" | "gradients">("images");
  const [mode, setMode] = React.useState<"background" | "overlay">("background");

  return (
    <MobileSheetWrapper title={t("Media")} onClose={onClose} height="78vh">
      {/* Tab toggle (images / gradients) */}
      <div className="flex p-1 mb-3 rounded-full glass-subtle">
        {(["images", "gradients"] as const).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={cn(
              "flex-1 py-2 rounded-full text-sm font-medium capitalize transition",
              tab === tb ? "bg-foreground text-background" : "text-muted-foreground"
            )}
          >
            {t(tb === "images" ? "Images" : "Gradients")}
          </button>
        ))}
      </div>

      {/* Mode toggle — only meaningful for images */}
      {tab === "images" && (
        <div className="flex gap-1.5 mb-4">
          {(
            [
              { id: "background", label: "Background" },
              { id: "overlay", label: "Overlay" }
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "flex-1 py-1.5 rounded-full text-xs font-semibold transition",
                mode === m.id
                  ? "bg-foreground text-background"
                  : "glass-subtle text-muted-foreground"
              )}
            >
              {t(m.label)}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="popLayout" initial={false}>
        {tab === "images" ? (
          <motion.div
            key="images"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.7 }}
            className="grid grid-cols-2 gap-3"
          >
            {/* Camera tile */}
            <button
              onClick={() => onCamera(mode)}
              className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 grid place-items-center group"
            >
              <div className="relative z-10 flex flex-col items-center gap-1.5">
                <div className="size-12 rounded-full bg-white/25 backdrop-blur grid place-items-center ring-2 ring-white/50">
                  <Camera className="size-5 text-white" />
                </div>
                <span className="text-xs font-semibold text-white">{t("Camera")}</span>
              </div>
              <div className="absolute inset-0 bg-black/0 group-active:bg-black/20 transition" />
            </button>

            {/* Browse tile */}
            <button
              onClick={() => onBrowse(mode)}
              className="relative aspect-square rounded-2xl overflow-hidden bg-foreground/[0.04] border border-border/40 grid place-items-center group"
            >
              <div className="flex flex-col items-center gap-1.5">
                <div className="size-12 rounded-full bg-foreground/10 grid place-items-center">
                  <Folder className="size-5 text-foreground" />
                </div>
                <span className="text-xs font-semibold text-foreground">{t("Browse")}</span>
              </div>
            </button>

            {/* Recent / stock images */}
            {STOCK_IMAGES.slice(0, 8).map((src) => (
              <button
                key={src}
                onClick={() => (mode === "overlay" ? onPickOverlay(src) : onPickStock(src))}
                className="relative aspect-square rounded-2xl overflow-hidden group active:scale-95 transition"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {mode === "overlay" && (
                  <span className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/55 backdrop-blur grid place-items-center text-white">
                    <Layers className="size-3" />
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="gradients"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.7 }}
            className="grid grid-cols-2 gap-3"
          >
            {GRADIENTS.map((g) => (
              <button
                key={g}
                onClick={() => onPickGradient(g)}
                className="relative aspect-square rounded-2xl ring-1 ring-border/40 transition active:scale-95"
                style={{ background: g }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </MobileSheetWrapper>
  );
}

function DesktopLayerRow({
  layer,
  isActive,
  onSelect
}: {
  layer: Layer;
  isActive: boolean;
  onSelect: () => void;
}) {
  const t = useT();
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={layer}
      dragListener={false}
      dragControls={controls}
      layout="position"
      className={cn(
        "flex items-center gap-2 px-2 py-2 rounded-xl text-left transition-colors select-none",
        isActive ? "bg-foreground/10" : "hover:bg-foreground/5"
      )}
      whileDrag={{ scale: 1.02, zIndex: 10, boxShadow: "0 12px 30px -8px rgba(0,0,0,0.4)" }}
      transition={{ type: "spring", stiffness: 600, damping: 40, mass: 0.6 }}
    >
      <div
        onPointerDown={(e) => controls.start(e)}
        style={{ touchAction: "none" }}
        className="grid place-items-center text-muted-foreground shrink-0 px-1 py-1 cursor-grab active:cursor-grabbing"
        aria-label={t("Drag to reorder")}
        role="button"
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
          <circle cx="4" cy="3" r="1.2" />
          <circle cx="10" cy="3" r="1.2" />
          <circle cx="4" cy="7" r="1.2" />
          <circle cx="10" cy="7" r="1.2" />
          <circle cx="4" cy="11" r="1.2" />
          <circle cx="10" cy="11" r="1.2" />
        </svg>
      </div>
      <button
        onClick={onSelect}
        className="flex items-center gap-2 flex-1 min-w-0 text-left"
      >
        <span className="size-7 rounded-lg glass-subtle grid place-items-center text-sm shrink-0">
          {layer.type === "text" ? "T" : layer.type === "sticker" ? (layer as StickerLayer).emoji : "♪"}
        </span>
        <span className="text-sm font-medium text-foreground truncate flex-1">
          {layer.type === "text" ? (layer as TextLayer).text : layer.type === "music" ? (layer as MusicLayer).title : t("Sticker")}
        </span>
      </button>
    </Reorder.Item>
  );
}

function MobileLayerRow({
  layer,
  isActive,
  onSelect,
  onDelete
}: {
  layer: Layer;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  return (
    <Reorder.Item
      value={layer}
      layout="position"
      style={{ touchAction: "none" }}
      className={cn(
        "flex items-center gap-3 p-2.5 rounded-2xl transition-colors select-none cursor-grab active:cursor-grabbing",
        isActive
          ? "bg-foreground/10 ring-1 ring-cyan-400/60"
          : "glass-subtle"
      )}
      whileDrag={{ scale: 1.02, zIndex: 10, boxShadow: "0 12px 30px -8px rgba(0,0,0,0.4)" }}
      transition={{ type: "spring", stiffness: 600, damping: 40, mass: 0.6 }}
      onClick={onSelect}
    >
      <div
        className="grid place-items-center text-muted-foreground shrink-0 px-1 pointer-events-none"
        aria-hidden
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <circle cx="4" cy="3" r="1.2" />
          <circle cx="10" cy="3" r="1.2" />
          <circle cx="4" cy="7" r="1.2" />
          <circle cx="10" cy="7" r="1.2" />
          <circle cx="4" cy="11" r="1.2" />
          <circle cx="10" cy="11" r="1.2" />
        </svg>
      </div>

      <div className="size-11 rounded-xl glass-strong grid place-items-center overflow-hidden shrink-0 pointer-events-none">
        {layer.type === "text" ? (
          <span className="text-base font-semibold text-foreground">T</span>
        ) : layer.type === "sticker" ? (
          <span className="text-2xl">{(layer as StickerLayer).emoji}</span>
        ) : layer.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={(layer as ImageLayer).src}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <Music className="size-4 text-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1 pointer-events-none">
        <p className="text-sm font-medium text-foreground truncate">
          {layer.type === "text"
            ? (layer as TextLayer).text || t("Text layer")
            : layer.type === "sticker"
              ? `${t("Sticker")} · ${(layer as StickerLayer).emoji}`
              : layer.type === "image"
                ? t("Image overlay")
                : `${t("Music")} · ${(layer as MusicLayer).title}`}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {Math.round(layer.scale * 100)}% · {layer.rotate}°
        </p>
      </div>

      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="size-8 rounded-lg grid place-items-center text-rose-400 hover:bg-rose-400/15 shrink-0"
        aria-label={t("Delete layer")}
      >
        <Trash2 className="size-3.5" />
      </button>
    </Reorder.Item>
  );
}

function MobileLayersSheet({
  onClose,
  layers,
  selectedId,
  onSelect,
  onDelete,
  onReorder
}: {
  onClose: () => void;
  layers: Layer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (next: Layer[]) => void;
}) {
  const t = useT();
  // Top of the visual list = front-most. Internal layers[] order: last item = front-most.
  // Reorder operates on the *reversed* array so dragging up = bring forward.
  const reversed = layers.slice().reverse();

  return (
    <MobileSheetWrapper title={t("Layers")} onClose={onClose} height="62vh">
      {layers.length === 0 ? (
        <div className="text-center py-12">
          <Layers className="size-10 mx-auto text-muted-foreground/60 mb-3" />
          <p className="text-sm text-muted-foreground">{t("No layers yet.")}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {t("Add text, stickers, images, or music to your story.")}
          </p>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={reversed}
          onReorder={(next) => onReorder(next.slice().reverse())}
          className="space-y-2"
        >
          {reversed.map((l) => (
            <MobileLayerRow
              key={l.id}
              layer={l}
              isActive={l.id === selectedId}
              onSelect={() => {
                onSelect(l.id);
                onClose();
              }}
              onDelete={() => onDelete(l.id)}
            />
          ))}
        </Reorder.Group>
      )}
    </MobileSheetWrapper>
  );
}

function MobileTextSheet({
  onClose,
  selected,
  update,
  onAdd
}: {
  onClose: () => void;
  selected: TextLayer | null;
  update: (p: Partial<TextLayer>) => void;
  onAdd: () => void;
}) {
  const t = useT();
  return (
    <MobileSheetWrapper title={t("Text")} onClose={onClose} height="68vh">
      {!selected ? (
        <div className="text-center py-12">
          <TypeIcon className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">{t("No text layer selected.")}</p>
          <Button onClick={onAdd} variant="gradient">
            <TypeIcon /> {t("Add text")}
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <textarea
            value={selected.text}
            onChange={(e) => update({ text: e.target.value })}
            rows={3}
            autoFocus
            className="block w-full min-h-[7rem] rounded-2xl glass-subtle px-4 py-3.5 text-base leading-relaxed text-foreground placeholder:text-muted-foreground outline-none resize-none focus:ring-2 focus:ring-cyan-400/60"
            placeholder={t("Type your story…")}
            style={{ fontFamily: fontFamilyFor(selected.font) }}
          />

          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{t("Alignment")}</h4>
            <div className="flex gap-2">
              {(
                [
                  { id: "left", icon: <AlignLeft className="size-4" /> },
                  { id: "center", icon: <AlignCenter className="size-4" /> },
                  { id: "right", icon: <AlignRight className="size-4" /> }
                ] as const
              ).map((a) => (
                <button
                  key={a.id}
                  onClick={() => update({ align: a.id })}
                  className={cn(
                    "flex-1 h-11 rounded-xl grid place-items-center transition-colors",
                    selected.align === a.id
                      ? "bg-foreground text-background"
                      : "glass-subtle text-foreground"
                  )}
                >
                  {a.icon}
                </button>
              ))}
              <button
                onClick={() => update({ bold: !selected.bold })}
                className={cn(
                  "flex-1 h-11 rounded-xl grid place-items-center transition-colors",
                  selected.bold
                    ? "bg-foreground text-background"
                    : "glass-subtle text-foreground"
                )}
              >
                <Bold className="size-4" />
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{t("Font")}</h4>
            <div className="grid grid-cols-4 gap-2">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => update({ font: f.id })}
                  title={f.label}
                  className={cn(
                    "h-12 rounded-xl text-base transition-colors",
                    selected.font === f.id
                      ? "bg-foreground text-background"
                      : "glass-subtle text-foreground"
                  )}
                  style={{ fontFamily: f.family }}
                >
                  Aa
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{t("Color")}</h4>
            <div className="flex flex-wrap gap-2">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => update({ color: c })}
                  className={cn(
                    "size-9 rounded-full ring-2 ring-offset-2 ring-offset-transparent transition",
                    selected.color === c ? "ring-foreground" : "ring-transparent"
                  )}
                  style={{ background: c }}
                />
              ))}
              <EyeDropperButton className="size-9" onPick={(hex) => update({ color: hex })} />
            </div>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{t("Background")}</h4>
            <div className="grid grid-cols-5 gap-2">
              {TEXT_BGS.map((b) => {
                const isTransparent = b.value === "transparent";
                return (
                  <button
                    key={b.label}
                    onClick={() => update({ bg: b.value, color: b.fg })}
                    className={cn(
                      "h-11 rounded-xl text-xs grid place-items-center transition border",
                      isTransparent ? "glass-subtle border-border/40" : "border-border/40",
                      selected.bg === b.value ? "ring-2 ring-foreground" : ""
                    )}
                    style={
                      isTransparent
                        ? undefined
                        : { background: b.value, color: b.fg }
                    }
                  >
                    <span className={isTransparent ? "text-foreground" : undefined}>
                      {b.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </MobileSheetWrapper>
  );
}

function MobileDrawSheet({
  onClose,
  color,
  setColor,
  size,
  setSize,
  clear
}: {
  onClose: () => void;
  color: string;
  setColor: (c: string) => void;
  size: number[];
  setSize: (v: number[]) => void;
  clear: () => void;
}) {
  const t = useT();
  return (
    <MobileSheetWrapper title={t("Draw")} onClose={onClose} height="58vh">
      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-sm mb-3 text-foreground">
            <span>{t("Brush size")}</span>
            <span className="text-muted-foreground">{size[0]}px</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="grid place-items-center" style={{ width: 36, height: 36 }}>
              <div
                style={{
                  width: size[0] + 4,
                  height: size[0] + 4,
                  background: color,
                  borderRadius: "9999px"
                }}
              />
            </div>
            <Slider value={size} onValueChange={setSize} min={1} max={32} step={1} className="flex-1" />
          </div>
        </div>

        <div>
          <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">{t("Color")}</h4>
          <div className="grid grid-cols-8 gap-2">
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  "aspect-square rounded-full ring-2 ring-offset-2 ring-offset-transparent transition",
                  color === c ? "ring-foreground" : "ring-transparent"
                )}
                style={{ background: c }}
              />
            ))}
            <EyeDropperButton className="aspect-square w-full" onPick={(hex) => setColor(hex)} />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={clear} variant="glass" className="flex-1">
            <Eraser /> {t("Clear")}
          </Button>
          <Button onClick={onClose} variant="gradient" className="flex-1">
            {t("Done")}
          </Button>
        </div>

        <p className="text-[12px] text-muted-foreground text-center">
          {t("Close the sheet and drag on the canvas to draw.")}
        </p>
      </div>
    </MobileSheetWrapper>
  );
}

function MobileMusicSheet({
  onClose,
  onPick
}: {
  onClose: () => void;
  onPick: (t: Track) => void;
}) {
  const t = useT();
  const { query, setQuery, results, loading, error } = useItunesSearch();
  const { playingId, play, stop } = useAudioPreview();

  // stop audio when sheet unmounts
  React.useEffect(() => () => stop(), [stop]);

  return (
    <MobileSheetWrapper title={t("Music")} onClose={onClose} height="80vh">
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          placeholder={t("Search Apple Music")}
          className="pl-10 h-11 glass-subtle text-foreground placeholder:text-muted-foreground border-border/40"
        />
        {loading && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 block size-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
        )}
      </div>

      {error ? (
        <p className="text-center text-sm text-rose-400 py-8">{t(error)}</p>
      ) : results.length === 0 && !loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          {query.trim() ? `${t("No tracks match")} "${query}"` : t("Powered by Apple Music.")}
        </p>
      ) : (
        <div className="space-y-2">
          {!query.trim() && (
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground px-1 mb-1">
              {t("Trending now")}
            </p>
          )}
          {results.map((tr) => {
            const isPlaying = playingId === tr.id;
            return (
              <div
                key={tr.id}
                onClick={() => {
                  stop();
                  onPick(tr);
                }}
                role="button"
                tabIndex={0}
                className="w-full flex items-center gap-3 p-3 rounded-2xl glass-subtle hover:bg-foreground/5 transition-colors text-left cursor-pointer"
              >
                <div className="size-12 rounded-xl overflow-hidden grid place-items-center text-white shadow-glow shrink-0 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400">
                  {tr.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tr.cover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Music className="size-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{tr.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{tr.artist}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    play(tr);
                  }}
                  className={cn(
                    "size-9 rounded-full grid place-items-center transition-colors",
                    isPlaying
                      ? "bg-foreground text-background"
                      : "bg-foreground/10 text-foreground hover:bg-foreground/20"
                  )}
                  aria-label={isPlaying ? t("Stop preview") : t("Play 30s preview")}
                >
                  {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5 ml-0.5" />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground text-center mt-4 pb-4">
        {t("Tap a track to add it to your story. Tap play for a 30-second preview.")}
      </p>
    </MobileSheetWrapper>
  );
}

/* ----------------------------- Desktop panels (unchanged) ----------------------------- */

function DesktopMediaPanel({
  onPickStock,
  onPickGradient,
  onPickOverlay,
  onUpload
}: {
  onPickStock: (src: string) => void;
  onPickGradient: (g: string) => void;
  onPickOverlay: (src: string) => void;
  onUpload: (mode: "background" | "overlay") => void;
}) {
  const t = useT();
  const [tab, setTab] = React.useState<"images" | "gradients">("images");
  const [mode, setMode] = React.useState<"background" | "overlay">("background");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  // Reset multi-select when switching tab or mode (background can't be multi)
  React.useEffect(() => {
    setSelected(new Set());
  }, [tab, mode]);

  const toggle = (src: string) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(src)) next.delete(src);
      else next.add(src);
      return next;
    });
  };

  const addSelected = () => {
    selected.forEach((src) => onPickOverlay(src));
    setSelected(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Tabs: Images / Gradients */}
      <div className="flex p-1 rounded-full glass-subtle">
        {(["images", "gradients"] as const).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={cn(
              "flex-1 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors",
              tab === tb ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t(tb === "images" ? "Images" : "Gradients")}
          </button>
        ))}
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        {tab === "images" ? (
          <motion.div
            key="images"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.7 }}
            className="space-y-4"
          >
            {/* Mode toggle: Background / Overlay */}
            <div className="flex gap-1.5">
              {(
                [
                  { id: "background", label: "Background" },
                  { id: "overlay", label: "Overlay" }
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "flex-1 py-1.5 rounded-full text-[11px] font-semibold transition-colors",
                    mode === m.id
                      ? "bg-foreground text-background"
                      : "glass-subtle text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Stock grid — first tile is upload, rest are stock thumbnails.
                Multi-select toggles in overlay mode. */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("Library")}</h4>
                {mode === "overlay" && (
                  <span className="text-[10px] text-muted-foreground">
                    {selected.size > 0 ? `${selected.size} ${t("selected")}` : t("Tap to multi-select")}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {/* Upload tile — sits inline with the stock thumbnails */}
                <button
                  onClick={() => onUpload(mode)}
                  className="relative aspect-square rounded-xl border-2 border-dashed border-border/60 grid place-items-center hover:border-foreground/40 transition-colors group"
                  aria-label={t("Upload an image")}
                >
                  <div className="text-center px-1">
                    <div className="size-8 mx-auto rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-glow group-hover:scale-110 transition-transform">
                      <ImageIcon className="size-4 text-white" />
                    </div>
                    <p className="text-[10px] mt-1 text-muted-foreground leading-tight">{t("Upload")}</p>
                  </div>
                </button>

                {STOCK_IMAGES.map((src) => {
                  const isSelected = selected.has(src);
                  return (
                    <button
                      key={src}
                      onClick={() => (mode === "overlay" ? toggle(src) : onPickStock(src))}
                      className={cn(
                        "relative aspect-square rounded-xl overflow-hidden group transition",
                        isSelected && "ring-2 ring-cyan-400"
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover transition group-hover:scale-110"
                      />
                      {mode === "overlay" && (
                        <span
                          className={cn(
                            "absolute top-1.5 right-1.5 size-5 rounded-full grid place-items-center text-[10px] font-bold transition",
                            isSelected
                              ? "bg-cyan-400 text-black"
                              : "bg-black/55 text-white opacity-0 group-hover:opacity-100"
                          )}
                        >
                          {isSelected ? "✓" : <Layers className="size-2.5" />}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {mode === "overlay" && selected.size > 0 && (
                <Button onClick={addSelected} variant="gradient" className="w-full mt-3">
                  {t("Add")} {selected.size} {selected.size === 1 ? t("image") : t("images")}
                </Button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="gradients"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.7 }}
          >
            <div className="grid grid-cols-3 gap-1.5">
              {GRADIENTS.map((g) => (
                <button
                  key={g}
                  onClick={() => onPickGradient(g)}
                  className="aspect-square rounded-xl ring-1 ring-border/40 hover:ring-foreground/40 transition"
                  style={{ background: g }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Eyedropper — samples any on-screen pixel (e.g. a color from the story
 *  image) via the native EyeDropper API. Hidden where unsupported (Safari /
 *  Firefox). Rendered as an extra "swatch" beside the preset colors. */
function EyeDropperButton({
  onPick,
  className = "size-7"
}: {
  onPick: (hex: string) => void;
  className?: string;
}) {
  const t = useT();
  const [supported, setSupported] = React.useState(false);
  React.useEffect(() => {
    setSupported(typeof window !== "undefined" && "EyeDropper" in window);
  }, []);
  if (!supported) return null;
  const open = async () => {
    try {
      const Ctor = (
        window as unknown as {
          EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> };
        }
      ).EyeDropper;
      const res = await new Ctor().open();
      if (res?.sRGBHex) onPick(res.sRGBHex);
    } catch {
      /* user cancelled the picker */
    }
  };
  return (
    <button
      type="button"
      onClick={open}
      title={t("Pick color from image")}
      aria-label={t("Pick color from image")}
      className={cn(
        "rounded-full grid place-items-center glass-subtle border border-border/50 text-foreground hover:bg-foreground/10 transition",
        className
      )}
    >
      <Pipette className="size-3.5" />
    </button>
  );
}

function TextPanel({
  addText,
  selected,
  updateSelected
}: {
  addText: () => void;
  selected: TextLayer | null;
  updateSelected: (p: Partial<TextLayer>) => void;
}) {
  const t = useT();
  return (
    <div className="space-y-4">
      <Button onClick={addText} variant="gradient" className="w-full">
        <TypeIcon /> {t("Add text layer")}
      </Button>

      {selected && (
        <div className="space-y-4">
          <textarea
            value={selected.text}
            onChange={(e) => updateSelected({ text: e.target.value })}
            rows={3}
            className="w-full rounded-xl glass-subtle px-3 py-2 text-sm outline-none resize-none"
            placeholder={t("Your story…")}
          />

          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{t("Font")}</h4>
            <div className="grid grid-cols-4 gap-1.5">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => updateSelected({ font: f.id })}
                  title={f.label}
                  className={cn(
                    "h-10 rounded-lg text-sm transition",
                    selected.font === f.id
                      ? "bg-foreground text-background"
                      : "glass-subtle hover:bg-foreground/5"
                  )}
                  style={{ fontFamily: f.family }}
                >
                  Aa
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{t("Color")}</h4>
            <div className="flex flex-wrap gap-1.5">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateSelected({ color: c })}
                  className={cn(
                    "size-7 rounded-full ring-2 ring-offset-2 ring-offset-transparent transition",
                    selected.color === c ? "ring-foreground" : "ring-transparent"
                  )}
                  style={{ background: c }}
                />
              ))}
              <EyeDropperButton onPick={(hex) => updateSelected({ color: hex })} />
            </div>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{t("Background")}</h4>
            <div className="grid grid-cols-5 gap-1.5">
              {TEXT_BGS.map((b) => (
                <button
                  key={b.label}
                  onClick={() => updateSelected({ bg: b.value, color: b.fg })}
                  className={cn(
                    "h-8 rounded-md text-[10px] grid place-items-center transition",
                    selected.bg === b.value ? "ring-2 ring-foreground" : ""
                  )}
                  style={{
                    background: b.value === "transparent" ? "rgba(255,255,255,0.06)" : b.value,
                    color: b.fg
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => updateSelected({ bold: !selected.bold })}
              className={cn(
                "flex-1 h-9 rounded-lg text-sm transition",
                selected.bold ? "bg-foreground text-background" : "glass-subtle"
              )}
            >
              <Bold className="size-3.5 inline" />
            </button>
            <button
              onClick={() =>
                updateSelected({
                  align: selected.align === "center" ? "left" : selected.align === "left" ? "right" : "center"
                })
              }
              className="flex-1 h-9 rounded-lg glass-subtle text-sm grid place-items-center"
            >
              <AlignCenter className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterPanel({
  value,
  onChange,
  preview
}: {
  value: string;
  onChange: (v: string) => void;
  preview: Background;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 pt-3">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          onClick={() => onChange(f.id)}
          className={cn(
            "relative aspect-[3/4] rounded-2xl overflow-hidden ring-2 transition",
            value === f.id ? "ring-cyan-400" : "ring-transparent hover:ring-white/20"
          )}
        >
          {preview.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.value}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: f.filter }}
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: preview.value, filter: f.filter }}
            />
          )}
          <span className="absolute bottom-1 inset-x-1 text-[10px] font-medium text-white drop-shadow text-center">
            {f.label}
          </span>
        </button>
      ))}
    </div>
  );
}

function DrawPanel({
  color,
  setColor,
  size,
  setSize,
  clear
}: {
  color: string;
  setColor: (c: string) => void;
  size: number[];
  setSize: (v: number[]) => void;
  clear: () => void;
}) {
  const t = useT();
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{t("Color")}</h4>
        <div className="flex flex-wrap gap-1.5">
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                "size-7 rounded-full ring-2 ring-offset-2 ring-offset-transparent transition",
                color === c ? "ring-foreground" : "ring-transparent"
              )}
              style={{ background: c }}
            />
          ))}
          <EyeDropperButton onPick={(hex) => setColor(hex)} />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs mb-2">
          <span>{t("Brush size")}</span>
          <span className="text-muted-foreground">{size[0]}px</span>
        </div>
        <Slider value={size} onValueChange={setSize} min={1} max={32} step={1} />
      </div>
      <Button onClick={clear} variant="glass" className="w-full">
        <Eraser /> {t("Clear strokes")}
      </Button>
      <p className="text-[11px] text-muted-foreground">
        {t("Tap and drag on the canvas to draw.")}
      </p>
    </div>
  );
}

function MusicPanel({ onPick }: { onPick: (t: Track) => void }) {
  const t = useT();
  const { query, setQuery, results, loading, error } = useItunesSearch();
  const { playingId, play, stop } = useAudioPreview();
  React.useEffect(() => () => stop(), [stop]);

  return (
    <div className="space-y-3 pt-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Search Apple Music")}
          className="pl-9 h-10 glass-subtle border-border/40"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 block size-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
        )}
      </div>

      {error ? (
        <p className="text-center text-xs text-rose-400 py-8">{t(error)}</p>
      ) : results.length === 0 && !loading ? (
        <p className="text-center text-xs text-muted-foreground py-8">
          {query.trim() ? `${t("No tracks match")} "${query}"` : t("Powered by Apple Music.")}
        </p>
      ) : (
        <div className="space-y-2">
          {!query.trim() && (
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 mb-1">
              {t("Trending now")}
            </p>
          )}
          {results.map((tr) => {
            const isPlaying = playingId === tr.id;
            return (
              <div
                key={tr.id}
                onClick={() => {
                  stop();
                  onPick(tr);
                }}
                role="button"
                tabIndex={0}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl glass-subtle hover:bg-foreground/5 transition-colors cursor-pointer"
              >
                <div className="size-10 rounded-lg overflow-hidden grid place-items-center text-white shadow-glow shrink-0 bg-gradient-to-br from-violet-500 to-cyan-400">
                  {tr.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tr.cover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Music className="size-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate">{tr.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{tr.artist}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    play(tr);
                  }}
                  className={cn(
                    "size-8 rounded-full grid place-items-center transition-colors shrink-0",
                    isPlaying
                      ? "bg-foreground text-background"
                      : "bg-foreground/10 text-foreground hover:bg-foreground/20"
                  )}
                  aria-label={isPlaying ? t("Stop preview") : t("Play 30s preview")}
                >
                  {isPlaying ? <Pause className="size-3" /> : <Play className="size-3 ml-0.5" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Inspector({
  layer,
  update,
  remove
}: {
  layer: Layer;
  update: (p: Partial<Layer>) => void;
  remove: () => void;
}) {
  const t = useT();
  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span>{t("Scale")}</span>
          <span className="text-muted-foreground">{Math.round(layer.scale * 100)}%</span>
        </div>
        <Slider
          value={[layer.scale]}
          onValueChange={(v) => update({ scale: v[0] })}
          min={0.3}
          max={3}
          step={0.05}
        />
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span>{t("Rotate")}</span>
          <span className="text-muted-foreground">{layer.rotate}°</span>
        </div>
        <Slider
          value={[layer.rotate]}
          onValueChange={(v) => update({ rotate: v[0] })}
          min={-180}
          max={180}
          step={1}
        />
      </div>
      <Button variant="glass" className="w-full text-rose-400" onClick={remove}>
        <Trash2 /> {t("Delete layer")}
      </Button>
    </div>
  );
}

/* ----------------------------- music layer (3 variants) ----------------------------- */

// Memoised: the parent LayerView re-renders on select / drag / restyle, and a
// fresh render would restart the framer rotate/marquee. With memo it only
// re-renders when the music layer's own data changes, so the vinyl keeps
// spinning continuously.
const MusicLayerView = React.memo(function MusicLayerView({ m }: { m: MusicLayer }) {
  // Square cover art only.
  if (m.variant === "square") {
    return (
      <div className="relative size-24 rounded-2xl overflow-hidden ring-2 ring-white/30 shadow-floating">
        {m.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.cover} alt="" draggable={false} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-white/15 grid place-items-center text-white">
            <Music className="size-7" />
          </div>
        )}
        <span className="absolute bottom-1.5 right-1.5 size-6 rounded-full bg-black/55 backdrop-blur grid place-items-center text-white">
          <Music className="size-3" />
        </span>
      </div>
    );
  }

  // Spinning circular cover — like a vinyl record.
  if (m.variant === "circle") {
    return <VinylDisc cover={m.cover} />;
  }

  // "Music only" — nothing rendered on the story; the track just plays. It
  // still appears in the layers list so it can be selected / restyled / removed.
  if (m.variant === "note") {
    return null;
  }

  // card (default): glass pill, square cover + marquee title + artist.
  return (
    <div className="inline-flex items-center gap-3 pl-2 pr-4 py-2 rounded-2xl bg-black/55 backdrop-blur-md ring-1 ring-white/15 text-white">
      {m.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.cover} alt="" draggable={false} className="size-11 rounded-xl object-cover shrink-0" />
      ) : (
        <span className="size-11 rounded-xl bg-white/15 grid place-items-center shrink-0">
          <Music className="size-4" />
        </span>
      )}
      <div className="min-w-0">
        <div className="overflow-hidden w-[150px]">
          <motion.div
            className="inline-flex whitespace-nowrap gap-10"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
          >
            <span className="text-sm font-bold">{m.title}</span>
            <span className="text-sm font-bold" aria-hidden>
              {m.title}
            </span>
          </motion.div>
        </div>
        <span className="block text-[11px] opacity-75 truncate w-[150px]">{m.artist}</span>
      </div>
    </div>
  );
});

/* ----------------------------- layer view ----------------------------- */

function LayerView({
  layer,
  selected,
  onSelect,
  onUpdate,
  container
}: {
  layer: Layer;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (p: Partial<Layer>) => void;
  container: React.RefObject<HTMLDivElement | null>;
}) {
  // Drag offset motion values — reset to 0 after each drag so style.left/top is the only source of truth
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  return (
    <motion.div
      drag
      dragMomentum={false}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDragEnd={(_, info) => {
        const el = container.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const cx = layer.x + (info.offset.x / r.width) * 100;
        const cy = layer.y + (info.offset.y / r.height) * 100;
        onUpdate({ x: Math.max(0, Math.min(100, cx)), y: Math.max(0, Math.min(100, cy)) });
        // Reset the drag transform; the new position is now in style.left/top
        dragX.set(0);
        dragY.set(0);
      }}
      style={{
        left: `${layer.x}%`,
        top: `${layer.y}%`,
        x: dragX,
        y: dragY
      }}
      animate={{ rotate: layer.rotate, scale: layer.scale, opacity: 1 }}
      initial={{ scale: 0.6, opacity: 0 }}
      exit={{ scale: 0.6, opacity: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      // framer-motion writes an inline `transform`, which overrides Tailwind's
      // `-translate-1/2`. Prepend the centering here so the layer's CENTER sits
      // on (x%, y%) — matching how the PNG export anchors each layer. Without
      // this the on-screen (top-left-anchored) and exported (center-anchored)
      // positions diverge by half the element size.
      //
      // At rest framer emits `generated === "none"`; `translate(...) none` is
      // INVALID CSS, so the browser drops the whole transform (losing the
      // centering + scale) until you interact — which made layers visibly jump
      // / resize when grabbed. Only append a real transform.
      transformTemplate={(_, generated) =>
        generated && generated !== "none"
          ? `translate(-50%, -50%) ${generated}`
          : "translate(-50%, -50%)"
      }
      className={cn(
        // `w-max` (width: max-content) sizes the layer to its own content so it
        // never gets squeezed by the space remaining to the canvas edge — without
        // it, a layer near the right edge wraps/shrinks because `left: X%` caps
        // its available width.
        "absolute w-max cursor-grab active:cursor-grabbing touch-none",
        selected && "outline outline-2 outline-cyan-400 outline-offset-2 rounded-md"
      )}
    >
      {layer.type === "text" ? (
        <div
          className="px-3 py-1.5 rounded-md max-w-[280px]"
          style={{
            background: (layer as TextLayer).bg,
            color: (layer as TextLayer).color,
            fontFamily: fontFamilyFor((layer as TextLayer).font),
            fontWeight: (layer as TextLayer).bold ? 700 : 400,
            textAlign: (layer as TextLayer).align,
            fontSize: 26,
            lineHeight: 1.15,
            whiteSpace: "pre-wrap",
            textShadow: (layer as TextLayer).bg === "transparent" ? "0 1px 2px rgba(0,0,0,0.35)" : undefined
          }}
        >
          {(layer as TextLayer).text}
        </div>
      ) : layer.type === "sticker" ? (
        <span
          style={{
            fontSize: (layer as StickerLayer).size,
            fontFamily: 'var(--font-emoji),"Apple Color Emoji","Segoe UI Emoji",sans-serif'
          }}
        >
          {(layer as StickerLayer).emoji}
        </span>
      ) : layer.type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={(layer as ImageLayer).src}
          alt=""
          draggable={false}
          style={{
            width: (layer as ImageLayer).width,
            height: (layer as ImageLayer).height,
            objectFit: "cover",
            borderRadius: 12,
            filter:
              FILTERS.find((f) => f.id === (layer as ImageLayer).filter)?.filter ??
              "none"
          }}
          className="select-none pointer-events-none shadow-[0_8px_24px_-6px_rgba(0,0,0,0.5)]"
        />
      ) : (
        <MusicLayerView m={layer as MusicLayer} />
      )}
    </motion.div>
  );
}

/* ----------------------------- mobile toolbar ----------------------------- */

function MobileToolbar({
  active,
  filtersOpen,
  onSelect,
  onToggleFilters,
  onBack
}: {
  active: MobileSheet;
  filtersOpen: boolean;
  onSelect: (s: Exclude<MobileSheet, null>) => void;
  onToggleFilters: () => void;
  onBack: () => void;
}) {
  const t = useT();
  const sheets: { id: Exclude<MobileSheet, null>; icon: React.ReactNode; label: string }[] = [
    { id: "media", icon: <ImageIcon className="size-[18px]" />, label: "Media" },
    { id: "text", icon: <TypeIcon className="size-[18px]" />, label: "Text" },
    { id: "stickers", icon: <Smile className="size-[18px]" />, label: "Stickers" },
    { id: "draw", icon: <Pencil className="size-[18px]" />, label: "Draw" },
    { id: "music", icon: <Music className="size-[18px]" />, label: "Music" }
  ];
  return (
    <div className="lg:hidden fixed bottom-3 inset-x-3 z-10 glass-strong glass-specular rounded-2xl px-2 py-2 border border-border/40 flex justify-between gap-1">
      {sheets.map((it) => (
        <button
          key={it.id}
          onClick={() => onSelect(it.id)}
          className={cn(
            "flex-1 grid place-items-center gap-0.5 py-1.5 rounded-xl text-[10px] font-medium transition",
            active === it.id
              ? "bg-foreground/10 text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {it.icon}
          {t(it.label)}
        </button>
      ))}
      <button
        onClick={onToggleFilters}
        aria-pressed={filtersOpen}
        className={cn(
          "flex-1 grid place-items-center gap-0.5 py-1.5 rounded-xl text-[10px] font-medium transition",
          filtersOpen
            ? "bg-cyan-400/20 text-cyan-700 dark:text-cyan-200 ring-1 ring-cyan-400/40"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Palette className="size-[18px]" />
        {t("Filter")}
      </button>
    </div>
  );
}
