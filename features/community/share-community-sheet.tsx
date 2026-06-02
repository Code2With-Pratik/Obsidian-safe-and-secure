"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  X,
  Link as LinkIcon,
  MoreHorizontal
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useChatStore } from "@/store/use-chat-store";
import { useAuthStore } from "@/store/use-auth-store";
import { createClient } from "@/lib/supabase/client";

/** Minimal community shape the share sheet renders. */
export interface ShareableCommunity {
  id: string;
  name: string;
  description?: string;
  cover?: string;
  category?: string;
  members?: number;
}

type PickerRow =
  | {
      kind: "person";
      id: string;
      name?: string;
      username?: string;
      avatar?: string;
    }
  | {
      kind: "chat";
      id: string;
      name: string;
      avatar?: string;
      type: "dm" | "group" | "channel" | "secret" | "ghost";
      membersCount?: number;
    };

/**
 * "Share community" sheet — mirrors `ShareProfileSheet` so the experience
 * is identical, just with community wording and a different attachment
 * payload (`kind: "community"`).
 */
export function ShareCommunitySheet({
  open,
  onClose,
  community
}: {
  open: boolean;
  onClose: () => void;
  community: ShareableCommunity;
}) {
  const t = useT();
  const meId = useAuthStore((s) => s.user?.id);
  const chats = useChatStore((s) => s.chats);
  const startDM = useChatStore((s) => s.startDM);
  const sendAttachment = useChatStore((s) => s.sendAttachment);
  const [copied, setCopied] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [people, setPeople] = React.useState<
    Array<{ id: string; name?: string; username?: string; avatar?: string }>
  >([]);
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [sending, setSending] = React.useState(false);
  const [sentTo, setSentTo] = React.useState(0);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) {
      setPicked(new Set());
      setSearch("");
      setPeople([]);
      setSentTo(0);
    }
  }, [open]);

  const communityUrl = React.useMemo(() => {
    if (typeof window === "undefined") return `/discover/community/${community.id}`;
    return `${window.location.origin}/discover/community/${community.id}`;
  }, [community.id]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const supabase = createClient();
    const timer = setTimeout(async () => {
      let query = supabase
        .from("profiles")
        .select("id, name, username, avatar")
        .limit(20);
      const q = search.trim();
      if (q) {
        query = query.or(`name.ilike.%${q}%,username.ilike.%${q}%`);
      } else {
        query = query.order("last_seen_at", { ascending: false, nullsFirst: false });
      }
      const { data } = await query;
      if (cancelled) return;
      const exclude = new Set(meId ? [meId] : []);
      setPeople(
        ((data || []) as Array<{ id: string; name?: string; username?: string; avatar?: string }>)
          .filter((u) => !exclude.has(u.id))
      );
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, open, meId]);

  const matchingChats = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return chats.filter((c) => {
      if (c.type === "dm") return false;
      if (!q) return true;
      return (c.name || "").toLowerCase().includes(q);
    });
  }, [chats, search]);

  const rows: PickerRow[] = React.useMemo(() => {
    const out: PickerRow[] = [];
    matchingChats.forEach((c) =>
      out.push({
        kind: "chat",
        id: c.id,
        name: c.name,
        avatar: c.avatar,
        type: c.type,
        membersCount: c.membersCount
      })
    );
    people.forEach((p) =>
      out.push({
        kind: "person",
        id: p.id,
        name: p.name,
        username: p.username,
        avatar: p.avatar
      })
    );
    return out;
  }, [matchingChats, people]);

  const keyFor = (row: PickerRow) =>
    row.kind === "person" ? `person:${row.id}` : `chat:${row.id}`;

  const togglePick = (key: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const copyLink = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(communityUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // clipboard blocked — silent.
    }
  };

  const sendToContacts = async () => {
    if (picked.size === 0 || sending) return;
    setSending(true);
    const keys = Array.from(picked);
    const communityPayload = {
      kind: "community" as const,
      community: {
        id: community.id,
        name: community.name,
        description: community.description,
        cover: community.cover,
        category: community.category,
        members: community.members,
        url: communityUrl
      }
    };
    try {
      for (const key of keys) {
        const [kind, id] = key.split(":");
        if (kind === "person") {
          const dm = await startDM(id);
          const chatId = dm.data?.id;
          if (chatId) await sendAttachment(chatId, communityPayload);
        } else if (kind === "chat") {
          await sendAttachment(id, communityPayload);
        }
      }
      setSentTo(keys.length);
      window.setTimeout(() => onClose(), 1200);
    } finally {
      setSending(false);
    }
  };

  if (!open || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[300] grid place-items-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm max-h-[92dvh] flex flex-col rounded-3xl glass-strong border border-border/60 shadow-floating animate-in zoom-in-95 overflow-hidden"
      >
        <div className="p-5 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-display font-semibold">
                {t("Share community")}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {t("Send")} <strong>{community.name}</strong>{" "}
                {t("anywhere — pick an app or a contact below.")}
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

          <ShareAppBadges url={communityUrl} subject={community.name} />

          <div className="mt-4 flex items-center gap-2 rounded-xl glass-subtle px-3 py-2">
            <LinkIcon className="size-3.5 text-muted-foreground shrink-0" />
            <span
              className="flex-1 text-[11px] text-muted-foreground truncate"
              title={communityUrl}
            >
              {communityUrl}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyLink}
              className="h-7 px-2 text-[11px]"
            >
              {copied ? t("Copied") : t("Copy")}
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 px-4 pb-1 flex flex-col">
          <div className="text-left text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            {t("Or send to a contact")}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Search by name or @handle")}
            className="w-full rounded-full glass border border-border/60 bg-transparent px-4 h-9 text-sm outline-none placeholder:text-muted-foreground/70"
          />

          <div className="flex-1 min-h-0 overflow-y-auto mt-2 space-y-1">
            {rows.length === 0 ? (
              <p className="py-4 text-center text-[11px] text-muted-foreground">
                {t("No matches")}
              </p>
            ) : (
              rows.map((row) => {
                const key = keyFor(row);
                const on = picked.has(key);
                const isChat = row.kind === "chat";
                const title =
                  row.kind === "person"
                    ? row.name || row.username || "User"
                    : row.name;
                const subtitle =
                  row.kind === "person"
                    ? row.username
                      ? `@${row.username}`
                      : ""
                    : `${row.type === "channel" ? t("Channel") : t("Group")}${
                        row.membersCount
                          ? ` · ${row.membersCount} ${t("members")}`
                          : ""
                      }`;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePick(key)}
                    className="w-full flex items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-foreground/5"
                  >
                    <Avatar
                      className={
                        "size-8 shrink-0 " + (isChat ? "rounded-lg" : "")
                      }
                    >
                      <AvatarImage src={row.avatar} />
                      <AvatarFallback>{initials(title)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{title}</p>
                      {subtitle && (
                        <p className="truncate text-[11px] text-muted-foreground">
                          {subtitle}
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
        </div>

        <div className="flex items-center gap-2 p-4 border-t border-border/40 shrink-0">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            {t("Close")}
          </Button>
          <Button
            variant="gradient"
            disabled={picked.size === 0 || sending}
            onClick={sendToContacts}
            className="flex-1"
          >
            {sentTo > 0
              ? `${t("Sent")} · ${sentTo}`
              : sending
              ? t("Sending…")
              : `${t("Send")}${picked.size > 0 ? ` · ${picked.size}` : ""}`}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Identical to the row used by ShareProfileSheet — logos from /Logo/*.png. */
function ShareAppBadges({ url, subject }: { url: string; subject: string }) {
  const t = useT();
  const [flash, setFlash] = React.useState<string | null>(null);

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${subject} — ${url}`);

  const copyAndHint = async (hint: string) => {
    try {
      await navigator.clipboard?.writeText(url);
    } catch {
      // clipboard blocked — fall through to hint.
    }
    setFlash(hint);
    window.setTimeout(() => setFlash(null), 1600);
  };

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: subject, url });
        return;
      } catch {
        // user dismissed — fall through.
      }
    }
    copyAndHint(t("Link copied"));
  };

  const apps: Array<{
    name: string;
    logo?: string;
    fallback?: React.ReactNode;
    href?: string;
    onClick?: () => void;
  }> = [
    {
      name: "WhatsApp",
      logo: "/Logo/Whatsapp.png",
      href: `https://wa.me/?text=${encodedText}`
    },
    {
      name: "Telegram",
      logo: "/Logo/Telegram.png",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(subject)}`
    },
    {
      name: "Instagram",
      logo: "/Logo/Instagram.png",
      onClick: () => copyAndHint(t("Link copied — paste in Instagram"))
    },
    {
      name: "Snapchat",
      logo: "/Logo/Snapchat.png",
      onClick: () => copyAndHint(t("Link copied — paste in Snapchat"))
    },
    {
      name: "More",
      fallback: (
        <span className="size-12 rounded-sm grid place-items-center bg-foreground/10 text-foreground">
          <MoreHorizontal className="size-4" />
        </span>
      ),
      onClick: nativeShare
    }
  ];

  return (
    <div className="mt-4">
      <div className="grid grid-cols-5 gap-2">
        {apps.map((a) => {
          const badge =
            a.fallback ??
            (a.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.logo}
                alt={a.name}
                className="size-12 rounded-sm object-contain"
              />
            ) : null);
          const label = (
            <span className="text-[10px] mt-1 text-muted-foreground">
              {a.name}
            </span>
          );
          return a.href ? (
            <a
              key={a.name}
              href={a.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center hover:opacity-90 transition"
            >
              {badge}
              {label}
            </a>
          ) : (
            <button
              key={a.name}
              type="button"
              onClick={a.onClick}
              className="flex flex-col items-center hover:opacity-90 transition"
            >
              {badge}
              {label}
            </button>
          );
        })}
      </div>
      {flash && (
        <p className="mt-2 text-center text-[11px] text-emerald-400">{flash}</p>
      )}
    </div>
  );
}
