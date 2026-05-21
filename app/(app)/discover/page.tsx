"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Search,
  Sparkles,
  Flame,
  TrendingUp,
  Users,
  CheckCircle2,
  Mic,
  Ghost,
  Plus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { communities, users, ghostRooms } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";

export default function DiscoverPage() {
  return (
    <ScrollArea className="h-[calc(100dvh-4rem)]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight">
            <span className="neon-text">Discover</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Communities, rooms and people tuned to you — curated by Nova AI from what you love.
          </p>
        </motion.div>

        <div className="mt-7 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9 h-12 text-base"
            placeholder="Try 'synth music', 'design hangouts', or 'late-night coding'…"
          />
          <Badge variant="cyan" className="absolute right-3 top-1/2 -translate-y-1/2">
            <Sparkles className="size-3" /> AI search
          </Badge>
        </div>

        <Tabs defaultValue="communities" className="mt-8">
          <TabsList>
            <TabsTrigger value="communities">Communities</TabsTrigger>
            <TabsTrigger value="rooms">Live rooms</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="picks">For you</TabsTrigger>
          </TabsList>

          <TabsContent value="communities" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {communities.map((c) => (
                <motion.div
                  key={c.id}
                  whileHover={{ y: -4 }}
                  className="relative rounded-3xl overflow-hidden glass border border-border/60 group"
                >
                  <div className="relative h-32 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.cover} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/70" />
                    {c.trending && (
                      <Badge variant="danger" className="absolute top-3 left-3">
                        <Flame className="size-3" /> trending
                      </Badge>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold">{c.name}</h3>
                      {c.verified && <CheckCircle2 className="size-4 text-cyan-400 fill-cyan-400/20" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.category}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                        <Users className="size-3" />
                        {c.members.toLocaleString()} · <span className="text-emerald-400">{c.online} online</span>
                      </div>
                      <Button size="sm" variant="gradient">Join</Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="rooms" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ghostRooms.slice(0, 6).map((r) => (
                <Card key={r.id} className="overflow-hidden">
                  <div className="relative h-24" style={{ background: r.aura }}>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/40" />
                    <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/40 backdrop-blur text-[10px] text-white">
                      <span className="size-1.5 rounded-full bg-white animate-pulse" />
                      LIVE
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-1.5">
                      <Mic className="size-3.5 text-violet-400" />
                      <h3 className="font-semibold">{r.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{r.topic}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex -space-x-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="size-6 rounded-full bg-foreground/10 ring-2 ring-background" />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{r.members} listening</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="people" className="mt-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {users.slice(1).map((u) => (
                <motion.div
                  key={u.id}
                  whileHover={{ y: -3 }}
                  className="glass rounded-2xl p-4 flex items-center gap-3"
                >
                  <Avatar className="size-12 ring-2 ring-primary/40 ring-offset-2 ring-offset-background">
                    <AvatarImage src={u.avatar} />
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                  </div>
                  <Button size="icon-sm" variant="gradient">
                    <Plus className="size-3.5" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="picks" className="mt-6">
            <div className="grid gap-3 lg:grid-cols-2">
              <Pick title="Designers Unfiltered is live now" sub="Iris Park + 32 others are talking about glassmorphism in the wild." icon={<Mic />} />
              <Pick title="3 new ghost rooms tonight" sub="The vibe says: rainy synthwave + introspective late-talk." icon={<Ghost />} />
              <Pick title="Synth Citizens — new podcast" sub="Producers you follow just dropped a 60-min mix." icon={<TrendingUp />} />
              <Pick title="People who code in Rust" sub="12 connections suggested from your contacts and conversations." icon={<Users />} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}

function Pick({
  title,
  sub,
  icon
}: {
  title: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <motion.div whileHover={{ y: -2 }} className="glass rounded-2xl p-5 flex gap-4">
      <div className="size-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center text-white shadow-glow shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
        <Button variant="glass" size="sm" className="mt-3">
          Explore
        </Button>
      </div>
    </motion.div>
  );
}
