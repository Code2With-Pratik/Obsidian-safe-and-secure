"use client";

import * as React from "react";
import { LiveKitRoom, RoomAudioRenderer, useParticipants } from "@livekit/components-react";
import "@livekit/components-styles";
import { Radio } from "lucide-react";
import type { GhostIdentity } from "@/store/use-ghost-store";

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;

/**
 * Discord-style voice presence for ghost rooms. Connects an audio-only
 * LiveKit session keyed by the ghost room id, using the user's ghost
 * handle as the LiveKit `identity` + `name` so peers see "Whisper#1234"
 * not the real profile.
 *
 * The mock voice UI (GhostCallStage, GhostCallControls) still renders on
 * top — this component only handles the actual audio plane + a tiny live
 * indicator on the top-right.
 *
 * Mounts inside the detail page once the user has joined the room.
 */
export function GhostRoomVoice({
  roomId,
  myIdentity
}: {
  roomId: string;
  myIdentity: GhostIdentity;
}) {
  const [token, setToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!LIVEKIT_URL) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomName: `ghost-${roomId}`,
            ghostIdentity: myIdentity.name,
            ghostName: myIdentity.name,
            ghostHue: myIdentity.hue,
            ghostSeed: myIdentity.avatarSeed
          })
        });
        if (!res.ok) {
          console.warn("[ghost-voice] token fetch failed:", await res.text());
          return;
        }
        const data = (await res.json()) as { token: string };
        if (!cancelled) setToken(data.token);
      } catch (err) {
        console.warn("[ghost-voice] token error:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, myIdentity.name, myIdentity.hue, myIdentity.avatarSeed]);

  if (!LIVEKIT_URL || !token) return null;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={LIVEKIT_URL}
      connect
      audio
      video={false}
      className="contents"
      data-lk-theme="default"
    >
      {/* Hidden audio plane — pipes every peer's mic to the local speaker. */}
      <RoomAudioRenderer />
      <LiveCountChip />
    </LiveKitRoom>
  );
}

/** Tiny pill in the top-right reading "N voices live" — real LiveKit
 *  participant count, separate from the mock member count in the header. */
function LiveCountChip() {
  const participants = useParticipants();
  const count = participants.length;
  return (
    <div className="pointer-events-none fixed top-3 right-3 z-30">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-[11px] font-semibold shadow-glow">
        <Radio className="size-3 animate-pulse" />
        {count} {count === 1 ? "voice live" : "voices live"}
      </div>
    </div>
  );
}
