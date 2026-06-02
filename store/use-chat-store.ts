"use client";

import { create } from "zustand";
import type { Chat, Message } from "@/types";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useAuthStore } from "./use-auth-store";
import { useChatThemeStore } from "./use-chat-theme-store";

const supabase = createClient();

// uuid generator — falls back to a Math.random-based one only when
// `crypto.randomUUID` isn't available (very old browsers).
const newId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/** Per-(chatId, userId) auto-clear timers for the typing-broadcast channel.
 *  Kept at module scope so they survive store updates and HMR. */
const typingClearTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

/* ----------------------------- helpers ----------------------------- */

/**
 * Re-derive a message's `reactions` array from the `message_reactions` table
 * (aggregated counts + whether the current user is in each emoji's voters).
 * Used both by the user-initiated `toggleReaction` call AND the realtime
 * subscription so the same code path keeps the bubble in sync.
 */
async function refreshMessageReactions(messageId: string, chatId: string, setState: (fn: (s: ChatState) => Partial<ChatState>) => void) {
  const { data: rows } = await supabase
    .from("message_reactions")
    .select("emoji, user_id")
    .eq("message_id", messageId);
  const meId = useAuthStore.getState().user?.id;
  const buckets: Record<string, { count: number; byMe: boolean }> = {};
  (rows || []).forEach((r: { emoji: string; user_id: string }) => {
    const k = r.emoji;
    if (!buckets[k]) buckets[k] = { count: 0, byMe: false };
    buckets[k].count++;
    if (r.user_id === meId) buckets[k].byMe = true;
  });
  const reactions = Object.entries(buckets).map(([emoji, v]) => ({ emoji, ...v }));
  setState((s) => ({
    messages: {
      ...s.messages,
      [chatId]: (s.messages[chatId] || []).map((m) =>
        m.id === messageId ? { ...m, reactions } : m
      )
    }
  }));
}

/** Convert a Supabase `messages` row → in-app Message shape. The extra rich
 *  fields (media / voice / poll / location / etc.) live inside the JSONB
 *  `payload` column and are spread back onto the message. */
function rowToMessage(m: Record<string, unknown>): Message {
  const payload = (m.payload as Record<string, unknown>) || {};
  return {
    id: m.id as string,
    chatId: m.chat_id as string,
    authorId: m.author_id as string,
    kind: m.kind as Message["kind"],
    content: (m.content as string) || "",
    createdAt: m.created_at as string,
    status: ((m.status as string) || "delivered") as Message["status"],
    pinned: (m.pinned as boolean) ?? undefined,
    edited: (m.edited as boolean) ?? undefined,
    replyTo: (m.reply_to as string) ?? undefined,
    ...payload
  } as Message;
}

/* ----------------------------- store ----------------------------- */

interface ChatState {
  chats: Chat[];
  messages: Record<string, Message[]>;
  activeChatId: string | null;
  typing: Record<string, string[]>; // chatId → userIds typing
  onlineUsers: string[];
  /** UserIds I've blocked — DM rows from them are hidden in the chat list. */
  blockedIds: string[];
  /** UserIds who have BLOCKED ME — used to filter the blocker's presence /
   *  typing locally so the blocked user (me) sees them as offline + never
   *  gets read receipts on outgoing messages (WhatsApp-style). */
  blockedMeIds: string[];
  /** Per-chat reply target — id of the message the user is currently replying
   *  to. The composer reads this to render the quoted-preview pill, and
   *  sendMessage / sendAttachment include it as `reply_to`. */
  replyTargets: Record<string, string | null>;
  /** Profile cache (id → minimal profile) so chat bubbles render the right
   *  name + avatar without each bubble running its own Supabase fetch.
   *  Populated by fetchChats and topped up by ensureProfile on cache miss. */
  profiles: Record<string, { id: string; name?: string; username?: string; avatar?: string }>;
  setReplyTarget: (chatId: string, messageId: string | null) => void;
  forwardMessages: (sourceMessageIds: string[], targetChatIds: string[]) => Promise<void>;
  ensureProfile: (userId: string) => Promise<void>;

  presenceChannel: RealtimeChannel | null;
  messageChannel: RealtimeChannel | null;
  reactionChannel: RealtimeChannel | null;
  chatChannel: RealtimeChannel | null;
  typingChannel: RealtimeChannel | null;
  hasInitialLoaded: boolean;

  /* ----- lifecycle ----- */
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  initializeRealtime: () => void;
  disconnectRealtime: () => void;

  /* ----- presence / typing / focus ----- */
  setTyping: (chatId: string, isTyping: boolean) => Promise<void>;
  setActiveChat: (id: string | null) => void;

  /* ----- send ----- */
  sendMessage: (chatId: string, content: string) => Promise<void>;
  sendVoice: (
    chatId: string,
    durationSec: number,
    waveform: number[],
    audioBlob?: Blob
  ) => Promise<void>;
  sendAttachment: (
    chatId: string,
    payload: Partial<Message> & { kind: Message["kind"]; content?: string }
  ) => Promise<void>;
  /** Upload a File to the chat-attachments bucket and return the public URL.
   *  Returns null on failure (logged to the console). */
  uploadAttachment: (file: File) => Promise<string | null>;

  /* ----- read receipts ----- */
  markRead: (chatId: string) => Promise<void>;
  markDelivered: (chatId: string, messageId: string) => Promise<void>;

  /* ----- message actions ----- */
  toggleReaction: (chatId: string, messageId: string, emoji: string) => Promise<void>;
  pinMessage: (chatId: string, messageId: string) => Promise<void>;
  /** Hard-delete from the DB. "Delete for everyone". */
  removeMessages: (chatId: string, messageIds: string[]) => Promise<void>;
  /** Soft-hide for the current user only. "Delete for me". */
  hideMessages: (chatId: string, messageIds: string[]) => Promise<void>;
  votePoll: (chatId: string, messageId: string, optionId: string) => Promise<void>;

