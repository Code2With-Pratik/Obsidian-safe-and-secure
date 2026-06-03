"use client";

import * as React from "react";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";
import { useUIStore } from "@/store/use-ui-store";
import { useCallStore } from "@/store/use-call-store";

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;

/**
 * Hoists the `<LiveKitRoom>` connection into the AppShell so the call
 * survives client-side navigation. Without this, navigating away from
 * `/calls/active` (e.g. via the Minimize button) unmounts the room and
 * tears down the LiveKit session — audio drops, video stops, peers see
 * you leave.
 *
 * With this provider:
 *   • The LiveKit connection is mounted once when `activeCall` becomes
 *     truthy and stays mounted until the call truly ends.
 *   • The `/calls/active` page renders its stage + controls AS CHILDREN
 *     of this provider's room, so its `useLocalParticipant` /
 *     `useRoomContext` hooks still work.
 *   • The FloatingMiniCall dock on other routes can also reach into the
 *     same room for live mic / camera state.
 */
export function CallSessionProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const activeCall = useUIStore((s) => s.activeCall);
  const outgoing = useCallStore((s) => s.outgoing);

  // Resolve the room name once we have either a real session or a fallback
  // demo chat. Lock it in a ref so transient null states (a remote-hangup
  // event clearing `outgoing` mid-call) don't switch to a different room
  // and force a reconnect.
  const roomNameRef = React.useRef<string | undefined>(undefined);
  const candidate =
    outgoing?.roomName ??
    (activeCall?.chatId ? `call-${activeCall.chatId}` : undefined);
  if (!roomNameRef.current && candidate) {
    roomNameRef.current = candidate;
  }
  // Reset the locked room name once the call ends, otherwise the next call
  // would attempt to reuse a stale room name.
  React.useEffect(() => {
    if (!activeCall && !outgoing) {
      roomNameRef.current = undefined;
      setLkToken(null);
    }
  }, [activeCall, outgoing]);

  const roomName = roomNameRef.current;

  // Mint a token whenever we have a fresh room name to join.
  const [lkToken, setLkToken] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!LIVEKIT_URL || !roomName) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName })
        });
        if (!res.ok) throw new Error(await res.text());
        const { token } = (await res.json()) as { token: string };
        if (!cancelled) setLkToken(token);
      } catch (err) {
        console.warn("[CallSessionProvider] token fetch failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomName]);

  const useLivekit = !!(LIVEKIT_URL && lkToken && activeCall);

  if (!useLivekit) {
    return <>{children}</>;
  }

  return (
    <LiveKitRoom
      token={lkToken!}
      serverUrl={LIVEKIT_URL}
      connect
      audio
      video={activeCall?.video !== false}
      className="contents"
      data-lk-theme="default"
    >
      {children}
    </LiveKitRoom>
  );
}
