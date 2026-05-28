"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Group, Trash2, Ungroup } from "lucide-react";
import { useWhiteboardStore } from "@/store/use-whiteboard-store";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

/**
 * Compact floating bar that appears whenever the user has 2+ items selected.
 * Hangs from the bottom-center so it doesn't fight the minimap. Doubles as a
 * discoverability hint for the Ctrl+G / Ctrl+Shift+G shortcuts.
 */
export function SelectionToolbar() {
  const t = useT();
  const selection = useWhiteboardStore((s) => s.selection);
  const board = useWhiteboardStore((s) => s.activeBoard());
  const groupSelection = useWhiteboardStore((s) => s.groupSelection);
  const ungroupSelection = useWhiteboardStore((s) => s.ungroupSelection);
  const removeSelection = useWhiteboardStore((s) => s.removeSelection);
  const pushHistory = useWhiteboardStore((s) => s.pushHistory);

  if (!board) return null;
  const visible = selection.length >= 2;

  // Are any of the selected elements already part of a group? If so, the
  // primary action becomes "Ungroup" instead of "Group" — a single button
  // whose label flips based on selection state.
  const anyGrouped = board.elements.some(
    (e) => selection.includes(e.id) && "groupId" in e && e.groupId
  );

  const togglePrimary = () => {
    pushHistory();
    if (anyGrouped) ungroupSelection();
    else groupSelection();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="pointer-events-auto inline-flex items-center gap-1 glass-strong rounded-full border border-border/60 shadow-floating px-2 py-1.5"
        >
          <span className="text-[11px] text-muted-foreground px-2 tabular-nums">
            {selection.length} {t("selected")}
          </span>
          <div className="w-px h-5 bg-border/60 mx-1" />
          <button
            onClick={togglePrimary}
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition",
              "bg-foreground text-background hover:opacity-90"
            )}
            title={anyGrouped ? `${t("Ungroup")} · Ctrl+Shift+G` : `${t("Group")} · Ctrl+G`}
          >
            {anyGrouped ? (
              <>
                <Ungroup className="size-3.5" /> {t("Ungroup")}
                <span className="ml-1 text-[10px] opacity-70">⌘⇧G</span>
              </>
            ) : (
              <>
                <Group className="size-3.5" /> {t("Group")}
                <span className="ml-1 text-[10px] opacity-70">⌘G</span>
              </>
            )}
          </button>
          <button
            onClick={() => {
              pushHistory();
              removeSelection();
            }}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium text-rose-300 hover:bg-rose-500/15 transition"
            title={`${t("Delete selection")} · Del`}
          >
            <Trash2 className="size-3.5" /> {t("Delete")}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
