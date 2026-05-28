"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  Download,
  Link2,
  Loader2,
  Minus,
  Plus,
  Share2,
  Users
} from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { BoardCanvas } from "@/features/whiteboard/board-canvas";
import { WhiteboardToolbar } from "@/features/whiteboard/toolbar";
import { BoardsSidebar } from "@/features/whiteboard/boards-sidebar";
import { Minimap } from "@/features/whiteboard/minimap";
import { ShareDialog } from "@/features/whiteboard/share-dialog";
import { AccessPopover } from "@/features/whiteboard/access-popover";
import { SelectionToolbar } from "@/features/whiteboard/selection-toolbar";
import { IconPanel } from "@/features/whiteboard/icon-panel";
import { downloadBoardAsPng } from "@/features/whiteboard/export-png";
import { useWhiteboardStore } from "@/store/use-whiteboard-store";
import { users } from "@/lib/mock-data";
import { useT } from "@/lib/i18n";

const COLLAB_USERS = [
  { ...users[1], color: "#22D3EE" },
  { ...users[2], color: "#EC4899" },
  { ...users[3], color: "#A3E635" },
  { ...users[4], color: "#FBBF24" }
];

export default function WhiteboardPage() {
  const t = useT();
  // The whiteboard store is persisted in localStorage so its hydrated state
  // (camera, user-created boards, generated ids) is entirely client-side.
  // Rendering it on the server would produce HTML that diverges from the
  // post-hydration client tree. Gate the entire UI behind a mounted flag so
  // SSR ships a neutral placeholder and the real board renders once we're
  // running on the client.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const board = useWhiteboardStore((s) => s.activeBoard());
  const setCamera = useWhiteboardStore((s) => s.setCamera);

  const [collapsed, setCollapsed] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [iconPanelOpen, setIconPanelOpen] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);

  /** Snapshot the current board and trigger an HD PNG download. We close the
   *  dropdown via the spinner state so the menu doesn't disappear before the
   *  blob URL kicks the browser into download mode. */
  const handleDownload = React.useCallback(async () => {
    const current = useWhiteboardStore.getState().activeBoard();
    if (!current) return;
    setDownloading(true);
    try {
      await downloadBoardAsPng(current);
    } catch (err) {
      console.error("Failed to export board", err);
    } finally {
      setDownloading(false);
    }
  }, []);

  // Roving "ghost cursors" — pure visual effect so the board feels live.
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!mounted) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 60);
    return () => window.clearInterval(id);
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="h-[calc(100dvh-4rem)] grid place-items-center text-muted-foreground text-sm">
        {t("Loading whiteboard…")}
      </div>
    );
  }

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
            <WhiteboardToolbar onOpenIcons={() => setIconPanelOpen(true)} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto flex items-center gap-2"
          >
            <AccessPopover>
              <button
                className="hidden md:flex items-center gap-2 glass rounded-full px-3 py-1.5 border border-border/60 hover:bg-foreground/5 transition cursor-pointer pointer-events-auto"
                aria-label={t("Manage access")}
              >
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
                  {COLLAB_USERS.length} {t("editing")}
                </span>
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>
            </AccessPopover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="gradient" size="sm">
                  <Share2 /> {t("Share")} <ChevronDown className="size-3.5 opacity-80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="min-w-[220px]">
                <DropdownMenuLabel>{t("Share board")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setShareOpen(true)}>
                  <Link2 />
                  <div className="flex flex-col">
                    <span>{t("Share via link")}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {t("Copy a join link")}
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={downloading}
                  onSelect={(e) => {
                    e.preventDefault();
                    handleDownload();
                  }}
                >
                  {downloading ? <Loader2 className="animate-spin" /> : <Download />}
                  <div className="flex flex-col">
                    <span>{downloading ? t("Preparing…") : t("Download HD")}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {t("Full canvas, 2× PNG")}
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        </div>

        {/* Live "ghost cursors" — pure decoration, draw in screen space. */}
        <GhostCursors tick={tick} />

        {/* Bottom-center: selection bar only (shown when 2+ items selected). */}
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
          <SelectionToolbar />
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
              aria-label={t("Zoom out")}
            >
              <Minus className="size-3.5" />
            </button>
            <span className="text-[11px] font-mono tabular-nums w-10 text-center text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setCamera({ zoom: Math.min(4, zoom + 0.15) })}
              className="size-7 grid place-items-center rounded-full hover:bg-foreground/10 text-foreground/80 hover:text-foreground transition"
              aria-label={t("Zoom in")}
            >
              <Plus className="size-3.5" />
            </button>
            <button
              onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}
              className="text-[10px] font-medium px-2 h-7 rounded-full hover:bg-foreground/10 text-foreground/70 hover:text-foreground transition"
            >
              {t("Fit")}
            </button>
          </div>
        </div>
      </div>

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
      <IconPanel open={iconPanelOpen} onOpenChange={setIconPanelOpen} />
    </div>
  );
}

function BoardTitle() {
  const t = useT();
  const board = useWhiteboardStore((s) => s.activeBoard());
  if (!board) return null;
  return (
    <div className="glass rounded-full px-4 py-1.5 border border-border/60 inline-flex items-center gap-2 text-xs">
      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span className="font-semibold">{board.name}</span>
      <span className="text-muted-foreground">· {board.elements.length} {t("items")}</span>
    </div>
  );
}

/** Decorative animated cursors of other people. */
function GhostCursors({ tick }: { tick: number }) {
  const cursors = React.useMemo(
    () => [
      { name: "Kai", color: "#22D3EE", phase: 0 },
      { name: "Iris", color: "#EC4899", phase: 1.5 },
      { name: "Obsidian", color: "#A3E635", phase: 3.2 }
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