  /* ----- chat actions ----- */
  startDM: (
    user: string | { id: string; name?: string; avatar?: string }
  ) => Promise<{ data?: Chat; error?: string }>;
  addGroup: (group: {
    name: string;
    description?: string;
    memberIds?: string[];
    banner?: string;
    avatar?: string;
  }) => Promise<Chat>;
  addMembers: (chatId: string, userIds: string[]) => Promise<void>;
  removeMembers: (chatId: string, userIds: string[]) => Promise<void>;
  pinChat: (chatId: string, pinned: boolean) => Promise<void>;
  muteChat: (chatId: string, muted: boolean) => Promise<void>;
  favouriteChat: (chatId: string, favorite: boolean) => Promise<void>;
  clearChat: (chatId: string) => Promise<void>;
  removeChat: (chatId: string) => Promise<void>;
  fetchBlocked: () => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;

  /* ----- calls integration ----- */
  scheduleCallWith: (
    userIds: string[],
    invite: {
      whenIso: string;
      endsAtIso?: string;
      title: string;
      video: boolean;
      callId?: string;
    }
  ) => Promise<void>;

  /* ----- demo / utility ----- */
  clearAll: () => void;

  /* ----- placeholder community join (still wires through chats) ----- */
  joinCommunity: (community: { id: string; name?: string; cover?: string }) => Promise<Chat>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  messages: {},
  activeChatId: null,
  typing: {},
  onlineUsers: [],
  blockedIds: [],
  blockedMeIds: [],
  replyTargets: {},
  profiles: {},

  presenceChannel: null,
  messageChannel: null,
  reactionChannel: null,
  chatChannel: null,
  typingChannel: null,
  hasInitialLoaded: false,

  /* ----- realtime ----- */

