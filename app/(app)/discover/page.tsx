"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Flame,
  Ghost,
  Hash,
  Mic,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  Users
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { users, ghostRooms } from "@/lib/mock-data";
import { CreateCommunityDialog } from "@/features/community/create-community-dialog";
import { InterestMatchPopup } from "@/features/community/interest-match-popup";
import { useCommunityStore } from "@/store/use-community-store";
import { cn } from "@/lib/utils";
import type { Community } from "@/types";

export default function DiscoverPage() {
  const router = useRouter();
  const communities = useCommunityStore((s) => s.communities);
  const joinedIds = useCommunityStore((s) => s.joinedIds);
  const joinCommunity = useCommunityStore((s) => s.joinCommunity);
  const [q, setQ] = React.useState("");
  const [match, setMatch] = React.useState<{
    open: boolean;
    count: number;
    name: string;
  }>({ open: false, count: 0, name: "" });

  const filteredCommunities = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return communities;
    return communities.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.category.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query) ||
        c.interests?.some((i) => i.toLowerCase().includes(query))
    );
  }, [q, communities]);

  const trending = React.useMemo(
    () => filteredCommunities.filter((c) => c.trending),
    [filteredCommunities]
  );

  const handleJoin = (e: React.MouseEvent, c: Community) => {
    e.preventDefault();
    e.stopPropagation();
    if (joinedIds.includes(c.id)) {
      router.push(`/discover/community/${c.id}`);
      return;
    }
    const { matched } = joinCommunity(c.id);
    setMatch({ open: true, count: matched, name: c.name });
    // Let the popup play, then navigate.
    window.setTimeout(() => {
      router.push(`/discover/community/${c.id}`);
    }, 1200);
  };

  return (
    <ScrollArea className="h-[calc(100dvh-4rem)]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight">
              <span className="neon-text">Discover</span>
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Communities, rooms and people tuned to you — host your own world or jump into someone else's.
            </p>
          </div>
          <CreateCommunityDialog>
            <Button variant="gradient" size="lg">
              <Plus /> Create community
            </Button>
          </CreateCommunityDialog>
        </motion.div>

        <div className="mt-7 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-12 text-base"
            placeholder="Try 'design', 'synthwave', 'ai agents'…"
          />
          <Badge variant="cyan" className="absolute right-3 top-1/2 -translate-y-1/2">
            <Sparkles className="size-3" /> AI search
          </Badge>
        </div>

        {/* Trending strip — visible when there are any trending communities matching the search. */}
        {trending.length > 0 && (
          <section className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="size-4 text-rose-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">
                Trending now
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-2 px-2 pb-1 snap-x snap-mandatory">
              {trending.map((c) => (
                <TrendingChip
                  key={c.id}
                  community={c}
                  joined={joinedIds.includes(c.id)}
                  onJoin={(e) => handleJoin(e, c)}
                />
              ))}
            </div>
          </section>
        )}

        <Tabs defaultValue="communities" className="mt-8">
          <TabsList>
            <TabsTrigger value="communities">Communities</TabsTrigger>
            <TabsTrigger value="rooms">Live rooms</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="picks">For you</TabsTrigger>
          </TabsList>

          <TabsContent value="communities" className="mt-6">
            {filteredCommunities.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center">
                <Users className="size-10 mx-auto text-muted-foreground" />
                <h3 className="font-semibold mt-3">No matches</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Try a different keyword, or create one yourself.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCommunities.map((c) => (
                  <CommunityCard
                    key={c.id}
                    community={c}
                    joined={joinedIds.includes(c.id)}
                    onJoin={(e) => handleJoin(e, c)}
                  />
                ))}
              </div>
            )}
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
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {r.topic}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex -space-x-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div
                            key={i}
                            className="size-6 rounded-full bg-foreground/10 ring-2 ring-background"
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {r.members} listening
                      </span>
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
                    <p className="text-xs text-muted-foreground truncate">
                      @{u.username}
                    </p>
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
              <Pick
                title="Designers Unfiltered is live now"
                sub="Iris Park + 32 others are talking about glassmorphism in the wild."
                icon={<Mic />}
              />
              <Pick
                title="3 new ghost rooms tonight"
                sub="The vibe says: rainy synthwave + introspective late-talk."
                icon={<Ghost />}
              />
              <Pick
                title="Synth Citizens — new podcast"
                sub="Producers you follow just dropped a 60-min mix."
                icon={<TrendingUp />}
              />
              <Pick
                title="People who code in Rust"
                sub="12 connections suggested from your contacts and conversations."
                icon={<Users />}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <InterestMatchPopup
        open={match.open}
        count={match.count}
        communityName={match.name}
        onClose={() => setMatch({ open: false, count: 0, name: "" })}
      />
    </ScrollArea>
  );
}

