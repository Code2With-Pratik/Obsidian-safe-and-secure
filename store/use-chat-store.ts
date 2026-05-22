"use client";

import { create } from "zustand";
import { chats as seedChats, messagesByChat as seedMsgs, users } from "@/lib/mock-data";
import type { Chat, Community, Message } from "@/types";

interface ChatState {
  chats: Chat[];
  messages: Record<string, Message[]>;
  activeChatId: string | null;
  setActiveChat: (id: string | null) => void;
  sendMessage: (chatId: string, content: string) => void;
  toggleReaction: (chatId: string, messageId: string, emoji: string) => void;
  pinMessage: (chatId: string, messageId: string) => void;
  removeMessages: (chatId: string, messageIds: string[]) => void;
  markRead: (chatId: string) => void;
  addGroup: (
    group: Pick<Chat, "name" | "description" | "memberIds" | "banner" | "avatar">
  ) => Chat;
  startDM: (userId: string) => Chat;
  joinCommunity: (community: Community) => Chat;
  removeChat: (chatId: string) => void;
  clearAll: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: seedChats,
  messages: seedMsgs,
  activeChatId: "c1",

  setActiveChat: (id) => {
    set({ activeChatId: id });
    if (id) get().markRead(id);
  },

  sendMessage: (chatId, content) => {
    const m: Message = {
      id: `m-${Date.now()}`,
      chatId,
      authorId: "me",
      kind: "text",
      content,
      createdAt: new Date().toISOString(),
      status: "sending"
    };
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: [...(s.messages[chatId] ?? []), m]
      },
      chats: s.chats.map((c) =>
        c.id === chatId ? { ...c, lastMessage: content, lastMessageAt: m.createdAt } : c
      )
    }));
    setTimeout(() => {
      set((s) => ({
        messages: {
          ...s.messages,
          [chatId]: (s.messages[chatId] ?? []).map((x) =>
            x.id === m.id ? { ...x, status: "delivered" } : x
          )
        }
      }));
    }, 700);
  },

  toggleReaction: (chatId, messageId, emoji) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] ?? []).map((m) => {
          if (m.id !== messageId) return m;
          const existing = m.reactions?.find((r) => r.emoji === emoji);
          let reactions = m.reactions ?? [];
          if (existing) {
            reactions = reactions
              .map((r) =>
                r.emoji === emoji
                  ? { ...r, count: r.count + (r.byMe ? -1 : 1), byMe: !r.byMe }
                  : r
              )
              .filter((r) => r.count > 0);
          } else {
            reactions = [...reactions, { emoji, count: 1, byMe: true }];
          }
          return { ...m, reactions };
        })
      }
    })),

  pinMessage: (chatId, messageId) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] ?? []).map((m) =>
          m.id === messageId ? { ...m, pinned: !m.pinned } : m
        )
      }
    })),

  removeMessages: (chatId, messageIds) => {
    if (messageIds.length === 0) return;
    const idSet = new Set(messageIds);
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] ?? []).filter((m) => !idSet.has(m.id))
      }
    }));
  },

  markRead: (chatId) =>
    set((s) => ({
      chats: s.chats.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c))
    })),

  addGroup: (group) => {
    const id = `g-${Date.now()}`;
    const newChat: Chat = {
      id,
      type: "group",
      name: group.name,
      avatar:
        group.avatar ??
        `https://api.dicebear.com/9.x/notionists/svg?backgroundType=gradientLinear&backgroundColor=8b5cf6,ec4899,22d3ee,a3e635,fbbf24,fb923c,60a5fa,f472b6&radius=18&seed=${encodeURIComponent(group.name)}`,
      banner: group.banner,
      description: group.description,
      memberIds: ["me", ...(group.memberIds ?? [])],
      membersCount: 1 + (group.memberIds?.length ?? 0),
      lastMessage: `You created the group · welcome ✨`,
      lastMessageAt: new Date().toISOString(),
      pinned: false,
      online: false
    };
    set((s) => ({
      chats: [newChat, ...s.chats],
      messages: {
        ...s.messages,
        [id]: [
          {
            id: `m-sys-${Date.now()}`,
            chatId: id,
            authorId: "me",
            kind: "system",
            content: `${group.name} is live · ${(group.memberIds?.length ?? 0) + 1} members joined`,
            createdAt: new Date().toISOString()
          }
        ]
      }
    }));
    return newChat;
  },

  startDM: (userId) => {
    const existing = get().chats.find(
      (c) => c.type === "dm" && c.memberIds?.includes(userId)
    );
    if (existing) {
      get().setActiveChat(existing.id);
      return existing;
    }
    const u = users.find((x) => x.id === userId);
    if (!u) {
      throw new Error(`Unknown user ${userId}`);
    }
    const id = `dm-${Date.now()}`;
    const newChat: Chat = {
      id,
      type: "dm",
      name: u.name,
      avatar: u.avatar,
      memberIds: ["me", u.id],
      lastMessage: "Say hi 👋",
      lastMessageAt: new Date().toISOString(),
      online: u.status === "online"
    };
    set((s) => ({
      chats: [newChat, ...s.chats],
      messages: {
        ...s.messages,
        [id]: [
          {
            id: `m-sys-${Date.now()}`,
            chatId: id,
            authorId: "me",
            kind: "system",
            content: `You connected with ${u.name}`,
            createdAt: new Date().toISOString()
          }
        ]
      }
    }));
    return newChat;
  },

  joinCommunity: (community) => {
    const existing = get().chats.find(
      (c) => c.type === "channel" && c.name === community.name
    );
    if (existing) {
      get().setActiveChat(existing.id);
      return existing;
    }
    const id = `co-${community.id}-${Date.now()}`;
    const newChat: Chat = {
      id,
      type: "channel",
      name: community.name,
      avatar: community.cover,
      banner: community.cover,
      description: `${community.category} community · ${community.members.toLocaleString()} members`,
      membersCount: community.members,
      lastMessage: `You joined ${community.name} ✨`,
      lastMessageAt: new Date().toISOString(),
      online: true,
      pinned: false
    };
    set((s) => ({
      chats: [newChat, ...s.chats],
      messages: {
        ...s.messages,
        [id]: [
          {
            id: `m-sys-${Date.now()}`,
            chatId: id,
            authorId: "me",
            kind: "system",
            content: `Welcome to ${community.name} · ${community.online.toLocaleString()} online now`,
            createdAt: new Date().toISOString()
          }
        ]
      }
    }));
    return newChat;
  },

  removeChat: (chatId) =>
    set((s) => {
      const { [chatId]: _removed, ...rest } = s.messages;
      return {
        chats: s.chats.filter((c) => c.id !== chatId),
        messages: rest,
        activeChatId: s.activeChatId === chatId ? null : s.activeChatId
      };
    }),

  clearAll: () =>
    set({
      chats: [],
      messages: {},
      activeChatId: null
    })
}));
