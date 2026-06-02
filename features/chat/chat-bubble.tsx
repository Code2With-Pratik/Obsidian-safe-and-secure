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
  Trash2,
  FileText,
  Download,
  MapPin,
  Navigation,
  CalendarClock,
  Music as MusicIcon,
  Phone,
  Video as VideoIcon,
  Forward as ForwardIcon,
  CheckCircle2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/store/use-ui-store";
import { useT } from "@/lib/i18n";
import { cn, copyText, formatTime, initials } from "@/lib/utils";
import { ReactionPicker } from "./reaction-picker";
import { DeleteMessageDialog } from "./delete-message-dialog";
import { ForwardDialog } from "./forward-dialog";
import { useImageLightbox } from "./image-lightbox";
import { useChatStore } from "../../store/use-chat-store";
import { useMessageSelectionStore } from "../../store/use-message-selection-store";
import { useAuthStore } from "../../store/use-auth-store";
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
  const user = useAuthStore((s) => s.user);
  const me = message.authorId === user?.id;
  const chats = useChatStore((s) => s.chats);
  const chat = chats.find(c => c.id === message.chatId);
  const profileCache = useChatStore((s) => s.profiles[message.authorId]);
  const ensureProfile = useChatStore((s) => s.ensureProfile);

  const [author, setAuthor] = React.useState<{ name: string; avatar?: string } | null>(null);

  React.useEffect(() => {
    if (me) {
      setAuthor({ name: user?.name || "Me", avatar: user?.avatar });
      return;
    }

    // 1. Profile cache (real Supabase users, populated by fetchChats /
    //    ensureProfile / realtime). This is what makes group bubbles show
    //    the correct avatar + name.
    if (profileCache) {
      setAuthor({
        name: profileCache.name || profileCache.username || "User",
        avatar: profileCache.avatar
      });
      return;
    }

    // 2. Mock seed users (for dev fixtures).
    const localUser = users.find((u) => u.id === message.authorId);
    if (localUser) {
      setAuthor({ name: localUser.name, avatar: localUser.avatar });
      return;
    }

    // 3. DM fallback — the chat's own name/avatar is the peer.
    if (chat?.type === 'dm' && chat.name) {
      setAuthor({ name: chat.name, avatar: chat.avatar });
    }

    // 4. Otherwise lazy-fetch from Supabase so the next render has a real
    //    name + avatar to show.
    if (message.authorId) {
      void ensureProfile(message.authorId);
    }
  }, [me, user, message.authorId, chat, profileCache, ensureProfile]);

  const toggleReaction = useChatStore((s) => s.toggleReaction);
  const pinMessage = useChatStore((s) => s.pinMessage);
  const setReplyTarget = useChatStore((s) => s.setReplyTarget);
  const [forwardOpen, setForwardOpen] = React.useState(false);
  const removeMessages = useChatStore((s) => s.removeMessages);
  const hideMessages = useChatStore((s) => s.hideMessages);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
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
    setDeleteOpen(true);
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
      // Anchor for reply-context "scroll to source" jumps.
      data-message-id={message.id}
      className={cn(
        "group relative flex gap-2 rounded-2xl transition-colors w-full",
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
          <AvatarFallback>{initials(author?.name)}</AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "min-w-0 flex flex-col",
          // Profile-card bubbles need a wider column than text bubbles. Use
          // an explicit `flex-1 w-full` (not just max-w) so the column
          // actually CLAIMS the full row width — max-w alone collapses to
          // intrinsic content size in a flex parent and the card looks tiny.
          (message.kind === "contact" && (message.contacts?.length ?? 0) === 1) ||
          (message.kind === "community" && message.community)
            ? "flex-1 w-full max-w-[16rem] md:max-w-[22rem]"
            : "max-w-[78%] md:max-w-[68%]",
          me && "items-end"
        )}
      >
        {!me && (
          <div className="text-[11px] font-medium text-muted-foreground mb-1 ml-1">
            {author?.name ?? "User"}
          </div>
        )}
        {message.forwarded && (
          <div
            className={cn(
              "inline-flex items-center gap-1 text-[11px] italic opacity-70 mb-0.5",
              me ? "self-end mr-1" : "self-start ml-1"
            )}
          >
            <ForwardIcon className="size-3" />
            Forwarded
          </div>
        )}

        <div
          className={cn(
            "relative",
            // Profile-card bubbles need to fill the column so the landscape
            // hero layout has room to grow. All other bubbles keep `w-fit`
            // so they hug their content (the bubble shape is what you'd
            // expect for a text / image / voice message).
            (message.kind === "contact" && (message.contacts?.length ?? 0) === 1) ||
            (message.kind === "community" && message.community)
              ? "w-full"
              : "w-fit",
            me && "ml-auto self-end"
          )}
        >
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
            <span className="ml-1 inline-flex items-center gap-1">
              {message.status === "scheduled" && (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <Clock className="size-3" />
                  {message.scheduleAt
                    ? `Scheduled · ${formatTime(message.scheduleAt)}`
                    : "Scheduled"}
                </span>
              )}
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
        <button
          onClick={() => setReplyTarget(message.chatId, message.id)}
          aria-label="Reply"
          className="size-6 grid place-items-center rounded-full hover:bg-foreground/10"
        >
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
            <DropdownMenuItem onSelect={() => setReplyTarget(message.chatId, message.id)}>
              <Reply />
              Reply
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setForwardOpen(true)}>
              <ForwardIcon />
              Forward
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleDelete} className="!text-red-400 focus:!text-red-300">
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      <DeleteMessageDialog
        open={deleteOpen}
        count={1}
        canDeleteForEveryone={me}
        onClose={() => setDeleteOpen(false)}
        onDeleteForMe={async () => {
          await hideMessages(message.chatId, [message.id]);
          setDeleteOpen(false);
        }}
        onDeleteForEveryone={async () => {
          await removeMessages(message.chatId, [message.id]);
          setDeleteOpen(false);
        }}
      />

      <ForwardDialog
        open={forwardOpen}
        onClose={() => setForwardOpen(false)}
        messageIds={[message.id]}
      />
    </motion.div>
  );
}

