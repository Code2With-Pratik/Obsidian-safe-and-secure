"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
import { useT } from "@/lib/i18n";
import { cn, initials } from "@/lib/utils";

const navItems = [
  { href: "/chats", label: "Chats", icon: MessageCircle, badge: 9 },
  { href: "/ghost-rooms", label: "Ghost Rooms", icon: Ghost, badge: 0 },
  { href: "/discover", label: "Discover", icon: Compass, badge: 0 },
  { href: "/calls", label: "Calls", icon: Phone, badge: 0 },
  { href: "/whiteboard", label: "Whiteboard", icon: PencilRuler, badge: 0 },
  { href: "/files", label: "Vault", icon: Folder, badge: 0 }
];

const COLLAPSED = 76;
const EXPANDED = 260;

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const t = useT();
  const [hovered, setHovered] = React.useState(false);
  const expanded = hovered;

  return (
    <aside
      className="relative hidden md:block shrink-0 h-dvh"
      style={{ width: COLLAPSED }}
    >
      <motion.div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        initial={false}
        animate={{ width: expanded ? EXPANDED : COLLAPSED }}
        transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "absolute top-0 left-0 h-dvh z-40 flex flex-col border-r border-border/40 overflow-hidden",
          "bg-card/80 backdrop-blur-2xl backdrop-saturate-150 glass-specular",
          expanded && "shadow-floating"
        )}
      >
        <div className="flex items-center gap-2.5 px-2 py-3">
          <Link href="/chats" className="flex items-center gap-2.5 shrink-0">
            <Image
              src="/Logo.png"
              alt="Obsidian"
              width={60}
              height={60}
              priority
              className="size-[60px] shrink-0 rounded-xl object-contain"
            />
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col whitespace-nowrap"
                >
                  <span className="font-display text-base font-semibold leading-tight tracking-tight">
                    Obsidian
                  </span>
                  <span className="text-[10px] text-muted-foreground -mt-0.5">
                    comms · OS
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
        </div>

        <nav className="px-2 mt-2 space-y-0.5 flex-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const active = pathname?.startsWith(item.href);
            const link = (
              <Link
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all",
                  active
                    ? "bg-foreground/[0.06] text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]",
                  !expanded && "justify-center px-0"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-violet-400 to-cyan-400"
                  />
                )}
                <item.icon className="size-[22px] shrink-0" />
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      transition={{ duration: 0.18 }}
                      className="text-[15px] font-medium whitespace-nowrap"
                    >
                      {t(item.label)}
                    </motion.span>
                  )}
                </AnimatePresence>
                {expanded && item.badge > 0 && (
                  <Badge variant="default" className="ml-auto">
                    {item.badge}
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

        <div className="border-t border-border/50 p-3 space-y-1">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition",
              !expanded && "justify-center px-0"
            )}
          >
            <Settings className="size-[22px] shrink-0" />
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.18 }}
                  className="text-[15px] whitespace-nowrap"
                >
                  {t("Settings")}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          <Link
            href="/profile"
            className={cn(
              "flex items-center gap-3 rounded-xl p-2 mt-1 hover:bg-foreground/[0.04] transition",
              !expanded && "justify-center"
            )}
          >
            <Avatar className="size-9 ring-2 ring-emerald-400/60 ring-offset-2 ring-offset-background shrink-0">
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback>{initials(user?.name ?? "Aria")}</AvatarFallback>
            </Avatar>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.18 }}
                  className="flex-1 min-w-0 flex items-center gap-2 whitespace-nowrap"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium truncate">
                      {user?.name ?? "Aria Vance"}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      {t("Online")} · @{user?.username ?? "aria"}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
        </div>
      </motion.div>
    </aside>
  );
}
