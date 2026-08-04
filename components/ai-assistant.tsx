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
  Volume2,
  VolumeX,
  Mic,
  Square,
  Loader2,
  Wrench
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
import { useT } from "@/lib/i18n";
import { useAIChat } from "@/features/ai/use-ai-chat";
import { useAIVoice } from "@/features/ai/use-ai-voice";
import type { AIMessage } from "@/features/ai/types";

/** Where the "Voice responses" toggle is persisted. Lives in localStorage
 *  so it survives reload without bloating the settings store. Default is
 *  ON — the user enabled voice mode by configuring ElevenLabs, so we
 *  treat that as opt-in already; they can flip it off via the header
 *  speaker button or the gear menu.
 *
 *  The "-v2" suffix is a deliberate one-time bump: the previous version
 *  defaulted to OFF, so existing users had "0" persisted. Renaming the
 *  key forces the new ON default to take effect for them.
 */
const VOICE_TTS_KEY = "obsidian-ai-voice-tts-v2";

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
  { icon: <Mail />, label: "Read my notifications" },
  { icon: <Plane />, label: "What happened while I was offline?" },
  { icon: <Lightbulb />, label: "Show trending communities" },
  { icon: <GraduationCap />, label: "Summarize this chat" },
  { icon: <Compass />, label: "Open whiteboard" },
  { icon: <Sparkles />, label: "Find files shared today" },
  { icon: <FileText />, label: "Search for invoice PDFs" },
  { icon: <Music />, label: "Open my vault" },
  { icon: <CalendarClock />, label: "Show my recent calls" },
  { icon: <ImageIcon />, label: "Search for images" },
  { icon: <Languages />, label: "Open my profile" },
  { icon: <Code2 />, label: "What can I do in Ghost Rooms?" }
];

