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

/** Realtime channel that listens for share/unshare events on the current
 *  user. Lives at module scope so subscribeMembership is idempotent and
 *  teardownMembership can null it on sign-out. */
type RealtimeChannelLike = ReturnType<
  ReturnType<typeof createClient>["channel"]
>;
let _membershipChannel: RealtimeChannelLike | null = null;

/** Reentrancy guard for fetchBoards — a burst of share grants would
 *  otherwise multiply round-trips. */
let _fetchInFlight = false;

/** One-time-per-board-id warning set for the local-only no-op path in
 *  saveActiveBoard. Prevents the warning from spamming on every edit. */
const _warnedLocalOnly = new Set<string>();

/** UUID match — used in three places (saveActiveBoard, renameBoard,
 *  deleteBoard, and the fetchBoards stale-id reset) to identify
 *  server-persisted rows vs. the local welcome seed. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Module-level flag set by `applyRemoteOp` so the corresponding
 *  ref-changing `set()` doesn't trigger a redundant /api/save POST.
 *  Only the originator should persist; peers just mirror the state.
 *  Cleared after the next saveActiveBoard call short-circuits on it. */
let _suppressNextSave = false;

// ─── Internal element-mutation helpers ──────────────────────────────
//
// Both the public store actions (addElement / updateElement / …) and the
// applyRemoteOp dispatcher route through these so the local-state shape
// stays identical regardless of whether the op originated locally or
// arrived over a broadcast channel. Keep them OUT of the store closure
// so we don't have to thread `get/set` through the channel handler too.
//
// Type-wise we accept the loose `(updater) => void` shape — Zustand's
// official type is `(partial) => void` and we always hand it a function.

type WBSetter = (updater: (s: State) => Partial<State>) => void;

function _applyAddLocal(set: WBSetter, el: Element) {
  set((s) => ({
    boards: s.boards.map((b) =>
      b.id === s.activeBoardId
        ? {
            ...b,
            elements: [...b.elements, el],
            updatedAt: new Date().toISOString()
          }
        : b
    )
  }));
}

function _applyUpdateLocal(
  set: WBSetter,
  id: string,
  patch: Partial<Element>
) {
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
}

function _applyRemoveLocal(set: WBSetter, id: string) {
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
}

function _applyTranslateLocal(
  set: WBSetter,
  ids: string[],
  dx: number,
  dy: number
) {
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
}

function _applyClearLocal(set: WBSetter) {
  set((s) => ({
    boards: s.boards.map((b) =>
      b.id === s.activeBoardId
        ? { ...b, elements: [], updatedAt: new Date().toISOString() }
        : b
    ),
    selection: []
  }));
}

/** Whether the auth-state-change listener has been attached. Guards
 *  against multiple attachments under Fast Refresh / HMR. */
let _authListenerAttached = false;

/** Attach a single module-scope listener that tears down the membership
 *  channel + resets the in-memory caches when the user signs out.
 *
 *  Without this, the module-level `_membershipChannel` survives the
 *  sign-out and the `subscribeMembership` idempotency guard skips the
 *  next user's resubscription — they'd miss every live share event
 *  until a full page reload.
 *
 *  We deliberately handle ONLY `SIGNED_OUT`, not `USER_UPDATED` or
 *  `TOKEN_REFRESHED`. Those events fire for routine session refreshes
 *  (profile edits, expiring access tokens) where the underlying user
 *  hasn't changed — and the empty-deps useEffect on the whiteboard
 *  page won't re-run on its own, so clearing `loaded` / `myRoles` on
 *  those events would silently break:
 *    • auto-save (gated on `loaded`)
 *    • realtime share notifications (channel never recreated)
 *    • permission display (`myRole()` falls back to 'owner' for
 *      unknown boards, briefly exposing edit affordances to viewers).
 *
 *  Account switching is handled implicitly: any flow that promotes a
 *  different user to the active session in this app already goes
 *  through SIGNED_OUT first (logout in `lib/supabase/actions.ts`
 *  redirects to '/'), so a fresh `/whiteboard` mount runs the empty-
 *  deps effect again and re-subscribes the channel scoped to the new
 *  `auth.uid()`.
 *
 *  Browser-only — guarded for SSR. */
