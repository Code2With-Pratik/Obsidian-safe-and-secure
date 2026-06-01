"use client";

import * as React from "react";
import {
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks
} from "@livekit/components-react";
import { Track } from "livekit-client";

/**
 * LiveKit video stage — renders one tile per camera/screen-share track in a
 * responsive grid, plus a hidden audio renderer that pipes every remote
 * participant's audio to the speakers. Designed to be dropped INSIDE a
 * `<LiveKitRoom>` so it picks up the room context.
 */
export function LiveKitStage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false }
    ],
    { onlySubscribed: false }
  );

  return (
    <div className="relative h-full w-full">
      <GridLayout tracks={tracks} className="h-full w-full">
        <ParticipantTile />
      </GridLayout>
      <RoomAudioRenderer />
    </div>
  );
}
