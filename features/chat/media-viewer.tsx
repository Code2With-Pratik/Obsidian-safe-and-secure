"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Play,
  Pause,
  Music as MusicIcon,
  Film
} from "lucide-react";

export type MediaKind = "image" | "video" | "gif" | "pdf" | "music";

export interface MediaItem {
  kind: MediaKind;
  /** image/gif URL, or video poster, or a label/identifier for pdf/music */
  src: string;
  /** optional poster for video */
  poster?: string;
  title?: string;
  meta?: string;
}

interface Props {
  items: MediaItem[];
  open: boolean;
  startIndex: number;
  onClose: () => void;
}

/**
 * Full-screen media viewer with prev/next navigation across mixed media
 * kinds (image, video, gif, pdf, music). Visual kinds render their bitmap;
 * video/pdf/music render rich preview surfaces since the demo carries no
 * real binary assets.
 */
export function MediaViewer({ items, open, startIndex, onClose }: Props) {
  const [index, setIndex] = React.useState(startIndex);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (open) setIndex(Math.max(0, Math.min(startIndex, items.length - 1)));
  }, [open, startIndex, items.length]);

  const prev = React.useCallback(
    () => setIndex((i) => (items.length === 0 ? 0 : (i - 1 + items.length) % items.length)),
    [items.length]
  );
  const next = React.useCallback(
    () => setIndex((i) => (items.length === 0 ? 0 : (i + 1) % items.length)),
    [items.length]
  );

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, prev, next]);

  if (!mounted) return null;
  const current = items[index];

  return createPortal(
    <AnimatePresence>
      {open && current && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-[400] bg-black/30 backdrop-blur-2xl grid grid-rows-[auto_1fr_auto]"
        >
          {/* top bar */}
          <div
            className="relative z-10 flex items-center justify-between gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="size-10 rounded-full bg-white/10 backdrop-blur grid place-items-center text-white hover:bg-white/20 shrink-0"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
            <div className="min-w-0 text-center">
              {current.title && (
                <p className="text-white text-sm font-medium truncate">{current.title}</p>
              )}
              <p className="text-white/60 text-[11px] tabular-nums">
                {items.length > 1 ? `${index + 1} / ${items.length}` : current.meta ?? ""}
              </p>
            </div>
            <a
              href={current.src}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="size-10 rounded-full bg-white/10 backdrop-blur grid place-items-center text-white hover:bg-white/20 shrink-0"
              aria-label="Download"
            >
              <Download className="size-5" />
            </a>
          </div>

          {/* stage */}
          <div className="relative overflow-hidden grid place-items-center px-4" onClick={onClose}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.src + index}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className="grid place-items-center w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <MediaStage item={current} />
              </motion.div>
            </AnimatePresence>

            {items.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white/10 backdrop-blur grid place-items-center text-white hover:bg-white/20"
                  aria-label="Previous"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white/10 backdrop-blur grid place-items-center text-white hover:bg-white/20"
                  aria-label="Next"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>

          {/* thumbnail strip */}
          {items.length > 1 ? (
            <div
              className="flex justify-start md:justify-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {items.map((it, i) => (
                <button
                  key={it.src + i}
                  onClick={() => setIndex(i)}
                  className={
                    "size-14 rounded-lg overflow-hidden shrink-0 ring-2 transition grid place-items-center bg-white/5 " +
                    (i === index ? "ring-cyan-400" : "ring-white/10 hover:ring-white/30")
                  }
                  aria-label={it.title ?? it.kind}
                >
                  <Thumb item={it} />
                </button>
              ))}
            </div>
          ) : (
            <div />
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function MediaStage({ item }: { item: MediaItem }) {
  const [playing, setPlaying] = React.useState(false);

  if (item.kind === "music") {
    return <MusicStage item={item} />;
  }

  if (item.kind === "image" || item.kind === "gif") {
    return (
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.src}
          alt={item.title ?? ""}
          className="max-w-[94vw] max-h-[72dvh] object-contain rounded-lg"
          draggable={false}
        />
        {item.kind === "gif" && (
          <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-black/55 backdrop-blur text-white">
            GIF
          </span>
        )}
      </div>
    );
  }

  if (item.kind === "video") {
    return (
      <div className="relative max-w-[94vw] w-[640px] aspect-video rounded-2xl overflow-hidden ring-1 ring-white/15 grid place-items-center bg-black">
        {(item.poster ?? item.src) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.poster ?? item.src}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-70"
            draggable={false}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <button
          onClick={() => setPlaying((p) => !p)}
          className="relative z-10 size-20 rounded-full bg-white/15 backdrop-blur-md grid place-items-center text-white ring-2 ring-white/30 hover:bg-white/25 transition"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="size-8" /> : <Play className="size-8 ml-1" />}
        </button>
        <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2 text-white">
          <Film className="size-4 shrink-0" />
          <span className="text-sm font-medium truncate">{item.title ?? "Video"}</span>
          {item.meta && <span className="text-[11px] text-white/60 ml-auto shrink-0">{item.meta}</span>}
        </div>
      </div>
    );
  }

  if (item.kind === "pdf") {
    return (
      <div className="w-[min(92vw,420px)] rounded-2xl overflow-hidden ring-1 ring-white/15 bg-white text-neutral-900 shadow-2xl">
        <div className="aspect-[3/4] grid place-items-center bg-gradient-to-br from-neutral-100 to-neutral-200">
          <FileText className="size-20 text-rose-500" strokeWidth={1.4} />
        </div>
        <div className="flex items-center gap-3 p-3 border-t border-black/5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{item.title ?? "Document.pdf"}</p>
            {item.meta && <p className="text-xs text-neutral-500 truncate">{item.meta}</p>}
          </div>
          <a
            href={item.src}
            download
            className="size-9 rounded-lg bg-neutral-900 text-white grid place-items-center hover:bg-neutral-700 shrink-0"
            aria-label="Download"
          >
            <Download className="size-4" />
          </a>
        </div>
      </div>
    );
  }

  // never reached — music has its own component above
  return null;
}

