"use client";

import * as React from "react";
import {
  ArrowUpRight,
  Circle,
  Eraser,
  Hand,
  Minus,
  MousePointer2,
  Pen,
  Redo2,
  Smile,
  Square,
  StickyNote as StickyIcon,
  Trash,
  Type,
  Undo2
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DRAW_TOOLS, useWhiteboardStore, type Tool } from "@/store/use-whiteboard-store";

interface ToolbarProps {
  /** Called when the user clicks the Icons tray button or presses "I". */
  onOpenIcons?: () => void;
}

const TOOLS: { id: Tool; icon: React.ReactNode; label: string; key?: string }[] = [
  { id: "select", icon: <MousePointer2 />, label: "Select", key: "V" },
  { id: "hand", icon: <Hand />, label: "Pan (hold space)", key: "H" },
  { id: "pen", icon: <Pen />, label: "Pen", key: "P" },
  { id: "line", icon: <Minus />, label: "Line", key: "L" },
  { id: "arrow", icon: <ArrowUpRight />, label: "Arrow", key: "A" },
  { id: "rect", icon: <Square />, label: "Rectangle", key: "R" },
  { id: "circle", icon: <Circle />, label: "Circle", key: "O" },
  { id: "eraser", icon: <Eraser />, label: "Eraser", key: "E" },
  { id: "text", icon: <Type />, label: "Text", key: "T" },
  { id: "note", icon: <StickyIcon />, label: "Sticky note", key: "N" }
];

const COLORS = [
  "#0F172A",
  "#FFFFFF",
  "#8B5CF6",
  "#EC4899",
  "#22D3EE",
  "#10B981",
  "#FBBF24",
  "#F97316"
];

export function WhiteboardToolbar({ onOpenIcons }: ToolbarProps = {}) {
  const tool = useWhiteboardStore((s) => s.tool);
  const setTool = useWhiteboardStore((s) => s.setTool);
  const color = useWhiteboardStore((s) => s.color);
  const setColor = useWhiteboardStore((s) => s.setColor);
  const strokeWidth = useWhiteboardStore((s) => s.strokeWidth);
  const setStrokeWidth = useWhiteboardStore((s) => s.setStrokeWidth);
  const undo = useWhiteboardStore((s) => s.undo);
  const redo = useWhiteboardStore((s) => s.redo);
  const clearBoard = useWhiteboardStore((s) => s.clearBoard);
  const pushHistory = useWhiteboardStore((s) => s.pushHistory);

  // Color popover — pops open automatically when the user switches to a
  // drawing tool so they're prompted for a color before they start drawing.
  const [colorOpen, setColorOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  /** Pick a tool. If it's a drawing tool, open the color picker right away. */
  const pickTool = (t: Tool) => {
    setTool(t);
    if (DRAW_TOOLS.includes(t)) setColorOpen(true);
    else setColorOpen(false);
  };

  // Close color popover when clicking outside.
  React.useEffect(() => {
    if (!colorOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current) return;
      if (e.target instanceof Node && rootRef.current.contains(e.target)) return;
      setColorOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [colorOpen]);

  // Keyboard shortcuts — V / P / E / R / O / T / N / H pick tools, Ctrl+Z / Ctrl+Y for history.
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      // "I" opens the Icons tray (icons aren't a drawing "tool", so it lives
      // outside TOOLS — but we keep the shortcut consistent with the rest.)
      if (e.key.toLowerCase() === "i" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        onOpenIcons?.();
        return;
      }
      const match = TOOLS.find((t) => t.key && t.key.toLowerCase() === e.key.toLowerCase());
      if (match) setTool(match.id);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [redo, setTool, undo, onOpenIcons]);

  return (
    <div
      ref={rootRef}
      className="relative flex items-center gap-1 glass-strong rounded-2xl px-2 py-1.5 border border-border/60 shadow-floating"
    >
      {TOOLS.map((t) => (
        <Tooltip key={t.id}>
          <TooltipTrigger asChild>
            <button
              onClick={() => pickTool(t.id)}
              className={cn(
                "size-9 grid place-items-center rounded-xl transition [&_svg]:size-4",
                tool === t.id
                  ? "bg-foreground text-background"
                  : "hover:bg-foreground/5 text-foreground/80 hover:text-foreground"
              )}
              aria-label={t.label}
            >
              {t.icon}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={10}>
            {t.label}
            {t.key && (
              <span className="ml-2 text-[10px] text-muted-foreground">{t.key}</span>
            )}
          </TooltipContent>
        </Tooltip>
      ))}

      {/* Icons tray — opens the searchable Iconify panel. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onOpenIcons?.()}
            className="size-9 grid place-items-center rounded-xl hover:bg-foreground/5 text-foreground/80 hover:text-foreground transition"
            aria-label="Icons"
          >
            <Smile className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={10}>
          Icons
          <span className="ml-2 text-[10px] text-muted-foreground">I</span>
        </TooltipContent>
      </Tooltip>

      <div className="w-px h-6 bg-border/60 mx-1" />

      {/* Active color swatch — click to open the picker. Auto-opens when
          you select a drawing tool. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setColorOpen((v) => !v)}
            aria-label="Color"
            className={cn(
              "size-9 grid place-items-center rounded-xl transition",
              colorOpen ? "bg-foreground/10" : "hover:bg-foreground/5"
            )}
          >
            <span
              className="size-5 rounded-full ring-2 ring-white/20 shadow-inner"
              style={{ backgroundColor: color }}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={10}>Color</TooltipContent>
      </Tooltip>

      <div className="w-px h-6 bg-border/60 mx-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={undo}
            className="size-9 grid place-items-center rounded-xl hover:bg-foreground/5 transition"
            aria-label="Undo"
          >
            <Undo2 className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={10}>Undo · ⌘Z</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={redo}
            className="size-9 grid place-items-center rounded-xl hover:bg-foreground/5 transition"
            aria-label="Redo"
          >
            <Redo2 className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={10}>Redo · ⇧⌘Z</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => {
              pushHistory();
              clearBoard();
            }}
            className="size-9 grid place-items-center rounded-xl hover:bg-rose-500/15 text-rose-300 transition"
            aria-label="Clear board"
          >
            <Trash className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={10}>Clear board</TooltipContent>
      </Tooltip>

      {colorOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 glass-strong rounded-2xl border border-border/60 shadow-floating p-3 w-[280px] z-10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Pick a color
            </p>
            <span className="text-[10px] text-muted-foreground font-mono">
              {color.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-8 gap-1.5 mb-3">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  setColorOpen(false);
                }}
                aria-label={`Color ${c}`}
                className={cn(
                  "size-7 rounded-full border transition",
                  color === c
                    ? "border-cyan-400 ring-2 ring-cyan-400/40 scale-110"
                    : "border-white/15 hover:border-white/40 hover:scale-110"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Stroke
            </span>
            <input
              type="range"
              min={1}
              max={20}
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseInt(e.target.value, 10))}
              className="flex-1 accent-cyan-400"
            />
            <span className="text-[11px] text-muted-foreground tabular-nums w-6 text-right">
              {strokeWidth}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
