"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Palette, Trash2, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FONT_SIZES,
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
  const translateElements = useWhiteboardStore((s) => s.translateElements);
  const pushHistory = useWhiteboardStore((s) => s.pushHistory);
  const camera = useWhiteboardStore((s) => s.activeBoard()?.camera);
  const tool = useWhiteboardStore((s) => s.tool);
  const selection = useWhiteboardStore((s) => s.selection);
  const setSelection = useWhiteboardStore((s) => s.setSelection);
  const toggleSelected = useWhiteboardStore((s) => s.toggleSelected);
  const expandToGroups = useWhiteboardStore((s) => s.expandToGroups);
  const isSelected = selection.includes(note.id);

  const [editing, setEditing] = React.useState(note.text === "");
  const [showColor, setShowColor] = React.useState(false);
  const [showFont, setShowFont] = React.useState(false);
  const [showSize, setShowSize] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const fontFamily = note.font ?? NOTE_FONTS[0].family;
  const fontSize = note.fontSize ?? 16;

  /** Defer hiding the chrome row by ~180ms so the cursor can move across
   *  the gap to the font/size/color/delete chips without flickering. */
  const hoverHideTimer = React.useRef<number | null>(null);
  const setHoverDeferred = (v: boolean) => {
    if (hoverHideTimer.current !== null) {
      window.clearTimeout(hoverHideTimer.current);
      hoverHideTimer.current = null;
    }
    if (v) {
      setHovered(true);
    } else {
      hoverHideTimer.current = window.setTimeout(() => {
        setHovered(false);
        hoverHideTimer.current = null;
      }, 180);
    }
  };
  React.useEffect(() => {
    return () => {
      if (hoverHideTimer.current !== null) window.clearTimeout(hoverHideTimer.current);
    };
  }, []);

  /** Keep chrome alive while editing or with a popover open. */
  const chromeActive = hovered || editing || showFont || showSize || showColor;

  /** Close any open popover when the user clicks anywhere outside this note. */
  const noteRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!showFont && !showSize && !showColor) return;
    const onDown = (e: PointerEvent) => {
      if (!noteRef.current) return;
      if (e.target instanceof Node && noteRef.current.contains(e.target)) return;
      setShowFont(false);
      setShowSize(false);
      setShowColor(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [showFont, showSize, showColor]);

  /** Drag bookkeeping. `dragIds` is the set of elements that move together
   *  (this note + any selected/grouped peers). `appliedDx/Dy` lets us emit
   *  *incremental* deltas to `translateElements`, so the cumulative motion
   *  matches the cursor exactly without snapshotting per-id start positions. */
  const dragRef = React.useRef<{
    startClientX: number;
    startClientY: number;
    dragIds: string[];
    appliedDx: number;
    appliedDy: number;
    pushed: boolean;
  } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("textarea, button")) return;
    if (tool !== "select") return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    // Selection bookkeeping. Shift toggles, plain click on an unselected note
    // replaces the selection; clicking an already-selected note keeps the
    // multi-selection so the user can drag the whole group.
    let dragIds: string[];
    if (e.shiftKey) {
      toggleSelected(note.id);
      const next = isSelected
        ? selection.filter((id) => id !== note.id)
        : [...selection, note.id];
      dragIds = expandToGroups(next);
    } else if (isSelected) {
      dragIds = expandToGroups(selection);
    } else {
      setSelection([note.id]);
      dragIds = expandToGroups([note.id]);
    }

    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      dragIds,
      appliedDx: 0,
      appliedDy: 0,
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
    const stepX = dx - ref.appliedDx;
    const stepY = dy - ref.appliedDy;
    if (stepX !== 0 || stepY !== 0) {
      translateElements(ref.dragIds, stepX, stepY);
      ref.appliedDx = dx;
      ref.appliedDy = dy;
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <motion.div
      ref={noteRef}
      data-note-handle
      data-note-id={note.id}
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
      onMouseEnter={() => setHoverDeferred(true)}
      onMouseLeave={() => setHoverDeferred(false)}
      className={cn(
        "absolute pointer-events-auto rounded-2xl p-4 shadow-floating text-slate-900",
        "bg-gradient-to-br",
        note.color,
        tool === "select" ? "cursor-grab active:cursor-grabbing" : "cursor-default",
        // Selection halo + a faint group hint when this note is grouped with
        // others — the ring colour shifts to violet for grouped peers.
        isSelected &&
          (note.groupId
            ? "ring-2 ring-violet-400/95 ring-offset-2 ring-offset-transparent"
            : "ring-2 ring-cyan-400/95 ring-offset-2 ring-offset-transparent")
      )}
    >
      {/* Connection anchor — small circle on the right edge. Drag it to
          another note to wire them up with a Figma-style bezier curve.
          Visible whenever the chrome is active (hover / edit / popover),
          so it shares the same UX as the action chips above. */}
      {tool === "select" && (
        <button
          aria-label="Drag to connect"
          title="Drag to another note to connect"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            window.dispatchEvent(
              new CustomEvent("nova-wb-conn-start", {
                detail: {
                  noteId: note.id,
                  clientX: e.clientX,
                  clientY: e.clientY
                }
              })
            );
          }}
          className={cn(
            "absolute -right-2.5 top-1/2 -translate-y-1/2 size-5 rounded-full bg-cyan-400 ring-2 ring-white shadow-glow-cyan hover:scale-125 transition pointer-events-auto cursor-crosshair z-30",
            chromeActive ? "opacity-100" : "opacity-0"
          )}
        />
      )}
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
          style={{ fontFamily, fontSize }}
          className="w-full h-full bg-transparent outline-none resize-none leading-snug text-slate-900 placeholder:text-slate-700/60"
          placeholder="Type your thought…"
        />
      ) : (
        <p
          onDoubleClick={() => setEditing(true)}
          style={{ fontFamily, fontSize }}
          className="leading-snug whitespace-pre-wrap break-words h-full overflow-hidden"
        >
          {note.text || "Double-click to edit"}
        </p>
      )}

      {/* Invisible bridge between the chrome row and the note's top edge —
          keeps the hover state alive while the cursor crosses the gap. */}
      {chromeActive && (
        <div
          aria-hidden
          className="absolute -top-12 left-0 right-0 h-12 pointer-events-auto"
          onMouseEnter={() => setHoverDeferred(true)}
        />
      )}

      {/* Chrome row — sits above the note so it doesn't fight with the
          content. Bigger pill buttons with real icons. Stays open while
          editing or with a popover open. */}
      <div
        onMouseEnter={() => setHoverDeferred(true)}
        onMouseLeave={() => setHoverDeferred(false)}
        className={cn(
          "absolute -top-12 left-0 right-0 flex justify-end gap-1.5 transition pointer-events-auto z-20",
          chromeActive ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <button
          onClick={() => {
            setShowSize((v) => !v);
            setShowFont(false);
            setShowColor(false);
          }}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-slate-900/90 text-white text-xs font-medium shadow-floating border border-white/10 hover:bg-slate-900 transition tabular-nums"
          aria-label="Font size"
        >
          <Type className="size-3.5" /> {fontSize}
        </button>
        <button
          onClick={() => {
            setShowFont((v) => !v);
            setShowColor(false);
            setShowSize(false);
          }}
          style={{ fontFamily }}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-slate-900/90 text-white text-xs font-medium shadow-floating border border-white/10 hover:bg-slate-900 transition"
          aria-label="Change font"
        >
          Aa
        </button>
        <button
          onClick={() => {
            setShowColor((v) => !v);
            setShowFont(false);
            setShowSize(false);
          }}
          className="inline-flex items-center justify-center size-8 rounded-full bg-slate-900/90 text-white shadow-floating border border-white/10 hover:bg-slate-900 transition"
          aria-label="Change color"
        >
          <Palette className="size-4" />
        </button>
        <button
          onClick={() => {
            pushHistory();
            removeElement(note.id);
          }}
          className="inline-flex items-center justify-center size-8 rounded-full bg-rose-500 text-white shadow-floating hover:bg-rose-400 transition"
          aria-label="Delete note"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {showFont && (
        <div className="absolute -top-[5.5rem] left-0 flex flex-wrap gap-1.5 bg-slate-900/95 backdrop-blur rounded-2xl border border-white/10 shadow-floating p-2 z-30 max-w-[320px] pointer-events-auto"
          onMouseEnter={() => setHoverDeferred(true)}
          onMouseLeave={() => setHoverDeferred(false)}>
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
                "h-9 px-3 rounded-lg text-sm text-white transition",
                fontFamily === f.family ? "bg-white/20 ring-1 ring-white/40" : "hover:bg-white/10"
              )}
              title={f.label}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {showSize && (
        <div className="absolute -top-[5.5rem] right-0 flex gap-1 bg-slate-900/95 backdrop-blur rounded-2xl border border-white/10 shadow-floating p-2 z-30 pointer-events-auto">
          {FONT_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => {
                pushHistory();
                updateElement(note.id, { fontSize: s });
                setShowSize(false);
              }}
              className={cn(
                "h-9 min-w-[36px] px-2 rounded-lg text-xs font-semibold text-white tabular-nums transition",
                fontSize === s ? "bg-white/20 ring-1 ring-white/40" : "hover:bg-white/10"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {showColor && (
        <div className="absolute -top-[5.5rem] right-0 flex gap-1.5 bg-slate-900/95 backdrop-blur rounded-2xl border border-white/10 shadow-floating p-2 z-30 pointer-events-auto">
          {NOTE_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                pushHistory();
                updateElement(note.id, { color: c });
                setShowColor(false);
              }}
              className={cn(
                "size-7 rounded-full bg-gradient-to-br ring-2 transition",
                c,
                c === note.color ? "ring-white scale-110" : "ring-transparent hover:scale-110"
              )}
              aria-label="Note color"
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
