"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Pin,
  BellOff,
  Lock,
  Ghost,
  Hash,
  Users,
  Search,
  X,
  MoreHorizontal,
  Pencil,
  Star,
  CheckCheck,
  Image as ImageIcon,
  Mic,
  Video as VideoIcon,
  FileText
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AnimatedAvatar } from "@/components/animated-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useChatStore } from "@/store/use-chat-store";
import { users as allUsers } from "@/lib/mock-data";
import { cn, formatRelative } from "@/lib/utils";
import { StoriesRail } from "./stories-rail";
import { NewGroupDialog } from "./new-group-dialog";
import { EmptyChatList } from "./empty-chat-list";
import type { Chat, ChatHint } from "@/types";

type Filter = "all" | "unread" | "groups" | "secret" | "favorites";

function typeIcon(t: Chat["type"]) {
  switch (t) {
    case "secret":
      return <Lock className="size-3" />;
    case "ghost":
      return <Ghost className="size-3" />;
    case "channel":
      return <Hash className="size-3" />;
    case "group":
      return <Users className="size-3" />;
    default:
      return null;
  }
}

export function ChatList({
  activeId,
  onSelect
}: {
  activeId?: string;
  onSelect?: (id: string) => void;
}) {
  const router = useRouter();
  const chats = useChatStore((s) => s.chats);
  const markRead = useChatStore((s) => s.markRead);
  const addGroup = useChatStore((s) => s.addGroup);
  const startDM = useChatStore((s) => s.startDM);
  const clearAll = useChatStore((s) => s.clearAll);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [q, setQ] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [groupOpen, setGroupOpen] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (searchOpen) {
      // Focus immediately on the next frame and again after the animation lands,
      // so the input is always active no matter where AnimatePresence is.
      requestAnimationFrame(() => searchInputRef.current?.focus());
      const id = setTimeout(() => searchInputRef.current?.focus(), 350);
      return () => clearTimeout(id);
    } else {
      setQ("");
    }
  }, [searchOpen]);

  const filtered = chats
    .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    .filter((c) => {
      if (filter === "unread") return (c.unread ?? 0) > 0;
      if (filter === "groups") return c.type === "group" || c.type === "channel";
      if (filter === "secret") return c.type === "secret" || c.type === "ghost";
      if (filter === "favorites") return c.favorite;
      return true;
    });

  const pinned = filtered.filter((c) => c.pinned);
  const rest = filtered.filter((c) => !c.pinned);

  const userSuggestions = allUsers
    .filter((u) => u.id !== "me")
    .filter((u) =>
      q.trim() === ""
        ? true
        : u.name.toLowerCase().includes(q.toLowerCase()) ||
          u.username.toLowerCase().includes(q.toLowerCase())
    );

  const markAllRead = () => chats.forEach((c) => markRead(c.id));

  const handleStartDM = (userId: string) => {
    const c = startDM(userId);
    setSearchOpen(false);
    router.push(`/chats/${c.id}`);
  };

  const isEmpty = chats.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="relative flex items-center justify-between gap-2 px-4 pt-5 pb-2 h-[68px]">
        <AnimatePresence mode="wait" initial={false}>
          {searchOpen ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, scaleX: 0.6, x: 60 }}
              animate={{ opacity: 1, scaleX: 1, x: 0 }}
              exit={{ opacity: 0, scaleX: 0.6, x: 60 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              style={{ originX: 1 }}
              className="absolute left-4 right-4 top-1/2 -translate-y-1/2"
            >
              <div className="relative flex items-center h-11 rounded-full glass border border-border/60 shadow-[0_4px_18px_-6px_rgba(0,0,0,0.4)] focus-within:ring-2 focus-within:ring-cyan-400/60 transition">
                <span className="grid place-items-center size-11 shrink-0">
                  <Search className="size-[18px] text-muted-foreground" />
                </span>
                <input
                  ref={searchInputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search chats and people"
                  className="flex-1 bg-transparent text-[15px] leading-none outline-none placeholder:text-muted-foreground/70 pr-2"
                />
                <button
                  onClick={() => setSearchOpen(false)}
                  className="mr-1.5 size-8 rounded-full grid place-items-center hover:bg-foreground/10 transition shrink-0"
                  aria-label="Close search"
                >
                  <X className="size-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="title"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="text-3xl font-display font-semibold tracking-tight"
            >
              Chat
            </motion.div>
          )}
        </AnimatePresence>

        <div className={cn("flex items-center gap-1 transition-opacity", searchOpen && "opacity-0 pointer-events-none")}>
          <button
            onClick={() => setSearchOpen(true)}
            className="size-10 rounded-full grid place-items-center hover:bg-foreground/[0.05] transition"
            aria-label="Search"
          >
            <Search className="size-[18px]" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="size-10 rounded-full grid place-items-center hover:bg-foreground/[0.05] transition"
                aria-label="More"
              >
                <MoreHorizontal className="size-[20px]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="!w-56">
              <DropdownMenuLabel className="!text-[10px]">Chat options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setGroupOpen(true)}>
                <Pencil />
                New group
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={markAllRead}>
                <CheckCheck />
                Mark all as read
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setFilter("favorites")}>
                <Star />
                Favourites
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setFilter("all")}>
                All chats
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  clearAll();
                  router.push("/chats");
                }}
                className="text-rose-400 focus:text-rose-400"
              >
                Reset chats (demo)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filter chips — hidden in empty mode */}
      {!isEmpty && (
        <div className="flex gap-1.5 px-4 mt-1 overflow-x-auto no-scrollbar">
          {(
            [
              { id: "all", label: "All" },
              { id: "unread", label: "Unread" },
              { id: "favorites", label: "Favourites" },
              { id: "groups", label: "Groups" },
              { id: "secret", label: "Secret" }
            ] as { id: Filter; label: string }[]
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition",
                filter === f.id
                  ? "bg-foreground text-background"
                  : "glass-subtle text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {!isEmpty && <StoriesRail />}

      {/* SEARCH RESULTS — shown when search is open, regardless of empty state */}
      {searchOpen && (
        <ScrollArea className="flex-1 px-3 scroll-fade-y">
          {filtered.length > 0 && (
            <>
              <SectionLabel>Your chats</SectionLabel>
              {filtered.map((c) => (
                <ChatRow
                  key={c.id}
                  chat={c}
                  active={c.id === activeId}
                  onSelect={onSelect}
                />
              ))}
            </>
          )}

          <SectionLabel>
            {q.trim() === "" ? "Suggested people" : "People"}
          </SectionLabel>
          {userSuggestions.length > 0 ? (
            userSuggestions.map((u) => (
              <button
                key={u.id}
                onClick={() => handleStartDM(u.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-foreground/[0.04] transition text-left"
              >
                <AnimatedAvatar
                  src={u.avatar}
                  name={u.name}
                  size={44}
                  status={u.status}
                  pulse={false}
                  breathe={false}
                  ring={false}
                  hoverLift={false}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{u.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    @{u.username} · {u.bio}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-white">
                  Chat
                </span>
              </button>
            ))
          ) : (
            <p className="text-center text-xs text-muted-foreground py-6">
              No people match "{q}".
            </p>
          )}
          <div className="h-4" />
        </ScrollArea>
      )}

      {/* EMPTY STATE — when there are no chats and search is closed */}
      {!searchOpen && isEmpty && (
        <EmptyChatList onEnter={() => setSearchOpen(true)} />
      )}

      {/* NORMAL CHAT LIST */}
      {!searchOpen && !isEmpty && (
        <>
          <div className="px-5 pt-2 pb-1 flex items-baseline gap-2">
            <h3 className="text-[15px] font-semibold tracking-tight">Messages</h3>
            <span className="text-[10px] text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "conversation" : "conversations"}
            </span>
          </div>

          <ScrollArea className="flex-1 px-3 scroll-fade-y">
            {pinned.length > 0 && <SectionLabel>Pinned</SectionLabel>}
            {pinned.map((chat) => (
              <ChatRow
                key={chat.id}
                chat={chat}
                active={chat.id === activeId}
                onSelect={onSelect}
              />
            ))}
            {pinned.length > 0 && rest.length > 0 && (
              <SectionLabel>All conversations</SectionLabel>
            )}
            {rest.map((chat) => (
              <ChatRow
                key={chat.id}
                chat={chat}
                active={chat.id === activeId}
                onSelect={onSelect}
              />
            ))}
            {filtered.length === 0 && (
              <div className="grid place-items-center py-16 text-center text-sm text-muted-foreground">
                <p>No conversations match this filter.</p>
              </div>
            )}
            <div className="h-4" />
          </ScrollArea>
        </>
      )}

      <NewGroupDialog
        open={groupOpen}
        onOpenChange={setGroupOpen}
        onCreate={({ name, description, members }) => {
          const created = addGroup({
            name,
            description,
            memberIds: members
          });
          router.push(`/chats/${created.id}`);
        }}
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

function ChatRow({
  chat,
  active,
  onSelect
}: {
  chat: Chat;
  active?: boolean;
  onSelect?: (id: string) => void;
}) {
  return (
    <Link
      href={`/chats/${chat.id}`}
      onClick={() => onSelect?.(chat.id)}
      className={cn(
        "relative flex items-center gap-3.5 px-3 py-3 rounded-2xl transition group active:scale-[0.99]",
        active ? "bg-foreground/[0.07]" : "hover:bg-foreground/[0.04]"
      )}
    >
      {active && (
        <span
          className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b from-violet-400 to-cyan-400"
        />
      )}

        <div className="relative shrink-0">
          <AnimatedAvatar
            src={chat.avatar}
            name={chat.name}
            size={52}
            status={chat.online ? "online" : "offline"}
            pulse={false}
            breathe={false}
            ring={false}
            hoverLift={false}
          />
          {chat.type === "ghost" && (
            <span className="absolute -top-1 -right-1 size-6 rounded-full glass grid place-items-center">
              <Ghost className="size-3 text-violet-400" />
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold truncate">{chat.name}</span>
            {typeIcon(chat.type) && (
              <span className="text-muted-foreground">{typeIcon(chat.type)}</span>
            )}
            {chat.favorite && (
              <Star className="size-3 text-amber-400 fill-amber-400/70" />
            )}
            <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
              {chat.lastMessageAt && formatRelative(chat.lastMessageAt)}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <HintOrPreview chat={chat} />
            <div className="ml-auto flex items-center gap-1.5">
              {chat.muted && <BellOff className="size-3 text-muted-foreground" />}
              {chat.pinned && <Pin className="size-3 text-muted-foreground" />}
              {!!chat.unread && (
                <Badge
                  variant="default"
                  className={cn(
                    "!px-2 !py-0.5 !text-[10px] min-w-[20px] justify-center",
                    "bg-gradient-to-br from-rose-500 to-pink-500 text-white border-0"
                  )}
                >
                  {chat.unread}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Link>
  );
}

function HintOrPreview({ chat }: { chat: Chat }) {
  if (chat.hint) {
    return <HintBadge hint={chat.hint} unread={!!chat.unread} />;
  }
  return (
    <p
      className={cn(
        "text-[12.5px] truncate flex-1",
        chat.unread ? "text-foreground/85 font-medium" : "text-muted-foreground"
      )}
    >
      {chat.lastMessage}
    </p>
  );
}

function HintBadge({ hint, unread }: { hint: ChatHint; unread?: boolean }) {
  switch (hint.kind) {
    case "typing":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 text-[11px] font-medium">
          <TypingDots />
          {hint.label ?? "Typing…"}
        </span>
      );
    case "photo":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 text-[11px] font-medium">
          <ImageIcon className="size-3" />
          {hint.label ?? "Photo"}
        </span>
      );
    case "voice":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-medium">
          <Mic className="size-3" />
          {hint.label ?? "Voice"}
        </span>
      );
    case "video":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 text-[11px] font-medium">
          <VideoIcon className="size-3" />
          {hint.label ?? "Video"}
        </span>
      );
    case "file":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[11px] font-medium">
          <FileText className="size-3" />
          {hint.label ?? "File"}
        </span>
      );
    case "draft":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-foreground/10 text-foreground/70 text-[11px] font-medium">
          {hint.label ?? "Draft"}
        </span>
      );
  }
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          className="size-[3px] rounded-full bg-current"
        />
      ))}
    </span>
  );
}
