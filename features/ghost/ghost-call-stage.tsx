"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
// `AnimatePresence` is still used by the mobile fullscreen sheet below.
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { EMPTY_LIST, useGhostStore, type GhostIdentity } from "@/store/use-ghost-store";
import { GhostCallTile } from "./ghost-call-tile";
import { useT } from "@/lib/i18n";

const EMPTY_MEMBERS = EMPTY_LIST as readonly GhostIdentity[];

/** Width of the desktop participants panel. Exported so the bottom-controls
 *  container can shift by the same amount and stay centered on the camera. */
export const GHOST_PANEL_WIDTH = 380;

interface Props {
  roomId: string;
  filterCss?: string;
  participantsOpen: boolean;
  onToggleParticipants: () => void;
}

export function GhostCallStage({
  roomId,
  filterCss,
  participantsOpen,
  onToggleParticipants
}: Props) {
  const t = useT();
  const members = useGhostStore((s) => s.membersByRoom[roomId] ?? EMPTY_MEMBERS);
  const myIdentity = useGhostStore((s) => s.myIdentityByRoom[roomId]);
  const hostId = useGhostStore((s) => s.hostByRoom[roomId]);
  const pinnedId = useGhostStore((s) => s.callByRoom[roomId]?.pinnedId);

  const iAmHost = !!myIdentity && hostId === myIdentity.id;
  const effectivePinId = pinnedId ?? hostId ?? members[0]?.id;
  const pinned = members.find((m) => m.id === effectivePinId) ?? members[0];
  const others = members.filter((m) => m.id !== pinned?.id);

  if (!pinned) {
    return (
      <div className="h-full grid place-items-center text-muted-foreground">
        {t("Waiting for someone to join…")}
      </div>
    );
  }

  return (
    <div
      className="h-full w-full transition-[filter] duration-200"
      style={{ filter: filterCss && filterCss !== "none" ? filterCss : undefined }}
    >
      {/* ─────────────── Desktop ───────────────
          Pinned camera fills the stage; an absolute-positioned panel slides
          in from the right when toggled. We animate the camera's right
          padding so it visibly shrinks/grows in sync with the panel — and
          because the panel is always mounted (just translated off-screen),
          the close animation properly reverses the open one. */}
      <div className="hidden md:block h-full relative p-3">
        <motion.div
          initial={false}
          animate={{ paddingRight: participantsOpen ? GHOST_PANEL_WIDTH + 12 : 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 28 }}
          className="h-full"
        >
          <GhostCallTile
            roomId={roomId}
            identity={pinned}
            isHost={pinned.id === hostId}
            isMe={pinned.id === myIdentity?.id}
            iAmHost={iAmHost}
            variant="pinned"
          />
        </motion.div>

        <motion.div
          initial={false}
          animate={{
            x: participantsOpen ? 0 : GHOST_PANEL_WIDTH + 24,
            opacity: participantsOpen ? 1 : 0
          }}
          transition={{ type: "spring", stiffness: 240, damping: 28 }}
          aria-hidden={!participantsOpen}
          className={cn(
            "absolute top-3 right-3 bottom-3 overflow-y-auto no-scrollbar",
            !participantsOpen && "pointer-events-none"
          )}
          style={{ width: GHOST_PANEL_WIDTH }}
        >
          <div className="grid gap-2 grid-cols-2">
            {others.map((m) => (
              <GhostCallTile
                key={m.id}
                roomId={roomId}
                identity={m}
                isHost={m.id === hostId}
                isMe={m.id === myIdentity?.id}
                iAmHost={iAmHost}
                variant="tile"
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* ─────────────── Mobile ─────────────── */}
      <div className="md:hidden h-full flex flex-col gap-2 p-2">
        <div className="relative flex-1 min-h-0">
          <GhostCallTile
            roomId={roomId}
            identity={pinned}
            isHost={pinned.id === hostId}
            isMe={pinned.id === myIdentity?.id}
            iAmHost={iAmHost}
            variant="pinned"
          />
        </div>

        {/* Horizontal strip + small "expand" chevron tab. Hidden when the
            fullscreen sheet is open. */}
        {others.length > 0 && !participantsOpen && (
          <div className="shrink-0 -mx-2 px-2 relative">
            {/* Pill handle, centered, sits above the strip and reads like
                a drawer grip. Tap → opens the fullscreen participants sheet. */}
            <button
              onClick={onToggleParticipants}
              aria-label={`${t("Show all")} ${members.length} ${t("participants")}`}
              className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1 h-7 px-2.5 rounded-full glass-strong border border-white/15 text-[11px] font-medium text-white shadow-floating hover:bg-foreground/20 transition"
            >
              <ChevronUp className="size-3.5" />
              {t("All")} {members.length}
            </button>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 pt-1">
              {others.map((m) => (
                <div key={m.id} className="w-32 shrink-0">
                  <GhostCallTile
                    roomId={roomId}
                    identity={m}
                    isHost={m.id === hostId}
                    isMe={m.id === myIdentity?.id}
                    iAmHost={iAmHost}
                    variant="tile"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile fullscreen participants sheet — slides up over everything. */}
      <AnimatePresence>
        {participantsOpen && (
          <motion.div
            key="mobile-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="md:hidden fixed inset-0 z-[55] bg-background/95 backdrop-blur-xl flex flex-col"
          >
            <header className="h-14 flex items-center gap-2 px-3 border-b border-border/40">
              <button
                onClick={onToggleParticipants}
                aria-label={t("Close participants")}
                className="size-9 rounded-full bg-foreground/10 grid place-items-center text-white"
              >
                <ChevronDown className="size-5" />
              </button>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{t("All participants")}</p>
                <p className="text-[11px] text-muted-foreground">
                  {members.length} {members.length === 1 ? t("ghost") : t("ghosts")} {t("on stage")}
                </p>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid gap-2 grid-cols-2">
                {[pinned, ...others].map((m) => (
                  <GhostCallTile
                    key={m.id}
                    roomId={roomId}
                    identity={m}
                    isHost={m.id === hostId}
                    isMe={m.id === myIdentity?.id}
                    iAmHost={iAmHost}
                    variant="tile"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
