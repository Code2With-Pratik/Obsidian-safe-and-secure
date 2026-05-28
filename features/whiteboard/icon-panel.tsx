"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { Loader2, Search, Sparkles, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useWhiteboardStore } from "@/store/use-whiteboard-store";
import { useT } from "@/lib/i18n";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Curated suggestions for when the search is empty. Pulled from popular
 *  icon sets so the panel feels alive on first open. */
const SUGGESTED = [
  "mdi:rocket-launch",
  "mdi:lightbulb-on",
  "mdi:robot-happy",
  "mdi:heart",
  "lucide:bell",
  "lucide:zap",
  "lucide:shield-check",
  "lucide:trending-up",
  "mdi:cloud-outline",
  "mdi:music",
  "mdi:image",
  "mdi:database",
  "ph:cube-duotone",
  "ph:lightning-duotone",
  "ph:sparkle-duotone",
  "lucide:flag",
  "lucide:map",
  "lucide:settings",
  "lucide:calendar",
  "mdi:account-group",
  "mdi:atom",
  "mdi:beaker",
  "mdi:brain",
  "mdi:chart-line"
];

export function IconPanel({ open, onOpenChange }: Props) {
  const t = useT();
  const addElement = useWhiteboardStore((s) => s.addElement);
  const pushHistory = useWhiteboardStore((s) => s.pushHistory);
  const board = useWhiteboardStore((s) => s.activeBoard());
  const color = useWhiteboardStore((s) => s.color);

  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /** Debounced search against the Iconify API. Empty query = suggestions. */
  React.useEffect(() => {
    if (!open) return;
    const query = q.trim();
    if (!query) {
      setResults(SUGGESTED);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const id = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.iconify.design/search?query=${encodeURIComponent(
            query
          )}&limit=64`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: { icons?: string[] } = await res.json();
        setResults(data.icons ?? []);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError("Couldn't load icons. Check your connection.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      window.clearTimeout(id);
      controller.abort();
    };
  }, [q, open]);

  const insertIcon = (icon: string) => {
    if (!board) return;
    // Drop the icon roughly in the centre of the current viewport so the
    // user actually sees it land somewhere sensible.
    const view =
      typeof document !== "undefined"
        ? document.querySelector<HTMLElement>("[data-board-viewport]")
        : null;
    const w = view?.clientWidth ?? 800;
    const h = view?.clientHeight ?? 600;
    const cam = board.camera;
    const cx = (w / 2 - cam.x) / cam.zoom;
    const cy = (h / 2 - cam.y) / cam.zoom;
    const size = 96;
    pushHistory();
    addElement({
      id: `icon-${Date.now()}`,
      kind: "icon",
      icon,
      x: cx - size / 2,
      y: cy - size / 2,
      w: size,
      h: size,
      color
    });
    onOpenChange(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 360, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 360, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
          className="fixed top-16 bottom-0 right-0 z-[60] w-full md:w-[360px] flex flex-col bg-card/85 backdrop-blur-xl border-l border-border/60 shadow-floating"
        >
          <header className="h-14 px-4 flex items-center gap-2 border-b border-border/40 shrink-0">
            <div className="size-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center text-white shadow-glow">
              <Sparkles className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{t("Icons")}</p>
              <p className="text-[11px] text-muted-foreground -mt-0.5">
                {t("Powered by Iconify · 200k+ icons")}
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="size-8 rounded-md grid place-items-center text-muted-foreground hover:bg-foreground/10"
              aria-label={t("Close")}
            >
              <X className="size-4" />
            </button>
          </header>

          <div className="px-3 py-3 border-b border-border/40 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("Try 'rocket', 'cloud', 'bell'…")}
                className="pl-9 h-10"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              {q.trim()
                ? loading
                  ? t("Searching…")
                  : `${results.length} ${t("icons for")} "${q.trim()}"`
                : t("Suggestions — type to search 200k+ icons")}
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2 no-scrollbar">
            {error ? (
              <div className="grid place-items-center py-12 text-center px-4">
                <p className="text-sm text-rose-300">{t(error)}</p>
              </div>
            ) : results.length === 0 && !loading ? (
              <div className="grid place-items-center py-12 text-center px-4">
                <p className="text-sm text-muted-foreground">
                  {t("No icons match")} "{q.trim()}".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1">
                {results.map((name) => (
                  <button
                    key={name}
                    onClick={() => insertIcon(name)}
                    title={name}
                    className={cn(
                      "aspect-square rounded-lg grid place-items-center text-foreground/80 hover:bg-foreground/10 hover:text-foreground transition group/icon"
                    )}
                  >
                    <Icon icon={name} className="size-7 group-hover/icon:scale-110 transition" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <footer className="border-t border-border/40 px-3 py-2 text-[10px] text-muted-foreground shrink-0">
            {t("Click any icon to drop it on the board.")}
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