/** Renders a compact preview of the message this bubble is replying to —
 *  small accent strip + author name + truncated snippet. Looks up the source
 *  message in local state so it works for both my-side and recipient-side
 *  views as long as that source is loaded. */
function ReplyContext({
  me,
  chatId,
  replyTo
}: {
  me: boolean;
  chatId: string;
  replyTo: string;
}) {
  const messages = useChatStore((s) => s.messages);
  const source = (messages[chatId] || []).find((m) => m.id === replyTo);
  if (!source) return null;
  const author = users.find((u) => u.id === source.authorId);
  const snippet = (() => {
    if (source.content) return source.content;
    switch (source.kind) {
      case "image":
        return "📷 Photo";
      case "video":
        return "🎬 Video";
      case "voice":
        return "🎙️ Voice note";
      case "audio":
        return "🎵 Audio";
      case "file":
        return "📎 File";
      case "sticker":
        return "Sticker";
      case "gif":
        return "GIF";
      case "poll":
        return "📊 Poll";
      case "location":
        return "📍 Location";
      case "contact":
        return "👤 Contact";
      case "community":
        return "🏘 Community";
      default:
        return "Message";
    }
  })();
  // Tap → scroll the original bubble into view and highlight it briefly so
  // the user can see what's being referenced (WhatsApp behavior).
  const onJump = () => {
    if (typeof document === "undefined") return;
    const el = document.querySelector(
      `[data-message-id="${replyTo}"]`
    ) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-cyan-400/70", "transition", "duration-500");
    window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-cyan-400/70");
    }, 1200);
  };

  return (
    <button
      type="button"
      onClick={onJump}
      className={cn(
        "flex items-stretch gap-2 rounded-2xl pl-1.5 pr-3 py-1.5 max-w-full text-left hover:opacity-90 transition",
        me ? "self-end bg-white/10" : "self-start glass border border-border/60"
      )}
    >
      <span className="w-[3px] rounded-full bg-cyan-400 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-cyan-400 truncate">
          {author?.name || "User"}
        </p>
        <p className="text-[11px] opacity-70 truncate">{snippet}</p>
      </div>
    </button>
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

  if (message.kind === "image" && message.media && message.media.length > 0) {
    return <ImageGridBubble me={me} message={message} />;
  }

  if (message.kind === "video" && message.media) {
    return (
      <VideoBubble me={me} bubbleMe={bubbleMe} meStyle={meStyle} message={message} />
    );
  }

  if (message.kind === "audio" && message.audio) {
    return <AudioBubble me={me} bubbleMe={bubbleMe} meStyle={meStyle} message={message} />;
  }

  if (message.kind === "file" && message.file) {
    return <FileBubble me={me} bubbleMe={bubbleMe} meStyle={meStyle} message={message} />;
  }

  if (message.kind === "gif" && message.gif) {
    return (
      <div
        className={cn(
          "rounded-2xl overflow-hidden ring-1 ring-border/40 max-w-[min(280px,100%)] w-fit",
          me && "ml-auto"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={message.gif.src} alt={message.gif.alt ?? "GIF"} className="block w-full" />
      </div>
    );
  }

  if (message.kind === "sticker" && message.sticker) {
    return (
      <div className={cn("bg-transparent w-fit", me && "ml-auto")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={message.sticker.src}
          alt={message.sticker.alt ?? "Sticker"}
          className="w-32 h-32 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
        />
      </div>
    );
  }

  if (message.kind === "poll" && message.poll) {
    return <PollBubble me={me} bubbleMe={bubbleMe} meStyle={meStyle} message={message} />;
  }

  if (message.kind === "contact" && message.contacts) {
    return <ContactsBubble me={me} bubbleMe={bubbleMe} meStyle={meStyle} message={message} />;
  }

  if (message.kind === "community" && message.community) {
    return <CommunityCardBubble me={me} community={message.community} />;
  }

  if (message.kind === "location" && message.location) {
    return <LocationBubble me={me} bubbleMe={bubbleMe} meStyle={meStyle} message={message} />;
  }

  if (message.kind === "schedule" && message.schedule) {
    return <ScheduleBubble me={me} bubbleMe={bubbleMe} meStyle={meStyle} message={message} />;
  }

  if (message.kind === "voice" && message.voice) {
    return (
      <VoiceBubble
        me={me}
        meStyle={meStyle}
        bubbleMe={bubbleMe}
        durationSec={message.voice.durationSec}
        waveform={message.voice.waveform}
        url={message.voice.url}
      />
    );
  }

  if (message.kind === "link" && message.link) {
    return (
      <a
        href={message.link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-2xl glass border border-border/60 overflow-hidden max-w-[min(24rem,100%)] transition hover:ring-1 hover:ring-white/20 hover:border-border"
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

  // Default text bubble — auto-linkify any URLs and pull an OG preview card
  // for the first URL. If the message is JUST that URL we drop the redundant
  // text bubble and let the card BE the message (WhatsApp-style).
  const urls = extractUrls(message.content);
  const firstUrl = urls[0];
  const trimmed = message.content?.trim() ?? "";
  const isJustUrl = !!firstUrl && trimmed === firstUrl;

  if (isJustUrl) {
    return <LinkPreview url={firstUrl} me={me} bubbleMe={bubbleMe} meStyle={meStyle} standalone />;
  }

  return (
    <div className="flex flex-col gap-1.5 max-w-full">
      {message.replyTo && <ReplyContext me={me} chatId={message.chatId} replyTo={message.replyTo} />}
      {message.storyReply && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-2xl p-1.5 pr-3 max-w-full",
            me ? "self-end bg-white/10" : "self-start glass border border-border/60"
          )}
        >
          <div
            className="size-10 rounded-xl overflow-hidden shrink-0 grid place-items-center text-[10px] text-white/80"
            style={
              message.storyReply.src
                ? undefined
                : { background: message.storyReply.bg || "#222" }
            }
          >
            {message.storyReply.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={message.storyReply.src}
                alt="Story"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="line-clamp-2 px-1 text-center leading-tight">
                {message.storyReply.text || "Story"}
              </span>
            )}
          </div>
          <div className="text-[11px] opacity-70">Replied to story</div>
        </div>
      )}
      <div
        style={me ? meStyle : themStyleProp}
        className={cn(
          "px-3.5 py-2 rounded-xl text-sm leading-relaxed shadow-sm max-w-full break-words whitespace-pre-wrap",
          me
            ? "rounded-br-none " + (bubbleMe ? "" : "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white")
            : "glass border border-border/60 rounded-bl-none"
        )}
      >
        <LinkifiedText text={message.content} me={me} />
      </div>
      {firstUrl && <LinkPreview url={firstUrl} />}
    </div>
  );
}

/** Pull http(s) URLs out of a string. Stops at whitespace/closing brackets. */
function extractUrls(text: string): string[] {
  if (!text) return [];
  const re = /(https?:\/\/[^\s<>"')\]]+)/gi;
  return text.match(re) ?? [];
}

/** Render text with URLs converted to <a> tags inline. */
function LinkifiedText({ text, me }: { text: string; me: boolean }) {
  if (!text) return null;
  const re = /(https?:\/\/[^\s<>"')\]]+)/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const url = match[0];
    parts.push(
      <a
        key={`u-${key++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "underline underline-offset-2 break-all",
          me ? "decoration-white/60 hover:decoration-white" : "decoration-cyan-400/70 hover:decoration-cyan-400"
        )}
      >
        {url}
      </a>
    );
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <>{parts}</>;
}

interface OgPayload {
  url: string;
  host: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

const OG_CACHE = new Map<string, OgPayload | null>();

/** Compact OG-card preview fetched lazily on mount. Result is memo-cached
 *  in-memory so the same URL doesn't re-fetch every render.
 *  When `standalone` is true the card adopts the message-bubble styling
 *  (tail-corner radius + theme colours) so a URL-only message reads as a
 *  single bubble instead of a separate card below text. */
function LinkPreview({
  url,
  standalone,
  me,
  bubbleMe,
  meStyle
}: {
  url: string;
  standalone?: boolean;
  me?: boolean;
  bubbleMe?: string;
  meStyle?: React.CSSProperties;
}) {
  const [data, setData] = React.useState<OgPayload | null>(() =>
    OG_CACHE.has(url) ? (OG_CACHE.get(url) as OgPayload | null) : null
  );
  const [loaded, setLoaded] = React.useState<boolean>(OG_CACHE.has(url));

  React.useEffect(() => {
    if (OG_CACHE.has(url)) return;
    let cancelled = false;
    fetch(`/api/og?url=${encodeURIComponent(url)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: OgPayload | null) => {
        if (cancelled) return;
        OG_CACHE.set(url, d ?? null);
        setData(d ?? null);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        OG_CACHE.set(url, null);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!loaded) return null;

  // No OG data — fall through to a minimal host card so the link still
  // looks intentional (rather than disappearing entirely).
  if (!data || (!data.title && !data.description && !data.image)) {
    let host = "";
    try {
      host = new URL(url).host;
    } catch {
      host = url;
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-border/60 max-w-[min(20rem,100%)] text-[11px] text-cyan-400 hover:bg-foreground/5"
      >
        <ExternalLink className="size-3 shrink-0" />
        <span className="truncate">{host}</span>
      </a>
    );
  }

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={standalone && me ? meStyle : undefined}
      className={cn(
        "block rounded-2xl overflow-hidden max-w-[min(20rem,100%)] transition hover:ring-1 hover:ring-cyan-400/40",
        standalone
          ? me
            ? "rounded-br-none " +
              (bubbleMe ? "" : "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white")
            : "rounded-bl-none glass border border-border/60"
          : "glass border border-border/60"
      )}
    >
      {data.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.image}
          alt={data.title ?? ""}
          loading="lazy"
          className="block w-full h-40 object-cover bg-foreground/5"
        />
      )}
      <div className="px-3 py-2">
        {data.siteName && (
          <p
            className={cn(
              "text-[10px] uppercase tracking-wider truncate",
              standalone && me ? "opacity-70" : "text-muted-foreground"
            )}
          >
            {data.siteName}
          </p>
        )}
        {data.title && (
          <p className="text-sm font-medium leading-tight line-clamp-2 mt-0.5">
            {data.title}
          </p>
        )}
        {data.description && (
          <p
            className={cn(
              "text-[11px] line-clamp-2 mt-1",
              standalone && me ? "opacity-75" : "text-muted-foreground"
            )}
          >
            {data.description}
          </p>
        )}
        <div
          className={cn(
            "text-[10px] mt-1.5 flex items-center gap-1",
            standalone && me ? "opacity-80" : "text-cyan-400"
          )}
        >
          <ExternalLink className="size-3" />
          {data.host}
        </div>
      </div>
    </a>
  );
}

/** Compact, animated voice bubble. Tapping play scrubs across the waveform;
 *  bars idle with a gentle staggered equaliser pulse when not playing. */
function VoiceBubble({
  me,
  meStyle,
  bubbleMe,
  durationSec,
  waveform,
  url
}: {
  me: boolean;
  meStyle: React.CSSProperties;
  bubbleMe?: string;
  durationSec: number;
  waveform: number[];
  url?: string;
}) {
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0); // 0..1
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const startedAtRef = React.useRef<number>(0);
  const offsetRef = React.useRef<number>(0); // resume position 0..1

  // Lazily create the <audio> element on first play so SSR doesn't ship one
  // per bubble, and so reload doesn't auto-fetch every voice note on the page.
  const getAudio = React.useCallback(() => {
    if (!url) return null;
    if (!audioRef.current) {
      const el = new Audio(url);
      el.preload = "metadata";
      el.addEventListener("ended", () => {
        setPlaying(false);
        setProgress(1);
        offsetRef.current = 0;
      });
      audioRef.current = el;
    }
    return audioRef.current;
  }, [url]);

  const stop = React.useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
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

    const total = durationSec * 1000;
    const audio = getAudio();
    if (audio) {
      // Real audio source — drive progress off the audio element's currentTime
      // so the waveform and the actual playback stay in lockstep.
      audio.currentTime = offsetRef.current * durationSec;
      audio.play().catch((err) => {
        if (err?.name === "AbortError") return;
        console.error("[VoiceBubble] play failed", {
          url,
          message: err?.message
        });
      });
      setPlaying(true);
      const tick = () => {
        const cur = audio.currentTime;
        const p = Math.min(1, durationSec > 0 ? cur / durationSec : 0);
        setProgress(p);
        if (audio.paused || audio.ended) {
          if (audio.ended) {
            offsetRef.current = 0;
            setProgress(1);
          }
          setPlaying(false);
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    // Fallback when no audio URL is attached (legacy messages from before
    // the upload wiring landed) — just animate the bars off the duration so
    // the bubble still looks alive.
    startedAtRef.current = performance.now();
    setPlaying(true);
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
        "flex items-center gap-2 rounded-2xl px-2.5 py-1.5 max-w-[min(14rem,100%)]",
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
      <div className={cn("flex items-center gap-[2px] h-5 flex-1 min-w-0", playing && "voice-bars-playing")}>
        {waveform.map((h, i) => {
          const isPlayed = i < playedIndex;
          // Round to 2 decimals so server-rendered HTML and client-rendered
          // JSX produce the *same* string (avoids React hydration mismatch
          // when the number serializer differs at full precision).
          const heightPct = Math.max(20, Math.min(100, h * 100)).toFixed(2);
          return (
            <span
              key={i}
              style={{
                height: `${heightPct}%`,
                opacity: isPlayed ? 1 : 0.55,
                backgroundColor: "currentColor",
                animationDelay: `${((i * 40) % 1200)}ms`
              }}
              className="w-[2px] rounded-full voice-bar"
            />
          );
        })}
      </div>
      <span className="text-[10px] tabular-nums opacity-80 shrink-0">{remaining}s</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Rich-attachment bubble subcomponents
 * ───────────────────────────────────────────────────────────────────── */

type SubProps = {
  me: boolean;
  bubbleMe?: string;
  meStyle: React.CSSProperties;
  message: Message;
};

/** Video preview — native <video> with controls. */
function VideoBubble({ me, message }: SubProps) {
  const src = message.media?.[0]?.url;
  if (!src) return null;
  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden ring-1 ring-border/60 w-fit max-w-[22rem] bg-black/40",
        me && "ml-auto"
      )}
    >
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
        className="block w-full max-h-80 bg-black"
      />
      {message.content && <div className="px-3 py-2 text-sm">{message.content}</div>}
    </div>
  );
}

/** Audio file (music) — play button + filename + native <audio>. */
/** Pick the best audio MIME for a given URL/filename so old uploads stored
 *  as application/octet-stream still decode — browsers honor the <source>
 *  type hint over the Content-Type header for media decoding. */
function guessAudioMime(url: string, name: string): string {
  const target = (name || url).toLowerCase();
  if (target.endsWith(".mp3")) return "audio/mpeg";
  if (target.endsWith(".m4a")) return "audio/mp4";
  if (target.endsWith(".aac")) return "audio/aac";
  if (target.endsWith(".ogg") || target.endsWith(".opus")) return "audio/ogg";
  if (target.endsWith(".wav")) return "audio/wav";
  if (target.endsWith(".flac")) return "audio/flac";
  if (target.endsWith(".webm")) return "audio/webm";
  return "audio/mpeg";
}

function AudioBubble({ me, bubbleMe, meStyle, message }: SubProps) {
  const [playing, setPlaying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const ref = React.useRef<HTMLAudioElement>(null);
  const audio = message.audio!;
  const isBlobUrl = !!audio.url && audio.url.startsWith("blob:");
  const audioMime = audio.url ? guessAudioMime(audio.url, audio.name) : "";
  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (playing) {
      el.pause();
      return;
    }
    // Surface play failures (CORS / dead-blob / autoplay) — but ignore
    // AbortError, which fires harmlessly when the user pauses before the
    // async play() promise has settled.
    el.play().catch((err) => {
      if (err?.name === "AbortError") return;
      console.error("[AudioBubble] play failed", {
        url: audio.url,
        name: audio.name,
        message: err?.message,
        error: err
      });
      setError(err?.message || "Couldn't play this audio");
    });
  };
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onPlay = () => {
      setPlaying(true);
      setError(null);
    };
    const onPause = () => setPlaying(false);
    const onError = () => {
      const code = el.error?.code;
      console.error("[AudioBubble] element error", {
        url: audio.url,
        name: audio.name,
        code,
        message: el.error?.message
      });
      setError(
        code === 4
          ? "File format not supported or link is dead"
          : "Couldn't load audio"
      );
    };
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onPause);
    el.addEventListener("error", onError);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onPause);
      el.removeEventListener("error", onError);
    };
  }, [audio.url, audio.name]);
  const sizeLabel = audio.size ? formatBytes(audio.size) : "";
  return (
    <div
      style={me ? meStyle : undefined}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5 max-w-[min(20rem,100%)]",
        me
          ? "rounded-br-none" + (bubbleMe ? "" : " bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white")
          : "rounded-bl-none glass border border-border/60"
      )}
    >
      <button
        onClick={toggle}
        className="size-10 rounded-full grid place-items-center shrink-0 active:scale-95"
        style={{ backgroundColor: "color-mix(in srgb, currentColor 18%, transparent)" }}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-medium truncate">
          <MusicIcon className="size-3.5 shrink-0 opacity-80" />
          <span className="truncate">{audio.name}</span>
        </div>
        {error ? (
          <p className="text-[11px] text-rose-300 truncate" title={error}>
            {isBlobUrl ? "Link expired — please re-send" : error}
          </p>
        ) : sizeLabel ? (
          <p className="text-[11px] opacity-70">{sizeLabel}</p>
        ) : null}
      </div>
      {audio.url && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio ref={ref} preload="metadata" className="hidden">
          {/* Browsers honor the source `type` hint over the response
              Content-Type when decoding media — this lets old uploads that
              were stored as application/octet-stream still play. */}
          <source src={audio.url} type={audioMime} />
          {/* Bare-src fallback for browsers that don't pick up the source. */}
          <source src={audio.url} />
        </audio>
      )}
      {audio.url && (
        <a
          href={audio.url}
          download={audio.name || true}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] opacity-70 hover:opacity-100 underline shrink-0"
          aria-label="Download"
        >
          ↓
        </a>
      )}
    </div>
  );
}

