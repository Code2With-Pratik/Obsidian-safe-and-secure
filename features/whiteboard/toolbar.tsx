"use client";

import * as React from "react";
import {
  Circle,
  Eraser,
  Hand,
  MousePointer2,
  Pen,
  Redo2,
  Square,
  StickyNote as StickyIcon,
  Trash,
  Type,
  Undo2
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useWhiteboardStore, type Tool } from "@/store/use-whiteboard-store";

const TOOLS: { id: Tool; icon: React.ReactNode; label: string; key?: string }[] = [
  { id: "select", icon: <MousePointer2 />, label: "Select", key: "V" },
  { id: "hand", icon: <Hand />, label: "Pan (hold space)", key: "H" },
  { id: "pen", icon: <Pen />, label: "Pen", key: "P" },
  { id: "eraser", icon: <Eraser />, label: "Eraser", key: "E" },
  { id: "rect", icon: <Square />, label: "Rectangle", key: "R" },
  { id: "circle", icon: <Circle />, label: "Circle", key: "O" },
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

export function WhiteboardToolbar() {
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
      const match = TOOLS.find((t) => t.key && t.key.toLowerCase() === e.key.toLowerCase());
      if (match) setTool(match.id);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [redo, setTool, undo]);

  return (
    <div className="flex items-center gap-1 glass-strong rounded-2xl px-2 py-1.5 border border-border/60 shadow-floating">
      {TOOLS.map((t) => (
        <Tooltip key={t.id}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setTool(t.id)}
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
          <TooltipContent>
            {t.label}
            {t.key && (
              <span className="ml-2 text-[10px] text-muted-foreground">{t.key}</span>
            )}
          </TooltipContent>
        </Tooltip>
      ))}

      <div className="w-px h-6 bg-border/60 mx-1" />

      {/* Color picker */}
      <div className="hidden md:flex items-center gap-0.5 px-1">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            aria-label={`Color ${c}`}
            className={cn(
              "size-5 rounded-full border transition",
              color === c
                ? "border-cyan-400 ring-2 ring-cyan-400/40"
                : "border-white/15 hover:border-white/40"
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* Stroke width */}
      <div className="hidden md:flex items-center gap-2 pl-2 pr-3">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Size</span>
        <input
          type="range"
          min={1}
          max={20}
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(parseInt(e.target.value, 10))}
          className="w-20 accent-cyan-400"
        />
        <span className="text-[11px] text-muted-foreground tabular-nums w-6 text-right">
          {strokeWidth}
        </span>
      </div>

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
        <TooltipContent>Undo · ⌘Z</TooltipContent>
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
        <TooltipContent>Redo · ⇧⌘Z</TooltipContent>
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
        <TooltipContent>Clear board</TooltipContent>
      </Tooltip>
    </div>
  );
}
