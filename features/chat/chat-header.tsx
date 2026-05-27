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
import { useChatThemeStore } from "@/store/use-chat-theme-store";
import { useMessageSelectionStore } from "@/store/use-message-selection-store";
import { copyText } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { UserProfileSheet } from "./user-profile-sheet";
import { ChatThemeDialog } from "./chat-theme-dialog";
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
  const startCallStore = useUIStore((s) => s.startCall);
  const chats = useChatStore((s) => s.chats);
  const removeChat = useChatStore((s) => s.removeChat);
  const updateChat = (id: string, patch: Partial<Chat>) =>
    useChatStore.setState({
      chats: chats.map((c) => (c.id === id ? { ...c, ...patch } : c))
    });

  const themeId = useChatThemeStore((s) => s.byChat[chat.id] ?? "default");
  const selectionCount = useMessageSelectionStore(
    (s) => s.selected[chat.id]?.length ?? 0
  );
  const clearSelection = useMessageSelectionStore((s) => s.clear);
  const removeMessages = useChatStore((s) => s.removeMessages);
  const selectionActive = selectionCount > 0;
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [themeOpen, setThemeOpen] = React.useState(false);

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

  const deleteSelected = () => {
    const ids = useMessageSelectionStore.getState().selected[chat.id] ?? [];
    const fn = removeMessages ?? useChatStore.getState().removeMessages;
    fn?.(chat.id, ids);
    clearSelection(chat.id);
  };

  if (selectionActive) {
    return (
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

          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-3 flex-1 min-w-0 hover:bg-foreground/[0.03] -ml-2 pl-2 py-1.5 rounded-xl transition group"
          >
            <AnimatedAvatar
              src={chat.avatar}
              name={chat.name}
              size={40}
              status={chat.online ? "online" : "offline"}
              pulse={false}
              breathe={false}
              ring={false}
              hoverLift={false}
            />
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
              <div className="text-[11px] text-muted-foreground truncate">
                {chat.type === "group" || chat.type === "channel"
                  ? `${chat.membersCount} ${t("members")} · ${Math.floor((chat.membersCount ?? 0) / 5)} ${t("online")}`
                  : chat.online
                  ? `${t("online")} · ${t("typing…")}`
                  : t("last seen 2h ago")}
              </div>
            </div>
          </button>
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

            <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
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
            <DropdownMenuItem
              onSelect={() => updateChat(chat.id, { pinned: !chat.pinned })}
            >
              <Pin />
              {chat.pinned ? t("Unpin chat") : t("Pin chat")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => updateChat(chat.id, { muted: !chat.muted })}
            >
              {chat.muted ? <Bell /> : <BellOff />}
              {chat.muted ? t("Unmute") : t("Mute notifications")}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Star />
              {t("Add to favorites")}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem>
              <Download />
              {t("Export chat")}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Eraser />
              {t("Clear chat")}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem className="text-rose-600 focus:text-rose-400">
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

      <UserProfileSheet chat={chat} open={profileOpen} onOpenChange={setProfileOpen} />
      <ChatThemeDialog chatId={chat.id} open={themeOpen} onOpenChange={setThemeOpen} />
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
