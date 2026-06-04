"use client";

/**
 *  useAIVoice — voice I/O for Obsidian AI.
 *
 *  STT: browser SpeechRecognition (a.k.a. webkitSpeechRecognition). Free,
 *  zero-latency, browser-native. We expose interim + final transcripts so
 *  the popup can show what the user is saying mid-utterance.
 *
 *  TTS: streamed audio from /api/ai/voice (ElevenLabs proxy). We pipe the
 *  response into an `<audio>` element so playback starts before the full
 *  payload arrives. Calling `speak(text)` while audio is already playing
 *  kills the previous playback first — implements barge-in.
 *
 *  Browser support:
 *    - SpeechRecognition: Chrome / Edge / Safari (with webkit prefix).
 *      Firefox does NOT support it — the hook returns `supported: false`
 *      and the UI shows a fallback "Voice not supported in this browser"
 *      hint instead of the mic button.
 */

import * as React from "react";

interface UseAIVoiceOptions {
  /** Called every time the recognizer commits a final phrase. The
   *  consumer usually pipes this straight into useAIChat.send(). */
  onFinalTranscript?: (text: string) => void;
  /** When true, the assistant's TTS replies are spoken aloud. Defaults
   *  to false; the popup flips this when the user enables voice mode. */
  ttsEnabled?: boolean;
  /** Called when TTS fails — the popup uses this to surface the error
   *  as a visible message so the user knows something's wrong with their
   *  ElevenLabs key/voice id instead of silent failure. */
  onTtsError?: (message: string) => void;
}

// Minimal type — the browser globals aren't in TS's default DOM lib.
interface SR extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((e: Event) => void) | null;
  onresult:
    | ((e: {
        resultIndex: number;
        results: ArrayLike<{
          0: { transcript: string };
          isFinal: boolean;
          length: number;
        }>;
      }) => void)
    | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: ((e: Event) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
interface SRCtor {
  new (): SR;
}

function getRecognitionCtor(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SRCtor;
    webkitSpeechRecognition?: SRCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useAIVoice(opts: UseAIVoiceOptions = {}) {
  const { onFinalTranscript, ttsEnabled = false, onTtsError } = opts;
  // Keep the error callback in a ref so changing it between renders
  // doesn't require us to re-create `speak`.
  const errCbRef = React.useRef<typeof onTtsError>(onTtsError);
  errCbRef.current = onTtsError;

  const [supported, setSupported] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const [interimText, setInterimText] = React.useState("");

  const recognitionRef = React.useRef<SR | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = React.useRef<string | null>(null);

  // Keep the onFinalTranscript callback in a ref so we can reassign it
  // mid-stream without re-binding the recognizer (which would lose the
  // active session).
  const finalCbRef = React.useRef<typeof onFinalTranscript>(onFinalTranscript);
  finalCbRef.current = onFinalTranscript;

  /* ── recognizer init ─────────────────────────────────────────── */

  React.useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";

    rec.onstart = () => setListening(true);

    rec.onresult = (e) => {
      let interim = "";
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (interim) setInterimText(interim);
      if (finalText) {
        setInterimText("");
        finalCbRef.current?.(finalText.trim());
      }
    };

    rec.onerror = (e) => {
      // Common: "no-speech", "aborted", "not-allowed". We don't surface
      // these except to flip the listening flag back off.
      console.warn("[voice] recognizer error:", e.error);
    };

    rec.onend = () => {
      setListening(false);
      setInterimText("");
    };

    recognitionRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch {
        /* harmless */
      }
      recognitionRef.current = null;
    };
  }, []);

  /* ── public API ──────────────────────────────────────────────── */

  const startListening = React.useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec || listening) return;
    try {
      rec.start();
    } catch (err) {
      // Calling start() while a recognition is already active throws an
      // InvalidStateError — safe to ignore.
      console.warn("[voice] start() ignored:", err);
    }
  }, [listening]);

  const stopListening = React.useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      /* harmless */
    }
  }, []);

  /** Stop any in-progress TTS playback (barge-in). */
  const stopSpeaking = React.useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setSpeaking(false);
  }, []);

  /** Speak the given text via ElevenLabs. Idempotent w.r.t. concurrent
   *  calls — earlier playback is cancelled. Returns when audio playback
   *  has actually started (or failed). */
  const speak = React.useCallback(
    async (text: string) => {
      if (!ttsEnabled) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      // Cancel anything currently playing before we kick off a new request.
      stopSpeaking();

      try {
        const res = await fetch("/api/ai/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed })
        });
        if (!res.ok) {
          // Try to extract a structured error first (our route returns
          // JSON on failure), then fall back to plain text.
          let err = `TTS failed (${res.status})`;
          try {
            const body = await res.json();
            if (body?.error) err = body.error;
          } catch {
            err = (await res.text().catch(() => err)) || err;
          }
          console.warn("[voice] TTS request failed:", res.status, err);
          errCbRef.current?.(err);
          return;
        }
        // We buffer the response into a single Blob before playing rather
        // than chaining MediaSource — simpler, and the turbo model returns
        // fast enough (~400-800ms TTFA) that the user-perceived delay is
        // basically the network round-trip.
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;

        if (!audioRef.current) {
          audioRef.current = new Audio();
          audioRef.current.preload = "auto";
        }
        const a = audioRef.current;
        a.src = url;
        a.onplay = () => setSpeaking(true);
        a.onended = () => {
          setSpeaking(false);
          if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
          }
        };
        a.onerror = () => setSpeaking(false);
        await a.play().catch((err) => {
          // Browsers block auto-play without a user gesture in the chain.
          // The "send" click should normally satisfy that, but if it
          // doesn't we surface a hint instead of failing silently.
          console.warn("[voice] play() failed:", err);
          errCbRef.current?.(
            "Audio playback was blocked by the browser. Click anywhere in the app once, then try again."
          );
        });
      } catch (err) {
        console.warn("[voice] speak() error:", err);
        errCbRef.current?.(err instanceof Error ? err.message : "Voice playback failed.");
      }
    },
    [ttsEnabled, stopSpeaking]
  );

  // Tear down audio on unmount.
  React.useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  return {
    supported,
    listening,
    speaking,
    interimText,
    startListening,
    stopListening,
    speak,
    stopSpeaking
  };
}
