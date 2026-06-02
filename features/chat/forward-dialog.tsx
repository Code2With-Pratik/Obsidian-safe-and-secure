"use client";

import * as React from "react";
import { Forward as ForwardIcon, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useChatStore } from "@/store/use-chat-store";

/**
 * Pick one or more chats to forward the given messages into. Displays every
 * chat the current user is a member of, with a quick search box on top.
 */
export function ForwardDialog({
  open,
  onClose,
  messageIds
}: {
  open: boolean;
  onClose: () => void;
  /** Source message ids to forward. */
  messageIds: string[];
}) {
  const t = useT();
  const chats = useChatStore((s) => s.chats);
  const forward = useChatStore((s) => s.forwardMessages);
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [q, setQ] = React.useState("");
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setPicked(new Set());
      setQ("");
    }
  }, [open]);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return chats;
    return chats.filter((c) => (c.name || "").toLowerCase().includes(needle));
  }, [chats, q]);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async () => {
    if (picked.size === 0 || messageIds.length === 0 || sending) return;
    setSending(true);
    try {
      await forward(messageIds, Array.from(picked));
    } finally {
      setSending(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-1 size-12 rounded-2xl bg-cyan-500/15 text-cyan-400 grid place-items-center">
            <ForwardIcon className="size-5" />
          </div>
          <DialogTitle className="text-center">
            {t("Forward")} {messageIds.length > 1 ? `· ${messageIds.length}` : ""}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t("Pick one or more chats.")}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("Search chats")}
            className="w-full rounded-full glass border border-border/60 bg-transparent pl-9 pr-4 h-10 text-sm outline-none placeholder:text-muted-foreground/70"
          />
        </div>

        <div className="max-h-[50dvh] overflow-y-auto space-y-1 mt-1">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {t("No chats match.")}
            </p>
          )}
          {filtered.map((c) => {
            const on = picked.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className="w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-foreground/5"
              >
                <Avatar className="size-9 shrink-0">
                  <AvatarImage src={c.avatar} alt={c.name} />
                  <AvatarFallback>{initials(c.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {c.type === "dm" ? t("Direct message") : `${c.membersCount ?? 0} ${t("members")}`}
                  </p>
                </div>
                <span
                  className={
                    "size-5 rounded-md border grid place-items-center text-[10px] " +
                    (on
                      ? "bg-foreground text-background border-foreground"
                      : "border-border/60")
                  }
                >
                  {on && "✓"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button variant="gradient" disabled={picked.size === 0 || sending} onClick={submit}>
            {sending
              ? t("Sending…")
              : `${t("Forward")}${picked.size > 0 ? ` · ${picked.size}` : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
