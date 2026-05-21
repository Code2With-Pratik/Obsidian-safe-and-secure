"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Bell, Image as ImageIcon, Lock, Pin, Star, Users, FileText, Link as LinkIcon, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { initials } from "@/lib/utils";
import { useUIStore } from "@/store/use-ui-store";
import type { Chat } from "@/types";

const media = [
  "https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=200&q=80",
  "https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?w=200&q=80",
  "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=200&q=80",
  "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=200&q=80",
  "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=200&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=200&q=80"
];

export function ChatDetailsPanel({ chat }: { chat: Chat }) {
  const setRight = useUIStore((s) => s.setRightPanel);
  const [muted, setMuted] = React.useState(!!chat.muted);

  return (
    <motion.aside
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 28 }}
      className="hidden xl:flex w-[340px] shrink-0 flex-col border-l border-border/40 bg-card/40 backdrop-blur-2xl"
    >
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
        <span className="text-sm font-semibold">Conversation</span>
        <Button variant="ghost" size="icon-sm" onClick={() => setRight(null)}>
          <X />
        </Button>
      </div>

      <div className="overflow-y-auto scroll-fade-y px-4 py-5">
        <div className="flex flex-col items-center text-center">
          <Avatar className="size-20 ring-4 ring-primary/30 ring-offset-2 ring-offset-background">
            <AvatarImage src={chat.avatar} />
            <AvatarFallback>{initials(chat.name)}</AvatarFallback>
          </Avatar>
          <h3 className="mt-3 text-lg font-semibold">{chat.name}</h3>
          {chat.encrypted && (
            <Badge variant="success" className="mt-1.5">
              <Lock className="size-3" /> End-to-end encrypted
            </Badge>
          )}
          <p className="text-xs text-muted-foreground mt-2 max-w-[20rem]">
            Crafting next-generation experiences together. Pinned conversation.
          </p>

          <div className="grid grid-cols-3 gap-2 w-full mt-5">
            <Button variant="glass" size="sm" className="!h-12 flex-col gap-1">
              <Pin className="size-4" />
              <span className="text-[10px]">Pin</span>
            </Button>
            <Button variant="glass" size="sm" className="!h-12 flex-col gap-1">
              <Star className="size-4" />
              <span className="text-[10px]">Favorite</span>
            </Button>
            <Button variant="glass" size="sm" className="!h-12 flex-col gap-1">
              <Users className="size-4" />
              <span className="text-[10px]">Members</span>
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <SettingRow icon={<Bell className="size-4" />} label="Mute notifications">
            <Switch checked={muted} onCheckedChange={setMuted} />
          </SettingRow>
          <SettingRow icon={<Lock className="size-4" />} label="Disappearing messages">
            <span className="text-xs text-muted-foreground">Off</span>
          </SettingRow>
          <SettingRow icon={<Pin className="size-4" />} label="Pinned messages">
            <span className="text-xs text-muted-foreground">3</span>
          </SettingRow>
        </div>

        <div className="mt-6">
          <Tabs defaultValue="media">
            <TabsList className="w-full">
              <TabsTrigger value="media" className="flex-1">Media</TabsTrigger>
              <TabsTrigger value="files" className="flex-1">Files</TabsTrigger>
              <TabsTrigger value="links" className="flex-1">Links</TabsTrigger>
            </TabsList>
            <TabsContent value="media" className="mt-3">
              <div className="grid grid-cols-3 gap-1">
                {media.map((m, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={m}
                    alt=""
                    className="aspect-square w-full rounded-lg object-cover hover:scale-105 transition cursor-pointer"
                  />
                ))}
              </div>
            </TabsContent>
            <TabsContent value="files" className="mt-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg glass-subtle">
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
    </motion.aside>
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
