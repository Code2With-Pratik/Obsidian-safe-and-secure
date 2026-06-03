"use client";

import { create } from "zustand";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "./use-auth-store";

const supabase = createClient();

/** Ring payload broadcast on `user-calls:<userId>` when someone calls me. */
export interface IncomingCall {
  sessionId: string;
  chatId: string;
  roomName: string;
  kind: "voice" | "video";
  isGroup: boolean;
  isGhost: boolean;
  initiator: { id: string; name: string; avatar: string | null };
  startedAt: string;
}

/** Session details for the LOCAL outgoing-call path (the caller). Lives in
 *  the same store so /calls/active can pick it up after navigation. */
export interface OutgoingCall {
  sessionId: string;
  chatId: string;
  roomName: string;
  kind: "voice" | "video";
}

/** A flattened call_sessions row with the counterparty profile resolved —
 *  shape consumed by the Calls dashboard's Recent calls list. */
export interface CallHistoryEntry {
  id: string;
  sessionId: string;
  chatId: string;
  /** "incoming" / "outgoing" — relative to the local user. "missed" and
   *  "rejected" are derived from `status` and shown as their own row
   *  kinds in the UI but stored here as the underlying direction. */
  direction: "incoming" | "outgoing";
  status: "ringing" | "active" | "ended" | "missed" | "rejected";
  video: boolean;
  ghost: boolean;
  isGroup: boolean;
  durationSec: number;
  startedAt: string;
  endedAt: string | null;
  /** The single counterparty (1:1) — null for group calls. */
  counterparty: {
    id: string;
    name: string;
    username: string | null;
    avatar: string | null;
  } | null;
}

/** A scheduled call surfaced by fetchUpcoming(). */
export interface ScheduledCallEntry {
  id: string;
  sessionId: string;
  chatId: string;
  title: string;
  scheduledForIso: string;
  video: boolean;
  isGroup: boolean;
  participantsCount: number;
  initiatorId: string;
}

export interface CallStats {
  incomingSec: number;
  outgoingSec: number;
  totalSec: number;
}

interface CallState {
  incoming: IncomingCall | null;
  outgoing: OutgoingCall | null;
  /** Per-user inbound ring channel — one per signed-in session. */
  userChannel: RealtimeChannel | null;
  /** Per-session channel — subscribed once we're inside a call so we hear
   *  accept/decline/end events from the other party. */
  sessionChannel: RealtimeChannel | null;

  // ─── Dashboard caches (populated by the Calls page) ──────────────────
  history: CallHistoryEntry[];
  upcoming: ScheduledCallEntry[];
  stats: CallStats;
  historyLoaded: boolean;

  setIncoming: (c: IncomingCall | null) => void;
  setOutgoing: (c: OutgoingCall | null) => void;

  fetchHistory: () => Promise<void>;
  fetchUpcoming: () => Promise<void>;

  /** Wire up the per-user `call:ring` listener. Called after sign-in. */
  initializeRealtime: () => void;
  disconnectRealtime: () => void;

  /** Subscribe to per-session events (accept/decline/end) while a call is
   *  active. Idempotent — re-subscribing tears down the old channel first. */
  watchSession: (sessionId: string) => void;
  unwatchSession: () => void;

  accept: (sessionId: string) => Promise<void>;
  decline: (sessionId: string) => Promise<void>;
  end: (sessionId: string) => Promise<void>;
  /**
   * Kicks off an outgoing call — posts to /api/calls/start and stashes the
   * resulting session for the active-call page to pick up.
   */
  start: (input: {
    chatId: string;
    video: boolean;
    isGroup?: boolean;
    isGhost?: boolean;
    participantIds?: string[];
  }) => Promise<{ sessionId: string; roomName: string } | null>;
}

