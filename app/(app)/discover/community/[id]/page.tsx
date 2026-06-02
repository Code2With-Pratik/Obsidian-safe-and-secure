"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronLeft,
  Crown,
  Hash,
  Palette,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { CommunityPost } from "@/features/community/community-post";
import { CreatePostDialog } from "@/features/community/create-post-dialog";
import { InterestMatchPopup } from "@/features/community/interest-match-popup";
import { ShareCommunitySheet } from "@/features/community/share-community-sheet";
import { ChatThemeDialog } from "@/features/chat/chat-theme-dialog";
import {
  CHAT_THEMES,
  CUSTOM_THEME_ID,
  useChatThemeStore
} from "@/store/use-chat-theme-store";
import { EMPTY_POSTS, useCommunityStore } from "@/store/use-community-store";
import { users } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export default function CommunityDetailPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  // ?from=chats means the user navigated here from the chat-list Community
  // tab, so the back button should drop them back into /chats. Default is
  // /discover (Discover page) for everywhere else.
  const searchParams = useSearchParams();
  const from = searchParams?.get("from");
  // When coming from the chats Community tab, send the user back to that
  // exact tab — not the default Messages tab.
  const backHref = from === "chats" ? "/chats?tab=community" : "/discover";
  const backLabel = from === "chats" ? t("Community") : t("Discover");
  const community = useCommunityStore((s) =>
    s.communities.find((c) => c.id === params.id)
  );
  const posts = useCommunityStore(
    (s) => s.postsByCommunity[params.id ?? ""] ?? EMPTY_POSTS
  );
  const fetchCommunities = useCommunityStore((s) => s.fetchCommunities);
  const fetchPosts = useCommunityStore((s) => s.fetchPosts);
  const loaded = useCommunityStore((s) => s.loaded);

  // First mount → make sure the community list is loaded so this page can
  // find its community by id. Subsequent visits reuse the cached state.
  React.useEffect(() => {
    if (!loaded) void fetchCommunities();
  }, [loaded, fetchCommunities]);

  // Always (re)load posts when the route id changes.
  React.useEffect(() => {
    if (params.id) void fetchPosts(params.id);
  }, [params.id, fetchPosts]);
  const joined = useCommunityStore((s) =>
    params.id ? s.joinedIds.includes(params.id) : false
  );
  const isHost = useCommunityStore((s) =>
    params.id ? s.isHost(params.id) : false
  );
  const joinCommunity = useCommunityStore((s) => s.joinCommunity);
  const leaveCommunity = useCommunityStore((s) => s.leaveCommunity);
  const deleteCommunity = useCommunityStore((s) => s.deleteCommunity);
  const setCommunityTheme = useCommunityStore((s) => s.setCommunityTheme);

  // Theme — use community's override if set, else fall back to the user's global theme.
  const globalThemeId = useChatThemeStore((s) => s.globalTheme);
  const globalCustomBg = useChatThemeStore((s) => s.globalCustomBg);
  const themeId = community?.theme ?? globalThemeId;
  const themeObj = React.useMemo(() => {
    if (themeId === CUSTOM_THEME_ID) {
      const img = globalCustomBg;
      return {
        id: CUSTOM_THEME_ID,
        bubbleMe: "linear-gradient(135deg,#8B5CF6,#EC4899)",
        accent: "#8B5CF6",
        bg: img
          ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url("${img}") center/cover no-repeat`
          : ""
      };
    }
    const preset = CHAT_THEMES.find((t) => t.id === themeId) ?? CHAT_THEMES[0];
    return preset;
  }, [themeId, globalCustomBg]);

  const [postDialogOpen, setPostDialogOpen] = React.useState(false);
  const [themeDialogOpen, setThemeDialogOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [match, setMatch] = React.useState<{ open: boolean; count: number }>({
    open: false,
    count: 0
  });

  if (!community) {
    return (
      <div className="h-[calc(100dvh-4rem)] grid place-items-center">
        <div className="glass rounded-3xl p-10 text-center max-w-md">
          <Users className="size-12 mx-auto text-muted-foreground" />
          <h2 className="font-semibold mt-3 text-lg">{t("Community not found")}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("It may have been removed by its host.")}
          </p>
          <Button variant="gradient" className="mt-4" onClick={() => router.push("/discover")}>
            {t("Back to Discover")}
          </Button>
        </div>
      </div>
    );
  }

  const host = users.find((u) => u.id === community.hostId) ?? users[0];

  const handleJoin = async () => {
    const { matched } = await joinCommunity(community.id);
    setMatch({ open: true, count: matched });
  };

  const handleDelete = async () => {
    await deleteCommunity(community.id);
    router.push(backHref);
  };

  return (
    <ScrollArea className="h-[calc(100dvh-4rem)]">
      <div className="relative">
        {/* Background — theme bg behind the whole community feed. */}
        {themeObj.bg && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-40"
            style={{ background: themeObj.bg }}
          />
        )}

        {/* Cover */}
        <div className="relative h-56 md:h-64 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={community.cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-background" />
          <div className="absolute top-4 left-4">
            <Button
              variant="glass"
              size="sm"
              onClick={() => router.push(backHref)}
            >
              <ChevronLeft /> {backLabel}
            </Button>
          </div>
          {community.trending && (
            <Badge variant="danger" className="absolute top-4 right-4">
              <Sparkles className="size-3" /> {t("trending")}
            </Badge>
          )}
        </div>

        <div className="w-full px-4 md:px-8 lg:px-12 -mt-12 relative">
          {/* Identity card — spans the full content width on wide screens. */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl border border-border/60 p-5 md:p-6 w-full"
          >
            <div className="flex items-start gap-4">
              <Avatar className="size-16 ring-4 ring-background shadow-glow shrink-0">
                <AvatarImage src={host.avatar} />
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight truncate">
                    {community.name}
                  </h1>
                  {community.verified && (
                    <CheckCircle2 className="size-5 text-cyan-400 fill-cyan-400/20" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("hosted by")}{" "}
                  <span className="text-foreground inline-flex items-center gap-1">
                    <Crown className="size-3 text-amber-400" />
                    {host.name}
                  </span>
                  {" "}· {community.category}
                </p>
                {community.description && (
                  <p className="text-sm text-foreground/80 mt-3">
                    {community.description}
                  </p>
                )}
                {community.interests && community.interests.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {community.interests.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-foreground/5 border border-border/60 text-[11px] text-muted-foreground"
                      >
                        <Hash className="size-2.5" />
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Members + actions */}
            <div className="mt-5 pt-4 border-t border-border/40 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-semibold tabular-nums">
                    {community.members.toLocaleString()}
                  </span>{" "}
                  <span className="text-muted-foreground">{t("members")}</span>
                  <span className="mx-2 text-muted-foreground/40">·</span>
                  <span className="text-emerald-400 font-semibold tabular-nums">
                    {community.online.toLocaleString()}
                  </span>{" "}
                  <span className="text-muted-foreground">{t("online")}</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("Member identities are private — only reaction counts are shown.")}
                </p>
              </div>
              <div className="flex gap-2">
                {/* Share — always available, sits to the LEFT of the
                    Join / Joined / host action so non-members can still
                    share a community they haven't joined. */}
                <Button
                  variant="glass"
                  onClick={() => setShareOpen(true)}
                  aria-label={t("Share community")}
                >
                  <Share2 /> {t("Share")}
                </Button>
                {isHost ? (
                  <>
                    <Button variant="gradient" onClick={() => setPostDialogOpen(true)}>
                      <Plus /> {t("New post")}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="glass" size="icon" aria-label={t("Host menu")}>
                          <Crown />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="!w-56">
                        <DropdownMenuLabel className="!text-[10px]">
                          {t("Host actions")}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setThemeDialogOpen(true)}>
                          <Palette /> {t("Community theme")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => void handleDelete()}
                          className="!text-rose-400 focus:!text-rose-300"
                        >
                          <Trash2 /> {t("Delete community")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : joined ? (
                  <Button
                    variant="glass"
                    onClick={() => void leaveCommunity(community.id)}
                  >
                    <CheckCircle2 /> {t("Joined")}
                  </Button>
                ) : (
                  <Button variant="gradient" onClick={() => void handleJoin()}>
                    <Sparkles /> {t("Join community")}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Posts feed — masonry-ish column layout so wide screens use the
              full width without stretching individual posts. */}
          <div className="mt-6 mb-12">
            {posts.length === 0 ? (
              <EmptyFeed
                isHost={isHost}
                onCreate={() => setPostDialogOpen(true)}
              />
            ) : (
              <div className="columns-1 md:columns-2 xl:columns-3 gap-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
                {posts.map((post) => (
                  <CommunityPost
                    key={post.id}
                    post={post}
                    themeBubble={themeObj.bubbleMe}
                    themeAccent={themeObj.accent}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CreatePostDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
        communityId={community.id}
      />

      {/* Host can override the community theme — picks from the same chat-theme palette.
          When unset the community follows the user's global theme. */}
      <ChatThemeDialog
        open={themeDialogOpen}
        onOpenChange={(v) => {
          setThemeDialogOpen(v);
          // Persist the picked id into the community when the dialog closes —
          // ChatThemeDialog in `global` mode writes to globalTheme, which is
          // exactly what we want to mirror here.
          if (!v) {
            const picked = useChatThemeStore.getState().globalTheme;
            setCommunityTheme(community.id, picked);
          }
        }}
        global
      />

      <InterestMatchPopup
        open={match.open}
        count={match.count}
        communityName={community.name}
        onClose={() => setMatch({ open: false, count: 0 })}
      />

      <ShareCommunitySheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        community={{
          id: community.id,
          name: community.name,
          description: community.description,
          cover: community.cover,
          category: community.category,
          members: community.members
        }}
      />
    </ScrollArea>
  );
}

function EmptyFeed({
  isHost,
  onCreate
}: {
  isHost: boolean;
  onCreate: () => void;
}) {
  const t = useT();
  return (
    <div className="glass rounded-3xl border border-border/60 p-10 text-center">
      <div className="size-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center text-white mx-auto shadow-glow">
        <Sparkles />
      </div>
      <h3 className="font-semibold mt-3">{t("No posts yet")}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
        {isHost
          ? t("Drop the first post — text, song, image, or a poll. Members can only react.")
          : t("The host hasn't dropped anything yet. Check back soon.")}
      </p>
      {isHost && (
        <Button variant="gradient" className="mt-4" onClick={onCreate}>
          <Plus /> {t("Create first post")}
        </Button>
      )}
    </div>
  );
}