function CommunityCard({
  community,
  joined,
  onJoin
}: {
  community: Community;
  joined: boolean;
  onJoin: (e: React.MouseEvent) => void;
}) {
  return (
    <Link
      href={`/discover/community/${community.id}`}
      className="block"
    >
      <motion.div
        whileHover={{ y: -4 }}
        className="relative rounded-3xl overflow-hidden glass border border-border/60 group cursor-pointer"
      >
        <div className="relative h-32 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={community.cover}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/70" />
          {community.trending && (
            <Badge variant="danger" className="absolute top-3 left-3">
              <Flame className="size-3" /> trending
            </Badge>
          )}
          {joined && (
            <Badge variant="success" className="absolute top-3 right-3">
              <CheckCircle2 className="size-3" /> joined
            </Badge>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold">{community.name}</h3>
            {community.verified && (
              <CheckCircle2 className="size-4 text-cyan-400 fill-cyan-400/20" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{community.category}</p>
          {community.description && (
            <p className="text-xs text-foreground/70 mt-2 line-clamp-2">
              {community.description}
            </p>
          )}
          {community.interests && community.interests.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {community.interests.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-foreground/5 border border-border/60 text-[10px] text-muted-foreground"
                >
                  <Hash className="size-2" />
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between mt-3">
            <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <Users className="size-3" />
              {community.members.toLocaleString()} ·{" "}
              <span className="text-emerald-400">{community.online} online</span>
            </div>
            <Button
              size="sm"
              variant={joined ? "glass" : "gradient"}
              onClick={onJoin}
            >
              {joined ? "Open" : "Join"}
            </Button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function TrendingChip({
  community,
  joined,
  onJoin
}: {
  community: Community;
  joined: boolean;
  onJoin: (e: React.MouseEvent) => void;
}) {
  return (
    <Link
      href={`/discover/community/${community.id}`}
      className={cn(
        "snap-start shrink-0 w-72 rounded-2xl relative overflow-hidden border border-border/60 group"
      )}
    >
      <div className="relative h-28">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={community.cover}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/85" />
        <div className="absolute inset-0 p-3 flex flex-col justify-between text-white">
          <div className="flex items-center justify-between">
            <Badge variant="danger" className="!text-[9px]">
              <Flame className="size-2.5" /> trending
            </Badge>
            {joined && (
              <Badge variant="success" className="!text-[9px]">
                joined
              </Badge>
            )}
          </div>
          <div>
            <p className="font-semibold truncate">{community.name}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[11px] opacity-90 inline-flex items-center gap-1">
                <Users className="size-3" />
                {community.members.toLocaleString()}
              </p>
              <button
                onClick={onJoin}
                className={cn(
                  "h-6 px-2.5 rounded-full text-[11px] font-medium transition",
                  joined
                    ? "bg-white/15 text-white hover:bg-white/25"
                    : "bg-white text-black hover:bg-white/90"
                )}
              >
                {joined ? "Open" : "Join"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
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
