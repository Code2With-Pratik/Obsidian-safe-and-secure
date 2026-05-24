"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Mic, MicOff, Maximize2, Video, VideoOff, X } from "lucide-react";
import { useUIStore } from "@/store/use-ui-store";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { initials, cn } from "@/lib/utils";

export function FloatingMiniCall() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const activeCall = useUIStore((s) => s.activeCall);
  const endCall = useUIStore((s) => s.endCall);
  const miniCallOpen = useUIStore((s) => s.miniCallOpen);
  const setMiniCallOpen = useUIStore((s) => s.setMiniCallOpen);
  const [muted, setMuted] = React.useState(false);
  const [camOff, setCamOff] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  /** Block drag-start when interacting with a button inside the dock. */
  const stopDrag = (e: React.PointerEvent) => e.stopPropagation();

  // The dock is visible only when there's an active call AND the user has
  // explicitly minimized it. This avoids the brief flash you'd otherwise see
  // between startCall() and the navigation to /calls/active completing.
  const onCallRoute = pathname.startsWith("/calls/active");
  const visible = !!activeCall && miniCallOpen && !onCallRoute;

  // Drag constraints — we anchor the dock at the bottom-left and let the
  // user drag it across the whole viewport. Framer reads these on each
  // pointer move so updating state on resize is enough.
  const computeBounds = () => {
    if (typeof window === "undefined") {
      return { left: 0, right: 1200, top: -800, bottom: 100 };
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dockW = 268;
    const dockH = 220;
    const anchorLeft = 20;     // left-5
    const anchorBottom = 20;   // bottom-5 / mobile bottom-24 ≈ 96 — use 20 for room
    const safety = 8;
    return {
      // Left: can drag left until dock's left edge hits viewport edge.
      left: -(anchorLeft - safety),
      // Right: dock right edge can sit safety px from viewport right.
      right: Math.max(0, w - dockW - anchorLeft - safety),
      // Top: dock top edge can sit safety px from viewport top.
      top: -Math.max(0, h - dockH - anchorBottom - safety),
      // Bottom: tiny (already near bottom).
      bottom: Math.max(0, anchorBottom - safety)
    };
  };
  const [bounds, setBounds] = React.useState(computeBounds);
  React.useEffect(() => {
    const update = () => setBounds(computeBounds());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  React.useEffect(() => {
    if (!activeCall) return;
    const tick = () => setElapsed(Math.floor((Date.now() - activeCall.startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeCall]);

  const mm = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const ss = (elapsed % 60).toString().padStart(2, "0");

  return (
    <AnimatePresence>
      {visible && activeCall && (
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0.12}
          dragConstraints={bounds}
          // IMPORTANT: animate/exit only animate opacity + scale. Don't add
          // `y` here — framer would fight the drag's y-axis transform and
          // the dock would feel frozen even though the listener fires.
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          whileDrag={{ scale: 1.03, cursor: "grabbing" }}
          className="fixed left-5 bottom-24 md:bottom-5 z-[70] glass-strong glass-specular border border-white/15 rounded-3xl shadow-floating overflow-hidden w-[268px] select-none touch-none cursor-grab"
        >
          <div
            onDoubleClick={() => router.push("/calls/active")}
            className="relative h-32"
            style={{
              background:
                "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(34,211,238,0.55))"
            }}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(80% 80% at 30% 30%, rgba(255,255,255,0.20), transparent 60%)"
              }}
              animate={{ opacity: [0.4, 0.9, 0.4] }}
              transition={{ duration: 3, repeat: Infinity }}
            />

            <div className="absolute inset-0 grid place-items-center">
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              >
                <Avatar className="size-16 ring-4 ring-white/30 ring-offset-2 ring-offset-transparent">
                  <AvatarImage src={activeCall.avatar} />
                  <AvatarFallback>{initials(activeCall.name)}</AvatarFallback>
                </Avatar>
              </motion.div>
            </div>

            <div className="absolute top-2 left-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur text-[10px] text-white">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {activeCall.video ? "Video" : "Voice"} · {mm}:{ss}
            </div>

            <button
              onPointerDown={stopDrag}
              onClick={() => {
              setMiniCallOpen(false);
              router.push("/calls/active");
            }}
              className="absolute top-2 right-9 size-7 rounded-full grid place-items-center bg-black/30 backdrop-blur-md hover:bg-black/50 transition"
              title="Expand"
            >
              <Maximize2 className="size-3.5 text-white" />
            </button>
            <button
              onPointerDown={stopDrag}
              onClick={() => endCall()}
              className="absolute top-2 right-2 size-7 rounded-full grid place-items-center bg-black/30 backdrop-blur-md hover:bg-black/50 transition"
              title="End call"
            >
              <X className="size-3.5 text-white" />
            </button>
          </div>

          <div className="px-3 py-3 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight truncate">{activeCall.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {activeCall.video ? "HD video" : "HD voice"}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onPointerDown={stopDrag}
                onClick={() => setMuted((m) => !m)}
                className={cn(
                  "size-8 rounded-full grid place-items-center transition",
                  muted ? "bg-rose-500 text-white" : "glass-subtle hover:bg-foreground/10"
                )}
              >
                {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </button>
              {activeCall.video && (
                <button
                  onPointerDown={stopDrag}
                  onClick={() => setCamOff((c) => !c)}
                  className={cn(
                    "size-8 rounded-full grid place-items-center transition",
                    camOff ? "bg-rose-500 text-white" : "glass-subtle hover:bg-foreground/10"
                  )}
                >
                  {camOff ? <VideoOff className="size-4" /> : <Video className="size-4" />}
                </button>
              )}
              <button
                onPointerDown={stopDrag}
                onClick={() => endCall()}
                className="size-8 rounded-full grid place-items-center bg-rose-500 hover:bg-rose-600 text-white"
                title="End"
              >
                <Phone className="size-3.5 rotate-[135deg]" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