/** Real `<audio>`-backed player for the music branch of the viewer.
 *  - Loads `item.src` (the chat-attachments public URL) into an HTMLAudio.
 *  - Reflects real currentTime / duration in the progress bar.
 *  - Click anywhere on the progress bar to seek.
 *  - Auto-pauses when the viewer unmounts so closing the modal also stops
 *    playback (otherwise the audio keeps playing behind the closed modal). */
function MusicStage({ item }: { item: MediaItem }) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [current, setCurrent] = React.useState(0);
  const [duration, setDuration] = React.useState(0);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrent(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration || 0);
    const onEnd = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("ended", onEnd);
      // Stop playback when the viewer closes or switches track.
      audio.pause();
    };
  }, [item.src]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrent(audio.currentTime);
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || s <= 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const pct = duration ? (current / duration) * 100 : 0;

  return (
    <div className="w-[min(92vw,360px)] rounded-3xl overflow-hidden ring-1 ring-white/15 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-cyan-500 p-6 text-white shadow-2xl">
      <div className="aspect-square rounded-2xl bg-white/15 backdrop-blur grid place-items-center mb-5">
        <MusicIcon className="size-20" strokeWidth={1.4} />
      </div>
      <p className="text-lg font-semibold truncate">{item.title ?? "Track"}</p>
      {item.meta && <p className="text-sm text-white/70 truncate">{item.meta}</p>}
      <div
        onClick={seek}
        className="mt-4 h-1.5 rounded-full bg-white/25 overflow-hidden cursor-pointer"
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(current)}
      >
        <div
          className="h-full bg-white transition-[width] duration-150 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-white/70 tabular-nums">
        <span>{fmt(current)}</span>
        <span>{fmt(duration)}</span>
      </div>
      <div className="mt-3 flex justify-center">
        <button
          onClick={toggle}
          className="size-14 rounded-full bg-white text-violet-700 grid place-items-center hover:scale-105 transition"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="size-6" /> : <Play className="size-6 ml-0.5" />}
        </button>
      </div>
      <audio ref={audioRef} src={item.src} preload="metadata" />
    </div>
  );
}

function Thumb({ item }: { item: MediaItem }) {
  if (item.kind === "image" || item.kind === "gif" || item.kind === "video") {
    return (
      <div className="relative w-full h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.poster ?? item.src}
          alt=""
          className="w-full h-full object-cover"
          draggable={false}
        />
        {item.kind === "video" && (
          <span className="absolute inset-0 grid place-items-center bg-black/30 text-white">
            <Play className="size-4" />
          </span>
        )}
        {item.kind === "gif" && (
          <span className="absolute bottom-0.5 left-0.5 text-[7px] font-bold px-1 rounded bg-black/60 text-white">
            GIF
          </span>
        )}
      </div>
    );
  }
  if (item.kind === "pdf") {
    return <FileText className="size-5 text-rose-300" />;
  }
  return <MusicIcon className="size-5 text-cyan-200" />;
}
