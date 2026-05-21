"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, VideoOff, Pin, Crown, Hand } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CallParticipant } from "@/types";

export function VideoGrid({ participants }: { participants: CallParticipant[] }) {
  const cols =
    participants.length <= 1
      ? "grid-cols-1"
      : participants.length === 2
      ? "grid-cols-2"
      : participants.length <= 4
      ? "grid-cols-2"
      : "grid-cols-2 lg:grid-cols-3";

  return (
    <div className={cn("grid gap-3 h-full", cols)}>
      {participants.map((p, i) => (
        <Tile p={p} key={p.id} idx={i} />
      ))}
    </div>
  );
}

function Tile({ p, idx }: { p: CallParticipant; idx: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.05 }}
      className={cn(
        "relative rounded-3xl overflow-hidden glass border border-border/60 group min-h-[200px]",
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
          <Avatar className="size-20 md:size-28 ring-4 ring-white/10">
            <AvatarImage src={p.avatar} />
          </Avatar>
        </div>
      )}

      {p.speaking && (
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

      <div className="absolute top-3 left-3 flex gap-1.5">
        {p.isHost && (
          <Badge variant="warning">
            <Crown className="size-3" /> host
          </Badge>
        )}
        {p.isMe && <Badge variant="glass">you</Badge>}
      </div>
      <div className="absolute top-3 right-3">
        <button className="size-7 rounded-full grid place-items-center bg-black/30 backdrop-blur hover:bg-black/50 text-white">
          <Pin className="size-3.5" />
        </button>
      </div>

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="glass-strong px-2.5 py-1 rounded-full text-xs text-white inline-flex items-center gap-1.5">
          {p.muted ? (
            <MicOff className="size-3 text-rose-400" />
          ) : (
            <Mic className="size-3 text-emerald-400" />
          )}
          {p.name}
        </div>
        {!p.cameraOn && <VideoOff className="size-4 text-white/80" />}
      </div>
    </motion.div>
  );
}
