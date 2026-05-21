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
  Sparkles
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
import { UserProfileSheet } from "./user-profile-sheet";
import { ChatThemeDialog } from "./chat-theme-dialog";
import type { Chat } from "@/types";

export function ChatHeader({ chat }: { chat: Chat }) {
  const router = useRouter();
  const startCallStore = useUIStore((s) => s.startCall);
  const chats = useChatStore((s) => s.chats);
  const removeChat = useChatStore((s) => s.removeChat);
  const updateChat = (id: string, patch: Partial<Chat>) =>
    useChatStore.setState({
      chats: chats.map((c) => (c.id === id ? { ...c, ...patch } : c))
    });

  const themeId = useChatThemeStore((s) => s.byChat[chat.id] ?? "default");
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [themeOpen, setThemeOpen] = React.useState(false);

  const startCall = (video: boolean) => {
    startCallStore({ chatId: chat.id, name: chat.name, avatar: chat.avatar, video });
    router.push("/calls/active");
  };

  return (
    <div className="relative z-10 flex items-center gap-3 px-3 md:px-5 h-16 border-b border-border/40 backdrop-blur-xl backdrop-saturate-150 bg-background/40 glass-specular">
      <Link href="/chats" className="md:hidden">
        <Button variant="ghost" size="icon-sm">
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
              ? `${chat.membersCount} members · ${Math.floor((chat.membersCount ?? 0) / 5)} online`
              : chat.online
              ? "online · typing…"
              : "last seen 2h ago"}
          </div>
        </div>
      </button>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => startCall(false)} title="Voice call">
          <Phone />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => startCall(true)} title="Video call">
          <Video />
        </Button>
        <Button variant="ghost" size="icon" className="hidden md:inline-flex">
          <Search />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More options">
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
              View profile
              <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setThemeOpen(true)}>
              <Palette />
              Chat theme
              <Badge variant="cyan" className="ml-auto !text-[9px] !px-1.5">
                <Sparkles className="size-2" /> new
              </Badge>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CalendarClock />
              Schedule message
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => updateChat(chat.id, { pinned: !chat.pinned })}
            >
              <Pin />
              {chat.pinned ? "Unpin chat" : "Pin chat"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => updateChat(chat.id, { muted: !chat.muted })}
            >
              {chat.muted ? <Bell /> : <BellOff />}
              {chat.muted ? "Unmute" : "Mute notifications"}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Star />
              Add to favorites
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem>
              <Download />
              Export chat
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Eraser />
              Clear chat
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem className="text-amber-400 focus:text-amber-400">
              <Ban />
              Block contact
            </DropdownMenuItem>
            <DropdownMenuItem className="text-rose-400 focus:text-rose-400">
              <Flag />
              Report
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-rose-400 focus:text-rose-400"
              onSelect={() => {
                removeChat(chat.id);
                router.push("/chats");
              }}
            >
              <Trash2 />
              Delete chat
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
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-background/30 backdrop-blur-md text-xs">
      <PinIcon className="size-3.5 text-amber-400" />
      <span className="text-muted-foreground line-clamp-1 flex-1">Pinned: {pinned}</span>
      <button className="text-cyan-400 hover:underline text-[11px]">view all</button>
    </div>
  );
}
