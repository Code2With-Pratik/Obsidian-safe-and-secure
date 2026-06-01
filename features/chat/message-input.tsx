"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Smile, Mic, Sparkles, ArrowUp, Trash2, Play, Pause } from "lucide-react";
import { AttachmentSheet, type AttachmentKind } from "./attachment-sheet";
import {
  CameraCaptureDialog,
  ContactPickerDialog,
  LocationPickerDialog,
  ScheduleMessageDialog,
  PollCreatorDialog
} from "./attachment-dialogs";
import { ExpressionsPicker, type ExpressionPick } from "./expressions-picker";
import { useUIStore } from "@/store/use-ui-store";
import { useChatStore } from "@/store/use-chat-store";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { Message, PollOption } from "@/types";

interface Props {
  chatId: string;
  onSend: (text: string) => void;
  onSendVoice?: (durationSec: number, waveform: number[]) => void;
  onSendAttachment?: (
    payload: Partial<Message> & { kind: Message["kind"]; content?: string }
  ) => void;
  /** Fires when the expressions picker opens or closes so the parent can
   *  scroll the chat to the latest message (since the picker covers the
   *  bottom half on mobile). */
  onPickerToggle?: (open: boolean) => void;
  themeBubbleMe?: string;
  themeAccent?: string;
}

const SUGGESTIONS = [
  "Sounds amazing — let's lock it in",
  "Will check and ping you back 🤝",
  "Could we do that tomorrow morning?"
];

const VIS_BARS = 128; // bars in the live visualiser — dense like WhatsApp

type RecState = "idle" | "recording" | "preview";

