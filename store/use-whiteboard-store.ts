"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createClient } from "@/lib/supabase/client";

/* -------------------------------------------------------- */
/* Types                                                    */
/* -------------------------------------------------------- */

/** Postgres row shape for the `whiteboards` table — used by fetchBoards
 *  / createBoardOnServer to coerce server rows into the Board UI shape. */
interface WhiteboardRow {
  id: string;
  name: string;
  owner_id: string;
  elements: unknown;
  camera: { x: number; y: number; zoom: number } | null;
  visibility: "private" | "team" | "link";
  created_at: string;
  updated_at: string;
}

/** Lightweight per-key debounce. Used to coalesce rapid-fire autosaves
 *  into a single network round-trip. Kept inside this module so the
 *  store doesn't need a side-channel state for it. */
const _debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
function debounce(key: string, ms: number, fn: () => void) {
  const t = _debounceTimers.get(key);
  if (t) clearTimeout(t);
  _debounceTimers.set(
    key,
    setTimeout(() => {
      _debounceTimers.delete(key);
      fn();
    }, ms)
  );
}

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
  /** Elements sharing a `groupId` move together when any one is dragged. */
  groupId?: string;
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
  /** Font size in px. Defaults to 16. */
  fontSize?: number;
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
  /** Font size in px. Defaults to 16. */
  fontSize?: number;
}

/** Preset font sizes the user can pick from (in px). */
export const FONT_SIZES = [12, 14, 16, 20, 24, 32, 40, 56];

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

export interface IconElement extends Base {
  kind: "icon";
  /** Iconify icon id, e.g. "mdi:rocket-launch" or "lucide:bell". */
  icon: string;
  w: number;
  h: number;
  color: string;
}

export type Element =
  | PathElement
  | ShapeElement
  | LineElement
  | ConnectionElement
  | TextElement
  | NoteElement
  | IconElement;

/** Per-user access level for a shared board. */
export type AccessLevel = "viewer" | "editor" | "none";

export interface Board {
  id: string;
  name: string;
  elements: Element[];
  /** Saved camera position so each board reopens where you left it. */
  camera: { x: number; y: number; zoom: number };
  createdAt: string;
  updatedAt: string;
  /** Per-user permission map, keyed by user id. Missing keys mean "no access". */
  access?: Record<string, AccessLevel>;
  /** Link-share visibility. "private" = nobody else, "team" = workspace,
   *  "link" = anyone with the link. */
  visibility?: "private" | "team" | "link";
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
  /** Currently-selected element ids on the active board. Transient — not
   *  persisted across reloads. */
  selection: string[];
  /** In-memory clipboard for copy/paste. Holds detached clones — pasting
   *  later still works even if the originals have been deleted. */
  clipboard: Element[];
  /** Number of times the current clipboard has been pasted; drives the
   *  paste offset so repeated Ctrl+V doesn't pile every copy on top. */
  clipboardPasteCount: number;
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
  /** Grant or revoke a single user's access on the active board. */
  setBoardAccess: (userId: string, level: AccessLevel) => void;
  /** Switch the active board's link visibility tier. */
  setBoardVisibility: (v: "private" | "team" | "link") => void;

  /* ---- Supabase sync ---- */
  /** True once fetchBoards has resolved at least once this session. */
  loaded: boolean;
  /** Roles I have on each board, by board id. Owner > editor > viewer. */
  myRoles: Record<string, "owner" | "editor" | "viewer">;
  /** Load every board I own or have been added to. Replaces the local
   *  cache so refresh + cross-device sync work. */
  fetchBoards: () => Promise<void>;
  /** Create a new board on the server (returns the persisted row). */
  createBoardOnServer: (name: string) => Promise<Board | null>;
  /** Debounced save of the active board's elements + camera. Safe to
   *  spam — it coalesces back-to-back calls within ~600ms. */
  saveActiveBoard: () => void;
  /** My role on the active board ('owner', 'editor', 'viewer'). Falls
   *  back to 'owner' for boards that haven't synced yet (so brand-new
   *  client-only boards stay editable). */
  myRole: () => "owner" | "editor" | "viewer";
  /** True when my role is owner OR editor — i.e. I can draw. */
  canEdit: () => boolean;

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
  /** Translate every supplied id by the same delta in a single store update —
   *  used while dragging a multi-selection so all members move together. */
  translateElements: (ids: string[], dx: number, dy: number) => void;
  clearBoard: () => void;

