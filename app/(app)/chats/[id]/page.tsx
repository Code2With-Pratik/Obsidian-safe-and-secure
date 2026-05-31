"use client";

import * as React from "react";
import { useParams, notFound } from "next/navigation";
import { ChatList } from "@/features/chat/chat-list";
import { ChatThread } from "@/features/chat/chat-thread";
import { ChatDetailsPanel } from "@/features/chat/chat-details-panel";
import { useChatStore } from "@/store/use-chat-store";
import { useUIStore } from "@/store/use-ui-store";
import { AnimatePresence } from "framer-motion";

export default function ChatRoom() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const chats = useChatStore((s) => s.chats);
  const setActive = useChatStore((s) => s.setActiveChat);
  const right = useUIStore((s) => s.rightPanel);
  const setRight = useUIStore((s) => s.setRightPanel);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const chat = chats.find((c) => c.id === id);

  React.useEffect(() => {
    if (chats.length > 0) setHasLoaded(true);
  }, [chats]);

  React.useEffect(() => {
    if (id) setActive(id);
  }, [id, setActive]);

  // ... (keep the details panel effect)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 1280px)").matches) setRight("details");
    else setRight(null);
  }, [id, setRight]);

  if (!chat) {
    if (!hasLoaded) {
      return (
        <div className="flex h-[calc(100dvh-4rem)] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs text-muted-foreground animate-pulse">Syncing conversation…</p>
          </div>
        </div>
      );
    }
    return notFound();
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)]">
      <aside className="hidden md:flex w-[380px] lg:w-[400px] shrink-0 flex-col border-r border-border/40 bg-card/30 backdrop-blur-xl">
        <ChatList activeId={id} />
      </aside>
      <div className="flex-1 min-w-0">
        <ChatThread chat={chat} />
      </div>
      <AnimatePresence>
        {right && <ChatDetailsPanel chat={chat} />}
      </AnimatePresence>
    </div>
  );
}
