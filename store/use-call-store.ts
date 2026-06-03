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

interface CallState {
  incoming: IncomingCall | null;
  outgoing: OutgoingCall | null;
  /** Per-user inbound ring channel — one per signed-in session. */
  userChannel: RealtimeChannel | null;
  /** Per-session channel — subscribed once we're inside a call so we hear
   *  accept/decline/end events from the other party. */
  sessionChannel: RealtimeChannel | null;

  setIncoming: (c: IncomingCall | null) => void;
  setOutgoing: (c: OutgoingCall | null) => void;

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

  setIncoming: (c) => set({ incoming: c }),
  setOutgoing: (c) => set({ outgoing: c }),

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
