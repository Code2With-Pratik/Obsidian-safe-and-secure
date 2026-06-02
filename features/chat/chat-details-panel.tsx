"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  Bell,
  Lock,
  Pin,
  Star,
  Users,
  FileText,
  Link as LinkIcon,
  Play,
  Music as MusicIcon,
  X,
  MapPin,
  Calendar,
  Share2,
  Github,
  Twitter,
  Globe,
  Music2,
  CheckCircle2,
  AtSign,
  MoreHorizontal
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn, initials } from "@/lib/utils";
import { useUIStore } from "@/store/use-ui-store";
import { useChatStore } from "@/store/use-chat-store";
import { useStoriesStore } from "@/store/use-stories-store";
import { StoryAvatar } from "@/components/stories/story-avatar";
import { users as allUsers } from "@/lib/mock-data";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useT } from "@/lib/i18n";
import { MediaViewer, type MediaItem } from "./media-viewer";
import { ChatMembersCard } from "./chat-members-card";
import type { Chat } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/use-auth-store";
import { ShareProfileSheet } from "./share-profile-sheet";

interface PartnerProfile {
  id: string;
  name?: string;
  username?: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  profession?: string;
  pronouns?: string;
  location?: string;
  links?: Record<string, string | undefined> | null;
  created_at?: string;
}

const photos = [
  "https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=600&q=80",
  "https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?w=600&q=80",
  "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&q=80",
  "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&q=80",
  "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=600&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80"
];

// Mixed media set so the viewer can page across images, video, gif, pdf and
// music. The demo carries no real binary assets, so video/pdf/music are shown
// as rich preview surfaces inside the viewer.
const mediaItems: MediaItem[] = [
  { kind: "image", src: photos[0], title: "sunset-ridge.jpg", meta: "1.8 MB · today" },
  { kind: "video", src: photos[2], poster: photos[2], title: "trailer-cut.mp4", meta: "0:42 · 12 MB" },
  { kind: "gif", src: photos[1], title: "reaction.gif" },
  { kind: "image", src: photos[3], title: "studio-light.jpg", meta: "2.1 MB · today" },
  { kind: "pdf", src: "helios-spec-v1.pdf", title: "helios-spec-v1.pdf", meta: "2.4 MB · 14 pages" },
  { kind: "music", src: "glass-cathedrals.mp3", title: "Glass Cathedrals", meta: "Obsidian FM · 3:24" },
  { kind: "image", src: photos[4], title: "aurora.jpg", meta: "3.0 MB · yesterday" },
  { kind: "image", src: photos[5], title: "neon-alley.jpg", meta: "1.4 MB · yesterday" }
];

