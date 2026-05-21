"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  Pin,
  Play,
  Reply,
  Smile,
  MoreHorizontal
} from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { cn, formatTime, initials } from "@/lib/utils";
import { ReactionPicker } from "./reaction-picker";
import { useChatStore } from "@/store/use-chat-store";
import { users } from "@/lib/mock-data";
import type { Message } from "@/types";

interface BubbleProps {
  message: Message;
  bubbleMe?: string;
  bubbleThem?: string;
}

export function ChatBubble({ message, bubbleMe, bubbleThem }: BubbleProps) {
  const me = message.authorId === "me";
  const author = users.find((u) => u.id === message.authorId);
  const toggleReaction = useChatStore((s) => s.toggleReaction);
  const pinMessage = useChatStore((s) => s.pinMessage);
  const [showActions, setShowActions] = React.useState(false);
  const [openReact, setOpenReact] = React.useState(false);

  if (message.kind === "system") {
    return (
      <div className="my-3 mx-auto inline-flex glass-subtle px-3 py-1 rounded-full text-[11px] text-muted-foreground">
        {message.content}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      onHoverStart={() => setShowActions(true)}
      onHoverEnd={() => setShowActions(false)}
      className={cn("group relative flex gap-2", me && "flex-row-reverse")}
    >
      {!me && (
        <Avatar className="size-8 shrink-0">
          <AvatarImage src={author?.avatar} />
        </Avatar>
      )}
      <div className={cn("max-w-[78%] md:max-w-[68%] flex flex-col", me && "items-end")}>
        {!me && (
          <div className="text-[11px] font-medium text-muted-foreground mb-1 ml-1">
            {author?.name ?? "User"}
          </div>
        )}

        <BubbleBody me={me} message={message} bubbleMe={bubbleMe} bubbleThem={bubbleThem} />

        <div
          className={cn(
            "flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground",
            me && "flex-row-reverse"
          )}
        >
          {message.pinned && <Pin className="size-2.5" />}
          <span>{formatTime(message.createdAt)}</span>
          {message.edited && <span className="opacity-70">edited</span>}
          {me && message.status && (
            <span className="ml-1">
              {message.status === "sending" && <Clock className="size-3" />}
              {message.status === "sent" && <Check className="size-3" />}
              {message.status === "delivered" && <CheckCheck className="size-3" />}
              {message.status === "read" && <CheckCheck className="size-3 text-cyan-400" />}
            </span>
          )}
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <div className={cn("flex gap-1 mt-1", me && "flex-row-reverse")}>
            {message.reactions.map((r) => (
              <motion.button
                key={r.emoji}
                whileTap={{ scale: 0.85 }}
                onClick={() => toggleReaction(message.chatId, message.id, r.emoji)}
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs glass-subtle border border-border/60",
                  r.byMe && "ring-1 ring-primary"
                )}
              >
                <span>{r.emoji}</span>
                <span className="ml-1 text-[10px] text-muted-foreground">{r.count}</span>
              </motion.button>
            ))}
          </div>
        )}

        {!!message.threadCount && (
          <button className="mt-1 text-[11px] text-cyan-400 hover:underline self-start">
            ↳ {message.threadCount} replies in thread
          </button>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: showActions ? 1 : 0, scale: showActions ? 1 : 0.9 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "self-start mt-2 flex gap-0.5 glass rounded-full px-1 py-0.5 border border-border/60",
          showActions ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <ReactionPicker
          open={openReact}
          onOpenChange={setOpenReact}
          onPick={(emoji) => {
            toggleReaction(message.chatId, message.id, emoji);
            setOpenReact(false);
          }}
        >
          <button className="size-6 grid place-items-center rounded-full hover:bg-foreground/10">
            <Smile className="size-3.5" />
          </button>
        </ReactionPicker>
        <button className="size-6 grid place-items-center rounded-full hover:bg-foreground/10">
          <Reply className="size-3.5" />
        </button>
        <button
          onClick={() => pinMessage(message.chatId, message.id)}
          className="size-6 grid place-items-center rounded-full hover:bg-foreground/10"
        >
          <Pin className="size-3.5" />
        </button>
        <button className="size-6 grid place-items-center rounded-full hover:bg-foreground/10">
          <MoreHorizontal className="size-3.5" />
        </button>
      </motion.div>
    </motion.div>
  );
}

function BubbleBody({
  me,
  message,
  bubbleMe,
  bubbleThem
}: {
  me: boolean;
  message: Message;
  bubbleMe?: string;
  bubbleThem?: string;
}) {
  const meStyle = bubbleMe ? { background: bubbleMe } : undefined;
  const themStyle = bubbleThem ? { background: bubbleThem } : undefined;

  if (message.kind === "image" && message.media) {
    return (
      <div className="rounded-2xl overflow-hidden glass border border-border/60 max-w-sm">
        {message.media.map((m, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={m.url} alt={m.alt ?? ""} className="w-full max-h-80 object-cover" />
        ))}
        {message.content && (
          <div className="px-3 py-2 text-sm">{message.content}</div>
        )}
      </div>
    );
  }

  if (message.kind === "voice" && message.voice) {
    return (
      <div
        style={me ? meStyle : undefined}
        className={cn(
          "flex items-center gap-3 rounded-2xl px-3 py-2.5 max-w-xs",
          me
            ? "text-white" + (bubbleMe ? "" : " bg-gradient-to-br from-violet-500 to-fuchsia-500")
            : "glass border border-border/60"
        )}
      >
        <button className={cn("size-9 rounded-full grid place-items-center", me ? "bg-white/20" : "bg-foreground/10")}>
          <Play className="size-4" />
        </button>
        <div className="flex items-end gap-0.5 h-8 flex-1">
          {message.voice.waveform.map((h, i) => (
            <motion.span
              key={i}
              initial={{ scaleY: 0.4 }}
              animate={{ scaleY: [0.4, h, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.02 }}
              style={{ height: `${h * 100}%` }}
              className={cn("w-0.5 rounded-full", me ? "bg-white/80" : "bg-foreground/60")}
            />
          ))}
        </div>
        <span className="text-[11px] opacity-80">{message.voice.durationSec}s</span>
      </div>
    );
  }

  if (message.kind === "link" && message.link) {
    return (
      <a
        href={message.link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-2xl glass border border-border/60 overflow-hidden max-w-sm hover:bg-foreground/[0.02] transition"
      >
        {message.link.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={message.link.image} alt="" className="w-full h-32 object-cover" />
        )}
        <div className="p-3">
          <div className="text-sm font-medium line-clamp-1">{message.link.title}</div>
          {message.link.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {message.link.description}
            </p>
          )}
          <div className="text-[10px] text-cyan-400 mt-1.5 flex items-center gap-1">
            <ExternalLink className="size-3" />
            {new URL(message.link.url).host}
          </div>
        </div>
      </a>
    );
  }

  return (
    <div
      style={me ? meStyle : undefined}
      className={cn(
        "px-3.5 py-2 rounded-2xl text-sm leading-relaxed shadow-sm",
        me
          ? "text-white rounded-br-md " + (bubbleMe ? "" : "bg-gradient-to-br from-violet-500 to-fuchsia-500")
          : "glass border border-border/60 rounded-bl-md"
      )}
    >
      {message.content}
    </div>
  );
}
