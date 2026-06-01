"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Phone,
  Video,
  Search,
  MoreVertical,
  Ghost,
  Lock,
  ChevronLeft,
  PinIcon,
  Pin,
  BellOff,
  Bell,
  Palette,
  CalendarClock,
  Eraser,
  Trash2,
  Ban,
  Flag,
  Download,
  Star,
  Users,
  Sparkles,
  Copy as CopyIcon,
  Forward as ForwardIcon,
  X as XIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedAvatar } from "@/components/animated-avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useUIStore } from "@/store/use-ui-store";
import { useChatStore } from "@/store/use-chat-store";
import { useStoriesStore } from "@/store/use-stories-store";
import { StoryAvatar } from "@/components/stories/story-avatar";
import { users as allUsers } from "@/lib/mock-data";
import { formatLastSeen } from "@/lib/utils";
import { useChatThemeStore } from "@/store/use-chat-theme-store";
import { useMessageSelectionStore } from "@/store/use-message-selection-store";
import { useAuthStore } from "@/store/use-auth-store";
import { copyText } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { ChatThemeDialog } from "./chat-theme-dialog";
import { DeleteMessageDialog } from "./delete-message-dialog";

/** Stable empty array used as the fallback for `selected[chat.id]` so the
 *  Zustand selector doesn't return a fresh `[]` on every render (which
 *  trips React's "getSnapshot should be cached" / max-update-depth loop). */
const EMPTY_SELECTED_IDS: string[] = [];
import type { Chat } from "@/types";

