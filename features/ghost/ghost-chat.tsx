"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  AtSign,
  Bell,
  Hash,
  Pin,
  Plus,
  Smile,
  Users,
  Volume2
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatTime } from "@/lib/utils";
import {
  EMPTY_LIST,
  useGhostStore,
  type GhostChannel,
  type GhostMessage
} from "@/store/use-ghost-store";
import { GhostVoicePanel } from "./ghost-voice-panel";

const QUICK_REACTIONS = ["👻", "🔥", "💜", "🌙", "😅", "🥲"];
const EMPTY_CHANNELS = EMPTY_LIST as readonly GhostChannel[];
const EMPTY_MESSAGES = EMPTY_LIST as readonly GhostMessage[];

export function GhostChat({ roomId }: { roomId: string }) {
  const channels = useGhostStore((s) => s.channelsByRoom[roomId] ?? EMPTY_CHANNELS);
  const activeChannelId = useGhostStore((s) => s.activeChannelByRoom[roomId]);
  const channel = channels.find((c) => c.id === activeChannelId);

  if (!channel) {
    return (
      <div className="flex-1 grid place-items-center text-muted-foreground">
        Pick a channel
      </div>
    );
  }

  if (channel.type === "voice") {
    return <GhostVoicePanel channel={channel} />;
  }

  return <TextChannel channel={channel} />;
}

function TextChannel({ channel }: { channel: GhostChannel }) {
  const messages = useGhostStore(
    (s) => s.messagesByChannel[channel.id] ?? EMPTY_MESSAGES
  );
  const send = useGhostStore((s) => s.sendGhostMessage);
  const react = useGhostStore((s) => s.toggleGhostReaction);
  const membersCount = useGhostStore(
    (s) => s.membersByRoom[channel.roomId]?.length ?? 0
  );
  const myIdentity = useGhostStore((s) => s.myIdentityByRoom[channel.roomId]);

  const [text, setText] = React.useState("");
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  React.useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "0px";
    inputRef.current.style.height = Math.min(160, inputRef.current.scrollHeight) + "px";
  }, [text]);

  const handleSend = () => {
    const t = text.trim();
    if (!t) return;
    send(channel.id, t);
    setText("");
    inputRef.current?.focus();
  };

  const grouped = groupConsecutive(messages);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* channel header */}
      <header className="h-14 px-4 flex items-center gap-3 border-b border-border/40 bg-card/40 backdrop-blur-xl">
        <Hash className="size-5 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{channel.name}</p>
          {channel.topic && (
            <p className="text-[11px] text-muted-foreground truncate">
              {channel.topic}
            </p>
          )}
        </div>
        <div className="hidden md:flex items-center gap-1 text-muted-foreground">
          <button className="size-8 grid place-items-center rounded-md hover:bg-foreground/10 hover:text-foreground transition" aria-label="Pinned">
            <Pin className="size-4" />
          </button>
          <button className="size-8 grid place-items-center rounded-md hover:bg-foreground/10 hover:text-foreground transition" aria-label="Mentions">
            <AtSign className="size-4" />
          </button>
          <button className="size-8 grid place-items-center rounded-md hover:bg-foreground/10 hover:text-foreground transition" aria-label="Notifications">
            <Bell className="size-4" />
          </button>
          <button className="lg:hidden size-8 grid place-items-center rounded-md hover:bg-foreground/10 hover:text-foreground transition" aria-label="Members">
            <Users className="size-4" />
          </button>
          <span className="inline-flex items-center gap-1 text-[11px] ml-2">
            <Users className="size-3" /> {membersCount}
          </span>
        </div>
      </header>

      {/* messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        {messages.length === 0 ? (
          <EmptyChannel channel={channel} />
        ) : (
          <div className="space-y-4">
            <ChannelWelcome channel={channel} memberCount={membersCount} />
            {grouped.map((group) => (
              <MessageGroup
                key={group[0].id}
                group={group}
                myId={myIdentity?.id}
                onReact={(messageId, emoji) => react(channel.id, messageId, emoji)}
              />
            ))}
            <div ref={endRef} />
          </div>
        )}
      </ScrollArea>

      {/* input */}
      <div className="px-3 md:px-4 pt-2 pb-3">
        <div className="flex items-end gap-1 rounded-2xl glass border border-border/60 pl-2 pr-1 py-1 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.4)]">
          <button
            className="size-9 grid place-items-center rounded-full hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition shrink-0"
            aria-label="Add"
          >
            <Plus className="size-5" />
          </button>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder={`Message #${channel.name} — anonymously`}
            className="flex-1 min-w-0 bg-transparent text-[15px] outline-none resize-none py-2 max-h-40 leading-snug break-words"
          />
          <button
            className="size-9 grid place-items-center rounded-full hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition shrink-0"
            aria-label="Emoji"
          >
            <Smile className="size-5" />
          </button>
          <button
            disabled={!text.trim()}
            onClick={handleSend}
            className={cn(
              "size-9 grid place-items-center rounded-full transition shrink-0",
              text.trim()
                ? "bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-glow"
                : "bg-foreground/5 text-muted-foreground/50"
            )}
            aria-label="Send"
          >
            <ArrowUp className="size-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChannelWelcome({
  channel,
  memberCount
}: {
  channel: GhostChannel;
  memberCount: number;
}) {
  return (
    <div className="pb-2 mb-2">
      <div className="size-14 rounded-2xl grid place-items-center bg-foreground/10 mb-3">
        <Hash className="size-6 text-foreground/70" />
      </div>
      <h2 className="font-display text-2xl font-semibold">
        Welcome to #{channel.name}
      </h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-lg">
        {channel.topic} · {memberCount} ghost{memberCount === 1 ? "" : "s"} inside.
      </p>
      <div className="mt-3 h-px bg-border/40" />
    </div>
  );
}

