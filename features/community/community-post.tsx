"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  MoreHorizontal,
  Music,
  Pause,
  Pin,
  Play,
  Smile,
  Trash2
} from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn, formatTime } from "@/lib/utils";
import { useCommunityStore } from "@/store/use-community-store";
import { users } from "@/lib/mock-data";
import type { CommunityPost as Post } from "@/types";

const QUICK_REACTIONS = ["🔥", "💜", "🤩", "😅", "🧠", "🙌"];

interface Props {
  post: Post;
  themeBubble?: string;
  themeAccent?: string;
}

export function CommunityPost({ post, themeBubble, themeAccent }: Props) {
  const isHost = useCommunityStore((s) => s.isHost(post.communityId));
  const reactToPost = useCommunityStore((s) => s.reactToPost);
  const deletePost = useCommunityStore((s) => s.deletePost);
  const votePoll = useCommunityStore((s) => s.votePoll);

  const author = users.find((u) => u.id === post.authorId);
  const totalReactions =
    post.reactions?.reduce((acc, r) => acc + r.count, 0) ?? 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl glass border border-border/60 overflow-hidden"
    >
      <header className="flex items-center gap-3 p-4 pb-3">
        <Avatar className="size-10 ring-2 ring-violet-400/30">
          <AvatarImage src={author?.avatar} />
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-sm truncate">
              {author?.name ?? "Host"}
            </p>
            <CheckCircle2 className="size-3.5 text-cyan-400" />
            <Badge variant="cyan" className="!text-[9px] !py-0 !px-1.5">
              host
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground" suppressHydrationWarning>
            {formatTime(post.createdAt)}
          </p>
        </div>
        {isHost && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="size-8 rounded-full grid place-items-center hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition">
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="!w-44">
              <DropdownMenuItem>
                <Pin /> Pin post
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => deletePost(post.communityId, post.id)}
                className="!text-rose-400 focus:!text-rose-300"
              >
                <Trash2 /> Delete post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {post.content && (
        <div className="px-4 pb-3 text-[15px] leading-relaxed">
          <PostBody content={post.content} mentions={post.mentions ?? []} />
        </div>
      )}

      {post.kind === "image" && post.media && post.media.length > 0 && (
        <MediaGrid items={post.media} />
      )}

      {post.kind === "video" && post.media?.[0] && (
        <div className="relative bg-black">
          {/* eslint-disable-next-line @next/next/jsx-no-undef */}
          <video
            src={post.media[0].url}
            controls
            className="w-full max-h-[460px] object-contain bg-black"
          />
        </div>
      )}

      {post.kind === "song" && post.song && (
        <SongCard song={post.song} themeBubble={themeBubble} />
      )}

      {post.kind === "poll" && post.poll && (
        <PollCard
          poll={post.poll}
          themeAccent={themeAccent}
          onVote={(optionId) => votePoll(post.communityId, post.id, optionId)}
        />
      )}

      <footer className="px-3 py-2.5 border-t border-border/40 flex items-center gap-2">
        <ReactionRow
          reactions={post.reactions ?? []}
          onReact={(emoji) => reactToPost(post.communityId, post.id, emoji)}
        />
        {totalReactions > 0 && (
          <span className="text-[11px] text-muted-foreground ml-1">
            {totalReactions.toLocaleString()} reacted
          </span>
        )}
        <QuickReactButton
          onPick={(emoji) => reactToPost(post.communityId, post.id, emoji)}
        />
      </footer>
    </motion.article>
  );
}

function PostBody({
  content,
  mentions
}: {
  content: string;
  mentions: string[];
}) {
  // Render @mentions as styled chips inline.
  const mentionedUsers = mentions
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean);

  if (mentionedUsers.length === 0) {
    return <p className="whitespace-pre-wrap break-words">{content}</p>;
  }
  return (
    <>
      <p className="whitespace-pre-wrap break-words">{content}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {mentionedUsers.map((u) => (
          <span
            key={u!.id}
            className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-violet-500/15 border border-violet-400/40 text-[11px] text-violet-200"
          >
            @{u!.username}
          </span>
        ))}
      </div>
    </>
  );
}

function MediaGrid({
  items
}: {
  items: { url: string; alt?: string; kind?: "image" | "video" }[];
}) {
  if (items.length === 1) {
    return (
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={items[0].url}
          alt={items[0].alt ?? ""}
          className="w-full max-h-[520px] object-cover"
        />
      </div>
    );
  }
  return (
    <div className={cn("grid gap-0.5", items.length === 2 ? "grid-cols-2" : "grid-cols-2")}>
      {items.slice(0, 4).map((m, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={m.url}
          alt={m.alt ?? ""}
          className="w-full aspect-square object-cover"
        />
      ))}
    </div>
  );
}

