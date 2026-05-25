"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Hand,
  Mic,
  MicOff,
  MoreVertical,
  Pin,
  PinOff,
  ShieldOff,
  UserMinus,
  VideoOff,
  Video as VideoIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useGhostStore, type GhostIdentity } from "@/store/use-ghost-store";

interface Props {
  roomId: string;
  identity: GhostIdentity;
  isHost: boolean;
  isMe: boolean;
  iAmHost: boolean;
  variant: "pinned" | "tile";
}

export function GhostCallTile({
  roomId,
  identity,
  isHost,
  isMe,
  iAmHost,
  variant
}: Props) {
  const state = useGhostStore(
    (s) => s.callByRoom[roomId]?.participants[identity.id]
  );
  const pinnedId = useGhostStore((s) => s.callByRoom[roomId]?.pinnedId);
  const setParticipant = useGhostStore((s) => s.setCallParticipantState);
  const setPinned = useGhostStore((s) => s.setPinnedParticipant);
  const kick = useGhostStore((s) => s.kickFromRoom);

  if (!state) return null;

  const pinned = pinnedId === identity.id;
  // Anonymous display — the host UI can see *their own* tag for accountability,
  // but every other tile shows "Ghost · <hue tag>" with no real identity.
  const label = isMe ? "You · anonymous" : `Ghost #${(identity.hue % 360).toString().padStart(3, "0")}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
      className={cn(
        "relative overflow-hidden border border-white/10 group",
        variant === "pinned"
          ? "h-full w-full rounded-3xl"
          // 4:3 reads more like a video tile than 16:9 at small widths and
          // makes the camera area meaningfully taller in the side panel.
          : "aspect-[4/3] w-full rounded-2xl",
        state.speaking && "ring-2 ring-emerald-400/80 shadow-[0_0_30px_-4px_rgba(52,211,153,0.5)]"
      )}
    >
      {/* backdrop — colored aurora per ghost */}
      <div
        className="absolute inset-0"
        style={{
          background: state.cameraOn
            ? `radial-gradient(120% 90% at 30% 20%, hsl(${identity.hue} 75% 35%), hsl(${(identity.hue + 60) % 360} 60% 18%) 60%, #05060e)`
            : "linear-gradient(135deg,#0f172a,#020617)"
        }}
      />

      {/* When camera is off, show a hue-themed avatar instead. */}
      {!state.cameraOn && (
        <div className="absolute inset-0 grid place-items-center">
          <div
            className={cn(
              "rounded-full grid place-items-center text-white font-semibold ring-4 ring-white/10 shadow-glow",
              variant === "pinned"
                ? "size-28 md:size-36 text-4xl"
                : "size-14 sm:size-16 text-xl"
            )}
            style={{
              background: `linear-gradient(135deg, hsl(${identity.hue} 80% 55%), hsl(${(identity.hue + 60) % 360} 75% 50%))`
            }}
          >
            {/* Even the initial is hue-derived — no real name leaks. */}
            G
          </div>
        </div>
      )}

      {/* speaking pulse */}
      {state.speaking && variant === "pinned" && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-3xl"
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

      {/* top-left badges */}
      <div className={cn(
        "absolute left-2 flex flex-wrap gap-1",
        variant === "pinned" ? "top-3 left-3" : "top-2"
      )}>
        {isHost && (
          <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/30 backdrop-blur text-amber-100">
            <Crown className="size-2.5" /> host
          </span>
        )}
        {isMe && (
          <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cyan-500/30 backdrop-blur text-cyan-100">
            you
          </span>
        )}
        {state.raisedHand && (
          <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-500/30 backdrop-blur text-violet-100">
            <Hand className="size-2.5" /> hand
          </span>
        )}
      </div>

      {/* top-right: pin / host menu */}
      <div className={cn(
        "absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition",
        variant === "pinned" ? "top-3 right-3 opacity-100" : "top-2"
      )}>
        <button
          onClick={() => setPinned(roomId, pinned ? null : identity.id)}
          className="size-7 grid place-items-center rounded-md bg-black/40 backdrop-blur hover:bg-black/60 text-white"
          aria-label={pinned ? "Unpin" : "Pin"}
        >
          {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
        </button>
        {iAmHost && !isMe && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="size-7 grid place-items-center rounded-md bg-black/40 backdrop-blur hover:bg-black/60 text-white"
                aria-label="Host controls"
              >
                <MoreVertical className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="!w-56">
              <DropdownMenuLabel className="!text-[10px]">
                Host controls
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setParticipant(roomId, identity.id, { muted: !state.muted })}
              >
                {state.muted ? <Mic /> : <MicOff />}
                {state.muted ? "Unmute participant" : "Mute participant"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  setParticipant(roomId, identity.id, { canSpeak: !state.canSpeak, muted: !state.canSpeak ? state.muted : true })
                }
              >
                <ShieldOff />
                {state.canSpeak ? "Revoke speaking" : "Allow to speak"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  setParticipant(roomId, identity.id, {
                    canCamera: !state.canCamera,
                    cameraOn: !state.canCamera ? state.cameraOn : false
                  })
                }
              >
                {state.canCamera ? <VideoOff /> : <VideoIcon />}
                {state.canCamera ? "Disable camera" : "Allow camera"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => kick(roomId, identity.id)}
                className="!text-rose-400 focus:!text-rose-300"
              >
                <UserMinus />
                Remove from room
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* bottom: name + mic */}
      <div
        className={cn(
          "absolute left-2 right-2 flex items-center justify-between",
          variant === "pinned" ? "bottom-3 left-3 right-3" : "bottom-2"
        )}
      >
        <div
          className={cn(
            "glass-strong rounded-full text-white inline-flex items-center gap-1.5 truncate",
            variant === "pinned" ? "px-2.5 py-1 text-xs" : "px-1.5 py-0.5 text-[10px]"
          )}
        >
          {state.muted || !state.canSpeak ? (
            <MicOff className={cn(variant === "pinned" ? "size-3" : "size-2.5", "text-rose-400")} />
          ) : (
            <Mic className={cn(variant === "pinned" ? "size-3" : "size-2.5", "text-emerald-400")} />
          )}
          <span className="truncate max-w-[140px]">{label}</span>
        </div>
        {!state.cameraOn && (
          <VideoOff className={cn(variant === "pinned" ? "size-4" : "size-3", "text-white/80")} />
        )}
      </div>
    </motion.div>
  );
}
