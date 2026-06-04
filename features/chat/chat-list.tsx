"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  ChevronRight,
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
import { useCommunityStore } from "@/store/use-community-store";
import { useStoriesStore } from "@/store/use-stories-store";
import { useImageLightbox } from "@/features/chat/image-lightbox";
import { StoryAvatar } from "@/components/stories/story-avatar";
import { users as allUsers } from "@/lib/mock-data";
import { cn, formatRelative } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { CommunityGridCard, CommunityGridEmpty } from "@/features/community/community-grid-card";
import { InterestMatchPopup } from "@/features/community/interest-match-popup";
import { CreateCommunityDialog } from "@/features/community/create-community-dialog";
import { StoriesRail } from "./stories-rail";
import { StoryUploadBar } from "./story-upload-bar";
import { NewGroupDialog } from "./new-group-dialog";
import { EmptyChatList } from "./empty-chat-list";
import type { Chat, ChatHint, Community, User } from "@/types";
import { CheckCircle2, Flame, Sparkles } from "lucide-react";
import { searchUsers } from "@/lib/supabase/actions";
import { useAuthStore } from "@/store/use-auth-store";
import { useToast } from "@/components/ui/toaster";

type Filter = "all" | "unread" | "groups" | "secret" | "favorites";
type CommunityFilter = "all" | "joined" | "trending" | "mine";
type View = "messages" | "community";

const COMMUNITY_FILTERS: { id: CommunityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "joined", label: "Joined" },
  { id: "trending", label: "Trending" },
  { id: "mine", label: "Mine" }
];

