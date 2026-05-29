"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Music, Type, Wand2, Eye, Vote } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { users, currentUser } from "@/lib/mock-data";
import { useStoriesStore, type UserStories } from "@/store/use-stories-store";
import { useT } from "@/lib/i18n";
import { cn, formatRelative } from "@/lib/utils";

export default function StoriesPage() {
  const t = useT();
  const byUser = useStoriesStore((s) => s.byUser);
  const openViewer = useStoriesStore((s) => s.openViewer);
  const reels = Object.values(byUser)
    .filter((r) => r.slides.length > 0)
    .sort((a, b) => (a.userId === "me" ? -1 : b.userId === "me" ? 1 : 0));

  return (
    <ScrollArea className="h-[calc(100dvh-4rem)]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight">
              {t("Stories")}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t("Fragments of the day from the people you follow. Tap to dive in.")}
            </p>
          </div>
          <Button asChild variant="gradient" size="lg" className="hidden md:inline-flex">
            <Link href="/stories/create">
              <Plus /> {t("Create story")}
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          <CreateTile />
          {reels.map((r) => (
            <StoryTile key={r.userId} reel={r} onOpen={() => openViewer(r.userId)} />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

function StoryTile({ reel, onOpen }: { reel: UserStories; onOpen: () => void }) {
  const author = users.find((u) => u.id === reel.userId);
  const first = reel.slides[0];
  return (
    <motion.button
      onClick={onOpen}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      className={cn(
        "relative aspect-[3/4] rounded-[28px] overflow-hidden ring-1 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.5)] group",
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
          className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/70" />

      {!reel.viewed && (
        <div className="absolute inset-0 rounded-[28px] ring-2 ring-cyan-400/70 pointer-events-none" />
      )}

      <div className="absolute top-2.5 left-2.5">
        <div
          className={cn(
            "rounded-full p-[2px]",
            reel.viewed
              ? "bg-white/60"
              : "bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-cyan-400"
          )}
        >
          <div className="rounded-full bg-white p-[1.5px]">
            <Avatar className="size-8">
              <AvatarImage src={author?.avatar} />
            </Avatar>
          </div>
        </div>
      </div>

      {first.kind === "text" && first.text && (
        <p className="absolute inset-x-3 top-1/2 -translate-y-1/2 text-white text-base font-display font-medium leading-snug text-center drop-shadow">
          {first.text}
        </p>
      )}

      <div className="absolute bottom-2.5 left-3 right-3 text-left">
        <p className="text-sm font-semibold text-white drop-shadow truncate">
          {author?.name.split(" ")[0]}
        </p>
        <div className="flex items-center justify-between text-[10px] text-white/80 mt-0.5">
          <span className="inline-flex items-center gap-1">
            <Eye className="size-3" /> {reel.slides.length}
          </span>
          <span suppressHydrationWarning>
            {formatRelative(new Date(first.postedAt).toISOString())}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

function CreateTile() {
  const t = useT();
  return (
    <Link
      href="/stories/create"
      className="relative aspect-[3/4] rounded-[28px] overflow-hidden ring-1 ring-white/10 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.5)] group"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, hsl(240 18% 14%) 0%, hsl(240 22% 8%) 100%)"
        }}
      />
      <div className="absolute inset-0 grid-fade opacity-15" />

      <motion.div
        whileHover={{ y: -4 }}
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        <div className="relative">
          <Avatar className="size-20 ring-2 ring-white/20">
            <AvatarImage src={currentUser.avatar} />
          </Avatar>
          <div className="absolute -bottom-1 -right-1 size-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 grid place-items-center ring-[4px] ring-[hsl(240_22%_8%)] shadow-[0_6px_18px_rgba(34,211,238,0.55)]">
            <Plus className="size-5 text-white" strokeWidth={3} />
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold text-white">{t("Start a story")}</p>
        <p className="text-[10px] text-white/60 mt-0.5">{t("Photo, video, or text")}</p>
      </motion.div>

      <div className="absolute bottom-4 inset-x-0 flex justify-center gap-1.5 pointer-events-none">
        {[Wand2, Music, Type, Vote].map((Ic, i) => (
          <span key={i} className="size-6 grid place-items-center rounded-md bg-white/10 backdrop-blur-md">
            <Ic className="size-3 text-white" />
          </span>
        ))}
      </div>
    </Link>
  );
}
