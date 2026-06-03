"use client";

import * as React from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/use-auth-store";
import {
  useWhiteboardStore,
  type WhiteboardOp
} from "@/store/use-whiteboard-store";

/** Other-user cursor shape — what we render on top of the canvas. */
export interface RemoteCursor {
  userId: string;
  name: string;
  avatar?: string | null;
  /** Board-space coordinates (camera-independent), not screen pixels. */
  x: number;
  y: number;
  /** Stable hex color derived from the user id so every viewer sees the
   *  same color for the same person. */
  color: string;
  /** Updated each time we receive a position — used to fade idle cursors
   *  that haven't moved in a while. */
  updatedAt: number;
}

/** Eight high-contrast hues — enough to disambiguate 8 simultaneous
 *  collaborators without colliding visually. Stable per user id so
 *  "Aria" is always cyan, "Kai" is always pink, etc. */
const COLORS = [
  "#22D3EE", // cyan
  "#EC4899", // pink
  "#A3E635", // lime
  "#FBBF24", // amber
  "#A78BFA", // violet
  "#F472B6", // rose
  "#60A5FA", // blue
  "#34D399"  // emerald
];

function colorForUser(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

/**
 * Hook that wires up a Supabase channel for a whiteboard carrying TWO
 * payload kinds:
 *
 *   • `broadcast 'cursor'` — high-frequency (≈30fps) cursor positions.
 *     Originally used presence/track, but presence is designed for
 *     low-cadence join/leave + state and Supabase will silently drop
 *     high-frequency track() updates → cursors appeared to stick. Now
 *     uses broadcast which is designed for streaming.
 *
 *   • `broadcast 'op'` — immediate shape mutation broadcasts (add,
 *     update, remove, translate, clear, replace). Every public store
 *     mutator calls `broadcastOp({...})` after applying locally; peers
 *     receive here and call `applyRemoteOp` which mirrors the change
 *     without re-broadcasting or re-saving.
 *
 *   • `presence` — kept ONLY for join/leave + late-joiner identity
 *     seeding (a single ch.track({...identity}) on SUBSCRIBED). No
 *     high-cadence presence updates anymore.
 *
 * Returns:
 *   • `cursors` — every OTHER user's latest cursor position
 *   • `myColor` — the color peers see your cursor as
 *   • `publish(x, y)` — call from pointermove (throttled to ~30fps)
 *
 * Pass `null` boardId to cleanly tear down.
 */
export function useWhiteboardPresence(boardId: string | null) {
  const meUser = useAuthStore((s) => s.user);
  const meId = meUser?.id ?? null;
  const [cursors, setCursors] = React.useState<RemoteCursor[]>([]);
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const lastPublishRef = React.useRef(0);
  // Monotonic counter for op envelopes — handy if we ever want to
  // detect out-of-order delivery on the receive side.
  const opSeqRef = React.useRef(0);

  const myColor = React.useMemo(
    () => (meId ? colorForUser(meId) : COLORS[0]),
    [meId]
  );

  // Pin the latest identity into a ref so the broadcast handlers
  // (created once per board) always send the freshest name/avatar
  // without re-binding listeners on every profile update.
  const identityRef = React.useRef({
    userId: meId,
    name: meUser?.name ?? meUser?.username ?? "Guest",
    avatar: meUser?.avatar ?? null
  });
  React.useEffect(() => {
    identityRef.current = {
      userId: meId,
      name: meUser?.name ?? meUser?.username ?? "Guest",
      avatar: meUser?.avatar ?? null
    };
  }, [meId, meUser?.name, meUser?.username, meUser?.avatar]);

  React.useEffect(() => {
    if (!boardId || !meId) return;
    const supabase = createClient();
    // self:false — never echo our own broadcasts back to us. This
    // means peers' inbound handlers never fire for messages we sent,
    // so we don't need a defensive origin check (kept anyway, belt-
    // and-braces).
    const ch = supabase.channel(`whiteboard:${boardId}`, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: meId }
      }
    });

    // ─── Identity-from-presence (join/leave only) ──────────────────
    // Used to seed a cursor entry for users who joined but haven't
    // moved yet, so the cursor label appears immediately on hover-in.
    const updateCursorsFromPresence = () => {
      const state = ch.presenceState() as Record<
        string,
        Array<{
          name: string;
          avatar?: string | null;
          userId: string;
        }>
      >;
      const now = Date.now();
      setCursors((prev) => {
        const byId = new Map(prev.map((c) => [c.userId, c]));
        for (const userId in state) {
          if (userId === meId) continue;
          const latest = state[userId][state[userId].length - 1];
          if (!latest) continue;
          if (!byId.has(userId)) {
            // New user — seed with off-screen position; the first
            // 'cursor' broadcast they emit will pull them on-screen.
            byId.set(userId, {
              userId,
              name: latest.name,
              avatar: latest.avatar,
              x: -9999,
              y: -9999,
              color: colorForUser(userId),
              updatedAt: now
            });
          }
        }
        // Drop cursors for users who left.
        for (const userId of Array.from(byId.keys())) {
          if (!state[userId]) byId.delete(userId);
        }
        return Array.from(byId.values());
      });
    };

    ch.on("presence", { event: "sync" }, updateCursorsFromPresence);
    ch.on("presence", { event: "join" }, updateCursorsFromPresence);
    ch.on("presence", { event: "leave" }, updateCursorsFromPresence);

    // ─── Cursor broadcast — high-frequency stream ──────────────────
    ch.on(
      "broadcast",
      { event: "cursor" },
      ({ payload }) => {
        const p = payload as {
          userId: string;
          name: string;
          avatar?: string | null;
          x: number;
          y: number;
        };
        if (!p || p.userId === meId) return;
        const now = Date.now();
        setCursors((prev) => {
          const next = [...prev];
          const idx = next.findIndex((c) => c.userId === p.userId);
          const entry: RemoteCursor = {
            userId: p.userId,
            name: p.name,
            avatar: p.avatar,
            x: p.x,
            y: p.y,
            color: colorForUser(p.userId),
            // Only bump updatedAt when the position actually changed,
            // so the idle-fade in RemoteCursorsLayer reflects real
            // idleness instead of "channel-tick-level" idleness.
            updatedAt:
              idx >= 0 && next[idx].x === p.x && next[idx].y === p.y
                ? next[idx].updatedAt
                : now
          };
          if (idx >= 0) next[idx] = entry;
          else next.push(entry);
          return next;
        });
      }
    );

    // ─── Op broadcast — shape mutations from peers ─────────────────
    ch.on(
      "broadcast",
      { event: "op" },
      ({ payload }) => {
        const p = payload as { origin?: string } & WhiteboardOp;
        if (!p || p.origin === meId) return;
        // The store's applyRemoteOp uses internal mutators that mirror
        // the public mutators' state shape, but DON'T re-broadcast and
        // DON'T re-save (originator is the sole writer).
        useWhiteboardStore.getState().applyRemoteOp(p as WhiteboardOp);
      }
    );

    ch.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      // One-time identity hello so peers can name our cursor before
      // we move.
      await ch.track({
        userId: identityRef.current.userId,
        name: identityRef.current.name,
        avatar: identityRef.current.avatar
      });
      // Wire the store's broadcastOp slot so every local mutator call
      // hands its op off to this channel.
      useWhiteboardStore.getState().setBroadcastOp((op) => {
        const c = channelRef.current;
        if (!c) return;
        void c.send({
          type: "broadcast",
          event: "op",
          payload: {
            ...op,
            origin: identityRef.current.userId,
            seq: ++opSeqRef.current
          }
        });
      });
    });

    channelRef.current = ch;
    return () => {
      // Unwire the broadcaster first — any mutator call mid-teardown
      // will then no-op gracefully.
      try {
        useWhiteboardStore.getState().setBroadcastOp(undefined);
      } catch {
        /* harmless */
      }
      void ch.unsubscribe();
      supabase.removeChannel(ch);
      channelRef.current = null;
      setCursors([]);
    };
  }, [boardId, meId]);

  /** Publish a cursor position. Throttled to ~33ms so a fast mouse
   *  produces ~30 updates/sec — well under Realtime's broadcast rate
   *  limit. Uses ch.send (broadcast) instead of ch.track (presence)
   *  because presence drops high-frequency updates. */
  const publish = React.useCallback(
    (x: number, y: number) => {
      const ch = channelRef.current;
      if (!ch || !meId) return;
      const now = performance.now();
      if (now - lastPublishRef.current < 33) return;
      lastPublishRef.current = now;
      void ch.send({
        type: "broadcast",
        event: "cursor",
        payload: {
          userId: identityRef.current.userId,
          name: identityRef.current.name,
          avatar: identityRef.current.avatar,
          x,
          y
        }
      });
    },
    [meId]
  );

  return { cursors, myColor, publish };
}
