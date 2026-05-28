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
  font: "sans" | "serif" | "mono" | "display";
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

const STICKER_PACKS: { name: string; items: string[] }[] = [
  { name: "Mood", items: ["✨", "💜", "🔥", "🥲", "🤍", "🌙", "☀️", "⚡", "🌈", "💫", "🌸", "🪩"] },
  { name: "Faces", items: ["😂", "😎", "🥹", "😌", "🤯", "😴", "🤝", "🫶", "👀", "🙌", "🫧", "🤗"] },
  { name: "Music", items: ["🎧", "🎶", "🎹", "🪕", "🎤", "🥁", "🎚️", "🎛️"] },
  { name: "Travel", items: ["✈️", "🌍", "🗺️", "🚀", "🏝️", "🏔️", "🌌", "🚆"] },
  { name: "Love", items: ["❤️", "💖", "💘", "💝", "💗", "💓", "💞", "💕"] }
];

const FONT_FAMILIES: Record<TextLayer["font"], string> = {
  sans: "var(--font-sans)",
  display: "var(--font-display)",
  mono: "var(--font-mono)",
  serif: "'Times New Roman', Georgia, serif"
};

const TEXT_BGS: { label: string; value: string; fg: string }[] = [
  { label: "None", value: "transparent", fg: "#ffffff" },
  { label: "White", value: "#ffffffee", fg: "#000000" },
  { label: "Black", value: "#000000aa", fg: "#ffffff" },
  { label: "Violet", value: "#8B5CF6cc", fg: "#ffffff" },
  { label: "Pink", value: "#EC4899cc", fg: "#ffffff" }
];

const TEXT_COLORS = ["#ffffff", "#000000", "#8B5CF6", "#22D3EE", "#EC4899", "#FBBF24", "#A3E635", "#FB923C"];

// Each track carries a root frequency (Hz) + waveform so the preview synth
// generates a recognisable, distinct ambient pad per track.
const MUSIC_TRACKS = [
  { id: "m1", title: "Glass Cathedrals", artist: "Obsidian FM",       duration: "3:24", root: 220.00, wave: "sine"     as OscillatorType },
  { id: "m2", title: "Aurora Drift",     artist: "Synth Citizens", duration: "2:51", root: 261.63, wave: "triangle" as OscillatorType },
  { id: "m3", title: "Midnight Lounge",  artist: "Kai Nakamura",  duration: "4:08", root: 174.61, wave: "sine"     as OscillatorType },
  { id: "m4", title: "Neon Pulse",       artist: "Lyra Chen",     duration: "3:12", root: 329.63, wave: "sawtooth" as OscillatorType },
  { id: "m5", title: "Vapor Skies",      artist: "Iris Park",     duration: "3:48", root: 246.94, wave: "triangle" as OscillatorType },
  { id: "m6", title: "Helios",           artist: "Atlas Vega",    duration: "2:34", root: 293.66, wave: "sine"     as OscillatorType }
];

type Track = (typeof MUSIC_TRACKS)[number];

/** Collision-free id generator: many calls inside one ms (e.g. batch-add)
 *  still get distinct ids. */