  /* ---- selection ---- */
  setSelection: (ids: string[]) => void;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
  /** Select every element whose bounding box intersects the rect (canvas-space). */
  selectInRect: (rect: { x: number; y: number; w: number; h: number }) => void;
  /** Group all currently-selected elements under a fresh groupId. */
  groupSelection: () => void;
  /** Strip the `groupId` from every selected element. */
  ungroupSelection: () => void;
  /** Delete every currently-selected element. */
  removeSelection: () => void;
  /** Expand a list of ids to include every element sharing a groupId with one of them. */
  expandToGroups: (ids: string[]) => string[];

  /* ---- clipboard ---- */
  /** Snapshot the current selection (expanded to its group peers) into the
   *  in-memory clipboard. */
  copySelection: () => void;
  /** Paste the clipboard into the active board with fresh ids, offset
   *  positions, remapped groups, and rewired note-to-note connections. */
  pasteClipboard: () => void;

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
      selection: [],
      clipboard: [],
      clipboardPasteCount: 0,
      history: {},
      loaded: false,
      myRoles: {},

      activeBoard: () => get().boards.find((b) => b.id === get().activeBoardId),

      myRole: () => {
        const id = get().activeBoardId;
        // Default to owner for boards that haven't synced yet — keeps
        // brand-new local boards editable before their server row exists.
        return get().myRoles[id] ?? "owner";
      },

      canEdit: () => {
        const r = get().myRole();
        return r === "owner" || r === "editor";
      },

      fetchBoards: async () => {
        const supabase = createClient();
        const { data: rows, error } = await supabase
          .from("whiteboards")
          .select("*")
          .order("updated_at", { ascending: false });
        if (error || !rows) {
          set({ loaded: true });
          return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        const meId = user?.id ?? null;

        // Resolve my role on each board via the membership table.
        const { data: memberRows } = await supabase
          .from("whiteboard_members")
          .select("board_id, user_id, role")
          .eq("user_id", meId ?? "");
        const myRoles: Record<string, "owner" | "editor" | "viewer"> = {};
        for (const m of memberRows ?? []) {
          myRoles[m.board_id] = m.role;
        }

        const boards: Board[] = rows.map((r) => ({
          id: r.id,
          name: r.name,
          elements: Array.isArray(r.elements) ? r.elements : [],
          camera: r.camera ?? { x: 0, y: 0, zoom: 1 },
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          visibility: r.visibility ?? "private"
        }));

        set((s) => ({
          boards: boards.length > 0 ? boards : s.boards,
          activeBoardId:
            boards.find((b) => b.id === s.activeBoardId)?.id ??
            boards[0]?.id ??
            s.activeBoardId,
          myRoles,
          loaded: true
        }));
      },

      createBoardOnServer: async (name) => {
        try {
          const res = await fetch("/api/whiteboards/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name })
          });
          if (!res.ok) {
            console.warn("[whiteboards/create] failed:", await res.text());
            return null;
          }
          const { board: row } = (await res.json()) as { board: WhiteboardRow };
          const board: Board = {
            id: row.id,
            name: row.name,
            elements: [],
            camera: row.camera ?? { x: 0, y: 0, zoom: 1 },
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            visibility: row.visibility ?? "private"
          };
          set((s) => ({
            boards: [board, ...s.boards],
            activeBoardId: board.id,
            myRoles: { ...s.myRoles, [board.id]: "owner" }
          }));
          return board;
        } catch (err) {
          console.warn("[whiteboards/create] error:", err);
          return null;
        }
      },

