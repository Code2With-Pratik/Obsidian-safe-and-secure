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
  typing: Record<string, string[]>; // chatId -> userIds
  onlineUsers: string[]; // userIds
  
  presenceChannel: RealtimeChannel | null;
  messageChannel: RealtimeChannel | null;
  hasInitialLoaded: boolean;
  
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  initializeRealtime: () => void;
  setTyping: (chatId: string, isTyping: boolean) => void;
  setActiveChat: (id: string | null) => void;
  
  sendMessage: (chatId: string, content: string) => Promise<void>;
  sendVoice: (chatId: string, durationSec: number, waveform: number[]) => Promise<void>;
  sendAttachment: (
    chatId: string,
    payload: Partial<Message> & { kind: Message["kind"]; content?: string }
  ) => Promise<void>;
  markRead: (chatId: string) => void;
  markDelivered: (chatId: string, messageId: string) => Promise<void>;
  
  startDM: (user: any) => Promise<{ data?: Chat; error?: string }>;
  removeChat: (chatId: string) => void;
  clearAll: () => void;
  
  // Placeholders
  addGroup: (group: any) => Chat;
  joinCommunity: (community: any) => Chat;
  votePoll: (chatId: string, messageId: string, optionId: string) => void;
  toggleReaction: (chatId: string, messageId: string, emoji: string) => void;
  pinMessage: (chatId: string, messageId: string) => void;
  removeMessages: (chatId: string, messageIds: string[]) => void;
  scheduleCallWith: (userIds: string[], invite: any) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  messages: {},
  activeChatId: null,
  typing: {},
  onlineUsers: [],
  presenceChannel: null,
  messageChannel: null,
  hasInitialLoaded: false,

  initializeRealtime: () => {
    const me = useAuthStore.getState().user;
    if (!me) return;

    if (!get().presenceChannel) {
      console.log("[Realtime] 🛰️ Connecting Presence...");
      const channel = supabase.channel('nova_presence_v1')
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const meId = useAuthStore.getState().user?.id;
          
          const onlineIds: string[] = [];
          const typingMap: Record<string, string[]> = {};

          Object.values(state).forEach((presences: any) => {
            presences.forEach((p: any) => {
              if (!p.user_id || p.user_id === meId) return;
              onlineIds.push(p.user_id);
              if (p.is_typing && p.typing_in) {
                if (!typingMap[p.typing_in]) typingMap[p.typing_in] = [];
                typingMap[p.typing_in].push(p.user_id);
              }
            });
          });

          set({ 
            onlineUsers: Array.from(new Set(onlineIds)),
            typing: typingMap
          });
        });

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
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

    if (!get().messageChannel) {
      const channel = supabase.channel(`nova_msgs_${me.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          (payload) => {
            const m = (payload.new || payload.old) as any;
            const chatId = m.chat_id;
            if (!chatId) return;

            if (payload.eventType === 'INSERT') {
              const newMessage: Message = {
                id: m.id, chatId, authorId: m.author_id, kind: m.kind,
                content: m.content || '', createdAt: m.created_at,
                status: m.status || 'delivered', ...m.payload
              };

              set((s) => {
                const chatMsgs = s.messages[chatId] || [];
                if (chatMsgs.some(x => x.id === newMessage.id)) return s;
                return {
                  messages: { ...s.messages, [chatId]: [...chatMsgs, newMessage] },
                  chats: s.chats.map(c => c.id === chatId ? { ...c, lastMessage: newMessage.content, lastMessageAt: newMessage.createdAt } : c)
                };
              });

              if (m.author_id !== me.id && get().activeChatId === chatId) {
                get().markRead(chatId);
              }
            } else if (payload.eventType === 'UPDATE') {
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
        .subscribe();
      set({ messageChannel: channel });
    }
  },

  fetchChats: async () => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const { data: chatsData } = await supabase.from('chats').select(`*, members:chat_members(user_id, role)`).order('created_at', { ascending: false });
    if (chatsData) {
      const userChats = chatsData.filter(c => c.members?.some((m: any) => m.user_id === me.id));
      const pIds = Array.from(new Set(userChats.flatMap(c => c.members.map((m: any) => m.user_id))));
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', pIds);
      const pMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const formatted = userChats.map((c: any) => {
        let name = c.name, avatar = c.avatar;
        if (c.type === 'dm') {
          const other = c.members.find((m: any) => m.user_id !== me.id);
          const p = other ? pMap.get(other.user_id) : null;
          if (p) { name = p.name || p.username; avatar = p.avatar; }
        }
        return { id: c.id, type: c.type, name: name || 'Chat', avatar, memberIds: c.members.map((m: any) => m.user_id) };
      });
      set({ chats: formatted, hasInitialLoaded: true });
    }
  },

  fetchMessages: async (chatId) => {
    const { data } = await supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });
    if (data) {
      const msgs = data.map((m: any) => ({
        id: m.id, chatId: m.chat_id, authorId: m.author_id, kind: m.kind,
        content: m.content || '', createdAt: m.created_at, status: m.status || 'delivered', ...m.payload
      }));
      set((s) => ({ messages: { ...s.messages, [chatId]: msgs } }));
    }
  },

  setTyping: async (chatId, isTyping) => {
    const me = useAuthStore.getState().user;
    const channel = get().presenceChannel;
    if (!me || !channel) return;
    // Track the typing status. We use `typing_in` to specify the room.
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
      get().markRead(id);
      get().fetchMessages(id);
    }
  },

  sendMessage: async (chatId, content) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    const tempId = `m-${Date.now()}`;
    set((s) => ({ messages: { ...s.messages, [chatId]: [...(s.messages[chatId] ?? []), { id: tempId, chatId, authorId: me.id, kind: "text", content, createdAt: new Date().toISOString(), status: "sending" }] } }));
    const { data, error } = await supabase.from('messages').insert({ chat_id: chatId, author_id: me.id, kind: 'text', content, status: 'sent' }).select().single();
    if (error) {
      set((s) => ({ messages: { ...s.messages, [chatId]: (s.messages[chatId] ?? []).filter(m => m.id !== tempId) } }));
      return;
    }
    set((s) => {
      const cur = s.messages[chatId] ?? [];
      if (cur.some(m => m.id === data.id)) return { messages: { ...s.messages, [chatId]: cur.filter(m => m.id !== tempId) } };
      return { messages: { ...s.messages, [chatId]: cur.map(x => x.id === tempId ? { ...x, id: data.id, status: "sent" } : x) } };
    });
  },

  markRead: async (chatId) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    await supabase.from('messages').update({ status: 'read' }).eq('chat_id', chatId).neq('author_id', me.id).neq('status', 'read');
    set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c)) }));
  },

  markDelivered: async (chatId, messageId) => {
    const me = useAuthStore.getState().user;
    if (!me) return;
    await supabase.from('messages').update({ status: 'delivered' }).eq('id', messageId).neq('author_id', me.id).eq('status', 'sent');
  },

  startDM: async (u) => {
    const me = useAuthStore.getState().user;
    if (!me) return { error: 'Not authenticated' };
    const { data: existingId } = await supabase.rpc('find_dm_between_users', { user1_id: me.id, user2_id: u.id });
    if (existingId) {
      if (!get().chats.find(c => c.id === existingId)) await get().fetchChats();
      get().setActiveChat(existingId);
      return { data: get().chats.find(c => c.id === existingId) };
    }
    const { data: chat } = await supabase.from('chats').insert({ type: 'dm', created_by: me.id }).select().single();
    if (!chat) return { error: 'Failed' };
    await supabase.from('chat_members').insert([{ chat_id: chat.id, user_id: me.id, role: 'owner' }, { chat_id: chat.id, user_id: u.id, role: 'member' }]);
    const newChat: Chat = { id: chat.id, type: "dm", name: u.name, avatar: u.avatar, memberIds: [me.id, u.id], online: true };
    set((s) => ({ chats: [newChat, ...s.chats] }));
    get().setActiveChat(chat.id);
    return { data: newChat };
  },

  sendVoice: async () => {},
  sendAttachment: async () => {},
  addGroup: () => ({} as Chat),
  joinCommunity: () => ({} as Chat),
  votePoll: () => {},
  toggleReaction: () => {},
  pinMessage: () => {},
  removeMessages: () => {},
  scheduleCallWith: () => {},
  removeChat: (chatId) => set((s) => ({ chats: s.chats.filter(c => c.id !== chatId) })),
  clearAll: () => set({ chats: [], messages: {}, activeChatId: null, hasInitialLoaded: false })
}));
