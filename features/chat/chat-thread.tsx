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

const EMPTY_MESSAGES: Message[] = [];

export function ChatThread({ chat }: { chat: Chat }) {
  const messages = useChatStore((s) => s.messages[chat.id] ?? EMPTY_MESSAGES);
  const markRead = useChatStore((s) => s.markRead);
  const send = useChatStore((s) => s.sendMessage);
  const sendVoice = useChatStore((s) => s.sendVoice);
  const sendAttachment = useChatStore((s) => s.sendAttachment);

  // Sync state on mount or chat change
  useEffect(() => {
    if (chat.id) {
      markRead(chat.id);
    }
  }, [chat.id, markRead]);
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
  /** WhatsApp-style in-chat search. `null` = closed, `""` = open empty, "foo" = active. */
  const [search, setSearch] = React.useState<string | null>(null);
  // Clear search whenever the active chat changes.
  React.useEffect(() => {
    setSearch(null);
  }, [chat.id]);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  // Lift the last message above the picker only on mobile (the picker is a
  // bottom sheet there). On desktop the picker is a small floating popover
  // anchored to the smile button so the chat doesn't need to move.
  const liftForPicker = pickerOpen && !isDesktop;

  useEffect(() => {
    // Only scroll if we actually have messages or just opened the picker
    if (messages.length > 0 || liftForPicker) {
      const timer = setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length, liftForPicker]);

  // When the search has a non-empty query, narrow the list to messages whose
  // content (or attachment names) contain it. Matches are case-insensitive.
  const visibleMessages = React.useMemo(() => {
    const q = (search ?? "").trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => {
      if (m.kind === "system") return false;
      const haystack =
        (m.content ?? "") +
        " " +
        (m.audio?.name ?? "") +
        " " +
        (m.file?.name ?? "") +
        " " +
        (m.link?.title ?? "") +
        " " +
        (m.poll?.question ?? "") +
        " " +
        (m.contacts?.map((c) => c.name).join(" ") ?? "");
      return haystack.toLowerCase().includes(q);
    });
  }, [messages, search]);

  const grouped = groupByDay(visibleMessages);
  const pinned = messages.find((m) => m.pinned);
  const searchQuery = (search ?? "").trim();
  const isSearching = searchQuery.length > 0;
  const matchCount = isSearching ? visibleMessages.length : 0;

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
        <ChatHeader
          chat={chat}
          search={search}
          onSearchChange={setSearch}
          onCloseSearch={() => setSearch(null)}
        />
        {isSearching && (
          <div className="px-4 py-2 text-[11px] text-muted-foreground border-b border-border/40 bg-card/40 backdrop-blur">
            {matchCount > 0
              ? `${matchCount} ${matchCount === 1 ? "match" : "matches"} for "${searchQuery}"`
              : `No matches for "${searchQuery}"`}
          </div>
        )}
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
                // Only the mobile bottom-sheet picker covers the messages, so
                // only reserve scroll space there. On desktop the picker is a
                // floating popover — the message list must NOT shift up.
                height: liftForPicker ? "calc(52dvh + 3.5rem)" : 0
              }}
            />
          </div>
        </ScrollArea>

        <MessageInput
          chatId={chat.id}
          onSend={(text) => send(chat.id, text)}
          onSendVoice={(durationSec, waveform, audioBlob) =>
            sendVoice(chat.id, durationSec, waveform, audioBlob)
          }
          onSendAttachment={(payload) => sendAttachment(chat.id, payload)}
          onPickerToggle={(picking) => {
            setPickerOpen(picking);
            // Desktop popover floats above the composer and doesn't cover the
            // messages, so there's nothing to scroll past — leave the list put.
            if (!picking || isDesktop) return;
            // Mobile only — wait for the padding-bottom transition to expand
            // the scroll area, then scroll the latest bubble to the new
            // visible bottom (just above the picker).
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
