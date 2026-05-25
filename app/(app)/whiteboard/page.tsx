"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Brain, Maximize2, Minimize2, Share2, Users } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BoardCanvas } from "@/features/whiteboard/board-canvas";
import { WhiteboardToolbar } from "@/features/whiteboard/toolbar";
import { BoardsSidebar } from "@/features/whiteboard/boards-sidebar";
import { Minimap } from "@/features/whiteboard/minimap";
import { ShareDialog } from "@/features/whiteboard/share-dialog";
import { AiClusterBar } from "@/features/whiteboard/ai-cluster";
import { useWhiteboardStore } from "@/store/use-whiteboard-store";
import { users } from "@/lib/mock-data";

const COLLAB_USERS = [
  { ...users[1], color: "#22D3EE" },
  { ...users[2], color: "#EC4899" },
  { ...users[3], color: "#A3E635" },
  { ...users[4], color: "#FBBF24" }
];

export default function WhiteboardPage() {
  const board = useWhiteboardStore((s) => s.activeBoard());
  const setCamera = useWhiteboardStore((s) => s.setCamera);

  const [collapsed, setCollapsed] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);

  // Roving "ghost cursors" — pure visual effect so the board feels live.
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60);
    return () => window.clearInterval(id);
  }, []);

  if (!board) return null;

  const zoom = board.camera.zoom;

  return (
    <div className="h-[calc(100dvh-4rem)] flex overflow-hidden">
      <BoardsSidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
      />

      <div
        data-board-viewport
        className="relative flex-1 min-w-0 overflow-hidden"
      >
        {/* Drawing surface — fills the viewport. */}
        <BoardCanvas />

        {/* Top: floating toolbar (center) + presence/actions (right). */}
        <div className="pointer-events-none absolute top-0 inset-x-0 z-20 flex items-start justify-between gap-3 px-4 pt-4">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto"
          >
            <BoardTitle />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto"
          >
            <WhiteboardToolbar />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto flex items-center gap-2"
          >
            <div className="hidden md:flex items-center gap-2 glass rounded-full px-3 py-1.5 border border-border/60">
              <Users className="size-3.5 text-muted-foreground" />
              <div className="flex -space-x-2">
                {COLLAB_USERS.map((u) => (
                  <Avatar
                    key={u.id}
                    className="size-6 ring-2 ring-background"
                    style={{ boxShadow: `0 0 0 1px ${u.color}` }}
                  >
                    <AvatarImage src={u.avatar} />
                  </Avatar>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {COLLAB_USERS.length} editing
              </span>
            </div>
            <Button variant="gradient" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 /> Share
            </Button>
          </motion.div>
        </div>

        {/* Live "ghost cursors" — pure decoration, draw in screen space. */}
        <GhostCursors tick={tick} />

        {/* Bottom-left: AI cluster banner + brainstorm */}
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          <div className="pointer-events-auto flex items-center gap-2">
            <AiClusterBar />
            <Button
              variant="glass"
              size="sm"
              onClick={() => useWhiteboardStore.getState().setTool("note")}
              className="hidden md:inline-flex"
            >
              <Brain /> Brainstorm
            </Button>
          </div>
        </div>

        {/* Bottom-right: minimap + zoom controls */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2 pointer-events-none">
          <div className="pointer-events-auto">
            <Minimap />
          </div>
          <div className="pointer-events-auto inline-flex items-center gap-1 glass-strong rounded-full border border-border/60 shadow-floating p-1">
            <button
              onClick={() => setCamera({ zoom: Math.max(0.25, zoom - 0.15) })}
              className="size-7 grid place-items-center rounded-full hover:bg-foreground/10 text-foreground/80 hover:text-foreground transition"
              aria-label="Zoom out"
            >
              <Minimize2 className="size-3.5" />
            </button>
            <span className="text-[11px] font-mono tabular-nums w-10 text-center text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setCamera({ zoom: Math.min(4, zoom + 0.15) })}
              className="size-7 grid place-items-center rounded-full hover:bg-foreground/10 text-foreground/80 hover:text-foreground transition"
              aria-label="Zoom in"
            >
              <Maximize2 className="size-3.5" />
            </button>
            <button
              onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}
              className="text-[10px] font-medium px-2 h-7 rounded-full hover:bg-foreground/10 text-foreground/70 hover:text-foreground transition"
            >
              Fit
            </button>
          </div>
        </div>
      </div>

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}

function BoardTitle() {
  const board = useWhiteboardStore((s) => s.activeBoard());
  if (!board) return null;
  return (
    <div className="glass rounded-full px-4 py-1.5 border border-border/60 inline-flex items-center gap-2 text-xs">
      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span className="font-semibold">{board.name}</span>
      <span className="text-muted-foreground">· {board.elements.length} items</span>
    </div>
  );
}

/** Decorative animated cursors of other people. */
function GhostCursors({ tick }: { tick: number }) {
  const cursors = React.useMemo(
    () => [
      { name: "Kai", color: "#22D3EE", phase: 0 },
      { name: "Iris", color: "#EC4899", phase: 1.5 },
      { name: "Nova", color: "#A3E635", phase: 3.2 }
    ],
    []
  );
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {cursors.map((c) => {
        // Smooth lissajous-style path so they float around indefinitely.
        const t = tick * 0.05 + c.phase;
        const x = 50 + Math.cos(t * 0.7) * 30;
        const y = 50 + Math.sin(t * 0.9) * 30;
        return (
          <div
            key={c.name}
            style={{ left: `${x}%`, top: `${y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill={c.color}>
              <path d="M4 1l13 8-6 1-3 6-4-15z" />
            </svg>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded text-white shadow"
              style={{ backgroundColor: c.color }}
            >
              {c.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