      saveActiveBoard: () => {
        // Coalesce calls within ~600ms — drawing fires many element
        // updates per second; we don't want to POST on every keystroke.
        const id = get().activeBoardId;
        const b = get().boards.find((x) => x.id === id);
        if (!b) return;
        // Only sync persisted (server-id, UUID-style) boards. The local
        // welcome board uses a prefixed id ("bd-…") and stays local-only.
        const isServerId =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            b.id
          );
        if (!isServerId) return;
        if (!get().canEdit()) return;
        debounce(`save-${b.id}`, 600, async () => {
          try {
            await fetch("/api/whiteboards/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                boardId: b.id,
                elements: b.elements,
                camera: b.camera,
                name: b.name
              })
            });
          } catch (err) {
            console.warn("[whiteboards/save] failed:", err);
          }
        });
      },

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
      setBoardAccess: (userId, level) => {
        const boardId = get().activeBoardId;
        // Optimistic local update — the popover reflects the change
        // immediately. The server call lands shortly after.
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            const next = { ...(b.access ?? {}) };
            if (level === "none") {
              delete next[userId];
            } else {
              next[userId] = level;
            }
            return { ...b, access: next, updatedAt: new Date().toISOString() };
          })
        }));
        // Only sync server-side for persisted boards.
        const isServerId =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            boardId
          );
        if (!isServerId) return;
        void fetch("/api/whiteboards/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            boardId,
            userId,
            role: level === "viewer" ? "viewer" : level === "editor" ? "editor" : "none"
          })
        }).catch((err) => console.warn("[whiteboards/share] failed:", err));
      },
      setBoardVisibility: (v) =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === s.activeBoardId
              ? { ...b, visibility: v, updatedAt: new Date().toISOString() }
              : b
          )
        })),

      /* ---- tool ---- */
      setTool: (t) => set({ tool: t }),
      // Both color + stroke also flow into any currently-selected colourable
      // element (shapes, lines, paths, text, icons). This lets the toolbar's
      // existing swatch + slider double as the "edit selected" controls
      // without a separate floating popover.
      setColor: (c) =>
        set((s) => {
          const sel = new Set(s.selection);
          if (sel.size === 0) return { color: c };
          return {
            color: c,
            boards: s.boards.map((b) =>
              b.id === s.activeBoardId
                ? {
                    ...b,
                    elements: b.elements.map((e) => {
                      if (!sel.has(e.id)) return e;
                      // Notes use Tailwind gradient classes for colour and
                      // have their own picker — skip them here.
                      if (
                        e.kind === "rect" ||
                        e.kind === "circle" ||
                        e.kind === "line" ||
                        e.kind === "path" ||
                        e.kind === "text" ||
                        e.kind === "icon" ||
                        e.kind === "connection"
                      ) {
                        return { ...e, color: c } as Element;
                      }
                      return e;
                    }),
                    updatedAt: new Date().toISOString()
                  }
                : b
            )
          };
        }),
      setStrokeWidth: (n) =>
        set((s) => {
          const clamped = Math.max(1, Math.min(40, n));
          const sel = new Set(s.selection);
          if (sel.size === 0) return { strokeWidth: clamped };
          return {
            strokeWidth: clamped,
            boards: s.boards.map((b) =>
              b.id === s.activeBoardId
                ? {
                    ...b,
                    elements: b.elements.map((e) => {
                      if (!sel.has(e.id)) return e;
                      if (
                        e.kind === "rect" ||
                        e.kind === "circle" ||
                        e.kind === "line" ||
                        e.kind === "path" ||
                        e.kind === "connection"
                      ) {
                        return { ...e, width: clamped } as Element;
                      }
                      return e;
                    }),
                    updatedAt: new Date().toISOString()
                  }
                : b
            )
          };
        }),

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
      addElement: (el) => {
        // Viewers can't mutate the board — server RLS would reject the
        // save anyway, but no-op'ing locally avoids ghost shapes that
        // disappear on next fetch.
        if (!get().canEdit()) return;
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === s.activeBoardId
              ? { ...b, elements: [...b.elements, el], updatedAt: new Date().toISOString() }
              : b
          )
        }));
      },
      updateElement: (id, patch) => {
        if (!get().canEdit()) return;
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
        }));
      },
      removeElement: (id) => {
        if (!get().canEdit()) return;
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
        }));
      },
      translateElements: (ids, dx, dy) => {
        if (!get().canEdit()) return;
        if (ids.length === 0 || (dx === 0 && dy === 0)) return;
        const idSet = new Set(ids);
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === s.activeBoardId
              ? {
                  ...b,
                  elements: b.elements.map((e) => {
                    if (!idSet.has(e.id)) return e;
                    if (e.kind === "connection") return e;
                    if (e.kind === "path") {
                      const next = [...e.points];
                      for (let i = 0; i < next.length; i += 2) {
                        next[i] += dx;
                        next[i + 1] += dy;
                      }
                      return { ...e, x: e.x + dx, y: e.y + dy, points: next };
                    }
                    if (e.kind === "line") {
                      return {
                        ...e,
                        x: e.x + dx,
                        y: e.y + dy,
                        x2: e.x2 + dx,
                        y2: e.y2 + dy
                      };
                    }
                    return { ...e, x: e.x + dx, y: e.y + dy } as Element;
                  }),
                  updatedAt: new Date().toISOString()
                }
              : b
          )
        }));
      },
      clearBoard: () => {
        if (!get().canEdit()) return;
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === s.activeBoardId
              ? { ...b, elements: [], updatedAt: new Date().toISOString() }
              : b
          ),
          selection: []
        }));
      },

      /* ---- selection ---- */
      setSelection: (ids) => set({ selection: ids }),
      toggleSelected: (id) =>
        set((s) => ({
          selection: s.selection.includes(id)
            ? s.selection.filter((x) => x !== id)
            : [...s.selection, id]
        })),
      clearSelection: () => set({ selection: [] }),
      selectInRect: (rect) => {
        const s = get();
        const b = s.boards.find((bd) => bd.id === s.activeBoardId);
        if (!b) return;
        const within = (x: number, y: number, w: number, h: number) =>
          x + w >= rect.x &&
          y + h >= rect.y &&
          x <= rect.x + rect.w &&
          y <= rect.y + rect.h;
        const hits: string[] = [];
        for (const el of b.elements) {
          if (el.kind === "path") {
            // Treat as its bbox.
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
            if (within(minX, minY, maxX - minX, maxY - minY)) hits.push(el.id);
          } else if (el.kind === "line") {
            const minX = Math.min(el.x, el.x2);
            const minY = Math.min(el.y, el.y2);
            const maxX = Math.max(el.x, el.x2);
            const maxY = Math.max(el.y, el.y2);
            if (within(minX, minY, maxX - minX, maxY - minY)) hits.push(el.id);
          } else if (el.kind === "connection") {
            // Connections are derived from notes; the notes themselves will be hit.
            continue;
          } else {
            const w = (el as { w?: number }).w ?? 0;
            const h = (el as { h?: number }).h ?? 0;
            if (within(el.x, el.y, w, h)) hits.push(el.id);
          }
        }
        // Expand to whole groups so a partial hit on a group brings the rest along.
        set({ selection: get().expandToGroups(hits) });
      },
      groupSelection: () => {
        const s = get();
        if (s.selection.length < 2) return;
        const gid = newId("grp");
        set((st) => ({
          boards: st.boards.map((b) =>
            b.id === st.activeBoardId
              ? {
                  ...b,
                  elements: b.elements.map((e) =>
                    st.selection.includes(e.id) ? ({ ...e, groupId: gid } as Element) : e
                  ),
                  updatedAt: new Date().toISOString()
                }
              : b
          )
        }));
      },
      ungroupSelection: () => {
        const s = get();
        if (s.selection.length === 0) return;
        // Collect every groupId touched by the selection, then strip that id
        // from EVERY element that carries it — otherwise a partial selection
        // leaves orphaned group peers still wired together.
        const b = s.boards.find((bd) => bd.id === s.activeBoardId);
        if (!b) return;
        const touchedGroups = new Set<string>();
        for (const el of b.elements) {
          if (s.selection.includes(el.id) && "groupId" in el && el.groupId) {
            touchedGroups.add(el.groupId);
          }
        }
        if (touchedGroups.size === 0) return;
        set((st) => ({
          boards: st.boards.map((board) =>
            board.id === st.activeBoardId
              ? {
                  ...board,
                  elements: board.elements.map((e) => {
                    if (!("groupId" in e) || !e.groupId) return e;
                    if (!touchedGroups.has(e.groupId)) return e;
                    const next = { ...e } as Element & { groupId?: string };
                    delete next.groupId;
                    return next;
                  }),
                  updatedAt: new Date().toISOString()
                }
              : board
          )
        }));
      },
      removeSelection: () => {
        const s = get();
        if (s.selection.length === 0) return;
        const ids = new Set(s.expandToGroups(s.selection));
        set((st) => ({
          boards: st.boards.map((b) =>
            b.id === st.activeBoardId
              ? {
                  ...b,
                  elements: b.elements.filter((e) => !ids.has(e.id)),
                  updatedAt: new Date().toISOString()
                }
              : b
          ),
          selection: []
        }));
      },
      expandToGroups: (ids) => {
        const s = get();
        const b = s.boards.find((bd) => bd.id === s.activeBoardId);
        if (!b) return ids;
        const groupIds = new Set<string>();
        for (const el of b.elements) {
          if (ids.includes(el.id) && "groupId" in el && el.groupId) {
            groupIds.add(el.groupId);
          }
        }
        if (groupIds.size === 0) return ids;
        const expanded = new Set(ids);
        for (const el of b.elements) {
          if ("groupId" in el && el.groupId && groupIds.has(el.groupId)) {
            expanded.add(el.id);
          }
        }
        return [...expanded];
      },

      /* ---- clipboard ---- */
      copySelection: () => {
        const s = get();
        const board = s.boards.find((b) => b.id === s.activeBoardId);
        if (!board) return;
        const ids = new Set(s.expandToGroups(s.selection));
        if (ids.size === 0) return;
        // Deep-clone so later mutations of the originals don't bleed into the
        // clipboard. Drop connections whose endpoints aren't both copied —
        // pasting would leave them dangling otherwise (we'll re-evaluate
        // them on paste via the id remap).
        const copies: Element[] = board.elements
          .filter((e) => ids.has(e.id))
          .filter(
            (e) =>
              e.kind !== "connection" ||
              (ids.has(e.fromNoteId) && ids.has(e.toNoteId))
          )
          .map((e) => JSON.parse(JSON.stringify(e)) as Element);
        set({ clipboard: copies, clipboardPasteCount: 0 });
      },
      pasteClipboard: () => {
        const s = get();
        if (s.clipboard.length === 0) return;
        const board = s.boards.find((b) => b.id === s.activeBoardId);
        if (!board) return;

        // Each consecutive paste steps further down-right so copies don't
        // stack invisibly on the previous paste.
        const nextCount = s.clipboardPasteCount + 1;
        const offset = nextCount * 24;

        // Build remaps so connections + group memberships survive intact.
        const idMap = new Map<string, string>();
        const groupMap = new Map<string, string>();
        for (const e of s.clipboard) {
          idMap.set(e.id, newId(e.kind));
          if ("groupId" in e && e.groupId && !groupMap.has(e.groupId)) {
            groupMap.set(e.groupId, newId("grp"));
          }
        }

        const fresh: Element[] = [];
        for (const orig of s.clipboard) {
          // Deep clone so we can mutate.
          const c = JSON.parse(JSON.stringify(orig)) as Element;
          c.id = idMap.get(orig.id)!;

          if (c.kind === "connection") {
            const from = idMap.get(c.fromNoteId);
            const to = idMap.get(c.toNoteId);
            // Connections are dropped during copy if both ends aren't
            // present, but keep the safety check anyway.
            if (!from || !to) continue;
            c.fromNoteId = from;
            c.toNoteId = to;
          } else if (c.kind === "path") {
            c.x += offset;
            c.y += offset;
            for (let i = 0; i < c.points.length; i += 2) {
              c.points[i] += offset;
              c.points[i + 1] += offset;
            }
          } else if (c.kind === "line") {
            c.x += offset;
            c.y += offset;
            c.x2 += offset;
            c.y2 += offset;
          } else {
            c.x += offset;
            c.y += offset;
          }

          if ("groupId" in c && c.groupId) {
            const mapped = groupMap.get(c.groupId);
            if (mapped) c.groupId = mapped;
          }

          fresh.push(c);
        }

        const freshIds = fresh.map((e) => e.id);
        set((st) => ({
          boards: st.boards.map((b) =>
            b.id === st.activeBoardId
              ? {
                  ...b,
                  elements: [...b.elements, ...fresh],
                  updatedAt: new Date().toISOString()
                }
              : b
          ),
          selection: freshIds,
          clipboardPasteCount: nextCount
        }));
      },

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
