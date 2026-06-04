"use client";

/**
 *  Client-side tool handlers for Obsidian AI.
 *
 *  When the model returns a tool call, `useAIChat` looks up the handler in
 *  this map by name and executes it with the model-supplied arguments. The
 *  handler returns plain JSON which we stringify and feed back to the model
 *  on the next round.
 *
 *  Handlers live on the CLIENT because most of them either:
 *    • call a Zustand store action (search the in-memory chat list,
 *      navigate, open a vault page),
 *    • or fan out a Supabase query (RLS handles auth scoping for us — we
 *      don't need a service-role key on the server).
 *
 *  Handlers MUST be tolerant of missing data — if the user hasn't loaded
 *  the chat list yet, kick off a fetch. If the model invents an id, return
 *  a `{ error: "not found" }` payload so the model can recover gracefully.
 */

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/use-auth-store";
import { useChatStore } from "@/store/use-chat-store";
import { useNotificationsStore } from "@/store/use-notifications-store";
import { useCommunityStore } from "@/store/use-community-store";
import { useWhiteboardStore } from "@/store/use-whiteboard-store";
import { useVaultStore } from "@/store/use-vault-store";
import { useUIStore } from "@/store/use-ui-store";
import { useCallStore } from "@/store/use-call-store";
import { useSettingsStore } from "@/store/use-settings-store";
import { applyTheme } from "../theme-bridge";
import type { AIAppContext } from "../types";

/** The handler signature — args from the model, router for navigation,
 *  context snapshot for "this chat" / "this group" defaults. */
export type AIToolHandler = (
  args: Record<string, unknown>,
  router: AppRouterInstance,
  ctx: AIAppContext
) => Promise<unknown>;

const supabase = createClient();

/* ─── small utilities ────────────────────────────────────────────── */

/** Truncate long arrays going back to the model so we don't blow context. */
function cap<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}

