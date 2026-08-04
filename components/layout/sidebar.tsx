"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Ghost,
  Compass,
  Phone,
  PencilRuler,
  Folder,
  Settings
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/use-auth-store";
import { useChatStore } from "@/store/use-chat-store";
import { useStoriesStore } from "@/store/use-stories-store";
import { useRouter } from "next/navigation";
import { StoryAvatar } from "@/components/stories/story-avatar";
import { useT } from "@/lib/i18n";
import { cn, initials } from "@/lib/utils";
import { NovaMascot } from "../../components/nova-mascot";

/** Static items + a placeholder zero for `/chats`. The real Chats badge is
 *  computed live from the chat store inside the component. */
const navItems = [
  { href: "/chats", label: "Chats", icon: MessageCircle, badge: 0 },
  { href: "/ghost-rooms", label: "Ghost Rooms", icon: Ghost, badge: 0 },
  { href: "/discover", label: "Discover", icon: Compass, badge: 0 },
  { href: "/calls", label: "Calls", icon: Phone, badge: 0 },
  { href: "/whiteboard", label: "Whiteboard", icon: PencilRuler, badge: 0 },
  { href: "/files", label: "Vault", icon: Folder, badge: 0 }
];

/** Format the unread count for the badge — always appends a "+" so the
 *  badge reads as "more where that came from" (e.g. "3+", "47+"). */
function formatUnread(n: number): string {
  return `${n}+`;
}

