"use client";

import { create } from "zustand";
import { chats as seedChats, messagesByChat as seedMsgs, users } from "@/lib/mock-data";
import type { Chat, Community, Message, User } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

const supabase = createClient();

interface ChatState {
  chats: Chat[];
  messages: Record<string, Message[]>;
  activeChatId: string | null;
  typing: Record<string, string[]>; // chatId -> userIds
  onlineUsers: string[]; // userIds
  channels: Record<string, RealtimeChannel>;
  
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  subscribeToChat: (chatId: string) => void;
  unsubscribeFromChat: (chatId: string) => void;
  setTyping: (chatId: string, isTyping: boolean) => void;
  
  setActiveChat: (id: string | null) => void;
  sendMessage: (chatId: string, content: string) => Promise<void>;
  sendVoice: (chatId: string, durationSec: number, waveform: number[]) => Promise<void>;
  sendAttachment: (
    chatId: string,
    payload: Partial<Message> & { kind: Message["kind"]; content?: string }
  ) => Promise<void>;
  votePoll: (chatId: string, messageId: string, optionId: string) => void;
  toggleReaction: (chatId: string, messageId: string, emoji: string) => void;
  pinMessage: (chatId: string, messageId: string) => void;
  removeMessages: (chatId: string, messageIds: string[]) => void;
  markRead: (chatId: string) => void;
  addGroup: (
    group: Pick<Chat, "name" | "description" | "memberIds" | "banner" | "avatar">
  ) => Chat;
  startDM: (user: any) => Chat;
  joinCommunity: (community: Community) => Chat;
  scheduleCallWith: (
    userIds: string[],
    invite: {
      whenIso: string;
      endsAtIso?: string;
      title: string;
      video: boolean;
    }
  ) => void;
  removeChat: (chatId: string) => void;
  clearAll: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  messages: {},
  activeChatId: null,
  typing: {},
  onlineUsers: [],
  channels: {},

