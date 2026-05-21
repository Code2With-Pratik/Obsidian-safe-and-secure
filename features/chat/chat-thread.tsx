"use client";

import * as React from "react";
import { ChatBubble } from "./chat-bubble";
import { MessageInput } from "./message-input";
import { ChatHeader, PinnedBar } from "./chat-header";
import { useChatStore } from "@/store/use-chat-store";
import { useChatThemeStore } from "@/store/use-chat-theme-store";
import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Chat, Message } from "@/types";
import { motion } from "framer-motion";

export function ChatThread({ chat }: { chat: Chat }) {
  const messages = useChatStore((s) => s.messages[chat.id] ?? []);
  const send = useChatStore((s) => s.sendMessage);
  const theme = useChatThemeStore((s) =>
    (s.byChat[chat.id] ?? "default")
  );
  const themeObj = useChatThemeStore((s) => s.themeFor(chat.id));
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const grouped = groupByDay(messages);
  const pinned = messages.find((m) => m.pinned);

  return (
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
          <div className="max-w-3xl mx-auto space-y-4">
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
                  />
                ))}
              </div>
            ))}
            {messages.length === 0 && <EmptyState />}
            <div ref={endRef} />
          </div>
        </ScrollArea>

        <MessageInput onSend={(text) => send(chat.id, text)} />
      </div>
    </div>
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
