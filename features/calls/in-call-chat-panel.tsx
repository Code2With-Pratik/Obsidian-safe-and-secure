"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Smile } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ExpressionsPicker, type ExpressionPick } from "@/features/chat/expressions-picker";
import { useT } from "@/lib/i18n";
import { initials, cn } from "@/lib/utils";
import type { CallDataMessage } from "./use-call-data-channel";

export interface InCallChatMessage {
  id: string;
  authorIdentity: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  text?: string;
  sticker?: { src?: string; emoji?: string; gradient?: string };
  gif?: { src: string; alt?: string };
  meme?: { src: string };
  /** Local sender flag — used to right-align bubbles. */
  byMe?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  messages: InCallChatMessage[];
  onSend: (msg: Extract<CallDataMessage, { kind: "chat" }>) => void;
  /** Local participant identity + name so we can stamp outgoing messages. */
  me: { identity: string; name: string; avatar?: string };
}

/**
 * Sliding right-side panel for in-call chat. Messages are NOT persisted —
 * the panel is a transient "side channel" that lives only for the duration
 * of the call. The composer reuses `ExpressionsPicker` so users get the
 * same emoji / sticker / GIF / meme set as the main chat composer.
 */
export function InCallChatPanel({
  open,
  onClose,
  messages,
  onSend,
  me
}: Props) {
  const t = useT();
  const [text, setText] = React.useState("");
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const emojiBtnRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message.
  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, open]);

  const sendText = () => {
    const value = text.trim();
    if (!value) return;
    onSend({
      kind: "chat",
      from: me.identity,
      authorName: me.name,
      authorAvatar: me.avatar,
      id: `c-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      createdAt: new Date().toISOString(),
      text: value
    });
    setText("");
  };

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const sendExpression = (pick: ExpressionPick) => {
    const baseMsg = {
      kind: "chat" as const,
      from: me.identity,
      authorName: me.name,
      authorAvatar: me.avatar,
      id: `c-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      createdAt: new Date().toISOString()
    };
    if (pick.kind === "emoji") {
      onSend({ ...baseMsg, text: pick.value });
    } else if (pick.kind === "sticker") {
      onSend({
        ...baseMsg,
        sticker: {
          src: pick.sticker.src,
          emoji: pick.sticker.emoji,
          gradient: pick.sticker.gradient
        }
      });
    } else if (pick.kind === "gif") {
      onSend({
        ...baseMsg,
        gif: { src: pick.gif.src, alt: pick.gif.alt }
      });
    } else if (pick.kind === "meme") {
      onSend({ ...baseMsg, meme: { src: pick.meme.src } });
    }
    setPickerOpen(false);
  };

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.aside
          key="in-call-chat"
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          // Portaled to <body> so the panel:
          //  • fills the full viewport height (was previously trapped inside
          //    the bottom-controls strip, which is why it overflowed),
          //  • escapes the call stage's CSS filter (no blur/sepia on chat),
          //  • sits above the controls + the LiveKit room.
          className="fixed right-0 top-0 bottom-0 z-[150] w-full max-w-sm flex flex-col glass-strong border-l border-border/40 backdrop-blur-2xl pointer-events-auto"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <div>
              <h3 className="text-sm font-semibold">{t("In-call chat")}</h3>
              <p className="text-[10px] text-muted-foreground">
                {t("Messages disappear when the call ends")}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label={t("Close")}
              className="size-8 rounded-full grid place-items-center text-foreground/70 hover:bg-foreground/10 transition"
            >
              <X className="size-4" />
            </button>
          </div>

          <div
            ref={listRef}
            className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3"
          >
            {messages.length === 0 ? (
              <p className="text-center text-[11px] text-muted-foreground mt-8">
                {t("No messages yet. Say hi 👋")}
              </p>
            ) : (
              messages.map((m) => (
                <ChatBubble key={m.id} msg={m} />
              ))
            )}
          </div>

          <div className="p-2.5 border-t border-border/40 flex items-end gap-2">
            <button
              ref={emojiBtnRef}
              onClick={() => setPickerOpen((v) => !v)}
              aria-label={t("Emoji & stickers")}
              className={cn(
                "size-9 shrink-0 rounded-full grid place-items-center transition",
                pickerOpen
                  ? "bg-cyan-400/20 text-cyan-300"
                  : "text-foreground/70 hover:bg-foreground/10"
              )}
            >
              <Smile className="size-4" />
            </button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendText();
                }
              }}
              rows={1}
              placeholder={t("Message everyone")}
              className="flex-1 resize-none bg-foreground/5 border border-border/60 rounded-2xl px-3 py-2 text-sm outline-none focus:border-cyan-400/60 max-h-28"
            />
            <button
              onClick={sendText}
              disabled={!text.trim()}
              aria-label={t("Send")}
              className="size-9 shrink-0 rounded-full grid place-items-center bg-cyan-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-600 transition"
            >
              <Send className="size-4" />
            </button>
          </div>

          <ExpressionsPicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onPick={sendExpression}
            anchorRef={emojiBtnRef}
            placement="top"
          />
        </motion.aside>
      )}
    </AnimatePresence>,
    document.body
  );
}

function ChatBubble({ msg }: { msg: InCallChatMessage }) {
  const mine = !!msg.byMe;
  return (
    <div
      className={cn(
        "flex items-end gap-2",
        mine ? "flex-row-reverse" : "flex-row"
      )}
    >
      {!mine && (
        <Avatar className="size-7 shrink-0">
          <AvatarImage src={msg.authorAvatar} />
          <AvatarFallback className="text-[10px]">
            {initials(msg.authorName)}
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[78%] flex flex-col gap-0.5",
          mine ? "items-end" : "items-start"
        )}
      >
        {!mine && (
          <span className="text-[10px] text-muted-foreground ml-1">
            {msg.authorName}
          </span>
        )}
        {msg.sticker ? (
          msg.sticker.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={msg.sticker.src}
              alt={msg.sticker.emoji ?? "sticker"}
              className="size-24 object-contain"
            />
          ) : (
            <span
              className="size-20 grid place-items-center text-4xl rounded-2xl"
              style={{ background: msg.sticker.gradient }}
            >
              {msg.sticker.emoji}
            </span>
          )
        ) : msg.gif ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={msg.gif.src}
            alt={msg.gif.alt ?? "gif"}
            className="max-w-[16rem] rounded-2xl"
          />
        ) : msg.meme ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={msg.meme.src}
            alt="meme"
            className="max-w-[16rem] rounded-2xl"
          />
        ) : (
          <span
            className={cn(
              "px-3 py-1.5 rounded-2xl text-sm",
              mine
                ? "bg-cyan-500 text-white rounded-br-sm"
                : "bg-foreground/10 text-foreground rounded-bl-sm"
            )}
          >
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
