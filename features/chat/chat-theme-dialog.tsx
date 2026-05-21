"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, Palette, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CHAT_THEMES, useChatThemeStore } from "@/store/use-chat-theme-store";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  chatId: string;
}

export function ChatThemeDialog({ open, onOpenChange, chatId }: Props) {
  const current = useChatThemeStore((s) => s.byChat[chatId] ?? "default");
  const setTheme = useChatThemeStore((s) => s.setTheme);
  const [picked, setPicked] = React.useState(current);

  React.useEffect(() => {
    if (open) setPicked(current);
  }, [open, current]);

  const apply = () => {
    setTheme(chatId, picked);
    onOpenChange(false);
  };

  const previewTheme = CHAT_THEMES.find((t) => t.id === picked) ?? CHAT_THEMES[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-2xl !max-h-[90dvh] !p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 grid place-items-center shadow-glow mb-2">
            <Palette className="text-white" />
          </div>
          <DialogTitle className="text-xl">Chat theme</DialogTitle>
          <DialogDescription>
            Pick a vibe just for this conversation. Only you and the people in this chat will see it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-6 pb-2 space-y-4">
          <PreviewBubbles theme={previewTheme} />

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            {CHAT_THEMES.map((t) => {
            const active = picked === t.id;
            return (
              <motion.button
                key={t.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setPicked(t.id)}
                className={cn(
                  "relative aspect-square rounded-2xl overflow-hidden ring-2 transition",
                  active ? "ring-cyan-400 shadow-glow-cyan" : "ring-white/10 hover:ring-white/30"
                )}
              >
                <div className="absolute inset-0" style={{ background: t.bubbleMe }} />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
                <div className="absolute bottom-1.5 left-2 right-2 text-[10px] font-semibold text-white drop-shadow text-left">
                  {t.name}
                </div>
                {active && (
                  <motion.div
                    layoutId="theme-check"
                    className="absolute top-1.5 right-1.5 size-5 rounded-full bg-white grid place-items-center shadow-glow"
                  >
                    <Check className="size-3 text-violet-500" />
                  </motion.div>
                )}
                {t.id === "cosmos" && (
                  <Badge variant="cyan" className="absolute top-1.5 left-1.5 !text-[8px] !py-0 !px-1.5">
                    <Sparkles className="size-2" /> new
                  </Badge>
                )}
              </motion.button>
            );
          })}
          </div>
        </div>

        <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-white/10 bg-background/30 backdrop-blur-md">
          <button
            onClick={() => setPicked("default")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Reset to default
          </button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={apply}>
              Apply theme
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewBubbles({ theme }: { theme: (typeof CHAT_THEMES)[number] }) {
  return (
    <div
      className="relative rounded-2xl p-4 md:p-5 overflow-hidden bg-card/40 border border-white/10"
      style={{ background: theme.bg || undefined }}
    >
      <div className="absolute inset-0 grid-fade opacity-30" />
      <div className="relative space-y-2">
        <div className="flex justify-start">
          <div
            className="max-w-[70%] rounded-2xl rounded-bl-md px-3.5 py-2 text-sm glass border border-white/10"
            style={{ background: theme.bubbleThem }}
          >
            What about this look? ✨
          </div>
        </div>
        <div className="flex justify-end">
          <div
            className="max-w-[70%] rounded-2xl rounded-br-md px-3.5 py-2 text-sm text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)]"
            style={{ background: theme.bubbleMe }}
          >
            Honestly I'm in love. Apply it.
          </div>
        </div>
        <div className="flex justify-end">
          <div
            className="max-w-[40%] rounded-2xl rounded-br-md px-3.5 py-2 text-sm text-white"
            style={{ background: theme.bubbleMe }}
          >
            🔥🔥
          </div>
        </div>
      </div>
    </div>
  );
}