export function AIAssistant() {
  const t = useT();
  const open = useUIStore((s) => s.aiAssistantOpen);
  const setOpen = useUIStore((s) => s.setAiAssistantOpen);
  const user = useAuthStore((s) => s.user);
  const [text, setText] = React.useState("");
  const [tagline, setTagline] = React.useState(MASCOT_LINES[0]);

  // Voice TTS preference — persisted in localStorage so user choice survives.
  // Defaults to ON: the user explicitly configured ElevenLabs, so we
  // assume they want to hear replies unless they opt out.
  const [ttsEnabled, setTtsEnabled] = React.useState(true);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(VOICE_TTS_KEY);
    if (stored !== null) setTtsEnabled(stored === "1");
  }, []);
  const toggleTts = React.useCallback(() => {
    setTtsEnabled((v) => {
      const next = !v;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(VOICE_TTS_KEY, next ? "1" : "0");
      }
      return next;
    });
  }, []);

  // Refs to break the chicken-and-egg between the two hooks: voice's
  // STT callback wants to call chat.send, and chat's onAssistantReply
  // wants to call voice.speak. Both are declared via hook returns below.
  // We stash refs here, populate them after both hooks resolve, and the
  // callbacks read through the refs at event-firing time.
  const sendRef = React.useRef<(text: string) => void>(() => {});
  const speakRef = React.useRef<(text: string) => void>(() => {});

  // Single error string surfaced just above the composer when TTS fails
  // (bad key, blocked autoplay, etc.). Clears after 6s or on next send.
  const [ttsError, setTtsError] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!ttsError) return;
    const id = setTimeout(() => setTtsError(null), 6000);
    return () => clearTimeout(id);
  }, [ttsError]);

  const voice = useAIVoice({
    ttsEnabled,
    onFinalTranscript: (transcript) => {
      // Treat a final transcript as a sent message — the bubble appears
      // directly without intermediate composer edits.
      sendRef.current(transcript);
    },
    onTtsError: (msg) => setTtsError(msg)
  });

  const chat = useAIChat({
    onAssistantReply: (final) => {
      // Pipe the assistant's final spoken text into ElevenLabs. The voice
      // hook is a no-op if ttsEnabled is false.
      speakRef.current(final);
    }
  });

  // Wire the refs after both hooks have resolved.
  sendRef.current = (t) => void chat.send(t);
  speakRef.current = (t) => void voice.speak(t);

  // Rotate tagline under the mascot
  React.useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      setTagline(MASCOT_LINES[Math.floor(Math.random() * MASCOT_LINES.length)]);
    }, 3200);
    return () => clearInterval(id);
  }, [open]);

  // Close the popup → stop any in-flight stream + cancel any audio so we
  // don't end up with the assistant speaking after the popup is closed.
  React.useEffect(() => {
    if (!open) {
      chat.stop();
      voice.stopListening();
      voice.stopSpeaking();
    }
    // We intentionally only react to `open`. Calling stop functions on
    // every render would race with normal speech playback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const firstName = (user?.name ?? "Aria").split(" ")[0];
  const empty = chat.messages.length === 0;

  const send = (incoming?: string) => {
    const trimmed = (incoming ?? text).trim();
    if (!trimmed) return;
    setText("");
    // Cancel any in-progress speech — the user gave us new input.
    voice.stopSpeaking();
    void chat.send(trimmed);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] md:inset-x-auto md:right-6 md:bottom-6 z-[90] w-auto md:w-[420px] h-[min(82dvh,720px)] glass-strong glass-specular rounded-[32px] shadow-floating border border-white/20 flex flex-col overflow-hidden"
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
              <div className="font-display font-semibold tracking-tight">Obsidian AI</div>
              {chat.isStreaming && (
                <span className="ml-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-foreground/60">
                  <Loader2 className="size-3 animate-spin" />
                  {t("thinking")}
                </span>
              )}
              {voice.speaking && !chat.isStreaming && (
                <span className="ml-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-violet-300">
                  <Volume2 className="size-3 animate-pulse" />
                  {t("speaking")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Header speaker toggle — visible 1-tap on/off for voice
                  replies. The same state is mirrored in the gear menu's
                  "Voice responses" item. */}
              <button
                onClick={toggleTts}
                aria-label={ttsEnabled ? t("Mute voice replies") : t("Enable voice replies")}
                title={ttsEnabled ? t("Voice replies on") : t("Voice replies off")}
                className={cn(
                  "size-9 rounded-full grid place-items-center transition",
                  ttsEnabled
                    ? "glass-subtle text-foreground hover:bg-foreground/5"
                    : "glass-subtle text-foreground/40 hover:bg-foreground/5"
                )}
              >
                {ttsEnabled ? (
                  <Volume2 className="size-4" />
                ) : (
                  <VolumeX className="size-4" />
                )}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="size-9 rounded-full glass-subtle grid place-items-center hover:bg-foreground/5"
                    aria-label={t("Settings")}
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
                    Obsidian AI · {t("session")}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => chat.reset()}>
                    <MessageSquarePlus />
                    {t("New chat")}
                    <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      if (typeof navigator !== "undefined" && "share" in navigator) {
                        navigator
                          .share({
                            title: "Obsidian AI conversation",
                            text: chat.messages
                              .map((m) => `${m.role}: ${m.content}`)
                              .join("\n\n")
                          })
                          .catch(() => {});
                      }
                    }}
                  >
                    <Share2 />
                    {t("Share transcript")}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <History />
                    {t("Chat history")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); toggleTts(); }}>
                    {ttsEnabled ? <Volume2 /> : <VolumeX />}
                    {t("Voice responses")}
                    <DropdownMenuShortcut>{ttsEnabled ? t("On") : t("Off")}</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Bell />
                    {t("Suggestion alerts")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => chat.reset()}
                    className="text-rose-400 focus:text-rose-400"
                  >
                    <Trash2 />
                    {t("Delete chat history")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                onClick={() => setOpen(false)}
                className="size-9 rounded-full glass-subtle grid place-items-center hover:bg-foreground/5"
                aria-label={t("Close")}
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
              <Conversation messages={chat.messages} />
            )}

            <PresetRail
              onPick={(label) => {
                send(label);
              }}
            />
          </div>

          {/* TTS error banner — shown right above the composer when
              ElevenLabs fails (bad key, no quota, blocked autoplay, etc.). */}
          {ttsError && (
            <div className="mx-3 mb-1 px-3 py-2 rounded-2xl text-[12px] leading-snug bg-rose-500/15 border border-rose-300/30 text-rose-100">
              <span className="font-semibold">{t("Voice")}: </span>
              {ttsError}
            </div>
          )}

          {/* Composer */}
          <Composer
            value={text}
            onChange={setText}
            onSend={() => send()}
            voiceSupported={voice.supported}
            listening={voice.listening}
            interimText={voice.interimText}
            onMicToggle={() => {
              if (voice.listening) voice.stopListening();
              else voice.startListening();
            }}
            isStreaming={chat.isStreaming}
            onAbort={chat.stop}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Greeting (empty state) ---------- */