export function MessageInput({
  chatId,
  onSend,
  onSendVoice,
  onSendAttachment,
  onPickerToggle,
  themeBubbleMe,
  themeAccent
}: Props) {
  const t = useT();
  const setTyping = useChatStore((s) => s.setTyping);
  const uploadAttachment = useChatStore((s) => s.uploadAttachment);
  const [text, setText] = React.useState("");
  const [showAi, setShowAi] = React.useState(false);

  // Typing is broadcast over Supabase Realtime (see store.initializeRealtime).
  // Each keystroke is a fresh "typing:true" heartbeat — the recipient arms a
  // 2.5s auto-clear, so as long as the sender is actively typing the
  // indicator stays on. We also send an explicit "typing:false" 1.2s after
  // the last keystroke, on blur, on send, and on unmount so the indicator
  // disappears the moment the user stops.
  const typingRef = React.useRef(false);
  const setTypingRef = React.useRef(setTyping);
  React.useEffect(() => {
    setTypingRef.current = setTyping;
  }, [setTyping]);
  const sendStopTyping = React.useCallback(() => {
    if (!typingRef.current) return;
    typingRef.current = false;
    setTypingRef.current(chatId, false);
  }, [chatId]);

  React.useEffect(() => {
    if (!text.trim()) {
      sendStopTyping();
      return;
    }
    typingRef.current = true;
    setTypingRef.current(chatId, true);
    const timeout = setTimeout(() => {
      typingRef.current = false;
      setTypingRef.current(chatId, false);
    }, 1200);
    return () => clearTimeout(timeout);
  }, [text, chatId, sendStopTyping]);

  React.useEffect(() => {
    const cid = chatId;
    return () => {
      if (typingRef.current) {
        typingRef.current = false;
        setTypingRef.current(cid, false);
      }
    };
  }, [chatId]);
  const [attachOpen, setAttachOpen] = React.useState(false);
  const [exprOpen, setExprOpen] = React.useState(false);

  /* ----- attachment dialogs ----- */
  const [cameraOpen, setCameraOpen] = React.useState(false);
  const [contactOpen, setContactOpen] = React.useState(false);
  const [locationOpen, setLocationOpen] = React.useState(false);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [pollOpen, setPollOpen] = React.useState(false);

  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);
  const docInputRef = React.useRef<HTMLInputElement>(null);
  const audioInputRef = React.useRef<HTMLInputElement>(null);

  const onFile = (kind: "photo" | "video" | "doc" | "music") =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;
      // Reset the input element early so picking the same file again triggers
      // a fresh change event even if the upload below takes a while.
      e.target.value = "";

      // Upload to the chat-attachments bucket so the *recipient* can fetch the
      // file. URL.createObjectURL() blobs are local to the sender's browser and
      // appear as dead links on the other side.
      const uploads = await Promise.all(
        files.map(async (f) => {
          const url = await uploadAttachment(f);
          return url ? { file: f, url } : null;
        })
      );
      const ok = uploads.filter((u): u is { file: File; url: string } => !!u);
      if (ok.length === 0) return;

      if (kind === "photo") {
        // Batch every selected image into one message → WhatsApp-style grid.
        const media = ok.map(({ file, url }) => ({
          url,
          alt: file.name,
          mime: file.type
        }));
        onSendAttachment?.({ kind: "image", media });
      } else if (kind === "video") {
        // Same for videos.
        const media = ok.map(({ file, url }) => ({
          url,
          alt: file.name,
          mime: file.type
        }));
        onSendAttachment?.({ kind: "video", media });
      } else if (kind === "music") {
        ok.forEach(({ file, url }) =>
          onSendAttachment?.({
            kind: "audio",
            audio: { url, name: file.name, size: file.size }
          })
        );
      } else {
        ok.forEach(({ file, url }) =>
          onSendAttachment?.({
            kind: "file",
            file: {
              url,
              name: file.name,
              size: file.size,
              mime: file.type
            }
          })
        );
      }
    };

  const handleAttach = (id: AttachmentKind) => {
    switch (id) {
      case "photo":
        photoInputRef.current?.click();
        break;
      case "video":
        videoInputRef.current?.click();
        break;
      case "doc":
        docInputRef.current?.click();
        break;
      case "music":
        audioInputRef.current?.click();
        break;
      case "camera":
        setCameraOpen(true);
        break;
      case "contact":
        setContactOpen(true);
        break;
      case "location":
        setLocationOpen(true);
        break;
      case "schedule":
        setScheduleOpen(true);
        break;
      case "poll":
        setPollOpen(true);
        break;
    }
  };

  // Notify parent so the chat thread can scroll to bottom whenever the
  // picker's visibility changes (the mobile picker takes ~52dvh).
  React.useEffect(() => {
    onPickerToggle?.(exprOpen);
  }, [exprOpen, onPickerToggle]);
  const [focused, setFocused] = React.useState(false);
  const setAi = useUIStore((s) => s.setAiAssistantOpen);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const liftAbovePicker = exprOpen && !isDesktop;
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const emojiBtnRef = React.useRef<HTMLButtonElement>(null);

  /* ---------------------- voice recording ---------------------- */
  const [rec, setRec] = React.useState<RecState>("idle");
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const [bars, setBars] = React.useState<number[]>(() =>
    Array.from({ length: VIS_BARS }, () => 0.08)
  );
  const [savedWave, setSavedWave] = React.useState<number[]>([]);
  const [savedDuration, setSavedDuration] = React.useState(0); // seconds
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = React.useState(false);
  const [previewProgress, setPreviewProgress] = React.useState(0);

  // Refs
  const streamRef = React.useRef<MediaStream | null>(null);
  const ctxRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<BlobPart[]>([]);
  const rafRef = React.useRef<number | null>(null);
  const startedAtRef = React.useRef<number>(0);
  const waveformRef = React.useRef<number[]>([]);
  const lastSampleAtRef = React.useRef<number>(0);
  const timerRef = React.useRef<number | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const stopAnalyser = React.useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (ctxRef.current && ctxRef.current.state !== "closed") {
      ctxRef.current.close().catch(() => {});
    }
    ctxRef.current = null;
    analyserRef.current = null;
  }, []);

  const resetAll = React.useCallback(() => {
    stopAnalyser();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setSavedWave([]);
    setSavedDuration(0);
    setPreviewPlaying(false);
    setPreviewProgress(0);
    setBars(Array.from({ length: VIS_BARS }, () => 0.08));
    setElapsedMs(0);
    waveformRef.current = [];
    chunksRef.current = [];
    recorderRef.current = null;
    setRec("idle");
  }, [audioUrl, stopAnalyser]);

  const finalisedWaveform = React.useCallback(() => {
    const target = 32;
    let wf = waveformRef.current.slice();
    if (wf.length > target) {
      const step = wf.length / target;
      wf = Array.from({ length: target }, (_, i) => {
        const start = Math.floor(i * step);
        const end = Math.floor((i + 1) * step);
        const slice = wf.slice(start, end);
        return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : 0.2;
      });
    } else if (wf.length === 0) {
      wf = Array.from({ length: target }, () => 0.2);
    } else {
      while (wf.length < target) wf.push(wf[wf.length - 1] ?? 0.3);
    }
    const max = Math.max(0.05, ...wf);
    return wf.map((v) => Math.max(0.12, Math.min(1, v / max)));
  }, []);

  const stopRecording = React.useCallback(() => {
    // Move from recording → preview
    const durationSec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    const wf = finalisedWaveform();
    stopAnalyser();

    const r = recorderRef.current;
    if (r && r.state !== "inactive") {
      r.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: r.mimeType || "audio/webm"
        });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };
      r.stop();
    }

    setSavedDuration(durationSec);
    setSavedWave(wf);
    setRec("preview");
  }, [finalisedWaveform, stopAnalyser]);

  const cancelRecording = React.useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") {
      r.onstop = null;
      try {
        r.stop();
      } catch {}
    }
    resetAll();
  }, [resetAll]);

  const sendVoice = React.useCallback(() => {
    if (rec !== "preview") return;
    onSendVoice?.(savedDuration, savedWave);
    resetAll();
  }, [onSendVoice, rec, resetAll, savedDuration, savedWave]);

  const startRecording = React.useCallback(() => {
    if (rec !== "idle") return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;

    // ---- 1. SYNCHRONOUSLY (still inside the click's user-gesture) ----
    // iOS Safari requires AudioContext + .resume() to run inside the user
    // gesture; if we await anything first the gesture is lost and the
    // context stays suspended. So we create + resume up front, BEFORE
    // requesting the mic stream.
    const AudioCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    ctxRef.current = ctx;
    // resume() returns a promise but kicking it off is what unlocks iOS
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    // Flip UI immediately so tap feels instant, even before the mic
    // permission prompt resolves.
    startedAtRef.current = Date.now();
    lastSampleAtRef.current = 0;
    waveformRef.current = [];
    setBars(Array.from({ length: VIS_BARS }, () => 0.08));
    setElapsedMs(0);
    setRec("recording");

    // ---- 2. ASYNC: request the mic ----
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        // If user already cancelled while permission prompt was open, bail.
        if (ctxRef.current !== ctx) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512; // smaller fft = faster first read
        analyser.smoothingTimeConstant = 0.6;
        analyserRef.current = analyser;
        source.connect(analyser);

        // Record blob for playback — no mime type so iOS picks audio/mp4
        chunksRef.current = [];
        try {
          const mr = new MediaRecorder(stream);
          mr.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
          };
          recorderRef.current = mr;
          mr.start();
        } catch {
          recorderRef.current = null;
        }

        // Reset the clock to *now* so the visible timer matches the audio
        startedAtRef.current = Date.now();
        setElapsedMs(0);

        timerRef.current = window.setInterval(() => {
          setElapsedMs(Date.now() - startedAtRef.current);
        }, 100);

        const buffer = new Uint8Array(analyser.fftSize);
        let lastBarPushAt = 0;
        const tick = () => {
          const a = analyserRef.current;
          if (!a) return;
          a.getByteTimeDomainData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) {
            const v = (buffer[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buffer.length);
          const level = Math.min(1, Math.pow(rms * 2.4, 0.85));

          const now = performance.now();
          if (now - lastBarPushAt > 33) {
            setBars((prev) => {
              const next = prev.slice(1);
              next.push(Math.max(0.08, level));
              return next;
            });
            lastBarPushAt = now;
          }
          if (now - lastSampleAtRef.current > 80) {
            waveformRef.current.push(level);
            lastSampleAtRef.current = now;
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => {
        // permission denied / no mic / cancelled — silently roll back
        resetAll();
      });
  }, [rec, resetAll]);

  // cleanup
  React.useEffect(() => stopAnalyser, [stopAnalyser]);

  // global key handler while recording / preview
  React.useEffect(() => {
    if (rec === "idle") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (rec === "recording") stopRecording();
        else sendVoice();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelRecording();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rec, stopRecording, sendVoice, cancelRecording]);

  /* ---------------------- preview playback ---------------------- */
  const togglePreview = React.useCallback(() => {
    if (!audioUrl) return;
    let el = audioRef.current;
    if (!el) {
      el = new Audio(audioUrl);
      audioRef.current = el;
      el.addEventListener("timeupdate", () => {
        if (!el) return;
        const dur = el.duration && isFinite(el.duration) ? el.duration : savedDuration;
        setPreviewProgress(dur > 0 ? Math.min(1, el.currentTime / dur) : 0);
      });
      el.addEventListener("ended", () => {
        setPreviewPlaying(false);
        setPreviewProgress(0);
        if (audioRef.current) audioRef.current.currentTime = 0;
      });
    }
    if (previewPlaying) {
      el.pause();
      setPreviewPlaying(false);
    } else {
      void el.play().then(() => setPreviewPlaying(true)).catch(() => {});
    }
  }, [audioUrl, previewPlaying, savedDuration]);

  /* ---------------------- expressions / send ---------------------- */
  const handleExpression = (pick: ExpressionPick) => {
    if (pick.kind === "emoji") {
      setText((t) => t + pick.value);
      ref.current?.focus();
      return;
    }
    if (pick.kind === "gif") {
      onSendAttachment?.({
        kind: "gif",
        gif: { src: pick.gif.src, alt: pick.gif.alt }
      });
    } else if (pick.kind === "sticker") {
      if (pick.sticker.emoji) {
        // bundled sticker — just send the emoji as text
        onSend(pick.sticker.emoji);
      } else if (pick.sticker.src) {
        onSendAttachment?.({
          kind: "sticker",
          sticker: { src: pick.sticker.src, alt: pick.sticker.alt }
        });
      }
    } else if (pick.kind === "meme") {
      onSendAttachment?.({
        kind: "image",
        media: [{ url: pick.meme.src, alt: pick.meme.caption }],
        content: pick.meme.caption
      });
    }
    setExprOpen(false);
  };

  const send = () => {
    if (rec === "recording") {
      stopRecording();
      return;
    }
    if (rec === "preview") {
      sendVoice();
      return;
    }
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
    sendStopTyping();
    ref.current?.focus();
  };

  React.useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "0px";
    ref.current.style.height = Math.min(160, ref.current.scrollHeight) + "px";
  }, [text]);

  const hasText = text.trim().length > 0;
  const isVoiceMode = rec !== "idle";

  const mmss = React.useMemo(() => {
    const s = Math.floor(elapsedMs / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, "0")}`;
  }, [elapsedMs]);

  const previewMmss = React.useMemo(() => {
    const remaining = Math.max(0, Math.ceil(savedDuration * (1 - previewProgress)));
    const m = Math.floor(remaining / 60);
    return `${m}:${(remaining % 60).toString().padStart(2, "0")}`;
  }, [savedDuration, previewProgress]);

  return (
    <div
      data-keep-picker-open
      className={cn(
        "relative px-3 md:px-4 pt-2 pb-3",
        liftAbovePicker &&
          "fixed inset-x-0 bottom-[52dvh] z-[202] transition-[bottom] duration-200"
      )}
    >
      <AnimatePresence>
        {showAi && !hasText && !isVoiceMode && (
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
          "relative flex items-end gap-1 pl-1.5 pr-1 py-1 rounded-3xl",
          "glass glass-specular border border-white/15 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.4)]",
          focused && !isVoiceMode && "ring-2 ring-cyan-400/50",
          rec === "recording" && "ring-2 ring-rose-400/60",
          rec === "preview" && "ring-2 ring-cyan-400/60"
        )}
      >
        {/* Left: + / trash */}
        <motion.button
          whileTap={{ scale: 0.9, rotate: isVoiceMode ? 0 : 45 }}
          onClick={() => {
            if (isVoiceMode) {
              cancelRecording();
              return;
            }
            // Emoji + attachment are mutually exclusive — opening one closes
            // the other.
            setExprOpen(false);
            setAttachOpen(true);
          }}
          className={cn(
            "size-10 rounded-full grid place-items-center transition shrink-0",
            "hover:bg-foreground/10 text-foreground dark:text-white",
            attachOpen && !isVoiceMode && "bg-foreground/10 rotate-45",
            isVoiceMode && "text-rose-400 hover:bg-rose-400/15"
          )}
          aria-label={isVoiceMode ? "Discard voice" : "Attach"}
        >
          {isVoiceMode ? <Trash2 className="size-[20px]" /> : <Plus className="size-[22px]" />}
        </motion.button>

        {/* Center: textarea / recording strip / preview strip */}
        <div className="relative flex-1 min-w-0">
          {rec === "recording" ? (
            <RecordingStrip elapsed={mmss} bars={bars} />
          ) : rec === "preview" ? (
            <PreviewStrip
              elapsed={previewMmss}
              waveform={savedWave}
              progress={previewProgress}
              playing={previewPlaying}
              onToggle={togglePreview}
              canPlay={!!audioUrl}
            />
          ) : (
            <>
              <textarea
                ref={ref}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                  setFocused(false);
                  sendStopTyping();
                }}
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
                className="peer block w-full bg-transparent text-[15px] outline-none resize-none min-h-10 py-2.5 max-h-40 leading-snug break-words overflow-y-auto no-scrollbar"
              />
              {!hasText && (
                <div className="pointer-events-none absolute inset-y-0 left-0 right-2 flex items-center text-[15px] leading-snug text-muted-foreground/60">
                  <span className="truncate block">{t("Message")}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Emoji button — hidden in voice modes */}
        {!isVoiceMode && (
          <button
            ref={emojiBtnRef}
            onClick={() => {
              setAttachOpen(false);
              setExprOpen((v) => !v);
            }}
            className={cn(
              "size-10 rounded-full grid place-items-center hover:bg-foreground/10 text-foreground dark:text-white transition shrink-0",
              exprOpen && "bg-foreground/10"
            )}
            aria-label="Emoji, GIFs, stickers, memes"
          >
            <Smile className="size-[22px]" />
          </button>
        )}

        {/* Right action button */}
        <AnimatePresence initial={false} mode="popLayout">
          {rec === "recording" ? (
            <motion.button
              key="stop-rec"
              layout
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 22 }}
              onClick={stopRecording}
              className="size-10 rounded-full grid place-items-center text-white shrink-0 bg-gradient-to-br from-rose-500 to-pink-600 shadow-[0_6px_22px_-4px_rgba(244,63,94,0.6)]"
              aria-label="Stop recording"
            >
              <span className="size-3 rounded-sm bg-white" />
            </motion.button>
          ) : rec === "preview" ? (
            <motion.button
              key="send-voice"
              layout
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 22 }}
              onClick={sendVoice}
              className={cn(
                "size-10 rounded-full grid place-items-center text-white shrink-0",
                !themeAccent &&
                  "bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 shadow-[0_6px_22px_-4px_rgba(34,211,238,0.7)]"
              )}
              style={
                themeAccent
                  ? {
                      background: `linear-gradient(135deg, ${themeAccent}, color-mix(in srgb, ${themeAccent} 70%, black))`,
                      boxShadow: `0 6px 22px -4px ${themeAccent}cc`
                    }
                  : undefined
              }
              aria-label="Send voice message"
            >
              <ArrowUp className="size-[22px]" strokeWidth={2.5} />
            </motion.button>
          ) : hasText ? (
            <motion.button
              key="send"
              layout
              initial={{ scale: 0.6, opacity: 0, rotate: -30 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.6, opacity: 0, rotate: 30 }}
              transition={{ type: "spring", stiffness: 360, damping: 22 }}
              onClick={send}
              className={cn(
                "size-10 rounded-full grid place-items-center text-white shrink-0",
                !themeAccent &&
                  "bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 shadow-[0_6px_22px_-4px_rgba(34,211,238,0.7)]"
              )}
              style={
                themeAccent
                  ? {
                      background: `linear-gradient(135deg, ${themeAccent}, color-mix(in srgb, ${themeAccent} 70%, black))`,
                      boxShadow: `0 6px 22px -4px ${themeAccent}cc`
                    }
                  : undefined
              }
              aria-label="Send"
            >
              <ArrowUp className="size-[22px]" strokeWidth={2.5} />
            </motion.button>
          ) : (
            <motion.button
              key="mic"
              layout
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 22 }}
              onClick={() => void startRecording()}
              className={cn(
                "size-10 rounded-full grid place-items-center transition shrink-0",
                "hover:bg-foreground/10 text-foreground dark:text-white"
              )}
              aria-label="Record voice message"
            >
              <Mic className="size-[22px]" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      <AttachmentSheet
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        onPick={(id) => {
          setAttachOpen(false);
          handleAttach(id);
        }}
      />

      <ExpressionsPicker
        open={exprOpen}
        onClose={() => setExprOpen(false)}
        onPick={handleExpression}
        anchorRef={emojiBtnRef}
      />

      {/* Hidden file inputs — triggered by the AttachmentSheet picks */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={onFile("photo")}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        multiple
        hidden
        onChange={onFile("video")}
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
        multiple
        hidden
        onChange={onFile("doc")}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        multiple
        hidden
        onChange={onFile("music")}
      />

      <CameraCaptureDialog
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(dataUrl) => {
          onSendAttachment?.({
            kind: "image",
            media: [{ url: dataUrl, alt: "Camera capture", mime: "image/jpeg" }]
          });
        }}
      />

      <ContactPickerDialog
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        onPick={(contacts) => {
          onSendAttachment?.({ kind: "contact", contacts });
        }}
      />

      <LocationPickerDialog
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        onPick={(loc) => {
          onSendAttachment?.({
            kind: "location",
            location: { lat: loc.lat, lng: loc.lng, live: loc.live }
          });
        }}
      />

      <ScheduleMessageDialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSchedule={(when, message) => {
          // Schedule a *regular text* to deliver at `when` — pg_cron flips
          // status='scheduled' → 'sent' so recipients only see it then.
          onSendAttachment?.({
            kind: "text",
            content: message,
            scheduleAt: when.toISOString()
          });
        }}
      />

      <PollCreatorDialog
        open={pollOpen}
        onClose={() => setPollOpen(false)}
        onCreate={(poll) => {
          const options: PollOption[] = poll.options.map((text, i) => ({
            id: `o-${i}-${Math.random().toString(36).slice(2, 6)}`,
            text,
            voters: []
          }));
          onSendAttachment?.({
            kind: "poll",
            poll: {
              question: poll.question,
              imageUrl: poll.imageUrl,
              options,
              multi: poll.multi
            }
          });
        }}
      />
    </div>
  );
}

/** Live recording UI rendered in place of the textarea. */
function RecordingStrip({
  elapsed,
  bars
}: {
  elapsed: string;
  bars: number[];
}) {
  return (
    <div className="flex items-center gap-2 min-h-10 py-1.5 pr-2">
      <motion.span
        className="size-2 rounded-full bg-rose-500 shrink-0"
        animate={{ opacity: [1, 0.25, 1] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <span className="text-[12px] font-mono tabular-nums text-rose-400 shrink-0 w-10">
        {elapsed}
      </span>
      <Waveform bars={bars} color="rgb(251 113 133 / 0.9)" />
    </div>
  );
}

/** Preview-before-send UI: play/pause + waveform with progress. */
function PreviewStrip({
  elapsed,
  waveform,
  progress,
  playing,
  onToggle,
  canPlay
}: {
  elapsed: string;
  waveform: number[];
  progress: number;
  playing: boolean;
  onToggle: () => void;
  canPlay: boolean;
}) {
  return (
    <div className="flex items-center gap-2 min-h-10 py-1.5 pr-2">
      <button
        onClick={onToggle}
        disabled={!canPlay}
        className={cn(
          "size-7 rounded-full grid place-items-center shrink-0 transition active:scale-95",
          canPlay ? "bg-cyan-400/20 text-cyan-300 hover:bg-cyan-400/30" : "bg-foreground/10 text-muted-foreground"
        )}
        aria-label={playing ? "Pause preview" : "Play preview"}
      >
        {playing ? <Pause className="size-3" /> : <Play className="size-3 ml-0.5" />}
      </button>
      <span className="text-[12px] font-mono tabular-nums text-cyan-400 shrink-0 w-10">
        {elapsed}
      </span>
      <Waveform
        bars={waveform}
        color="rgb(34 211 238)"
        progress={progress}
      />
    </div>
  );
}

/** Linear-interpolate `arr` to exactly `target` samples so the SVG below has
 *  a consistent shape no matter how many input samples it gets (live = 128,
 *  saved waveform = 32, etc). */
function resample(arr: number[], target: number): number[] {
  if (arr.length === 0) return Array.from({ length: target }, () => 0.12);
  if (arr.length === target) return arr;
  const out: number[] = [];
  const last = arr.length - 1;
  for (let i = 0; i < target; i++) {
    const srcIdx = last === 0 ? 0 : (i / (target - 1)) * last;
    const lo = Math.floor(srcIdx);
    const hi = Math.min(last, Math.ceil(srcIdx));
    const t = srcIdx - lo;
    out.push(arr[lo] * (1 - t) + arr[hi] * t);
  }
  return out;
}

/** WhatsApp-style waveform — many thin bars, mirrored around centre, with a
 *  large viewBox so SVG's preserveAspectRatio="none" stretches x/y by similar
 *  factors and the bars stay visually thin instead of bloating into ovals. */
function Waveform({
  bars,
  color,
  progress
}: {
  bars: number[];
  color: string;
  progress?: number; // 0..1 — when set, bars after the playhead fade out
}) {
  // Always render exactly 128 bars regardless of input length — this keeps
  // the viewBox shape (and therefore bar visual thickness) constant for both
  // the 128-sample live ring buffer and the 32-sample saved waveform.
  const TARGET = 128;
  const data = React.useMemo(() => resample(bars, TARGET), [bars]);
  const N = data.length;
  const stride = 5;
  const barWidth = 1;
  const vbWidth = (N - 1) * stride + barWidth;
  const vbHeight = 40;
  const cy = vbHeight / 2;
  const minH = vbHeight * 0.12; // small silence floor — looks like a real waveform
  const playedIdx = progress != null ? Math.floor(progress * N) : N;

  return (
    <svg
      role="img"
      aria-hidden
      preserveAspectRatio="none"
      viewBox={`0 0 ${vbWidth} ${vbHeight}`}
      className="flex-1 min-w-0 h-7 overflow-visible"
    >
      {data.map((h, i) => {
        const barH = Math.max(minH, Math.min(vbHeight, h * vbHeight));
        const x = i * stride;
        const y = cy - barH / 2;
        const isPlayed = i < playedIdx;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={barH}
            rx={barWidth / 2}
            fill={color}
            opacity={isPlayed ? 1 : 0.45}
            style={{ transition: "y 90ms linear, height 90ms linear, opacity 120ms linear" }}
          />
        );
      })}
    </svg>
  );
}
