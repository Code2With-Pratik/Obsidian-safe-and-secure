"use client";

import * as React from "react";
import {
  NOTE_FONTS,
  useWhiteboardStore,
  type Element,
  type NoteElement
} from "@/store/use-whiteboard-store";
import { StickyNote } from "./sticky-note";
import { cn } from "@/lib/utils";

/**
 * The drawing surface. Renders a dot grid + an SVG canvas with camera-space
 * elements (paths, shapes, text). Sticky notes are rendered as HTML
 * children on top of the SVG using the same transform — they need editable
 * DOM and pointer interactions that work better as real elements.
 */
export function BoardCanvas() {
  const board = useWhiteboardStore((s) => s.activeBoard());
  const tool = useWhiteboardStore((s) => s.tool);
  const color = useWhiteboardStore((s) => s.color);
  const strokeWidth = useWhiteboardStore((s) => s.strokeWidth);
  const setCamera = useWhiteboardStore((s) => s.setCamera);
  const panBy = useWhiteboardStore((s) => s.panBy);
  const zoomAt = useWhiteboardStore((s) => s.zoomAt);
  const addElement = useWhiteboardStore((s) => s.addElement);
  const removeElement = useWhiteboardStore((s) => s.removeElement);
  const pushHistory = useWhiteboardStore((s) => s.pushHistory);
  const setTool = useWhiteboardStore((s) => s.setTool);

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Local drawing state lives outside the store so the per-frame pointermove
  // doesn't thrash zustand or trigger expensive re-renders elsewhere.
  const [draft, setDraft] = React.useState<Element | null>(null);
  // Spacebar-as-temporary-hand-tool: hold space to pan even when Pen is active.
  const spaceHeldRef = React.useRef(false);
  const drawingRef = React.useRef<{
    startScreenX: number;
    startScreenY: number;
    startCanvasX: number;
    startCanvasY: number;
    cameraAtStart: { x: number; y: number };
    pointerId: number;
  } | null>(null);

  /* ----------- camera transforms ----------- */

  const camera = board?.camera ?? { x: 0, y: 0, zoom: 1 };

  /** Convert client (screen) coordinates to canvas-space coordinates. */
  const toCanvas = React.useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const x = (clientX - rect.left - camera.x) / camera.zoom;
      const y = (clientY - rect.top - camera.y) / camera.zoom;
      return { x, y };
    },
    [camera.x, camera.y, camera.zoom]
  );

  /* ----------- wheel: zoom on ctrl/cmd, pan otherwise ----------- */

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const ox = e.clientX - rect.left;
      const oy = e.clientY - rect.top;
      if (e.ctrlKey || e.metaKey) {
        zoomAt(-e.deltaY * 0.002, ox, oy);
      } else {
        panBy(-e.deltaX, -e.deltaY);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [panBy, zoomAt]);

  /* ----------- keyboard: space = temporary hand tool ----------- */

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " && !spaceHeldRef.current) {
        spaceHeldRef.current = true;
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === " ") spaceHeldRef.current = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  /* ----------- pointer handlers ----------- */

  const isPanning = (e: React.PointerEvent) => {
    if (tool === "hand") return true;
    if (spaceHeldRef.current) return true;
    // Middle mouse always pans.
    if (e.button === 1) return true;
    return false;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!board) return;
    // Don't hijack pointer events that originate on sticky notes / text inputs.
    const target = e.target as HTMLElement;
    if (target.closest("[data-note-handle]") || target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
      return;
    }
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    const { x, y } = toCanvas(e.clientX, e.clientY);

    drawingRef.current = {
      startScreenX: e.clientX,
      startScreenY: e.clientY,
      startCanvasX: x,
      startCanvasY: y,
      cameraAtStart: { x: camera.x, y: camera.y },
      pointerId: e.pointerId
    };

    if (isPanning(e)) {
      return;
    }

    if (tool === "pen") {
      setDraft({
        id: `draft`,
        kind: "path",
        x,
        y,
        points: [x, y],
        color,
        width: strokeWidth
      });
      return;
    }

    if (tool === "eraser") {
      eraseAt(x, y);
      return;
    }

    if (tool === "rect" || tool === "circle") {
      setDraft({
        id: "draft",
        kind: tool,
        x,
        y,
        w: 0,
        h: 0,
        color,
        width: strokeWidth
      });
      return;
    }

    if (tool === "text") {
      pushHistory();
      addElement({
        id: `text-${Date.now()}`,
        kind: "text",
        x,
        y,
        w: 160,
        h: 24,
        text: "Type here",
        color
      });
      // Auto-switch back to select so the user can drag/edit the new label.
      setTool("select");
      return;
    }

    if (tool === "note") {
      pushHistory();
      const id = `note-${Date.now()}`;
      addElement({
        id,
        kind: "note",
        x: x - 100,
        y: y - 80,
        w: 200,
        h: 160,
        rot: (Math.random() - 0.5) * 6,
        color: NOTE_COLOR_CLASSES[Math.floor(Math.random() * NOTE_COLOR_CLASSES.length)],
        text: ""
      } as NoteElement);
      setTool("select");
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const ref = drawingRef.current;
    if (!ref) return;

    if (isPanning(e)) {
      setCamera({
        x: ref.cameraAtStart.x + (e.clientX - ref.startScreenX),
        y: ref.cameraAtStart.y + (e.clientY - ref.startScreenY)
      });
      return;
    }

    if (tool === "pen" && draft && draft.kind === "path") {
      const { x, y } = toCanvas(e.clientX, e.clientY);
      setDraft({ ...draft, points: [...draft.points, x, y] });
      return;
    }

    if (tool === "eraser") {
      const { x, y } = toCanvas(e.clientX, e.clientY);
      eraseAt(x, y);
      return;
    }

    if ((tool === "rect" || tool === "circle") && draft && (draft.kind === "rect" || draft.kind === "circle")) {
      const { x, y } = toCanvas(e.clientX, e.clientY);
      const left = Math.min(ref.startCanvasX, x);
      const top = Math.min(ref.startCanvasY, y);
      const w = Math.abs(x - ref.startCanvasX);
      const h = Math.abs(y - ref.startCanvasY);
      setDraft({ ...draft, x: left, y: top, w, h });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const ref = drawingRef.current;
    drawingRef.current = null;
    if (!ref) return;

    if (draft) {
      // Commit the draft as a real element with a fresh id, then push to history.
      if (draft.kind === "path" && draft.points.length >= 4) {
        pushHistory();
        addElement({ ...draft, id: `path-${Date.now()}` });
      } else if ((draft.kind === "rect" || draft.kind === "circle") && draft.w > 4 && draft.h > 4) {
        pushHistory();
        addElement({ ...draft, id: `shape-${Date.now()}` });
      }
      setDraft(null);
    }
    void e;
  };

  /** Erase any element under (x,y). For paths we use a rough bbox check
   *  since precise path hit-testing would be overkill for the demo. */
  const eraseAt = React.useCallback(
    (x: number, y: number) => {
      const tol = 20;
      const els = board?.elements ?? [];
      for (let i = els.length - 1; i >= 0; i--) {
        const e = els[i];
        if (e.kind === "path") {
          for (let j = 0; j < e.points.length; j += 2) {
            const px = e.points[j];
            const py = e.points[j + 1];
            if (Math.abs(px - x) < tol && Math.abs(py - y) < tol) {
              pushHistory();
              removeElement(e.id);
              return;
            }
          }
        } else {
          const w = (e as { w?: number }).w ?? 0;
          const h = (e as { h?: number }).h ?? 0;
          if (x >= e.x && x <= e.x + w && y >= e.y && y <= e.y + h) {
            pushHistory();
            removeElement(e.id);
            return;
          }
        }
      }
    },
    [board?.elements, removeElement, pushHistory]
  );

  /* ----------- render ----------- */

  if (!board) return null;
  const transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`;
  // Move the grid with the camera so panning feels like the whole world moves.
  const gridBgPos = `${camera.x % (24 * camera.zoom)}px ${camera.y % (24 * camera.zoom)}px`;
  const gridSize = `${24 * camera.zoom}px ${24 * camera.zoom}px`;

  const cursorClass = isPanCursor(tool, spaceHeldRef.current)
    ? "cursor-grab active:cursor-grabbing"
    : tool === "pen"
      ? "cursor-crosshair"
      : tool === "eraser"
        ? "cursor-cell"
        : tool === "text" || tool === "note"
          ? "cursor-copy"
          : "cursor-default";

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn("relative w-full h-full overflow-hidden touch-none select-none", cursorClass)}
      style={{
        backgroundImage:
          "radial-gradient(hsl(var(--border) / 0.6) 1px, transparent 1px)",
        backgroundSize: gridSize,
        backgroundPosition: gridBgPos
      }}
    >
      {/* SVG layer for drawn paths and shapes */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" overflow="visible">
        <g style={{ transform, transformOrigin: "0 0" }}>
          {board.elements.map((el) => (
            <ElementSvg key={el.id} el={el} />
          ))}
          {draft && <ElementSvg el={draft} />}
        </g>
      </svg>

      {/* HTML layer: sticky notes + text labels — share the camera transform. */}
      <div
        className="absolute top-0 left-0 origin-top-left pointer-events-none"
        style={{ transform }}
      >
        {board.elements.map((el) => {
          if (el.kind === "note") {
            return <StickyNote key={el.id} note={el} />;
          }
          if (el.kind === "text") {
            return <TextLabel key={el.id} el={el} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}

function isPanCursor(tool: string, spaceHeld: boolean) {
  return tool === "hand" || spaceHeld;
}

const NOTE_COLOR_CLASSES = [
  "from-amber-300 to-amber-400",
  "from-pink-300 to-pink-400",
  "from-cyan-300 to-cyan-400",
  "from-violet-300 to-violet-400",
  "from-emerald-300 to-emerald-400",
  "from-rose-300 to-rose-400"
];

function ElementSvg({ el }: { el: Element }) {
  if (el.kind === "path") {
    if (el.points.length < 2) return null;
    let d = `M ${el.points[0]} ${el.points[1]}`;
    for (let i = 2; i < el.points.length; i += 2) {
      d += ` L ${el.points[i]} ${el.points[i + 1]}`;
    }
    return (
      <path
        d={d}
        fill="none"
        stroke={el.color}
        strokeWidth={el.width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  if (el.kind === "rect") {
    return (
      <rect
        x={el.x}
        y={el.y}
        width={el.w}
        height={el.h}
        fill="none"
        stroke={el.color}
        strokeWidth={el.width}
        rx={8}
      />
    );
  }
  if (el.kind === "circle") {
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    const rx = el.w / 2;
    const ry = el.h / 2;
    return (
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill="none"
        stroke={el.color}
        strokeWidth={el.width}
      />
    );
  }
  return null;
}

function TextLabel({ el }: { el: import("@/store/use-whiteboard-store").TextElement }) {
  const updateElement = useWhiteboardStore((s) => s.updateElement);
  const removeElement = useWhiteboardStore((s) => s.removeElement);
  const pushHistory = useWhiteboardStore((s) => s.pushHistory);
  const tool = useWhiteboardStore((s) => s.tool);
  const [editing, setEditing] = React.useState(false);
  const [showFont, setShowFont] = React.useState(false);
  const fontFamily = el.font ?? "var(--font-sans)";

  return (
    <div
      data-note-handle
      style={{ left: el.x, top: el.y, color: el.color, fontFamily }}
      onDoubleClick={() => setEditing(true)}
      className="absolute group pointer-events-auto px-2 py-1 rounded-md text-base hover:bg-foreground/5 transition cursor-text"
    >
      {editing ? (
        <input
          autoFocus
          defaultValue={el.text}
          onBlur={(e) => {
            const next = e.target.value.trim();
            pushHistory();
            if (next === "") removeElement(el.id);
            else updateElement(el.id, { text: next });
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setEditing(false);
          }}
          style={{ fontFamily }}
          className="bg-transparent outline-none border-b border-foreground/40"
        />
      ) : (
        <span style={{ color: el.color, fontFamily }}>{el.text}</span>
      )}
      {tool === "select" && !editing && (
        <div className="absolute -top-3 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={() => setShowFont((v) => !v)}
            className="size-5 rounded-full bg-slate-900/85 text-white text-[10px] grid place-items-center"
            aria-label="Change font"
          >
            T
          </button>
          <button
            onClick={() => {
              pushHistory();
              removeElement(el.id);
            }}
            className="size-5 rounded-full bg-rose-500 text-white grid place-items-center text-[12px]"
            aria-label="Delete text"
          >
            ×
          </button>
        </div>
      )}
      {showFont && (
        <div className="absolute top-full mt-1 left-0 flex gap-1 bg-slate-900/85 backdrop-blur rounded-lg p-1 z-10">
          {NOTE_FONTS.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                pushHistory();
                updateElement(el.id, { font: f.family });
                setShowFont(false);
              }}
              style={{ fontFamily: f.family }}
              className={cn(
                "h-6 px-1.5 rounded text-[11px] text-white",
                fontFamily === f.family ? "bg-white/20" : "hover:bg-white/10"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
