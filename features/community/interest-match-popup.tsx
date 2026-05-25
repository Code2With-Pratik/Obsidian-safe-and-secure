"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Users } from "lucide-react";

interface Props {
  open: boolean;
  count: number;
  communityName: string;
  onClose: () => void;
}

/**
 * Celebratory popup shown right after the user joins a community whose
 * interests overlap with theirs. Auto-dismisses after a few seconds.
 */
export function InterestMatchPopup({ open, count, communityName, onClose }: Props) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(onClose, 3500);
    return () => window.clearTimeout(id);
  }, [open, onClose]);

  // Rendered into document.body so the popup escapes any parent that uses
  // `overflow:hidden` / transforms / z-index stacking — guarantees it sits on
  // top of every other surface in the app.
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* dimming layer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -10 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            className="fixed inset-0 z-[9999] grid place-items-center pointer-events-none px-4"
          >
            <div className="pointer-events-auto relative w-full max-w-md rounded-3xl border border-white/15 overflow-hidden bg-gradient-to-br from-violet-600/40 via-fuchsia-500/30 to-cyan-400/30 backdrop-blur-2xl shadow-floating">
              {/* aurora wash */}
              <motion.div
                className="absolute -top-24 -right-20 size-64 rounded-full bg-fuchsia-500/30 blur-3xl"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <motion.div
                className="absolute -bottom-20 -left-20 size-56 rounded-full bg-cyan-400/30 blur-3xl"
                animate={{ scale: [1.1, 0.95, 1.1] }}
                transition={{ duration: 5, repeat: Infinity }}
              />

              <div className="relative p-7 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, -8, 8, 0] }}
                  transition={{ duration: 0.6, ease: "backOut" }}
                  className="size-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-glow text-white"
                >
                  <Sparkles className="size-7" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="font-display text-2xl font-semibold mt-4 text-white"
                >
                  You're in.
                </motion.h2>

                {count > 0 ? (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="mt-2 text-white/90"
                  >
                    <span className="inline-flex items-center gap-1.5 text-base">
                      <Users className="size-4" />
                      <motion.span
                        key={count}
                        initial={{ scale: 1.4, color: "#fde68a" }}
                        animate={{ scale: 1, color: "#ffffff" }}
                        transition={{ duration: 0.5, ease: "backOut" }}
                        className="font-bold text-lg tabular-nums"
                      >
                        {count.toLocaleString()}
                      </motion.span>
                      <span className="opacity-90">people match your interests</span>
                    </span>
                    <span className="block text-[12px] text-white/70 mt-1">
                      in {communityName}
                    </span>
                  </motion.p>
                ) : (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="mt-2 text-white/90 text-sm"
                  >
                    Welcome to <span className="font-semibold">{communityName}</span>.
                    Lurk, learn, post when you feel it.
                  </motion.p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
