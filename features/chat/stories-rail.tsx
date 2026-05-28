"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { stories, users, currentUser } from "@/lib/mock-data";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function StoriesRail() {
  return (
    <div className="flex gap-2.5 overflow-x-auto px-4 py-3 no-scrollbar">
      <CreateTile />
      {stories.map((s) => {
        const author = users.find((u) => u.id === s.authorId);
        return <StoryTile key={s.id} story={s} authorName={author?.name.split(" ")[0]} authorAvatar={author?.avatar} />;
      })}
    </div>
  );
}

function CreateTile() {
  const t = useT();
  return (
    <Link
      href="/stories/create"
      className="relative shrink-0 w-[88px] h-[112px] rounded-[26px] overflow-hidden ring-1 ring-white/10 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)] group"
    >
      {/* dark glass gradient backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, hsl(240 18% 14%) 0%, hsl(240 22% 8%) 100%)"
        }}
      />
      <div className="absolute inset-0 grid-fade opacity-15" />

      <motion.div
        whileHover={{ y: -2 }}
        className="absolute inset-0 flex flex-col items-center justify-center px-2"
      >
        <div className="relative">
          <Avatar className="size-12 ring-2 ring-white/20">
            <AvatarImage src={currentUser.avatar} />
          </Avatar>
          <div className="absolute -bottom-1 -right-1 size-[22px] rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 grid place-items-center ring-[3px] ring-[hsl(240_22%_8%)] shadow-[0_4px_12px_rgba(34,211,238,0.55)]">
            <Plus className="size-3 text-white" strokeWidth={3} />
          </div>
        </div>
        <span className="mt-2 text-[11px] font-semibold text-white/95 text-center leading-tight">
          {t("Start a story")}
        </span>
      </motion.div>
    </Link>
  );
}

function StoryTile({
  story,
  authorName,
  authorAvatar
}: {
  story: (typeof stories)[number];
  authorName?: string;
  authorAvatar?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 240, damping: 20 }}
      className={cn(
        "relative shrink-0 w-[88px] h-[112px] rounded-[26px] overflow-hidden cursor-pointer",
        "ring-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)]",
        story.viewed ? "ring-white/10" : "ring-white/20"
      )}
    >
      {story.type === "text" ? (
        <div className="absolute inset-0" style={{ background: story.bg }} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={story.preview}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60" />

      {!story.viewed && (
        <div className="absolute inset-0 rounded-[26px] ring-2 ring-cyan-400/70 pointer-events-none" />
      )}

      <div className="absolute top-1.5 left-1.5">
        <div
          className={cn(
            "rounded-full p-[1.5px]",
            story.viewed
              ? "bg-white/60"
              : "bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-cyan-400"
          )}
        >
          <div className="rounded-full bg-white p-[1px]">
            <Avatar className="size-7">
              <AvatarImage src={authorAvatar} />
            </Avatar>
          </div>
        </div>
      </div>

      {story.type === "text" && story.text && (
        <p className="absolute inset-x-1.5 bottom-7 text-[10px] font-medium text-white leading-tight drop-shadow line-clamp-3">
          {story.text}
        </p>
      )}

      <span className="absolute bottom-1.5 left-2 right-2 text-[11px] font-semibold text-white drop-shadow truncate">
        {authorName}
      </span>
    </motion.div>
  );
}
