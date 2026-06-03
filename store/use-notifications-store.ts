"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useSettingsStore } from "./use-settings-store";

/** Discriminated kinds the existing UI knows how to render (icon + gradient
 *  per kind in `kindStyle` inside notification-center.tsx). Adding a new
 *  kind here without also touching the UI would render no icon — so we
 *  keep this list locked to the six the UI already supports. */
export type NotifKind =
  | "message"
  | "mention"
  | "call"
  | "ghost"
  | "reaction"
  | "system";

export interface Notification {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  /** ISO timestamp — rendered via `formatRelative()` in the UI. */
  time: string;
  avatar?: string;
  read?: boolean;
  /** Optional route. When set, clicking the card (or the toast pop-up)
   *  navigates here and marks the notification read. e.g. a chat-message
   *  notification carries `/chats/<chatId>`; a whiteboard invite carries
   *  `/whiteboard`; etc. */
  targetHref?: string;
}

/** Public-facing draft shape — `id` and `time` are auto-filled if omitted
 *  so call sites can stay terse: `add({ kind, title, body, avatar })`. */
export type NotificationDraft = Omit<Notification, "id" | "time"> & {
  id?: string;
  time?: string;
};

interface NotificationsState {
  items: Notification[];
  /** True once persist's rehydrate cycle has settled. UI doesn't need
   *  this today — exposed so future selectors can avoid a flash. */
  hydrated: boolean;

  add: (n: NotificationDraft) => void;
  markOne: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  removeOne: (id: string) => void;

  unreadCount: () => number;
  unreadMentionCount: () => number;

  /** Open the postgres_changes subscriptions for kinds that aren't
   *  already covered by another store (call_sessions, community_members).
   *  Idempotent. Other surfaces (chat messages, whiteboard members,
   *  auth events) are tapped in their existing stores via direct calls
   *  to `useNotificationsStore.getState().add(...)`. */
  initRealtime: (meId: string) => void;
  teardown: () => void;
}

/** Cap on persisted items — at 200 we drop the oldest entries to keep
 *  localStorage well under any sane quota. */
const HISTORY_CAP = 200;

/** Module-scope realtime state. Lives outside the store so it survives
 *  re-renders without ending up in `partialize`. */
let _callsChannel: RealtimeChannel | null = null;
let _communityChannel: RealtimeChannel | null = null;
let _hostedCommunityIds = new Set<string>();
let _currentUserId: string | null = null;

/** Transient toast queue — populated by `add()` and consumed by the
 *  `<NotificationToasts>` component via the `subscribeToToasts` /
 *  `drainToasts` API below. Lives outside the persisted store because
 *  toasts are ephemeral by design (a flash on screen, not history).
 *
 *  The pattern: `add()` pushes onto _toastQueue and fires every
 *  registered listener. The toast component re-renders, drains the
 *  queue with `drainToasts()`, and animates each item in. No React
 *  state lives in the store, so toggle frequency is unbounded. */
const _toastQueue: Notification[] = [];
const _toastListeners = new Set<() => void>();

/** Register a listener that fires every time a new notification lands.
 *  Returns the cleanup function. */
export function subscribeToToasts(fn: () => void): () => void {
  _toastListeners.add(fn);
  return () => {
    _toastListeners.delete(fn);
  };
}

/** Pull every queued notification once. Subsequent calls return [] until
 *  the next add() fires. Drains the buffer to prevent re-rendering older
 *  toasts on every state change. */
export function drainToasts(): Notification[] {
  if (_toastQueue.length === 0) return [];
  const drained = _toastQueue.splice(0, _toastQueue.length);
  return drained;
}

/** Lazy <audio> for the notification chime. Lives at module scope so the
 *  same element is reused across every add() — avoids garbage collection
 *  pressure + lets the browser cache the bytes after the first play. */
let _audioEl: HTMLAudioElement | null = null;

function playNotificationSound() {
  if (typeof window === "undefined") return;
  // Respect the user's settings toggle (`notifications.sounds`).
  if (!useSettingsStore.getState().notifications.sounds) return;
  if (!_audioEl) {
    _audioEl = new Audio("/Notification.mp3");
    _audioEl.preload = "auto";
    _audioEl.volume = 0.55;
  }
  // Rewind to the start so back-to-back notifications all play (instead
  // of the second one being a no-op because the element is mid-play).
  try {
    _audioEl.currentTime = 0;
    void _audioEl.play().catch(() => {
      /* autoplay blocked — the next user gesture rearms it */
    });
  } catch {
    /* browsers in restricted contexts can throw on currentTime= */
  }
}

