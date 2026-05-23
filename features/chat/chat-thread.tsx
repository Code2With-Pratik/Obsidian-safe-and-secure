"use client";

import * as React from "react";
import { ChatBubble } from "./chat-bubble";
import { MessageInput } from "./message-input";
import { ChatHeader, PinnedBar } from "./chat-header";
import { useChatStore } from "@/store/use-chat-store";
import {
  CHAT_THEMES,
  CUSTOM_THEME_ID,
  useChatThemeStore,
  type ChatTheme
} from "@/store/use-chat-theme-store";
import { useEffect, useMemo, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ImageLightboxProvider } from "./image-lightbox";
import type { Chat, Message } from "@/types";
import { motion } from "framer-motion";

export function ChatThread({ chat }: { chat: Chat }) {
  const messages = useChatStore((s) => s.messages[chat.id] ?? []);
  const send = useChatStore((s) => s.sendMessage);
  const sendVoice = useChatStore((s) => s.sendVoice);
  const sendAttachment = useChatStore((s) => s.sendAttachment);
  const overrideThemeId = useChatThemeStore((s) => s.byChat[chat.id]);
  const overrideCustomBg = useChatThemeStore((s) => s.customBgByChat[chat.id]);
  const globalThemeId = useChatThemeStore((s) => s.globalTheme);
  const globalCustomBg = useChatThemeStore((s) => s.globalCustomBg);
  const theme = overrideThemeId ?? globalThemeId;
  const themeObj = useMemo<ChatTheme>(() => {
    const id = overrideThemeId ?? globalThemeId;
    if (id === CUSTOM_THEME_ID) {
      const img = overrideThemeId ? overrideCustomBg : globalCustomBg;
      return {
        id: CUSTOM_THEME_ID,
        name: "Custom",
        bubbleMe: "linear-gradient(135deg,#8B5CF6,#EC4899)",
        bubbleThem: "rgba(0,0,0,0.32)",
        accent: "#8B5CF6",
        bg: img
          ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url("${img}") center/cover no-repeat`
          : "",
        category: "gradient"
      };
    }
    return CHAT_THEMES.find((t) => t.id === id) ?? CHAT_THEMES[0];
  }, [overrideThemeId, overrideCustomBg, globalThemeId, globalCustomBg]);
  const endRef = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  // Lift the last message above the picker only on mobile (the picker is a
  // bottom sheet there). On desktop the picker is a small floating popover
  // anchored to the smile button so the chat doesn't need to move.
  const liftForPicker = pickerOpen && !isDesktop;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const grouped = groupByDay(messages);
  const pinned = messages.find((m) => m.pinned);

  return (
    <ImageLightboxProvider>
    <div
      className="relative flex h-full flex-col"
      style={
        themeObj.bg
          ? ({ ["--chat-theme-bg" as never]: themeObj.bg } as React.CSSProperties)
          : undefined
      }
    >
      {themeObj.bg && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: themeObj.bg }}
        />
      )}
      <div className="relative flex h-full flex-col">
        <ChatHeader chat={chat} />
        <PinnedBar pinned={pinned?.content} />

        <ScrollArea className="flex-1 px-3 md:px-6 py-4 scroll-fade-y" key={theme}>
          <div className="mx-auto w-full max-w-[min(100%,1200px)] space-y-4">
            {grouped.map((group) => (
              <div key={group.day} className="space-y-3">
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground glass-subtle px-2 py-0.5 rounded-full">
                    {group.day}
                  </span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>
                {group.items.map((m) => (
                  <ChatBubble
                    key={m.id}
                    message={m}
                    bubbleMe={themeObj.bubbleMe}
                    bubbleThem={themeObj.bubbleThem}
                    textOnMe={themeObj.textOnMe}
                    textOnThem={themeObj.textOnThem}
                  />
                ))}
              </div>
            ))}
            {messages.length === 0 && <EmptyState />}
            {/* When the picker is open it covers ~52dvh; the composer floats
                another ~3.5rem above it. Make the scroll sentinel that tall
                so scrollIntoView({block:"end"}) leaves the last bubble
                visible just above the composer. */}
            <div
              ref={endRef}
              aria-hidden
              className="transition-[height] duration-200"
              style={{
                height: pickerOpen ? "calc(52dvh + 3.5rem)" : 0
              }}
            />
          </div>
        </ScrollArea>

        <MessageInput
          onSend={(text) => send(chat.id, text)}
          onSendVoice={(durationSec, waveform) => sendVoice(chat.id, durationSec, waveform)}
          onSendAttachment={(payload) => sendAttachment(chat.id, payload)}
          onPickerToggle={(picking) => {
            setPickerOpen(picking);
            if (!picking) return;
            // Picker just opened — wait for the padding-bottom transition to
            // expand the scroll area, then scroll the latest bubble to the
            // new visible bottom (just above the picker).
            window.setTimeout(() => {
              endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
            }, 50);
          }}
          themeBubbleMe={themeObj.bubbleMe}
          themeAccent={themeObj.accent}
        />
      </div>
    </div>
    </ImageLightboxProvider>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid place-items-center py-20 text-center"
    >
      <div className="size-16 rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center mb-4 shadow-glow">
        ✨
      </div>
      <h3 className="font-semibold">A blank canvas</h3>
      <p className="text-sm text-muted-foreground max-w-sm mt-1">
        Start the conversation. Messages are end-to-end encrypted in this thread.
      </p>
    </motion.div>
  );
}

function groupByDay(items: Message[]) {
  const map = new Map<string, Message[]>();
  for (const m of items) {
    const d = new Date(m.createdAt);
    const today = new Date();
    const ydy = new Date(Date.now() - 86_400_000);
    let label: string;
    if (sameDay(d, today)) label = "Today";
    else if (sameDay(d, ydy)) label = "Yesterday";
    else
      label = d.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric"
      });
    const arr = map.get(label) ?? [];
    arr.push(m);
    map.set(label, arr);
  }
  return Array.from(map.entries()).map(([day, items]) => ({ day, items }));
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
