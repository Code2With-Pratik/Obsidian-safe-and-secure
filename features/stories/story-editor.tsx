"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  Download,
  Send,
  X,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

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

type Layer = TextLayer | StickerLayer;

interface Background {
  kind: "image" | "gradient";
  value: string;
}

const GRADIENTS: string[] = [
  "linear-gradient(135deg,#8B5CF6,#EC4899)",
  "linear-gradient(135deg,#22D3EE,#3B82F6)",
  "linear-gradient(135deg,#A3E635,#22D3EE)",
  "linear-gradient(135deg,#FBBF24,#EC4899)",
  "linear-gradient(135deg,#0EA5E9,#8B5CF6)",
  "linear-gradient(135deg,#F472B6,#FB923C)",
  "linear-gradient(135deg,#000000,#1F2937)",
  "linear-gradient(135deg,#10B981,#06B6D4)"
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
  { id: "nova", label: "Nova", filter: "saturate(1.4) contrast(1.05) brightness(1.05)" },
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
  { name: "Faces", items: ["😂", "😎", "🥹", "😌", "🤯", "🥲", "😴", "🤝", "🫶", "👀", "🙌", "🫧"] },
  { name: "Music", items: ["🎧", "🎶", "🎹", "🪕", "🎤", "🥁", "🎚️", "🎛️"] },
  { name: "Travel", items: ["✈️", "🌍", "🗺️", "🚀", "🏝️", "🏔️", "🌌", "🚆"] }
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

const MUSIC_TRACKS = [
  { id: "m1", title: "Glass Cathedrals", artist: "Nova FM", duration: "3:24" },
  { id: "m2", title: "Aurora Drift", artist: "Synth Citizens", duration: "2:51" },
  { id: "m3", title: "Midnight Lounge", artist: "Kai Nakamura", duration: "4:08" },
  { id: "m4", title: "Neon Pulse", artist: "Lyra Chen", duration: "3:12" }
];

/* ----------------------------- component ----------------------------- */

export function StoryEditor() {
  const router = useRouter();
  const [bg, setBg] = React.useState<Background>({ kind: "gradient", value: GRADIENTS[0] });
  const [filter, setFilter] = React.useState<string>("none");
  const [layers, setLayers] = React.useState<Layer[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [tool, setTool] = React.useState<
    "media" | "text" | "stickers" | "filters" | "draw" | "music"
  >("media");
  const [drawColor, setDrawColor] = React.useState("#EC4899");
  const [drawSize, setDrawSize] = React.useState([4]);
  const [drawing, setDrawing] = React.useState(false);
  const [paths, setPaths] = React.useState<{ color: string; w: number; d: string }[]>([]);
  const [music, setMusic] = React.useState<(typeof MUSIC_TRACKS)[number] | null>(null);
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [showLayers, setShowLayers] = React.useState(false);

  const selected = layers.find((l) => l.id === selectedId);
  const filterCss = FILTERS.find((f) => f.id === filter)?.filter ?? "none";

  /* ----- layer ops ----- */
  const addText = () => {
    const l: TextLayer = {
      id: `t-${Date.now()}`,
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
      scale: 1
    };
    setLayers((l_) => [...l_, l]);
    setSelectedId(l.id);
    setTool("text");
  };

  const addSticker = (emoji: string) => {
    const l: StickerLayer = {
      id: `s-${Date.now()}`,
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

  /* ----- render ----- */
  return (
    <div className="fixed inset-0 z-[120] grid lg:grid-cols-[300px_1fr_320px] grid-cols-1 bg-black/80 backdrop-blur-xl">
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onFile} />

      {/* ───── Left rail (tools) ───── */}
      <aside className="hidden lg:flex flex-col glass-strong glass-specular border-r border-white/10">
        <div className="p-4 flex items-center justify-between">
          <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
            <ArrowLeft />
          </Button>
          <h2 className="font-display font-semibold tracking-tight">New story</h2>
          <Button variant="ghost" size="icon-sm" onClick={() => setShowLayers((v) => !v)}>
            <Layers />
          </Button>
        </div>

        <Tabs value={tool} onValueChange={(v) => setTool(v as typeof tool)} className="px-3">
          <TabsList className="w-full grid grid-cols-3 gap-1">
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="stickers">Stickers</TabsTrigger>
          </TabsList>
          <TabsList className="w-full grid grid-cols-3 gap-1 mt-1">
            <TabsTrigger value="filters">Filters</TabsTrigger>
            <TabsTrigger value="draw">Draw</TabsTrigger>
            <TabsTrigger value="music">Music</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="px-3 mt-3 flex-1 overflow-y-auto no-scrollbar pb-6">
          {tool === "media" && (
            <MediaPanel
              onPickStock={(src) => setBg({ kind: "image", value: src })}
              onPickGradient={(g) => setBg({ kind: "gradient", value: g })}
              onUpload={() => fileInputRef.current?.click()}
            />
          )}
          {tool === "text" && (
            <TextPanel
              addText={addText}
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
            <MusicPanel tracks={MUSIC_TRACKS} current={music} onPick={setMusic} />
          )}
        </div>
      </aside>

      {/* ───── Canvas ───── */}
      <main className="relative grid place-items-center p-4 md:p-8 overflow-hidden">
        <div className="absolute top-4 left-4 lg:hidden">
          <Button variant="glass" size="icon" onClick={() => router.back()}>
            <ArrowLeft />
          </Button>
        </div>
        <div className="absolute top-4 right-4 flex gap-2">
          <Button variant="glass" size="icon">
            <Download />
          </Button>
          <Button variant="gradient">
            <Send /> Share
          </Button>
        </div>

        <div
          ref={canvasRef}
          onPointerDown={drawStart}
          onPointerMove={drawMove}
          onPointerUp={drawEnd}
          onPointerLeave={drawEnd}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
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
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: filterCss }}
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: bg.value, filter: filterCss }}
            />
          )}

          {/* drawn paths */}
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

          {/* layers */}
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

          {/* music chip */}
          {music && (
            <div className="absolute top-3 left-3 right-3 flex items-center justify-center pointer-events-none">
              <motion.div
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white text-xs"
              >
                <Music className="size-3" />
                <span className="font-medium">{music.title}</span>
                <span className="opacity-70">· {music.artist}</span>
              </motion.div>
            </div>
          )}
        </div>

        {/* contextual action bar on canvas */}
        {selectedId && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-6 inline-flex items-center gap-1 glass-strong rounded-full px-2 py-1.5 border border-white/15"
          >
            <Button variant="ghost" size="icon-sm" onClick={() => updateSelected({ rotate: (selected?.rotate ?? 0) - 15 })}>
              ↺
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => updateSelected({ rotate: (selected?.rotate ?? 0) + 15 })}>
              ↻
            </Button>
            <div className="w-px h-5 bg-white/15 mx-1" />
            <Button variant="ghost" size="icon-sm" onClick={removeSelected}>
              <Trash2 className="size-3.5" />
            </Button>
          </motion.div>
        )}
      </main>

      {/* ───── Right rail (inspector / layers) ───── */}
      <aside className="hidden lg:flex flex-col glass-strong glass-specular border-l border-white/10">
        <div className="p-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Inspector</h3>
          <span className="text-[10px] text-muted-foreground">{layers.length} layers</span>
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
              Tap a layer on the canvas to fine-tune position, font, color, and rotation.
            </div>
          )}

          <div className="mt-6">
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Layers</h4>
            <div className="space-y-1">
              {layers.length === 0 ? (
                <p className="text-xs text-muted-foreground">No layers yet.</p>
              ) : (
                layers
                  .slice()
                  .reverse()
                  .map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setSelectedId(l.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition",
                        selectedId === l.id
                          ? "bg-foreground/10"
                          : "hover:bg-foreground/5"
                      )}
                    >
                      <span className="size-7 rounded-lg glass-subtle grid place-items-center text-sm">
                        {l.type === "text" ? "T" : (l as StickerLayer).emoji}
                      </span>
                      <span className="text-xs truncate flex-1">
                        {l.type === "text" ? (l as TextLayer).text : "Sticker"}
                      </span>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom toolbar */}
      <MobileToolbar
        tool={tool}
        setTool={(v) => setTool(v)}
        onAddText={addText}
        onUpload={() => fileInputRef.current?.click()}
      />
    </div>
  );
}