function genId(): string {
  // crypto.randomUUID is available in modern browsers AND Node 19+. Fall
  // back to a timestamp-noise id when not (e.g. some old Edge runtimes).
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `n-${Date.now()}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,

      add: (n) => {
        const filled: Notification = {
          id: n.id ?? genId(),
          time: n.time ?? new Date().toISOString(),
          kind: n.kind,
          title: n.title,
          body: n.body,
          avatar: n.avatar,
          read: n.read ?? false,
          targetHref: n.targetHref
        };
        set((s) => {
          // Newest first — the UI renders them in array order with no
          // additional sort, so the order we maintain here IS the order
          // the user sees.
          const next = [filled, ...s.items];
          return {
            items: next.length > HISTORY_CAP ? next.slice(0, HISTORY_CAP) : next
          };
        });
        // Side effects — sound + toast queue. Wrapped in try/catch so a
        // browser autoplay rejection or a missing DOM never blocks the
        // notification itself from landing in the store.
        try {
          playNotificationSound();
        } catch {
          /* harmless */
        }
        // Push onto the transient toast queue. The <NotificationToasts>
        // component reads from it and renders the top-right stack.
        _toastQueue.push(filled);
        _toastListeners.forEach((fn) => {
          try {
            fn();
          } catch {
            /* listener crashed — don't take down the chain */
          }
        });
      },

      markOne: (id) =>
        set((s) => ({
          items: s.items.map((it) => (it.id === id ? { ...it, read: true } : it))
        })),

      markAllRead: () =>
        set((s) => ({ items: s.items.map((it) => ({ ...it, read: true })) })),

      clearAll: () => set({ items: [] }),

      removeOne: (id) =>
        set((s) => ({ items: s.items.filter((it) => it.id !== id) })),

      unreadCount: () => get().items.reduce((n, it) => n + (it.read ? 0 : 1), 0),

      unreadMentionCount: () =>
        get().items.reduce(
          (n, it) => n + (!it.read && it.kind === "mention" ? 1 : 0),
          0
        ),

      initRealtime: (meId) => {
        // Idempotent + auth-scoped — only one set of channels per signed-
        // in user. If a different user takes over the tab without a
        // SIGNED_OUT (rare), tear the old channels down first.
        if (_currentUserId && _currentUserId !== meId) {
          get().teardown();
        }
        _currentUserId = meId;

        const supabase = createClient();

        // ─── 1. Call sessions — missed + rejected transitions ──────
        if (!_callsChannel) {
          _callsChannel = supabase
            .channel(`nova_notif_calls_${meId}`)
            .on(
              "postgres_changes",
              {
                event: "UPDATE",
                schema: "public",
                table: "call_sessions"
              },
              (payload) => {
                const oldRow = payload.old as {
                  status?: string;
                } | null;
                const newRow = payload.new as {
                  id?: string;
                  status?: string;
                  initiator_id?: string;
                  participants?: string[] | null;
                  kind?: string;
                  is_ghost?: boolean;
                } | null;
                if (!newRow || !oldRow) return;
                if (oldRow.status === newRow.status) return;
                // Respect the user's call-invites notification preference.
                // The same toggle that gates ring popovers also gates the
                // call history chips here.
                if (!useSettingsStore.getState().notifications.callInvites) {
                  return;
                }
                // Missed: I was an invitee and the call was never picked.
                if (
                  newRow.status === "missed" &&
                  Array.isArray(newRow.participants) &&
                  newRow.participants.includes(meId) &&
                  newRow.initiator_id !== meId
                ) {
                  get().add({
                    kind: "call",
                    title: "Missed call",
                    body:
                      newRow.kind === "video"
                        ? "You missed a video call"
                        : "You missed a voice call",
                    targetHref: "/calls"
                  });
                  return;
                }
                // Rejected: my outgoing call was declined by everyone.
                if (
                  newRow.status === "rejected" &&
                  newRow.initiator_id === meId
                ) {
                  get().add({
                    kind: "call",
                    title: "Call declined",
                    body: "The other side declined your call",
                    targetHref: "/calls"
                  });
                }
              }
            )
            .subscribe();
        }

        // ─── 2. Community joins — only for communities I host ──────
        // Multi-id server filters aren't available in postgres_changes,
        // so we filter client-side. Refresh the hosted set on mount; a
        // separate communities-UPDATE listener could keep it fresh, but
        // for now we re-query on demand when a join event arrives that
        // we don't recognize.
        void (async () => {
          const { data: hosted } = await supabase
            .from("communities")
            .select("id")
            .eq("host_id", meId);
          _hostedCommunityIds = new Set(
            (hosted ?? []).map((r) => r.id as string)
          );
        })();

        if (!_communityChannel) {
          _communityChannel = supabase
            .channel(`nova_notif_community_${meId}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "community_members"
              },
              async (payload) => {
                const row = payload.new as {
                  community_id?: string;
                  user_id?: string;
                  ghost_handle?: string;
                } | null;
                if (!row?.community_id) return;
                // Drop my own join + non-hosted communities.
                if (row.user_id === meId) return;
                if (!_hostedCommunityIds.has(row.community_id)) {
                  // The community might be one I just created — refresh
                  // the set once before deciding to drop.
                  const { data: hosted } = await supabase
                    .from("communities")
                    .select("id, name")
                    .eq("host_id", meId);
                  _hostedCommunityIds = new Set(
                    (hosted ?? []).map((r) => r.id as string)
                  );
                  if (!_hostedCommunityIds.has(row.community_id)) return;
                }
                const { data: community } = await supabase
                  .from("communities")
                  .select("name")
                  .eq("id", row.community_id)
                  .maybeSingle();
                get().add({
                  kind: "system",
                  title: `New member in ${community?.name ?? "your community"}`,
                  body: `${row.ghost_handle ?? "Someone"} just joined`,
                  targetHref: `/discover/community/${row.community_id}`
                });
              }
            )
            .subscribe();
        }
      },

      teardown: () => {
        const supabase = createClient();
        if (_callsChannel) {
          supabase.removeChannel(_callsChannel);
          _callsChannel = null;
        }
        if (_communityChannel) {
          supabase.removeChannel(_communityChannel);
          _communityChannel = null;
        }
        _hostedCommunityIds.clear();
        _currentUserId = null;
      }
    }),
    {
      name: "nova-notifications",
      // Persist only the feed; channels + transient flags live at
      // module scope and don't belong in localStorage.
      partialize: (s) => ({ items: s.items }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      }
    }
  )
);
