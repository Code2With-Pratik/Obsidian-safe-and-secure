"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Sparkles,
  Ghost,
  PhoneCall,
  AtSign,
  Heart,
  Check,
  Trash2,
  Settings,
  MessageCircle,
  X,
  Inbox
} from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn, formatRelative } from "@/lib/utils";
import { useT } from "@/lib/i18n";

type NotifKind = "message" | "mention" | "call" | "ghost" | "reaction" | "system";

interface Notification {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  time: string;
  avatar?: string;
  read?: boolean;
}

const seed: Notification[] = [
  {
    id: "n1",
    kind: "message",
    title: "Kai Nakamura",
    body:
      "Yo! Drop everything — the new track is bonkers. I spent the whole night layering that pad and I think the bass finally sits exactly where it should. Listen with headphones, you'll catch the little detuned arp at 1:42 that I want your opinion on.",
    time: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    avatar: "https://api.dicebear.com/9.x/notionists/svg?backgroundType=gradientLinear&backgroundColor=8b5cf6,ec4899,22d3ee,a3e635,fbbf24,fb923c,60a5fa,f472b6&radius=18&seed=kai"
  },
  {
    id: "n2",
    kind: "mention",
    title: "@aria in Aurora Design Lab",
    body:
      "Iris mentioned you in a thread about the new motion specs — can you sanity check the easing curves and confirm we're switching to the spring(stiffness:220) preset for hero transitions on web?",
    time: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    avatar: "https://api.dicebear.com/9.x/notionists/svg?backgroundType=gradientLinear&backgroundColor=8b5cf6,ec4899,22d3ee,a3e635,fbbf24,fb923c,60a5fa,f472b6&radius=18&seed=iris"
  },
  {
    id: "n3",
    kind: "call",
    title: "Missed call from Obsidian Patel",
    body: "She called twice. Probably about the AI dataset review you scheduled for tomorrow.",
    time: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    avatar: "https://api.dicebear.com/9.x/notionists/svg?backgroundType=gradientLinear&backgroundColor=8b5cf6,ec4899,22d3ee,a3e635,fbbf24,fb923c,60a5fa,f472b6&radius=18&seed=nova"
  },
  {
    id: "n4",
    kind: "ghost",
    title: "Ghost Room · Midnight Lounge",
    body:
      "There are 42 ghosts active right now and a heated thread about glassmorphism vs neumorphism. Slip in anonymously — your identity is hidden by default and the room auto-closes at 3 AM local time.",
    time: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    read: true
  },
  {
    id: "n5",
    kind: "reaction",
    title: "Lyra reacted to your message",
    body: "💜 on \"This is unreal. The pad sits perfectly under the bass.\"",
    time: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    avatar: "https://api.dicebear.com/9.x/notionists/svg?backgroundType=gradientLinear&backgroundColor=8b5cf6,ec4899,22d3ee,a3e635,fbbf24,fb923c,60a5fa,f472b6&radius=18&seed=lyra",
    read: true
  },
  {
    id: "n6",
    kind: "system",
    title: "Obsidian AI · weekly digest",
    body:
      "You spent 4h 12m in conversations this week, joined 3 ghost rooms, and finished 12 thread replies. Your most-mentioned topic was 'motion design'. Want me to summarize the week into a story you can post?",
    time: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    read: true
  }
];

const kindStyle: Record<NotifKind, { icon: React.ReactNode; color: string }> = {
  message: { icon: <MessageCircle className="size-3.5" />, color: "from-violet-500 to-fuchsia-500" },
  mention: { icon: <AtSign className="size-3.5" />, color: "from-cyan-400 to-blue-500" },
  call: { icon: <PhoneCall className="size-3.5" />, color: "from-emerald-400 to-cyan-400" },
  ghost: { icon: <Ghost className="size-3.5" />, color: "from-violet-500 to-pink-500" },
  reaction: { icon: <Heart className="size-3.5" />, color: "from-pink-500 to-rose-500" },
  system: { icon: <Sparkles className="size-3.5" />, color: "from-amber-400 to-pink-500" }
};

