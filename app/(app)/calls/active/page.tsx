"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Ghost, Lock, Radio, Sparkles, ChevronLeft, Loader2 } from "lucide-react";
import { PinnedSpeakerStage } from "@/features/calls/pinned-speaker-stage";
import { CALL_FILTERS } from "@/features/calls/call-controls";
import { LiveCallControls } from "@/features/calls/live-call-controls";
import { RoomEvent } from "livekit-client";
import { useMaybeRoomContext } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUIStore } from "@/store/use-ui-store";
import { useCallStore } from "@/store/use-call-store";
import { useT } from "@/lib/i18n";

function Timer01() {
  const [s, setS] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return (
    <span className="font-mono text-xs tabular-nums">
      00:{mm}:{ss}
    </span>
  );
}

export default function ActiveCall() {
  const t = useT();
  const router = useRouter();
  const activeCall = useUIStore((s) => s.activeCall);
  const startCall = useUIStore((s) => s.startCall);
  const endCall = useUIStore((s) => s.endCall);
  const setMiniCallOpen = useUIStore((s) => s.setMiniCallOpen);
  // Live session (set by the caller via /api/calls/start or by the recipient
  // via /api/calls/accept). Drives the LiveKit room name + the /end POST.
  const outgoing = useCallStore((s) => s.outgoing);
  const setOutgoing = useCallStore((s) => s.setOutgoing);
  const endSession = useCallStore((s) => s.end);
  const unwatchSession = useCallStore((s) => s.unwatchSession);
  const [filterId, setFilterId] = React.useState("none");
  const filterCss =
    CALL_FILTERS.find((f) => f.id === filterId)?.css ?? "none";

  // If someone lands on /calls/active without an active call (e.g. deep link),
  // create a demo call so the page renders meaningfully.
  // Runs ONCE on mount — otherwise `endCall()` clearing `activeCall` would
  // immediately re-trigger this effect and spawn a phantom demo call while
  // the route change is still in flight (visible as a "ghost call" glitch
  // before redirecting).
  React.useEffect(() => {
    if (!useUIStore.getState().activeCall) {
      startCall({
        chatId: "c1",
        name: "Kai Nakamura",
        avatar: "https://api.dicebear.com/9.x/notionists/svg?backgroundType=gradientLinear&backgroundColor=8b5cf6,ec4899,22d3ee,a3e635,fbbf24,fb923c,60a5fa,f472b6&radius=18&seed=kai",
        video: true,
        returnTo: "/calls"
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After mount, if the call gets ended (activeCall becomes null) the page
  // should leave this screen immediately. Otherwise the participants grid
  // briefly renders mock tiles before the manual `router.push` lands —
  // especially noticeable on multi-user calls.
  const initialCallSeen = React.useRef(false);
  // Remember where to go when the call ends. Captured while the call is live
  // so it survives `endCall()` clearing `activeCall`. Defaults to the Calls
  // tab, but a call started from a chat carries `returnTo: /chats/<id>` so
  // ending drops the user back into that exact chat — not the calls list.
  const returnToRef = React.useRef("/calls");
  React.useEffect(() => {
    if (activeCall) {
      initialCallSeen.current = true;
      returnToRef.current = activeCall.returnTo ?? "/calls";
      return;
    }
    if (initialCallSeen.current) {
      router.push(returnToRef.current);
    }
  }, [activeCall, router]);

  // Always-current refs so the hang-up handler doesn't capture stale state
  // (the handler is defined once but `outgoing` updates after navigation).
  const outgoingRef = React.useRef(outgoing);
  React.useEffect(() => {
    outgoingRef.current = outgoing;
  }, [outgoing]);

  // Toast shown when the recipient never picks up. Cleared automatically.
  const [noAnswerToast, setNoAnswerToast] = React.useState<string | null>(null);

  // Raise-hand map { participantIdentity → isRaised } shared between the
  // control bar (publisher / toggler) and the pinned stage (UI badges).
  const [raisedHands, setRaisedHands] = React.useState<Record<string, boolean>>(
    {}
  );

  const onHangup = React.useCallback(() => {
    const back = activeCall?.returnTo ?? "/calls";
    const sid = outgoingRef.current?.sessionId;
    // Group calls: leaving = me only. Skip the server `/end` POST so the
    // remaining participants stay connected to the room.
    // 1:1 calls: leaving = ending for both. POST `/end` so the peer
    // hears `call:ended` on the session channel and routes back too.
    const isGroup = !!activeCall?.group;
    if (sid && !isGroup) void endSession(sid);
    unwatchSession();
    setOutgoing(null);
    endCall();
    router.push(back);
  }, [activeCall, endCall, endSession, router, setOutgoing, unwatchSession]);

  // Outgoing-call no-answer timer — if the LiveKit room never gets a remote
  // participant within 30 seconds of mount, show a "User is busy / offline"
  // toast and auto-end the call. Mirrors WhatsApp.
  const [hasRemote, setHasRemote] = React.useState(false);
  React.useEffect(() => {
    if (!outgoing || hasRemote) return;
    const t = window.setTimeout(() => {
      if (hasRemote) return;
      setNoAnswerToast("User is busy or offline");
      window.setTimeout(() => {
        setNoAnswerToast(null);
        onHangup();
      }, 2200);
    }, 30_000);
    return () => window.clearTimeout(t);
  }, [outgoing, hasRemote, onHangup]);

  return (
    // Fullscreen overlay. The video stage fills the entire viewport from
    // edge to edge; the top status row and the bottom controls float ON
    // TOP of it (absolute positioning + pointer-events isolation).
    <div className="fixed inset-0 z-[100] overflow-hidden bg-background">
      {/* 1. Video stage — true fullscreen. The CSS `filter` applies to the
              whole stage (the remote video + the PiP self-view); the floating
              UI sits in a separate sibling so it stays crisp. */}
      <div
        className="absolute inset-0 transition-[filter] duration-200"
        style={{ filter: filterCss }}
      >
        {/* The LiveKit room is provided by AppShell's CallSessionProvider so
            navigating away (Minimize) doesn't tear down the connection. Here
            we just render the visual stage + controls — they consume the
            existing room via `useRoomContext` / `useLocalParticipant`. While
            the token is still being minted we show a clean Connecting
            placeholder instead of flashing the old mock grid. */}
        <RoomReady>
          <RoomBridge
            onHasRemoteChange={setHasRemote}
            isGroup={!!activeCall?.group}
            onAllRemotesLeft={onHangup}
          />
          <PinnedSpeakerStage raisedHands={raisedHands} />
          <div className="absolute bottom-0 inset-x-0 z-10 pb-[max(1rem,env(safe-area-inset-bottom))] grid place-items-center pointer-events-none">
            <div className="pointer-events-auto">
              <LiveCallControls
                filterId={filterId}
                onFilterChange={setFilterId}
                onEnd={onHangup}
                sessionId={outgoing?.sessionId ?? null}
                onRaisedHandsChange={setRaisedHands}
              />
            </div>
          </div>
        </RoomReady>
      </div>

      {/* 2. Soft gradients top & bottom so floating UI stays readable
              against any video frame underneath. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/55 to-transparent" />

      {/* 3. Top status row — Minimize + LIVE/timer/encrypted + bitrate */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between gap-2 px-3 md:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 pointer-events-none">
        <Button
          variant="glass"
          size="sm"
          onClick={() => {
            // Mark the call as minimized BEFORE navigating so the floating
            // dock knows to appear on the destination route.
            setMiniCallOpen(true);
            router.push(activeCall?.returnTo ?? "/chats");
          }}
          title={t("Minimize — the call keeps running")}
          className="pointer-events-auto"
        >
          <ChevronLeft /> {t("Minimize")}
        </Button>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto flex items-center gap-3 glass-strong rounded-full px-4 py-1.5 border border-border/60"
        >
          {activeCall?.ghost ? (
            <>
              <Ghost className="size-3.5 text-violet-300" />
              <span className="text-xs font-medium tracking-tight">
                {activeCall.ghostHandle ?? t("Ghost call")}
              </span>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-medium">{t("LIVE")}</span>
            </div>
          )}
          <span className="text-muted-foreground/60">·</span>
          <Timer01 />
          <span className="text-muted-foreground/60 hidden md:inline">·</span>
          <span className="hidden md:inline-flex text-xs text-muted-foreground items-center gap-1">
            <Lock className="size-3 text-emerald-400" />
            {activeCall?.ghost ? t("Anonymous") : t("Encrypted")}
          </span>
        </motion.div>

        <div className="pointer-events-auto flex items-center gap-2">
          <Badge variant="cyan" className="hidden md:inline-flex">
            <Sparkles className="size-3" /> {t("AI noise cancel · on")}
          </Badge>
          <Badge variant="success" className="hidden sm:inline-flex">
            <Radio className="size-3" /> 320 kbps
          </Badge>
        </div>
      </div>

      {/* "User is busy / offline" toast — shown when no remote joins within
          30s of the call starting. The hangup follows ~2s later. */}
      {noAnswerToast && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-5 py-3 rounded-2xl bg-rose-500/95 text-white text-sm font-medium shadow-floating"
          >
            {noAnswerToast}
          </motion.div>
        </div>
      )}

    </div>
  );
}

/** Renders its children only when the parent CallSessionProvider has us
 *  inside a connected `<LiveKitRoom>` (i.e. token minted, socket open).
 *  Falls back to a clean "Connecting…" spinner — replaces the old mock
 *  gradient grid that used to flash before the real call layout. */
function RoomReady({ children }: { children: React.ReactNode }) {
  // useRoomContext() returns undefined when there's no surrounding LiveKitRoom.
  const room = useMaybeRoomContext();
  if (!room) {
    return (
      <div className="h-full w-full grid place-items-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-white/70">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-7 animate-spin text-cyan-400" />
          <p className="text-sm font-medium">Connecting…</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

/**
 * Internal bridge — observes RoomEvent.ParticipantConnected / Disconnected
 * to:
 *   1) flip `hasRemote` true the moment any remote joins, clearing the
 *      caller-side "no answer" timer.
 *   2) auto-end this side of the call when every remote disconnects (e.g.
 *      WhatsApp-style: in a 1:1, peer leaving hangs up here too; in a
 *      group, the last person leaving cleans up an empty room).
 *
 * Must be rendered INSIDE `<LiveKitRoom>`.
 */
function RoomBridge({
  onHasRemoteChange,
  isGroup,
  onAllRemotesLeft
}: {
  onHasRemoteChange: (v: boolean) => void;
  isGroup: boolean;
  onAllRemotesLeft: () => void;
}) {
  const room = useMaybeRoomContext();
  // Track whether at least one remote ever joined. Without this we'd treat
  // "no remote yet" the same as "everyone left" and immediately hang up the
  // caller before the recipient picks. The "no answer" timer handles the
  // never-picked case separately.
  const sawRemoteRef = React.useRef(false);

  React.useEffect(() => {
    if (!room) return;
    const sync = () => {
      const count = room.remoteParticipants.size;
      const hadRemote = sawRemoteRef.current;
      if (count > 0) sawRemoteRef.current = true;
      onHasRemoteChange(count > 0);
      // 1:1 only: if the single remote just left, end our side too.
      // Groups stay alive even when alone.
      if (hadRemote && count === 0 && !isGroup) onAllRemotesLeft();
    };
    sync();
    room.on(RoomEvent.ParticipantConnected, sync);
    room.on(RoomEvent.ParticipantDisconnected, sync);
    return () => {
      room.off(RoomEvent.ParticipantConnected, sync);
      room.off(RoomEvent.ParticipantDisconnected, sync);
    };
  }, [room, onHasRemoteChange, isGroup, onAllRemotesLeft]);

  return null;
}
