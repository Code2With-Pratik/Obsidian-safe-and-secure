"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Send,
  Settings,
  X,
  ArrowUp,
  Plus,
  Mail,
  Plane,
  Lightbulb,
  GraduationCap,
  Sparkles,
  Compass,
  FileText,
  Music,
  CalendarClock,
  Image as ImageIcon,
  Languages,
  Code2,
  Trash2,
  Share2,
  MessageSquarePlus,
  Bell,
  History,
  Volume2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut
} from "@/components/ui/dropdown-menu";
import { useUIStore } from "@/store/use-ui-store";
import { useAuthStore } from "@/store/use-auth-store";
import { NovaMascot } from "@/components/nova-mascot";
import { cn } from "@/lib/utils";

interface Msg {
  id: string;
  role: "user" | "ai";
  text: string;
}

const MASCOT_LINES = [
  "Not bad, not good.",
  "What's on your mind?",
  "Drop a question.",
  "I'm listening.",
  "Try me with anything.",
  "Curious by default.",
  "Pick one below ↓",
  "Or just type ↓"
];

const PRESETS: { icon: React.ReactNode; label: string }[] = [
  { icon: <Mail />, label: "With an email" },
  { icon: <Plane />, label: "Plan a trip" },
  { icon: <Lightbulb />, label: "Tell me a fun fact" },
  { icon: <GraduationCap />, label: "Help me my education" },
  { icon: <Compass />, label: "Exploration" },
  { icon: <Sparkles />, label: "Evolution" },
  { icon: <FileText />, label: "Summarize a doc" },
  { icon: <Music />, label: "Make a playlist" },
  { icon: <CalendarClock />, label: "Schedule something" },
  { icon: <ImageIcon />, label: "Generate an image" },
  { icon: <Languages />, label: "Translate text" },
  { icon: <Code2 />, label: "Help me with code" }
];

export function AIAssistant() {
  const open = useUIStore((s) => s.aiAssistantOpen);
  const setOpen = useUIStore((s) => s.setAiAssistantOpen);
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [text, setText] = React.useState("");
  const [tagline, setTagline] = React.useState(MASCOT_LINES[0]);

  // Rotate tagline under the mascot
  React.useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      setTagline(MASCOT_LINES[Math.floor(Math.random() * MASCOT_LINES.length)]);
    }, 3200);
    return () => clearInterval(id);
  }, [open]);

  const firstName = (user?.name ?? "Aria").split(" ")[0];
  const empty = messages.length === 0;

  const send = (incoming?: string) => {
    const t = (incoming ?? text).trim();
    if (!t) return;
    const u: Msg = { id: `u${Date.now()}`, role: "user", text: t };
    setMessages((m) => [...m, u]);
    setText("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: `a${Date.now()}`,
          role: "ai",
          text:
            "On it — I'll surface relevant threads, suggest replies, and keep you posted. (Demo response — wire this to your model API.)"
        }
      ]);
    }, 700);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
          className="fixed right-4 bottom-4 md:bottom-6 md:right-6 z-[90] w-[min(96vw,420px)] h-[min(86vh,720px)] glass-strong glass-specular rounded-[32px] shadow-floating border border-white/20 flex flex-col overflow-hidden"
        >
          {/* soft pastel halo behind everything */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div
              className="absolute inset-x-0 -top-20 h-72 blur-3xl opacity-90"
              style={{
                background:
                  "radial-gradient(50% 60% at 50% 50%, rgba(244,114,182,0.45), transparent 70%), radial-gradient(40% 50% at 30% 30%, rgba(165,180,252,0.45), transparent 70%), radial-gradient(40% 50% at 70% 60%, rgba(192,132,252,0.40), transparent 70%)"
              }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <motion.div
                animate={{ y: [0, -3, 0, -1.5, 0], rotate: [0, 4, -4, 2, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <NovaMascot size={36} />
              </motion.div>
              <div className="font-display font-semibold tracking-tight">Nova AI</div>
            </div>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="size-9 rounded-full glass-subtle grid place-items-center hover:bg-foreground/5"
                    aria-label="Settings"
                  >
                    <Settings className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={10}
                  className="!w-60 !z-[9999]"
                  style={{ zIndex: 9999 }}
                >
                  <DropdownMenuLabel className="!text-[10px]">
                    Nova AI · session
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setMessages([])}>
                    <MessageSquarePlus />
                    New chat
                    <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      if (typeof navigator !== "undefined" && "share" in navigator) {
                        navigator
                          .share({
                            title: "Nova AI conversation",
                            text: messages.map((m) => `${m.role}: ${m.text}`).join("\n\n")
                          })
                          .catch(() => {});
                      }
                    }}
                  >
                    <Share2 />
                    Share transcript
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <History />
                    Chat history
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Volume2 />
                    Voice responses
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Bell />
                    Suggestion alerts
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => setMessages([])}
                    className="text-rose-400 focus:text-rose-400"
                  >
                    <Trash2 />
                    Delete chat history
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                onClick={() => setOpen(false)}
                className="size-9 rounded-full glass-subtle grid place-items-center hover:bg-foreground/5"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {empty ? (
              <Greeting firstName={firstName} tagline={tagline} />
            ) : (
              <Conversation messages={messages} />
            )}

            <PresetRail
              onPick={(label) => {
                send(label);
              }}
            />
          </div>

          {/* Composer */}
          <Composer
            value={text}
            onChange={setText}
            onSend={() => send()}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Greeting (empty state) ---------- */

function Greeting({ firstName, tagline }: { firstName: string; tagline: string }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="text-center pt-1 pb-3">
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          AI assistant
        </span>
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="px-6 text-2xl md:text-[28px] leading-tight font-display font-semibold tracking-tight text-center text-balance"
      >
        Hello {firstName},<br />
        How can I help you today?
      </motion.h1>

      <div className="relative flex-1 grid place-items-center">
        <NovaMascot size={150} />
        <AnimatePresence mode="wait">
          <motion.p
            key={tagline}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="absolute bottom-3 text-sm font-medium text-foreground/80"
          >
            {tagline}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------- Conversation (after first message) ---------- */

function Conversation({ messages }: { messages: Msg[] }) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // Scroll to bottom after the new message lays out — instant beats smooth here so
    // the latest bubble is always visible before the chip rail / composer.
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages.length]);

  return (
    <div className="relative z-10 flex-1 min-h-0 overflow-hidden flex flex-col">
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto no-scrollbar px-4 pt-3 pb-2 space-y-2"
      >
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-[0_8px_24px_-12px_rgba(0,0,0,0.4)]",
                m.role === "user"
                  ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
                  : "glass-strong text-foreground border border-white/10"
              )}
            >
              {m.text}
            </div>
          </motion.div>
        ))}
        {/* spacer so the last bubble has air above the chip rail */}
        <div className="h-1" />
      </div>
    </div>
  );
}

