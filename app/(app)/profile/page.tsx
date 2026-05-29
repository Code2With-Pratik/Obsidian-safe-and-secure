"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Phone,
  Video,
  Sparkles,
  Pencil,
  Settings,
  Github,
  Globe,
  Twitter,
  Music,
  Image as ImageIcon,
  Lock,
  Shield,
  MapPin,
  Calendar
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/store/use-auth-store";
import { initials, cn } from "@/lib/utils";
import { EditProfileDialog } from "@/features/profile/edit-profile-dialog";
import { useT } from "@/lib/i18n";
import { useStoriesStore } from "@/store/use-stories-store";

const gallery = [
  "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&q=80",
  "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&q=80",
  "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=400&q=80",
  "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&q=80",
  "https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=400&q=80",
  "https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?w=400&q=80"
];

export default function ProfilePage() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const name = user?.name ?? "Aria Vance";
  const [editOpen, setEditOpen] = React.useState(false);
  // Current user's own story → gradient ring on the profile avatar.
  const meHasStory = useStoriesStore((s) => !!s.byUser["me"]?.slides.length);
  const meViewed = useStoriesStore((s) => s.byUser["me"]?.viewed);
  const openViewer = useStoriesStore((s) => s.openViewer);

  const banner = user?.banner;
  const bannerIsUrl = banner?.startsWith("http");

  return (
    <ScrollArea className="h-[calc(100dvh-4rem)]">
      <div className="relative">
        <div className="relative h-56 md:h-72 overflow-hidden">
          {bannerIsUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={banner}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : banner ? (
            <div className="absolute inset-0" style={{ background: banner }} />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400" />
          )}
          <motion.div
            className="absolute inset-0"
            animate={{
              backgroundPosition: ["0% 0%", "100% 100%"]
            }}
            transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 40%), radial-gradient(circle at 70% 70%, rgba(0,0,0,0.3), transparent 50%)",
              backgroundSize: "200% 200%"
            }}
          />
          <Link
            href="/settings"
            aria-label={t("Open settings")}
            className="absolute top-4 right-4 size-10 rounded-full glass border border-white/20 backdrop-blur grid place-items-center text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition shadow-floating"
          >
            <Settings className="size-[18px]" />
          </Link>
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-16 md:-mt-20 relative">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => meHasStory && openViewer("me")}
                aria-label={meHasStory ? t("View story") : undefined}
                className={cn(
                  "block rounded-full",
                  meHasStory && "p-[3px] bg-gradient-to-tr",
                  meHasStory &&
                    (meViewed
                      ? "from-foreground/30 to-foreground/30"
                      : "from-violet-500 via-fuchsia-500 to-cyan-400"),
                  !meHasStory && "cursor-default"
                )}
              >
                <Avatar className="size-28 md:size-36 ring-4 ring-background shadow-floating">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback>{initials(name)}</AvatarFallback>
                </Avatar>
              </button>
              <button
                onClick={() => setEditOpen(true)}
                aria-label={t("Edit profile")}
                className="absolute bottom-1 right-1 size-9 rounded-full bg-primary grid place-items-center shadow-glow ring-2 ring-background hover:scale-105 active:scale-95 transition"
              >
                <Pencil className="size-4 text-primary-foreground" />
              </button>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-display font-semibold tracking-tight">{name}</h1>
                <Badge variant="cyan">
                  <Sparkles className="size-3" /> Obsidian Plus
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                @{user?.username ?? "aria"}
                {user?.pronouns ? ` · ${user.pronouns}` : " · she/her"}
              </p>
              <p className="mt-2 max-w-xl">
                {user?.bio ?? t("Designing the future, one pixel at a time. Currently building Obsidian ✨")}
              </p>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> Lisbon, Portugal
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5" /> {t("Joined")} Mar 2024
                </span>
                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-400" /> {t("Online")} · {t("designing")}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="gradient">
                <MessageCircle /> {t("Message")}
              </Button>
              <Button variant="glass">
                <Phone />
              </Button>
              <Button variant="glass">
                <Video />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-7">
            <Stat k="248" v={t("Conversations")} />
            <Stat k="3.4k" v={t("Connections")} />
            <Stat k="86" v={t("Ghost rooms")} />
            <Stat k="2.1k" v={t("Story views")} />
          </div>

          <Tabs defaultValue="about" className="mt-8">
            <TabsList>
              <TabsTrigger value="about">{t("About")}</TabsTrigger>
              <TabsTrigger value="media">{t("Media")}</TabsTrigger>
              <TabsTrigger value="activity">{t("Activity")}</TabsTrigger>
              <TabsTrigger value="privacy">{t("Privacy")}</TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="mt-5">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="glass rounded-2xl p-5">
                  <h3 className="font-semibold text-sm mb-3">{t("Bio card")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("Senior product designer, ex-Linear, ex-Arc. I care deeply about the texture of digital experiences. Currently architecting Obsidian — a futuristic OS for communication.")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["#design", "#motion", "#typography", "#systems", "#synthwave"].map((tag) => (
                      <Badge key={tag} variant="glass">{tag}</Badge>
                    ))}
                  </div>
                </div>

                <div className="glass rounded-2xl p-5">
                  <h3 className="font-semibold text-sm mb-3">{t("Links")}</h3>
                  <div className="space-y-2">
                    <LinkRow icon={<Globe />} label={t("Personal site")} sub="aria.design" />
                    <LinkRow icon={<Github />} label="GitHub" sub="@ariavance" />
                    <LinkRow icon={<Twitter />} label="X" sub="@ariavance" />
                    <LinkRow icon={<Music />} label="Spotify" sub={`${t("Now playing:")} Glass Cathedrals`} pulse />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="media" className="mt-5">
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {gallery.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <motion.img
                    key={i}
                    src={src}
                    alt=""
                    whileHover={{ scale: 1.04 }}
                    className="aspect-square rounded-2xl object-cover cursor-pointer"
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-5">
              <div className="glass rounded-2xl p-5 space-y-3">
                {[
                  { msg: "Joined ghost room 'Designers Unfiltered'", at: "5 min ago" },
                  { msg: "Pinned a message in Aurora Design Lab", at: "1 hr ago" },
                  { msg: "Posted a new story", at: "3 hr ago" },
                  { msg: "Started a video meeting with 4 people", at: "Yesterday" }
                ].map((a) => (
                  <div key={a.msg} className="flex items-center gap-3 text-sm">
                    <div className="size-2 rounded-full bg-primary" />
                    <span className="flex-1">{t(a.msg)}</span>
                    <span className="text-xs text-muted-foreground">{t(a.at)}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="mt-5">
              <div className="glass rounded-2xl p-5 space-y-2">
                <PrivacyRow icon={<Lock />} label={t("Last seen")} sub={t("Friends only")} />
                <PrivacyRow icon={<Shield />} label={t("Profile photo")} sub={t("Everyone")} />
                <PrivacyRow icon={<MessageCircle />} label={t("Who can message me")} sub={t("People I know")} />
              </div>
            </TabsContent>
          </Tabs>
          <div className="h-16" />
        </div>
      </div>
      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} />
    </ScrollArea>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="glass-subtle rounded-2xl p-4 text-center">
      <div className="text-2xl font-semibold neon-text">{k}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{v}</div>
    </div>
  );
}

function LinkRow({
  icon,
  label,
  sub,
  pulse
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  pulse?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-xl glass-subtle hover:bg-foreground/5 transition cursor-pointer">
      <div className="size-9 rounded-lg bg-foreground/10 grid place-items-center [&_svg]:size-4">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground truncate">{sub}</div>
      </div>
      {pulse && <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />}
    </div>
  );
}

function PrivacyRow({
  icon,
  label,
  sub
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  const [v, setV] = React.useState(true);
  return (
    <div className="flex items-center gap-3 p-2 rounded-xl glass-subtle">
      <div className="size-9 rounded-lg bg-foreground/10 grid place-items-center [&_svg]:size-4">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </div>
      <Switch checked={v} onCheckedChange={setV} />
    </div>
  );
}
