"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  Wand2,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useT } from "@/lib/i18n";

/** Available video filters — id is what we pass back to the parent so it can
 *  apply the corresponding CSS `filter` to the call stage. */
export interface CallFilter {
  id: string;
  label: string;
  /** CSS filter value (or "none"). */
  css: string;
  /** Background swatch on the picker chip — pure preview only. */
  swatch: string;
}

export const CALL_FILTERS: CallFilter[] = [
  { id: "none",     label: "None",     css: "none",                                                       swatch: "linear-gradient(135deg,#94a3b8,#475569)" },
  { id: "blur",     label: "Blur",     css: "blur(8px)",                                                  swatch: "linear-gradient(135deg,#a78bfa,#22d3ee)" },
  { id: "mono",     label: "Mono",     css: "grayscale(1) contrast(1.05)",                                swatch: "linear-gradient(135deg,#1f2937,#94a3b8)" },
  { id: "vivid",    label: "Vivid",    css: "saturate(1.6) contrast(1.05)",                               swatch: "linear-gradient(135deg,#ec4899,#fbbf24)" },
  { id: "warm",     label: "Warm",     css: "sepia(0.35) saturate(1.2) hue-rotate(-10deg)",               swatch: "linear-gradient(135deg,#fb923c,#f43f5e)" },
  { id: "cool",     label: "Cool",     css: "hue-rotate(180deg) saturate(1.2)",                           swatch: "linear-gradient(135deg,#60a5fa,#22d3ee)" },
  { id: "noir",     label: "Noir",     css: "grayscale(1) contrast(1.4) brightness(0.9)",                 swatch: "linear-gradient(135deg,#0f172a,#475569)" },
  { id: "dream",    label: "Dream",    css: "blur(1px) saturate(1.3) brightness(1.05)",                   swatch: "linear-gradient(135deg,#a78bfa,#f472b6)" },
  { id: "sepia",    label: "Sepia",    css: "sepia(0.8) contrast(1.05) brightness(1.02)",                 swatch: "linear-gradient(135deg,#d4a574,#7c4a1e)" },
  { id: "fade",     label: "Fade",     css: "saturate(0.7) contrast(0.9) brightness(1.08)",               swatch: "linear-gradient(135deg,#e5e7eb,#fde68a)" },
  { id: "bright",   label: "Bright",   css: "brightness(1.18) contrast(1.05)",                            swatch: "linear-gradient(135deg,#fde68a,#fff)" },
  { id: "sharp",    label: "Sharp",    css: "contrast(1.35) saturate(1.15)",                              swatch: "linear-gradient(135deg,#22d3ee,#0f172a)" },
  { id: "pastel",   label: "Pastel",   css: "saturate(0.75) brightness(1.12) contrast(0.95)",             swatch: "linear-gradient(135deg,#fbcfe8,#a7f3d0)" },
  { id: "neon",     label: "Neon",     css: "saturate(2) contrast(1.25) brightness(1.05) hue-rotate(15deg)", swatch: "linear-gradient(135deg,#22d3ee,#ec4899,#fbbf24)" },
  { id: "sunset",   label: "Sunset",   css: "sepia(0.4) saturate(1.5) hue-rotate(-25deg) brightness(1.05)", swatch: "linear-gradient(135deg,#f43f5e,#fbbf24,#a855f7)" },
  { id: "aqua",     label: "Aqua",     css: "hue-rotate(150deg) saturate(1.4) brightness(1.05)",          swatch: "linear-gradient(135deg,#22d3ee,#10b981)" },
  { id: "vintage",  label: "Vintage",  css: "sepia(0.5) contrast(1.1) saturate(0.8) brightness(0.95)",    swatch: "linear-gradient(135deg,#a16207,#78350f)" },
  { id: "rosy",     label: "Rosy",     css: "saturate(1.3) hue-rotate(-15deg) brightness(1.05)",          swatch: "linear-gradient(135deg,#fb7185,#f472b6,#fbbf24)" },
  { id: "midnight", label: "Midnight", css: "brightness(0.85) contrast(1.2) saturate(1.1) hue-rotate(220deg)", swatch: "linear-gradient(135deg,#1e1b4b,#312e81,#22d3ee)" },
  { id: "candy",    label: "Candy",    css: "saturate(1.5) brightness(1.1) hue-rotate(30deg)",            swatch: "linear-gradient(135deg,#f472b6,#a78bfa,#fbbf24)" }
];

