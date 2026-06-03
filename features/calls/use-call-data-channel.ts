"use client";

import * as React from "react";
import { useRoomContext } from "@livekit/components-react";
import {
  RoomEvent,
  type RemoteParticipant,
  type DataPublishOptions
} from "livekit-client";

/** Shape of every payload we exchange over LiveKit's data channel. The kind
 *  discriminator lets one consumer handle hand-raises, chat messages, and
 *  any future signal without separate channels. */
export type CallDataMessage =
  | { kind: "hand"; from: string; raised: boolean }
  | {
      kind: "chat";
      from: string;
      authorName: string;
      authorAvatar?: string;
      id: string;
      createdAt: string;
      text?: string;
      sticker?: { src?: string; emoji?: string; gradient?: string };
      gif?: { src: string; alt?: string };
      meme?: { src: string };
    };

/**
 * Subscribe to inbound data-channel messages from the active LiveKit room
 * and get back a `send()` function for outbound ones. Wraps the SDK's raw
 * Uint8Array transport with JSON encode/decode + a TS discriminated union.
 *
 * Must be called inside a `<LiveKitRoom>` (uses `useRoomContext`).
 */
export function useCallDataChannel(
  onMessage: (msg: CallDataMessage, from: string) => void
) {
  const room = useRoomContext();
  const onMessageRef = React.useRef(onMessage);
  React.useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  React.useEffect(() => {
    if (!room) return;
    const handler = (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const text = new TextDecoder().decode(payload);
        const msg = JSON.parse(text) as CallDataMessage;
        onMessageRef.current(msg, participant?.identity ?? "unknown");
      } catch {
        // malformed payload — ignore.
      }
    };
    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);

  return React.useCallback(
    (msg: CallDataMessage, opts?: DataPublishOptions) => {
      if (!room?.localParticipant) return;
      const data = new TextEncoder().encode(JSON.stringify(msg));
      void room.localParticipant.publishData(data, {
        reliable: true,
        ...opts
      });
    },
    [room]
  );
}
