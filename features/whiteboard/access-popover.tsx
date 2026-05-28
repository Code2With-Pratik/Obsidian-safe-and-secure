"use client";

import * as React from "react";
import { Check, Eye, Pencil, Plus, Search, UserMinus, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { currentUser, users } from "@/lib/mock-data";
import {
  useWhiteboardStore,
  type AccessLevel
} from "@/store/use-whiteboard-store";
import { useT } from "@/lib/i18n";

interface Props {
  children: React.ReactNode;
}

/**
 * Popover that lists every potential collaborator and lets the user grant
 * Read / Read+Write / no access. Edits are saved to the whiteboard store
 * (which already persists via Zustand `persist`), so changes survive a
 * reload — no explicit "save" button needed.
 */
export function AccessPopover({ children }: Props) {
  const t = useT();
  const board = useWhiteboardStore((s) => s.activeBoard());
  const setBoardAccess = useWhiteboardStore((s) => s.setBoardAccess);

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  // Tab between "Has access" (already granted) and "Add people".
  const [tab, setTab] = React.useState<"current" | "add">("current");

  const access = board?.access ?? {};

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = users.filter((u) => u.id !== currentUser.id);
    if (!q) return list;
    return list.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
    );
  }, [query]);

  // Split into "has access" and "no access" for the two tabs.
  const granted = filtered.filter((u) => access[u.id]);
  const pending = filtered.filter((u) => !access[u.id]);
  const visible = tab === "current" ? granted : pending;

  const setLevel = (userId: string, level: AccessLevel) => {
    setBoardAccess(userId, level);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="w-[340px] p-0 overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-border/40">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold">{t("Who has access")}</p>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {t("Auto-saved")}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {board?.name ?? t("This board")} · {Object.keys(access).length}{" "}
            {Object.keys(access).length === 1 ? t("collaborator") : t("collaborators")}
          </p>

          {/* Owner row — always present, can't be changed. */}
          <div className="mt-3 flex items-center gap-2.5 p-2 rounded-lg bg-foreground/[0.04]">
            <Avatar className="size-7">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback>{currentUser.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{currentUser.name}</p>
              <p className="text-[10px] text-muted-foreground">{t("You · owner")}</p>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-cyan-300 font-semibold">
              {t("Owner")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 px-3 pt-3">
          <TabPill active={tab === "current"} onClick={() => setTab("current")}>
            {t("Has access")} · {granted.length}
          </TabPill>
          <TabPill active={tab === "add"} onClick={() => setTab("add")}>
            <Plus className="size-3" /> {t("Add people")}
          </TabPill>
        </div>

        <div className="px-3 pt-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search teammates…")}
              className="h-9 pl-8 text-xs"
            />
          </div>
        </div>

        <div className="max-h-[260px] overflow-y-auto no-scrollbar px-2 py-2">
          {visible.length === 0 ? (
            <div className="grid place-items-center py-8 text-center px-4">
              <p className="text-[11px] text-muted-foreground">
                {tab === "current"
                  ? t("No one else has access yet — add someone from the next tab.")
                  : t("Everyone matching is already on the board.")}
              </p>
            </div>
          ) : (
            visible.map((u) => {
              const level = access[u.id] ?? "none";
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-foreground/[0.04] transition"
                >
                  <Avatar className="size-7">
                    <AvatarImage src={u.avatar} />
                    <AvatarFallback>{u.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{u.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      @{u.username}
                    </p>
                  </div>
                  <AccessChips
                    level={level}
                    onChange={(next) => setLevel(u.id, next)}
                  />
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-border/40 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {t("Changes save instantly.")}
          </span>
          <button
            onClick={() => setOpen(false)}
            className="text-[11px] text-muted-foreground hover:text-foreground transition inline-flex items-center gap-1"
          >
            {t("Done")} <X className="size-3" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TabPill({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11px] font-medium transition",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-foreground/5"
      )}
    >
      {children}
    </button>
  );
}

function AccessChips({
  level,
  onChange
}: {
  level: AccessLevel;
  onChange: (next: AccessLevel) => void;
}) {
  const t = useT();
  return (
    <div className="flex items-center gap-1">
      <Chip
        active={level === "viewer"}
        title={t("Read only")}
        onClick={() => onChange(level === "viewer" ? "none" : "viewer")}
      >
        <Eye className="size-3" />
      </Chip>
      <Chip
        active={level === "editor"}
        title={t("Read + write")}
        onClick={() => onChange(level === "editor" ? "none" : "editor")}
      >
        <Pencil className="size-3" />
      </Chip>
      {level !== "none" && (
        <Chip
          active={false}
          title={t("Revoke")}
          onClick={() => onChange("none")}
        >
          <UserMinus className="size-3" />
        </Chip>
      )}
      {level === "editor" && (
        <Check className="size-3 text-emerald-400 ml-0.5" aria-hidden />
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  title,
  children
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        "size-6 grid place-items-center rounded-md transition",
        active
          ? "bg-cyan-400/20 text-cyan-300 ring-1 ring-cyan-400/40"
          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