export function CallControls({
  onEnd,
  filterId = "none",
  onFilterChange,
  muted: mutedProp,
  onMutedChange,
  camOff: camOffProp,
  onCamOffChange,
  share: shareProp,
  onShareChange,
  handRaised,
  onHandToggle,
  chatOpen,
  onChatToggle,
  unreadChat,
  participantsOpen,
  onParticipantsToggle,
  onMore
}: {
  onEnd?: () => void;
  filterId?: string;
  onFilterChange?: (id: string) => void;
  /** Optional controlled mode — when these props are provided the toggles
   *  bypass local state and call back to the parent (which owns the LiveKit
   *  publish/unpublish side-effects). */
  muted?: boolean;
  onMutedChange?: (v: boolean) => void;
  camOff?: boolean;
  onCamOffChange?: (v: boolean) => void;
  share?: boolean;
  onShareChange?: (v: boolean) => void;
  /** Raise-hand controlled state. The parent owns the publish over the
   *  LiveKit data channel; this toggle is purely visual otherwise. */
  handRaised?: boolean;
  onHandToggle?: () => void;
  /** In-call chat panel open/close. The parent owns the panel mount. */
  chatOpen?: boolean;
  onChatToggle?: () => void;
  unreadChat?: number;
  /** Participants panel open/close. */
  participantsOpen?: boolean;
  onParticipantsToggle?: () => void;
  /** "More" → open the invite-to-call popup. */
  onMore?: () => void;
}) {
  const t = useT();
  const [mutedLocal, setMutedLocal] = React.useState(false);
  const [camOffLocal, setCamOffLocal] = React.useState(false);
  const [shareLocal, setShareLocal] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  // Controlled if the parent passes a value+setter pair, else local.
  const muted = mutedProp ?? mutedLocal;
  const camOff = camOffProp ?? camOffLocal;
  const share = shareProp ?? shareLocal;
  const setMuted = (v: boolean) => {
    if (onMutedChange) onMutedChange(v);
    else setMutedLocal(v);
  };
  const setCamOff = (v: boolean) => {
    if (onCamOffChange) onCamOffChange(v);
    else setCamOffLocal(v);
  };
  const setShare = (v: boolean) => {
    if (onShareChange) onShareChange(v);
    else setShareLocal(v);
  };

  // Close the filter popover when clicking outside.
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
      {/* Filter strip — fixed to the viewport and centred, just above the
          control bar. Single horizontal row, scrolls left/right. Sits in
          its own positioning layer so it doesn't inherit any drift from
          the surrounding flex/grid centring. */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            // IMPORTANT: framer's `y` compiles to transform: translateY(...)
            // which would overwrite Tailwind's `-translate-x-1/2`. So we
            // include `x: "-50%"` in every keyframe — that keeps the
            // horizontal centring locked while only `y` animates.
            initial={{ opacity: 0, x: "-50%", y: 12 }}
            animate={{ opacity: 1, x: "-50%", y: 0 }}
            exit={{ opacity: 0, x: "-50%", y: 12 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="fixed left-1/2 z-[110] glass-strong glass-specular rounded-2xl border border-border/60 shadow-floating py-2.5 px-2.5 w-[min(36rem,calc(100vw-1.5rem))] pointer-events-auto"
            style={{
              // Bottom = control-tray bottom inset (env(safe-area-inset-bottom)
              // ≈ 16px on iOS) + the tray height (~64px) + 12px gap.
              bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)"
            }}
          >
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory px-1 py-1">
              {CALL_FILTERS.map((f) => {
                const active = f.id === filterId;
                return (
                  <button
                    key={f.id}
                    onClick={() => onFilterChange?.(f.id)}
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
        // On mobile the controls float free over the call — no pill background.
        // On desktop we keep the glass capsule so the buttons stay readable
        // against any backdrop.
        className="mx-auto inline-flex items-center gap-2 px-3 py-2.5 md:gap-1.5 md:rounded-full md:glass-strong md:border md:border-border/60 md:shadow-floating"
      >
        <ControlButton
          active={!muted}
          toggled={muted}
          onClick={() => setMuted(!muted)}
          tooltip={muted ? t("Unmute") : t("Mute")}
          danger={muted}
        >
          {muted ? <MicOff /> : <Mic />}
        </ControlButton>
        <ControlButton
          active={!camOff}
          toggled={camOff}
          onClick={() => setCamOff(!camOff)}
          tooltip={camOff ? t("Camera on") : t("Camera off")}
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
            onClick={() => setShare(!share)}
            tooltip={t("Share screen")}
          >
            <ScreenShare />
          </ControlButton>
        </span>
        <ControlButton
          tooltip={t("Filters & effects")}
          toggled={filtersOpen || filterId !== "none"}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <Wand2 />
        </ControlButton>
        <span className="hidden md:contents">
          <ControlButton
            tooltip={handRaised ? t("Lower hand") : t("Raise hand")}
            toggled={handRaised}
            onClick={onHandToggle}
          >
            <Hand />
          </ControlButton>
          <ControlButton
            tooltip={t("Participants")}
            toggled={participantsOpen}
            onClick={onParticipantsToggle}
          >
            <Users />
          </ControlButton>
          <ControlButton
            tooltip={t("Chat")}
            toggled={chatOpen}
            onClick={onChatToggle}
            badge={unreadChat}
          >
            <MessageSquare />
          </ControlButton>
          <ControlButton tooltip={t("More")} onClick={onMore}>
            <MoreHorizontal />
          </ControlButton>
        </span>

        <button
          onClick={onEnd}
          className="ml-1 h-10 px-4 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-1.5 text-sm font-medium transition shadow-glow-pink"
        >
          <PhoneOff className="size-4" /> {t("End")}
        </button>
      </motion.div>
    </div>
  );
}

function ControlButton({
  children,
  onClick,
  active = true,
  toggled,
  danger,
  tooltip,
  badge
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  toggled?: boolean;
  danger?: boolean;
  tooltip?: string;
  /** Small numeric overlay on the icon (e.g. unread chat count). Hidden
   *  when undefined or 0. */
  badge?: number;
}) {
  const btn = (
    <button
      onClick={onClick}
      className={cn(
        // Mobile: solid black glass pill per button (no parent capsule).
        // Desktop: just a hover state since the parent capsule provides chrome.
        "relative size-11 md:size-10 rounded-full grid place-items-center transition shrink-0",
        "bg-black/45 backdrop-blur-md text-white md:bg-transparent md:text-foreground/80 md:backdrop-blur-0",
        danger
          ? "!bg-rose-500 !text-white"
          : toggled
          ? "!bg-cyan-500/90 !text-white md:!bg-foreground/10 md:!text-foreground"
          : "hover:bg-black/65 md:hover:bg-foreground/10"
      )}
    >
      {children}
      {!!badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold grid place-items-center leading-none">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
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
