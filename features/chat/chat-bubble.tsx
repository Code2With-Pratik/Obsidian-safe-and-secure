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
  Pause,
  Reply,
  Smile,
  MoreHorizontal,
  CheckSquare,
  Copy as CopyIcon,
  Trash2
} from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn, copyText, formatTime, initials } from "@/lib/utils";
import { ReactionPicker } from "./reaction-picker";
import { useChatStore } from "@/store/use-chat-store";
import { useMessageSelectionStore } from "@/store/use-message-selection-store";
import { users } from "@/lib/mock-data";
import type { Message } from "@/types";

interface BubbleProps {
  message: Message;
  bubbleMe?: string;
  bubbleThem?: string;
  textOnMe?: string;
  textOnThem?: string;
}

export function ChatBubble({ message, bubbleMe, bubbleThem, textOnMe, textOnThem }: BubbleProps) {
  const me = message.authorId === "me";
  const author = users.find((u) => u.id === message.authorId);
  const toggleReaction = useChatStore((s) => s.toggleReaction);
  const pinMessage = useChatStore((s) => s.pinMessage);
  const removeMessages = useChatStore((s) => s.removeMessages);
  const selectionCount = useMessageSelectionStore(
    (s) => s.selected[message.chatId]?.length ?? 0
  );
  const isSelected = useMessageSelectionStore(
    (s) => s.selected[message.chatId]?.includes(message.id) ?? false
  );
  const startSelectionWith = useMessageSelectionStore((s) => s.startWith);
  const toggleSelection = useMessageSelectionStore((s) => s.toggle);
  const selectionActive = selectionCount > 0;
  const [showActions, setShowActions] = React.useState(false);
  const [openReact, setOpenReact] = React.useState(false);

  const handleBubbleClick = () => {
    if (selectionActive) toggleSelection(message.chatId, message.id);
  };

  const handleCopy = () => {
    if (message.content) void copyText(message.content);
  };

  const handleDelete = () => {
    const fn = removeMessages ?? useChatStore.getState().removeMessages;
    fn?.(message.chatId, [message.id]);
  };

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
      onClick={handleBubbleClick}
      className={cn(
        "group relative flex gap-2 rounded-2xl transition-colors",
        me && "flex-row-reverse",
        selectionActive && "cursor-pointer pl-9 py-1",
        isSelected && "bg-cyan-400/20 ring-1 ring-cyan-400/60 shadow-[0_0_0_2px_rgba(34,211,238,0.08)]"
      )}
    >
      {/* Selection tick — always anchored on the left edge of the row,
          regardless of whether the message is sent or received. */}
      {selectionActive && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 z-10 shrink-0">
          <div
            className={cn(
              "size-5 rounded-full grid place-items-center transition-colors",
              isSelected
                ? "bg-cyan-400 text-black"
                : "bg-foreground/10 text-transparent ring-1 ring-border/60"
            )}
            aria-hidden
          >
            <Check className="size-3" strokeWidth={3} />
          </div>
        </div>
      )}
      {!me && (
        <Avatar className="size-8 shrink-0">
          <AvatarImage src={author?.avatar} />
        </Avatar>
      )}
      <div className={cn("max-w-[78%] md:max-w-[68%] min-w-0 flex flex-col", me && "items-end")}>
        {!me && (
          <div className="text-[11px] font-medium text-muted-foreground mb-1 ml-1">
            {author?.name ?? "User"}
          </div>
        )}

        <div className="relative">
          <BubbleBody
            me={me}
            message={message}
            bubbleMe={bubbleMe}
            bubbleThem={bubbleThem}
            textOnMe={textOnMe}
            textOnThem={textOnThem}
          />

          {message.reactions && message.reactions.length > 0 && (
            <div
              className={cn(
                "absolute -bottom-3 flex gap-1.5 z-10",
                me ? "right-2 flex-row-reverse" : "left-2"
              )}
            >
              {message.reactions.map((r) => (
                <motion.button
                  key={r.emoji}
                  whileTap={{ scale: 0.85 }}
                  whileHover={{ scale: 1.15 }}
                  onClick={() => toggleReaction(message.chatId, message.id, r.emoji)}
                  className={cn(
                    "inline-flex items-center gap-0.5 leading-none transition",
                    r.byMe && "drop-shadow-[0_0_6px_rgba(139,92,246,0.55)]"
                  )}
                >
                  <span className="text-xl leading-none">{r.emoji}</span>
                  {r.count > 1 && (
                    <span className="text-[10px] text-muted-foreground">{r.count}</span>
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex items-center gap-1.5 text-[10px] text-muted-foreground",
            me && "flex-row-reverse",
            message.reactions && message.reactions.length > 0 ? "mt-3" : "mt-1"
          )}
        >
          {message.pinned && <Pin className="size-2.5" />}
          <span suppressHydrationWarning>{formatTime(message.createdAt)}</span>
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

        {!!message.threadCount && (
          <button className="mt-1 text-[11px] text-cyan-400 hover:underline self-start">
            ↳ {message.threadCount} replies in thread
          </button>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: showActions && !selectionActive ? 1 : 0, scale: showActions && !selectionActive ? 1 : 0.9 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "self-start mt-2 flex gap-0.5 glass rounded-full px-1 py-0.5 border border-border/60",
          showActions && !selectionActive ? "pointer-events-auto" : "pointer-events-none"
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="size-6 grid place-items-center rounded-full hover:bg-foreground/10"
              aria-label="More message actions"
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={me ? "end" : "start"} className="!w-40">
            <DropdownMenuItem
              onSelect={() => startSelectionWith(message.chatId, message.id)}
            >
              <CheckSquare />
              Select
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleCopy} disabled={!message.content}>
              <CopyIcon />
              Copy
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleDelete} className="!text-red-400 focus:!text-red-300">
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>
    </motion.div>
  );
}

function BubbleBody({
  me,
  message,
  bubbleMe,
  textOnMe
}: {
  me: boolean;
  message: Message;
  bubbleMe?: string;
  bubbleThem?: string;
  textOnMe?: string;
  textOnThem?: string;
}) {
  // Incoming bubbles always use the `.glass` class — light glass + dark text in
  // light mode, dark glass + white text in dark mode — so they stay readable
  // regardless of which chat theme is active. Outgoing bubbles still use the
  // theme's bubbleMe/textOnMe.
  const meColor = textOnMe ?? "#ffffff";
  const meStyle: React.CSSProperties = { color: meColor };
  if (bubbleMe) meStyle.background = bubbleMe;
  const themStyleProp = undefined;

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
      <VoiceBubble
        me={me}
        meStyle={meStyle}
        bubbleMe={bubbleMe}
        durationSec={message.voice.durationSec}
        waveform={message.voice.waveform}
      />
    );
  }

  if (message.kind === "link" && message.link) {
    return (
      <a
        href={message.link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-2xl glass border border-border/60 overflow-hidden max-w-sm transition hover:ring-1 hover:ring-white/20 hover:border-border"
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
      style={me ? meStyle : themStyleProp}
      className={cn(
        "px-3.5 py-2 rounded-xl text-sm leading-relaxed shadow-sm max-w-full break-words whitespace-pre-wrap",
        me
          ? "rounded-br-none " + (bubbleMe ? "" : "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white")
          : "glass border border-border/60 rounded-bl-none"
      )}
    >
      {message.content}
    </div>
  );
}

/** Compact, animated voice bubble. Tapping play scrubs across the waveform;
 *  bars idle with a gentle staggered equaliser pulse when not playing. */
function VoiceBubble({
  me,
  meStyle,
  bubbleMe,
  durationSec,
  waveform
}: {
  me: boolean;
  meStyle: React.CSSProperties;
  bubbleMe?: string;
  durationSec: number;
  waveform: number[];
}) {
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0); // 0..1
  const rafRef = React.useRef<number | null>(null);
  const startedAtRef = React.useRef<number>(0);
  const offsetRef = React.useRef<number>(0); // resume position 0..1

  const stop = React.useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setPlaying(false);
  }, []);

  React.useEffect(() => () => stop(), [stop]);

  const toggle = () => {
    if (playing) {
      offsetRef.current = progress;
      stop();
      return;
    }
    if (progress >= 1) {
      offsetRef.current = 0;
      setProgress(0);
    }
    startedAtRef.current = performance.now();
    setPlaying(true);
    const total = durationSec * 1000;
    const tick = () => {
      const elapsed = performance.now() - startedAtRef.current;
      const p = Math.min(1, offsetRef.current + elapsed / total);
      setProgress(p);
      if (p >= 1) {
        stop();
        offsetRef.current = 0;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const remaining = Math.max(0, Math.ceil(durationSec * (1 - progress)));
  const playedIndex = Math.floor(progress * waveform.length);

  return (
    <div
      style={me ? meStyle : undefined}
      className={cn(
        "flex items-center gap-2 rounded-2xl px-2.5 py-1.5 max-w-[14rem]",
        me
          ? "rounded-br-none" +
              (bubbleMe ? "" : " bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white")
          : "rounded-bl-none glass border border-border/60"
      )}
    >
      <button
        onClick={toggle}
        className="size-7 rounded-full grid place-items-center shrink-0 transition active:scale-95"
        style={{ backgroundColor: "color-mix(in srgb, currentColor 18%, transparent)" }}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="size-3" /> : <Play className="size-3 ml-0.5" />}
      </button>
      <div className="flex items-center gap-[2px] h-5 flex-1 min-w-0">
        {waveform.map((h, i) => {
          const isPlayed = i < playedIndex;
          const heightPct = Math.max(20, Math.min(100, h * 100));
          return (
            <motion.span
              key={i}
              animate={
                playing
                  ? { scaleY: [0.7, 1, 0.7] }
                  : { scaleY: [0.85, 1, 0.85] }
              }
              transition={{
                duration: playing ? 0.9 : 2.4,
                repeat: Infinity,
                delay: (i * 0.04) % 1.2,
                ease: "easeInOut"
              }}
              style={{
                height: `${heightPct}%`,
                opacity: isPlayed ? 1 : 0.55,
                backgroundColor: "currentColor"
              }}
              className="w-[2px] rounded-full"
            />
          );
        })}
      </div>
      <span className="text-[10px] tabular-nums opacity-80 shrink-0">{remaining}s</span>
    </div>
  );
}