export function ChatDetailsPanel({ chat }: { chat: Chat }) {
  const t = useT();
  const setRight = useUIStore((s) => s.setRightPanel);
  const pinChat = useChatStore((s) => s.pinChat);
  const favouriteChat = useChatStore((s) => s.favouriteChat);
  const muteChat = useChatStore((s) => s.muteChat);
  const setDisappearingTimer = useChatStore((s) => s.setDisappearingTimer);
  const [muted, setMuted] = React.useState(!!chat.muted);
  const [disappearOpen, setDisappearOpen] = React.useState(false);
  // Keep the local toggle in sync if mute is flipped from another surface
  // (header dropdown, mobile menu, realtime sync from another tab).
  React.useEffect(() => {
    setMuted(!!chat.muted);
  }, [chat.muted]);
  const [viewerIndex, setViewerIndex] = React.useState<number | null>(null);
  const [shareOpen, setShareOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const meId = useAuthStore((s) => s.user?.id);

  // Resolve the DM partner — for groups/channels we render the chat's own
  // banner + name, not an individual profile.
  const partnerId =
    chat.type === "dm" ? chat.memberIds?.find((id) => id !== meId) : undefined;

  const [partner, setPartner] = React.useState<PartnerProfile | null>(null);
  React.useEffect(() => {
    if (!partnerId) {
      setPartner(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select(
          "id, name, username, avatar, banner, bio, profession, pronouns, location, links, created_at"
        )
        .eq("id", partnerId)
        .single<PartnerProfile>();
      if (cancelled) return;
      setPartner(data ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  // Use the partner's real avatar/name/banner where available; fall back to
  // the chat row so groups + legacy seed data still render cleanly.
  const displayAvatar = partner?.avatar || chat.avatar;
  const displayName = partner?.name || chat.name;
  const displayBanner = partner?.banner || chat.banner;

  const storyUserId =
    chat.type === "dm"
      ? partnerId || allUsers.find((u) => u.name === chat.name)?.id
      : undefined;
  const hasStory = useStoriesStore((s) =>
    storyUserId ? !!s.byUser[storyUserId]?.slides.length : false
  );
  const openStoryPhoto = useStoriesStore((s) => s.openPhoto);

  // Index of the first pdf in the combined media set — the Files tab opens the
  // shared viewer here so pdf/music are reachable via the same prev/next strip.
  const firstPdf = mediaItems.findIndex((m) => m.kind === "pdf");

  const body = (
    <>
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
        <span className="text-sm font-semibold">{t("Conversation")}</span>
        <Button variant="ghost" size="icon-sm" onClick={() => setRight(null)}>
          <X />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scroll-fade-y">
        {/* Banner — pulled from the partner's profile when available; falls
            back to the chat banner. Avatar sits half-overlapping the banner
            edge so the header reads as a single hero unit. */}
        <div
          className="relative h-28 w-full overflow-hidden"
          style={{
            background:
              displayBanner
                ? `url("${displayBanner}") center/cover no-repeat`
                : "linear-gradient(135deg,#8B5CF6,#EC4899)"
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/45" />
        </div>

        <div className="px-4 -mt-10">
          <div className="flex flex-col items-center text-center">
            {hasStory && storyUserId ? (
              <StoryAvatar userId={storyUserId} src={displayAvatar} name={displayName} size={84} />
            ) : (
              <button
                onClick={() => {
                  if (storyUserId) openStoryPhoto(storyUserId);
                }}
                aria-label={t("View profile photo")}
                className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
              >
                <Avatar className="size-20 ring-4 ring-background shadow-floating">
                  <AvatarImage src={displayAvatar} />
                  <AvatarFallback>{initials(displayName)}</AvatarFallback>
                </Avatar>
              </button>
            )}
            <h3 className="mt-3 text-lg font-semibold inline-flex items-center gap-1.5">
              {displayName}
              <CheckCircle2 className="size-4 text-cyan-400" aria-label="Verified" />
            </h3>
            {partner?.username && (
              <p className="text-xs text-muted-foreground inline-flex items-center gap-0.5">
                <AtSign className="size-3" />
                {partner.username}
              </p>
            )}
            {partner?.profession && (
              <p className="text-[11px] text-cyan-400 mt-1 font-medium">
                {partner.profession}
              </p>
            )}
            {chat.encrypted && (
              <Badge variant="success" className="mt-1.5">
                <Lock className="size-3" /> {t("End-to-end encrypted")}
              </Badge>
            )}

            {partner?.bio && (
              <p className="text-xs text-muted-foreground mt-3 max-w-[22rem] whitespace-pre-line">
                {partner.bio}
              </p>
            )}

            {/* Pronouns · Location · Joined — only shows the lines we have
                data for, keeps the header clean for groups without profiles. */}
            {(partner?.pronouns || partner?.location || partner?.created_at) && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                {partner?.pronouns && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3" /> {partner.pronouns}
                  </span>
                )}
                {partner?.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" /> {partner.location}
                  </span>
                )}
                {partner?.created_at && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3" /> {t("Joined")}{" "}
                    {new Date(partner.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      year: "numeric"
                    })}
                  </span>
                )}
              </div>
            )}

            {/* Links — clickable, opens in a new tab. */}
            {partner?.links && (
              <ProfileLinks links={partner.links} />
            )}

            <div className="grid grid-cols-3 gap-2 w-full mt-5">
              <Button
                variant="glass"
                size="sm"
                className={cn(
                  "!h-12 flex-col gap-1",
                  chat.pinned && "!text-cyan-400 ring-1 ring-cyan-400/50"
                )}
                onClick={() => void pinChat(chat.id, !chat.pinned)}
                aria-pressed={!!chat.pinned}
                aria-label={chat.pinned ? t("Unpin chat") : t("Pin chat")}
              >
                <Pin className={cn("size-4", chat.pinned && "fill-current")} />
                <span className="text-[10px]">{chat.pinned ? t("Pinned") : t("Pin")}</span>
              </Button>
              <Button
                variant="glass"
                size="sm"
                className={cn(
                  "!h-12 flex-col gap-1",
                  chat.favorite && "!text-amber-400 ring-1 ring-amber-400/50"
                )}
                onClick={() => void favouriteChat(chat.id, !chat.favorite)}
                aria-pressed={!!chat.favorite}
                aria-label={
                  chat.favorite ? t("Remove from favorites") : t("Add to favorites")
                }
              >
                <Star className={cn("size-4", chat.favorite && "fill-current")} />
                <span className="text-[10px]">
                  {chat.favorite ? t("Favorited") : t("Favorite")}
                </span>
              </Button>
              <Button
                variant="glass"
                size="sm"
                className="!h-12 flex-col gap-1"
                onClick={() => setShareOpen(true)}
              >
                <Share2 className="size-4" />
                <span className="text-[10px]">{t("Share")}</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="px-4 py-5">

        <div className="mt-6 space-y-3">
          <SettingRow icon={<Bell className="size-4" />} label={t("Mute notifications")}>
            <Switch
              checked={muted}
              onCheckedChange={(v) => {
                setMuted(v);
                void muteChat(chat.id, v);
              }}
            />
          </SettingRow>
          <button
            type="button"
            onClick={() => setDisappearOpen(true)}
            className="w-full text-left"
          >
            <SettingRow icon={<Lock className="size-4" />} label={t("Disappearing messages")}>
              <span className="text-xs text-cyan-400 font-medium">
                {disappearLabel(chat.disappearingSeconds ?? null, t)}
              </span>
            </SettingRow>
          </button>
        </div>

        <ChatMembersCard chat={chat} />

        <div className="mt-6">
          <Tabs defaultValue="media">
            <TabsList className="w-full">
              <TabsTrigger value="media" className="flex-1">{t("Media")}</TabsTrigger>
              <TabsTrigger value="files" className="flex-1">{t("Files")}</TabsTrigger>
              <TabsTrigger value="links" className="flex-1">{t("Links")}</TabsTrigger>
            </TabsList>
            <TabsContent value="media" className="mt-3">
              <div className="grid grid-cols-3 gap-1">
                {mediaItems.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => setViewerIndex(i)}
                    className="relative aspect-square w-full rounded-lg overflow-hidden group bg-foreground/5 grid place-items-center"
                  >
                    {m.kind === "image" || m.kind === "gif" || m.kind === "video" ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.poster ?? m.src}
                          alt={m.title ?? ""}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        {m.kind === "video" && (
                          <span className="absolute inset-0 grid place-items-center bg-black/25 text-white">
                            <Play className="size-5" />
                          </span>
                        )}
                        {m.kind === "gif" && (
                          <span className="absolute bottom-1 left-1 text-[8px] font-bold px-1 rounded bg-black/60 text-white">
                            GIF
                          </span>
                        )}
                      </>
                    ) : m.kind === "pdf" ? (
                      <FileText className="size-6 text-rose-400" />
                    ) : (
                      <MusicIcon className="size-6 text-cyan-400" />
                    )}
                  </button>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="files" className="mt-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <button
                  key={i}
                  onClick={() => firstPdf >= 0 && setViewerIndex(firstPdf)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg glass-subtle text-left hover:bg-foreground/[0.04] transition"
                >
                  <div className="size-9 rounded-lg bg-foreground/10 grid place-items-center">
                    <FileText className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">helios-spec-v{i}.pdf</p>
                    <p className="text-[10px] text-muted-foreground">2.4 MB · today</p>
                  </div>
                </button>
              ))}
            </TabsContent>
            <TabsContent value="links" className="mt-3 space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg glass-subtle">
                  <div className="size-9 rounded-lg bg-foreground/10 grid place-items-center">
                    <LinkIcon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">nova.fm/glass-cathedrals</p>
                    <p className="text-[10px] text-muted-foreground">Shared by Kai</p>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
        </div>
      </div>

      {partner && (
        <ShareProfileSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          profile={{
            id: partner.id,
            name: partner.name,
            username: partner.username,
            avatar: partner.avatar,
            banner: partner.banner
          }}
        />
      )}

      <DisappearingPickerDialog
        open={disappearOpen}
        current={chat.disappearingSeconds ?? null}
        onClose={() => setDisappearOpen(false)}
        onSelect={(seconds) => {
          void setDisappearingTimer(chat.id, seconds);
          setDisappearOpen(false);
        }}
      />
    </>
  );

  // Mobile / tablet (< xl): slide-in overlay drawer with a tap-to-dismiss
  // backdrop. The docked panel is hidden below xl, so without this the header
  // tap did nothing on small screens.
  if (!isDesktop) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setRight(null)}
          className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm xl:hidden"
        />
        <motion.aside
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="fixed inset-0 z-[91] w-full border-l border-border/40 bg-card/95 backdrop-blur-2xl xl:hidden"
        >
          <div className="w-full h-full flex flex-col">{body}</div>
        </motion.aside>
        <MediaViewer
          items={mediaItems}
          open={viewerIndex !== null}
          startIndex={viewerIndex ?? 0}
          onClose={() => setViewerIndex(null)}
        />
      </>
    );
  }

  // Desktop (xl+): docked panel that reflows the thread. Tween (not spring) on
  // width → the thread reflows smoothly without the overshoot/snap that made
  // the chat input "shake". Inner content stays a fixed 340px and is revealed
  // via overflow-hidden, so nothing squishes.
  return (
    <>
      <motion.aside
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 340, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="hidden xl:block shrink-0 overflow-hidden border-l border-border/40 bg-card/40 backdrop-blur-2xl"
      >
        <div className="w-[340px] h-full flex flex-col">{body}</div>
      </motion.aside>
      <MediaViewer
        items={mediaItems}
        open={viewerIndex !== null}
        startIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
      />
    </>
  );
}

