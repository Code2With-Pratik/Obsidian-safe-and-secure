"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/* -------------------------------------------------------- */
/* Types                                                    */
/* -------------------------------------------------------- */

export type Tool =
  | "select"
  | "hand"
  | "pen"
  | "eraser"
  | "line"
  | "arrow"
  | "rect"
  | "circle"
  | "text"
  | "note";

/** Tools that draw something onto the board — used by the toolbar to decide
 *  when to auto-open the color picker. */
export const DRAW_TOOLS: Tool[] = ["pen", "line", "arrow", "rect", "circle"];

interface Base {
  id: string;
  /** Top-left x/y in canvas-space (pre-camera). */
  x: number;
  y: number;
  /** Drawing author — used for the small "by Whoever" stamp on notes. */
  author?: string;
}

export interface PathElement extends Base {
  kind: "path";
  points: number[]; // flat [x0,y0,x1,y1,...] in canvas-space
  color: string;
  width: number;
}

export interface ShapeElement extends Base {
  kind: "rect" | "circle";
  w: number;
  h: number;
  color: string;
  width: number;
}

export interface LineElement extends Base {
  /** Single element type that handles both straight lines and arrows — the
   *  `arrow` flag tells the renderer whether to draw an arrowhead. */
  kind: "line";
  /** End-point. Start point is the inherited `x, y`. */
  x2: number;
  y2: number;
  color: string;
  width: number;
  arrow?: boolean;
}

export interface ConnectionElement {
  id: string;
  kind: "connection";
  /** Note ids on each end of the wire. */
  fromNoteId: string;
  toNoteId: string;
  color: string;
  width: number;
  arrow?: boolean;
}

export interface TextElement extends Base {
  kind: "text";
  text: string;
  color: string;
  /** Approx width for hit-testing / minimap. */
  w: number;
  h: number;
  /** Font family CSS variable (e.g. "var(--font-indie)"); defaults to sans. */
  font?: string;
}

export interface NoteElement extends Base {
  kind: "note";
  text: string;
  color: string; // tailwind gradient class fragment e.g. "from-amber-300 to-amber-400"
  rot: number;
  w: number;
  h: number;
  /** Font family CSS variable; defaults to sans. */
  font?: string;
}

/** Display fonts the user can apply to sticky notes / text labels. The
 *  `family` value matches a CSS variable wired up in `app/layout.tsx`. */
export const NOTE_FONTS: { id: string; label: string; family: string }[] = [
  { id: "sans", label: "Sans", family: "var(--font-sans)" },
  { id: "indie", label: "Indie", family: "var(--font-indie)" },
  { id: "caveat", label: "Caveat", family: "var(--font-caveat)" },
  { id: "marker", label: "Marker", family: "var(--font-marker)" },
  { id: "shadows", label: "Shadows", family: "var(--font-shadows)" },
  { id: "merienda", label: "Merienda", family: "var(--font-merienda)" }
];

export type Element =
  | PathElement
  | ShapeElement
  | LineElement
  | ConnectionElement
  | TextElement
  | NoteElement;

export interface Board {
  id: string;
  name: string;
  elements: Element[];
  /** Saved camera position so each board reopens where you left it. */
  camera: { x: number; y: number; zoom: number };
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------- */
/* History                                                  */
/* -------------------------------------------------------- */

interface Snapshot {
  elements: Element[];
}

interface State {
  boards: Board[];
  activeBoardId: string;
  tool: Tool;
  color: string;
  strokeWidth: number;
  /** History stacks are per-board. We key by boardId so switching boards
   *  doesn't lose your local undo trail. */
  history: Record<string, { past: Snapshot[]; future: Snapshot[] }>;

  /* ---- selectors / getters ---- */
  activeBoard: () => Board | undefined;

  /* ---- board management ---- */
  createBoard: (name: string) => Board;
  renameBoard: (id: string, name: string) => void;
  deleteBoard: (id: string) => void;
  setActiveBoard: (id: string) => void;

  /* ---- tool / paint settings ---- */
  setTool: (t: Tool) => void;
  setColor: (c: string) => void;
  setStrokeWidth: (n: number) => void;

  /* ---- camera ---- */
  setCamera: (c: Partial<Board["camera"]>) => void;
  /** Pan by a delta (screen pixels are pre-divided by zoom by the caller). */
  panBy: (dx: number, dy: number) => void;
  zoomAt: (zoomDelta: number, originX: number, originY: number) => void;