export function ChatHeader({
  chat,
  search,
  onSearchChange,
  onCloseSearch
}: {
  chat: Chat;
  /** When non-null the header shows the search input instead of the title. */
  search?: string | null;
  onSearchChange?: (value: string) => void;
  onCloseSearch?: () => void;
}) {
  const router = useRouter();
  const t = useT();
  const me = useAuthStore((s) => s.user);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const typingMap = useChatStore((s) => s.typing);
  const isTyping = (typingMap[chat.id]?.length ?? 0) > 0;
  
  // DM chats: check if the other member is online
  const otherMemberId = chat.memberIds?.find(id => id !== me?.id);
  const isOnline = chat.type === 'dm' 
    ? (otherMemberId && onlineUsers.includes(otherMemberId)) 
    : !!chat.online;

  const startCallStore = useUIStore((s) => s.startCall);
  const removeChat = useChatStore((s) => s.removeChat);
  const pinChat = useChatStore((s) => s.pinChat);
  const muteChat = useChatStore((s) => s.muteChat);
  const favouriteChat = useChatStore((s) => s.favouriteChat);
  const clearChat = useChatStore((s) => s.clearChat);
  const blockUser = useChatStore((s) => s.blockUser);
  const messages = useChatStore((s) => s.messages);

  const themeId = useChatThemeStore((s) => s.byChat[chat.id] ?? "default");
  const selectionCount = useMessageSelectionStore(
    (s) => s.selected[chat.id]?.length ?? 0
  );
  const clearSelection = useMessageSelectionStore((s) => s.clear);
  const removeMessages = useChatStore((s) => s.removeMessages);
  const selectionActive = selectionCount > 0;
  const rightPanel = useUIStore((s) => s.rightPanel);
  const setRightPanel = useUIStore((s) => s.setRightPanel);
  // Clicking the header name/avatar (or "View profile") toggles the docked
  // details panel — the single profile surface. The old full-screen overlay
  // sheet has been removed to avoid two competing profile UIs.
  const openProfile = () => setRightPanel(rightPanel === "details" ? null : "details");
  const [themeOpen, setThemeOpen] = React.useState(false);

  // DM → resolve the single user to show their story ring on the header avatar.
  const storyUserId = chat.type === "dm" ? otherMemberId : undefined;
  const hasStory = useStoriesStore((s) =>
    storyUserId ? !!s.byUser[storyUserId]?.slides.length : false
  );

  const startCall = (video: boolean) => {
    // Group / channel / ghost-room chats start a multi-party call; a DM is 1-on-1.
    const isGroup = chat.type !== "dm" && chat.type !== "secret";
    startCallStore({
      chatId: chat.id,
      name: chat.name,
      avatar: chat.avatar,
      video,
      group: isGroup,
      participants: isGroup
        ? Math.max(2, chat.memberIds?.length ?? chat.membersCount ?? 4)
        : 2,
      // Send the user back to this exact chat when they hang up.
      returnTo: `/chats/${chat.id}`
    });
    router.push("/calls/active");
  };

  const copySelected = () => {
    const ids = new Set(useMessageSelectionStore.getState().selected[chat.id] ?? []);
    const messages = useChatStore.getState().messages[chat.id] ?? [];
    const text = messages
      .filter((m) => ids.has(m.id))
      .map((m) => m.content ?? "")
      .filter(Boolean)
      .join("\n");
    if (text) void copyText(text);
    clearSelection(chat.id);
  };

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const hideMessages = useChatStore((s) => s.hideMessages);
  // Multi-select Delete now opens the shared dialog — Delete for everyone is
  // only offered when every selected message is mine.
  const deleteSelected = () => {
    setDeleteOpen(true);
  };
  // Important: select the raw value, then fall back to a STABLE empty array
  // outside the selector. A `?? []` inside the selector returns a fresh `[]`
  // every render and trips React's
  // "result of getSnapshot should be cached to avoid an infinite loop".
  const selectedIdsRaw = useMessageSelectionStore((s) => s.selected[chat.id]);
  const selectedIds = selectedIdsRaw ?? EMPTY_SELECTED_IDS;
  const allSelectedAreMine = React.useMemo(() => {
    if (!me?.id || selectedIds.length === 0) return false;
    const list = messages[chat.id] ?? [];
    return selectedIds.every((id) => list.find((m) => m.id === id)?.authorId === me.id);
  }, [selectedIds, messages, chat.id, me?.id]);

  if (selectionActive) {
    return (
      <>
        <div className="relative z-10 flex items-center gap-2 px-3 md:px-5 h-16 border-b border-border/40 backdrop-blur-2xl backdrop-saturate-180 bg-card/70 dark:bg-card/65 glass-specular shadow-[0_8px_24px_-16px_rgba(0,0,0,0.5)]">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => clearSelection(chat.id)}
            aria-label="Exit selection mode"
            className="[&_svg]:size-6 dark:text-white dark:hover:text-white"
          >
            <XIcon />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px] truncate">
              {selectionCount} {t("selected")}
            </p>
            <p className="text-[11px] text-muted-foreground">{t("Tap messages to add or remove")}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={copySelected}
              aria-label="Copy selected"
              title="Copy"
              className="[&_svg]:size-[22px] dark:text-white dark:hover:text-white"
            >
              <CopyIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Forward selected"
              title="Forward"
              onClick={() => clearSelection(chat.id)}
              className="[&_svg]:size-[22px] dark:text-white dark:hover:text-white"
            >
              <ForwardIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={deleteSelected}
              aria-label="Delete selected"
              title="Delete"
              className="[&_svg]:size-[22px] text-rose-400 hover:text-rose-300"
            >
              <Trash2 />
            </Button>
          </div>
        </div>
        <DeleteMessageDialog
          open={deleteOpen}
          count={selectedIds.length}
          canDeleteForEveryone={allSelectedAreMine}
          onClose={() => setDeleteOpen(false)}
          onDeleteForMe={async () => {
            await hideMessages(chat.id, selectedIds);
            clearSelection(chat.id);
            setDeleteOpen(false);
          }}
          onDeleteForEveryone={async () => {
            await removeMessages(chat.id, selectedIds);
            clearSelection(chat.id);
            setDeleteOpen(false);
          }}
        />
      </>
    );
  }

  const searchActive = search != null;

  return (
    <div className="relative z-10 flex items-center gap-3 px-3 md:px-5 h-16 border-b border-border/40 backdrop-blur-2xl backdrop-saturate-180 bg-card/70 dark:bg-card/65 glass-specular shadow-[0_8px_24px_-16px_rgba(0,0,0,0.5)]">
      {searchActive ? (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCloseSearch?.()}
            aria-label="Close search"
            className="[&_svg]:size-[22px] dark:text-white dark:hover:text-white"
          >
            <ChevronLeft />
          </Button>
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              autoFocus
              value={search ?? ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") onCloseSearch?.();
              }}
              placeholder={`${t("Search in chat")} · ${chat.name}…`}
              className="w-full h-10 pl-9 pr-9 rounded-full glass-subtle border border-border/60 bg-transparent text-sm outline-none focus:ring-2 focus:ring-cyan-400/60 placeholder:text-muted-foreground/70"
            />
            {search && search.length > 0 && (
              <button
                onClick={() => onSearchChange?.("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 size-6 rounded-full grid place-items-center hover:bg-foreground/10"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <Link href="/chats" className="md:hidden">
            <Button variant="ghost" size="icon" className="[&_svg]:size-7 dark:text-white dark:hover:text-white">
              <ChevronLeft />
            </Button>
          </Link>

          <div className="flex items-center gap-3 flex-1 min-w-0 -ml-2 pl-2 py-1.5">
            {hasStory && storyUserId && (
              <StoryAvatar userId={storyUserId} src={chat.avatar} name={chat.name} size={40} />
            )}
            <button
              onClick={openProfile}
              className="flex items-center gap-3 flex-1 min-w-0 hover:bg-foreground/[0.03] rounded-xl py-1 transition group"
            >
              {!(hasStory && storyUserId) && (
                <AnimatedAvatar
                  src={chat.avatar}
                  name={chat.name}
                  size={40}
                  status={isOnline ? "online" : "offline"}
                  pulse={false}
                  breathe={false}
                  ring={false}
                  hoverLift={false}
                />
              )}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{chat.name}</span>
                  {chat.encrypted && <Lock className="size-3.5 text-emerald-400" />}
                  {chat.type === "ghost" && (
                    <Badge variant="glass" className="!text-[10px]">
                      <Ghost className="size-2.5" /> ghost
                    </Badge>
                  )}
                </div>
                <div className={`text-[11px] truncate ${isTyping ? "text-cyan-400" : "text-muted-foreground"}`}>
                  {chat.type === "group" || chat.type === "channel"
                    ? isTyping
                      ? t("typing…")
                      : `${chat.membersCount} ${t("members")}`
                    : isTyping
                    ? t("typing…")
                    : isOnline
                    ? t("online")
                    : chat.lastSeenAt
                    ? `${t("last seen")} ${formatLastSeen(new Date(chat.lastSeenAt))}`
                    : t("last seen recently")}
                </div>
              </div>
            </button>
          </div>
        </>
      )}

      <div className={`flex items-center gap-1 ${searchActive ? "hidden" : ""}`}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => startCall(false)}
          title={t("Voice call")}
          className="[&_svg]:size-[22px] dark:text-white dark:hover:text-white"
        >
          <Phone />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => startCall(true)}
          title={t("Video call")}
          className="[&_svg]:size-[22px] dark:text-white dark:hover:text-white"
        >
          <Video />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSearchChange?.("")}
          title={t("Search in chat")}
          aria-label={t("Search in chat")}
          className="[&_svg]:size-[22px] dark:text-white dark:hover:text-white"
        >
          <Search />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="More options"
              className="[&_svg]:size-[22px] dark:text-white dark:hover:text-white"
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="!w-64">
            <DropdownMenuLabel className="flex items-center justify-between !text-[10px]">
              <span>{chat.name}</span>
              <span className="text-cyan-400 normal-case">{themeId}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={() => setRightPanel("details")}>
              <Users />
              {t("View profile")}
              <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setThemeOpen(true)}>
              <Palette />
              {t("Chat theme")}
              <Badge variant="cyan" className="ml-auto !text-[9px] !px-1.5">
                <Sparkles className="size-2" /> new
              </Badge>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CalendarClock />
              {t("Schedule message")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => pinChat(chat.id, !chat.pinned)}>
              <Pin />
              {chat.pinned ? t("Unpin chat") : t("Pin chat")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => muteChat(chat.id, !chat.muted)}>
              {chat.muted ? <Bell /> : <BellOff />}
              {chat.muted ? t("Unmute") : t("Mute notifications")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => favouriteChat(chat.id, !chat.favorite)}>
              <Star />
              {chat.favorite ? t("Remove from favorites") : t("Add to favorites")}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={() => {
                // Serialize the current chat's messages and trigger a download.
                if (typeof window === "undefined") return;
                const list = messages[chat.id] ?? [];
                const blob = new Blob([JSON.stringify(list, null, 2)], {
                  type: "application/json"
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${chat.name.replace(/[^\w-]+/g, "_") || "chat"}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              <Download />
              {t("Export chat")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                if (typeof window !== "undefined" && window.confirm(t("Clear all messages in this chat?"))) {
                  void clearChat(chat.id);
                }
              }}
            >
              <Eraser />
              {t("Clear chat")}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="text-rose-600 focus:text-rose-400"
              onSelect={() => {
                if (chat.type !== "dm" || !otherMemberId) return;
                if (
                  typeof window !== "undefined" &&
                  window.confirm(
                    t("Block this contact? They won't be able to message you and this chat will close.")
                  )
                ) {
                  void (async () => {
                    await blockUser(otherMemberId);
                    await removeChat(chat.id);
                    router.push("/chats");
                  })();
                }
              }}
            >
              <Ban />
              {t("Block contact")}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-rose-600 focus:text-rose-400">
              <Flag />
              {t("Report")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-rose-600 focus:text-rose-400"
              onSelect={() => {
                removeChat(chat.id);
                router.push("/chats");
              }}
            >
              <Trash2 />
              {t("Delete chat")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ChatThemeDialog chatId={chat.id} open={themeOpen} onOpenChange={setThemeOpen} />

      <DeleteMessageDialog
        open={deleteOpen}
        count={selectedIds.length}
        canDeleteForEveryone={allSelectedAreMine}
        onClose={() => setDeleteOpen(false)}
        onDeleteForMe={async () => {
          await hideMessages(chat.id, selectedIds);
          clearSelection(chat.id);
          setDeleteOpen(false);
        }}
        onDeleteForEveryone={async () => {
          await removeMessages(chat.id, selectedIds);
          clearSelection(chat.id);
          setDeleteOpen(false);
        }}
      />
    </div>
  );
}

export function PinnedBar({ pinned }: { pinned?: string }) {
  if (!pinned) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-card/60 dark:bg-card/55 backdrop-blur-xl backdrop-saturate-180 text-xs">
      <PinIcon className="size-3.5 text-amber-400" />
      <span className="text-muted-foreground line-clamp-1 flex-1">Pinned: {pinned}</span>
      <button className="text-cyan-400 hover:underline text-[11px]">view all</button>
    </div>
  );
}