function EmptyChannel({ channel }: { channel: GhostChannel }) {
  return (
    <div className="h-full flex flex-col justify-end">
      <ChannelWelcome channel={channel} memberCount={0} />
      <p className="text-sm text-muted-foreground italic">
        Nothing here yet — say something into the void.
      </p>
    </div>
  );
}

function MessageGroup({
  group,
  myId,
  onReact
}: {
  group: GhostMessage[];
  myId?: string;
  onReact: (messageId: string, emoji: string) => void;
}) {
  const head = group[0];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 group/group hover:bg-foreground/[0.02] -mx-2 px-2 py-1 rounded-lg"
    >
      <Avatar identity={head} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className="font-semibold text-sm"
            style={{ color: `hsl(${head.authorHue} 70% 70%)` }}
          >
            {head.authorName}
          </span>
          {head.authorId === myId && (
            <span className="text-[10px] uppercase tracking-wider px-1 rounded bg-foreground/10 text-muted-foreground">
              you
            </span>
          )}
          <span className="text-[10px] text-muted-foreground" suppressHydrationWarning>
            {formatTime(head.createdAt)}
          </span>
        </div>
        {group.map((m) => (
          <MessageRow key={m.id} message={m} onReact={(emoji) => onReact(m.id, emoji)} />
        ))}
      </div>
    </motion.div>
  );
}

function MessageRow({
  message,
  onReact
}: {
  message: GhostMessage;
  onReact: (emoji: string) => void;
}) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative group/msg py-0.5"
    >
      <p className="text-[14px] leading-relaxed text-foreground/90 break-words whitespace-pre-wrap">
        {message.content}
      </p>
      {message.reactions && message.reactions.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {message.reactions.map((r) => (
            <button
              key={r.emoji}
              onClick={() => onReact(r.emoji)}
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs glass-subtle border transition",
                r.byMe
                  ? "border-cyan-400/60 ring-1 ring-cyan-400/30"
                  : "border-border/60 hover:border-border"
              )}
            >
              <span>{r.emoji}</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {r.count}
              </span>
            </button>
          ))}
        </div>
      )}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute -top-3 right-0 flex items-center gap-0.5 glass rounded-full border border-border/60 px-1 py-0.5 shadow-glow"
          >
            {QUICK_REACTIONS.map((e) => (
              <button
                key={e}
                onClick={() => onReact(e)}
                className="size-7 grid place-items-center rounded-full hover:bg-foreground/10 text-base"
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

function Avatar({
  identity
}: {
  identity: { authorHue: number; authorName: string };
}) {
  return (
    <div
      className="size-10 rounded-full grid place-items-center text-white font-semibold shrink-0 shadow-glow"
      style={{
        background: `linear-gradient(135deg, hsl(${identity.authorHue} 75% 60%), hsl(${(identity.authorHue + 60) % 360} 75% 50%))`
      }}
    >
      {identity.authorName.charAt(0)}
    </div>
  );
}

/** Bunch consecutive messages from the same author into one visual block. */
function groupConsecutive(messages: GhostMessage[]): GhostMessage[][] {
  const groups: GhostMessage[][] = [];
  for (const m of messages) {
    const last = groups[groups.length - 1];
    if (last && last[0].authorId === m.authorId) {
      last.push(m);
    } else {
      groups.push([m]);
    }
  }
  return groups;
}
