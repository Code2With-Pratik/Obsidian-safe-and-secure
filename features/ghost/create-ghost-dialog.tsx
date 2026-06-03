"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Ghost, Lock, RefreshCcw, Sparkles, Timer, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { copyText, cn } from "@/lib/utils";
import { generatePin, useGhostStore } from "@/store/use-ghost-store";
import { useT } from "@/lib/i18n";
import type { GhostRoom } from "@/types";

const AUTO_CLOSE_OPTIONS: { label: string; hours: number }[] = [
  { label: "1h", hours: 1 },
  { label: "4h", hours: 4 },
  { label: "8h", hours: 8 },
  { label: "24h", hours: 24 }
];

interface Props {
  children?: React.ReactNode;
  /** Controlled open state (optional — when omitted the trigger drives it). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: (room: GhostRoom) => void;
}

export function CreateGhostDialog({ children, open, onOpenChange, onCreated }: Props) {
  const t = useT();
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : uncontrolledOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setUncontrolledOpen(v);
    onOpenChange?.(v);
  };

  const router = useRouter();
  const createRoom = useGhostStore((s) => s.createRoom);

  const [name, setName] = React.useState("");
  const [topic, setTopic] = React.useState("");
  const [locked, setLocked] = React.useState(true);
  const [autoClose, setAutoClose] = React.useState(true);
  const [autoCloseHours, setAutoCloseHours] = React.useState(8);
  const [capacity, setCapacity] = React.useState([40]);
  const [pin, setPin] = React.useState(() => generatePin());
  const [pinCopied, setPinCopied] = React.useState(false);

  // Reset form whenever the dialog opens.
  React.useEffect(() => {
    if (isOpen) {
      setName("");
      setTopic("");
      setLocked(true);
      setAutoClose(true);
      setAutoCloseHours(8);
      setCapacity([40]);
      setPin(generatePin());
      setPinCopied(false);
    }
  }, [isOpen]);

  const regeneratePin = () => {
    setPin(generatePin());
    setPinCopied(false);
  };

  const handleCopyPin = async () => {
    const ok = await copyText(pin);
    if (ok) {
      setPinCopied(true);
      window.setTimeout(() => setPinCopied(false), 1500);
    }
  };

  const handleSubmit = async () => {
    const room = await createRoom({
      name,
      topic,
      pin,
      locked,
      capacity: capacity[0],
      autoCloseHours: autoClose ? autoCloseHours : 0
    });
    if (!room) return;
    onCreated?.(room);
    setOpen(false);
    router.push(`/ghost-rooms/${room.id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="!max-w-lg">
        <DialogHeader>
          <div className="size-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-glow mb-2">
            <Ghost className="text-white" />
          </div>
          <DialogTitle className="text-xl">{t("Conjure a ghost room")}</DialogTitle>
          <DialogDescription>
            {t("Identities will be hidden. Messages disappear when the room closes.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("Room name")}</Label>
            <Input
              placeholder="Midnight Lounge"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={48}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("Topic")}</Label>
            <Input
              placeholder={t("What's the vibe?")}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={120}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SettingTile
              icon={<Lock className="size-4" />}
              title={t("Lock with PIN")}
              subtitle={locked ? t("Only PIN holders can enter") : t("Open to anyone")}
            >
              <Switch checked={locked} onCheckedChange={setLocked} />
            </SettingTile>
            <SettingTile
              icon={<Timer className="size-4" />}
              title={t("Auto-close")}
              subtitle={autoClose ? `${t("In")} ${autoCloseHours}h` : t("Stays open")}
            >
              <Switch checked={autoClose} onCheckedChange={setAutoClose} />
            </SettingTile>
          </div>

          <AnimatePresence initial={false}>
            {locked && (
              <motion.div
                key="pin"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-border/60 bg-background/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="!text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("Room PIN")}
                    </Label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={regeneratePin}
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-md hover:bg-foreground/5"
                      >
                        <RefreshCcw className="size-3" /> {t("New")}
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyPin}
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-md hover:bg-foreground/5"
                      >
                        {pinCopied ? (
                          <>
                            <Check className="size-3 text-emerald-400" /> {t("Copied")}
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" /> {t("Copy")}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-center gap-2">
                    {pin.split("").map((digit, i) => (
                      <div
                        key={i}
                        className="size-10 rounded-lg bg-foreground/10 grid place-items-center font-mono text-lg font-semibold tracking-wider"
                      >
                        {digit}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {autoClose && (
              <motion.div
                key="auto-close"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-border/60 bg-background/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="!text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("Auto-close after")}
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      {autoCloseHours}h
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {AUTO_CLOSE_OPTIONS.map((opt) => {
                      const active = autoCloseHours === opt.hours;
                      return (
                        <button
                          key={opt.hours}
                          type="button"
                          onClick={() => setAutoCloseHours(opt.hours)}
                          className={cn(
                            "flex-1 h-8 rounded-lg text-xs font-medium transition",
                            active
                              ? "bg-foreground text-background"
                              : "bg-foreground/10 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <Slider
                    value={[autoCloseHours]}
                    onValueChange={(v) => setAutoCloseHours(v[0])}
                    min={1}
                    max={72}
                    step={1}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <Label className="flex items-center gap-1.5">
                <Users className="size-3" /> {t("Capacity")}
              </Label>
              <span className="text-muted-foreground">{capacity[0]} {t("ghosts")}</span>
            </div>
            <Slider value={capacity} onValueChange={setCapacity} min={5} max={200} step={5} />
          </div>
        </div>

        <DialogFooter className="!justify-between">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("Cancel")}
          </Button>
          <Button variant="gradient" onClick={() => void handleSubmit()}>
            <Sparkles /> {t("Open room")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingTile({
  icon,
  title,
  subtitle,
  children
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="glass-subtle rounded-xl p-3 flex items-center gap-3">
      <div className="size-9 rounded-lg bg-foreground/10 grid place-items-center">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">{title}</p>
        <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
