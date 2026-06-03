"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, UserPlus } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useAuthStore } from "@/store/use-auth-store";
import { createClient } from "@/lib/supabase/client";

interface ProfileRow {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
}

/**
 * Glass popup for adding people to an in-flight call.
 *
 *  ┌──────────────────────────────────┐
 *  │ Invite to call               × │
 *  │ [search bar]                     │
 *  │ ┌ avatar  Name      @handle  ○ ┐ │
 *  │ │ avatar  Name      @handle  ● │ │
 *  │ └──────────────────────────────┘ │
 *  │ [Cancel]            [Invite · N] │
 *  └──────────────────────────────────┘
 *
 * POSTs `/api/calls/invite` with `{ sessionId, userIds }` — the server adds
 * them to the session row and broadcasts `call:ring` so they get an incoming
 * call modal on their device.
 */
export function InviteToCallPopup({
  open,
  onClose,
  sessionId
}: {
  open: boolean;
  onClose: () => void;
  sessionId: string | null;
}) {
  const t = useT();
  const meId = useAuthStore((s) => s.user?.id);
  const [mounted, setMounted] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [people, setPeople] = React.useState<ProfileRow[]>([]);
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [sending, setSending] = React.useState(false);
  const [sentCount, setSentCount] = React.useState(0);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) {
      setSearch("");
      setPicked(new Set());
      setPeople([]);
      setSentCount(0);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const supabase = createClient();
    const timer = window.setTimeout(async () => {
      let query = supabase
        .from("profiles")
        .select("id, name, username, avatar")
        .limit(20);
      const q = search.trim();
      if (q) {
        query = query.or(`name.ilike.%${q}%,username.ilike.%${q}%`);
      } else {
        query = query.order("last_seen_at", {
          ascending: false,
          nullsFirst: false
        });
      }
      const { data } = await query;
      if (cancelled) return;
      const exclude = new Set(meId ? [meId] : []);
      setPeople(((data ?? []) as ProfileRow[]).filter((p) => !exclude.has(p.id)));
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, search, meId]);

  const togglePick = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const sendInvites = async () => {
    if (!sessionId || picked.size === 0 || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/calls/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userIds: Array.from(picked)
        })
      });
      if (!res.ok) {
        console.warn("[invite] failed:", await res.text());
        return;
      }
      const data = (await res.json()) as { invited?: string[] };
      setSentCount(data.invited?.length ?? picked.size);
      window.setTimeout(() => onClose(), 1400);
    } finally {
      setSending(false);
    }
  };

  if (!open || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[400] grid place-items-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.95, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 16, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm max-h-[80dvh] flex flex-col rounded-3xl glass-strong glass-specular border border-border/60 shadow-floating overflow-hidden"
        >
          <div className="p-5 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-display font-semibold">
                  {t("Invite to call")}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("Pick anyone to ring straight into this call.")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label={t("Close")}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search by name or @handle")}
                className="w-full rounded-full glass border border-border/60 bg-transparent pl-9 pr-4 h-10 text-sm outline-none placeholder:text-muted-foreground/70"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-1 space-y-1">
            {people.length === 0 ? (
              <p className="py-4 text-center text-[11px] text-muted-foreground">
                {t("No matches")}
              </p>
            ) : (
              people.map((p) => {
                const on = picked.has(p.id);
                const title = p.name ?? p.username ?? "User";
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePick(p.id)}
                    className="w-full flex items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-foreground/5 transition"
                  >
                    <Avatar className="size-8 shrink-0">
                      <AvatarImage src={p.avatar ?? undefined} />
                      <AvatarFallback>{initials(title)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{title}</p>
                      {p.username && (
                        <p className="truncate text-[11px] text-muted-foreground">
                          @{p.username}
                        </p>
                      )}
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
              })
            )}
          </div>

          <div className="flex items-center gap-2 p-4 border-t border-border/40 shrink-0">
            <Button variant="ghost" onClick={onClose} className="flex-1">
              {t("Cancel")}
            </Button>
            <Button
              variant="gradient"
              disabled={picked.size === 0 || sending || !sessionId}
              onClick={() => void sendInvites()}
              className="flex-1"
            >
              <UserPlus className="size-4" />
              {sentCount > 0
                ? `${t("Invited")} · ${sentCount}`
                : sending
                ? t("Ringing…")
                : `${t("Invite")}${picked.size > 0 ? ` · ${picked.size}` : ""}`}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
