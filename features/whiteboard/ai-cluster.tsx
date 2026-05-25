"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Check, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWhiteboardStore, type NoteElement } from "@/store/use-whiteboard-store";

/** Very simple keyword tokenizer — strips short / common words. */
const STOP = new Set([
  "the",
  "a",
  "an",
  "of",
  "to",
  "and",
  "or",
  "in",
  "on",
  "for",
  "with",
  "is",
  "are",
  "be",
  "we",
  "you",
  "i",
  "as",
  "at",
  "by",
  "it",
  "this",
  "that",
  "use",
  "using"
]);

function tokens(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

interface Cluster {
  topic: string;
  noteIds: string[];
  color: string;
}

const CLUSTER_COLORS = [
  "from-violet-500/30 to-fuchsia-500/30",
  "from-cyan-400/30 to-blue-500/30",
  "from-amber-400/30 to-rose-500/30",
  "from-emerald-400/30 to-cyan-400/30",
  "from-pink-400/30 to-violet-500/30"
];

/** Group notes by their most-frequent shared keyword. Notes with no matching
 *  partner end up in the "Misc" cluster. */
function clusterNotes(notes: NoteElement[]): Cluster[] {
  const wordCount = new Map<string, string[]>();
  for (const n of notes) {
    const seen = new Set<string>();
    for (const w of tokens(n.text)) {
      if (seen.has(w)) continue;
      seen.add(w);
      const arr = wordCount.get(w) ?? [];
      arr.push(n.id);
      wordCount.set(w, arr);
    }
  }
  // Sort keywords by how many notes mention them (desc), then assign each
  // note to its top keyword that still has room.
  const topWords = [...wordCount.entries()]
    .filter(([, ids]) => ids.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([w]) => w);
  const assigned = new Set<string>();
  const clusters: Cluster[] = [];
  topWords.slice(0, 5).forEach((w, i) => {
    const ids = (wordCount.get(w) ?? []).filter((id) => !assigned.has(id));
    if (ids.length < 2) return;
    ids.forEach((id) => assigned.add(id));
    clusters.push({
      topic: w.charAt(0).toUpperCase() + w.slice(1),
      noteIds: ids,
      color: CLUSTER_COLORS[i % CLUSTER_COLORS.length]
    });
  });
  const orphans = notes.filter((n) => !assigned.has(n.id)).map((n) => n.id);
  if (orphans.length > 0) {
    clusters.push({
      topic: "Misc",
      noteIds: orphans,
      color: CLUSTER_COLORS[CLUSTER_COLORS.length - 1]
    });
  }
  return clusters;
}

/** Physically rearrange notes into a column-per-cluster layout. */
function layoutNotes(clusters: Cluster[], notes: NoteElement[]) {
  const map = new Map<string, NoteElement>();
  for (const n of notes) map.set(n.id, n);
  const ROW_H = 200;
  const COL_W = 240;
  const PAD_X = 80;
  const PAD_Y = 140;
  const positions: { id: string; x: number; y: number; rot: number }[] = [];
  clusters.forEach((c, ci) => {
    c.noteIds.forEach((id, ri) => {
      const n = map.get(id);
      if (!n) return;
      positions.push({
        id,
        x: PAD_X + ci * COL_W,
        y: PAD_Y + ri * ROW_H,
        rot: (Math.random() - 0.5) * 4
      });
    });
  });
  return positions;
}

export function AiClusterBar() {
  const board = useWhiteboardStore((s) => s.activeBoard());
  const updateElement = useWhiteboardStore((s) => s.updateElement);
  const pushHistory = useWhiteboardStore((s) => s.pushHistory);

  const notes = React.useMemo(
    () => (board?.elements ?? []).filter((e): e is NoteElement => e.kind === "note"),
    [board?.elements]
  );
  const clusters = React.useMemo(() => clusterNotes(notes), [notes]);

  const [open, setOpen] = React.useState(false);

  if (notes.length < 2) return null;

  const apply = () => {
    pushHistory();
    const positions = layoutNotes(clusters, notes);
    for (const p of positions) {
      updateElement(p.id, { x: p.x, y: p.y, rot: p.rot } as Partial<NoteElement>);
    }
    setOpen(false);
  };

  return (
    <>
      <motion.button
        whileHover={{ y: -2 }}
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 glass-strong rounded-full px-4 py-2 border border-border/60 shadow-floating text-xs hover:bg-foreground/[0.04]"
      >
        <Sparkles className="size-3.5 text-violet-400" />
        <span>
          AI cluster · {clusters.length}{" "}
          {clusters.length === 1 ? "group" : "groups"} found
        </span>
        <Badge variant="cyan">Preview</Badge>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[81] w-[min(90vw,560px)] glass-strong border border-white/15 rounded-3xl shadow-floating p-5"
            >
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center text-white shadow-glow">
                  <Brain />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg font-semibold tracking-tight">
                    Nova AI · note clusters
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Notes grouped by shared themes. Apply to reorganize the board.
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="size-7 rounded-md grid place-items-center text-muted-foreground hover:bg-foreground/10"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-4 grid gap-2 max-h-[50vh] overflow-y-auto no-scrollbar">
                {clusters.map((c) => (
                  <div
                    key={c.topic}
                    className={`rounded-xl border border-white/10 bg-gradient-to-br ${c.color} p-3`}
                  >
                    <div className="text-[11px] uppercase tracking-wider opacity-80 mb-1">
                      {c.topic}
                    </div>
                    <ul className="space-y-1">
                      {c.noteIds.map((id) => {
                        const note = notes.find((n) => n.id === id);
                        if (!note) return null;
                        return (
                          <li key={id} className="text-sm leading-snug">
                            • {note.text.split("\n")[0] || "(empty note)"}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  Tip: undo (⌘Z) reverts the layout.
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="gradient" onClick={apply}>
                    <Check /> Apply layout
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
