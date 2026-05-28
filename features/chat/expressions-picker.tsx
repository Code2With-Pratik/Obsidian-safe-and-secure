"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Smile,
  Film,
  Sparkles,
  ImageIcon,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  fetchKlipyGifs,
  fetchKlipyStickers,
  fetchKlipyMemes,
  KLIPY_AVAILABLE,
  type StickerApiItem
} from "@/lib/klipy";
import {
  EMOJI_CATEGORIES,
  GIFS,
  STICKER_PACKS,
  MEMES,
  type EmojiCategory,
  type GifItem,
  type MemeItem
} from "./expressions-data";

/** Sticker pick shape: API stickers carry a URL (no gradient), bundled ones
 *  still come as emoji + gradient. Consumers can branch on which field is set. */
export type StickerPickPayload =
  | { id: string; emoji: string; gradient: string; src?: undefined; alt?: undefined }
  | { id: string; src: string; alt: string; emoji?: undefined; gradient?: undefined };

export type ExpressionPick =
  | { kind: "emoji"; value: string }
  | { kind: "gif"; gif: GifItem }
  | { kind: "sticker"; sticker: StickerPickPayload }
  | { kind: "meme"; meme: MemeItem };

type Tab = "emoji" | "gif" | "sticker" | "meme";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "emoji", label: "Emoji", icon: <Smile className="size-3.5" /> },
  { id: "gif", label: "GIF", icon: <Film className="size-3.5" /> },
  { id: "sticker", label: "Stickers", icon: <Sparkles className="size-3.5" /> },
  { id: "meme", label: "Memes", icon: <ImageIcon className="size-3.5" /> }
];

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (pick: ExpressionPick) => void;
  /** anchor element for desktop popover positioning */
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export function ExpressionsPicker({ open, onClose, onPick, anchorRef }: Props) {
  const t = useT();
  const [mounted, setMounted] = React.useState(false);
  const [tab, setTab] = React.useState<Tab>("emoji");
  const [q, setQ] = React.useState("");
  const [pos, setPos] = React.useState<{ left: number; bottom: number } | null>(null);
  const [activeEmojiCat, setActiveEmojiCat] = React.useState(EMOJI_CATEGORIES[0].id);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Position the floating popover above the anchor. useLayoutEffect ensures
  // `pos` is computed BEFORE paint so we never flash mobile (full-width)
  // styles on desktop.
  React.useLayoutEffect(() => {
    if (!open || !isDesktop || !anchorRef?.current) {
      setPos(null);
      return;
    }
    const update = () => {
      const r = anchorRef.current!.getBoundingClientRect();
      const panelWidth = 380;
      const left = Math.min(
        Math.max(12, r.right - panelWidth),
        window.innerWidth - panelWidth - 12
      );
      const bottom = window.innerHeight - r.top + 12;
      setPos({ left, bottom });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, isDesktop, anchorRef]);

  React.useEffect(() => {
    if (!open) {
      setQ("");
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    // On mobile the picker takes up half the screen and has an explicit X
    // button — users dismiss it that way. Outside-click detection would
    // close it the moment they tap the input above it, which is exactly
    // what the user wants to avoid. So only do outside-click on desktop.
    const onDown = (e: MouseEvent | TouchEvent) => {
      const panel = panelRef.current;
      if (!panel) return;

      // event.composedPath() reliably walks every node the event passed
      // through (works for text-node targets, shadow DOM, etc.).
      const path = (e.composedPath?.() ?? []) as EventTarget[];

      if (path.includes(panel)) return;
      if (anchorRef?.current && path.includes(anchorRef.current)) return;

      // Honour the data-keep-picker-open opt-out (the message composer
      // marks itself with this so typing doesn't dismiss the picker).
      for (const node of path) {
        if (
          node instanceof Element &&
          node.hasAttribute("data-keep-picker-open")
        ) {
          return;
        }
      }
      onClose();
    };

    window.addEventListener("keydown", onKey);
    if (isDesktop) {
      document.addEventListener("mousedown", onDown);
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      if (isDesktop) {
        document.removeEventListener("mousedown", onDown);
      }
    };
  }, [open, onClose, anchorRef, isDesktop]);

  /* ---------- search filters ---------- */
  const filteredEmojiCategories = React.useMemo(() => {
    if (!q.trim()) return EMOJI_CATEGORIES;
    const needle = q.trim().toLowerCase();
    return EMOJI_CATEGORIES
      .map((c) => ({
        ...c,
        items: c.name.toLowerCase().includes(needle)
          ? c.items
          : c.items.filter((e) => e.includes(q.trim()))
      }))
      .filter((c) => c.items.length > 0);
  }, [q]);

  /* ---- All three media tabs are powered by Klipy. The bundled mock data
          is kept around as a fallback in case the API call fails. ---- */
  const klipyGifs = useKlipyFeed(fetchKlipyGifs, q, open && tab === "gif");
  const klipyStickers = useKlipyFeed(fetchKlipyStickers, q, open && tab === "sticker");
  const klipyMemes = useKlipyFeed(fetchKlipyMemes, q, open && tab === "meme");

  const localGifs = React.useMemo(
    () =>
      q.trim() === ""
        ? GIFS
        : GIFS.filter(
            (g) =>
              g.alt.toLowerCase().includes(q.toLowerCase()) ||
              g.tags.some((t) => t.toLowerCase().includes(q.toLowerCase()))
          ),
    [q]
  );

  const localMemes = React.useMemo(
    () =>
      q.trim() === ""
        ? MEMES
        : MEMES.filter(
            (m) =>
              m.caption.toLowerCase().includes(q.toLowerCase()) ||
              m.tag.toLowerCase().includes(q.toLowerCase())
          ),
    [q]
  );

  const filteredStickers = React.useMemo(() => {
    if (!q.trim()) return STICKER_PACKS;
    const needle = q.trim().toLowerCase();
    return STICKER_PACKS
      .map((p) => ({
        ...p,
        stickers: p.name.toLowerCase().includes(needle)
          ? p.stickers
          : p.stickers.filter((s) => s.emoji.includes(q.trim()))
      }))
      .filter((p) => p.stickers.length > 0);
  }, [q]);

  const useDesktopFloat = isDesktop && pos !== null;

  const desktopStyle: React.CSSProperties | undefined = useDesktopFloat
    ? { left: pos!.left, bottom: pos!.bottom, width: 380 }
    : undefined;

  const shouldRender = open && mounted && (!isDesktop || pos !== null);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {shouldRender && (
        <>
          <motion.div
            key="panel"
            ref={panelRef}
            initial={
              useDesktopFloat
                ? { opacity: 0, y: 8, scale: 0.97 }
                : { opacity: 0, y: 40 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              useDesktopFloat
                ? { opacity: 0, y: 8, scale: 0.97 }
                : { opacity: 0, y: 40 }
            }
            transition={
              useDesktopFloat
                ? { type: "spring", stiffness: 280, damping: 28 }
                : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
            }
            style={desktopStyle}
            className={cn(
              "z-[201] glass-strong glass-specular border border-white/15 shadow-floating overflow-hidden flex flex-col fixed",
              useDesktopFloat
                ? "rounded-3xl h-[460px]"
                : "inset-x-0 bottom-0 w-full h-[52dvh] rounded-t-3xl pb-[max(0.5rem,env(safe-area-inset-bottom))]"
            )}
          >
            {/* mobile grab handle */}
            {!useDesktopFloat && (
              <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-white/20" />
            )}

            {/* tab pills */}
            <div className="px-3 pt-3 pb-2 flex items-center gap-1.5">
              <div className="flex-1 flex items-center gap-1 p-1 rounded-full glass-subtle">
                {TABS.map((tb) => (
                  <button
                    key={tb.id}
                    onClick={() => setTab(tb.id)}
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-full text-xs font-medium transition",
                      tab === tb.id
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tb.icon}
                    {t(tb.label)}
                  </button>
                ))}
              </div>
              <button
                onClick={onClose}
                className="size-8 rounded-full grid place-items-center hover:bg-foreground/5"
                aria-label={t("Close")}
              >
                <X className="size-4" />
              </button>
            </div>

            {/* search */}
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  autoFocus
                  placeholder={
                    tab === "emoji"
                      ? t("Search emoji")
                      : tab === "gif"
                        ? t("Search GIFs")
                        : tab === "sticker"
                          ? t("Search stickers")
                          : t("Search memes")
                  }
                  className="w-full h-9 pl-9 pr-3 rounded-full glass border border-border/60 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-cyan-400/60"
                />
              </div>
            </div>

            {/* sliding tab content */}
            <div className="relative flex-1 min-h-0 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 flex flex-col"
                >
                  {tab === "emoji" && (
                    <EmojiPanel
                      categories={filteredEmojiCategories}
                      activeId={activeEmojiCat}
                      setActiveId={setActiveEmojiCat}
                      onPick={(value) => onPick({ kind: "emoji", value })}
                    />
                  )}
                  {tab === "gif" && (
                    <GifPanel
                      gifs={KLIPY_AVAILABLE && klipyGifs.data.length > 0 ? klipyGifs.data : localGifs}
                      loading={KLIPY_AVAILABLE && klipyGifs.loading}
                      error={KLIPY_AVAILABLE && klipyGifs.error && klipyGifs.data.length === 0}
                      onPick={(gif) => onPick({ kind: "gif", gif })}
                    />
                  )}
                  {tab === "sticker" && (
                    KLIPY_AVAILABLE ? (
                      <ApiStickerPanel
                        stickers={klipyStickers.data}
                        loading={klipyStickers.loading}
                        error={klipyStickers.error}
                        fallbackPacks={filteredStickers}
                        onPick={(sticker) => onPick({ kind: "sticker", sticker })}
                      />
                    ) : (
                      <StickerPanel
                        packs={filteredStickers}
                        onPick={(sticker) => onPick({ kind: "sticker", sticker })}
                      />
                    )
                  )}
                  {tab === "meme" && (
                    <MemePanel
                      memes={KLIPY_AVAILABLE && klipyMemes.data.length > 0 ? klipyMemes.data : localMemes}
                      loading={KLIPY_AVAILABLE && klipyMemes.loading}
                      error={KLIPY_AVAILABLE && klipyMemes.error && klipyMemes.data.length === 0}
                      onPick={(meme) => onPick({ kind: "meme", meme })}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* footer hint */}
            <div className="border-t border-white/10 px-4 py-1 text-[10px] text-muted-foreground flex justify-between">
              <span>{tab === "emoji" ? t("Tap to insert") : t("Tap to send")}</span>
              <span className="hidden md:inline">{t("Esc to close")}</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ───────── EMOJI — hardcoded grid, no external library ───────── */

const EMOJI_FONT =
  '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla","EmojiOne Color",sans-serif';

function EmojiPanel({
  categories,
  activeId,
  setActiveId,
  onPick
}: {
  categories: EmojiCategory[];
  activeId: string;
  setActiveId: (id: string) => void;
  onPick: (value: string) => void;
}) {
  const t = useT();
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const sectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  const jumpTo = (id: string) => {
    setActiveId(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto no-scrollbar px-3 pb-3"
      >
        {categories.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-6">
            {t("No emoji matches.")}
          </p>
        )}
        {categories.map((cat, catIdx) => (
          <motion.div
            key={cat.id}
            ref={(el) => {
              sectionRefs.current[cat.id] = el;
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: catIdx * 0.04,
              duration: 0.3,
              ease: [0.22, 1, 0.36, 1]
            }}
            className="pt-3"
          >
            <h4 className="px-1 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {cat.name}
            </h4>
            <motion.div
              className="grid grid-cols-7 gap-1 mt-1.5"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.008, delayChildren: catIdx * 0.05 } }
              }}
            >
              {cat.items.map((e, i) => (
                <motion.button
                  key={`${cat.id}-${i}-${e}`}
                  onClick={() => onPick(e)}
                  variants={{
                    hidden: { opacity: 0, scale: 0.5 },
                    visible: { opacity: 1, scale: 1 }
                  }}
                  whileHover={{ scale: 1.18 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 360, damping: 22 }}
                  className="relative aspect-square rounded-lg hover:bg-foreground/10 overflow-hidden"
                >
                  <span
                    className="absolute inset-0 grid place-items-center select-none"
                    style={{
                      fontFamily: EMOJI_FONT,
                      fontSize: "28px",
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden"
                    }}
                  >
                    {e}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* category rail */}
      <div className="border-t border-white/10 px-2 py-1.5 flex justify-between overflow-x-auto no-scrollbar">
        {EMOJI_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => jumpTo(c.id)}
            className={cn(
              "size-8 grid place-items-center rounded-lg text-base transition shrink-0 overflow-hidden",
              activeId === c.id ? "bg-foreground/10" : "hover:bg-foreground/5"
            )}
            aria-label={c.name}
            style={{ fontFamily: EMOJI_FONT }}
          >
            {c.icon}
          </button>
        ))}
      </div>
    </>
  );
}

/* ───────── GIF ───────── */

function GifPanel({
  gifs,
  loading,
  error,
  onPick
}: {
  gifs: GifItem[];
  loading?: boolean;
  error?: boolean;
  onPick: (gif: GifItem) => void;
}) {
  const t = useT();
  return (
    <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-3 pt-1">
      {error ? (
        <p className="text-center text-xs text-muted-foreground py-6">
          {t("Couldn't reach Klipy — check your connection.")}
        </p>
      ) : loading && gifs.length === 0 ? (
        <GifSkeletonGrid />
      ) : gifs.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-6">
          {t("No GIFs match.")}
        </p>
      ) : (
        <div className="columns-2 gap-2 [column-fill:_balance]">
          {gifs.map((g) => (
            <motion.button
              key={g.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onPick(g)}
              className="relative mb-2 block w-full overflow-hidden rounded-xl glass border border-white/10 break-inside-avoid"
              style={{ aspectRatio: g.id.charCodeAt(g.id.length - 1) % 2 ? "4/5" : "1/1" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.src}
                alt={g.alt}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
              <span className="absolute bottom-1.5 left-1.5 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur text-white">
                GIF
              </span>
              <span className="absolute top-1.5 right-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/40 backdrop-blur text-white capitalize">
                {g.alt}
              </span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

function GifSkeletonGrid() {
  // 6 tiles, alternating tall/short, while the Klipy query is in flight
  return (
    <div className="columns-2 gap-2 [column-fill:_balance]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="relative mb-2 block w-full overflow-hidden rounded-xl glass border border-white/10 break-inside-avoid animate-pulse bg-foreground/5"
          style={{ aspectRatio: i % 2 ? "4/5" : "1/1" }}
        />
      ))}
    </div>
  );
}

/** Generic Klipy feed hook: debounced, abortable, cached. Used for the GIF,
 *  Sticker, and Meme tabs. Pass the matching `fetchKlipy*` function. */
function useKlipyFeed<T>(
  fetcher: (q: string, opts: { signal?: AbortSignal }) => Promise<T[]>,
  query: string,
  enabled: boolean
) {
  const [data, setData] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const cacheRef = React.useRef<Map<string, T[]>>(new Map());

  React.useEffect(() => {
    if (!enabled || !KLIPY_AVAILABLE) return;

    const key = query.trim().toLowerCase();
    const cached = cacheRef.current.get(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setLoading(true);
      setError(false);
      fetcher(query, { signal: controller.signal })
        .then((items) => {
          if (cancelled) return;
          cacheRef.current.set(key, items);
          setData(items);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          if (err instanceof Error && err.name === "AbortError") return;
          setError(true);
          setLoading(false);
        });
    }, 280);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [query, enabled, fetcher]);

  return { data, loading, error };
}

/** Klipy-driven sticker grid: flat image tiles (no pack grouping). */
function ApiStickerPanel({
  stickers,
  loading,
  error,
  fallbackPacks,
  onPick
}: {
  stickers: StickerApiItem[];
  loading: boolean;
  error: boolean;
  fallbackPacks: typeof STICKER_PACKS;
  onPick: (sticker: StickerPickPayload) => void;
}) {
  // network errored AND we don't have cached results → use the bundled packs
  if (error && stickers.length === 0) {
    return <StickerPanel packs={fallbackPacks} onPick={onPick} />;
  }
  if (loading && stickers.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-3 pt-1">
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-2xl bg-foreground/5 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }
  if (stickers.length === 0) {
    return <StickerPanel packs={fallbackPacks} onPick={onPick} />;
  }
  return (
    <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-3 pt-1">
      <div className="grid grid-cols-4 gap-2">
        {stickers.map((s) => (
          <motion.button
            key={s.id}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onPick({ id: s.id, src: s.src, alt: s.alt })}
            className="relative aspect-square rounded-2xl overflow-hidden bg-foreground/5 ring-1 ring-white/10"
            title={s.alt}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.src}
              alt={s.alt}
              className="absolute inset-0 w-full h-full object-contain p-1.5"
              loading="lazy"
            />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ───────── STICKERS ───────── */

function StickerPanel({
  packs,
  onPick
}: {
  packs: typeof STICKER_PACKS;
  onPick: (sticker: { id: string; emoji: string; gradient: string }) => void;
}) {
  const t = useT();
  return (
    <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-3 pt-1">
      {packs.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-6">
          {t("No stickers match.")}
        </p>
      ) : (
        packs.map((p) => (
          <div key={p.id} className="pt-2">
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
              {p.name}
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {p.stickers.map((s) => (
                <motion.button
                  key={s.id}
                  whileHover={{ y: -2, rotate: -3 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => onPick(s)}
                  className="relative aspect-square rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.45)] grid place-items-center"
                  style={{ background: s.gradient }}
                >
                  <span
                    className="text-3xl drop-shadow"
                    style={{
                      fontFamily:
                        '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla","EmojiOne Color",sans-serif'
                    }}
                  >
                    {s.emoji}
                  </span>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                </motion.button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ───────── MEMES ───────── */

function MemePanel({
  memes,
  loading,
  error,
  onPick
}: {
  memes: MemeItem[];
  loading?: boolean;
  error?: boolean;
  onPick: (meme: MemeItem) => void;
}) {
  const t = useT();
  return (
    <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-3 pt-1">
      {error ? (
        <p className="text-center text-xs text-muted-foreground py-6">
          {t("Couldn't reach Klipy — check your connection.")}
        </p>
      ) : loading && memes.length === 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/5] rounded-xl bg-foreground/5 animate-pulse"
            />
          ))}
        </div>
      ) : memes.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-6">
          {t("No memes match.")}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {memes.map((m) => {
            const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(m.src);
            return (
              <motion.button
                key={m.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onPick(m)}
                className="relative aspect-[4/5] rounded-xl overflow-hidden glass border border-white/10 group bg-foreground/5"
              >
                {isVideo ? (
                  // Klipy clips are often mp4; render with <video> so the
                  // browser can decode the frames. Looping silent preview
                  // gives the same vibe as a GIF tile.
                  <video
                    src={m.src}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 w-full h-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.src}
                    alt={m.caption}
                    className="absolute inset-0 w-full h-full object-cover transition group-hover:scale-105"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/75" />
                {m.tag && (
                  <span className="absolute top-2 right-2 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/15 backdrop-blur text-white">
                    {m.tag}
                  </span>
                )}
                <p className="absolute left-2.5 right-2.5 bottom-2 text-[11px] font-semibold text-white leading-tight line-clamp-2">
                  {m.caption}
                </p>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