const COLLAPSED = 64;
const EXPANDED = 260;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const meHasStory = useStoriesStore((s) => !!s.byUser["me"]?.slides.length);
  const openStoryPrompt = useStoriesStore((s) => s.openPrompt);
  // Live total unread across every chat — drives the Chats badge.
  const totalUnread = useChatStore((s) =>
    s.chats.reduce((acc, c) => acc + (c.unread ?? 0), 0)
  );

  /** Avatar tap inside the sidebar profile row — opens the "Profile photo
   *  or Story?" prompt instead of navigating, matching the chat list /
   *  details panel avatar behavior. The rest of the row (name + status)
   *  still navigates to /profile. */
  const onAvatarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openStoryPrompt("me");
  };
  const t = useT();
  const [hovered, setHovered] = React.useState(false);
  const expanded = hovered;

  // Hover-intent: collapse after a short grace period so a cursor that just
  // grazes the edge (or briefly crosses a gap) doesn't snap the panel shut
  // and cause flicker. Re-entering cancels the pending collapse.
  const closeTimer = React.useRef<number | null>(null);
  const open = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setHovered(true);
  };
  const close = () => {
    closeTimer.current = window.setTimeout(() => setHovered(false), 90);
  };
  React.useEffect(() => {
    return () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <aside
      // Force LTR internals so the rail looks identical in every language
      // (icon-left, label-right, panel expands rightward). The shell pins this
      // aside to the physical left even under RTL, so left-anchored positioning
      // here is always correct.
      dir="ltr"
      className="relative hidden md:block shrink-0 h-dvh"
      style={{ width: COLLAPSED }}
    >
      <motion.div
        onMouseEnter={open}
        onMouseLeave={close}
        initial={false}
        animate={{ width: expanded ? EXPANDED : COLLAPSED }}
        transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "absolute top-0 left-0 h-dvh z-40 flex flex-col border-r border-border/40 overflow-hidden will-change-[width] transition-shadow duration-300",
          // Lighter backdrop blur (xl, not 2xl) — a 40px blur is re-sampled
          // every frame while the width animates, which is the main source of
          // the stutter. xl keeps the glass look at a fraction of the cost.
          "bg-card/80 backdrop-blur-xl backdrop-saturate-150 glass-specular",
          expanded && "shadow-floating"
        )}
      >
        {/* No justify-center toggle (same as the nav items): the mascot stays
            pinned at a fixed left offset that reads as centered in the 64px
            rail, so it doesn't drift/shake while the panel width animates. */}
        <div className="flex items-center gap-2.5 px-3 py-3">
          <Link href="/chats" className="flex items-center gap-2.5 shrink-0 h-[56px]">
            <NovaMascot size={40} className="shrink-0" />
            <motion.div
              initial={false}
              animate={{
                opacity: expanded ? 1 : 0,
                x: expanded ? 0 : -6,
                width: expanded ? 156 : 0
              }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col justify-center whitespace-nowrap overflow-hidden"
            >
              <span className="font-display text-[1.6rem] font-semibold leading-[1.05] tracking-tight">
                Obsidian
              </span>
              <span className="text-[11px] text-muted-foreground leading-none">
                secure and safe
              </span>
            </motion.div>
          </Link>
        </div>

        <nav className="px-2 mt-2 space-y-0.5 flex-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const active = pathname?.startsWith(item.href);
            // Live unread total drives the Chats badge; other items use their
            // static seed (0 today, room to wire others later).
            const effectiveBadge =
              item.href === "/chats" ? totalUnread : item.badge;
            const link = (
              <Link
                href={item.href}
                className={cn(
                  // Keep `px-3` in both states (no justify-center toggle): the
                  // icon stays put at a fixed left offset that reads as centered
                  // in the 64px rail, so it never jumps/shakes while the panel
                  // width animates. `transition-colors` (not `transition-all`)
                  // so a stray sub-pixel height change can't animate into a
                  // vertical drift.
                  "group relative flex items-center gap-3 px-3 py-2.5 transition-colors",
                  // Active rows have square left corners so the indicator bar
                  // sits flush against a straight edge; right corners stay
                  // rounded for the pill shape.
                  active
                    ? "bg-foreground/[0.06] text-foreground rounded-l-none rounded-r-xl"
                    : "text-foreground hover:bg-foreground/[0.04] rounded-xl"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-400 to-cyan-400"
                  />
                )}
                <item.icon className="size-[22px] shrink-0 text-foreground" />
                <motion.span
                  initial={false}
                  animate={{
                    opacity: expanded ? 1 : 0,
                    x: expanded ? 0 : -4,
                    width: expanded ? "auto" : 0
                  }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  className="text-[15px] font-medium whitespace-nowrap leading-none overflow-hidden"
                >
                  {t(item.label)}
                </motion.span>
                {expanded && effectiveBadge > 0 && (
                  <Badge variant="default" className="ml-auto tabular-nums">
                    {formatUnread(effectiveBadge)}
                  </Badge>
                )}
              </Link>
            );

            return (
              <div key={item.href}>
                {!expanded ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{t(item.label)}</TooltipContent>
                  </Tooltip>
                ) : (
                  link
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-border/50 px-2 py-3 space-y-1">
          <Link
            href="/settings"
            className={cn(
              // Same fixed-offset approach as the nav items — px-3 in both
              // states so the gear icon doesn't shake when the rail collapses.
              "group relative flex items-center gap-3 px-3 py-2.5 transition-colors",
              pathname?.startsWith("/settings")
                ? "bg-foreground/[0.06] text-foreground rounded-l-none rounded-r-xl"
                : "text-foreground hover:bg-foreground/[0.04] rounded-xl"
            )}
          >
            {pathname?.startsWith("/settings") && (
              <motion.span
                layoutId="nav-active"
                className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-400 to-cyan-400"
              />
            )}
            <Settings className="size-[22px] shrink-0 text-foreground" />
            <motion.span
              initial={false}
              animate={{
                opacity: expanded ? 1 : 0,
                x: expanded ? 0 : -4,
                width: expanded ? "auto" : 0
              }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="text-[15px] whitespace-nowrap leading-none overflow-hidden"
            >
              {t("Settings")}
            </motion.span>
          </Link>

          <Link
            href="/profile"
            className={cn(
              "flex items-center gap-3 rounded-xl p-2 mt-1 hover:bg-foreground/[0.04] transition"
            )}
          >
            {/* Avatar is its own button — tap opens the Profile/Story prompt;
                the rest of the row still navigates to /profile. */}
            <button
              type="button"
              onClick={onAvatarClick}
              aria-label="View profile photo or story"
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
            >
              {meHasStory ? (
                <StoryAvatar userId="me" src={user?.avatar} name={user?.name} size={36} />
              ) : (
                <Avatar className="size-9 ring-2 ring-emerald-400/60 ring-offset-2 ring-offset-background">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback>{initials(user?.name ?? "Aria")}</AvatarFallback>
                </Avatar>
              )}
            </button>
            <motion.div
              initial={false}
              animate={{
                opacity: expanded ? 1 : 0,
                x: expanded ? 0 : -4,
                width: expanded ? "auto" : 0
              }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 min-w-0 flex items-center gap-2 whitespace-nowrap overflow-hidden"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-medium truncate leading-tight">
                  {user?.name ?? "Aria Vance"}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  {t("Online")} · @{user?.username ?? "aria"}
                </div>
              </div>
            </motion.div>
          </Link>
        </div>
      </motion.div>
    </aside>
  );
}
