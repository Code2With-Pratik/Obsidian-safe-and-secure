"use client";

import * as React from "react";
import {
  FONT_SIZES,
  NOTE_FONTS,
  useWhiteboardStore,
  type Element,
  type IconElement,
  type NoteElement
} from "@/store/use-whiteboard-store";
import { StickyNote } from "./sticky-note";
import { cn } from "@/lib/utils";
import { Trash2, Type } from "lucide-react";
import { Icon } from "@iconify/react";

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
  const selection = useWhiteboardStore((s) => s.selection);
  const clearSelection = useWhiteboardStore((s) => s.clearSelection);
  const selectInRect = useWhiteboardStore((s) => s.selectInRect);

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Local drawing state lives outside the store so the per-frame pointermove
  // doesn't thrash zustand or trigger expensive re-renders elsewhere.
  const [draft, setDraft] = React.useState<Element | null>(null);
  // Box-select rect (canvas-space) while the user drags on empty board with
  // the select tool. Cleared on pointer up.
  const [boxSelect, setBoxSelect] = React.useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
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

  // We pull actions via `useWhiteboardStore.getState()` inside the handler
  // instead of subscribing to them at the top, so the dependency array stays
  // empty + stable. Hot-reloading new actions otherwise changed the dep array
  // size between renders, which React forbids.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore shortcuts while a text input/textarea has focus — the user is
      // typing in a sticky note or text label.
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "TEXTAREA" || tag === "INPUT";

      if (e.key === " " && !spaceHeldRef.current && !typing) {
        spaceHeldRef.current = true;
      }

      if (typing) return;

      const store = useWhiteboardStore.getState();

      // Ctrl/Cmd + G → group; with Shift → ungroup.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        store.pushHistory();
        if (e.shiftKey) store.ungroupSelection();
        else store.groupSelection();
        return;
      }

      // Ctrl/Cmd + C → copy the current selection (and its group peers).
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
        if (store.selection.length === 0) return;
        e.preventDefault();
        store.copySelection();
        return;
      }

      // Ctrl/Cmd + V → paste the clipboard with an incremental offset.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        store.pushHistory();
        store.pasteClipboard();
        return;
      }

      if (e.key === "Escape") {
        store.clearSelection();
        return;
      }

      // Delete/Backspace removes every selected element + its group peers.
      if ((e.key === "Delete" || e.key === "Backspace") && store.selection.length > 0) {
        e.preventDefault();
        store.pushHistory();
        store.removeSelection();
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

    if (tool === "line" || tool === "arrow") {
      setDraft({
        id: "draft",
        kind: "line",
        x,
        y,
        x2: x,
        y2: y,
        color,
        width: strokeWidth,
        arrow: tool === "arrow"
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
        // Sensible default box. The label has resize handles so the user
        // can stretch it; multi-line text wraps inside the box.
        w: 220,
        h: 80,
        text: "",
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
      return;
    }

    if (tool === "select") {
      // Clicked on empty canvas with the select tool — start a box-select.
      // Shift extends the existing selection; plain click resets it first.
      if (!e.shiftKey) clearSelection();
      setBoxSelect({ x, y, w: 0, h: 0 });
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

    if ((tool === "line" || tool === "arrow") && draft && draft.kind === "line") {
      const { x, y } = toCanvas(e.clientX, e.clientY);
      setDraft({ ...draft, x2: x, y2: y });
    }

    if (tool === "select" && boxSelect) {
      const { x, y } = toCanvas(e.clientX, e.clientY);
      const left = Math.min(ref.startCanvasX, x);
      const top = Math.min(ref.startCanvasY, y);
      const w = Math.abs(x - ref.startCanvasX);
      const h = Math.abs(y - ref.startCanvasY);
      setBoxSelect({ x: left, y: top, w, h });
      // Live-update selection so the rings light up as you drag the lasso.
      if (w > 2 || h > 2) {
        selectInRect({ x: left, y: top, w, h });
      }
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
      } else if (
        draft.kind === "line" &&
        Math.hypot(draft.x2 - draft.x, draft.y2 - draft.y) > 4
      ) {
        pushHistory();
        addElement({ ...draft, id: `line-${Date.now()}` });
      }
      setDraft(null);
    }
    // Drop the box-select rect; selection itself was already committed live.
    if (boxSelect) setBoxSelect(null);
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
        } else if (e.kind === "line") {
          // Hit-test against the line segment endpoints (approx).
          const dx = e.x2 - e.x;
          const dy = e.y2 - e.y;
          const len = Math.hypot(dx, dy);
          if (len === 0) continue;
          // Project (x,y) onto the segment and measure perpendicular distance.
          const t = Math.max(0, Math.min(1, ((x - e.x) * dx + (y - e.y) * dy) / (len * len)));
          const projX = e.x + t * dx;
          const projY = e.y + t * dy;
          if (Math.hypot(x - projX, y - projY) < tol) {
            pushHistory();
            removeElement(e.id);
            return;
          }
        } else if (e.kind === "connection") {
          // Skip — connections are anchored to notes; erase by deleting a note.
          continue;
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

  /* ----------- connection drag (note → note) ----------- */
  // When the user drags from a sticky note's anchor handle, we track the
  // partial connection as a temporary curve from the source note's center to
  // the current cursor — until they drop on another note (or cancel).
  const [connecting, setConnecting] = React.useState<{
    fromNoteId: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  } | null>(null);

  // Expose handlers via window for the StickyNote component (simpler than
  // threading callbacks through React context for a small set of events).
  React.useEffect(() => {
    const startHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { noteId: string; clientX: number; clientY: number }
        | undefined;
      if (!detail) return;
      const note = board?.elements.find(
        (n) => n.id === detail.noteId && n.kind === "note"
      ) as NoteElement | undefined;
      if (!note) return;
      const cx = note.x + note.w / 2;
      const cy = note.y + note.h / 2;
      const { x, y } = toCanvas(detail.clientX, detail.clientY);
      setConnecting({ fromNoteId: note.id, fromX: cx, fromY: cy, toX: x, toY: y });
    };
    window.addEventListener("nova-wb-conn-start", startHandler as EventListener);
    return () =>
      window.removeEventListener("nova-wb-conn-start", startHandler as EventListener);
  }, [board?.elements, toCanvas]);

  React.useEffect(() => {
    if (!connecting) return;
    const move = (e: PointerEvent) => {
      const { x, y } = toCanvas(e.clientX, e.clientY);
      setConnecting((c) => (c ? { ...c, toX: x, toY: y } : c));
    };
    const up = (e: PointerEvent) => {
      // Did the pointer come up over another note?
      const target = (e.target as HTMLElement)?.closest<HTMLElement>("[data-note-id]");
      const overNoteId = target?.dataset.noteId;
      if (connecting && overNoteId && overNoteId !== connecting.fromNoteId) {
        pushHistory();
        addElement({
          id: `conn-${Date.now()}`,
          kind: "connection",
          fromNoteId: connecting.fromNoteId,
          toNoteId: overNoteId,
          color,
          width: 2,
          arrow: true
        });
      }
      setConnecting(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [connecting, toCanvas, addElement, pushHistory, color]);

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
          {/* Render connections first so they sit BEHIND notes/text. */}
          {board.elements
            .filter((e): e is import("@/store/use-whiteboard-store").ConnectionElement => e.kind === "connection")
            .map((conn) => (
              <ConnectionSvg key={conn.id} conn={conn} elements={board.elements} />
            ))}
          {board.elements
            .filter((e) => e.kind !== "connection")
            .map((el) => {
              // Shapes / lines / paths get an interactive wrapper so the user
              // can click to select and drag to move. Notes / text / icons
              // have their own HTML-layer handlers below.
              if (
                el.kind === "rect" ||
                el.kind === "circle" ||
                el.kind === "line" ||
                el.kind === "path"
              ) {
                return <InteractiveShape key={el.id} el={el} />;
              }
              return <ElementSvg key={el.id} el={el} />;
            })}
          {draft && <ElementSvg el={draft} />}
          {/* Selection rings for SVG elements (paths/lines/shapes) — sticky
              notes / text / icons get their own DOM-based ring. */}
          {board.elements.map((el) => {
            if (!selection.includes(el.id)) return null;
            if (
              el.kind !== "rect" &&
              el.kind !== "circle" &&
              el.kind !== "line" &&
              el.kind !== "path"
            ) {
              return null;
            }
            return <SelectionRing key={`sel-${el.id}`} el={el} />;
          })}
          {connecting && (
            <BezierWire
              x1={connecting.fromX}
              y1={connecting.fromY}
              x2={connecting.toX}
              y2={connecting.toY}
              color={color}
              width={2}
              arrow
              dashed
            />
          )}
          {boxSelect && boxSelect.w > 0 && boxSelect.h > 0 && (
            <rect
              x={boxSelect.x}
              y={boxSelect.y}
              width={boxSelect.w}
              height={boxSelect.h}
              fill="rgba(34,211,238,0.08)"
              stroke="rgba(34,211,238,0.8)"
              strokeWidth={1 / camera.zoom}
              strokeDasharray={`${4 / camera.zoom} ${4 / camera.zoom}`}
              rx={4 / camera.zoom}
            />
          )}
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
          if (el.kind === "icon") {
            return <IconTile key={el.id} el={el} />;
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
  if (el.kind === "line") {
    return (
      <Arrowed
        x1={el.x}
        y1={el.y}
        x2={el.x2}
        y2={el.y2}
        color={el.color}
        width={el.width}
        arrow={!!el.arrow}
      />
    );
  }
  return null;
}

/** Straight line + optional arrow head at the end. */
function Arrowed({
  x1,
  y1,
  x2,
  y2,
  color,
  width,
  arrow
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
  arrow?: boolean;
}) {
  if (!arrow) {
    return (
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
    );
  }
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = Math.max(10, width * 3.5);
  const tipBackX = x2 - headLen * Math.cos(angle);
  const tipBackY = y2 - headLen * Math.sin(angle);
  const w = headLen * 0.55;
  const leftX = tipBackX + w * Math.cos(angle - Math.PI / 2);
  const leftY = tipBackY + w * Math.sin(angle - Math.PI / 2);
  const rightX = tipBackX + w * Math.cos(angle + Math.PI / 2);
  const rightY = tipBackY + w * Math.sin(angle + Math.PI / 2);
  return (
    <>
      <line
        x1={x1}
        y1={y1}
        x2={tipBackX}
        y2={tipBackY}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
      <polygon
        points={`${x2},${y2} ${leftX},${leftY} ${rightX},${rightY}`}
        fill={color}
      />
    </>
  );
}

/** Smooth horizontal bezier between two points — the Figma prototyping
 *  curve. Used both for the in-progress drag wire and committed connections. */
function BezierWire({
  x1,
  y1,
  x2,
  y2,
  color,
  width,
  arrow,
  dashed
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
  arrow?: boolean;
  dashed?: boolean;
}) {
  const dx = Math.abs(x2 - x1);
  // Bend by half the horizontal distance so the curve flows naturally even
  // when the notes are near each other.
  const bend = Math.max(50, dx / 2);
  const c1x = x1 + bend;
  const c1y = y1;
  const c2x = x2 - bend;
  const c2y = y2;
  const d = `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
  // Tangent at the end (last bezier segment) for the arrow head.
  const tx = x2 - c2x;
  const ty = y2 - c2y;
  const angle = Math.atan2(ty, tx);
  const headLen = Math.max(10, width * 4);
  const w = headLen * 0.6;
  const tipBackX = x2 - headLen * Math.cos(angle);
  const tipBackY = y2 - headLen * Math.sin(angle);
  const leftX = tipBackX + w * Math.cos(angle - Math.PI / 2);
  const leftY = tipBackY + w * Math.sin(angle - Math.PI / 2);
  const rightX = tipBackX + w * Math.cos(angle + Math.PI / 2);
  const rightY = tipBackY + w * Math.sin(angle + Math.PI / 2);
  return (
    <>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashed ? "6 6" : undefined}
      />
      {arrow && (
        <polygon
          points={`${x2},${y2} ${leftX},${leftY} ${rightX},${rightY}`}
          fill={color}
        />
      )}
    </>
  );
}

/** Render a committed connection: looks up the two notes' centers in the
 *  current element list and draws a bezier between them. Vanishes silently
 *  if either end has been deleted. */
function ConnectionSvg({
  conn,
  elements
}: {
  conn: import("@/store/use-whiteboard-store").ConnectionElement;
  elements: Element[];
}) {
  const a = elements.find((e) => e.id === conn.fromNoteId);
  const b = elements.find((e) => e.id === conn.toNoteId);
  if (!a || !b) return null;
  if (a.kind !== "note" || b.kind !== "note") return null;
  // Anchor on the right edge of the source and the left edge of the target
  // so the wires sweep horizontally — exactly like Figma prototype arrows.
  const x1 = a.x + a.w;
  const y1 = a.y + a.h / 2;
  const x2 = b.x;
  const y2 = b.y + b.h / 2;
  return (
    <BezierWire
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      color={conn.color}
      width={conn.width}
      arrow={conn.arrow}
    />
  );
}

/**
 * Draws a dashed cyan box around an SVG-rendered element to show it's part of
 * the current selection. We approximate paths/lines by their bounding box.
 */
function SelectionRing({ el }: { el: Element }) {
  if (el.kind === "rect" || el.kind === "circle") {
    return (
      <rect
        x={el.x - 4}
        y={el.y - 4}
        width={el.w + 8}
        height={el.h + 8}
        fill="none"
        stroke="rgba(34,211,238,0.95)"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        rx={el.kind === "circle" ? Math.min(el.w, el.h) / 2 + 4 : 10}
      />
    );
  }
  if (el.kind === "line") {
    const minX = Math.min(el.x, el.x2) - 4;
    const minY = Math.min(el.y, el.y2) - 4;
    const maxX = Math.max(el.x, el.x2) + 4;
    const maxY = Math.max(el.y, el.y2) + 4;
    return (
      <rect
        x={minX}
        y={minY}
        width={maxX - minX}
        height={maxY - minY}
        fill="none"
        stroke="rgba(34,211,238,0.95)"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        rx={6}
      />
    );
  }
  if (el.kind === "path") {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < el.points.length; i += 2) {
      if (el.points[i] < minX) minX = el.points[i];
      if (el.points[i + 1] < minY) minY = el.points[i + 1];
      if (el.points[i] > maxX) maxX = el.points[i];
      if (el.points[i + 1] > maxY) maxY = el.points[i + 1];
    }
    return (
      <rect
        x={minX - 4}
        y={minY - 4}
        width={maxX - minX + 8}
        height={maxY - minY + 8}
        fill="none"
        stroke="rgba(34,211,238,0.95)"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        rx={6}
      />
    );
  }
  return null;
}

/**
 * Wraps a rect / circle / line / path with pointer handlers so it can be
 * clicked to select, shift-clicked to add to a multi-select, and dragged
 * along with any group/selection peers. The SVG layer above sets
 * `pointer-events: none`; we re-enable pointer events here only while the
 * Select tool is active so other tools still draw freely through us.
 */
function InteractiveShape({
  el
}: {
  el: Element & { kind: "rect" | "circle" | "line" | "path" };
}) {
  const tool = useWhiteboardStore((s) => s.tool);
  const camera = useWhiteboardStore((s) => s.activeBoard()?.camera);
  const translateElements = useWhiteboardStore((s) => s.translateElements);
  const pushHistory = useWhiteboardStore((s) => s.pushHistory);
  const selection = useWhiteboardStore((s) => s.selection);
  const setSelection = useWhiteboardStore((s) => s.setSelection);
  const toggleSelected = useWhiteboardStore((s) => s.toggleSelected);
  const expandToGroups = useWhiteboardStore((s) => s.expandToGroups);

  const isSelected = selection.includes(el.id);

  const dragRef = React.useRef<{
    cx: number;
    cy: number;
    dragIds: string[];
    appliedDx: number;
    appliedDy: number;
    pushed: boolean;
  } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (tool !== "select") return;
    e.stopPropagation();
    (e.currentTarget as SVGGraphicsElement).setPointerCapture?.(e.pointerId);

    let dragIds: string[];
    if (e.shiftKey) {
      toggleSelected(el.id);
      const next = isSelected
        ? selection.filter((id) => id !== el.id)
        : [...selection, el.id];
      dragIds = expandToGroups(next);
    } else if (isSelected) {
      dragIds = expandToGroups(selection);
    } else {
      setSelection([el.id]);
      dragIds = expandToGroups([el.id]);
    }

    dragRef.current = {
      cx: e.clientX,
      cy: e.clientY,
      dragIds,
      appliedDx: 0,
      appliedDy: 0,
      pushed: false
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const zoom = camera?.zoom ?? 1;
    const dx = (e.clientX - d.cx) / zoom;
    const dy = (e.clientY - d.cy) / zoom;
    if (!d.pushed && Math.hypot(dx, dy) > 2) {
      pushHistory();
      d.pushed = true;
    }
    const stepX = dx - d.appliedDx;
    const stepY = dy - d.appliedDy;
    if (stepX !== 0 || stepY !== 0) {
      translateElements(d.dragIds, stepX, stepY);
      d.appliedDx = dx;
      d.appliedDy = dy;
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  // Only react to pointer events while the Select tool is active — otherwise
  // the user might be in the middle of drawing right through us.
  const interactive = tool === "select";
  const cursor = interactive ? "move" : "default";

  return (
    <g
      data-note-handle
      data-shape-id={el.id}
      style={{ pointerEvents: interactive ? "auto" : "none", cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Wider invisible hit area on top of the visual so thin strokes
          (1px lines) are still easy to click. */}
      <ShapeHitArea el={el} />
      <ElementSvg el={el} />
    </g>
  );
}

/** Transparent stroke/fill over the same geometry, scaled up for hit-testing. */
function ShapeHitArea({
  el
}: {
  el: Element & { kind: "rect" | "circle" | "line" | "path" };
}) {
  const HIT_STROKE = 14;
  if (el.kind === "rect") {
    return (
      <rect
        x={el.x}
        y={el.y}
        width={el.w}
        height={el.h}
        fill="transparent"
        stroke="transparent"
        strokeWidth={HIT_STROKE}
        pointerEvents="all"
      />
    );
  }
  if (el.kind === "circle") {
    return (
      <ellipse
        cx={el.x + el.w / 2}
        cy={el.y + el.h / 2}
        rx={el.w / 2}
        ry={el.h / 2}
        fill="transparent"
        stroke="transparent"
        strokeWidth={HIT_STROKE}
        pointerEvents="all"
      />
    );
  }
  if (el.kind === "line") {
    return (
      <line
        x1={el.x}
        y1={el.y}
        x2={el.x2}
        y2={el.y2}
        stroke="transparent"
        strokeWidth={HIT_STROKE}
        pointerEvents="stroke"
      />
    );
  }
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
        stroke="transparent"
        strokeWidth={HIT_STROKE}
        pointerEvents="stroke"
      />
    );
  }
  return null;
}

/**
 * Tiny wrapper around the textarea inside an editing TextLabel. We focus the
 * textarea via a ref on mount — `autoFocus` alone is unreliable when the
 * canvas has just grabbed pointer capture, so the new text box would mount
 * looking empty with no caret. Forcing focus on the next frame fixes it.
 */
function TextEditor({
  el,
  fontFamily,
  fontSize,
  onCommit
}: {
  el: import("@/store/use-whiteboard-store").TextElement;
  fontFamily: string;
  fontSize: number;
  onCommit: (next: string) => void;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useLayoutEffect(() => {
    const t = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      // Caret to the end so users can keep typing into an existing label.
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <textarea
      ref={ref}
      defaultValue={el.text}
      onBlur={(e) => onCommit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape") (e.target as HTMLTextAreaElement).blur();
      }}
      style={{ fontFamily, color: el.color, fontSize }}
      placeholder="Type here…"
      className="w-full h-full bg-transparent outline-none resize-none px-2 py-1 leading-snug placeholder:opacity-50"
    />
  );
}

/**
 * Resizable text box. Hovering shows a dashed cyan outline + 8 grab handles
 * (4 corners + 4 edges) — dragging any handle resizes the box; the text
 * wraps inside. Dragging the body moves the box.
 *
 * Pointer math is in canvas-space, so we divide every screen delta by the
 * current zoom to keep the resize feel correct at any zoom level.
 */
function TextLabel({ el }: { el: import("@/store/use-whiteboard-store").TextElement }) {
  const updateElement = useWhiteboardStore((s) => s.updateElement);
  const removeElement = useWhiteboardStore((s) => s.removeElement);
  const translateElements = useWhiteboardStore((s) => s.translateElements);
  const pushHistory = useWhiteboardStore((s) => s.pushHistory);
  const tool = useWhiteboardStore((s) => s.tool);
  const camera = useWhiteboardStore((s) => s.activeBoard()?.camera);
  const selection = useWhiteboardStore((s) => s.selection);
  const setSelection = useWhiteboardStore((s) => s.setSelection);
  const toggleSelected = useWhiteboardStore((s) => s.toggleSelected);
  const expandToGroups = useWhiteboardStore((s) => s.expandToGroups);
  const isSelected = selection.includes(el.id);
  const [editing, setEditing] = React.useState(el.text === "");
  const [showFont, setShowFont] = React.useState(false);
  const [showSize, setShowSize] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const fontFamily = el.font ?? "var(--font-sans)";
  const fontSize = el.fontSize ?? 16;

  /** The chrome row + popovers float above the text box with a small gap
   *  between them. Moving the cursor across that gap fires `mouseleave`
   *  briefly and would hide the chrome before the user could click. We
   *  defer the hide by ~150ms so movement between the box and its floating
   *  controls keeps the chrome visible. */
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

  /** Resize gesture state. `dir` tells us which handle is dragging so we
   *  know which edges to move. We push history once at start so the whole
   *  resize lives in one undo step. */
  const resizeRef = React.useRef<{
    dir: string;
    sx: number;
    sy: number;
    sw: number;
    sh: number;
    sex: number;
    sey: number;
  } | null>(null);

  /** Drag-to-move state — same idea as the StickyNote drag handler.
   *  `dragIds` carries every element that should move alongside this label
   *  (the current selection expanded to its group peers), and
   *  `appliedDx/Dy` makes the per-move update incremental. */
  const dragRef = React.useRef<{
    startCX: number;
    startCY: number;
    dragIds: string[];
    appliedDx: number;
    appliedDy: number;
    pushed: boolean;
  } | null>(null);

  // Keep the chrome visible while: hovering, editing the text, OR with a
  // font/size popover open (so the user can move into them without flicker).
  const showChrome =
    tool === "select" && (hovered || editing || showFont || showSize);

  /** Close any open popover when the user clicks anywhere outside this
   *  text label. */
  const containerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!showFont && !showSize) return;
    const onDown = (e: PointerEvent) => {
      if (!containerRef.current) return;
      if (e.target instanceof Node && containerRef.current.contains(e.target)) return;
      setShowFont(false);
      setShowSize(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [showFont, showSize]);

  const handleResizePointerDown = (dir: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    pushHistory();
    resizeRef.current = {
      dir,
      sx: e.clientX,
      sy: e.clientY,
      sw: el.w,
      sh: el.h,
      sex: el.x,
      sey: el.y
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = (e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (!r) return;
    const zoom = camera?.zoom ?? 1;
    const dx = (e.clientX - r.sx) / zoom;
    const dy = (e.clientY - r.sy) / zoom;
    const MIN_W = 60;
    const MIN_H = 28;
    const patch: Partial<import("@/store/use-whiteboard-store").TextElement> = {};
    if (r.dir.includes("e")) patch.w = Math.max(MIN_W, r.sw + dx);
    if (r.dir.includes("s")) patch.h = Math.max(MIN_H, r.sh + dy);
    if (r.dir.includes("w")) {
      const newW = Math.max(MIN_W, r.sw - dx);
      patch.w = newW;
      patch.x = r.sex + (r.sw - newW);
    }
    if (r.dir.includes("n")) {
      const newH = Math.max(MIN_H, r.sh - dy);
      patch.h = newH;
      patch.y = r.sey + (r.sh - newH);
    }
    updateElement(el.id, patch);
  };

  const handleResizePointerUp = () => {
    resizeRef.current = null;
  };

  /* ----- drag the whole box ----- */
  const handleBodyPointerDown = (e: React.PointerEvent) => {
    if (tool !== "select") return;
    if (editing) return;
    if ((e.target as HTMLElement).closest("[data-resize-handle]")) return;
    if ((e.target as HTMLElement).closest("textarea, button")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    let dragIds: string[];
    if (e.shiftKey) {
      toggleSelected(el.id);
      const next = isSelected
        ? selection.filter((id) => id !== el.id)
        : [...selection, el.id];
      dragIds = expandToGroups(next);
    } else if (isSelected) {
      dragIds = expandToGroups(selection);
    } else {
      setSelection([el.id]);
      dragIds = expandToGroups([el.id]);
    }

    dragRef.current = {
      startCX: e.clientX,
      startCY: e.clientY,
      dragIds,
      appliedDx: 0,
      appliedDy: 0,
      pushed: false
    };
  };
  const handleBodyPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const zoom = camera?.zoom ?? 1;
    const dx = (e.clientX - d.startCX) / zoom;
    const dy = (e.clientY - d.startCY) / zoom;
    if (!d.pushed && Math.hypot(dx, dy) > 2) {
      pushHistory();
      d.pushed = true;
    }
    const stepX = dx - d.appliedDx;
    const stepY = dy - d.appliedDy;
    if (stepX !== 0 || stepY !== 0) {
      translateElements(d.dragIds, stepX, stepY);
      d.appliedDx = dx;
      d.appliedDy = dy;
    }
  };
  const handleBodyPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      data-note-handle
      onPointerDown={handleBodyPointerDown}
      onPointerMove={handleBodyPointerMove}
      onPointerUp={handleBodyPointerUp}
      onPointerCancel={handleBodyPointerUp}
      onMouseEnter={() => setHoverDeferred(true)}
      onMouseLeave={() => setHoverDeferred(false)}
      onDoubleClick={() => setEditing(true)}
      style={{
        left: el.x,
        top: el.y,
        width: el.w,
        height: el.h,
        color: el.color,
        fontFamily
      }}
      className={cn(
        "absolute group pointer-events-auto rounded-md text-base transition",
        tool === "select" ? "cursor-move" : "cursor-text",
        showChrome ? "ring-1 ring-cyan-400/70 ring-dashed" : "",
        isSelected &&
          (el.groupId
            ? "ring-2 ring-violet-400/95 ring-offset-2 ring-offset-transparent"
            : "ring-2 ring-cyan-400/95 ring-offset-2 ring-offset-transparent")
      )}
    >
      {/* Outline (rendered as a thin dashed border via box-shadow trick so
          the resize handles can sit ON TOP of the edge). */}
      {showChrome && (
        <div className="pointer-events-none absolute inset-0 rounded-md border border-dashed border-cyan-400/80" />
      )}

      {editing ? (
        <TextEditor
          el={el}
          fontFamily={fontFamily}
          fontSize={fontSize}
          onCommit={(next) => {
            pushHistory();
            if (next.trim() === "") removeElement(el.id);
            else updateElement(el.id, { text: next });
            setEditing(false);
          }}
        />
      ) : (
        <p
          style={{ color: el.color, fontFamily, fontSize }}
          className="w-full h-full px-2 py-1 leading-snug whitespace-pre-wrap break-words overflow-hidden"
        >
          {el.text || (tool === "select" ? "Double-click to edit" : "")}
        </p>
      )}

      {/* Chrome row — sits well above the box so it doesn't fight with the
          resize handles. Bigger chips with proper icons. The invisible
          bridge below it covers the gap between the chrome and the text
          box so the cursor never truly "leaves" while reaching for the
          font / size / delete chips. Visible during edit too so the user
          can change font/size mid-typing. */}
      {showChrome && (
        <>
          <div
            aria-hidden
            className="absolute -top-12 left-0 right-0 h-12"
            onMouseEnter={() => setHoverDeferred(true)}
          />
          <div
            className="absolute -top-11 left-0 right-0 flex justify-end gap-1.5 z-20"
            onMouseEnter={() => setHoverDeferred(true)}
            onMouseLeave={() => setHoverDeferred(false)}
          >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSize((v) => !v);
              setShowFont(false);
            }}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-slate-900/90 text-white text-xs font-medium shadow-floating border border-white/10 hover:bg-slate-900 transition tabular-nums"
            aria-label="Font size"
          >
            <Type className="size-3.5" /> {fontSize}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowFont((v) => !v);
              setShowSize(false);
            }}
            style={{ fontFamily }}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-slate-900/90 text-white text-xs font-medium shadow-floating border border-white/10 hover:bg-slate-900 transition"
            aria-label="Change font"
          >
            Aa
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              pushHistory();
              removeElement(el.id);
            }}
            className="inline-flex items-center justify-center size-8 rounded-full bg-rose-500 text-white shadow-floating hover:bg-rose-400 transition"
            aria-label="Delete text"
          >
            <Trash2 className="size-3.5" />
          </button>
          </div>
        </>
      )}

      {/* Font picker popover — taller chips that preview each font. */}
      {showFont && (
        <div
          className="absolute -top-[5.5rem] left-0 flex flex-wrap gap-1.5 bg-slate-900/95 backdrop-blur rounded-2xl border border-white/10 shadow-floating p-2 z-30 max-w-[320px]"
          onMouseEnter={() => setHoverDeferred(true)}
          onMouseLeave={() => setHoverDeferred(false)}
          onPointerDown={(e) => e.stopPropagation()}
        >
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
                "h-9 px-3 rounded-lg text-sm text-white transition",
                fontFamily === f.family ? "bg-white/20 ring-1 ring-white/40" : "hover:bg-white/10"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Font-size picker popover */}
      {showSize && (
        <div
          className="absolute -top-[5.5rem] right-0 flex gap-1 bg-slate-900/95 backdrop-blur rounded-2xl border border-white/10 shadow-floating p-2 z-30"
          onMouseEnter={() => setHoverDeferred(true)}
          onMouseLeave={() => setHoverDeferred(false)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {FONT_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => {
                pushHistory();
                updateElement(el.id, { fontSize: s });
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

      {/* Resize handles — 4 corners + 4 edges. Each only shows when chrome is visible. */}
      {showChrome && (
        <>
          {(
            [
              ["nw", "-top-1 -left-1", "cursor-nwse-resize"],
              ["n", "-top-1 left-1/2 -translate-x-1/2", "cursor-ns-resize"],
              ["ne", "-top-1 -right-1", "cursor-nesw-resize"],
              ["w", "top-1/2 -translate-y-1/2 -left-1", "cursor-ew-resize"],
              ["e", "top-1/2 -translate-y-1/2 -right-1", "cursor-ew-resize"],
              ["sw", "-bottom-1 -left-1", "cursor-nesw-resize"],
              ["s", "-bottom-1 left-1/2 -translate-x-1/2", "cursor-ns-resize"],
              ["se", "-bottom-1 -right-1", "cursor-nwse-resize"]
            ] as const
          ).map(([dir, pos, cursor]) => (
            <span
              key={dir}
              data-resize-handle
              onPointerDown={handleResizePointerDown(dir)}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
              onPointerCancel={handleResizePointerUp}
              className={cn(
                "absolute size-2.5 rounded-sm bg-cyan-400 ring-1 ring-white shadow-sm z-20",
                pos,
                cursor
              )}
            />
          ))}
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------- */
/* IconTile                                                 */
/* -------------------------------------------------------- */

/**
 * A draggable, resizable icon rendered with @iconify/react. Behaves like a
 * sticky note but with a single Iconify glyph instead of text.
 */
function IconTile({ el }: { el: IconElement }) {
  const updateElement = useWhiteboardStore((s) => s.updateElement);
  const removeElement = useWhiteboardStore((s) => s.removeElement);
  const translateElements = useWhiteboardStore((s) => s.translateElements);
  const pushHistory = useWhiteboardStore((s) => s.pushHistory);
  const tool = useWhiteboardStore((s) => s.tool);
  const camera = useWhiteboardStore((s) => s.activeBoard()?.camera);
  const selection = useWhiteboardStore((s) => s.selection);
  const setSelection = useWhiteboardStore((s) => s.setSelection);
  const toggleSelected = useWhiteboardStore((s) => s.toggleSelected);
  const expandToGroups = useWhiteboardStore((s) => s.expandToGroups);
  const isSelected = selection.includes(el.id);
  const [hovered, setHovered] = React.useState(false);

  // Hover defer — same pattern as TextLabel/StickyNote.
  const hoverHideTimer = React.useRef<number | null>(null);
  const setHoverDeferred = (v: boolean) => {
    if (hoverHideTimer.current !== null) {
      window.clearTimeout(hoverHideTimer.current);
      hoverHideTimer.current = null;
    }
    if (v) setHovered(true);
    else {
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

  const showChrome = tool === "select" && hovered;

  /* ----- drag-to-move ----- */
  const dragRef = React.useRef<{
    cx: number;
    cy: number;
    dragIds: string[];
    appliedDx: number;
    appliedDy: number;
    pushed: boolean;
  } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (tool !== "select") return;
    if ((e.target as HTMLElement).closest("[data-resize-handle], button")) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    let dragIds: string[];
    if (e.shiftKey) {
      toggleSelected(el.id);
      const next = isSelected
        ? selection.filter((id) => id !== el.id)
        : [...selection, el.id];
      dragIds = expandToGroups(next);
    } else if (isSelected) {
      dragIds = expandToGroups(selection);
    } else {
      setSelection([el.id]);
      dragIds = expandToGroups([el.id]);
    }

    dragRef.current = {
      cx: e.clientX,
      cy: e.clientY,
      dragIds,
      appliedDx: 0,
      appliedDy: 0,
      pushed: false
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const zoom = camera?.zoom ?? 1;
    const dx = (e.clientX - d.cx) / zoom;
    const dy = (e.clientY - d.cy) / zoom;
    if (!d.pushed && Math.hypot(dx, dy) > 2) {
      pushHistory();
      d.pushed = true;
    }
    const stepX = dx - d.appliedDx;
    const stepY = dy - d.appliedDy;
    if (stepX !== 0 || stepY !== 0) {
      translateElements(d.dragIds, stepX, stepY);
      d.appliedDx = dx;
      d.appliedDy = dy;
    }
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  /* ----- resize ----- */
  const resizeRef = React.useRef<{
    dir: string;
    sx: number;
    sy: number;
    sw: number;
    sh: number;
    ex: number;
    ey: number;
  } | null>(null);
  const startResize = (dir: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    pushHistory();
    resizeRef.current = {
      dir,
      sx: e.clientX,
      sy: e.clientY,
      sw: el.w,
      sh: el.h,
      ex: el.x,
      ey: el.y
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const moveResize = (e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (!r) return;
    const zoom = camera?.zoom ?? 1;
    const dx = (e.clientX - r.sx) / zoom;
    const dy = (e.clientY - r.sy) / zoom;
    const MIN = 24;
    const patch: Partial<IconElement> = {};
    if (r.dir.includes("e")) patch.w = Math.max(MIN, r.sw + dx);
    if (r.dir.includes("s")) patch.h = Math.max(MIN, r.sh + dy);
    if (r.dir.includes("w")) {
      const nw = Math.max(MIN, r.sw - dx);
      patch.w = nw;
      patch.x = r.ex + (r.sw - nw);
    }
    if (r.dir.includes("n")) {
      const nh = Math.max(MIN, r.sh - dy);
      patch.h = nh;
      patch.y = r.ey + (r.sh - nh);
    }
    updateElement(el.id, patch);
  };
  const endResize = () => {
    resizeRef.current = null;
  };

  return (
    <div
      data-note-handle
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseEnter={() => setHoverDeferred(true)}
      onMouseLeave={() => setHoverDeferred(false)}
      style={{ left: el.x, top: el.y, width: el.w, height: el.h, color: el.color }}
      className={cn(
        "absolute pointer-events-auto grid place-items-center transition rounded-md",
        tool === "select" ? "cursor-move" : "cursor-default",
        showChrome && "ring-1 ring-cyan-400/70 ring-offset-2 ring-offset-transparent",
        isSelected &&
          (el.groupId
            ? "ring-2 ring-violet-400/95 ring-offset-2 ring-offset-transparent"
            : "ring-2 ring-cyan-400/95 ring-offset-2 ring-offset-transparent")
      )}
    >
      <Icon
        icon={el.icon}
        style={{ width: "100%", height: "100%", color: el.color }}
      />

      {/* Chrome row floats above the icon (matches sticky-note / text styling). */}
      {showChrome && (
        <div
          className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              pushHistory();
              removeElement(el.id);
            }}
            className="inline-flex items-center justify-center size-8 rounded-full bg-rose-500 text-white shadow-floating ring-1 ring-white/20 hover:bg-rose-400 transition"
            aria-label="Delete icon"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      )}

      {/* Resize handles — 4 corners + 4 edges */}
      {showChrome && (
        <>
          {(
            [
              ["nw", "-top-1 -left-1", "cursor-nwse-resize"],
              ["n", "-top-1 left-1/2 -translate-x-1/2", "cursor-ns-resize"],
              ["ne", "-top-1 -right-1", "cursor-nesw-resize"],
              ["w", "top-1/2 -translate-y-1/2 -left-1", "cursor-ew-resize"],
              ["e", "top-1/2 -translate-y-1/2 -right-1", "cursor-ew-resize"],
              ["sw", "-bottom-1 -left-1", "cursor-nesw-resize"],
              ["s", "-bottom-1 left-1/2 -translate-x-1/2", "cursor-ns-resize"],
              ["se", "-bottom-1 -right-1", "cursor-nwse-resize"]
            ] as const
          ).map(([dir, pos, cur]) => (
            <span
              key={dir}
              data-resize-handle
              onPointerDown={startResize(dir)}
              onPointerMove={moveResize}
              onPointerUp={endResize}
              onPointerCancel={endResize}
              className={cn(
                "absolute size-2.5 rounded-sm bg-cyan-400 ring-1 ring-white shadow-sm z-20",
                pos,
                cur
              )}
            />
          ))}
        </>
      )}
    </div>
  );
}
