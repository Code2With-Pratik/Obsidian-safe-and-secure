"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  User2,
  PlayCircle,
  Music,
  Play,
  Pause,
  Heart,
  Send
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  useStoriesStore,
  type StoryMusic,
  type StorySlide,
  type UserStories
} from "@/store/use-stories-store";
import { useChatStore } from "@/store/use-chat-store";
import { VinylDisc } from "@/components/stories/vinyl-disc";
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
  const photoUserId = useStoriesStore((s) => s.photoUserId);

  // Expire stories older than 24h (on mount, then every minute).
  const pruneExpired = useStoriesStore((s) => s.pruneExpired);
  React.useEffect(() => {
    pruneExpired();
    const id = window.setInterval(pruneExpired, 60_000);
    return () => window.clearInterval(id);
  }, [pruneExpired]);

  if (!mounted) return null;
  return createPortal(
    <>
      <AnimatePresence>{promptUserId && <Prompt key="prompt" userId={promptUserId} />}</AnimatePresence>
      <AnimatePresence>{viewerUserId && <Viewer key={viewerUserId} userId={viewerUserId} />}</AnimatePresence>
      <AnimatePresence>{photoUserId && <PhotoViewer key="photo" userId={photoUserId} />}</AnimatePresence>
    </>,
    document.body
  );
}

