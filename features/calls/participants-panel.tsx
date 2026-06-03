"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Hand,
  ScreenShare,
  Crown,
  UserPlus
} from "lucide-react";
import { useParticipants } from "@livekit/components-react";
import { Track, type Participant } from "livekit-client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initials, cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Map of identity → handRaised. Owned by the parent so it survives panel
   *  toggling and matches what the stage renders. */
  raisedHands: Record<string, boolean>;
  /** Local identity — used to mark "you" and to show the host crown when
   *  the local user is the call initiator (best-effort, derived from the
   *  pre-existing isLocal flag). */
  localIdentity: string;
  /** Open the InviteToCallPopup. */
  onInvite?: () => void;
}

/**
 * Sliding right-side panel listing every participant in the LiveKit room,
 * with live mic / camera / screen-share / raise-hand state for each.
 *
 * Must be rendered INSIDE a `<LiveKitRoom>` since `useParticipants()` reads
 * the room context. Portaled to <body> so the panel covers the full
 * viewport height regardless of where it's mounted in the React tree.
 */
export function ParticipantsPanel({
  open,
  onClose,
  raisedHands,
  localIdentity,
  onInvite
}: Props) {
  const t = useT();
  const participants = useParticipants();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Sort: local user first, then by name.
  const sorted = React.useMemo(() => {
    return [...participants].sort((a, b) => {
      if (a.identity === localIdentity) return -1;
      if (b.identity === localIdentity) return 1;
      return (a.name || a.identity).localeCompare(b.name || b.identity);
    });
  }, [participants, localIdentity]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.aside
          key="participants-panel"
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="fixed right-0 top-0 bottom-0 z-[150] w-full max-w-sm flex flex-col glass-strong border-l border-border/40 backdrop-blur-2xl pointer-events-auto"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <div>
              <h3 className="text-sm font-semibold">{t("Participants")}</h3>
              <p className="text-[10px] text-muted-foreground">
                {sorted.length}{" "}
                {sorted.length === 1 ? t("in this call") : t("in this call")}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label={t("Close")}
              className="size-8 rounded-full grid place-items-center text-foreground/70 hover:bg-foreground/10 transition"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="px-3 pt-3">
            <Button
              variant="glass"
              size="sm"
              onClick={onInvite}
              className="w-full"
            >
              <UserPlus className="size-4" />
              {t("Add people")}
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-1">
            {sorted.map((p) => (
              <ParticipantRow
                key={p.identity}
                p={p}
                isMe={p.identity === localIdentity}
                handRaised={!!raisedHands[p.identity]}
              />
            ))}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>,
    document.body
  );
}

function ParticipantRow({
  p,
  isMe,
  handRaised
}: {
  p: Participant;
  isMe: boolean;
  handRaised: boolean;
}) {
  const t = useT();
  const micPub = p.getTrackPublication(Track.Source.Microphone);
  const camPub = p.getTrackPublication(Track.Source.Camera);
  const screenPub = p.getTrackPublication(Track.Source.ScreenShare);

  // LiveKit's `isSpeaking` updates with audio activity; mirror it locally so
  // the speaking-glow follows real volume.
  const [speaking, setSpeaking] = React.useState(p.isSpeaking);
  React.useEffect(() => {
    const onSpeak = () => setSpeaking(p.isSpeaking);
    p.on("isSpeakingChanged", onSpeak);
    return () => {
      p.off("isSpeakingChanged", onSpeak);
    };
  }, [p]);

  const muted = !micPub || micPub.isMuted;
  const camOff = !camPub || camPub.isMuted;
  const sharing = !!screenPub && !screenPub.isMuted;
  // Metadata-based host detection — if the room's started with metadata set
  // by /api/calls/start (initiator_id), we'd surface it here. For now we
  // mark the host as the first joined identity, which matches the typical
  // call flow.
  const isHost = !!p.metadata && p.metadata.includes('"host":true');

  const displayName = p.name || p.identity || "Participant";

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-2 py-2 rounded-xl transition",
        speaking ? "bg-emerald-500/10" : "hover:bg-foreground/5"
      )}
    >
      <div className="relative shrink-0">
        <Avatar
          className={cn(
            "size-9 ring-2 transition",
            speaking ? "ring-emerald-400" : "ring-transparent"
          )}
        >
          <AvatarFallback>{initials(displayName)}</AvatarFallback>
        </Avatar>
        {handRaised && (
          <span className="absolute -top-1 -right-1 size-4 grid place-items-center rounded-full bg-amber-500 text-white shadow">
            <Hand className="size-2.5" />
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate flex items-center gap-1.5">
          {displayName}
          {isMe && (
            <span className="text-[10px] text-muted-foreground font-normal">
              ({t("you")})
            </span>
          )}
          {isHost && (
            <Crown className="size-3 text-amber-400" aria-label={t("Host")} />
          )}
        </p>
        <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1.5">
          {muted ? (
            <span className="inline-flex items-center gap-0.5">
              <MicOff className="size-2.5" /> {t("Muted")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-emerald-400">
              <Mic className="size-2.5" /> {t("Speaking")}
            </span>
          )}
          {camOff ? (
            <span className="inline-flex items-center gap-0.5">
              <VideoOff className="size-2.5" /> {t("Camera off")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5">
              <Video className="size-2.5" /> {t("Camera on")}
            </span>
          )}
          {sharing && (
            <span className="inline-flex items-center gap-0.5 text-cyan-400">
              <ScreenShare className="size-2.5" /> {t("Sharing")}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