function Greeting({ firstName, tagline }: { firstName: string; tagline: string }) {
  const t = useT();
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="text-center pt-1 pb-3">
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {t("AI assistant")}
        </span>
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="px-6 text-2xl md:text-[28px] leading-tight font-display font-semibold tracking-tight text-center text-balance"
      >
        {t("Hello")} {firstName},<br />
        {t("How can I help you today?")}
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
            {t(tagline)}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------- Conversation (after first message) ---------- */

function Conversation({ messages }: { messages: AIMessage[] }) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // Scroll to bottom after the new message lays out — instant beats smooth here so
    // the latest bubble is always visible before the chip rail / composer.
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages.length, messages[messages.length - 1]?.content?.length]);

  return (
    <div className="relative z-10 flex-1 min-h-0 overflow-hidden flex flex-col">
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto no-scrollbar px-4 pt-3 pb-2 space-y-2"
      >
        {messages
          // Tool result messages are model-facing only — never render them
          // as bubbles. We surface the tool *call* instead via a chip on the
          // assistant bubble that emitted it.
          .filter((m) => m.role !== "tool")
          .map((m) => (
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
                {/* Tool call chips — small badges above the text so the
                    user sees WHAT the assistant decided to do. */}
                {m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {m.toolCalls.map((tc) => (
                      <span
                        key={tc.id}
                        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-foreground/80"
                      >
                        <Wrench className="size-2.5" />
                        {tc.name}
                      </span>
                    ))}
                  </div>
                )}
                {m.content || (
                  m.streaming ? (
                    <span className="inline-flex gap-1 items-center text-foreground/60">
                      <Loader2 className="size-3 animate-spin" />
                    </span>
                  ) : null
                )}
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
  const t = useT();
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
            onClick={() => onPick(t(c.label))}
            className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-full glass border border-white/15 hover:bg-foreground/[0.06] transition shadow-[0_4px_16px_-6px_rgba(0,0,0,0.25)]"
          >
            <span className="size-6 rounded-full grid place-items-center [&_svg]:size-3.5 text-foreground/80">
              {c.icon}
            </span>
            <span className="text-[12.5px] font-medium whitespace-nowrap">{t(c.label)}</span>
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
  onSend,
  voiceSupported,
  listening,
  interimText,
  onMicToggle,
  isStreaming,
  onAbort
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  voiceSupported: boolean;
  listening: boolean;
  interimText: string;
  onMicToggle: () => void;
  isStreaming: boolean;
  onAbort: () => void;
}) {
  const t = useT();
  const ref = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "0px";
    ref.current.style.height = Math.min(120, ref.current.scrollHeight) + "px";
  }, [value]);

  const hasText = value.trim().length > 0;

  return (
    <div className="px-3 pb-3 pt-1">
      {/* Interim transcript banner — shows the user what the recognizer
          is hearing live while listening. Disappears as soon as the
          phrase commits. */}
      {listening && interimText && (
        <div className="mb-2 px-3 py-1.5 rounded-full bg-violet-500/15 border border-violet-300/30 text-[12.5px] text-foreground/85 text-center">
          {interimText}
        </div>
      )}
      <div className="flex items-center gap-1 pl-1.5 pr-1 py-1 rounded-full glass glass-specular border border-white/20 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.4)]">
        {voiceSupported ? (
          <button
            onClick={onMicToggle}
            aria-label={listening ? t("Stop listening") : t("Voice input")}
            className={cn(
              "size-9 rounded-full grid place-items-center transition",
              listening
                ? "bg-rose-500 text-white shadow-[0_0_0_4px_rgba(244,63,94,0.25)] animate-pulse"
                : "hover:bg-foreground/5 text-foreground/70"
            )}
          >
            <Mic className="size-[18px]" />
          </button>
        ) : (
          <button
            aria-label={t("Attach")}
            className="size-9 rounded-full grid place-items-center hover:bg-foreground/5 text-foreground/70"
          >
            <Plus className="size-[18px]" />
          </button>
        )}
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
              {listening ? t("Listening…") : t("Got Questions...")}
            </div>
          )}
        </div>
        {isStreaming ? (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onAbort}
            aria-label={t("Stop")}
            className="size-9 rounded-full grid place-items-center text-white bg-gradient-to-br from-rose-400 to-rose-600 shadow-[0_6px_22px_-4px_rgba(244,63,94,0.7)]"
          >
            <Square className="size-[16px]" strokeWidth={2.5} />
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onSend}
            className={cn(
              "size-9 rounded-full grid place-items-center text-white shadow-[0_6px_22px_-4px_rgba(34,211,238,0.7)] transition",
              hasText
                ? "bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600"
                : "bg-gradient-to-br from-pink-400/60 to-pink-500/60"
            )}
            aria-label={t("Send")}
          >
            {hasText ? (
              <ArrowUp className="size-[18px]" strokeWidth={2.5} />
            ) : (
              <Send className="size-[16px]" />
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
}
