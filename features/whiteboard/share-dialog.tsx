"use client";

import * as React from "react";
import { Check, Copy, Globe, Lock, Mail, Share2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { copyText, cn } from "@/lib/utils";
import { useWhiteboardStore } from "@/store/use-whiteboard-store";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ open, onOpenChange }: Props) {
  const board = useWhiteboardStore((s) => s.activeBoard());
  const [access, setAccess] = React.useState<"link" | "team" | "private">("team");
  const [copied, setCopied] = React.useState(false);

  const link = board
    ? `https://nova.app/whiteboard/${encodeURIComponent(board.id)}`
    : "";

  const handleCopy = async () => {
    const ok = await copyText(link);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-md">
        <DialogHeader>
          <div className="size-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center shadow-glow mb-2">
            <Share2 className="text-white" />
          </div>
          <DialogTitle className="text-xl">Share board</DialogTitle>
          <DialogDescription>
            {board?.name ? `“${board.name}”` : "This board"} · who can open it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input value={link} readOnly className="font-mono text-xs" />
            <Button variant={copied ? "glass" : "gradient"} onClick={handleCopy}>
              {copied ? (
                <>
                  <Check /> Copied
                </>
              ) : (
                <>
                  <Copy /> Copy
                </>
              )}
            </Button>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Who has access
            </p>
            <AccessRow
              icon={<Lock className="size-4" />}
              label="Only me"
              hint="Just you — collaborators can't open the link."
              active={access === "private"}
              onClick={() => setAccess("private")}
            />
            <AccessRow
              icon={<Users className="size-4" />}
              label="People in my team"
              hint="Anyone on your workspace can view + edit."
              active={access === "team"}
              onClick={() => setAccess("team")}
            />
            <AccessRow
              icon={<Globe className="size-4" />}
              label="Anyone with the link"
              hint="Publicly accessible — be mindful of what's on the board."
              active={access === "link"}
              onClick={() => setAccess("link")}
            />
          </div>
        </div>

        <DialogFooter className="!justify-between">
          <Button variant="ghost">
            <Mail /> Email invite
          </Button>
          <Button variant="gradient" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccessRow({
  icon,
  label,
  hint,
  active,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 p-3 rounded-xl text-left transition border",
        active
          ? "bg-cyan-400/10 border-cyan-400/40 ring-1 ring-cyan-400/30"
          : "bg-foreground/[0.02] border-border/60 hover:border-border"
      )}
    >
      <div className="size-8 rounded-lg bg-foreground/10 grid place-items-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
      </div>
      {active && <Check className="size-4 text-cyan-400 mt-1.5" />}
    </button>
  );
}
