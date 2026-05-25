"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Palette, Trash2, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NOTE_COLORS,
  NOTE_FONTS,
  useWhiteboardStore,
  type NoteElement
} from "@/store/use-whiteboard-store";

/**
 * A draggable HTML sticky note positioned in canvas-space. The parent layer
 * carries the camera transform, so we just position via `left/top` in
 * canvas coordinates and update those values on drag.
 */
export function StickyNote({ note }: { note: NoteElement }) {
  const updateElement = useWhiteboardStore((s) => s.updateElement);
  const removeElement = useWhiteboardStore((s) => s.removeElement);
  const pushHistory = useWhiteboardStore((s) => s.pushHistory);
  const camera = useWhiteboardStore((s) => s.activeBoard()?.camera);
  const tool = useWhiteboardStore((s) => s.tool);

  const [editing, setEditing] = React.useState(note.text === "");
  const [showColor, setShowColor] = React.useState(false);
  const [showFont, setShowFont] = React.useState(false);
  const fontFamily = note.font ?? NOTE_FONTS[0].family;

  const dragRef = React.useRef<{
    startClientX: number;
    startClientY: number;
    startElX: number;
    startElY: number;
    pushed: boolean;
  } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("textarea, button")) return;
    if (tool !== "select") return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startElX: note.x,
      startElY: note.y,
      pushed: false
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const ref = dragRef.current;
    if (!ref) return;
    const zoom = camera?.zoom ?? 1;
    const dx = (e.clientX - ref.startClientX) / zoom;
    const dy = (e.clientY - ref.startClientY) / zoom;
    if (!ref.pushed && Math.hypot(dx, dy) > 2) {
      pushHistory();
      ref.pushed = true;
    }
    updateElement(note.id, { x: ref.startElX + dx, y: ref.startElY + dy });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <motion.div
      data-note-handle
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1, rotate: note.rot }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      style={{
        left: note.x,
        top: note.y,
        width: note.w,
        height: note.h
      }}
      className={cn(
        "absolute pointer-events-auto rounded-2xl p-4 shadow-floating text-slate-900",
        "bg-gradient-to-br",
        note.color,
        tool === "select" ? "cursor-grab active:cursor-grabbing" : "cursor-default"
      )}
    >
      {editing ? (
        <textarea
          autoFocus
          defaultValue={note.text}
          onBlur={(e) => {
            pushHistory();
            updateElement(note.id, { text: e.target.value });
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") (e.currentTarget as HTMLTextAreaElement).blur();
          }}
          style={{ fontFamily }}
          className="w-full h-full bg-transparent outline-none resize-none text-base leading-snug text-slate-900 placeholder:text-slate-700/60"
          placeholder="Type your thought…"
        />
      ) : (
        <p
          onDoubleClick={() => setEditing(true)}
          style={{ fontFamily }}
          className="text-base leading-snug whitespace-pre-wrap break-words h-full overflow-hidden"
        >
          {note.text || "Double-click to edit"}
        </p>
      )}

      {/* corner controls — show on hover via group/parent */}
      <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 hover:opacity-100 focus-within:opacity-100 transition pointer-events-auto">
        <button
          onClick={() => {
            setShowFont((v) => !v);
            setShowColor(false);
          }}
          className="size-6 rounded-full bg-slate-900/80 text-white grid place-items-center shadow-glow hover:bg-slate-900"
          aria-label="Change font"
        >
          <Type className="size-3" />
        </button>
        <button
          onClick={() => {
            setShowColor((v) => !v);
            setShowFont(false);
          }}
          className="size-6 rounded-full bg-slate-900/80 text-white grid place-items-center shadow-glow hover:bg-slate-900"
          aria-label="Change color"
        >
          <Palette className="size-3" />
        </button>
        <button
          onClick={() => {
            pushHistory();
            removeElement(note.id);
          }}
          className="size-6 rounded-full bg-rose-500 text-white grid place-items-center shadow-glow hover:bg-rose-400"
          aria-label="Delete note"
        >
          <Trash2 className="size-3" />
        </button>
      </div>

      {showFont && (
        <div className="absolute -bottom-2 left-2 flex gap-1 bg-slate-900/85 backdrop-blur rounded-xl p-1 z-10 pointer-events-auto">
          {NOTE_FONTS.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                pushHistory();
                updateElement(note.id, { font: f.family });
                setShowFont(false);
              }}
              style={{ fontFamily: f.family }}
              className={cn(
                "h-7 px-2 rounded-md text-[12px] text-white transition",
                fontFamily === f.family ? "bg-white/20 ring-1 ring-white/40" : "hover:bg-white/10"
              )}
              title={f.label}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {showColor && (
        <div className="absolute -bottom-2 left-2 flex gap-1 bg-slate-900/85 backdrop-blur rounded-full p-1 z-10">
          {NOTE_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                pushHistory();
                updateElement(note.id, { color: c });
                setShowColor(false);
              }}
              className={cn(
                "size-4 rounded-full bg-gradient-to-br ring-2",
                c,
                c === note.color ? "ring-white" : "ring-transparent"
              )}
              aria-label="Note color"
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
