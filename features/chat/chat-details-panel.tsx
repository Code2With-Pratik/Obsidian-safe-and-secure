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


export function ChatDetailsPanel({ chat }: { chat: Chat }) {
  const t = useT();
  const setRight = useUIStore((s) => s.setRightPanel);
  const pinChat = useChatStore((s) => s.pinChat);
  const favouriteChat = useChatStore((s) => s.favouriteChat);
  const muteChat = useChatStore((s) => s.muteChat);
  const setDisappearingTimer = useChatStore((s) => s.setDisappearingTimer);
  const chatMessages = useChatStore((s) => s.messages[chat.id]);

  // Derive the Media / Files / Links lists from real messages in this chat.
  // Newest first so the panel always opens on the most recent content.
  const { mediaItems: realMediaItems, files: realFiles, links: realLinks } =
    React.useMemo(() => {
      const media: MediaItem[] = [];
      const files: Array<{
        name: string;
        url?: string;
        size?: number;
        mime?: string;
        createdAt: string;
      }> = [];
      const links: Array<{
        url: string;
        title?: string;
        description?: string;
        image?: string;
        createdAt: string;
      }> = [];
      const ordered = [...(chatMessages || [])].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const urlRegex = /(https?:\/\/[^\s)<>"']+)/gi;
      for (const m of ordered) {
        if (m.kind === "image" && m.media?.length) {
          for (const im of m.media) {
            media.push({
              kind: "image",
              src: im.url,
              title: im.alt || "image",
              meta: new Date(m.createdAt).toLocaleString()
            });
          }
        }
        if (m.kind === "video" && m.media?.length) {
          for (const v of m.media) {
            media.push({
              kind: "video",
              src: v.url,
              poster: v.url,
              title: v.alt || "video",
              meta: new Date(m.createdAt).toLocaleString()
            });
          }
        }
        if (m.kind === "gif" && m.gif?.src) {
          media.push({
            kind: "gif",
            src: m.gif.src,
            title: m.gif.alt || "gif"
          });
        }
        if (m.kind === "audio" && m.audio) {
          media.push({
            kind: "music",
            src: m.audio.url ?? "",
            title: m.audio.name,
            meta: m.audio.durationSec ? `${Math.round(m.audio.durationSec)}s` : ""
          });
        }
        if (m.kind === "file" && m.file) {
          files.push({
            name: m.file.name,
            url: m.file.url,
            size: m.file.size,
            mime: m.file.mime,
            createdAt: m.createdAt
          });
        }
        if (m.kind === "link" && m.link) {
          links.push({
            url: m.link.url,
            title: m.link.title,
            description: m.link.description,
            image: m.link.image,
            createdAt: m.createdAt
          });
        } else if (m.content) {
          // Auto-extract any URLs from plain text messages so they show in
          // the Links tab too — what the user expects from WhatsApp's
          // "links shared in this chat".
          const matches = m.content.match(urlRegex);
          if (matches) {
            for (const u of matches) {
              if (!links.find((x) => x.url === u)) {
                links.push({ url: u, createdAt: m.createdAt });
              }
            }
          }
        }
      }
      return { mediaItems: media, files, links };
    }, [chatMessages]);

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
            {/* Name truly centered (3-col grid) with the pronouns chip sitting
                just to its right — so the chip never pulls the name off
                center. Spacer column on the left mirrors the chip column. */}
            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 w-full">
              <span aria-hidden />
              <h3 className="text-xl font-semibold inline-flex items-center gap-1.5 justify-center">
                {displayName}
                <CheckCircle2 className="size-[18px] text-cyan-400" aria-label="Verified" />
              </h3>
              <span className="justify-self-start min-w-0">
                {partner?.pronouns && (
                  <span className="inline-block text-[10px] font-medium text-muted-foreground px-1.5 py-0.5 rounded-full glass-subtle border border-border/60 whitespace-nowrap">
                    {partner.pronouns}
                  </span>
                )}
              </span>
            </div>
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

            {/* Bio — bumped to text-sm + collapsed by default with a
                "Read more / Show less" toggle so long bios don't dominate
                the header. */}
            {partner?.bio && <BioBlock text={partner.bio} />}

            {/* Location + Joined on their own row. */}
            {(partner?.location || partner?.created_at) && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
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

            {/* Profile links rendered as icon-only chips on a single row
                (max 4 visible). Hover to see the URL in a tooltip, click
                to open in a new tab. */}
            {partner?.links && <ProfileLinkIcons links={partner.links} />}

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
            {/* Sticky so the tab bar stays visible when scrolling through a
                long Media grid — and switching to a short Files / Links tab
                doesn't auto-jump back to the top because the bar already
                sits at the top of the viewport. */}
            <TabsList className="w-full sticky top-0 z-10 backdrop-blur bg-background/85 border-b border-border/40">
              <TabsTrigger value="media" className="flex-1">{t("Media")}</TabsTrigger>
              <TabsTrigger value="files" className="flex-1">{t("Files")}</TabsTrigger>
              <TabsTrigger value="links" className="flex-1">{t("Links")}</TabsTrigger>
            </TabsList>
            <TabsContent value="media" className="mt-3 min-h-[40vh]">
              {realMediaItems.length === 0 ? (
                <p className="py-6 text-center text-[11px] text-muted-foreground">
                  {t("No media shared yet")}
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {realMediaItems.map((m, i) => (
                    <button
                      key={i}
                      onClick={() => setViewerIndex(i)}
                      className="relative aspect-square w-full rounded-lg overflow-hidden group bg-foreground/5 grid place-items-center"
                      title={m.title}
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
              )}
            </TabsContent>
            <TabsContent value="files" className="mt-3 space-y-2 min-h-[40vh]">
              {realFiles.length === 0 ? (
                <p className="py-6 text-center text-[11px] text-muted-foreground">
                  {t("No files shared yet")}
                </p>
              ) : (
                realFiles.map((f, i) => {
                  const sizeLabel = f.size
                    ? `${(f.size / 1024 / 1024).toFixed(1)} MB`
                    : "";
                  const dateLabel = new Date(f.createdAt).toLocaleDateString();
                  return (
                    <a
                      key={`${f.name}-${i}`}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-3 p-2 rounded-lg glass-subtle text-left hover:bg-foreground/[0.04] transition"
                    >
                      <div className="size-9 rounded-lg bg-foreground/10 grid place-items-center">
                        <FileText className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{f.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {[sizeLabel, dateLabel].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </a>
                  );
                })
              )}
            </TabsContent>
            <TabsContent value="links" className="mt-3 space-y-2 min-h-[40vh]">
              {realLinks.length === 0 ? (
                <p className="py-6 text-center text-[11px] text-muted-foreground">
                  {t("No links shared yet")}
                </p>
              ) : (
                realLinks.map((l, i) => {
                  const host = (() => {
                    try {
                      return new URL(l.url).hostname.replace(/^www\./, "");
                    } catch {
                      return l.url;
                    }
                  })();
                  return (
                    <a
                      key={`${l.url}-${i}`}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2 rounded-lg glass-subtle hover:bg-foreground/[0.04] transition"
                    >
                      <div className="size-9 rounded-lg bg-foreground/10 grid place-items-center overflow-hidden">
                        {l.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={l.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <LinkIcon className="size-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {l.title || host}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {l.title ? host : l.url}
                        </p>
                      </div>
                    </a>
                  );
                })
              )}
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
          items={realMediaItems}
          open={viewerIndex !== null}
          startIndex={viewerIndex ?? 0}
          onClose={() => setViewerIndex(null)}
        />
      </>
    );
  }

  // Desktop (xl+): docked panel that reflows the thread. Tween (not spring) on
  // width → the thread reflows smoothly without the overshoot/snap that made
  // the chat input "shake". Inner content stays a fixed 380px and is revealed
  // via overflow-hidden, so nothing squishes.
  return (
    <>
      <motion.aside
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 380, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="hidden xl:block shrink-0 overflow-hidden border-l border-border/40 bg-card/40 backdrop-blur-2xl"
      >
        <div className="w-[380px] h-full flex flex-col">{body}</div>
      </motion.aside>
      <MediaViewer
        items={realMediaItems}
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

/** Collapsed-by-default bio. When the bio is long enough we manually slice
 *  it to ~two lines so the inline "Read more" sits at the very end of the
 *  text (Twitter-style) instead of dropping to its own line under a
 *  CSS-clamped paragraph. */
function BioBlock({ text }: { text: string }) {
  const t = useT();
  const [expanded, setExpanded] = React.useState(false);
  // ~110 chars renders as ~2 lines at text-[15px] inside the 380px panel.
  // Tuned to match the user's reference screenshot.
  const LIMIT = 110;
  const needsToggle = text.length > LIMIT || text.includes("\n");
  const collapsed = !expanded && needsToggle;
  const shown = collapsed ? text.slice(0, LIMIT).trimEnd() + "… " : text;
  return (
    <div className="mt-3 max-w-[22rem]">
      <p className="text-[15px] leading-relaxed text-muted-foreground whitespace-pre-line text-center">
        {shown}
        {needsToggle && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-[13px] font-medium text-cyan-400 hover:underline align-baseline"
          >
            {expanded ? t(" Read less") : t("Read more")}
          </button>
        )}
      </p>
    </div>
  );
}

/** Icon-only row of profile links. Each icon is a button: hover shows a
 *  glass tooltip with the full URL (positioned to stay inside the panel
 *  width so it never overflows), click opens the URL in a new tab. */
function ProfileLinkIcons({
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
    if (k.includes("github")) return <Github className="size-5" />;
    if (k.includes("twitter") || k === "x") return <Twitter className="size-5" />;
    if (k.includes("spotify") || k.includes("music")) return <Music2 className="size-5" />;
    if (k.includes("web") || k.includes("site")) return <Globe className="size-5" />;
    return <LinkIcon className="size-5" />;
  };
  // Cap visible icons at 4 (per the user's spec) — anything beyond goes
  // into a +N overflow chip with the rest of the URLs in its title attr.
  const visible = entries.slice(0, 4);
  const overflow = entries.slice(4);
  return (
    <div className="mt-3 flex items-center justify-center gap-3 max-w-full">
      {visible.map(([key, url]) => (
        <LinkIconButton key={key} icon={iconFor(key)} url={normalize(url)} />
      ))}
      {overflow.length > 0 && (
        <span
          className="size-11 rounded-full grid place-items-center text-[11px] font-semibold glass-subtle border border-border/60 text-muted-foreground"
          title={overflow.map(([, u]) => normalize(u)).join("\n")}
        >
          +{overflow.length}
        </span>
      )}
      <span className="sr-only">{t("Profile links")}</span>
    </div>
  );
}

/** Single icon-only link. Tooltip uses absolute positioning relative to the
 *  icon and `max-w-[14rem]` + `truncate` so it never overflows the panel. */
function LinkIconButton({ icon, url }: { icon: React.ReactNode; url: string }) {
  const [show, setShow] = React.useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={url}
        className="size-11 rounded-full grid place-items-center glass-subtle border border-border/60 hover:bg-foreground/[0.06] transition"
      >
        {icon}
      </a>
      {show && (
        <span
          role="tooltip"
          // Anchored to the icon, but clamped width so long URLs truncate
          // instead of pushing the tooltip out of the panel. Also nudged
          // upward and centered so it sits cleanly above the icon.
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-30 px-2 py-1 rounded-md bg-foreground text-background text-[10px] font-medium whitespace-nowrap max-w-[14rem] truncate shadow-floating pointer-events-none"
        >
          {url}
        </span>
      )}
    </span>
  );
}