  /* ---- element CRUD ---- */
  addElement: (el: Element) => void;
  updateElement: (id: string, patch: Partial<Element>) => void;
  removeElement: (id: string) => void;
  clearBoard: () => void;

  /* ---- history ---- */
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

/* -------------------------------------------------------- */
/* Helpers                                                  */
/* -------------------------------------------------------- */

const newId = (prefix = "el") =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const NOTE_COLORS = [
  "from-amber-300 to-amber-400",
  "from-pink-300 to-pink-400",
  "from-cyan-300 to-cyan-400",
  "from-violet-300 to-violet-400",
  "from-emerald-300 to-emerald-400",
  "from-rose-300 to-rose-400"
];

function defaultElements(): Element[] {
  // Seed the welcome board with a few sticky notes — gives users something
  // to play with on first load.
  const seed: Omit<NoteElement, "id">[] = [
    {
      kind: "note",
      x: 80,
      y: 80,
      w: 200,
      h: 160,
      rot: -3,
      color: NOTE_COLORS[0],
      text: "Hero: 'The future of communication'"
    },
    {
      kind: "note",
      x: 360,
      y: 140,
      w: 200,
      h: 160,
      rot: 2,
      color: NOTE_COLORS[1],
      text: "Use aurora gradient bg on splash"
    },
    {
      kind: "note",
      x: 660,
      y: 90,
      w: 200,
      h: 160,
      rot: -1,
      color: NOTE_COLORS[2],
      text: "Ghost rooms = killer feature"
    },
    {
      kind: "note",
      x: 880,
      y: 280,
      w: 200,
      h: 160,
      rot: 4,
      color: NOTE_COLORS[3],
      text: "Whiteboard inside calls?"
    },
    {
      kind: "note",
      x: 160,
      y: 380,
      w: 200,
      h: 160,
      rot: -2,
      color: NOTE_COLORS[4],
      text: "Brainstorm mode → AI clusters ideas"
    },
    {
      kind: "note",
      x: 540,
      y: 420,
      w: 200,
      h: 160,
      rot: 3,
      color: NOTE_COLORS[5],
      text: "Stickers as DND-able layers"
    }
  ];
  return seed.map((e) => ({ ...e, id: newId("note") })) as NoteElement[];
}

function blankBoard(name = "Untitled board"): Board {
  const now = new Date().toISOString();
  return {
    id: newId("bd"),
    name,
    elements: [],
    camera: { x: 0, y: 0, zoom: 1 },
    createdAt: now,
    updatedAt: now
  };
}

function welcomeBoard(): Board {
  return {
    ...blankBoard("Welcome"),
    elements: defaultElements()
  };
}

const HISTORY_LIMIT = 50;

/* -------------------------------------------------------- */
/* Store                                                    */
/* -------------------------------------------------------- */

const seedBoards: Board[] = [welcomeBoard()];

export const useWhiteboardStore = create<State>()(
  persist(
    (set, get) => ({
      boards: seedBoards,
      activeBoardId: seedBoards[0].id,
      tool: "select",
      color: "#8B5CF6",
      strokeWidth: 4,
      history: {},

      activeBoard: () => get().boards.find((b) => b.id === get().activeBoardId),

      /* ---- boards ---- */
      createBoard: (name) => {
        const b = blankBoard(name || "Untitled board");
        set((s) => ({ boards: [...s.boards, b], activeBoardId: b.id }));
        return b;
      },
      renameBoard: (id, name) =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === id
              ? { ...b, name: name.trim() || b.name, updatedAt: new Date().toISOString() }
              : b
          )
        })),
      deleteBoard: (id) =>
        set((s) => {
          const remaining = s.boards.filter((b) => b.id !== id);
          // Never leave the user with zero boards.
          const next = remaining.length > 0 ? remaining : [welcomeBoard()];
          const nextActive =
            s.activeBoardId === id ? next[0].id : s.activeBoardId;
          const { [id]: _removed, ...history } = s.history;
          return {
            boards: next,
            activeBoardId: nextActive,
            history
          };
        }),
      setActiveBoard: (id) =>
        set((s) => (s.boards.some((b) => b.id === id) ? { activeBoardId: id } : s)),

