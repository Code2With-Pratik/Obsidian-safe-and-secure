"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  type PanInfo
} from "framer-motion";
import { Phone, Mic, MicOff, Maximize2, Video, VideoOff, X } from "lucide-react";
import { useUIStore } from "@/store/use-ui-store";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { initials, cn } from "@/lib/utils";

/** Approximate dock dimensions — used to clamp inside the viewport. */
const DOCK_W = 268;
const DOCK_H = 220;
const MARGIN = 20;
/** Spring used to "magnetize" the dock to its nearest corner. */
const SNAP_SPRING = { type: "spring" as const, stiffness: 320, damping: 28, mass: 0.7 };

type Corner = "tl" | "tr" | "bl" | "br";

/** Compute the top-left coordinates for one of the four anchor corners. */
function cornerCoords(corner: Corner, w: number, h: number) {
  const left = corner === "tl" || corner === "bl" ? MARGIN : w - DOCK_W - MARGIN;
  const top = corner === "tl" || corner === "tr" ? MARGIN : h - DOCK_H - MARGIN;
  return { x: Math.max(MARGIN, left), y: Math.max(MARGIN, top) };
}

/** Pick the corner closest to (centerX, centerY). */
function nearestCorner(centerX: number, centerY: number, w: number, h: number): Corner {
  const isRight = centerX > w / 2;
  const isBottom = centerY > h / 2;
  if (isBottom) return isRight ? "br" : "bl";
  return isRight ? "tr" : "tl";
}

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

  const onCallRoute = pathname.startsWith("/calls/active");
  const visible = !!activeCall && miniCallOpen && !onCallRoute;

  // Motion values for the dock's top-left position in viewport coords. The
  // dock is `position: fixed; left: 0; top: 0` and we translate it via x/y so
  // the snap math is straightforward.
  const x = useMotionValue(MARGIN);
  const y = useMotionValue(MARGIN);
  const [corner, setCorner] = React.useState<Corner>("bl");

  // Park at the bottom-left on first mount, then again whenever the dock
  // becomes visible (so reopening doesn't keep stale coords from last session).
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!visible) return;
    const target = cornerCoords("bl", window.innerWidth, window.innerHeight);
    x.set(target.x);
    y.set(target.y);
    setCorner("bl");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Re-snap to the same corner on window resize so the dock never drifts
  // off-screen when the viewport shrinks.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => {
      const target = cornerCoords(corner, window.innerWidth, window.innerHeight);
      animate(x, target.x, SNAP_SPRING);
      animate(y, target.y, SNAP_SPRING);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [corner, x, y]);

  React.useEffect(() => {
    if (!activeCall) return;
    const tick = () => setElapsed(Math.floor((Date.now() - activeCall.startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeCall]);

  const mm = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const ss = (elapsed % 60).toString().padStart(2, "0");

  const handleDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (typeof window === "undefined") return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    // info.point is the pointer position; we want the dock center for snap math.
    const left = x.get();
    const top = y.get();
    const centerX = left + DOCK_W / 2;
    const centerY = top + DOCK_H / 2;
    const next = nearestCorner(centerX, centerY, w, h);
    const target = cornerCoords(next, w, h);
    setCorner(next);
    // Spring the dock home to that corner — feels magnetic.
    animate(x, target.x, SNAP_SPRING);
    animate(y, target.y, SNAP_SPRING);
  };

  return (
    <AnimatePresence>
      {visible && activeCall && (
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0.08}
          // Soft clamps so the dock can't be flung beyond the viewport during
          // the drag itself — the onDragEnd snap brings it to a corner.
          dragConstraints={{
            left: -200,
            right: typeof window !== "undefined" ? window.innerWidth + 200 : 2000,
            top: -200,
            bottom: typeof window !== "undefined" ? window.innerHeight + 200 : 2000
          }}
          onDragEnd={handleDragEnd}
          style={{ x, y }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          whileDrag={{ scale: 1.03, cursor: "grabbing" }}
          className="fixed left-0 top-0 z-[70] glass-strong glass-specular border border-white/15 rounded-3xl shadow-floating overflow-hidden w-[268px] select-none touch-none cursor-grab"
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
