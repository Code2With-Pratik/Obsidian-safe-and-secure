"use client";

import * as React from "react";
import { ChatList } from "@/features/chat/chat-list";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { NovaMascot } from "@/components/nova-mascot";
import { useChatStore } from "@/store/use-chat-store";
import { useT } from "@/lib/i18n";

export default function ChatsIndex() {
  const t = useT();
  // Live counts pulled straight from the chat store so the empty-state
  // surface reflects the real state of the user's inbox.
  const onlineCount = useChatStore((s) => s.onlineUsers.length);
  const unreadThreads = useChatStore(
    (s) => s.chats.filter((c) => (c.unread ?? 0) > 0).length
  );

  return (
    <div className="flex h-[calc(100dvh-4rem)]">
      <div className="w-full md:w-[400px] lg:w-[420px] shrink-0 md:border-r border-border/40 bg-card/30 backdrop-blur-xl">
        <ChatList />
      </div>
      <div className="hidden md:grid place-items-center flex-1 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-md px-6"
        >
          <motion.div
            className="mx-auto w-fit"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <NovaMascot size={96} />
          </motion.div>

          <h1 className="mt-4 text-5xl font-display font-semibold tracking-tight">
            Obsidian
          </h1>
          {/* Even rhythm — both the end-to-end caption and the "Select a
              conversation" heading sit `mt-2` away from the line above so
              the three text blocks visually share the same vertical gap. */}
          <p className="mt-2 inline-flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-emerald-500 dark:text-emerald-400">
            <Lock className="size-3" />
            {t("End-to-end encrypted")}
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            {t("Select a conversation")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("Or start a new one. Obsidian chats are private by default and encrypted edge to edge.")}
          </p>

          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground tabular-nums">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400" /> {onlineCount}{" "}
              {t("online")}
            </span>
            <span>·</span>
            <span>
              {unreadThreads}{" "}
              {unreadThreads === 1 ? t("unread thread") : t("unread threads")}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
