"use client";

import * as React from "react";
import { UserPlus, X as XIcon } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { initials } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useChatStore } from "@/store/use-chat-store";
import { useAuthStore } from "@/store/use-auth-store";
import { users as allUsers } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/client";
import type { Chat, User } from "@/types";

/**
 * Members section for group / channel chats. Shown inside the chat-details
 * panel. Lets the signed-in user add new members (picker dialog) and remove
 * existing ones (per-row X). DMs render nothing.
 */
export function ChatMembersCard({ chat }: { chat: Chat }) {
  const t = useT();
  const meId = useAuthStore((s) => s.user?.id);
  const addMembers = useChatStore((s) => s.addMembers);
  const removeMembers = useChatStore((s) => s.removeMembers);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [removeTarget, setRemoveTarget] = React.useState<User | null>(null);
  const [members, setMembers] = React.useState<User[]>([]);

  const memberIds = React.useMemo(() => chat.memberIds ?? [], [chat.memberIds]);

  // Hydrate real profiles from Supabase, falling back to mock-data so the
  // demo seed groups still render.
  React.useEffect(() => {
    if (chat.type === "dm" || memberIds.length === 0) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, name, username, avatar")
        .in("id", memberIds);
      if (cancelled) return;
      const fromDb = new Map(
        ((data || []) as Array<{
          id: string;
          name?: string;
          username?: string;
          avatar?: string;
        }>).map((p) => [p.id, p])
      );
      const hydrated = memberIds.map((id): User | null => {
        const p = fromDb.get(id);
        if (p) {
          return {
            id: p.id,
            name: p.name || p.username || "User",
            username: p.username || "user",
            avatar: p.avatar || "",
            status: "offline"
          };
        }
        const m = allUsers.find((u) => u.id === id);
        return m ?? null;
      }).filter((u): u is User => !!u);
      setMembers(hydrated);
    })();
    return () => {
      cancelled = true;
    };
  }, [chat.type, memberIds]);

  if (chat.type === "dm") return null;


  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("Members")} · {memberIds.length}
        </h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => setPickerOpen(true)}
        >
          <UserPlus className="size-3.5" />
          {t("Add member")}
        </Button>
      </div>

      <div className="space-y-1 rounded-2xl glass-subtle p-1.5 border border-border/40">
        {members.length === 0 && (
          <p className="px-3 py-3 text-center text-xs text-muted-foreground">
            {t("No members yet.")}
          </p>
        )}
        {members.map((u) => (
          <div
            key={u.id}
            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-foreground/5"
          >
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={u.avatar} alt={u.name} />
              <AvatarFallback>{initials(u.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {u.name} {u.id === meId && <span className="text-muted-foreground">({t("You")})</span>}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">@{u.username}</p>
            </div>
            {u.id !== meId && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("Remove")}
                onClick={() => setRemoveTarget(u)}
                className="text-muted-foreground hover:text-rose-500"
              >
                <XIcon className="size-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <AddMemberDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        excludeIds={memberIds}
        onAdd={(ids) => addMembers(chat.id, ids)}
      />

      <RemoveMemberDialog
        user={removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={async () => {
          if (!removeTarget) return;
          await removeMembers(chat.id, [removeTarget.id]);
          setRemoveTarget(null);
        }}
      />
    </div>
  );
}

function RemoveMemberDialog({
  user,
  onClose,
  onConfirm
}: {
  user: User | null;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const t = useT();
  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("Remove member")}</DialogTitle>
          <DialogDescription>
            {t("Remove this person from the group chat.")}
          </DialogDescription>
        </DialogHeader>
        {user && (
          <div className="flex flex-col items-center text-center py-2">
            <Avatar className="size-20">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-lg">{initials(user.name)}</AvatarFallback>
            </Avatar>
            <p className="mt-4 text-base font-semibold">{user.name}</p>
            <p className="text-xs text-muted-foreground">@{user.username}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              {t("Remove this person from the group?")}
            </p>
            <div className="mt-5 grid w-full grid-cols-2 gap-2">
              <Button variant="glass" onClick={onClose}>
                {t("Cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  void onConfirm();
                }}
              >
                {t("Remove")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddMemberDialog({
  open,
  onClose,
  excludeIds,
  onAdd
}: {
  open: boolean;
  onClose: () => void;
  /** User ids that are already members — filtered out of the search results. */
  excludeIds: string[];
  onAdd: (userIds: string[]) => void | Promise<void>;
}) {
  const t = useT();
  const meId = useAuthStore((s) => s.user?.id);
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<User[]>([]);
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setPicked(new Set());
      setQ("");
      setResults([]);
    }
  }, [open]);

  // Debounced Supabase profile search — excludes me and existing members.
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSearching(true);
    const supabase = createClient();
    const timer = setTimeout(async () => {
      let query = supabase
        .from("profiles")
        .select("id, name, username, avatar")
        .limit(20);
      const term = q.trim();
      if (term) {
        query = query.or(`name.ilike.%${term}%,username.ilike.%${term}%`);
      } else {
        query = query.order("last_seen_at", { ascending: false, nullsFirst: false });
      }
      const { data } = await query;
      if (cancelled) return;
      const exclude = new Set([...excludeIds, ...(meId ? [meId] : [])]);
      const rows = ((data || []) as Array<{
        id: string;
        name?: string;
        username?: string;
        avatar?: string;
      }>)
        .filter((u) => !exclude.has(u.id))
        .map((u) => ({
          id: u.id,
          name: u.name || u.username || "User",
          username: u.username || "user",
          avatar: u.avatar || "",
          status: "offline" as const
        }));
      setResults(rows);
      setSearching(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, open, excludeIds, meId]);

  const filtered = results;

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async () => {
    if (picked.size === 0) return onClose();
    await onAdd(Array.from(picked));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Add members")}</DialogTitle>
          <DialogDescription>{t("Pick people to add to this chat.")}</DialogDescription>
        </DialogHeader>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("Search people")}
          className="mt-1 w-full rounded-full glass border border-border/60 bg-transparent px-4 h-10 text-sm outline-none placeholder:text-muted-foreground/70"
        />
        <div className="max-h-[50dvh] overflow-y-auto space-y-1 mt-1">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {t("No people to add.")}
            </p>
          )}
          {filtered.map((u) => {
            const on = picked.has(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => toggle(u.id)}
                className="w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-foreground/5"
              >
                <Avatar className="size-9 shrink-0">
                  <AvatarImage src={u.avatar} alt={u.name} />
                  <AvatarFallback>{initials(u.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">@{u.username}</p>
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
          <Button variant="gradient" disabled={picked.size === 0} onClick={submit}>
            {t("Add")} {picked.size > 0 ? `· ${picked.size}` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