/* ───────── WhatsApp-style "story or profile?" prompt ───────── */
function Prompt({ userId }: { userId: string }) {
  const t = useT();
  const closePrompt = useStoriesStore((s) => s.closePrompt);
  const openViewer = useStoriesStore((s) => s.openViewer);
  const openPhoto = useStoriesStore((s) => s.openPhoto);
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
          <Button variant="glass" onClick={() => openPhoto(userId)}>
            <User2 /> {t("View profile photo")}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────── WhatsApp-style enlarged profile photo ───────── */
function PhotoViewer({ userId }: { userId: string }) {
  const t = useT();
  const close = useStoriesStore((s) => s.closePhoto);
  const u = lookup(userId);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <motion.div
      className="fixed inset-0 z-[280] grid place-items-center p-4 bg-black/80 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={close}
    >
      <button
        onClick={close}
        aria-label={t("Close")}
        className="absolute top-4 right-4 size-10 rounded-full grid place-items-center bg-white/10 text-white hover:bg-white/20"
      >
        <X />
      </button>
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="flex flex-col items-center gap-5"
      >
        <Avatar className="size-72 max-w-[80vw] max-h-[80vw] ring-1 ring-white/15 shadow-floating">
          <AvatarImage src={u?.avatar} className="object-cover" />
          <AvatarFallback className="text-6xl">{initials(u?.name ?? "")}</AvatarFallback>
        </Avatar>
        <div className="text-center">
          <p className="text-xl font-display font-semibold text-white">{u?.name}</p>
          {u?.username && <p className="text-sm text-white/60">@{u.username}</p>}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────── Full-screen story viewer (swipes across people, IG-style) ───────── */
function Viewer({ userId }: { userId: string }) {
  const t = useT();
  const byUser = useStoriesStore((s) => s.byUser);
  const close = useStoriesStore((s) => s.closeViewer);
  const markViewed = useStoriesStore((s) => s.markViewed);

  // Ordered reels — your own first, then everyone else (matches the rail).
  const reels = React.useMemo(
    () =>
      Object.values(byUser)
        .filter((r) => r.slides.length > 0)
        .sort((a, b) => (a.userId === "me" ? -1 : b.userId === "me" ? 1 : 0)),
    [byUser]
  );

  const [userIdx, setUserIdx] = React.useState(() => {
    const i = reels.findIndex((r) => r.userId === userId);
    return i < 0 ? 0 : i;
  });
  const [idx, setIdx] = React.useState(0);
  const [progress, setProgress] = React.useState(0);

  const reel = reels[userIdx];
  const slides = reel?.slides ?? [];
  const u = reel ? lookup(reel.userId) : undefined;
  const slide = slides[idx];

  // Play/pause for the whole story (progress timer + music). pausedRef lets the
  // rAF read the latest value without restarting the timer.
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [paused, setPaused] = React.useState(false);
  const pausedRef = React.useRef(false);
  React.useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  // Each new slide starts playing afresh (the audio element auto-plays).
  React.useEffect(() => {
    setPaused(false);
  }, [slide?.id]);
  const togglePaused = React.useCallback(() => {
    setPaused((p) => {
      const next = !p;
      const a = audioRef.current;
      if (a) {
        if (next) a.pause();
        else a.play().catch(() => {});
      }
      return next;
    });
  }, []);

  // Watching a person's reel marks it viewed → dims their ring everywhere.
  React.useEffect(() => {
    if (reel) markViewed(reel.userId);
  }, [reel?.userId, markViewed]);

  // Forward: next slide → next person → close at the very end.
  const goNext = React.useCallback(() => {
    if (idx < slides.length - 1) setIdx(idx + 1);
    else if (userIdx < reels.length - 1) {
      setUserIdx(userIdx + 1);
      setIdx(0);
    } else close();
  }, [idx, slides.length, userIdx, reels.length, close]);

  // Backward: prev slide → previous person's LAST slide.
  const goPrev = React.useCallback(() => {
    if (idx > 0) setIdx(idx - 1);
    else if (userIdx > 0) {
      const prev = reels[userIdx - 1];
      setUserIdx(userIdx - 1);
      setIdx(Math.max(0, (prev?.slides.length ?? 1) - 1));
    }
  }, [idx, userIdx, reels]);

  // rAF-driven progress for the current slide; auto-advances / closes at 100%.
  // A slide with music runs for the full 30s preview; otherwise 5s. Time only
  // accrues while not paused (delta accumulation), so the play/pause button
  // genuinely freezes the story.
  React.useEffect(() => {
    setProgress(0);
    const DURATION = slide?.music?.preview ? 30000 : 5000;
    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (!pausedRef.current) {
        elapsed += dt;
        const pct = Math.min(100, (elapsed / DURATION) * 100);
        setProgress(pct);
        if (pct >= 100) {
          goNext();
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [userIdx, idx, slide?.music?.preview, goNext]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext, close]);

  if (!slide) return null;

  const hasPrev = idx > 0 || userIdx > 0;
  const hasNext = idx < slides.length - 1 || userIdx < reels.length - 1;

  return (
    <motion.div
      className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl grid place-items-center px-3 md:px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md aspect-[9/16] max-h-[92dvh] rounded-3xl overflow-hidden ring-1 ring-white/15 bg-black"
      >
        {slide.kind === "text" ? (
          <div className="absolute inset-0" style={{ background: slide.bg }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slide.src} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/50" />

        {/* live image / GIF overlays — rendered as <img> so GIFs keep playing */}
        {slide.overlays?.map((o) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={o.id}
            src={o.src}
            alt=""
            className="absolute select-none pointer-events-none shadow-[0_8px_24px_-6px_rgba(0,0,0,0.5)]"
            style={{
              left: `${o.x}%`,
              top: `${o.y}%`,
              width: `${o.wPct}%`,
              height: `${o.hPct}%`,
              objectFit: "cover",
              borderRadius: 12,
              filter: o.filter,
              transform: `translate(-50%, -50%) rotate(${o.rotate}deg) scale(${o.scale})`
            }}
          />
        ))}

        {/* live music overlay — spins (vinyl) / scrolls (card); plays the
            30s preview on loop while the slide is open. */}
        {slide.music && <StoryMusicOverlay m={slide.music} />}
        {slide.music?.preview && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio key={`audio-${slide.id}`} ref={audioRef} src={slide.music.preview} autoPlay loop className="hidden" />
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

        {/* header — name + time on one line, animated song name below (IG-style) */}
        <div className="absolute top-5 left-3 right-3 flex items-center gap-2.5 z-10">
          <Avatar className="size-9 ring-2 ring-white/40">
            <AvatarImage src={u?.avatar} />
            <AvatarFallback>{initials(u?.name ?? "")}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-semibold text-white truncate">{u?.name}</span>
              <span className="text-white/50 shrink-0">·</span>
              <span className="text-[11px] text-white/70 shrink-0" suppressHydrationWarning>
                {formatRelative(new Date(slide.postedAt).toISOString())}
              </span>
            </div>
            {slide.music && (
              <div className="flex items-center gap-1 mt-0.5 text-white/85">
                <Music className="size-3 shrink-0" />
                <Marquee
                  text={`${slide.music.title} · ${slide.music.artist}`}
                  className="text-[11px] font-medium"
                />
              </div>
            )}
          </div>
          <button
            onClick={togglePaused}
            aria-label={paused ? t("Play") : t("Pause")}
            className="size-8 rounded-full grid place-items-center bg-black/35 text-white hover:bg-black/55 shrink-0"
          >
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
          </button>
          <button
            onClick={close}
            aria-label={t("Close")}
            className="size-8 rounded-full grid place-items-center bg-black/35 text-white hover:bg-black/55 shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>

        {slide.kind === "text" && slide.text && (
          <p className="absolute inset-0 grid place-items-center text-white text-2xl md:text-3xl font-display font-medium p-6 text-center">
            {slide.text}
          </p>
        )}

        {/* tap zones for prev / next (cross into the previous / next person) */}
        <button
          aria-label={t("Previous")}
          onClick={goPrev}
          className="absolute left-0 top-12 bottom-16 w-1/3"
        />
        <button
          aria-label={t("Next")}
          onClick={goNext}
          className="absolute right-0 top-12 bottom-16 w-1/3"
        />

        {hasPrev && (
          <button
            onClick={goPrev}
            aria-label={t("Previous")}
            className="absolute left-2 top-1/2 -translate-y-1/2 size-9 rounded-full grid place-items-center bg-black/35 text-white z-10"
          >
            <ChevronLeft />
          </button>
        )}
        {hasNext && (
          <button
            onClick={goNext}
            aria-label={t("Next")}
            className="absolute right-2 top-1/2 -translate-y-1/2 size-9 rounded-full grid place-items-center bg-black/35 text-white z-10"
          >
            <ChevronRight />
          </button>
        )}

        <StoryBottomBar key={reel.userId} reel={reel} slide={slide} setPaused={setPaused} />
      </div>
    </motion.div>
  );
}

/* ───────── bottom bar: like + reply (others) · viewers + likers (mine) ───────── */
function StoryBottomBar({
  reel,
  slide,
  setPaused
}: {
  reel: UserStories;
  slide: StorySlide;
  setPaused: (v: boolean) => void;
}) {
  if (reel.userId === "me") return <MyStoryBar setPaused={setPaused} />;
  return <OtherStoryBar reel={reel} slide={slide} setPaused={setPaused} />;
}

function OtherStoryBar({
  reel,
  slide,
  setPaused
}: {
  reel: UserStories;
  slide: StorySlide;
  setPaused: (v: boolean) => void;
}) {
  const t = useT();
  const toggleLike = useStoriesStore((s) => s.toggleLike);
  const startDM = useChatStore((s) => s.startDM);
  const sendAttachment = useChatStore((s) => s.sendAttachment);
  const liked = !!reel.likedByMe;
  const [reply, setReply] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [hearts, setHearts] = React.useState<number[]>([]);
  const heartKey = React.useRef(0);

  const like = () => {
    if (!liked) {
      const k = heartKey.current++;
      setHearts((h) => [...h, k]);
      window.setTimeout(() => setHearts((h) => h.filter((x) => x !== k)), 900);
    }
    toggleLike(reel.userId);
  };

  const sendReply = () => {
    const text = reply.trim();
    if (!text) return;
    const chat = startDM(reel.userId);
    if (slide.src) {
      sendAttachment(chat.id, {
        kind: "image",
        media: [{ url: slide.src, alt: "Story" }],
        content: text
      });
    } else {
      sendAttachment(chat.id, { kind: "text", content: text });
    }
    setReply("");
    setSent(true);
    window.setTimeout(() => setSent(false), 1600);
  };

  return (
    <div className="absolute bottom-0 inset-x-0 p-3 z-20">
      {sent && (
        <p className="text-center text-[11px] text-white/80 mb-2">{t("Reply sent")}</p>
      )}
      <div className="flex items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendReply();
          }}
          className="flex-1 flex items-center gap-2 rounded-full border border-white/40 bg-black/25 backdrop-blur px-4 h-11"
        >
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            placeholder={t("Reply…")}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/60 outline-none"
          />
          {reply.trim() && (
            <button type="submit" aria-label={t("Send")} className="text-white">
              <Send className="size-4" />
            </button>
          )}
        </form>
        <button
          onClick={like}
          aria-label={t("Like")}
          className="relative size-11 rounded-full grid place-items-center bg-black/25 backdrop-blur border border-white/40 shrink-0"
        >
          <Heart
            className={liked ? "size-5 fill-rose-500 text-rose-500" : "size-5 text-white"}
          />
          {hearts.map((k) => (
            <motion.span
              key={k}
              initial={{ y: 6, scale: 0.4, opacity: 0 }}
              animate={{ y: -46, scale: [0.4, 1.35, 1], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.85, ease: "easeOut" }}
              className="absolute inset-x-0 -bottom-1 grid place-items-center pointer-events-none"
            >
              <Heart className="size-6 fill-rose-500 text-rose-500" />
            </motion.span>
          ))}
        </button>
      </div>
    </div>
  );
}

function MyStoryBar({ setPaused }: { setPaused: (v: boolean) => void }) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  // Mock audience for the demo — deterministic so it doesn't reshuffle.
  const others = React.useMemo(() => users.filter((u) => u.id !== "me"), []);
  const viewers = others.slice(0, 5);
  const likers = others.slice(0, 2);
  const likerIds = new Set(likers.map((u) => u.id));

  const openList = () => {
    setOpen(true);
    setPaused(true);
  };
  const closeList = () => {
    setOpen(false);
    setPaused(false);
  };

  return (
    <>
      <div className="absolute bottom-0 inset-x-0 p-3 flex items-end justify-between z-20">
        <button
          onClick={openList}
          className="flex flex-col items-center gap-0.5 text-white/90 hover:text-white"
          aria-label={t("Viewers")}
        >
          <ChevronUp className="size-5" />
          <span className="text-[11px] font-medium">
            {viewers.length} {t("viewers")}
          </span>
        </button>
        <div className="flex items-center gap-1.5 text-white">
          <div className="flex -space-x-2">
            {likers.map((u) => (
              <Avatar key={u.id} className="size-6 ring-2 ring-black/60">
                <AvatarImage src={u.avatar} />
              </Avatar>
            ))}
          </div>
          <Heart className="size-4 fill-rose-500 text-rose-500" />
          <span className="text-[11px] font-medium">{likers.length}</span>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute inset-0 z-30 bg-black/60 flex flex-col justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeList}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="rounded-t-3xl glass-strong border-t border-white/15 max-h-[70%] flex flex-col"
            >
              <div className="pt-3 pb-2 flex flex-col items-center shrink-0">
                <div className="w-10 h-1 rounded-full bg-white/25 mb-2" />
                <p className="text-sm font-semibold text-foreground">
                  {viewers.length} {t("viewers")}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-5 space-y-1">
                {viewers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-2 py-2 rounded-xl">
                    <Avatar className="size-9">
                      <AvatarImage src={u.avatar} />
                      <AvatarFallback>{initials(u.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                      <p className="text-[11px] text-muted-foreground">@{u.username}</p>
                    </div>
                    {likerIds.has(u.id) && (
                      <Heart className="size-4 fill-rose-500 text-rose-500 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ───────── continuously scrolling text ─────────
 * rAF-driven (sets transform directly) so it animates even under the global
 * reduce-motion CSS / framer MotionConfig. Two copies + a trailing gap make
 * the translateX(-50%) loop seamless. */
function Marquee({ text, className }: { text: string; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    const DURATION = 9000;
    const tick = (now: number) => {
      if (start === null) start = now;
      const pct = (((now - start) / DURATION) % 1) * 50; // 0 → 50%
      const el = ref.current;
      if (el) el.style.transform = `translateX(-${pct}%)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="overflow-hidden max-w-[190px]">
      <div ref={ref} className="inline-flex whitespace-nowrap will-change-transform">
        <span className={`pr-8 ${className ?? ""}`}>{text}</span>
        <span className={`pr-8 ${className ?? ""}`} aria-hidden>
          {text}
        </span>
      </div>
    </div>
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
    inner = <VinylDisc cover={m.cover} />;
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