/* ---------- Sliding preset chip rail (two marquee rows drifting left) ---------- */

function PresetRail({ onPick }: { onPick: (label: string) => void }) {
  const row1 = PRESETS.filter((_, i) => i % 2 === 0);
  const row2 = PRESETS.filter((_, i) => i % 2 === 1);

  return (
    <div className="relative pb-2 pt-1 space-y-1.5">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 z-10 bg-gradient-to-r from-card/90 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 z-10 bg-gradient-to-l from-card/90 to-transparent" />

      <MarqueeRow chips={row1} onPick={onPick} duration={32} />
      <MarqueeRow chips={row2} onPick={onPick} duration={42} reverse />
    </div>
  );
}

function MarqueeRow({
  chips,
  onPick,
  duration,
  reverse
}: {
  chips: { icon: React.ReactNode; label: string }[];
  onPick: (label: string) => void;
  duration: number;
  reverse?: boolean;
}) {
  // Two copies of the chip set so the loop is seamless.
  const loop = [...chips, ...chips];

  return (
    <div className="overflow-hidden group">
      <motion.div
        className="flex gap-2 w-max py-1 group-hover:[animation-play-state:paused]"
        animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{
          duration,
          ease: "linear",
          repeat: Infinity,
          repeatType: "loop"
        }}
        style={{ paddingLeft: 12, paddingRight: 12 }}
        whileHover={{ animationPlayState: "paused" }}
      >
        {loop.map((c, i) => (
          <motion.button
            key={`${c.label}-${i}`}
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onPick(c.label)}
            className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-full glass border border-white/15 hover:bg-foreground/[0.06] transition shadow-[0_4px_16px_-6px_rgba(0,0,0,0.25)]"
          >
            <span className="size-6 rounded-full grid place-items-center [&_svg]:size-3.5 text-foreground/80">
              {c.icon}
            </span>
            <span className="text-[12.5px] font-medium whitespace-nowrap">{c.label}</span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}

/* ---------- Composer ---------- */

function Composer({
  value,
  onChange,
  onSend
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "0px";
    ref.current.style.height = Math.min(120, ref.current.scrollHeight) + "px";
  }, [value]);

  const hasText = value.trim().length > 0;

  return (
    <div className="px-3 pb-3 pt-1">
      <div className="flex items-center gap-1 pl-1.5 pr-1 py-1 rounded-full glass glass-specular border border-white/20 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.4)]">
        <button className="size-9 rounded-full grid place-items-center hover:bg-foreground/5 text-foreground/70">
          <Plus className="size-[18px]" />
        </button>
        <div className="relative flex-1 min-w-0">
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            rows={1}
            placeholder=" "
            className="peer w-full bg-transparent text-[15px] outline-none resize-none py-1.5 max-h-32 leading-snug"
          />
          {!hasText && (
            <div className="pointer-events-none absolute inset-y-0 left-0 right-2 flex items-center text-[14px] text-muted-foreground/60">
              Got Questions...
            </div>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onSend}
          className={cn(
            "size-9 rounded-full grid place-items-center text-white shadow-[0_6px_22px_-4px_rgba(34,211,238,0.7)] transition",
            hasText
              ? "bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600"
              : "bg-gradient-to-br from-sky-400/60 to-blue-500/60"
          )}
          aria-label="Send"
        >
          {hasText ? (
            <ArrowUp className="size-[18px]" strokeWidth={2.5} />
          ) : (
            <Send className="size-[16px]" />
          )}
        </motion.button>
      </div>
    </div>
  );
}
