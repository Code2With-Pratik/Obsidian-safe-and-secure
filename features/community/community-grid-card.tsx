"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Flame, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Community } from "@/types";

interface Props {
  community: Community;
  joined: boolean;
  /** Stop event propagation so the underlying Link doesn't fire. */
  onJoin: (e: React.MouseEvent) => void;
  /** Lower for dense grids (chat list mobile), default for discover. */
  size?: "default" | "compact";
}

export function CommunityGridCard({
  community,
  joined,
  onJoin,
  size = "default"
}: Props) {
  return (
    <Link
      href={`/discover/community/${community.id}`}
      className="block group"
    >
      <motion.article
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
        className={cn(
          "relative w-full overflow-hidden border border-white/10",
          "rounded-3xl shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]",
          size === "compact" ? "aspect-[4/5]" : "aspect-[5/6]"
        )}
      >
        {/* Cover */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={community.cover}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {/* Dark gradient below the cover so the description always reads. */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/75 to-transparent" />
        {/* Subtle top fade so the corner chips have contrast against light covers. */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent" />

        {/* Top-left: member count */}
        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 h-7 rounded-full bg-black/45 backdrop-blur border border-white/10 text-white text-[11px] font-medium">
          <Users className="size-3" />
          {community.members.toLocaleString()}
        </div>

        {/* Top-right: Join */}
        <button
          onClick={onJoin}
          className={cn(
            "absolute top-3 right-3 h-7 px-3 rounded-full text-[11px] font-semibold transition active:scale-95 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.5)]",
            joined
              ? "bg-white/15 backdrop-blur border border-white/20 text-white hover:bg-white/25"
              : "bg-white text-black hover:bg-white/90"
          )}
        >
          {joined ? "Joined" : "Join"}
        </button>

        {/* Trending tag tucked under the member count when applicable */}
        {community.trending && (
          <div className="absolute top-12 left-3 inline-flex items-center gap-1 px-2 h-6 rounded-full bg-rose-500/80 backdrop-blur text-white text-[10px] font-semibold">
            <Flame className="size-2.5" /> trending
          </div>
        )}

        {/* Bottom: name + description */}
        <div className="absolute bottom-0 inset-x-0 p-4 text-white">
          <div className="flex items-center gap-1.5">
            <h3
              className={cn(
                "font-display font-semibold tracking-tight truncate drop-shadow",
                size === "compact" ? "text-base" : "text-lg"
              )}
            >
              {community.name}
            </h3>
            {community.verified && (
              <CheckCircle2 className="size-4 text-cyan-300 shrink-0" />
            )}
          </div>
          <p className="text-[11px] text-white/70 truncate">{community.category}</p>
          {community.description && (
            <p
              className={cn(
                "mt-1.5 text-[12px] leading-snug text-white/85 drop-shadow",
                size === "compact" ? "line-clamp-2" : "line-clamp-2"
              )}
            >
              {community.description}
            </p>
          )}
        </div>
      </motion.article>
    </Link>
  );
}

/** Pill empty-state for community filters with no matches. */
export function CommunityGridEmpty({
  title,
  body,
  icon
}: {
  title: string;
  body: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="glass rounded-3xl p-10 text-center col-span-full">
      <div className="size-12 mx-auto rounded-2xl bg-foreground/10 grid place-items-center text-muted-foreground">
        {icon ?? <Sparkles />}
      </div>
      <h3 className="font-semibold mt-3">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{body}</p>
    </div>
  );
}