/** Generic file (PDFs, docs, etc.). PDFs get a preview thumbnail above the
 *  filename row (rendered via the browser's built-in PDF viewer in an
 *  <object>). Other files use a clean icon card. */
function FileBubble({ me, bubbleMe, meStyle, message }: SubProps) {
  const file = message.file!;
  const sizeLabel = file.size ? formatBytes(file.size) : "";
  const isPdf =
    file.mime === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (isPdf && file.url) {
    return (
      <div
        style={me ? meStyle : undefined}
        className={cn(
          "rounded-2xl overflow-hidden max-w-[min(20rem,100%)]",
          me
            ? "rounded-br-none" + (bubbleMe ? "" : " bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white")
            : "rounded-bl-none glass border border-border/60"
        )}
      >
        {/* PDF preview — browser-native viewer in a fixed-height frame.
            #toolbar=0 hides the controls so it reads as a clean thumbnail. */}
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative h-44 bg-white overflow-hidden"
        >
          <object
            data={`${file.url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            type="application/pdf"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <div className="absolute inset-0 grid place-items-center text-rose-500">
              <FileText className="size-12" />
            </div>
          </object>
          <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-rose-500 text-white">
            PDF
          </span>
        </a>
        <a
          href={file.url}
          download={file.name}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 hover:opacity-95"
        >
          <span
            className="size-9 rounded-lg grid place-items-center shrink-0"
            style={{ backgroundColor: "color-mix(in srgb, currentColor 18%, transparent)" }}
          >
            <FileText className="size-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-[11px] opacity-70 truncate">
              {sizeLabel} {file.mime ? `· PDF` : ""}
            </p>
          </div>
          <Download className="size-4 opacity-75 shrink-0" />
        </a>
      </div>
    );
  }

  return (
    <a
      href={file.url}
      download={file.name}
      target="_blank"
      rel="noopener noreferrer"
      style={me ? meStyle : undefined}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5 max-w-[min(20rem,100%)] transition active:scale-[0.98]",
        me
          ? "rounded-br-none" + (bubbleMe ? "" : " bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white")
          : "rounded-bl-none glass border border-border/60"
      )}
    >
      <span
        className="size-10 rounded-xl grid place-items-center shrink-0"
        style={{ backgroundColor: "color-mix(in srgb, currentColor 18%, transparent)" }}
      >
        <FileText className="size-5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-[11px] opacity-70 flex items-center gap-1">
          {sizeLabel && <span>{sizeLabel}</span>}
          {file.mime && <span className="truncate opacity-60">· {file.mime}</span>}
        </p>
      </div>
      {file.url && <Download className="size-4 opacity-75 shrink-0" />}
    </a>
  );
}

/** Interactive poll — WhatsApp-style: radio + label, slim green progress
 *  bar, voter avatars + count on the right. Optional image above the
 *  question. */
function PollBubble({ me, bubbleMe, meStyle, message }: SubProps) {
  const t = useT();
  const vote = useChatStore((s) => s.votePoll);
  const myId = useAuthStore((s) => s.user?.id);
  const poll = message.poll!;
  const total = poll.options.reduce((acc, o) => acc + o.voters.length, 0);
  return (
    <div
      style={me ? meStyle : undefined}
      className={cn(
        "rounded-2xl px-3.5 py-3 max-w-[min(22rem,100%)] min-w-[16rem] space-y-3",
        me
          ? "rounded-br-none" + (bubbleMe ? "" : " bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white")
          : "rounded-bl-none glass border border-border/60"
      )}
    >
      {/* Optional image above the question. */}
      {poll.imageUrl && (
        <div className="overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poll.imageUrl} alt="" className="h-40 w-full object-cover" />
        </div>
      )}

      <div>
        <p className="text-sm font-semibold leading-tight">{poll.question}</p>
        <p className="text-[11px] opacity-70 mt-0.5">
          {t("Poll")} · {poll.multi ? t("Select one or more") : t("Select one")}
        </p>
      </div>

      <div className="space-y-2.5">
        {poll.options.map((opt) => {
          const count = opt.voters.length;
          const pct = total === 0 ? 0 : Math.round((count / total) * 100);
          const mine = !!myId && opt.voters.includes(myId);
          // Show up to 3 voter avatars (most recent), use mock users for
          // lookup; falls back to initials when the voter isn't known
          // locally (real Supabase users not in mock-data).
          const voterAvatars = opt.voters
            .map((uid) => users.find((u) => u.id === uid))
            .filter((u): u is NonNullable<typeof u> => !!u)
            .slice(-3);
          return (
            <button
              key={opt.id}
              onClick={() => vote(message.chatId, message.id, opt.id)}
              className="block w-full text-left group"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "size-5 rounded-full grid place-items-center shrink-0 transition",
                    mine
                      ? "bg-emerald-500 ring-emerald-500"
                      : "ring-2 ring-current/30 group-hover:ring-current/50"
                  )}
                >
                  {mine && <Check className="size-3 text-white" strokeWidth={3.5} />}
                </span>
                <span className="flex-1 text-sm truncate">{opt.text}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {voterAvatars.length > 0 && (
                    <div className="flex -space-x-1.5">
                      {voterAvatars.map((u) => (
                        <Avatar
                          key={u.id}
                          className="size-5 ring-2 ring-background"
                        >
                          <AvatarImage src={u.avatar} alt={u.name} />
                          <AvatarFallback className="text-[8px]">
                            {initials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  )}
                  <span className="text-[11px] tabular-nums opacity-80 min-w-[1ch] text-right">
                    {count}
                  </span>
                </div>
              </div>
              <div className="ml-7 mt-1.5 h-1 rounded-full bg-current/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] opacity-60 text-right">
        {total} {total === 1 ? t("vote") : t("votes")}
      </p>
    </div>
  );
}

/** Vertical hero-style profile card sent by the Share-profile sheet. Wider
 *  than a normal bubble so the banner has room to breathe; tapping "View
 *  profile" opens a DM with that user when the payload carries an `id`,
 *  and falls back to the public profile URL otherwise. */
function ProfileCardBubble({
  me,
  contact,
  bannerStyle
}: {
  me: boolean;
  contact: {
    id?: string;
    name: string;
    username?: string;
    avatar?: string;
    banner?: string;
    url?: string;
  };
  bannerStyle: React.CSSProperties;
}) {
  const router = useRouter();
  const startDM = useChatStore((s) => s.startDM);

  const startChat = async () => {
    if (!contact.id) return;
    const result = await startDM(contact.id);
    const chatId = result.data?.id;
    if (chatId) router.push(`/chats/${chatId}`);
  };

  const openProfile = () => {
    if (contact.url) {
      window.open(contact.url, "_blank", "noopener,noreferrer");
    } else if (contact.username) {
      window.open(`/profile/${contact.username}`, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className={cn(
        // Take the full bubble column (the parent already opens it up for
        // profile-card kind). Flat vertical proportions so the card reads
        // as a landscape rectangle, not a tall column.
        "rounded-2xl overflow-hidden w-full",
        "glass glass-specular border border-border/60",
        me ? "rounded-br-none" : "rounded-bl-none"
      )}
    >
      {/* Whole hero area (banner + avatar + name + handle) is a single
          tappable target that starts a DM with the shared user. */}
      <button
        type="button"
        onClick={() => void startChat()}
        className="block w-full text-left hover:bg-foreground/[0.03] transition"
      >
        <div className="relative h-32 w-full" style={bannerStyle}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/30" />
        </div>
        <div className="px-5 pt-0 pb-2 -mt-12 flex flex-col items-center text-center">
          <Avatar className="size-24 ring-4 ring-background shadow-floating">
            <AvatarImage src={contact.avatar} />
            <AvatarFallback className="text-xl">{initials(contact.name)}</AvatarFallback>
          </Avatar>
          <p className="mt-1 text-base font-semibold truncate max-w-full text-foreground inline-flex items-center justify-center gap-1.5">
            {contact.name}
            <CheckCircle2 className="size-4 text-cyan-400 shrink-0" aria-label="Verified" />
          </p>
          {contact.username && (
            <p className="text-xs text-muted-foreground truncate max-w-full">
              @{contact.username}
            </p>
          )}
        </div>
      </button>
      <button
        type="button"
        onClick={openProfile}
        className="block w-full text-center text-xs font-medium py-1.5 border-t border-border/40 text-cyan-400 hover:bg-foreground/[0.04] transition"
      >
        View profile →
      </button>
    </div>
  );
}

/** Shared community card. Same proportions as ProfileCardBubble (banner +
 *  identity hero + footer CTA) but with community wording — the hero
 *  taps through to the community detail page, and the footer is a
 *  "Join community →" CTA. */
function CommunityCardBubble({
  me,
  community
}: {
  me: boolean;
  community: NonNullable<Message["community"]>;
}) {
  const router = useRouter();

  const openCommunity = () => {
    router.push(`/discover/community/${community.id}`);
  };

  const bannerStyle: React.CSSProperties = community.cover
    ? { background: `url("${community.cover}") center/cover no-repeat` }
    : { background: "linear-gradient(135deg,#8B5CF6,#06B6D4)" };

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden w-full",
        "glass glass-specular border border-border/60",
        me ? "rounded-br-none" : "rounded-bl-none"
      )}
    >
      <button
        type="button"
        onClick={openCommunity}
        className="block w-full text-left hover:bg-foreground/[0.03] transition"
      >
        <div className="relative h-32 w-full" style={bannerStyle}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/40" />
        </div>
        <div className="px-5 pt-3 pb-3 text-center">
          <p className="text-base font-semibold truncate max-w-full inline-flex items-center justify-center gap-1.5">
            {community.name}
          </p>
          {community.category && (
            <p className="text-xs text-muted-foreground truncate max-w-full">
              {community.category}
              {typeof community.members === "number"
                ? ` · ${community.members.toLocaleString()} members`
                : ""}
            </p>
          )}
          {community.description && (
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
              {community.description}
            </p>
          )}
        </div>
      </button>
      <button
        type="button"
        onClick={openCommunity}
        className="block w-full text-center text-xs font-medium py-1.5 border-t border-border/40 text-cyan-400 hover:bg-foreground/[0.04] transition"
      >
        Join community →
      </button>
    </div>
  );
}

/** Shared contact / profile card. Single-entry cards with a `url` render
 *  as a vertical profile card (avatar + name + handle + "View profile"
 *  link) — that's what the Share-profile sheet sends. Multi-entry phonebook
 *  shares fall back to the original compact list layout. */
function ContactsBubble({ me, bubbleMe, meStyle, message }: SubProps) {
  const contacts = message.contacts ?? [];
  const single = contacts.length === 1 ? contacts[0] : null;

  if (single && single.url) {
    // Profile-card layout: banner strip → avatar overlapping the banner
    // edge → name + handle → tappable "View profile" footer. Glass-styled
    // on BOTH sides so it reads identically in light + dark.
    const bannerStyle: React.CSSProperties = single.banner
      ? {
          background: `url("${single.banner}") center/cover no-repeat`
        }
      : {
          background: "linear-gradient(135deg,#8B5CF6,#EC4899)"
        };
    return (
      <ProfileCardBubble me={me} contact={single} bannerStyle={bannerStyle} />
    );
  }

  return (
    <div
      style={me ? meStyle : undefined}
      className={cn(
        "rounded-2xl px-3 py-2.5 max-w-[min(20rem,100%)] space-y-1.5",
        me
          ? "rounded-br-none" + (bubbleMe ? "" : " bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white")
          : "rounded-bl-none glass border border-border/60"
      )}
    >
      {contacts.map((c, i) => (
        <div key={`${c.username ?? c.name}-${i}`} className="flex items-center gap-3">
          <Avatar className="size-10 shrink-0">
            <AvatarImage src={c.avatar} />
            <AvatarFallback>{initials(c.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{c.name}</p>
            {c.username && (
              <p className="text-[11px] opacity-75 truncate">@{c.username}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Location card — static map thumbnail + open-in-Maps link. */
function LocationBubble({ me, bubbleMe, meStyle, message }: SubProps) {
  const t = useT();
  const loc = message.location!;
  const href = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
  const embed = `https://maps.google.com/maps?q=${loc.lat},${loc.lng}&z=15&output=embed`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={me ? meStyle : undefined}
      className="block rounded-2xl overflow-hidden max-w-[min(18rem,100%)] ring-1 ring-border/60"
    >
      <div className="aspect-[5/3] bg-black/40 relative">
        <iframe
          title="map"
          src={embed}
          loading="lazy"
          className="absolute inset-0 w-full h-full border-0 pointer-events-none"
        />
      </div>
      <div className="px-3 py-2 flex items-center gap-2 bg-card">
        {loc.live ? (
          <Navigation className="size-3.5 shrink-0" />
        ) : (
          <MapPin className="size-3.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {loc.live ? t("Live location") : t("Location")}
          </p>
          <p className="text-[11px] opacity-75 truncate">
            {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
          </p>
        </div>
      </div>
    </a>
  );
}

/** Scheduled message receipt. Renders a call-invite countdown + Join button
 *  when `schedule.callInvite` is set, otherwise the plain scheduled note. */
function ScheduleBubble({ me, bubbleMe, meStyle, message }: SubProps) {
  const t = useT();
  const sch = message.schedule!;
  const when = new Date(sch.whenIso);
  if (sch.callInvite) {
    return <ScheduledCallBubble me={me} message={message} bubbleMe={bubbleMe} meStyle={meStyle} />;
  }
  return (
    <div
      style={me ? meStyle : undefined}
      className={cn(
        "rounded-2xl px-3.5 py-2.5 max-w-[min(20rem,100%)] space-y-2",
        me
          ? "rounded-br-none" + (bubbleMe ? "" : " bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white")
          : "rounded-bl-none glass border border-border/60"
      )}
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider opacity-80">
        <CalendarClock className="size-3.5" />
        {t("Scheduled for")}{" "}
        {when.toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit"
        })}
      </div>
      <p className="text-sm whitespace-pre-wrap break-words">{sch.message}</p>
    </div>
  );
}

/** Specialized scheduled-call bubble — shows a live countdown to the start
 *  time, flips to "Live now" once the time has elapsed, and exposes a Join
 *  button that drops the user straight into the active-call screen. */
function ScheduledCallBubble({
  me,
  message,
  bubbleMe,
  meStyle
}: SubProps) {
  const t = useT();
  const sch = message.schedule!;
  const invite = sch.callInvite!;
  const router = useRouter();
  const startCall = useUIStore((s) => s.startCall);

  const target = React.useMemo(() => new Date(sch.whenIso).getTime(), [sch.whenIso]);
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    // Tick once per second so the countdown stays accurate without thrashing.
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const diffSec = Math.max(0, Math.floor((target - now) / 1000));
  const isLive = diffSec === 0;
  const countdown = formatCountdown(diffSec);

  // "Requesting host approval" intermediate state — once the call has
  // already started, members can't join freely; the host must accept. We
  // simulate that with a short pending state before the call actually opens.
  const [requesting, setRequesting] = React.useState(false);

  const doJoin = () => {
    startCall({
      chatId: message.chatId,
      name: invite.title,
      video: invite.video,
      group: (invite.participantIds?.length ?? 0) > 2,
      participants: invite.participantIds?.length ?? 2,
      returnTo: `/chats/${message.chatId}`
    });
    router.push("/calls/active");
  };

  const handleJoin = () => {
    if (!isLive) return; // pre-start: nothing to do until live
    if (requesting) return;
    setRequesting(true);
    // Host approval is mock — accept after a short delay.
    window.setTimeout(() => {
      setRequesting(false);
      doJoin();
    }, 1400);
  };

  return (
    <div
      style={me ? meStyle : undefined}
      className={cn(
        "rounded-2xl px-3.5 py-3 max-w-[min(22rem,100%)] space-y-2.5",
        me
          ? "rounded-br-none" +
              (bubbleMe ? "" : " bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white")
          : "rounded-bl-none glass border border-border/60"
      )}
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider opacity-80">
        {invite.video ? <VideoIcon className="size-3.5" /> : <Phone className="size-3.5" />}
        {isLive ? t("Live now") : t("Scheduled call")}
      </div>
      <p className="text-sm font-semibold break-words">{invite.title}</p>
      <div className="text-[11px] opacity-80">
        {t("Starts")}{" "}
        {new Date(sch.whenIso).toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit"
        })}
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <div
          className={cn(
            "px-2.5 py-1 rounded-full text-[11px] font-mono tabular-nums",
            isLive
              ? "bg-emerald-500/25 text-emerald-200"
              : "bg-foreground/10 text-foreground/85"
          )}
        >
          {isLive ? "● LIVE" : `in ${countdown}`}
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleJoin}
          disabled={!isLive || requesting}
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold shadow-glow transition",
            !isLive
              ? "bg-white/70 text-black/50 cursor-not-allowed"
              : requesting
                ? "bg-amber-400/90 text-black cursor-wait"
                : "bg-emerald-500 hover:bg-emerald-400 text-white"
          )}
        >
          {requesting ? (
            <>
              <Clock className="size-3.5 animate-spin" />
              {t("Asking host…")}
            </>
          ) : (
            <>
              {invite.video ? <VideoIcon className="size-3.5" /> : <Phone className="size-3.5" />}
              {t("Join call")}
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}

/** Format a duration of seconds as "Xd Yh", "Xh Ym", "Xm Ys", or "Xs". */
function formatCountdown(totalSec: number) {
  if (totalSec <= 0) return "0s";
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

/** WhatsApp-style image grid (1, 2, 3, 4, 4+N tiles). Tapping any tile opens
 *  the lightbox; the lightbox is given the full ordered list of images in
 *  this single message so swipe-prev/next stays grouped. */
/** Renders a media URL — uses <video> for mp4/webm, otherwise <img>. */
function MediaTile({
  src,
  alt,
  className
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src);
  if (isVideo) {
    return (
      <video
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className={className}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt ?? ""} className={className} loading="lazy" />;
}

function ImageGridBubble({ me, message }: { me: boolean; message: Message }) {
  const lb = useImageLightbox();
  const media = (message.media ?? []).filter((m) => m.url);
  const n = media.length;
  const items = media.map((m) => ({ src: m.url, alt: m.alt ?? "" }));

  const open = (i: number) => lb.open(items, i);

  // Layout per count (WhatsApp-like)
  let grid: React.ReactNode;
  if (n === 1) {
    grid = (
      <button
        type="button"
        onClick={() => open(0)}
        className="block w-full max-h-80 overflow-hidden"
      >
        <MediaTile src={media[0].url} alt={media[0].alt} className="w-full max-h-80 object-cover" />
      </button>
    );
  } else if (n === 2) {
    grid = (
      <div className="grid grid-cols-2 gap-[2px]">
        {media.map((m, i) => (
          <button key={i} type="button" onClick={() => open(i)} className="aspect-square overflow-hidden">
            <MediaTile src={m.url} alt={m.alt} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    );
  } else if (n === 3) {
    grid = (
      <div className="grid grid-cols-2 gap-[2px] aspect-[4/3]">
        <button type="button" onClick={() => open(0)} className="row-span-2 overflow-hidden">
          <MediaTile src={media[0].url} alt={media[0].alt} className="w-full h-full object-cover" />
        </button>
        {[1, 2].map((i) => (
          <button key={i} type="button" onClick={() => open(i)} className="overflow-hidden">
            <MediaTile src={media[i].url} alt={media[i].alt} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    );
  } else {
    const shown = media.slice(0, 4);
    const overflow = n - 4;
    grid = (
      <div className="grid grid-cols-2 gap-[2px]">
        {shown.map((m, i) => {
          const isLastSpot = i === 3 && overflow > 0;
          return (
            <button
              key={i}
              type="button"
              onClick={() => open(i)}
              className="relative aspect-square overflow-hidden"
            >
              <MediaTile src={m.url} alt={m.alt} className="w-full h-full object-cover" />
              {isLastSpot && (
                <div className="absolute inset-0 bg-black/55 grid place-items-center text-white text-2xl font-semibold">
                  +{overflow}
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden glass border border-border/60 w-fit max-w-[22rem]",
        me && "ml-auto"
      )}
    >
      {grid}
      {message.content && <div className="px-3 py-2 text-sm">{message.content}</div>}
    </div>
  );
}

/** Human-readable byte size. */
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
