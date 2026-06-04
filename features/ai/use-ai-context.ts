"use client";

/**
 *  useAIContext — builds the live "what is the user looking at right now"
 *  snapshot consumed by every Obsidian AI tool call and stamped into the
 *  system prompt.
 *
 *  Pulls from a handful of Zustand stores + Next's pathname. Cheap; the
 *  hook runs on every render of the assistant popup (which is rare —
 *  the popup is closed most of the time).
 */

import * as React from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/use-auth-store";
import { useChatStore } from "@/store/use-chat-store";
import { useNotificationsStore } from "@/store/use-notifications-store";
import { useCommunityStore } from "@/store/use-community-store";
import { useWhiteboardStore } from "@/store/use-whiteboard-store";
import { useUIStore } from "@/store/use-ui-store";
import type { AIAppContext } from "./types";

/** Translate a Next.js pathname to a short human-readable screen label. */
function labelForRoute(pathname: string): string {
  if (pathname.startsWith("/chats/")) return "open chat thread";
  if (pathname === "/chats") return "chats list";
  if (pathname.startsWith("/calls/active")) return "active call";
  if (pathname === "/calls") return "calls dashboard";
  if (pathname.startsWith("/discover/community/")) return "community";
  if (pathname === "/discover") return "discover / communities";
  if (pathname === "/whiteboard") return "whiteboard canvas";
  if (pathname.startsWith("/ghost-rooms/")) return "ghost room";
  if (pathname === "/ghost-rooms") return "ghost rooms list";
  if (pathname === "/files") return "files / vault";
  if (pathname === "/profile") return "user profile";
  if (pathname === "/settings") return "settings";
  if (pathname.startsWith("/stories")) return "stories";
  return pathname || "home";
}

export function useAIContext(): AIAppContext {
  const pathname = usePathname() ?? "/";
  const user = useAuthStore((s) => s.user);

  // Subscribe to the slices the snapshot depends on so the hook re-runs
  // when the user navigates or unread counts change. We're intentionally
  // selecting individual primitives rather than the whole store so the
  // hook doesn't churn on every unrelated mutation.
  const chats = useChatStore((s) => s.chats);
  const activeChatId = useChatStore((s) => s.activeChatId);
  const notifs = useNotificationsStore((s) => s.items);
  const communities = useCommunityStore((s) => s.communities);
  const boards = useWhiteboardStore((s) => s.boards);
  const activeBoardId = useWhiteboardStore((s) => s.activeBoardId);
  const myRoles = useWhiteboardStore((s) => s.myRoles);
  const activeCall = useUIStore((s) => s.activeCall);

  return React.useMemo<AIAppContext>(() => {
    /* ── current chat (only when actually on a chat route) ────── */
    let currentChat: AIAppContext["currentChat"] = null;
    if (pathname.startsWith("/chats/")) {
      const id = activeChatId ?? pathname.split("/")[2] ?? null;
      const chat = id ? chats.find((c) => c.id === id) ?? null : null;
      if (chat) {
        currentChat = {
          id: chat.id,
          name: chat.name,
          isGroup: chat.type === "group" || chat.type === "channel",
          memberCount: chat.membersCount ?? chat.memberIds?.length
        };
      }
    }

    /* ── current community ───────────────────────────────────── */
    let currentCommunity: AIAppContext["currentCommunity"] = null;
    if (pathname.startsWith("/discover/community/")) {
      const id = pathname.split("/")[3] ?? null;
      const c = id ? communities.find((x) => x.id === id) ?? null : null;
      if (c) currentCommunity = { id: c.id, name: c.name };
    }

    /* ── current whiteboard ──────────────────────────────────── */
    let currentWhiteboard: AIAppContext["currentWhiteboard"] = null;
    if (pathname === "/whiteboard" && activeBoardId) {
      const b = boards.find((x) => x.id === activeBoardId) ?? null;
      if (b) {
        const role = (myRoles?.[b.id] ?? "viewer") as "owner" | "editor" | "viewer";
        currentWhiteboard = { id: b.id, title: b.name, role };
      }
    }

    /* ── current call ────────────────────────────────────────── */
    const currentCall: AIAppContext["currentCall"] = activeCall
      ? {
          chatId: activeCall.chatId,
          name: activeCall.name,
          video: activeCall.video,
          group: activeCall.group
        }
      : null;

    /* ── activity summary the model can quote ────────────────── */
    const unreadNotifs = notifs.filter((n) => !n.read).length;
    const unreadChats = chats.reduce((n, c) => n + ((c.unread ?? 0) > 0 ? 1 : 0), 0);
    const totalUnreadMessages = chats.reduce((n, c) => n + (c.unread ?? 0), 0);
    const summary =
      `Unread notifications: ${unreadNotifs}. ` +
      `Unread chats: ${unreadChats} (${totalUnreadMessages} messages total). ` +
      `Total chats: ${chats.length}. ` +
      `Whiteboards: ${boards.length}. ` +
      `Communities the user can see: ${communities.length}.`;

    return {
      user: user
        ? {
            id: user.id,
            name: user.name ?? "",
            username: user.username,
            avatar: user.avatar,
            status: user.status
          }
        : null,
      currentScreen: labelForRoute(pathname),
      currentRoute: pathname,
      currentChat,
      currentCommunity,
      currentWhiteboard,
      currentCall,
      summary
    };
  }, [
    pathname,
    user,
    chats,
    activeChatId,
    notifs,
    communities,
    boards,
    activeBoardId,
    myRoles,
    activeCall
  ]);
}
