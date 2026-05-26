"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateCommunityDialog } from "@/features/community/create-community-dialog";
import { InterestMatchPopup } from "@/features/community/interest-match-popup";
import {
  CommunityGridCard,
  CommunityGridEmpty
} from "@/features/community/community-grid-card";
import { useCommunityStore } from "@/store/use-community-store";
import { cn } from "@/lib/utils";
import type { Community } from "@/types";

type CommunityFilter = "all" | "joined" | "trending" | "mine";

const COMMUNITY_FILTERS: { id: CommunityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "joined", label: "Joined" },
  { id: "trending", label: "Trending" },
  { id: "mine", label: "Mine" }
];

export default function DiscoverPage() {
  const router = useRouter();
  const communities = useCommunityStore((s) => s.communities);
  const joinedIds = useCommunityStore((s) => s.joinedIds);
  const hostedIds = useCommunityStore((s) => s.hostedIds);
  const joinCommunity = useCommunityStore((s) => s.joinCommunity);
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<CommunityFilter>("all");
  const [match, setMatch] = React.useState<{
    open: boolean;
    count: number;
    name: string;
  }>({ open: false, count: 0, name: "" });

  const filteredCommunities = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    return communities
      .filter((c) =>
        query
          ? c.name.toLowerCase().includes(query) ||
            c.category.toLowerCase().includes(query) ||
            c.description?.toLowerCase().includes(query) ||
            c.interests?.some((i) => i.toLowerCase().includes(query))
          : true
      )
      .filter((c) => {
        if (filter === "joined") return joinedIds.includes(c.id);
        if (filter === "trending") return !!c.trending;
        if (filter === "mine") return hostedIds.includes(c.id);
        return true;
      });
  }, [q, communities, filter, joinedIds, hostedIds]);

  const handleJoin = (e: React.MouseEvent, c: Community) => {
    e.preventDefault();
    e.stopPropagation();
    if (joinedIds.includes(c.id)) {
      router.push(`/discover/community/${c.id}`);
      return;
    }
    const { matched } = joinCommunity(c.id);
    setMatch({ open: true, count: matched, name: c.name });
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

        <div className="mt-8">
          {/* Filter chips — same set as the mobile chat-list community tab */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-5">
            {COMMUNITY_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition",
                  filter === f.id
                    ? "bg-foreground text-background"
                    : "glass-subtle text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredCommunities.length === 0 ? (
            <CommunityGridEmpty
              title={
                filter === "joined"
                  ? "You haven't joined any yet"
                  : filter === "mine"
                    ? "You haven't created any communities"
                    : filter === "trending"
                      ? "Nothing trending here"
                      : "No matches"
              }
              body={
                filter === "joined"
                  ? "Browse the All tab and tap Join on a community that vibes."
                  : filter === "mine"
                    ? "Hit Create community to launch your own."
                    : "Try a different keyword or filter."
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCommunities.map((c) => (
                <CommunityGridCard
                  key={c.id}
                  community={c}
                  joined={joinedIds.includes(c.id)}
                  onJoin={(e) => handleJoin(e, c)}
                />
              ))}
            </div>
          )}
        </div>
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

