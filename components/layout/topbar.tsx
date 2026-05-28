"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Search, Bell, Sun, Moon, Sparkles, Command } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useUIStore } from "@/store/use-ui-store";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { useT } from "@/lib/i18n";

export function Topbar() {
  const t = useT();
  const { theme, setTheme } = useTheme();
  const setCommand = useUIStore((s) => s.setCommandOpen);
  const toggleAi = useUIStore((s) => s.toggleAiAssistant);

  return (
    <header className="relative z-30 flex h-16 items-center gap-3 px-4 md:px-6 border-b border-border/40 backdrop-blur-2xl backdrop-saturate-150 bg-background/50 glass-specular">
      <div className="hidden md:flex flex-1 max-w-xl relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <button
          onClick={() => setCommand(true)}
          className="w-full h-10 pl-9 pr-24 rounded-xl text-left text-sm text-muted-foreground border border-foreground/60 bg-background/40 hover:bg-background/60 transition"
        >
          {t("Search anything…")}
        </button>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-muted-foreground">
          <kbd className="px-1.5 py-0.5 rounded glass border border-border/60">
            <Command className="inline size-3" />
          </kbd>
          <kbd className="px-1.5 py-0.5 rounded glass border border-border/60">K</kbd>
        </div>
      </div>

      <div className="md:hidden flex-1 font-display font-semibold tracking-tight">Obsidian</div>

      <div className="ml-auto flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleAi}
              className="relative"
            >
              <motion.span
                className="absolute inset-0 rounded-xl bg-gradient-to-tr from-violet-500/30 to-cyan-400/30 blur-md"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <Sparkles className="relative" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Obsidian AI · ⌘J</TooltipContent>
        </Tooltip>

        <NotificationCenter>
          <Button variant="ghost" size="icon" className="relative">
            <Bell />
            <Badge
              variant="danger"
              className="absolute -top-0.5 -right-0.5 !px-1.5 !py-0 !text-[9px]"
            >
              4
            </Badge>
          </Button>
        </NotificationCenter>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Theme</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