/* ----------------------------- panels ----------------------------- */

function MediaPanel({
  onPickStock,
  onPickGradient,
  onUpload
}: {
  onPickStock: (src: string) => void;
  onPickGradient: (g: string) => void;
  onUpload: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Upload</h4>
        <button
          onClick={onUpload}
          className="w-full aspect-[5/3] rounded-2xl border-2 border-dashed border-white/15 grid place-items-center hover:border-white/30 transition group"
        >
          <div className="text-center">
            <div className="size-10 mx-auto rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-glow group-hover:scale-110 transition">
              <ImageIcon className="size-5 text-white" />
            </div>
            <p className="text-xs mt-2 text-muted-foreground">Tap to upload</p>
          </div>
        </button>
      </div>

      <div>
        <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Stock</h4>
        <div className="grid grid-cols-3 gap-1.5">
          {STOCK_IMAGES.map((src) => (
            <button
              key={src}
              onClick={() => onPickStock(src)}
              className="relative aspect-square rounded-xl overflow-hidden group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover transition group-hover:scale-110" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Gradients</h4>
        <div className="grid grid-cols-4 gap-1.5">
          {GRADIENTS.map((g) => (
            <button
              key={g}
              onClick={() => onPickGradient(g)}
              className="aspect-square rounded-xl ring-1 ring-white/10 hover:ring-white/30 transition"
              style={{ background: g }}
            />
          ))}
        </div>
      </div>
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
  return (
    <div className="space-y-4">
      <Button onClick={addText} variant="gradient" className="w-full">
        <TypeIcon /> Add text layer
      </Button>

      {selected && (
        <div className="space-y-4">
          <textarea
            value={selected.text}
            onChange={(e) => updateSelected({ text: e.target.value })}
            rows={3}
            className="w-full rounded-xl glass-subtle px-3 py-2 text-sm outline-none resize-none"
            placeholder="Your story…"
          />

          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Font</h4>
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
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Color</h4>
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
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Background</h4>
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
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Color</h4>
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
          <span>Brush size</span>
          <span className="text-muted-foreground">{size[0]}px</span>
        </div>
        <Slider value={size} onValueChange={setSize} min={1} max={32} step={1} />
      </div>
      <Button onClick={clear} variant="glass" className="w-full">
        <Eraser /> Clear strokes
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Tap and drag on the canvas to draw.
      </p>
    </div>
  );
}

function MusicPanel({
  tracks,
  current,
  onPick
}: {
  tracks: typeof MUSIC_TRACKS;
  current: (typeof MUSIC_TRACKS)[number] | null;
  onPick: (t: (typeof MUSIC_TRACKS)[number] | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Button
        variant="glass"
        className="w-full"
        onClick={() => onPick(null)}
        disabled={!current}
      >
        Remove music
      </Button>
      {tracks.map((t) => (
        <button
          key={t.id}
          onClick={() => onPick(t)}
          className={cn(
            "w-full flex items-center gap-3 p-2.5 rounded-xl transition",
            current?.id === t.id ? "bg-foreground/10" : "glass-subtle hover:bg-foreground/5"
          )}
        >
          <div className="size-10 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center text-white shadow-glow shrink-0">
            <Music className="size-4" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium truncate">{t.title}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {t.artist} · {t.duration}
            </p>
          </div>
        </button>
      ))}
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
  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span>Scale</span>
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
          <span>Rotate</span>
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
        <Trash2 /> Delete layer
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
  container: React.RefObject<HTMLDivElement>;
}) {
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
      }}
      style={{
        left: `${layer.x}%`,
        top: `${layer.y}%`
      }}
      animate={{ rotate: layer.rotate, scale: layer.scale }}
      initial={{ scale: 0.6, opacity: 0 }}
      exit={{ scale: 0.6, opacity: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing",
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
      ) : (
        <span style={{ fontSize: (layer as StickerLayer).size }}>{(layer as StickerLayer).emoji}</span>
      )}
    </motion.div>
  );
}

/* ----------------------------- mobile toolbar ----------------------------- */

function MobileToolbar({
  tool,
  setTool,
  onAddText,
  onUpload
}: {
  tool: string;
  setTool: (t: "media" | "text" | "stickers" | "filters" | "draw" | "music") => void;
  onAddText: () => void;
  onUpload: () => void;
}) {
  const items: { id: typeof tool; icon: React.ReactNode; label: string }[] = [
    { id: "media", icon: <ImageIcon className="size-4" />, label: "Media" },
    { id: "text", icon: <TypeIcon className="size-4" />, label: "Text" },
    { id: "stickers", icon: <Smile className="size-4" />, label: "Stickers" },
    { id: "filters", icon: <Palette className="size-4" />, label: "Filter" },
    { id: "draw", icon: <Pencil className="size-4" />, label: "Draw" },
    { id: "music", icon: <Music className="size-4" />, label: "Music" }
  ];
  return (
    <div className="lg:hidden fixed bottom-3 inset-x-3 z-10 glass-strong glass-specular rounded-2xl px-2 py-1.5 border border-white/15 flex justify-between gap-1">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => {
            setTool(it.id as any);
            if (it.id === "text") onAddText();
            if (it.id === "media") onUpload();
          }}
          className={cn(
            "flex-1 grid place-items-center gap-0.5 py-1.5 rounded-xl text-[10px] font-medium transition",
            tool === it.id ? "bg-foreground/10 text-foreground" : "text-muted-foreground"
          )}
        >
          {it.icon}
          {it.label}
        </button>
      ))}
    </div>
  );
}
