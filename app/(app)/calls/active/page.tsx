"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Ghost, Lock, Radio, Sparkles, Timer, ChevronLeft } from "lucide-react";
import { VideoGrid } from "@/features/calls/video-grid";
import { CallControls, CALL_FILTERS } from "@/features/calls/call-controls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { callParticipants } from "@/lib/mock-data";
import { useUIStore } from "@/store/use-ui-store";

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
  const router = useRouter();
  const activeCall = useUIStore((s) => s.activeCall);
  const startCall = useUIStore((s) => s.startCall);
  const endCall = useUIStore((s) => s.endCall);
  const setMiniCallOpen = useUIStore((s) => s.setMiniCallOpen);
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
        <VideoGrid
          participants={
            activeCall?.group
              ? callParticipants.slice(0, Math.min(callParticipants.length, activeCall.participants ?? 4))
              : callParticipants.slice(0, 2)
          }
        />
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
          title="Minimize — the call keeps running"
          className="pointer-events-auto"
        >
          <ChevronLeft /> Minimize
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
                {activeCall.ghostHandle ?? "Ghost call"}
              </span>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-medium">LIVE</span>
            </div>
          )}
          <span className="text-muted-foreground/60">·</span>
          <Timer01 />
          <span className="text-muted-foreground/60 hidden md:inline">·</span>
          <span className="hidden md:inline-flex text-xs text-muted-foreground items-center gap-1">
            <Lock className="size-3 text-emerald-400" />
            {activeCall?.ghost ? "Anonymous" : "Encrypted"}
          </span>
        </motion.div>

        <div className="pointer-events-auto flex items-center gap-2">
          <Badge variant="cyan" className="hidden md:inline-flex">
            <Sparkles className="size-3" /> AI noise cancel · on
          </Badge>
          <Badge variant="success" className="hidden sm:inline-flex">
            <Radio className="size-3" /> 320 kbps
          </Badge>
        </div>
      </div>

      {/* 4. Bottom floating controls */}
      <div className="absolute bottom-0 inset-x-0 z-10 pb-[max(1rem,env(safe-area-inset-bottom))] grid place-items-center pointer-events-none">
        <div className="pointer-events-auto">
          <CallControls
            filterId={filterId}
            onFilterChange={setFilterId}
            onEnd={() => {
              // Capture `returnTo` BEFORE clearing `activeCall` so the
              // navigation target survives. Default to the Calls tab.
              const back = activeCall?.returnTo ?? "/calls";
              endCall();
              router.push(back);
            }}
          />
        </div>
      </div>
    </div>
  );
}
