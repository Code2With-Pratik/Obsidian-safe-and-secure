"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, KeyRound, ShieldAlert, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGhostStore } from "@/store/use-ghost-store";
import { useT } from "@/lib/i18n";
import type { GhostRoom } from "@/types";
import { PinInput } from "./pin-input";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, only this room's PIN will be accepted. Otherwise any room. */
  room?: GhostRoom;
  /** Fires after the user successfully joins. */
  onJoined?: (room: GhostRoom) => void;
}

export function JoinPinDialog({ open, onOpenChange, room, onJoined }: Props) {
  const t = useT();
  const router = useRouter();
  const findByPin = useGhostStore((s) => s.findByPin);
  const joinRoom = useGhostStore((s) => s.joinRoom);
  const [pin, setPin] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [joinedRoom, setJoinedRoom] = React.useState<GhostRoom | null>(null);

  React.useEffect(() => {
    if (open) {
      setPin("");
      setError(null);
      setJoinedRoom(null);
    }
  }, [open]);

  const tryJoin = async (candidate: string) => {
    setError(null);
    if (candidate.length !== 6) return;
    // Resolve the target room — either the one we were opened for, or the
    // first cached room with that PIN. Final PIN verification happens
    // server-side in /api/ghost-rooms/join so we don't trust local cache.
    let target: GhostRoom | undefined;
    if (room) {
      target = room;
    } else {
      target = findByPin(candidate);
    }
    if (!target) {
      setError(t("No ghost room matches that PIN."));
      return;
    }
    const result = await joinRoom(target.id, candidate);
    if (!result.ok) {
      setError(
        result.error === "Wrong PIN"
          ? t("That PIN doesn't match this room.")
          : t(result.error)
      );
      return;
    }
    setJoinedRoom(target);
    onJoined?.(target);
    onOpenChange(false);
    router.push(`/ghost-rooms/${target.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-md">
        <DialogHeader>
          <div className="size-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-glow mb-2">
            {joinedRoom ? (
              <CheckCircle2 className="text-white" />
            ) : (
              <KeyRound className="text-white" />
            )}
          </div>
          <DialogTitle className="text-xl">
            {joinedRoom
              ? `${t("You're in")} · ${joinedRoom.name}`
              : room
                ? `${t("Enter PIN for")} ${room.name}`
                : t("Join with PIN")}
          </DialogTitle>
          <DialogDescription>
            {joinedRoom
              ? t("You're now ghosting alongside the others. Be kind.")
              : t("Type the 6-digit PIN someone shared with you.")}
          </DialogDescription>
        </DialogHeader>

        {!joinedRoom && (
          <div className="space-y-3 py-2">
            <PinInput
              value={pin}
              onChange={(v) => {
                setPin(v);
                if (error) setError(null);
              }}
              onComplete={(v) => void tryJoin(v)}
              autoFocus
              error={!!error}
            />
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-1.5 text-xs text-rose-300"
              >
                <ShieldAlert className="size-3.5" />
                {error}
              </motion.div>
            )}
          </div>
        )}

        <DialogFooter className="!justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {joinedRoom ? t("Close") : t("Cancel")}
          </Button>
          {!joinedRoom && (
            <Button
              variant="gradient"
              disabled={pin.length !== 6}
              onClick={() => void tryJoin(pin)}
            >
              <Sparkles /> {t("Join room")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