function attachAuthListener() {
  if (_authListenerAttached) return;
  if (typeof window === "undefined") return;
  _authListenerAttached = true;
  const supabase = createClient();
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      // Drop the realtime subscription so the next user gets a fresh
      // channel scoped to their own user_id.
      if (_membershipChannel) {
        supabase.removeChannel(_membershipChannel);
        _membershipChannel = null;
      }
      _fetchInFlight = false;
      // Reset the in-memory caches that depend on `auth.uid()` so the
      // next user doesn't transiently see the previous user's `myRoles`
      // while their own fetchBoards is in flight. (`partialize` already
      // excludes `myRoles` + `loaded`, but the live in-memory copy
      // outlives sign-out within the same SPA session.)
      try {
        useWhiteboardStore.setState({
          myRoles: {},
          loaded: false
        });
      } catch {
        /* store may not be hydrated yet — harmless */
      }
      return;
    }
    // On SIGNED_IN (incl. the INITIAL_SESSION event on cold-tab visits
    // where the cookie hydrates after mount), retrigger the fetch +
    // membership subscribe. Without this, a recipient who lands on the
    // whiteboard page before the session is ready ends up with rows=[]
    // latched into loaded=true and never sees a shared board until a
    // hard refresh.
    if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
      // Reset loaded so a force-less consumer can rerun.
      try {
        useWhiteboardStore.setState({ loaded: false });
        // Stale in-flight flag from a pre-auth invocation that errored
        // silently would block the new one.
        _fetchInFlight = false;
        const store = useWhiteboardStore.getState();
        void store.fetchBoards(true);
        store.subscribeMembership();
      } catch {
        /* harmless during hydration */
      }
    }
  });
}

