"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CalendarClock, Check, Phone, Search, Sparkles, Users as UsersIcon, Video } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/use-chat-store";
import { users as allUsers } from "@/lib/mock-data";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Build a local-timezone "YYYY-MM-DDTHH:MM" string suitable for the
 *  datetime-local input, defaulting to `offsetMinutes` from now (rounded). */
function defaultIso(offsetMinutes: number) {
  const d = new Date(Date.now() + offsetMinutes * 60 * 1000);
  // round to next quarter hour for niceness
  d.setSeconds(0, 0);
  const m = d.getMinutes();
  const rounded = Math.ceil(m / 15) * 15;
  d.setMinutes(rounded);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleCallDialog({ open, onOpenChange }: Props) {
  const scheduleCallWith = useChatStore((s) => s.scheduleCallWith);

  const [title, setTitle] = React.useState("Team sync");
  const [start, setStart] = React.useState(() => defaultIso(15));
  const [end, setEnd] = React.useState(() => defaultIso(45));
  const [video, setVideo] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [picked, setPicked] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open) {
      setTitle("Team sync");
      setStart(defaultIso(15));
      setEnd(defaultIso(45));
      setVideo(true);
      setQ("");
      setPicked([]);
    }
  }, [open]);

  const candidates = allUsers
    .filter((u) => u.id !== "me")
    .filter((u) =>
      q.trim() === ""
        ? true
        : u.name.toLowerCase().includes(q.toLowerCase()) ||
          u.username.toLowerCase().includes(q.toLowerCase())
    );

  const toggle = (id: string) =>
    setPicked((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );

  const startDate = new Date(start);
  const endDate = new Date(end);
  const isValidWindow = endDate.getTime() > startDate.getTime();

  const handleSchedule = () => {
    if (picked.length === 0 || !isValidWindow) return;
    scheduleCallWith(picked, {
      title: title.trim() || "Scheduled call",
      whenIso: startDate.toISOString(),
      endsAtIso: endDate.toISOString(),
      video
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-md !max-h-[90dvh] !p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-amber-400 to-pink-500 grid place-items-center shadow-glow mb-2">
            <CalendarClock className="text-white" />
          </div>
          <DialogTitle className="text-xl">Schedule a call</DialogTitle>
          <DialogDescription>
            Pick a window and invitees. Each person gets a "Join call" message in their chat with a live countdown.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-2 pt-2 space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Helios design review"
              maxLength={64}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Starts</Label>
              <Input
                type="datetime-local"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  // Auto-bump end if it falls behind start.
                  if (new Date(e.target.value).getTime() >= new Date(end).getTime()) {
                    const d = new Date(e.target.value);
                    d.setMinutes(d.getMinutes() + 30);
                    const pad = (n: number) => String(n).padStart(2, "0");
                    setEnd(
                      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
                    );
                  }
                }}
                className="!text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ends</Label>
              <Input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="!text-sm"
              />
            </div>
          </div>
          {!isValidWindow && (
            <p className="text-[11px] text-rose-300">
              End time must come after the start.
            </p>
          )}

          <div className="flex items-center gap-1 p-1 rounded-full glass-subtle">
            <button
              onClick={() => setVideo(false)}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-full text-xs font-medium transition",
                !video ? "bg-foreground text-background" : "text-muted-foreground"
              )}
            >
              <Phone className="size-3.5" /> Voice
            </button>
            <button
              onClick={() => setVideo(true)}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-full text-xs font-medium transition",
                video ? "bg-foreground text-background" : "text-muted-foreground"
              )}
            >
              <Video className="size-3.5" /> Video
            </button>
          </div>

          <div className="space-y-1.5">
            <Label>Invitees</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search people"
                className="pl-9 h-10"
              />
            </div>
            {picked.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {picked
                  .map((id) => allUsers.find((u) => u.id === id))
                  .filter((u): u is NonNullable<typeof u> => !!u)
                  .map((u) => (
                    <button
                      key={u.id}
                      onClick={() => toggle(u.id)}
                      className="inline-flex items-center gap-1.5 h-7 pl-1 pr-2 rounded-full bg-violet-500/15 border border-violet-400/40 text-xs text-violet-200 hover:bg-violet-500/25 transition"
                    >
                      <Avatar className="size-5">
                        <AvatarImage src={u.avatar} />
                      </Avatar>
                      {u.name.split(" ")[0]}
                    </button>
                  ))}
              </div>
            )}
            <div className="rounded-2xl border border-border/60 max-h-60 overflow-y-auto no-scrollbar">
              {candidates.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-6">
                  No people match "{q}".
                </p>
              ) : (
                candidates.map((u) => {
                  const isPicked = picked.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => toggle(u.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left transition",
                        isPicked
                          ? "bg-foreground/[0.06]"
                          : "hover:bg-foreground/[0.04]"
                      )}
                    >
                      <Avatar className="size-9">
                        <AvatarImage src={u.avatar} />
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          @{u.username}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "size-5 rounded-full grid place-items-center transition",
                          isPicked
                            ? "bg-cyan-400 text-black"
                            : "bg-foreground/10 text-transparent"
                        )}
                      >
                        <Check className="size-3" strokeWidth={4} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="!justify-between px-6 py-4 border-t border-border/40 bg-background/30 backdrop-blur-md">
          <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
            <UsersIcon className="size-3" />
            {picked.length === 0
              ? "No invitees"
              : `${picked.length} ${picked.length === 1 ? "invitee" : "invitees"}`}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                variant="gradient"
                onClick={handleSchedule}
                disabled={picked.length === 0 || !isValidWindow || !title.trim()}
              >
                <Sparkles /> Schedule
              </Button>
            </motion.div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
