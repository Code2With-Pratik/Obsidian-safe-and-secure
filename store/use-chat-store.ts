"use client";

import { create } from "zustand";
import type { Chat, Message } from "@/types";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useAuthStore } from "./use-auth-store";

const supabase = createClient();

// uuid generator — falls back to a Math.random-based one only when
// `crypto.randomUUID` isn't available (very old browsers).
const newId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

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

  presenceChannel: RealtimeChannel | null;
  messageChannel: RealtimeChannel | null;
  reactionChannel: RealtimeChannel | null;
  chatChannel: RealtimeChannel | null;
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
  sendVoice: (chatId: string, durationSec: number, waveform: number[]) => Promise<void>;
  sendAttachment: (
    chatId: string,
    payload: Partial<Message> & { kind: Message["kind"]; content?: string }
  ) => Promise<void>;

  /* ----- read receipts ----- */
  markRead: (chatId: string) => Promise<void>;
  markDelivered: (chatId: string, messageId: string) => Promise<void>;

  /* ----- message actions ----- */
  toggleReaction: (chatId: string, messageId: string, emoji: string) => Promise<void>;
  pinMessage: (chatId: string, messageId: string) => Promise<void>;
  removeMessages: (chatId: string, messageIds: string[]) => Promise<void>;
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

  presenceChannel: null,
  messageChannel: null,
  reactionChannel: null,
  chatChannel: null,
  hasInitialLoaded: false,

  /* ----- realtime ----- */

  initializeRealtime: () => {
    const me = useAuthStore.getState().user;
    if (!me) return;

    // Presence (online + typing)
    if (!get().presenceChannel) {
      const channel = supabase
        .channel("nova_presence_v1")
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const meId = useAuthStore.getState().user?.id;
          const online: string[] = [];
          const typing: Record<string, string[]> = {};
          Object.values(state).forEach((presences) => {
            (presences as Array<Record<string, unknown>>).forEach((p) => {
              const uid = p.user_id as string | undefined;
              if (!uid || uid === meId) return;
              online.push(uid);
              if (p.is_typing && p.typing_in) {
                const k = p.typing_in as string;
                if (!typing[k]) typing[k] = [];
                typing[k].push(uid);
              }
            });
          });
          set({ onlineUsers: Array.from(new Set(online)), typing });
        });
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: me.id,
            is_typing: false,
            typing_in: null,
            online_at: new Date().toISOString()
          });
        }
      });
      set({ presenceChannel: channel });
    }

    // Messages — INSERT / UPDATE / DELETE
    if (!get().messageChannel) {
      const channel = supabase
        .channel(`nova_msgs_${me.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          (payload) => {
            const row = (payload.new || payload.old) as Record<string, unknown>;
            const chatId = row.chat_id as string;
            if (!chatId) return;

            if (payload.eventType === "INSERT") {
              const incoming = rowToMessage(row);
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
              set((s) => ({
                messages: {
                  ...s.messages,
                  [chatId]: (s.messages[chatId] || []).map((m) =>
                    m.id === next.id ? { ...m, ...next } : m
                  )
                }
              }));
            } else if (payload.eventType === "DELETE") {
              const id = (payload.old as Record<string, unknown>).id as string;
              set((s) => ({
                messages: {
                  ...s.messages,
                  [chatId]: (s.messages[chatId] || []).filter((m) => m.id !== id)
                }
              }));
            }
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

    // Chats — keep the list in sync when a chat is deleted elsewhere.
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
        .subscribe();
      set({ chatChannel: channel });
    }
  },

  disconnectRealtime: () => {
    const { presenceChannel, messageChannel, reactionChannel, chatChannel } = get();
    if (presenceChannel) supabase.removeChannel(presenceChannel);
    if (messageChannel) supabase.removeChannel(messageChannel);
    if (reactionChannel) supabase.removeChannel(reactionChannel);
    if (chatChannel) supabase.removeChannel(chatChannel);
    set({
      presenceChannel: null,
      messageChannel: null,
      reactionChannel: null,
      chatChannel: null
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
      if (c.type === "dm") {
        const other = members.find((m) => m.user_id !== me.id);
        const p = other ? (pMap.get(other.user_id) as { name?: string; username?: string; avatar?: string } | undefined) : undefined;
        if (p) {
          name = p.name || p.username;
          avatar = p.avatar;
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
        favorite: mine?.favorite ?? false
      };
    });
    set({ chats: formatted, hasInitialLoaded: true });
  },

  fetchMessages: async (chatId) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });
    if (!data) return;
    const msgs = (data as Record<string, unknown>[]).map(rowToMessage);

    // Hydrate reactions in one round-trip.
    const ids = msgs.map((m) => m.id);
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
    const channel = get().presenceChannel;
    if (!me || !channel) return;
    await channel.track({
      user_id: me.id,
      is_typing: isTyping,
      typing_in: isTyping ? chatId : null,
      online_at: new Date().toISOString()
    });
  },

  setActiveChat: (id) => {
    set({ activeChatId: id });
    if (id) {
      void get().markRead(id);
      void get().fetchMessages(id);
    }
  },

  /* ----- sending ----- */

  sendMessage: async (chatId, content) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const cid = newId();
    const now = new Date().toISOString();
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
            status: "sending"
          }
        ]
      }
    }));
    const { data, error } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        author_id: me.id,
        kind: "text",
        content,
        status: "sent",
        client_id: cid
      })
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

  sendVoice: async (chatId, durationSec, waveform) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const cid = newId();
    const now = new Date().toISOString();
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
            voice: { durationSec, waveform }
          }
        ]
      }
    }));
    const { data, error } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        author_id: me.id,
        kind: "voice",
        content: "",
        status: "sent",
        payload: { voice: { durationSec, waveform } },
        client_id: cid
      })
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

  sendAttachment: async (chatId, p) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const { kind, content = "", ...rest } = p;
    const cid = newId();
    const now = new Date().toISOString();
    const optimistic = {
      id: cid,
      chatId,
      authorId: me.id,
      kind,
      content,
      createdAt: now,
      status: "sending" as const,
      ...rest
    } as Message;
    set((s) => ({
      messages: { ...s.messages, [chatId]: [...(s.messages[chatId] ?? []), optimistic] }
    }));
    const { data, error } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        author_id: me.id,
        kind,
        content,
        status: "sent",
        payload: rest,
        client_id: cid
      })
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

  /* ----- read receipts ----- */

  markRead: async (chatId) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    await supabase
      .from("messages")
      .update({ status: "read" })
      .eq("chat_id", chatId)
      .neq("author_id", me.id)
      .neq("status", "read");
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
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] || []).filter((m) => !ids.includes(m.id))
      }
    }));
    await supabase.from("messages").delete().in("id", ids);
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
    set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, pinned } : c)) }));
    await supabase
      .from("chat_members")
      .update({ pinned })
      .eq("chat_id", chatId)
      .eq("user_id", me.id);
  },

  muteChat: async (chatId, muted) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, muted } : c)) }));
    await supabase
      .from("chat_members")
      .update({ muted })
      .eq("chat_id", chatId)
      .eq("user_id", me.id);
  },

  favouriteChat: async (chatId, favorite) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, favorite } : c)) }));
    await supabase
      .from("chat_members")
      .update({ favorite })
      .eq("chat_id", chatId)
      .eq("user_id", me.id);
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
