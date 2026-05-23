"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  Camera,
  Video,
  Contact,
  MapPin,
  FileText,
  CalendarClock,
  BarChart3,
  Mic,
  Music,
  Gift,
  Sparkles,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const items: Item[] = [
  { id: "photo", label: "Photos", icon: <ImageIcon />, color: "from-violet-500 to-fuchsia-500" },
  { id: "camera", label: "Camera", icon: <Camera />, color: "from-pink-500 to-rose-500" },
  { id: "video", label: "Videos", icon: <Video />, color: "from-amber-400 to-orange-500" },
  { id: "voice", label: "Voice", icon: <Mic />, color: "from-emerald-400 to-cyan-400" },
  { id: "doc", label: "Documents", icon: <FileText />, color: "from-blue-500 to-cyan-400" },
  { id: "contact", label: "Contact", icon: <Contact />, color: "from-cyan-400 to-blue-500" },
  { id: "location", label: "Location", icon: <MapPin />, color: "from-rose-500 to-pink-500" },
  { id: "schedule", label: "Schedule", icon: <CalendarClock />, color: "from-violet-500 to-cyan-400" },
  { id: "poll", label: "Poll", icon: <BarChart3 />, color: "from-fuchsia-500 to-violet-500" },
  { id: "music", label: "Music", icon: <Music />, color: "from-emerald-400 to-teal-500" },
  { id: "gift", label: "Gift", icon: <Gift />, color: "from-yellow-400 to-amber-500" },
  { id: "ai", label: "Nova AI", icon: <Sparkles />, color: "from-violet-500 via-fuchsia-500 to-cyan-400" }
];

interface Props {
  open: boolean;
  onClose: () => void;
  onPick?: (id: string) => void;
}

export function AttachmentSheet({ open, onClose, onPick }: Props) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[95] bg-black/20"
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80) onClose();
            }}
            className="fixed inset-x-0 bottom-0 md:inset-x-auto md:right-6 md:bottom-6 md:max-w-md md:w-[420px] z-[96]"
          >
            <div className="relative glass-strong glass-specular rounded-t-3xl md:rounded-3xl border border-white/15 shadow-floating overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="mx-auto mt-2 mb-2 md:hidden h-1 w-10 rounded-full bg-white/20" />

              <div className="flex items-center justify-between px-5 pt-1 md:pt-4 pb-3">
                <div>
                  <h3 className="font-display font-semibold tracking-tight text-lg">
                    Attach to message
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Drag down or tap outside to close
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="size-8 rounded-full glass-subtle grid place-items-center hover:bg-foreground/5"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="px-4 grid grid-cols-4 gap-2 pb-4">
                {items.map((it, i) => (
                  <motion.button
                    key={it.id}
                    initial={{ opacity: 0, y: 24, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      delay: 0.05 + i * 0.03,
                      type: "spring",
                      stiffness: 280,
                      damping: 22
                    }}
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ y: -3 }}
                    onClick={() => {
                      onPick?.(it.id);
                      onClose();
                    }}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-2xl hover:bg-foreground/[0.04] transition group"
                  >
                    <span
                      className={cn(
                        "size-12 rounded-2xl bg-gradient-to-br grid place-items-center text-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.4)]",
                        "[&_svg]:size-5 group-hover:shadow-glow transition-shadow",
                        it.color
                      )}
                    >
                      {it.icon}
                    </span>
                    <span className="text-[11px] font-medium">{it.label}</span>
                  </motion.button>
                ))}
              </div>

              <div className="px-5 pb-2 pt-1 border-t border-white/10 text-center">
                <p className="text-[10px] text-muted-foreground">
                  End-to-end encrypted · drag a file anywhere to attach instantly
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
