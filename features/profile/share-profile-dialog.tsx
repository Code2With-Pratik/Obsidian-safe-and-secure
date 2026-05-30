"use client";

import * as React from "react";
import { Search, Send, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toaster";
import { users, currentUser } from "@/lib/mock-data";
import { cn, initials } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { User } from "@/types";

interface Props {
  /** The profile being shared (currentUser when sharing your own profile). */
  profile: User;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ShareProfileDialog({ profile, open, onOpenChange }: Props) {
  const t = useT();
  const { toast } = useToast();
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  // Reset selection + query each time the dialog opens.
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(new Set());
    }
  }, [open]);

  // Don't include the profile being shared in the recipients list — sharing
  // your own profile to yourself is meaningless.
  const recipients = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => u.id !== profile.id && u.id !== currentUser.id)
      .filter((u) =>
        !q
          ? true
          : u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
      );
  }, [query, profile.id]);

  const toggle = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSend = () => {
    if (selected.size === 0) return;
    // Real chat integration is a follow-up — for now we acknowledge with a
    // toast so the share flow is end-to-end testable.
    const names = Array.from(selected)
      .map((id) => users.find((u) => u.id === id)?.name)
      .filter(Boolean) as string[];
    toast({
      title: t("Profile sent"),
      description:
        names.length === 1
          ? t("Sent to") + ` ${names[0]}`
          : t("Sent to") + ` ${names.length} ${t("people")}`
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw_-_2rem)] max-w-md p-0 overflow-hidden">
        <div className="max-h-[80vh] flex flex-col">
          <div className="p-6 pb-3">
            <DialogHeader>
              <DialogTitle className="text-xl font-display">{t("Share profile")}</DialogTitle>
              <DialogDescription>
                {t("Pick people to send")} <span className="font-medium">{profile.name}</span>{" "}
                {t("to. They'll see a profile card in their chat.")}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("Search by name or @handle")}
                className="pl-9"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 mt-1">
            {recipients.length === 0 ? (
              <div className="px-3 py-10 text-center text-sm text-muted-foreground">
                {t("No people match that search.")}
              </div>
            ) : (
              recipients.map((u) => {
                const isSel = selected.has(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => toggle(u.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition text-left",
                      isSel
                        ? "bg-primary/10"
                        : "hover:bg-foreground/[0.04]"
                    )}
                  >
                    <Avatar className="size-9">
                      <AvatarImage src={u.avatar} alt={u.name} />
                      <AvatarFallback>{initials(u.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">{u.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">@{u.username}</p>
                    </div>
                    <span
                      className={cn(
                        "size-5 rounded-full border grid place-items-center transition",
                        isSel
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border/60"
                      )}
                    >
                      {isSel && <Check className="size-3.5" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/40 gap-2 sm:gap-2">
            <Button variant="glass" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button
              variant="gradient"
              onClick={handleSend}
              disabled={selected.size === 0}
            >
              <Send />
              {selected.size > 1
                ? `${t("Send to")} ${selected.size}`
                : t("Send")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