export function NotificationCenter({ children }: { children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Notification[]>(seed);
  const [tab, setTab] = React.useState<"all" | "unread" | "mentions">("all");

  const unread = items.filter((i) => !i.read).length;

  const markAllRead = () => setItems((cur) => cur.map((c) => ({ ...c, read: true })));
  const clearAll = () => setItems([]);
  const openNotificationSettings = () => {
    setOpen(false);
    router.push("/settings?section=notifications");
  };
  const markOne = (id: string) =>
    setItems((cur) => cur.map((c) => (c.id === id ? { ...c, read: true } : c)));

  const filtered =
    tab === "all"
      ? items
      : tab === "unread"
      ? items.filter((i) => !i.read)
      : items.filter((i) => i.kind === "mention");

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const trigger = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
        onClick: () => setOpen(true)
      })
    : children;

  return (
    <>
      {trigger}

      <AnimatePresence>
        {open && <Stage onClose={() => setOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[110] grid place-items-center md:place-items-end md:justify-items-end p-3 md:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            onClick={() => setOpen(false)}
          >
            <motion.div
              key="panel"
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              // glass-strong is 72% opaque by default — bump to ~94% so the
              // notification list stays legible over busy backgrounds.
              style={{ background: "hsl(var(--card) / 0.94)" }}
              className="relative w-full max-w-md h-[min(86dvh,720px)] glass-strong glass-specular rounded-3xl border border-white/15 shadow-floating overflow-hidden flex flex-col"
            >
              <div className="px-5 pt-5 pb-3 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-display font-semibold tracking-tight">
                    {t("Notifications")}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {unread > 0 ? `${unread} ${t("unread")}` : t("You're all caught up")}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={markAllRead} title={t("Mark all read")}>
                    <Check className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={clearAll} title={t("Clear all")}>
                    <Trash2 className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={openNotificationSettings} title={t("Settings")}>
                    <Settings className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setOpen(false)}
                    title={t("Close")}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="px-5">
                <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="all" className="flex-1">{t("All")}</TabsTrigger>
                    <TabsTrigger value="unread" className="flex-1">
                      {t("Unread")}
                      {unread > 0 && (
                        <Badge variant="default" className="ml-1.5 !text-[9px] !py-0">
                          {unread}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="mentions" className="flex-1">{t("Mentions")}</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex-1 mt-3 overflow-y-auto no-scrollbar px-3 pb-4 scroll-smooth">
                {/* The list stays mounted (with its own AnimatePresence) even
                    when empty so Clear all plays each card's exit animation —
                    cards drift up and fade. Empty renders underneath once the
                    cards have left. */}
                <ul className="space-y-2">
                  <AnimatePresence initial={true}>
                    {filtered.map((n, i) => (
                      <NotifCard
                        key={n.id}
                        n={n}
                        index={i}
                        onRead={markOne}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
                {filtered.length === 0 && <Empty />}
              </div>

              <div className="px-5 py-3 border-t border-border/40 bg-background/30 backdrop-blur-md text-center">
                <button
                  onClick={openNotificationSettings}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  {t("Open notification settings")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Stage({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClose}
      // Start below the 4rem topbar so the global search bar stays crisp —
      // the blur only dims the content area, not the header.
      className="fixed inset-x-0 bottom-0 top-16 z-[105] bg-black/20 backdrop-blur-sm"
    />
  );
}

function NotifCard({
  n,
  index,
  onRead
}: {
  n: Notification;
  index: number;
  onRead: (id: string) => void;
}) {
  const t = useT();
  const [expanded, setExpanded] = React.useState(false);
  const isLong = n.body.length > 90;
  const style = kindStyle[n.kind];

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: 80, scale: 0.9, rotate: 4 }}
      animate={{ opacity: 1, x: 0, scale: 1, rotate: 0 }}
      // Exit drifts the card down + fades. Clearing all staggers these via the
      // index-based delay so the cards sweep out toward the bottom.
      exit={{ opacity: 0, y: 24, scale: 0.95 }}
      transition={{
        delay: index * 0.05,
        type: "spring",
        stiffness: 240,
        damping: 24
      }}
      onClick={() => !n.read && onRead(n.id)}
      className={cn(
        "relative flex gap-3 p-3.5 rounded-2xl cursor-pointer transition-colors",
        "glass-subtle border border-white/10 hover:bg-foreground/[0.04]",
        !n.read && "bg-foreground/[0.05] ring-1 ring-cyan-400/30"
      )}
    >
      {!n.read && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-cyan-400 shadow-glow-cyan" />
      )}

      <div className="relative shrink-0">
        {n.avatar ? (
          <Avatar className="size-11 ring-2 ring-background">
            <AvatarImage src={n.avatar} />
          </Avatar>
        ) : (
          <div
            className={cn(
              "size-11 rounded-full grid place-items-center text-white bg-gradient-to-br shadow-glow",
              style.color
            )}
          >
            {style.icon}
          </div>
        )}
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 size-5 rounded-full grid place-items-center text-white bg-gradient-to-br ring-2 ring-background",
            style.color
          )}
        >
          {style.icon}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold truncate">{n.title}</p>
          <span className="text-[10px] text-muted-foreground shrink-0" suppressHydrationWarning>
            {formatRelative(n.time)}
          </span>
        </div>
        <motion.p
          layout
          className={cn(
            "text-xs text-muted-foreground mt-0.5 leading-relaxed",
            expanded ? "" : "line-clamp-2"
          )}
        >
          {n.body}
        </motion.p>
        {isLong && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="mt-1.5 text-[11px] font-semibold text-cyan-400 hover:underline"
          >
            {expanded ? t("Show less") : t("Read more")}
          </button>
        )}
      </div>
    </motion.li>
  );
}

function Empty() {
  const t = useT();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="grid place-items-center py-16 text-center"
    >
      <div className="size-14 rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-400/30 grid place-items-center">
        <Inbox className="size-7 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium mt-3">{t("Inbox zero")}</p>
      <p className="text-xs text-muted-foreground">{t("Nothing new to catch up on.")}</p>
    </motion.div>
  );
}