  initializeRealtime: () => {
    const me = useAuthStore.getState().user;
    if (!me) return;

    // Defensive cleanup: if we already have channels registered with the same
    // topics (HMR re-ran the module, auth-listener fired twice, etc.), tear
    // them down before creating fresh ones. Without this, Supabase throws
    // "cannot add `presence` callbacks after subscribe()" because `.on()`
    // can't be attached to an already-subscribed channel.
    const ourTopics = new Set([
      "realtime:nova_presence_v1",
      "realtime:nova_typing_v1",
      `realtime:nova_msgs_${me.id}`,
      `realtime:nova_reactions_${me.id}`,
      `realtime:nova_chats_${me.id}`
    ]);
    supabase.getChannels().forEach((c) => {
      if (ourTopics.has(c.topic)) supabase.removeChannel(c);
    });
    set({
      presenceChannel: null,
      messageChannel: null,
      reactionChannel: null,
      chatChannel: null,
      typingChannel: null
    });

    // Presence — online status only. Typing moved to a dedicated broadcast
    // channel below: presence's sync event was unreliable for transient
    // "user stopped typing" updates, leaving the indicator stuck on the
    // recipient's screen.
    if (!get().presenceChannel) {
      const channel = supabase
        .channel("nova_presence_v1", { config: { presence: { key: me.id } } })
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const meId = useAuthStore.getState().user?.id;
          // WhatsApp-style block visibility — anyone I've blocked OR who has
          // blocked me should appear offline in my UI.
          const hidden = new Set([...get().blockedIds, ...get().blockedMeIds]);
          const online: string[] = [];
          Object.values(state).forEach((presences) => {
            (presences as Array<Record<string, unknown>>).forEach((p) => {
              const uid = p.user_id as string | undefined;
              if (!uid || uid === meId) return;
              if (hidden.has(uid)) return;
              online.push(uid);
            });
          });
          set({ onlineUsers: Array.from(new Set(online)) });
        });
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const nowIso = new Date().toISOString();
          await channel.track({
            user_id: me.id,
            online_at: nowIso
          });
          // Bump my last_seen_at — used by DM chat headers to show
          // "last seen at HH:mm" when I'm offline on someone else's screen.
          void supabase.from("profiles").update({ last_seen_at: nowIso }).eq("id", me.id);
        }
      });
      set({ presenceChannel: channel });
    }

    // Typing — dedicated broadcast channel. Every keystroke broadcasts
    // {user_id, chat_id, typing}; recipients append/remove the sender from
    // typing[chat_id] and arm a 2.5s auto-clear timer so the indicator
    // disappears even if the sender's "stop" packet never arrives.
    if (!get().typingChannel) {
      const channel = supabase
        .channel("nova_typing_v1")
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          const p = payload as
            | { user_id?: string; chat_id?: string; typing?: boolean }
            | undefined;
          if (!p?.user_id || !p?.chat_id) return;
          if (p.user_id === me.id) return;
          // Ignore typing from users I've blocked or who have blocked me —
          // they're invisible on my screen (WhatsApp-style).
          const blocked = get().blockedIds;
          const blockedMe = get().blockedMeIds;
          if (blocked.includes(p.user_id) || blockedMe.includes(p.user_id)) return;
          const userId = p.user_id;
          const chatId = p.chat_id;
          const prev = typingClearTimers.get(`${chatId}:${userId}`);
          if (prev) clearTimeout(prev);
          if (p.typing) {
            set((s) => {
              const cur = s.typing[chatId] || [];
              if (cur.includes(userId)) return s;
              return { typing: { ...s.typing, [chatId]: [...cur, userId] } };
            });
            const t = setTimeout(() => {
              set((s) => ({
                typing: {
                  ...s.typing,
                  [chatId]: (s.typing[chatId] || []).filter((u) => u !== userId)
                }
              }));
              typingClearTimers.delete(`${chatId}:${userId}`);
            }, 2500);
            typingClearTimers.set(`${chatId}:${userId}`, t);
          } else {
            set((s) => ({
              typing: {
                ...s.typing,
                [chatId]: (s.typing[chatId] || []).filter((u) => u !== userId)
              }
            }));
          }
        })
        .subscribe();
      set({ typingChannel: channel });
    }

    // Messages — INSERT / UPDATE / DELETE
    if (!get().messageChannel) {
      const channel = supabase
        .channel(`nova_msgs_${me.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          (payload) => {
            // For DELETE events the `old` row only carries `chat_id` when
            // REPLICA IDENTITY FULL is set on the messages table — fall back
            // to scanning local state by id so a DELETE without chat_id still
            // removes the message from every chat that contained it.
            if (payload.eventType === "DELETE") {
              const id = (payload.old as Record<string, unknown> | undefined)?.id as
                | string
                | undefined;
              if (!id) return;
              const state = get();
              const chatIdsContainingMsg = Object.keys(state.messages).filter((cid) =>
                state.messages[cid].some((m) => m.id === id)
              );
              const explicitChatId = ((payload.old as Record<string, unknown> | undefined)?.chat_id as
                | string
                | undefined);
              const targets = explicitChatId
                ? [explicitChatId]
                : chatIdsContainingMsg;
              if (targets.length === 0) return;
              set((s) => {
                const nextMessages = { ...s.messages };
                for (const cid of targets) {
                  nextMessages[cid] = (s.messages[cid] || []).filter((m) => m.id !== id);
                }
                return { messages: nextMessages };
              });
              return;
            }

            const row = (payload.new || payload.old) as Record<string, unknown>;
            const chatId = row.chat_id as string;
            if (!chatId) return;

            if (payload.eventType === "INSERT") {
              const incoming = rowToMessage(row);
              // Scheduled messages by *other* users shouldn't appear until the
              // pg_cron job flips them to status='sent' — they'll arrive then
              // via the UPDATE branch below.
              if (
                (row.status as string) === "scheduled" &&
                (row.author_id as string) !== me.id
              ) {
                return;
              }
              const clientId = row.client_id as string | undefined;
              set((s) => {
                const cur = s.messages[chatId] || [];
                // If we have an optimistic temp message with id === client_id,
                // swap its id for the real one rather than duplicating.
                if (clientId) {
                  const idx = cur.findIndex((x) => x.id === clientId);
                  if (idx >= 0) {
                    const next = [...cur];
                    next[idx] = { ...next[idx], id: incoming.id, status: incoming.status };
                    return {
                      messages: { ...s.messages, [chatId]: next },
                      chats: s.chats.map((c) =>
                        c.id === chatId
                          ? { ...c, lastMessage: incoming.content, lastMessageAt: incoming.createdAt }
                          : c
                      )
                    };
                  }
                }
                if (cur.some((x) => x.id === incoming.id)) return s;
                return {
                  messages: { ...s.messages, [chatId]: [...cur, incoming] },
                  chats: s.chats.map((c) =>
                    c.id === chatId
                      ? { ...c, lastMessage: incoming.content, lastMessageAt: incoming.createdAt, unread: c.id === get().activeChatId ? 0 : (c.unread ?? 0) + (incoming.authorId === me.id ? 0 : 1) }
                      : c
                  )
                };
              });
              if (incoming.authorId !== me.id && get().activeChatId === chatId) {
                void get().markRead(chatId);
              }
            } else if (payload.eventType === "UPDATE") {
              const next = rowToMessage(row);
              set((s) => {
                const cur = s.messages[chatId] || [];
                const has = cur.some((m) => m.id === next.id);
                if (has) {
                  return {
                    messages: {
                      ...s.messages,
                      [chatId]: cur.map((m) => (m.id === next.id ? { ...m, ...next } : m))
                    }
                  };
                }
                // Recipient didn't see this row earlier (scheduled-but-not-due
                // messages are filtered out on INSERT). Now that pg_cron flipped
                // it to 'sent', surface it as if it were a fresh insert.
                return {
                  messages: { ...s.messages, [chatId]: [...cur, next] },
                  chats: s.chats.map((c) =>
                    c.id === chatId
                      ? {
                          ...c,
                          lastMessage: next.content,
                          lastMessageAt: next.createdAt,
                          unread:
                            c.id === get().activeChatId ? 0 : (c.unread ?? 0) + 1
                        }
                      : c
                  )
                };
              });
              if (
                !get().messages[chatId]?.some((m) => m.id === next.id && m.status === "scheduled") &&
                next.authorId !== me.id &&
                get().activeChatId === chatId
              ) {
                void get().markRead(chatId);
              }
            }
            // DELETE is handled above the early-return — payload.old.chat_id
            // may be absent when REPLICA IDENTITY isn't FULL.
          }
        )
        .subscribe();
      set({ messageChannel: channel });
    }

    // Reactions — refresh affected message's reactions on any change
    if (!get().reactionChannel) {
      const channel = supabase
        .channel(`nova_reactions_${me.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "message_reactions" },
          async (payload) => {
            const row = (payload.new || payload.old) as { message_id?: string };
            const messageId = row?.message_id;
            if (!messageId) return;
            const state = get();
            const chatId = Object.keys(state.messages).find((cid) =>
              state.messages[cid].some((m) => m.id === messageId)
            );
            if (!chatId) return;
            await refreshMessageReactions(messageId, chatId, set as never);
          }
        )
        .subscribe();
      set({ reactionChannel: channel });
    }

    // Chats — keep the list in sync on DELETE *and* propagate theme changes
    // (chats.theme / custom_bg) so when one participant picks a theme, the
    // other side sees it instantly via the chat-theme store.
    if (!get().chatChannel) {
      const channel = supabase
        .channel(`nova_chats_${me.id}`)
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "chats" },
          (payload) => {
            const id = (payload.old as { id?: string })?.id;
            if (!id) return;
            set((s) => {
              const { [id]: _drop, ...rest } = s.messages;
              return { chats: s.chats.filter((c) => c.id !== id), messages: rest };
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "chats" },
          (payload) => {
            const row = payload.new as {
              id?: string;
              theme?: string | null;
              custom_bg?: string | null;
            };
            if (!row?.id) return;
            useChatThemeStore
              .getState()
              .hydrateChatTheme(row.id, row.theme, row.custom_bg);
          }
        )
        .subscribe();
      set({ chatChannel: channel });
    }
  },

  disconnectRealtime: () => {
    const me = useAuthStore.getState().user;
    // Record the moment we go offline so peers see an accurate "last seen at".
    if (me) {
      void supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", me.id);
    }
    const { presenceChannel, messageChannel, reactionChannel, chatChannel, typingChannel } = get();
    if (presenceChannel) supabase.removeChannel(presenceChannel);
    if (messageChannel) supabase.removeChannel(messageChannel);
    if (reactionChannel) supabase.removeChannel(reactionChannel);
    if (chatChannel) supabase.removeChannel(chatChannel);
    if (typingChannel) supabase.removeChannel(typingChannel);
    typingClearTimers.forEach((t) => clearTimeout(t));
    typingClearTimers.clear();
    set({
      presenceChannel: null,
      messageChannel: null,
      reactionChannel: null,
      chatChannel: null,
      typingChannel: null
    });
  },

  /* ----- fetch ----- */

  fetchChats: async () => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const { data: chatsData } = await supabase
      .from("chats")
      .select(
        `*, members:chat_members(user_id, role, pinned, muted, favorite, last_read_at)`
      )
      .order("created_at", { ascending: false });
    if (!chatsData) return;

    const userChats = chatsData.filter((c: { members?: { user_id: string }[] }) =>
      c.members?.some((m) => m.user_id === me.id)
    );
    const pIds = Array.from(
      new Set(
        userChats.flatMap((c: { members: { user_id: string }[] }) =>
          c.members.map((m) => m.user_id)
        )
      )
    );
    const { data: profiles } = await supabase.from("profiles").select("*").in("id", pIds);
    const pMap = new Map((profiles || []).map((p: { id: string }) => [p.id, p]));
    // Stash everyone we just fetched into the profile cache so chat bubbles
    // (especially in groups) can render their avatar + name without a second
    // round-trip per author.
    if (profiles && profiles.length > 0) {
      const profileEntries = (profiles as Array<{
        id: string;
        name?: string;
        username?: string;
        avatar?: string;
      }>).reduce<Record<string, { id: string; name?: string; username?: string; avatar?: string }>>(
        (acc, p) => {
          acc[p.id] = {
            id: p.id,
            name: p.name,
            username: p.username,
            avatar: p.avatar
          };
          return acc;
        },
        {}
      );
      set((s) => ({ profiles: { ...s.profiles, ...profileEntries } }));
    }

    const formatted: Chat[] = userChats.map((c: Record<string, unknown>) => {
      const members = (c.members as Array<{
        user_id: string;
        role?: string;
        pinned?: boolean;
        muted?: boolean;
        favorite?: boolean;
      }>) || [];
      const mine = members.find((m) => m.user_id === me.id);
      let name = c.name as string | undefined;
      let avatar = c.avatar as string | undefined;
      let lastSeenAt: string | undefined;
      if (c.type === "dm") {
        const other = members.find((m) => m.user_id !== me.id);
        const p = other
          ? (pMap.get(other.user_id) as
              | { name?: string; username?: string; avatar?: string; last_seen_at?: string }
              | undefined)
          : undefined;
        if (p) {
          name = p.name || p.username;
          avatar = p.avatar;
          lastSeenAt = p.last_seen_at;
        }
      }
      return {
        id: c.id as string,
        type: c.type as Chat["type"],
        name: name || "Chat",
        avatar,
        banner: c.banner as string | undefined,
        description: c.description as string | undefined,
        memberIds: members.map((m) => m.user_id),
        membersCount: members.length,
        pinned: mine?.pinned ?? false,
        muted: mine?.muted ?? false,
        favorite: mine?.favorite ?? false,
        lastSeenAt
      };
    });
    // Hydrate per-chat theme into the chat-theme-store so both participants
    // see the same theme picked by either side.
    const hydrate = useChatThemeStore.getState().hydrateChatTheme;
    userChats.forEach((c: Record<string, unknown>) => {
      hydrate(c.id as string, c.theme as string | null, c.custom_bg as string | null);
    });

    // Unread counts — one round-trip RPC that compares each chat's
    // last_read_at against the message stream.
    const { data: unreadRows } = await supabase.rpc("get_unread_counts");
    const unreadMap = unreadRows
      ? new Map(
          (unreadRows as { chat_id: string; unread: number }[]).map((r) => [
            r.chat_id,
            Number(r.unread)
          ])
        )
      : new Map<string, number>();
    formatted.forEach((c) => {
      c.unread = unreadMap.get(c.id) ?? 0;
    });

    // Dedupe DM rows: legacy data (before the find_dm_between_users RPC
    // existed) can have multiple chat rows for the same partner. Keep the
    // chat with the highest unread count, falling back to the most recently
    // created — that's the one the user has actually been using — and roll
    // every duplicate's unread into it so nothing is lost from the badge.
    const dmCanonical = new Map<string, Chat>();
    const nonDmChats: Chat[] = [];
    formatted.forEach((c) => {
      if (c.type !== "dm") {
        nonDmChats.push(c);
        return;
      }
      const partnerId = c.memberIds?.find((id) => id !== me.id);
      if (!partnerId) {
        nonDmChats.push(c);
        return;
      }
      const prev = dmCanonical.get(partnerId);
      if (!prev) {
        dmCanonical.set(partnerId, c);
        return;
      }
      // Keep the one with more unread (tie → keep prev — it came first in
      // the created_at DESC ordering, so it's the newer chat).
      if ((c.unread ?? 0) > (prev.unread ?? 0)) {
        c.unread = (c.unread ?? 0) + (prev.unread ?? 0);
        dmCanonical.set(partnerId, c);
      } else {
        prev.unread = (prev.unread ?? 0) + (c.unread ?? 0);
      }
    });
    const deduped = [...nonDmChats, ...Array.from(dmCanonical.values())];

    set({ chats: deduped, hasInitialLoaded: true });
  },

  fetchMessages: async (chatId) => {
    const me = useAuthStore.getState().user;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });
    if (!data) return;
    let msgs = (data as Record<string, unknown>[]).map(rowToMessage);

    // Drop scheduled-but-not-due messages from *other* users — those land
    // via the UPDATE realtime channel once pg_cron flips them to 'sent'.
    if (me) {
      msgs = msgs.filter(
        (m) => m.status !== "scheduled" || m.authorId === me.id
      );
    }

    // Drop messages the current user has soft-hidden ("Delete for me").
    const ids = msgs.map((m) => m.id);
    if (me && ids.length > 0) {
      const { data: hiddenRows } = await supabase
        .from("message_hidden_for")
        .select("message_id")
        .eq("user_id", me.id)
        .in("message_id", ids);
      const hiddenSet = new Set(
        (hiddenRows || []).map((r: { message_id: string }) => r.message_id)
      );
      if (hiddenSet.size > 0) {
        msgs = msgs.filter((m) => !hiddenSet.has(m.id));
      }
    }

    // Hydrate reactions in one round-trip.
    if (ids.length > 0) {
      const { data: rxRows } = await supabase
        .from("message_reactions")
        .select("message_id, emoji, user_id")
        .in("message_id", ids);
      const meId = useAuthStore.getState().user?.id;
      const buckets: Record<string, Record<string, { count: number; byMe: boolean }>> = {};
      (rxRows || []).forEach((r: { message_id: string; emoji: string; user_id: string }) => {
        if (!buckets[r.message_id]) buckets[r.message_id] = {};
        if (!buckets[r.message_id][r.emoji]) buckets[r.message_id][r.emoji] = { count: 0, byMe: false };
        buckets[r.message_id][r.emoji].count++;
        if (r.user_id === meId) buckets[r.message_id][r.emoji].byMe = true;
      });
      msgs.forEach((m) => {
        const b = buckets[m.id];
        if (b) m.reactions = Object.entries(b).map(([emoji, v]) => ({ emoji, ...v }));
      });
    }

    set((s) => ({ messages: { ...s.messages, [chatId]: msgs } }));
  },

  /* ----- presence helpers ----- */

  setTyping: async (chatId, isTyping) => {
    const me = useAuthStore.getState().user;
    const channel = get().typingChannel;
    if (!me || !channel) return;
    await channel.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: me.id, chat_id: chatId, typing: isTyping }
    });
  },

  setActiveChat: (id) => {
    set({ activeChatId: id });
    if (id) {
      void get().markRead(id);
      void get().fetchMessages(id);
    }
  },

  setReplyTarget: (chatId, messageId) => {
    set((s) => ({ replyTargets: { ...s.replyTargets, [chatId]: messageId } }));
  },

  /** Fetch a profile from Supabase if it isn't already cached. Used by the
   *  chat bubble to resolve real (non-mock) author names + avatars in
   *  groups, where the bubble can't fall back to the chat's own name/avatar. */
  ensureProfile: async (userId) => {
    if (!userId) return;
    if (get().profiles[userId]) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, name, username, avatar")
      .eq("id", userId)
      .single();
    if (data) {
      set((s) => ({ profiles: { ...s.profiles, [data.id]: data } }));
    }
  },

  /** Forward an existing set of messages into one or more chats. Re-inserts
   *  each source's kind / content / payload under the current user. */
  forwardMessages: async (sourceMessageIds, targetChatIds) => {
    const me = useAuthStore.getState().user;
    if (!me || sourceMessageIds.length === 0 || targetChatIds.length === 0) return;
    // Find each source in local state (it must be visible to be forwarded).
    const sources: Message[] = [];
    const state = get();
    for (const id of sourceMessageIds) {
      for (const cid of Object.keys(state.messages)) {
        const m = state.messages[cid].find((x) => x.id === id);
        if (m) {
          sources.push(m);
          break;
        }
      }
    }
    if (sources.length === 0) return;
    // Build the insert rows. Payload reuses the existing rich fields.
    const rows: Array<Record<string, unknown>> = [];
    for (const target of targetChatIds) {
      for (const src of sources) {
        const payload: Record<string, unknown> = {};
        if (src.media) payload.media = src.media;
        if (src.audio) payload.audio = src.audio;
        if (src.file) payload.file = src.file;
        if (src.voice) payload.voice = src.voice;
        if (src.sticker) payload.sticker = src.sticker;
        if (src.gif) payload.gif = src.gif;
        if (src.poll) payload.poll = src.poll;
        if (src.contacts) payload.contacts = src.contacts;
        if (src.location) payload.location = src.location;
        if (src.link) payload.link = src.link;
        // Mark the forwarded copy so the recipient's bubble can render the
        // "↪ Forwarded" tag. Stored inside the JSONB payload (no schema
        // change needed) and surfaced by rowToMessage's payload spread.
        payload.forwarded = true;
        rows.push({
          chat_id: target,
          author_id: me.id,
          kind: src.kind,
          content: src.content,
          status: "sent",
          payload,
          client_id: newId()
        });
      }
    }
    const { error } = await supabase.from("messages").insert(rows);
    if (error) {
      console.error("[forwardMessages] insert failed", {
        message: (error as unknown as { message?: string }).message,
        targets: targetChatIds.length,
        sources: sources.length
      });
    }
  },

  /* ----- sending ----- */

  sendMessage: async (chatId, content) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const cid = newId();
    const now = new Date().toISOString();
    // Pull and clear the reply target up front so this send carries it and
    // subsequent sends are fresh.
    const replyTo = get().replyTargets[chatId] || null;
    if (replyTo) {
      set((s) => ({ replyTargets: { ...s.replyTargets, [chatId]: null } }));
    }
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: [
          ...(s.messages[chatId] ?? []),
          {
            id: cid,
            chatId,
            authorId: me.id,
            kind: "text",
            content,
            createdAt: now,
            status: "sending",
            replyTo: replyTo || undefined
          }
        ]
      }
    }));
    const insertRow: Record<string, unknown> = {
      chat_id: chatId,
      author_id: me.id,
      kind: "text",
      content,
      status: "sent",
      client_id: cid
    };
    if (replyTo) insertRow.reply_to = replyTo;
    const { data, error } = await supabase
      .from("messages")
      .insert(insertRow)
      .select()
      .single();
    if (error || !data) {
      set((s) => ({
        messages: { ...s.messages, [chatId]: (s.messages[chatId] ?? []).filter((m) => m.id !== cid) }
      }));
      return;
    }
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] ?? []).map((m) =>
          m.id === cid ? { ...m, id: data.id, status: "sent" } : m
        )
      }
    }));
  },

  sendVoice: async (chatId, durationSec, waveform, audioBlob) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const cid = newId();
    const now = new Date().toISOString();
    // Optimistic — show the bubble immediately with the local blob URL so the
    // author can play their own note while the upload finishes.
    const localUrl =
      audioBlob && typeof URL !== "undefined" ? URL.createObjectURL(audioBlob) : undefined;
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: [
          ...(s.messages[chatId] ?? []),
          {
            id: cid,
            chatId,
            authorId: me.id,
            kind: "voice",
            content: "",
            createdAt: now,
            status: "sending",
            voice: { durationSec, waveform, url: localUrl }
          }
        ]
      }
    }));
    // Upload the recording to the chat-attachments bucket so the recipient
    // can actually play it. Without this the receiver only sees a static
    // waveform with no audio source.
    let publicUrl: string | undefined;
    if (audioBlob) {
      const ext = audioBlob.type.includes("webm")
        ? "webm"
        : audioBlob.type.includes("mp4") || audioBlob.type.includes("aac")
        ? "m4a"
        : "ogg";
      const path = `${me.id}/voice-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
      const { data: up, error: upErr } = await supabase.storage
        .from("chat-attachments")
        .upload(path, audioBlob, {
          cacheControl: "3600",
          upsert: false,
          contentType: audioBlob.type || "audio/webm"
        });
      if (upErr || !up) {
        console.error("[sendVoice] upload failed", {
          message: (upErr as unknown as { message?: string })?.message,
          path
        });
      } else {
        publicUrl = supabase.storage.from("chat-attachments").getPublicUrl(up.path).data.publicUrl;
      }
    }
    const voicePayload: { durationSec: number; waveform: number[]; url?: string } = {
      durationSec,
      waveform
    };
    if (publicUrl) voicePayload.url = publicUrl;
    const { data, error } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        author_id: me.id,
        kind: "voice",
        content: "",
        status: "sent",
        payload: { voice: voicePayload },
        client_id: cid
      })
      .select()
      .single();
    if (error || !data) {
      console.error("[sendVoice] insert failed", error);
      set((s) => ({
        messages: { ...s.messages, [chatId]: (s.messages[chatId] ?? []).filter((m) => m.id !== cid) }
      }));
      return;
    }
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] ?? []).map((m) =>
          m.id === cid
            ? {
                ...m,
                id: data.id,
                status: "sent",
                // Swap to the public URL so reloads keep working after the
                // local blob URL is revoked.
                voice: { ...m.voice!, url: publicUrl || m.voice?.url }
              }
            : m
        )
      }
    }));
  },

  uploadAttachment: async (file) => {
    const me = useAuthStore.getState().user;
    if (!me) return null;
    // De-collide with a uuid prefix; keep extension so the browser MIME-sniffs
    // correctly and the audio/video tag knows what to do.
    const ext = file.name.includes(".")
      ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
      : "";
    const path = `${me.id}/${newId()}${ext}`;
    // Some browsers leave file.type empty (drag-drop of .mp3 from Windows
    // Explorer, for instance). Supabase then stamps the object as
    // application/octet-stream and <audio>/<video> reject playback with a
    // "Format error". Infer the type from the extension for common media.
    const mimeFromExt: Record<string, string> = {
      ".mp3": "audio/mpeg",
      ".m4a": "audio/mp4",
      ".aac": "audio/aac",
      ".ogg": "audio/ogg",
      ".opus": "audio/ogg",
      ".wav": "audio/wav",
      ".flac": "audio/flac",
      ".webm": "audio/webm",
      ".mp4": "video/mp4",
      ".mov": "video/quicktime",
      ".mkv": "video/x-matroska",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".pdf": "application/pdf"
    };
    const resolvedType = file.type || mimeFromExt[ext] || "application/octet-stream";
    const { data, error } = await supabase.storage
      .from("chat-attachments")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: resolvedType
      });
    if (error || !data) {
      // Supabase StorageError uses non-enumerable own properties, so a plain
      // `{ error }` log serializes to `{}`. Walk every own property name to
      // get the real payload.
      const errAny = error as unknown as Record<string, unknown> | null;
      const serialized = errAny
        ? Object.getOwnPropertyNames(errAny).reduce<Record<string, unknown>>((acc, k) => {
            acc[k] = errAny[k];
            return acc;
          }, {})
        : null;
      const msg =
        (errAny?.message as string | undefined) ||
        (errAny?.error as string | undefined) ||
        "";
      const hint =
        /not found|does not exist/i.test(msg) || (errAny?.statusCode as number) === 404
          ? "The `chat-attachments` bucket isn't created yet — re-run supabase/APPLY_PENDING.sql section 8 in the Supabase SQL editor."
          : (errAny?.statusCode as number) === 403 || /policy|denied|unauthorized/i.test(msg)
          ? "Bucket exists but RLS rejected the upload — re-run supabase/APPLY_PENDING.sql section 8 to install the storage policies."
          : null;
      console.error("[uploadAttachment] failed", {
        path,
        message: msg || "(empty)",
        statusCode: errAny?.statusCode,
        name: errAny?.name,
        code: errAny?.error,
        serialized,
        hint
      });
      return null;
    }
    const { data: pub } = supabase.storage.from("chat-attachments").getPublicUrl(data.path);
    return pub.publicUrl;
  },

  sendAttachment: async (chatId, p) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const { kind, content = "", scheduleAt, ...rest } = p as Partial<Message> & {
      kind: Message["kind"];
      content?: string;
      scheduleAt?: string;
    };
    const cid = newId();
    const now = new Date().toISOString();
    // Pull and clear the reply target up front so attachment sends thread off
    // the message the user was replying to.
    const replyTo = get().replyTargets[chatId] || null;
    if (replyTo) {
      set((s) => ({ replyTargets: { ...s.replyTargets, [chatId]: null } }));
    }
    // If a future scheduleAt is set, hold the message at status='scheduled'.
    // pg_cron flips it to 'sent' when due (see migration 20260601160000).
    const isScheduled =
      typeof scheduleAt === "string" && new Date(scheduleAt).getTime() > Date.now();
    const optimistic = {
      id: cid,
      chatId,
      authorId: me.id,
      kind,
      content,
      createdAt: now,
      status: isScheduled ? "scheduled" : "sending",
      scheduleAt: isScheduled ? scheduleAt : undefined,
      replyTo: replyTo || undefined,
      ...rest
    } as Message;
    set((s) => ({
      messages: { ...s.messages, [chatId]: [...(s.messages[chatId] ?? []), optimistic] }
    }));
    // Only include `schedule_at` in the insert when we're actually scheduling.
    // This keeps INSERTs working on databases where the schedule_at migration
    // hasn't been applied yet (column would otherwise be unknown → error).
    const insertRow: Record<string, unknown> = {
      chat_id: chatId,
      author_id: me.id,
      kind,
      content,
      status: isScheduled ? "scheduled" : "sent",
      payload: rest,
      client_id: cid
    };
    if (replyTo) insertRow.reply_to = replyTo;
    if (isScheduled) insertRow.schedule_at = scheduleAt;
    const { data, error } = await supabase
      .from("messages")
      .insert(insertRow)
      .select()
      .single();
    if (error || !data) {
      console.error("[sendAttachment] insert failed", {
        kind,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        rawError: error,
        insertRow
      });
      set((s) => ({
        messages: { ...s.messages, [chatId]: (s.messages[chatId] ?? []).filter((m) => m.id !== cid) }
      }));
      return;
    }
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] ?? []).map((m) =>
          m.id === cid
            ? { ...m, id: data.id, status: isScheduled ? "scheduled" : "sent" }
            : m
        )
      }
    }));
  },

  /* ----- read receipts ----- */

  markRead: async (chatId) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const now = new Date().toISOString();
    // Bump my last_read_at AND flip status of inbound messages to "read", so
    // both the unread badge (computed from last_read_at) and the per-message
    // read-receipt tick are accurate on the next reload.
    await Promise.all([
      supabase
        .from("chat_members")
        .update({ last_read_at: now })
        .eq("chat_id", chatId)
        .eq("user_id", me.id),
      supabase
        .from("messages")
        .update({ status: "read" })
        .eq("chat_id", chatId)
        .neq("author_id", me.id)
        .neq("status", "read")
    ]);
    set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c)) }));
  },

  markDelivered: async (_chatId, messageId) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    await supabase
      .from("messages")
      .update({ status: "delivered" })
      .eq("id", messageId)
      .neq("author_id", me.id)
      .eq("status", "sent");
  },

  /* ----- message actions ----- */

  toggleReaction: async (chatId, messageId, emoji) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const { data: existing } = await supabase
      .from("message_reactions")
      .select("id")
      .eq("message_id", messageId)
      .eq("user_id", me.id)
      .eq("emoji", emoji)
      .maybeSingle();
    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      await supabase
        .from("message_reactions")
        .insert({ message_id: messageId, user_id: me.id, emoji });
    }
    await refreshMessageReactions(messageId, chatId, set as never);
  },

  pinMessage: async (chatId, messageId) => {
    const cur = get().messages[chatId]?.find((m) => m.id === messageId);
    if (!cur) return;
    const next = !cur.pinned;
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] || []).map((m) =>
          m.id === messageId ? { ...m, pinned: next } : m
        )
      }
    }));
    await supabase.from("messages").update({ pinned: next }).eq("id", messageId);
  },

  removeMessages: async (chatId, ids) => {
    if (ids.length === 0) return;
    const prev = get().messages[chatId] || [];
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] || []).filter((m) => !ids.includes(m.id))
      }
    }));
    const { error } = await supabase.from("messages").delete().in("id", ids);
    if (error) {
      // Most likely cause: missing DELETE RLS policy on messages. Roll back
      // the optimistic removal so the user can see the message didn't actually
      // get deleted server-side.
      console.error("[removeMessages] delete failed", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      set((s) => ({ messages: { ...s.messages, [chatId]: prev } }));
    }
  },

  hideMessages: async (chatId, ids) => {
    const me = useAuthStore.getState().user;
    if (!me || ids.length === 0) return;
    // Optimistic local hide.
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] || []).filter((m) => !ids.includes(m.id))
      }
    }));
    await supabase
      .from("message_hidden_for")
      .insert(ids.map((mid) => ({ message_id: mid, user_id: me.id })));
  },

  votePoll: async (chatId, messageId, optionId) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const msg = get().messages[chatId]?.find((m) => m.id === messageId);
    if (!msg?.poll) return;
    const multi = !!msg.poll.multi;
    const updatedOptions = msg.poll.options.map((opt) => {
      let voters = opt.voters || [];
      if (opt.id === optionId) {
        voters = voters.includes(me.id) ? voters.filter((v) => v !== me.id) : [...voters, me.id];
      } else if (!multi) {
        voters = voters.filter((v) => v !== me.id);
      }
      return { ...opt, voters };
    });
    const newPoll = { ...msg.poll, options: updatedOptions };
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] || []).map((m) =>
          m.id === messageId ? { ...m, poll: newPoll } : m
        )
      }
    }));
    const { data: row } = await supabase
      .from("messages")
      .select("payload")
      .eq("id", messageId)
      .single();
    const merged = { ...((row?.payload as Record<string, unknown>) || {}), poll: newPoll };
    await supabase.from("messages").update({ payload: merged }).eq("id", messageId);
  },

  /* ----- chat actions ----- */

  startDM: async (userOrId) => {
    const u = typeof userOrId === "string" ? { id: userOrId } : userOrId;
    const me = useAuthStore.getState().user;
    if (!me) return { error: "Not authenticated" };
    const { data: existingId } = await supabase.rpc("find_dm_between_users", {
      user1_id: me.id,
      user2_id: u.id
    });
    if (existingId) {
      if (!get().chats.find((c) => c.id === existingId)) await get().fetchChats();
      get().setActiveChat(existingId);
      return { data: get().chats.find((c) => c.id === existingId) };
    }
    const { data: chat } = await supabase
      .from("chats")
      .insert({ type: "dm", created_by: me.id })
      .select()
      .single();
    if (!chat) return { error: "Failed" };
    await supabase.from("chat_members").insert([
      { chat_id: chat.id, user_id: me.id, role: "owner" },
      { chat_id: chat.id, user_id: u.id, role: "member" }
    ]);
    const newChat: Chat = {
      id: chat.id,
      type: "dm",
      name: u.name ?? "Chat",
      avatar: u.avatar,
      memberIds: [me.id, u.id],
      membersCount: 2
    };
    set((s) => ({ chats: [newChat, ...s.chats] }));
    get().setActiveChat(chat.id);
    return { data: newChat };
  },

  addGroup: async ({ name, description, memberIds = [], banner, avatar }) => {
    const me = useAuthStore.getState().user;
    if (!me) throw new Error("Not authenticated");
    const { data: chat, error } = await supabase
      .from("chats")
      .insert({ type: "group", name, description, banner, avatar, created_by: me.id })
      .select()
      .single();
    if (!chat || error) throw new Error(error?.message ?? "Failed to create group");
    const memberRows = [
      { chat_id: chat.id, user_id: me.id, role: "owner" },
      ...memberIds.filter((id) => id !== me.id).map((id) => ({ chat_id: chat.id, user_id: id, role: "member" }))
    ];
    await supabase.from("chat_members").insert(memberRows);
    const newChat: Chat = {
      id: chat.id,
      type: "group",
      name,
      description,
      banner,
      avatar,
      memberIds: memberRows.map((m) => m.user_id),
      membersCount: memberRows.length
    };
    set((s) => ({ chats: [newChat, ...s.chats] }));
    return newChat;
  },

  addMembers: async (chatId, userIds) => {
    if (userIds.length === 0) return;
    const rows = userIds.map((id) => ({ chat_id: chatId, user_id: id, role: "member" }));
    await supabase.from("chat_members").insert(rows);
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === chatId
          ? {
              ...c,
              memberIds: Array.from(new Set([...(c.memberIds || []), ...userIds])),
              membersCount: (c.membersCount ?? 0) + userIds.length
            }
          : c
      )
    }));
  },

  removeMembers: async (chatId, userIds) => {
    if (userIds.length === 0) return;
    await supabase.from("chat_members").delete().eq("chat_id", chatId).in("user_id", userIds);
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === chatId
          ? {
              ...c,
              memberIds: (c.memberIds || []).filter((id) => !userIds.includes(id)),
              membersCount: Math.max(0, (c.membersCount ?? 0) - userIds.length)
            }
          : c
      )
    }));
  },

  pinChat: async (chatId, pinned) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const prev = get().chats;
    set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, pinned } : c)) }));
    const { error } = await supabase
      .from("chat_members")
      .update({ pinned })
      .eq("chat_id", chatId)
      .eq("user_id", me.id);
    if (error) {
      // Roll back so the UI matches the DB. The most common cause is the
      // missing chat_members UPDATE RLS policy (re-run APPLY_PENDING.sql
      // section 12 to install it).
      console.error("[pinChat] update failed", {
        message: (error as unknown as { message?: string }).message,
        code: (error as unknown as { code?: string }).code,
        hint: "Run supabase/APPLY_PENDING.sql section 12 to add the chat_members UPDATE policy."
      });
      set({ chats: prev });
    }
  },

  muteChat: async (chatId, muted) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const prev = get().chats;
    set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, muted } : c)) }));
    const { error } = await supabase
      .from("chat_members")
      .update({ muted })
      .eq("chat_id", chatId)
      .eq("user_id", me.id);
    if (error) {
      console.error("[muteChat] update failed", {
        message: (error as unknown as { message?: string }).message,
        code: (error as unknown as { code?: string }).code,
        hint: "Run supabase/APPLY_PENDING.sql section 12 to add the chat_members UPDATE policy."
      });
      set({ chats: prev });
    }
  },

  favouriteChat: async (chatId, favorite) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const prev = get().chats;
    set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, favorite } : c)) }));
    const { error } = await supabase
      .from("chat_members")
      .update({ favorite })
      .eq("chat_id", chatId)
      .eq("user_id", me.id);
    if (error) {
      console.error("[favouriteChat] update failed", {
        message: (error as unknown as { message?: string }).message,
        code: (error as unknown as { code?: string }).code,
        hint: "Run supabase/APPLY_PENDING.sql section 12 to add the chat_members UPDATE policy."
      });
      set({ chats: prev });
    }
  },

  clearChat: async (chatId) => {
    set((s) => ({
      messages: { ...s.messages, [chatId]: [] },
      chats: s.chats.map((c) =>
        c.id === chatId ? { ...c, lastMessage: "", lastMessageAt: undefined, unread: 0 } : c
      )
    }));
    await supabase.from("messages").delete().eq("chat_id", chatId);
  },

  removeChat: async (chatId) => {
    set((s) => {
      const { [chatId]: _drop, ...rest } = s.messages;
      return { chats: s.chats.filter((c) => c.id !== chatId), messages: rest };
    });
    await supabase.from("chats").delete().eq("id", chatId);
  },

  fetchBlocked: async () => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const [outgoing, incoming] = await Promise.all([
      supabase
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", me.id),
      // Incoming blocks (users who have blocked ME) — requires the section
      // 14 SELECT policy. Errors are non-fatal; we just default to "nobody
      // has blocked me" so the rest of the UI still functions.
      supabase
        .from("blocked_users")
        .select("blocker_id")
        .eq("blocked_id", me.id)
    ]);
    set({
      blockedIds: (outgoing.data || []).map((r: { blocked_id: string }) => r.blocked_id),
      blockedMeIds: (incoming.data || []).map((r: { blocker_id: string }) => r.blocker_id)
    });
  },

  blockUser: async (userId) => {
    const me = useAuthStore.getState().user;
    if (!me || userId === me.id) return;
    set((s) => ({ blockedIds: Array.from(new Set([...s.blockedIds, userId])) }));
    await supabase
      .from("blocked_users")
      .insert({ blocker_id: me.id, blocked_id: userId });
  },

  unblockUser: async (userId) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    set((s) => ({ blockedIds: s.blockedIds.filter((id) => id !== userId) }));
    await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", me.id)
      .eq("blocked_id", userId);
  },

  /* ----- calls integration ----- */

  scheduleCallWith: async (userIds, invite) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    for (const uid of userIds) {
      if (uid === me.id) continue;
      const { data: existingId } = await supabase.rpc("find_dm_between_users", {
        user1_id: me.id,
        user2_id: uid
      });
      let chatId = existingId as string | null;
      if (!chatId) {
        const { data: chat } = await supabase
          .from("chats")
          .insert({ type: "dm", created_by: me.id })
          .select()
          .single();
        if (!chat) continue;
        await supabase.from("chat_members").insert([
          { chat_id: chat.id, user_id: me.id, role: "owner" },
          { chat_id: chat.id, user_id: uid, role: "member" }
        ]);
        chatId = chat.id;
      }
      const schedule = {
        whenIso: invite.whenIso,
        message: invite.title || "Join call",
        callInvite: {
          callId: invite.callId,
          video: invite.video,
          title: invite.title,
          endsAtIso: invite.endsAtIso
        }
      };
      await supabase.from("messages").insert({
        chat_id: chatId,
        author_id: me.id,
        kind: "schedule",
        content: invite.title || "Scheduled call",
        status: "sent",
        payload: { schedule },
        client_id: newId()
      });
    }
  },

  joinCommunity: async (community) => {
    // Communities don't (yet) have a dedicated table — create a group chat
    // mirroring the community for now.
    const me = useAuthStore.getState().user;
    if (!me) throw new Error("Not authenticated");
    return get().addGroup({ name: community.name || "Community", avatar: community.cover });
  },

  /* ----- demo ----- */

  clearAll: () =>
    set({
      chats: [],
      messages: {},
      activeChatId: null,
      hasInitialLoaded: false
    })
}));
