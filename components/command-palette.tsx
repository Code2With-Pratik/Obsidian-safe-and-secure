"use client";

import * as React from "react";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  Ghost,
  Phone,
  PencilRuler,
  Folder,
  Settings,
  User2,
  Search,
  Compass,
  Sparkles,
  Sun,
  Moon
} from "lucide-react";
import { useTheme } from "next-themes";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useUIStore } from "@/store/use-ui-store";

const navActions = [
  { label: "Open Chats", href: "/chats", icon: MessageCircle, hint: "G then C" },
  { label: "Ghost Rooms", href: "/ghost-rooms", icon: Ghost, hint: "G then G" },
  { label: "Discover", href: "/discover", icon: Compass },
  { label: "Calls", href: "/calls", icon: Phone },
  { label: "Whiteboard", href: "/whiteboard", icon: PencilRuler },
  { label: "Files & Vault", href: "/files", icon: Folder },
  { label: "Profile", href: "/profile", icon: User2 },
  { label: "Settings", href: "/settings", icon: Settings }
];

export function CommandPalette() {
  const open = useUIStore((s) => s.commandOpen);
  const setOpen = useUIStore((s) => s.setCommandOpen);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const toggleAi = useUIStore((s) => s.toggleAiAssistant);

  useHotkeys({
    "mod+k": () => setOpen(!open),
    esc: () => setOpen(false),
    "mod+j": () => toggleAi()
  });

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] grid place-items-start pt-[12vh] bg-black/50 backdrop-blur-md"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto w-full max-w-2xl glass-strong rounded-2xl shadow-floating border border-border/60 overflow-hidden"
          >
            <Command className="w-full" loop>
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50">
                <Search className="size-4 text-muted-foreground" />
                <Command.Input
                  placeholder="Search chats, people, files, actions… or ask Nova AI"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
                <kbd className="text-[10px] text-muted-foreground glass px-1.5 py-0.5 rounded">ESC</kbd>
              </div>
              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="py-10 text-center text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>

                <Command.Group heading="Suggestions" className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">
                  <Command.Item
                    onSelect={() => {
                      setOpen(false);
                      toggleAi();
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-foreground/5 data-[selected=true]:bg-foreground/5"
                  >
                    <Sparkles className="size-4 text-violet-400" />
                    <span className="text-sm">Ask Nova AI…</span>
                    <kbd className="ml-auto text-[10px] glass px-1.5 py-0.5 rounded">⌘J</kbd>
                  </Command.Item>
                </Command.Group>

                <Command.Group heading="Navigate" className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 mt-2">
                  {navActions.map((a) => (
                    <Command.Item
                      key={a.href}
                      onSelect={() => go(a.href)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer data-[selected=true]:bg-foreground/5"
                    >
                      <a.icon className="size-4 text-muted-foreground" />
                      <span className="text-sm">{a.label}</span>
                      {a.hint && (
                        <kbd className="ml-auto text-[10px] text-muted-foreground glass px-1.5 py-0.5 rounded">
                          {a.hint}
                        </kbd>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Actions" className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 mt-2">
                  <Command.Item
                    onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer data-[selected=true]:bg-foreground/5"
                  >
                    {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                    <span className="text-sm">Toggle theme</span>
                  </Command.Item>
                  <Command.Item className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer data-[selected=true]:bg-foreground/5">
                    <Ghost className="size-4" />
                    <span className="text-sm">Create new ghost room</span>
                  </Command.Item>
                  <Command.Item className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer data-[selected=true]:bg-foreground/5">
                    <Phone className="size-4" />
                    <span className="text-sm">Start a new call</span>
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
