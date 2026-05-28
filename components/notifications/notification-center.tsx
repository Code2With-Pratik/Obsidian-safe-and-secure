"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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
  const panelRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLElement>(null);
  // Portal the overlays to <body> so their z-index lives in the root stacking
  // context. Rendered inline they'd be trapped inside the Topbar's z-30 +
  // backdrop-filter stacking context and sit *below* the AI panel (z-90).
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

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
    // Close on any pointer-down outside the panel. Capture phase so it fires
    // even if something inside calls stopPropagation, and it's immune to the
    // CSS stacking/containing-block quirks that can stop the overlay's own
    // onClick from firing over the page content. The trigger is excluded so
    // its toggle handler stays in charge of opening/closing via the bell.
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [open]);

  const trigger = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        ref: triggerRef,
        onClick: () => setOpen((o) => !o)
      })
    : children;

  return (
    <>
      {trigger}

      {mounted &&
        createPortal(
          <>
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
            className="fixed inset-0 z-[120] grid place-items-center md:items-start md:justify-items-end p-3 md:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            onClick={() => setOpen(false)}
          >
            <motion.div
              key="panel"
              ref={panelRef}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              // glass-strong is 72% opaque by default — bump to ~94% so the
              // notification list stays legible over busy backgrounds.
              style={{ background: "hsl(var(--card) / 0.94)" }}
              className="relative w-full max-w-md h-[min(82dvh,720px)] md:max-h-[calc(100dvh-6rem)] glass-strong glass-specular rounded-3xl border border-white/15 shadow-floating overflow-hidden flex flex-col"
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
                        total={filtered.length}
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
          </>,
          document.body
        )}
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
      // Click-catcher that dims the content area below the 4rem topbar. No
      // backdrop blur — the background stays sharp behind the panel.
      className="fixed inset-x-0 bottom-0 top-16 z-[115] bg-black/20"
    />
  );
}

function NotifCard({
  n,
  index,
  total,
  onRead
}: {
  n: Notification;
  index: number;
  total: number;
  onRead: (id: string) => void;
}) {
  const t = useT();
  const [expanded, setExpanded] = React.useState(false);
  const bodyRef = React.useRef<HTMLParagraphElement>(null);
  // Collapsed body height = two lines. Seeded with the expected value so there
  // is no mount flash, then refined from the real line-height after layout.
  const [collapsedH, setCollapsedH] = React.useState(39);
  const isLong = n.body.length > 90;
  const style = kindStyle[n.kind];

  React.useLayoutEffect(() => {
    if (!isLong || !bodyRef.current) return;
    const lh = parseFloat(getComputedStyle(bodyRef.current).lineHeight);
    if (!Number.isNaN(lh)) setCollapsedH(lh * 2);
  }, [isLong, n.body]);

  return (
    <motion.li
      layout="position"
      custom={{ index, total }}
      variants={{
        initial: { opacity: 0, x: 80, scale: 0.9, rotate: 4 },
        // Enter: slide in from the right, staggered top -> bottom.
        animate: (c: { index: number; total: number }) => ({
          opacity: 1,
          x: 0,
          scale: 1,
          rotate: 0,
          transition: { delay: c.index * 0.05, type: "spring", stiffness: 240, damping: 24 }
        }),
        // Exit: mirror of enter — slide back out to the right, staggered
        // bottom -> top so Clear all peels the cards off from the bottom up.
        exit: (c: { index: number; total: number }) => ({
          opacity: 0,
          x: 80,
          scale: 0.9,
          rotate: 4,
          transition: {
            delay: (c.total - 1 - c.index) * 0.05,
            type: "spring",
            stiffness: 260,
            damping: 26
          }
        })
      }}
      initial="initial"
      animate="animate"
      exit="exit"
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
        {isLong ? (
          // Animate the wrapper's real height (not the text element itself) so
          // the reveal stays smooth and the glyphs never scale/stretch.
          <motion.div
            initial={false}
            animate={{ height: expanded ? "auto" : collapsedH }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden mt-0.5"
          >
            <p ref={bodyRef} className="text-xs text-muted-foreground leading-relaxed">
              {n.body}
            </p>
          </motion.div>
        ) : (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
        )}
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
