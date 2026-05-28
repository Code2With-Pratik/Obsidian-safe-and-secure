"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, VideoOff, Pin, Crown } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { CallParticipant } from "@/types";

export function VideoGrid({ participants }: { participants: CallParticipant[] }) {
  // For 1-on-1 calls (exactly 2 participants: me + one other) use a PiP
  // layout — the remote person fills the whole stage and "you" sits as a
  // small draggable square in the corner. WhatsApp / FaceTime style.
  if (participants.length === 2) {
    const me = participants.find((p) => p.isMe);
    const remote = participants.find((p) => !p.isMe) ?? participants[1];
    if (me && remote) {
      return <OneOnOneLayout remote={remote} self={me} />;
    }
  }

  // Group call — equal-sized tile grid. Inset so tiles don't sit under the
  // floating status row at the top or the controls at the bottom.
  const cols =
    participants.length <= 1
      ? "grid-cols-1"
      : participants.length === 2
      ? "grid-cols-2"
      : participants.length <= 4
      ? "grid-cols-2"
      : "grid-cols-2 lg:grid-cols-3";

  return (
    <div
      className={cn(
        "grid gap-2 md:gap-3 h-full px-2 md:px-4",
        "pt-[max(4.5rem,calc(env(safe-area-inset-top)+4rem))]",
        "pb-[max(7rem,calc(env(safe-area-inset-bottom)+6rem))]",
        cols
      )}
    >
      {participants.map((p, i) => (
        <Tile p={p} key={p.id} idx={i} />
      ))}
    </div>
  );
}

/** 1-on-1 layout: remote fullscreen + small draggable self-view PiP. */
function OneOnOneLayout({
  remote,
  self
}: {
  remote: CallParticipant;
  self: CallParticipant;
}) {
  // Constrain the PiP drag to the call stage container.
  const stageRef = React.useRef<HTMLDivElement>(null);
  return (
    <div ref={stageRef} className="relative h-full w-full">
      {/* Remote person — fills the entire stage */}
      <Tile p={remote} idx={0} fullscreen />

      {/* Your own video — small square PiP, draggable within the stage.
          Top offset clears the floating status row + safe area. */}
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.12}
        dragConstraints={stageRef}
        whileDrag={{ scale: 1.04, cursor: "grabbing" }}
        className="absolute right-4 top-[max(4.5rem,calc(env(safe-area-inset-top)+4rem))] md:top-20 z-10 w-28 h-36 md:w-36 md:h-48 touch-none cursor-grab"
      >
        <Tile p={self} idx={0} compact />
      </motion.div>
    </div>
  );
}

function Tile({
  p,
  idx,
  fullscreen,
  compact
}: {
  p: CallParticipant;
  idx: number;
  /** Stretch absolutely to fill the parent (used by PiP remote). */
  fullscreen?: boolean;
  /** Shrunk PiP overlay — smaller badges, no pin button. */
  compact?: boolean;
}) {
  const t = useT();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.05 }}
      className={cn(
        "relative overflow-hidden glass border border-border/60 group",
        fullscreen
          ? "absolute inset-0 rounded-3xl"
          : compact
          ? "w-full h-full rounded-2xl ring-2 ring-white/15 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.5)]"
          : "rounded-3xl min-h-[200px]",
        p.speaking && "ring-2 ring-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.35)]"
      )}
    >
      {p.cameraOn ? (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 80% at 30% 20%, rgba(139,92,246,0.45), rgba(34,211,238,0.3) 60%, rgba(0,0,0,0.7))"
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950" />
      )}

      {!p.cameraOn && (
        <div className="absolute inset-0 grid place-items-center">
          <Avatar
            className={cn(
              "ring-4 ring-white/10",
              compact ? "size-12" : "size-20 md:size-28"
            )}
          >
            <AvatarImage src={p.avatar} />
          </Avatar>
        </div>
      )}

      {p.speaking && !compact && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          animate={{
            boxShadow: [
              "inset 0 0 0 2px rgba(52,211,153,0)",
              "inset 0 0 0 2px rgba(52,211,153,0.7)",
              "inset 0 0 0 2px rgba(52,211,153,0)"
            ]
          }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      )}

      {!compact && (
        <div className="absolute top-3 left-3 flex gap-1.5">
          {p.isHost && (
            <Badge variant="warning">
              <Crown className="size-3" /> {t("host")}
            </Badge>
          )}
          {p.isMe && <Badge variant="glass">{t("you")}</Badge>}
        </div>
      )}
      {!compact && (
        <div className="absolute top-3 right-3">
          <button className="size-7 rounded-full grid place-items-center bg-black/30 backdrop-blur hover:bg-black/50 text-white">
            <Pin className="size-3.5" />
          </button>
        </div>
      )}

      <div
        className={cn(
          "absolute left-2 right-2 flex items-center justify-between",
          compact ? "bottom-1.5" : "bottom-3 left-3 right-3"
        )}
      >
        <div
          className={cn(
            "glass-strong rounded-full text-white inline-flex items-center gap-1.5",
            compact ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
          )}
        >
          {p.muted ? (
            <MicOff className={cn(compact ? "size-2.5" : "size-3", "text-rose-400")} />
          ) : (
            <Mic className={cn(compact ? "size-2.5" : "size-3", "text-emerald-400")} />
          )}
          <span className="truncate max-w-[80px]">{compact ? t("You") : p.name}</span>
        </div>
        {!compact && !p.cameraOn && <VideoOff className="size-4 text-white/80" />}
      </div>
    </motion.div>
  );
}
