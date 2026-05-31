"use client";

import { create } from "zustand";
import type { Chat, Community, Message, User } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useAuthStore } from "./use-auth-store";

const supabase = createClient();

interface ChatState {
  chats: Chat[];
  messages: Record<string, Message[]>;
  activeChatId: string | null;
  typing: Record<string, string[]>;
  onlineUsers: string[];
  channels: Record<string, RealtimeChannel>;
  globalChannel: RealtimeChannel | null;
  
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  subscribeToChat: (chatId: string) => void;
  subscribeToUserChats: () => void;
  subscribeToGlobalPresence: () => void;
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
  markDelivered: (chatId: string, messageId: string) => Promise<void>;
  addGroup: (
    group: Pick<Chat, "name" | "description" | "memberIds" | "banner" | "avatar">
  ) => Chat;
  startDM: (user: any) => Promise<{ data?: Chat; error?: string }>;
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
  globalChannel: null,

  subscribeToUserChats: () => {
    const meId = useAuthStore.getState().user?.id;
    const channelId = `user_chats:${meId}`;
    if (!meId || get().channels[channelId]) return;

    console.log(`[Realtime] Listening for new chat memberships for: ${meId}`);
    
    const channel = supabase.channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_members',
          filter: `user_id=eq.${meId}`
        },
        () => {
          console.log("[Realtime] New chat membership detected, refreshing chats...");
          get().fetchChats();
        }
      )
      .subscribe();

    set((s) => ({
      channels: { ...s.channels, [channelId]: channel }
    }));
  },

  subscribeToGlobalPresence: () => {
    if (get().globalChannel) return;

    const channel = supabase.channel('global_presence')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const meId = useAuthStore.getState().user?.id;
        const usersOnline: string[] = [];

        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.user_id && p.user_id !== meId) {
              usersOnline.push(p.user_id);
            }
          });
        });
        set({ onlineUsers: Array.from(new Set(usersOnline)) });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const me = useAuthStore.getState().user;
          if (me) {
            await channel.track({
              user_id: me.id,
              online_at: new Date().toISOString(),
            });
          }
        }
      });

    set({ globalChannel: channel });
  },

  fetchChats: async () => {
    const me = useAuthStore.getState().user;
    if (!me) return;

    // 1. Fetch chats and members with profile join
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select(`
        *,
        members:chat_members(
          user_id,
          role,
          profiles:profiles(*)
        )
      `)
      .order('created_at', { ascending: false });

    if (chatsError) {
      console.error("[DB] Error fetching chats:", chatsError.message);
      return;
    }

    if (chatsData) {
      const userChats = chatsData.filter(c => 
        c.members?.some((m: any) => m.user_id === me.id)
      );

      const chatMap = new Map<string, Chat>();
      userChats.forEach((c: any) => {
        let name = c.name;
        let avatar = c.avatar;
        
        if (c.type === 'dm') {
          const otherMember = c.members?.find((m: any) => m.user_id !== me.id);
          const profile = otherMember?.profiles;
          if (profile) {
            name = profile.name || profile.username;
            avatar = profile.avatar;
          }
        }

        chatMap.set(c.id, {
          id: c.id,
          type: c.type,
          name: name || 'Chat',
          avatar: avatar,
          description: c.description,
          banner: c.banner,
          memberIds: c.members?.map((m: any) => m.user_id) || [],
          lastMessage: c.last_message,
          lastMessageAt: c.last_message_at,
          online: false
        });
      });

      const sortedChats = Array.from(chatMap.values());
      set({ chats: sortedChats });

      // 6. Subscribe to all relevant rooms
      sortedChats.forEach(chat => get().subscribeToChat(chat.id));
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
        status: m.status || 'delivered',
        ...m.payload
      }));
      set((s) => ({
        messages: { ...s.messages, [chatId]: formattedMessages }
      }));
    }
  },

  markDelivered: async (chatId, messageId) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    await supabase
      .from('messages')
      .update({ status: 'delivered' })
      .eq('id', messageId)
      .neq('author_id', me.id)
      .eq('status', 'sent');
  },

  subscribeToChat: (chatId) => {
    if (get().channels[chatId]) return;

    const channel = supabase.channel(`room:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          const m = (payload.new || payload.old) as any;
          if (m.chat_id !== chatId) return;

          if (payload.eventType === 'INSERT') {
            const newMessage: Message = {
              id: m.id,
              chatId: m.chat_id,
              authorId: m.author_id,
              kind: m.kind,
              content: m.content || '',
              createdAt: m.created_at,
              pinned: m.pinned,
              replyTo: m.reply_to,
              status: m.status || 'delivered',
              ...m.payload
            };
            
            set((s) => {
              const chatMessages = s.messages[chatId] || [];
              if (chatMessages.some(x => x.id === newMessage.id)) return s;

              const meId = useAuthStore.getState().user?.id;
              if (newMessage.authorId !== meId) {
                if (s.activeChatId === chatId) {
                  setTimeout(() => get().markRead(chatId), 200);
                } else {
                  setTimeout(() => get().markDelivered(chatId, newMessage.id), 200);
                }
              }

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
          } else if (payload.eventType === 'UPDATE') {
            const m = payload.new as any;
            set((s) => ({
              messages: {
                ...s.messages,
                [chatId]: (s.messages[chatId] || []).map(msg => 
                  msg.id === m.id ? { ...msg, status: m.status } : msg
                )
              }
            }));
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const meId = useAuthStore.getState().user?.id;
        const usersTyping: string[] = [];

        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.user_id && p.user_id !== meId && p.is_typing) {
              usersTyping.push(p.user_id);
            }
          });
        });

        set((s) => ({
          typing: { ...s.typing, [chatId]: Array.from(new Set(usersTyping)) }
        }));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const me = useAuthStore.getState().user;
          if (me) {
            await channel.track({
              user_id: me.id,
              is_typing: false,
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
    const me = useAuthStore.getState().user;
    if (!me) return;
    await channel.track({
      user_id: me.id,
      is_typing: isTyping,
      online_at: new Date().toISOString(),
    });
  },

  setActiveChat: (id) => {
    set({ activeChatId: id });
    if (id) {
      get().markRead(id);
      get().fetchMessages(id);
      get().subscribeToChat(id);
    }
  },

  sendMessage: async (chatId, content) => {
    const me = useAuthStore.getState().user;
    if (!me) return;

    const tempId = `m-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      chatId,
      authorId: me.id,
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
        author_id: me.id,
        kind: 'text',
        content,
        status: 'sent'
      })
      .select()
      .single();

    if (error) {
      set((s) => ({
        messages: {
          ...s.messages,
          [chatId]: (s.messages[chatId] ?? []).filter(m => m.id !== tempId)
        }
      }));
      return;
    }

    set((s) => {
      const currentMessages = s.messages[chatId] ?? [];
      const hasReal = currentMessages.some(m => m.id === data.id);
      return {
        messages: {
          ...s.messages,
          [chatId]: hasReal 
            ? currentMessages.filter(m => m.id !== tempId)
            : currentMessages.map((x) => x.id === tempId ? { ...x, id: data.id, status: "sent" } : x)
        }
      };
    });
  },

  sendVoice: async (chatId, durationSec, waveform) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const tempId = `m-${Date.now()}`;
    set((s) => ({
      messages: { ...s.messages, [chatId]: [...(s.messages[chatId] ?? []), {
        id: tempId, chatId, authorId: me.id, kind: "voice", content: "",
        createdAt: new Date().toISOString(), status: "sending", voice: { durationSec, waveform }
      }] }
    }));
    const { data, error } = await supabase.from('messages').insert({
      chat_id: chatId, author_id: me.id, kind: 'voice',
      payload: { voice: { durationSec, waveform } }, status: 'sent'
    }).select().single();
    if (!error && data) {
      set((s) => {
        const current = s.messages[chatId] ?? [];
        const hasReal = current.some(msg => msg.id === data.id);
        return {
          messages: {
            ...s.messages,
            [chatId]: hasReal 
              ? current.filter(m => m.id !== tempId)
              : current.map((x) => x.id === tempId ? { ...x, id: data.id, status: "sent" } : x)
          }
        };
      });
    }
  },

  sendAttachment: async (chatId, payload) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const tempId = `m-${Date.now()}`;
    set((s) => ({
      messages: { ...s.messages, [chatId]: [...(s.messages[chatId] ?? []), {
        id: tempId, chatId, authorId: me.id, content: payload.content ?? "",
        createdAt: new Date().toISOString(), status: "sending", ...payload
      } as Message] }
    }));
    const { data, error } = await supabase.from('messages').insert({
      chat_id: chatId, author_id: me.id, kind: payload.kind, content: payload.content,
      payload: payload, status: 'sent'
    }).select().single();
    if (!error && data) {
      set((s) => {
        const current = s.messages[chatId] ?? [];
        const hasReal = current.some(msg => msg.id === data.id);
        return {
          messages: {
            ...s.messages,
            [chatId]: hasReal 
              ? current.filter(m => m.id !== tempId)
              : current.map((x) => x.id === tempId ? { ...x, id: data.id, status: "sent" } : x)
          }
        };
      });
    }
  },

  votePoll: (chatId, messageId, optionId) => {},
  toggleReaction: (chatId, messageId, emoji) => {},
  pinMessage: (chatId, messageId) => {},
  removeMessages: (chatId, messageIds) => {
    const idSet = new Set(messageIds);
    set((s) => ({
      messages: { ...s.messages, [chatId]: (s.messages[chatId] ?? []).filter((m) => !idSet.has(m.id)) }
    }));
  },

  markRead: async (chatId) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    await supabase.from('messages').update({ status: 'read' })
      .eq('chat_id', chatId).neq('author_id', me.id).neq('status', 'read');
    set((s) => ({
      chats: s.chats.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c))
    }));
  },

  addGroup: (group) => { return {} as Chat; },

  startDM: async (u) => {
    const me = useAuthStore.getState().user;
    if (!me) return { error: 'Not authenticated' };

    // 1. Check database for existing DM thread between these two users
    const { data: existingChatId, error: checkError } = await supabase
      .rpc('find_dm_between_users', {
        user1_id: me.id,
        user2_id: u.id
      });

    if (!checkError && existingChatId) {
      console.log("[DB] DM already exists:", existingChatId);
      // Ensure it's in our local list
      const existingLocal = get().chats.find(c => c.id === existingChatId);
      if (!existingLocal) {
        await get().fetchChats();
      }
      get().setActiveChat(existingChatId);
      return { data: get().chats.find(c => c.id === existingChatId) };
    }

    const { data: chat, error: chatError } = await supabase.from('chats').insert({
      type: 'dm', created_by: me.id
    }).select().single();

    if (chatError || !chat) return { error: chatError?.message || 'Failed to create chat' };

    const { error: memberError } = await supabase.from('chat_members').insert([
      { chat_id: chat.id, user_id: me.id, role: 'owner' },
      { chat_id: chat.id, user_id: u.id, role: 'member' }
    ]);

    if (memberError) return { error: memberError.message };

    const newChat: Chat = {
      id: chat.id, type: "dm", name: u.name, avatar: u.avatar,
      memberIds: [me.id, u.id], lastMessage: "Say hi 👋",
      lastMessageAt: new Date().toISOString(), online: true
    };

    set((s) => ({ chats: [newChat, ...s.chats] }));
    get().setActiveChat(chat.id);
    return { data: newChat };
  },

  scheduleCallWith: (userIds, invite) => {},
  joinCommunity: (community) => { return {} as Chat; },
  removeChat: (chatId) =>
    set((s) => {
      const { [chatId]: _removed, ...rest } = s.messages;
      return {
        chats: s.chats.filter((c) => c.id !== chatId),
        messages: rest,
        activeChatId: s.activeChatId === chatId ? null : s.activeChatId
      };
    }),
  clearAll: () => set({ chats: [], messages: {}, activeChatId: null })
}));
