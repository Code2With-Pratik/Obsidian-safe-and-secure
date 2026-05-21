"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Ghost, Lock, Sparkles, Timer, Users } from "lucide-react";
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

export function CreateGhostDialog({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = React.useState(true);
  const [capacity, setCapacity] = React.useState([40]);
  const [pin] = React.useState(() => Math.floor(1000 + Math.random() * 9000).toString());

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="!max-w-lg">
        <DialogHeader>
          <div className="size-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-glow mb-2">
            <Ghost className="text-white" />
          </div>
          <DialogTitle className="text-xl">Conjure a ghost room</DialogTitle>
          <DialogDescription>
            Identities will be hidden. Messages disappear when the room closes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Room name</Label>
            <Input placeholder="Midnight Lounge" />
          </div>

          <div className="space-y-1.5">
            <Label>Topic</Label>
            <Input placeholder="What's the vibe?" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SettingTile
              icon={<Lock className="size-4" />}
              title="Lock with PIN"
              subtitle={locked ? `PIN ${pin}` : "Open to anyone with link"}
            >
              <Switch checked={locked} onCheckedChange={setLocked} />
            </SettingTile>
            <SettingTile
              icon={<Timer className="size-4" />}
              title="Auto-close"
              subtitle="In 8 hours"
            >
              <Switch defaultChecked />
            </SettingTile>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <Label className="flex items-center gap-1.5">
                <Users className="size-3" /> Capacity
              </Label>
              <span className="text-muted-foreground">{capacity[0]} ghosts</span>
            </div>
            <Slider value={capacity} onValueChange={setCapacity} min={5} max={200} step={5} />
          </div>
        </div>

        <DialogFooter className="!justify-between">
          <Button variant="ghost">Cancel</Button>
          <Button variant="gradient">
            <Sparkles /> Open room
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