if (typeof window !== "undefined") {
  attachAuthListener();
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

/** Discriminated union for real-time shape ops broadcast over the
 *  per-board presence channel. Peers apply these directly via
 *  `applyRemoteOp` without persisting (only the originator persists). */
export type WhiteboardOp =
  | { kind: "add"; el: Element }
  | { kind: "update"; id: string; patch: Partial<Element> }
  | { kind: "remove"; id: string }
  | { kind: "translate"; ids: string[]; dx: number; dy: number }
  | { kind: "clear" }
  | { kind: "replace"; elements: Element[] };

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
   *  cache so refresh + cross-device sync work. Pass `force` to skip
   *  the `loaded` short-circuit (used by the realtime subscription when
   *  a new membership row lands). */
  fetchBoards: (force?: boolean) => Promise<void>;
  /** Subscribe to postgres_changes on `whiteboard_members` filtered to
   *  the current user — re-fetches when anyone shares a board to / from
   *  me. Idempotent; safe to call after fetchBoards. */
  subscribeMembership: () => void;
  /** Tear down the membership channel — call on sign-out or full
   *  unmount of the whiteboard surface. */
  teardownMembership: () => void;
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

  /* ---- Real-time shape sync (Figma-style) ---- */
  /** Optional broadcaster hook installed by the presence channel
   *  (features/whiteboard/use-whiteboard-presence). When set, every
   *  shape mutation calls this with the op so peers see the change
   *  instantly — no save round-trip. Cleared on channel teardown. */
  broadcastOp?: (op: WhiteboardOp) => void;
  /** Wire / unwire the broadcaster. Called by the presence hook on
   *  SUBSCRIBED / cleanup respectively. */
  setBroadcastOp: (fn: ((op: WhiteboardOp) => void) | undefined) => void;
  /** Apply an op received from a peer over the broadcast channel.
   *  Bypasses the canEdit() guard (the originator was authorized;
   *  viewers still need to SEE remote ops) and DOES NOT re-broadcast
   *  or re-save (originator is the sole writer). */
  applyRemoteOp: (op: WhiteboardOp) => void;

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

      fetchBoards: async (force?: boolean) => {
        // Reentrancy guard — the realtime listener can trigger many
        // back-to-back fetches; we only need one. Without this, a burst
        // of share grants would N-fold the round-trip.
        if (_fetchInFlight) return;
        if (!force && get().loaded) return;
        _fetchInFlight = true;
        try {
          const supabase = createClient();
          // Resolve the signed-in user FIRST. If we run before the
          // Supabase client cookie has hydrated (cold-tab race), `user`
          // is null — bailing without latching `loaded` lets the
          // attachAuthListener SIGNED_IN / INITIAL_SESSION re-trigger
          // pick it up cleanly once the session is ready. The previous
          // code unconditionally set `loaded: true` here, which then
          // permanently short-circuited every non-force call.
          const { data: { user } } = await supabase.auth.getUser();
          const meId = user?.id ?? null;
          if (!meId) {
            // Do NOT set loaded — we want a retry. A console.warn would
            // be noisy on every cold mount, so stay silent and rely on
            // the auth listener to retrigger.
            return;
          }

          const { data: rows, error } = await supabase
            .from("whiteboards")
            .select("*")
            .order("updated_at", { ascending: false });
          if (error || !rows) {
            // Network / RLS error — also don't latch. A retry on the
            // next user-initiated action or auth event is cheap.
            return;
          }

          // Resolve my role on each board via the membership table.
          const { data: memberRows } = await supabase
            .from("whiteboard_members")
            .select("board_id, user_id, role")
            .eq("user_id", meId ?? "");
          const myRoles: Record<string, "owner" | "editor" | "viewer"> = {};
          for (const m of memberRows ?? []) {
            myRoles[m.board_id] = m.role;
          }

          // Also rehydrate Board.access for boards I OWN so the share
          // popover keeps showing existing memberships after a refresh.
          // Only owners can SELECT the full membership roster (per RLS),
          // so we run this second query scoped to their boards.
          const ownedIds = rows
            .filter((r) => r.owner_id === meId)
            .map((r) => r.id as string);
          const accessByBoard: Record<string, Record<string, "viewer" | "editor">> = {};
          if (ownedIds.length > 0) {
            const { data: rosterRows } = await supabase
              .from("whiteboard_members")
              .select("board_id, user_id, role")
              .in("board_id", ownedIds);
            for (const m of rosterRows ?? []) {
              if (m.role === "owner") continue; // owner is implicit on Board.owner_id
              const map = accessByBoard[m.board_id] ?? {};
              map[m.user_id] = m.role as "viewer" | "editor";
              accessByBoard[m.board_id] = map;
            }
          }

          const boards: Board[] = rows.map((r) => ({
            id: r.id,
            name: r.name,
            elements: Array.isArray(r.elements) ? r.elements : [],
            camera: r.camera ?? { x: 0, y: 0, zoom: 1 },
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            visibility: r.visibility ?? "private",
            access: accessByBoard[r.id]
          }));

          // Empty-rows bootstrap — create a server welcome board so
          // the user's first edits land on a real UUID row (otherwise
          // saveActiveBoard would skip every save because the local
          // seed has a `bd-…` id, and the user would silently lose
          // every stroke). Re-runs only when the server truly has zero
          // boards for this user; once a board exists the standard
          // path is taken.
          if (boards.length === 0) {
            try {
              const res = await fetch("/api/whiteboards/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Welcome" })
              });
              if (res.ok) {
                const { board: row } = (await res.json()) as {
                  board: WhiteboardRow;
                };
                const bootstrapBoard: Board = {
                  id: row.id,
                  name: row.name,
                  elements: [],
                  camera: row.camera ?? { x: 0, y: 0, zoom: 1 },
                  createdAt: row.created_at,
                  updatedAt: row.updated_at,
                  visibility: row.visibility ?? "private"
                };
                boards.push(bootstrapBoard);
                myRoles[bootstrapBoard.id] = "owner";
              } else {
                console.warn(
                  "[whiteboard] empty-rows bootstrap failed:",
                  await res.text()
                );
              }
            } catch (err) {
              console.warn("[whiteboard] empty-rows bootstrap error:", err);
            }
          }

          set((s) => {
            const prevActive = s.activeBoardId;
            // If the persisted activeBoardId is a stale local-only `bd-…`
            // id (from before we dropped boards from partialize), force
            // it onto the first server board so we never end up pointing
            // at a board that doesn't exist in `boards`.
            const prevIsLocal = !UUID_RE.test(prevActive);
            const nextActive =
              !prevIsLocal && boards.find((b) => b.id === prevActive)?.id
                ? prevActive
                : boards[0]?.id ?? prevActive;
            // If the user's active board just got revoked (no longer in
            // the result set), warn them so the canvas swap isn't silent.
            if (
              prevActive !== nextActive &&
              boards.length > 0 &&
              !prevIsLocal &&
              !boards.some((b) => b.id === prevActive) &&
              typeof window !== "undefined"
            ) {
              console.warn(
                "[whiteboard] Active board access was revoked — switching to:",
                nextActive
              );
            }
            return {
              boards: boards.length > 0 ? boards : s.boards,
              activeBoardId: nextActive,
              myRoles,
              loaded: true
            };
          });
        } finally {
          _fetchInFlight = false;
        }
      },

      subscribeMembership: () => {
        // Already subscribed? No-op (idempotent).
        if (_membershipChannel) return;
        const supabase = createClient();
        // Use a fresh closure read of meId at subscribe-time so a stale
        // sign-in transition can't pin the channel to the previous user.
        void (async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const meId = user.id;
          // Belt-and-braces — re-check before creating the channel.
          if (_membershipChannel) return;
          _membershipChannel = supabase
            .channel(`nova_whiteboard_members_${meId}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "whiteboard_members",
                filter: `user_id=eq.${meId}`
              },
              async (payload) => {
                // INSERT / UPDATE / DELETE — re-fetch unconditionally.
                // UPDATE in particular has to refresh because
                // `myRoles[boardId]` may have flipped (viewer→editor).
                void get().fetchBoards(true);
                // Also surface the share event in the notification
                // center so the recipient sees a chip in the bell
                // popover, not just a silent sidebar update.
                try {
                  const row = (payload.new ?? payload.old) as {
                    board_id?: string;
                    role?: "viewer" | "editor" | "owner";
                  } | null;
                  if (!row?.board_id) return;
                  if (payload.eventType === "DELETE") return; // no notif on revoke
                  // Look up the board name. RLS lets me read it
                  // because the membership row exists.
                  const { data: board } = await supabase
                    .from("whiteboards")
                    .select("name")
                    .eq("id", row.board_id)
                    .maybeSingle();
                  const boardName = board?.name ?? "a whiteboard";
                  const { useNotificationsStore } = await import(
                    "./use-notifications-store"
                  );
                  if (payload.eventType === "INSERT") {
                    useNotificationsStore.getState().add({
                      kind: "system",
                      title: "Added to whiteboard",
                      body: `${boardName} · role: ${row.role ?? "viewer"}`,
                      targetHref: "/whiteboard"
                    });
                  } else if (payload.eventType === "UPDATE") {
                    useNotificationsStore.getState().add({
                      kind: "system",
                      title: "Whiteboard role updated",
                      body: `${boardName} · your role is now ${row.role ?? "viewer"}`,
                      targetHref: "/whiteboard"
                    });
                  }
                } catch {
                  /* never block the fetchBoards path on notification failures */
                }
              }
            )
            .subscribe();
        })();
      },

      teardownMembership: () => {
        if (!_membershipChannel) return;
        const supabase = createClient();
        supabase.removeChannel(_membershipChannel);
        _membershipChannel = null;
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
        // If the most recent mutation came from a peer (applyRemoteOp),
        // the originator has already persisted — we'd just be racing
        // their write with our own. Clear the flag and bail.
        if (_suppressNextSave) {
          _suppressNextSave = false;
          return;
        }
        // Coalesce calls within ~600ms — drawing fires many element
        // updates per second; we don't want to POST on every keystroke.
        const id = get().activeBoardId;
        const b = get().boards.find((x) => x.id === id);
        if (!b) return;
        // Only sync persisted (server-id, UUID-style) boards. The local
        // welcome board uses a prefixed id ("bd-…") and stays local-only.
        const isServerId = UUID_RE.test(b.id);
        if (!isServerId) {
          // One-time warn per board id so the user understands why their
          // work isn't appearing on other devices. Spamming on every
          // edit would be noise — the throttle below makes it visible
          // exactly once per board per session.
          if (!_warnedLocalOnly.has(b.id)) {
            _warnedLocalOnly.add(b.id);
            console.warn(
              `[whiteboards] Board "${b.name}" is local-only (no server row). ` +
                `Sharing won't work. Create a new board via the sidebar to get a syncable one.`
            );
          }
          return;
        }
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
      renameBoard: (id, name) => {
        const trimmed = name.trim();
        const existing = get().boards.find((b) => b.id === id);
        // Empty input → snap back to the existing name; no-op rename →
        // skip the network call entirely.
        if (!existing) return;
        if (!trimmed || trimmed === existing.name) {
          return;
        }
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === id
              ? { ...b, name: trimmed, updatedAt: new Date().toISOString() }
              : b
          )
        }));
        // Server sync for persisted boards. Debounced ~400ms keyed per
        // board id so a user typing a long rename in the inline input
        // doesn't hammer the API. Uses the same /save endpoint — the
        // route already accepts an optional `name` field.
        if (!UUID_RE.test(id)) return;
        if (!get().canEdit()) return;
        debounce(`rename-${id}`, 400, async () => {
          try {
            const res = await fetch("/api/whiteboards/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ boardId: id, name: trimmed })
            });
            if (!res.ok) {
              console.warn("[whiteboards/rename] failed:", await res.text());
            }
          } catch (err) {
            console.warn("[whiteboards/rename] error:", err);
          }
        });
      },
      deleteBoard: (id) => {
        // Optimistic local removal first.
        set((s) => {
          const remaining = s.boards.filter((b) => b.id !== id);
          // Never leave the user with zero boards.
          const next = remaining.length > 0 ? remaining : [welcomeBoard()];
          const nextActive =
            s.activeBoardId === id ? next[0].id : s.activeBoardId;
          const { [id]: _removed, ...history } = s.history;
          const nextMyRoles = { ...s.myRoles };
          delete nextMyRoles[id];
          return {
            boards: next,
            activeBoardId: nextActive,
            history,
            myRoles: nextMyRoles
          };
        });
        // Cancel any in-flight save / rename debounces — without this,
        // a stale save from before the delete could re-UPSERT the row
        // server-side a few hundred ms after the DELETE returns.
        const pendingSave = _debounceTimers.get(`save-${id}`);
        if (pendingSave) {
          clearTimeout(pendingSave);
          _debounceTimers.delete(`save-${id}`);
        }
        const pendingRename = _debounceTimers.get(`rename-${id}`);
        if (pendingRename) {
          clearTimeout(pendingRename);
          _debounceTimers.delete(`rename-${id}`);
        }
        // Server delete for persisted boards. If it fails, re-fetch so
        // the local optimistic removal is reverted from the server's
        // perspective.
        if (!UUID_RE.test(id)) return;
        void (async () => {
          try {
            const res = await fetch("/api/whiteboards/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ boardId: id })
            });
            if (!res.ok) {
              console.warn("[whiteboards/delete] failed:", await res.text());
              // Revert by re-fetching the authoritative list.
              void get().fetchBoards(true);
            }
          } catch (err) {
            console.warn("[whiteboards/delete] error:", err);
            void get().fetchBoards(true);
          }
        })();
      },
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
        if (!UUID_RE.test(boardId)) return;
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
        _applyAddLocal(set, el);
        get().broadcastOp?.({ kind: "add", el });
      },
      updateElement: (id, patch) => {
        if (!get().canEdit()) return;
        _applyUpdateLocal(set, id, patch);
        get().broadcastOp?.({ kind: "update", id, patch });
      },
      removeElement: (id) => {
        if (!get().canEdit()) return;
        _applyRemoveLocal(set, id);
        get().broadcastOp?.({ kind: "remove", id });
      },
      translateElements: (ids, dx, dy) => {
        if (!get().canEdit()) return;
        if (ids.length === 0 || (dx === 0 && dy === 0)) return;
        _applyTranslateLocal(set, ids, dx, dy);
        get().broadcastOp?.({ kind: "translate", ids, dx, dy });
      },
      clearBoard: () => {
        if (!get().canEdit()) return;
        _applyClearLocal(set);
        get().broadcastOp?.({ kind: "clear" });
      },

      /* ---- Real-time op broadcasting + receiving ---- */
      setBroadcastOp: (fn) => set({ broadcastOp: fn }),
      applyRemoteOp: (op) => {
        // Peers receive ops over the broadcast channel and call this.
        // We mutate state via the SAME internal helpers the public
        // actions use — but DON'T re-broadcast (anti ping-pong) and
        // DON'T persist (originator is the sole writer to Postgres).
        _suppressNextSave = true;
        switch (op.kind) {
          case "add":
            _applyAddLocal(set, op.el);
            return;
          case "update":
            _applyUpdateLocal(set, op.id, op.patch);
            return;
          case "remove":
            _applyRemoveLocal(set, op.id);
            return;
          case "translate":
            _applyTranslateLocal(set, op.ids, op.dx, op.dy);
            return;
          case "clear":
            _applyClearLocal(set);
            return;
          case "replace":
            set((s) => ({
              boards: s.boards.map((b) =>
                b.id === s.activeBoardId
                  ? { ...b, elements: op.elements, updatedAt: new Date().toISOString() }
                  : b
              )
            }));
            return;
        }
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
      // Deliberately exclude `boards` so the stale local "Welcome" seed
      // (id `bd-…`) never re-hydrates from localStorage and shadows the
      // freshly-fetched server rows on reload. Without this, the silent
      // saveActiveBoard skip (non-UUID id) keeps biting forever.
      partialize: (s) => ({
        activeBoardId: s.activeBoardId,
        tool: s.tool,
        color: s.color,
        strokeWidth: s.strokeWidth
      })
    }
  )
);

export { NOTE_COLORS, newId };
