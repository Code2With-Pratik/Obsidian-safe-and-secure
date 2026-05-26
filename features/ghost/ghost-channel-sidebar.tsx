"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Ghost,
  Hash,
  Headphones,
  Lock,
  Plus,
  Settings,
  Volume2
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EMPTY_LIST, useGhostStore, type GhostChannel } from "@/store/use-ghost-store";
import type { GhostRoom } from "@/types";

const EMPTY_CHANNELS = EMPTY_LIST as readonly GhostChannel[];

export function GhostChannelSidebar({ room }: { room: GhostRoom }) {
  const channels = useGhostStore((s) => s.channelsByRoom[room.id] ?? EMPTY_CHANNELS);
  const activeChannelId = useGhostStore(
    (s) => s.activeChannelByRoom[room.id]
  );
  const setActiveChannel = useGhostStore((s) => s.setActiveChannel);
  const joinVoice = useGhostStore((s) => s.joinVoice);
  const voiceCountByChannel = useGhostStore((s) => s.voiceParticipantsByChannel);

  const text = channels.filter((c) => c.type === "text");
  const voice = channels.filter((c) => c.type === "voice");

  return (
    <aside className="w-64 shrink-0 flex flex-col border-r border-border/40 bg-card/40 backdrop-blur-xl">
      {/* room header */}
      <div
        className="relative h-24 overflow-hidden border-b border-border/40"
        style={{ background: room.aura }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/30 to-black/70" />
        <Link
          href="/ghost-rooms"
          className="absolute top-2 left-2 size-7 rounded-full bg-black/40 grid place-items-center text-white hover:bg-black/60 backdrop-blur"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <div className="absolute bottom-2 left-3 right-3 flex items-center gap-2 text-white">
          <Ghost className="size-4 shrink-0 drop-shadow" />
          <div className="min-w-0">
            <p className="font-display font-semibold text-sm truncate drop-shadow">
              {room.name}
            </p>
            <p className="text-[10px] opacity-90 truncate flex items-center gap-1">
              {room.isLocked && <Lock className="size-2.5" />}
              PIN · {room.pin}
            </p>
          </div>
        </div>
      </div>

      {/* channel groups */}
      <div className="flex-1 overflow-y-auto px-2 py-3 no-scrollbar space-y-4">
        <ChannelGroup label="Text channels">
          {text.map((c) => {
            const active = c.id === activeChannelId;
            return (
              <button
                key={c.id}
                onClick={() => setActiveChannel(room.id, c.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm group transition",
                  active
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
                )}
              >
                <Hash className="size-4 shrink-0" />
                <span className="truncate">{c.name}</span>
              </button>
            );
          })}
        </ChannelGroup>

        <ChannelGroup label="Voice channels">
          {voice.map((c) => {
            const active = c.id === activeChannelId;
            const participants = voiceCountByChannel[c.id]?.length ?? 0;
            return (
              <div key={c.id}>
                <button
                  onClick={() => {
                    setActiveChannel(room.id, c.id);
                    joinVoice(c.id);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition",
                    active
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
                  )}
                >
                  <Volume2 className="size-4 shrink-0" />
                  <span className="truncate flex-1 text-left">{c.name}</span>
                  {participants > 0 && (
                    <span className="text-[10px] tabular-nums text-emerald-300/90">
                      {participants}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </ChannelGroup>
      </div>

      {/* footer — ghost identity */}
      <GhostIdentityFooter roomId={room.id} />
    </aside>
  );
}

function ChannelGroup({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between px-2 mb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">
          {label}
        </span>
        <button className="size-5 grid place-items-center text-muted-foreground hover:text-foreground rounded transition">
          <Plus className="size-3.5" />
        </button>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function GhostIdentityFooter({ roomId }: { roomId: string }) {
  const identity = useGhostStore((s) => s.myIdentityByRoom[roomId]);
  if (!identity) return null;
  return (
    <div className="border-t border-border/40 px-2 py-2 bg-card/60 backdrop-blur flex items-center gap-2">
      <motion.div
        whileHover={{ rotate: 10 }}
        className="size-8 rounded-full grid place-items-center text-white text-xs font-semibold shrink-0 shadow-glow"
        style={{
          background: `linear-gradient(135deg, hsl(${identity.hue} 80% 55%), hsl(${(identity.hue + 60) % 360} 80% 50%))`
        }}
      >
        {identity.name.charAt(0)}
      </motion.div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold truncate">{identity.name}</p>
        <p className="text-[9px] text-muted-foreground">you, anonymously</p>
      </div>
      <button
        className="size-7 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition"
        aria-label="Audio settings"
      >
        <Headphones className="size-3.5" />
      </button>
      <button
        className="size-7 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition"
        aria-label="Room settings"
      >
        <Settings className="size-3.5" />
      </button>
    </div>
  );
}