/** Friendly description of how long ago an ISO time was. */
function ago(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "recently";
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/* ─── handlers ───────────────────────────────────────────────────── */

const handlers: Record<string, AIToolHandler> = {
  /* ── notifications ───────────────────────────────────────────── */

  readNotifications: async (args) => {
    const items = useNotificationsStore.getState().items;
    const unreadOnly = !!args.unreadOnly;
    const limit = Math.min(50, Math.max(1, Number(args.limit) || 20));
    const filtered = (unreadOnly ? items.filter((n) => !n.read) : items)
      .slice(0, limit)
      .map((n) => ({
        id: n.id,
        kind: n.kind,
        title: n.title,
        body: n.body,
        time: n.time,
        read: !!n.read,
        targetHref: n.targetHref ?? null
      }));
    return { count: filtered.length, notifications: filtered };
  },

  summarizeNotifications: async (args, _router, ctx) => {
    const items = useNotificationsStore.getState().items;
    const list = args.unreadOnly ? items.filter((n) => !n.read) : items.slice(0, 30);
    if (list.length === 0) return { summary: "You're all caught up — no recent notifications." };
    const byKind = list.reduce<Record<string, number>>((acc, n) => {
      acc[n.kind] = (acc[n.kind] || 0) + 1;
      return acc;
    }, {});
    const lines = list.slice(0, 10).map((n) => `• ${n.title}: ${n.body}`);
    return {
      summary: `${list.length} ${args.unreadOnly ? "unread" : "recent"} notifications (${Object.entries(
        byKind
      )
        .map(([k, v]) => `${v} ${k}`)
        .join(", ")}).`,
      items: lines,
      contextHint: ctx.user ? `for ${ctx.user.name}` : undefined
    };
  },

  /* ── chats ───────────────────────────────────────────────────── */

  searchChats: async (args) => {
    const q = String(args.query ?? "").trim().toLowerCase();
    if (!q) return { results: [] };
    let chats = useChatStore.getState().chats;
    if (chats.length === 0) {
      await useChatStore.getState().fetchChats();
      chats = useChatStore.getState().chats;
    }
    const results = chats
      .filter((c) => c.name.toLowerCase().includes(q))
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        isGroup: c.type === "group" || c.type === "channel",
        unread: c.unread ?? 0,
        lastMessage: c.lastMessage ?? null,
        memberCount: c.membersCount ?? null
      }));
    return { results: cap(results, 8) };
  },

  searchMessages: async (args) => {
    const q = String(args.query ?? "").trim();
    if (!q) return { results: [] };
    let qb = supabase
      .from("messages")
      .select("id, chat_id, author_id, content, created_at, kind")
      .ilike("content", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(20);
    if (typeof args.chatId === "string") qb = qb.eq("chat_id", args.chatId);
    if (typeof args.authorId === "string") qb = qb.eq("author_id", args.authorId);
    const { data, error } = await qb;
    if (error) return { error: error.message, results: [] };
    const rows = (data ?? []).map((m) => ({
      id: m.id as string,
      chatId: m.chat_id as string,
      authorId: m.author_id as string,
      kind: m.kind as string,
      content: m.content as string,
      time: ago(m.created_at as string)
    }));
    return { count: rows.length, results: rows };
  },

  openChat: async (args, router) => {
    const id = String(args.chatId ?? "").trim();
    if (!id) return { error: "chatId is required" };
    useChatStore.getState().setActiveChat(id);
    router.push(`/chats/${id}`);
    useUIStore.getState().setAiAssistantOpen(false);
    return { ok: true, opened: id };
  },

  summarizeChat: async (args, _router, ctx) => {
    const chatId = String(args.chatId ?? ctx.currentChat?.id ?? "").trim();
    if (!chatId) return { error: "No chatId and no current chat in context." };
    const max = Math.min(100, Math.max(5, Number(args.messageCount) || 30));
    const { data, error } = await supabase
      .from("messages")
      .select("author_id, content, created_at, kind")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: false })
      .limit(max);
    if (error) return { error: error.message };
    const messages = (data ?? []).reverse().map((m) => ({
      authorId: m.author_id as string,
      kind: m.kind as string,
      content: m.content as string,
      time: ago(m.created_at as string)
    }));
    return { chatId, messages, instruction: "Summarize the messages above in 2–3 sentences." };
  },

  summarizeGroup: async (args, router, ctx) =>
    handlers.summarizeChat({ ...args, messageCount: 60 }, router, ctx),

  /* ── users + profiles ─────────────────────────────────────────── */

  searchUsers: async (args) => {
    const q = String(args.query ?? "").trim();
    if (!q) return { results: [] };
    const meId = useAuthStore.getState().user?.id ?? "";
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, username, avatar, status")
      .or(`name.ilike.%${q}%,username.ilike.%${q}%`)
      .neq("id", meId)
      .limit(8);
    if (error) return { error: error.message, results: [] };
    return {
      results: (data ?? []).map((p) => ({
        id: p.id as string,
        name: (p.name as string) ?? "User",
        username: (p.username as string | null) ?? null,
        avatar: (p.avatar as string | null) ?? null,
        status: (p.status as string | null) ?? "offline"
      }))
    };
  },

  openUserProfile: async (args, router, ctx) => {
    const userId = typeof args.userId === "string" ? args.userId : ctx.user?.id ?? "";
    if (!userId) return { error: "No userId and no signed-in user." };
    if (ctx.user && userId === ctx.user.id) {
      router.push("/profile");
    } else {
      router.push(`/profile?user=${userId}`);
    }
    useUIStore.getState().setAiAssistantOpen(false);
    return { ok: true, opened: userId };
  },

  /* ── communities ──────────────────────────────────────────────── */

  searchCommunities: async (args) => {
    const q = String(args.query ?? "").trim();
    if (!q) return { results: [] };
    let list = useCommunityStore.getState().communities;
    if (list.length === 0) {
      await useCommunityStore.getState().fetchCommunities();
      list = useCommunityStore.getState().communities;
    }
    const filtered = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        (c.description ?? "").toLowerCase().includes(q.toLowerCase())
    );
    return {
      results: cap(
        filtered.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description ?? null,
          members: c.members ?? null
        })),
        8
      )
    };
  },

  getTrendingCommunities: async () => {
    let list = useCommunityStore.getState().communities;
    if (list.length === 0) {
      await useCommunityStore.getState().fetchCommunities();
      list = useCommunityStore.getState().communities;
    }
    const sorted = [...list]
      .sort((a, b) => (b.members ?? 0) - (a.members ?? 0))
      .slice(0, 10);
    return {
      results: sorted.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description ?? null,
        members: c.members ?? 0
      }))
    };
  },

  joinCommunity: async (args) => {
    const id = String(args.communityId ?? "").trim();
    if (!id) return { error: "communityId required" };
    try {
      const out = await useCommunityStore.getState().joinCommunity(id);
      return { ok: true, ...out };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to join community" };
    }
  },

  summarizeCommunity: async (args, _router, ctx) => {
    const id = String(args.communityId ?? ctx.currentCommunity?.id ?? "").trim();
    if (!id) return { error: "No communityId and no current community in context." };
    const { data, error } = await supabase
      .from("community_posts")
      .select("id, author_id, content, created_at")
      .eq("community_id", id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) return { error: error.message };
    const posts = (data ?? []).reverse().map((p) => ({
      authorId: p.author_id as string,
      content: p.content as string,
      time: ago(p.created_at as string)
    }));
    return { communityId: id, posts, instruction: "Summarize the posts above in 2–3 sentences." };
  },

  /* ── files / vault ───────────────────────────────────────────── */

  searchFiles: async (args) => {
    const q = String(args.query ?? "").trim();
    if (!q) return { results: [] };
    const kind = String(args.kind ?? "any");
    let qb = supabase
      .from("messages")
      .select("id, chat_id, author_id, kind, content, payload, created_at")
      .in("kind", ["file", "image", "video", "audio", "voice"])
      .ilike("content", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(40);
    if (typeof args.since === "string") qb = qb.gte("created_at", args.since as string);
    const { data, error } = await qb;
    if (error) return { error: error.message, results: [] };
    const wanted = (data ?? []).filter((m) => {
      if (kind === "any") return true;
      if (kind === "pdf") {
        const payload = (m.payload as { name?: string; mime?: string } | null) ?? null;
        return (
          (m.kind as string) === "file" &&
          ((payload?.name ?? "").toLowerCase().endsWith(".pdf") ||
            (payload?.mime ?? "").toLowerCase().includes("pdf"))
        );
      }
      if (kind === "image") return m.kind === "image";
      if (kind === "audio") return m.kind === "audio" || m.kind === "voice";
      if (kind === "video") return m.kind === "video";
      if (kind === "document") return m.kind === "file";
      return true;
    });
    return {
      count: wanted.length,
      results: cap(
        wanted.map((m) => {
          const payload = (m.payload as { name?: string; size?: number } | null) ?? null;
          return {
            messageId: m.id as string,
            chatId: m.chat_id as string,
            authorId: m.author_id as string,
            kind: m.kind as string,
            name: payload?.name ?? (m.content as string) ?? "file",
            size: payload?.size ?? null,
            time: ago(m.created_at as string)
          };
        }),
        20
      )
    };
  },

  searchPDFs: async (args, router, ctx) =>
    handlers.searchFiles({ ...args, kind: "pdf" }, router, ctx),

  searchImages: async (args, router, ctx) =>
    handlers.searchFiles({ ...args, kind: "image" }, router, ctx),

  openVault: async (_args, router) => {
    router.push("/files");
    useUIStore.getState().setAiAssistantOpen(false);
    return { ok: true, opened: "/files" };
  },

  searchVault: async (args) => {
    const q = String(args.query ?? "").trim().toLowerCase();
    if (!q) return { results: [] };
    const nodes = useVaultStore.getState().nodes;
    const matches = nodes
      .filter((n) => n.kind === "file" && n.name.toLowerCase().includes(q))
      .slice(0, 20)
      .map((n) => ({
        id: n.id,
        name: n.name,
        fileKind: n.fileKind ?? "other",
        size: n.size ?? null,
        starred: !!n.starred,
        vaulted: !!n.vault
      }));
    return { count: matches.length, results: matches };
  },

  /* ── whiteboards ─────────────────────────────────────────────── */

  searchWhiteboards: async (args) => {
    const q = String(args.query ?? "").trim().toLowerCase();
    let boards = useWhiteboardStore.getState().boards;
    if (boards.length === 0) {
      await useWhiteboardStore.getState().fetchBoards();
      boards = useWhiteboardStore.getState().boards;
    }
    const filtered = q ? boards.filter((b) => b.name.toLowerCase().includes(q)) : boards;
    return {
      results: cap(
        filtered.map((b) => ({
          id: b.id,
          title: b.name,
          updatedAt: b.updatedAt ?? null
        })),
        10
      )
    };
  },

  openWhiteboard: async (args, router) => {
    const id = typeof args.boardId === "string" ? args.boardId : null;
    if (id) useWhiteboardStore.getState().setActiveBoard?.(id);
    router.push("/whiteboard");
    useUIStore.getState().setAiAssistantOpen(false);
    return { ok: true, opened: id ?? "/whiteboard" };
  },

  /* ── calls ───────────────────────────────────────────────────── */

  startVoiceCall: async (args, router) => {
    return startCallShared(args, router, false);
  },

  startVideoCall: async (args, router) => {
    return startCallShared(args, router, true);
  },

  /* ── navigation + context ─────────────────────────────────────── */

  navigateTo: async (args, router) => {
    const screen = String(args.screen ?? "").toLowerCase();
    const map: Record<string, string> = {
      chats: "/chats",
      calls: "/calls",
      communities: "/discover",
      discover: "/discover",
      "ghost-rooms": "/ghost-rooms",
      stories: "/stories",
      whiteboard: "/whiteboard",
      files: "/files",
      vault: "/files",
      profile: "/profile",
      settings: "/settings",
      notifications: "/chats",
      spotlight: "/chats"
    };
    const target = map[screen];
    if (!target) return { error: `Unknown screen "${screen}".` };
    if (screen === "spotlight") {
      useUIStore.getState().setCommandOpen(true);
    } else {
      router.push(target);
      useUIStore.getState().setAiAssistantOpen(false);
    }
    return { ok: true, opened: target };
  },

  getCurrentScreen: async (_args, _router, ctx) => ({
    screen: ctx.currentScreen,
    route: ctx.currentRoute
  }),

  getCurrentContext: async (_args, _router, ctx) => ctx,

  /* ── appearance / settings ────────────────────────────────────── */

  setTheme: async (args) => {
    const theme = String(args.theme ?? "").toLowerCase() as "light" | "dark" | "system";
    if (!["light", "dark", "system"].includes(theme)) {
      return { error: `Unknown theme "${args.theme}". Use light, dark, or system.` };
    }
    const ok = applyTheme(theme);
    return ok ? { ok: true, theme } : { error: "Theme bridge not mounted yet — try again." };
  },

  setAccent: async (args) => {
    const accent = String(args.accent ?? "").toLowerCase();
    const valid = ["violet", "cyan", "pink", "lime", "amber"];
    if (!valid.includes(accent)) {
      return { error: `Unknown accent "${args.accent}". Valid: ${valid.join(", ")}.` };
    }
    useSettingsStore.getState().setAccent(accent);
    return { ok: true, accent };
  },

  setFont: async (args) => {
    const font = String(args.font ?? "").toLowerCase();
    const valid = [
      "default",
      "arima",
      "poppins",
      "montserrat-alt",
      "lora",
      "doto",
      "grape-nuts",
      "satisfy"
    ];
    if (!valid.includes(font)) {
      return { error: `Unknown font "${args.font}". Valid: ${valid.join(", ")}.` };
    }
    useSettingsStore.getState().setFont(font);
    return { ok: true, font };
  },

  setLanguage: async (args) => {
    const lang = String(args.language ?? "").toLowerCase();
    const valid = ["en", "hi", "mr", "ar", "ru", "tr", "pt", "zh", "ja"];
    if (!valid.includes(lang)) {
      return { error: `Unknown language "${args.language}". Valid: ${valid.join(", ")}.` };
    }
    useSettingsStore.getState().setLanguage(lang);
    return { ok: true, language: lang };
  },

  setGlassIntensity: async (args) => {
    const v = Number(args.value);
    if (!Number.isFinite(v)) return { error: "value must be a number 0-100" };
    useSettingsStore.getState().setGlass(Math.max(0, Math.min(100, v)));
    return { ok: true, value: Math.max(0, Math.min(100, v)) };
  },

  setReduceMotion: async (args) => {
    useSettingsStore.getState().setReduceMotion(!!args.enabled);
    return { ok: true, enabled: !!args.enabled };
  },

  toggleNotificationPref: async (args) => {
    const key = String(args.key ?? "");
    const valid = ["directMessages", "groupChats", "ghostRooms", "callInvites", "sounds"];
    if (!valid.includes(key)) {
      return { error: `Unknown notification key "${key}". Valid: ${valid.join(", ")}.` };
    }
    useSettingsStore
      .getState()
      .toggleNotification(key as keyof ReturnType<typeof useSettingsStore.getState>["notifications"], !!args.enabled);
    return { ok: true, key, enabled: !!args.enabled };
  },

  togglePrivacyPref: async (args) => {
    const key = String(args.key ?? "");
    const valid = ["readReceipts", "typingIndicator", "lastSeen", "profilePhoto", "allowScreenshots"];
    if (!valid.includes(key)) {
      return { error: `Unknown privacy key "${key}". Valid: ${valid.join(", ")}.` };
    }
    useSettingsStore
      .getState()
      .togglePrivacy(key as keyof ReturnType<typeof useSettingsStore.getState>["privacy"], !!args.enabled);
    return { ok: true, key, enabled: !!args.enabled };
  },

  toggleSecurityPref: async (args) => {
    const key = String(args.key ?? "");
    const valid = ["twoFactor", "biometric", "loginAlerts", "autoLockVault"];
    if (!valid.includes(key)) {
      return { error: `Unknown security key "${key}". Valid: ${valid.join(", ")}.` };
    }
    useSettingsStore
      .getState()
      .toggleSecurity(key as keyof ReturnType<typeof useSettingsStore.getState>["security"], !!args.enabled);
    return { ok: true, key, enabled: !!args.enabled };
  },

  setUserStatus: async (args) => {
    const status = String(args.status ?? "").toLowerCase();
    const valid = ["online", "away", "busy", "offline"];
    if (!valid.includes(status)) {
      return { error: `Unknown status "${args.status}". Valid: ${valid.join(", ")}.` };
    }
    const me = useAuthStore.getState().user;
    if (!me) return { error: "Not signed in." };
    // Optimistic local update + best-effort server sync. We don't await
    // the DB write — the AI's reply shouldn't block on a profile sync.
    useAuthStore.getState().setUser({ ...me, status: status as typeof me.status });
    void supabase.from("profiles").update({ status }).eq("id", me.id);
    return { ok: true, status };
  },

  signOut: async (_args, router) => {
    await supabase.auth.signOut();
    useAuthStore.getState().setUser(null);
    router.push("/login");
    useUIStore.getState().setAiAssistantOpen(false);
    return { ok: true };
  },

  /* ── cross-cutting summary ────────────────────────────────────── */

  catchMeUp: async (_args, _router, ctx) => {
    const notifs = useNotificationsStore.getState().items;
    const unread = notifs.filter((n) => !n.read);
    const chats = useChatStore.getState().chats;
    const unreadChats = chats
      .filter((c) => (c.unread ?? 0) > 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        unread: c.unread,
        lastMessage: c.lastMessage ?? null
      }));
    const callsState = useCallStore.getState();
    const missedCalls = callsState.history
      .filter((h) => h.direction === "incoming" && (h.status === "missed" || h.status === "rejected"))
      .slice(0, 10)
      .map((h) => ({
        when: ago(h.startedAt),
        from: h.counterparty?.name ?? "Unknown",
        kind: h.video ? "video" : "voice"
      }));
    return {
      unreadNotifications: unread.length,
      sampleNotifications: cap(
        unread.map((n) => ({ kind: n.kind, title: n.title, body: n.body })),
        8
      ),
      unreadChatCount: unreadChats.length,
      unreadChats: cap(unreadChats, 8),
      missedCallCount: missedCalls.length,
      missedCalls,
      contextHint: ctx.user?.name ?? null,
      instruction:
        "Compose one short conversational summary (2 sentences max) of what the user missed."
    };
  }
};

/* ─── shared helper for start*Call ─────────────────────────────────── */

async function startCallShared(
  args: Record<string, unknown>,
  router: AppRouterInstance,
  video: boolean
): Promise<unknown> {
  const userId = String(args.userId ?? "").trim();
  if (!userId) return { error: "userId required" };

  // First make sure we have a DM chat to call into. startDM is idempotent.
  const startDMResult = await useChatStore.getState().startDM({ id: userId });
  const chat = (startDMResult as { data?: { id: string; name?: string; avatar?: string } }).data;
  if (!chat) return { error: "Could not open a chat with that user." };

  const out = await useCallStore.getState().start({
    chatId: chat.id,
    video,
    isGroup: false
  });
  if (!out) return { error: "Failed to start the call." };

  // Hoist the call UI so AppShell renders the LiveKit room.
  useUIStore.getState().startCall({
    chatId: chat.id,
    name: chat.name ?? "Call",
    avatar: chat.avatar,
    video,
    group: false,
    returnTo: `/chats/${chat.id}`
  });
  router.push("/calls/active");
  useUIStore.getState().setAiAssistantOpen(false);
  return { ok: true, sessionId: out.sessionId, video };
}

export default handlers;