export const useCallStore = create<CallState>((set, get) => ({
  incoming: null,
  outgoing: null,
  userChannel: null,
  sessionChannel: null,

  history: [],
  upcoming: [],
  stats: { incomingSec: 0, outgoingSec: 0, totalSec: 0 },
  historyLoaded: false,

  setIncoming: (c) => set({ incoming: c }),
  setOutgoing: (c) => set({ outgoing: c }),

  fetchHistory: async () => {
    const me = useAuthStore.getState().user;
    if (!me) return;

    // All call_sessions in chats I'm a member of (RLS already enforces this).
    // Sorted newest first; we cap to 200 so the dashboard never lags on
    // power-users.
    const { data: rows, error } = await supabase
      .from("call_sessions")
      .select(
        "id, chat_id, initiator_id, kind, status, is_group, is_ghost, participants, joined, duration_seconds, started_at, connected_at, ended_at"
      )
      .in("status", ["ended", "missed", "rejected"])
      .order("started_at", { ascending: false })
      .limit(200);
    if (error || !rows) {
      console.warn("[calls] fetchHistory failed:", error);
      return;
    }

    // Resolve the counterparty profile for each call. In a 1:1 the
    // counterparty is the other member of the chat; in a group we leave
    // it null and the UI shows the chat name instead.
    const counterIds = new Set<string>();
    for (const r of rows) {
      if (r.is_group) continue;
      const others = ([r.initiator_id, ...(r.participants ?? [])] as string[])
        .filter((id) => id && id !== me.id);
      others.forEach((id) => counterIds.add(id));
    }
    let profiles: Record<string, { name: string; username: string | null; avatar: string | null }> = {};
    if (counterIds.size > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, name, username, avatar")
        .in("id", Array.from(counterIds));
      profiles = Object.fromEntries(
        (profs ?? []).map((p) => [
          p.id as string,
          {
            name: (p.name as string) ?? "User",
            username: (p.username as string | null) ?? null,
            avatar: (p.avatar as string | null) ?? null
          }
        ])
      );
    }

    const history: CallHistoryEntry[] = rows.map((r) => {
      const direction: "incoming" | "outgoing" =
        r.initiator_id === me.id ? "outgoing" : "incoming";
      const otherId = r.is_group
        ? null
        : (([r.initiator_id, ...(r.participants ?? [])] as string[]).find(
            (id) => id && id !== me.id
          ) ?? null);
      const counterparty = otherId
        ? {
            id: otherId,
            name: profiles[otherId]?.name ?? "User",
            username: profiles[otherId]?.username ?? null,
            avatar: profiles[otherId]?.avatar ?? null
          }
        : null;
      // Prefer the stored duration_seconds; fall back to connected_at →
      // ended_at delta for older rows that pre-date the column.
      const dur =
        typeof r.duration_seconds === "number"
          ? r.duration_seconds
          : r.connected_at && r.ended_at
          ? Math.max(
              0,
              Math.round(
                (new Date(r.ended_at).getTime() -
                  new Date(r.connected_at).getTime()) /
                  1000
              )
            )
          : 0;
      return {
        id: r.id,
        sessionId: r.id,
        chatId: r.chat_id,
        direction,
        status: r.status,
        video: r.kind === "video",
        ghost: !!r.is_ghost,
        isGroup: !!r.is_group,
        durationSec: dur,
        startedAt: r.started_at,
        endedAt: r.ended_at,
        counterparty
      };
    });

    // Stats — sum talk-time across direction.
    const stats = history.reduce<CallStats>(
      (acc, h) => {
        if (h.status !== "ended") return acc;
        if (h.direction === "incoming") acc.incomingSec += h.durationSec;
        else acc.outgoingSec += h.durationSec;
        acc.totalSec += h.durationSec;
        return acc;
      },
      { incomingSec: 0, outgoingSec: 0, totalSec: 0 }
    );

    set({ history, stats, historyLoaded: true });
  },

  fetchUpcoming: async () => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const { data: rows, error } = await supabase
      .from("call_sessions")
      .select(
        "id, chat_id, initiator_id, kind, is_group, participants, scheduled_for, title"
      )
      .eq("status", "scheduled")
      .order("scheduled_for", { ascending: true });
    if (error || !rows) return;
    const upcoming: ScheduledCallEntry[] = rows
      .filter((r) => r.scheduled_for)
      .map((r) => ({
        id: r.id,
        sessionId: r.id,
        chatId: r.chat_id,
        title: (r.title as string) ?? "Scheduled call",
        scheduledForIso: r.scheduled_for!,
        video: r.kind === "video",
        isGroup: !!r.is_group,
        participantsCount: ((r.participants ?? []).length as number) + 1,
        initiatorId: r.initiator_id
      }));
    set({ upcoming });
  },

  initializeRealtime: () => {
    const me = useAuthStore.getState().user;
    if (!me) return;

    // Defensive cleanup — same pattern as use-chat-store. If a prior session
    // left a channel around (HMR, auth flip-flop) tear it down before
    // subscribing again so callbacks don't double up.
    const topic = `realtime:user-calls:${me.id}`;
    supabase.getChannels().forEach((c) => {
      if (c.topic === topic) supabase.removeChannel(c);
    });
    if (get().userChannel) {
      supabase.removeChannel(get().userChannel!);
    }

    const channel = supabase
      .channel(`user-calls:${me.id}`)
      .on("broadcast", { event: "call:ring" }, ({ payload }) => {
        const p = payload as IncomingCall;
        // Ignore stale rings while we're already on a different call.
        if (get().outgoing && get().outgoing!.sessionId !== p.sessionId) return;
        set({ incoming: p });
      })
      .subscribe();

    set({ userChannel: channel });
  },

  disconnectRealtime: () => {
    const ch = get().userChannel;
    if (ch) supabase.removeChannel(ch);
    const sc = get().sessionChannel;
    if (sc) supabase.removeChannel(sc);
    set({ userChannel: null, sessionChannel: null, incoming: null, outgoing: null });
  },

  watchSession: (sessionId) => {
    // Tear down any prior session channel first so we don't double-handle.
    const prev = get().sessionChannel;
    if (prev) supabase.removeChannel(prev);

    const channel = supabase
      .channel(`call:${sessionId}`)
      .on("broadcast", { event: "call:accepted" }, () => {
        // Surfaced via DB UPDATE on call_sessions for any persistent state we
        // need; here we just keep the channel open so the caller's UI knows
        // the recipient picked up.
      })
      .on("broadcast", { event: "call:declined" }, ({ payload }) => {
        const p = payload as { sessionId: string; rejected?: boolean };
        if (p.rejected) {
          // Everyone declined — clear local incoming/outgoing state. The
          // active-call page reads `outgoing` and routes back when it
          // becomes null.
          set((s) => ({
            incoming: s.incoming?.sessionId === p.sessionId ? null : s.incoming,
            outgoing: s.outgoing?.sessionId === p.sessionId ? null : s.outgoing
          }));
        }
      })
      .on("broadcast", { event: "call:ended" }, ({ payload }) => {
        const p = payload as { sessionId: string };
        set((s) => ({
          incoming: s.incoming?.sessionId === p.sessionId ? null : s.incoming,
          outgoing: s.outgoing?.sessionId === p.sessionId ? null : s.outgoing
        }));
      })
      .subscribe();

    set({ sessionChannel: channel });
  },

  unwatchSession: () => {
    const ch = get().sessionChannel;
    if (ch) supabase.removeChannel(ch);
    set({ sessionChannel: null });
  },

  accept: async (sessionId) => {
    await fetch("/api/calls/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId })
    });
    set({ incoming: null });
  },

  decline: async (sessionId) => {
    await fetch("/api/calls/decline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId })
    });
    set({ incoming: null });
  },

  end: async (sessionId) => {
    await fetch("/api/calls/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId })
    });
    set({ outgoing: null });
  },

  start: async ({ chatId, video, isGroup, isGhost, participantIds }) => {
    try {
      const res = await fetch("/api/calls/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, video, isGroup, isGhost, participantIds })
      });
      if (!res.ok) {
        console.warn("[calls] start failed:", await res.text());
        return null;
      }
      const { session } = (await res.json()) as {
        session: { id: string; room_name: string; kind: "voice" | "video"; chat_id: string };
      };
      const out: OutgoingCall = {
        sessionId: session.id,
        chatId: session.chat_id,
        roomName: session.room_name,
        kind: session.kind
      };
      set({ outgoing: out });
      // Start watching the session channel so we hear the recipient's accept.
      get().watchSession(session.id);
      return { sessionId: session.id, roomName: session.room_name };
    } catch (err) {
      console.warn("[calls] start error:", err);
      return null;
    }
  }
}));
