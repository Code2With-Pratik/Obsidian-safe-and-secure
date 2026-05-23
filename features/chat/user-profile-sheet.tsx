"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Phone,
  Video,
  Pencil,
  Camera,
  Sparkles,
  Github,
  Globe,
  Twitter,
  Music,
  Lock,
  Shield,
  MapPin,
  Calendar,
  Bell,
  Pin,
  Star,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  X,
  ChevronRight,
  Users,
  UserPlus,
  Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AnimatedAvatar } from "@/components/animated-avatar";
import { users } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Chat } from "@/types";

const gallery = [
  "https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=200&q=80",
  "https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?w=200&q=80",
  "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=200&q=80",
  "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=200&q=80",
  "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=200&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=200&q=80",
  "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=200&q=80",
  "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=200&q=80"
];

interface Props {
  chat: Chat;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function UserProfileSheet({ chat, open, onOpenChange }: Props) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 240, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-[101] w-full max-w-md glass-strong glass-specular border-l border-white/15 shadow-floating overflow-y-auto no-scrollbar"
          >
            <Header chat={chat} onClose={() => onOpenChange(false)} />

            <div className="px-5 -mt-16 pb-8 relative">
              <div className="flex items-end gap-4">
                <AnimatedAvatar
                  src={chat.avatar}
                  name={chat.name}
                  status={chat.online ? "online" : "offline"}
                  size={96}
                  className="shadow-floating"
                />
              </div>

              <div className="mt-3 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-display font-semibold tracking-tight">
                      {chat.name}
                    </h2>
                    {chat.encrypted && (
                      <Badge variant="success">
                        <Lock className="size-3" /> E2E
                      </Badge>
                    )}
                    {(chat.type === "group" || chat.type === "channel") && (
                      <Badge variant="cyan">
                        <Users className="size-3" />
                        {chat.membersCount ?? chat.memberIds?.length ?? 0} members
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    @{chat.name.toLowerCase().replace(/\s+/g, "")}{" "}
                    {chat.type === "group" || chat.type === "channel"
                      ? `· ${chat.membersCount ?? chat.memberIds?.length ?? 0} members`
                      : chat.online
                      ? "· online"
                      : "· last seen 2h ago"}
                  </p>
                </div>
                <Button variant="glass" size="icon-sm" aria-label="Edit">
                  <Pencil className="size-3.5" />
                </Button>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                {chat.description ??
                  (chat.type === "group" || chat.type === "channel"
                    ? `Welcome to ${chat.name}. Share ideas, plans, and good vibes — the room is yours.`
                    : "Music producer crafting synth-laden landscapes. Currently in Lisbon. Probably wearing headphones.")}
              </p>

              {chat.type === "dm" && (
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" /> Lisbon, PT
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-3.5" /> Connected Mar 2024
                  </span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 mt-5">
                <Action icon={<MessageCircle />} label="Message" gradient />
                <Action icon={<Phone />} label="Voice" />
                <Action icon={<Video />} label="Video" />
              </div>

              {chat.type === "group" || chat.type === "channel" ? (
                <MemberList chat={chat} />
              ) : (
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <Stat k="248" v="Chats" />
                  <Stat k="86" v="Shared" />
                  <Stat k="3y" v="Together" />
                </div>
              )}

              <div className="mt-5 space-y-2">
                <SettingRow icon={<Bell className="size-4" />} label="Mute notifications">
                  <Switch defaultChecked={chat.muted} />
                </SettingRow>
                <SettingRow icon={<Pin className="size-4" />} label="Pin chat">
                  <Switch defaultChecked={chat.pinned} />
                </SettingRow>
                <SettingRow icon={<Star className="size-4" />} label="Add to favorites">
                  <Switch />
                </SettingRow>
                <SettingRow icon={<Lock className="size-4" />} label="Disappearing messages">
                  <span className="text-xs text-muted-foreground">Off</span>
                </SettingRow>
              </div>

              <Tabs defaultValue="media" className="mt-6">
                <TabsList className="w-full">
                  <TabsTrigger value="media" className="flex-1">
                    <ImageIcon className="size-3 mr-1" /> Media
                  </TabsTrigger>
                  <TabsTrigger value="files" className="flex-1">
                    <FileText className="size-3 mr-1" /> Files
                  </TabsTrigger>
                  <TabsTrigger value="links" className="flex-1">
                    <LinkIcon className="size-3 mr-1" /> Links
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="media" className="mt-3">
                  <div className="grid grid-cols-3 gap-1.5">
                    {gallery.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <motion.img
                        key={i}
                        src={src}
                        alt=""
                        whileHover={{ scale: 1.04 }}
                        className="aspect-square rounded-xl object-cover cursor-pointer"
                      />
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="files" className="mt-3 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-xl glass-subtle">
                      <div className="size-9 rounded-lg bg-foreground/10 grid place-items-center">
                        <FileText className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">helios-spec-v{i}.pdf</p>
                        <p className="text-[10px] text-muted-foreground">2.4 MB · today</p>
                      </div>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="links" className="mt-3 space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-xl glass-subtle">
                      <div className="size-9 rounded-lg bg-foreground/10 grid place-items-center">
                        <LinkIcon className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">nova.fm/glass-cathedrals</p>
                        <p className="text-[10px] text-muted-foreground">Shared this week</p>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>

              <div className="mt-6">
                <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  Links
                </h4>
                <div className="space-y-2">
                  <LinkRow icon={<Globe />} label="aria.design" sub="Personal site" />
                  <LinkRow icon={<Github />} label="@ariavance" sub="GitHub" />
                  <LinkRow icon={<Twitter />} label="@ariavance" sub="X" />
                  <LinkRow icon={<Music />} label="Now playing" sub="Glass Cathedrals" pulse />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10">
                <button className="w-full flex items-center justify-between text-sm text-rose-400 hover:bg-rose-500/5 rounded-xl px-3 py-2.5 transition">
                  <span className="flex items-center gap-2">
                    <Shield className="size-4" />
                    Block & report
                  </span>
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

function Header({ chat, onClose }: { chat: Chat; onClose: () => void }) {
  return (
    <div className="relative h-40">
      <div
        className="absolute inset-0"
        style={{ background: chat.color ?? "linear-gradient(135deg,#8B5CF6,#22D3EE)" }}
      />
      <motion.div
        className="absolute inset-0"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%"]
        }}
        transition={{ duration: 18, repeat: Infinity, repeatType: "reverse" }}
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35), transparent 40%), radial-gradient(circle at 70% 70%, rgba(0,0,0,0.25), transparent 50%)",
          backgroundSize: "200% 200%"
        }}
      />
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <Badge variant="glass" className="!bg-black/30 !text-white">
          <Sparkles className="size-3" /> profile
        </Badge>
        <div className="flex items-center gap-1.5">
          <button className="size-8 rounded-full bg-black/30 backdrop-blur grid place-items-center text-white hover:bg-black/50">
            <Camera className="size-4" />
          </button>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-black/30 backdrop-blur grid place-items-center text-white hover:bg-black/50"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Action({
  icon,
  label,
  gradient
}: {
  icon: React.ReactNode;
  label: string;
  gradient?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      className={
        "flex flex-col items-center gap-1.5 py-3 rounded-2xl transition " +
        (gradient
          ? "text-white bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-glow"
          : "glass-subtle hover:bg-foreground/5")
      }
    >
      <span className="[&_svg]:size-4">{icon}</span>
      <span className="text-[11px] font-medium">{label}</span>
    </motion.button>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="glass-subtle rounded-2xl p-3 text-center">
      <div className="text-lg font-semibold neon-text">{k}</div>
      <div className="text-[10px] text-muted-foreground">{v}</div>
    </div>
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
    <div className="flex items-center gap-3 p-3 rounded-xl glass-subtle">
      <div className="size-8 rounded-lg bg-foreground/10 grid place-items-center">{icon}</div>
      <span className="text-sm flex-1">{label}</span>
      {children}
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
    <div className="flex items-center gap-3 p-2.5 rounded-xl glass-subtle hover:bg-foreground/5 transition cursor-pointer">
      <div className="size-9 rounded-lg bg-foreground/10 grid place-items-center [&_svg]:size-4">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{label}</div>
        <div className="text-[11px] text-muted-foreground truncate">{sub}</div>
      </div>
      {pulse && <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />}
    </div>
  );
}

