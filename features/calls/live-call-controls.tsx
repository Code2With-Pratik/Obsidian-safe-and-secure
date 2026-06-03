"use client";

import * as React from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";
import { CallControls } from "./call-controls";

/**
 * Thin bridge that wires `<CallControls>` to the LiveKit local participant.
 * Must be rendered INSIDE a `<LiveKitRoom>` so the hook has room context.
 *
 * - Mic / camera toggles flip the existing track's enabled flag (publishes if
 *   needed on first activation).
 * - Screen-share calls `setScreenShareEnabled`.
 * - Filter strip is purely visual and stays in local state.
 */
export function LiveCallControls({
  onEnd,
  filterId,
  onFilterChange
}: {
  onEnd?: () => void;
  filterId?: string;
  onFilterChange?: (id: string) => void;
}) {
  const { localParticipant } = useLocalParticipant();

  // Track the LiveKit-side state. Initial values come from whatever the room
  // started with (audio: enabled, video: enabled-or-disabled per join opts).
  const micPub = localParticipant?.getTrackPublication(Track.Source.Microphone);
  const camPub = localParticipant?.getTrackPublication(Track.Source.Camera);
  const screenPub = localParticipant?.getTrackPublication(Track.Source.ScreenShare);

  const [muted, setMuted] = React.useState(() => micPub?.isMuted ?? false);
  const [camOff, setCamOff] = React.useState(() => !camPub || camPub.isMuted);
  const [share, setShare] = React.useState(() => !!screenPub && !screenPub.isMuted);

  // Re-sync local mirrors whenever LiveKit reports a change (other peers
  // unmute us via API, hardware permission denied, etc.).
  React.useEffect(() => {
    if (!localParticipant) return;
    const sync = () => {
      const mic = localParticipant.getTrackPublication(Track.Source.Microphone);
      const cam = localParticipant.getTrackPublication(Track.Source.Camera);
      const scr = localParticipant.getTrackPublication(Track.Source.ScreenShare);
      setMuted(mic?.isMuted ?? false);
      setCamOff(!cam || cam.isMuted);
      setShare(!!scr && !scr.isMuted);
    };
    // The participant emits track-mute/unmute events; we listen via the
    // RoomEvent stream the SDK exposes on the participant object.
    localParticipant.on("trackMuted", sync);
    localParticipant.on("trackUnmuted", sync);
    localParticipant.on("trackPublished", sync);
    localParticipant.on("trackUnpublished", sync);
    return () => {
      localParticipant.off("trackMuted", sync);
      localParticipant.off("trackUnmuted", sync);
      localParticipant.off("trackPublished", sync);
      localParticipant.off("trackUnpublished", sync);
    };
  }, [localParticipant]);

  const onMutedChange = React.useCallback(
    async (next: boolean) => {
      if (!localParticipant) return;
      try {
        await localParticipant.setMicrophoneEnabled(!next);
      } catch (err) {
        console.warn("[LiveCallControls] mic toggle failed:", err);
      }
    },
    [localParticipant]
  );

  const onCamOffChange = React.useCallback(
    async (next: boolean) => {
      if (!localParticipant) return;
      try {
        await localParticipant.setCameraEnabled(!next);
      } catch (err) {
        console.warn("[LiveCallControls] camera toggle failed:", err);
      }
    },
    [localParticipant]
  );

  const onShareChange = React.useCallback(
    async (next: boolean) => {
      if (!localParticipant) return;
      try {
        await localParticipant.setScreenShareEnabled(next);
      } catch (err) {
        console.warn("[LiveCallControls] screenshare toggle failed:", err);
      }
    },
    [localParticipant]
  );

  return (
    <CallControls
      onEnd={onEnd}
      filterId={filterId}
      onFilterChange={onFilterChange}
      muted={muted}
      onMutedChange={onMutedChange}
      camOff={camOff}
      onCamOffChange={onCamOffChange}
      share={share}
      onShareChange={onShareChange}
    />
  );
}
