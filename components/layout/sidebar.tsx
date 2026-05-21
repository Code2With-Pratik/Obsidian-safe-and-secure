"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Ghost,
  Compass,
  Phone,
  Globe,
  PencilRuler,
  Folder,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Bell
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/use-ui-store";
import { useAuthStore } from "@/store/use-auth-store";
import { NovaLogo } from "@/components/brand/nova-logo";
import { cn, initials } from "@/lib/utils";

const navItems = [
  { href: "/chats", label: "Chats", icon: MessageCircle, badge: 9 },
  { href: "/ghost-rooms", label: "Ghost Rooms", icon: Ghost, badge: 0 },
  { href: "/discover", label: "Discover", icon: Compass, badge: 0 },
  { href: "/calls", label: "Calls", icon: Phone, badge: 0 },
  { href: "/browser", label: "Browser", icon: Globe, badge: 0 },
  { href: "/whiteboard", label: "Whiteboard", icon: PencilRuler, badge: 0 },
  { href: "/files", label: "Files", icon: Folder, badge: 0 }
];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);

  return (
    <aside
      className={cn(
        "relative hidden md:flex h-dvh shrink-0 flex-col border-r border-border/40 transition-[width] duration-300",
        "bg-card/50 backdrop-blur-2xl backdrop-saturate-150 glass-specular",
        collapsed ? "w-[76px]" : "w-[260px]"
      )}
    >
      <div className="flex items-center justify-between px-4 pt-5 pb-4">
        <Link href="/chats" className="flex items-center gap-2.5">
          <NovaLogo className="size-9 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                <span className="font-display text-base font-semibold leading-tight tracking-tight">
                  Nova
                </span>
                <span className="text-[10px] text-muted-foreground -mt-0.5">
                  comms · OS
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggle}
          className={cn(collapsed && "absolute -right-3 top-6 z-10 glass !size-7 rounded-full")}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronsRight className="size-3.5" /> : <ChevronsLeft className="size-4" />}
        </Button>
      </div>

      <div className="px-3">
        <Button variant="gradient" className={cn("w-full", collapsed ? "!px-0 !size-10 !rounded-xl" : "")}>
          <Plus className="shrink-0" />
          {!collapsed && <span>New conversation</span>}
        </Button>
      </div>

      <nav className="px-2 mt-5 space-y-0.5 flex-1 overflow-y-auto no-scrollbar">
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
                collapsed && "justify-center px-0"
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-violet-400 to-cyan-400"
                />
              )}
              <item.icon className="size-[18px] shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              {!collapsed && item.badge > 0 && (
                <Badge variant="default" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );

          return (
            <div key={item.href}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
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
            collapsed && "justify-center px-0"
          )}
        >
          <Settings className="size-[18px]" />
          {!collapsed && <span className="text-sm">Settings</span>}
        </Link>

        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 rounded-xl p-2 mt-1 hover:bg-foreground/[0.04] transition",
            collapsed && "justify-center p-0"
          )}
        >
          <Avatar className="size-9 ring-2 ring-emerald-400/60 ring-offset-2 ring-offset-background">
            <AvatarImage src={user?.avatar} alt={user?.name} />
            <AvatarFallback>{initials(user?.name ?? "Aria")}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.name ?? "Aria Vance"}</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Online · @{user?.username ?? "aria"}
              </div>
            </div>
          )}
          {!collapsed && <Bell className="size-4 text-muted-foreground" />}
        </Link>
      </div>
    </aside>
  );
}
