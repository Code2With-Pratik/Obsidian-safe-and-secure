"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Music,
  Type,
  Wand2,
  Heart,
  Send,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Vote
} from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { stories, users, currentUser } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function StoriesPage() {
  const [active, setActive] = React.useState<number | null>(null);

  return (
    <ScrollArea className="h-[calc(100dvh-4rem)]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight">
              Stories
            </h1>
            <p className="text-muted-foreground mt-2">
              Fragments of the day from the people you follow. Tap to dive in.
            </p>
          </div>
          <Button asChild variant="gradient" size="lg" className="hidden md:inline-flex">
            <Link href="/stories/create">
              <Plus /> Create story
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          <CreateTile />
          {stories.map((s, i) => {
            const author = users.find((u) => u.id === s.authorId);
            return (
              <motion.button
                key={s.id}
                onClick={() => setActive(i)}
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 240, damping: 22 }}
                className={cn(
                  "relative aspect-[3/4] rounded-[28px] overflow-hidden ring-1 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.5)] group",
                  s.viewed ? "ring-white/10" : "ring-white/20"
                )}
              >
                {s.type === "text" ? (
                  <div className="absolute inset-0" style={{ background: s.bg }} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.preview} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/70" />

                {!s.viewed && (
                  <div className="absolute inset-0 rounded-[28px] ring-2 ring-cyan-400/70 pointer-events-none" />
                )}

                <div className="absolute top-2.5 left-2.5">
                  <div
                    className={cn(
                      "rounded-full p-[2px]",
                      s.viewed
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

                {s.type === "text" && s.text && (
                  <p className="absolute inset-x-3 top-1/2 -translate-y-1/2 text-white text-base font-display font-medium leading-snug text-center drop-shadow">
                    {s.text}
                  </p>
                )}

                <div className="absolute bottom-2.5 left-3 right-3">
                  <p className="text-sm font-semibold text-white drop-shadow truncate">
                    {author?.name.split(" ")[0]}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-white/80 mt-0.5">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="size-3" /> 124
                    </span>
                    <span>2h</span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {active !== null && (
          <StoryViewer index={active} onClose={() => setActive(null)} setIndex={setActive} />
        )}
      </AnimatePresence>
    </ScrollArea>
  );
}

function CreateTile() {
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
        <p className="mt-4 text-sm font-semibold text-white">Start a story</p>
        <p className="text-[10px] text-white/60 mt-0.5">Photo, video, or text</p>
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

function StoryViewer({
  index,
  setIndex,
  onClose
}: {
  index: number;
  setIndex: (i: number | null) => void;
  onClose: () => void;
}) {
  const story = stories[index];
  const author = users.find((u) => u.id === story.authorId);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    setProgress(0);
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          if (index < stories.length - 1) setIndex(index + 1);
          else onClose();
          return 0;
        }
        return p + 1;
      });
    }, 60);
    return () => clearInterval(id);
  }, [index, setIndex, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-xl grid place-items-center px-4"
    >
      <div className="relative w-full max-w-md aspect-[9/16] rounded-3xl overflow-hidden glass border border-border/60">
        {story.type === "text" ? (
          <div className="absolute inset-0" style={{ background: story.bg }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.preview} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

        <div className="absolute top-2 left-2 right-2 flex gap-1">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 overflow-hidden rounded-full">
              <div
                className="h-full bg-white"
                style={{
                  width: i < index ? "100%" : i === index ? `${progress}%` : "0%"
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-5 left-3 right-3 flex items-center gap-2">
          <Avatar className="size-9 ring-2 ring-white/40">
            <AvatarImage src={author?.avatar} />
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-white">{author?.name}</p>
            <p className="text-[10px] text-white/70">2 hours ago</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto size-8 rounded-full grid place-items-center bg-black/30 text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {story.type === "text" && story.text && (
          <p className="absolute inset-0 grid place-items-center text-white text-3xl font-display font-medium p-6 text-center">
            {story.text}
          </p>
        )}

        <div className="absolute bottom-4 left-3 right-3 flex items-center gap-2">
          <input
            placeholder="Send a message…"
            className="flex-1 bg-black/30 backdrop-blur-md px-3.5 py-2.5 rounded-full text-sm text-white placeholder:text-white/60 outline-none"
          />
          <button className="size-10 rounded-full grid place-items-center bg-white/15 backdrop-blur text-white hover:bg-white/25">
            <Heart className="size-4" />
          </button>
          <button className="size-10 rounded-full grid place-items-center bg-white/15 backdrop-blur text-white hover:bg-white/25">
            <PartyPopper className="size-4" />
          </button>
          <button className="size-10 rounded-full grid place-items-center bg-white/15 backdrop-blur text-white hover:bg-white/25">
            <Send className="size-4" />
          </button>
        </div>

        <button
          onClick={() => index > 0 && setIndex(index - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 size-10 rounded-full grid place-items-center bg-black/30 text-white"
        >
          <ChevronLeft />
        </button>
        <button
          onClick={() => index < stories.length - 1 && setIndex(index + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 size-10 rounded-full grid place-items-center bg-black/30 text-white"
        >
          <ChevronRight />
        </button>
      </div>
    </motion.div>
  );
}