/** Human-readable label for a disappearing-messages window. */
function disappearLabel(seconds: number | null, t: (s: string) => string) {
  if (!seconds || seconds <= 0) return t("Off");
  if (seconds <= 24 * 3600) return t("24 hours");
  if (seconds <= 7 * 24 * 3600) return t("7 days");
  if (seconds <= 31 * 24 * 3600) return t("31 days");
  return t("90 days");
}

const DISAPPEAR_OPTIONS: { seconds: number | null; key: string }[] = [
  { seconds: 24 * 3600, key: "24 hours" },
  { seconds: 7 * 24 * 3600, key: "7 days" },
  { seconds: 31 * 24 * 3600, key: "31 days" },
  { seconds: 90 * 24 * 3600, key: "90 days" },
  { seconds: null, key: "Off" }
];

function DisappearingPickerDialog({
  open,
  current,
  onClose,
  onSelect
}: {
  open: boolean;
  current: number | null;
  onClose: () => void;
  onSelect: (seconds: number | null) => void;
}) {
  const t = useT();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!open || !mounted || typeof document === "undefined") return null;
  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[300] grid place-items-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl glass-strong border border-border/60 p-5 shadow-floating animate-in zoom-in-95"
      >
        <div className="mx-auto mb-2 size-12 rounded-2xl bg-cyan-500/15 text-cyan-400 grid place-items-center">
          <Lock className="size-5" />
        </div>
        <h3 className="text-center text-base font-semibold">
          {t("Disappearing messages")}
        </h3>
        <p className="text-center text-xs text-muted-foreground mt-1">
          {t("Messages older than the selected window are removed for everyone, automatically.")}
        </p>

        <div className="mt-4 space-y-1">
          {DISAPPEAR_OPTIONS.map((opt) => {
            const selected = (current ?? null) === opt.seconds;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onSelect(opt.seconds)}
                className={
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition " +
                  (selected ? "bg-cyan-400/15" : "hover:bg-foreground/5")
                }
              >
                <span
                  className={
                    "size-4 rounded-full border-2 grid place-items-center transition " +
                    (selected
                      ? "border-cyan-400"
                      : "border-border")
                  }
                >
                  {selected && <span className="size-2 rounded-full bg-cyan-400" />}
                </span>
                <span className="flex-1 text-sm font-medium">{t(opt.key)}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <Button variant="ghost" onClick={onClose} className="w-full">
            {t("Cancel")}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function SettingRow({
  icon,
  label,
  children
}: {
  icon: React.ReactNode;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl glass-subtle">
      <div className="size-8 rounded-lg bg-foreground/10 grid place-items-center">{icon}</div>
      <span className="text-sm flex-1">{label}</span>
      {children}
    </div>
  );
}

/** Renders the profile.links JSONB as a row of clickable chips. Known keys
 *  (website / github / twitter / spotify) get matching icons; anything else
 *  uses a generic link icon. Each chip opens in a new tab. */
function ProfileLinks({
  links
}: {
  links: Record<string, string | undefined> | null;
}) {
  const t = useT();
  if (!links) return null;
  const entries = Object.entries(links).filter(
    ([, v]) => typeof v === "string" && v.trim().length > 0
  ) as Array<[string, string]>;
  if (entries.length === 0) return null;
  const normalize = (url: string) =>
    /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const iconFor = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes("github")) return <Github className="size-3" />;
    if (k.includes("twitter") || k === "x") return <Twitter className="size-3" />;
    if (k.includes("spotify") || k.includes("music")) return <Music2 className="size-3" />;
    if (k.includes("web") || k.includes("site")) return <Globe className="size-3" />;
    return <LinkIcon className="size-3" />;
  };
  const labelFor = (key: string, url: string) => {
    try {
      const u = new URL(normalize(url));
      return u.hostname.replace(/^www\./, "");
    } catch {
      return key;
    }
  };
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 max-w-full">
      {entries.map(([key, url]) => (
        <a
          key={key}
          href={normalize(url)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 max-w-full px-2.5 py-1 rounded-full glass-subtle border border-border/60 text-[11px] hover:bg-foreground/[0.06] transition"
          title={url}
        >
          {iconFor(key)}
          <span className="truncate max-w-[10rem]">{labelFor(key, url)}</span>
        </a>
      ))}
      <span className="sr-only">{t("Profile links")}</span>
    </div>
  );
}