const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Web Audio preview — synthesises a 30-second ambient pad per track. */
function useAudioPreview() {
  const [playingId, setPlayingId] = React.useState<string | null>(null);
  const ctxRef = React.useRef<AudioContext | null>(null);
  const activeRef = React.useRef<{ stop: () => void } | null>(null);
  const timerRef = React.useRef<number | null>(null);

  const stop = React.useCallback(() => {
    activeRef.current?.stop();
    activeRef.current = null;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPlayingId(null);
  }, []);

  const play = React.useCallback(
    (track: Track) => {
      // tapping the same track again toggles off
      if (activeRef.current && playingId === track.id) {
        stop();
        return;
      }
      activeRef.current?.stop();

      const Ctor =
        typeof window !== "undefined"
          ? window.AudioContext ||
            (window as typeof window & { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext
          : undefined;
      if (!Ctor) return;
      const ctx = ctxRef.current ?? (ctxRef.current = new Ctor());
      if (ctx.state === "suspended") ctx.resume();

      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(0.14, now + 1.2);

      // Soft low-pass to take the edge off saw/triangle harmonics
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1600;
      filter.Q.value = 0.5;
      master.connect(filter).connect(ctx.destination);

      // Root + perfect fifth + octave triad — sounds pleasant for any root
      const ratios = [1, 1.5, 2];
      const oscs = ratios.map((r, i) => {
        const o = ctx.createOscillator();
        o.type = track.wave;
        o.frequency.value = track.root * r;
        const g = ctx.createGain();
        g.gain.value = i === 0 ? 0.5 : 0.3;
        o.connect(g).connect(master);
        o.start(now);
        return o;
      });

      // Slow LFO drifting the root pitch for movement
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.12;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 2.5;
      lfo.connect(lfoGain).connect(oscs[0].frequency);
      lfo.start(now);

      activeRef.current = {
        stop: () => {
          const t = ctx.currentTime;
          master.gain.cancelScheduledValues(t);
          master.gain.setValueAtTime(master.gain.value, t);
          master.gain.linearRampToValueAtTime(0, t + 0.35);
          oscs.forEach((o) => o.stop(t + 0.4));
          lfo.stop(t + 0.4);
        }
      };

      timerRef.current = window.setTimeout(() => stop(), 30_000);
      setPlayingId(track.id);
    },
    [playingId, stop]
  );

  React.useEffect(() => () => stop(), [stop]);

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
  const [showLayers, setShowLayers] = React.useState(false);

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
  const filterCss = FILTERS.find((f) => f.id === filter)?.filter ?? "none";

  /* ----- layer ops ----- */
  const addText = (initial?: Partial<TextLayer>) => {
    const l: TextLayer = {
      id: uid("t"),
      type: "text",
      text: "Type something",
      color: "#ffffff",
      bg: "transparent",
      font: "display",
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

  const addMusic = (track: (typeof MUSIC_TRACKS)[number]) => {
    // Replace any existing music layer (only one allowed)
    const filtered = layers.filter((l) => l.type !== "music");
    const l: MusicLayer = {
      id: uid("m"),
      type: "music",
      title: track.title,
      artist: track.artist,
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
    setBg({ kind: "image", value: url });
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

  /* ----- download story ----- */
  const [downloading, setDownloading] = React.useState(false);
  const downloadStory = async () => {
    if (!canvasRef.current || downloading) return;
    setDownloading(true);
    try {
      const W = 1080;
      const H = 1920;
      const out = document.createElement("canvas");
      out.width = W;
      out.height = H;
      const ctx = out.getContext("2d");
      if (!ctx) return;

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
      const dispRect = canvasRef.current.getBoundingClientRect();
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
          const fontFamily =
            t.font === "serif"
              ? '"Times New Roman", Georgia, serif'
              : t.font === "mono"
                ? '"JetBrains Mono", monospace'
                : t.font === "display"
                  ? 'Inter, sans-serif'
                  : "Inter, sans-serif";
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
          ctx.font = `${s.size * sx}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(s.emoji, 0, 0);
        } else if (l.type === "image") {
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
        } else if (l.type === "music") {
          const m = l as MusicLayer;
          const label = `♪ ${m.title} · ${m.artist}`;
          ctx.font = `bold ${12 * sx}px Inter, sans-serif`;
          const w = ctx.measureText(label).width;
          const padX = 14 * sx;
          const padY = 8 * sy;
          const h = 14 * sx + padY * 2;
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          roundedRect(ctx, -w / 2 - padX, -h / 2, w + padX * 2, h, h / 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, 0, 0);
        }
        ctx.restore();
      }

      // Trigger download
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
    <div className="fixed inset-0 z-[120] grid lg:grid-cols-[300px_1fr_320px] grid-cols-1 bg-black/80 backdrop-blur-xl overflow-hidden">
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onFile} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />

      {/* ───── Left rail (desktop only) ───── */}
      <aside className="hidden lg:flex flex-col glass-strong glass-specular border-r border-white/10 h-full overflow-hidden">
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

        <div className="px-3 mt-3 flex-1 overflow-y-auto no-scrollbar pb-6">
          {tool === "media" && (
            <DesktopMediaPanel
              onPickStock={(src) => setBg({ kind: "image", value: src })}
              onPickGradient={(g) => setBg({ kind: "gradient", value: g })}
              onPickOverlay={(src) => addImage(src)}
              onUpload={() => fileInputRef.current?.click()}
            />
          )}
          {tool === "text" && (
            <TextPanel
              addText={() => addText()}
              selected={selected?.type === "text" ? (selected as TextLayer) : null}
              updateSelected={(p) => updateSelected(p)}
            />
          )}
          {tool === "stickers" && <StickerPanel onPick={addSticker} />}
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
          {tool === "music" && (
            <MusicPanel tracks={MUSIC_TRACKS} onPick={addMusic} />
          )}
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
                className="block size-4 border-2 border-white/30 border-t-white rounded-full"
              />
            ) : (
              <Download />
            )}
          </Button>
          <Button variant="gradient">
            <Send /> {t("Share")}
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
            className="absolute bottom-36 lg:bottom-6 inline-flex items-center gap-1 glass-strong rounded-full px-2 py-1.5 border border-white/15 z-10"
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
            <div className="w-px h-5 bg-white/15 mx-1" />
            <Button variant="ghost" size="icon-sm" onClick={removeSelected}>
              <Trash2 className="size-3.5" />
            </Button>
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
      <aside className="hidden lg:flex flex-col glass-strong glass-specular border-l border-white/10 h-full overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t("Inspector")}</h3>
          <span className="text-[10px] text-muted-foreground">{layers.length} {t("layers")}</span>
        </div>

        <div className="px-3 flex-1 overflow-y-auto no-scrollbar pb-6">
          {selected ? (
            <Inspector
              layer={selected}
              update={(p) => updateSelected(p)}
              remove={removeSelected}
            />
          ) : (
            <div className="text-center text-xs text-muted-foreground py-12 px-4">
              <Sparkles className="size-6 mx-auto mb-2 text-violet-400" />
              {t("Tap a layer on the canvas to fine-tune position, font, color, and rotation.")}
            </div>
          )}

          <div className="mt-6">
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{t("Layers")}</h4>
            {layers.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("No layers yet.")}</p>
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
            onBrowse={() => {
              fileInputRef.current?.click();
              setSheet(null);
            }}
            onCamera={() => {
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
        {sheet === "stickers" && (
          <MobileStickersSheet
            key="stickers"
            onClose={() => setSheet(null)}
            onPick={(s) => {
              addSticker(s);
              setSheet(null);
            }}
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
            tracks={MUSIC_TRACKS}
            onPick={(t) => {
              addMusic(t);
              setSheet(null);
            }}
          />
        )}
      </AnimatePresence>
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
        <div className="flex-1 overflow-y-auto px-5 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
  onBrowse: () => void;
  onCamera: () => void;
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
              onClick={onCamera}
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
              onClick={onBrowse}
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
        <span className="text-xs truncate flex-1">
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
            style={{ fontFamily: FONT_FAMILIES[selected.font] }}
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
              {(["sans", "display", "serif", "mono"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => update({ font: f })}
                  className={cn(
                    "h-12 rounded-xl text-base transition-colors",
                    selected.font === f
                      ? "bg-foreground text-background"
                      : "glass-subtle text-foreground"
                  )}
                  style={{ fontFamily: FONT_FAMILIES[f] }}
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
                      isTransparent ? "glass-subtle border-border/40" : "border-white/10",
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

function MobileStickersSheet({
  onClose,
  onPick
}: {
  onClose: () => void;
  onPick: (s: string) => void;
}) {
  const t = useT();
  const [q, setQ] = React.useState("");
  const all = React.useMemo(() => STICKER_PACKS.flatMap((p) => p.items.map((i) => ({ pack: p.name, emoji: i }))), []);
  const filtered = q.trim()
    ? all.filter((x) => x.pack.toLowerCase().includes(q.toLowerCase()))
    : null;

  return (
    <MobileSheetWrapper title={t("Stickers")} onClose={onClose} height="72vh">
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("Search stickers")}
          className="pl-10 h-11 glass-subtle text-foreground placeholder:text-muted-foreground border-border/40"
        />
      </div>

      {filtered ? (
        <div className="grid grid-cols-6 gap-2">
          {filtered.length === 0 ? (
            <p className="col-span-6 text-center text-sm text-muted-foreground py-8">
              {t("No matches")} · &quot;{q}&quot;
            </p>
          ) : (
            filtered.map((x, i) => (
              <motion.button
                key={`${x.pack}-${i}`}
                whileTap={{ scale: 0.85 }}
                onClick={() => onPick(x.emoji)}
                className="aspect-square text-3xl rounded-2xl glass-subtle grid place-items-center"
              >
                {x.emoji}
              </motion.button>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {STICKER_PACKS.map((pack) => (
            <div key={pack.name}>
              <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 px-1">
                {pack.name}
              </h4>
              <div className="grid grid-cols-6 gap-2">
                {pack.items.map((s) => (
                  <motion.button
                    key={s}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => onPick(s)}
                    className="aspect-square text-3xl rounded-2xl glass-subtle grid place-items-center"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
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
  tracks,
  onPick
}: {
  onClose: () => void;
  tracks: typeof MUSIC_TRACKS;
  onPick: (t: Track) => void;
}) {
  const t = useT();
  const [q, setQ] = React.useState("");
  const { playingId, play, stop } = useAudioPreview();
  const filtered = tracks.filter(
    (tr) =>
      tr.title.toLowerCase().includes(q.toLowerCase()) ||
      tr.artist.toLowerCase().includes(q.toLowerCase())
  );

  // stop audio when sheet unmounts
  React.useEffect(() => () => stop(), [stop]);

  return (
    <MobileSheetWrapper title={t("Music")} onClose={onClose} height="72vh">
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("Search artists, tracks")}
          className="pl-10 h-11 glass-subtle text-foreground placeholder:text-muted-foreground border-border/40"
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            {t("No tracks match")} &quot;{q}&quot;
          </p>
        ) : (
          filtered.map((tr) => {
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
                <div className="size-12 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 grid place-items-center text-white shadow-glow shrink-0">
                  <Music className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{tr.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {tr.artist} · {tr.duration}
                  </p>
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
          })
        )}
      </div>

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
  onUpload: () => void;
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
                  onClick={onUpload}
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
            <div className="grid grid-cols-4 gap-1">
              {(["sans", "display", "serif", "mono"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => updateSelected({ font: f })}
                  className={cn(
                    "h-10 rounded-lg text-xs transition",
                    selected.font === f
                      ? "bg-foreground text-background"
                      : "glass-subtle hover:bg-foreground/5"
                  )}
                  style={{ fontFamily: FONT_FAMILIES[f] }}
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
                    selected.color === c ? "ring-white" : "ring-transparent"
                  )}
                  style={{ background: c }}
                />
              ))}
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
                    selected.bg === b.value ? "ring-2 ring-white" : ""
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

function StickerPanel({ onPick }: { onPick: (e: string) => void }) {
  return (
    <div className="space-y-5">
      {STICKER_PACKS.map((pack) => (
        <div key={pack.name}>
          <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            {pack.name}
          </h4>
          <div className="grid grid-cols-5 gap-1.5">
            {pack.items.map((s) => (
              <motion.button
                key={s}
                whileHover={{ scale: 1.2, rotate: 6 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onPick(s)}
                className="aspect-square text-2xl rounded-xl glass-subtle hover:bg-foreground/5"
              >
                {s}
              </motion.button>
            ))}
          </div>
        </div>
      ))}
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
    <div className="grid grid-cols-3 gap-2">
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
                color === c ? "ring-white" : "ring-transparent"
              )}
              style={{ background: c }}
            />
          ))}
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

function MusicPanel({
  tracks,
  onPick
}: {
  tracks: typeof MUSIC_TRACKS;
  onPick: (t: Track) => void;
}) {
  const t = useT();
  const { playingId, play, stop } = useAudioPreview();
  React.useEffect(() => () => stop(), [stop]);

  return (
    <div className="space-y-2">
      {tracks.map((tr) => {
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
            <div className="size-10 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center text-white shadow-glow shrink-0">
              <Music className="size-4" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium truncate">{tr.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {tr.artist} · {tr.duration}
              </p>
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
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing touch-none",
        selected && "outline outline-2 outline-cyan-400 outline-offset-2 rounded-md"
      )}
    >
      {layer.type === "text" ? (
        <div
          className="px-3 py-1.5 rounded-md max-w-[280px]"
          style={{
            background: (layer as TextLayer).bg,
            color: (layer as TextLayer).color,
            fontFamily: FONT_FAMILIES[(layer as TextLayer).font],
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
        <span style={{ fontSize: (layer as StickerLayer).size }}>{(layer as StickerLayer).emoji}</span>
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
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white text-xs whitespace-nowrap">
          <Music className="size-3" />
          <span className="font-semibold">{(layer as MusicLayer).title}</span>
          <span className="opacity-70">· {(layer as MusicLayer).artist}</span>
        </div>
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