function MemberList({ chat }: { chat: Chat }) {
  // Use explicit memberIds if present, otherwise fall back to a deterministic
  // subset of the mock users so existing seeded groups still show a roster.
  const ids = chat.memberIds && chat.memberIds.length > 0
    ? chat.memberIds
    : ["me", "u1", "u2", "u4", "u6", "u7"].slice(0, chat.membersCount ?? 6);

  const members = ids
    .map((id) => users.find((u) => u.id === id))
    .filter((u): u is NonNullable<typeof u> => !!u);

  const me = members.find((m) => m.id === "me");
  const others = members.filter((m) => m.id !== "me");

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Members</h3>
          <span className="text-[11px] text-muted-foreground">
            {members.length}
          </span>
        </div>
        <button className="text-[11px] inline-flex items-center gap-1 text-cyan-400 hover:underline">
          <UserPlus className="size-3" /> Add people
        </button>
      </div>

      <div className="grid grid-cols-1 gap-1">
        {me && <MemberRow user={me} isMe isAdmin />}
        {others.map((u) => (
          <MemberRow key={u.id} user={u} />
        ))}
      </div>
    </div>
  );
}

function MemberRow({
  user,
  isMe,
  isAdmin
}: {
  user: { id: string; name: string; avatar: string; username: string; status: string };
  isMe?: boolean;
  isAdmin?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded-xl hover:bg-foreground/[0.04] transition group cursor-pointer"
      )}
    >
      <AnimatedAvatar
        src={user.avatar}
        name={user.name}
        size={40}
        status={(user.status as "online" | "away" | "busy" | "offline") ?? "offline"}
        pulse={false}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">
            {user.name}
            {isMe && (
              <span className="ml-1.5 text-[10px] text-muted-foreground">(you)</span>
            )}
          </p>
          {isAdmin && (
            <Badge variant="warning" className="!text-[9px] !py-0 !px-1.5">
              <Crown className="size-2.5" /> admin
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground truncate">
          @{user.username} · {user.status}
        </p>
      </div>
      {!isMe && (
        <button
          className="opacity-0 group-hover:opacity-100 transition text-[11px] text-muted-foreground hover:text-foreground"
          aria-label="Member actions"
        >
          <ChevronRight className="size-4" />
        </button>
      )}
    </div>
  );
}
