"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";

/** A single image entry the lightbox can show. */
export interface LightboxImage {
  src: string;
  alt?: string;
}

interface Ctx {
  open: (items: LightboxImage[], startIndex: number) => void;
}

const LightboxCtx = React.createContext<Ctx | null>(null);

export function useImageLightbox(): Ctx {
  const ctx = React.useContext(LightboxCtx);
  if (!ctx) {
    // No provider — return a no-op so call-sites don't crash.
    return { open: () => {} };
  }
  return ctx;
}

/** Provider — keeps the lightbox state and renders the modal. */
export function ImageLightboxProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = React.useState<LightboxImage[]>([]);
  const [index, setIndex] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const value = React.useMemo<Ctx>(
    () => ({
      open: (next, start) => {
        if (next.length === 0) return;
        setItems(next);
        setIndex(Math.max(0, Math.min(start, next.length - 1)));
        setOpen(true);
      }
    }),
    []
  );

  const close = React.useCallback(() => setOpen(false), []);
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
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, prev, next]);

  const current = items[index];

  return (
    <LightboxCtx.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && current && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-[400] bg-black/90 grid grid-rows-[auto_1fr_auto]"
              >
                {/* top bar */}
                <div className="relative z-10 flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
                  <button
                    onClick={close}
                    className="size-10 rounded-full bg-white/10 backdrop-blur grid place-items-center text-white hover:bg-white/20"
                    aria-label="Close"
                  >
                    <X className="size-5" />
                  </button>
                  <span className="text-white/80 text-sm font-medium tabular-nums">
                    {items.length > 1 ? `${index + 1} / ${items.length}` : ""}
                  </span>
                  <a
                    href={current.src}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="size-10 rounded-full bg-white/10 backdrop-blur grid place-items-center text-white hover:bg-white/20"
                    aria-label="Download"
                  >
                    <Download className="size-5" />
                  </a>
                </div>

                {/* image stage */}
                <div
                  className="relative overflow-hidden grid place-items-center"
                  onClick={close}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.img
                      key={current.src + index}
                      src={current.src}
                      alt={current.alt ?? ""}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className="max-w-[94vw] max-h-[78dvh] object-contain"
                      onClick={(e) => e.stopPropagation()}
                      draggable={false}
                    />
                  </AnimatePresence>

                  {items.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          prev();
                        }}
                        className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white/10 backdrop-blur grid place-items-center text-white hover:bg-white/20"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="size-6" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          next();
                        }}
                        className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white/10 backdrop-blur grid place-items-center text-white hover:bg-white/20"
                        aria-label="Next image"
                      >
                        <ChevronRight className="size-6" />
                      </button>
                    </>
                  )}
                </div>

                {/* thumbnail strip on desktop */}
                {items.length > 1 && (
                  <div className="hidden md:flex justify-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
                    {items.map((it, i) => (
                      <button
                        key={it.src + i}
                        onClick={() => setIndex(i)}
                        className={
                          "size-14 rounded-lg overflow-hidden shrink-0 ring-2 transition " +
                          (i === index
                            ? "ring-cyan-400"
                            : "ring-white/10 hover:ring-white/30")
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={it.src}
                          alt=""
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      </button>
                    ))}
                  </div>
                )}
                {items.length <= 1 && <div />}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </LightboxCtx.Provider>
  );
}
