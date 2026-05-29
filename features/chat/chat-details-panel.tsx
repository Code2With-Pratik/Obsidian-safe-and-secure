"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Bell, Lock, Pin, Star, Users, FileText, Link as LinkIcon, Play, Music as MusicIcon, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { initials } from "@/lib/utils";
import { useUIStore } from "@/store/use-ui-store";
import { useStoriesStore } from "@/store/use-stories-store";
import { StoryAvatar } from "@/components/stories/story-avatar";
import { users as allUsers } from "@/lib/mock-data";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useT } from "@/lib/i18n";
import { MediaViewer, type MediaItem } from "./media-viewer";
import type { Chat } from "@/types";

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
  const [muted, setMuted] = React.useState(!!chat.muted);
  const [viewerIndex, setViewerIndex] = React.useState<number | null>(null);
  const isDesktop = useMediaQuery("(min-width: 1280px)");

  const storyUserId =
    chat.type === "dm" ? allUsers.find((u) => u.name === chat.name)?.id : undefined;
  const hasStory = useStoriesStore((s) =>
    storyUserId ? !!s.byUser[storyUserId]?.slides.length : false
  );

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

      <div className="flex-1 min-h-0 overflow-y-auto scroll-fade-y px-4 py-5">
        <div className="flex flex-col items-center text-center">
          {hasStory && storyUserId ? (
            <StoryAvatar userId={storyUserId} src={chat.avatar} name={chat.name} size={84} />
          ) : (
            <Avatar className="size-20 ring-4 ring-primary/30 ring-offset-2 ring-offset-background">
              <AvatarImage src={chat.avatar} />
              <AvatarFallback>{initials(chat.name)}</AvatarFallback>
            </Avatar>
          )}
          <h3 className="mt-3 text-lg font-semibold">{chat.name}</h3>
          {chat.encrypted && (
            <Badge variant="success" className="mt-1.5">
              <Lock className="size-3" /> {t("End-to-end encrypted")}
            </Badge>
          )}
          <p className="text-xs text-muted-foreground mt-2 max-w-[20rem]">
            {t("Crafting next-generation experiences together. Pinned conversation.")}
          </p>

          <div className="grid grid-cols-3 gap-2 w-full mt-5">
            <Button variant="glass" size="sm" className="!h-12 flex-col gap-1">
              <Pin className="size-4" />
              <span className="text-[10px]">{t("Pin")}</span>
            </Button>
            <Button variant="glass" size="sm" className="!h-12 flex-col gap-1">
              <Star className="size-4" />
              <span className="text-[10px]">{t("Favorite")}</span>
            </Button>
            <Button variant="glass" size="sm" className="!h-12 flex-col gap-1">
              <Users className="size-4" />
              <span className="text-[10px]">{t("Members")}</span>
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <SettingRow icon={<Bell className="size-4" />} label={t("Mute notifications")}>
            <Switch checked={muted} onCheckedChange={setMuted} />
          </SettingRow>
          <SettingRow icon={<Lock className="size-4" />} label={t("Disappearing messages")}>
            <span className="text-xs text-muted-foreground">{t("Off")}</span>
          </SettingRow>
          <SettingRow icon={<Pin className="size-4" />} label={t("Pinned messages")}>
            <span className="text-xs text-muted-foreground">3</span>
          </SettingRow>
        </div>

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
