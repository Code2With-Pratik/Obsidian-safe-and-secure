"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Plus,
  Lock,
  Sparkles,
  X,
  Star,
  Layers,
  PictureInPicture,
  Wifi,
  Shield,
  Globe,
  History,
  Bookmark,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { browserTabs } from "@/lib/mock-data";
import { useUIStore } from "@/store/use-ui-store";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  pinned?: boolean;
}

const startBookmarks = [
  { icon: "🟣", label: "Linear", url: "linear.app" },
  { icon: "🎨", label: "Figma", url: "figma.com" },
  { icon: "📓", label: "Notion", url: "notion.so" },
  { icon: "💚", label: "Spotify", url: "spotify.com" },
  { icon: "🐙", label: "GitHub", url: "github.com" },
  { icon: "📺", label: "YouTube", url: "youtube.com" },
  { icon: "🛰️", label: "Vercel", url: "vercel.com" },
  { icon: "📨", label: "Resend", url: "resend.com" }
];

const histRows = [
  "linear.app/nova/q1-planning",
  "figma.com/file/nova-helios-ui",
  "github.com/nova/app/pull/482",
  "notion.so/specs/motion-tokens",
  "nova.fm/glass-cathedrals"
];

export default function BrowserPage() {
  const [tabs, setTabs] = React.useState<Tab[]>(browserTabs);
  const [active, setActive] = React.useState(tabs[0].id);
  const setSplit = useUIStore((s) => s.setSplitMode);
  const splitMode = useUIStore((s) => s.splitMode);
  const [privateMode, setPrivateMode] = React.useState(false);

  const addTab = () => {
    const id = `t-${Date.now()}`;
    setTabs((t) => [...t, { id, title: "New tab", url: "nova://start", favicon: "✨" }]);
    setActive(id);
  };

  const closeTab = (id: string) => {
    setTabs((t) => t.filter((x) => x.id !== id));
    if (active === id && tabs.length > 1) {
      setActive(tabs.find((x) => x.id !== id)!.id);
    }
  };

  const cur = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className="h-[calc(100dvh-4rem)] flex flex-col">
      <div className="flex items-center gap-1.5 px-2 pt-2 border-b border-border/40">
        <div className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <motion.button
              key={t.id}
              layout
              onClick={() => setActive(t.id)}
              className={cn(
                "group inline-flex items-center gap-2 px-3 h-9 rounded-t-xl text-xs max-w-[200px] shrink-0 transition border-t border-x border-transparent",
                active === t.id
                  ? "bg-background/60 backdrop-blur-xl border-border/60 text-foreground"
                  : "text-muted-foreground hover:bg-foreground/[0.04]"
              )}
            >
              <span className="text-base leading-none">{t.favicon}</span>
              <span className="truncate">{t.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(t.id);
                }}
                className="size-4 rounded grid place-items-center hover:bg-foreground/10 opacity-0 group-hover:opacity-100 transition"
              >
                <X className="size-3" />
              </button>
            </motion.button>
          ))}
          <Button variant="ghost" size="icon-sm" onClick={addTab}>
            <Plus />
          </Button>
        </div>
        <div className="flex items-center gap-1 pr-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setPrivateMode((p) => !p)}
            className={cn(privateMode && "text-violet-400")}
          >
            {privateMode ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSplit(!splitMode)}
            className={cn(splitMode && "text-cyan-400")}
          >
            <Layers className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm">
            <PictureInPicture className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-background/40 backdrop-blur">
        <Button variant="ghost" size="icon-sm"><ArrowLeft /></Button>
        <Button variant="ghost" size="icon-sm"><ArrowRight /></Button>
        <Button variant="ghost" size="icon-sm"><RotateCw /></Button>
        <div className="relative flex-1">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-emerald-400" />
          <Input
            defaultValue={cur.url}
            className="pl-9 pr-32 h-9 text-xs"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <Badge variant="success" className="!text-[9px] !py-0">
              <Shield className="size-2.5" /> safe
            </Badge>
            <Badge variant="cyan" className="!text-[9px] !py-0 hidden md:inline-flex">
              <Sparkles className="size-2.5" /> AI summary
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm"><Star /></Button>
      </div>

      <div className={cn("flex-1 flex gap-3 p-3", splitMode && "lg:divide-x")}>
        <BrowserPane url={cur.url} bookmarks={startBookmarks} histRows={histRows} private={privateMode} />
        {splitMode && (
          <div className="hidden lg:block flex-1 pl-3">
            <BrowserPane
              url="nova://chat-side"
              bookmarks={startBookmarks.slice(0, 4)}
              histRows={histRows.slice(0, 3)}
              private={false}
              variant="chat"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function BrowserPane({
  url,
  bookmarks,
  histRows,
  private: priv,
  variant = "web"
}: {
  url: string;
  bookmarks: { icon: string; label: string; url: string }[];
  histRows: string[];
  private: boolean;
  variant?: "web" | "chat";
}) {
  return (
    <div className="flex-1 rounded-2xl overflow-hidden glass border border-border/60">
      <div className="h-full overflow-y-auto">
        {priv && (
          <div className="px-4 py-2 text-xs text-violet-400 bg-violet-500/10 border-b border-violet-500/30 flex items-center gap-2">
            <EyeOff className="size-3.5" />
            Private mode · history won't be saved
          </div>
        )}

        {variant === "chat" ? (
          <div className="p-6">
            <h3 className="text-sm text-muted-foreground mb-3">Chat-side</h3>
            <p className="text-sm text-muted-foreground">
              Pin a thread next to your browser. Drag a link from this tab into chat to share instantly.
            </p>
          </div>
        ) : (
          <div className="p-6 md:p-10">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Globe className="size-3.5" />
                {url}
              </div>
              <h1 className="mt-3 text-4xl md:text-5xl font-display font-semibold tracking-tight">
                Inside the <span className="neon-text">internal browser</span>
              </h1>
              <p className="text-muted-foreground mt-3">
                Browse, bookmark, and share without ever leaving Nova. Drag links into chats, pin a tab
                next to your conversation, and let AI summarize anything in one tap.
              </p>

              <div className="mt-8">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  Pinned
                </h3>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                  {bookmarks.map((b) => (
                    <motion.div
                      key={b.label}
                      whileHover={{ y: -3 }}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl glass-subtle hover:bg-foreground/5 cursor-pointer transition"
                    >
                      <span className="text-2xl">{b.icon}</span>
                      <span className="text-[10px] text-muted-foreground">{b.label}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <Tabs defaultValue="history" className="mt-8">
                <TabsList>
                  <TabsTrigger value="history">
                    <History className="size-3 mr-1" /> History
                  </TabsTrigger>
                  <TabsTrigger value="bookmarks">
                    <Bookmark className="size-3 mr-1" /> Bookmarks
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="history" className="mt-3 space-y-1.5">
                  {histRows.map((h) => (
                    <div
                      key={h}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg glass-subtle hover:bg-foreground/5 cursor-pointer"
                    >
                      <Wifi className="size-3.5 text-muted-foreground" />
                      <span className="text-xs">{h}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">2h ago</span>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="bookmarks" className="mt-3">
                  <p className="text-sm text-muted-foreground">
                    Drag any tab here to save it.
                  </p>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
