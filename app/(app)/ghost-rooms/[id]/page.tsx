"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, Ghost, KeyRound, Lock, Radio, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GhostCallStage, GHOST_PANEL_WIDTH } from "@/features/ghost/ghost-call-stage";
import { GhostCallControls } from "@/features/ghost/ghost-call-controls";
import {
  GhostStreamChat,
  GhostStreamOverlay
} from "@/features/ghost/ghost-stream-chat";
import { JoinPinDialog } from "@/features/ghost/join-pin-dialog";
import { GhostRoomVoice } from "@/features/ghost/ghost-room-voice";
import { CALL_FILTERS } from "@/features/calls/call-controls";
import { useGhostStore } from "@/store/use-ghost-store";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

function LiveTimer() {
  const [s, setS] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return (
    <span className="font-mono text-xs tabular-nums" suppressHydrationWarning>
      00:{mm}:{ss}
    </span>
  );
}

export default function GhostRoomPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const room = useGhostStore((s) => s.rooms.find((r) => r.id === params.id));
  const joined = useGhostStore((s) =>
    params.id ? s.joinedIds.includes(params.id) : false
  );
  const joinRoom = useGhostStore((s) => s.joinRoom);
  const leaveRoom = useGhostStore((s) => s.leaveRoom);
  const memberCount = useGhostStore((s) =>
    params.id ? (s.membersByRoom[params.id] ?? []).length : 0
  );
  const myIdentity = useGhostStore((s) =>
    params.id ? s.myIdentityByRoom[params.id] : undefined
  );
  const hostId = useGhostStore((s) =>
    params.id ? s.hostByRoom[params.id] : undefined
  );
  const iAmHost = !!myIdentity && myIdentity.id === hostId;

  const [pinOpen, setPinOpen] = React.useState(false);
  const [chatOpen, setChatOpen] = React.useState(false);
  const [participantsOpen, setParticipantsOpen] = React.useState(false);
  const [filterId, setFilterId] = React.useState("none");
  const filterCss = CALL_FILTERS.find((f) => f.id === filterId)?.css ?? "none";

  // Auto-join public rooms — and re-fetch room list on mount so a deep
  // link into /ghost-rooms/<id> works even if the room cache is empty
  // (e.g. first visit, after refresh).
  const fetchRooms = useGhostStore((s) => s.fetchRooms);
  const ghostLoaded = useGhostStore((s) => s.loaded);
  React.useEffect(() => {
    if (!ghostLoaded) void fetchRooms();
  }, [ghostLoaded, fetchRooms]);
  React.useEffect(() => {
    if (!room) return;
    if (joined) return;
    if (!room.isLocked) void joinRoom(room.id);
  }, [room?.id, room?.isLocked, joined, joinRoom]);

  if (!room) {
    return (
      <div className="h-[calc(100dvh-4rem)] grid place-items-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-10 text-center max-w-md"
        >
          <Ghost className="size-12 mx-auto text-muted-foreground" />
          <h2 className="font-semibold mt-3 text-lg">{t("Room not found")}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("It may have auto-closed. Try a different PIN or browse open rooms.")}
          </p>
          <Button
            variant="gradient"
            className="mt-4"
            onClick={() => router.push("/ghost-rooms")}
          >
            {t("Back to rooms")}
          </Button>
        </motion.div>
      </div>
    );
  }

  // PIN gate for locked rooms.
  if (room.isLocked && !joined) {
    return (
      <>
        <div className="h-[calc(100dvh-4rem)] grid place-items-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-8 text-center max-w-md w-full overflow-hidden relative"
          >
            <div
              className="absolute inset-0 opacity-40 -z-10"
              style={{ background: room.aura }}
            />
            <div className="absolute inset-0 bg-black/40 -z-10" />
            <div className="size-14 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-glow mx-auto">
              <KeyRound className="text-white" />
            </div>
            <h2 className="font-display text-2xl font-semibold mt-3">
              {room.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {room.topic}
            </p>
            <div className="mt-5 flex flex-col gap-2 max-w-xs mx-auto">
              <Button variant="gradient" size="lg" onClick={() => setPinOpen(true)}>
                <KeyRound /> {t("Enter PIN to join")}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => router.push("/ghost-rooms")}
              >
                {t("Back to rooms")}
              </Button>
            </div>
          </motion.div>
        </div>
        <JoinPinDialog open={pinOpen} onOpenChange={setPinOpen} room={room} />
      </>
    );
  }

  const handleLeave = () => {
    void leaveRoom(room.id);
    router.push("/ghost-rooms");
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-background">
      {/* Stage: pinned + bento (with CSS filter applied to the whole stage). */}
      <div className="absolute inset-0">
        <GhostCallStage
          roomId={room.id}
          filterCss={filterCss}
          participantsOpen={participantsOpen}
          onToggleParticipants={() => setParticipantsOpen((v) => !v)}
        />
      </div>

      {/* Top / bottom gradients for floating UI contrast. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/55 to-transparent" />

      {/* Top status row */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between gap-2 px-3 md:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 pointer-events-none">
        <Button
          variant="glass"
          size="sm"
          onClick={() => router.push("/ghost-rooms")}
          className="pointer-events-auto"
        >
          <ChevronLeft /> {t("Rooms")}
        </Button>

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto flex items-center gap-3 glass-strong rounded-full px-4 py-1.5 border border-border/60 max-w-[60vw]"
        >
          <Ghost className="size-3.5 text-violet-300" />
          <span className="text-xs font-semibold truncate">{room.name}</span>
          <span className="text-muted-foreground/60 hidden md:inline">·</span>
          <div className="hidden md:flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs">{t("LIVE")}</span>
          </div>
          <span className="text-muted-foreground/60 hidden md:inline">·</span>
          <LiveTimer />
          <span className="text-muted-foreground/60 hidden md:inline">·</span>
          <span className="hidden md:inline-flex text-xs text-muted-foreground items-center gap-1">
            <Lock className="size-3 text-emerald-400" /> E2E
          </span>
        </motion.div>

        <div className="pointer-events-auto flex items-center gap-2">
          {iAmHost && (
            <Badge variant="warning" className="hidden sm:inline-flex">
              <Sparkles className="size-3" /> {t("host")}
            </Badge>
          )}
          <Badge variant="success" className="hidden md:inline-flex">
            <Radio className="size-3" /> {memberCount} {t("inside")}
          </Badge>
        </div>
      </div>

      {/* YouTube-style chat overlay (always visible, auto-fades stale messages) */}
      <GhostStreamOverlay roomId={room.id} />

      {/* Bottom floating controls. When the desktop participants panel is
          open we shrink the controls' horizontal area so they stay centered
          ON the pinned camera (not on the whole viewport). The shift matches
          the panel width + the stage's 12px gutter. Mobile uses a fullscreen
          sheet, so it doesn't need this offset. */}
      <div
        className={cn(
          "absolute bottom-0 left-0 z-20 pb-[max(1rem,env(safe-area-inset-bottom))] grid place-items-center pointer-events-none transition-[right] duration-300 ease-out",
          participantsOpen ? "right-0 md:right-[var(--ghost-panel-offset)]" : "right-0"
        )}
        style={{
          ["--ghost-panel-offset" as never]: `${GHOST_PANEL_WIDTH + 24}px`
        }}
      >
        <div className="pointer-events-auto">
          <GhostCallControls
            roomId={room.id}
            filterId={filterId}
            onFilterChange={setFilterId}
            chatOpen={chatOpen}
            onToggleChat={() => setChatOpen((v) => !v)}
            participantsOpen={participantsOpen}
            onToggleParticipants={() => setParticipantsOpen((v) => !v)}
            onEnd={handleLeave}
          />
        </div>
      </div>

      {/* Stream chat side panel */}
      <GhostStreamChat roomId={room.id} open={chatOpen} onOpenChange={setChatOpen} />

      {/* Discord-style real voice plane — connects an audio-only LiveKit
          room with the user's ghost handle as the identity so peers see
          "Whisper#1234" instead of the real profile. Only mounts once we
          have an identity (i.e. after joinRoom resolves). */}
      {joined && myIdentity && (
        <GhostRoomVoice roomId={room.id} myIdentity={myIdentity} />
      )}
    </div>
  );
}
