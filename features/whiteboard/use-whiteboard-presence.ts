"use client";

import * as React from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/use-auth-store";

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
 * Hook that wires up a Supabase presence channel for a whiteboard and
 * gives back:
 *   • `cursors` — every OTHER user's latest cursor position
 *   • `myColor` — the color you'll be rendered as on peers' screens
 *   • `publish(x, y)` — call from a `pointermove` listener (already
 *     throttled internally to ~30fps so a fast mouse doesn't flood the
 *     channel)
 *
 * Must be called inside an effect that has a valid `boardId` — passing
 * `null` cleanly cleans up.
 */
export function useWhiteboardPresence(boardId: string | null) {
  const meUser = useAuthStore((s) => s.user);
  const meId = meUser?.id ?? null;
  const [cursors, setCursors] = React.useState<RemoteCursor[]>([]);
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const lastPublishRef = React.useRef(0);

  const myColor = React.useMemo(
    () => (meId ? colorForUser(meId) : COLORS[0]),
    [meId]
  );

  React.useEffect(() => {
    if (!boardId || !meId) return;
    const supabase = createClient();
    // One channel per board; presence keys are user ids so a single
    // user with multiple tabs only counts once.
    const ch = supabase.channel(`whiteboard:${boardId}`, {
      config: { presence: { key: meId } }
    });

    const updateCursors = () => {
      const state = ch.presenceState() as Record<
        string,
        Array<{
          x: number;
          y: number;
          name: string;
          avatar?: string | null;
          userId: string;
        }>
      >;
      const next: RemoteCursor[] = [];
      const now = Date.now();
      for (const userId in state) {
        if (userId === meId) continue;
        const latest = state[userId][state[userId].length - 1];
        if (!latest) continue;
        next.push({
          userId,
          name: latest.name,
          avatar: latest.avatar,
          x: latest.x,
          y: latest.y,
          color: colorForUser(userId),
          updatedAt: now
        });
      }
      setCursors(next);
    };

    ch.on("presence", { event: "sync" }, updateCursors);
    ch.on("presence", { event: "join" }, updateCursors);
    ch.on("presence", { event: "leave" }, updateCursors);

    ch.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      // Send a one-time hello with our identity so other peers' cursor
      // labels are populated even before our first mousemove.
      await ch.track({
        userId: meId,
        name: meUser?.name ?? meUser?.username ?? "Guest",
        avatar: meUser?.avatar ?? null,
        x: -9999,
        y: -9999
      });
    });

    channelRef.current = ch;
    return () => {
      void ch.unsubscribe();
      supabase.removeChannel(ch);
      channelRef.current = null;
      setCursors([]);
    };
  }, [boardId, meId, meUser?.name, meUser?.username, meUser?.avatar]);

  /** Publish a cursor position. Throttled to ~33ms so a fast mouse
   *  produces ~30 updates/sec — well under Realtime's rate limit. */
  const publish = React.useCallback(
    (x: number, y: number) => {
      const ch = channelRef.current;
      if (!ch || !meId) return;
      const now = performance.now();
      if (now - lastPublishRef.current < 33) return;
      lastPublishRef.current = now;
      void ch.track({
        userId: meId,
        name: meUser?.name ?? meUser?.username ?? "Guest",
        avatar: meUser?.avatar ?? null,
        x,
        y
      });
    },
    [meId, meUser?.name, meUser?.username, meUser?.avatar]
  );

  return { cursors, myColor, publish };
}
