"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Crown, Mic, MicOff } from "lucide-react";
import {
  EMPTY_LIST,
  useGhostStore,
  type GhostChannel,
  type GhostIdentity
} from "@/store/use-ghost-store";
import { cn } from "@/lib/utils";

const EMPTY_MEMBERS = EMPTY_LIST as readonly GhostIdentity[];
const EMPTY_CHANNELS = EMPTY_LIST as readonly GhostChannel[];

export function GhostMemberList({ roomId }: { roomId: string }) {
  const members = useGhostStore((s) => s.membersByRoom[roomId] ?? EMPTY_MEMBERS);
  const myIdentity = useGhostStore((s) => s.myIdentityByRoom[roomId]);
  const channels = useGhostStore((s) => s.channelsByRoom[roomId] ?? EMPTY_CHANNELS);
  const voiceParticipants = useGhostStore((s) => s.voiceParticipantsByChannel);

  const allVoiceIds = new Set<string>();
  for (const c of channels) {
    if (c.type !== "voice") continue;
    const ids = voiceParticipants[c.id];
    if (!ids) continue;
    for (const id of ids) allVoiceIds.add(id);
  }

  // Splitting members into "in voice" and "online" for that Discord-y feel.
  const inVoice = members.filter((m) => allVoiceIds.has(m.id));
  const online = members.filter((m) => !allVoiceIds.has(m.id));

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-l border-border/40 bg-card/30 backdrop-blur-xl">
      <div className="px-3 py-3 border-b border-border/40">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Ghosts inside — {members.length}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-2 py-3 space-y-4">
        {inVoice.length > 0 && (
          <MemberGroup label={`In voice — ${inVoice.length}`}>
            {inVoice.map((m) => (
              <MemberRow
                key={m.id}
                identity={m}
                voice
                isMe={m.id === myIdentity?.id}
              />
            ))}
          </MemberGroup>
        )}
        <MemberGroup label={`Online — ${online.length}`}>
          {online.map((m) => (
            <MemberRow key={m.id} identity={m} isMe={m.id === myIdentity?.id} />
          ))}
        </MemberGroup>
      </div>
    </aside>
  );
}

function MemberGroup({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="px-2 mb-1 text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function MemberRow({
  identity,
  voice = false,
  isMe = false
}: {
  identity: { id: string; name: string; hue: number };
  voice?: boolean;
  isMe?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ x: 2 }}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md transition",
        isMe ? "bg-foreground/[0.06]" : "hover:bg-foreground/[0.04]"
      )}
    >
      <div className="relative">
        <div
          className="size-7 rounded-full grid place-items-center text-white text-[10px] font-semibold shrink-0"
          style={{
            background: `linear-gradient(135deg, hsl(${identity.hue} 80% 55%), hsl(${(identity.hue + 60) % 360} 80% 50%))`
          }}
        >
          {identity.name.charAt(0)}
        </div>
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-card",
            voice ? "bg-emerald-400" : "bg-cyan-400"
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium truncate flex items-center gap-1">
          {identity.name}
          {isMe && <Crown className="size-2.5 text-amber-400" />}
        </p>
      </div>
      {voice && (
        <Mic className="size-3 text-emerald-300" />
      )}
    </motion.div>
  );
}
