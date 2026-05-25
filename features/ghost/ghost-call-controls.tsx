"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Hand,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  ScreenShare,
  Users,
  Video,
  VideoOff,
  Wand2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { CALL_FILTERS } from "@/features/calls/call-controls";
import { useGhostStore } from "@/store/use-ghost-store";

interface Props {
  roomId: string;
  filterId: string;
  onFilterChange: (id: string) => void;
  chatOpen: boolean;
  onToggleChat: () => void;
  participantsOpen: boolean;
  onToggleParticipants: () => void;
  onEnd: () => void;
}

export function GhostCallControls({
  roomId,
  filterId,
  onFilterChange,
  chatOpen,
  onToggleChat,
  participantsOpen,
  onToggleParticipants,
  onEnd
}: Props) {
  const myIdentity = useGhostStore((s) => s.myIdentityByRoom[roomId]);
  const myState = useGhostStore((s) =>
    myIdentity ? s.callByRoom[roomId]?.participants[myIdentity.id] : undefined
  );
  const setParticipant = useGhostStore((s) => s.setCallParticipantState);
  const [share, setShare] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const muted = myState?.muted ?? false;
  const camOff = !(myState?.cameraOn ?? false);
  const handRaised = myState?.raisedHand ?? false;
  const canSpeak = myState?.canSpeak ?? true;
  const canCamera = myState?.canCamera ?? true;

  const toggleMic = () => {
    if (!myIdentity) return;
    if (!canSpeak) return;
    setParticipant(roomId, myIdentity.id, { muted: !muted });
  };
  const toggleCam = () => {
    if (!myIdentity) return;
    if (!canCamera) return;
    setParticipant(roomId, myIdentity.id, { cameraOn: camOff /* turning on */ });
  };
  const toggleHand = () => {
    if (!myIdentity) return;
    setParticipant(roomId, myIdentity.id, { raisedHand: !handRaised });
  };

  // Close filter popover when clicking outside.
  const rootRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!filtersOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current) return;
      if (e.target instanceof Node && rootRef.current.contains(e.target)) return;
      setFiltersOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [filtersOpen]);

  return (
    <div ref={rootRef} className="relative">
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0, x: "-50%", y: 12 }}
            animate={{ opacity: 1, x: "-50%", y: 0 }}
            exit={{ opacity: 0, x: "-50%", y: 12 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="fixed left-1/2 z-[110] glass-strong glass-specular rounded-2xl border border-border/60 shadow-floating py-2.5 px-2.5 w-[min(36rem,calc(100vw-1.5rem))] pointer-events-auto"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}
          >
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory px-1 py-1">
              {CALL_FILTERS.map((f) => {
                const active = f.id === filterId;
                return (
                  <button
                    key={f.id}
                    onClick={() => onFilterChange(f.id)}
                    className={cn(
                      "snap-start relative size-20 shrink-0 rounded-2xl overflow-hidden transition active:scale-95",
                      active
                        ? "ring-2 ring-cyan-400 shadow-glow"
                        : "ring-1 ring-border/40 hover:ring-foreground/40"
                    )}
                  >
                    <span className="absolute inset-0" style={{ background: f.swatch }} />
                    <span className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
                    {active && (
                      <span className="absolute top-1.5 right-1.5 size-5 rounded-full bg-cyan-400 text-black grid place-items-center">
                        <Check className="size-3" strokeWidth={4} />
                      </span>
                    )}
                    <span className="absolute bottom-1 inset-x-0 text-[11px] font-semibold text-white text-center leading-tight">
                      {f.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mx-auto inline-flex items-center gap-2 px-3 py-2.5 md:gap-1.5 md:rounded-full md:glass-strong md:border md:border-border/60 md:shadow-floating"
      >
        <Btn
          tooltip={!canSpeak ? "Host revoked speaking" : muted ? "Unmute" : "Mute"}
          disabled={!canSpeak}
          danger={muted}
          onClick={toggleMic}
        >
          {muted || !canSpeak ? <MicOff /> : <Mic />}
        </Btn>
        <Btn
          tooltip={!canCamera ? "Host disabled camera" : camOff ? "Camera on" : "Camera off"}
          disabled={!canCamera}
          danger={camOff}
          onClick={toggleCam}
        >
          {camOff || !canCamera ? <VideoOff /> : <Video />}
        </Btn>
        <span className="hidden md:contents">
          <Btn
            tooltip={share ? "Stop sharing" : "Share screen"}
            toggled={share}
            onClick={() => setShare((s) => !s)}
          >
            <ScreenShare />
          </Btn>
        </span>
        <Btn
          tooltip="Effects"
          toggled={filtersOpen || filterId !== "none"}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <Wand2 />
        </Btn>
        <span className="hidden md:contents">
          <Btn
            tooltip={handRaised ? "Lower hand" : "Raise hand"}
            toggled={handRaised}
            onClick={toggleHand}
          >
            <Hand />
          </Btn>
          <Btn
            tooltip={participantsOpen ? "Hide participants" : "Participants"}
            toggled={participantsOpen}
            onClick={onToggleParticipants}
          >
            <Users />
          </Btn>
        </span>
        <Btn
          tooltip={chatOpen ? "Hide chat" : "Live chat"}
          toggled={chatOpen}
          onClick={onToggleChat}
        >
          <MessageSquare />
        </Btn>

        <button
          onClick={onEnd}
          className="ml-1 h-10 px-4 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-1.5 text-sm font-medium transition shadow-glow-pink"
        >
          <PhoneOff className="size-4" /> Leave
        </button>
      </motion.div>
    </div>
  );
}

function Btn({
  children,
  onClick,
  toggled,
  danger,
  disabled,
  tooltip
}: {
  children: React.ReactNode;
  onClick?: () => void;
  toggled?: boolean;
  danger?: boolean;
  disabled?: boolean;
  tooltip?: string;
}) {
  const btn = (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "size-11 md:size-10 rounded-full grid place-items-center transition shrink-0",
        "bg-black/45 backdrop-blur-md text-white md:bg-transparent md:text-foreground/80 md:backdrop-blur-0",
        disabled && "opacity-50 cursor-not-allowed",
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
