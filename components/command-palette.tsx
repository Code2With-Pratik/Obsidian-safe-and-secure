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
  Camera,
  Sun,
  Moon
} from "lucide-react";
import { useTheme } from "next-themes";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useUIStore } from "@/store/use-ui-store";
import { useChatStore } from "@/store/use-chat-store";
import { useAuthStore } from "@/store/use-auth-store";
import { useT } from "@/lib/i18n";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navActions = [
  { label: "Open Chats", href: "/chats", icon: MessageCircle, hint: "G then C" },
  { label: "Ghost Rooms", href: "/ghost-rooms", icon: Ghost, hint: "G then G" },
  { label: "Discover", href: "/discover", icon: Compass },
  { label: "Create story", href: "/stories/create", icon: Camera },
  { label: "Calls", href: "/calls", icon: Phone },
  { label: "Whiteboard", href: "/whiteboard", icon: PencilRuler },
  { label: "Files & Vault", href: "/files", icon: Folder },
  { label: "Profile", href: "/profile", icon: User2 },
  { label: "Settings", href: "/settings", icon: Settings }
];

interface PersonResult {
  id: string;
  name?: string;
  username?: string;
  avatar?: string;
}

export function CommandPalette() {
  const t = useT();
  const open = useUIStore((s) => s.commandOpen);
  const setOpen = useUIStore((s) => s.setCommandOpen);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const toggleAi = useUIStore((s) => s.toggleAiAssistant);
  const chats = useChatStore((s) => s.chats);
  const startDM = useChatStore((s) => s.startDM);
  const meId = useAuthStore((s) => s.user?.id);

  // Track the typed query so we can also run a live Supabase profile search
  // (anything not already in your chat list) in parallel with the local
  // chat-name match cmdk does for free.
  const [query, setQuery] = React.useState("");
  const [people, setPeople] = React.useState<PersonResult[]>([]);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setPeople([]);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    const timer = setTimeout(async () => {
      const q = query.trim();
      if (!q) {
        setPeople([]);
        return;
      }
      const builder = supabase
        .from("profiles")
        .select("id, name, username, avatar")
        .or(`name.ilike.%${q}%,username.ilike.%${q}%`)
        .limit(10);
      const { data } = meId
        ? await builder.neq("id", meId)
        : await builder;
      if (cancelled) return;
      // Hide anyone you already DM, since they show in the Chats group.
      const dmIds = new Set(
        chats
          .filter((c) => c.type === "dm")
          .flatMap((c) => c.memberIds ?? [])
      );
      setPeople(
        ((data || []) as PersonResult[]).filter((p) => !dmIds.has(p.id))
      );
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open, meId, chats]);

  useHotkeys({
    "mod+k": () => setOpen(!open),
    esc: () => setOpen(false),
    "mod+j": () => toggleAi()
  });

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const openChat = (chatId: string) => {
    setOpen(false);
    router.push(`/chats/${chatId}`);
  };

  const openPersonDM = async (userId: string) => {
    setOpen(false);
    const result = await startDM(userId);
    const id = result.data?.id;
    if (id) router.push(`/chats/${id}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] grid place-items-start pt-[12vh] bg-black/25 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto w-full max-w-2xl glass-strong glass-specular text-foreground rounded-2xl shadow-floating border border-border/60 overflow-hidden [&_svg]:[stroke-width:2.5]"
          >
            <Command className="w-full" loop shouldFilter>
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50">
                <Search className="size-4 text-foreground" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder={t("Search chats, people, files, actions… or ask Obsidian AI")}
                  className="flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground placeholder:font-normal"
                  autoFocus
                />
                <kbd className="text-[10px] text-muted-foreground glass px-1.5 py-0.5 rounded">ESC</kbd>
              </div>
              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="py-10 text-center text-sm text-muted-foreground">
                  {t("No results found.")}
                </Command.Empty>

                <Command.Group heading={t("Suggestions")} className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">
                  <Command.Item
                    onSelect={() => {
                      setOpen(false);
                      toggleAi();
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-foreground/5 data-[selected=true]:bg-foreground/5"
                  >
                    <Sparkles className="size-4 text-foreground" />
                    <span className="text-sm font-semibold text-foreground">{t("Ask Obsidian AI…")}</span>
                    <kbd className="ml-auto text-[10px] glass px-1.5 py-0.5 rounded">⌘J</kbd>
                  </Command.Item>
                </Command.Group>

                {chats.length > 0 && (
                  <Command.Group
                    heading={t("Chats")}
                    className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 mt-2"
                  >
                    {chats.map((c) => (
                      <Command.Item
                        key={`chat-${c.id}`}
                        // cmdk filters by the value string — include the name
                        // AND the chat type so typing "group" surfaces groups
                        // too, and Hindi/Marathi names still match.
                        value={`chat ${c.name} ${c.type}`}
                        onSelect={() => openChat(c.id)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer data-[selected=true]:bg-foreground/5"
                      >
                        <Avatar className="size-7 shrink-0">
                          <AvatarImage src={c.avatar} />
                          <AvatarFallback>{initials(c.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-foreground truncate">
                            {c.name}
                          </span>
                          <span className="block text-[10px] text-muted-foreground capitalize">
                            {c.type === "dm" ? t("Direct message") : c.type}
                            {c.type !== "dm" && c.membersCount
                              ? ` · ${c.membersCount} ${t("members")}`
                              : ""}
                          </span>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {people.length > 0 && (
                  <Command.Group
                    heading={t("People")}
                    className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 mt-2"
                  >
                    {people.map((p) => (
                      <Command.Item
                        key={`person-${p.id}`}
                        // cmdk relies on this `value` for its match scoring.
                        value={`person ${p.name || ""} ${p.username || ""}`}
                        onSelect={() => void openPersonDM(p.id)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer data-[selected=true]:bg-foreground/5"
                      >
                        <Avatar className="size-7 shrink-0">
                          <AvatarImage src={p.avatar} />
                          <AvatarFallback>
                            {initials(p.name || p.username || "User")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-foreground truncate">
                            {p.name || p.username}
                          </span>
                          {p.username && (
                            <span className="block text-[10px] text-muted-foreground truncate">
                              @{p.username}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-cyan-400">
                          {t("Start chat")}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                <Command.Group heading={t("Navigate")} className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 mt-2">
                  {navActions.map((a) => (
                    <Command.Item
                      key={a.href}
                      onSelect={() => go(a.href)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer data-[selected=true]:bg-foreground/5"
                    >
                      <a.icon className="size-4 text-foreground" />
                      <span className="text-sm font-semibold text-foreground">{t(a.label)}</span>
                      {a.hint && (
                        <kbd className="ml-auto text-[10px] text-muted-foreground glass px-1.5 py-0.5 rounded">
                          {a.hint}
                        </kbd>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading={t("Actions")} className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 mt-2">
                  <Command.Item
                    onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer data-[selected=true]:bg-foreground/5"
                  >
                    {theme === "dark" ? <Sun className="size-4 text-foreground" /> : <Moon className="size-4 text-foreground" />}
                    <span className="text-sm font-semibold text-foreground">{t("Toggle theme")}</span>
                  </Command.Item>
                  <Command.Item className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer data-[selected=true]:bg-foreground/5">
                    <Ghost className="size-4 text-foreground" />
                    <span className="text-sm font-semibold text-foreground">{t("Create new ghost room")}</span>
                  </Command.Item>
                  <Command.Item className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer data-[selected=true]:bg-foreground/5">
                    <Phone className="size-4 text-foreground" />
                    <span className="text-sm font-semibold text-foreground">{t("Start a new call")}</span>
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
