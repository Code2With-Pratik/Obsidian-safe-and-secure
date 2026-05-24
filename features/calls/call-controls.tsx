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
      // On mobile the controls float free over the call — no pill background.
      // On desktop we keep the glass capsule so the buttons stay readable
      // against any backdrop.
      className="mx-auto inline-flex items-center gap-2 px-3 py-2.5 md:gap-1.5 md:rounded-full md:glass-strong md:border md:border-border/60 md:shadow-floating"
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
      {/* Mobile shows only mic, video, filter, end. Everything else is
          desktop-only so the call tray on small screens stays compact. */}
      <span className="hidden md:contents">
        <ControlButton
          active={share}
          toggled={share}
          onClick={() => setShare((s) => !s)}
          tooltip="Share screen"
        >
          <ScreenShare />
        </ControlButton>
      </span>
      <ControlButton tooltip="Filters & effects">
        <Wand2 />
      </ControlButton>
      <span className="hidden md:contents">
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
      </span>

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
        // Mobile: solid black glass pill per button (no parent capsule).
        // Desktop: just a hover state since the parent capsule provides chrome.
        "size-11 md:size-10 rounded-full grid place-items-center transition shrink-0",
        "bg-black/45 backdrop-blur-md text-white md:bg-transparent md:text-foreground/80 md:backdrop-blur-0",
        danger
          ? "!bg-rose-500 !text-white"
          : toggled
          ? "!bg-rose-500/90 !text-white md:!bg-foreground/10 md:!text-foreground"
          : "hover:bg-black/65 md:hover:bg-foreground/10"
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
