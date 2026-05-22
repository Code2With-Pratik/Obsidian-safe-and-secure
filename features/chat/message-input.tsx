"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Smile, Mic, Sparkles, ArrowUp } from "lucide-react";
import { AttachmentSheet } from "./attachment-sheet";
import { ExpressionsPicker, type ExpressionPick } from "./expressions-picker";
import { useUIStore } from "@/store/use-ui-store";
import { cn } from "@/lib/utils";

interface Props {
  onSend: (text: string) => void;
}

const SUGGESTIONS = [
  "Sounds amazing — let's lock it in",
  "Will check and ping you back 🤝",
  "Could we do that tomorrow morning?"
];

export function MessageInput({ onSend }: Props) {
  const [text, setText] = React.useState("");
  const [showAi, setShowAi] = React.useState(false);
  const [attachOpen, setAttachOpen] = React.useState(false);
  const [exprOpen, setExprOpen] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const setAi = useUIStore((s) => s.setAiAssistantOpen);
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const emojiBtnRef = React.useRef<HTMLButtonElement>(null);

  const handleExpression = (pick: ExpressionPick) => {
    if (pick.kind === "emoji") {
      setText((t) => t + pick.value);
      ref.current?.focus();
      return;
    }
    if (pick.kind === "gif") {
      onSend(`🎞 GIF · ${pick.gif.alt}`);
    } else if (pick.kind === "sticker") {
      onSend(`${pick.sticker.emoji}`);
    } else if (pick.kind === "meme") {
      onSend(`🖼 ${pick.meme.caption}`);
    }
    setExprOpen(false);
  };

  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
    ref.current?.focus();
  };

  React.useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "0px";
    ref.current.style.height = Math.min(160, ref.current.scrollHeight) + "px";
  }, [text]);

  const hasText = text.trim().length > 0;

  return (
    <div className="px-3 md:px-4 pt-2 pb-3">
      <AnimatePresence>
        {showAi && !hasText && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mb-2 flex gap-1.5 flex-wrap"
          >
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setText(s);
                  setShowAi(false);
                  ref.current?.focus();
                }}
                className="text-xs px-3 py-1.5 rounded-full glass glass-specular hover:bg-foreground/5 transition inline-flex items-center gap-1.5"
              >
                <Sparkles className="size-3 text-violet-400" />
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        layout
        className={cn(
          "relative flex items-center gap-1 pl-1.5 pr-1 py-1 rounded-full",
          "glass glass-specular border border-white/15 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.4)]",
          focused && "ring-2 ring-cyan-400/50"
        )}
      >
        <motion.button
          whileTap={{ scale: 0.9, rotate: 45 }}
          onClick={() => setAttachOpen(true)}
          className={cn(
            "size-9 rounded-full grid place-items-center transition shrink-0",
            "hover:bg-foreground/5 text-foreground/80",
            attachOpen && "bg-foreground/10 rotate-45 text-foreground"
          )}
          aria-label="Attach"
        >
          <Plus className="size-[18px]" />
        </motion.button>

        <div className="relative flex-1 min-w-0">
          <textarea
            ref={ref}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
                return;
              }
              if (e.key === " " && !hasText) {
                e.preventDefault();
                setAi(true);
                return;
              }
            }}
            rows={1}
            placeholder=" "
            className="peer w-full bg-transparent text-[15px] outline-none resize-none py-1.5 max-h-40 leading-snug"
          />

          {!hasText && (
            <div className="pointer-events-none absolute inset-y-0 left-0 right-2 flex items-center text-[14px] text-muted-foreground/60">
              <span className="truncate">Message</span>
            </div>
          )}
        </div>

        <button
          ref={emojiBtnRef}
          onClick={() => setExprOpen((v) => !v)}
          className={cn(
            "size-9 rounded-full grid place-items-center hover:bg-foreground/5 text-foreground/80 transition shrink-0",
            exprOpen && "bg-foreground/10 text-foreground"
          )}
          aria-label="Emoji, GIFs, stickers, memes"
        >
          <Smile className="size-[18px]" />
        </button>

        <AnimatePresence initial={false} mode="popLayout">
          {hasText ? (
            <motion.button
              key="send"
              layout
              initial={{ scale: 0.6, opacity: 0, rotate: -30 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.6, opacity: 0, rotate: 30 }}
              transition={{ type: "spring", stiffness: 360, damping: 22 }}
              onClick={send}
              className="size-9 rounded-full grid place-items-center text-white shrink-0 bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 shadow-[0_6px_22px_-4px_rgba(34,211,238,0.7)]"
              aria-label="Send"
            >
              <ArrowUp className="size-[18px]" strokeWidth={2.5} />
            </motion.button>
          ) : (
            <motion.button
              key="mic"
              layout
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 22 }}
              onClick={() => setShowAi((v) => !v)}
              className={cn(
                "size-9 rounded-full grid place-items-center transition shrink-0",
                "hover:bg-foreground/5 text-foreground/80",
                showAi && "bg-foreground/10 text-foreground"
              )}
              aria-label="Voice / AI suggestions"
            >
              <Mic className="size-[18px]" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      <AttachmentSheet
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
      />

      <ExpressionsPicker
        open={exprOpen}
        onClose={() => setExprOpen(false)}
        onPick={handleExpression}
        anchorRef={emojiBtnRef}
      />
    </div>
  );
}
