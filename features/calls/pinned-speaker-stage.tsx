"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, PinOff, ScreenShare, Hand } from "lucide-react";
import {
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  TrackRefContext,
  type TrackReferenceOrPlaceholder
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { cn } from "@/lib/utils";

interface PinnedSpeakerStageProps {
  /** Map of participant identity → raised-hand state. Drives the ✋ badge on
   *  tiles and the floating chip above the stage. */
  raisedHands?: Record<string, boolean>;
}

/**
 * Pinned-speaker stage — Google-Meet / Zoom-style layout:
 *
 *   ┌─────────────────────────────────────┐
 *   │                              ┌────┐ │
 *   │                              │ S1 │ │
 *   │           MAIN SPEAKER       └────┘ │
 *   │           (or shared screen) ┌────┐ │
 *   │                              │ S2 │ │
 *   │                              └────┘ │
 *   └─────────────────────────────────────┘
 *
 * Selection rule (highest wins):
 *   1) Any screen-share track → fills the main slot
 *   2) Locally-pinned participant
 *   3) First non-local participant
 *   4) Local participant
 *
 * Tapping a thumbnail pins that participant; tapping the pinned chip on the
 * main view unpins.
 */
export function PinnedSpeakerStage({ raisedHands }: PinnedSpeakerStageProps) {
  // Cameras + screen-shares, both with placeholders so camera-off participants
  // still get a tile (placeholder shows avatar + name).
  const camTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );
  const screenTracks = useTracks(
    [{ source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false }
  );

  const [pinnedSid, setPinnedSid] = React.useState<string | null>(null);

  // Main: screen-share > pinned camera > first remote camera > first camera.
  const remote = camTracks.find((t) => !t.participant.isLocal);
  const main: TrackReferenceOrPlaceholder | undefined =
    screenTracks[0] ??
    (pinnedSid
      ? camTracks.find((t) => t.participant.identity === pinnedSid)
      : undefined) ??
    remote ??
    camTracks[0];

  // Everything else goes into the thumbnail rail. If a screen-share is active
  // we keep ALL camera tracks in the rail (including the one currently
  // sharing). Otherwise we exclude the main camera so it's not duplicated.
  const thumbs = React.useMemo(() => {
    if (!main) return [];
    if (screenTracks.length > 0) return camTracks;
    return camTracks.filter(
      (t) =>
        !(
          t.participant.identity === main.participant.identity &&
          t.source === main.source
        )
    );
  }, [camTracks, screenTracks, main]);

  const isScreenShare = !!screenTracks[0];
  const handCount = React.useMemo(
    () => Object.values(raisedHands ?? {}).filter(Boolean).length,
    [raisedHands]
  );

  return (
    <div className="relative h-full w-full bg-black">
      {/* MAIN — fills the entire viewport. Falls back to a soft gradient if
          we somehow have no tracks at all (room just opened, no peers yet). */}
      <div className="absolute inset-0">
        {main ? (
          <TrackRefContext.Provider value={main}>
            <ParticipantTile
              trackRef={main}
              className="!w-full !h-full !rounded-none lk-pinned-main"
              disableSpeakingIndicator={isScreenShare}
            />
          </TrackRefContext.Provider>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-zinc-900 via-zinc-950 to-black" />
        )}
      </div>

      {/* Pinned chip on the main view — only shown if user manually pinned
          someone (and we're not auto-routing to a screen share). */}
      {pinnedSid && !isScreenShare && main && (
        <button
          onClick={() => setPinnedSid(null)}
          className="absolute top-20 left-4 z-20 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-black/55 backdrop-blur text-white text-xs font-medium hover:bg-black/70 transition"
        >
          <PinOff className="size-3.5" />
          Unpin
        </button>
      )}

      {/* Screen-share badge */}
      {isScreenShare && (
        <div className="absolute top-20 left-4 z-20 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-cyan-500/90 text-white text-xs font-medium shadow-glow">
          <ScreenShare className="size-3.5" />
          Presenting
        </div>
      )}

      {/* Floating "hands raised" chip — top center. Only renders if at least
          one hand is up; counts include the local user. */}
      <AnimatePresence>
        {handCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-2 h-9 px-4 rounded-full bg-amber-500/95 text-amber-50 text-xs font-semibold shadow-floating"
          >
            <Hand className="size-4" />
            {handCount === 1 ? "1 hand raised" : `${handCount} hands raised`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* THUMBNAIL RAIL — top-right. Vertical stack, scrolls if many
          participants. Each thumb is tappable to pin. */}
      {thumbs.length > 0 && (
        <div className="absolute top-20 right-3 md:right-4 z-10 flex flex-col gap-2 max-h-[calc(100dvh-12rem)] overflow-y-auto no-scrollbar pointer-events-auto">
          {thumbs.map((t) => {
            const id = `${t.participant.identity}-${t.source}`;
            const pinned = pinnedSid === t.participant.identity;
            const handUp = !!raisedHands?.[t.participant.identity];
            return (
              <button
                key={id}
                onClick={() =>
                  setPinnedSid(pinned ? null : t.participant.identity)
                }
                className={cn(
                  "relative w-28 h-20 md:w-36 md:h-24 rounded-xl overflow-hidden ring-1 transition shrink-0 group",
                  pinned
                    ? "ring-cyan-400 shadow-glow"
                    : "ring-white/15 hover:ring-white/30"
                )}
              >
                <TrackRefContext.Provider value={t}>
                  <ParticipantTile
                    trackRef={t}
                    className="!w-full !h-full !rounded-xl lk-pinned-thumb"
                  />
                </TrackRefContext.Provider>
                {handUp && (
                  <span className="absolute top-1 left-1 size-5 grid place-items-center rounded-full bg-amber-500 text-white shadow">
                    <Hand className="size-3" />
                  </span>
                )}
                <span className="absolute top-1 right-1 size-5 grid place-items-center rounded-full bg-black/55 text-white opacity-0 group-hover:opacity-100 transition">
                  <Pin className="size-3" />
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Hidden audio renderer — pipes every remote participant's audio. */}
      <RoomAudioRenderer />
    </div>
  );
}
