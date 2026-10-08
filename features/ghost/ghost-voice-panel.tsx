"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Headphones,
  Mic,
  MicOff,
  PhoneOff,
  ScreenShare,
  Settings,
  Video,
  VideoOff,
  Volume2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EMPTY_LIST,
  useGhostStore,
  type GhostChannel,
  type GhostIdentity
} from "@/store/use-ghost-store";

const EMPTY_MEMBERS = EMPTY_LIST as readonly GhostIdentity[];
const EMPTY_IDS = EMPTY_LIST as readonly string[];

export function GhostVoicePanel({ channel }: { channel: GhostChannel }) {
  const members = useGhostStore((s) => s.membersByRoom[channel.roomId] ?? EMPTY_MEMBERS);
  const myIdentity = useGhostStore((s) => s.myIdentityByRoom[channel.roomId]);
  const participantIds = useGhostStore(
    (s) => s.voiceParticipantsByChannel[channel.id] ?? EMPTY_IDS
  );
  const joinVoice = useGhostStore((s) => s.joinVoice);
  const leaveVoice = useGhostStore((s) => s.leaveVoice);
  const [muted, setMuted] = React.useState(false);
  const [deafened, setDeafened] = React.useState(false);
  const [camOn, setCamOn] = React.useState(false);

  const inVoice = myIdentity ? participantIds.includes(myIdentity.id) : false;
  const participants = members.filter((m) => participantIds.includes(m.id));

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* channel header */}
      <header className="h-14 px-4 flex items-center gap-3 border-b border-border/40 bg-card/40 backdrop-blur-xl">
        <Volume2 className="size-5 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{channel.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {participants.length} ghost{participants.length === 1 ? "" : "s"} in voice
          </p>
        </div>
      </header>

      {/* tile grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {participants.length === 0 ? (
            <div className="col-span-full glass rounded-3xl p-12 text-center">
              <Volume2 className="size-10 mx-auto text-muted-foreground" />
              <h3 className="font-semibold mt-3">No one's here yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Hit "Join voice" below to be the first one in.
              </p>
            </div>
          ) : (
            participants.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-video rounded-2xl border border-white/10 overflow-hidden grid place-items-center"
                style={{
                  background: `radial-gradient(120% 80% at 50% 30%, hsl(${p.hue} 70% 25%), #000000 70%)`
                }}
              >
                <div
                  className="size-20 rounded-full grid place-items-center text-white text-2xl font-semibold shadow-glow ring-2 ring-emerald-400/40"
                  style={{
                    background: `linear-gradient(135deg, hsl(${p.hue} 80% 55%), hsl(${(p.hue + 60) % 360} 80% 50%))`
                  }}
                >
                  {p.name.charAt(0)}
                </div>
                {/* speaking pulse */}
                <motion.div
                  className="absolute inset-2 rounded-2xl ring-2 ring-emerald-400/0"
                  animate={{ scale: [1, 1.02, 1], opacity: [0, 0.5, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, delay: p.hue / 60 }}
                />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  <span className="text-xs font-semibold px-2 py-1 rounded-md bg-black/40 backdrop-blur text-white truncate max-w-[70%]">
                    {p.name}
                  </span>
                  <span className="size-7 grid place-items-center rounded-md bg-black/40 backdrop-blur">
                    <Mic className="size-3 text-emerald-300" />
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* control bar */}
      <div className="border-t border-border/40 bg-card/50 backdrop-blur-xl px-4 py-3 flex items-center justify-center gap-2">
        {inVoice ? (
          <>
            <ControlButton
              icon={muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
              active={!muted}
              danger={muted}
              onClick={() => setMuted((v) => !v)}
              label={muted ? "Unmute" : "Mute"}
            />
            <ControlButton
              icon={<Headphones className="size-5" />}
              active={!deafened}
              danger={deafened}
              onClick={() => setDeafened((v) => !v)}
              label={deafened ? "Undeafen" : "Deafen"}
            />
            <ControlButton
              icon={camOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
              active={camOn}
              onClick={() => setCamOn((v) => !v)}
              label={camOn ? "Stop camera" : "Camera"}
            />
            <ControlButton
              icon={<ScreenShare className="size-5" />}
              active={false}
              label="Share screen"
            />
            <ControlButton
              icon={<Settings className="size-5" />}
              active={false}
              label="Voice settings"
            />
            <div className="w-px h-8 bg-border/60 mx-1" />
            <button
              onClick={() => leaveVoice(channel.id)}
              className="h-10 px-4 rounded-full bg-rose-500 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-rose-400 transition shadow-[0_6px_18px_-6px_rgba(244,63,94,0.7)]"
            >
              <PhoneOff className="size-4" />
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={() => joinVoice(channel.id)}
            className="h-11 px-5 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-400 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-glow"
          >
            <Mic className="size-4" />
            Join voice
          </button>
        )}
      </div>
    </div>
  );
}

function ControlButton({
  icon,
  active,
  danger,
  onClick,
  label
}: {
  icon: React.ReactNode;
  active: boolean;
  danger?: boolean;
  onClick?: () => void;
  label: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "size-10 rounded-full grid place-items-center transition",
        danger
          ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
          : active
            ? "bg-foreground/10 text-foreground hover:bg-foreground/15"
            : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
      )}
    >
      {icon}
    </motion.button>
  );
}
