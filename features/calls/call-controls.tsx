"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  ScreenShare,
  MoreHorizontal,
  Hand,
  Users,
  MessageSquare,
  Wand2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export function CallControls({ onEnd }: { onEnd?: () => void }) {
  const [muted, setMuted] = React.useState(false);
  const [camOff, setCamOff] = React.useState(false);
  const [share, setShare] = React.useState(false);

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="mx-auto inline-flex items-center gap-1.5 glass-strong rounded-full px-3 py-2.5 border border-border/60 shadow-floating"
    >
      <ControlButton
        active={!muted}
        toggled={muted}
        onClick={() => setMuted((m) => !m)}
        tooltip={muted ? "Unmute" : "Mute"}
        danger={muted}
      >
        {muted ? <MicOff /> : <Mic />}
      </ControlButton>
      <ControlButton
        active={!camOff}
        toggled={camOff}
        onClick={() => setCamOff((c) => !c)}
        tooltip={camOff ? "Camera on" : "Camera off"}
        danger={camOff}
      >
        {camOff ? <VideoOff /> : <Video />}
      </ControlButton>
      <ControlButton
        active={share}
        toggled={share}
        onClick={() => setShare((s) => !s)}
        tooltip="Share screen"
      >
        <ScreenShare />
      </ControlButton>
      <ControlButton tooltip="Reactions">
        <Wand2 />
      </ControlButton>
      <ControlButton tooltip="Raise hand">
        <Hand />
      </ControlButton>
      <ControlButton tooltip="Participants">
        <Users />
      </ControlButton>
      <ControlButton tooltip="Chat">
        <MessageSquare />
      </ControlButton>
      <ControlButton tooltip="More">
        <MoreHorizontal />
      </ControlButton>

      <button
        onClick={onEnd}
        className="ml-1 h-10 px-4 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-1.5 text-sm font-medium transition shadow-glow-pink"
      >
        <PhoneOff className="size-4" /> End
      </button>
    </motion.div>
  );
}

function ControlButton({
  children,
  onClick,
  active = true,
  toggled,
  danger,
  tooltip
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  toggled?: boolean;
  danger?: boolean;
  tooltip?: string;
}) {
  const btn = (
    <button
      onClick={onClick}
      className={cn(
        "size-10 rounded-full grid place-items-center transition",
        danger
          ? "bg-rose-500 text-white"
          : toggled
          ? "bg-foreground/10 text-foreground"
          : "hover:bg-foreground/10 text-foreground/80"
      )}
    >
      {children}
    </button>
  );
  return tooltip ? (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  ) : (
    btn
  );
}
