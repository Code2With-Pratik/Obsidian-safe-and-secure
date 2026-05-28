"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, MessageCircle, Smile, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EMPTY_LIST, useGhostStore } from "@/store/use-ghost-store";
import { useT } from "@/lib/i18n";

type StreamMsg = { id: string; authorId: string; authorHue: number; content: string; createdAt: string };
const EMPTY_STREAM = EMPTY_LIST as readonly StreamMsg[];

interface Props {
  roomId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GhostStreamChat({ roomId, open, onOpenChange }: Props) {
  const t = useT();
  const messages = useGhostStore((s) => s.streamChatByRoom[roomId] ?? EMPTY_STREAM);
  const myIdentity = useGhostStore((s) => s.myIdentityByRoom[roomId]);
  const send = useGhostStore((s) => s.sendStreamChat);
  const [text, setText] = React.useState("");
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [open, messages.length]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    send(roomId, trimmed);
    setText("");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: 360, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 360, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
          className={cn(
            // Desktop: docked sidebar; Mobile: fullscreen sheet.
            "fixed top-16 bottom-0 right-0 z-[60] w-full md:w-[360px] flex flex-col",
            "bg-card/80 backdrop-blur-xl border-l border-border/60 shadow-floating"
          )}
        >
          <header className="h-12 px-3 flex items-center gap-2 border-b border-border/40">
            <MessageCircle className="size-4 text-violet-400" />
            <p className="text-sm font-semibold">{t("Live chat")}</p>
            <span className="text-[10px] text-muted-foreground">
              · {messages.length} {messages.length === 1 ? t("message") : t("messages")}
            </span>
            <button
              onClick={() => onOpenChange(false)}
              className="ml-auto size-7 grid place-items-center rounded-md hover:bg-foreground/10 text-muted-foreground"
              aria-label={t("Close chat")}
            >
              <X className="size-4" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 no-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full grid place-items-center text-center px-4">
                <div>
                  <div className="size-12 mx-auto rounded-2xl bg-foreground/10 grid place-items-center">
                    <MessageCircle className="size-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium mt-3">{t("Stream chat is empty")}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 max-w-[220px] mx-auto">
                    {t("Messages show up live for everyone — names stay hidden.")}
                  </p>
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <StreamRow key={m.id} hue={m.authorHue} content={m.content} isMe={m.authorId === myIdentity?.id} />
              ))
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-border/40 p-2 bg-card/60 backdrop-blur">
            <div className="flex items-end gap-1 rounded-2xl glass-subtle border border-border/60 pl-2 pr-1 py-1">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={t("Say something anonymously")}
                className="flex-1 min-w-0 bg-transparent text-sm outline-none py-2"
              />
              <button
                aria-label={t("Emoji")}
                className="size-8 grid place-items-center rounded-full hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition"
              >
                <Smile className="size-4" />
              </button>
              <button
                onClick={handleSend}
                disabled={!text.trim()}
                aria-label={t("Send")}
                className={cn(
                  "size-8 grid place-items-center rounded-full transition",
                  text.trim()
                    ? "bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-glow"
                    : "bg-foreground/5 text-muted-foreground/50"
                )}
              >
                <ArrowUp className="size-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function StreamRow({
  hue,
  content,
  isMe
}: {
  hue: number;
  content: string;
  isMe: boolean;
}) {
  const t = useT();
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 hover:bg-foreground/[0.03] rounded-md px-1.5 py-1"
    >
      <div
        className="mt-0.5 size-6 rounded-full grid place-items-center text-white text-[10px] font-semibold shrink-0"
        style={{
          background: `linear-gradient(135deg, hsl(${hue} 75% 55%), hsl(${(hue + 60) % 360} 75% 50%))`
        }}
      >
        G
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] leading-tight">
          <span
            className="font-semibold"
            style={{ color: `hsl(${hue} 70% 70%)` }}
          >
            {isMe ? t("You") : `Ghost #${(hue % 360).toString().padStart(3, "0")}`}
          </span>
        </p>
        <p className="text-[13px] leading-snug text-foreground/90 break-words">
          {content}
        </p>
      </div>
    </motion.div>
  );
}

/** Floating "toast" version — overlay chips that briefly appear on the host's view,
 *  YouTube/Twitch style. Auto-dismisses after a few seconds. */
export function GhostStreamOverlay({ roomId }: { roomId: string }) {
  const messages = useGhostStore((s) => s.streamChatByRoom[roomId] ?? EMPTY_STREAM);
  // Show only the most recent few messages so the overlay never overwhelms the call.
  const recent = messages.slice(-4);
  // Keyed by timestamp so each chip animates in on arrival, then peacefully fades.
  return (
    <div className="pointer-events-none absolute bottom-24 left-3 md:left-6 z-30 flex flex-col gap-1.5 max-w-[min(420px,80vw)]">
      <AnimatePresence initial={false}>
        {recent.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="rounded-full glass-strong border border-white/15 px-3 py-1.5 flex items-center gap-2 backdrop-blur-xl shadow-floating"
          >
            <div
              className="size-5 rounded-full grid place-items-center text-white text-[9px] font-semibold shrink-0"
              style={{
                background: `linear-gradient(135deg, hsl(${m.authorHue} 75% 55%), hsl(${(m.authorHue + 60) % 360} 75% 50%))`
              }}
            >
              G
            </div>
            <span
              className="text-[11px] font-semibold"
              style={{ color: `hsl(${m.authorHue} 70% 75%)` }}
            >
              Ghost #{(m.authorHue % 360).toString().padStart(3, "0")}
            </span>
            <span className="text-[12px] text-white/90 truncate max-w-[260px]">
              {m.content}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