function typeIcon(t: Chat["type"]) {
  switch (t) {
    case "secret":
      return <Lock className="size-3.5" />;
    case "ghost":
      return <Ghost className="size-3.5" />;
    case "channel":
      return <Hash className="size-3.5" />;
    case "group":
      return <Users className="size-3.5" />;
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
  const t = useT();
  const { toast } = useToast();
  // `?tab=community` lands the chat list on the Community tab — used by the
  // back button from the community detail page so users return to where they
  // came from.
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get("tab");
  const chats = useChatStore((s) => s.chats);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const markRead = useChatStore((s) => s.markRead);
  const addGroup = useChatStore((s) => s.addGroup);
  const startDM = useChatStore((s) => s.startDM);
  const clearAll = useChatStore((s) => s.clearAll);

  // Community store — drives the mobile Community tab in the chat list.
  const communities = useCommunityStore((s) => s.communities);
  const joinedCommunityIds = useCommunityStore((s) => s.joinedIds);
  const hostedCommunityIds = useCommunityStore((s) => s.hostedIds);
  const joinCommunityById = useCommunityStore((s) => s.joinCommunity);
  const fetchCommunities = useCommunityStore((s) => s.fetchCommunities);
  const communitiesLoaded = useCommunityStore((s) => s.loaded);
  React.useEffect(() => {
    if (!communitiesLoaded) void fetchCommunities();
  }, [communitiesLoaded, fetchCommunities]);

  const [filter, setFilter] = React.useState<Filter>("all");
  const [communityFilter, setCommunityFilter] =
    React.useState<CommunityFilter>("all");
  const [view, setView] = React.useState<View>(
    initialTab === "community" ? "community" : "messages"
  );

  // If the URL changes after mount (e.g. soft nav back), keep the tab in sync.
  React.useEffect(() => {
    if (initialTab === "community" && view !== "community") setView("community");
    // Only react to a *change* in the param, not local toggle state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);
  const [q, setQ] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [groupOpen, setGroupOpen] = React.useState(false);
  const [createCommunityOpen, setCreateCommunityOpen] = React.useState(false);
  const [match, setMatch] = React.useState<{
    open: boolean;
    count: number;
    name: string;
  }>({ open: false, count: 0, name: "" });
  const [userSuggestions, setUserSuggestions] = React.useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!searchOpen) {
      setQ("");
      setUserSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      const { data } = await searchUsers(q);
      
      // Filter out people you already have a DM with
      const existingDMUserIds = new Set(
        chats.filter(c => c.type === 'dm').flatMap(c => c.memberIds || [])
      );
      
      const filteredSuggestions = (data as User[] || []).filter(u => !existingDMUserIds.has(u.id));
      
      setUserSuggestions(filteredSuggestions);
      setIsSearchingUsers(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [q, searchOpen, chats]);

  React.useEffect(() => {
    if (searchOpen) {
      // Focus immediately on the next frame and again after the animation lands,
      // so the input is always active no matter where AnimatePresence is.
      requestAnimationFrame(() => searchInputRef.current?.focus());
      const id = setTimeout(() => searchInputRef.current?.focus(), 350);
      return () => clearTimeout(id);
    }
  }, [searchOpen]);

  const filtered = chats
    .filter((c) => (c.name || "").toLowerCase().includes(q.toLowerCase()))
    .filter((c) => {
      if (filter === "unread") return (c.unread ?? 0) > 0;
      if (filter === "groups") return c.type === "group" || c.type === "channel";
      if (filter === "secret") return c.type === "secret" || c.type === "ghost";
      if (filter === "favorites") return c.favorite;
      return true;
    });

  const pinned = filtered.filter((c) => c.pinned);
  const rest = filtered.filter((c) => !c.pinned);

  const markAllRead = () => chats.forEach((c) => markRead(c.id));

  const handleStartDM = async (user: User) => {
    try {
      const result = await startDM(user);
      if (result?.data?.id) {
        setSearchOpen(false);
        router.push(`/chats/${result.data.id}`);
      } else if (result?.error) {
        toast({
          title: "Error",
          description: result.error,
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create chat",
      });
    }
  };

  // Filter the community grid by the current query + the active community
  // filter chip. Used by the mobile Community tab.
  const filteredCommunities = communities
    .filter((c) =>
      q.trim() === ""
        ? true
        : c.name.toLowerCase().includes(q.toLowerCase()) ||
          c.category.toLowerCase().includes(q.toLowerCase()) ||
          c.description?.toLowerCase().includes(q.toLowerCase()) ||
          c.interests?.some((i) => i.toLowerCase().includes(q.toLowerCase()))
    )
    .filter((c) => {
      if (communityFilter === "joined") return joinedCommunityIds.includes(c.id);
      if (communityFilter === "trending") return !!c.trending;
      if (communityFilter === "mine") return hostedCommunityIds.includes(c.id);
      return true;
    });

  const handleJoinCommunityFromCard = async (
    e: React.MouseEvent,
    community: Community
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const target = `/discover/community/${community.id}?from=chats`;
    if (joinedCommunityIds.includes(community.id)) {
      router.push(target);
      return;
    }
    const { matched } = await joinCommunityById(community.id);
    setMatch({ open: true, count: matched, name: community.name });
    window.setTimeout(() => {
      router.push(target);
    }, 1200);
  };

  const isEmpty = chats.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="relative flex items-center justify-between gap-2 px-4 pt-4 pb-3 h-[76px]">
        <AnimatePresence mode="wait" initial={false}>
          {searchOpen ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, scaleX: 0.6, x: 60 }}
              animate={{ opacity: 1, scaleX: 1, x: 0 }}
              exit={{ opacity: 0, scaleX: 0.6, x: 60 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              style={{ originX: 1 }}
              className="absolute left-4 right-4 top-1/2 -translate-y-1/2 z-10"
            >
              <div className="relative flex items-center h-11 rounded-full glass border border-border/60 shadow-[0_4px_18px_-6px_rgba(0,0,0,0.4)] focus-within:ring-2 focus-within:ring-cyan-400/60 transition">
                <span className="grid place-items-center size-11 shrink-0">
                  <Search className="size-[18px] text-muted-foreground" />
                </span>
                <input
                  ref={searchInputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={
                    view === "community"
                      ? t("Search communities, topics, tags")
                      : t("Search chats and people")
                  }
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
              {t("Chat")}
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
              <DropdownMenuLabel className="!text-[10px]">
                {view === "community" ? t("Community options") : t("Chat options")}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {view === "community" ? (
                <DropdownMenuItem onSelect={() => setCreateCommunityOpen(true)}>
                  <Pencil />
                  {t("New community")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setGroupOpen(true)}>
                  <Pencil />
                  {t("New group")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={markAllRead}>
                <CheckCheck />
                {t("Mark all as read")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setFilter("favorites")}>
                <Star />
                {t("Favourites")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setFilter("all")}>
                {t("All chats")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  clearAll();
                  router.push("/chats");
                }}
                className="text-rose-400 focus:text-rose-400"
              >
                {t("Reset chats (demo)")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Story upload progress — sits between the title and the filter tabs. */}
      <StoryUploadBar />

      {/* Filter chips — swap based on the active view. */}
      {!isEmpty && view === "messages" && (
        <div className="flex gap-1.5 px-4 mt-4 overflow-x-auto no-scrollbar">
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
              {t(f.label)}
            </button>
          ))}
        </div>
      )}
      {view === "community" && (
        <div className="flex gap-1.5 px-4 mt-4 overflow-x-auto no-scrollbar">
          {COMMUNITY_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setCommunityFilter(f.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition",
                communityFilter === f.id
                  ? "bg-foreground text-background"
                  : "glass-subtle text-muted-foreground hover:text-foreground"
              )}
            >
              {t(f.label)}
            </button>
          ))}
        </div>
      )}

      {!isEmpty && <StoriesRail />}

      {/* SEARCH RESULTS — view-aware. On Messages we search chats + people;
          on Community we search only communities. */}
      {searchOpen && view === "messages" && (
        <ScrollArea className="flex-1 px-3 scroll-fade-y">
          {filtered.length > 0 && (
            <>
              <SectionLabel>{t("Your chats")}</SectionLabel>
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
            {q.trim() === "" ? t("Suggested people") : t("People")}
          </SectionLabel>
          {userSuggestions.length > 0 ? (
            userSuggestions.map((u) => {
              const isOnline = onlineUsers.includes(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => handleStartDM(u)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-foreground/[0.04] transition text-left group"
                >
                  <AnimatedAvatar
                    src={u.avatar}
                    name={u.name}
                    size={44}
                    status={isOnline ? "online" : "offline"}
                    pulse={isOnline}
                    breathe={false}
                    ring={false}
                    hoverLift={false}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{u.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      @{u.username}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })
          ) : (
            <p className="text-center text-xs text-muted-foreground py-6">
              No people match "{q}".
            </p>
          )}
          <div className="h-4" />
        </ScrollArea>
      )}

      {searchOpen && view === "community" && (
        <ScrollArea className="flex-1 px-3 scroll-fade-y">
          <SectionLabel>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="size-3 text-cyan-300" />
              {q.trim() === "" ? t("All communities") : t("Communities")}
            </span>
          </SectionLabel>
          {filteredCommunities.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 pt-1 pb-4">
              {filteredCommunities.map((c) => (
                <CommunityGridCard
                  key={c.id}
                  community={c}
                  joined={joinedCommunityIds.includes(c.id)}
                  onJoin={(e) => {
                    setSearchOpen(false);
                    handleJoinCommunityFromCard(e, c);
                  }}
                  size="compact"
                  from="chats"
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground py-6">
              No communities match "{q}".
            </p>
          )}
        </ScrollArea>
      )}

      {/* EMPTY STATE — when there are no chats and search is closed */}
      {!searchOpen && isEmpty && (
        <EmptyChatList onEnter={() => setSearchOpen(true)} />
      )}

      {/* NORMAL LIST — either chats or communities depending on the view tab. */}
      {!searchOpen && !isEmpty && (
        <>
          {/* Messages / Community toggle. On mobile this acts as the main
              section heading; on desktop the same toggle is fine too. */}
          <div className="px-5 pt-2 pb-1 flex items-baseline gap-5">
            <ViewTab
              label={t("Messages")}
              active={view === "messages"}
              onClick={() => setView("messages")}
            />
            <ViewTab
              label={t("Community")}
              active={view === "community"}
              onClick={() => setView("community")}
            />
          </div>

          {view === "messages" ? (
            <ScrollArea className="flex-1 px-3 scroll-fade-y">
              {pinned.length > 0 && <SectionLabel>{t("Pinned")}</SectionLabel>}
              {pinned.map((chat) => (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  active={chat.id === activeId}
                  onSelect={onSelect}
                />
              ))}
              {pinned.length > 0 && rest.length > 0 && (
                <SectionLabel>{t("All conversations")}</SectionLabel>
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
                  <p>{t("No conversations match this filter.")}</p>
                </div>
              )}
              <div className="h-4" />
            </ScrollArea>
          ) : (
            <ScrollArea className="flex-1 px-3 scroll-fade-y">
              {filteredCommunities.length === 0 ? (
                <CommunityGridEmpty
                  title={
                    communityFilter === "joined"
                      ? "You haven't joined any yet"
                      : communityFilter === "mine"
                        ? "You haven't created any communities"
                        : communityFilter === "trending"
                          ? "Nothing trending here"
                          : "No matches"
                  }
                  body={
                    communityFilter === "joined"
                      ? "Browse Discover and tap Join on a community that vibes."
                      : "Try a different keyword, filter, or create your own community from Discover."
                  }
                />
              ) : (
                <div className="grid grid-cols-2 gap-2.5 pt-1 pb-4">
                  {filteredCommunities.map((c) => (
                    <CommunityGridCard
                      key={c.id}
                      community={c}
                      joined={joinedCommunityIds.includes(c.id)}
                      onJoin={(e) => handleJoinCommunityFromCard(e, c)}
                      size="compact"
                      from="chats"
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </>
      )}

      <NewGroupDialog
        open={groupOpen}
        onOpenChange={setGroupOpen}
        onCreated={(chatId) => {
          router.push(`/chats/${chatId}`);
        }}
      />

      <InterestMatchPopup
        open={match.open}
        count={match.count}
        communityName={match.name}
        onClose={() => setMatch({ open: false, count: 0, name: "" })}
      />

      <CreateCommunityDialog
        open={createCommunityOpen}
        onOpenChange={setCreateCommunityOpen}
      />
    </div>
  );
}

function ViewTab({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative inline-flex pb-1.5"
    >
      <span
        className={cn(
          "text-[15px] font-semibold tracking-tight transition",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
        )}
      >
        {label}
      </span>
      {active && (
        <motion.span
          layoutId="view-tab-indicator"
          className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-violet-400 to-cyan-400"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
    </button>
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
  const me = useAuthStore((s) => s.user);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const typingMap = useChatStore((s) => s.typing);
  const isTyping = (typingMap[chat.id]?.length ?? 0) > 0;
  
  // DM chats: check if the other member is online
  const otherMemberId = chat.memberIds?.find(id => id !== me?.id);
  const isOnline = chat.type === 'dm' 
    ? (otherMemberId && onlineUsers.includes(otherMemberId)) 
    : !!chat.online;

  // DM chats map to a single user → show their story ring on the avatar.
  const storyUserId = chat.type === "dm" ? otherMemberId : undefined;
  const hasStory = useStoriesStore((s) =>
    storyUserId ? !!s.byUser[storyUserId]?.slides.length : false
  );
  const openPrompt = useStoriesStore((s) => s.openPrompt);
  const lightbox = useImageLightbox();

  /** Click intercept for the AVATAR specifically. The whole row is a
   *  <Link> that navigates into the chat — preventDefault + stopPropagation
   *  keep that from firing. Then:
   *    • DM with a partner user → "Profile photo or Story?" prompt
   *    • Group / channel / ghost → open the group image directly in
   *      the shared lightbox (no prompt — groups don't have stories).
   *  Falls back to the row-level navigation when neither path applies
   *  (e.g. a DM with no resolvable partner id). */
  const onAvatarClick = (e: React.MouseEvent) => {
    if (chat.type === "dm" && storyUserId) {
      e.preventDefault();
      e.stopPropagation();
      openPrompt(storyUserId);
      return;
    }
    if (chat.type !== "dm" && chat.avatar) {
      e.preventDefault();
      e.stopPropagation();
      lightbox.open([{ src: chat.avatar, alt: chat.name }], 0);
    }
    // else: let the parent <Link> handle navigation as normal.
  };

  return (
    <Link
      href={`/chats/${chat.id}`}
      onClick={() => onSelect?.(chat.id)}
      className={cn(
        // Compact row — `py-1.5` keeps the row tight so the active chat
        // never looks visibly taller than its inactive neighbours. `mt-1.5`
        // adds breathing room between consecutive rows so the list doesn't
        // read as one solid block.
        "relative flex items-center gap-3 px-3 py-1.5 mt-1.5 transition group active:scale-[0.99]",
        // Square left corners + rounded right corners on BOTH hover and
        // active so the row shape is consistent and the active indicator
        // bar always sits flush against a straight edge.
        "rounded-l-none rounded-r-2xl",
        active
          ? "bg-foreground/[0.07]"
          : "hover:bg-foreground/[0.04]"
      )}
    >
      {active && (
        <span
          className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-400 to-cyan-400"
        />
      )}

        <div
          className="relative shrink-0 cursor-pointer"
          onClick={onAvatarClick}
          role="button"
          tabIndex={-1}
          aria-label={chat.type === "dm" ? "View profile or story" : "View group photo"}
        >
          {hasStory && storyUserId ? (
            <StoryAvatar userId={storyUserId} src={chat.avatar} name={chat.name} size={44} />
          ) : (
            <AnimatedAvatar
              src={chat.avatar}
              name={chat.name}
              size={44}
              status={isOnline ? "online" : "offline"}
              pulse={false}
              breathe={false}
              ring={false}
              hoverLift={false}
            />
          )}
          {chat.type === "ghost" && (
            <span className="absolute -top-1 -right-1 size-6 rounded-full glass grid place-items-center">
              <Ghost className="size-3 text-violet-400" />
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-semibold truncate leading-tight">
              {chat.name}
            </span>
            {typeIcon(chat.type) && (
              <span className="text-muted-foreground shrink-0">
                {typeIcon(chat.type)}
              </span>
            )}
            {chat.favorite && (
              <Star className="size-3.5 text-amber-400 fill-amber-400/70 shrink-0" />
            )}
            <span
              className="ml-auto text-[11px] text-muted-foreground shrink-0 tabular-nums"
              suppressHydrationWarning
            >
              {chat.lastMessageAt && formatRelative(chat.lastMessageAt)}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <HintOrPreview chat={chat} isTyping={isTyping} />
            <div className="ml-auto flex items-center gap-2 shrink-0">
              {chat.muted && (
                <BellOff className="size-4 text-muted-foreground" />
              )}
              {chat.pinned && (
                <Pin className="size-4 text-muted-foreground" />
              )}
              {!!chat.unread && (
                // Solid red pill, white text, small + tight. WhatsApp-style.
                // `min-w-[18px] h-[18px]` keeps a perfect circle for single
                // digits and grows naturally for 2+ digit counts. The "+"
                // suffix matches the sidebar Chats badge convention.
                <span
                  className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-600 text-white text-[10px] font-semibold leading-none tabular-nums shadow-sm"
                  aria-label={`${chat.unread} unread`}
                >
                  {chat.unread}+
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
  );
}

function HintOrPreview({ chat, isTyping }: { chat: Chat, isTyping?: boolean }) {
  const t = useT();
  if (isTyping) {
    return <HintBadge hint={{ kind: "typing" }} unread={!!chat.unread} />;
  }
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
  const t = useT();
  switch (hint.kind) {
    case "typing":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 text-[11px] font-medium">
          <TypingDots />
          {hint.label ?? t("typing…")}
        </span>
      );
    case "photo":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 text-[11px] font-medium">
          <ImageIcon className="size-3" />
          {hint.label ?? t("Photo")}
        </span>
      );
    case "voice":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-medium">
          <Mic className="size-3" />
          {hint.label ?? t("Voice")}
        </span>
      );
    case "video":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 text-[11px] font-medium">
          <VideoIcon className="size-3" />
          {hint.label ?? t("Video")}
        </span>
      );
    case "file":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[11px] font-medium">
          <FileText className="size-3" />
          {hint.label ?? t("File")}
        </span>
      );
    case "draft":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-foreground/10 text-foreground/70 text-[11px] font-medium">
          {hint.label ?? t("Draft")}
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
