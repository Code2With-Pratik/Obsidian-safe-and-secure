"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, User2, PlayCircle, Music } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useStoriesStore, type StoryMusic } from "@/store/use-stories-store";
import { users, currentUser } from "@/lib/mock-data";
import { initials, formatRelative } from "@/lib/utils";
import { useT } from "@/lib/i18n";

function lookup(userId: string) {
  return users.find((u) => u.id === userId) ?? (userId === "me" ? currentUser : undefined);
}

/** Mounted once (app-providers). Renders the story prompt + viewer driven by
 *  the stories store, portaled to <body> so they sit above every surface. */
export function StoryLayer() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const promptUserId = useStoriesStore((s) => s.promptUserId);
  const viewerUserId = useStoriesStore((s) => s.viewerUserId);
  if (!mounted) return null;
  return createPortal(
    <>
      <AnimatePresence>{promptUserId && <Prompt key="prompt" userId={promptUserId} />}</AnimatePresence>
      <AnimatePresence>{viewerUserId && <Viewer key="viewer" userId={viewerUserId} />}</AnimatePresence>
    </>,
    document.body
  );
}

/* ───────── WhatsApp-style "story or profile?" prompt ───────── */
function Prompt({ userId }: { userId: string }) {
  const t = useT();
  const router = useRouter();
  const closePrompt = useStoriesStore((s) => s.closePrompt);
  const openViewer = useStoriesStore((s) => s.openViewer);
  const u = lookup(userId);

  return (
    <motion.div
      className="fixed inset-0 z-[260] grid place-items-center p-4 bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={closePrompt}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95, y: 10, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="w-full max-w-xs glass-strong glass-specular rounded-3xl border border-white/15 p-5 text-center shadow-floating"
      >
        <div className="mx-auto size-16 rounded-full p-[2px] bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-cyan-400">
          <Avatar className="size-full ring-2 ring-background">
            <AvatarImage src={u?.avatar} />
            <AvatarFallback>{initials(u?.name ?? "")}</AvatarFallback>
          </Avatar>
        </div>
        <h3 className="mt-3 font-display font-semibold tracking-tight">{u?.name}</h3>
        <p className="text-xs text-muted-foreground">@{u?.username}</p>
        <div className="mt-5 grid gap-2">
          <Button variant="gradient" onClick={() => openViewer(userId)}>
            <PlayCircle /> {t("View story")}
          </Button>
          <Button
            variant="glass"
            onClick={() => {
              closePrompt();
              router.push("/profile");
            }}
          >
            <User2 /> {t("View profile")}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────── Full-screen story viewer ───────── */
function Viewer({ userId }: { userId: string }) {
  const t = useT();
  const entry = useStoriesStore((s) => s.byUser[userId]);
  const close = useStoriesStore((s) => s.closeViewer);
  const markViewed = useStoriesStore((s) => s.markViewed);
  const [idx, setIdx] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const slides = React.useMemo(() => entry?.slides ?? [], [entry]);
  const u = lookup(userId);
  const slide = slides[idx];

  // Watching the reel marks it viewed → dims the ring everywhere.
  React.useEffect(() => {
    markViewed(userId);
  }, [userId, markViewed]);

  // rAF-driven progress for the current slide; auto-advances / closes at 100%.
  React.useEffect(() => {
    setProgress(0);
    const DURATION = 5000;
    const startedAt = Date.now();
    let raf = 0;
    const tick = () => {
      const pct = Math.min(100, ((Date.now() - startedAt) / DURATION) * 100);
      setProgress(pct);
      if (pct >= 100) {
        if (idx < slides.length - 1) setIdx(idx + 1);
        else close();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [idx, slides.length, close]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") setIdx((i) => (i < slides.length - 1 ? i + 1 : i));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length, close]);

  if (!slide) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl grid place-items-center px-3 md:px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="relative w-full max-w-md aspect-[9/16] max-h-[92dvh] rounded-3xl overflow-hidden ring-1 ring-white/15 bg-black">
        {slide.kind === "text" ? (
          <div className="absolute inset-0" style={{ background: slide.bg }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slide.src} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/50" />

        {/* live music overlay — spins (vinyl) / scrolls (card); plays the
            30s preview on loop while the slide is open. */}
        {slide.music && <StoryMusicOverlay m={slide.music} />}
        {slide.music?.preview && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio key={`audio-${slide.id}`} src={slide.music.preview} autoPlay loop className="hidden" />
        )}

        {/* progress bars */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex gap-1 z-10">
          {slides.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white"
                style={{ width: i < idx ? "100%" : i === idx ? `${progress}%` : "0%" }}
              />
            </div>
          ))}
        </div>

        {/* header */}
        <div className="absolute top-5 left-3 right-3 flex items-center gap-2.5 z-10">
          <Avatar className="size-9 ring-2 ring-white/40">
            <AvatarImage src={u?.avatar} />
            <AvatarFallback>{initials(u?.name ?? "")}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{u?.name}</p>
            <p className="text-[10px] text-white/70" suppressHydrationWarning>
              {formatRelative(new Date(slide.postedAt).toISOString())}
            </p>
          </div>
          <button
            onClick={close}
            aria-label={t("Close")}
            className="ml-auto size-8 rounded-full grid place-items-center bg-black/35 text-white hover:bg-black/55"
          >
            <X className="size-4" />
          </button>
        </div>

        {slide.kind === "text" && slide.text && (
          <p className="absolute inset-0 grid place-items-center text-white text-2xl md:text-3xl font-display font-medium p-6 text-center">
            {slide.text}
          </p>
        )}

        {/* tap zones for prev / next */}
        <button
          aria-label={t("Previous")}
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          className="absolute left-0 top-12 bottom-16 w-1/3"
        />
        <button
          aria-label={t("Next")}
          onClick={() => setIdx((i) => (i < slides.length - 1 ? i + 1 : i))}
          className="absolute right-0 top-12 bottom-16 w-1/3"
        />

        {idx > 0 && (
          <button
            onClick={() => setIdx(idx - 1)}
            aria-label={t("Previous")}
            className="absolute left-2 top-1/2 -translate-y-1/2 size-9 rounded-full grid place-items-center bg-black/35 text-white z-10"
          >
            <ChevronLeft />
          </button>
        )}
        {idx < slides.length - 1 && (
          <button
            onClick={() => setIdx(idx + 1)}
            aria-label={t("Next")}
            className="absolute right-2 top-1/2 -translate-y-1/2 size-9 rounded-full grid place-items-center bg-black/35 text-white z-10"
          >
            <ChevronRight />
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ───────── live music sticker (mirrors the editor's MusicLayerView) ─────────
 * Memoised so the viewer's per-frame progress re-render doesn't restart the
 * spin / marquee animation. */
const StoryMusicOverlay = React.memo(function StoryMusicOverlay({ m }: { m: StoryMusic }) {
  if (m.variant === "note") return null;

  let inner: React.ReactNode;
  if (m.variant === "square") {
    inner = (
      <div className="relative size-24 rounded-2xl overflow-hidden ring-2 ring-white/30 shadow-floating">
        {m.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.cover} alt="" className="w-full h-full object-cover" />
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
  } else if (m.variant === "circle") {
    inner = (
      <motion.div
        className="relative size-24 rounded-full overflow-hidden ring-2 ring-white/30 shadow-floating"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      >
        {m.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.cover} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-white/15" />
        )}
        <span className="absolute inset-0 m-auto size-5 rounded-full bg-black/80 ring-2 ring-white/50" />
      </motion.div>
    );
  } else {
    // card
    inner = (
      <div className="inline-flex items-center gap-3 pl-2 pr-4 py-2 rounded-2xl bg-black/55 backdrop-blur-md ring-1 ring-white/15 text-white">
        {m.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.cover} alt="" className="size-11 rounded-xl object-cover shrink-0" />
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
  }

  // Vinyl rotates continuously, so don't bake the captured rotation into the
  // wrapper for that variant.
  const baseRotate = m.variant === "circle" ? 0 : m.rotate;
  return (
    <div
      className="absolute z-[6] pointer-events-none"
      style={{
        left: `${m.x}%`,
        top: `${m.y}%`,
        transform: `translate(-50%, -50%) rotate(${baseRotate}deg) scale(${m.scale})`
      }}
    >
      {inner}
    </div>
  );
});
