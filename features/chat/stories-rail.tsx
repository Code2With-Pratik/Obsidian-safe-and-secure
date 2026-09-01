"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { users } from "@/lib/mock-data";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useStoriesStore, type UserStories } from "@/store/use-stories-store";
import { useAuthStore } from "@/store/use-auth-store";

export function StoriesRail() {
  const byUser = useStoriesStore((s) => s.byUser);
  const profiles = useStoriesStore((s) => s.profiles);
  const openViewer = useStoriesStore((s) => s.openViewer);
  const meId = useAuthStore((s) => s.user?.id);
  const reels = Object.values(byUser)
    .filter((r) => r.slides.length > 0)
    // your own reel first, then everyone else
    .sort((a, b) =>
      a.userId === meId ? -1 : b.userId === meId ? 1 : 0
    );

  return (
    <div className="flex gap-2.5 overflow-x-auto px-4 py-3 no-scrollbar">
      <CreateTile />
      {reels.map((r) => {
        const cached = profiles[r.userId];
        const mock = users.find((u) => u.id === r.userId);
        const author = cached
          ? { name: cached.name || cached.username, avatar: cached.avatar }
          : mock;
        return (
          <StoryTile
            key={r.userId}
            reel={r}
            authorName={author?.name?.split(" ")[0]}
            authorAvatar={author?.avatar}
            onOpen={() => openViewer(r.userId)}
          />
        );
      })}
    </div>
  );
}

function CreateTile() {
  const t = useT();
  const meAvatar = useAuthStore((s) => s.user?.avatar);
  return (
    <Link
      href="/stories/create"
      className="relative shrink-0 w-[88px] h-[112px] rounded-[26px] overflow-hidden ring-1 ring-white/10 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)] group"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, hsl(0 0% 2%) 0%, hsl(0 0% 4%) 100%)"
        }}
      />
      <div className="absolute inset-0 grid-fade opacity-15" />

      <motion.div
        whileHover={{ y: -2 }}
        className="absolute inset-0 flex flex-col items-center justify-center px-2"
      >
        <div className="relative">
          <Avatar className="size-12 ring-2 ring-white/20">
            <AvatarImage src={meAvatar} />
          </Avatar>
          <div className="absolute -bottom-1 -right-1 size-[22px] rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 grid place-items-center ring-[3px] ring-[hsl(0_0%_4%)] shadow-[0_4px_12px_rgba(34,211,238,0.55)]">
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
  reel,
  authorName,
  authorAvatar,
  onOpen
}: {
  reel: UserStories;
  authorName?: string;
  authorAvatar?: string;
  onOpen: () => void;
}) {
  const first = reel.slides[0];
  return (
    <motion.button
      onClick={onOpen}
      whileHover={{ y: -3, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 240, damping: 20 }}
      className={cn(
        "relative shrink-0 w-[88px] h-[112px] rounded-[26px] overflow-hidden cursor-pointer",
        "ring-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)]",
        reel.viewed ? "ring-white/10" : "ring-white/20"
      )}
    >
      {first.kind === "text" ? (
        <div className="absolute inset-0" style={{ background: first.bg }} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={first.src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Live image-layer overlays — same metadata the viewer uses. Image
          layers aren't baked into the PNG (avoids CORS taint), so we render
          them on top of the thumbnail too so the rail tile previews the
          actual composed look. */}
      {first.overlays?.map((o) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={o.id}
          src={o.src}
          alt=""
          className="absolute select-none pointer-events-none object-cover"
          style={{
            left: `${o.x}%`,
            top: `${o.y}%`,
            width: `${o.wPct}%`,
            height: `${o.hPct}%`,
            borderRadius: 4,
            filter: o.filter,
            transform: `translate(-50%, -50%) rotate(${o.rotate}deg) scale(${o.scale})`
          }}
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60" />

      {!reel.viewed && (
        <div className="absolute inset-0 rounded-[26px] ring-2 ring-cyan-400/70 pointer-events-none" />
      )}

      <div className="absolute top-1.5 left-1.5">
        <div
          className={cn(
            "rounded-full p-[1.5px]",
            reel.viewed
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

      {first.kind === "text" && first.text && (
        <p className="absolute inset-x-1.5 bottom-7 text-[10px] font-medium text-white leading-tight drop-shadow line-clamp-3">
          {first.text}
        </p>
      )}

      <span className="absolute bottom-1.5 left-2 right-2 text-[11px] font-semibold text-white drop-shadow truncate">
        {authorName}
      </span>
    </motion.button>
  );
}