  fetchChats: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('chats')
      .select(`
        *,
        chat_members!inner(user_id),
        all_members:chat_members(user_id, role, last_read_at)
      `)
      .eq('chat_members.user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formattedChats: Chat[] = data.map((c: any) => ({
        id: c.id,
        type: c.type,
        name: c.name || 'Chat',
        avatar: c.avatar,
        description: c.description,
        banner: c.banner,
        memberIds: c.all_members?.map((m: any) => m.user_id) || [],
        // We'll fetch last message separately or use a view later
      }));
      set({ chats: formattedChats });
    }
  },

  fetchMessages: async (chatId) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const formattedMessages: Message[] = data.map((m: any) => ({
        id: m.id,
        chatId: m.chat_id,
        authorId: m.author_id,
        kind: m.kind,
        content: m.content || '',
        createdAt: m.created_at,
        pinned: m.pinned,
        replyTo: m.reply_to,
        ...m.payload
      }));
      set((s) => ({
        messages: { ...s.messages, [chatId]: formattedMessages }
      }));
    }
  },

  subscribeToChat: (chatId) => {
    if (get().channels[chatId]) return;

    const channel = supabase.channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const m = payload.new as any;
          const newMessage: Message = {
            id: m.id,
            chatId: m.chat_id,
            authorId: m.author_id,
            kind: m.kind,
            content: m.content || '',
            createdAt: m.created_at,
            pinned: m.pinned,
            replyTo: m.reply_to,
            status: 'delivered',
            ...m.payload
          };
          
          set((s) => {
            const chatMessages = s.messages[chatId] || [];
            if (chatMessages.some(x => x.id === newMessage.id)) return s;
            return {
              messages: {
                ...s.messages,
                [chatId]: [...chatMessages, newMessage]
              },
              chats: s.chats.map(c => 
                c.id === chatId ? { ...c, lastMessage: newMessage.content, lastMessageAt: newMessage.createdAt } : c
              )
            };
          });
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const usersTyping: string[] = [];
        const usersOnline: string[] = [];

        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.is_typing) usersTyping.push(p.user_id);
            usersOnline.push(p.user_id);
          });
        });

        set((s) => ({
          typing: { ...s.typing, [chatId]: Array.from(new Set(usersTyping)) },
          onlineUsers: Array.from(new Set([...s.onlineUsers, ...usersOnline]))
        }));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await channel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
            });
          }
        }
      });

    set((s) => ({
      channels: { ...s.channels, [chatId]: channel }
    }));
  },

  unsubscribeFromChat: (chatId) => {
    const channel = get().channels[chatId];
    if (channel) {
      channel.unsubscribe();
      set((s) => {
        const { [chatId]: _, ...rest } = s.channels;
        return { channels: rest };
      });
    }
  },

  setTyping: async (chatId, isTyping) => {
    const channel = get().channels[chatId];
    if (!channel) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await channel.track({
      user_id: user.id,
      is_typing: isTyping,
      online_at: new Date().toISOString(),
    });
  },

  setActiveChat: (id) => {
    const oldId = get().activeChatId;
    if (oldId) get().unsubscribeFromChat(oldId);
    
    set({ activeChatId: id });
    if (id) {
      get().markRead(id);
      get().fetchMessages(id);
      get().subscribeToChat(id);
    }
  },

  sendMessage: async (chatId, content) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const tempId = `m-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      chatId,
      authorId: user.id,
      kind: "text",
      content,
      createdAt: new Date().toISOString(),
      status: "sending"
    };

    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: [...(s.messages[chatId] ?? []), optimisticMessage]
      }
    }));

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        author_id: user.id,
        kind: 'text',
        content,
      })
      .select()
      .single();

    if (error) {
      // Handle error (e.g. show toast)
      return;
    }

    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] ?? []).map((x) =>
          x.id === tempId ? { ...x, id: data.id, status: "sent" } : x
        )
      }
    }));
  },

  sendVoice: async (chatId, durationSec, waveform) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const tempId = `m-${Date.now()}`;
    const m: Message = {
      id: tempId,
      chatId,
      authorId: user.id,
      kind: "voice",
      content: "",
      createdAt: new Date().toISOString(),
      status: "sending",
      voice: { durationSec, waveform }
    };
    
    set((s) => ({
      messages: { ...s.messages, [chatId]: [...(s.messages[chatId] ?? []), m] }
    }));

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        author_id: user.id,
        kind: 'voice',
        payload: { voice: { durationSec, waveform } }
      })
      .select()
      .single();

    if (!error && data) {
      set((s) => ({
        messages: {
          ...s.messages,
          [chatId]: (s.messages[chatId] ?? []).map((x) =>
            x.id === tempId ? { ...x, id: data.id, status: "sent" } : x
          )
        }
      }));
    }
  },

  sendAttachment: async (chatId, payload) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const tempId = `m-${Date.now()}`;
    const m: Message = {
      id: tempId,
      chatId,
      authorId: user.id,
      content: payload.content ?? "",
      createdAt: new Date().toISOString(),
      status: "sending",
      ...payload
    } as Message;

    set((s) => ({
      messages: { ...s.messages, [chatId]: [...(s.messages[chatId] ?? []), m] }
    }));

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        author_id: user.id,
        kind: payload.kind,
        content: payload.content,
        payload: payload // Spread rest of payload into JSONB column
      })
      .select()
      .single();

    if (!error && data) {
      set((s) => ({
        messages: {
          ...s.messages,
          [chatId]: (s.messages[chatId] ?? []).map((x) =>
            x.id === tempId ? { ...x, id: data.id, status: "sent" } : x
          )
        }
      }));
    }
  },

  votePoll: (chatId, messageId, optionId) => {
    set((s) => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] ?? []).map((m) => {
          if (m.id !== messageId || !m.poll) return m;
          const multi = !!m.poll.multi;
          const nextOptions = m.poll.options.map((opt) => {
            const had = opt.voters.includes("me");
            if (opt.id === optionId) {
              return {
                ...opt,
                voters: had ? opt.voters.filter((v) => v !== "me") : [...opt.voters, "me"]
              };
            }
            // single-select polls clear my vote from other options
            if (!multi && had) {
              return { ...opt, voters: opt.voters.filter((v) => v !== "me") };
            }
            return opt;
          });
          return { ...m, poll: { ...m.poll, options: nextOptions } };
        })
      }
    }));
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

  startDM: async (u) => {
    const { data: { user: me } } = await supabase.auth.getUser();
    if (!me) return { error: 'Not authenticated' };

    const existing = get().chats.find(
      (c) => c.type === "dm" && c.memberIds?.includes(u.id)
    );
    if (existing) {
      get().setActiveChat(existing.id);
      return { data: existing };
    }

    // Create new DM in DB
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        type: 'dm',
        name: u.name,
        avatar: u.avatar,
        created_by: me.id
      })
      .select()
      .single();

    if (chatError) return { error: chatError.message };
    if (!chat) return { error: 'Failed to create chat' };

    // Add members
    const { error: memberError } = await supabase.from('chat_members').insert([
      { chat_id: chat.id, user_id: me.id, role: 'owner' },
      { chat_id: chat.id, user_id: u.id, role: 'member' }
    ]);

    if (memberError) return { error: memberError.message };

    const newChat: Chat = {
      id: chat.id,
      type: "dm",
      name: u.name,
      avatar: u.avatar,
      memberIds: [me.id, u.id],
      lastMessage: "Say hi 👋",
      lastMessageAt: new Date().toISOString(),
      online: u.status === "online"
    };

    set((s) => ({
      chats: [newChat, ...s.chats],
    }));

    get().setActiveChat(chat.id);
    return { data: newChat };
  },

  scheduleCallWith: (userIds, invite) => {
    // One shared `callId` for every invitee's copy of the same call. The
    // Upcoming list dedupes by this id so a 5-person schedule shows ONE
    // upcoming entry — not five.
    const callId = `call-${Date.now()}`;
    const createdAt = new Date().toISOString();
    for (const userId of userIds) {
      const chat = get().startDM(userId);
      const msg: Message = {
        id: `m-${callId}-${userId}`,
        chatId: chat.id,
        authorId: "me",
        kind: "schedule",
        content: invite.title,
        createdAt,
        status: "sent",
        schedule: {
          whenIso: invite.whenIso,
          message: invite.title,
          callInvite: {
            callId,
            video: invite.video,
            title: invite.title,
            endsAtIso: invite.endsAtIso,
            participantIds: ["me", ...userIds]
          }
        }
      };
      set((s) => ({
        messages: {
          ...s.messages,
          [chat.id]: [...(s.messages[chat.id] ?? []), msg]
        },
        chats: s.chats.map((c) =>
          c.id === chat.id
            ? {
                ...c,
                lastMessage: `📞 ${invite.title}`,
                lastMessageAt: msg.createdAt
              }
            : c
        )
      }));
    }
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

/** One-line summary of a rich message for the chat-list "lastMessage" cell. */
function previewFor(m: Message): string {
  switch (m.kind) {
    case "image":    return "🖼 Photo";
    case "video":    return "🎬 Video";
    case "audio":    return `🎵 ${m.audio?.name ?? "Audio"}`;
    case "voice":    return `🎤 Voice · ${m.voice?.durationSec ?? 0}s`;
    case "file":     return `📄 ${m.file?.name ?? "Document"}`;
    case "sticker":  return "🌟 Sticker";
    case "gif":      return "🎞 GIF";
    case "poll":     return `📊 ${m.poll?.question ?? "Poll"}`;
    case "contact": {
      const n = m.contacts?.length ?? 0;
      return n > 1 ? `👤 ${n} contacts` : `👤 ${m.contacts?.[0]?.name ?? "Contact"}`;
    }
    case "location": return m.location?.live ? "🛰 Live location" : "📍 Location";
    case "schedule": return `⏰ Scheduled`;
    default:         return m.content || "Message";
  }
}
