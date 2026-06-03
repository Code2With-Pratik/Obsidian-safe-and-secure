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
import { useWhiteboardPresence } from "@/features/whiteboard/use-whiteboard-presence";
import { RemoteCursorsLayer } from "@/features/whiteboard/remote-cursors-layer";
import { useWhiteboardStore } from "@/store/use-whiteboard-store";
import { useT } from "@/lib/i18n";

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
  const fetchBoards = useWhiteboardStore((s) => s.fetchBoards);
  const loaded = useWhiteboardStore((s) => s.loaded);
  const saveActiveBoard = useWhiteboardStore((s) => s.saveActiveBoard);
  const myRole = useWhiteboardStore((s) => s.myRole());
  const subscribeMembership = useWhiteboardStore((s) => s.subscribeMembership);
  const teardownMembership = useWhiteboardStore((s) => s.teardownMembership);

  // First-mount: force-fetch boards (bypassing the in-memory `loaded`
  // cache, which would otherwise skip a re-visit and miss any boards
  // that were shared to me while this tab was on a different route)
  // AND open the membership realtime channel so live shares appear
  // within seconds. Tear the channel down on unmount so we don't leak
  // a subscription if the user navigates away.
  React.useEffect(() => {
    void fetchBoards(true);
    subscribeMembership();
    return () => {
      teardownMembership();
    };
    // Deliberately empty deps — this effect must run exactly once per
    // mount of the whiteboard page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time presence — every collaborator's cursor on this board.
  const { cursors, publish } = useWhiteboardPresence(board?.id ?? null);

  // Listen for pointer moves over the viewport and push our cursor
  // position into the presence channel. Coordinates are converted into
  // board-space so peers' renders track pan + zoom on their end.
  //
  // Effect deps are deliberately MINIMAL — re-attaching the listener
  // every time camera.x/y/zoom flips (i.e. on every pan tick) thrashes
  // the DOM. Instead we read the live camera from the store inside the
  // handler. Capture-phase listener so an in-canvas overlay can't
  // swallow the event before our publish fires.
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const active = useWhiteboardStore.getState().activeBoard();
      if (!active) return;
      const rect = el.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const x = (screenX - active.camera.x) / active.camera.zoom;
      const y = (screenY - active.camera.y) / active.camera.zoom;
      publish(x, y);
    };
    el.addEventListener("pointermove", onMove, { capture: true });
    return () =>
      el.removeEventListener("pointermove", onMove, { capture: true });
  }, [publish]);

  // Auto-save: every time the elements array reference changes, debounce
  // a write to the server. The store's saveActiveBoard handles the
  // throttling itself (~600ms coalesce). Skip the FIRST fire after
  // `loaded` flips true — at that point the elementsRef is the
  // freshly-fetched server array, and POSTing it back would race the
  // legitimate server state with a no-op write (or worse, clobber it
  // with stale local edits made before the fetch resolved).
  const elementsRef = board?.elements;
  const firstSaveSkipRef = React.useRef(false);
  React.useEffect(() => {
    if (!loaded) return;
    if (!firstSaveSkipRef.current) {
      firstSaveSkipRef.current = true;
      return;
    }
    saveActiveBoard();
  }, [elementsRef, saveActiveBoard, loaded]);

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
        ref={viewportRef}
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
                  {cursors.slice(0, 4).map((c) => (
                    <Avatar
                      key={c.userId}
                      className="size-6 ring-2 ring-background"
                      style={{ boxShadow: `0 0 0 1px ${c.color}` }}
                    >
                      <AvatarImage src={c.avatar ?? undefined} />
                    </Avatar>
                  ))}
                  {cursors.length === 0 && (
                    <span className="size-6 rounded-full bg-foreground/10 ring-2 ring-background" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {cursors.length === 0
                    ? t("only you")
                    : `${cursors.length} ${t("editing")}`}
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

        {/* Real-time peer cursors — colored Figma-style pointers with name
            pills, positioned in board space so they track pan/zoom. */}
        <RemoteCursorsLayer cursors={cursors} />

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

