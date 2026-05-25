"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Flame, Lock, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGhostStore } from "@/store/use-ghost-store";
import type { GhostRoom } from "@/types";

export function GhostRoomCard({
  room,
  onJoin
}: {
  room: GhostRoom;
  onJoin?: (room: GhostRoom) => void;
}) {
  const router = useRouter();
  const joined = useGhostStore((s) => s.joinedIds.includes(room.id));
  const joinRoom = useGhostStore((s) => s.joinRoom);

  const handleClick = () => {
    // Locked rooms always go through the PIN dialog (handled by the parent).
    if (room.isLocked && !joined) {
      onJoin?.(room);
      return;
    }
    // Public rooms join directly and enter the room immediately.
    if (!joined) joinRoom(room.id);
    onJoin?.(room);
    router.push(`/ghost-rooms/${room.id}`);
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
      className="relative overflow-hidden rounded-3xl border border-border/60 backdrop-blur-2xl group"
    >
      <div className="absolute inset-0 opacity-70" style={{ background: room.aura }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/30 to-black/70" />
      <motion.div
        className="absolute -top-10 -right-10 size-40 rounded-full bg-white/10 blur-3xl"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 7, repeat: Infinity }}
      />

      <div className="relative p-5 min-h-[220px] flex flex-col text-white">
        <div className="flex items-center justify-between">
          <span className="text-[10px] tracking-widest uppercase opacity-80">
            ghost room · {room.id}
          </span>
          <div className="flex gap-1.5">
            {room.hot && (
              <span className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/30 backdrop-blur">
                <Flame className="size-2.5" /> trending
              </span>
            )}
            {room.isLocked && (
              <span className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/30 backdrop-blur">
                <Lock className="size-2.5" /> private
              </span>
            )}
            {joined && (
              <span className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/30 backdrop-blur">
                <Check className="size-2.5" /> joined
              </span>
            )}
          </div>
        </div>

        <h3 className="mt-3 text-2xl font-display font-semibold tracking-tight">
          {room.name}
        </h3>
        <p className="mt-1.5 text-sm/relaxed opacity-90 line-clamp-3">{room.topic}</p>

        <div className="mt-auto pt-4 flex items-end justify-between">
          <div>
            <div className="flex -space-x-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="size-7 rounded-full bg-white/20 ring-2 ring-white/40 backdrop-blur"
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] opacity-90">
              <Users className="size-3" /> {room.members}/{room.capacity} ghosts inside
            </div>
          </div>
          <Button
            onClick={handleClick}
            size="sm"
            className={
              joined
                ? "bg-emerald-500 text-white hover:bg-emerald-400"
                : "bg-white text-black hover:bg-white/90 shadow-glow"
            }
          >
            {joined ? (
              <>
                <Check className="size-3.5" /> Joined
              </>
            ) : room.isLocked ? (
              <>
                <Lock className="size-3.5" /> Enter PIN
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" /> Join
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