function SongCard({
  song,
  themeBubble
}: {
  song: { title: string; artist: string; cover: string; durationSec: number };
  themeBubble?: string;
}) {
  const [playing, setPlaying] = React.useState(false);
  const minutes = Math.floor(song.durationSec / 60);
  const seconds = (song.durationSec % 60).toString().padStart(2, "0");
  return (
    <div
      className="mx-4 mb-3 rounded-2xl border border-white/10 overflow-hidden relative"
      style={{
        background:
          themeBubble ?? "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(34,211,238,0.18))"
      }}
    >
      <div className="flex items-center gap-3 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={song.cover} alt="" className="size-14 rounded-lg object-cover" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate inline-flex items-center gap-1.5">
            <Music className="size-3.5 text-violet-300" /> {song.title}
          </p>
          <p className="text-[11px] text-white/70 truncate">{song.artist}</p>
          <div className="mt-2 h-1 rounded-full bg-white/15 overflow-hidden">
            <motion.div
              className="h-full bg-white/80"
              initial={{ width: "0%" }}
              animate={{ width: playing ? "100%" : "12%" }}
              transition={{ duration: playing ? song.durationSec : 0.4, ease: "linear" }}
            />
          </div>
        </div>
        <button
          onClick={() => setPlaying((v) => !v)}
          aria-label={playing ? "Pause" : "Play"}
          className="size-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur grid place-items-center text-white transition"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
      </div>
      <span className="absolute bottom-2 right-3 text-[10px] text-white/70 tabular-nums">
        {minutes}:{seconds}
      </span>
    </div>
  );
}

function PollCard({
  poll,
  themeAccent,
  onVote
}: {
  poll: { question: string; options: { id: string; label: string; votes: number }[] };
  themeAccent?: string;
  onVote: (optionId: string) => void;
}) {
  const [voted, setVoted] = React.useState<string | null>(null);
  const total = poll.options.reduce((acc, o) => acc + o.votes, 0);
  return (
    <div className="mx-4 mb-3 rounded-2xl border border-border/60 p-3 bg-foreground/[0.02]">
      <p className="text-sm font-semibold mb-2">{poll.question}</p>
      <div className="space-y-1.5">
        {poll.options.map((o) => {
          const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
          const isVoted = voted === o.id;
          return (
            <button
              key={o.id}
              onClick={() => {
                if (voted) return;
                setVoted(o.id);
                onVote(o.id);
              }}
              disabled={!!voted && !isVoted}
              className={cn(
                "relative w-full rounded-xl overflow-hidden text-left transition",
                voted ? "cursor-default" : "hover:bg-foreground/5"
              )}
            >
              {voted && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0"
                  style={{
                    background: isVoted
                      ? `linear-gradient(90deg, ${themeAccent ?? "#22D3EE"}55, ${themeAccent ?? "#22D3EE"}1A)`
                      : "linear-gradient(90deg, hsl(var(--foreground) / 0.08), hsl(var(--foreground) / 0.02))"
                  }}
                />
              )}
              <div
                className={cn(
                  "relative flex items-center justify-between gap-2 px-3 py-2 border rounded-xl",
                  voted ? "border-border/30" : "border-border/60"
                )}
              >
                <span className="text-sm">{o.label}</span>
                {voted && (
                  <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        {(total + (voted ? 1 : 0)).toLocaleString()} votes · anonymous
      </p>
    </div>
  );
}

function ReactionRow({
  reactions,
  onReact
}: {
  reactions: { emoji: string; count: number; byMe: boolean }[];
  onReact: (emoji: string) => void;
}) {
  if (reactions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => onReact(r.emoji)}
          className={cn(
            "inline-flex items-center gap-1 h-7 px-2 rounded-full border text-xs transition",
            r.byMe
              ? "border-cyan-400/60 bg-cyan-400/10 ring-1 ring-cyan-400/30"
              : "border-border/60 hover:border-border bg-foreground/[0.02]"
          )}
        >
          <span className="text-sm leading-none">{r.emoji}</span>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {r.count.toLocaleString()}
          </span>
        </button>
      ))}
    </div>
  );
}

function QuickReactButton({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="ml-auto relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="size-8 rounded-full grid place-items-center hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition"
        aria-label="React"
      >
        <Smile className="size-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full right-0 mb-2 glass border border-border/60 rounded-full px-1 py-0.5 flex gap-0.5 shadow-glow z-10"
          >
            {QUICK_REACTIONS.map((e) => (
              <button
                key={e}
                onClick={() => {
                  onPick(e);
                  setOpen(false);
                }}
                className="size-8 grid place-items-center rounded-full hover:bg-foreground/10 text-base"
              >
                {e}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