      /* ---- tool ---- */
      setTool: (t) => set({ tool: t }),
      setColor: (c) => set({ color: c }),
      setStrokeWidth: (n) => set({ strokeWidth: Math.max(1, Math.min(40, n)) }),

      /* ---- camera ---- */
      setCamera: (patch) =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === s.activeBoardId ? { ...b, camera: { ...b.camera, ...patch } } : b
          )
        })),
      panBy: (dx, dy) =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === s.activeBoardId
              ? { ...b, camera: { ...b.camera, x: b.camera.x + dx, y: b.camera.y + dy } }
              : b
          )
        })),
      zoomAt: (zoomDelta, ox, oy) =>
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== s.activeBoardId) return b;
            const oldZoom = b.camera.zoom;
            const newZoom = Math.max(0.25, Math.min(4, oldZoom + zoomDelta));
            if (newZoom === oldZoom) return b;
            // Keep the point under the cursor stable while zooming.
            const cx = b.camera.x;
            const cy = b.camera.y;
            const ratio = newZoom / oldZoom;
            const nx = ox - (ox - cx) * ratio;
            const ny = oy - (oy - cy) * ratio;
            return { ...b, camera: { x: nx, y: ny, zoom: newZoom } };
          })
        })),

      /* ---- elements ---- */
      addElement: (el) =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === s.activeBoardId
              ? { ...b, elements: [...b.elements, el], updatedAt: new Date().toISOString() }
              : b
          )
        })),
      updateElement: (id, patch) =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === s.activeBoardId
              ? {
                  ...b,
                  elements: b.elements.map((e) =>
                    e.id === id ? ({ ...e, ...patch } as Element) : e
                  ),
                  updatedAt: new Date().toISOString()
                }
              : b
          )
        })),
      removeElement: (id) =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === s.activeBoardId
              ? {
                  ...b,
                  elements: b.elements.filter((e) => e.id !== id),
                  updatedAt: new Date().toISOString()
                }
              : b
          )
        })),
      clearBoard: () =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === s.activeBoardId
              ? { ...b, elements: [], updatedAt: new Date().toISOString() }
              : b
          )
        })),

      /* ---- history ---- */
      pushHistory: () => {
        const s = get();
        const board = s.boards.find((b) => b.id === s.activeBoardId);
        if (!board) return;
        const snap: Snapshot = { elements: board.elements };
        set((st) => {
          const stack = st.history[s.activeBoardId] ?? { past: [], future: [] };
          const past = [...stack.past, snap].slice(-HISTORY_LIMIT);
          return {
            history: { ...st.history, [s.activeBoardId]: { past, future: [] } }
          };
        });
      },
      undo: () => {
        const s = get();
        const stack = s.history[s.activeBoardId];
        if (!stack || stack.past.length === 0) return;
        const last = stack.past[stack.past.length - 1];
        const newPast = stack.past.slice(0, -1);
        const board = s.boards.find((b) => b.id === s.activeBoardId);
        if (!board) return;
        const newFuture = [{ elements: board.elements }, ...stack.future].slice(0, HISTORY_LIMIT);
        set((st) => ({
          boards: st.boards.map((b) =>
            b.id === s.activeBoardId ? { ...b, elements: last.elements } : b
          ),
          history: {
            ...st.history,
            [s.activeBoardId]: { past: newPast, future: newFuture }
          }
        }));
      },
      redo: () => {
        const s = get();
        const stack = s.history[s.activeBoardId];
        if (!stack || stack.future.length === 0) return;
        const next = stack.future[0];
        const newFuture = stack.future.slice(1);
        const board = s.boards.find((b) => b.id === s.activeBoardId);
        if (!board) return;
        const newPast = [...stack.past, { elements: board.elements }].slice(-HISTORY_LIMIT);
        set((st) => ({
          boards: st.boards.map((b) =>
            b.id === s.activeBoardId ? { ...b, elements: next.elements } : b
          ),
          history: {
            ...st.history,
            [s.activeBoardId]: { past: newPast, future: newFuture }
          }
        }));
      }
    }),
    {
      name: "nova-whiteboard",
      partialize: (s) => ({
        boards: s.boards,
        activeBoardId: s.activeBoardId,
        tool: s.tool,
        color: s.color,
        strokeWidth: s.strokeWidth
      })
    }
  )
);

export { NOTE_COLORS, newId };
